import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PackPreviewCard } from './PackPreviewCard'
import { ViewAllPacksCard } from './ViewAllPacksCard'
import { resolveLocalizedSection } from '../utils/localizedContent'
import { useViewportState } from '../hooks/useViewportState'

export function VideoCollectionsSection({ content }) {
  const { i18n, t } = useTranslation()
  const videoCollections = resolveLocalizedSection(content, 'videoCollections', i18n.resolvedLanguage)
  const physicalMerch = resolveLocalizedSection(content, 'physicalMerch', i18n.resolvedLanguage)
  const collectionItems = useMemo(() => videoCollections.items || [], [videoCollections.items])
  const validCollectionItems = useMemo(
    () =>
      collectionItems.filter((item) => Boolean(item.slug) && Boolean(item.coverImage)),
    [collectionItems],
  )
  const previewLimit = Number.isFinite(Number(videoCollections.previewLimit))
    ? Number(videoCollections.previewLimit)
    : 5
  const visibleCollectionItems = useMemo(
    () => validCollectionItems.slice(0, previewLimit),
    [validCollectionItems, previewLimit],
  )
  const browseLabel = videoCollections.browseLabel || t('content.viewAllPacks')
  const { mode: collectionsViewportMode } = useViewportState()
  const requestItems = Array.isArray(physicalMerch.items) ? physicalMerch.items.slice(0, 3) : []

  return (
    <section
      className={`video-collections-section is-collections-${collectionsViewportMode}`}
      id="collections"
    >
      <div className="section-heading section-heading-split video-collections-heading">
        <div className="video-collections-heading-copy">
          <p className="section-kicker">{t('content.packsCategories')}</p>
          <h2>{videoCollections.title || t('content.premiumCatalog')}</h2>
          <p className="video-collections-lede">{videoCollections.description}</p>
        </div>
      </div>

      <div className="video-collections-preview-layout">
        <div className="video-collections-main-column">
          <div className="video-collections-grid">
            {visibleCollectionItems.map((collection) => (
              <PackPreviewCard
                collection={collection}
                key={collection.slug}
              />
            ))}
            <ViewAllPacksCard
              description={videoCollections.description}
              href={videoCollections.browseHref}
              label={browseLabel}
              title={videoCollections.title}
            />
          </div>
        </div>

        <aside className="video-collections-request-panel">
          <div className="video-collections-request-header">
            <p className="video-collections-request-kicker">{physicalMerch.kicker}</p>
            <h3>{physicalMerch.title}</h3>
            <p>{physicalMerch.description}</p>
          </div>

          <div className="video-collections-request-list">
            {requestItems.map((item, index) => (
              <div className="video-collections-request-item" key={item.slug || index}>
                <div className="video-collections-request-item-copy">
                  <strong>{item.title}</strong>
                  {item.subtitle ? <span>{item.subtitle}</span> : null}
                </div>
                <div className="video-collections-request-item-meta">
                  <strong>{item.priceLabel}</strong>
                  {item.stockLabel ? <span>{item.stockLabel}</span> : null}
                </div>
              </div>
            ))}
          </div>

          <Link
            className="hero-primary-cta video-collections-request-cta"
            to={physicalMerch.primaryUrl || '/calzones'}
          >
            {physicalMerch.primaryLabel}
          </Link>

          <p className="video-collections-request-note">
            {physicalMerch.note}
          </p>
        </aside>
      </div>
    </section>
  )
}
