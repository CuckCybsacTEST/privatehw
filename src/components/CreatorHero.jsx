import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppState } from '../state/AppState'
import { resolveLocalizedSection } from '../utils/localizedContent'
import { useViewportState } from '../hooks/useViewportState'
import { withBasePath } from '../utils/routes'

export function CreatorHero({ content, basePath = '' }) {
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  const { session, subscriptionProducts } = useAppState()
  const defaultSubscriptionProduct = subscriptionProducts[0] || null
  const { mode: heroViewportMode } = useViewportState()
  const creatorHome = resolveLocalizedSection(content, 'creatorHome', i18n.resolvedLanguage)

  function handleMembershipRoute(selectedPlanProduct) {
    const targetProduct = selectedPlanProduct || defaultSubscriptionProduct

    if (!targetProduct) {
      return
    }

    if (!session || !session.accessToken) {
      navigate(withBasePath(basePath, `/access?redirect=/checkout/start/${targetProduct.slug}`))
      return
    }

    navigate(withBasePath(basePath, `/checkout/start/${targetProduct.slug}`))
  }

  return (
    <section className={`creator-hero-section is-hero-${heroViewportMode}`} id="home-top">
      <div className="creator-hero-shell">
        <div className="creator-hero-avatar" aria-hidden="true" />

        <div className="creator-hero-copy">
          <p className="creator-kicker">{creatorHome.kicker}</p>
          <h1>
            {creatorHome.title}
            <span className="creator-verified-badge">Verificado</span>
          </h1>
          <p className="creator-lead">{creatorHome.description}</p>

          <div className="creator-badges">
            {creatorHome.badges.map((badge) => (
              <span className="creator-badge" key={badge}>
                {badge}
              </span>
            ))}
          </div>

          <div className="creator-stats">
            {creatorHome.stats.map((stat) => (
              <article className="creator-stat-card" key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </article>
            ))}
          </div>

          <div className="creator-hero-actions">
            <button className="hero-primary-cta" type="button" onClick={() => handleMembershipRoute()}>
              {creatorHome.primaryCtaLabel}
            </button>
            <a className="hero-secondary-cta" href="#videos">
              {creatorHome.secondaryCtaLabel}
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
