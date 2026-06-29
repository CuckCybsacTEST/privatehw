import { useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PublicNav } from '../components/PublicNav'
import { SiteFooter } from '../components/SiteFooter'
import { useAppState } from '../state/AppState'
import { resolveLocalizedRecord } from '../utils/localizedContent'
import {
  getActiveDigitalEntitlement,
  getActiveEntitlements,
  getLatestDigitalEntitlement,
} from '../utils/entitlements'

function summarizeAccess(entitlements = []) {
  const activeEntitlements = getActiveEntitlements(entitlements)
  const subscriptionEntitlement = getActiveDigitalEntitlement(entitlements)
  const latestSubscriptionEntitlement = getLatestDigitalEntitlement(entitlements)
  const latestSubscriptionActive = Boolean(subscriptionEntitlement)

  return {
    total: activeEntitlements.length,
    hasSubscription: latestSubscriptionActive,
    latestSubscriptionExpiresAt: latestSubscriptionEntitlement?.expiresAt || null,
    latestSubscriptionActive,
  }
}

function isReservationOrder(order = {}) {
  return (
    order.metadata?.checkoutType === 'reservation' ||
    order.metadata?.productType === 'reservation' ||
    String(order.items?.[0]?.productSlug || '').startsWith('reservation-')
  )
}

export function MemberLibraryPage() {
  const {
    blogPosts,
    entitlements,
    formatPriceFromAmount,
    getPhysicalOrdersForUser,
    orders,
    products,
    session,
    siteContent,
  } = useAppState()
  const { i18n, t } = useTranslation()
  const [searchParams] = useSearchParams()
  const focusTarget = searchParams.get('focus')
  const dateLocale = i18n.resolvedLanguage === 'en' ? 'en-US' : 'es-PE'
  const localizedSiteContent = resolveLocalizedRecord(siteContent, i18n.resolvedLanguage)
  const localizedBlogPosts = useMemo(
    () => blogPosts.map((post) => resolveLocalizedRecord(post, i18n.resolvedLanguage)),
    [blogPosts, i18n.resolvedLanguage],
  )
  const formatBookingDate = (value) =>
    value
      ? new Intl.DateTimeFormat(dateLocale, { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`))
      : ''

  const accessSummary = summarizeAccess(entitlements)
  const hasSubscription = accessSummary.hasSubscription
  const activeEntitlements = useMemo(() => getActiveEntitlements(entitlements), [entitlements])
  const directEntitlementKeys = useMemo(
    () =>
      new Set(
        activeEntitlements
          .filter((item) => !String(item.entitlementKey || '').startsWith('tier:'))
          .map((item) => item.entitlementKey),
      ),
    [activeEntitlements],
  )
  const activeProducts = useMemo(
    () => new Map(products.map((product) => [product.slug, product])),
    [products],
  )
  const purchasedVideos = useMemo(
    () =>
      localizedSiteContent.videoLibrary.items.filter(
        (item) => item.accessMode === 'purchase' && directEntitlementKeys.has(`video:${item.slug}`),
      ),
    [directEntitlementKeys, localizedSiteContent.videoLibrary.items],
  )
  const purchasedPacks = useMemo(
    () =>
      localizedSiteContent.videoCollections.items.filter((item) => directEntitlementKeys.has(`pack:${item.slug}`)),
    [directEntitlementKeys, localizedSiteContent.videoCollections.items],
  )
  const purchasedBlogPosts = useMemo(
    () =>
      localizedBlogPosts.filter(
        (post) => post.status === 'published' && directEntitlementKeys.has(`blog:${post.slug}`),
      ),
    [directEntitlementKeys, localizedBlogPosts],
  )
  const purchasedDigitalItemsCount =
    purchasedVideos.length + purchasedPacks.length + purchasedBlogPosts.length
  const reservationOrders = useMemo(
    () => orders.filter((order) => isReservationOrder(order)),
    [orders],
  )
  const checkoutOrders = useMemo(
    () => orders.filter((order) => !isReservationOrder(order)),
    [orders],
  )
  const physicalOrders = useMemo(
    () => getPhysicalOrdersForUser(session?.id),
    [getPhysicalOrdersForUser, session?.id],
  )

  const libraryAnchors = useMemo(() => {
    const anchors = [{ href: '#library-overview', label: t('memberLibrary.overviewAnchor') }]

    if (!hasSubscription && purchasedVideos.length) {
      anchors.push({ href: '#library-videos', label: t('memberLibrary.videoSectionTitle') })
    }

    if (!hasSubscription && purchasedPacks.length) {
      anchors.push({ href: '#library-packs', label: t('memberLibrary.activePacks') })
    }

    if (!hasSubscription && purchasedBlogPosts.length) {
      anchors.push({ href: '#library-articles', label: t('memberLibrary.moreArticles') })
    }

    anchors.push({ href: '#checkout-history', label: t('memberLibrary.checkoutHistoryTitle') })
    anchors.push({ href: '#reservation-history', label: t('memberLibrary.reservationsTitle') })
    anchors.push({ href: '#physical-orders', label: t('memberLibrary.physicalOrdersTitle') })

    return anchors
  }, [
    hasSubscription,
    purchasedVideos.length,
    purchasedPacks.length,
    purchasedBlogPosts.length,
    t,
  ])

  useEffect(() => {
    if (!focusTarget || !focusTarget.startsWith('pack:')) {
      if (focusTarget === 'reservations') {
        const targetElement = document.getElementById('reservation-history')

        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }

      return
    }

    const targetSlug = focusTarget.replace('pack:', '')
    const targetElement = document.getElementById(`member-pack-${targetSlug}`)

    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [focusTarget])

  function getVideoAccessLabel(slug) {
    if (directEntitlementKeys.has(`video:${slug}`)) {
      return t('memberLibrary.videoAccessPurchased')
    }

    return t('content.viewAccess')
  }

  function getPackAccessLabel(slug) {
    if (directEntitlementKeys.has(`pack:${slug}`)) {
      return t('memberLibrary.packAccessPurchased')
    }

    return t('content.viewAccess')
  }

  function getBlogAccessLabel(slug) {
    if (directEntitlementKeys.has(`blog:${slug}`)) {
      return t('memberLibrary.blogAccessPurchased')
    }

    return t('content.viewAccess')
  }

  return (
    <main className="creator-home">
      <PublicNav />
      <section className="content-listing-page member-library-page">
        <div className="section-heading">
          <p className="section-kicker">{t('memberLibrary.eyebrow')}</p>
          <h1>{t('memberLibrary.title')}</h1>
          <p>
            {hasSubscription ? t('memberLibrary.descriptionSubscription') : t('memberLibrary.descriptionPurchases')}
          </p>
        </div>

        <div className="member-library-shell">
          <aside className="member-library-rail">
            <article className="member-library-rail-card">
              <span>{t('memberLibrary.activeAccount')}</span>
              <strong>{session?.email}</strong>
              <p>{hasSubscription ? t('memberLibrary.activeSubscription') : t('memberLibrary.purchaseAccess')}</p>
              {accessSummary.latestSubscriptionExpiresAt && accessSummary.latestSubscriptionActive ? (
                <p className="member-access-note">
                  {t('memberLibrary.activeUntil', {
                    date: new Intl.DateTimeFormat(dateLocale, { dateStyle: 'medium' }).format(
                      new Date(accessSummary.latestSubscriptionExpiresAt),
                    ),
                  })}
                </p>
              ) : accessSummary.latestSubscriptionExpiresAt ? (
                <p className="member-access-note">
                  {t('memberLibrary.subscriptionExpired', {
                    date: new Intl.DateTimeFormat(dateLocale, { dateStyle: 'medium' }).format(
                      new Date(accessSummary.latestSubscriptionExpiresAt),
                    ),
                  })}
                </p>
              ) : null}
            </article>

            <div className="member-library-rail-stats">
              <article className="member-library-rail-stat">
                <span>{t('memberLibrary.checkoutHistory')}</span>
                <strong>{checkoutOrders.length}</strong>
              </article>
              <article className="member-library-rail-stat">
                <span>{t('memberLibrary.reservationsSummary')}</span>
                <strong>{reservationOrders.length}</strong>
              </article>
              <article className="member-library-rail-stat">
                <span>{t('memberLibrary.physicalOrdersSummary')}</span>
                <strong>{physicalOrders.length}</strong>
              </article>
              <article className="member-library-rail-stat">
                <span>{hasSubscription ? t('memberLibrary.digitalAccess') : t('memberLibrary.purchasedContent')}</span>
                <strong>{hasSubscription ? t('memberLibrary.allContentUnlocked') : purchasedDigitalItemsCount}</strong>
              </article>
            </div>

            <nav className="member-library-rail-nav" aria-label={t('memberLibrary.quickAccess')}>
              {libraryAnchors.map((anchor) => (
                <a key={anchor.href} href={anchor.href}>
                  {anchor.label}
                </a>
              ))}
            </nav>
          </aside>

          <div className="member-library-main">
            <div className="member-library-overview" id="library-overview">
              <article className="member-overview-card">
                <span>{t('memberLibrary.checkoutHistory')}</span>
                <strong>{checkoutOrders.length}</strong>
                <p>{t('memberLibrary.checkoutHistoryDescription')}</p>
              </article>
              <article className="member-overview-card">
                <span>{t('memberLibrary.reservationsSummary')}</span>
                <strong>{reservationOrders.length}</strong>
                <p>{t('memberLibrary.reservationsDescription')}</p>
              </article>
              <article className="member-overview-card">
                <span>{t('memberLibrary.physicalOrdersSummary')}</span>
                <strong>{physicalOrders.length}</strong>
                <p>{t('memberLibrary.physicalOrdersDescription')}</p>
              </article>
              <article className="member-overview-card">
                <span>{hasSubscription ? t('memberLibrary.digitalAccess') : t('memberLibrary.purchasedContent')}</span>
                <strong>{hasSubscription ? t('memberLibrary.allContentUnlocked') : purchasedDigitalItemsCount}</strong>
                <p>
                  {hasSubscription
                    ? t('memberLibrary.allContentUnlockedDescription')
                    : t('memberLibrary.purchasedContentDescription')}
                </p>
              </article>
            </div>

            {hasSubscription ? (
              <section className="member-library-section">
                <article className="content-gated-card">
                  <h2>{t('memberLibrary.allContentUnlocked')}</h2>
                  <p>{t('memberLibrary.allContentUnlockedDescription')}</p>
                </article>
              </section>
            ) : null}

            {!hasSubscription && purchasedVideos.length ? (
              <section className="member-library-section" id="library-videos">
                <div className="section-heading section-heading-split">
                  <div>
                    <p className="section-kicker">{t('memberLibrary.videoSection')}</p>
                    <h2>{t('memberLibrary.videoSectionTitle')}</h2>
                    <p>{t('memberLibrary.videoSectionDescriptionPurchases')}</p>
                  </div>
                  <Link className="section-more-link desktop-only" to="/videos">
                    {t('memberLibrary.exploreCatalog')}
                  </Link>
                </div>
                <div className="member-library-grid">
                  {purchasedVideos.map((video) => (
                    <article className="member-library-card" key={video.slug}>
                      <img src={video.posterImage} alt={video.title} loading="lazy" decoding="async" />
                      <div className="member-library-card-copy">
                        <span>{video.tag}</span>
                        <h3>{video.title}</h3>
                        <p>{video.description}</p>
                        <p className="member-access-note">{getVideoAccessLabel(video.slug)}</p>
                        <div className="member-library-actions">
                          <Link className="hero-primary-cta" to={`/videos/${video.slug}`}>
                            {t('content.viewAccess')}
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {!hasSubscription && purchasedPacks.length ? (
              <section className="member-library-section" id="library-packs">
                <div className="section-heading section-heading-split">
                  <div>
                    <p className="section-kicker">{t('content.packsCategories')}</p>
                    <h2>{t('memberLibrary.activePacks')}</h2>
                    <p>{t('memberLibrary.videoSectionDescriptionPurchases')}</p>
                  </div>
                  <Link className="section-more-link desktop-only" to="/packs">
                    {t('memberLibrary.exploreCatalog')}
                  </Link>
                </div>
                <div className="member-library-grid compact">
                  {purchasedPacks.map((pack) => (
                    <article
                      className={
                        focusTarget === `pack:${pack.slug}`
                          ? 'member-library-card horizontal is-highlighted'
                          : 'member-library-card horizontal'
                      }
                      key={pack.slug}
                      id={`member-pack-${pack.slug}`}
                    >
                      <img src={pack.coverImage} alt={pack.title} loading="lazy" decoding="async" />
                      <div className="member-library-card-copy">
                        <span>{t('content.curatedPack')}</span>
                        <h3>{pack.title}</h3>
                        <p>{pack.description}</p>
                        <p className="member-access-note">{getPackAccessLabel(pack.slug)}</p>
                        {Array.isArray(pack.assets) && pack.assets.length ? (
                          <div className="member-pack-assets">
                            {pack.assets.map((asset, index) => (
                              <div className="member-pack-asset" key={asset.id || `${pack.slug}-asset-${index}`}>
                                <span>{asset.mediaType === 'video' ? t('admin.content.video') : t('admin.content.image')}</span>
                                <strong>{asset.title}</strong>
                                {asset.mediaType === 'video' ? (
                                  <a href={asset.mediaUrl} target="_blank" rel="noreferrer noopener">
                                    {t('content.preview')}
                                  </a>
                                ) : asset.image ? (
                                  <a href={asset.image} target="_blank" rel="noreferrer noopener">
                                    {t('content.viewAccess')}
                                  </a>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : null}
                        <div className="member-library-actions">
                          {pack.previewUrl ? (
                            <a
                              className="hero-secondary-cta"
                              href={pack.previewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {t('content.preview')}
                            </a>
                          ) : null}
                          <Link className="hero-primary-cta" to={`/packs/${pack.slug}`}>
                            {t('content.viewAccess')}
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {!hasSubscription && purchasedBlogPosts.length ? (
              <section className="member-library-section" id="library-articles">
                <div className="section-heading section-heading-split">
                  <div>
                    <p className="section-kicker">{t('content.editorial')}</p>
                    <h2>{t('content.moreArticles')}</h2>
                    <p>{t('memberLibrary.videoSectionDescriptionPurchases')}</p>
                  </div>
                  <Link className="section-more-link desktop-only" to="/blog">
                    {t('content.backBlog')}
                  </Link>
                </div>
                <div className="member-library-grid compact">
                  {purchasedBlogPosts.map((post) => (
                    <article className="member-library-card" key={post.slug}>
                      <img src={post.coverImage} alt={post.title} loading="lazy" decoding="async" />
                      <div className="member-library-card-copy">
                        <span>{post.category}</span>
                        <h3>{post.title}</h3>
                        <p>{post.excerpt}</p>
                        <p className="member-access-note">{getBlogAccessLabel(post.slug)}</p>
                        <div className="member-library-actions">
                          <Link className="hero-primary-cta" to={`/blog/${post.slug}`}>
                            {t('content.readFull')}
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="member-library-section" id="checkout-history">
              <div className="section-heading">
                <p className="section-kicker">{t('memberLibrary.checkoutHistory')}</p>
                <h2>{t('memberLibrary.checkoutHistoryTitle')}</h2>
                <p>{t('memberLibrary.checkoutHistoryDescription')}</p>
              </div>
              <div className="member-orders-list">
                {checkoutOrders.length ? (
                  checkoutOrders.map((order) => (
                    <article className="member-order-card" key={order.id}>
                      <div className="member-order-head">
                        <div>
                          <span>{t('checkout.checkoutType')}</span>
                          <strong>{order.providerOrderId || order.id}</strong>
                        </div>
                        <div>
                          <span>{t('content.articleStatus')}</span>
                          <strong>{order.status}</strong>
                        </div>
                        <div>
                          <span>{t('content.summary')}</span>
                          <strong>{formatPriceFromAmount(order.totalAmount, order.currency)}</strong>
                        </div>
                      </div>
                      <div className="member-order-items">
                        {order.items.map((item) => {
                          const product = activeProducts.get(item.productSlug)
                          const localizedProductTitle =
                            localizedSiteContent.videoLibrary.items.find(
                              (entry) => entry.slug === item.productSlug.replace('video-', ''),
                            )?.title ||
                            localizedSiteContent.videoCollections.items.find(
                              (entry) => entry.slug === item.productSlug.replace('pack-', ''),
                            )?.title ||
                            localizedSiteContent.physicalMerch.items.find(
                              (entry) => entry.slug === item.productSlug.replace('physical-', ''),
                            )?.title ||
                            localizedBlogPosts.find(
                              (entry) => entry.slug === item.productSlug.replace('blog-', ''),
                            )?.title ||
                            product?.title

                          return (
                            <div className="member-order-item" key={item.id}>
                              <div>
                                <strong>{localizedProductTitle || item.productSlug}</strong>
                                <span>{item.productSlug}</span>
                              </div>
                              <small>{formatPriceFromAmount(item.totalAmount, order.currency)}</small>
                            </div>
                          )
                        })}
                      </div>
                    </article>
                  ))
                ) : (
                  <article className="content-gated-card">
                    <h2>{t('memberLibrary.noOrders')}</h2>
                    <p>{t('memberLibrary.noOrdersDescription')}</p>
                  </article>
                )}
              </div>
            </section>

            <section className="member-library-section" id="reservation-history">
              <div className="section-heading section-heading-split">
                <div>
                  <p className="section-kicker">{t('memberLibrary.reservations')}</p>
                  <h2>{t('memberLibrary.reservationsTitle')}</h2>
                  <p>{t('memberLibrary.reservationsDescription')}</p>
                </div>
              </div>
              <div className="member-orders-list">
                {reservationOrders.length ? (
                  reservationOrders.map((order) => (
                    <article className="member-order-card" key={order.id}>
                      <div className="member-order-head">
                        <div>
                          <span>{t('memberLibrary.reservationDate')}</span>
                          <strong>
                            {formatBookingDate(order.metadata?.reservationDate) ||
                              t('memberLibrary.noReservationDate')}
                          </strong>
                        </div>
                        <div>
                          <span>{t('memberLibrary.reservationTime')}</span>
                          <strong>
                            {order.metadata?.reservationTime || t('memberLibrary.noReservationTime')}
                          </strong>
                        </div>
                        <div>
                          <span>{t('content.summary')}</span>
                          <strong>{formatPriceFromAmount(order.totalAmount, order.currency)}</strong>
                        </div>
                      </div>
                      <div className="member-order-items">
                        <div className="member-order-item">
                          <div>
                            <strong>{order.metadata?.paymentMethod || t('memberLibrary.reservationMethod')}</strong>
                            <span>{order.providerOrderId || order.id}</span>
                          </div>
                          <small>{order.status}</small>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <article className="content-gated-card">
                    <h2>{t('memberLibrary.noReservations')}</h2>
                    <p>{t('memberLibrary.noReservationsDescription')}</p>
                  </article>
                )}
              </div>
            </section>

            <section className="member-library-section" id="physical-orders">
              <div className="section-heading section-heading-split">
                <div>
                  <p className="section-kicker">{t('memberLibrary.physicalOrders')}</p>
                  <h2>{t('memberLibrary.physicalOrdersTitle')}</h2>
                  <p>{t('memberLibrary.physicalOrdersDescription')}</p>
                </div>
                <Link className="section-more-link desktop-only" to="/calzones">
                  {t('memberLibrary.goStore')}
                </Link>
              </div>
              <div className="member-orders-list">
                {physicalOrders.length ? (
                  physicalOrders.map((order) => (
                    <article
                      className={focusTarget === 'physical-orders' ? 'member-order-card is-highlighted' : 'member-order-card'}
                      key={order.id}
                    >
                      <div className="member-order-head">
                        <div>
                          <span>{t('checkout.resultProduct')}</span>
                          <strong>{order.productTitle}</strong>
                        </div>
                        <div>
                          <span>{t('content.articleStatus')}</span>
                          <strong>{order.shippingStatus}</strong>
                        </div>
                        <div>
                          <span>{t('content.summary')}</span>
                          <strong>{order.priceLabel}</strong>
                        </div>
                      </div>
                      <div className="member-order-items">
                        <div className="member-order-item">
                          <div>
                            <strong>
                              {order.city}, {order.country}
                            </strong>
                            <span>{order.addressLine1}</span>
                          </div>
                          <small>{order.carrier || t('memberLibrary.ordersDescription')}</small>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <article className="content-gated-card">
                    <h2>{t('memberLibrary.noPhysicalOrders')}</h2>
                    <p>{t('memberLibrary.noPhysicalOrdersDescription')}</p>
                    <Link className="hero-primary-cta" to="/calzones">
                      {t('memberLibrary.visitStore')}
                    </Link>
                  </article>
                )}
              </div>
            </section>
          </div>
        </div>
      </section>
      <SiteFooter content={siteContent} />
    </main>
  )
}
