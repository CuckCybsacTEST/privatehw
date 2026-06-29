export const defaultBlogPosts = [
  {
    id: 'default-post-01',
    slug: 'sample-title-a',
    category: 'Behind the scenes',
    title: 'Sample Title A',
    excerpt: 'Entrada editorial de ejemplo para mostrar visualmente el futuro blog del proyecto.',
    coverImage: 'img/teaser3.jpg',
    status: 'published',
    accessLevel: 'public',
    publishedAt: '2026-03-01T12:00:00.000Z',
    scheduledAt: null,
    featured: true,
    feedFeatured: false,
    bannerSlot: 'launch',
    allowIndexing: true,
    seoTitle: 'Sample Title A',
    seoDescription: 'Entrada editorial de ejemplo para mostrar visualmente el futuro blog del proyecto.',
    socialImage: 'img/teaser3.jpg',
    readingTime: '4 min',
    tags: ['editorial', 'destacado'],
    contentHtml:
      '<p>Este es un post de ejemplo listo para ser reemplazado desde el panel admin con contenido enriquecido.</p><p>Puedes usar texto en <strong>negrita</strong>, <em>cursiva</em>, listas y enlaces.</p>',
    mediaItems: [],
    localized: {
      en: {
        title: 'Editorial Sample A',
        excerpt: 'Editorial sample entry to visually introduce the future blog of the project.',
        seoDescription: 'Editorial sample entry to visually introduce the future blog of the project.',
        contentHtml:
          '<p>This is a sample post ready to be replaced from the admin panel with rich content.</p><p>You can use <strong>bold</strong>, <em>italic</em>, lists, and links.</p>',
      },
    },
    localizedMeta: {},
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
    scheduledAt: null,
    featured: false,
    feedFeatured: true,
    bannerSlot: 'upgrade',
    allowIndexing: false,
    seoTitle: 'Creator Profile 01',
    seoDescription: 'Card lista para publicaciones destacadas, anuncios o resenas de nuevos drops.',
    socialImage: 'img/teaser6.jpg',
    readingTime: '6 min',
    tags: ['perfil', 'miembros'],
    contentHtml:
      '<p>Segundo ejemplo de post con acceso por suscripcion para probar el control de visibilidad y gating del blog.</p>',
    mediaItems: [],
    localized: {
      en: {
        title: 'Featured Creator Profile',
        excerpt: 'Card ready for featured posts, announcements, or reviews of new drops.',
        seoDescription: 'Card ready for featured posts, announcements, or reviews of new drops.',
        contentHtml:
          '<p>Second sample post with subscription access to test visibility control and blog gating.</p>',
      },
    },
    localizedMeta: {},
  },
  {
    id: 'default-post-03',
    slug: 'premium-media-item',
    category: 'Guide',
    title: 'Premium Media Item',
    excerpt: 'Espacio para contenido indexable y secciones de descubrimiento desde la home.',
    coverImage: 'img/teaser8.jpg',
    status: 'published',
    accessLevel: 'registered',
    publishedAt: '2026-03-03T18:30:00.000Z',
    scheduledAt: null,
    featured: false,
    feedFeatured: false,
    bannerSlot: 'community',
    allowIndexing: true,
    seoTitle: 'Premium Media Item',
    seoDescription: 'Espacio para contenido indexable y secciones de descubrimiento desde la home.',
    socialImage: 'img/teaser8.jpg',
    readingTime: '5 min',
    tags: ['comunidad', 'registro'],
    contentHtml:
      '<p>Tercer ejemplo de post para completar la portada y la pagina de blog con contenido neutral y editable.</p>',
    mediaItems: [],
    localized: {
      en: {
        excerpt: 'Space for indexable content and discovery sections from the home.',
        seoDescription: 'Space for indexable content and discovery sections from the home.',
        contentHtml:
          '<p>Third sample post to complete the cover and the blog page with neutral, editable content.</p>',
      },
    },
    localizedMeta: {},
  },
  {
    id: 'default-post-04',
    slug: 'member-post-example',
    category: 'Community',
    title: 'Member Post Example',
    excerpt: 'Publicacion adicional para poblar el indice editorial y validar mas combinaciones de layout.',
    coverImage: 'img/teaser2.jpg',
    status: 'published',
    accessLevel: 'public',
    publishedAt: '2026-03-04T14:00:00.000Z',
    scheduledAt: null,
    featured: false,
    feedFeatured: false,
    bannerSlot: 'none',
    allowIndexing: true,
    seoTitle: 'Member Post Example',
    seoDescription: 'Publicacion adicional para poblar el indice editorial y validar mas combinaciones de layout.',
    socialImage: 'img/teaser2.jpg',
    readingTime: '3 min',
    tags: ['comunidad', 'actualizacion'],
    contentHtml:
      '<p>Contenido placeholder adicional para probar el comportamiento del grid y los filtros del blog.</p>',
    mediaItems: [],
  },
  {
    id: 'default-post-05',
    slug: 'media-asset-123',
    category: 'Launch',
    title: 'Media Asset 123',
    excerpt: 'Entrada de prueba para visualizar mas cards y estados de acceso desde la portada del blog.',
    coverImage: 'img/teaser4.jpg',
    status: 'published',
    accessLevel: 'registered',
    publishedAt: '2026-03-05T10:30:00.000Z',
    scheduledAt: null,
    featured: false,
    feedFeatured: true,
    bannerSlot: 'community',
    allowIndexing: true,
    seoTitle: 'Media Asset 123',
    seoDescription: 'Entrada de prueba para visualizar mas cards y estados de acceso desde la portada del blog.',
    socialImage: 'img/teaser4.jpg',
    readingTime: '7 min',
    tags: ['registro', 'preview'],
    contentHtml:
      '<p>Placeholder neutral pensado para probar llamadas a la accion para usuarios registrados.</p>',
    mediaItems: [],
  },
  {
    id: 'default-post-06',
    slug: 'restricted-content-placeholder',
    category: 'Guide',
    title: 'Restricted Content Placeholder',
    excerpt: 'Card de prueba para representar contenido restringido dentro del flujo editorial del sitio.',
    coverImage: 'img/teaser5.jpg',
    status: 'published',
    accessLevel: 'subscription',
    publishedAt: '2026-03-06T16:45:00.000Z',
    scheduledAt: null,
    featured: false,
    feedFeatured: false,
    bannerSlot: 'upgrade',
    allowIndexing: false,
    seoTitle: 'Restricted Content Placeholder',
    seoDescription: 'Card de prueba para representar contenido restringido dentro del flujo editorial del sitio.',
    socialImage: 'img/teaser5.jpg',
    readingTime: '5 min',
    tags: ['premium', 'suscripcion'],
    contentHtml:
      '<p>Entrada placeholder para comprobar el gating premium y la convivencia de distintos accesos en el indice.</p>',
    mediaItems: [],
  },
  {
    id: 'default-post-07',
    slug: 'creator-update-01',
    category: 'Updates',
    title: 'Creator Update 01',
    excerpt: 'Articulo neutral de ejemplo para ensayar un volumen mayor de publicaciones visibles.',
    coverImage: 'img/teaser7.jpg',
    status: 'published',
    accessLevel: 'public',
    publishedAt: '2026-03-07T09:15:00.000Z',
    scheduledAt: null,
    featured: false,
    feedFeatured: false,
    bannerSlot: 'launch',
    allowIndexing: true,
    seoTitle: 'Creator Update 01',
    seoDescription: 'Articulo neutral de ejemplo para ensayar un volumen mayor de publicaciones visibles.',
    socialImage: 'img/teaser7.jpg',
    readingTime: '4 min',
    tags: ['update', 'editorial'],
    contentHtml:
      '<p>Publicacion neutral orientada a completar la portada y verificar el comportamiento de carga progresiva.</p>',
    mediaItems: [],
  },
  {
    id: 'default-post-08',
    slug: 'sample-title-b',
    category: 'Behind the scenes',
    title: 'Sample Title B',
    excerpt: 'Segunda entrada de muestra para validar repeticion de categorias y distintas densidades de contenido.',
    coverImage: 'img/teaser9.jpg',
    status: 'published',
    accessLevel: 'registered',
    publishedAt: '2026-03-08T11:20:00.000Z',
    scheduledAt: null,
    featured: false,
    feedFeatured: true,
    bannerSlot: 'none',
    allowIndexing: true,
    seoTitle: 'Sample Title B',
    seoDescription: 'Segunda entrada de muestra para validar repeticion de categorias y distintas densidades de contenido.',
    socialImage: 'img/teaser9.jpg',
    readingTime: '6 min',
    tags: ['editorial', 'registro'],
    contentHtml:
      '<p>Post adicional de ejemplo para asegurar que el listado pueda crecer sin romper la UI.</p>',
    mediaItems: [],
  },
  {
    id: 'default-post-09',
    slug: 'blog-entry-placeholder',
    category: 'Launch',
    title: 'Blog Entry Placeholder',
    excerpt: 'Ultima entrada de prueba para dejar suficiente volumen y revisar el boton de carga incremental.',
    coverImage: 'img/teaser11.jpg',
    status: 'published',
    accessLevel: 'public',
    publishedAt: '2026-03-09T13:10:00.000Z',
    scheduledAt: null,
    featured: false,
    feedFeatured: false,
    bannerSlot: 'community',
    allowIndexing: true,
    seoTitle: 'Blog Entry Placeholder',
    seoDescription: 'Ultima entrada de prueba para dejar suficiente volumen y revisar el boton de carga incremental.',
    socialImage: 'img/teaser11.jpg',
    readingTime: '8 min',
    tags: ['blog', 'placeholder'],
    contentHtml:
      '<p>Placeholder final para validar el crecimiento del feed editorial y la navegacion hacia mas publicaciones.</p>',
    mediaItems: [],
  },
  {
    id: 'default-post-10',
    slug: 'sample-title-c',
    category: 'Behind the scenes',
    title: 'Sample Title C',
    excerpt: 'Entrada adicional para seguir poblando el indice y probar una segunda tanda de articulos cargados.',
    coverImage: 'img/teaser12.jpg',
    status: 'published',
    accessLevel: 'public',
    publishedAt: '2026-03-10T08:45:00.000Z',
    scheduledAt: null,
    featured: false,
    feedFeatured: false,
    bannerSlot: 'none',
    allowIndexing: true,
    seoTitle: 'Sample Title C',
    seoDescription: 'Entrada adicional para seguir poblando el indice y probar una segunda tanda de articulos cargados.',
    socialImage: 'img/teaser12.jpg',
    readingTime: '4 min',
    tags: ['editorial', 'volumen'],
    contentHtml:
      '<p>Contenido placeholder adicional para validar el scroll del indice y la carga progresiva de articulos.</p>',
    mediaItems: [],
  },
  {
    id: 'default-post-11',
    slug: 'creator-update-02',
    category: 'Updates',
    title: 'Creator Update 02',
    excerpt: 'Bloque de prueba para ensayar mas volumen editorial con una categoria repetida y metadata visible.',
    coverImage: 'img/teaser1.jpg',
    status: 'published',
    accessLevel: 'registered',
    publishedAt: '2026-03-11T09:20:00.000Z',
    scheduledAt: null,
    featured: false,
    feedFeatured: false,
    bannerSlot: 'community',
    allowIndexing: true,
    seoTitle: 'Creator Update 02',
    seoDescription: 'Bloque de prueba para ensayar mas volumen editorial con una categoria repetida y metadata visible.',
    socialImage: 'img/teaser1.jpg',
    readingTime: '6 min',
    tags: ['actualizacion', 'registro'],
    contentHtml:
      '<p>Entrada neutral de prueba para representar mas contenido con acceso para usuarios registrados.</p>',
    mediaItems: [],
  },
  {
    id: 'default-post-12',
    slug: 'media-asset-124',
    category: 'Guide',
    title: 'Media Asset 124',
    excerpt: 'Card de prueba extra para comprobar la continuidad visual del grid al cargar mas articulos.',
    coverImage: 'img/teaser3.jpg',
    status: 'published',
    accessLevel: 'subscription',
    publishedAt: '2026-03-12T11:10:00.000Z',
    scheduledAt: null,
    featured: false,
    feedFeatured: true,
    bannerSlot: 'upgrade',
    allowIndexing: false,
    seoTitle: 'Media Asset 124',
    seoDescription: 'Card de prueba extra para comprobar la continuidad visual del grid al cargar mas articulos.',
    socialImage: 'img/teaser3.jpg',
    readingTime: '5 min',
    tags: ['premium', 'guia'],
    contentHtml:
      '<p>Post placeholder adicional para validar el comportamiento de accesos premium dentro del feed.</p>',
    mediaItems: [],
  },
  {
    id: 'default-post-13',
    slug: 'member-post-example-02',
    category: 'Community',
    title: 'Member Post Example 02',
    excerpt: 'Entrada adicional pensada para completar un segundo grupo de cards y mantener variedad editorial.',
    coverImage: 'img/teaser6.jpg',
    status: 'published',
    accessLevel: 'public',
    publishedAt: '2026-03-13T14:35:00.000Z',
    scheduledAt: null,
    featured: false,
    feedFeatured: true,
    bannerSlot: 'launch',
    allowIndexing: true,
    seoTitle: 'Member Post Example 02',
    seoDescription: 'Entrada adicional pensada para completar un segundo grupo de cards y mantener variedad editorial.',
    socialImage: 'img/teaser6.jpg',
    readingTime: '7 min',
    tags: ['comunidad', 'destacado'],
    contentHtml:
      '<p>Entrada marcada como destacada dentro del feed para comprobar una segunda insercion con zigzag.</p>',
    mediaItems: [],
  },
  {
    id: 'default-post-14',
    slug: 'sample-title-d',
    category: 'Launch',
    title: 'Sample Title D',
    excerpt: 'Publicacion de ejemplo para extender el inventario visible del blog con otra combinacion de categoria y acceso.',
    coverImage: 'img/teaser5.jpg',
    status: 'published',
    accessLevel: 'registered',
    publishedAt: '2026-03-14T16:05:00.000Z',
    scheduledAt: null,
    featured: false,
    feedFeatured: false,
    bannerSlot: 'none',
    allowIndexing: true,
    seoTitle: 'Sample Title D',
    seoDescription: 'Publicacion de ejemplo para extender el inventario visible del blog con otra combinacion de categoria y acceso.',
    socialImage: 'img/teaser5.jpg',
    readingTime: '4 min',
    tags: ['launch', 'registro'],
    contentHtml:
      '<p>Post neutral de prueba para sumar otra tarjeta al conjunto total del indice.</p>',
    mediaItems: [],
  },
  {
    id: 'default-post-15',
    slug: 'blog-entry-placeholder-02',
    category: 'Guide',
    title: 'Blog Entry Placeholder 02',
    excerpt: 'Ultima publicacion extra para asegurar que el boton de carga muestre varias tandas reales de articulos.',
    coverImage: 'img/teaser10.jpg',
    status: 'published',
    accessLevel: 'public',
    publishedAt: '2026-03-15T18:25:00.000Z',
    scheduledAt: null,
    featured: false,
    feedFeatured: false,
    bannerSlot: 'community',
    allowIndexing: true,
    seoTitle: 'Blog Entry Placeholder 02',
    seoDescription: 'Ultima publicacion extra para asegurar que el boton de carga muestre varias tandas reales de articulos.',
    socialImage: 'img/teaser10.jpg',
    readingTime: '8 min',
    tags: ['blog', 'placeholder'],
    contentHtml:
      '<p>Contenido placeholder final para dejar el feed del blog con suficiente profundidad de prueba.</p>',
    mediaItems: [],
  },
  {
    id: 'default-post-16',
    slug: 'sample-title-e',
    category: 'Behind the scenes',
    title: 'Sample Title E',
    excerpt: 'Entrada extra para la segunda tanda del listado y para validar continuidad visual del grid.',
    coverImage: 'img/teaser2.jpg',
    status: 'published',
    accessLevel: 'public',
    publishedAt: '2026-03-16T09:40:00.000Z',
    scheduledAt: null,
    featured: false,
    feedFeatured: false,
    bannerSlot: 'none',
    allowIndexing: true,
    seoTitle: 'Sample Title E',
    seoDescription: 'Entrada extra para la segunda tanda del listado y para validar continuidad visual del grid.',
    socialImage: 'img/teaser2.jpg',
    readingTime: '4 min',
    tags: ['editorial', 'grid'],
    contentHtml:
      '<p>Post placeholder adicional para continuar poblando el indice del blog con contenido neutral.</p>',
    mediaItems: [],
  },
  {
    id: 'default-post-17',
    slug: 'creator-update-03',
    category: 'Updates',
    title: 'Creator Update 03',
    excerpt: 'Articulo adicional pensado para una segunda carga de publicaciones con metadatos variados.',
    coverImage: 'img/teaser4.jpg',
    status: 'published',
    accessLevel: 'registered',
    publishedAt: '2026-03-17T11:25:00.000Z',
    scheduledAt: null,
    featured: false,
    feedFeatured: false,
    bannerSlot: 'community',
    allowIndexing: true,
    seoTitle: 'Creator Update 03',
    seoDescription: 'Articulo adicional pensado para una segunda carga de publicaciones con metadatos variados.',
    socialImage: 'img/teaser4.jpg',
    readingTime: '5 min',
    tags: ['registro', 'update'],
    contentHtml:
      '<p>Publicacion neutral para probar otra tanda del feed y reforzar la categoria de actualizaciones.</p>',
    mediaItems: [],
  },
  {
    id: 'default-post-18',
    slug: 'media-asset-125',
    category: 'Guide',
    title: 'Media Asset 125',
    excerpt: 'Card adicional para sostener el comportamiento del boton de carga y del sistema de accesos.',
    coverImage: 'img/teaser7.jpg',
    status: 'published',
    accessLevel: 'subscription',
    publishedAt: '2026-03-18T14:50:00.000Z',
    scheduledAt: null,
    featured: false,
    feedFeatured: false,
    bannerSlot: 'upgrade',
    allowIndexing: false,
    seoTitle: 'Media Asset 125',
    seoDescription: 'Card adicional para sostener el comportamiento del boton de carga y del sistema de accesos.',
    socialImage: 'img/teaser7.jpg',
    readingTime: '6 min',
    tags: ['premium', 'acceso'],
    contentHtml:
      '<p>Placeholder adicional para comprobar como convive contenido premium con el resto del feed.</p>',
    mediaItems: [],
  },
  {
    id: 'default-post-19',
    slug: 'member-post-example-03',
    category: 'Community',
    title: 'Member Post Example 03',
    excerpt: 'Nueva entrada normal para completar la tanda siguiente sin convertirla en destacado secundario.',
    coverImage: 'img/teaser9.jpg',
    status: 'published',
    accessLevel: 'public',
    publishedAt: '2026-03-19T16:30:00.000Z',
    scheduledAt: null,
    featured: false,
    feedFeatured: false,
    bannerSlot: 'none',
    allowIndexing: true,
    seoTitle: 'Member Post Example 03',
    seoDescription: 'Nueva entrada normal para completar la tanda siguiente sin convertirla en destacado secundario.',
    socialImage: 'img/teaser9.jpg',
    readingTime: '3 min',
    tags: ['comunidad', 'feed'],
    contentHtml:
      '<p>Contenido placeholder pensado para completar una segunda tanda de articulos normales.</p>',
    mediaItems: [],
  },
  {
    id: 'default-post-20',
    slug: 'blog-entry-placeholder-03',
    category: 'Launch',
    title: 'Blog Entry Placeholder 03',
    excerpt: 'Publicacion adicional de prueba para validar el volumen del blog y la persistencia del boton de carga.',
    coverImage: 'img/teaser11.jpg',
    status: 'published',
    accessLevel: 'registered',
    publishedAt: '2026-03-20T18:10:00.000Z',
    scheduledAt: null,
    featured: false,
    feedFeatured: false,
    bannerSlot: 'community',
    allowIndexing: true,
    seoTitle: 'Blog Entry Placeholder 03',
    seoDescription: 'Publicacion adicional de prueba para validar el volumen del blog y la persistencia del boton de carga.',
    socialImage: 'img/teaser11.jpg',
    readingTime: '7 min',
    tags: ['placeholder', 'registro'],
    contentHtml:
      '<p>Post neutral de ejemplo para seguir cargando articulos desde el feed sin romper la UI.</p>',
    mediaItems: [],
  },
  {
    id: 'default-post-21',
    slug: 'sample-title-f',
    category: 'Guide',
    title: 'Sample Title F',
    excerpt: 'Ultima entrada nueva para verificar otra tanda completa de articulos normales bajo el boton ver mas.',
    coverImage: 'img/teaser12.jpg',
    status: 'published',
    accessLevel: 'public',
    publishedAt: '2026-03-21T20:05:00.000Z',
    scheduledAt: null,
    featured: false,
    feedFeatured: false,
    bannerSlot: 'none',
    allowIndexing: true,
    seoTitle: 'Sample Title F',
    seoDescription: 'Ultima entrada nueva para verificar otra tanda completa de articulos normales bajo el boton ver mas.',
    socialImage: 'img/teaser12.jpg',
    readingTime: '5 min',
    tags: ['guia', 'volumen'],
    contentHtml:
      '<p>Placeholder final para asegurar una segunda capa visible de articulos cargados incrementalmente.</p>',
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

function parseBlogPriceAmount(priceLabel = '') {
  const cleaned = String(priceLabel).trim()
  const numericPart = cleaned.replace(/[^\d.,]/g, '')

  if (!numericPart) {
    return 0
  }

  const lastDot = numericPart.lastIndexOf('.')
  const lastComma = numericPart.lastIndexOf(',')
  const decimalSeparatorIndex = Math.max(lastDot, lastComma)

  if (decimalSeparatorIndex === -1) {
    const integerValue = Number.parseInt(numericPart.replace(/[^\d]/g, ''), 10)
    return Number.isFinite(integerValue) ? integerValue * 100 : 0
  }

  const integerPart = numericPart.slice(0, decimalSeparatorIndex).replace(/[^\d]/g, '')
  const fractionalPart = numericPart.slice(decimalSeparatorIndex + 1).replace(/[^\d]/g, '')
  const normalized = `${integerPart || '0'}.${fractionalPart || '0'}`
  const numeric = Number.parseFloat(normalized)

  return Number.isFinite(numeric) ? Math.round(numeric * 100) : 0
}

function getBlogPostTimestamp(post = {}) {
  const value = post.updatedAt || post.updated_at || post.publishedAt || post.published_at || 0
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

function isNewerBlogPost(candidate = {}, current = {}) {
  return getBlogPostTimestamp(candidate) >= getBlogPostTimestamp(current)
}

export function normalizeBlogPost(post = {}, fallbackIndex = 0) {
  const featuredSlot =
    post.featuredSlot === 'primary' || post.featuredSlot === 'secondary'
      ? post.featuredSlot
      : post.featured
        ? 'primary'
        : 'none'
  const accessLevel =
    post.accessLevel === 'subscription' ||
    post.accessLevel === 'registered' ||
    post.accessLevel === 'purchase'
      ? post.accessLevel
      : 'public'
  const priceLabel = typeof post.priceLabel === 'string' ? post.priceLabel.trim() : ''
  const priceAmount = Number.isFinite(post.priceAmount)
    ? post.priceAmount
    : parseBlogPriceAmount(priceLabel)
  const currency = post.currency || 'USD'
  const normalizedPriceLabel = priceLabel || ''
  const localized = post.localized && typeof post.localized === 'object' ? post.localized : {}
  const localizedMeta =
    post.localizedMeta && typeof post.localizedMeta === 'object' ? post.localizedMeta : {}

  return {
    id: post.id || `blog-post-${fallbackIndex}`,
    slug: post.slug || `blog-post-${fallbackIndex}`,
    category: post.category || 'General',
    title: post.title || 'Sample Title A',
    excerpt: post.excerpt || '',
    coverImage: post.coverImage || post.image || '',
    status: post.status || 'draft',
    accessLevel,
    priceLabel: normalizedPriceLabel,
    priceAmount: accessLevel === 'purchase' ? priceAmount : priceAmount || 0,
    currency,
    publishedAt: post.publishedAt || null,
    updatedAt: post.updatedAt || post.updated_at || null,
    scheduledAt: post.scheduledAt || null,
    featured: featuredSlot !== 'none',
    featuredSlot,
    feedFeatured: Boolean(post.feedFeatured),
    bannerSlot: post.bannerSlot || 'none',
    allowIndexing: post.allowIndexing !== false,
    seoTitle: post.seoTitle || post.title || 'Sample Title A',
    seoDescription: post.seoDescription || post.excerpt || '',
    socialImage: post.socialImage || post.coverImage || post.image || '',
    readingTime: post.readingTime || '',
    tags: Array.isArray(post.tags) ? post.tags.filter(Boolean) : [],
    contentHtml: post.contentHtml || '<p></p>',
    mediaItems: normalizeMediaItems(post.mediaItems || []),
    localized,
    localizedMeta,
  }
}

export function mergeBlogPosts(defaultPosts = [], savedPosts = []) {
  const defaultNormalized = defaultPosts.map((post, index) => normalizeBlogPost(post, index))
  const savedNormalized = savedPosts.map((post, index) =>
    normalizeBlogPost(post, defaultNormalized.length + index),
  )
  const savedBySlug = new Map()

  savedNormalized.forEach((post) => {
    const current = savedBySlug.get(post.slug)

    if (!current || isNewerBlogPost(post, current)) {
      savedBySlug.set(post.slug, post)
    }
  })

  const mergedDefaults = defaultNormalized.map((post) =>
    savedBySlug.has(post.slug) ? { ...post, ...savedBySlug.get(post.slug) } : post,
  )
  const defaultSlugs = new Set(defaultNormalized.map((post) => post.slug))
  const customPosts = Array.from(savedBySlug.values()).filter((post) => !defaultSlugs.has(post.slug))
  const mergedPosts = [...mergedDefaults, ...customPosts]
  const seenSlots = new Set()

  return mergedPosts
    .slice()
    .reverse()
    .map((post) => {
      if (post.featuredSlot !== 'primary' && post.featuredSlot !== 'secondary') {
        return post
      }

      if (seenSlots.has(post.featuredSlot)) {
        return {
          ...post,
          featured: false,
          featuredSlot: 'none',
        }
      }

      seenSlots.add(post.featuredSlot)
      return post
    })
    .reverse()
}
