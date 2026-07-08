import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { VideoCard } from './VideoCard'
import { resolveLocalizedSection } from '../utils/localizedContent'
import { shuffleItems } from '../utils/shuffleItems'
import { withBasePath } from '../utils/routes'

export function VideoShowcase({ content, basePath = '' }) {
  const { i18n, t } = useTranslation()
  const videoLibrary = resolveLocalizedSection(content, 'videoLibrary', i18n.resolvedLanguage)
  const visibleItems = useMemo(
    () => shuffleItems(videoLibrary.items || []).slice(0, 8),
    [videoLibrary.items],
  )

  return (
    <section className="video-showcase-section" id="videos">
      <div className="section-heading section-heading-split video-showcase-heading">
        <div className="video-showcase-heading-copy">
          <p className="section-kicker">{t('content.premiumCatalog')}</p>
          <h2>{videoLibrary.title || t('content.premiumCatalog')}</h2>
          <p className="video-showcase-lede">{videoLibrary.description}</p>
        </div>
      </div>

      <div className="video-library-grid video-library-grid-home">
        {visibleItems.map((item) => (
          <VideoCard item={item} presentation="showcase" key={item.slug} basePath={basePath} />
        ))}
      </div>

      <div className="section-more-actions">
        <Link className="section-more-link section-more-link-collections" to={withBasePath(basePath, videoLibrary.browseHref || '/videos')}>
          {videoLibrary.browseLabel}
        </Link>
      </div>
    </section>
  )
}
