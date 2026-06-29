import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CollectionCard } from '../components/CollectionCard'
import { PublicNav } from '../components/PublicNav'
import { SiteFooter } from '../components/SiteFooter'
import { useAppState } from '../state/AppState'
import { resolveLocalizedSection } from '../utils/localizedContent'

export function CollectionCatalogPage() {
  const { siteContent } = useAppState()
  const { i18n, t } = useTranslation()
  const videoCollections = resolveLocalizedSection(siteContent, 'videoCollections', i18n.resolvedLanguage)

  return (
    <main className="creator-home">
      <PublicNav />
      <section className="content-listing-page">
        <Link className="content-back-link" to="/">
          {t('content.backHome')}
        </Link>

        <div className="section-heading">
          <p className="section-kicker">{t('content.packsCategories')}</p>
          <h1>{videoCollections.title}</h1>
          <p>
            {videoCollections.description} {t('content.fullPacksSuffix')}
          </p>
        </div>

        <div className="video-collections-grid">
          {videoCollections.items.map((collection) => (
            <CollectionCard collection={collection} key={collection.slug} />
          ))}
        </div>
      </section>
      <SiteFooter content={siteContent} />
    </main>
  )
}
