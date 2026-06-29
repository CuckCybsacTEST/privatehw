export function buildPackAccessActions({
  access,
  collectionSlug,
  session,
  subscriptionProduct,
  siteContent,
  t,
  viewHref,
}) {
  const hasSession = Boolean(session?.accessToken)
  const buildCheckoutHref = (productSlug) =>
    hasSession
      ? `/checkout/start/${productSlug}`
      : `/access?redirect=/checkout/start/${productSlug}`
  const rawSubscriptionLabel = siteContent.accessTotal.ctaLabel || t('checkout.checkoutTypeSubscription')
  const subscriptionLabel =
    rawSubscriptionLabel === 'Suscribirme ahora'
      ? 'Suscribirme y desbloquear'
      : rawSubscriptionLabel
  const resolvedViewHref = viewHref || `/packs/${collectionSlug}`

  if (access.unlocked) {
    return [
      {
        key: 'view',
        label: t('content.watchPack'),
        href: resolvedViewHref,
        variant: 'primary',
      },
    ]
  }

  const actions = []

  if (access.product?.slug) {
    actions.push({
      key: 'purchase',
      label: t('content.buyPack'),
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
      label: t('content.watchPack'),
      href: resolvedViewHref,
      variant: 'primary',
    })
  }

  return actions
}
