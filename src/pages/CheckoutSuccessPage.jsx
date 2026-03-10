import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PublicNav } from '../components/PublicNav'
import { SiteFooter } from '../components/SiteFooter'
import { useAppState } from '../state/AppState'

export function CheckoutSuccessPage() {
  const navigate = useNavigate()
  const {
    getProductBySlug,
    getProductDestination,
    markPhysicalOrderPaid,
    refreshCommerceData,
    siteContent,
  } = useAppState()
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const productSlug = searchParams.get('product')
  const physicalOrderRequestId = searchParams.get('request')
  const [statusText, setStatusText] = useState('Validando tu acceso...')
  const [isResolved, setIsResolved] = useState(false)
  const product = useMemo(
    () => (productSlug ? getProductBySlug(productSlug) : null),
    [getProductBySlug, productSlug],
  )
  const destination = getProductDestination(productSlug)

  function isUnlockedFromSnapshot(nextProduct, snapshot) {
    if (!nextProduct) {
      return true
    }

    if (nextProduct.productType === 'physical') {
      return true
    }

    const activeEntitlements = (snapshot.entitlements || []).filter(
      (item) =>
        item.status === 'active' &&
        (!item.expiresAt || new Date(item.expiresAt).getTime() >= Date.now()),
    )

    if (nextProduct.accessScope === 'all_digital') {
      return activeEntitlements.some((item) => item.entitlementKey === 'all_digital')
    }

    return activeEntitlements.some(
      (item) =>
        item.entitlementKey === 'all_digital' || item.entitlementKey === nextProduct.accessScope,
    )
  }

  useEffect(() => {
    let isMounted = true
    let timeoutId

    async function resolveAccess() {
      if (!product) {
        setStatusText('Pago recibido. Puedes revisar tu biblioteca ahora mismo.')
        setIsResolved(true)
        return
      }

      if (product.productType === 'physical') {
        if (physicalOrderRequestId) {
          markPhysicalOrderPaid(physicalOrderRequestId, sessionId || '')
        }
        setStatusText('La orden fisica ya esta registrada en tu biblioteca.')
        setIsResolved(true)
        timeoutId = setTimeout(() => navigate(destination, { replace: true }), 2200)
        return
      }

      for (let attempt = 0; attempt < 8; attempt += 1) {
        const snapshot = await refreshCommerceData()
        const unlocked = isUnlockedFromSnapshot(product, snapshot)

        if (!isMounted) {
          return
        }

        if (unlocked) {
          setStatusText('Acceso confirmado. Te llevamos a tu contenido desbloqueado...')
          setIsResolved(true)
          timeoutId = setTimeout(() => navigate(destination, { replace: true }), 1800)
          return
        }

        setStatusText('Procesando el desbloqueo en tu cuenta...')
        await new Promise((resolve) => {
          timeoutId = setTimeout(resolve, 1500)
        })
      }

      if (isMounted) {
        setStatusText(
          'El pago ya volvio correctamente. Si el acceso tarda un poco mas, entra a tu biblioteca y recarga en unos segundos.',
        )
        setIsResolved(true)
      }
    }

    resolveAccess()

    return () => {
      isMounted = false
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [destination, navigate, product, refreshCommerceData])

  return (
    <main className="creator-home">
      <PublicNav />
      <section className="content-listing-page checkout-page">
        <div className="checkout-shell single-column">
          <article className="checkout-card checkout-card-copy">
            <p className="section-kicker">Pago recibido</p>
            <h1>Tu checkout se completo correctamente</h1>
            <p>{statusText}</p>
            {sessionId ? <p className="admin-note">Sesion de checkout: {sessionId}</p> : null}
            {product ? (
              <div className="checkout-summary-card">
                <span>{product.productType}</span>
                <h2>{product.title}</h2>
                <p>
                  {product.productType === 'video'
                    ? 'Al confirmarse el acceso, abriremos el detalle del video.'
                    : product.productType === 'subscription'
                      ? `Tu acceso total quedara activo por ${product.metadata?.planPeriod || 'el periodo elegido'} y te llevaremos a tu biblioteca.`
                      : 'Al confirmarse el acceso, te llevaremos a tu biblioteca.'}
                </p>
              </div>
            ) : null}
            <div className="access-session-actions">
              <Link className="hero-primary-cta" to="/">
                Volver a la home
              </Link>
              <Link className="video-preview-link" to={destination}>
                {isResolved ? 'Abrir contenido' : 'Ir a mi biblioteca'}
              </Link>
            </div>
          </article>
        </div>
      </section>
      <SiteFooter content={siteContent} />
    </main>
  )
}
