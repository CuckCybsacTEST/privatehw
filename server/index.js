import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { buildDefaultProducts } from '../src/data/defaultCommerce.js'
import { defaultSiteContent, mergeSiteContent } from '../src/data/defaultSiteContent.js'

const app = express()
const port = Number.parseInt(process.env.PORT || '4242', 10)
const appUrl = process.env.APP_URL || 'http://localhost:5173'
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || ''
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''
const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

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

async function getAuthenticatedUser(authHeader) {
  assertServerConfig()

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
    .select('id, email, display_name, status, stripe_customer_id')
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

function buildLineItem(product) {
  if (product.stripe_price_id) {
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
        currency: (product.currency || 'PEN').toLowerCase(),
        recurring: { interval },
        unit_amount: product.price_amount,
        product_data: productData,
      },
      quantity: 1,
    }
  }

  return {
    price_data: {
      currency: (product.currency || 'PEN').toLowerCase(),
      unit_amount: product.price_amount,
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

async function createOrUpdateOrder(checkoutSession, product, userId) {
  assertServerConfig()

  const orderPayload = {
    user_id: userId,
    provider: 'stripe',
    provider_order_id: checkoutSession.id,
    status: 'paid',
    total_amount: checkoutSession.amount_total || product.price_amount || 0,
    currency: (checkoutSession.currency || product.currency || 'PEN').toUpperCase(),
    metadata: {
      stripeCheckoutSessionId: checkoutSession.id,
      stripeCustomerId: checkoutSession.customer,
      stripePaymentIntentId: checkoutSession.payment_intent || null,
      stripeSubscriptionId: checkoutSession.subscription || null,
      productSlug: product.slug,
      checkoutMode: product.checkout_mode,
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

async function grantEntitlement(userId, product, orderId) {
  if (!product.access_scope || product.product_type === 'physical') {
    return
  }

  let expiresAt = null

  if (product.access_scope === 'all_digital') {
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
      .eq('entitlement_key', 'all_digital')
      .maybeSingle()

    const currentExpiry = currentEntitlement?.expires_at
      ? new Date(currentEntitlement.expires_at)
      : null
    const baseDate =
      currentExpiry && currentExpiry.getTime() > Date.now() ? currentExpiry : new Date()

    expiresAt =
      durationUnit === 'days'
        ? addDays(baseDate, safeDurationValue).toISOString()
        : addMonths(baseDate, safeDurationValue).toISOString()
  }

  const entitlementPayload = {
    user_id: userId,
    product_slug: product.slug,
    entitlement_key: product.access_scope,
    status: 'active',
    source_order_id: orderId,
    expires_at: expiresAt,
  }

  const { error } = await supabaseAdmin
    .from('entitlements')
    .upsert(entitlementPayload, { onConflict: 'user_id,entitlement_key' })

  if (error) {
    throw new Error('No se pudo otorgar el entitlement al cliente.')
  }
}

async function resolveProductBySlug(productSlug) {
  assertServerConfig()

  let { data: product, error } = await supabaseAdmin
    .from('products')
    .select(
      'slug, title, product_type, checkout_mode, access_scope, price_amount, currency, active, stripe_price_id, metadata',
    )
    .eq('slug', productSlug)
    .eq('active', true)
    .maybeSingle()

  if (!error && product) {
    return product
  }

  await syncProductsFromSiteContent()

  ;({ data: product, error } = await supabaseAdmin
    .from('products')
    .select(
      'slug, title, product_type, checkout_mode, access_scope, price_amount, currency, active, stripe_price_id, metadata',
    )
    .eq('slug', productSlug)
    .eq('active', true)
    .maybeSingle())

  if (error || !product) {
    const productError = new Error('El producto solicitado no esta disponible.')
    productError.code = 'PRODUCT_NOT_FOUND'
    throw productError
  }

  return product
}

async function syncProductsFromSiteContent() {
  assertServerConfig()

  const { data: contentRow } = await supabaseAdmin
    .from('site_content')
    .select('content')
    .eq('slug', 'home')
    .maybeSingle()

  const mergedContent = contentRow?.content
    ? mergeSiteContent(contentRow.content)
    : defaultSiteContent
  const derivedProducts = buildDefaultProducts(mergedContent).map((product) => ({
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

  if (!derivedProducts.length) {
    return
  }

  const { error } = await supabaseAdmin
    .from('products')
    .upsert(derivedProducts, { onConflict: 'slug' })

  if (error) {
    throw new Error('No se pudo sincronizar products desde site_content.')
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

  await supabaseAdmin
    .from('entitlements')
    .update({
      status: 'expired',
      expires_at: new Date().toISOString(),
    })
    .eq('user_id', profile.id)
    .eq('entitlement_key', 'all_digital')
    .eq('status', 'active')
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

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/stripe/create-checkout-session', async (req, res) => {
  try {
    assertServerConfig()

    const { user, profile } = await getAuthenticatedUser(req.headers.authorization || '')
    const { productSlug } = req.body || {}

    if (!productSlug) {
      res.status(400).json({ error: 'Falta productSlug.', code: 'BAD_REQUEST' })
      return
    }

    const product = await resolveProductBySlug(productSlug)
    const customerId = await ensureStripeCustomer(profile)

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: product.checkout_mode,
      customer: customerId,
      line_items: [buildLineItem(product)],
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&product=${encodeURIComponent(product.slug)}`,
      cancel_url: `${appUrl}/checkout/cancel?product=${encodeURIComponent(product.slug)}`,
      client_reference_id: user.id,
      allow_promotion_codes: true,
      metadata: {
        user_id: user.id,
        product_slug: product.slug,
        access_scope: product.access_scope,
        product_type: product.product_type,
      },
      subscription_data:
        product.checkout_mode === 'subscription'
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

app.listen(port, () => {
  console.log(`Stripe server running on http://localhost:${port}`)
  syncProductsFromSiteContent().catch((error) => {
    console.error('Product sync failed on startup:', error.message)
  })
})
