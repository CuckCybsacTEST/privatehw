import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PublicNav } from '../components/PublicNav'
import { Seo } from '../components/Seo'
import { SiteFooter } from '../components/SiteFooter'
import { useAppState } from '../state/AppState'
import { resolveLocalizedRecord } from '../utils/localizedContent'
import { withBasePath } from '../utils/routes'

function resolveProductVisual(product, siteContent, blogPosts = []) {
  if (!product) {
    return { kind: 'empty', value: '' }
  }

  if (product.productType === 'subscription') {
    return { kind: 'empty', value: '' }
  }

  if (product.productType === 'video') {
    const slug = product.accessScope.replace('video:', '')
    const videoItem = siteContent.videoLibrary.items.find((item) => item.slug === slug)

    return {
      kind: 'video',
      value: videoItem?.previewVideoUrl || videoItem?.fullVideoUrl || '',
    }
  }

  if (product.productType === 'pack') {
    const slug = product.accessScope.replace('pack:', '')
    return { kind: 'image', value: siteContent.videoCollections.items.find((item) => item.slug === slug)?.coverImage || '' }
  }

  if (product.productType === 'physical') {
    const slug = product.accessScope.replace('physical:', '')
    return { kind: 'image', value: siteContent.physicalMerch.items.find((item) => item.slug === slug)?.image || '' }
  }

  if (product.productType === 'reservation') {
    return { kind: 'empty', value: '' }
  }

  if (product.productType === 'blog') {
    const slug = product.metadata?.contentSlug || product.accessScope.replace('blog:', '')
    const blogPost = blogPosts.find((item) => item.slug === slug)

    return {
      kind: 'image',
      value: blogPost?.coverImage || '',
    }
  }

  return { kind: 'empty', value: '' }
}

function buildProductSummary(product, t, displayTitle) {
  if (!product) {
    return { title: t('checkout.resultProduct'), note: '', badge: t('checkout.checkoutType') }
  }

  if (product.productType === 'subscription') {
    return {
      title: displayTitle || product.title,
      badge: t('checkout.checkoutTypeSubscription'),
      note: t('checkout.subscriptionReturn', {
        plan: product.metadata?.planPeriod || t('checkout.planTemporary'),
      }),
    }
  }

  if (product.productType === 'video') {
    return {
      title: displayTitle || product.title,
      badge: t('checkout.checkoutTypePurchase'),
      note: t('checkout.videoReturn'),
    }
  }

  if (product.productType === 'blog') {
    return {
      title: displayTitle || product.title,
      badge: t('checkout.checkoutTypePurchase'),
      note: t('checkout.generalReturn'),
    }
  }

  if (product.productType === 'pack') {
    return {
      title: displayTitle || product.title,
      badge: t('content.curatedPack'),
      note: t('checkout.generalReturn'),
    }
  }

  if (product.productType === 'reservation') {
    return {
      title: displayTitle || product.title,
      badge: t('checkout.checkoutTypeReservation'),
      note: t('checkout.reservationReturn'),
    }
  }

  return {
    title: displayTitle || product.title,
    badge: t('checkout.checkoutTypePhysical'),
    note: t('checkout.generalReturn'),
  }
}

export function CheckoutStartPage() {
  const navigate = useNavigate()
  const basePath =
    typeof window !== 'undefined' && window.location.pathname.startsWith('/sindyprivate')
      ? '/sindyprivate'
      : ''
  const { productSlug } = useParams()
  const { blogPosts, createCheckoutSession, getProductBySlug, session, siteContent } = useAppState()
  const { t, i18n } = useTranslation()
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const product = getProductBySlug(productSlug)
  const productVideoSlug =
    product?.productType === 'video' ? product.accessScope.replace('video:', '') : ''
  const localizedSiteContent = resolveLocalizedRecord(siteContent, i18n.resolvedLanguage)
  const productVideoItem =
    productVideoSlug
      ? localizedSiteContent.videoLibrary.items.find((item) => item.slug === productVideoSlug)
      : null
  const productPackSlug =
    product?.productType === 'pack' ? product.accessScope.replace('pack:', '') : ''
  const productPhysicalSlug =
    product?.productType === 'physical' ? product.accessScope.replace('physical:', '') : ''
  const productBlogSlug =
    product?.productType === 'blog'
      ? product.metadata?.contentSlug || product.accessScope.replace('blog:', '')
      : ''
  const localizedBlogPost =
    productBlogSlug ? resolveLocalizedRecord(blogPosts.find((item) => item.slug === productBlogSlug), i18n.resolvedLanguage) : null
  const localizedProductTitle =
    productVideoItem?.title ||
    (productPackSlug
      ? localizedSiteContent.videoCollections.items.find((item) => item.slug === productPackSlug)?.title
      : '') ||
    (productPhysicalSlug
      ? localizedSiteContent.physicalMerch.items.find((item) => item.slug === productPhysicalSlug)?.title
      : '') ||
    localizedBlogPost?.title ||
    product?.title ||
    ''
  const productSummary = buildProductSummary(product, t, localizedProductTitle)
  const visual = resolveProductVisual(product, localizedSiteContent, blogPosts)
  const videoMode = productVideoItem?.accessMode || 'purchase'
  const videoRedirectHref = productVideoSlug
    ? withBasePath(basePath, `/videos/${productVideoSlug}`)
    : withBasePath(basePath, '/access')

  if (!session) {
    return <Navigate to={withBasePath(basePath, `/access?redirect=/checkout/start/${productSlug}`)} replace />
  }

  if (!product) {
    return <Navigate to={withBasePath(basePath, '/library')} replace />
  }

  if (product.productType === 'video' && videoMode !== 'purchase') {
    return <Navigate to={withBasePath(basePath, `/access?redirect=${encodeURIComponent(videoRedirectHref)}`)} replace />
  }

  async function handleContinue() {
    setError('')
    setIsSubmitting(true)

    try {
      await createCheckoutSession(product.slug)
    } catch (nextError) {
      setError(nextError.message || t('checkout.errorOpenCheckout'))
      setIsSubmitting(false)
    }
  }

  return (
    <main className="creator-home">
      <Seo
        title="Checkout | Kinkly"
        description="Proceso de compra y confirmacion de pago."
        canonicalPath={`/checkout/start/${productSlug}`}
        noindex
      />
      <PublicNav />
      <section className="content-listing-page checkout-page">
        <Link className="content-back-link" to={withBasePath(basePath, '/library')}>
          {t('checkout.backLibrary')}
        </Link>

        <div className="checkout-shell">
          <article className="checkout-card checkout-card-copy">
            <p className="section-kicker">{t('checkout.securePayment')}</p>
            <h1>{t('checkout.reviewTitle')}</h1>
            <p>{t('checkout.reviewDescription')}</p>

            <div className="checkout-summary-card">
              <span>{productSummary.badge}</span>
              <h2>{productSummary.title}</h2>
              <p>{productSummary.note}</p>
              <div className="checkout-price-row">
                <strong>{product.priceLabel}</strong>
                <small>
                  {product.checkoutMode === 'subscription'
                    ? t('checkout.recurrentPayment')
                    : t('checkout.oneTimePayment')}
                </small>
              </div>
              {product.productType === 'subscription' ? (
                <p className="checkout-subscription-note">
                  {t('checkout.duration', { plan: product.metadata?.planPeriod || t('checkout.planTemporary') })}{' '}
                  {t('checkout.manualRenewal')}
                </p>
              ) : null}
            </div>

            <div className="checkout-points">
              <p>{t('checkout.account', { email: session.email })}</p>
              <p>{t('checkout.provider')}</p>
              <p>{t('checkout.access', { scope: product.accessScope || t('checkout.noDigitalAccess') })}</p>
            </div>

            <div className="access-session-actions">
              <button className="hero-primary-cta" type="button" onClick={handleContinue}>
                {isSubmitting ? t('checkout.continuing') : t('checkout.continue')}
              </button>
              <button className="video-preview-link" type="button" onClick={() => navigate(-1)}>
                {t('checkout.cancel')}
              </button>
            </div>
            {error ? <p className="admin-error">{error}</p> : null}
          </article>

          <article className="checkout-card checkout-card-visual">
            {visual.kind === 'video' && visual.value ? (
              <video src={visual.value} controls muted playsInline preload="metadata" />
            ) : visual.kind === 'image' && visual.value ? (
              <img src={visual.value} alt={localizedProductTitle || product.title} loading="eager" decoding="async" />
            ) : null}
          </article>
        </div>
      </section>
      <SiteFooter content={siteContent} basePath={basePath} />
    </main>
  )
}


