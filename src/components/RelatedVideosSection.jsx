import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { VideoCard } from './VideoCard'
import { resolveLocalizedSection } from '../utils/localizedContent'

function shuffleItems(items) {
  const next = [...items]

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
  }

  return next
}

function pickRelatedVideos(items, currentVideo) {
  const pool = (items || []).filter((item) => item.slug !== currentVideo?.slug)

  if (!pool.length) {
    return []
  }

  const sameTagItems = currentVideo?.tag ? pool.filter((item) => item.tag === currentVideo.tag) : []
  const sameAccessItems = currentVideo?.accessLabel
    ? pool.filter((item) => item.accessLabel === currentVideo.accessLabel && item.slug !== currentVideo.slug)
    : []
  const prioritized = [...sameTagItems, ...sameAccessItems].filter(
    (item, index, self) => self.findIndex((candidate) => candidate.slug === item.slug) === index,
  )
  const filler = shuffleItems(pool).filter(
    (item) => !prioritized.some((candidate) => candidate.slug === item.slug),
  )

  return [...prioritized, ...filler].slice(0, 4)
}

export function RelatedVideosSection({ currentVideo, items, browseHref = '/videos', browseLabel = '' }) {
  const { t, i18n } = useTranslation()
  const localizedItems = resolveLocalizedSection({ videoLibrary: { items } }, 'videoLibrary', i18n.resolvedLanguage).items
  const relatedVideos = useMemo(() => pickRelatedVideos(localizedItems, currentVideo), [localizedItems, currentVideo])

  if (!relatedVideos.length) {
    return null
  }

  return (
    <section className="video-related-section">
      <div className="desktop-only">
        <div className="section-heading section-heading-split">
          <div>
            <p className="section-kicker">{t('relatedVideos.kicker')}</p>
            <h2>{t('relatedVideos.title')}</h2>
            <p>{t('relatedVideos.description')}</p>
          </div>
          <Link className="section-more-link section-more-link-collections desktop-only" to={browseHref}>
            {browseLabel}
          </Link>
        </div>

        <div className="video-related-grid">
          {relatedVideos.map((item) => (
            <VideoCard key={item.slug} item={item} presentation="related" />
          ))}
        </div>
      </div>

      <div className="section-more-actions mobile-only">
        <Link className="section-more-link" to={browseHref}>
          {browseLabel || t('content.viewAccess')}
        </Link>
      </div>
    </section>
  )
}
