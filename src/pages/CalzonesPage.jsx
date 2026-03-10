import { Link, useNavigate } from 'react-router-dom'
import { PublicNav } from '../components/PublicNav'
import { SiteFooter } from '../components/SiteFooter'
import { useAppState } from '../state/AppState'

function PhysicalStoreCard({ item, onPurchase }) {
  return (
    <article className="physical-store-card">
      <div className="physical-store-visual">
        <img src={item.image} alt={item.title} loading="lazy" decoding="async" />
        <span className="physical-store-badge">{item.stockLabel}</span>
      </div>
      <div className="physical-store-copy">
        <div className="physical-store-meta">
          <span>{item.subtitle}</span>
          <strong>{item.priceLabel}</strong>
        </div>
        <h3>{item.title}</h3>
        <p>{item.detailDescription || item.subtitle}</p>
        <button className="hero-primary-cta" type="button" onClick={() => onPurchase(item)}>
          Comprar y programar envio
        </button>
      </div>
    </article>
  )
}

export function CalzonesPage() {
  const navigate = useNavigate()
  const { siteContent, session } = useAppState()
  const merch = siteContent.physicalMerch

  function handlePurchase(item) {
    if (!session) {
      navigate(`/access?redirect=/calzones/checkout/${item.slug}`)
      return
    }

    navigate(`/calzones/checkout/${item.slug}`)
  }

  return (
    <main className="creator-home">
      <PublicNav />
      <section className="physical-store-page">
        <div className="physical-store-hero">
          <div>
            <p className="section-kicker">{merch.kicker}</p>
            <h1>{merch.title}</h1>
            <p>{merch.description}</p>
          </div>
          <div className="physical-store-panel">
            <h2>Compra asistida y envio manual</h2>
            <p>
              Elige un producto, completa tus datos de entrega y deja registrado tu pedido
              para que el equipo lo procese y coordine el envio.
            </p>
            <ul className="physical-store-points">
              <li>Checkout seguro para el producto fisico</li>
              <li>Direccion y datos de entrega en tu pedido</li>
              <li>Seguimiento manual desde el panel admin</li>
            </ul>
          </div>
        </div>

        <section className="physical-store-grid" aria-label="Tienda fisica">
          {merch.items.map((item) => (
            <PhysicalStoreCard item={item} key={item.slug} onPurchase={handlePurchase} />
          ))}
        </section>

        <div className="physical-store-footer-note">
          <p>{merch.note}</p>
          <Link className="section-more-link section-more-link-collections" to="/library">
            Ver mi biblioteca
          </Link>
        </div>
      </section>
      {siteContent.sectionVisibility.siteFooter ? <SiteFooter content={siteContent} /> : null}
    </main>
  )
}
