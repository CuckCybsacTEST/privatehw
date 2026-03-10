import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { PublicNav } from '../components/PublicNav'
import { SiteFooter } from '../components/SiteFooter'
import { useAppState } from '../state/AppState'

function summarizeAccess(entitlements = []) {
  const activeEntitlements = entitlements.filter((item) => {
    if (item.status !== 'active') {
      return false
    }

    if (item.expiresAt && new Date(item.expiresAt).getTime() < Date.now()) {
      return false
    }

    return true
  })

  const subscriptionEntitlement =
    activeEntitlements.find((item) => item.entitlementKey === 'all_digital') || null

  return {
    total: activeEntitlements.length,
    hasSubscription: Boolean(subscriptionEntitlement),
    subscriptionExpiresAt: subscriptionEntitlement?.expiresAt || null,
  }
}

export function MemberLibraryPage() {
  const {
    blogPosts,
    entitlements,
    formatPriceFromAmount,
    getContentAccess,
    orders,
    products,
    session,
    siteContent,
  } = useAppState()

  const accessSummary = summarizeAccess(entitlements)
  const activeEntitlements = useMemo(
    () =>
      entitlements.filter(
        (item) =>
          item.status === 'active' &&
          (!item.expiresAt || new Date(item.expiresAt).getTime() >= Date.now()),
      ),
    [entitlements],
  )
  const directEntitlementKeys = useMemo(
    () =>
      new Set(
        activeEntitlements
          .filter((item) => item.entitlementKey !== 'all_digital')
          .map((item) => item.entitlementKey),
      ),
    [activeEntitlements],
  )
  const unlockedVideos = useMemo(
    () =>
      siteContent.videoLibrary.items.filter(
        (item) => getContentAccess(`video:${item.slug}`).unlocked,
      ),
    [getContentAccess, siteContent.videoLibrary.items],
  )
  const unlockedPacks = useMemo(
    () =>
      siteContent.videoCollections.items.filter(
        (item) => getContentAccess(`pack:${item.slug}`).unlocked,
      ),
    [getContentAccess, siteContent.videoCollections.items],
  )
  const unlockedBlogPosts = useMemo(
    () =>
      blogPosts.filter(
        (post) =>
          post.status === 'published' &&
          (post.accessLevel === 'free' || accessSummary.hasSubscription),
      ),
    [accessSummary.hasSubscription, blogPosts],
  )
  const activeProducts = useMemo(
    () => new Map(products.map((product) => [product.slug, product])),
    [products],
  )
  const purchasedVideos = useMemo(
    () =>
      unlockedVideos.filter((item) => directEntitlementKeys.has(`video:${item.slug}`)),
    [directEntitlementKeys, unlockedVideos],
  )
  const subscriptionOnlyVideos = useMemo(
    () =>
      unlockedVideos.filter((item) => !directEntitlementKeys.has(`video:${item.slug}`)),
    [directEntitlementKeys, unlockedVideos],
  )
  const purchasedPacks = useMemo(
    () =>
      unlockedPacks.filter((item) => directEntitlementKeys.has(`pack:${item.slug}`)),
    [directEntitlementKeys, unlockedPacks],
  )
  const subscriptionOnlyPacks = useMemo(
    () =>
      unlockedPacks.filter((item) => !directEntitlementKeys.has(`pack:${item.slug}`)),
    [directEntitlementKeys, unlockedPacks],
  )

  function getVideoAccessLabel(slug) {
    const directPurchase = directEntitlementKeys.has(`video:${slug}`)

    if (directPurchase && accessSummary.hasSubscription) {
      return 'Comprado individualmente y tambien incluido en tu suscripcion'
    }

    if (directPurchase) {
      return 'Compra individual permanente'
    }

    if (accessSummary.hasSubscription) {
      return 'Disponible por tu acceso total'
    }

    return 'Desbloqueado'
  }

  function getPackAccessLabel(slug) {
    const directPurchase = directEntitlementKeys.has(`pack:${slug}`)

    if (directPurchase && accessSummary.hasSubscription) {
      return 'Pack comprado y tambien cubierto por suscripcion'
    }

    if (directPurchase) {
      return 'Pack comprado individualmente'
    }

    if (accessSummary.hasSubscription) {
      return 'Disponible por tu acceso total'
    }

    return 'Desbloqueado'
  }

  return (
    <main className="creator-home">
      <PublicNav />
      <section className="content-listing-page member-library-page">
        <div className="section-heading">
          <p className="section-kicker">Biblioteca del cliente</p>
          <h1>Tu acceso y contenido desbloqueado</h1>
          <p>
            Gestiona tu acceso activo, revisa tus compras confirmadas y entra a los
            contenidos que ya tienes disponibles desde tu cuenta.
          </p>
        </div>

        <div className="member-library-overview">
          <article className="member-overview-card">
            <span>Cuenta activa</span>
            <strong>{session?.email}</strong>
            <p>
              {accessSummary.hasSubscription
                ? 'Tu suscripcion total esta activa y desbloquea todo el contenido digital.'
                : 'Tu cuenta mantiene acceso segun tus compras individuales y ordenes confirmadas.'}
            </p>
            {accessSummary.subscriptionExpiresAt ? (
              <p className="member-access-note">
                Activa hasta{' '}
                {new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(
                  new Date(accessSummary.subscriptionExpiresAt),
                )}
              </p>
            ) : null}
          </article>
          <article className="member-overview-card">
            <span>Videos desbloqueados</span>
            <strong>{unlockedVideos.length}</strong>
            <p>
              {purchasedVideos.length} por compra directa y{' '}
              {Math.max(subscriptionOnlyVideos.length, 0)} ampliados por suscripcion.
            </p>
          </article>
          <article className="member-overview-card">
            <span>Packs activos</span>
            <strong>{unlockedPacks.length}</strong>
            <p>
              {purchasedPacks.length} comprados y {Math.max(subscriptionOnlyPacks.length, 0)} disponibles por acceso total.
            </p>
          </article>
          <article className="member-overview-card">
            <span>Ordenes registradas</span>
            <strong>{orders.length}</strong>
            <p>Historial basico de checkout confirmado y sincronizado con Stripe.</p>
          </article>
        </div>

        <section className="member-library-section">
          <div className="section-heading section-heading-split">
            <div>
              <p className="section-kicker">Videos</p>
              <h2>Tu biblioteca de videos</h2>
              <p>
                {accessSummary.hasSubscription
                  ? 'Tu suscripcion activa deja disponible todo el catalogo digital, pero tus compras individuales siguen identificadas dentro de la biblioteca.'
                  : 'Aqui ves solo los videos que ya compraste o tienes desbloqueados.'}
              </p>
            </div>
            <Link className="section-more-link desktop-only" to="/videos">
              Explorar catalogo
            </Link>
          </div>
          <div className="member-library-grid">
            {unlockedVideos.length ? (
              unlockedVideos.map((video) => (
                <article className="member-library-card" key={video.slug}>
                  <img src={video.posterImage} alt={video.title} loading="lazy" decoding="async" />
                  <div className="member-library-card-copy">
                    <span>{video.tag}</span>
                    <h3>{video.title}</h3>
                    <p>{video.description}</p>
                    <p className="member-access-note">{getVideoAccessLabel(video.slug)}</p>
                    <div className="member-library-actions">
                      <Link className="hero-primary-cta" to={`/videos/${video.slug}`}>
                        Ver video
                      </Link>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <article className="content-gated-card">
                <h2>Aun no hay videos desbloqueados</h2>
                <p>Cuando compres un video o actives la suscripcion, aparecera aqui.</p>
                <Link className="hero-primary-cta" to="/videos">
                  Explorar videos
                </Link>
              </article>
            )}
          </div>
        </section>

        <section className="member-library-section">
          <div className="section-heading section-heading-split">
            <div>
              <p className="section-kicker">Packs</p>
              <h2>Tus packs y categorias desbloqueadas</h2>
              <p>Accesos agrupados para bundles, categorias premium y compras por pack.</p>
            </div>
            <Link className="section-more-link desktop-only" to="/packs">
              Ver packs
            </Link>
          </div>
          <div className="member-library-grid compact">
            {unlockedPacks.length ? (
              unlockedPacks.map((pack) => (
                <article className="member-library-card horizontal" key={pack.slug}>
                  <img src={pack.coverImage} alt={pack.title} loading="lazy" decoding="async" />
                  <div className="member-library-card-copy">
                    <span>{pack.category}</span>
                    <h3>{pack.title}</h3>
                    <p>{pack.description}</p>
                    <p className="member-access-note">{getPackAccessLabel(pack.slug)}</p>
                    <div className="member-library-actions">
                      <a
                        className="hero-secondary-cta"
                        href={pack.previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Ver preview
                      </a>
                      <Link className="hero-primary-cta" to="/packs">
                        Abrir catalogo
                      </Link>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <article className="content-gated-card">
                <h2>No hay packs desbloqueados aun</h2>
                <p>Los packs comprados o incluidos en suscripcion apareceran en esta seccion.</p>
                <Link className="hero-primary-cta" to="/packs">
                  Explorar packs
                </Link>
              </article>
            )}
          </div>
        </section>

        <section className="member-library-section">
          <div className="section-heading section-heading-split">
            <div>
              <p className="section-kicker">Editorial</p>
              <h2>Lecturas disponibles desde tu acceso</h2>
              <p>Las publicaciones premium se desbloquean con suscripcion total.</p>
            </div>
            <Link className="section-more-link desktop-only" to="/blog">
              Ir al blog
            </Link>
          </div>
          <div className="member-library-grid compact">
            {unlockedBlogPosts.length ? (
              unlockedBlogPosts.map((post) => (
                <article className="member-library-card" key={post.slug}>
                  <img src={post.coverImage} alt={post.title} loading="lazy" decoding="async" />
                  <div className="member-library-card-copy">
                    <span>{post.category}</span>
                    <h3>{post.title}</h3>
                    <p>{post.excerpt}</p>
                    <div className="member-library-actions">
                      <Link className="hero-primary-cta" to={`/blog/${post.slug}`}>
                        Abrir articulo
                      </Link>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <article className="content-gated-card">
                <h2>Lecturas premium no disponibles</h2>
                <p>Activa la suscripcion total para desbloquear tambien el blog premium.</p>
                <Link className="hero-primary-cta" to="/blog">
                  Ir al blog
                </Link>
              </article>
            )}
          </div>
        </section>

        <section className="member-library-section">
          <div className="section-heading">
            <p className="section-kicker">Historial</p>
            <h2>Ordenes y productos comprados</h2>
            <p>Vista resumida de checkouts confirmados y elementos asociados a tu cuenta.</p>
          </div>

          <div className="member-orders-list">
            {orders.length ? (
              orders.map((order) => (
                <article className="member-order-card" key={order.id}>
                  <div className="member-order-head">
                    <div>
                      <span>Orden</span>
                      <strong>{order.providerOrderId || order.id}</strong>
                    </div>
                    <div>
                      <span>Estado</span>
                      <strong>{order.status}</strong>
                    </div>
                    <div>
                      <span>Total</span>
                      <strong>{formatPriceFromAmount(order.totalAmount, order.currency)}</strong>
                    </div>
                  </div>
                  <div className="member-order-items">
                    {order.items.map((item) => {
                      const product = activeProducts.get(item.productSlug)

                      return (
                        <div className="member-order-item" key={item.id}>
                          <div>
                            <strong>{product?.title || item.productSlug}</strong>
                            <span>{item.productSlug}</span>
                          </div>
                          <small>
                            {formatPriceFromAmount(item.totalAmount, order.currency)}
                          </small>
                        </div>
                      )
                    })}
                  </div>
                </article>
              ))
            ) : (
              <article className="content-gated-card">
                <h2>No hay ordenes registradas aun</h2>
                <p>Cuando completes una compra en Stripe, aparecera aqui.</p>
              </article>
            )}
          </div>
        </section>
      </section>
      <SiteFooter content={siteContent} />
    </main>
  )
}
