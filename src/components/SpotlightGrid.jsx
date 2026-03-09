export function SpotlightGrid({ content }) {
  return (
    <section className="spotlight-section" id="media">
      <div className="section-heading">
        <p className="section-kicker">Media destacada</p>
        <h2>{content.mediaSpotlight.title}</h2>
        <p>{content.mediaSpotlight.description}</p>
      </div>

      <div className="spotlight-grid">
        <article className="spotlight-feature-card">
          <img
            src={content.mediaSpotlight.featuredImage}
            alt="Featured creator still"
            loading="eager"
            decoding="async"
          />
          <div className="spotlight-overlay">
            <span>{content.mediaSpotlight.featuredLabel}</span>
            <h3>{content.mediaSpotlight.featuredTitle}</h3>
            <p>{content.mediaSpotlight.featuredDescription}</p>
          </div>
        </article>

        <div className="spotlight-mini-grid">
          {content.mediaSpotlight.gallery.map((item, index) => (
            <article className="spotlight-mini-card" key={`${item.image}-${index}`}>
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
