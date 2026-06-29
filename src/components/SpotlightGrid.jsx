import { useTranslation } from 'react-i18next'
import { resolveLocalizedSection } from '../utils/localizedContent'

export function SpotlightGrid({ content }) {
  const { i18n, t } = useTranslation()
  const mediaSpotlight = resolveLocalizedSection(content, 'mediaSpotlight', i18n.resolvedLanguage)

  return (
    <section className="spotlight-section" id="media">
      <div className="section-heading">
        <p className="section-kicker">{t('content.featuredMedia')}</p>
        <h2>{mediaSpotlight.title}</h2>
        <p>{mediaSpotlight.description}</p>
      </div>

      <div className="spotlight-grid">
        <article className="spotlight-feature-card">
          <span className="spotlight-preview-badge">Preview privado</span>
          <img
            src={mediaSpotlight.featuredImage}
            alt="Preview destacado"
            loading="eager"
            decoding="async"
          />
          <div className="spotlight-overlay">
            <span>{mediaSpotlight.featuredLabel}</span>
            <h3>{mediaSpotlight.featuredTitle}</h3>
            <p>{mediaSpotlight.featuredDescription}</p>
          </div>
        </article>

        <div className="spotlight-mini-grid">
          {mediaSpotlight.gallery.map((item, index) => (
            <article className="spotlight-mini-card" key={`${item.image}-${index}`}>
              <span className="spotlight-mini-badge">Preview</span>
              <img
                src={item.image}
                alt={item.title}
                loading="lazy"
                decoding="async"
              />
              <div className="spotlight-mini-copy">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
