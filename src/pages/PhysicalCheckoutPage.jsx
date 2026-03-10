import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { PublicNav } from '../components/PublicNav'
import { SiteFooter } from '../components/SiteFooter'
import { useAppState } from '../state/AppState'

const initialForm = {
  recipientName: '',
  phone: '',
  country: '',
  region: '',
  city: '',
  postalCode: '',
  addressLine1: '',
  addressLine2: '',
  reference: '',
  shippingMethod: 'manual_quote',
  carrier: 'manual_review',
  deliveryNotes: '',
}

export function PhysicalCheckoutPage() {
  const navigate = useNavigate()
  const { slug } = useParams()
  const {
    createCheckoutSession,
    createPhysicalOrderRequest,
    getProductByScope,
    session,
    siteContent,
  } = useAppState()
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const item = useMemo(
    () => siteContent.physicalMerch.items.find((entry) => entry.slug === slug) || null,
    [siteContent.physicalMerch.items, slug],
  )
  const product = getProductByScope(`physical:${slug}`)

  if (!session) {
    return <Navigate to={`/access?redirect=/calzones/checkout/${slug}`} replace />
  }

  if (!item || !product) {
    return <Navigate to="/calzones" replace />
  }

  function handleChange(event) {
    const { name, value } = event.target
    setForm((currentForm) => ({ ...currentForm, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const request = createPhysicalOrderRequest({
        ...form,
        productSlug: product.slug,
        productTitle: item.title,
        productImage: item.image,
        priceLabel: item.priceLabel,
      })

      await createCheckoutSession(product.slug, {
        physicalOrderRequestId: request.id,
      })
    } catch (nextError) {
      setError(nextError.message || 'No se pudo iniciar el pedido fisico.')
      setIsSubmitting(false)
    }
  }

  return (
    <main className="creator-home">
      <PublicNav />
      <section className="content-listing-page physical-checkout-page">
        <Link className="content-back-link" to="/calzones">
          Volver a la tienda fisica
        </Link>

        <div className="physical-checkout-layout">
          <article className="checkout-card checkout-card-visual">
            <img src={item.image} alt={item.title} loading="eager" decoding="async" />
          </article>

          <article className="checkout-card checkout-card-copy">
            <p className="section-kicker">Pedido fisico</p>
            <h1>{item.title}</h1>
            <p>
              Completa tus datos de entrega. El pedido quedara registrado para el equipo
              y luego pasaras al pago seguro del producto fisico.
            </p>
            <div className="checkout-summary-card">
              <span>{item.subtitle}</span>
              <h2>{item.priceLabel}</h2>
              <p>{item.stockLabel}</p>
            </div>

            <form className="admin-grid physical-checkout-form" onSubmit={handleSubmit}>
              <label className="admin-field">
                <span>Nombre del destinatario</span>
                <input name="recipientName" value={form.recipientName} onChange={handleChange} required />
              </label>
              <label className="admin-field">
                <span>Telefono</span>
                <input name="phone" value={form.phone} onChange={handleChange} required />
              </label>
              <label className="admin-field">
                <span>Pais</span>
                <input name="country" value={form.country} onChange={handleChange} required />
              </label>
              <label className="admin-field">
                <span>Region / Estado</span>
                <input name="region" value={form.region} onChange={handleChange} required />
              </label>
              <label className="admin-field">
                <span>Ciudad</span>
                <input name="city" value={form.city} onChange={handleChange} required />
              </label>
              <label className="admin-field">
                <span>Codigo postal</span>
                <input name="postalCode" value={form.postalCode} onChange={handleChange} />
              </label>
              <label className="admin-field admin-field-full">
                <span>Direccion principal</span>
                <input name="addressLine1" value={form.addressLine1} onChange={handleChange} required />
              </label>
              <label className="admin-field admin-field-full">
                <span>Direccion complementaria</span>
                <input name="addressLine2" value={form.addressLine2} onChange={handleChange} />
              </label>
              <label className="admin-field admin-field-full">
                <span>Referencia</span>
                <input name="reference" value={form.reference} onChange={handleChange} />
              </label>
              <label className="admin-field">
                <span>Metodo de envio</span>
                <select name="shippingMethod" value={form.shippingMethod} onChange={handleChange}>
                  <option value="manual_quote">Cotizacion manual</option>
                  <option value="national_priority">Nacional prioritario</option>
                  <option value="international_standard">Internacional estandar</option>
                </select>
              </label>
              <label className="admin-field">
                <span>Carrier preferido</span>
                <select name="carrier" value={form.carrier} onChange={handleChange}>
                  <option value="manual_review">Revision manual</option>
                  <option value="olva">Olva</option>
                  <option value="shalom">Shalom</option>
                  <option value="dhl">DHL</option>
                  <option value="fedex">FedEx</option>
                  <option value="other">Otro</option>
                </select>
              </label>
              <label className="admin-field admin-field-full">
                <span>Notas de entrega</span>
                <textarea
                  rows="4"
                  name="deliveryNotes"
                  value={form.deliveryNotes}
                  onChange={handleChange}
                />
              </label>
              <div className="access-session-actions admin-field-full">
                <button className="hero-primary-cta" type="submit">
                  {isSubmitting ? 'Abriendo checkout...' : 'Guardar datos y pagar'}
                </button>
                <button className="video-preview-link" type="button" onClick={() => navigate(-1)}>
                  Cancelar
                </button>
              </div>
              {error ? <p className="admin-error admin-field-full">{error}</p> : null}
            </form>
          </article>
        </div>
      </section>
      <SiteFooter content={siteContent} />
    </main>
  )
}
