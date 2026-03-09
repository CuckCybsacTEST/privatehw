import { useMemo } from 'react'
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

export function VideoShowcase({ content }) {
  const featuredItems = useMemo(
    () => shuffleItems(content.videoLibrary.items).slice(0, 6),
    [content.videoLibrary.items],
  )

  return (
    <section className="video-showcase-section" id="videos">
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

      <div className="video-library-grid">
        {featuredItems.map((item) => (
          <VideoCard item={item} key={item.slug} />
        ))}
      </div>

      <div className="section-more-actions">
        <Link className="section-more-link" to={content.videoLibrary.browseHref}>
          {content.videoLibrary.browseLabel}
        </Link>
      </div>
    </section>
  )
}
