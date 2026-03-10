import { Link } from 'react-router-dom'
import { useAppState } from '../state/AppState'

export function BlogTeaserSection({ content }) {
  const { blogPosts } = useAppState()
  const posts = blogPosts.filter((post) => post.status === 'published').slice(0, 3)
  const [featuredPost, ...secondaryPosts] = posts

  if (!featuredPost) {
    return null
  }

  return (
    <section className="blog-teaser-section" id="blog">
      <div className="section-heading section-heading-split">
        <div>
          <p className="section-kicker">Editorial</p>
          <h2>{content.blogSection.title}</h2>
          <p>{content.blogSection.description}</p>
        </div>
        <Link className="section-more-link desktop-only" to="/blog">
          Ver editorial completa
        </Link>
      </div>

      <div className="blog-editorial-layout">
        <article className="blog-editorial-feature">
          <img
            src={featuredPost.coverImage}
            alt={featuredPost.title}
            loading="lazy"
            decoding="async"
          />
          <div className="blog-editorial-overlay">
            <span>{featuredPost.category}</span>
            <h3>{featuredPost.title}</h3>
            <p>{featuredPost.excerpt}</p>
            <div className="blog-access-row">
              <small>
                {featuredPost.accessLevel === 'subscription'
                  ? 'Requiere suscripcion'
                  : 'Lectura gratuita'}
              </small>
              <Link to={`/blog/${featuredPost.slug}`}>
                {featuredPost.accessLevel === 'subscription' ? 'Ver acceso' : 'Leer articulo'}
              </Link>
            </div>
          </div>
        </article>

        <div className="blog-editorial-stack">
          {secondaryPosts.map((post) => (
            <article className="blog-editorial-card" key={post.slug}>
              <img src={post.coverImage} alt={post.title} loading="lazy" decoding="async" />
              <div className="blog-editorial-copy">
                <span>{post.category}</span>
                <h3>{post.title}</h3>
                <p>{post.excerpt}</p>
                <div className="blog-access-row">
                  <small>
                    {post.accessLevel === 'subscription'
                      ? 'Requiere suscripcion'
                      : 'Lectura gratuita'}
                  </small>
                  <Link to={`/blog/${post.slug}`}>
                    {post.accessLevel === 'subscription' ? 'Ver acceso' : 'Leer articulo'}
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="section-more-actions">
        <Link className="section-more-link" to="/blog">
          Ver editorial completa
        </Link>
      </div>
    </section>
  )
}
