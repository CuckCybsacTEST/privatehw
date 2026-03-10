import { PublicNav } from '../components/PublicNav'
import { SiteFooter } from '../components/SiteFooter'
import { useAppState } from '../state/AppState'

function FreeMediaCard({ item }) {
  const isVideo = item.mediaType === 'video'
  const hasVideo = Boolean(item.mediaUrl)

  return (
    <article className="free-content-card">
      <div className="free-content-visual">
        {isVideo && hasVideo ? (
          <video
            controls
            preload="metadata"
            poster={item.thumbnail || item.image}
            src={item.mediaUrl}
          />
        ) : (
          <img
            src={item.thumbnail || item.image}
            alt={item.title}
            loading="lazy"
            decoding="async"
          />
        )}
        <span className="free-content-badge">
          {isVideo ? 'Video gratis' : 'Foto gratis'}
        </span>
      </div>
      <div className="free-content-copy">
        <div className="free-content-meta">
          <span>{item.category || 'Contenido gratis'}</span>
          <strong>Solo para usuarios registrados</strong>
        </div>
        <h3>{item.title}</h3>
        <p>{item.description}</p>
      </div>
    </article>
  )
}

export function FreeContentPage() {
  const { session, siteContent } = useAppState()
  const content = siteContent.freeContent
  const items = (content.items || []).filter((item) => item.isPublished !== false)

  return (
    <main className="creator-home">
      <PublicNav />
      <section className="free-content-page">
        <div className="free-content-hero">
          <p className="section-kicker">{content.kicker}</p>
          <h1>{content.title}</h1>
          <p>{content.description}</p>
          <div className="free-content-access-note">
            <strong>{session?.name || session?.email}</strong>
            <span>{content.accessNote}</span>
          </div>
        </div>

        <section className="free-content-grid" aria-label="Galeria de contenido gratis">
          {items.map((item) => (
            <FreeMediaCard item={item} key={item.slug} />
          ))}
        </section>
      </section>
      {siteContent.sectionVisibility.siteFooter ? <SiteFooter content={siteContent} /> : null}
    </main>
  )
}
