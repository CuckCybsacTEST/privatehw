import {
  buildMediaPreviewUrl,
  buildMediaPublicUrl,
  buildVideoFullUrl,
  buildVideoPreviewUrl,
  extractGoogleDriveFileId,
  isInternalMediaUrl,
} from '../utils/videoMedia.js'
import { normalizeSubscriptionTiers } from './defaultCommerce.js'
import { mergeLocalizedValue } from '../utils/localizedContent.js'

const topCarouselImages = [
  'img/teaser9.jpg',
  'img/teaser11.jpg',
  'img/teaser1.jpg',
  'img/teaser3.jpg',
  'img/teaser6.jpg',
  'img/teaser8.jpg',
]

const bottomCarouselImages = [
  'img/teaser2.jpg',
  'img/teaser4.jpg',
  'img/teaser5.jpg',
  'img/teaser7.jpg',
  'img/teaser12.jpg',
  'img/teaser10.jpg',
]

function normalizeCarouselSlide(slide = '') {
  if (typeof slide === 'string') {
    const src = slide.trim()
    return src ? { src, caption: '' } : null
  }

  if (!slide || typeof slide !== 'object') {
    return null
  }

  const src = String(slide.src || slide.image || slide.url || slide.value || '').trim()
  const caption = String(slide.caption || slide.text || slide.label || slide.title || '').trim()

  return src ? { src, caption } : null
}

function normalizeCarouselSlides(slides = []) {
  return (Array.isArray(slides) ? slides : []).map(normalizeCarouselSlide).filter(Boolean)
}

function buildFutureDates(count = 3, startOffsetDays = 1) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() + startOffsetDays + index)
    return date.toISOString().slice(0, 10)
  })
}

export const defaultSiteContent = {
  topBarDesktop: 'SOLO PARA CABALLEROS HOSPEDADOS EN CERRO DE PASCO',
  topBarDesktopHighlight: 'SOLO PARA CABALLEROS HOSPEDADOS EN CERRO DE PASCO',
  topBarMobile: 'SOLO PARA CABALLEROS HOSPEDADOS EN CERRO DE PASCO',
  heroTitle: 'Sindy Mireya',
  heroDescription:
    'Perfil privado con acceso coordinado, validacion previa y atencion exclusiva para miembros autorizados.',
  heroSubtitle:
    'Experiencia privada, atencion discreta y contenido restringido',
  importantTitle: 'IMPORTANTE - LEE BIEN',
  importantItems: [
    'Miembros verificados: comparte tu usuario para validar acceso prioritario',
    'Clientes nuevos: se requiere verificacion inicial desde el primer mensaje',
    'No contesto mensajes vacios. Presentate, indica que servicio te interesa y ve directo al punto.',
    'Solo caballeros presentables, limpios y discretos',
    'Mayores de 28 anos, solventes y respetuosos',
  ],
  fanCardTitle: 'HAZTE FAN EN LOVERFANS',
  fanCardDescription:
    'Suscribete ahora y accede a contenido premium, material exclusivo y prioridad para miembros verificados.',
  fanButtonLabel: 'Toca aqui ahora',
  fanButtonUrl: 'https://loverfans.com/sindyhotwife',
  socialTitle: 'Mi Canal de Telegram',
  socialDescription:
    'Actualizaciones con fotos, videos y novedades. Acceso gratuito para seguimiento del perfil.',
  socialUrl: 'https://t.me/SindyHotwife',
  profileRelationshipStatus: 'Casada',
  presencialTitle: 'Encuentros Presenciales',
  presencialPrice: '150',
  presencialUnit: 'x hora',
  presencialDescription:
    'Coordinacion privada, tiempo reservado y experiencia presencial para miembros validados.',
  presencialFeatures: [
    'Atencion coordinada y discreta',
    'Tiempo reservado por cita',
    'Ajuste previo de preferencias',
  ],
  encuentrosPresencialFeatureOptions: [
    'Feature presencial 1',
    'Feature presencial 2',
    'Feature presencial 3',
    'Feature presencial 4',
  ],
  presencialBenefitTitle: 'Suscriptores Loverfans',
  presencialBenefitText: '20% OFF',
  recordTitle: 'REGISTRO PRIVADO DEL ENCUENTRO',
  recordDescription:
    'Algunas sesiones pueden incluir registro privado como parte del servicio. Nunca se muestra tu rostro. Discrecion total para miembros verificados.',
  extraTitle: 'Servicios Adicionales',
  extraFromLabel: 'desde',
  extraPrice: '1000',
  extraLead: 'Quieres ampliar la experiencia?',
  extraItems: [
    'Vestuario especial segun disponibilidad',
    'Ducha compartida como servicio adicional',
    'Atencion personalizada segun compatibilidad y coordinacion previa',
  ],
  encuentrosExtraOptions: ['Extra 1', 'Extra 2', 'Extra 3', 'Extra 4', 'Extra 5'],
  encuentrosBooking: {
    eyebrow: 'Reserva',
    title: 'Agenda tu cita',
    description:
      'Selecciona una fecha y una hora disponibles. El siguiente paso es revisar el adelanto manual de S/10.00 para coordinar la reserva.',
    galleryTitle: 'Sindy Mireya',
    gallerySubtitle: 'Casada, complaciente y seductora',
    galleryExclusiveTitle: 'Aviso de confidencialidad',
    galleryExclusiveDescription:
      'Por discrecion y privacidad, este material queda reservado para un acceso controlado y autorizado.',
    priceLabel: 'S/5.00',
    priceAmount: 500,
    advanceLabel: 'S/10.00',
    advanceAmount: 1000,
    recordingDiscountPercent: 20,
    recordingDiscountLabel: 'Descuento por grabacion',
    recordingPromptTitle: 'Quieres grabar el encuentro?',
    recordingPromptDescription: 'Elige si aplicamos el descuento configurado por grabacion.',
    recordingYesLabel: 'Si',
    recordingNoLabel: 'No',
    membershipDiscountEnabled: true,
    membershipDiscountNetwork: 'loverfans',
    membershipDiscountPercent: 20,
    membershipDiscountLabel: 'Suscriptores LoverFans',
    currency: 'PEN',
    durationMinutes: 30,
    availableDates: buildFutureDates(3, 1),
    bookingStartTime: '15:00',
    bookingEndTime: '18:00',
    slotIntervalMinutes: 60,
    timeSlots: ['15:00', '16:00', '17:00', '18:00'],
    availabilityMode: 'everyday',
    availableDays: 14,
    paymentMethods: [
      { value: 'plin', label: 'PLIN' },
      { value: 'yape', label: 'YAPE' },
    ],
    loginNote: 'Las reservas solo se habilitan para usuarios registrados.',
  },
  footerText: 'Perfil real. Acceso restringido y discrecion absoluta.',
  whatsappUrl: 'https://wa.me/51929719499?text=Hola%20quiero%20informacion',
  topCarouselImages,
  bottomCarouselImages,
  sectionVisibility: {
    creatorHero: true,
    accessTotal: true,
    mediaSpotlight: false,
    videoLibrary: true,
    videoCollections: true,
    physicalMerch: false,
    membership: true,
    blogTeaser: true,
    siteFooter: true,
    encuentrosHero: true,
    encuentrosTopCarousel: true,
    encuentrosBottomCarousel: true,
    encuentrosImportant: true,
    encuentrosPricing: true,
    encuentrosLoverfans: true,
    encuentrosSocial: true,
  },
  creatorHome: {
    kicker: 'Creator home',
    title: 'Sindy Mireya, creator studio y universo premium',
    description:
      'Portada principal para presentar a Sindy como creadora verificada, con media destacada, videos premium, blog y accesos escalables desde una experiencia editorial de alto impacto.',
    badges: ['Verified creator', 'Casada', 'Premium media', 'Updates semanales'],
    primaryCtaLabel: 'Acceder a membership',
    primaryCtaUrl: 'https://loverfans.com/sindyhotwife',
    secondaryCtaLabel: 'Explorar catalogo',
    stats: [
      { value: '12+', label: 'assets iniciales' },
      { value: '3', label: 'capas de monetizacion' },
      { value: '24/7', label: 'canales activos' },
      { value: 'Premium', label: 'catalogo activo' },
    ],
    profileTitle: 'Creadora y presencia editorial',
    profileDescription:
      'La home nueva presenta a la protagonista como figura central del proyecto, con storytelling visual, bloques editables y espacio para media premium.',
    profileHighlights: [
      'Perfil principal conectado con membership',
      'Seccion separada para encuentros en /encuentros',
      'Base lista para blog, previews y video completo',
    ],
  },
  accessTotal: {
    eyebrow: 'Acceso recomendado',
    title: 'Tiers premium',
    description:
      'Comparacion resumida para convertir rapido. El detalle completo aparece mas abajo, despues del contenido destacado.',
    price: '$79',
    discountPercent: '0',
    discountLabel: 'Oferta activa',
    period: 'por mes',
    tiers: [
      {
        slug: 'starter',
        label: 'Starter',
        period: '1 mes',
        durationValue: '1',
        durationUnit: 'months',
        price: '$29',
        discountPercent: '0',
        discountLabel: 'Oferta activa',
        promoNote: 'Desbloquea la coleccion premium de videos.',
        grants: ['video'],
      },
      {
        slug: 'plus',
        label: 'Plus',
        period: '1 mes',
        durationValue: '1',
        durationUnit: 'months',
        price: '$79',
        discountPercent: '0',
        discountLabel: 'Oferta activa',
        promoNote: 'Desbloquea videos premium y packs destacados.',
        grants: ['video', 'pack'],
      },
      {
        slug: 'pro',
        label: 'Pro',
        period: '1 mes',
        durationValue: '1',
        durationUnit: 'months',
        price: '$149',
        discountPercent: '0',
        discountLabel: 'Oferta activa',
        promoNote: 'Incluye videos, packs y blog privado.',
        grants: ['video', 'pack', 'blog'],
      },
      {
        slug: 'elite',
        label: 'Elite',
        period: '1 mes',
        durationValue: '1',
        durationUnit: 'months',
        price: '$259',
        discountPercent: '0',
        discountLabel: 'Oferta activa',
        promoNote: 'Acceso total con prioridad y beneficios extendidos.',
        grants: ['video', 'pack', 'blog', 'physical'],
      },
    ],
    ctaLabel: 'Suscribirme y desbloquear',
    ctaUrl: 'https://loverfans.com/sindyhotwife',
    rows: [
      { label: 'Videos premium', value: 'Incluidos' },
      { label: 'Packs destacados', value: 'Incluidos desde Plus' },
      { label: 'Blog privado', value: 'Acceso activo desde Pro' },
      { label: 'Actualizaciones', value: 'Semanales' },
      { label: 'Encuentros personales', value: 'Descuento 20%' },
    ],
  },
  mediaSpotlight: {
    title: 'Galeria editorial para destacar el universo de la marca',
    description:
      'Una composicion visual preparada para fotos clave, thumbnails de lanzamientos y bloques hero secundarios sin romper el tono visual actual.',
    featuredImage: 'img/teaser4.jpg',
    featuredLabel: 'Drop destacado',
    featuredTitle: 'Coleccion premium de portada',
    featuredDescription:
      'Bloque principal para colocar la pieza visual que empuja conversion y descubrimiento.',
    gallery: [
      {
        image: 'img/teaser1.jpg',
        title: 'Editorial set',
        description: 'Bloque reusable para fotos destacadas, colecciones y packs.',
      },
      {
        image: 'img/teaser7.jpg',
        title: 'Studio moments',
        description: 'Espacio pensado para previews ligeros y galerias dinamicas.',
      },
      {
        image: 'img/teaser9.jpg',
        title: 'Creator diary',
        description: 'Entrada visual para futuro blog, historias y anuncios.',
      },
      {
        image: 'img/teaser12.jpg',
        title: 'Premium access',
        description: 'Card lista para empujar upsells o categorias pagas.',
      },
    ],
  },
  videoLibrary: {
    title: 'Videos premium con preview corto y acceso completo',
    description:
      'La home queda lista para vender videos individuales, mostrar previews cortos y derivar a detalle, checkout o membresia.',
    browseLabel: 'Ver catalogo completo',
    browseHref: '/videos',
    items: [
      {
        slug: 'sindy-premium-01',
        title: 'Premium Video 01',
        description:
          'Producto editorial base con preview, precio, duracion y CTA de compra.',
        tag: 'Nuevo drop',
        duration: '08:30',
        priceLabel: '$49',
        accessLabel: 'Preview + acceso completo',
        previewLabel: 'Preview corto disponible',
        posterImage: 'https://ddluwydemxbsnhxgfebg.supabase.co/storage/v1/object/public/site-images/video-collections/1776638078334-0cybtz.jpg',
        previewVideoUrl: '',
        fullVideoUrl: '',
        purchaseUrl: 'https://loverfans.com/sindyhotwife',
      },
      {
        slug: 'sindy-premium-02',
        title: 'Premium Video 02',
        description:
          'Card preparada para video vertical, horizontal o clip exclusivo con poster.',
        tag: 'Top seller',
        duration: '11:12',
        priceLabel: '$69',
        accessLabel: 'Compra individual',
        previewLabel: 'Preview corto disponible',
        posterImage: 'https://ddluwydemxbsnhxgfebg.supabase.co/storage/v1/object/public/site-images/video-collections/1776638793568-s6wj61.jpg',
        previewVideoUrl: '',
        fullVideoUrl: '',
        purchaseUrl: 'https://loverfans.com/sindyhotwife',
      },
      {
        slug: 'sindy-premium-03',
        title: 'Premium Video 03',
        description:
          'Espacio listo para bundles, videos completos y previews optimizados.',
        tag: 'Edicion especial',
        duration: '06:44',
        priceLabel: '$39',
        accessLabel: 'Incluido en membresia premium',
        previewLabel: 'Preview corto disponible',
        posterImage: 'https://ddluwydemxbsnhxgfebg.supabase.co/storage/v1/object/public/site-images/video-collections/1776639088333-namxv0.jpg',
        previewVideoUrl: '',
        fullVideoUrl: '',
        purchaseUrl: 'https://loverfans.com/sindyhotwife',
      },
      {
        slug: 'sindy-premium-04',
        title: 'Premium Video 04',
        description:
          'Card adicional para ampliar el catalogo visible en desktop y sostener una experiencia mas completa desde la home.',
        tag: 'Nuevo set',
        duration: '09:18',
        priceLabel: '$59',
        accessLabel: 'Compra individual',
        previewLabel: 'Preview corto disponible',
        posterImage: 'https://ddluwydemxbsnhxgfebg.supabase.co/storage/v1/object/public/site-images/video-collections/1776639248831-uuicm9.jpg',
        previewVideoUrl: '',
        fullVideoUrl: '',
        purchaseUrl: 'https://loverfans.com/sindyhotwife',
      },
      {
        slug: 'sindy-premium-05',
        title: 'Premium Video 05',
        description:
          'Bloque listo para mantener variedad de formatos, temporadas y nuevos lanzamientos dentro del catalogo premium.',
        tag: 'Staff pick',
        duration: '07:52',
        priceLabel: '$54',
        accessLabel: 'Incluido en seleccion premium',
        previewLabel: 'Preview corto disponible',
        posterImage: 'https://ddluwydemxbsnhxgfebg.supabase.co/storage/v1/object/public/site-images/video-collections/1780527787082-v17fyq.jpg',
        previewVideoUrl: '',
        fullVideoUrl: '',
        purchaseUrl: 'https://loverfans.com/sindyhotwife',
      },
      {
        slug: 'sindy-premium-06',
        title: 'Premium Video 06',
        description:
          'Espacio editorial para una sexta pieza visible en home y acceso a la libreria completa desde una ruta dedicada.',
        tag: 'Especial',
        duration: '10:06',
        priceLabel: '$64',
        accessLabel: 'Acceso completo',
        previewLabel: 'Preview corto disponible',
        posterImage: 'https://ddluwydemxbsnhxgfebg.supabase.co/storage/v1/object/public/site-images/video-collections/1780527836578-ncp3u8.jpg',
        previewVideoUrl: '',
        fullVideoUrl: '',
        purchaseUrl: 'https://loverfans.com/sindyhotwife',
      },
      {
        slug: 'sindy-premium-07',
        title: 'Premium Video 07',
        description:
          'Placeholder adicional para pruebas de catalogo amplio, scroll y rotacion aleatoria en home.',
        tag: 'Drop 07',
        duration: '08:11',
        priceLabel: '$52',
        accessLabel: 'Compra individual',
        previewLabel: 'Preview corto disponible',
        posterImage: 'https://ddluwydemxbsnhxgfebg.supabase.co/storage/v1/object/public/site-images/video-collections/1780527874458-i1lbnf.jpg',
        previewVideoUrl: '',
        fullVideoUrl: '',
        purchaseUrl: 'https://loverfans.com/sindyhotwife',
      },
      {
        slug: 'sindy-premium-08',
        title: 'Premium Video 08',
        description:
          'Item de prueba para validar composicion de cards, pagina de catalogo y control total desde admin.',
        tag: 'Drop 08',
        duration: '07:36',
        priceLabel: '$57',
        accessLabel: 'Acceso premium',
        previewLabel: 'Preview corto disponible',
        posterImage: 'https://ddluwydemxbsnhxgfebg.supabase.co/storage/v1/object/public/site-images/video-collections/1780528100344-dtgq0z.jpg',
        previewVideoUrl: '',
        fullVideoUrl: '',
        purchaseUrl: 'https://loverfans.com/sindyhotwife',
      },
      {
        slug: 'sindy-premium-09',
        title: 'Premium Video 09',
        description:
          'Contenido placeholder para una libreria mas extensa y una experiencia de browse mas realista.',
        tag: 'Drop 09',
        duration: '09:42',
        priceLabel: '$61',
        accessLabel: 'Compra individual',
        previewLabel: 'Preview corto disponible',
        posterImage: 'https://ddluwydemxbsnhxgfebg.supabase.co/storage/v1/object/public/site-images/video-collections/1780528196825-fa4z4j.jpg',
        previewVideoUrl: '',
        fullVideoUrl: '',
        purchaseUrl: 'https://loverfans.com/sindyhotwife',
      },
      {
        slug: 'sindy-premium-10',
        title: 'Premium Video 10',
        description:
          'Tarjeta placeholder pensada para validar densidad del grid y consistencia visual en desktop.',
        tag: 'Drop 10',
        duration: '06:58',
        priceLabel: '$47',
        accessLabel: 'Seleccion premium',
        previewLabel: 'Preview corto disponible',
        posterImage: 'https://ddluwydemxbsnhxgfebg.supabase.co/storage/v1/object/public/site-images/video-collections/1780595102832-q7rlgr.jpg',
        previewVideoUrl: '',
        fullVideoUrl: '',
        purchaseUrl: 'https://loverfans.com/sindyhotwife',
      },
      {
        slug: 'sindy-premium-11',
        title: 'Premium Video 11',
        description:
          'Entrada de ejemplo para pruebas de volumen, paginacion futura y filtros por categoria.',
        tag: 'Drop 11',
        duration: '10:15',
        priceLabel: '$66',
        accessLabel: 'Acceso total',
        previewLabel: 'Preview corto disponible',
        posterImage: 'https://ddluwydemxbsnhxgfebg.supabase.co/storage/v1/object/public/site-images/video-collections/1780595108084-pi2wzq.jpg',
        previewVideoUrl: '',
        fullVideoUrl: '',
        purchaseUrl: 'https://loverfans.com/sindyhotwife',
      },
      {
        slug: 'sindy-premium-12',
        title: 'Premium Video 12',
        description:
          'Placeholder extra para consolidar un catalogo premium robusto dentro de la UI principal.',
        tag: 'Drop 12',
        duration: '08:47',
        priceLabel: '$58',
        accessLabel: 'Compra individual',
        previewLabel: 'Preview corto disponible',
        posterImage: 'https://ddluwydemxbsnhxgfebg.supabase.co/storage/v1/object/public/site-images/video-collections/1780595111056-k5ca5l.jpg',
        previewVideoUrl: '',
        fullVideoUrl: '',
        purchaseUrl: 'https://loverfans.com/sindyhotwife',
      },
      {
        slug: 'sindy-premium-13',
        title: 'Premium Video 13',
        description:
          'Card adicional para ensayar rendimiento visual con una libreria extensa y rotativa.',
        tag: 'Drop 13',
        duration: '11:04',
        priceLabel: '$68',
        accessLabel: 'Acceso premium',
        previewLabel: 'Preview corto disponible',
        posterImage: 'https://ddluwydemxbsnhxgfebg.supabase.co/storage/v1/object/public/site-images/video-collections/1780595114181-ciymol.jpg',
        previewVideoUrl: '',
        fullVideoUrl: '',
        purchaseUrl: 'https://loverfans.com/sindyhotwife',
      },
      {
        slug: 'sindy-premium-14',
        title: 'Premium Video 14',
        description:
          'Pieza placeholder creada para dar mayor profundidad al browse completo de /videos.',
        tag: 'Drop 14',
        duration: '07:21',
        priceLabel: '$53',
        accessLabel: 'Compra individual',
        previewLabel: 'Preview corto disponible',
        posterImage: 'https://ddluwydemxbsnhxgfebg.supabase.co/storage/v1/object/public/site-images/video-posters/1776468582264-y2irp6.jpg',
        previewVideoUrl: '',
        fullVideoUrl: '',
        purchaseUrl: 'https://loverfans.com/sindyhotwife',
      },
      {
        slug: 'sindy-premium-15',
        title: 'Premium Video 15',
        description:
          'Placeholder final del bloque extendido para validar catÃ¡logos largos desde home y detalle.',
        tag: 'Drop 15',
        duration: '09:03',
        priceLabel: '$63',
        accessLabel: 'Acceso completo',
        previewLabel: 'Preview corto disponible',
        posterImage: 'https://ddluwydemxbsnhxgfebg.supabase.co/storage/v1/object/public/site-images/encuentros-top/1782595133917-fkc82p.jpg',
        previewVideoUrl: '',
        fullVideoUrl: '',
        purchaseUrl: 'https://loverfans.com/sindyhotwife',
      },
    ],
  },
  videoCollections: {
    title: 'CatÃ¡logo Premium',
    description:
      'SelecciÃ³n curada de packs premium con acceso privado, precio claro y navegaciÃ³n directa.',
    browseLabel: 'Ver catÃ¡logo',
    browseHref: '/packs',
    previewLimit: 5,
    items: [
      {
        slug: 'pack-signature-series',
        category: 'Serie firma',
        title: 'Pack de video firma',
        description:
          'Pack base para agrupar videos premium bajo una misma narrativa de producto.',
        itemCount: '6 videos',
        priceLabel: '$149',
        accessLabel: 'Compra por pack',
        highlights: ['Full HD', 'Preview incluido', 'Acceso inmediato'],
        coverImage: 'img/teaser4.jpg',
        previewUrl: 'https://loverfans.com/sindyhotwife',
        purchaseUrl: 'https://loverfans.com/sindyhotwife',
      },
      {
        slug: 'pack-weekend-drop',
        category: 'Lanzamiento de fin de semana',
        title: 'Coleccion de fin de semana',
        description:
          'Tarjeta para lanzamientos recurrentes con precio especial y narrativa visual propia.',
        itemCount: '4 videos',
        priceLabel: '$99',
        accessLabel: 'Bundle temporal',
        highlights: ['Mini previews', 'Entrega inmediata', 'Upsell a membresia'],
        coverImage: 'img/teaser9.jpg',
        previewUrl: 'https://loverfans.com/sindyhotwife',
        purchaseUrl: 'https://loverfans.com/sindyhotwife',
      },
      {
        slug: 'pack-archive-edits',
        category: 'Ediciones de archivo',
        title: 'Pack de ediciones de archivo',
        description:
          'Seccion lista para vender colecciones archivadas, remasterizadas o por temporada.',
        itemCount: '8 videos',
        priceLabel: '$189',
        accessLabel: 'Pack completo',
        highlights: ['Categoria premium', 'Ideal para bundles', 'Cross-sell con blog'],
        coverImage: 'img/teaser12.jpg',
        previewUrl: 'https://loverfans.com/sindyhotwife',
        purchaseUrl: 'https://loverfans.com/sindyhotwife',
      },
      {
        slug: 'pack-launch-bundle',
        category: 'Bundle de lanzamiento',
        title: 'Pack bundle de lanzamiento',
        description:
          'Coleccion adicional para presentar lanzamientos de temporada, bundles de entrada y agrupaciones por tema.',
        itemCount: '5 videos',
        priceLabel: '$129',
        accessLabel: 'Bundle destacado',
        highlights: ['Acceso inmediato', 'Poster incluido', 'Categoria flexible'],
        coverImage: 'img/teaser3.jpg',
        previewUrl: 'https://loverfans.com/sindyhotwife',
        purchaseUrl: 'https://loverfans.com/sindyhotwife',
      },
      {
        slug: 'pack-curated-essentials',
        category: 'Esenciales curados',
        title: 'Pack de esenciales curados',
        description:
          'Pack para destacar una seleccion editorial con valor claro y una narrativa visual propia.',
        itemCount: '7 videos',
        priceLabel: '$159',
        accessLabel: 'Seleccion curada',
        highlights: ['Bundle premium', 'Ideal para upsell', 'Preview disponible'],
        coverImage: 'img/teaser5.jpg',
        previewUrl: 'https://loverfans.com/sindyhotwife',
        purchaseUrl: 'https://loverfans.com/sindyhotwife',
      },
      {
        slug: 'pack-membership-favorites',
        category: 'Favoritos de miembros',
        title: 'Pack de favoritos de miembros',
        description:
          'Seccion pensada para agrupar favoritos, destacados del mes y paquetes con rotacion recurrente.',
        itemCount: '9 videos',
        priceLabel: '$199',
        accessLabel: 'Pack extendido',
        highlights: ['Rotacion mensual', 'Cross-sell activo', 'Preview corto'],
        coverImage: 'img/teaser11.jpg',
        previewUrl: 'https://loverfans.com/sindyhotwife',
        purchaseUrl: 'https://loverfans.com/sindyhotwife',
      },
      {
        slug: 'pack-curator-drop-01',
        category: 'Lanzamiento curado',
        title: 'Lanzamiento curado 01',
        description:
          'Pack placeholder para ampliar el grid de categorias y validar navegacion completa en /packs.',
        itemCount: '5 videos',
        priceLabel: '$119',
        accessLabel: 'Pack tematico',
        highlights: ['Preview corto', 'Entrega inmediata', 'Bundle editable'],
        coverImage: 'img/teaser1.jpg',
        previewUrl: 'https://loverfans.com/sindyhotwife',
        purchaseUrl: 'https://loverfans.com/sindyhotwife',
      },
      {
        slug: 'pack-curator-drop-02',
        category: 'Lanzamiento curado',
        title: 'Lanzamiento curado 02',
        description:
          'Coleccion placeholder para probar listados largos y una mayor densidad visual de categorias.',
        itemCount: '6 videos',
        priceLabel: '$139',
        accessLabel: 'Seleccion premium',
        highlights: ['Acceso rapido', 'SET COMPLETO', 'Cross-sell activo'],
        coverImage: 'img/teaser2.jpg',
        previewUrl: 'https://loverfans.com/sindyhotwife',
        purchaseUrl: 'https://loverfans.com/sindyhotwife',
      },
      {
        slug: 'pack-curator-drop-03',
        category: 'Estacional',
        title: 'Pack estacional 03',
        description:
          'Placeholder adicional para escenarios de temporada, campaÃ±as y bundles rotativos.',
        itemCount: '4 videos',
        priceLabel: '$109',
        accessLabel: 'Pack especial',
        highlights: ['Bundle dinamico', 'Preview incluido', 'Alta visibilidad'],
        coverImage: 'img/teaser6.jpg',
        previewUrl: 'https://loverfans.com/sindyhotwife',
        purchaseUrl: 'https://loverfans.com/sindyhotwife',
      },
      {
        slug: 'pack-curator-drop-04',
        category: 'Esenciales',
        title: 'Pack de esenciales 04',
        description:
          'Pack de ejemplo para enriquecer el browse completo y el sorteo aleatorio de la home.',
        itemCount: '7 videos',
        priceLabel: '$149',
        accessLabel: 'Coleccion base',
        highlights: ['Acceso instantaneo', 'CTA directo', 'Categoria reusable'],
        coverImage: 'img/teaser7.jpg',
        previewUrl: 'https://loverfans.com/sindyhotwife',
        purchaseUrl: 'https://loverfans.com/sindyhotwife',
      },
      {
        slug: 'pack-curator-drop-05',
        category: 'Destacados',
        title: 'Pack de destacados 05',
        description:
          'Card placeholder para validar variedad de categorias y respuestas de layout en desktop.',
        itemCount: '8 videos',
        priceLabel: '$169',
        accessLabel: 'Pack destacado',
        highlights: ['Preview externo', 'Bundle premium', 'Ideal para portada'],
        coverImage: 'img/teaser8.jpg',
        previewUrl: 'https://loverfans.com/sindyhotwife',
        purchaseUrl: 'https://loverfans.com/sindyhotwife',
      },
      {
        slug: 'pack-curator-drop-06',
        category: 'Firma',
        title: 'Pack firma 06',
        description:
          'Placeholder pensado para sostener una librerÃ­a mÃ¡s grande de packs y rutas de descubrimiento.',
        itemCount: '5 videos',
        priceLabel: '$129',
        accessLabel: 'Acceso premium',
        highlights: ['Rotacion activa', 'Coleccion curada', 'Editable en admin'],
        coverImage: 'img/teaser10.jpg',
        previewUrl: 'https://loverfans.com/sindyhotwife',
        purchaseUrl: 'https://loverfans.com/sindyhotwife',
      },
      {
        slug: 'pack-curator-drop-07',
        category: 'Archivo',
        title: 'Pack de archivo 07',
        description:
          'Pack mock para incrementar el inventario visible y reforzar la pÃ¡gina completa de categorÃ­as.',
        itemCount: '9 videos',
        priceLabel: '$179',
        accessLabel: 'Bundle extendido',
        highlights: ['Pack largo', 'Acceso inmediato', 'Escalable'],
        coverImage: 'img/teaser12.jpg',
        previewUrl: 'https://loverfans.com/sindyhotwife',
        purchaseUrl: 'https://loverfans.com/sindyhotwife',
      },
      {
        slug: 'pack-curator-drop-08',
        category: 'Lanzamiento semanal',
        title: 'Pack lanzamiento semanal 08',
        description:
          'Coleccion placeholder orientada a validar futuras estrategias de actualizaciÃ³n frecuente.',
        itemCount: '6 videos',
        priceLabel: '$136',
        accessLabel: 'Drop semanal',
        highlights: ['Preview corto', 'Pack flexible', 'Ideal para campaÃ±as'],
        coverImage: 'img/teaser4.jpg',
        previewUrl: 'https://loverfans.com/sindyhotwife',
        purchaseUrl: 'https://loverfans.com/sindyhotwife',
      },
      {
        slug: 'pack-curator-drop-09',
        category: 'Biblioteca ampliada',
        title: 'Pack de biblioteca ampliada 09',
        description:
          'Placeholder final para dejar una base amplia de packs y categorÃ­as lista para pruebas reales.',
        itemCount: '10 videos',
        priceLabel: '$209',
        accessLabel: 'Biblioteca extendida',
        highlights: ['Gran volumen', 'Bundle completo', 'Rotacion aleatoria'],
        coverImage: 'img/teaser9.jpg',
        previewUrl: 'https://loverfans.com/sindyhotwife',
        purchaseUrl: 'https://loverfans.com/sindyhotwife',
      },
    ],
  },
  physicalMerch: {
    kicker: 'Coleccion fisica',
    title: 'Productos privados y piezas especiales',
    description:
      'Bloque comercial para listar productos fisicos, disponibilidad, precio y acceso a compra directa desde una experiencia premium.',
    primaryLabel: 'Explorar productos',
    primaryUrl: 'https://loverfans.com/sindyhotwife',
    note: 'Disponibilidad limitada y stock variable segun inventario.',
    items: [
      {
        slug: 'private-item-01',
        title: 'Private Item 01',
        subtitle: 'Edicion reservada',
        priceLabel: '$149',
        stockLabel: '2 unidades',
        image: 'img/teaser2.jpg',
        purchaseUrl: 'https://loverfans.com/sindyhotwife',
      },
      {
        slug: 'private-item-02',
        title: 'Private Item 02',
        subtitle: 'Entrega coordinada',
        priceLabel: '$179',
        stockLabel: '1 unidad',
        image: 'img/teaser6.jpg',
        purchaseUrl: 'https://loverfans.com/sindyhotwife',
      },
      {
        slug: 'private-item-03',
        title: 'Private Item 03',
        subtitle: 'Drop exclusivo',
        priceLabel: '$199',
        stockLabel: '3 unidades',
        image: 'img/teaser8.jpg',
        purchaseUrl: 'https://loverfans.com/sindyhotwife',
      },
    ],
  },
  freeContent: {
    kicker: 'Contenido Gratis',
    title: 'Galeria gratuita para usuarios registrados',
    description:
      'Espacio exclusivo para usuarios con cuenta activa, pensado para discovery, pruebas de formato y una entrada ligera al ecosistema del sitio.',
    accessNote: 'Tu cuenta ya puede acceder a esta galeria sin suscripcion activa.',
    items: [
      {
        slug: 'free-media-01',
        title: 'Media Asset 101',
        description: 'Foto placeholder para poblar la galeria gratuita y validar el grid.',
        category: 'Foto',
        mediaType: 'image',
        image: 'img/teaser1.jpg',
        thumbnail: 'img/teaser1.jpg',
        mediaUrl: '',
        isPublished: true,
      },
      {
        slug: 'free-media-02',
        title: 'Media Asset 102',
        description: 'Video placeholder preparado para futuras subidas o enlaces remotos.',
        category: 'Video',
        mediaType: 'video',
        image: 'img/teaser4.jpg',
        thumbnail: 'img/teaser4.jpg',
        mediaUrl: '',
        isPublished: true,
      },
      {
        slug: 'free-media-03',
        title: 'Media Asset 103',
        description: 'Item adicional para enriquecer el browse y la experiencia de usuario registrada.',
        category: 'Foto',
        mediaType: 'image',
        image: 'img/teaser7.jpg',
        thumbnail: 'img/teaser7.jpg',
        mediaUrl: '',
        isPublished: true,
      },
      {
        slug: 'free-media-04',
        title: 'Media Asset 104',
        description: 'Bloque neutral listo para thumbnails de video o clips cortos gratuitos.',
        category: 'Video',
        mediaType: 'video',
        image: 'img/teaser9.jpg',
        thumbnail: 'img/teaser9.jpg',
        mediaUrl: '',
        isPublished: true,
      },
      {
        slug: 'free-media-05',
        title: 'Media Asset 105',
        description: 'Imagen adicional de ejemplo para una galeria gratuita mas amplia.',
        category: 'Foto',
        mediaType: 'image',
        image: 'img/teaser11.jpg',
        thumbnail: 'img/teaser11.jpg',
        mediaUrl: '',
        isPublished: true,
      },
      {
        slug: 'free-media-06',
        title: 'Media Asset 106',
        description: 'Placeholder final para contenido gratis gestionado desde admin.',
        category: 'Video',
        mediaType: 'video',
        image: 'img/teaser12.jpg',
        thumbnail: 'img/teaser12.jpg',
        mediaUrl: '',
        isPublished: true,
      },
    ],
  },
  membership: {
    title: 'Accesos, beneficios y caminos de compra',
    description:
      'La home centraliza membresia, video premium, futuros bundles y CTA directos hacia los canales mas rentables.',
    planLabel: 'Membership',
    planTitle: 'Planes de acceso total',
    planDescription:
      'Bloque principal para resumir beneficios, frecuencia de actualizacion y prioridad para miembros.',
    planItems: [
      'Acceso al catÃ¡logo',
      'Actualizaciones semanales',
      'Vista previa incluida',
    ],
    planUrl: 'https://loverfans.com/sindyhotwife',
    planCta: 'Ver membership',
    sideCards: [
      {
        label: 'Blog',
        title: 'Bitacora editorial',
        description:
          'Resumen de publicaciones, anuncios, lanzamientos y contenido evergreen.',
      },
      {
        label: 'Media',
        title: 'Packs y colecciones',
        description:
          'Espacio para agrupar fotos, videos y productos por categorÃ­as o campaÃ±as.',
      },
    ],
  },
  blogSection: {
    title: 'Blog integrado en la portada principal',
    description:
      'Zona teaser para llevar trafico a entradas, anuncios y piezas evergreen sin romper la navegacion principal.',
    posts: [
      {
        slug: 'creator-post-01',
        category: 'Behind the scenes',
        title: 'Sample Title A',
        excerpt:
          'Entrada editorial de ejemplo para mostrar visualmente el futuro blog del proyecto.',
        image: 'img/teaser3.jpg',
        href: '/blog/sample-title-a',
      },
      {
        slug: 'creator-post-02',
        category: 'Launch',
        title: 'Creator Profile 01',
        excerpt:
          'Card lista para publicaciones destacadas, anuncios o resenes de nuevos drops.',
        image: 'img/teaser6.jpg',
        href: '/blog/creator-profile-01',
      },
      {
        slug: 'creator-post-03',
        category: 'Guide',
        title: 'Premium Media Item',
        excerpt:
          'Espacio para contenido indexable y secciones de descubrimiento desde la home.',
        image: 'img/teaser8.jpg',
        href: '/blog/premium-media-item',
      },
    ],
  },
  blogPage: {
    heroKicker: 'Editorial',
    heroTitle: 'Blog operativo, comercial y preparado para convertir',
    heroDescription:
      'Indice editorial con categorias, espacios promocionales, lecturas por nivel de acceso y una estructura lista para operar desde admin.',
    featuredLabel: 'Entrada destacada',
    categoriesLabel: 'Categorias activas',
    totalPostsLabel: 'articulos visibles',
    bannerPrimary: {
      slot: 'launch',
      kicker: 'Banner principal',
      title: 'Espacio promocional reusable',
        description:
          'Modulo configurable para anunciar nuevos drops, accesos, campaÃ±as o contenido relevante dentro del blog.',
      ctaLabel: 'Ver membresia',
      ctaUrl: '/#membership',
    },
    bannerSecondary: {
      slot: 'community',
      kicker: 'Comunidad',
      title: 'Contenido gratuito para cuentas registradas',
      description:
        'Bloque de captacion para llevar trafico al area gratuita, registro de usuarios o capas de descubrimiento.',
      ctaLabel: 'Explorar contenido gratis',
      ctaUrl: '/free-content',
    },
    sidebarCardA: {
      kicker: 'Curaduria',
      title: 'Ruta editorial',
      description:
        'Destaca categorias, entradas premium y publicaciones abiertas desde una sola vista de negocio.',
    },
    sidebarCardB: {
      kicker: 'Acceso',
      title: 'Control de lectura',
      description:
        'Cada post puede ser publico, solo para registrados o exclusivo para suscriptores.',
    },
    ctaRegistered: {
      title: 'Registrate para seguir leyendo',
      description:
        'Crea una cuenta para desbloquear publicaciones reservadas para usuarios registrados.',
      ctaLabel: 'Crear cuenta o ingresar',
      ctaUrl: '/access?redirect=/blog',
    },
    ctaSubscription: {
      title: 'Desbloquea los articulos premium',
      description:
        'Activa el acceso total para leer publicaciones premium y mantener acceso al resto del contenido digital.',
      ctaLabel: 'Ver acceso total',
      ctaUrl: '/#membership',
    },
    taxonomy: {
      categories: [
        'Behind the scenes',
        'Launch',
        'Guide',
        'Community',
        'Updates',
      ],
      tags: [
        'editorial',
        'destacado',
        'perfil',
        'miembros',
        'comunidad',
        'registro',
        'premium',
        'suscripcion',
        'update',
        'lanzamiento',
        'blog',
        'placeholder',
        'guia',
        'acceso',
      ],
    },
  },
  siteFooter: {
    title: 'Una home pensada para crecer con contenido, video y editorial',
    description:
      'La nueva portada ya queda preparada para evolucionar hacia una experiencia completa de creator platform con Supabase, blog, media premium y administracion centralizada.',
  },
  localized: {
    en: {
      creatorHome: {
        kicker: 'Creator home',
        title: 'Sindy Mireya, creator studio and premium universe',
        description:
          'Main cover to present Sindy as a verified creator, with highlighted media, premium videos, blog, and scalable access inside a high-impact editorial experience.',
        badges: ['Verified creator', 'Married', 'Premium media', 'Weekly updates'],
        primaryCtaLabel: 'Access membership',
        secondaryCtaLabel: 'Explore catalog',
        stats: [
          { value: '12+', label: 'initial assets' },
          { value: '3', label: 'monetization layers' },
          { value: '24/7', label: 'active channels' },
        ],
        profileTitle: 'Creator and editorial presence',
        profileDescription:
          'The new home presents the protagonist as the central figure of the project, with visual storytelling, editable blocks, and room for premium media.',
        profileHighlights: [
          'Main profile connected to membership',
          'Dedicated encounters section at /encuentros',
          'Ready base for blog, previews, and full video',
        ],
      },
      accessTotal: {
        eyebrow: 'Total access',
        title: 'Premium subscription tiers',
        discountLabel: 'Active offer',
        period: 'per month',
        tiers: [
          {
            slug: 'starter',
            label: 'Starter',
            period: '1 month',
            promoNote: 'Unlock the premium video catalog.',
            grants: ['video'],
          },
          {
            slug: 'plus',
            label: 'Plus',
            period: '1 month',
            promoNote: 'Unlock premium videos and featured packs.',
            grants: ['video', 'pack'],
          },
          {
            slug: 'pro',
            label: 'Pro',
            period: '1 month',
            promoNote: 'Includes videos, packs and the private blog.',
            grants: ['video', 'pack', 'blog'],
          },
          {
            slug: 'elite',
            label: 'Elite',
            period: '1 month',
            promoNote: 'Full access with extended benefits.',
            grants: ['video', 'pack', 'blog', 'physical'],
          },
        ],
        ctaLabel: 'Subscribe and unlock',
        rows: [
          { label: 'Premium videos', value: 'Included' },
          { label: 'Featured packs', value: 'Included from Plus' },
          { label: 'Private blog', value: 'Active access from Pro' },
          { label: 'Updates', value: 'Weekly' },
        ],
      },
      mediaSpotlight: {
        title: 'Editorial gallery to highlight the brand universe',
        description:
          'A visual composition prepared for key photos, launch thumbnails, and secondary hero blocks without breaking the current tone.',
        featuredLabel: 'Featured drop',
        featuredTitle: 'Premium cover collection',
        featuredDescription:
          'Main block to place the visual piece that drives conversion and discovery.',
        gallery: [
          {
            title: 'Editorial set',
            description: 'Reusable block for featured photos, collections, and packs.',
          },
          {
            title: 'Studio moments',
            description: 'Space designed for lightweight previews and dynamic galleries.',
          },
          {
            title: 'Creator diary',
            description: 'Visual entry for future blog posts, stories, and announcements.',
          },
          {
            title: 'Premium access',
            description: 'Card ready to push upsells or paid categories.',
          },
        ],
      },
      videoLibrary: {
        title: 'Premium videos with short preview and full access',
        description:
          'The home is ready to sell individual videos, show short previews, and route to detail, checkout, or membership.',
        browseLabel: 'View full catalog',
        items: [
          {
            title: 'Premium Video 01',
            description:
              'Base editorial product with preview, price, duration, and purchase CTA.',
            accessLabel: 'Preview + full access',
            previewLabel: 'Short preview available',
          },
          {
            title: 'Premium Video 02',
            description:
              'Card prepared for vertical video, horizontal format, or exclusive clip with poster.',
            accessLabel: 'Individual purchase',
            previewLabel: 'Short preview available',
          },
          {
            title: 'Premium Video 03',
            description:
              'Space ready for bundles, full videos, and optimized previews.',
            accessLabel: 'Included in premium membership',
            previewLabel: 'Short preview available',
          },
          {
            title: 'Premium Video 04',
            description:
              'Additional card to expand the visible catalog on desktop and support a fuller home experience.',
            accessLabel: 'Individual purchase',
            previewLabel: 'Short preview available',
          },
          {
            title: 'Premium Video 05',
            description:
              'Block ready to keep variety in formats, seasons, and new releases within the premium catalog.',
            accessLabel: 'Included in premium selection',
            previewLabel: 'Short preview available',
          },
          {
            title: 'Premium Video 06',
            description:
              'Editorial space for a sixth visible piece on the home and access to the full library from a dedicated route.',
            accessLabel: 'Full access',
            previewLabel: 'Short preview available',
          },
          {
            title: 'Premium Video 07',
            description:
              'Additional placeholder for wide catalog tests, scroll behavior, and random rotation on the home.',
            accessLabel: 'Individual purchase',
            previewLabel: 'Short preview available',
          },
          {
            title: 'Premium Video 08',
            description:
              'Test item to validate card composition, catalog page, and full control from admin.',
            accessLabel: 'Premium access',
            previewLabel: 'Short preview available',
          },
          {
            title: 'Premium Video 09',
            description:
              'Placeholder content for a larger library and a more realistic browsing experience.',
            accessLabel: 'Individual purchase',
            previewLabel: 'Short preview available',
          },
          {
            title: 'Premium Video 10',
            description:
              'Placeholder card meant to validate grid density and visual consistency on desktop.',
            accessLabel: 'Premium selection',
            previewLabel: 'Short preview available',
          },
          {
            title: 'Premium Video 11',
            description:
              'Example entry for volume testing, future pagination, and category filters.',
            accessLabel: 'Full access',
            previewLabel: 'Short preview available',
          },
          {
            title: 'Premium Video 12',
            description:
              'Extra placeholder to reinforce a robust premium catalog inside the main UI.',
            accessLabel: 'Individual purchase',
            previewLabel: 'Short preview available',
          },
          {
            title: 'Premium Video 13',
            description:
              'Additional card to test visual performance with a larger rotating library.',
            accessLabel: 'Premium access',
            previewLabel: 'Short preview available',
          },
          {
            title: 'Premium Video 14',
            description:
              'Placeholder piece created to add more depth to the full /videos browsing experience.',
            accessLabel: 'Individual purchase',
            previewLabel: 'Short preview available',
          },
          {
            title: 'Premium Video 15',
            description:
              'Final placeholder of the extended block to validate long catalogs from home and detail.',
            accessLabel: 'Full access',
            previewLabel: 'Short preview available',
          },
        ],
      },
      videoCollections: {
        title: 'Premium Catalog',
        description:
          'Curated selection of premium packs with private access, clear pricing, and direct navigation.',
        browseLabel: 'View catalog',
        items: [
          {
            title: 'Signature Video Pack',
            category: 'Signature series',
            description:
              'Base pack to group premium videos under a single product narrative.',
            accessLabel: 'Pack purchase',
            highlights: ['Full HD', 'Preview included', 'Instant access'],
          },
          {
            title: 'Weekend Drop Collection',
            category: 'Weekend launch',
            description:
              'Card for recurring category drops with special pricing and its own visual narrative.',
            accessLabel: 'Temporary bundle',
            highlights: ['Mini previews', 'Immediate delivery', 'Membership upsell'],
          },
          {
            title: 'Archive Edit Pack',
            category: 'Archive editions',
            description:
              'Section ready to sell archived, remastered, or seasonal collections.',
            accessLabel: 'Full pack',
            highlights: ['Premium category', 'Ideal for bundles', 'Cross-sell with blog'],
          },
          {
            title: 'Seasonal Collection',
            category: 'Seasonal launch',
            description:
              'Additional collection to present seasonal drops, entry bundles, and theme-based groups.',
            accessLabel: 'Featured bundle',
            highlights: ['Instant access', 'Poster included', 'Flexible category'],
          },
          {
            title: 'Curated Selection Pack',
            category: 'Curated series',
            description:
              'Pack to highlight an editorial selection with clear value and its own visual story.',
            accessLabel: 'Curated selection',
            highlights: ['Premium bundle', 'Ideal for upsell', 'Preview available'],
          },
          {
            title: 'Monthly Highlights Pack',
            category: 'Monthly picks',
            description:
              'Section designed to group favorites, monthly highlights, and recurring bundles.',
            accessLabel: 'Extended pack',
            highlights: ['Monthly rotation', 'Active cross-sell', 'Short preview'],
          },
          {
            title: 'Themed Pack',
            category: 'Themed drop',
            description:
              'Placeholder pack to expand the category grid and validate full navigation in /packs.',
            accessLabel: 'Themed pack',
            highlights: ['Short preview', 'Immediate delivery', 'Editable bundle'],
          },
          {
            title: 'Premium Selection Pack',
            category: 'Premium category',
            description:
              'Collection placeholder to test longer lists and a higher visual density of categories.',
            accessLabel: 'Premium selection',
            highlights: ['Fast access', 'Curated pack', 'Active cross-sell'],
          },
          {
            title: 'Special Pack',
            category: 'Special campaign',
            description:
              'Additional placeholder for seasonal scenarios, campaigns, and rotating bundles.',
            accessLabel: 'Special pack',
            highlights: ['Dynamic bundle', 'Preview included', 'High visibility'],
          },
          {
            title: 'Base Collection',
            category: 'Base catalog',
            description:
              'Example pack to enrich the full browse and the random rotation of the home.',
            accessLabel: 'Base collection',
            highlights: ['Instant access', 'Direct CTA', 'Reusable category'],
          },
          {
            title: 'Featured Pack',
            category: 'Featured bundle',
            description:
              'Placeholder card to validate category variety and desktop layout responses.',
            accessLabel: 'Featured pack',
            highlights: ['External preview', 'Premium bundle', 'Ideal for home'],
          },
          {
            title: 'Premium Access Pack',
            category: 'Premium access',
            description:
              'Placeholder pack intended to keep a larger library of packs and discovery routes.',
            accessLabel: 'Premium access',
            highlights: ['Active rotation', 'Curated collection', 'Editable in admin'],
          },
          {
            title: 'Extended Bundle',
            category: 'Extended library',
            description:
              'Mock pack to increase the visible inventory and reinforce the full categories page.',
            accessLabel: 'Extended bundle',
            highlights: ['Long pack', 'Instant access', 'Scalable'],
          },
          {
            title: 'Weekly Drop',
            category: 'Weekly drop',
            description:
              'Placeholder collection aimed at validating future frequent-update strategies.',
            accessLabel: 'Weekly drop',
            highlights: ['Short preview', 'Flexible pack', 'Ideal for campaigns'],
          },
          {
            title: 'Extended Library',
            category: 'Large library',
            description:
              'Final placeholder to leave a broad base of packs and categories ready for real tests.',
            accessLabel: 'Extended library',
            highlights: ['Large volume', 'Full bundle', 'Random rotation'],
          },
        ],
      },
      physicalMerch: {
        kicker: 'Physical collection',
        title: 'Private products and special pieces',
        description:
          'Commercial block to list physical products, availability, price, and direct purchase access from a premium experience.',
        primaryLabel: 'Browse products',
        note: 'Limited availability and variable stock depending on inventory.',
        items: [
          { subtitle: 'Reserved edition', stockLabel: '2 units' },
          { subtitle: 'Coordinated delivery', stockLabel: '1 unit' },
          { subtitle: 'Exclusive drop', stockLabel: '3 units' },
        ],
      },
      freeContent: {
        kicker: 'Free content',
        title: 'Free gallery for registered users',
        description:
          'Exclusive space for users with an active account, designed for discovery, format tests, and a light entry into the site ecosystem.',
        accessNote: 'Your account can already access this gallery without an active subscription.',
        items: [
          {
            title: 'Media Asset 101',
            description: 'Placeholder image to populate the free gallery and validate the grid.',
            category: 'Photo',
          },
          {
            title: 'Media Asset 102',
            description: 'Placeholder video prepared for future uploads or remote links.',
            category: 'Video',
          },
          {
            title: 'Media Asset 103',
            description: 'Additional item to enrich browsing and the registered user experience.',
            category: 'Photo',
          },
          {
            title: 'Media Asset 104',
            description: 'Neutral block ready for video thumbnails or short free clips.',
            category: 'Video',
          },
          {
            title: 'Media Asset 105',
            description: 'Additional sample image for a wider free gallery.',
            category: 'Photo',
          },
          {
            title: 'Media Asset 106',
            description: 'Final placeholder for free content managed from admin.',
            category: 'Video',
          },
        ],
      },
      membership: {
        title: 'Access, benefits, and purchase paths',
        description:
          'The home centralizes membership, premium video, future bundles, and direct CTAs toward the most profitable channels.',
        planLabel: 'Membership',
        planTitle: 'Total access plans',
        planDescription:
          'Main block to summarize benefits, update frequency, and priority for members.',
        planItems: [
          'Access to premium drops',
          'Priority on catalog updates',
          'Ready for perks, bundles, and discounts',
        ],
        sideCards: [
          {
            label: 'Blog',
            title: 'Editorial log',
            description:
              'Summary of posts, announcements, launches, and evergreen content.',
          },
          {
            label: 'Media',
            title: 'Packs and collections',
            description:
              'Space to group photos, videos, and products by category or campaign.',
          },
        ],
      },
      blogSection: {
        title: 'Blog integrated into the main cover',
        description:
          'Teaser zone to drive traffic to posts, announcements, and evergreen pieces without breaking the main navigation.',
        posts: [
          {
            category: 'Behind the scenes',
            excerpt:
              'Sample editorial entry to visually show the future blog of the project.',
          },
          {
            category: 'Launch',
            excerpt:
              'Card ready for featured posts, announcements, or reviews of new drops.',
          },
          {
            category: 'Guide',
            excerpt:
              'Space for indexable content and discovery sections from the home.',
          },
        ],
      },
      blogPage: {
        heroKicker: 'Editorial',
        heroTitle: 'Operational blog, commercially ready, and built to convert',
        heroDescription:
          'Editorial index with categories, promotional spaces, access-level reading, and a structure ready to operate from admin.',
        featuredLabel: 'Featured post',
        categoriesLabel: 'Active categories',
        totalPostsLabel: 'visible articles',
        bannerPrimary: {
          kicker: 'Main banner',
          title: 'Reusable promotional space',
          description:
            'Configurable module to announce new drops, access, campaigns, or relevant content inside the blog.',
          ctaLabel: 'View membership',
        },
        bannerSecondary: {
          kicker: 'Community',
          title: 'Free content for registered accounts',
          description:
            'Acquisition block to drive traffic to the free area, user registration, or discovery layers.',
          ctaLabel: 'Explore free content',
        },
        sidebarCardA: {
          kicker: 'Curation',
          title: 'Editorial route',
          description:
            'Highlight categories, premium posts, and open publications from a single business view.',
        },
        sidebarCardB: {
          kicker: 'Access',
          title: 'Reading control',
          description:
            'Each post can be public, registered-only, or exclusive to subscribers.',
        },
        ctaRegistered: {
          title: 'Register to keep reading',
          description:
            'Create an account to unlock posts reserved for registered users.',
          ctaLabel: 'Create account or sign in',
        },
        ctaSubscription: {
          title: 'Unlock premium articles',
          description:
            'Activate total access to read premium posts and keep access to the rest of the digital content.',
          ctaLabel: 'View total access',
        },
        taxonomy: {
          categories: ['Behind the scenes', 'Launch', 'Guide', 'Community', 'Updates'],
          tags: [
            'editorial',
            'featured',
            'profile',
            'members',
            'community',
            'registration',
            'premium',
            'subscription',
            'update',
            'launch',
            'blog',
            'placeholder',
            'guide',
            'access',
          ],
        },
      },
      siteFooter: {
        title: 'A home designed to grow with content, video, and editorial',
        description:
          'The new cover is ready to evolve into a full creator-platform experience with Supabase, blog, premium media, and centralized administration.',
      },
    },
  },
  localizedMeta: {},
}

function mergeItemsBySlug(defaultItems = [], savedItems = []) {
  const savedBySlug = new Map(savedItems.map((item) => [item.slug, item]))
  const mergedDefaults = defaultItems.map((item) =>
    savedBySlug.has(item.slug) ? { ...item, ...savedBySlug.get(item.slug) } : item,
  )
  const defaultSlugs = new Set(defaultItems.map((item) => item.slug))
  const customOnlyItems = savedItems.filter((item) => !defaultSlugs.has(item.slug))

  return [...mergedDefaults, ...customOnlyItems]
}

function normalizePriceLabel(label = '') {
  const value = String(label || '').trim()

  if (!value) {
    return value
  }

  if (value.startsWith('$')) {
    return value
  }

  if (value.startsWith('S/')) {
    return `$${value.slice(2).trim()}`
  }

  return value
}

function normalizeEncounterPriceLabel(label = '', fallbackAmount = 500) {
  const value = String(label || '').trim()

  if (!value) {
    return `S/${(fallbackAmount / 100).toFixed(2)}`
  }

  if (value.startsWith('S/')) {
    return value
  }

  if (value.startsWith('$')) {
    return `S/${value.slice(1).trim()}`
  }

  return `S/${value}`
}

function normalizeVideoLibraryItem(item = {}) {
  const slug = String(item.slug || '').trim()
  const accessMode = item.accessMode || 'purchase'
  const previewSourceUrl =
    item.previewSourceUrl || (!isInternalMediaUrl(item.previewVideoUrl) ? item.previewVideoUrl : '')
  const fullSourceUrl = item.fullSourceUrl || (!isInternalMediaUrl(item.fullVideoUrl) ? item.fullVideoUrl : '')
  const previewDriveFileId =
    item.previewDriveFileId || extractGoogleDriveFileId(previewSourceUrl || '')
  const fullDriveFileId =
    item.fullDriveFileId || extractGoogleDriveFileId(fullSourceUrl || '')
  const tags = Array.from(
    new Set(
      (Array.isArray(item.tags) ? item.tags : item.tag ? [item.tag] : [])
        .map((value) => String(value || '').trim())
        .filter(Boolean),
    ),
  ).slice(0, 5)

  return {
    ...item,
    priceLabel: normalizePriceLabel(item.priceLabel),
    accessMode,
    tags,
    tag: tags[0] || item.tag || '',
    previewSourceUrl,
    fullSourceUrl,
    previewDriveFileId,
    fullDriveFileId,
    previewVideoUrl:
      previewDriveFileId && slug
        ? buildVideoPreviewUrl(slug)
        : !isInternalMediaUrl(item.previewVideoUrl)
          ? item.previewVideoUrl || previewSourceUrl
          : previewSourceUrl,
    fullVideoUrl:
      fullDriveFileId && slug
        ? buildVideoFullUrl(slug)
        : !isInternalMediaUrl(item.fullVideoUrl)
          ? item.fullVideoUrl || fullSourceUrl
          : fullSourceUrl,
    }
}

function normalizeVideoCollectionItem(item = {}) {
  const slug = String(item.slug || '').trim()
  const previewDriveFileId =
    item.previewDriveFileId || extractGoogleDriveFileId(item.previewUrl || '')

  return {
    ...item,
    priceLabel: normalizePriceLabel(item.priceLabel),
    previewDriveFileId,
    previewUrl: previewDriveFileId
      ? slug
        ? buildMediaPreviewUrl('collections', slug)
        : item.previewUrl || ''
      : item.previewUrl || '',
  }
}

function normalizePhysicalMerchItem(item = {}) {
  return {
    ...item,
    priceLabel: normalizePriceLabel(item.priceLabel),
  }
}

function normalizeFreeContentItem(item = {}) {
  const slug = item.slug || ''
  const mediaDriveFileId =
    item.mediaDriveFileId || extractGoogleDriveFileId(item.mediaUrl || '')
  const normalizedMediaDriveFileId = item.mediaType === 'video' ? mediaDriveFileId : ''

  return {
    ...item,
    mediaDriveFileId: normalizedMediaDriveFileId,
    mediaUrl:
      item.mediaType === 'video' && normalizedMediaDriveFileId
        ? buildMediaPublicUrl('free-content', slug)
        : item.mediaUrl || '',
  }
}

export function mergeSiteContent(partialContent = {}) {
  const hasVideoLibraryOverride = Object.prototype.hasOwnProperty.call(partialContent, 'videoLibrary')
  const hasVideoCollectionsOverride = Object.prototype.hasOwnProperty.call(
    partialContent,
    'videoCollections',
  )
  const hasTopCarouselOverride = Object.prototype.hasOwnProperty.call(partialContent, 'topCarouselImages')
  const hasBottomCarouselOverride = Object.prototype.hasOwnProperty.call(
    partialContent,
    'bottomCarouselImages',
  )
  const partialLocalized = partialContent.localized || {}
  const partialLocalizedEn = partialLocalized.en || {}
  const legacyAccessTotal =
    partialContent.accessTotal || partialContent.creatorHome?.subscriptionTable || {}
  const { heroImage: _legacyHeroImage, ...normalizedLegacyAccessTotal } = legacyAccessTotal
  const savedSubscriptionTiers = Array.isArray(normalizedLegacyAccessTotal.tiers)
    ? normalizedLegacyAccessTotal.tiers
    : []
  const mergedSubscriptionTiers = savedSubscriptionTiers.length
    ? normalizeSubscriptionTiers({ tiers: savedSubscriptionTiers })
    : []
  const fallbackSubscriptionTiers =
    defaultSiteContent.accessTotal.tiers || []
  const mergedAccessRows = Array.isArray(normalizedLegacyAccessTotal.rows) &&
    normalizedLegacyAccessTotal.rows.length
    ? normalizedLegacyAccessTotal.rows
    : defaultSiteContent.accessTotal.rows
  const partialBooking = partialContent.encuentrosBooking || {}
  const parsedBookingAmount = Number.parseInt(
    partialBooking.priceAmount || defaultSiteContent.encuentrosBooking.priceAmount || '500',
    10,
  )
  const normalizedBookingAmount =
    Number.isFinite(parsedBookingAmount) && parsedBookingAmount > 0 ? parsedBookingAmount : 500
  const parsedAdvanceAmount = Number.parseInt(
    partialBooking.advanceAmount || defaultSiteContent.encuentrosBooking.advanceAmount || '1000',
    10,
  )
  const normalizedAdvanceAmount =
    Number.isFinite(parsedAdvanceAmount) && parsedAdvanceAmount > 0 ? parsedAdvanceAmount : 1000
  const bookingDiscountPercent = Number.parseFloat(
    String(
      partialBooking.recordingDiscountPercent ||
        defaultSiteContent.encuentrosBooking.recordingDiscountPercent ||
        '0',
    ).replace(',', '.'),
  )

  return {
    ...defaultSiteContent,
    ...partialContent,
    localized: (() => {
      const mergedLocalized = mergeLocalizedValue(defaultSiteContent.localized, partialLocalized)

      if (Object.prototype.hasOwnProperty.call(partialLocalizedEn, 'videoLibrary')) {
        mergedLocalized.en = mergedLocalized.en || {}
        mergedLocalized.en.videoLibrary = mergeLocalizedValue({}, partialLocalizedEn.videoLibrary)
      }

      if (Object.prototype.hasOwnProperty.call(partialLocalizedEn, 'videoCollections')) {
        mergedLocalized.en = mergedLocalized.en || {}
        mergedLocalized.en.videoCollections = mergeLocalizedValue(
          {},
          partialLocalizedEn.videoCollections,
        )
      }

      return mergedLocalized
    })(),
    topCarouselImages: normalizeCarouselSlides(
      hasTopCarouselOverride ? partialContent.topCarouselImages : defaultSiteContent.topCarouselImages,
    ),
    bottomCarouselImages: normalizeCarouselSlides(
      hasBottomCarouselOverride
        ? partialContent.bottomCarouselImages
        : defaultSiteContent.bottomCarouselImages,
    ),
    localizedMeta: {
      ...(defaultSiteContent.localizedMeta || {}),
      ...(partialContent.localizedMeta || {}),
    },
    creatorHome: {
      ...defaultSiteContent.creatorHome,
      ...(partialContent.creatorHome || {}),
      badges:
        partialContent.creatorHome?.badges || defaultSiteContent.creatorHome.badges,
      stats:
        partialContent.creatorHome?.stats || defaultSiteContent.creatorHome.stats,
      profileHighlights:
        partialContent.creatorHome?.profileHighlights ||
        defaultSiteContent.creatorHome.profileHighlights,
    },
    accessTotal: {
      ...defaultSiteContent.accessTotal,
      ...normalizedLegacyAccessTotal,
      ctaLabel:
        normalizedLegacyAccessTotal.ctaLabel === 'Suscribirme ahora'
          ? 'Suscribirme y desbloquear'
          : normalizedLegacyAccessTotal.ctaLabel ||
              defaultSiteContent.accessTotal.ctaLabel,
      tiers: mergedSubscriptionTiers.length ? mergedSubscriptionTiers : fallbackSubscriptionTiers,
      rows: mergedAccessRows,
    },
    encuentrosBooking: {
      ...defaultSiteContent.encuentrosBooking,
      ...partialBooking,
      priceAmount: normalizedBookingAmount,
      priceLabel: normalizeEncounterPriceLabel(
        partialBooking.priceLabel || defaultSiteContent.encuentrosBooking.priceLabel,
        normalizedBookingAmount,
      ),
      advanceAmount: normalizedAdvanceAmount,
      advanceLabel: normalizeEncounterPriceLabel(
        partialBooking.advanceLabel || defaultSiteContent.encuentrosBooking.advanceLabel,
        normalizedAdvanceAmount,
      ),
      currency: 'PEN',
      recordingDiscountPercent: Number.isFinite(bookingDiscountPercent) ? bookingDiscountPercent : 0,
    },
    mediaSpotlight: {
      ...defaultSiteContent.mediaSpotlight,
      ...(partialContent.mediaSpotlight || {}),
      gallery:
        partialContent.mediaSpotlight?.gallery ||
        defaultSiteContent.mediaSpotlight.gallery,
    },
    videoLibrary: {
      ...defaultSiteContent.videoLibrary,
      ...(partialContent.videoLibrary || {}),
      items: hasVideoLibraryOverride
        ? (partialContent.videoLibrary?.items || []).map(normalizeVideoLibraryItem)
        : mergeItemsBySlug(
            defaultSiteContent.videoLibrary.items,
            partialContent.videoLibrary?.items || [],
          ).map(normalizeVideoLibraryItem),
    },
    videoCollections: {
      ...defaultSiteContent.videoCollections,
      ...(partialContent.videoCollections || {}),
      items: hasVideoCollectionsOverride
        ? (partialContent.videoCollections?.items || []).map(normalizeVideoCollectionItem)
        : mergeItemsBySlug(
            defaultSiteContent.videoCollections.items,
            partialContent.videoCollections?.items || [],
          ).map(normalizeVideoCollectionItem),
    },
    physicalMerch: {
      ...defaultSiteContent.physicalMerch,
      ...(partialContent.physicalMerch || {}),
      items: mergeItemsBySlug(
        defaultSiteContent.physicalMerch.items,
        partialContent.physicalMerch?.items || [],
      ).map(normalizePhysicalMerchItem),
    },
    freeContent: {
      ...defaultSiteContent.freeContent,
      ...(partialContent.freeContent || {}),
      items: mergeItemsBySlug(
        defaultSiteContent.freeContent.items,
        partialContent.freeContent?.items || [],
      ).map(normalizeFreeContentItem),
    },
    sectionVisibility: {
      ...defaultSiteContent.sectionVisibility,
      ...(partialContent.sectionVisibility || {}),
    },
    membership: {
      ...defaultSiteContent.membership,
      ...(partialContent.membership || {}),
      planItems:
        partialContent.membership?.planItems ||
        defaultSiteContent.membership.planItems,
      sideCards:
        partialContent.membership?.sideCards ||
        defaultSiteContent.membership.sideCards,
    },
    blogSection: {
      ...defaultSiteContent.blogSection,
      ...(partialContent.blogSection || {}),
      posts: partialContent.blogSection?.posts || defaultSiteContent.blogSection.posts,
    },
    blogPage: {
      ...defaultSiteContent.blogPage,
      ...(partialContent.blogPage || {}),
      bannerPrimary: {
        ...defaultSiteContent.blogPage.bannerPrimary,
        ...(partialContent.blogPage?.bannerPrimary || {}),
      },
      bannerSecondary: {
        ...defaultSiteContent.blogPage.bannerSecondary,
        ...(partialContent.blogPage?.bannerSecondary || {}),
      },
      sidebarCardA: {
        ...defaultSiteContent.blogPage.sidebarCardA,
        ...(partialContent.blogPage?.sidebarCardA || {}),
      },
      sidebarCardB: {
        ...defaultSiteContent.blogPage.sidebarCardB,
        ...(partialContent.blogPage?.sidebarCardB || {}),
      },
      ctaRegistered: {
        ...defaultSiteContent.blogPage.ctaRegistered,
        ...(partialContent.blogPage?.ctaRegistered || {}),
      },
      ctaSubscription: {
        ...defaultSiteContent.blogPage.ctaSubscription,
        ...(partialContent.blogPage?.ctaSubscription || {}),
      },
      taxonomy: {
        ...defaultSiteContent.blogPage.taxonomy,
        ...(partialContent.blogPage?.taxonomy || {}),
        categories:
          partialContent.blogPage?.taxonomy?.categories ||
          defaultSiteContent.blogPage.taxonomy.categories,
        tags:
          partialContent.blogPage?.taxonomy?.tags ||
          defaultSiteContent.blogPage.taxonomy.tags,
      },
    },
    siteFooter: {
      ...defaultSiteContent.siteFooter,
      ...(partialContent.siteFooter || {}),
    },
  }
}


