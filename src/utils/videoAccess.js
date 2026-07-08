import { withBasePath } from './routes'

export function buildVideoAccessActions({
  access,
  session,
  subscriptionProduct,
  videoSlug,
  siteContent,
  t,
  basePath = '',
}) {
  const hasSession = Boolean(session?.accessToken)
  const buildCheckoutHref = (productSlug) =>
    hasSession
      ? withBasePath(basePath, `/checkout/start/${productSlug}`)
      : withBasePath(basePath, `/access?redirect=/checkout/start/${productSlug}`)
  const rawSubscriptionLabel = siteContent.accessTotal.ctaLabel || t('checkout.checkoutTypeSubscription')
  const subscriptionLabel =
    rawSubscriptionLabel === 'Suscribirme ahora'
      ? 'Suscribirme y desbloquear'
      : rawSubscriptionLabel

  if (access.unlocked || access.accessMode === 'public') {
    return [
      {
        key: 'view',
        label: t('content.watchVideo'),
        href: withBasePath(basePath, `/videos/${videoSlug}`),
        variant: 'primary',
      },
    ]
  }

  if (access.accessMode === 'subscription') {
    if (!subscriptionProduct?.slug) {
      return []
    }

    return [
      {
        key: 'subscribe',
        label: subscriptionLabel,
        href: buildCheckoutHref(subscriptionProduct.slug),
        variant: 'primary',
      },
    ]
  }

  if (access.accessMode === 'registered') {
    const actions = [
      {
        key: 'register',
        label: t('access.register'),
        href: hasSession
          ? withBasePath(basePath, `/videos/${videoSlug}`)
          : withBasePath(basePath, `/access?redirect=/videos/${videoSlug}`),
        variant: 'primary',
      },
    ]

    if (subscriptionProduct?.slug) {
      actions.push({
        key: 'subscribe',
        label: subscriptionLabel,
        href: buildCheckoutHref(subscriptionProduct.slug),
        variant: 'secondary',
      })
    }

    return actions
  }

  const actions = []

  if (access.product?.slug) {
    actions.push({
      key: 'purchase',
      label: t('content.buyVideo'),
      href: buildCheckoutHref(access.product.slug),
      variant: 'primary',
    })
  }

  if (subscriptionProduct?.slug) {
    actions.push({
      key: 'subscribe',
      label: subscriptionLabel,
      href: buildCheckoutHref(subscriptionProduct.slug),
      variant: actions.length ? 'secondary' : 'primary',
    })
  }

  if (!actions.length) {
    actions.push({
      key: 'view',
      label: t('content.watchVideo'),
      href: withBasePath(basePath, `/videos/${videoSlug}`),
      variant: 'primary',
    })
  }

  return actions
}
