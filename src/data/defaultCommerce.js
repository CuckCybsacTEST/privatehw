import { defaultSiteContent } from './defaultSiteContent.js'

function parsePriceAmount(priceLabel = '') {
  const numeric = Number.parseFloat(String(priceLabel).replace(/[^\d.,]/g, '').replace(',', '.'))
  return Number.isFinite(numeric) ? Math.round(numeric * 100) : 0
}

function formatPriceAmount(amount = 0, currency = 'PEN') {
  return new Intl.NumberFormat('es-PE', {
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
    originalPriceLabel: formatPriceAmount(originalPriceAmount),
    discountedPriceLabel: formatPriceAmount(discountedPriceAmount),
    hasDiscount: discountPercent > 0 && discountedPriceAmount < originalPriceAmount,
    savingsAmount: Math.max(0, originalPriceAmount - discountedPriceAmount),
    savingsLabel: formatPriceAmount(Math.max(0, originalPriceAmount - discountedPriceAmount)),
  }
}

export function normalizeSubscriptionPlans(subscriptionTable = {}) {
  const plans =
    Array.isArray(subscriptionTable.plans) && subscriptionTable.plans.length
      ? subscriptionTable.plans
      : [
        {
          slug: 'monthly',
          label: 'Mensual',
          period: subscriptionTable.period || '1 mes',
          durationValue: '1',
          durationUnit: 'months',
          price: subscriptionTable.price || 'S/0',
          discountPercent: subscriptionTable.discountPercent || '0',
          discountLabel: subscriptionTable.discountLabel || 'Oferta activa',
          promoNote: '',
          },
        ]

  return plans.map((plan, index) => {
    const pricing = calculateSubscriptionPricing(plan)
    const legacyDurationValue = Number.parseInt(plan.durationMonths || '1', 10)
    const durationValue = Number.parseInt(
      plan.durationValue || plan.durationMonths || '1',
      10,
    )
    const durationUnit = plan.durationUnit === 'days' ? 'days' : 'months'
    const safeDurationValue = Number.isFinite(durationValue) ? durationValue : legacyDurationValue || 1
    const durationDays =
      durationUnit === 'days' ? safeDurationValue : safeDurationValue * 30

    return {
      id: plan.id || `subscription-plan-${index}`,
      slug: plan.slug || `plan-${index + 1}`,
      label: plan.label || `Plan ${index + 1}`,
      period: plan.period || `${safeDurationValue} ${durationUnit === 'days' ? 'dias' : 'meses'}`,
      durationValue: safeDurationValue,
      durationUnit,
      durationMonths: durationUnit === 'months' ? safeDurationValue : 0,
      durationDays,
      promoNote: plan.promoNote || '',
      discountLabel: plan.discountLabel || 'Oferta activa',
      ...pricing,
    }
  })
}

export function buildDefaultProducts(content = defaultSiteContent) {
  const subscriptionPlans = normalizeSubscriptionPlans(content.creatorHome.subscriptionTable)

  const subscriptionProducts = subscriptionPlans.map((plan) => ({
    slug: `membership-${plan.slug}`,
    title: `${content.creatorHome.subscriptionTable.title || 'Acceso total'} · ${plan.label}`,
    productType: 'subscription',
    checkoutMode: 'payment',
    accessScope: 'all_digital',
    priceAmount: plan.discountedPriceAmount,
    currency: 'PEN',
    priceLabel: plan.discountedPriceLabel || 'S/0',
    active: true,
    stripePriceId: '',
    metadata: {
      note: 'Desbloquea todo el contenido digital excepto productos fisicos.',
      durationValue: plan.durationValue,
      durationUnit: plan.durationUnit,
      durationMonths: plan.durationMonths,
      durationDays: plan.durationDays,
      planLabel: plan.label,
      planPeriod: plan.period,
      promoNote: plan.promoNote,
      originalPriceAmount: plan.originalPriceAmount,
      originalPriceLabel: plan.originalPriceLabel,
      discountedPriceAmount: plan.discountedPriceAmount,
      discountedPriceLabel: plan.discountedPriceLabel,
      discountPercent: plan.discountPercent,
      hasDiscount: plan.hasDiscount,
      savingsAmount: plan.savingsAmount,
      savingsLabel: plan.savingsLabel,
      discountLabel: plan.discountLabel,
    },
  }))

  const videoProducts = content.videoLibrary.items.map((item) => ({
    slug: `video-${item.slug}`,
    title: item.title,
    productType: 'video',
    checkoutMode: 'payment',
    accessScope: `video:${item.slug}`,
    priceAmount: parsePriceAmount(item.priceLabel),
    currency: 'PEN',
    priceLabel: item.priceLabel,
    active: true,
    stripePriceId: '',
    metadata: {
      contentSlug: item.slug,
    },
  }))

  const packProducts = content.videoCollections.items.map((item) => ({
    slug: `pack-${item.slug}`,
    title: item.title,
    productType: 'pack',
    checkoutMode: 'payment',
    accessScope: `pack:${item.slug}`,
    priceAmount: parsePriceAmount(item.priceLabel),
    currency: 'PEN',
    priceLabel: item.priceLabel,
    active: true,
    stripePriceId: '',
    metadata: {
      contentSlug: item.slug,
    },
  }))

  const physicalProducts = content.physicalMerch.items.map((item) => ({
    slug: `physical-${item.slug}`,
    title: item.title,
    productType: 'physical',
    checkoutMode: 'payment',
    accessScope: `physical:${item.slug}`,
    priceAmount: parsePriceAmount(item.priceLabel),
    currency: 'PEN',
    priceLabel: item.priceLabel,
    active: true,
    stripePriceId: '',
    metadata: {
      contentSlug: item.slug,
    },
  }))

  return [...subscriptionProducts, ...videoProducts, ...packProducts, ...physicalProducts]
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
    currency: product.currency || 'PEN',
    priceLabel: product.priceLabel || 'S/0',
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
  const customProducts = normalizedSaved.filter((product) => !defaultSlugs.has(product.slug))

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
  }
}

export function normalizeEntitlements(entitlements = []) {
  return entitlements.map((entitlement, index) => normalizeEntitlement(entitlement, index))
}
