import { Link } from 'react-router-dom'
import { Seo } from './Seo'

export function StaticContentPage({ page }) {
  if (!page) {
    return null
  }

  const sections = Array.isArray(page.sections) ? page.sections : []

  return (
    <main className="static-page">
      <Seo
        title={`${page.title} | Kinkly`}
        description={page.description}
        canonicalPath={page.canonicalPath}
      />

      <section className="static-page-shell">
        <div className="static-page-hero">
          <p className="section-kicker">Kinkly</p>
          <h1>{page.title}</h1>
          <p className="static-page-intro">{page.intro}</p>

          <div className="static-page-actions">
            <Link className="hero-primary-cta" to="/">
              Volver al inicio
            </Link>
            {page.secondaryHref ? (
              <Link className="hero-secondary-cta" to={page.secondaryHref}>
                {page.secondaryLabel || 'Siguiente'}
              </Link>
            ) : null}
          </div>
        </div>

        <div className="static-page-grid">
          {sections.map((section) => (
            <article className="static-page-card" key={section.title}>
              <h2>{section.title}</h2>
              {Array.isArray(section.items) && section.items.length ? (
                <ul>
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
              {section.text ? <p>{section.text}</p> : null}
            </article>
          ))}
        </div>

        {page.note ? <p className="static-page-note">{page.note}</p> : null}
      </section>
    </main>
  )
}
