import { createClient } from '@supabase/supabase-js'
import { defaultSiteContent, mergeSiteContent } from '../data/defaultSiteContent'
import { defaultBlogPosts, normalizeBlogPost } from '../data/defaultBlogPosts'
import {
  buildDefaultProducts,
  defaultEntitlements,
  mergeProducts,
  normalizeEntitlement,
} from '../data/defaultCommerce'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null

function assertSupabase() {
  if (!supabase) {
    throw new Error('Supabase no esta configurado.')
  }

  return supabase
}

function normalizeProfile(profile) {
  return {
    id: profile.id,
    name: profile.display_name || profile.email || 'User',
    email: profile.email || '',
    password: 'managed-in-supabase',
    role: profile.role || 'public',
    status: profile.status || 'active',
  }
}

function normalizeSession(user, profile, accessToken = '') {
  if (!user) {
    return null
  }

  return {
    id: user.id,
    name:
      profile?.display_name || user.user_metadata?.display_name || user.email || 'User',
    email: user.email || '',
    role: profile?.role || 'public',
    accessToken,
  }
}

export async function getCurrentSession() {
  const client = assertSupabase()
  const {
    data: { session },
  } = await client.auth.getSession()

  if (!session?.user) {
    return null
  }

  const { data: profile } = await client
    .from('profiles')
    .select('id, display_name, role, status, email')
    .eq('id', session.user.id)
    .maybeSingle()

  return normalizeSession(session.user, profile, session.access_token)
}

export async function signInWithPassword({ email, password, requireAdmin = false }) {
  const client = assertSupabase()
  const { data, error } = await client.auth.signInWithPassword({ email, password })

  if (error) {
    throw error
  }

  const { data: profile } = await client
    .from('profiles')
    .select('id, display_name, role, status, email')
    .eq('id', data.user.id)
    .maybeSingle()

  if (!profile) {
    await client.auth.signOut()
    throw new Error(
      'El usuario existe en Auth pero no en public.profiles. Ejecuta schema.sql y luego marca el rol admin en SQL Editor.',
    )
  }

  if (profile.status !== 'active') {
    await client.auth.signOut()
    throw new Error('Este usuario esta deshabilitado.')
  }

  if (requireAdmin && profile.role !== 'admin') {
    await client.auth.signOut()
    throw new Error('Este usuario no tiene permisos de administrador.')
  }

  return normalizeSession(data.user, profile, data.session?.access_token || '')
}

export async function signUpWithPassword({ email, password, displayName }) {
  const client = assertSupabase()
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
    },
  })

  if (error) {
    throw error
  }

  if (!data.user) {
    throw new Error('No se pudo crear el usuario.')
  }

  const { data: profile } = await client
    .from('profiles')
    .select('id, display_name, role, status, email')
    .eq('id', data.user.id)
    .maybeSingle()

  if (!data.session?.access_token) {
    return null
  }

  return normalizeSession(data.user, profile, data.session.access_token)
}

export async function signOut() {
  const client = assertSupabase()
  await client.auth.signOut()
}

export function listenToAuthChanges(callback) {
  const client = assertSupabase()
  const {
    data: { subscription },
  } = client.auth.onAuthStateChange((_event, session) => {
    if (!session?.user) {
      callback(null)
      return
    }

    queueMicrotask(async () => {
      const { data: profile } = await client
        .from('profiles')
        .select('id, display_name, role, status, email')
        .eq('id', session.user.id)
        .maybeSingle()

      callback(normalizeSession(session.user, profile, session.access_token))
    })
  })

  return subscription
}

export async function fetchSiteContent() {
  const client = assertSupabase()
  const { data, error } = await client
    .from('site_content')
    .select('content')
    .eq('slug', 'home')
    .maybeSingle()

  if (error) {
    throw error
  }

  return data?.content ? mergeSiteContent(data.content) : defaultSiteContent
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
      accessLevel: body.accessLevel || 'free',
      publishedAt: row.published_at,
      contentHtml: body.html || '<p></p>',
      mediaItems: body.mediaItems || [],
    },
    fallbackIndex,
  )
}

export async function fetchBlogPosts() {
  const client = assertSupabase()
  const { data, error } = await client
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
}

export async function upsertBlogPost(post) {
  const client = assertSupabase()
  const payload = {
    id: post.id?.startsWith('default-post-') || post.id?.startsWith('blog-post-') ? undefined : post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    body: {
      html: post.contentHtml,
      mediaItems: post.mediaItems || [],
      accessLevel: post.accessLevel || 'free',
      category: post.category || 'General',
      coverImage: post.coverImage || '',
    },
    cover_media_path: post.coverImage || '',
    status: post.status || 'draft',
    published_at: post.status === 'published' ? post.publishedAt || new Date().toISOString() : null,
  }

  const { data, error } = await client
    .from('blog_posts')
    .upsert(payload, { onConflict: 'slug' })
    .select('id, slug, title, excerpt, body, cover_media_path, status, published_at')
    .single()

  if (error) {
    throw error
  }

  return normalizeBlogPostRow(data)
}

export async function deleteBlogPost(postId) {
  const client = assertSupabase()
  const { error } = await client.from('blog_posts').delete().eq('id', postId)

  if (error) {
    throw error
  }
}

export async function upsertSiteContent(content, updatedBy) {
  const client = assertSupabase()
  const { error } = await client.from('site_content').upsert(
    {
      slug: 'home',
      content,
      updated_by: updatedBy,
    },
    { onConflict: 'slug' },
  )

  if (error) {
    throw error
  }
}

function normalizeProductRow(row, fallbackIndex = 0) {
  return {
    id: row.id || `product-row-${fallbackIndex}`,
    slug: row.slug,
    title: row.title,
    productType: row.product_type,
    checkoutMode: row.checkout_mode,
    accessScope: row.access_scope,
    priceAmount: row.price_amount,
    currency: row.currency,
    priceLabel: row.price_label,
    active: row.active,
    stripePriceId: row.stripe_price_id || '',
    metadata: row.metadata || {},
  }
}

export async function fetchProducts(content = defaultSiteContent) {
  const client = assertSupabase()
  const { data, error } = await client
    .from('products')
    .select(
      'id, slug, title, product_type, checkout_mode, access_scope, price_amount, currency, price_label, active, stripe_price_id, metadata',
    )
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return mergeProducts(
    buildDefaultProducts(content),
    data?.map((row, index) => normalizeProductRow(row, index)) || [],
  )
}

export async function upsertProducts(products = []) {
  const client = assertSupabase()
  const payload = products.map((product) => ({
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

  const { error } = await client.from('products').upsert(payload, { onConflict: 'slug' })

  if (error) {
    throw error
  }
}

export async function fetchCurrentEntitlements() {
  const client = assertSupabase()
  const {
    data: { session },
  } = await client.auth.getSession()

  if (!session?.user) {
    return defaultEntitlements
  }

  const { data, error } = await client
    .from('entitlements')
    .select('id, user_id, product_slug, entitlement_key, status, expires_at')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return (data || []).map((row, index) =>
    normalizeEntitlement(
      {
        id: row.id,
        userId: row.user_id,
        productSlug: row.product_slug,
        entitlementKey: row.entitlement_key,
        status: row.status,
        expiresAt: row.expires_at,
      },
      index,
    ),
  )
}

function normalizeOrderRow(row, fallbackIndex = 0) {
  return {
    id: row.id || `order-${fallbackIndex}`,
    providerOrderId: row.provider_order_id || '',
    status: row.status || 'pending',
    totalAmount: row.total_amount || 0,
    currency: row.currency || 'PEN',
    createdAt: row.created_at || null,
    metadata: row.metadata || {},
    items: (row.order_items || []).map((item, itemIndex) => ({
      id: item.id || `order-item-${fallbackIndex}-${itemIndex}`,
      productSlug: item.product_slug || '',
      quantity: item.quantity || 1,
      unitAmount: item.unit_amount || 0,
      totalAmount: item.total_amount || 0,
      metadata: item.metadata || {},
    })),
  }
}

export async function fetchCurrentOrders() {
  const client = assertSupabase()
  const {
    data: { session },
  } = await client.auth.getSession()

  if (!session?.user) {
    return []
  }

  const { data, error } = await client
    .from('orders')
    .select(
      'id, provider_order_id, status, total_amount, currency, created_at, metadata, order_items(id, product_slug, quantity, unit_amount, total_amount, metadata)',
    )
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return (data || []).map((row, index) => normalizeOrderRow(row, index))
}

export async function getProfiles() {
  const client = assertSupabase()
  const { data, error } = await client
    .from('profiles')
    .select('id, display_name, email, role, status, stripe_customer_id, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data.map((profile) => ({
    ...normalizeProfile(profile),
    stripeCustomerId: profile.stripe_customer_id || '',
    createdAt: profile.created_at || null,
  }))
}

export async function getCustomerAdminSnapshot() {
  const client = assertSupabase()
  const [profilesResponse, ordersResponse, entitlementsResponse] = await Promise.all([
    client
      .from('profiles')
      .select('id, display_name, email, role, status, stripe_customer_id, created_at')
      .order('created_at', { ascending: false }),
    client
      .from('orders')
      .select('id, user_id, status, total_amount, currency, created_at, provider_order_id, order_items(product_slug)')
      .order('created_at', { ascending: false }),
    client
      .from('entitlements')
      .select('id, user_id, product_slug, entitlement_key, status, expires_at, created_at')
      .order('created_at', { ascending: false }),
  ])

  if (profilesResponse.error) {
    throw profilesResponse.error
  }

  if (ordersResponse.error) {
    throw ordersResponse.error
  }

  if (entitlementsResponse.error) {
    throw entitlementsResponse.error
  }

  const ordersByUser = new Map()
  for (const order of ordersResponse.data || []) {
    const nextOrders = ordersByUser.get(order.user_id) || []
    nextOrders.push({
      id: order.id,
      status: order.status,
      totalAmount: order.total_amount || 0,
      currency: order.currency || 'PEN',
      createdAt: order.created_at || null,
      providerOrderId: order.provider_order_id || '',
      productSlugs: (order.order_items || []).map((item) => item.product_slug).filter(Boolean),
    })
    ordersByUser.set(order.user_id, nextOrders)
  }

  const entitlementsByUser = new Map()
  for (const entitlement of entitlementsResponse.data || []) {
    const nextEntitlements = entitlementsByUser.get(entitlement.user_id) || []
    nextEntitlements.push({
      id: entitlement.id,
      productSlug: entitlement.product_slug || '',
      entitlementKey: entitlement.entitlement_key,
      status: entitlement.status,
      expiresAt: entitlement.expires_at || null,
      createdAt: entitlement.created_at || null,
    })
    entitlementsByUser.set(entitlement.user_id, nextEntitlements)
  }

  return (profilesResponse.data || []).map((profile) => {
    const normalized = normalizeProfile(profile)
    const userOrders = ordersByUser.get(profile.id) || []
    const userEntitlements = entitlementsByUser.get(profile.id) || []

    return {
      ...normalized,
      stripeCustomerId: profile.stripe_customer_id || '',
      createdAt: profile.created_at || null,
      orderCount: userOrders.length,
      paidOrderCount: userOrders.filter((order) => order.status === 'paid').length,
      totalSpentAmount: userOrders
        .filter((order) => order.status === 'paid')
        .reduce((sum, order) => sum + (order.totalAmount || 0), 0),
      latestOrderAt: userOrders[0]?.createdAt || null,
      orders: userOrders,
      entitlements: userEntitlements,
    }
  })
}

export async function updateProfile(userId, patch) {
  const client = assertSupabase()
  const { data, error } = await client
    .from('profiles')
    .update({
      display_name: patch.name,
      role: patch.role,
      status: patch.status,
    })
    .eq('id', userId)
    .select('id, display_name, email, role, status')
    .single()

  if (error) {
    throw error
  }

  return normalizeProfile(data)
}

export async function uploadMediaAsset(file, bucket, folder = 'home') {
  const client = assertSupabase()
  const extension = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`
  const filePath = `${folder}/${fileName}`
  const kind = file.type.startsWith('video/')
    ? 'video'
    : file.type.startsWith('audio/')
      ? 'audio'
      : 'image'

  const { error } = await client.storage.from(bucket).upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
  })

  if (error) {
    throw error
  }

  const { data } = client.storage.from(bucket).getPublicUrl(filePath)

  try {
    await client.from('media_assets').insert({
      bucket,
      path: filePath,
      kind,
    })
  } catch {
    // The file is already stored and publicly available even if metadata insert fails.
  }

  return {
    path: filePath,
    publicUrl: data.publicUrl,
  }
}

export async function uploadMediaAssetFromUrl(sourceUrl, bucket, folder = 'home') {
  const response = await fetch(sourceUrl)

  if (!response.ok) {
    throw new Error(`No se pudo descargar el asset local: ${sourceUrl}`)
  }

  const blob = await response.blob()
  const cleanName = sourceUrl.split('/').pop() || `asset-${Date.now()}.jpg`
  const inferredType = blob.type || 'image/jpeg'
  const file = new File([blob], cleanName, { type: inferredType })

  return uploadMediaAsset(file, bucket, folder)
}
