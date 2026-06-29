import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppState } from '../state/AppState'
import { resolveLocalizedRecord, resolveLocalizedSection } from '../utils/localizedContent'
import { useViewportState } from '../hooks/useViewportState'

function BlogTextCard({
  post,
  eyebrow,
  readingTimeLabel,
  actionLabel,
  actionHref,
  priceLabel,
  isPurchase = false,
}) {
  return (
    <article className="blog-teaser-normal-card">
      <div className="blog-featured-story-card-topline">
        <span>{eyebrow}</span>
        <small>{readingTimeLabel}</small>
      </div>
      {priceLabel ? <div className="blog-price-banner">{priceLabel}</div> : null}
      <h3>{post.title}</h3>
      <p>{post.excerpt}</p>
      <div className="blog-featured-story-card-actions">
        <Link
          className={
            isPurchase ? 'section-more-link blog-card-cta is-purchase-cta' : 'section-more-link blog-card-cta'
          }
          to={actionHref}
        >
          {actionLabel}
        </Link>
      </div>
    </article>
  )
}

export function BlogTeaserSection({ content }) {
  const { blogPosts, getContentAccess, getProductBySlug } = useAppState()
  const { i18n, t } = useTranslation()
  const blogSection = resolveLocalizedSection(content, 'blogSection', i18n.resolvedLanguage)
  const posts = blogPosts.filter((post) => post.status === 'published').slice(0, 4)
  const { isMobile } = useViewportState()
  const [featuredPost, ...railPosts] = posts

  if (!featuredPost) {
    return null
  }

  function getPostReadingTime(post) {
    return post.readingTime ? post.readingTime : t('content.publicReading')
  }

  function getBlogPurchaseProduct(post) {
    return post?.accessLevel === 'purchase' ? getProductBySlug(`blog-${post.slug}`) : null
  }

  function getPostAction(post) {
    const access = getContentAccess(`blog:${post.slug}`)
    const purchaseProduct = getBlogPurchaseProduct(post)

    if (access.unlocked) {
      return { label: t('content.fullEditorial'), href: `/blog/${post.slug}` }
    }

    if (post.accessLevel === 'purchase') {
      return {
        label: t('content.buyArticle'),
        href: `/checkout/start/${purchaseProduct?.slug || `blog-${post.slug}`}`,
        priceLabel: purchaseProduct?.priceLabel || post.priceLabel || '',
      }
    }

    return { label: t('content.fullEditorial'), href: `/blog/${post.slug}` }
  }

  function getPriceLabel(post) {
    return getPostAction(post)?.priceLabel || ''
  }

  const localizedFeaturedPost = resolveLocalizedRecord(featuredPost, i18n.resolvedLanguage)

  return (
    <section className="blog-teaser-section" id="blog">
      <div className="section-heading section-heading-split blog-teaser-heading">
        <div className="blog-teaser-heading-copy">
          <p className="section-kicker">{t('content.editorial')}</p>
          <h2>{blogSection.title || t('content.editorial')}</h2>
          <p className="blog-teaser-lede">{blogSection.description}</p>
        </div>
      </div>

      {isMobile ? (
        posts.length ? (
          <div className="blog-teaser-normal-stack blog-teaser-mobile-stack">
            {posts.map((post) => {
              const displayPost = resolveLocalizedRecord(post, i18n.resolvedLanguage)
              const action = getPostAction(post)

              return (
                <BlogTextCard
                  key={post.slug}
                  post={displayPost}
                  eyebrow={displayPost.category}
                  readingTimeLabel={getPostReadingTime(post)}
                  actionLabel={action.label}
                  actionHref={action.href}
                  priceLabel={action.priceLabel}
                  isPurchase={post.accessLevel === 'purchase'}
                />
              )
            })}
          </div>
        ) : null
      ) : (
        <div className="blog-teaser-board">
          <div className="blog-teaser-feature-stack">
            <article className="blog-featured-story-card is-primary">
              <div className="blog-featured-story-card-topline">
                <span>{blogSection.title || t('content.editorial')}</span>
                <small>
                  {localizedFeaturedPost.category}
                  {featuredPost.readingTime ? ` / ${featuredPost.readingTime}` : ''}
                </small>
              </div>
              {getPriceLabel(featuredPost) ? (
                <div className="blog-price-banner is-prominent">{getPriceLabel(featuredPost)}</div>
              ) : null}
              <h2>{localizedFeaturedPost.title}</h2>
              <p>{localizedFeaturedPost.excerpt}</p>
              <div className="blog-featured-story-card-actions">
                <Link
                  className={
                    featuredPost.accessLevel === 'purchase'
                      ? 'section-more-link blog-card-cta is-purchase-cta'
                      : 'section-more-link blog-card-cta'
                  }
                  to={getPostAction(featuredPost).href}
                >
                  {getPostAction(featuredPost).label}
                </Link>
              </div>
            </article>
          </div>

          {railPosts.length ? (
            <div className="blog-teaser-normal-stack">
              {railPosts.slice(0, 3).map((post) => {
                const displayPost = resolveLocalizedRecord(post, i18n.resolvedLanguage)
                const action = getPostAction(post)

                return (
                  <BlogTextCard
                    key={post.slug}
                    post={displayPost}
                    eyebrow={displayPost.category}
                    readingTimeLabel={getPostReadingTime(post)}
                    actionLabel={action.label}
                    actionHref={action.href}
                    priceLabel={action.priceLabel}
                    isPurchase={post.accessLevel === 'purchase'}
                  />
                )
              })}
            </div>
          ) : null}
        </div>
      )}

      <div className="section-more-actions">
        <Link className="section-more-link" to="/blog">
          {t('content.fullEditorial')}
        </Link>
      </div>
    </section>
  )
}
