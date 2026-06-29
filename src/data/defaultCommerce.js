import { defaultSiteContent } from './defaultSiteContent.js'

export function parsePriceAmount(priceLabel = '') {
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

function formatPriceAmount(amount = 0, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format((amount || 0) / 100)
}

export function calculateSubscriptionPricing(subscriptionTable = {}) {
  const originalPriceAmount = parsePriceAmount(subscriptionTable.price)
  const rawDiscount = Number.parseFloat(subscriptionTable.discountPercent || '0')
  const discountPercent = Number.isFinite(rawDiscount)
    ? Math.min(Math.max(rawDiscount, 0), 100)
    : 0
  const discountedPriceAmount =
    discountPercent > 0
      ? Math.max(
          0,
          Math.round(originalPriceAmount * ((100 - discountPercent) / 100)),
        )
      : originalPriceAmount

  return {
    originalPriceAmount,
    discountedPriceAmount,
    discountPercent,
    price: subscriptionTable.price || '$0',
    originalPriceLabel: formatPriceAmount(originalPriceAmount),
    discountedPriceLabel: formatPriceAmount(discountedPriceAmount),
    hasDiscount: discountPercent > 0 && discountedPriceAmount < originalPriceAmount,
    savingsAmount: Math.max(0, originalPriceAmount - discountedPriceAmount),
    savingsLabel: formatPriceAmount(Math.max(0, originalPriceAmount - discountedPriceAmount)),
  }
}

const DEFAULT_TIER_GRANTS = ['video']

const LEGACY_TIER_DEFAULTS = [
  { slug: 'starter', label: 'Starter', grants: ['video'] },
  { slug: 'plus', label: 'Plus', grants: ['video', 'pack'] },
  { slug: 'pro', label: 'Pro', grants: ['video', 'pack', 'blog'] },
  { slug: 'elite', label: 'Elite', grants: ['video', 'pack', 'blog', 'physical'] },
]

export function normalizeSubscriptionTiers(subscriptionTable = {}) {
  const sourceTiers =
    Array.isArray(subscriptionTable.tiers) && subscriptionTable.tiers.length
      ? subscriptionTable.tiers
      : [
            {
              slug: 'starter',
              label: 'Starter',
              period: subscriptionTable.period || '1 mes',
              durationValue: '1',
              durationUnit: 'months',
              price: subscriptionTable.price || '$0',
              discountPercent: subscriptionTable.discountPercent || '0',
              discountLabel: subscriptionTable.discountLabel || 'Oferta activa',
              promoNote: '',
              grants: DEFAULT_TIER_GRANTS,
            },
          ]

  return sourceTiers.map((tier, index) => {
    const pricing = calculateSubscriptionPricing(tier)
    const legacyDurationValue = Number.parseInt(tier.durationMonths || '1', 10)
    const durationValue = Number.parseInt(tier.durationValue || tier.durationMonths || '1', 10)
    const durationUnit = tier.durationUnit === 'days' ? 'days' : 'months'
    const safeDurationValue = Number.isFinite(durationValue) ? durationValue : legacyDurationValue || 1
    const durationDays = durationUnit === 'days' ? safeDurationValue : safeDurationValue * 30
    const fallbackTier = LEGACY_TIER_DEFAULTS[index] || LEGACY_TIER_DEFAULTS[0]
    const grants = Array.isArray(tier.grants) && tier.grants.length ? tier.grants : fallbackTier.grants

    return {
      id: tier.id || `subscription-tier-${index}`,
      slug: tier.slug || fallbackTier.slug || `tier-${index + 1}`,
      label: tier.label || fallbackTier.label || `Tier ${index + 1}`,
      period: tier.period || `${safeDurationValue} ${durationUnit === 'days' ? 'dias' : 'meses'}`,
      durationValue: safeDurationValue,
      durationUnit,
      durationMonths: durationUnit === 'months' ? safeDurationValue : 0,
      durationDays,
      promoNote: tier.promoNote || '',
      discountLabel: tier.discountLabel || 'Oferta activa',
      grants,
      rank: Number.isFinite(Number(tier.rank)) ? Number(tier.rank) : index + 1,
      ...pricing,
    }
  })
}

export function buildDefaultProducts(content = defaultSiteContent, blogPosts = []) {
  return buildDefaultProductsWithBlogPosts(content, blogPosts)
}

function isDerivedProductSlug(slug = '') {
  return ['membership-', 'video-', 'pack-', 'physical-', 'blog-', 'reservation-'].some((prefix) =>
    String(slug || '').startsWith(prefix),
  )
}

export function isPersistentProductType(productType = '') {
  return ['subscription', 'video', 'pack', 'physical'].includes(String(productType || ''))
}

export function isDerivedProductType(productType = '') {
  return ['blog', 'reservation'].includes(String(productType || ''))
}

export function buildBlogProducts(blogPosts = []) {
  return blogPosts
    .filter(
      (post) =>
        post &&
        post.status === 'published' &&
        post.accessLevel === 'purchase' &&
        post.slug,
    )
    .map((post) => ({
      slug: `blog-${post.slug}`,
      title: post.title,
      productType: 'blog',
      checkoutMode: 'payment',
      accessScope: `blog:${post.slug}`,
      priceAmount: Number.isFinite(post.priceAmount) ? post.priceAmount : parsePriceAmount(post.priceLabel),
      currency: post.currency || 'USD',
      priceLabel:
        post.priceLabel ||
        (Number.isFinite(post.priceAmount) && post.priceAmount > 0
          ? formatPriceAmount(post.priceAmount)
          : ''),
      active: true,
      stripePriceId: '',
    metadata: {
      contentSlug: post.slug,
      requiredGrant: 'blog',
    },
  }))
}

export function buildPersistentProducts(content = defaultSiteContent) {
  const subscriptionTiers = normalizeSubscriptionTiers(content.accessTotal)

  const subscriptionProducts = subscriptionTiers.map((tier) => ({
    slug: `membership-${tier.slug}`,
    title: `${content.accessTotal.title || 'Acceso total'} · ${tier.label}`,
    productType: 'subscription',
    checkoutMode: 'subscription',
    accessScope: `tier:${tier.slug}`,
    priceAmount: tier.discountedPriceAmount,
    currency: 'USD',
    priceLabel: tier.discountedPriceLabel || '$0',
    active: true,
    stripePriceId: '',
    metadata: {
      note: tier.grants.includes('physical')
        ? 'Desbloquea videos, packs y lecturas premium con prioridad extendida.'
        : tier.grants.includes('pack')
          ? 'Desbloquea videos premium y packs destacados.'
          : 'Desbloquea la coleccion premium de videos.',
      durationValue: tier.durationValue,
      durationUnit: tier.durationUnit,
      durationMonths: tier.durationMonths,
      durationDays: tier.durationDays,
      planLabel: tier.label,
      planPeriod: tier.period,
      promoNote: tier.promoNote,
      originalPriceAmount: tier.originalPriceAmount,
      originalPriceLabel: tier.originalPriceLabel,
      discountedPriceAmount: tier.discountedPriceAmount,
      discountedPriceLabel: tier.discountedPriceLabel,
      discountPercent: tier.discountPercent,
      hasDiscount: tier.hasDiscount,
      savingsAmount: tier.savingsAmount,
      savingsLabel: tier.savingsLabel,
      discountLabel: tier.discountLabel,
      grants: tier.grants,
      rank: tier.rank,
      requiredGrant: tier.grants[0] || 'video',
    },
  }))

  const videoProducts = content.videoLibrary.items.map((item) => ({
    slug: `video-${item.slug}`,
    title: item.title,
    productType: 'video',
    checkoutMode: 'payment',
    accessScope: `video:${item.slug}`,
    priceAmount: parsePriceAmount(item.priceLabel),
    currency: 'USD',
    priceLabel: item.priceLabel,
    active: true,
    stripePriceId: '',
    metadata: {
      contentSlug: item.slug,
      requiredGrant: 'video',
    },
  }))

  const packProducts = content.videoCollections.items.map((item) => ({
    slug: `pack-${item.slug}`,
    title: item.title,
    productType: 'pack',
    checkoutMode: 'payment',
    accessScope: `pack:${item.slug}`,
    priceAmount: parsePriceAmount(item.priceLabel),
    currency: 'USD',
    priceLabel: item.priceLabel,
    active: true,
    stripePriceId: '',
    metadata: {
      contentSlug: item.slug,
      requiredGrant: 'pack',
    },
  }))

  const physicalProducts = content.physicalMerch.items.map((item) => ({
    slug: `physical-${item.slug}`,
    title: item.title,
    productType: 'physical',
    checkoutMode: 'payment',
    accessScope: `physical:${item.slug}`,
    priceAmount: parsePriceAmount(item.priceLabel),
    currency: 'USD',
    priceLabel: item.priceLabel,
    active: true,
    stripePriceId: '',
    metadata: {
      contentSlug: item.slug,
    },
  }))

  return [...subscriptionProducts, ...videoProducts, ...packProducts, ...physicalProducts]
}

export function buildDerivedProducts(content = defaultSiteContent, blogPosts = []) {
  const reservation = content.encuentrosBooking || {}
  const reservationBaseAmount = Number.isFinite(reservation.priceAmount) ? reservation.priceAmount : 500
  const reservationAdvanceAmount = Number.isFinite(reservation.advanceAmount)
    ? reservation.advanceAmount
    : 1000
  const reservationProduct = {
    slug: 'reservation-encuentros',
    title: reservation.title || 'Reserva de encuentro',
    productType: 'reservation',
    checkoutMode: 'payment',
    accessScope: 'reservation:encuentros',
    priceAmount: reservationAdvanceAmount,
    currency: reservation.currency || 'PEN',
    priceLabel: reservation.advanceLabel || 'S/10.00',
    active: true,
    stripePriceId: '',
    metadata: {
      contentSlug: 'encuentros',
      reservationBaseAmount,
      reservationAdvanceAmount,
      bookingDurationMinutes: reservation.durationMinutes || 30,
      bookingSlots: reservation.timeSlots || [],
      paymentMethods: reservation.paymentMethods || [],
    },
  }

  return [reservationProduct, ...buildBlogProducts(blogPosts)]
}

export function buildDefaultProductsWithBlogPosts(content = defaultSiteContent, blogPosts = []) {
  return [...buildPersistentProducts(content), ...buildDerivedProducts(content, blogPosts)]
}

function normalizeProduct(product = {}, fallbackIndex = 0) {
  return {
    id: product.id || `product-${fallbackIndex}`,
    slug: product.slug || `product-${fallbackIndex}`,
    title: product.title || 'Producto',
    productType: product.productType || 'video',
    checkoutMode: product.checkoutMode || 'payment',
    accessScope: product.accessScope || '',
    priceAmount: Number.isFinite(product.priceAmount) ? product.priceAmount : 0,
    currency: product.currency || 'USD',
    priceLabel: product.priceLabel || '$0',
    active: product.active !== false,
    stripePriceId: product.stripePriceId || '',
    metadata: product.metadata || {},
  }
}

export function mergeProducts(defaultProducts = [], savedProducts = []) {
  const normalizedDefaults = defaultProducts.map((product, index) =>
    normalizeProduct(product, index),
  )
  const normalizedSaved = savedProducts.map((product, index) =>
    normalizeProduct(product, normalizedDefaults.length + index),
  )
  const savedBySlug = new Map(normalizedSaved.map((product) => [product.slug, product]))
  const mergedDefaults = normalizedDefaults.map((product) =>
    savedBySlug.has(product.slug) ? { ...product, ...savedBySlug.get(product.slug) } : product,
  )
  const defaultSlugs = new Set(normalizedDefaults.map((product) => product.slug))
  const customProducts = normalizedSaved.filter(
    (product) => !defaultSlugs.has(product.slug) && !isDerivedProductSlug(product.slug),
  )

  return [...mergedDefaults, ...customProducts]
}

export const defaultEntitlements = []

export function normalizeEntitlement(entitlement = {}, fallbackIndex = 0) {
  return {
    id: entitlement.id || `entitlement-${fallbackIndex}`,
    userId: entitlement.userId || '',
    productSlug: entitlement.productSlug || '',
    entitlementKey: entitlement.entitlementKey || '',
    status: entitlement.status || 'active',
    expiresAt: entitlement.expiresAt || null,
    createdAt: entitlement.createdAt || null,
    sourceOrderId: entitlement.sourceOrderId || '',
    grantSource: entitlement.grantSource || 'checkout',
    grantedBy: entitlement.grantedBy || '',
  }
}

export function normalizeEntitlements(entitlements = []) {
  return entitlements.map((entitlement, index) => normalizeEntitlement(entitlement, index))
}

