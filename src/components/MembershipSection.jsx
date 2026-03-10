import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SubscriptionPlanSelector } from './SubscriptionPlanSelector'
import { useAppState } from '../state/AppState'

export function MembershipSection({ content }) {
  const navigate = useNavigate()
  const { session, subscriptionProducts } = useAppState()
  const [error, setError] = useState('')
  const defaultSubscriptionProduct = subscriptionProducts[0] || null

  async function handleSubscribe(selectedPlanProduct) {
    const targetProduct = selectedPlanProduct || defaultSubscriptionProduct

    if (!targetProduct) {
      return
    }

    setError('')

    if (!session || !session.accessToken) {
      navigate(`/access?redirect=/checkout/start/${targetProduct.slug}`)
      return
    }

    navigate(`/checkout/start/${targetProduct.slug}`)
  }

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
          <SubscriptionPlanSelector
            subscriptionProducts={subscriptionProducts}
            subscriptionTable={content.accessTotal}
            onPurchase={handleSubscribe}
            context="membership"
          />
          <ul>
            {content.membership.planItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {error ? <p className="admin-error">{error}</p> : null}
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
