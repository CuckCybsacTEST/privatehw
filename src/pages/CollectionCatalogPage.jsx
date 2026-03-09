import { Link } from 'react-router-dom'
import { CollectionCard } from '../components/CollectionCard'
import { PublicNav } from '../components/PublicNav'
import { SiteFooter } from '../components/SiteFooter'
import { useAppState } from '../state/AppState'

export function CollectionCatalogPage() {
  const { siteContent } = useAppState()

  return (
    <main className="creator-home">
      <PublicNav />
      <section className="content-listing-page">
        <Link className="content-back-link" to="/">
          Volver a la home
        </Link>

        <div className="section-heading">
          <p className="section-kicker">Packs y categorias</p>
          <h1>{siteContent.videoCollections.title}</h1>
          <p>
            {siteContent.videoCollections.description} Esta vista agrupa todos los packs
            disponibles con una navegacion mas amplia.
          </p>
        </div>

        <div className="video-collections-grid">
          {siteContent.videoCollections.items.map((collection) => (
            <CollectionCard collection={collection} key={collection.slug} />
          ))}
        </div>
      </section>
      <SiteFooter content={siteContent} />
    </main>
  )
}
