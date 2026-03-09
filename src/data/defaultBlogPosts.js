export const defaultBlogPosts = [
  {
    id: 'default-post-01',
    slug: 'sample-title-a',
    category: 'Behind the scenes',
    title: 'Sample Title A',
    excerpt: 'Entrada editorial de ejemplo para mostrar visualmente el futuro blog del proyecto.',
    coverImage: 'img/teaser3.jpg',
    status: 'published',
    accessLevel: 'free',
    publishedAt: '2026-03-01T12:00:00.000Z',
    contentHtml:
      '<p>Este es un post de ejemplo listo para ser reemplazado desde el panel admin con contenido enriquecido.</p><p>Puedes usar texto en <strong>negrita</strong>, <em>cursiva</em>, listas y enlaces.</p>',
    mediaItems: [],
  },
  {
    id: 'default-post-02',
    slug: 'creator-profile-01',
    category: 'Launch',
    title: 'Creator Profile 01',
    excerpt: 'Card lista para publicaciones destacadas, anuncios o resenas de nuevos drops.',
    coverImage: 'img/teaser6.jpg',
    status: 'published',
    accessLevel: 'subscription',
    publishedAt: '2026-03-02T15:00:00.000Z',
    contentHtml:
      '<p>Segundo ejemplo de post con acceso por suscripcion para probar el control de visibilidad y gating del blog.</p>',
    mediaItems: [],
  },
  {
    id: 'default-post-03',
    slug: 'premium-media-item',
    category: 'Guide',
    title: 'Premium Media Item',
    excerpt: 'Espacio para contenido indexable y secciones de descubrimiento desde la home.',
    coverImage: 'img/teaser8.jpg',
    status: 'published',
    accessLevel: 'free',
    publishedAt: '2026-03-03T18:30:00.000Z',
    contentHtml:
      '<p>Tercer ejemplo de post para completar la portada y la pagina de blog con contenido neutral y editable.</p>',
    mediaItems: [],
  },
]

function normalizeMediaItems(items = []) {
  return items.map((item, index) => ({
    id: item.id || `media-${index}`,
    type: item.type || 'link',
    url: item.url || '',
    title: item.title || '',
    caption: item.caption || '',
  }))
}

export function normalizeBlogPost(post = {}, fallbackIndex = 0) {
  return {
    id: post.id || `blog-post-${fallbackIndex}`,
    slug: post.slug || `blog-post-${fallbackIndex}`,
    category: post.category || 'General',
    title: post.title || 'Sample Title A',
    excerpt: post.excerpt || '',
    coverImage: post.coverImage || post.image || '',
    status: post.status || 'draft',
    accessLevel: post.accessLevel || 'free',
    publishedAt: post.publishedAt || null,
    contentHtml: post.contentHtml || '<p></p>',
    mediaItems: normalizeMediaItems(post.mediaItems || []),
  }
}

export function mergeBlogPosts(defaultPosts = [], savedPosts = []) {
  const defaultNormalized = defaultPosts.map((post, index) => normalizeBlogPost(post, index))
  const savedNormalized = savedPosts.map((post, index) =>
    normalizeBlogPost(post, defaultNormalized.length + index),
  )
  const savedBySlug = new Map(savedNormalized.map((post) => [post.slug, post]))
  const mergedDefaults = defaultNormalized.map((post) =>
    savedBySlug.has(post.slug) ? { ...post, ...savedBySlug.get(post.slug) } : post,
  )
  const defaultSlugs = new Set(defaultNormalized.map((post) => post.slug))
  const customPosts = savedNormalized.filter((post) => !defaultSlugs.has(post.slug))

  return [...mergedDefaults, ...customPosts]
}
