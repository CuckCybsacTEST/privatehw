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
const CLIENT_DIST_DIR = fileURLToPath(new URL('../dist/', import.meta.url))
let homeContentCache = {
  value: null,
  loadedAt: 0,
  pending: null,
}

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
}) {
  const resolvedPricing =
    pricing && typeof pricing === 'object' && Number.isFinite(pricing.advanceAmount)
      ? pricing
      : await getEncuentrosBookingPricing(recordingChoice)
  const reservationRequestId = `reservation-${selectedDate}-${selectedTime.replace(':', '')}-${Date.now()}`
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
      productSlug: 'reservation-encuentros',
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
        productSlug: 'reservation-encuentros',
        quantity: 1,
        unitAmount: advanceAmount,
        totalAmount: advanceAmount,
        metadata: {
          reservationRequestId,
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
    .eq('product_slug', 'reservation-encuentros')
    .maybeSingle()

  if (!existingItem) {
    const { error: itemError } = await supabaseAdmin.from('order_items').insert({
      order_id: savedOrder.id,
      product_slug: 'reservation-encuentros',
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

async function getEncuentrosBookingPricing(recordingChoice = 'standard') {
  const mergedContent = await loadHomeContent()
  return buildEncuentrosBookingPricing(mergedContent, normalizeRecordingChoice(recordingChoice))
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
app.use(express.json())

app.get('/', (_req, res) => {
  if (existsSync(CLIENT_DIST_DIR)) {
    res.sendFile(`${CLIENT_DIST_DIR}/index.html`)
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
    const pricing = await getEncuentrosBookingPricing(recordingChoice)

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
  app.use(express.static(CLIENT_DIST_DIR))

  app.get(/^\/(?!api)(?!.*\.[^/]+$).*/, (_req, res) => {
    res.sendFile(`${CLIENT_DIST_DIR}/index.html`)
  })
}

app.listen(port, () => {
  console.log(`Stripe server running on http://localhost:${port}`)
  syncProductsFromSiteContent().catch((error) => {
    console.error('Product sync failed on startup:', error.message)
  })
})
