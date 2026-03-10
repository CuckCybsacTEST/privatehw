import { Link, useSearchParams } from 'react-router-dom'
import { PublicNav } from '../components/PublicNav'
import { SiteFooter } from '../components/SiteFooter'
import { useAppState } from '../state/AppState'

export function CheckoutCancelPage() {
  const { siteContent } = useAppState()
  const [searchParams] = useSearchParams()
  const product = searchParams.get('product')

  return (
    <main className="creator-home">
      <PublicNav />
      <section className="content-listing-page access-page">
        <div className="access-layout single-column">
          <article className="access-card access-card-copy">
            <p className="section-kicker">Checkout cancelado</p>
            <h1>La compra no se completo</h1>
            <p>
              No se registro ningun cobro. Puedes volver a intentarlo cuando quieras
              desde el catalogo o desde la seccion de acceso.
            </p>
            {product ? <p className="admin-note">Producto: {product}</p> : null}
            <div className="access-session-actions">
              <Link className="hero-primary-cta" to="/">
                Volver a la home
              </Link>
              <Link className="video-preview-link" to="/library">
                Ir a mi biblioteca
              </Link>
            </div>
          </article>
        </div>
      </section>
      <SiteFooter content={siteContent} />
    </main>
  )
}
