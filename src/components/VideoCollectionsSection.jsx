import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CollectionCard } from './CollectionCard'

function shuffleItems(items) {
  const next = [...items]

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
  }

  return next
}

export function VideoCollectionsSection({ content }) {
  const collectionItems = useMemo(() => content.videoCollections.items || [], [content.videoCollections.items])
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 900 : false,
  )
  const [visibleCollections, setVisibleCollections] = useState(() =>
    shuffleItems(collectionItems).slice(0, 4),
  )

  useEffect(() => {
    function handleViewportChange() {
      setIsMobile(window.innerWidth <= 900)
    }

    handleViewportChange()
    window.addEventListener('resize', handleViewportChange)

    return () => window.removeEventListener('resize', handleViewportChange)
  }, [])

  useEffect(() => {
    setVisibleCollections(shuffleItems(collectionItems).slice(0, 4))
  }, [collectionItems, isMobile])

  useEffect(() => {
    if (collectionItems.length <= 4) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setVisibleCollections((currentCollections) => {
        const currentSlugs = new Set(currentCollections.map((item) => item.slug))
        const availableCollections = collectionItems.filter((item) => !currentSlugs.has(item.slug))
        const sourceCollections = availableCollections.length >= 4 ? availableCollections : collectionItems

        return shuffleItems(sourceCollections).slice(0, 4)
      })
    }, isMobile ? 5200 : 4200)

    return () => window.clearInterval(intervalId)
  }, [collectionItems, isMobile])

  return (
    <section className="video-collections-section" id="collections">
      <div className="section-heading section-heading-split">
        <div>
          <p className="section-kicker">Packs y categorias</p>
          <h2>{content.videoCollections.title}</h2>
          <p>{content.videoCollections.description}</p>
        </div>
        <Link
          className="section-more-link desktop-only"
          to={content.videoCollections.browseHref}
        >
          {content.videoCollections.browseLabel}
        </Link>
      </div>

      <div className="video-collections-grid">
        {visibleCollections.map((collection) => (
          <CollectionCard collection={collection} key={collection.slug} />
        ))}
      </div>

      <div className="section-more-actions mobile-only">
        <Link className="section-more-link" to={content.videoCollections.browseHref}>
          {content.videoCollections.browseLabel}
        </Link>
      </div>
    </section>
  )
}
