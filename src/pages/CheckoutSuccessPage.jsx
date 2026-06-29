import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PublicNav } from '../components/PublicNav'
import { SiteFooter } from '../components/SiteFooter'
import { useAppState } from '../state/AppState'
import { getActiveEntitlements } from '../utils/entitlements'
import { resolveLocalizedRecord } from '../utils/localizedContent'

function ReservationConfirmationModal({
  open,
  title,
  description,
  dateLabel,
  timeLabel,
  methodLabel,
  onClose,
  onContinue,
}) {
  if (!open) {
    return null
  }

  return (
    <div className="checkout-confirmation-modal" role="presentation">
      <button
        type="button"
        className="checkout-confirmation-modal-backdrop"
        onClick={onClose}
        aria-label={title}
      />

      <section
        className="checkout-confirmation-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-confirmation-modal-title"
      >
        <div className="checkout-confirmation-modal-copy">
          <p className="section-kicker">{title}</p>
          <h2 id="checkout-confirmation-modal-title">{description}</h2>
        </div>

        <div className="checkout-confirmation-modal-grid">
          <div className="checkout-confirmation-modal-item">
            <span>Fecha</span>
            <strong>{dateLabel}</strong>
          </div>
          <div className="checkout-confirmation-modal-item">
            <span>Hora</span>
            <strong>{timeLabel}</strong>
          </div>
          <div className="checkout-confirmation-modal-item">
            <span>Metodo</span>
            <strong>{methodLabel}</strong>
          </div>
        </div>

        <div className="checkout-confirmation-modal-actions">
          <button type="button" className="hero-secondary-cta" onClick={onClose}>
            Cerrar
          </button>
          <button type="button" className="hero-primary-cta" onClick={onContinue}>
            Ver confirmacion
          </button>
        </div>
      </section>
    </div>
  )
}

export function CheckoutSuccessPage() {
  const navigate = useNavigate()
  const {
    blogPosts,
    getProductBySlug,
    getProductDestination,
    markPhysicalOrderPaid,
    refreshCommerceData,
    siteContent,
  } = useAppState()
  const { i18n, t } = useTranslation()
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const productSlug = searchParams.get('product')
  const physicalOrderRequestId = searchParams.get('request')
  const reservationRequestId = searchParams.get('reservation')
  const reservationDate = searchParams.get('date')
  const reservationTime = searchParams.get('time')
  const paymentMethod = searchParams.get('method')
  const [statusText, setStatusText] = useState(t('checkout.validating'))
  const [isResolved, setIsResolved] = useState(false)
  const [showReservationModal, setShowReservationModal] = useState(false)
  const product = useMemo(
    () => (productSlug ? getProductBySlug(productSlug) : null),
    [getProductBySlug, productSlug],
  )
  const localizedSiteContent = resolveLocalizedRecord(siteContent, i18n.resolvedLanguage)
  const localizedProductTitle = useMemo(() => {
    if (!product) {
      return ''
    }

    if (product.productType === 'video') {
      const slug = product.accessScope.replace('video:', '')
      return localizedSiteContent.videoLibrary.items.find((item) => item.slug === slug)?.title || product.title
    }

    if (product.productType === 'pack') {
      const slug = product.accessScope.replace('pack:', '')
      return localizedSiteContent.videoCollections.items.find((item) => item.slug === slug)?.title || product.title
    }

    if (product.productType === 'physical') {
      const slug = product.accessScope.replace('physical:', '')
      return localizedSiteContent.physicalMerch.items.find((item) => item.slug === slug)?.title || product.title
    }

    if (product.productType === 'blog') {
      const slug = product.metadata?.contentSlug || product.accessScope.replace('blog:', '')
      return resolveLocalizedRecord(blogPosts.find((item) => item.slug === slug), i18n.resolvedLanguage)?.title || product.title
    }

    return product.title
  }, [blogPosts, i18n.resolvedLanguage, localizedSiteContent, product])
  const destination = getProductDestination(productSlug)
  const dateLocale = i18n.resolvedLanguage === 'en' ? 'en-US' : 'es-PE'
  const formattedReservationDate = reservationDate
    ? new Intl.DateTimeFormat(dateLocale, { dateStyle: 'medium' }).format(
        new Date(`${reservationDate}T00:00:00`),
      )
    : ''

  function getCheckoutBadge(productType) {
    if (productType === 'subscription') {
      return t('checkout.checkoutTypeSubscription')
    }

    if (productType === 'video') {
      return t('checkout.checkoutTypePurchase')
    }

    if (productType === 'physical') {
      return t('checkout.checkoutTypePhysical')
    }

    if (productType === 'reservation') {
      return t('checkout.checkoutTypeReservation')
    }

    return t('checkout.resultProduct')
  }

  function isUnlockedFromSnapshot(nextProduct, snapshot) {
    if (!nextProduct) {
      return true
    }

    if (nextProduct.productType === 'physical') {
      return true
    }

    if (nextProduct.productType === 'reservation') {
      return false
    }

    const activeEntitlements = getActiveEntitlements(snapshot.entitlements || [])

    if (nextProduct.productType === 'subscription') {
      return activeEntitlements.some(
        (item) =>
          item.productSlug === nextProduct.slug ||
          item.entitlementKey === nextProduct.accessScope,
      )
    }

    return activeEntitlements.some(
      (item) => item.entitlementKey === nextProduct.accessScope,
    )
  }

  useEffect(() => {
    let isMounted = true
    let timeoutId

    async function resolveAccess() {
      if (!product) {
        setStatusText(t('checkout.paymentReceived'))
        setIsResolved(true)
        return
      }

      if (product.productType === 'physical') {
        if (physicalOrderRequestId) {
          markPhysicalOrderPaid(physicalOrderRequestId, sessionId || '')
        }
        setStatusText(t('checkout.physicalLibrary'))
        setIsResolved(true)
        timeoutId = setTimeout(() => navigate(destination, { replace: true }), 2200)
        return
      }

      for (let attempt = 0; attempt < 8; attempt += 1) {
        const snapshot = await refreshCommerceData()

        if (product.productType === 'reservation') {
          const reservationPaid = snapshot.orders.some(
            (order) =>
              order.providerOrderId === sessionId &&
              (order.metadata?.productType === 'reservation' ||
                order.metadata?.checkoutType === 'reservation' ||
                order.metadata?.reservationRequestId === reservationRequestId),
          )

          if (reservationPaid) {
            setStatusText(
              t('checkout.reservationLibrary', {
                date: formattedReservationDate || t('checkout.reservationDateFallback'),
                time: reservationTime || t('checkout.reservationTimeFallback'),
                method: paymentMethod || t('checkout.reservationMethodFallback'),
              }),
            )
            setIsResolved(true)
            setShowReservationModal(true)
            timeoutId = setTimeout(() => navigate(destination, { replace: true }), 5200)
            return
          }
        }

        const unlocked = isUnlockedFromSnapshot(product, snapshot)

        if (!isMounted) {
          return
        }

        if (unlocked) {
          setStatusText(t('checkout.ready'))
          setIsResolved(true)
          timeoutId = setTimeout(() => navigate(destination, { replace: true }), 1800)
          return
        }

        setStatusText(t('checkout.processing'))
        await new Promise((resolve) => {
          timeoutId = setTimeout(resolve, 1500)
        })
      }

      if (isMounted) {
        setStatusText(t('checkout.fallback'))
        setIsResolved(true)
      }
    }

    resolveAccess()

    return () => {
      isMounted = false
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [destination, navigate, paymentMethod, physicalOrderRequestId, product, refreshCommerceData, reservationDate, reservationRequestId, reservationTime, sessionId, t])

  const reservationConfirmationTitle = t('checkout.reservationConfirmedTitle')
  const reservationConfirmationDescription = t('checkout.reservationConfirmedDescription', {
    date: formattedReservationDate || t('checkout.reservationDateFallback'),
    time: reservationTime || t('checkout.reservationTimeFallback'),
    method: paymentMethod || t('checkout.reservationMethodFallback'),
  })

  return (
    <main className="creator-home">
      <PublicNav />
      <section className="content-listing-page checkout-page">
        <div className="checkout-shell single-column">
          <article className="checkout-card checkout-card-copy">
            <p className="section-kicker">{t('checkout.paymentReceived')}</p>
            <h1>{t('checkout.checkoutComplete')}</h1>
            <p>{statusText}</p>
            {sessionId ? <p className="admin-note">{t('checkout.sessionLabel', { id: sessionId })}</p> : null}
            {product ? (
              <div className="checkout-summary-card">
                <span>{getCheckoutBadge(product.productType)}</span>
                <h2>{localizedProductTitle}</h2>
                <p>
                  {product.productType === 'video'
                    ? t('checkout.videoReturn')
                    : product.productType === 'subscription'
                      ? t('checkout.subscriptionReturn', {
                          plan: product.metadata?.planPeriod || 'el periodo elegido',
                        })
                      : product.productType === 'reservation'
                        ? t('checkout.reservationReturn', {
                            date: formattedReservationDate || t('checkout.reservationDateFallback'),
                            time: reservationTime || t('checkout.reservationTimeFallback'),
                            method: paymentMethod || t('checkout.reservationMethodFallback'),
                          })
                      : t('checkout.generalReturn')}
                </p>
              </div>
            ) : null}
            <div className="access-session-actions">
              <Link className="hero-primary-cta" to="/">
                {t('access.backHome')}
              </Link>
              <Link className="video-preview-link" to={destination}>
                {isResolved ? t('checkout.openContent') : t('checkout.goLibrary')}
              </Link>
            </div>
          </article>
        </div>
      </section>
      <ReservationConfirmationModal
        open={showReservationModal && product?.productType === 'reservation'}
        title={reservationConfirmationTitle}
        description={reservationConfirmationDescription}
        dateLabel={formattedReservationDate || t('checkout.reservationDateFallback')}
        timeLabel={reservationTime || t('checkout.reservationTimeFallback')}
        methodLabel={paymentMethod || t('checkout.reservationMethodFallback')}
        onClose={() => setShowReservationModal(false)}
        onContinue={() => navigate(destination, { replace: true })}
      />
      <SiteFooter content={siteContent} />
    </main>
  )
}
