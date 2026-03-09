import { Link } from 'react-router-dom'

function VideoPreview({ item }) {
  if (item.previewVideoUrl) {
    return (
      <video
        className="video-preview-player"
        src={item.previewVideoUrl}
        poster={item.posterImage}
        muted
        playsInline
        controls
        preload="metadata"
      />
    )
  }

  return (
    <div className="video-preview-fallback">
      <img src={item.posterImage} alt={item.title} loading="lazy" decoding="async" />
      <span>{item.previewLabel}</span>
    </div>
  )
}

export function VideoCard({ item }) {
  return (
    <article className="video-card" key={item.slug}>
      <VideoPreview item={item} />

      <div className="video-card-copy">
        <div className="video-card-meta">
          <span>{item.tag}</span>
          <span>{item.duration}</span>
        </div>
        <h3>{item.title}</h3>
        <p>{item.description}</p>
        <div className="video-card-access">
          <strong>{item.priceLabel}</strong>
          <small>{item.accessLabel}</small>
        </div>
        <div className="video-card-actions">
          <a
            className="video-buy-link"
            href={item.purchaseUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Comprar video
          </a>
          <Link className="video-preview-link" to={`/videos/${item.slug}`}>
            Ver detalle
          </Link>
        </div>
      </div>
    </article>
  )
}
