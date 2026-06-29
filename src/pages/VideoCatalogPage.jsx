import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HomePreviewRail } from '../components/HomePreviewRail'
import { SiteFooter } from '../components/SiteFooter'
import { VideoCard } from '../components/VideoCard'
import { useAppState } from '../state/AppState'
import { resolveLocalizedSection } from '../utils/localizedContent'
import { shuffleItems } from '../utils/shuffleItems'
import { useViewportState } from '../hooks/useViewportState'

export function VideoCatalogPage() {
  const { siteContent } = useAppState()
  const { i18n } = useTranslation()
  const videoLibrary = resolveLocalizedSection(siteContent, 'videoLibrary', i18n.resolvedLanguage)
  const videoItems = useMemo(() => videoLibrary.items || [], [videoLibrary.items])
  const videoSignature = useMemo(() => videoItems.map((item) => item.slug).join('|'), [videoItems])
  const visibleOrderRef = useRef([])
  const visibleSignatureRef = useRef('')
  const [visibleItemSlugs, setVisibleItemSlugs] = useState([])
  const { mode: catalogViewportMode } = useViewportState({
    desktopBreakpoint: 900,
    compactWidth: 390,
    compactHeight: 740,
    desktopLabel: 'desktop',
    regularLabel: 'regular',
    compactLabel: 'compact',
  })

  if (visibleSignatureRef.current !== videoSignature) {
    visibleSignatureRef.current = videoSignature
    visibleOrderRef.current = shuffleItems(videoItems).map((item) => item.slug)
  }

  const visibleItems = useMemo(() => {
    if (!videoItems.length) {
      return []
    }

    const itemsBySlug = new Map(videoItems.map((item) => [item.slug, item]))

    if (!visibleItemSlugs.length) {
      return visibleOrderRef.current.map((slug) => itemsBySlug.get(slug)).filter(Boolean)
    }

    return visibleItemSlugs.map((slug) => itemsBySlug.get(slug)).filter(Boolean)
  }, [videoItems, visibleItemSlugs])

  useEffect(() => {
    setVisibleItemSlugs(visibleOrderRef.current.length ? visibleOrderRef.current : videoItems.map((item) => item.slug))
  }, [videoSignature])

  return (
    <main className="creator-home home-preview-page video-catalog-home-page">
      <HomePreviewRail />
      <div className="home-preview-main video-catalog-main">
        <section className={`content-listing-page video-catalog-page is-mobile-${catalogViewportMode}`}>
          <div className="video-library-grid">
            {visibleItems.map((item) => (
              <VideoCard item={item} key={item.slug} presentation="catalog" />
            ))}
          </div>
        </section>
        <SiteFooter content={siteContent} />
      </div>
    </main>
  )
}
