import { createClient } from '@supabase/supabase-js'
import { defaultSiteContent, mergeSiteContent } from '../data/defaultSiteContent'
import { defaultBlogPosts, normalizeBlogPost } from '../data/defaultBlogPosts'

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

function normalizeSession(user, profile) {
  if (!user) {
    return null
  }

  return {
    id: user.id,
    name:
      profile?.display_name || user.user_metadata?.display_name || user.email || 'User',
    email: user.email || '',
    role: profile?.role || 'public',
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

  return normalizeSession(session.user, profile)
}

export async function signInWithPassword({ email, password }) {
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

  if (profile.role !== 'admin') {
    await client.auth.signOut()
    throw new Error('Este usuario no tiene permisos de administrador.')
  }

  return normalizeSession(data.user, profile)
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

      callback(normalizeSession(session.user, profile))
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

export async function getProfiles() {
  const client = assertSupabase()
  const { data, error } = await client
    .from('profiles')
    .select('id, display_name, email, role, status')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data.map(normalizeProfile)
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
