import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PublicNav } from '../components/PublicNav'
import { Seo } from '../components/Seo'
import { SiteFooter } from '../components/SiteFooter'
import { useAppState } from '../state/AppState'
import { resolveLocalizedSection } from '../utils/localizedContent'
import { withBasePath } from '../utils/routes'

export function PhysicalProductPage() {
  const navigate = useNavigate()
  const basePath =
    typeof window !== 'undefined' && window.location.pathname.startsWith('/sindyprivate')
      ? '/sindyprivate'
      : ''
  const { slug } = useParams()
  const { session, siteContent } = useAppState()
  const { t, i18n } = useTranslation()
  const physicalMerch = resolveLocalizedSection(siteContent, 'physicalMerch', i18n.resolvedLanguage)
  const item = physicalMerch.items.find((entry) => entry.slug === slug) || null

  if (!item) {
    return <Navigate to="/calzones" replace />
  }

  function handleContinue() {
    if (!session) {
      navigate(withBasePath(basePath, `/access?redirect=/calzones/checkout/${item.slug}`))
      return
    }

    navigate(withBasePath(basePath, `/calzones/checkout/${item.slug}`))
  }

  return (
    <main className="creator-home">
      <Seo
        title={`${item.title} | Kinkly`}
        description={`${item.subtitle} ${siteContent.physicalMerch.description}`.trim()}
        canonicalPath={`/calzones/${item.slug}`}
      />
      <PublicNav />
      <section className="content-detail-page physical-product-page">
        <Link className="content-back-link" to={withBasePath(basePath, '/calzones')}>
          {t('physicalCheckout.backStore')}
        </Link>

        <div className="physical-product-layout">
          <article className="physical-product-visual">
            <img src={item.image} alt={item.title} loading="eager" decoding="async" />
            <div className="physical-product-visual-badge">{item.stockLabel}</div>
          </article>

          <article className="physical-product-copy">
            <p className="section-kicker">{siteContent.physicalMerch.kicker}</p>
            <h1>{item.title}</h1>
            <p>{item.subtitle}</p>
            <p>{siteContent.physicalMerch.description}</p>

            <div className="checkout-summary-card">
              <span>{item.subtitle}</span>
              <h2>{item.priceLabel}</h2>
              <p>{item.stockLabel}</p>
            </div>

            <ul className="physical-store-points">
              <li>{t('physicalProduct.detailPoint')}</li>
              <li>{t('physicalProduct.checkoutPoint')}</li>
              <li>{t('physicalProduct.manualCoordinationPoint')}</li>
            </ul>

            <div className="access-session-actions">
              <button className="hero-primary-cta" type="button" onClick={handleContinue}>
                {t('content.buyNow')}
              </button>
              <Link className="video-preview-link" to={withBasePath(basePath, '/calzones')}>
                {t('physicalProduct.moreProducts')}
              </Link>
            </div>
          </article>
        </div>
      </section>
      <SiteFooter content={siteContent} basePath={basePath} />
    </main>
  )
}
