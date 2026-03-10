import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '../state/AppState'

export function CollectionCard({ collection }) {
  const navigate = useNavigate()
  const { getContentAccess, session } = useAppState()
  const access = getContentAccess(`pack:${collection.slug}`)
  const [error, setError] = useState('')

  async function handlePurchase() {
    if (access.unlocked || !access.product) {
      navigate('/packs')
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
    <article className="video-collection-card" key={collection.slug}>
      <div className="video-collection-visual">
        <img
          src={collection.coverImage}
          alt={collection.title}
          loading="lazy"
          decoding="async"
        />
        <div className="video-collection-chip">{collection.category}</div>
        <div className="video-collection-overlay">
          <span>{collection.itemCount}</span>
          <strong>{collection.priceLabel}</strong>
        </div>
      </div>
      <div className="video-collection-copy">
        <div className="video-collection-meta video-collection-meta-top">
          <span>Pack curado</span>
          <strong>{collection.priceLabel}</strong>
        </div>

        <h3>{collection.title}</h3>
        <p>{collection.description}</p>

        <ul className="video-collection-tags">
          {collection.highlights.slice(0, 2).map((highlight) => (
            <li key={highlight}>{highlight}</li>
          ))}
        </ul>

        <p className="video-collection-access">
          {access.unlocked
            ? access.includedBySubscription
              ? 'Incluido en tu suscripcion'
              : 'Desbloqueado'
            : collection.accessLabel}
        </p>

        <div className="video-collection-actions">
          <button className="video-buy-link" type="button" onClick={handlePurchase}>
            {access.unlocked ? 'Ver acceso' : 'Comprar pack'}
          </button>
        </div>
        {error ? <p className="admin-error">{error}</p> : null}
      </div>
    </article>
  )
}
