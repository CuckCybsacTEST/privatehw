import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PublicNav } from '../components/PublicNav'
import { SiteFooter } from '../components/SiteFooter'
import { useAppState } from '../state/AppState'

export function BlogPostPage() {
  const navigate = useNavigate()
  const { slug } = useParams()
  const {
    blogPosts,
    hasEntitlement,
    session,
    siteContent,
    subscriptionProducts,
  } = useAppState()
  const post = blogPosts.find((item) => item.slug === slug) || blogPosts[0]
  const canPreviewDraft = session?.role === 'admin'
  const canRead =
    post?.accessLevel !== 'subscription' || hasEntitlement('all_digital') || session?.role === 'admin'
  const [error, setError] = useState('')
  const subscriptionProduct = subscriptionProducts[0] || null

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

  if (!post) {
    return null
  }

  if (post.status !== 'published' && !canPreviewDraft) {
    return (
      <main className="creator-home">
        <PublicNav />
        <article className="content-detail-page">
          <Link className="content-back-link" to="/blog">
            Volver al blog
          </Link>
          <div className="content-gated-card">
            <h2>Publicacion no disponible</h2>
            <p>Este post no esta publicado actualmente.</p>
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
          Volver al blog
        </Link>
        <div className="content-detail-hero">
          <img src={post.coverImage} alt={post.title} loading="eager" decoding="async" />
          <div className="content-detail-copy">
            <p className="section-kicker">{post.category}</p>
            <h1>{post.title}</h1>
            <p>{post.excerpt}</p>
            <p className="blog-access-badge">
              {post.accessLevel === 'subscription' ? 'Requiere suscripcion' : 'Lectura gratuita'}
            </p>
          </div>
        </div>
        <div className="content-detail-body">
          {canRead ? (
            <>
              <div dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
              {post.mediaItems?.length ? (
                <div className="blog-media-stack">
                  {post.mediaItems.map((item) => {
                    if (item.type === 'image') {
                      return <img key={item.id} src={item.url} alt={item.title || post.title} />
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
                        {item.title || 'Abrir recurso externo'}
                      </a>
                    )
                  })}
                </div>
              ) : null}
            </>
          ) : (
            <div className="content-gated-card">
              <h2>Contenido con suscripcion</h2>
              <p>Este post requiere acceso activo de suscripcion para leerse completo.</p>
              <button className="hero-primary-cta" type="button" onClick={handleSubscribe}>
                {siteContent.membership.planCta}
              </button>
              {error ? <p className="admin-error">{error}</p> : null}
            </div>
          )}
        </div>
      </article>
      <SiteFooter content={siteContent} />
    </main>
  )
}
