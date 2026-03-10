import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '../state/AppState'

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
  const navigate = useNavigate()
  const { getContentAccess, session } = useAppState()
  const access = getContentAccess(`video:${item.slug}`)
  const [error, setError] = useState('')

  async function handlePurchase() {
    if (access.unlocked || !access.product) {
      navigate(`/videos/${item.slug}`)
      return
    }

    setError('')

    if (!session || !session.accessToken) {
      navigate(`/access?redirect=/checkout/start/${access.product.slug}`)
      return
    }

    navigate(`/checkout/start/${access.product.slug}`)
  }

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
          <small>
            {access.unlocked
              ? access.includedBySubscription
                ? 'Incluido en tu suscripcion'
                : 'Desbloqueado'
              : item.accessLabel}
          </small>
        </div>
        <div className="video-card-actions">
          <button className="video-buy-link" type="button" onClick={handlePurchase}>
            {access.unlocked ? 'Ver acceso' : 'Comprar video'}
          </button>
        </div>
        {error ? <p className="admin-error">{error}</p> : null}
      </div>
    </article>
  )
}
