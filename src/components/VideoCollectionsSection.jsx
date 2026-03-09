import { useMemo } from 'react'
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
  const featuredCollections = useMemo(
    () => shuffleItems(content.videoCollections.items).slice(0, 4),
    [content.videoCollections.items],
  )

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
        {featuredCollections.map((collection) => (
          <CollectionCard collection={collection} key={collection.slug} />
        ))}
      </div>

      <div className="section-more-actions">
        <Link className="section-more-link" to={content.videoCollections.browseHref}>
          {content.videoCollections.browseLabel}
        </Link>
      </div>
    </section>
  )
}
