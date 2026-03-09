import { Link } from 'react-router-dom'
import { useAppState } from '../state/AppState'

export function BlogTeaserSection({ content }) {
  const { blogPosts } = useAppState()
  const posts = blogPosts.filter((post) => post.status === 'published').slice(0, 3)

  return (
    <section className="blog-teaser-section" id="blog">
      <div className="section-heading">
        <p className="section-kicker">Editorial</p>
        <h2>{content.blogSection.title}</h2>
        <p>{content.blogSection.description}</p>
      </div>

      <div className="blog-teaser-grid">
        {posts.map((post) => (
          <article className="blog-teaser-card" key={post.slug}>
            <img src={post.coverImage} alt={post.title} loading="lazy" decoding="async" />
            <div className="blog-teaser-copy">
              <span>{post.category}</span>
              <h3>{post.title}</h3>
              <p>{post.excerpt}</p>
              <Link to={`/blog/${post.slug}`}>
                {post.accessLevel === 'subscription' ? 'Ver acceso' : 'Leer articulo'}
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
