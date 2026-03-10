import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { PublicNav } from '../components/PublicNav'
import { SiteFooter } from '../components/SiteFooter'
import { useAppState } from '../state/AppState'

function resolveProductVisual(product, siteContent) {
  if (!product) {
    return ''
  }

  if (product.productType === 'subscription') {
    return siteContent.accessTotal.heroImage
  }

  if (product.productType === 'video') {
    const slug = product.accessScope.replace('video:', '')
    return siteContent.videoLibrary.items.find((item) => item.slug === slug)?.posterImage || ''
  }

  if (product.productType === 'pack') {
    const slug = product.accessScope.replace('pack:', '')
    return siteContent.videoCollections.items.find((item) => item.slug === slug)?.coverImage || ''
  }

  if (product.productType === 'physical') {
    const slug = product.accessScope.replace('physical:', '')
    return siteContent.physicalMerch.items.find((item) => item.slug === slug)?.image || ''
  }

  return ''
}

function buildProductSummary(product) {
  if (!product) {
    return { title: 'Producto', note: '', badge: 'Checkout' }
  }

  if (product.productType === 'subscription') {
    return {
      title: product.title,
      badge: 'Suscripcion total',
      note: `Desbloquea todo el contenido digital durante ${product.metadata?.planPeriod || 'el periodo del plan'} y suma tiempo si ya tienes acceso activo.`,
    }
  }

  if (product.productType === 'video') {
    return {
      title: product.title,
      badge: 'Compra individual',
      note: 'Al completar el pago, este video quedara desbloqueado de forma persistente en tu biblioteca.',
    }
  }

  if (product.productType === 'pack') {
    return {
      title: product.title,
      badge: 'Pack premium',
      note: 'El pack comprado aparecera en tu biblioteca y mantendra acceso desde tu cuenta.',
    }
  }

  return {
    title: product.title,
    badge: 'Producto fisico',
    note: 'La orden quedara registrada en tu cuenta. Este producto no desbloquea contenido digital.',
  }
}

export function CheckoutStartPage() {
  const navigate = useNavigate()
  const { productSlug } = useParams()
  const { createCheckoutSession, getProductBySlug, session, siteContent } = useAppState()
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const product = getProductBySlug(productSlug)
  const productSummary = buildProductSummary(product)
  const visual = resolveProductVisual(product, siteContent)

  if (!session) {
    return <Navigate to={`/access?redirect=/checkout/start/${productSlug}`} replace />
  }

  if (!product) {
    return <Navigate to="/library" replace />
  }

  async function handleContinue() {
    setError('')
    setIsSubmitting(true)

    try {
      await createCheckoutSession(product.slug)
    } catch (nextError) {
      setError(nextError.message || 'No se pudo abrir el checkout seguro.')
      setIsSubmitting(false)
    }
  }

  return (
    <main className="creator-home">
      <PublicNav />
      <section className="content-listing-page checkout-page">
        <Link className="content-back-link" to="/library">
          Volver a mi biblioteca
        </Link>

        <div className="checkout-shell">
          <article className="checkout-card checkout-card-copy">
            <p className="section-kicker">Pago seguro</p>
            <h1>Revisa tu compra antes de continuar</h1>
            <p>
              Vas a salir temporalmente al checkout alojado en Stripe. Al volver, te
              llevaremos directo a tu contenido desbloqueado o a tu biblioteca.
            </p>

            <div className="checkout-summary-card">
              <span>{productSummary.badge}</span>
              <h2>{productSummary.title}</h2>
              <p>{productSummary.note}</p>
              <div className="checkout-price-row">
                <strong>{product.priceLabel}</strong>
                <small>{product.checkoutMode === 'subscription' ? 'Pago recurrente' : 'Pago unico'}</small>
              </div>
              {product.productType === 'subscription' ? (
                <p className="checkout-subscription-note">
                  Duracion: {product.metadata?.planPeriod || 'Plan temporal'} · Renovacion manual.
                </p>
              ) : null}
            </div>

            <div className="checkout-points">
              <p>Tu cuenta: {session.email}</p>
              <p>Proveedor: Stripe test mode</p>
              <p>Acceso: {product.accessScope || 'Sin acceso digital asociado'}</p>
            </div>

            <div className="access-session-actions">
              <button className="hero-primary-cta" type="button" onClick={handleContinue}>
                {isSubmitting ? 'Abriendo checkout...' : 'Continuar al pago seguro'}
              </button>
              <button className="video-preview-link" type="button" onClick={() => navigate(-1)}>
                Cancelar
              </button>
            </div>
            {error ? <p className="admin-error">{error}</p> : null}
          </article>

          <article className="checkout-card checkout-card-visual">
            {visual ? <img src={visual} alt={product.title} loading="eager" decoding="async" /> : null}
          </article>
        </div>
      </section>
      <SiteFooter content={siteContent} />
    </main>
  )
}

