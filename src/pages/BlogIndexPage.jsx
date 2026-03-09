import { Link } from 'react-router-dom'
import { PublicNav } from '../components/PublicNav'
import { SiteFooter } from '../components/SiteFooter'
import { useAppState } from '../state/AppState'

export function BlogIndexPage() {
  const { blogPosts, siteContent } = useAppState()
  const posts = blogPosts.filter((post) => post.status === 'published')

  return (
    <main className="creator-home">
      <PublicNav />
      <section className="content-listing-page">
        <div className="section-heading">
          <p className="section-kicker">Blog</p>
          <h1>{siteContent.blogSection.title}</h1>
          <p>{siteContent.blogSection.description}</p>
        </div>

        <div className="blog-teaser-grid">
          {posts.map((post) => (
            <article className="blog-teaser-card" key={post.slug}>
              <img src={post.coverImage} alt={post.title} loading="lazy" decoding="async" />
              <div className="blog-teaser-copy">
                <span>{post.category}</span>
                <h3>{post.title}</h3>
                <p>{post.excerpt}</p>
                <div className="blog-access-row">
                  <small>{post.accessLevel === 'subscription' ? 'Requiere suscripcion' : 'Lectura gratuita'}</small>
                  <Link to={`/blog/${post.slug}`}>
                    {post.accessLevel === 'subscription' ? 'Ver acceso' : 'Leer articulo'}
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
      <SiteFooter content={siteContent} />
    </main>
  )
}
