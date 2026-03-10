import { useEffect, useMemo, useState } from 'react'

function getCompactPlanLabel(plan) {
  if (plan.durationUnit === 'days') {
    return `${plan.durationValue} dias`
  }

  if (plan.durationValue === 1) {
    return 'Mensual'
  }

  if (plan.durationValue === 3) {
    return 'Trimestral'
  }

  if (plan.durationValue === 6) {
    return 'Semestral'
  }

  if (plan.durationValue === 12) {
    return 'Anual'
  }

  return plan.label
}

function buildPlans(subscriptionProducts = [], fallbackTable = {}) {
  if (subscriptionProducts.length) {
    return subscriptionProducts
      .map((product) => ({
        slug: product.slug,
        label: product.metadata?.planLabel || product.title,
        period: product.metadata?.planPeriod || '',
        durationValue: Number(product.metadata?.durationValue || product.metadata?.durationMonths || 1),
        durationUnit: product.metadata?.durationUnit || 'months',
        priceLabel: product.priceLabel,
        hasDiscount: Boolean(product.metadata?.hasDiscount),
        originalPriceLabel: product.metadata?.originalPriceLabel || '',
        discountPercent: product.metadata?.discountPercent || 0,
        discountLabel: product.metadata?.discountLabel || 'Oferta activa',
        savingsLabel: product.metadata?.savingsLabel || '',
        promoNote: product.metadata?.promoNote || '',
        product,
      }))
      .filter((plan) => plan.durationUnit !== 'days')
  }

  const plans = fallbackTable.plans || []

  return plans
    .map((plan, index) => ({
      slug: `fallback-${plan.slug || index}`,
      label: plan.label || `Plan ${index + 1}`,
      period: plan.period || '',
      durationValue: Number(plan.durationValue || plan.durationMonths || 1),
      durationUnit: plan.durationUnit || 'months',
      priceLabel: plan.price || 'S/0',
      hasDiscount: false,
      originalPriceLabel: '',
      discountPercent: 0,
      discountLabel: plan.discountLabel || 'Oferta activa',
      savingsLabel: '',
      promoNote: plan.promoNote || '',
      product: null,
    }))
    .filter((plan) => plan.durationUnit !== 'days')
}

export function SubscriptionPlanSelector({
  subscriptionProducts = [],
  subscriptionTable,
  onPurchase,
  context = 'hero',
}) {
  const plans = useMemo(
    () => buildPlans(subscriptionProducts, subscriptionTable),
    [subscriptionProducts, subscriptionTable],
  )
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [highlightIndex, setHighlightIndex] = useState(0)
  const selectedPlan = plans[selectedIndex] || null

  useEffect(() => {
    setSelectedIndex(0)
    setHighlightIndex(0)
  }, [plans.length])

  useEffect(() => {
    if (plans.length <= 1) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setHighlightIndex((current) => {
        const nextIndex = (current + 1) % plans.length
        setSelectedIndex(nextIndex)
        return nextIndex
      })
    }, 3200)

    return () => window.clearInterval(intervalId)
  }, [plans.length])

  if (!selectedPlan) {
    return null
  }

  return (
    <div className={`subscription-plan-selector ${context === 'membership' ? 'is-membership' : 'is-hero'}`}>
      <div className="subscription-plan-track">
        <input
          className="subscription-plan-slider"
          type="range"
          min="0"
          max={Math.max(plans.length - 1, 0)}
          step="1"
          value={selectedIndex}
          onChange={(event) => setSelectedIndex(Number(event.target.value))}
        />
        <div className="subscription-plan-steps">
          {plans.map((plan, index) => (
            <button
              key={plan.slug}
              type="button"
              className={[
                selectedIndex === index ? 'is-active' : '',
                highlightIndex === index ? 'is-spotlight' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => {
                setSelectedIndex(index)
                setHighlightIndex(index)
              }}
              title={plan.label}
            >
              {getCompactPlanLabel(plan)}
            </button>
          ))}
        </div>
      </div>

      <div className="subscription-plan-card">
        {selectedPlan.hasDiscount ? (
          <span className="creator-discount-badge">
            {selectedPlan.discountLabel} -{selectedPlan.discountPercent}%
          </span>
        ) : null}

        <div className="creator-subscription-price">
          {selectedPlan.hasDiscount ? (
            <span className="creator-subscription-price-old">
              {selectedPlan.originalPriceLabel}
            </span>
          ) : null}
          <strong>{selectedPlan.priceLabel}</strong>
          <span>{selectedPlan.period}</span>
        </div>

        {selectedPlan.hasDiscount ? (
          <p className="creator-subscription-savings">
            Ahorras {selectedPlan.savingsLabel} con esta oferta.
          </p>
        ) : null}

        {selectedPlan.promoNote ? (
          <p className="subscription-plan-note">{selectedPlan.promoNote}</p>
        ) : null}

        <button
          className="hero-primary-cta creator-subscription-cta"
          type="button"
          onClick={() => onPurchase(selectedPlan.product)}
          disabled={!selectedPlan.product}
        >
          {subscriptionTable.ctaLabel}
        </button>
      </div>
    </div>
  )
}
