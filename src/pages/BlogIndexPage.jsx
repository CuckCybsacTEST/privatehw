import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AtmosphericBackdrop } from '../components/AtmosphericBackdrop'
import { PublicNav } from '../components/PublicNav'
import { Seo } from '../components/Seo'
import { SiteFooter } from '../components/SiteFooter'
import { useAppState } from '../state/AppState'
import { resolveLocalizedRecord, resolveLocalizedSection } from '../utils/localizedContent'

function formatPostDate(value, t, locale = 'es-PE') {
  if (!value) {
    return t('content.noDate')
  }

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function formatBannerSlot(slot, t) {
  if (!slot || slot === 'none') {
    return ''
  }

  if (slot === 'launch') {
    return t('content.bannerLaunch')
  }

  if (slot === 'community') {
    return t('content.bannerCommunity')
  }

  if (slot === 'upgrade') {
    return t('content.bannerUpgrade')
  }

  return slot
}

function getAccessBadgeMeta(post, t) {
  const translate = typeof t === 'function' ? t : null

  if (post.accessLevel === 'purchase') {
    return {
      label: translate ? translate('content.purchaseAccess') : 'Compra individual',
      className: 'is-purchase',
    }
  }

  if (post.accessLevel === 'subscription') {
    return {
      label: translate ? translate('content.subscriptionAccess') : 'Acceso con suscripcion',
      className: 'is-subscription',
    }
  }

  if (post.accessLevel === 'registered') {
    return {
      label: translate ? translate('content.registeredAccess') : 'Acceso para registrados',
      className: 'is-registered',
    }
  }

  return {
    label: translate ? translate('content.openReading') : 'Lectura abierta',
    className: 'is-open',
  }
}

function ActionLink({ className, href, children }) {
  if (!href) {
    return null
  }

  if (href.startsWith('/')) {
    return (
      <Link className={className} to={href}>
        {children}
      </Link>
    )
  }

  return (
    <a className={className} href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
}

export function BlogIndexPage() {
  const {
    blogPosts,
    getContentAccess,
    getProductBySlug,
    hasSubscriptionGrant,
    session,
    siteContent,
  } = useAppState()
  const { i18n, t } = useTranslation()
  const blogPage = resolveLocalizedSection(siteContent, 'blogPage', i18n.resolvedLanguage)
  const isAdmin = session?.role === 'admin'
  const [activeCategory, setActiveCategory] = useState('all')
  const [visibleGridCount, setVisibleGridCount] = useState(8)
  const [showAllLatestTopics, setShowAllLatestTopics] = useState(false)
  const [showAllFreeArticles, setShowAllFreeArticles] = useState(false)

  const visiblePosts = useMemo(
    () =>
      blogPosts
        .filter((post) => {
          if (isAdmin) {
            return post.status !== 'archived'
          }

          if (post.status !== 'published') {
            return false
          }

          if (post.scheduledAt && new Date(post.scheduledAt).getTime() > Date.now()) {
            return false
          }

          return true
        })
        .sort((left, right) => {
          const leftTime = left.publishedAt ? new Date(left.publishedAt).getTime() : 0
          const rightTime = right.publishedAt ? new Date(right.publishedAt).getTime() : 0
          return rightTime - leftTime
        }),
    [blogPosts, isAdmin],
  )

  const categories = useMemo(() => {
    const counts = visiblePosts.reduce((accumulator, post) => {
      const key = post.category || 'General'
      accumulator.set(key, (accumulator.get(key) || 0) + 1)
      return accumulator
    }, new Map())

    const registryCategories = Array.from(
      new Set((blogPage.taxonomy?.categories || []).map((category) => String(category || '').trim()).filter(Boolean)),
    )
    const postCategories = Array.from(
      new Set(visiblePosts.map((post) => String(post.category || 'General').trim()).filter(Boolean)),
    )
    const orderedCategories = [
      ...registryCategories,
      ...postCategories.filter((category) => !registryCategories.includes(category)),
    ]

    return orderedCategories.map((label) => ({
      label,
      count: counts.get(label) || 0,
    }))
  }, [blogPage.taxonomy?.categories, visiblePosts])

  useEffect(() => {
    if (activeCategory === 'all') {
      return
    }

    if (!categories.some((category) => category.label === activeCategory)) {
      setActiveCategory('all')
    }
  }, [activeCategory, categories])

  useEffect(() => {
    setVisibleGridCount(8)
  }, [activeCategory])

  useEffect(() => {
    setShowAllLatestTopics(false)
    setShowAllFreeArticles(false)
  }, [activeCategory])

  const filteredPosts = useMemo(
    () =>
      activeCategory === 'all'
        ? visiblePosts
        : visiblePosts.filter((post) => post.category === activeCategory),
    [activeCategory, visiblePosts],
  )

  const featuredPost = useMemo(
    () =>
      filteredPosts.find((post) => post.featuredSlot === 'primary') ||
      filteredPosts.find((post) => post.featuredSlot === 'secondary') ||
      null,
    [filteredPosts],
  )
  const localizedFeaturedPost = featuredPost
    ? resolveLocalizedRecord(featuredPost, i18n.resolvedLanguage)
    : null
  const secondaryFeaturedPost = useMemo(
    () =>
      filteredPosts.find((post) => post.featuredSlot === 'secondary' && post.slug !== featuredPost?.slug) ||
      null,
    [featuredPost, filteredPosts],
  )
  const localizedSpotlightPost = secondaryFeaturedPost
    ? resolveLocalizedRecord(secondaryFeaturedPost, i18n.resolvedLanguage)
    : null
  const featuredAction = featuredPost ? getPostAction(featuredPost) : null

  const spotlightPost = secondaryFeaturedPost
  const spotlightAction = spotlightPost ? getPostAction(spotlightPost) : null

  const gridPosts = useMemo(
    () =>
      filteredPosts.filter(
        (post) =>
          post.slug !== featuredPost?.slug &&
          post.slug !== spotlightPost?.slug,
      ),
    [featuredPost, filteredPosts, spotlightPost],
  )
  const freeArticlePool = gridPosts.filter((post) => post.accessLevel === 'public')
  const freeArticlePosts = freeArticlePool.slice(0, showAllFreeArticles ? 8 : 4)
  const hasMoreFreeArticles = freeArticlePool.length > freeArticlePosts.length
  const shownFreeArticleSlugs = new Set(freeArticlePosts.map((post) => post.slug))
  const feedGridPosts = gridPosts.filter((post) => !shownFreeArticleSlugs.has(post.slug))
  const latestTopics = feedGridPosts.slice(0, showAllLatestTopics ? 8 : 5)
  const hasMoreLatestTopics = feedGridPosts.length > latestTopics.length
  const visibleGridPosts = feedGridPosts.slice(0, visibleGridCount)
  const hasMoreGridPosts = visibleGridPosts.length < feedGridPosts.length

  const showRegisteredCta =
    !session && filteredPosts.some((post) => post.accessLevel === 'registered')
  const showSubscriptionCta =
    !isAdmin &&
    !hasSubscriptionGrant('blog') &&
    filteredPosts.some((post) => post.accessLevel === 'subscription')

  const featuredAccessBadge = featuredPost ? getAccessBadgeMeta(featuredPost, t) : null
  const spotlightAccessBadge = spotlightPost ? getAccessBadgeMeta(spotlightPost, t) : null

  function getBlogPurchaseProduct(post) {
    return post?.accessLevel === 'purchase' ? getProductBySlug(`blog-${post.slug}`) : null
  }

  function getPostAction(post) {
    const access = getContentAccess(`blog:${post.slug}`)
    const purchaseProduct = getBlogPurchaseProduct(post)

    if (isAdmin || access.unlocked) {
      return { label: t('content.readFull'), href: `/blog/${post.slug}` }
    }

    if (post.accessLevel === 'registered') {
      return {
        label: blogPage.ctaRegistered.ctaLabel,
        href: `/access?redirect=/blog/${post.slug}`,
      }
    }

    if (post.accessLevel === 'purchase') {
      return {
        label: t('content.buyArticle'),
        href: `/checkout/start/${purchaseProduct?.slug || `blog-${post.slug}`}`,
        priceLabel: purchaseProduct?.priceLabel || post.priceLabel || '',
      }
    }

    return {
      label: blogPage.ctaSubscription.ctaLabel,
      href: blogPage.ctaSubscription.ctaUrl,
    }
  }

  function getPriceLabel(post) {
    return getPostAction(post)?.priceLabel || ''
  }

  function getCardCtaClassName(post) {
    return post.accessLevel === 'purchase'
      ? 'section-more-link blog-card-cta is-purchase-cta'
      : 'section-more-link blog-card-cta'
  }

  return (
    <main className="creator-home">
      <Seo
        title={`${blogPage.heroTitle} | Kinkly`}
        description={blogPage.heroDescription}
        canonicalPath="/blog"
      />
      <PublicNav />
      <section className="content-listing-page blog-index-page">
        <AtmosphericBackdrop
          variant="editorial"
          intensity="medium"
          glowPosition="center-right"
          className="blog-index-backdrop"
        />
        <div className="blog-index-hero">
          <div className="section-heading blog-index-heading">
            <p className="section-kicker">{blogPage.heroKicker}</p>
            <h1>{blogPage.heroTitle}</h1>
            <p>{blogPage.heroDescription}</p>
          </div>
        </div>

        <div className="blog-toolbar">
          <div className="blog-categories">
            <div className="blog-category-label">
              <span className="section-kicker">{blogPage.categoriesLabel}</span>
            </div>
            <div className="blog-category-list">
              <button
                type="button"
                className={activeCategory === 'all' ? 'blog-filter-chip is-active' : 'blog-filter-chip'}
                onClick={() => setActiveCategory('all')}
              >
                {t('content.all')} <small>{visiblePosts.length}</small>
              </button>
              {categories.map((category) => (
                <button
                  key={category.label}
                  type="button"
                  className={
                    activeCategory === category.label
                      ? 'blog-filter-chip is-active'
                      : 'blog-filter-chip'
                  }
                  onClick={() => setActiveCategory(category.label)}
                >
                  {category.label} <small>{category.count}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="blog-toolbar-summary">
            <p>
              {filteredPosts.length} {blogPage.totalPostsLabel}
            </p>
            {showRegisteredCta ? (
              <ActionLink className="section-more-link blog-summary-link" href={blogPage.ctaRegistered.ctaUrl}>
                {blogPage.ctaRegistered.ctaLabel}
              </ActionLink>
            ) : showSubscriptionCta ? (
              <ActionLink className="section-more-link blog-summary-link" href={blogPage.ctaSubscription.ctaUrl}>
                {blogPage.ctaSubscription.ctaLabel}
              </ActionLink>
            ) : (
              <ActionLink className="section-more-link blog-summary-link" href={blogPage.bannerSecondary.ctaUrl}>
                {blogPage.bannerSecondary.ctaLabel}
              </ActionLink>
            )}
          </div>
        </div>

        {featuredPost ? (
          <>
            <div className="blog-editorial-layout blog-index-board">
              <div className="blog-index-main-column">
                <div className="blog-featured-stories">
              {featuredPost ? (
                <article className="blog-featured-story-card is-primary">
                  <div className="blog-featured-story-card-topline">
                    <span>{blogPage.featuredLabel}</span>
                    <small>
                          {localizedFeaturedPost?.category || featuredPost.category}
                          {featuredPost.readingTime ? ` · ${featuredPost.readingTime}` : ''}
                    </small>
                  </div>
                  {getPriceLabel(featuredPost) ? (
                    <div className="blog-price-banner is-prominent">{getPriceLabel(featuredPost)}</div>
                  ) : null}
                  <h2>{localizedFeaturedPost?.title || featuredPost.title}</h2>
                  <p>{localizedFeaturedPost?.excerpt || featuredPost.excerpt}</p>
                  <div className="blog-featured-story-card-actions">
                    {featuredAction ? (
                      <ActionLink className={getCardCtaClassName(featuredPost)} href={featuredAction.href}>
                        {featuredAction.label}
                      </ActionLink>
                        ) : null}
                      </div>
                    </article>
                  ) : null}

                  {spotlightPost ? (
                    <article className="blog-featured-story-card is-secondary">
                      <div className="blog-featured-story-card-topline">
                        <span>{formatBannerSlot(spotlightPost.bannerSlot, t) || localizedSpotlightPost?.category || spotlightPost.category}</span>
                        <small>
                          {formatPostDate(
                            spotlightPost.publishedAt,
                            t,
                            i18n.resolvedLanguage === 'en' ? 'en-US' : 'es-PE',
                          )}
                          {spotlightPost.readingTime ? ` · ${spotlightPost.readingTime}` : ''}
                        </small>
                      </div>
                      {getPriceLabel(spotlightPost) ? (
                        <div className="blog-price-banner is-prominent">{getPriceLabel(spotlightPost)}</div>
                      ) : null}
                      <h2>{localizedSpotlightPost?.title || spotlightPost.title}</h2>
                      <p>{localizedSpotlightPost?.excerpt || spotlightPost.excerpt}</p>
                      <div className="blog-featured-story-card-actions">
                        {spotlightAction ? (
                          <ActionLink className={getCardCtaClassName(spotlightPost)} href={spotlightAction.href}>
                            {spotlightAction.label}
                          </ActionLink>
                        ) : null}
                      </div>
                    </article>
                  ) : null}
                </div>

                {freeArticlePosts.length ? (
                  <section className="blog-free-articles-section">
                    <div className="blog-free-articles-grid">
                      {freeArticlePosts.map((post) => {
                        const displayPost = resolveLocalizedRecord(post, i18n.resolvedLanguage)
                        const action = getPostAction(post)
                        const priceLabel = action.priceLabel || ''
                        return (
                          <article className="blog-free-article-card" key={post.slug}>
                            <div className="blog-card-text-frame">
                              <div className="blog-card-text-frame-topline">
                                <span>{displayPost.category}</span>
                                <small>
                                  {formatPostDate(
                                    post.publishedAt,
                                    t,
                                    i18n.resolvedLanguage === 'en' ? 'en-US' : 'es-PE',
                                  )}
                                  {post.readingTime ? ` · ${post.readingTime}` : ''}
                                </small>
                              </div>
                              {priceLabel ? <div className="blog-price-banner">{priceLabel}</div> : null}
                              <h3>{displayPost.title}</h3>
                              <p>{displayPost.excerpt}</p>
                              {action ? (
                                <ActionLink className={getCardCtaClassName(post)} href={action.href}>
                                  {action.label}
                                </ActionLink>
                              ) : null}
                            </div>
                          </article>
                        )
                      })}
                    </div>
                    {hasMoreFreeArticles ? (
                      <button
                        type="button"
                        className="section-more-link blog-free-articles-toggle"
                        onClick={() => setShowAllFreeArticles((current) => !current)}
                      >
                        {showAllFreeArticles
                          ? t('content.hideArticles')
                          : t('content.showMoreFreeArticles')}
                      </button>
                    ) : null}
                  </section>
                ) : null}
              </div>

              <div className="blog-index-rail">
                <div className="blog-context-stack">
                  <article className="blog-context-card">
                    <span className="section-kicker">{blogPage.sidebarCardA.kicker}</span>
                    <h3>{blogPage.sidebarCardA.title}</h3>
                    <p>{blogPage.sidebarCardA.description}</p>
                  </article>
                  <article className="blog-context-card">
                    <span className="section-kicker">{blogPage.sidebarCardB.kicker}</span>
                    <h3>{blogPage.sidebarCardB.title}</h3>
                    <p>{blogPage.sidebarCardB.description}</p>
                  </article>
                </div>

                {latestTopics.length ? (
                  <article className="blog-context-card blog-latest-topics-card">
                    <div className="blog-latest-topics-head">
                      <span className="section-kicker">{blogPage.sidebarTopicsLabel || 'Últimos temas'}</span>
                      <small>{latestTopics.length}</small>
                    </div>
                    <div className="blog-latest-topics-list">
                      {latestTopics.map((post) => {
                        const displayPost = resolveLocalizedRecord(post, i18n.resolvedLanguage)
                        const action = getPostAction(post)
                        const priceLabel = action.priceLabel || ''
                        return (
                          <Link className="blog-latest-topic" key={post.slug} to={`/blog/${post.slug}`}>
                            <span className="blog-latest-topic-category">
                              {post.feedFeatured
                                ? formatBannerSlot(post.bannerSlot, t) || displayPost.category
                                : displayPost.category}
                            </span>
                            {priceLabel ? <strong className="blog-latest-topic-price">{priceLabel}</strong> : null}
                            <strong>{displayPost.title}</strong>
                            <small>
                              {formatPostDate(post.publishedAt, t, i18n.resolvedLanguage === 'en' ? 'en-US' : 'es-PE')}
                              {post.readingTime ? ` · ${post.readingTime}` : ''}
                            </small>
                            {action ? <span className={post.accessLevel === 'purchase' ? 'blog-latest-topic-cta is-purchase-cta' : 'blog-latest-topic-cta'}>{action.label}</span> : null}
                          </Link>
                        )
                      })}
                    </div>
                    {hasMoreLatestTopics ? (
                      <button
                        type="button"
                        className="section-more-link blog-latest-topics-toggle"
                        onClick={() => setShowAllLatestTopics((current) => !current)}
                      >
                        {showAllLatestTopics ? t('content.hideArticles') : t('content.showMoreTopics')}
                      </button>
                    ) : null}
                  </article>
                ) : null}
              </div>
            </div>

            {visibleGridPosts.length ? (
              <div className="blog-article-grid">
                {visibleGridPosts.map((post) => {
                  const displayPost = resolveLocalizedRecord(post, i18n.resolvedLanguage)
                  const action = getPostAction(post)
                  const accessBadge = getAccessBadgeMeta(post, t)
                  const priceLabel = action.priceLabel || ''
                  const cardClassName = post.feedFeatured
                    ? 'blog-teaser-card blog-index-card is-featured-feed'
                    : 'blog-teaser-card blog-index-card'

                  return (
                    <article className={cardClassName} key={post.slug}>
                      <div className="blog-card-text-frame">
                        <div className="blog-card-text-frame-topline">
                          <span>
                            {post.feedFeatured
                              ? formatBannerSlot(post.bannerSlot, t) || displayPost.category
                              : displayPost.category}
                          </span>
                          <small>
                            {formatPostDate(post.publishedAt, t, i18n.resolvedLanguage === 'en' ? 'en-US' : 'es-PE')}
                          </small>
                        </div>
                        {priceLabel ? <div className="blog-price-banner">{priceLabel}</div> : null}
                        <h3>{displayPost.title}</h3>
                        <p>{displayPost.excerpt}</p>
                        {action ? (
                          <ActionLink className="section-more-link blog-card-cta" href={action.href}>
                            {action.label}
                          </ActionLink>
                        ) : null}
                      </div>
                      <div className="blog-teaser-copy">
                        <div className="blog-card-header">
                          <span>
                            {post.feedFeatured
                              ? formatBannerSlot(post.bannerSlot, t) || displayPost.category
                              : displayPost.category}
                          </span>
                          <small>
                            {formatPostDate(post.publishedAt, t, i18n.resolvedLanguage === 'en' ? 'en-US' : 'es-PE')}
                            {post.readingTime ? ` · ${post.readingTime}` : ''}
                          </small>
                        </div>
                        {post.tags?.length ? (
                          <div className="blog-tag-list">
                            {post.tags.slice(0, post.feedFeatured ? 3 : 2).map((tag) => (
                              <span className="blog-tag-chip" key={tag}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <div className="blog-access-row">
                          <small className={`blog-access-badge ${accessBadge.className}`}>
                            {accessBadge.label}
                          </small>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : null}

            {hasMoreGridPosts ? (
              <div className="blog-load-more">
                <button
                  type="button"
                  className="section-more-link blog-load-more-button"
                  onClick={() => setVisibleGridCount((current) => current + 8)}
                >
                  {t('content.loadMoreArticles')}
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="content-gated-card">
            <h2>{t('content.noVisibleArticles')}</h2>
            <p>{t('content.publishHint')}</p>
          </div>
        )}
      </section>
      <SiteFooter content={siteContent} />
    </main>
  )
}
