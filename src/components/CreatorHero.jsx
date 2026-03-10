import { useNavigate } from 'react-router-dom'
import { SubscriptionPlanSelector } from './SubscriptionPlanSelector'
import { useAppState } from '../state/AppState'

export function CreatorHero({ content }) {
  const navigate = useNavigate()
  const { session, subscriptionProducts } = useAppState()
  const subscriptionTable = content.creatorHome.subscriptionTable
  const defaultSubscriptionProduct = subscriptionProducts[0] || null

  function handleMembershipRoute(selectedPlanProduct) {
    const targetProduct = selectedPlanProduct || defaultSubscriptionProduct

    if (!targetProduct) {
      return
    }

    if (!session || !session.accessToken) {
      navigate(`/access?redirect=/checkout/start/${targetProduct.slug}`)
      return
    }

    navigate(`/checkout/start/${targetProduct.slug}`)
  }

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
          <button className="hero-primary-cta" type="button" onClick={() => handleMembershipRoute()}>
            {content.creatorHome.primaryCtaLabel}
          </button>
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

        <div className="creator-hero-visual" id="access-total">
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
          <p className="creator-subscription-access">{subscriptionTable.accessLabel}</p>

          <div className="creator-subscription-table">
            {subscriptionTable.rows.map((row) => (
              <div className="creator-subscription-row" key={row.label}>
                <span>{row.label}</span>
                <strong>{row.value}</strong>
              </div>
            ))}
          </div>

          <SubscriptionPlanSelector
            subscriptionProducts={subscriptionProducts}
            subscriptionTable={subscriptionTable}
            onPurchase={handleMembershipRoute}
            context="hero"
          />
        </div>
      </div>
    </section>
  )
}
