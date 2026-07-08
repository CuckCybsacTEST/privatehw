import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import Stripe from 'stripe'
import crypto from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'node:url'
import {
  buildDefaultProducts,
  buildDerivedProducts,
} from '../src/data/defaultCommerce.js'
import { defaultBlogPosts, normalizeBlogPost } from '../src/data/defaultBlogPosts.js'
import { defaultSiteContent, mergeSiteContent } from '../src/data/defaultSiteContent.js'
import { buildEncuentrosBookingPricing, normalizeRecordingChoice } from '../src/utils/encuentrosBooking.js'
import {
  DEFAULT_ENCUENTROS_MODEL_SLUG,
  resolveEncounterFallbackSlug,
} from '../src/utils/encuentrosModels.js'
import { normalizeSocialNetworkValue } from '../src/utils/socialNetworks.js'
import { extractGoogleDriveFileId } from '../src/utils/videoMedia.js'
import { isPersistentProductType } from '../src/data/defaultCommerce.js'
import {
  fetchGoogleDriveMedia,
  getGoogleDriveFolderId,
  isGoogleDriveConfigured,
  uploadGoogleDriveFile,
} from './googleDrive.js'
import { translateContentPayload } from './contentTranslation.js'

const app = express()
const port = Number.parseInt(process.env.PORT || '4242', 10)
const appUrl = process.env.APP_URL || 'http://localhost:5173'
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || ''
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''
const mediaTokenSecret = process.env.MEDIA_TOKEN_SECRET || 'dev-media-token-secret'
const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || ''
const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const HOME_CONTENT_CACHE_TTL_MS = 60 * 1000
const GALLERY_REACTIONS_FILE = new URL('./data/encuentros-gallery-votes.json', import.meta.url)
const ENCUENTROS_MODELS_FILE = new URL('./data/encuentros-models.json', import.meta.url)
const ENCUENTROS_MODEL_REQUESTS_FILE = new URL('./data/encuentros-model-requests.json', import.meta.url)
const CLIENT_DIST_DIR = fileURLToPath(new URL('../dist/', import.meta.url))
const CLIENT_INDEX_FILE = `${CLIENT_DIST_DIR}/index.html`
let homeContentCache = {
  value: null,
  loadedAt: 0,
  pending: null,
}
let clientIndexTemplateCache = null

if (!process.env.MEDIA_TOKEN_SECRET) {
  console.warn('MEDIA_TOKEN_SECRET no esta configurado. Se usara una clave de desarrollo.')
}

if (!telegramBotToken) {
  console.warn('TELEGRAM_BOT_TOKEN no esta configurado. El acceso por Telegram estara deshabilitado.')
}

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null
const supabaseAdmin =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null

function assertServerConfig() {
  if (!stripe) {
    throw new Error('Stripe no esta configurado. Define STRIPE_SECRET_KEY.')
  }

  if (!supabaseAdmin) {
    throw new Error(
      'Supabase service role no esta configurado. Define SUPABASE_SERVICE_ROLE_KEY.',
    )
  }
}

function buildRuntimeConfig() {
  return {
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || '',
    VITE_SUPABASE_PUBLISHABLE_KEY: process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || '',
    VITE_TELEGRAM_BOT_USERNAME: process.env.VITE_TELEGRAM_BOT_USERNAME || '',
  }
}

function escapeJsonForInlineScript(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

async function getClientIndexTemplate() {
  if (clientIndexTemplateCache) {
    return clientIndexTemplateCache
  }

  clientIndexTemplateCache = await readFile(CLIENT_INDEX_FILE, 'utf8')
  return clientIndexTemplateCache
}

async function renderClientIndexHtml() {
  const template = await getClientIndexTemplate()
  const runtimeConfigScript = `<script>window.__privatehwRuntimeConfig=${escapeJsonForInlineScript(buildRuntimeConfig())};</script>`

  if (template.includes('</head>')) {
    return template.replace('</head>', `${runtimeConfigScript}</head>`)
  }

  return `${runtimeConfigScript}${template}`
}

function normalizeBearerToken(header = '') {
  if (!header.startsWith('Bearer ')) {
    return ''
  }

  return header.slice('Bearer '.length).trim()
}

function normalizeGalleryReactionValue(value = '') {
  const normalizedValue = String(value || '').trim().toLowerCase()

  if (normalizedValue === 'like' || normalizedValue === 'dislike') {
    return normalizedValue
  }

  return ''
}

function normalizeGalleryPhotoId(value = '') {
  return String(value || '').trim()
}

async function readGalleryReactionVotes() {
  try {
    const rawValue = await readFile(GALLERY_REACTIONS_FILE, 'utf8')
    const parsedValue = JSON.parse(rawValue)

    return Array.isArray(parsedValue?.votes) ? parsedValue.votes : []
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return []
    }

    throw error
  }
}

async function writeGalleryReactionVotes(votes = []) {
  await mkdir(new URL('./data/', import.meta.url), { recursive: true })
  await writeFile(
    GALLERY_REACTIONS_FILE,
    `${JSON.stringify({ votes }, null, 2)}\n`,
    'utf8',
  )
}

async function readLocalEncounterModels() {
  try {
    const rawValue = await readFile(ENCUENTROS_MODELS_FILE, 'utf8')
    const parsedValue = JSON.parse(rawValue)

    return Array.isArray(parsedValue?.models) ? parsedValue.models : []
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return []
    }

    throw error
  }
}

async function writeLocalEncounterModels(models = []) {
  await mkdir(new URL('./data/', import.meta.url), { recursive: true })
  await writeFile(
    ENCUENTROS_MODELS_FILE,
    `${JSON.stringify({ models }, null, 2)}\n`,
    'utf8',
  )
}

async function readLocalEncounterModelRequests() {
  try {
    const rawValue = await readFile(ENCUENTROS_MODEL_REQUESTS_FILE, 'utf8')
    const parsedValue = JSON.parse(rawValue)

    return Array.isArray(parsedValue?.requests)
      ? parsedValue.requests
      : Array.isArray(parsedValue?.models)
        ? parsedValue.models
        : []
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return []
    }

    throw error
  }
}

async function writeLocalEncounterModelRequests(requests = []) {
  await mkdir(new URL('./data/', import.meta.url), { recursive: true })
  await writeFile(
    ENCUENTROS_MODEL_REQUESTS_FILE,
    `${JSON.stringify({ requests }, null, 2)}\n`,
    'utf8',
  )
}

function summarizeGalleryReactionVotes(votes = [], photoIds = []) {
  const requestedPhotoIds = Array.from(
    new Set((Array.isArray(photoIds) ? photoIds : []).map(normalizeGalleryPhotoId).filter(Boolean)),
  )
  const summaryMap = new Map(
    requestedPhotoIds.map((photoId) => [
      photoId,
      {
        photoId,
        likes: 0,
        dislikes: 0,
      },
    ]),
  )

  for (const vote of Array.isArray(votes) ? votes : []) {
    const photoId = normalizeGalleryPhotoId(vote?.photoId)
    const reaction = normalizeGalleryReactionValue(vote?.reaction)

    if (!photoId || !reaction) {
      continue
    }

    if (requestedPhotoIds.length && !summaryMap.has(photoId)) {
      continue
    }

    const currentSummary =
      summaryMap.get(photoId) || {
        photoId,
        likes: 0,
        dislikes: 0,
      }

    currentSummary.likes += reaction === 'like' ? 1 : 0
    currentSummary.dislikes += reaction === 'dislike' ? 1 : 0
    summaryMap.set(photoId, currentSummary)
  }

  return requestedPhotoIds.length ? requestedPhotoIds.map((photoId) => summaryMap.get(photoId)) : Array.from(summaryMap.values())
}

async function upsertGalleryReactionVote({ photoId, visitorKey, reaction }) {
  const normalizedPhotoId = normalizeGalleryPhotoId(photoId)
  const normalizedVisitorKey = String(visitorKey || '').trim()
  const normalizedReaction = normalizeGalleryReactionValue(reaction)

  if (!normalizedPhotoId || !normalizedVisitorKey) {
    const error = new Error('Falta el identificador de la foto o del visitante.')
    error.code = 'BAD_REQUEST'
    throw error
  }

  const votes = await readGalleryReactionVotes()
  const now = new Date().toISOString()
  const existingIndex = votes.findIndex(
    (vote) =>
      normalizeGalleryPhotoId(vote?.photoId) === normalizedPhotoId &&
      String(vote?.visitorKey || '').trim() === normalizedVisitorKey,
  )

  if (!normalizedReaction) {
    if (existingIndex >= 0) {
      votes.splice(existingIndex, 1)
      await writeGalleryReactionVotes(votes)
    }

    return summarizeGalleryReactionVotes(votes, [normalizedPhotoId])[0] || {
      photoId: normalizedPhotoId,
      likes: 0,
      dislikes: 0,
    }
  }

  const nextVote = {
    photoId: normalizedPhotoId,
    visitorKey: normalizedVisitorKey,
    reaction: normalizedReaction,
    createdAt: existingIndex >= 0 ? votes[existingIndex].createdAt || now : now,
    updatedAt: now,
  }

  if (existingIndex >= 0) {
    const currentVote = votes[existingIndex]
    if (
      normalizeGalleryReactionValue(currentVote?.reaction) === normalizedReaction &&
      normalizeGalleryPhotoId(currentVote?.photoId) === normalizedPhotoId
    ) {
      return summarizeGalleryReactionVotes(votes, [normalizedPhotoId])[0] || {
        photoId: normalizedPhotoId,
        likes: 0,
        dislikes: 0,
      }
    }

    votes[existingIndex] = nextVote
  } else {
    votes.push(nextVote)
  }

  await writeGalleryReactionVotes(votes)
  return summarizeGalleryReactionVotes(votes, [normalizedPhotoId])[0] || {
    photoId: normalizedPhotoId,
    likes: 0,
    dislikes: 0,
  }
}

function normalizeTelegramPayload(payload = {}) {
  return {
    id: String(payload.id || '').trim(),
    first_name: String(payload.first_name || '').trim(),
    last_name: String(payload.last_name || '').trim(),
    username: String(payload.username || '').trim(),
    photo_url: String(payload.photo_url || '').trim(),
    auth_date: String(payload.auth_date || '').trim(),
    hash: String(payload.hash || '').trim(),
  }
}

function verifyTelegramLoginPayload(payload = {}) {
  if (!telegramBotToken) {
    const error = new Error('Telegram no esta configurado en el servidor.')
    error.code = 'TELEGRAM_NOT_CONFIGURED'
    throw error
  }

  const normalized = normalizeTelegramPayload(payload)
  const receivedHash = normalized.hash
  const authDate = Number.parseInt(normalized.auth_date || '0', 10)

  if (!normalized.id || !receivedHash || !Number.isFinite(authDate)) {
    const error = new Error('Telegram envio datos incompletos.')
    error.code = 'BAD_REQUEST'
    throw error
  }

  const ageInSeconds = Math.floor(Date.now() / 1000) - authDate

  if (!Number.isFinite(ageInSeconds) || ageInSeconds < 0 || ageInSeconds > 24 * 60 * 60) {
    const error = new Error('La autenticacion de Telegram expiro. Vuelve a intentarlo.')
    error.code = 'TELEGRAM_EXPIRED'
    throw error
  }

  const dataCheckString = Object.entries({ ...normalized, hash: undefined })
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join('\n')

  const secretKey = crypto.createHash('sha256').update(telegramBotToken).digest()
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')

  if (computedHash !== receivedHash) {
    const error = new Error('No se pudo verificar la autenticacion de Telegram.')
    error.code = 'TELEGRAM_INVALID'
    throw error
  }

  return normalized
}

function buildTelegramSyntheticEmail(telegramId) {
  return `telegram_${telegramId}@telegram.local`
}

function buildTelegramDisplayName(telegramUser = {}) {
  return (
    [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(' ').trim() ||
    telegramUser.username ||
    `Telegram ${telegramUser.id}`
  )
}

async function provisionTelegramLoginUser(telegramUser = {}) {
  assertSupabaseAuthConfig()

  const verifiedUser = verifyTelegramLoginPayload(telegramUser)
  const email = buildTelegramSyntheticEmail(verifiedUser.id)
  const displayName = buildTelegramDisplayName(verifiedUser)
  const password = crypto.randomBytes(24).toString('base64url')
  const metadata = {
    display_name: displayName,
    telegram_id: verifiedUser.id,
    telegram_username: verifiedUser.username || null,
    telegram_photo_url: verifiedUser.photo_url || null,
  }

  const { data: existingProfile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, email, status')
    .eq('email', email)
    .maybeSingle()

  if (profileError) {
    throw new Error(profileError.message || 'No se pudo verificar el perfil de Telegram.')
  }

  if (existingProfile?.status && existingProfile.status !== 'active') {
    const error = new Error('La cuenta asociada a Telegram esta deshabilitada.')
    error.code = 'ACCOUNT_DISABLED'
    throw error
  }

  if (existingProfile?.id) {
    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
      existingProfile.id,
      {
        password,
        user_metadata: metadata,
      },
    )

    if (authUpdateError) {
      throw new Error(authUpdateError.message || 'No se pudo actualizar la cuenta de Telegram.')
    }

    const { error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({
        display_name: displayName,
        email,
      })
      .eq('id', existingProfile.id)

    if (updateProfileError) {
      throw new Error(updateProfileError.message || 'No se pudo actualizar el perfil de Telegram.')
    }

    return { email, password, displayName }
  }

  const { data: createdUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  })

  if (createUserError || !createdUser?.user?.id) {
    throw new Error(createUserError?.message || 'No se pudo crear la cuenta de Telegram.')
  }

  const { error: profileUpsertError } = await supabaseAdmin.from('profiles').upsert(
    {
      id: createdUser.user.id,
      email,
      display_name: displayName,
      role: 'public',
      status: 'active',
    },
    { onConflict: 'id' },
  )

  if (profileUpsertError) {
    throw new Error(profileUpsertError.message || 'No se pudo guardar el perfil de Telegram.')
  }

  return { email, password, displayName }
}

function assertSupabaseAuthConfig() {
  if (!supabaseAdmin) {
    throw new Error('Supabase service role no esta configurado.')
  }
}

function isConnectivityError(error) {
  const message = String(error?.message || '').toLowerCase()
  const code = String(error?.cause?.code || error?.code || '').toUpperCase()

  return (
    message.includes('fetch failed') ||
    message.includes('getaddrinfo') ||
    message.includes('network') ||
    ['ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT'].includes(code)
  )
}

async function getAuthenticatedUser(authHeader, { requireStripe = true } = {}) {
  if (requireStripe) {
    assertServerConfig()
  } else {
    assertSupabaseAuthConfig()
  }

  const accessToken = normalizeBearerToken(authHeader)

  if (!accessToken) {
    const authError = new Error('Debes iniciar sesion antes de comprar.')
    authError.code = 'AUTH_REQUIRED'
    throw authError
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(accessToken)

  if (error || !user) {
    const authError = new Error('La sesion actual ya no es valida. Vuelve a iniciar sesion.')
    authError.code = 'AUTH_REQUIRED'
    throw authError
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, email, display_name, status, stripe_customer_id, role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || !profile) {
    throw new Error('No se encontro el perfil del cliente en Supabase.')
  }

  if (profile.status !== 'active') {
    throw new Error('La cuenta no se encuentra habilitada para compras.')
  }

  return { user, profile }
}

async function ensureStripeCustomer(profile) {
  assertServerConfig()

  if (profile.stripe_customer_id) {
    return profile.stripe_customer_id
  }

  const customer = await stripe.customers.create({
    email: profile.email,
    name: profile.display_name || profile.email,
    metadata: {
      supabase_user_id: profile.id,
    },
  })

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', profile.id)

  if (error) {
    throw new Error('No se pudo guardar el customer id de Stripe en el perfil.')
  }

  return customer.id
}

function buildLineItem(product, priceAmountOverride = null) {
  const effectiveAmount =
    Number.isFinite(priceAmountOverride) && priceAmountOverride > 0
      ? priceAmountOverride
      : product.price_amount
  const hasCustomAmount = Number.isFinite(priceAmountOverride) && priceAmountOverride > 0

  if (product.stripe_price_id && !hasCustomAmount) {
    return {
      price: product.stripe_price_id,
      quantity: 1,
    }
  }

  const productData = {
    name: product.title,
    metadata: {
      product_slug: product.slug,
      product_type: product.product_type,
      access_scope: product.access_scope,
    },
  }

  if (product.checkout_mode === 'subscription') {
    const interval = product.metadata?.billingInterval || 'month'

    return {
      price_data: {
        currency: (product.currency || 'USD').toLowerCase(),
        recurring: { interval },
        unit_amount: effectiveAmount,
        product_data: productData,
      },
      quantity: 1,
    }
  }

  return {
    price_data: {
      currency: (product.currency || 'USD').toLowerCase(),
      unit_amount: effectiveAmount,
      product_data: productData,
    },
    quantity: 1,
  }
}

function addMonths(date, monthsToAdd) {
  const nextDate = new Date(date)
  nextDate.setMonth(nextDate.getMonth() + monthsToAdd)
  return nextDate
}

function addDays(date, daysToAdd) {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + daysToAdd)
  return nextDate
}

function parseDateOrNull(value) {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function computeSubscriptionExpiry(baseDate, durationUnit, durationValue) {
  const safeBaseDate = parseDateOrNull(baseDate) || new Date()
  const safeDurationValue = Number.isFinite(durationValue) && durationValue > 0 ? durationValue : 1

  return durationUnit === 'days'
    ? addDays(safeBaseDate, safeDurationValue).toISOString()
    : addMonths(safeBaseDate, safeDurationValue).toISOString()
}

function isSubscriptionEntitlementKey(value = '') {
  return String(value || '').startsWith('tier:')
}

function isSubscriptionAccessScope(value = '') {
  return String(value || '').startsWith('tier:')
}

async function revokeOtherSubscriptionEntitlements(userId, keepKey = '') {
  if (!userId) {
    return
  }

  const { data: activeEntitlements, error } = await supabaseAdmin
    .from('entitlements')
    .select('id, entitlement_key')
    .eq('user_id', userId)
    .eq('status', 'active')

  if (error) {
    throw new Error(error.message || 'No se pudo revisar las suscripciones activas.')
  }

  const toRevoke = (activeEntitlements || []).filter(
    (entitlement) =>
      isSubscriptionEntitlementKey(entitlement.entitlement_key) &&
      entitlement.entitlement_key !== keepKey,
  )

  if (!toRevoke.length) {
    return
  }

  await Promise.all(
    toRevoke.map((entitlement) =>
      supabaseAdmin
        .from('entitlements')
        .update({
          status: 'revoked',
          expires_at: new Date().toISOString(),
        })
        .eq('id', entitlement.id),
    ),
  )
}

function normalizeCheckoutMode(product = {}) {
  if (product.product_type === 'subscription') {
    return 'subscription'
  }

  return product.checkout_mode || 'payment'
}

async function logAdminAuditEvent({
  eventType,
  actorProfile,
  targetUserId = null,
  entityType = 'user',
  entityId = null,
  payload = {},
}) {
  assertSupabaseAuthConfig()

  const { error } = await supabaseAdmin.from('admin_audit_events').insert({
    event_type: eventType,
    actor_id: actorProfile?.id || null,
    target_user_id: targetUserId,
    entity_type: entityType,
    entity_id: entityId,
    payload,
  })

  if (error) {
    console.warn('No se pudo guardar el evento de auditoria:', error.message || error)
    return false
  }

  return true
}

async function createOrUpdateOrder(checkoutSession, product, userId) {
  assertServerConfig()

  const sessionMetadata = checkoutSession.metadata || {}
  const orderPayload = {
    user_id: userId,
    provider: 'stripe',
    provider_order_id: checkoutSession.id,
    status: 'paid',
    total_amount: checkoutSession.amount_total || product.price_amount || 0,
    currency: (checkoutSession.currency || product.currency || 'USD').toUpperCase(),
    metadata: {
      stripeCheckoutSessionId: checkoutSession.id,
      stripeCustomerId: checkoutSession.customer,
      stripePaymentIntentId: checkoutSession.payment_intent || null,
      stripeSubscriptionId: checkoutSession.subscription || null,
      productSlug: product.slug,
      productType: product.product_type,
      checkoutMode: product.checkout_mode,
      checkoutType: sessionMetadata.checkout_type || product.product_type,
      subscriptionPlanPeriod: product.metadata?.planPeriod || null,
      subscriptionDurationValue: product.metadata?.durationValue || null,
      subscriptionDurationUnit: product.metadata?.durationUnit || null,
      reservationRequestId: sessionMetadata.reservation_request_id || null,
      reservationDate: sessionMetadata.reservation_date || null,
      reservationTime: sessionMetadata.reservation_time || null,
      paymentMethod: sessionMetadata.payment_method || null,
    },
  }

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .upsert(orderPayload, { onConflict: 'provider_order_id' })
    .select('id')
    .single()

  if (error || !order) {
    throw new Error('No se pudo registrar la orden en Supabase.')
  }

  const { data: existingItem } = await supabaseAdmin
    .from('order_items')
    .select('id')
    .eq('order_id', order.id)
    .eq('product_slug', product.slug)
    .maybeSingle()

  if (!existingItem) {
    const { error: itemError } = await supabaseAdmin.from('order_items').insert({
      order_id: order.id,
      product_slug: product.slug,
      quantity: 1,
      unit_amount: product.price_amount || 0,
      total_amount: checkoutSession.amount_total || product.price_amount || 0,
      metadata: {
        accessScope: product.access_scope,
      },
    })

    if (itemError) {
      throw new Error('No se pudo registrar el item de la orden.')
    }
  }

  return order.id
}

async function createManualReservationOrder({
  userId = null,
  guestName = '',
  selectedDate = '',
  selectedTime = '',
  recordingChoice = 'standard',
  pricing = null,
  modelSlug = '',
}) {
  const normalizedModelSlug =
    String(modelSlug || '').trim() ||
    (await resolveEncounterFallbackSlug(async () => loadEncounterModels({ includeHidden: false })))
  const resolvedModel =
    (await loadEncounterModelBySlug(normalizedModelSlug)) ||
    buildFallbackEncounterModel(await loadHomeContent())
  const resolvedPricing =
    pricing && typeof pricing === 'object' && Number.isFinite(pricing.advanceAmount)
      ? pricing
      : await getEncuentrosBookingPricing(recordingChoice, resolvedModel.slug)
  const reservationRequestId = `reservation-${normalizedModelSlug}-${selectedDate}-${selectedTime.replace(':', '')}-${Date.now()}`
  const now = new Date().toISOString()
  const advanceAmount = resolvedPricing.advanceAmount || 0
  const effectiveAmount = resolvedPricing.effectiveAmount || 0
  const remainingAmount = Number.isFinite(resolvedPricing.remainingAmount)
    ? resolvedPricing.remainingAmount
    : Math.max(0, effectiveAmount - advanceAmount)
  const order = {
    id: crypto.randomUUID(),
    provider_order_id: `manual-${reservationRequestId}`,
    status: 'pending',
    total_amount: advanceAmount,
    currency: resolvedPricing.currency || 'PEN',
    created_at: now,
    metadata: {
      checkoutType: 'reservation',
      productType: 'reservation',
      productSlug: `reservation-${normalizedModelSlug}`,
      modelSlug: normalizedModelSlug,
      modelName: resolvedModel.displayName,
      reservationRequestId,
      reservationGuestName: String(guestName || '').trim(),
      reservationName: String(guestName || '').trim(),
      reservationDate: selectedDate,
      reservationTime: selectedTime,
      reservationRecordingChoice: normalizeRecordingChoice(recordingChoice),
      reservationAdvanceAmount: advanceAmount,
      reservationTotalAmount: effectiveAmount,
      reservationRemainingAmount: remainingAmount,
      reservationBasePriceAmount: resolvedPricing.baseAmount || 0,
      reservationAdvanceLabel: resolvedPricing.advanceLabel || '',
      reservationTotalLabel: resolvedPricing.effectiveLabel || '',
      reservationRemainingLabel: resolvedPricing.remainingLabel || '',
      paymentMethod: 'PLIN / YAPE',
      paymentNumber: '+51931756041',
      paymentHolder: 'Silvia ****',
      reservationChannel: 'manual',
      reservationStatus: 'pending_manual_payment',
      userEmail: null,
    },
    items: [
      {
        id: crypto.randomUUID(),
        productSlug: `reservation-${normalizedModelSlug}`,
        quantity: 1,
        unitAmount: advanceAmount,
        totalAmount: advanceAmount,
        metadata: {
          reservationRequestId,
          modelSlug: normalizedModelSlug,
          reservationGuestName: String(guestName || '').trim(),
          reservationDate: selectedDate,
          reservationTime: selectedTime,
        },
      },
    ],
  }

  if (!supabaseAdmin) {
    return order
  }

  const { data: savedOrder, error: orderError } = await supabaseAdmin
    .from('orders')
    .upsert(
      {
        user_id: userId,
        provider: 'manual',
        provider_order_id: order.provider_order_id,
        status: order.status,
        total_amount: order.total_amount,
        currency: order.currency,
        metadata: order.metadata,
      },
      { onConflict: 'provider_order_id' },
    )
    .select('id, provider_order_id, status, total_amount, currency, created_at, metadata')
    .single()

  if (orderError || !savedOrder) {
    throw new Error('No se pudo registrar la reserva manual.')
  }

  const { data: existingItem } = await supabaseAdmin
    .from('order_items')
    .select('id')
    .eq('order_id', savedOrder.id)
    .eq('product_slug', `reservation-${normalizedModelSlug}`)
    .maybeSingle()

  if (!existingItem) {
    const { error: itemError } = await supabaseAdmin.from('order_items').insert({
      order_id: savedOrder.id,
      product_slug: `reservation-${normalizedModelSlug}`,
      quantity: 1,
      unit_amount: order.items[0].unitAmount,
      total_amount: order.items[0].totalAmount,
      metadata: order.items[0].metadata,
    })

    if (itemError) {
      throw new Error('No se pudo registrar el detalle de la reserva manual.')
    }
  }

  return {
    id: savedOrder.id,
    providerOrderId: savedOrder.provider_order_id || order.provider_order_id,
    status: savedOrder.status || order.status,
    totalAmount: savedOrder.total_amount || order.total_amount,
    currency: savedOrder.currency || order.currency,
    createdAt: savedOrder.created_at || order.created_at,
    metadata: savedOrder.metadata || order.metadata,
    items: order.items,
  }
}

async function createOrUpdateInvoiceOrder(invoice, subscription, product, userId) {
  assertServerConfig()

  const orderPayload = {
    user_id: userId,
    provider: 'stripe',
    provider_order_id: invoice.id,
    status: 'paid',
    total_amount: invoice.amount_paid || invoice.amount_due || product.price_amount || 0,
    currency: (invoice.currency || product.currency || 'USD').toUpperCase(),
    metadata: {
      stripeInvoiceId: invoice.id,
      stripeCustomerId: invoice.customer || null,
      stripeSubscriptionId: subscription?.id || invoice.subscription || null,
      stripePaymentIntentId: invoice.payment_intent || null,
      stripeBillingReason: invoice.billing_reason || null,
      productSlug: product.slug,
      checkoutMode: product.checkout_mode,
      subscriptionPlanPeriod: product.metadata?.planPeriod || null,
      subscriptionDurationValue: product.metadata?.durationValue || null,
      subscriptionDurationUnit: product.metadata?.durationUnit || null,
    },
  }

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .upsert(orderPayload, { onConflict: 'provider_order_id' })
    .select('id')
    .single()

  if (error || !order) {
    throw new Error('No se pudo registrar la renovacion en Supabase.')
  }

  return order.id
}

async function grantEntitlement(userId, product, orderId, options = {}) {
  if (!product.access_scope || product.product_type === 'physical') {
    return
  }

  let expiresAt = null

  if (isSubscriptionAccessScope(product.access_scope)) {
    if (options.expiresAt) {
      const parsedOverride = parseDateOrNull(options.expiresAt)
      if (parsedOverride) {
        expiresAt = parsedOverride.toISOString()
      }
    }

    if (!expiresAt) {
      const durationValue = Number.parseInt(
        product.metadata?.durationValue || product.metadata?.durationMonths || '0',
        10,
      )
      const durationUnit = product.metadata?.durationUnit === 'days' ? 'days' : 'months'
      const safeDurationValue = Number.isFinite(durationValue) && durationValue > 0 ? durationValue : 1
      const { data: currentEntitlement } = await supabaseAdmin
        .from('entitlements')
        .select('expires_at')
        .eq('user_id', userId)
        .eq('entitlement_key', product.access_scope)
        .maybeSingle()

      const currentExpiry = currentEntitlement?.expires_at
        ? new Date(currentEntitlement.expires_at)
        : null
      const baseDate =
        currentExpiry && currentExpiry.getTime() > Date.now() ? currentExpiry : new Date()

        expiresAt = computeSubscriptionExpiry(baseDate, durationUnit, safeDurationValue)
    }

    await revokeOtherSubscriptionEntitlements(userId, product.access_scope)
  }

  const entitlementPayload = {
    user_id: userId,
    product_slug: product.slug,
    entitlement_key: product.access_scope,
    status: 'active',
    source_order_id: orderId,
    grant_source: 'checkout',
    granted_by: null,
    expires_at: expiresAt,
  }

  const { error } = await supabaseAdmin
    .from('entitlements')
    .upsert(entitlementPayload, { onConflict: 'user_id,entitlement_key' })

  if (error) {
    throw new Error('No se pudo otorgar el entitlement al cliente.')
  }
}

function shapeProductRecord(product) {
  return {
    slug: product.slug,
    title: product.title,
    product_type: product.productType || product.product_type,
    checkout_mode: product.checkoutMode || product.checkout_mode,
    access_scope: product.accessScope || product.access_scope,
    price_amount: product.priceAmount || product.price_amount || 0,
    currency: product.currency || 'USD',
    active: product.active !== false,
    stripe_price_id: product.stripePriceId || product.stripe_price_id || null,
    metadata: product.metadata || {},
  }
}

async function fetchProductRowFromTable(tableName, productSlug) {
  try {
    const { data, error } = await supabaseAdmin
      .from(tableName)
      .select(
        'slug, title, product_type, checkout_mode, access_scope, price_amount, currency, active, stripe_price_id, metadata',
      )
      .eq('slug', productSlug)
      .maybeSingle()

    if (error) {
      throw error
    }

    return {
      row: data || null,
      missingTable: false,
    }
  } catch (error) {
    throw error
  }
}

async function resolveProductBySlug(productSlug) {
  assertServerConfig()

  const useDerivedRuntime =
    String(productSlug || '').startsWith('blog-') || productSlug === 'reservation-encuentros'

  if (useDerivedRuntime) {
    const [mergedContent, blogPosts] = await Promise.all([loadHomeContent(), loadBlogPosts()])
    const derivedProduct = buildDerivedProducts(mergedContent, blogPosts).find(
      (item) => item.slug === productSlug,
    )

    if (derivedProduct) {
      return shapeProductRecord(derivedProduct)
    }
  }

  let { row: product } = await fetchProductRowFromTable('products', productSlug)

  if (product && product.active !== false) {
    return product
  }

  await syncProductsFromSiteContent()

  const nextResult = await fetchProductRowFromTable('products', productSlug)
  product = nextResult.row

  if (product && product.active !== false) {
    return product
  }

  const productError = new Error('El producto solicitado no esta disponible.')
  productError.code = 'PRODUCT_NOT_FOUND'
  throw productError
}

async function getEncuentrosBookingPricing(recordingChoice = 'standard', modelSlug = '') {
  const normalizedSlug = String(modelSlug || '').trim()
  const model =
    (normalizedSlug ? await loadEncounterModelBySlug(normalizedSlug) : null) ||
    buildFallbackEncounterModel(await loadHomeContent())
  return buildEncuentrosBookingPricing(model.content, normalizeRecordingChoice(recordingChoice))
}

async function syncRowsToTable(tableName, rows, stalePrefixes) {
  if (tableName !== 'products' || !rows.length) {
    return
  }

  const { data: existingRows, error: loadError } = await supabaseAdmin
    .from(tableName)
    .select('slug')
    .in(
      'slug',
      rows.map((row) => row.slug),
  )

  if (loadError) {
    throw new Error(`No se pudo sincronizar ${tableName} desde site_content.`)
  }

  const existingSlugs = new Set((existingRows || []).map((row) => row.slug))

  const results = await Promise.all(
    rows.map((row) =>
      existingSlugs.has(row.slug)
        ? supabaseAdmin.from(tableName).update(row).eq('slug', row.slug)
        : supabaseAdmin.from(tableName).insert(row),
    ),
  )

  const failedResult = results.find((result) => result?.error)
  if (failedResult?.error) {
    throw new Error(`No se pudo sincronizar ${tableName} desde site_content.`)
  }

  const rowSlugs = new Set(rows.map((row) => row.slug))
  const { data: allRows, error: allRowsError } = await supabaseAdmin.from(tableName).select('slug')

  if (allRowsError) {
    throw new Error(`No se pudo verificar ${tableName} obsoletos.`)
  }

  const staleSlugs = (allRows || [])
    .map((row) => row.slug)
    .filter(
      (slug) =>
        stalePrefixes.some((prefix) => String(slug || '').startsWith(prefix)) && !rowSlugs.has(slug),
    )

  if (!staleSlugs.length) {
    return
  }

  const { error: cleanupError } = await supabaseAdmin
    .from(tableName)
    .update({ active: false })
    .in('slug', staleSlugs)

  if (cleanupError) {
    throw new Error(`No se pudieron desactivar ${tableName} obsoletos.`)
  }
}

async function syncProductsFromSiteContent() {
  assertServerConfig()

  try {
    const [mergedContent, blogPosts] = await Promise.all([loadHomeContent(), loadBlogPosts()])
    const generatedProducts = buildDefaultProducts(mergedContent, blogPosts)

    const persistentProducts = generatedProducts
      .filter((product) => isPersistentProductType(product.productType))
      .map((product) => ({
        slug: product.slug,
        title: product.title,
        product_type: product.productType,
        checkout_mode: product.checkoutMode,
        access_scope: product.accessScope,
        price_amount: product.priceAmount,
        currency: product.currency,
        price_label: product.priceLabel,
        active: product.active !== false,
        stripe_price_id: product.stripePriceId || null,
        metadata: product.metadata || {},
      }))

    await syncRowsToTable('products', persistentProducts, [
      'membership-',
      'video-',
      'pack-',
      'physical-',
      'blog-',
      'reservation-',
    ])
  } catch (error) {
    if (isConnectivityError(error)) {
      console.warn(
        'Product sync skipped on startup because Supabase is unreachable in this environment.',
      )
      return
    }

    throw error
  }
}

async function handleCheckoutCompleted(checkoutSession) {
  assertServerConfig()

  const metadata = checkoutSession.metadata || {}
  const userId = metadata.user_id || checkoutSession.client_reference_id
  const productSlug = metadata.product_slug

  if (!userId || !productSlug) {
    return
  }

  const product = await resolveProductBySlug(productSlug)
  const orderId = await createOrUpdateOrder(checkoutSession, product, userId)

  if (product.product_type === 'reservation') {
    return
  }

  const subscriptionId =
    checkoutSession.mode === 'subscription' ? checkoutSession.subscription || null : null

  if (subscriptionId && product.checkout_mode === 'subscription' && isSubscriptionAccessScope(product.access_scope) && stripe) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const expiresAt = subscription?.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null

    await grantEntitlement(userId, product, orderId, { expiresAt })
    return
  }

  await grantEntitlement(userId, product, orderId)
}

async function handleSubscriptionDeleted(subscription) {
  assertServerConfig()

  const stripeCustomerId = subscription.customer

  if (!stripeCustomerId) {
    return
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', stripeCustomerId)
    .maybeSingle()

  if (!profile) {
    return
  }

  await revokeOtherSubscriptionEntitlements(profile.id)
}

async function handleInvoicePaymentSucceeded(invoice) {
  assertServerConfig()

  const subscriptionId = invoice.subscription || null

  if (!subscriptionId) {
    return
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const metadata = subscription?.metadata || {}
  const userId = metadata.user_id || ''
  const productSlug = metadata.product_slug || ''

  if (!userId || !productSlug) {
    return
  }

  const product = await resolveProductBySlug(productSlug)
  const orderId = await createOrUpdateInvoiceOrder(invoice, subscription, product, userId)
  const expiresAt = subscription?.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null

  await grantEntitlement(userId, product, orderId, { expiresAt })
}

async function provisionManagedUser(payload, adminProfile) {
  assertServerConfig()

  const email = String(payload.email || '').trim().toLowerCase()
  const displayName = String(payload.name || '').trim()
  const password = String(payload.password || '').trim()
  const role = payload.role === 'admin' ? 'admin' : 'public'
  const status = payload.status === 'disabled' ? 'disabled' : 'active'
  const subscriptionPlanSlug = String(payload.subscriptionPlanSlug || '').trim()
  const rawDurationValue = Number.parseInt(payload.subscriptionDurationValue || '0', 10)
  const durationValue = Number.isFinite(rawDurationValue) && rawDurationValue > 0 ? rawDurationValue : 0
  const durationUnit = payload.subscriptionDurationUnit === 'days' ? 'days' : 'months'
  const subscriptionStartAt = parseDateOrNull(payload.subscriptionStartAt) || new Date()

  if (!email) {
    const error = new Error('Falta el correo del usuario.')
    error.code = 'BAD_REQUEST'
    throw error
  }

  if (!password) {
    const error = new Error('Falta la clave del usuario.')
    error.code = 'BAD_REQUEST'
    throw error
  }

  let userId = ''
  const { data: existingProfile, error: existingProfileError } = await supabaseAdmin
    .from('profiles')
    .select('id, email')
    .ilike('email', email)
    .maybeSingle()

  if (existingProfileError) {
    throw new Error('No se pudo verificar si el usuario ya existia.')
  }

  if (existingProfile?.id) {
    userId = existingProfile.id

    const authUpdatePayload = {
      email,
      password,
      user_metadata: {
        display_name: displayName,
      },
    }

    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      authUpdatePayload,
    )

    if (authUpdateError) {
      throw new Error(authUpdateError.message || 'No se pudo actualizar la cuenta del usuario.')
    }
  } else {
    const { data: createdUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser(
      {
        email,
        password,
        email_confirm: true,
        user_metadata: {
          display_name: displayName,
        },
      },
    )

    if (createUserError || !createdUser?.user?.id) {
      throw new Error(createUserError?.message || 'No se pudo crear la cuenta del usuario.')
    }

    userId = createdUser.user.id
  }

  const { error: profileError } = await supabaseAdmin.from('profiles').upsert(
    {
      id: userId,
      email,
      display_name: displayName,
      role,
      status,
    },
    { onConflict: 'id' },
  )

  if (profileError) {
    throw new Error(profileError.message || 'No se pudo guardar el perfil del usuario.')
  }

  let createdEntitlement = null

  if (subscriptionPlanSlug) {
    createdEntitlement = await upsertManagedSubscription({
      userId,
      planSlug: subscriptionPlanSlug,
      startAt: subscriptionStartAt,
      durationValue,
      durationUnit,
      action: 'grant',
      adminProfile,
    })
  }

  await logAdminAuditEvent({
    eventType: 'managed_user_created',
    actorProfile: adminProfile,
    targetUserId: userId,
    entityType: 'profile',
    entityId: userId,
    payload: {
      role,
      status,
      subscriptionPlanSlug: subscriptionPlanSlug || null,
      hasSubscription: Boolean(createdEntitlement),
    },
  })

  const { data: profile, error: profileLoadError } = await supabaseAdmin
    .from('profiles')
    .select('id, email, display_name, status, stripe_customer_id, role, created_at')
    .eq('id', userId)
    .maybeSingle()

  if (profileLoadError || !profile) {
    throw new Error('No se pudo leer el perfil creado.')
  }

  return {
    profile,
    entitlement: createdEntitlement,
  }
}

async function upsertManagedSubscription({
  userId,
  planSlug,
  startAt,
  durationValue,
  durationUnit,
  action = 'grant',
  adminProfile,
}) {
  assertServerConfig()

  if (action === 'revoke') {
    await revokeOtherSubscriptionEntitlements(userId)

    await logAdminAuditEvent({
      eventType: 'managed_subscription_revoked',
      actorProfile: adminProfile,
      targetUserId: userId,
      entityType: 'entitlement',
      entityId: `${userId}:subscription`,
      payload: {
        entitlementKey: planSlug || 'subscription',
        planSlug: planSlug || null,
      },
    })

    return null
  }

  const { data: product, error: productError } = await supabaseAdmin
    .from('products')
    .select(
      'slug, title, product_type, checkout_mode, access_scope, price_amount, currency, active, stripe_price_id, metadata',
    )
    .eq('slug', planSlug)
    .eq('active', true)
    .maybeSingle()

  if (productError) {
    throw new Error(productError.message || 'No se pudo leer el plan de suscripcion.')
  }

  if (!product || !isSubscriptionAccessScope(product.access_scope)) {
    const error = new Error('El plan de suscripcion seleccionado no esta disponible.')
    error.code = 'PLAN_NOT_FOUND'
    throw error
  }

  const selectedDurationValue =
    Number.isFinite(durationValue) && durationValue > 0
      ? durationValue
      : Number.parseInt(product.metadata?.durationValue || product.metadata?.durationMonths || '1', 10)
  const selectedDurationUnit =
    durationUnit === 'days' || durationUnit === 'months'
      ? durationUnit
      : product.metadata?.durationUnit === 'days'
        ? 'days'
        : 'months'
  const expiresAt = computeSubscriptionExpiry(startAt, selectedDurationUnit, selectedDurationValue)

  await revokeOtherSubscriptionEntitlements(userId, product.access_scope)

  const entitlementPayload = {
    user_id: userId,
    product_slug: product.slug,
    entitlement_key: product.access_scope,
    status: 'active',
    source_order_id: null,
    grant_source: 'admin',
    granted_by: adminProfile?.id || null,
    expires_at: expiresAt,
  }

  const { data: entitlement, error: entitlementError } = await supabaseAdmin
    .from('entitlements')
    .upsert(entitlementPayload, { onConflict: 'user_id,entitlement_key' })
    .select(
      'id, user_id, product_slug, entitlement_key, status, expires_at, created_at, grant_source, granted_by',
    )
    .single()

  if (entitlementError) {
    throw new Error(entitlementError.message || 'No se pudo asignar la suscripcion al usuario.')
  }

  await logAdminAuditEvent({
    eventType: 'managed_subscription_granted',
    actorProfile: adminProfile,
    targetUserId: userId,
    entityType: 'entitlement',
    entityId: entitlement?.id || `${userId}:${product.access_scope}`,
    payload: {
      entitlementKey: product.access_scope,
      planSlug: product.slug,
      expiresAt,
      durationValue: selectedDurationValue,
      durationUnit: selectedDurationUnit,
    },
  })

  return entitlement || null
}

async function loadHomeContent() {
  if (!supabaseAdmin) {
    return mergeSiteContent(defaultSiteContent)
  }

  const now = Date.now()

  if (homeContentCache.value && now - homeContentCache.loadedAt < HOME_CONTENT_CACHE_TTL_MS) {
    return homeContentCache.value
  }

  if (homeContentCache.pending) {
    return homeContentCache.pending
  }

  homeContentCache.pending = (async () => {
    const { data: contentRow } = await supabaseAdmin
      .from('site_content')
      .select('content')
      .eq('slug', 'home')
      .maybeSingle()

    const mergedContent = contentRow?.content
      ? mergeSiteContent(contentRow.content)
      : mergeSiteContent(defaultSiteContent)

    homeContentCache = {
      value: mergedContent,
      loadedAt: Date.now(),
      pending: null,
    }

    return mergedContent
  })()

  try {
    return await homeContentCache.pending
  } catch (error) {
    homeContentCache.pending = null
    throw error
  }
}

function buildFallbackEncounterModel(content = mergeSiteContent(defaultSiteContent)) {
  const mergedContent = mergeSiteContent(content)
  const displayName =
    mergedContent.encuentrosBooking?.galleryTitle ||
    mergedContent.heroTitle ||
    'Modelo'

  return {
    id: 'legacy-encuentros-model',
    slug: DEFAULT_ENCUENTROS_MODEL_SLUG,
    displayName,
    status: 'published',
    sortOrder: 0,
    content: mergedContent,
    publishedAt: new Date().toISOString(),
    deletedAt: null,
    createdAt: null,
    updatedAt: null,
    isFallback: true,
  }
}

function normalizeEncounterModelRow(row = {}, fallbackIndex = 0) {
  const displayName =
    row.display_name || row.displayName || row.slug || `Modelo ${fallbackIndex + 1}`
  const sortOrderValue =
    row.sort_order ?? row.sortOrder ?? row.sort_order_value ?? row.sortOrderValue

  return {
    id: row.id || `encuentros-model-${fallbackIndex}`,
    slug: row.slug || `${DEFAULT_ENCUENTROS_MODEL_SLUG}-${fallbackIndex + 1}`,
    displayName,
    status: row.status || 'draft',
    sortOrder: Number.isFinite(sortOrderValue) ? sortOrderValue : fallbackIndex,
    content: mergeSiteContent(row.content || {}),
    publishedAt: row.published_at || row.publishedAt || null,
    deletedAt: row.deleted_at || row.deletedAt || null,
    createdAt: row.created_at || row.createdAt || null,
    updatedAt: row.updated_at || row.updatedAt || null,
  }
}

function normalizeEncounterModelRequestRow(row = {}, fallbackIndex = 0) {
  return {
    id: row.id || `encuentros-model-request-${fallbackIndex}`,
    slug: row.slug || row.request_slug || '',
    displayName: row.display_name || row.displayName || `Solicitud ${fallbackIndex + 1}`,
    email: row.email || row.request_email || row.contact_email || '',
    city: row.city || row.request_city || '',
    nationality: row.nationality || row.request_nationality || '',
    phone: row.phone || row.request_phone || '',
    telegram: row.telegram || row.request_telegram || '',
    bio: row.bio || row.request_bio || '',
    notes: row.notes || row.request_notes || '',
    verificationPhotoUrl: row.verification_photo_url || row.verificationPhotoUrl || '',
    status: row.status || 'pending',
    modelId: row.model_id || row.modelId || null,
    reviewNotes: row.review_notes || row.reviewNotes || '',
    reviewedBy: row.reviewed_by || row.reviewedBy || null,
    reviewedAt: row.reviewed_at || row.reviewedAt || null,
    submittedBy: row.submitted_by || row.submittedBy || null,
    createdAt: row.created_at || row.createdAt || null,
    updatedAt: row.updated_at || row.updatedAt || null,
  }
}

function isMissingEncounterModelRelationTableError(error) {
  const message = String(error?.message || error || '')

  return (
    message.includes('encuentros_model_profiles') ||
    message.includes('encuentros_model_booking') ||
    message.includes('encuentros_model_recording') ||
    message.includes('encuentros_model_social_links') ||
    message.includes('encuentros_model_media') ||
    message.includes('schema cache') ||
    message.includes('does not exist') ||
    message.includes('relation "public.encuentros_model_')
  )
}

function normalizeEncounterModelAge(value) {
  const numeric = Number.parseInt(String(value ?? '').replace(/[^\d-]/g, ''), 10)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null
}

function normalizeEncounterModelText(value) {
  return String(value || '').trim()
}

function uniqueEncounterValues(values = []) {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)))
}

function normalizeEncounterModelTextList(value = []) {
  if (Array.isArray(value)) {
    return uniqueEncounterValues(value)
  }

  const text = String(value || '').trim()

  if (!text) {
    return []
  }

  return uniqueEncounterValues(
    text
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean),
  )
}

function normalizeEncounterMediaUrl(value = '') {
  const text = String(value || '').trim()
  if (!text) return ''
  return text
}

function extractEncounterModelProfilePayload(content = {}) {
  return {
    age: normalizeEncounterModelAge(content.profileAge ?? content.age),
    city: normalizeEncounterModelText(content.profileCity ?? content.city ?? content.profileLocation),
    nationality: normalizeEncounterModelText(
      content.profileNationality ?? content.nationality ?? content.country,
    ),
    top_badge: normalizeEncounterModelText(
      content.profileTopBadge ?? content.topBadge ?? content.badgeTop ?? content.featuredBadge,
    ),
    avatar_url: normalizeEncounterModelText(
      content.profileAvatarUrl ?? content.avatarUrl ?? content.profilePhotoUrl ?? '',
    ),
    attendance_modes: normalizeEncounterModelTextList(
      content.profileAttendanceModes ?? content.attendanceModes ?? content.attendanceMode ?? [],
    ),
    voice_audio_url: normalizeEncounterModelText(
      content.profileVoiceAudioUrl ?? content.voiceAudioUrl ?? '',
    ),
    voice_audio_label: normalizeEncounterModelText(
      content.profileVoiceAudioLabel ?? content.voiceAudioLabel ?? '',
    ),
  }
}

function extractEncounterModelBookingPayload(content = {}) {
  const booking = content.encuentrosBooking || {}

  return {
    eyebrow: normalizeEncounterModelText(booking.eyebrow),
    title: normalizeEncounterModelText(booking.title),
    description: normalizeEncounterModelText(booking.description),
    gallery_title: normalizeEncounterModelText(booking.galleryTitle),
    gallery_subtitle: normalizeEncounterModelText(booking.gallerySubtitle),
    gallery_exclusive_title: normalizeEncounterModelText(booking.galleryExclusiveTitle),
    gallery_exclusive_description: normalizeEncounterModelText(booking.galleryExclusiveDescription),
    gallery_exclusive_hint: normalizeEncounterModelText(booking.galleryExclusiveHint),
    price_label: normalizeEncounterModelText(booking.priceLabel),
    price_amount: Number.isFinite(Number(booking.priceAmount)) ? Number(booking.priceAmount) : null,
    advance_label: normalizeEncounterModelText(booking.advanceLabel),
    advance_amount: Number.isFinite(Number(booking.advanceAmount)) ? Number(booking.advanceAmount) : null,
    recording_discount_percent: Number.isFinite(Number(booking.recordingDiscountPercent))
      ? Number(booking.recordingDiscountPercent)
      : 0,
    recording_discount_label: normalizeEncounterModelText(booking.recordingDiscountLabel),
    recording_prompt_title: normalizeEncounterModelText(booking.recordingPromptTitle),
    recording_prompt_description: normalizeEncounterModelText(booking.recordingPromptDescription),
    recording_yes_label: normalizeEncounterModelText(booking.recordingYesLabel),
    recording_no_label: normalizeEncounterModelText(booking.recordingNoLabel),
    currency: normalizeEncounterModelText(booking.currency),
    duration_minutes: Number.isFinite(Number(booking.durationMinutes)) ? Number(booking.durationMinutes) : null,
    available_dates: Array.isArray(booking.availableDates)
      ? booking.availableDates.map((value) => normalizeEncounterModelText(value)).filter(Boolean)
      : [],
    booking_start_time: normalizeEncounterModelText(booking.bookingStartTime),
    booking_end_time: normalizeEncounterModelText(booking.bookingEndTime),
    slot_interval_minutes: Number.isFinite(Number(booking.slotIntervalMinutes))
      ? Number(booking.slotIntervalMinutes)
      : null,
    availability_mode: normalizeEncounterModelText(booking.availabilityMode || 'everyday') || 'everyday',
    available_days: Number.isFinite(Number(booking.availableDays)) ? Number(booking.availableDays) : null,
    payment_methods: Array.isArray(booking.paymentMethods)
      ? booking.paymentMethods
          .map((method) => ({
            value: normalizeEncounterModelText(method?.value),
            label: normalizeEncounterModelText(method?.label || method?.value),
          }))
          .filter((method) => method.value)
      : [],
    login_note: normalizeEncounterModelText(booking.loginNote),
  }
}

function extractEncounterModelRecordingPayload(content = {}) {
  const rawValue =
    content.recordsEncounters ??
    content.recordingEnabled ??
    content.encuentrosRecording?.enabled ??
    content.encuentrosRecording?.recordsEncounters ??
    false

  return {
    records_encounters:
      rawValue === true ||
      rawValue === 'true' ||
      rawValue === '1' ||
      rawValue === 1 ||
      rawValue === 'yes',
  }
}

function extractEncounterModelSocialLinks(content = {}) {
  const rawLinks = Array.isArray(content.socialLinks)
    ? content.socialLinks
    : Array.isArray(content.profileSocialLinks)
      ? content.profileSocialLinks
      : []

  return rawLinks
    .map((link, index) => ({
      network: normalizeSocialNetworkValue(link?.network || link?.value || link?.slug || link?.label || ''),
      label: normalizeEncounterModelText(link?.label || link?.network || link?.value || link?.slug || ''),
      url: normalizeEncounterModelText(link?.url || link?.href || ''),
      sort_order: Number.isFinite(Number(link?.sortOrder)) ? Number(link.sortOrder) : index,
      active: link?.active !== false,
    }))
    .filter((link) => link.network || link.url)
}

function extractEncounterModelMedia(content = {}) {
  const galleryPools = [
    { slot: 'gallery', kind: 'image', values: content.profileGalleryImages },
    { slot: 'gallery', kind: 'image', values: content.galleryImages },
    { slot: 'top', kind: 'image', values: content.topCarouselImages },
    { slot: 'bottom', kind: 'image', values: content.bottomCarouselImages },
  ]

  const media = []

  galleryPools.forEach((pool) => {
    if (!Array.isArray(pool.values)) {
      return
    }

    pool.values.forEach((item, index) => {
      const url = normalizeEncounterMediaUrl(
        typeof item === 'string' ? item : item?.src || item?.image || item?.url || '',
      )

      if (!url) {
        return
      }

      media.push({
        kind: pool.kind,
        slot: pool.slot,
        url,
        alt_text: normalizeEncounterModelText(item?.alt || item?.caption || item?.title || ''),
        caption: normalizeEncounterModelText(item?.caption || item?.title || ''),
        sort_order: index,
        active: true,
      })
    })
  })

  const voiceAudioUrl = normalizeEncounterModelText(content.profileVoiceAudioUrl || content.voiceAudioUrl || '')

  if (voiceAudioUrl) {
    media.push({
      kind: 'audio',
      slot: 'voice',
      url: voiceAudioUrl,
      alt_text: normalizeEncounterModelText(content.profileVoiceAudioLabel || content.voiceAudioLabel || ''),
      caption: normalizeEncounterModelText(content.profileVoiceAudioLabel || content.voiceAudioLabel || ''),
      sort_order: 0,
      active: true,
    })
  }

  return media
}

function hydrateEncounterModelContent(baseContent = {}, relationData = {}) {
  const mergedContent = mergeSiteContent(baseContent || {})
  const profile = relationData.profile || null
  const booking = relationData.booking || null
  const recording = relationData.recording || null
  const fallbackSocialLinks = Array.isArray(mergedContent.socialLinks)
    ? mergedContent.socialLinks
    : Array.isArray(mergedContent.profileSocialLinks)
      ? mergedContent.profileSocialLinks
      : []
  const socialLinks = Array.isArray(relationData.socialLinks) && relationData.socialLinks.length
    ? relationData.socialLinks
    : fallbackSocialLinks
  const media = Array.isArray(relationData.media) ? relationData.media : []
  const imageRows = media.filter((row) => row.kind === 'image' && row.active !== false)
  const audioRow = media.find((row) => row.kind === 'audio' && row.slot === 'voice' && row.active !== false)

  const profileGalleryImages = uniqueEncounterValues(
    imageRows
      .filter((row) => row.slot === 'gallery')
      .sort((left, right) => (left.sort_order || 0) - (right.sort_order || 0))
      .map((row) => row.url),
  )

  const topCarouselImages = uniqueEncounterValues(
    imageRows
      .filter((row) => row.slot === 'top')
      .sort((left, right) => (left.sort_order || 0) - (right.sort_order || 0))
      .map((row) => row.url),
  )

  const bottomCarouselImages = uniqueEncounterValues(
    imageRows
      .filter((row) => row.slot === 'bottom')
      .sort((left, right) => (left.sort_order || 0) - (right.sort_order || 0))
      .map((row) => row.url),
  )

  return mergeSiteContent({
    ...mergedContent,
    profileAge: profile?.age ?? mergedContent.profileAge ?? '',
    profileCity: profile?.city ?? mergedContent.profileCity ?? '',
    profileLocation: profile?.city ?? mergedContent.profileLocation ?? mergedContent.profileCity ?? '',
    profileNationality: profile?.nationality ?? mergedContent.profileNationality ?? '',
    profileTopBadge: profile?.top_badge ?? mergedContent.profileTopBadge ?? '',
    profileAvatarUrl: profile?.avatar_url ?? mergedContent.profileAvatarUrl ?? mergedContent.avatarUrl ?? '',
    profileAttendanceModes:
      profile?.attendance_modes ?? mergedContent.profileAttendanceModes ?? mergedContent.attendanceModes ?? [],
    profileVoiceAudioUrl: audioRow?.url || profile?.voice_audio_url || mergedContent.profileVoiceAudioUrl || '',
    profileVoiceAudioLabel:
      audioRow?.caption || profile?.voice_audio_label || mergedContent.profileVoiceAudioLabel || '',
    recordsEncounters:
      recording?.records_encounters ?? mergedContent.recordsEncounters ?? mergedContent.recordingEnabled ?? false,
    recordingEnabled:
      recording?.records_encounters ?? mergedContent.recordingEnabled ?? mergedContent.recordsEncounters ?? false,
    socialLinks: socialLinks
      .filter((link) => link.active !== false)
      .sort((left, right) => (left.sort_order || 0) - (right.sort_order || 0))
      .map((link) => ({
        network: normalizeSocialNetworkValue(link.network || link.label || ''),
        label: link.label || link.network || '',
        url: link.url || '',
      })),
    profileGalleryImages: profileGalleryImages,
    topCarouselImages: topCarouselImages.length ? topCarouselImages : mergedContent.topCarouselImages || [],
    bottomCarouselImages: bottomCarouselImages.length
      ? bottomCarouselImages
      : mergedContent.bottomCarouselImages || [],
    encuentrosBooking: mergeSiteContent({
      ...mergedContent.encuentrosBooking,
      ...(booking || {}),
      ...(booking
        ? {
            eyebrow: booking.eyebrow,
            title: booking.title,
            description: booking.description,
            galleryTitle: booking.gallery_title,
            gallerySubtitle: booking.gallery_subtitle,
            galleryExclusiveTitle: booking.gallery_exclusive_title,
            galleryExclusiveDescription: booking.gallery_exclusive_description,
            galleryExclusiveHint: booking.gallery_exclusive_hint,
            priceLabel: booking.price_label,
            priceAmount: booking.price_amount ?? mergedContent.encuentrosBooking?.priceAmount ?? 0,
            advanceLabel: booking.advance_label,
            advanceAmount: booking.advance_amount ?? mergedContent.encuentrosBooking?.advanceAmount ?? 0,
            recordingDiscountPercent:
              booking.recording_discount_percent ?? mergedContent.encuentrosBooking?.recordingDiscountPercent ?? 0,
            recordingDiscountLabel: booking.recording_discount_label,
            recordingPromptTitle: booking.recording_prompt_title,
            recordingPromptDescription: booking.recording_prompt_description,
            recordingYesLabel: booking.recording_yes_label,
            recordingNoLabel: booking.recording_no_label,
            currency: booking.currency,
            durationMinutes: booking.duration_minutes,
            availableDates: booking.available_dates || mergedContent.encuentrosBooking?.availableDates || [],
            bookingStartTime: booking.booking_start_time,
            bookingEndTime: booking.booking_end_time,
            slotIntervalMinutes: booking.slot_interval_minutes,
            availabilityMode: booking.availability_mode,
            availableDays: booking.available_days,
            paymentMethods: booking.payment_methods || mergedContent.encuentrosBooking?.paymentMethods || [],
            loginNote: booking.login_note,
          }
        : {}),
    }),
  })
}

function buildEncounterModelRecordPayload(payload = {}, existingRow = null, adminProfile = null) {
  const content = mergeSiteContent({
    ...(existingRow?.content || {}),
    ...(payload.content || {}),
  })

  return {
    main: normalizeEncounterModelPayload(payload, existingRow, adminProfile),
    profile: extractEncounterModelProfilePayload(content),
    booking: extractEncounterModelBookingPayload(content),
    recording: extractEncounterModelRecordingPayload(content),
    socialLinks: extractEncounterModelSocialLinks(content),
    media: extractEncounterModelMedia(content),
  }
}

async function fetchEncounterRelationRows(modelIds = []) {
  if (!supabaseAdmin || !modelIds.length) {
    return {
      profileRows: [],
      bookingRows: [],
      recordingRows: [],
      socialRows: [],
      mediaRows: [],
    }
  }

  const [
    profileRowsResult,
    bookingRowsResult,
    recordingRowsResult,
    socialRowsResult,
    mediaRowsResult,
  ] = await Promise.all([
    supabaseAdmin.from('encuentros_model_profiles').select('*').in('model_id', modelIds),
    supabaseAdmin.from('encuentros_model_booking').select('*').in('model_id', modelIds),
    supabaseAdmin.from('encuentros_model_recording').select('*').in('model_id', modelIds),
    supabaseAdmin.from('encuentros_model_social_links').select('*').in('model_id', modelIds),
    supabaseAdmin.from('encuentros_model_media').select('*').in('model_id', modelIds),
  ])

  if (
    profileRowsResult.error &&
    !isMissingEncounterModelRelationTableError(profileRowsResult.error)
  ) {
    throw profileRowsResult.error
  }

  if (bookingRowsResult.error && !isMissingEncounterModelRelationTableError(bookingRowsResult.error)) {
    throw bookingRowsResult.error
  }

  if (
    recordingRowsResult?.error &&
    !isMissingEncounterModelRelationTableError(recordingRowsResult.error)
  ) {
    throw recordingRowsResult.error
  }

  if (socialRowsResult.error && !isMissingEncounterModelRelationTableError(socialRowsResult.error)) {
    throw socialRowsResult.error
  }

  if (mediaRowsResult.error && !isMissingEncounterModelRelationTableError(mediaRowsResult.error)) {
    throw mediaRowsResult.error
  }

  return {
    profileRows: profileRowsResult.data || [],
    bookingRows: bookingRowsResult.data || [],
    recordingRows: recordingRowsResult.data || [],
    socialRows: socialRowsResult.data || [],
    mediaRows: mediaRowsResult.data || [],
  }
}

function mergeEncounterModelsWithRelations(models = [], relations = {}) {
  const profileByModelId = new Map((relations.profileRows || []).map((row) => [row.model_id, row]))
  const bookingByModelId = new Map((relations.bookingRows || []).map((row) => [row.model_id, row]))
  const recordingByModelId = new Map((relations.recordingRows || []).map((row) => [row.model_id, row]))
  const socialByModelId = new Map()
  const mediaByModelId = new Map()

  ;(relations.socialRows || []).forEach((row) => {
    const list = socialByModelId.get(row.model_id) || []
    list.push(row)
    socialByModelId.set(row.model_id, list)
  })

  ;(relations.mediaRows || []).forEach((row) => {
    const list = mediaByModelId.get(row.model_id) || []
    list.push(row)
    mediaByModelId.set(row.model_id, list)
  })

  return models.map((model) =>
    normalizeEncounterModelRow({
      ...model,
      content: hydrateEncounterModelContent(model.content || {}, {
        profile: profileByModelId.get(model.id) || null,
        booking: bookingByModelId.get(model.id) || null,
        recording: recordingByModelId.get(model.id) || null,
        socialLinks: socialByModelId.get(model.id) || [],
        media: mediaByModelId.get(model.id) || [],
      }),
    }),
  )
}

async function persistEncounterModelRelations(modelId, payload = {}) {
  if (!supabaseAdmin || !modelId) {
    return
  }

  const writes = [
    supabaseAdmin.from('encuentros_model_profiles').upsert(
      {
        model_id: modelId,
        ...payload.profile,
      },
      { onConflict: 'model_id' },
    ),
    supabaseAdmin.from('encuentros_model_booking').upsert(
      {
        model_id: modelId,
        ...payload.booking,
      },
      { onConflict: 'model_id' },
    ),
    supabaseAdmin.from('encuentros_model_recording').upsert(
      {
        model_id: modelId,
        ...payload.recording,
      },
      { onConflict: 'model_id' },
    ),
  ]

  const [profileResult, bookingResult, recordingResult] = await Promise.all(writes)

  const profileError = profileResult.error
  const bookingError = bookingResult.error
  const recordingError = recordingResult.error

  if (profileError && !isMissingEncounterModelRelationTableError(profileError)) {
    throw profileError
  }

  if (bookingError && !isMissingEncounterModelRelationTableError(bookingError)) {
    throw bookingError
  }

  if (recordingError && !isMissingEncounterModelRelationTableError(recordingError)) {
    throw recordingError
  }

  if (
    !isMissingEncounterModelRelationTableError(profileError) &&
    !isMissingEncounterModelRelationTableError(bookingError) &&
    !isMissingEncounterModelRelationTableError(recordingError)
  ) {
    const socialRows = Array.isArray(payload.socialLinks) ? payload.socialLinks : []
    const mediaRows = Array.isArray(payload.media) ? payload.media : []

    const [{ error: socialDeleteError }, { error: mediaDeleteError }] = await Promise.all([
      supabaseAdmin.from('encuentros_model_social_links').delete().eq('model_id', modelId),
      supabaseAdmin.from('encuentros_model_media').delete().eq('model_id', modelId),
    ])

    if (socialDeleteError && !isMissingEncounterModelRelationTableError(socialDeleteError)) {
      throw socialDeleteError
    }

    if (mediaDeleteError && !isMissingEncounterModelRelationTableError(mediaDeleteError)) {
      throw mediaDeleteError
    }

    if (socialRows.length) {
      const { error: socialInsertError } = await supabaseAdmin.from('encuentros_model_social_links').insert(
        socialRows.map((row, index) => ({
          model_id: modelId,
          network: row.network || row.label || '',
          label: row.label || row.network || '',
          url: row.url || '',
          sort_order: Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : index,
          active: row.active !== false,
        })),
      )

      if (socialInsertError && !isMissingEncounterModelRelationTableError(socialInsertError)) {
        throw socialInsertError
      }
    }

    if (mediaRows.length) {
      const { error: mediaInsertError } = await supabaseAdmin.from('encuentros_model_media').insert(
        mediaRows.map((row, index) => ({
          model_id: modelId,
          kind: row.kind || 'image',
          slot: row.slot || 'gallery',
          url: row.url || '',
          alt_text: row.alt_text || '',
          caption: row.caption || '',
          sort_order: Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : index,
          active: row.active !== false,
        })),
      )

      if (mediaInsertError && !isMissingEncounterModelRelationTableError(mediaInsertError)) {
        throw mediaInsertError
      }
    }
  }
}

function isMissingEncounterModelsTableError(error) {
  const message = String(error?.message || error || '')

  return (
    message.includes('encuentros_models') ||
    message.includes('schema cache') ||
    message.includes('does not exist') ||
    message.includes('relation "public.encuentros_models"')
  )
}

function isMissingEncounterModelRequestsTableError(error) {
  const message = String(error?.message || error || '')

  return (
    message.includes('encuentros_model_requests') ||
    message.includes('schema cache') ||
    message.includes('does not exist') ||
    message.includes('relation "public.encuentros_model_requests"')
  )
}

function isAuthRequiredError(error) {
  const message = String(error?.message || '').toLowerCase()

  return (
    error?.code === 'AUTH_REQUIRED' ||
    message.includes('iniciar sesion') ||
    message.includes('sesion actual ya no es valida')
  )
}

async function loadEncounterModels({ includeHidden = false } = {}) {
  if (!supabaseAdmin) {
    const fallbackModel = buildFallbackEncounterModel(await loadHomeContent())
    const localModels = (await readLocalEncounterModels()).map((row, index) =>
      normalizeEncounterModelRow(row, index),
    )
    const modelsBySlug = new Map([[fallbackModel.slug, fallbackModel]])

    for (const model of localModels) {
      modelsBySlug.set(model.slug, model)
    }

    const models = Array.from(modelsBySlug.values()).filter((model) =>
      includeHidden ? true : model.status === 'published' && model.deletedAt === null,
    )

    return models.length ? models : [fallbackModel]
  }

  try {
    let query = supabaseAdmin
      .from('encuentros_models')
      .select(
        'id, slug, display_name, status, sort_order, content, published_at, deleted_at, created_at, updated_at',
      )
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('published_at', { ascending: false, nullsFirst: false })

    if (!includeHidden) {
      query = query.eq('status', 'published').is('deleted_at', null)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    const models = (data || []).map((row, index) => normalizeEncounterModelRow(row, index))

    if (!models.length) {
      return [buildFallbackEncounterModel(await loadHomeContent())]
    }

    try {
      const relations = await fetchEncounterRelationRows(models.map((model) => model.id).filter(Boolean))
      return mergeEncounterModelsWithRelations(models, relations)
    } catch (relationError) {
      if (!isMissingEncounterModelRelationTableError(relationError)) {
        throw relationError
      }

      return models
    }
  } catch (error) {
    if (!isMissingEncounterModelsTableError(error)) {
      throw new Error(error.message || 'No se pudieron cargar los modelos de encuentros.')
    }

    console.warn('encuentros_models table not available; using fallback encounter model.')
    return [buildFallbackEncounterModel(await loadHomeContent())]
  }
}

async function loadEncounterModelBySlug(slug = '', { includeHidden = false } = {}) {
  const normalizedSlug = String(slug || '').trim()

  if (!normalizedSlug) {
    return null
  }

  if (!supabaseAdmin) {
    const fallbackModel = buildFallbackEncounterModel(await loadHomeContent())
    const localModels = (await readLocalEncounterModels()).map((row, index) =>
      normalizeEncounterModelRow(row, index),
    )
    const modelsBySlug = new Map([[fallbackModel.slug, fallbackModel]])

    for (const model of localModels) {
      modelsBySlug.set(model.slug, model)
    }

    const model = modelsBySlug.get(normalizedSlug) || null

    if (!model) {
      return null
    }

    if (!includeHidden && (model.status !== 'published' || model.deletedAt)) {
      return null
    }

    return model
  }

  let query = supabaseAdmin
    .from('encuentros_models')
    .select(
      'id, slug, display_name, status, sort_order, content, published_at, deleted_at, created_at, updated_at',
    )
    .eq('slug', normalizedSlug)

  if (!includeHidden) {
    query = query.eq('status', 'published').is('deleted_at', null)
  }

  try {
    const { data, error } = await query.maybeSingle()

    if (error) {
      throw error
    }

    if (data) {
      const model = normalizeEncounterModelRow(data)

      try {
        const relations = await fetchEncounterRelationRows([model.id])
        return mergeEncounterModelsWithRelations([model], relations)[0] || model
      } catch (relationError) {
        if (!isMissingEncounterModelRelationTableError(relationError)) {
          throw relationError
        }

        return model
      }
    }

    const fallbackModel = buildFallbackEncounterModel()
    return fallbackModel.slug === normalizedSlug ? fallbackModel : null
  } catch (error) {
    if (!isMissingEncounterModelsTableError(error)) {
      throw new Error(error.message || 'No se pudo cargar el modelo solicitado.')
    }

    const fallbackModel = buildFallbackEncounterModel()
    return fallbackModel.slug === normalizedSlug ? fallbackModel : null
  }
}

function slugifyEncounterModelSlug(value = '', fallback = 'encuentros-modelo') {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || fallback
}

function getEncounterModelDisplayName(slug = '') {
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function normalizeEncounterModelPayload(payload = {}, existingRow = null, adminProfile = null) {
  const existingContent = existingRow?.content && typeof existingRow.content === 'object' ? existingRow.content : {}
  const incomingContent = payload.content && typeof payload.content === 'object' ? payload.content : {}
  const slug = slugifyEncounterModelSlug(payload.slug || existingRow?.slug || '')
  const displayName =
    String(payload.displayName || payload.display_name || existingRow?.display_name || '').trim() ||
    getEncounterModelDisplayName(slug)
  const status = ['draft', 'published', 'suspended'].includes(payload.status)
    ? payload.status
    : existingRow?.status || 'draft'
  const sortOrderValue = Number.parseInt(
    String(payload.sortOrder ?? payload.sort_order ?? existingRow?.sort_order ?? '0'),
    10,
  )
  const sortOrder = Number.isFinite(sortOrderValue) ? sortOrderValue : 0
  const publishedAt =
    status === 'published'
      ? payload.publishedAt || existingRow?.published_at || new Date().toISOString()
      : payload.publishedAt !== undefined
        ? payload.publishedAt || null
        : existingRow?.published_at || null

  return {
    slug,
    display_name: displayName,
    status,
    sort_order: sortOrder,
    content: mergeSiteContent({
      ...existingContent,
      ...incomingContent,
    }),
    published_at: publishedAt,
    deleted_at: null,
    created_by: existingRow?.created_by || adminProfile?.id || null,
    updated_by: adminProfile?.id || existingRow?.updated_by || null,
  }
}

async function deleteEncounterReservationHistoryByModelSlug(slug = '') {
  const normalizedSlug = String(slug || '').trim()

  if (!normalizedSlug || !supabaseAdmin) {
    return { ordersDeleted: 0, orderItemsDeleted: 0, entitlementsDeleted: 0 }
  }

  const reservationProductSlug = `reservation-${normalizedSlug}`
  const reservationRequestPrefix = `manual-reservation-${normalizedSlug}-`

  const { data: orders, error: ordersError } = await supabaseAdmin
    .from('orders')
    .select('id, provider_order_id, metadata')
    .eq('provider', 'manual')

  if (ordersError) {
    throw new Error(ordersError.message || 'No se pudo limpiar el historial de reservas.')
  }

  const reservationOrders = (orders || []).filter((order) => {
    const metadata = order.metadata || {}
    const providerOrderId = String(order.provider_order_id || '')

    return (
      providerOrderId.startsWith(reservationRequestPrefix) ||
      metadata.modelSlug === normalizedSlug ||
      metadata.productSlug === reservationProductSlug ||
      metadata.checkoutType === 'reservation'
    )
  })

  const reservationOrderIds = reservationOrders.map((order) => order.id).filter(Boolean)

  if (!reservationOrderIds.length) {
    return { ordersDeleted: 0, orderItemsDeleted: 0, entitlementsDeleted: 0 }
  }

  const [orderItemsResult, entitlementsResult, ordersResult] = await Promise.all([
    supabaseAdmin.from('order_items').delete().in('order_id', reservationOrderIds),
    supabaseAdmin.from('entitlements').delete().in('source_order_id', reservationOrderIds),
    supabaseAdmin.from('orders').delete().in('id', reservationOrderIds),
  ])

  const firstError =
    orderItemsResult.error || entitlementsResult.error || ordersResult.error || null

  if (firstError) {
    throw new Error(firstError.message || 'No se pudo limpiar el historial de reservas.')
  }

  return {
    ordersDeleted: reservationOrderIds.length,
    orderItemsDeleted: reservationOrderIds.length,
    entitlementsDeleted: reservationOrderIds.length,
  }
}

async function createEncounterModel(payload = {}, adminProfile) {
  const slugSeed =
    String(payload.slug || '').trim() ||
    String(payload.displayName || payload.display_name || '').trim() ||
    `modelo-${Date.now()}`
  const resolvedSlug = slugifyEncounterModelSlug(slugSeed)
  const record = normalizeEncounterModelPayload(
    {
      ...payload,
      slug: resolvedSlug,
    },
    null,
    adminProfile,
  )
  const relationPayload = buildEncounterModelRecordPayload(payload, null, adminProfile)

  if (!supabaseAdmin) {
    const existingRows = await readLocalEncounterModels()
    const duplicate = existingRows.some((row) => slugifyEncounterModelSlug(row.slug || '') === resolvedSlug)

    if (duplicate) {
      const error = new Error('Ya existe un modelo con ese slug.')
      error.code = 'MODEL_EXISTS'
      throw error
    }

    const now = new Date().toISOString()
    const nextRow = {
      id: crypto.randomUUID(),
      slug: resolvedSlug,
      display_name: record.display_name,
      status: record.status,
      sort_order: record.sort_order,
      content: record.content,
      published_at: record.published_at,
      deleted_at: null,
      created_by: null,
      updated_by: null,
      created_at: now,
      updated_at: now,
    }

    await writeLocalEncounterModels([...existingRows, nextRow])

    return normalizeEncounterModelRow(nextRow)
  }

  assertSupabaseAuthConfig()

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('encuentros_models')
    .select('id')
    .eq('slug', resolvedSlug)
    .maybeSingle()

  if (existingError) {
    throw new Error(existingError.message || 'No se pudo verificar el slug del modelo.')
  }

  if (existing) {
    const error = new Error('Ya existe un modelo con ese slug.')
    error.code = 'MODEL_EXISTS'
    throw error
  }

  const { data, error } = await supabaseAdmin
    .from('encuentros_models')
    .insert(record)
    .select(
      'id, slug, display_name, status, sort_order, content, published_at, deleted_at, created_at, updated_at',
    )
    .single()

  if (error) {
    throw new Error(error.message || 'No se pudo crear el modelo de encuentros.')
  }

  try {
    await persistEncounterModelRelations(data.id, relationPayload)
  } catch (relationError) {
    if (!isMissingEncounterModelRelationTableError(relationError)) {
      throw relationError
    }
  }

  return normalizeEncounterModelRow({
    ...data,
    content: hydrateEncounterModelContent(data.content || {}, {
      profile: relationPayload.profile,
      booking: relationPayload.booking,
      socialLinks: relationPayload.socialLinks,
      media: relationPayload.media,
    }),
  })
}

async function updateEncounterModel(slug = '', payload = {}, adminProfile) {
  const normalizedSlug = slugifyEncounterModelSlug(slug)

  if (!supabaseAdmin) {
    const existingRows = await readLocalEncounterModels()
    const existing = existingRows.find((row) => slugifyEncounterModelSlug(row.slug || '') === normalizedSlug)

    if (!existing) {
      const error = new Error('El modelo solicitado no existe.')
      error.code = 'MODEL_NOT_FOUND'
      throw error
    }

    const nextRecord = normalizeEncounterModelPayload(payload, existing, adminProfile)
    const nextSlug = nextRecord.slug

    if (
      nextSlug !== existing.slug &&
      existingRows.some(
        (row) =>
          row.id !== existing.id &&
          slugifyEncounterModelSlug(row.slug || '') === nextSlug,
      )
    ) {
      const error = new Error('Ya existe otro modelo con el nuevo slug.')
      error.code = 'MODEL_EXISTS'
      throw error
    }

    const updatedRow = {
      ...existing,
      ...nextRecord,
      id: existing.id,
      created_at: existing.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    await writeLocalEncounterModels(
      existingRows.map((row) => (row.id === existing.id ? updatedRow : row)),
    )

    return normalizeEncounterModelRow(updatedRow)
  }

  assertSupabaseAuthConfig()

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('encuentros_models')
    .select(
      'id, slug, display_name, status, sort_order, content, published_at, deleted_at, created_at, updated_at, created_by, updated_by',
    )
    .eq('slug', normalizedSlug)
    .maybeSingle()

  if (existingError) {
    throw new Error(existingError.message || 'No se pudo leer el modelo a actualizar.')
  }

  if (!existing) {
    const error = new Error('El modelo solicitado no existe.')
    error.code = 'MODEL_NOT_FOUND'
    throw error
  }

  const nextRecord = normalizeEncounterModelPayload(payload, existing, adminProfile)
  const relationPayload = buildEncounterModelRecordPayload(payload, existing, adminProfile)

  if (nextRecord.slug !== existing.slug) {
    const { data: slugConflict, error: slugConflictError } = await supabaseAdmin
      .from('encuentros_models')
      .select('id')
      .eq('slug', nextRecord.slug)
      .maybeSingle()

    if (slugConflictError) {
      throw new Error(slugConflictError.message || 'No se pudo verificar el nuevo slug.')
    }

    if (slugConflict && slugConflict.id !== existing.id) {
      const error = new Error('Ya existe otro modelo con el nuevo slug.')
      error.code = 'MODEL_EXISTS'
      throw error
    }
  }

  const { data, error } = await supabaseAdmin
    .from('encuentros_models')
    .update(nextRecord)
    .eq('id', existing.id)
    .select(
      'id, slug, display_name, status, sort_order, content, published_at, deleted_at, created_at, updated_at',
    )
    .single()

  if (error) {
    throw new Error(error.message || 'No se pudo actualizar el modelo de encuentros.')
  }

  try {
    await persistEncounterModelRelations(existing.id, relationPayload)
  } catch (relationError) {
    if (!isMissingEncounterModelRelationTableError(relationError)) {
      throw relationError
    }
  }

  return normalizeEncounterModelRow({
    ...data,
    content: hydrateEncounterModelContent(data.content || {}, {
      profile: relationPayload.profile,
      booking: relationPayload.booking,
      socialLinks: relationPayload.socialLinks,
      media: relationPayload.media,
    }),
  })
}

async function deleteEncounterModel(slug = '', adminProfile) {
  const normalizedSlug = slugifyEncounterModelSlug(slug)

  if (!supabaseAdmin) {
    const existingRows = await readLocalEncounterModels()
    const existing = existingRows.find((row) => slugifyEncounterModelSlug(row.slug || '') === normalizedSlug)

    if (!existing) {
      const error = new Error('El modelo solicitado no existe.')
      error.code = 'MODEL_NOT_FOUND'
      throw error
    }

    await writeLocalEncounterModels(
      existingRows.filter((row) => row.id !== existing.id),
    )

    return { deleted: true, cleanupResult: { ordersDeleted: 0, orderItemsDeleted: 0, entitlementsDeleted: 0 } }
  }

  assertSupabaseAuthConfig()

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('encuentros_models')
    .select('id, slug')
    .eq('slug', normalizedSlug)
    .maybeSingle()

  if (existingError) {
    throw new Error(existingError.message || 'No se pudo verificar el modelo a eliminar.')
  }

  if (!existing) {
    const error = new Error('El modelo solicitado no existe.')
    error.code = 'MODEL_NOT_FOUND'
    throw error
  }

  const cleanupResult = await deleteEncounterReservationHistoryByModelSlug(normalizedSlug)

  const { error } = await supabaseAdmin.from('encuentros_models').delete().eq('id', existing.id)

  if (error) {
    throw new Error(error.message || 'No se pudo eliminar el modelo de encuentros.')
  }

  await logAdminAuditEvent({
    eventType: 'encuentros_model_deleted',
    actorProfile: adminProfile,
    targetUserId: null,
    entityType: 'encuentros_model',
    entityId: existing.id,
    payload: {
      slug: normalizedSlug,
      cleanupResult,
    },
  })

  return { deleted: true, cleanupResult }
}

function normalizeEncounterModelRequestPayload(payload = {}, existingRow = null, actorProfile = null) {
  const status = ['pending', 'approved', 'rejected', 'suspended', 'observed'].includes(payload.status)
    ? payload.status
    : existingRow?.status || 'pending'

  return {
    display_name:
      String(payload.displayName || payload.display_name || existingRow?.display_name || '').trim() ||
      'Modelo',
    email: String(payload.email || existingRow?.email || '').trim(),
    city: String(payload.city || existingRow?.city || '').trim(),
    nationality: String(payload.nationality || existingRow?.nationality || '').trim(),
    phone: String(payload.phone || existingRow?.phone || '').trim(),
    telegram: String(payload.telegram || existingRow?.telegram || '').trim(),
    bio: String(payload.bio || existingRow?.bio || '').trim(),
    notes: String(payload.notes || existingRow?.notes || '').trim(),
    verification_photo_url:
      String(
        payload.verificationPhotoUrl ||
          payload.verification_photo_url ||
          existingRow?.verification_photo_url ||
          '',
      ).trim(),
    status,
    review_notes: String(payload.reviewNotes || payload.review_notes || existingRow?.review_notes || '').trim(),
    reviewed_by: actorProfile?.id || existingRow?.reviewed_by || null,
    reviewed_at:
      status !== 'pending'
        ? payload.reviewedAt || payload.reviewed_at || existingRow?.reviewed_at || new Date().toISOString()
        : existingRow?.reviewed_at || null,
    submitted_by: actorProfile?.id || payload.submittedBy || payload.submitted_by || existingRow?.submitted_by || null,
  }
}

function buildEncounterModelContentFromRequest(requestRow = {}) {
  return mergeSiteContent({
    requestSource: 'self-register',
    requestStatus: requestRow.status || 'pending',
    requestSubmittedAt: requestRow.created_at || requestRow.createdAt || new Date().toISOString(),
    requestId: requestRow.id || '',
    requestContactName: requestRow.display_name || requestRow.displayName || '',
    requestEmail: requestRow.email || '',
    requestPhone: requestRow.phone || '',
    requestCity: requestRow.city || '',
    requestNationality: requestRow.nationality || '',
    requestTelegram: requestRow.telegram || '',
    requestBio: requestRow.bio || '',
    requestNotes: requestRow.notes || '',
    requestVerificationPhotoUrl: requestRow.verification_photo_url || requestRow.verificationPhotoUrl || '',
  })
}

async function loadEncounterModelRequests({ includeHidden = true } = {}) {
  if (!supabaseAdmin) {
    const rows = (await readLocalEncounterModelRequests()).map((row, index) =>
      normalizeEncounterModelRequestRow(row, index),
    )

    return includeHidden ? rows : rows.filter((row) => row.status === 'pending')
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('encuentros_model_requests')
      .select(
      'id, slug, display_name, email, city, nationality, phone, telegram, bio, notes, verification_photo_url, status, model_id, review_notes, reviewed_by, reviewed_at, submitted_by, created_at, updated_at',
      )
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    const requests = (data || []).map((row, index) => normalizeEncounterModelRequestRow(row, index))

    return includeHidden ? requests : requests.filter((row) => row.status === 'pending')
  } catch (error) {
    if (!isMissingEncounterModelRequestsTableError(error)) {
      throw new Error(error.message || 'No se pudieron cargar las solicitudes de modelo.')
    }

    return []
  }
}

async function loadEncounterModelById(modelId = '') {
  const normalizedId = String(modelId || '').trim()

  if (!normalizedId) {
    return null
  }

  if (!supabaseAdmin) {
    const models = await readLocalEncounterModels()
    const localModel = models.find((row) => String(row.id || '').trim() === normalizedId)
    return localModel ? normalizeEncounterModelRow(localModel) : null
  }

  const { data, error } = await supabaseAdmin
    .from('encuentros_models')
    .select(
      'id, slug, display_name, status, sort_order, content, published_at, deleted_at, created_at, updated_at',
    )
    .eq('id', normalizedId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data ? normalizeEncounterModelRow(data) : null
}

async function createEncounterModelFromRequest(requestRow = {}, adminProfile = null) {
  const requestPayload = normalizeEncounterModelRequestRow(requestRow)
  const slugSeed =
    String(requestRow.slug || '').trim() ||
    String(requestPayload.displayName || '').trim() ||
    String(requestPayload.city || requestPayload.nationality || 'solicitud').trim() ||
    `modelo-${Date.now()}`
  const slug = slugifyEncounterModelSlug(slugSeed)
  const existingContent = buildEncounterModelContentFromRequest(requestRow)
  const content = mergeSiteContent(existingContent)

  const model = await createEncounterModel(
    {
      slug,
      displayName: requestPayload.displayName || getEncounterModelDisplayName(slug),
      status: 'draft',
      sortOrder: -1000,
      content,
    },
    adminProfile,
  )

  return model
}

async function createEncounterModelRequest(payload = {}) {
  const rawName = String(payload.displayName || payload.name || payload.profileName || '').trim()
  const name = rawName || 'Modelo'
  const email = String(payload.email || '').trim()
  const bio = String(payload.bio || '').trim()

  if (!rawName) {
    const error = new Error('Debes indicar un nombre de modelo.')
    error.code = 'BAD_REQUEST'
    throw error
  }

  if (!email) {
    const error = new Error('Debes indicar un correo de contacto.')
    error.code = 'BAD_REQUEST'
    throw error
  }

  if (!bio) {
    const error = new Error('Debes añadir una presentacion breve.')
    error.code = 'BAD_REQUEST'
    throw error
  }

  const slugSeed =
    String(payload.slug || '').trim() ||
    `${name}-${String(payload.city || payload.nationality || 'solicitud').trim()}-${Date.now()}`
  const slug = slugifyEncounterModelSlug(slugSeed)
  const normalizedRequest = normalizeEncounterModelRequestPayload({
    ...payload,
    displayName: name,
    email,
    bio,
    status: 'pending',
  })

  if (!supabaseAdmin) {
    const existingRows = await readLocalEncounterModelRequests()
    const duplicate = existingRows.some((row) => slugifyEncounterModelSlug(row.slug || '') === slug)

    if (duplicate) {
      const error = new Error('Ya existe una solicitud con ese nombre.')
      error.code = 'MODEL_EXISTS'
      throw error
    }

    const now = new Date().toISOString()
    const nextRow = {
      id: crypto.randomUUID(),
      slug,
      ...normalizedRequest,
      status: 'pending',
      model_id: null,
      review_notes: '',
      reviewed_by: null,
      reviewed_at: null,
      created_by: null,
      updated_by: null,
      created_at: now,
      updated_at: now,
    }

    await writeLocalEncounterModelRequests([...existingRows, nextRow])

    return normalizeEncounterModelRequestRow(nextRow)
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('encuentros_model_requests')
    .select('id, slug')
    .eq('slug', slug)
    .maybeSingle()

  if (existingError) {
    throw new Error(existingError.message || 'No se pudo verificar la solicitud.')
  }

  if (existing) {
    const error = new Error('Ya existe una solicitud con ese nombre.')
    error.code = 'MODEL_EXISTS'
    throw error
  }

  const record = {
    slug,
    ...normalizedRequest,
    status: 'pending',
    model_id: null,
    review_notes: '',
    reviewed_by: null,
    reviewed_at: null,
    submitted_by: normalizedRequest.submitted_by || null,
  }

  const { data, error } = await supabaseAdmin
    .from('encuentros_model_requests')
    .insert(record)
    .select(
      'id, slug, display_name, email, city, nationality, phone, telegram, bio, notes, verification_photo_url, status, model_id, review_notes, reviewed_by, reviewed_at, submitted_by, created_at, updated_at',
    )
    .single()

  if (error) {
    throw new Error(error.message || 'No se pudo registrar la solicitud de modelo.')
  }

  return normalizeEncounterModelRequestRow(data)
}

async function updateEncounterModelRequest(requestId = '', payload = {}, adminProfile = null) {
  const normalizedId = String(requestId || '').trim()

  if (!normalizedId) {
    const error = new Error('La solicitud solicitada no existe.')
    error.code = 'MODEL_REQUEST_NOT_FOUND'
    throw error
  }

  if (!supabaseAdmin) {
    const existingRows = await readLocalEncounterModelRequests()
    const existing = existingRows.find((row) => String(row.id || '').trim() === normalizedId)

    if (!existing) {
      const error = new Error('La solicitud solicitada no existe.')
      error.code = 'MODEL_REQUEST_NOT_FOUND'
      throw error
    }

    const nextRequest = normalizeEncounterModelRequestPayload(payload, existing, adminProfile)
    const nextStatus = nextRequest.status || existing.status || 'pending'
    let modelId = existing.model_id || null

    if (nextStatus === 'approved' && !modelId && payload.createModel !== false) {
      const createdModel = await createEncounterModelFromRequest(
        {
          ...existing,
          ...nextRequest,
          status: nextStatus,
          created_at: existing.created_at,
        },
        adminProfile,
      )

      modelId = createdModel.id
    }

    const updatedRow = {
      ...existing,
      ...nextRequest,
      status: nextStatus,
      model_id: modelId,
      reviewed_by: adminProfile?.id || existing.reviewed_by || null,
      reviewed_at:
        nextStatus !== 'pending'
          ? new Date().toISOString()
          : existing.reviewed_at || null,
      updated_at: new Date().toISOString(),
    }

    if (nextStatus === 'suspended' && modelId) {
      const localModels = await readLocalEncounterModels()
      const linkedModel = localModels.find((row) => String(row.id || '').trim() === String(modelId))

      if (linkedModel) {
        const suspendedRow = {
          ...linkedModel,
          status: 'suspended',
          updated_at: new Date().toISOString(),
        }

        await writeLocalEncounterModels(
          localModels.map((row) => (row.id === linkedModel.id ? suspendedRow : row)),
        )
      }
    }

    await writeLocalEncounterModelRequests(
      existingRows.map((row) => (row.id === existing.id ? updatedRow : row)),
    )

    return normalizeEncounterModelRequestRow(updatedRow)
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('encuentros_model_requests')
    .select(
      'id, slug, display_name, email, city, nationality, phone, telegram, bio, notes, verification_photo_url, status, model_id, review_notes, reviewed_by, reviewed_at, submitted_by, created_at, updated_at',
    )
    .eq('id', normalizedId)
    .maybeSingle()

  if (existingError) {
    throw new Error(existingError.message || 'No se pudo leer la solicitud de modelo.')
  }

  if (!existing) {
    const error = new Error('La solicitud solicitada no existe.')
    error.code = 'MODEL_REQUEST_NOT_FOUND'
    throw error
  }

  const nextRequest = normalizeEncounterModelRequestPayload(payload, existing, adminProfile)
  const nextStatus = nextRequest.status || existing.status || 'pending'
  let modelId = existing.model_id || null

  if (nextStatus === 'approved' && !modelId && payload.createModel !== false) {
    const createdModel = await createEncounterModelFromRequest(
      {
        ...existing,
        ...nextRequest,
        status: nextStatus,
      },
      adminProfile,
    )

    modelId = createdModel.id
  }

  if (nextStatus === 'suspended' && modelId) {
    const linkedModel = await loadEncounterModelById(modelId)

    if (linkedModel) {
      await updateEncounterModel(linkedModel.slug, { ...linkedModel, status: 'suspended' }, adminProfile)
    }
  }

  const updatedRow = {
    ...existing,
    ...nextRequest,
    status: nextStatus,
    model_id: modelId,
    reviewed_by: adminProfile?.id || existing.reviewed_by || null,
    reviewed_at:
      nextStatus !== 'pending'
        ? new Date().toISOString()
        : existing.reviewed_at || null,
  }

  const { data, error } = await supabaseAdmin
    .from('encuentros_model_requests')
    .update({
      slug: updatedRow.slug,
      display_name: updatedRow.display_name,
      email: updatedRow.email,
      city: updatedRow.city,
      nationality: updatedRow.nationality,
      phone: updatedRow.phone,
      telegram: updatedRow.telegram,
      bio: updatedRow.bio,
      notes: updatedRow.notes,
      verification_photo_url: updatedRow.verification_photo_url,
      status: updatedRow.status,
      model_id: updatedRow.model_id,
      review_notes: updatedRow.review_notes,
      reviewed_by: updatedRow.reviewed_by,
      reviewed_at: updatedRow.reviewed_at,
      submitted_by: updatedRow.submitted_by,
    })
    .eq('id', existing.id)
    .select(
      'id, slug, display_name, email, city, nationality, phone, telegram, bio, notes, verification_photo_url, status, model_id, review_notes, reviewed_by, reviewed_at, submitted_by, created_at, updated_at',
    )
    .single()

  if (error) {
    throw new Error(error.message || 'No se pudo actualizar la solicitud de modelo.')
  }

  return normalizeEncounterModelRequestRow({
    ...data,
    model_id: modelId,
  })
}

function normalizeBlogPostRow(row, fallbackIndex = 0) {
  const body = row.body && typeof row.body === 'object' && !Array.isArray(row.body) ? row.body : {}

  return normalizeBlogPost(
    {
      id: row.id,
      slug: row.slug,
      category: body.category || 'General',
      title: row.title,
      excerpt: row.excerpt,
      coverImage: body.coverImage || row.cover_media_path || '',
      status: row.status,
      accessLevel: body.accessLevel || 'public',
      priceLabel: body.priceLabel || '',
      priceAmount: Number.isFinite(body.priceAmount) ? body.priceAmount : 0,
      currency: body.currency || 'USD',
      publishedAt: row.published_at,
      scheduledAt: body.scheduledAt || null,
      featured: body.featured !== false && Boolean(body.featuredSlot && body.featuredSlot !== 'none'),
      featuredSlot: body.featuredSlot || 'none',
      feedFeatured: Boolean(body.feedFeatured),
      bannerSlot: body.bannerSlot || 'none',
      allowIndexing: body.allowIndexing !== false,
      seoTitle: body.seoTitle || row.title,
      seoDescription: body.seoDescription || row.excerpt || '',
      socialImage: body.socialImage || body.coverImage || row.cover_media_path || '',
      readingTime: body.readingTime || '',
      tags: body.tags || [],
      contentHtml: body.html || '<p></p>',
      mediaItems: body.mediaItems || [],
    },
    fallbackIndex,
  )
}

async function loadBlogPosts() {
  assertServerConfig()

  try {
    const { data, error } = await supabaseAdmin
      .from('blog_posts')
      .select('id, slug, title, excerpt, body, cover_media_path, status, published_at')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    if (!data?.length) {
      return defaultBlogPosts
    }

    return data.map((row, index) => normalizeBlogPostRow(row, index))
  } catch (error) {
    const message = String(error?.message || error || '')
    const isMissingTable =
      message.includes('blog_posts') ||
      message.includes('schema cache') ||
      message.includes('does not exist') ||
      message.includes('relation "public.blog_posts"')

    if (!isMissingTable) {
      throw error
    }

    console.warn('blog_posts table not available; using default blog posts for startup sync.')
    return defaultBlogPosts
  }
}

function getVideoLibraryItem(homeContent, slug) {
  return homeContent.videoLibrary.items.find((item) => item.slug === slug) || null
}

function getMediaItem(homeContent, group, slug) {
  if (group === 'collections') {
    return homeContent.videoCollections.items.find((item) => item.slug === slug) || null
  }

  if (group === 'free-content') {
    return homeContent.freeContent.items.find((item) => item.slug === slug) || null
  }

  return null
}

function getVideoSource(item, variant) {
  if (!item) {
    return null
  }

  const sourceUrl =
    variant === 'preview'
      ? item.previewSourceUrl || item.previewVideoUrl || ''
      : item.fullSourceUrl || item.fullVideoUrl || ''
  const driveFileId =
    variant === 'preview'
      ? extractGoogleDriveFileId(item.previewDriveFileId || sourceUrl || '')
      : extractGoogleDriveFileId(item.fullDriveFileId || sourceUrl || '')

  if (driveFileId) {
    return {
      type: 'drive',
      fileId: driveFileId,
    }
  }

  if (sourceUrl && /^https?:\/\//i.test(sourceUrl) && !sourceUrl.includes('/api/media/')) {
    return {
      type: 'url',
      url: sourceUrl,
    }
  }

  return null
}

function getCollectionSource(item) {
  if (!item) {
    return null
  }

  const sourceUrl = item.previewSourceUrl || item.previewUrl || ''
  const driveFileId = extractGoogleDriveFileId(item.previewDriveFileId || sourceUrl || '')

  if (driveFileId) {
    return {
      type: 'drive',
      fileId: driveFileId,
    }
  }

  if (sourceUrl && /^https?:\/\//i.test(sourceUrl) && !sourceUrl.includes('/api/media/')) {
    return {
      type: 'url',
      url: sourceUrl,
    }
  }

  return null
}

function getFreeContentSource(item) {
  if (!item || item.mediaType !== 'video') {
    return null
  }

  const driveFileId = extractGoogleDriveFileId(item.mediaDriveFileId || '')

  if (driveFileId) {
    return {
      type: 'drive',
      fileId: driveFileId,
    }
  }

  if (item.mediaUrl && /^https?:\/\//i.test(item.mediaUrl)) {
    return {
      type: 'url',
      url: item.mediaUrl,
    }
  }

  return null
}

function createPlaybackToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto.createHmac('sha256', mediaTokenSecret).update(body).digest('base64url')
  return `${body}.${signature}`
}

function verifyPlaybackToken(token) {
  const [body, signature] = String(token || '').split('.')

  if (!body || !signature) {
    return null
  }

  const expectedSignature = crypto.createHmac('sha256', mediaTokenSecret).update(body).digest('base64url')

  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null
  }

  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))

    if (!payload?.exp || payload.exp < Date.now()) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

async function streamRemoteMedia(response, res) {
  if (!response.ok || !response.body) {
    const errorText = await response.text().catch(() => '')
    const error = new Error(errorText || 'No se pudo leer el archivo remoto.')
    error.status = response.status || 502
    throw error
  }

  res.setHeader('cache-control', 'private, no-store, max-age=0')

  const headersToForward = [
    'content-type',
    'content-length',
    'content-range',
    'accept-ranges',
    'cache-control',
    'etag',
    'last-modified',
    'content-disposition',
  ]

  headersToForward.forEach((header) => {
    const value = response.headers.get(header)
    if (value) {
      res.setHeader(header, value)
    }
  })

  res.status(response.status)
  await new Promise((resolve, reject) => {
    const stream = Readable.fromWeb(response.body)
    stream.on('error', reject)
    res.on('finish', resolve)
    res.on('close', () => {
      stream.destroy()
      resolve()
    })
    stream.pipe(res)
  })
}

async function streamVideoSource(source, req, res) {
  if (!source) {
    res.status(404).json({ error: 'No se encontro el video solicitado.' })
    return
  }

  const rangeHeader = req.headers.range || ''
  let response

  if (source.type === 'drive') {
    response = await fetchGoogleDriveMedia(source.fileId, rangeHeader)
  } else {
    const resolvedUrl = new URL(source.url, appUrl).toString()
    response = await fetch(resolvedUrl, {
      headers: rangeHeader ? { Range: rangeHeader } : {},
      redirect: 'follow',
    })
  }

  await streamRemoteMedia(response, res)
}

async function assertVideoAccess(userId, slug) {
  if (!supabaseAdmin) {
    throw new Error('Supabase no esta configurado.')
  }

  const { data: entitlements, error } = await supabaseAdmin
    .from('entitlements')
    .select('entitlement_key, product_slug, expires_at, status')
    .eq('user_id', userId)
    .eq('status', 'active')

  if (error) {
    throw error
  }

  const subscriptionProductSlugs = Array.from(
    new Set(
      (entitlements || [])
        .filter((entitlement) => isSubscriptionEntitlementKey(entitlement.entitlement_key))
        .map((entitlement) => entitlement.product_slug)
        .filter(Boolean),
    ),
  )

  const { data: subscriptionProducts } = subscriptionProductSlugs.length
    ? await supabaseAdmin
        .from('products')
        .select('slug, metadata')
        .in('slug', subscriptionProductSlugs)
    : { data: [] }

  const productsBySlug = new Map((subscriptionProducts || []).map((product) => [product.slug, product]))

  const hasActiveEntitlement = (entitlements || []).some((entitlement) => {
    if (entitlement.entitlement_key === `video:${slug}`) {
      return true
    }

    if (!isSubscriptionEntitlementKey(entitlement.entitlement_key)) {
      return false
    }

    if (!entitlement.expires_at) {
      const product = productsBySlug.get(entitlement.product_slug)
      return Array.isArray(product?.metadata?.grants) && product.metadata.grants.includes('video')
    }

    if (new Date(entitlement.expires_at).getTime() < Date.now()) {
      return false
    }

    const product = productsBySlug.get(entitlement.product_slug)
    return Array.isArray(product?.metadata?.grants) && product.metadata.grants.includes('video')
  })

  if (!hasActiveEntitlement) {
    const accessError = new Error('No tienes acceso a este video.')
    accessError.code = 'ACCESS_DENIED'
    throw accessError
  }
}

app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    if (!stripe || !stripeWebhookSecret) {
      res.status(503).json({ error: 'Webhook de Stripe no configurado.' })
      return
    }

    const signature = req.headers['stripe-signature']

    if (!signature) {
      res.status(400).json({ error: 'Falta la firma de Stripe.' })
      return
    }

    let event

    try {
      event = stripe.webhooks.constructEvent(req.body, signature, stripeWebhookSecret)
    } catch (error) {
      res.status(400).json({ error: error.message })
      return
    }

    try {
      if (event.type === 'checkout.session.completed') {
        await handleCheckoutCompleted(event.data.object)
      }

      if (event.type === 'invoice.payment_succeeded') {
        await handleInvoicePaymentSucceeded(event.data.object)
      }

      if (event.type === 'customer.subscription.deleted') {
        await handleSubscriptionDeleted(event.data.object)
      }

      res.json({ received: true })
    } catch (error) {
      res.status(500).json({ error: error.message || 'Error procesando webhook.' })
    }
  },
)

app.use(
  cors({
    origin: [appUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  }),
)
// Los modelos de encuentros envian un JSON amplio con galerias, reservas y metadatos.
app.use(express.json({ limit: '10mb' }))

app.get('/', (_req, res) => {
  if (existsSync(CLIENT_DIST_DIR)) {
    renderClientIndexHtml()
      .then((html) => {
        res.type('html').send(html)
      })
      .catch((error) => {
        res.status(500).json({
          error: error.message || 'No se pudo cargar la aplicacion.',
        })
      })
    return
  }

  res.json({
    ok: true,
    service: 'stripe-server',
    port,
    healthUrl: '/api/health',
  })
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/encuentros/models', async (_req, res) => {
  try {
    const models = await loadEncounterModels()

    res.json({
      ok: true,
      models,
    })
  } catch (error) {
    const status = isAuthRequiredError(error) ? 401 : 500
    res.status(status).json({
      error: error.message || 'No se pudieron cargar los modelos de encuentros.',
    })
  }
})

app.get('/api/encuentros/models/:slug', async (req, res) => {
  try {
    const model = await loadEncounterModelBySlug(req.params.slug)

    if (!model) {
      res.status(404).json({
        error: 'No se encontro el modelo solicitado.',
      })
      return
    }

    res.json({
      ok: true,
      model,
    })
  } catch (error) {
    res.status(500).json({
      error: error.message || 'No se pudo cargar el modelo solicitado.',
    })
  }
})

app.get('/api/encuentros/gallery/reactions', async (req, res) => {
  try {
    const photoIds = String(req.query.photoIds || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)

    const votes = await readGalleryReactionVotes()
    const items = summarizeGalleryReactionVotes(votes, photoIds)

    res.json({ ok: true, items })
  } catch (error) {
    res.status(500).json({
      error: error.message || 'No se pudieron cargar las reacciones de la galeria.',
    })
  }
})

app.get('/api/encuentros/booking/pricing', async (req, res) => {
  try {
    const recordingChoice = String(req.query.recording || 'standard')
    const modelSlug = String(req.query.model || req.query.modelSlug || '').trim()
    const pricing = await getEncuentrosBookingPricing(recordingChoice, modelSlug)

    res.json({
      ok: true,
      pricing,
    })
  } catch (error) {
    res.status(500).json({
      error: error.message || 'No se pudo calcular el precio de la reserva.',
    })
  }
})

app.post('/api/encuentros/reservations', async (req, res) => {
  try {
    const guestName = String(req.body?.guestName || req.body?.reservationGuestName || '').trim()
    const selectedDate = String(req.body?.selectedDate || req.body?.reservationDate || '').trim()
    const selectedTime = String(req.body?.selectedTime || req.body?.reservationTime || '').trim()
    const modelSlug = String(req.body?.modelSlug || req.body?.encuentrosModelSlug || '').trim()
    const recordingChoice = normalizeRecordingChoice(
      req.body?.recordingChoice || req.body?.reservationRecordingChoice || 'standard',
    )
    const pricing =
      req.body?.pricing && typeof req.body.pricing === 'object' ? req.body.pricing : null

    if (!guestName || !selectedDate || !selectedTime) {
      res.status(400).json({
        error: 'Faltan datos de la reserva manual.',
        code: 'BAD_REQUEST',
      })
      return
    }

    let userId = null

    if (supabaseAdmin) {
      try {
        const { user } = await getAuthenticatedUser(req.headers.authorization || '', {
          requireStripe: false,
        })

        userId = user?.id || null
      } catch {
        userId = null
      }
    }

    const order = await createManualReservationOrder({
      userId,
      guestName,
      selectedDate,
      selectedTime,
      recordingChoice,
      pricing,
      modelSlug,
    })

    res.json({
      ok: true,
      order,
    })
  } catch (error) {
    res.status(500).json({
      error: error.message || 'No se pudo registrar la reserva manual.',
      code: error.code || 'RESERVATION_ERROR',
    })
  }
})

app.post('/api/encuentros/gallery/reactions', async (req, res) => {
  try {
    const photoId = req.body?.photoId || ''
    const visitorKey = req.body?.visitorKey || ''
    const reaction = req.body?.reaction || ''
    const item = await upsertGalleryReactionVote({ photoId, visitorKey, reaction })

    res.json({
      ok: true,
      item,
    })
  } catch (error) {
    const status = error.code === 'BAD_REQUEST' ? 400 : 500
    res.status(status).json({
      error: error.message || 'No se pudo guardar la reaccion.',
    })
  }
})

app.get('/api/media/videos/:slug/preview', async (req, res) => {
  try {
    const homeContent = await loadHomeContent()
    const item = getVideoLibraryItem(homeContent, req.params.slug)
    const source = getVideoSource(item, 'preview')

    if (!source) {
      res.status(404).json({ error: 'No se encontro el preview del video.' })
      return
    }

    await streamVideoSource(source, req, res)
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'No se pudo cargar el preview.' })
  }
})

app.get('/api/media/collections/:slug/preview', async (req, res) => {
  try {
    const homeContent = await loadHomeContent()
    const item = getMediaItem(homeContent, 'collections', req.params.slug)
    const source = getCollectionSource(item)

    if (!source) {
      res.status(404).json({ error: 'No se encontro el preview del pack.' })
      return
    }

    await streamVideoSource(source, req, res)
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'No se pudo cargar el preview del pack.' })
  }
})

app.get('/api/media/free-content/:slug', async (req, res) => {
  try {
    const homeContent = await loadHomeContent()
    const item = getMediaItem(homeContent, 'free-content', req.params.slug)
    const source = getFreeContentSource(item)

    if (!source) {
      res.status(404).json({ error: 'No se encontro el contenido solicitado.' })
      return
    }

    await streamVideoSource(source, req, res)
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'No se pudo cargar el contenido.' })
  }
})

app.get('/api/media/videos/:slug/full', async (req, res) => {
  try {
    const { user, profile } = await getAuthenticatedUser(req.headers.authorization || '', {
      requireStripe: false,
    })

    if (profile.role !== 'admin') {
      await assertVideoAccess(user.id, req.params.slug)
    }

    const token = createPlaybackToken({
      slug: req.params.slug,
      variant: 'full',
      userId: user.id,
      exp: Date.now() + 15 * 60 * 1000,
    })

    res.redirect(302, `/api/media/playback/${token}`)
  } catch (error) {
    const status = error.code === 'AUTH_REQUIRED' ? 401 : error.code === 'ACCESS_DENIED' ? 403 : 500
    res.status(status).json({ error: error.message || 'No se pudo validar el acceso al video.' })
  }
})

app.get('/api/media/playback/:token', async (req, res) => {
  try {
    const payload = verifyPlaybackToken(req.params.token)

    if (!payload || payload.variant !== 'full') {
      res.status(403).json({ error: 'Token de reproduccion invalido.' })
      return
    }

    const homeContent = await loadHomeContent()
    const item = getVideoLibraryItem(homeContent, payload.slug)
    const source = getVideoSource(item, 'full')

    if (!source) {
      res.status(404).json({ error: 'No se encontro el video solicitado.' })
      return
    }

    if (payload.userId && supabaseAdmin) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('status, role')
        .eq('id', payload.userId)
        .maybeSingle()

      if (!profile || profile.status !== 'active') {
        res.status(403).json({ error: 'Tu cuenta ya no tiene acceso activo.' })
        return
      }

      if (profile.role !== 'admin') {
        await assertVideoAccess(payload.userId, payload.slug)
      }
    }

    await streamVideoSource(source, req, res)
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'No se pudo reproducir el video.' })
  }
})

app.post(
  '/api/media/google-drive/upload',
  express.raw({ type: '*/*', limit: '300mb' }),
  async (req, res) => {
    try {
      const { user, profile } = await getAuthenticatedUser(req.headers.authorization || '', {
        requireStripe: false,
      })

      if (profile.role !== 'admin') {
        res.status(403).json({ error: 'Solo admin puede subir videos a Drive.' })
        return
      }

      if (!isGoogleDriveConfigured()) {
        res.status(503).json({ error: 'Google Drive no esta configurado en el backend.' })
        return
      }

      const slug = String(req.query.slug || '').trim()
      const variant = req.query.variant === 'full' ? 'full' : 'preview'
      const filename = String(req.query.filename || `${slug}-${variant}.bin`).trim()
      const mimeType = String(req.query.mimeType || req.headers['content-type'] || 'application/octet-stream')
      const folderId = getGoogleDriveFolderId()

      if (!slug) {
        res.status(400).json({ error: 'Falta el slug del video.' })
        return
      }

      if (!Buffer.isBuffer(req.body) || !req.body.length) {
        res.status(400).json({ error: 'El archivo no tiene contenido.' })
        return
      }

      const uploadResponse = await uploadGoogleDriveFile({
        buffer: req.body,
        filename,
        mimeType,
        folderId,
      })

      res.json({
        fileId: uploadResponse.id,
        variant,
        slug,
        uploadedBy: user.id,
      })
    } catch (error) {
      const status = error.code === 'AUTH_REQUIRED' ? 401 : 500
      res.status(status).json({ error: error.message || 'No se pudo subir el archivo a Drive.' })
    }
  },
)

app.post('/api/stripe/create-checkout-session', async (req, res) => {
  try {
    assertServerConfig()

    const { user, profile } = await getAuthenticatedUser(req.headers.authorization || '')
    const { productSlug, context = {} } = req.body || {}

    if (!productSlug) {
      res.status(400).json({ error: 'Falta productSlug.', code: 'BAD_REQUEST' })
      return
    }

    const product = await resolveProductBySlug(productSlug)
    const physicalOrderRequestId = context.physicalOrderRequestId || ''
    const reservationRequestId = context.reservationRequestId || ''
    const reservationPricing =
      product.product_type === 'reservation'
        ? await getEncuentrosBookingPricing(context.reservationRecordingChoice || 'standard')
        : null
    const reservationPriceOverride =
      product.product_type === 'reservation' ? reservationPricing?.chargeAmount || null : null
    const reservationTotalAmount =
      product.product_type === 'reservation' ? reservationPricing?.effectiveAmount || null : null
    const reservationAdvanceAmount =
      product.product_type === 'reservation' ? reservationPricing?.advanceAmount || null : null
    const customerId = await ensureStripeCustomer(profile)
    const checkoutMode = normalizeCheckoutMode(product)
    const successQuery = [
      'session_id={CHECKOUT_SESSION_ID}',
      `product=${encodeURIComponent(product.slug)}`,
      physicalOrderRequestId ? `request=${encodeURIComponent(physicalOrderRequestId)}` : null,
      reservationRequestId ? `reservation=${encodeURIComponent(reservationRequestId)}` : null,
      context.reservationDate ? `date=${encodeURIComponent(context.reservationDate)}` : null,
      context.reservationTime ? `time=${encodeURIComponent(context.reservationTime)}` : null,
      context.paymentMethod ? `method=${encodeURIComponent(context.paymentMethod)}` : null,
      context.reservationRecordingChoice
        ? `recording=${encodeURIComponent(context.reservationRecordingChoice)}`
        : null,
    ]
      .filter(Boolean)
      .join('&')

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: checkoutMode,
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [buildLineItem(product, reservationPriceOverride)],
      success_url: `${appUrl}/checkout/success?${successQuery}`,
        cancel_url: `${appUrl}/checkout/cancel?product=${encodeURIComponent(product.slug)}`,
      client_reference_id: user.id,
      allow_promotion_codes: true,
      metadata: {
          user_id: user.id,
          product_slug: product.slug,
          access_scope: product.access_scope,
          product_type: product.product_type,
          physical_order_request_id: physicalOrderRequestId,
          reservation_request_id: reservationRequestId,
          reservation_date: context.reservationDate || null,
          reservation_time: context.reservationTime || null,
          payment_method: context.paymentMethod || null,
          reservation_recording_choice: context.reservationRecordingChoice || null,
          reservation_charge_amount: reservationPriceOverride || product.price_amount || null,
          reservation_price_amount: reservationPriceOverride || product.price_amount || null,
          reservation_total_amount: reservationTotalAmount || product.price_amount || null,
          reservation_advance_amount: reservationAdvanceAmount || product.price_amount || null,
          reservation_base_price_amount:
            reservationPricing?.baseAmount || product.price_amount || null,
          reservation_discount_percent: reservationPricing?.discountPercent || null,
          checkout_type: product.product_type,
      },
      subscription_data:
        checkoutMode === 'subscription'
          ? {
              metadata: {
                user_id: user.id,
                product_slug: product.slug,
                access_scope: product.access_scope,
              },
            }
          : undefined,
    })

    res.json({ url: checkoutSession.url })
  } catch (error) {
    res.status(500).json({
      error: error.message || 'No se pudo crear la sesion de checkout.',
      code: error.code || 'CHECKOUT_ERROR',
    })
  }
})

app.post('/api/auth/telegram', async (req, res) => {
  try {
    assertSupabaseAuthConfig()

    const telegramUser = req.body?.telegramUser || req.body || {}
    const credentials = await provisionTelegramLoginUser(telegramUser)

    res.json({
      ok: true,
      ...credentials,
    })
  } catch (error) {
    const status =
      error.code === 'TELEGRAM_NOT_CONFIGURED'
        ? 503
        : error.code === 'BAD_REQUEST'
          ? 400
          : error.code === 'ACCOUNT_DISABLED'
            ? 403
            : error.code === 'TELEGRAM_INVALID' || error.code === 'TELEGRAM_EXPIRED'
              ? 401
              : 500

    res.status(status).json({ error: error.message || 'No se pudo iniciar Telegram.' })
  }
})

app.post('/api/admin/users', async (req, res) => {
  try {
    assertSupabaseAuthConfig()

    const { profile } = await getAuthenticatedUser(req.headers.authorization || '', {
      requireStripe: false,
    })

    if (profile.role !== 'admin') {
      res.status(403).json({ error: 'Solo admin puede administrar usuarios.' })
      return
    }

    const result = await provisionManagedUser(req.body || {}, profile)

    res.json({
      ok: true,
      profile: result.profile,
      entitlement: result.entitlement,
    })
  } catch (error) {
    const status = error.code === 'BAD_REQUEST' ? 400 : error.code === 'PLAN_NOT_FOUND' ? 404 : 500
    res.status(status).json({ error: error.message || 'No se pudo crear el usuario.' })
  }
})

app.post('/api/admin/users/:userId/subscription', async (req, res) => {
  try {
    assertSupabaseAuthConfig()

    const { profile } = await getAuthenticatedUser(req.headers.authorization || '', {
      requireStripe: false,
    })

    if (profile.role !== 'admin') {
      res.status(403).json({ error: 'Solo admin puede administrar suscripciones.' })
      return
    }

    const userId = String(req.params.userId || '').trim()
    if (!userId) {
      res.status(400).json({ error: 'Falta el usuario destino.' })
      return
    }

    const { data: targetProfile, error: targetProfileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (targetProfileError) {
      throw new Error(targetProfileError.message || 'No se pudo verificar el usuario destino.')
    }

    if (!targetProfile) {
      res.status(404).json({ error: 'El usuario destino no existe.' })
      return
    }

    const result = await upsertManagedSubscription({
      userId,
      planSlug: req.body?.planSlug || '',
      startAt: req.body?.startAt || new Date().toISOString(),
      durationValue: req.body?.durationValue || '',
      durationUnit: req.body?.durationUnit || '',
      action: req.body?.action === 'revoke' ? 'revoke' : 'grant',
      adminProfile: profile,
    })

    res.json({
      ok: true,
      entitlement: result,
    })
  } catch (error) {
    const status = error.code === 'PLAN_NOT_FOUND' ? 404 : error.code === 'BAD_REQUEST' ? 400 : 500
    res.status(status).json({ error: error.message || 'No se pudo actualizar la suscripcion.' })
  }
})

app.get('/api/admin/encuentros/models', async (req, res) => {
  try {
    if (supabaseAdmin) {
      const authHeader = req.headers.authorization || ''
      if (!authHeader) {
        res.status(401).json({ error: 'Debes iniciar sesion antes de comprar.' })
        return
      }

      const { profile } = await getAuthenticatedUser(authHeader, {
        requireStripe: false,
      })

      if (profile.role !== 'admin') {
        res.status(403).json({ error: 'Solo admin puede administrar modelos de encuentros.' })
        return
      }
    }

    const models = await loadEncounterModels({ includeHidden: true })

    res.json({
      ok: true,
      models,
      fallback: Boolean(models?.[0]?.isFallback),
    })
  } catch (error) {
    res.status(500).json({
      error: error.message || 'No se pudieron cargar los modelos de encuentros.',
    })
  }
})

app.post('/api/admin/encuentros/models', async (req, res) => {
  try {
    let profile = null

    if (supabaseAdmin) {
      const authHeader = req.headers.authorization || ''
      if (!authHeader) {
        res.status(401).json({ error: 'Debes iniciar sesion antes de comprar.' })
        return
      }

      const authResult = await getAuthenticatedUser(authHeader, {
        requireStripe: false,
      })
      profile = authResult.profile

      if (profile.role !== 'admin') {
        res.status(403).json({ error: 'Solo admin puede administrar modelos de encuentros.' })
        return
      }
    }

    const model = await createEncounterModel(req.body || {}, profile)

    res.json({
      ok: true,
      model,
    })
  } catch (error) {
    const status =
      isAuthRequiredError(error)
        ? 401
        : error.code === 'BAD_REQUEST'
        ? 400
        : error.code === 'MODEL_EXISTS'
          ? 409
          : isMissingEncounterModelsTableError(error)
            ? 503
            : 500
    res.status(status).json({
      error: error.message || 'No se pudo crear el modelo de encuentros.',
      code: error.code || 'MODEL_ERROR',
    })
  }
})

app.patch('/api/admin/encuentros/models/:slug', async (req, res) => {
  try {
    let profile = null

    if (supabaseAdmin) {
      const authHeader = req.headers.authorization || ''
      if (!authHeader) {
        res.status(401).json({ error: 'Debes iniciar sesion antes de comprar.' })
        return
      }

      const authResult = await getAuthenticatedUser(authHeader, {
        requireStripe: false,
      })
      profile = authResult.profile

      if (profile.role !== 'admin') {
        res.status(403).json({ error: 'Solo admin puede administrar modelos de encuentros.' })
        return
      }
    }

    const model = await updateEncounterModel(req.params.slug, req.body || {}, profile)

    res.json({
      ok: true,
      model,
    })
  } catch (error) {
    const status =
      isAuthRequiredError(error)
        ? 401
        : error.code === 'BAD_REQUEST'
        ? 400
        : error.code === 'MODEL_NOT_FOUND'
          ? 404
          : error.code === 'MODEL_EXISTS'
            ? 409
            : isMissingEncounterModelsTableError(error)
              ? 503
              : 500
    res.status(status).json({
      error: error.message || 'No se pudo actualizar el modelo de encuentros.',
      code: error.code || 'MODEL_ERROR',
    })
  }
})

app.delete('/api/admin/encuentros/models/:slug', async (req, res) => {
  try {
    let profile = null

    if (supabaseAdmin) {
      const authHeader = req.headers.authorization || ''
      if (!authHeader) {
        res.status(401).json({ error: 'Debes iniciar sesion antes de comprar.' })
        return
      }

      const authResult = await getAuthenticatedUser(authHeader, {
        requireStripe: false,
      })
      profile = authResult.profile

      if (profile.role !== 'admin') {
        res.status(403).json({ error: 'Solo admin puede administrar modelos de encuentros.' })
        return
      }
    }

    const result = await deleteEncounterModel(req.params.slug, profile)

    res.json({
      ok: true,
      ...result,
    })
  } catch (error) {
    const status =
      isAuthRequiredError(error)
        ? 401
        : error.code === 'BAD_REQUEST'
        ? 400
        : error.code === 'MODEL_NOT_FOUND'
          ? 404
          : isMissingEncounterModelsTableError(error)
            ? 503
            : 500
    res.status(status).json({
      error: error.message || 'No se pudo eliminar el modelo de encuentros.',
      code: error.code || 'MODEL_ERROR',
    })
  }
})

app.get('/api/admin/encuentros/model-requests', async (req, res) => {
  try {
    let profile = null

    if (supabaseAdmin) {
      const authHeader = req.headers.authorization || ''
      if (!authHeader) {
        res.status(401).json({ error: 'Debes iniciar sesion antes de revisar solicitudes.' })
        return
      }

      const authResult = await getAuthenticatedUser(authHeader, {
        requireStripe: false,
      })
      profile = authResult.profile

      if (profile.role !== 'admin') {
        res.status(403).json({ error: 'Solo admin puede administrar solicitudes de modelos.' })
        return
      }
    }

    const requests = await loadEncounterModelRequests({ includeHidden: true })

    res.json({
      ok: true,
      requests,
    })
  } catch (error) {
    res.status(500).json({
      error: error.message || 'No se pudieron cargar las solicitudes de modelo.',
    })
  }
})

app.patch('/api/admin/encuentros/model-requests/:id', async (req, res) => {
  try {
    let profile = null

    if (supabaseAdmin) {
      const authHeader = req.headers.authorization || ''
      if (!authHeader) {
        res.status(401).json({ error: 'Debes iniciar sesion antes de revisar solicitudes.' })
        return
      }

      const authResult = await getAuthenticatedUser(authHeader, {
        requireStripe: false,
      })
      profile = authResult.profile

      if (profile.role !== 'admin') {
        res.status(403).json({ error: 'Solo admin puede administrar solicitudes de modelos.' })
        return
      }
    }

    const request = await updateEncounterModelRequest(req.params.id, req.body || {}, profile)

    res.json({
      ok: true,
      request,
    })
  } catch (error) {
    const status =
      error.code === 'MODEL_REQUEST_NOT_FOUND'
        ? 404
        : error.code === 'MODEL_EXISTS'
          ? 409
          : error.code === 'BAD_REQUEST'
            ? 400
            : isMissingEncounterModelRequestsTableError(error)
              ? 503
              : 500
    res.status(status).json({
      error: error.message || 'No se pudo actualizar la solicitud de modelo.',
      code: error.code || 'MODEL_REQUEST_ERROR',
    })
  }
})

app.post('/api/encuentros/model-requests', async (req, res) => {
  try {
    let submittedBy = null
    const authHeader = req.headers.authorization || ''

    if (authHeader) {
      try {
        const authResult = await getAuthenticatedUser(authHeader, {
          requireStripe: false,
        })
        submittedBy = authResult.profile?.id || null
      } catch (authError) {
        submittedBy = null
      }
    }

    const request = await createEncounterModelRequest({
      ...req.body,
      submittedBy,
    })

    res.json({
      ok: true,
      request,
    })
  } catch (error) {
    const status = error.code === 'MODEL_EXISTS' ? 409 : error.code === 'BAD_REQUEST' ? 400 : 500
    res.status(status).json({
      error: error.message || 'No se pudo registrar la solicitud de modelo.',
      code: error.code || 'MODEL_REQUEST_ERROR',
    })
  }
})

app.get('/api/admin/audit-events', async (req, res) => {
  try {
    assertSupabaseAuthConfig()

    const { profile } = await getAuthenticatedUser(req.headers.authorization || '', {
      requireStripe: false,
    })

    if (profile.role !== 'admin') {
      res.status(403).json({ error: 'Solo admin puede ver el historial de auditoria.' })
      return
    }

    const { data: events, error } = await supabaseAdmin
      .from('admin_audit_events')
      .select(
        'id, event_type, actor_id, target_user_id, entity_type, entity_id, payload, created_at',
      )
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      const message = String(error.message || '')

      if (
        message.includes('admin_audit_events') ||
        message.includes('schema cache') ||
        message.includes('does not exist') ||
        message.includes('column')
      ) {
        res.json({ ok: true, events: [] })
        return
      }

      throw new Error(error.message || 'No se pudo leer la auditoria.')
    }

    const actorIds = Array.from(new Set((events || []).map((event) => event.actor_id).filter(Boolean)))
    const targetIds = Array.from(
      new Set((events || []).map((event) => event.target_user_id).filter(Boolean)),
    )

    const [actorsResponse, targetsResponse] = await Promise.all([
      actorIds.length
        ? supabaseAdmin
            .from('profiles')
            .select('id, display_name, email')
            .in('id', actorIds)
        : Promise.resolve({ data: [], error: null }),
      targetIds.length
        ? supabaseAdmin
            .from('profiles')
            .select('id, display_name, email')
            .in('id', targetIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    if (actorsResponse.error) {
      throw new Error(actorsResponse.error.message || 'No se pudo leer el actor de auditoria.')
    }

    if (targetsResponse.error) {
      throw new Error(targetsResponse.error.message || 'No se pudo leer el destino de auditoria.')
    }

    const profilesById = new Map(
      [...(actorsResponse.data || []), ...(targetsResponse.data || [])].map((row) => [
        row.id,
        row,
      ]),
    )

    res.json({
      ok: true,
      events: (events || []).map((event) => {
        const actor = event.actor_id ? profilesById.get(event.actor_id) : null
        const target = event.target_user_id ? profilesById.get(event.target_user_id) : null

        return {
          id: event.id,
          eventType: event.event_type,
          actorId: event.actor_id || '',
          actorName: actor?.display_name || actor?.email || '',
          targetUserId: event.target_user_id || '',
          targetUserName: target?.display_name || target?.email || '',
          entityType: event.entity_type || 'user',
          entityId: event.entity_id || '',
          payload: event.payload || {},
          createdAt: event.created_at || null,
        }
      }),
    })
  } catch (error) {
    const status = error.code === 'AUTH_REQUIRED' ? 401 : error.status || 500
    res.status(status).json({ error: error.message || 'No se pudo cargar la auditoria.' })
  }
})

app.post('/api/admin/translate', async (req, res) => {
  try {
    assertSupabaseAuthConfig()

    const { profile } = await getAuthenticatedUser(req.headers.authorization || '', {
      requireStripe: false,
    })

    if (profile.role !== 'admin') {
      res.status(403).json({ error: 'Solo admin puede traducir contenido.' })
      return
    }

    const payload = req.body?.payload || {}
    const sourceLocale = String(req.body?.sourceLocale || 'es').slice(0, 2).toLowerCase() === 'en'
      ? 'en'
      : 'es'
    const targetLocale = String(req.body?.targetLocale || 'en').slice(0, 2).toLowerCase() === 'es'
      ? 'es'
      : 'en'

    if (sourceLocale === targetLocale) {
      res.status(400).json({ error: 'El idioma origen y destino deben ser distintos.' })
      return
    }

    const result = await translateContentPayload(payload, { sourceLocale, targetLocale })

    res.json({
      ok: true,
      translated: result.translated,
      sourceHash: result.sourceHash,
      translatedAt: result.translatedAt,
      provider: result.provider,
      sourceLocale: result.sourceLocale,
      targetLocale: result.targetLocale,
    })
  } catch (error) {
    const status = error.code === 'AUTH_REQUIRED' ? 401 : error.status || 500
    res.status(status).json({ error: error.message || 'No se pudo traducir el contenido.' })
  }
})

if (existsSync(CLIENT_DIST_DIR)) {
  app.get(/^\/(?!api)(?!.*\.[^/]+$).*/, async (_req, res, next) => {
    try {
      res.type('html').send(await renderClientIndexHtml())
    } catch (error) {
      next(error)
    }
  })

  app.use(express.static(CLIENT_DIST_DIR, { index: false }))
}

app.listen(port, () => {
  console.log(`Stripe server running on http://localhost:${port}`)
  syncProductsFromSiteContent().catch((error) => {
    console.error('Product sync failed on startup:', error.message)
  })
})
