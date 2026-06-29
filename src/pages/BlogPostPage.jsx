import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PublicNav } from '../components/PublicNav'
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

export function BlogPostPage() {
  const navigate = useNavigate()
  const { slug } = useParams()
  const {
    blogPosts,
    getContentAccess,
    getProductBySlug,
    session,
    siteContent,
    subscriptionProducts,
  } = useAppState()
  const { i18n, t } = useTranslation()
  const blogPage = resolveLocalizedSection(siteContent, 'blogPage', i18n.resolvedLanguage)
  const dateLocale = i18n.resolvedLanguage === 'en' ? 'en-US' : 'es-PE'
  const post = blogPosts.find((item) => item.slug === slug) || blogPosts[0]
  const localizedPost = post ? resolveLocalizedRecord(post, i18n.resolvedLanguage) : null
  const canPreviewDraft = session?.role === 'admin'
  const access = post ? getContentAccess(`blog:${post.slug}`) : null
  const purchaseProduct = post?.accessLevel === 'purchase' ? getProductBySlug(`blog-${post.slug}`) : null
  const canRead = session?.role === 'admin' || Boolean(access?.unlocked)
  const [error, setError] = useState('')
  const subscriptionProduct = subscriptionProducts[0] || null
  const bannerConfig =
    post?.bannerSlot && post.bannerSlot !== 'none'
      ? post.bannerSlot === blogPage.bannerPrimary.slot
        ? blogPage.bannerPrimary
        : post.bannerSlot === blogPage.bannerSecondary.slot
          ? blogPage.bannerSecondary
          : null
      : null
  const relatedPosts = useMemo(
    () =>
      blogPosts
        .filter(
          (item) =>
            item.slug !== post?.slug &&
            item.status === 'published' &&
            (item.category === post?.category || item.accessLevel === post?.accessLevel),
        )
        .slice(0, 3),
    [blogPosts, post],
  )

  function getAccessBadge() {
    if (post?.accessLevel === 'purchase') {
      return t('content.purchaseAccess')
    }

    if (post?.accessLevel === 'subscription') {
      return t('content.subscriptionAccess')
    }

    if (post?.accessLevel === 'registered') {
      return t('content.registeredAccess')
    }

    return t('content.openReading')
  }

  async function handleSubscribe() {
    if (!subscriptionProduct) {
      return
    }

    setError('')

    if (!session || !session.accessToken) {
      navigate(`/access?redirect=/checkout/start/${subscriptionProduct.slug}`)
      return
    }

    navigate(`/checkout/start/${subscriptionProduct.slug}`)
  }

  function handleRegisteredAccess() {
    navigate(`/access?redirect=/blog/${post.slug}`)
  }

  function handlePurchase() {
    const productSlug = purchaseProduct?.slug || `blog-${post.slug}`

    if (!session || !session.accessToken) {
      navigate(`/access?redirect=/checkout/start/${productSlug}`)
      return
    }

    navigate(`/checkout/start/${productSlug}`)
  }

  if (!post) {
    return null
  }

  if (
    (post.status !== 'published' ||
      (post.scheduledAt && new Date(post.scheduledAt).getTime() > Date.now())) &&
    !canPreviewDraft
  ) {
    return (
      <main className="creator-home">
        <PublicNav />
        <article className="content-detail-page">
          <Link className="content-back-link" to="/blog">
            {t('content.backBlog')}
          </Link>
          <div className="content-gated-card">
            <h2>{t('content.postUnavailable')}</h2>
            <p>{t('content.postUnavailableDescription')}</p>
          </div>
        </article>
        <SiteFooter content={siteContent} />
      </main>
    )
  }

  return (
    <main className="creator-home">
      <PublicNav />
      <article className="content-detail-page">
        <Link className="content-back-link" to="/blog">
          {t('content.backBlog')}
        </Link>
        <div className="content-detail-hero blog-detail-hero blog-detail-hero-text">
          <div className="content-detail-copy blog-detail-copy">
            <div className="blog-detail-meta">
              <p className="section-kicker">{localizedPost?.category || post.category}</p>
              <small>
                {formatPostDate(post.publishedAt, t, dateLocale)}
                {post.readingTime ? ` · ${post.readingTime}` : ''}
              </small>
            </div>
            <h1>{localizedPost?.title || post.title}</h1>
            <p>{localizedPost?.excerpt || post.excerpt}</p>
            <div className="blog-detail-badges">
              <span className="blog-access-badge">{getAccessBadge()}</span>
              <span className="blog-access-badge">{t('content.activeEditorial')}</span>
              {post.allowIndexing ? <span className="blog-access-badge">{t('content.indexable')}</span> : null}
            </div>
          </div>
          <div className="blog-detail-text-panel">
            <span className="section-kicker">{t('content.summary')}</span>
            <h2>{t('content.articleStatus')}</h2>
            <p>{t('content.reading')}: {post.readingTime || t('content.noDate')}</p>
            <p>{t('content.category')}: {localizedPost?.category || post.category}</p>
            <p>{t('content.published')}: {formatPostDate(post.publishedAt, t, dateLocale)}</p>
          </div>
        </div>
        <div className="blog-detail-layout">
          <div className="content-detail-body blog-detail-body">
            {bannerConfig ? (
              <div className="blog-inline-banner">
                <span className="section-kicker">{bannerConfig.kicker}</span>
                <h2>{bannerConfig.title}</h2>
                <p>{bannerConfig.description}</p>
                <Link className="section-more-link" to={bannerConfig.ctaUrl}>
                  {bannerConfig.ctaLabel}
                </Link>
              </div>
            ) : null}
            {canRead ? (
              <>
                <div dangerouslySetInnerHTML={{ __html: localizedPost?.contentHtml || post.contentHtml }} />
                {post.mediaItems?.length ? (
                  <div className="blog-media-stack">
                    {post.mediaItems.map((item) => {
                      if (item.type === 'image') {
                        return (
                          <a
                            key={item.id}
                            className="section-more-link"
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {item.title || t('content.openExternalResource')}
                          </a>
                        )
                      }

                      if (item.type === 'video') {
                        return <video key={item.id} src={item.url} controls preload="metadata" />
                      }

                      if (item.type === 'audio') {
                        return <audio key={item.id} src={item.url} controls preload="metadata" />
                      }

                      return (
                        <a
                          key={item.id}
                          className="section-more-link"
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {item.title || t('content.openExternalResource')}
                        </a>
                      )
                    })}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="content-gated-card">
                <h2>
                  {post.accessLevel === 'registered'
                    ? blogPage.ctaRegistered.title
                    : post.accessLevel === 'purchase'
                      ? t('content.buyArticle')
                      : blogPage.ctaSubscription.title}
                </h2>
                <p>
                  {post.accessLevel === 'registered'
                    ? blogPage.ctaRegistered.description
                    : post.accessLevel === 'purchase'
                      ? t('content.buyArticleDescription')
                      : blogPage.ctaSubscription.description}
                </p>
                <button
                  className="hero-primary-cta"
                  type="button"
                  onClick={
                    post.accessLevel === 'registered'
                      ? handleRegisteredAccess
                      : post.accessLevel === 'purchase'
                        ? handlePurchase
                        : handleSubscribe
                  }
                >
                  {post.accessLevel === 'registered'
                    ? blogPage.ctaRegistered.ctaLabel
                    : post.accessLevel === 'purchase'
                      ? t('content.buyArticle')
                      : blogPage.ctaSubscription.ctaLabel}
                </button>
                {post.accessLevel === 'purchase' ? (
                  <p className="member-access-note">
                    {purchaseProduct?.priceLabel || post.priceLabel || ''}
                  </p>
                ) : null}
                {error ? <p className="admin-error">{error}</p> : null}
              </div>
            )}
          </div>

          <aside className="blog-detail-sidebar">
            <div className="blog-detail-panel">
              <span className="section-kicker">{t('content.summary')}</span>
              <h3>{t('content.articleStatus')}</h3>
              <ul className="physical-store-points">
                <li>{t('content.category')}: {post.category}</li>
                <li>
                  {post.accessLevel === 'purchase'
                    ? t('content.purchaseAccess')
                    : post.accessLevel === 'subscription'
                    ? t('content.subscriptionAccess')
                    : post.accessLevel === 'registered'
                      ? t('content.registeredAccess')
                      : t('content.openReading')}
                </li>
                {post.accessLevel === 'purchase' ? (
                  <li>{purchaseProduct?.priceLabel || post.priceLabel || ''}</li>
                ) : null}
                <li>{t('content.published')}: {formatPostDate(post.publishedAt, t, dateLocale)}</li>
                {post.readingTime ? <li>{t('content.reading')}: {post.readingTime}</li> : null}
              </ul>
            </div>

            {relatedPosts.length ? (
              <div className="blog-detail-panel">
                <span className="section-kicker">{t('content.related')}</span>
                <h3>{t('content.moreArticles')}</h3>
                <div className="blog-related-list">
                  {relatedPosts.map((item) => {
                    const displayItem = resolveLocalizedRecord(item, i18n.resolvedLanguage)

                    return (
                      <Link className="blog-related-card" key={item.slug} to={`/blog/${item.slug}`}>
                        <div>
                          <strong>{displayItem.title}</strong>
                          <small>{displayItem.category}</small>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </article>
      <SiteFooter content={siteContent} />
    </main>
  )
}
