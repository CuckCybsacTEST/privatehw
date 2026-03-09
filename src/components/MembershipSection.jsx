export function MembershipSection({ content }) {
  return (
    <section className="membership-section" id="membership">
      <div className="section-heading">
        <p className="section-kicker">Acceso y beneficios</p>
        <h2>{content.membership.title}</h2>
        <p>{content.membership.description}</p>
      </div>

      <div className="membership-layout">
        <article className="membership-card primary">
          <span className="membership-card-label">{content.membership.planLabel}</span>
          <h3>{content.membership.planTitle}</h3>
          <p>{content.membership.planDescription}</p>
          <ul>
            {content.membership.planItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <a
            className="hero-primary-cta"
            href={content.membership.planUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {content.membership.planCta}
          </a>
        </article>

        <div className="membership-side-stack">
          {content.membership.sideCards.map((card) => (
            <article className="membership-card secondary" key={card.title}>
              <span className="membership-card-label">{card.label}</span>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
