import { Link } from 'react-router-dom'
import { PublicNav } from '../components/PublicNav'
import { SiteFooter } from '../components/SiteFooter'
import { VideoCard } from '../components/VideoCard'
import { useAppState } from '../state/AppState'

export function VideoCatalogPage() {
  const { siteContent } = useAppState()

  return (
    <main className="creator-home">
      <PublicNav />
      <section className="content-listing-page">
        <Link className="content-back-link" to="/">
          Volver a la home
        </Link>

        <div className="section-heading">
          <p className="section-kicker">Catalogo premium</p>
          <h1>{siteContent.videoLibrary.title}</h1>
          <p>
            {siteContent.videoLibrary.description} Aqui se muestra el catalogo completo
            disponible en la plataforma.
          </p>
        </div>

        <div className="video-library-grid">
          {siteContent.videoLibrary.items.map((item) => (
            <VideoCard item={item} key={item.slug} />
          ))}
        </div>
      </section>
      <SiteFooter content={siteContent} />
    </main>
  )
}
