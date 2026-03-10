import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SubscriptionPlanSelector } from './SubscriptionPlanSelector'
import { useAppState } from '../state/AppState'

function getAccessViewportMode() {
  if (typeof window === 'undefined') {
    return 'desktop'
  }

  if (window.innerWidth > 900) {
    return 'desktop'
  }

  if (window.innerWidth <= 390 || window.innerHeight <= 844) {
    return 'compact'
  }

  return 'regular'
}

export function AccessTotalSection({ content }) {
  const navigate = useNavigate()
  const { session, subscriptionProducts } = useAppState()
  const [accessViewportMode, setAccessViewportMode] = useState(() => getAccessViewportMode())
  const defaultSubscriptionProduct = subscriptionProducts[0] || null

  useEffect(() => {
    function handleViewportChange() {
      setAccessViewportMode(getAccessViewportMode())
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
    <section className={`access-total-section is-access-${accessViewportMode}`} id="access-total">
      <div className="access-total-shell">
        <div className="access-total-visual">
          <div className="access-total-frame">
            <img
              src={content.heroImage}
              alt="Creator portrait"
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
          </div>

          <div className={`access-total-card is-access-${accessViewportMode}`}>
            <p className="creator-profile-eyebrow">{content.eyebrow}</p>
            <h2>{content.title}</h2>
            <p>{content.description}</p>
            <p className="creator-subscription-access">{content.accessLabel}</p>

            <div className="creator-subscription-table">
              {content.rows.map((row) => (
                <div className="creator-subscription-row" key={row.label}>
                  <span>{row.label}</span>
                  <strong>{row.value}</strong>
                </div>
              ))}
            </div>

            <SubscriptionPlanSelector
              subscriptionProducts={subscriptionProducts}
              subscriptionTable={content}
              onPurchase={handleMembershipRoute}
              context="hero"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
