import { Link, useParams } from 'react-router-dom'
import { PublicNav } from '../components/PublicNav'
import { SiteFooter } from '../components/SiteFooter'
import { useAppState } from '../state/AppState'

export function VideoDetailPage() {
  const { slug } = useParams()
  const { siteContent } = useAppState()
  const video =
    siteContent.videoLibrary.items.find((item) => item.slug === slug) ||
    siteContent.videoLibrary.items[0]

  return (
    <main className="creator-home">
      <PublicNav />
      <article className="content-detail-page">
        <Link className="content-back-link" to="/">
          Volver a la home
        </Link>
        <div className="video-detail-layout">
          <div className="video-detail-player">
            {video.fullVideoUrl ? (
              <video
                src={video.fullVideoUrl}
                poster={video.posterImage}
                controls
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
              <small>{video.accessLabel}</small>
            </div>
            <a
              className="hero-primary-cta"
              href={video.purchaseUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Comprar acceso
            </a>
          </div>
        </div>
      </article>
      <SiteFooter content={siteContent} />
    </main>
  )
}
