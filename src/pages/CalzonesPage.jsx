import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PublicNav } from '../components/PublicNav'
import { Seo } from '../components/Seo'
import { SiteFooter } from '../components/SiteFooter'
import { useAppState } from '../state/AppState'
import { resolveLocalizedSection } from '../utils/localizedContent'

function PhysicalStoreCard({ item }) {
  const { t } = useTranslation()

  return (
    <article className="physical-store-card">
      <div className="physical-store-visual">
        <img src={item.image} alt={item.title} loading="lazy" decoding="async" />
        <span className="physical-store-badge">{item.stockLabel}</span>
      </div>
      <div className="physical-store-copy">
        <div className="physical-store-meta">
          <span>{item.subtitle}</span>
          <strong>{item.priceLabel}</strong>
        </div>
        <h3>{item.title}</h3>
        <p>{item.detailDescription || item.subtitle}</p>
        <Link className="hero-primary-cta" to={`/calzones/${item.slug}`}>
          {item.buyLabel || t('content.buyNow')}
        </Link>
      </div>
    </article>
  )
}

export function CalzonesPage() {
  const { siteContent } = useAppState()
  const { i18n, t } = useTranslation()
  const merch = resolveLocalizedSection(siteContent, 'physicalMerch', i18n.resolvedLanguage)

  return (
    <main className="creator-home physical-store-page-shell">
      <Seo
        title={`${merch.title} | Kinkly`}
        description={merch.description}
        canonicalPath="/calzones"
      />
      <PublicNav />
      <section className="physical-store-page">
        <div className="physical-store-hero">
          <div>
            <p className="section-kicker">{merch.kicker}</p>
            <h1>{merch.title}</h1>
            <p>{merch.description}</p>
          </div>
          <div className="physical-store-panel">
            <h2>{t('physicalStore.panelTitle')}</h2>
            <p>{t('physicalStore.panelDescription')}</p>
            <ul className="physical-store-points">
              <li>{t('physicalStore.point1')}</li>
              <li>{t('physicalStore.point2')}</li>
              <li>{t('physicalStore.point3')}</li>
            </ul>
          </div>
        </div>

        <section className="physical-store-grid" aria-label="Tienda fisica">
          {merch.items.map((item) => (
            <PhysicalStoreCard item={item} key={item.slug} />
          ))}
        </section>

        <div className="physical-store-footer-note">
          <p>{merch.note}</p>
          <Link className="section-more-link section-more-link-collections" to="/library">
            {t('physicalStore.libraryLink')}
          </Link>
        </div>
      </section>
      {siteContent.sectionVisibility.siteFooter ? <SiteFooter content={siteContent} /> : null}
    </main>
  )
}
