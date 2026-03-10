import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PublicNav } from '../components/PublicNav'
import { SiteFooter } from '../components/SiteFooter'
import { useAppState } from '../state/AppState'

export function VideoDetailPage() {
  const navigate = useNavigate()
  const { slug } = useParams()
  const { getContentAccess, session, siteContent } = useAppState()
  const video =
    siteContent.videoLibrary.items.find((item) => item.slug === slug) ||
    siteContent.videoLibrary.items[0]
  const access = getContentAccess(`video:${video.slug}`)
  const [error, setError] = useState('')

  async function handlePurchase() {
    if (access.unlocked || !access.product) {
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
    <main className="creator-home">
      <PublicNav />
      <article className="content-detail-page">
        <Link className="content-back-link" to="/">
          Volver a la home
        </Link>
        <div className="video-detail-layout">
          <div className="video-detail-player">
            {access.unlocked && video.fullVideoUrl ? (
              <video
                src={video.fullVideoUrl}
                poster={video.posterImage}
                controls
                preload="metadata"
              />
            ) : video.previewVideoUrl ? (
              <video
                src={video.previewVideoUrl}
                poster={video.posterImage}
                controls
                muted={!access.unlocked}
                preload="metadata"
              />
            ) : (
              <img src={video.posterImage} alt={video.title} />
            )}
          </div>

          <div className="video-detail-copy">
            <p className="section-kicker">{video.tag}</p>
            <h1>{video.title}</h1>
            <p>{video.description}</p>
            <div className="video-card-access">
              <strong>{video.priceLabel}</strong>
              <small>
                {access.unlocked
                  ? access.includedBySubscription
                    ? 'Incluido en tu suscripcion'
                    : 'Desbloqueado'
                  : video.accessLabel}
              </small>
            </div>
            <button className="hero-primary-cta" type="button" onClick={handlePurchase}>
              {access.unlocked ? 'Acceso concedido' : 'Comprar acceso'}
            </button>
            {error ? <p className="admin-error">{error}</p> : null}
          </div>
        </div>
      </article>
      <SiteFooter content={siteContent} />
    </main>
  )
}
