import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '../state/AppState'

function getHeroViewportMode() {
  if (typeof window === 'undefined') {
    return 'desktop'
  }

  if (window.innerWidth > 900) {
    return 'desktop'
  }

  if (window.innerWidth <= 375 || window.innerHeight <= 740) {
    return 'compact'
  }

  return 'regular'
}

export function CreatorHero({ content }) {
  const navigate = useNavigate()
  const { session, subscriptionProducts } = useAppState()
  const defaultSubscriptionProduct = subscriptionProducts[0] || null
  const [heroViewportMode, setHeroViewportMode] = useState(() => getHeroViewportMode())

  useEffect(() => {
    function handleViewportChange() {
      setHeroViewportMode(getHeroViewportMode())
    }

    handleViewportChange()
    window.addEventListener('resize', handleViewportChange)

    return () => window.removeEventListener('resize', handleViewportChange)
  }, [])

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
    <section className={`creator-hero-section is-hero-${heroViewportMode}`}>
      <div className={`creator-hero-copy is-hero-${heroViewportMode}`} id="home-top">
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
    </section>
  )
}
