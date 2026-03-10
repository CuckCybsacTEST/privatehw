import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { VideoCard } from './VideoCard'

function shuffleItems(items) {
  const next = [...items]

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
  }

  return next
}

function getMobileCatalogMode() {
  if (typeof window === 'undefined') {
    return 'regular'
  }

  const { innerWidth, innerHeight } = window

  if (innerWidth <= 390 || innerHeight <= 844) {
    return 'compact'
  }

  return 'regular'
}

export function VideoShowcase({ content }) {
  const videoItems = useMemo(() => content.videoLibrary.items || [], [content.videoLibrary.items])
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 900 : false,
  )
  const [mobileCatalogMode, setMobileCatalogMode] = useState(() => getMobileCatalogMode())
  const [visibleItems, setVisibleItems] = useState(() => shuffleItems(videoItems).slice(0, 6))
  const [activeMobilePage, setActiveMobilePage] = useState(0)
  const pauseUntilRef = useRef(0)
  const mobileCardsPerPage = mobileCatalogMode === 'compact' ? 1 : 2
  const mobilePages = useMemo(() => {
    const pages = []

    for (let index = 0; index < visibleItems.length; index += mobileCardsPerPage) {
      pages.push(visibleItems.slice(index, index + mobileCardsPerPage))
    }

    return pages
  }, [mobileCardsPerPage, visibleItems])

  useEffect(() => {
    function handleViewportChange() {
      setIsMobile(window.innerWidth <= 900)
      setMobileCatalogMode(getMobileCatalogMode())
    }

    handleViewportChange()
    window.addEventListener('resize', handleViewportChange)

    return () => window.removeEventListener('resize', handleViewportChange)
  }, [])

  useEffect(() => {
    setVisibleItems(shuffleItems(videoItems).slice(0, 6))
    setActiveMobilePage(0)
  }, [videoItems])

  useEffect(() => {
    if (videoItems.length <= 6) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setVisibleItems((currentItems) => {
        const currentSlugs = new Set(currentItems.map((item) => item.slug))
        const availableItems = videoItems.filter((item) => !currentSlugs.has(item.slug))
        const sourceItems = availableItems.length >= 6 ? availableItems : videoItems

        return shuffleItems(sourceItems).slice(0, 6)
      })
    }, 5600)

    return () => window.clearInterval(intervalId)
  }, [videoItems])

  useEffect(() => {
    if (!isMobile || visibleItems.length <= 1) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      if (Date.now() < pauseUntilRef.current) {
        return
      }

      setActiveMobilePage((currentPage) => (currentPage + 1) % mobilePages.length)
    }, 4600)

    return () => window.clearInterval(intervalId)
  }, [isMobile, mobilePages.length, visibleItems])

  function pauseSlider() {
    pauseUntilRef.current = Date.now() + 5000
  }

  return (
    <section
      className={[
        'video-showcase-section',
        isMobile ? `is-mobile-${mobileCatalogMode}` : '',
      ]
        .filter(Boolean)
        .join(' ')}
      id="videos"
    >
      <div className="section-heading section-heading-split">
        <div>
          <p className="section-kicker">Catalogo premium</p>
          <h2>{content.videoLibrary.title}</h2>
          <p>{content.videoLibrary.description}</p>
        </div>
        <Link className="section-more-link desktop-only" to={content.videoLibrary.browseHref}>
          {content.videoLibrary.browseLabel}
        </Link>
      </div>

      <div
        className={isMobile ? 'video-library-grid is-mobile-slider' : 'video-library-grid'}
        onTouchStart={pauseSlider}
        onPointerDown={pauseSlider}
      >
        {isMobile
          ? mobilePages.map((pageItems, pageIndex) => (
              <div
                className={
                  pageIndex !== activeMobilePage
                    ? 'video-library-slide video-library-slide-page is-hidden'
                    : 'video-library-slide video-library-slide-page'
                }
                key={`page-${pageItems.map((item) => item.slug).join('-')}`}
              >
                {pageItems.map((item) => (
                  <div className="video-library-mobile-card" key={item.slug}>
                    <VideoCard item={item} />
                  </div>
                ))}
              </div>
            ))
          : visibleItems.map((item) => (
              <div className="video-library-slide" key={item.slug}>
                <VideoCard item={item} />
              </div>
            ))}
      </div>

      {isMobile && mobilePages.length > 1 ? (
        <div className="video-library-dots" aria-label="Navegacion del catalogo premium">
          {mobilePages.map((pageItems, index) => (
            <button
              key={`dot-${pageItems.map((item) => item.slug).join('-')}`}
              type="button"
              className={index === activeMobilePage ? 'is-active' : ''}
              aria-label={`Ir al grupo ${index + 1}`}
              onClick={() => {
                pauseSlider()
                setActiveMobilePage(index)
              }}
            />
          ))}
        </div>
      ) : null}

      <div className="section-more-actions">
        <Link className="section-more-link" to={content.videoLibrary.browseHref}>
          {content.videoLibrary.browseLabel}
        </Link>
      </div>
    </section>
  )
}
