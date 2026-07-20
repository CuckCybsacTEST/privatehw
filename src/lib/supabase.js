import { createClient } from '@supabase/supabase-js'
import { defaultSiteContent, mergeSiteContent } from '../data/defaultSiteContent'
import { defaultBlogPosts, normalizeBlogPost } from '../data/defaultBlogPosts'
import {
  buildDefaultProducts,
  buildDerivedProducts,
  buildPersistentProducts,
  defaultEntitlements,
  mergeProducts,
  isPersistentProductType,
  normalizeEntitlement,
} from '../data/defaultCommerce'
import { normalizeRecordingChoice } from '../utils/encuentrosBooking'
import { readClientEnv } from './runtimeEnv'

const supabaseUrl = readClientEnv('VITE_SUPABASE_URL')
const supabaseAnonKey =
  readClientEnv('VITE_SUPABASE_PUBLISHABLE_KEY') ||
  readClientEnv('VITE_SUPABASE_ANON_KEY')

function getDirectStorageEndpoint() {
  if (!supabaseUrl) {
    return ''
  }

  try {
    const url = new URL(supabaseUrl)
    const hostParts = url.hostname.split('.')

    if (hostParts.length >= 3 && hostParts[1] === 'supabase' && hostParts[2] === 'co') {
      return `https://${hostParts[0]}.storage.supabase.co/storage/v1/upload/resumable`
    }

    return `${url.origin}/storage/v1/upload/resumable`
  } catch {
    return `${supabaseUrl}/storage/v1/upload/resumable`
  }
}

const supabaseStorageResumableEndpoint = getDirectStorageEndpoint()

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

const globalSupabaseState = globalThis

export const supabase = isSupabaseConfigured
  ? (globalSupabaseState.__privatehwSupabaseClient ||
      (globalSupabaseState.__privatehwSupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      })))
  : null

function assertSupabase() {
  if (!supabase) {
    throw new Error('Supabase no esta configurado.')
  }

  return supabase
}

function withSupabaseTimeout(promise, timeoutMs, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), timeoutMs)
    }),
  ])
}

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

async function retrySupabaseOperation(operation, attempts = 2, delayMs = 600) {
  let lastError

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      if (attempt < attempts - 1) {
        await delay(delayMs)
      }
    }
  }

  throw lastError
}

async function uploadFileWithProgress(client, file, bucket, filePath, onProgress) {
  const {
    data: { session },
  } = await client.auth.getSession()
  const accessToken = session?.access_token || ''

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('POST', `${supabaseUrl}/storage/v1/object/${bucket}/${filePath}`)
    request.setRequestHeader('apikey', supabaseAnonKey)

    if (accessToken) {
      request.setRequestHeader('Authorization', `Bearer ${accessToken}`)
    }

    request.setRequestHeader('x-upsert', 'false')
    request.setRequestHeader('cache-control', '3600')

    request.upload.onprogress = (event) => {
      if (!onProgress || !event.lengthComputable) {
        return
      }

      onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)))
    }

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress?.(100)
        resolve()
        return
      }

      try {
        const payload = JSON.parse(request.responseText)
        reject(new Error(payload.message || payload.error || 'No se pudo subir el archivo.'))
      } catch {
        reject(new Error('No se pudo subir el archivo.'))
      }
    }

    request.onerror = () => reject(new Error('Fallo la conexion durante la subida.'))
    request.send(file)
  })
}

async function uploadFileResumable(client, file, bucket, filePath, onProgress) {
  const { Upload } = await import('tus-js-client')
  const {
    data: { session },
  } = await client.auth.getSession()
  const accessToken = session?.access_token || ''

  return new Promise((resolve, reject) => {
    const upload = new Upload(file, {
      endpoint: supabaseStorageResumableEndpoint,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      chunkSize: 6 * 1024 * 1024,
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      fingerprint(currentFile) {
        return Promise.resolve(
          [
            'supabase-resumable',
            bucket,
            filePath,
            currentFile.name,
            currentFile.type,
            currentFile.size,
            currentFile.lastModified,
          ].join('-'),
        )
      },
      headers: {
        ...(supabaseAnonKey ? { apikey: supabaseAnonKey } : {}),
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        'x-upsert': 'false',
      },
      metadata: {
        bucketName: bucket,
        objectName: filePath,
        contentType: file.type || 'application/octet-stream',
        cacheControl: 3600,
        metadata: JSON.stringify({}),
      },
      onError(error) {
        reject(
          new Error(
            error?.originalResponse?.getBody?.() ||
              error?.message ||
              'No se pudo completar la subida resumable.',
          ),
        )
      },
      onProgress(bytesUploaded, bytesTotal) {
        if (!onProgress || !bytesTotal) {
          return
        }

        onProgress(Math.min(100, Math.round((bytesUploaded / bytesTotal) * 100)))
      },
      onSuccess() {
        onProgress?.(100)
        resolve()
      },
    })

    upload
      .findPreviousUploads()
      .then((previousUploads) => {
        if (previousUploads.length) {
          upload.resumeFromPreviousUpload(previousUploads[0])
        }

        upload.start()
      })
      .catch(reject)
  })
}

function normalizeProfile(profile) {
  return {
    id: profile.id,
    name: profile.display_name || profile.email || 'User',
    email: profile.email || '',
    username: profile.username || '',
    role: profile.role || 'public',
    audience: profile.audience || 'client',
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
    username: profile?.username || user.user_metadata?.username || '',
    role: profile?.role || 'public',
    audience: profile?.audience || user.user_metadata?.audience || 'client',
    status: profile?.status || 'active',
    accessToken,
  }
}

async function fetchCurrentProfile(client) {
  try {
    const { data, error } = await withSupabaseTimeout(
      client.rpc('get_my_profile'),
      8000,
      'La lectura del perfil actual tardo demasiado.',
    )

    if (error) {
      throw error
    }

    if (Array.isArray(data)) {
      return data[0] || null
    }

    return data || null
  } catch (error) {
    const message = error?.message || ''

    if (
      message.includes('get_my_profile') ||
      message.includes('Could not find the function public.get_my_profile')
    ) {
      const {
        data: { session },
      } = await client.auth.getSession()

      if (!session?.user) {
        return null
      }

      const { data: profile } = await withSupabaseTimeout(
        client
          .from('profiles')
          .select('id, display_name, username, role, audience, status, email, stripe_customer_id')
          .eq('id', session.user.id)
          .maybeSingle(),
        12000,
        'La lectura de public.profiles tardo demasiado.',
      )

      return profile || null
    }

    throw error
  }
}

export async function getCurrentSession() {
  const client = assertSupabase()
  const {
    data: { session },
  } = await withSupabaseTimeout(
    client.auth.getSession(),
    8000,
    'La lectura de sesion Supabase tardo demasiado.',
  )

  if (!session?.user) {
    return null
  }

  const profile = await fetchCurrentProfile(client)

  if (!profile || profile.status !== 'active') {
    await client.auth.signOut()
    return null
  }

  return normalizeSession(session.user, profile, session.access_token)
}

export async function signInWithPassword({ email, password, requireAdmin = false }) {
  const client = assertSupabase()
  const { data, error } = await retrySupabaseOperation(
    () =>
      withSupabaseTimeout(
        client.auth.signInWithPassword({ email, password }),
        15000,
        'Supabase Auth tardo demasiado al validar el login.',
      ),
    2,
    750,
  )

  if (error) {
    throw error
  }

  const profile = await retrySupabaseOperation(() => fetchCurrentProfile(client), 3, 500)

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

export async function resolveLoginIdentifier(identifier = '') {
  const normalizedIdentifier = String(identifier || '').trim()

  if (!normalizedIdentifier) {
    throw new Error('Debes indicar un correo o nombre de usuario.')
  }

  const response = await fetch('/api/auth/resolve-login-identifier', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      identifier: normalizedIdentifier,
    }),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo resolver el usuario.')
  }

  return data?.resolved || null
}

export async function signInWithIdentifier({ identifier = '', password = '', requireAdmin = false } = {}) {
  const normalizedIdentifier = String(identifier || '').trim()
  const normalizedPassword = String(password || '').trim()

  if (!normalizedIdentifier || !normalizedPassword) {
    throw new Error('Debes indicar usuario o correo y contraseña.')
  }

  const resolved = normalizedIdentifier.includes('@')
    ? { email: normalizedIdentifier }
    : await resolveLoginIdentifier(normalizedIdentifier)

  if (!resolved?.email) {
    throw new Error('No se encontro un usuario con ese correo o nombre de usuario.')
  }

  return signInWithPassword({ email: resolved.email, password: normalizedPassword, requireAdmin })
}

export async function signInWithOAuth(provider, redirectTo) {
  const client = assertSupabase()

  const callbackUrl = redirectTo
    ? new URL(redirectTo, window.location.origin).toString()
    : window.location.origin

  const { data, error } = await withSupabaseTimeout(
    client.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callbackUrl,
      },
    }),
    15000,
    'Supabase tardo demasiado al iniciar el acceso social.',
  )

  if (error) {
    throw error
  }

  if (!data?.url) {
    throw new Error('No se pudo iniciar el acceso social.')
  }

  window.location.assign(data.url)

  return data
}

export async function signInWithTelegram(telegramUser) {
  const response = await fetch('/api/auth/telegram', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      telegramUser,
    }),
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.error || 'No se pudo validar el acceso de Telegram.')
  }

  const email = String(payload.email || '').trim()
  const password = String(payload.password || '').trim()

  if (!email || !password) {
    throw new Error('Telegram no devolvio credenciales validas.')
  }

  return signInWithPassword({ email, password })
}

export async function signInWithWhatsApp({ challengeId = '', code = '' }) {
  const response = await fetch('/api/auth/whatsapp/verify-code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ challengeId, code }),
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.error || 'No se pudo validar el acceso por WhatsApp.')
  }

  const email = String(payload.email || '').trim()
  const password = String(payload.password || '').trim()

  if (!email || !password) {
    throw new Error('WhatsApp no devolvio credenciales validas.')
  }

  return signInWithPassword({ email, password })
}

async function parseJsonResponse(response, fallbackMessage) {
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.error || fallbackMessage)
  }

  return payload
}

export async function getWhatsappVerificationConfig() {
  const response = await fetch('/api/auth/whatsapp/config')
  return parseJsonResponse(response, 'No se pudo cargar la configuracion de WhatsApp.')
}

export async function requestWhatsappVerificationCode({ phone = '' }) {
  const response = await fetch('/api/auth/whatsapp/request-code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ phone }),
  })

  return parseJsonResponse(response, 'No se pudo enviar el codigo por WhatsApp.')
}

export async function signUpWithPassword({
  email,
  password,
  displayName,
  username,
  audience = 'client',
  phone = '',
  whatsappVerified = false,
}) {
  const client = assertSupabase()
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName || username || '',
        username: username || '',
        audience: audience || 'client',
        phone: phone || '',
        whatsapp_verified: Boolean(whatsappVerified),
      },
    },
  })

  if (error) {
    throw error
  }

  if (!data.user) {
    throw new Error('No se pudo crear el usuario.')
  }

  const profile = await fetchCurrentProfile(client)

  if (!data.session?.access_token) {
    return null
  }

  return normalizeSession(data.user, profile, data.session.access_token)
}

export async function setMyProfileAudience(audience = 'client') {
  const client = assertSupabase()
  const normalizedAudience = ['client', 'model', 'visitor'].includes(String(audience || '').trim())
    ? String(audience || '').trim()
    : 'client'

  const { error } = await client.rpc('set_my_profile_audience', {
    new_audience: normalizedAudience,
  })

  if (error) {
    throw error
  }

  const profile = await fetchCurrentProfile(client)
  return profile || null
}

export async function createManagedUser(payload, authToken = '') {
  const response = await fetch('/api/admin/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo crear el usuario administrado.')
  }

  return data
}

export async function updateManagedSubscription(userId, payload, authToken = '') {
  const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/subscription`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo actualizar la suscripcion administrada.')
  }

  return data
}

export async function signOut() {
  const client = assertSupabase()
  await withSupabaseTimeout(client.auth.signOut(), 8000, 'El cierre de sesion tardo demasiado.')
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

    window.setTimeout(async () => {
      const profile = await fetchCurrentProfile(client)

      if (!profile || profile.status !== 'active') {
        await client.auth.signOut()
        callback(null)
        return
      }

      callback(normalizeSession(session.user, profile, session.access_token))
    }, 0)
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

export async function fetchEncuentrosModels() {
  const response = await fetch('/api/encuentros/models')
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.error || 'No se pudieron cargar los modelos de encuentros.')
  }

  return Array.isArray(payload.models) ? payload.models : []
}

export async function fetchEncuentrosModel(slug = '') {
  const normalizedSlug = String(slug || '').trim()
  const response = await fetch(`/api/encuentros/models/${encodeURIComponent(normalizedSlug)}`)
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.error || 'No se pudo cargar el modelo solicitado.')
  }

  return payload.model || null
}

export async function fetchEncuentrosBookingPricing(recordingChoice = 'standard', modelSlug = '') {
  const choice = normalizeRecordingChoice(recordingChoice)
  const normalizedSlug = String(modelSlug || '').trim()
  const response = await fetch(
    `/api/encuentros/booking/pricing?recording=${encodeURIComponent(choice)}${
      normalizedSlug ? `&model=${encodeURIComponent(normalizedSlug)}` : ''
    }`,
  )

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.error || 'No se pudo cargar el precio de la reserva.')
  }

  return payload?.pricing || null
}

export async function createManualEncuentrosReservation(payload = {}, authToken = '') {
  const response = await fetch('/api/encuentros/reservations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo registrar la reserva manual.')
  }

  return data?.order || data || null
}

export async function submitEncounterModelRequest(payload = {}, authToken = '') {
  const response = await fetch('/api/encuentros/model-requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo registrar la solicitud de modelo.')
  }

  return {
    request: data?.request || null,
    model: data?.model || null,
  }
}

async function parseApiJson(response, fallbackMessage) {
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.error || fallbackMessage)
  }

  return payload
}

export async function fetchAdminEncuentrosModels(authToken = '') {
  const response = await fetch('/api/admin/encuentros/models', {
    headers: {
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
  })

  const payload = await parseApiJson(response, 'No se pudieron cargar los modelos de encuentros.')

  return Array.isArray(payload.models) ? payload.models : []
}

export async function fetchAdminEncuentrosModelRequests(authToken = '') {
  const response = await fetch('/api/admin/encuentros/model-requests', {
    headers: {
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
  })

  const payload = await parseApiJson(response, 'No se pudieron cargar las solicitudes de modelos.')

  return Array.isArray(payload.requests) ? payload.requests : []
}

export async function updateAdminEncuentrosModelRequest(requestId = '', patch = {}, authToken = '') {
  const normalizedRequestId = String(requestId || '').trim()
  const response = await fetch(`/api/admin/encuentros/model-requests/${encodeURIComponent(normalizedRequestId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify(patch),
  })

  const payload = await parseApiJson(response, 'No se pudo actualizar la solicitud de modelo.')

  return payload.request || null
}

export async function fetchMyEncounterModel(authToken = '') {
  const response = await fetch('/api/model/encuentros/me', {
    headers: {
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
  })

  const payload = await parseApiJson(response, 'No se pudo cargar tu perfil de modelo.')

  return {
    model: payload.model || null,
    ownership: payload.ownership || null,
  }
}

export async function saveMyEncounterModel(payload = {}, authToken = '') {
  const response = await fetch('/api/model/encuentros/me', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo guardar tu perfil de modelo.')
  }

  return data?.model || null
}

export async function saveAdminEncuentrosModel(model = {}, authToken = '') {
  const normalizedSlug = String(model.slug || '').trim()
  const hasExistingSlug = Boolean(model.existingSlug)
  const method = hasExistingSlug ? 'PATCH' : 'POST'
  const endpoint = hasExistingSlug
    ? `/api/admin/encuentros/models/${encodeURIComponent(String(model.existingSlug || '').trim())}`
    : '/api/admin/encuentros/models'

  const response = await fetch(endpoint, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify({
      slug: normalizedSlug,
      displayName: model.displayName || '',
      status: model.status || 'draft',
      sortOrder: model.sortOrder || 0,
      content: model.content && typeof model.content === 'object' ? model.content : {},
      publishedAt: model.publishedAt || null,
    }),
  })

  const payload = await parseApiJson(response, 'No se pudo guardar el modelo de encuentros.')

  return payload.model || null
}

export async function deleteAdminEncuentrosModel(slug = '', authToken = '') {
  const normalizedSlug = String(slug || '').trim()
  const response = await fetch(`/api/admin/encuentros/models/${encodeURIComponent(normalizedSlug)}`, {
    method: 'DELETE',
    headers: {
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
  })

  const payload = await parseApiJson(response, 'No se pudo eliminar el modelo de encuentros.')

  return payload
}

function normalizeBlogPostRow(row, fallbackIndex = 0) {
  const body = row.body && typeof row.body === 'object' && !Array.isArray(row.body) ? row.body : {}
  const localized = body.localized && typeof body.localized === 'object' ? body.localized : {}
  const localizedMeta =
    body.localizedMeta && typeof body.localizedMeta === 'object' ? body.localizedMeta : {}
  const featuredSlot =
    body.featuredSlot === 'primary' || body.featuredSlot === 'secondary'
      ? body.featuredSlot
      : body.featured
        ? 'primary'
        : 'none'

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
      updatedAt: row.updated_at || null,
      scheduledAt: body.scheduledAt || null,
      featured: featuredSlot !== 'none',
      featuredSlot,
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
      localized,
      localizedMeta,
    },
    fallbackIndex,
  )
}

export async function fetchBlogPosts() {
  const client = assertSupabase()
  const { data, error } = await client
    .from('blog_posts')
    .select('id, slug, title, excerpt, body, cover_media_path, status, published_at, updated_at')
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
      accessLevel: post.accessLevel || 'public',
      category: post.category || 'General',
      coverImage: post.coverImage || '',
      priceLabel: post.priceLabel || '',
      priceAmount: Number.isFinite(post.priceAmount) ? post.priceAmount : 0,
      currency: post.currency || 'USD',
      scheduledAt: post.scheduledAt || null,
      featured: Boolean(post.featuredSlot && post.featuredSlot !== 'none') || Boolean(post.featured),
      featuredSlot: post.featuredSlot || (post.featured ? 'primary' : 'none'),
      feedFeatured: Boolean(post.feedFeatured),
      bannerSlot: post.bannerSlot || 'none',
      allowIndexing: post.allowIndexing !== false,
      seoTitle: post.seoTitle || post.title,
      seoDescription: post.seoDescription || post.excerpt || '',
      socialImage: post.socialImage || post.coverImage || '',
      readingTime: post.readingTime || '',
      tags: post.tags || [],
      localized: post.localized && typeof post.localized === 'object' ? post.localized : {},
      localizedMeta:
        post.localizedMeta && typeof post.localizedMeta === 'object' ? post.localizedMeta : {},
    },
    cover_media_path: post.coverImage || '',
    status: post.status || 'draft',
    published_at: post.status === 'published' ? post.publishedAt || new Date().toISOString() : null,
  }

  const { data, error } = await client
    .from('blog_posts')
    .upsert(payload, { onConflict: 'slug' })
    .select('id, slug, title, excerpt, body, cover_media_path, status, published_at, updated_at')
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

export async function fetchProducts(content = defaultSiteContent, blogPosts = defaultBlogPosts) {
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

  const persistentProducts = mergeProducts(
    buildPersistentProducts(content),
    data?.map((row, index) => normalizeProductRow(row, index)) || [],
  )
  const derivedProducts = buildDerivedProducts(content, blogPosts)

  return [...persistentProducts, ...derivedProducts]
}

export async function upsertProducts(products = []) {
  const client = assertSupabase()
  const payload = products
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

  if (!payload.length) {
    return
  }

  const { data: existingRows, error: loadError } = await client
    .from('products')
    .select('slug')
    .in(
      'slug',
      payload.map((product) => product.slug),
    )

  if (loadError) {
    throw loadError
  }

  const existingSlugs = new Set((existingRows || []).map((row) => row.slug))

  const results = await Promise.all(
    payload.map((row) =>
      existingSlugs.has(row.slug)
        ? client.from('products').update(row).eq('slug', row.slug)
        : client.from('products').insert(row),
    ),
  )

  const failedResult = results.find((result) => result?.error)
  if (failedResult?.error) {
    throw failedResult.error
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
    .select('id, user_id, product_slug, entitlement_key, status, expires_at, created_at')
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
        createdAt: row.created_at,
        sourceOrderId: '',
        grantSource: 'checkout',
        grantedBy: '',
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
    currency: row.currency || 'USD',
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
    .select('id, display_name, email, role, audience, status, stripe_customer_id, created_at')
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
      .select('id, display_name, email, role, audience, status, stripe_customer_id, created_at')
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
      currency: order.currency || 'USD',
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
        sourceOrderId: '',
        grantSource: 'checkout',
        grantedBy: '',
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

export async function getAdminAuditEvents(authToken = '') {
  if (!authToken) {
    return []
  }

  const response = await fetch('/api/admin/audit-events', {
    headers: {
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo cargar la auditoria administrativa.')
  }

  return data.events || []
}

export async function translateAdminContent(payload, options = {}) {
  const client = assertSupabase()
  const {
    data: { session },
  } = await client.auth.getSession()

  const response = await fetch('/api/admin/translate', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({
      payload,
      sourceLocale: options.sourceLocale || 'es',
      targetLocale: options.targetLocale || 'en',
      mode: options.mode || 'full',
      scope: options.scope || '',
    }),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo traducir el contenido.')
  }

  return data
}

export async function updateProfile(userId, patch) {
  const client = assertSupabase()
  const { data, error } = await client
    .from('profiles')
    .update({
      display_name: patch.name,
      username: patch.username,
      role: patch.role,
      audience: patch.audience,
      status: patch.status,
    })
    .eq('id', userId)
    .select('id, display_name, username, email, role, status')
    .single()

  if (error) {
    throw error
  }

  return normalizeProfile(data)
}

export async function uploadMediaAsset(
  file,
  bucket,
  folder = 'home',
  onProgress,
  options = {},
) {
  const client = assertSupabase()
  const extension = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`
  const filePath = `${folder}/${fileName}`
  const kind = file.type.startsWith('video/')
    ? 'video'
    : file.type.startsWith('audio/')
      ? 'audio'
      : 'image'

  if (options.resumable) {
    await uploadFileResumable(client, file, bucket, filePath, onProgress)
  } else {
    await uploadFileWithProgress(client, file, bucket, filePath, onProgress)
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

export async function uploadMediaAssetFromUrl(
  sourceUrl,
  bucket,
  folder = 'home',
  onProgress,
  options = {},
) {
  const response = await fetch(sourceUrl)

  if (!response.ok) {
    throw new Error(`No se pudo descargar el asset local: ${sourceUrl}`)
  }

  const blob = await response.blob()
  const cleanName = sourceUrl.split('/').pop() || `asset-${Date.now()}.jpg`
  const inferredType = blob.type || 'image/jpeg'
  const file = new File([blob], cleanName, { type: inferredType })

  return uploadMediaAsset(file, bucket, folder, onProgress, options)
}
