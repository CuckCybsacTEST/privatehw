export function CreatorHero({ content }) {
  const subscriptionTable = content.creatorHome.subscriptionTable

  return (
    <section className="creator-hero-section">
      <div className="creator-hero-copy">
        <p className="creator-kicker">{content.creatorHome.kicker}</p>
        <h1>{content.creatorHome.title}</h1>
        <p className="creator-lead">{content.creatorHome.description}</p>

        <div className="creator-badges">
          {content.creatorHome.badges.map((badge) => (
            <span className="creator-badge" key={badge}>
              {badge}
            </span>
          ))}
        </div>

        <div className="creator-hero-actions">
          <a
            className="hero-primary-cta"
            href={content.creatorHome.primaryCtaUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {content.creatorHome.primaryCtaLabel}
          </a>
          <a className="hero-secondary-cta" href="#videos">
            {content.creatorHome.secondaryCtaLabel}
          </a>
        </div>

        <div className="creator-stats">
          {content.creatorHome.stats.map((stat) => (
            <article className="creator-stat-card" key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </article>
          ))}
        </div>
      </div>

      <div className="creator-hero-visual">
        <div className="creator-portrait-frame">
          <img
            src={content.creatorHome.heroImage}
            alt="Creator portrait"
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
        </div>

        <div className="creator-profile-card">
          <p className="creator-profile-eyebrow">{subscriptionTable.eyebrow}</p>
          <h2>{subscriptionTable.title}</h2>
          <p>{subscriptionTable.description}</p>

          <div className="creator-subscription-price">
            <strong>{subscriptionTable.price}</strong>
            <span>{subscriptionTable.period}</span>
          </div>

          <p className="creator-subscription-access">{subscriptionTable.accessLabel}</p>

          <div className="creator-subscription-table">
            {subscriptionTable.rows.map((row) => (
              <div className="creator-subscription-row" key={row.label}>
                <span>{row.label}</span>
                <strong>{row.value}</strong>
              </div>
            ))}
          </div>

          <a
            className="hero-primary-cta creator-subscription-cta"
            href={subscriptionTable.ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {subscriptionTable.ctaLabel}
          </a>
        </div>
      </div>
    </section>
  )
}
