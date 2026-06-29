import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { normalizeSubscriptionTiers } from '../data/defaultCommerce'

function getCompactPlanLabel(plan, t) {
  if (plan.durationUnit === 'days') {
    return `${plan.durationValue} ${t('content.days')}`
  }

  if (plan.durationValue === 1) {
    return t('content.monthly')
  }

  if (plan.durationValue === 3) {
    return t('content.quarterly')
  }

  if (plan.durationValue === 6) {
    return t('content.semiannual')
  }

  if (plan.durationValue === 12) {
    return t('content.annual')
  }

  return plan.label
}

function buildPlans(subscriptionProducts = [], fallbackTable = {}) {
  const fallbackPlans = normalizeSubscriptionTiers(fallbackTable)

  if (fallbackPlans.length) {
    return fallbackPlans.map((plan, index) => {
      const product =
        subscriptionProducts.find(
          (item) =>
            item.slug === `membership-${plan.slug}` &&
            item.accessScope === `tier:${plan.slug}`,
        ) ||
        subscriptionProducts[index] ||
        null
      const durationValue = Number(
        plan.durationValue || plan.durationMonths || product?.metadata?.durationValue || 1,
      )
      const durationUnit = plan.durationUnit || product?.metadata?.durationUnit || 'months'
      const safeDurationValue = Number.isFinite(durationValue) ? durationValue : 1
      const period =
        plan.period ||
        product?.metadata?.planPeriod ||
        (durationUnit === 'days' ? `${safeDurationValue} dias` : `${safeDurationValue} meses`)
      const priceLabel = product?.priceLabel || plan.price || '$0'

      return {
        slug: plan.slug || `fallback-${index}`,
        label: plan.label || product?.metadata?.planLabel || product?.title || `Plan ${index + 1}`,
        period,
        durationValue: safeDurationValue,
        durationUnit,
        priceLabel,
        hasDiscount:
          Boolean(plan.discountPercent && Number(plan.discountPercent) > 0) ||
          Boolean(product?.metadata?.hasDiscount),
        originalPriceLabel: product?.metadata?.originalPriceLabel || '',
        discountPercent: Number(plan.discountPercent || product?.metadata?.discountPercent || 0),
        discountLabel: plan.discountLabel || product?.metadata?.discountLabel || 'Oferta activa',
        savingsLabel: product?.metadata?.savingsLabel || '',
        promoNote: plan.promoNote || product?.metadata?.promoNote || '',
        product,
      }
    })
  }

  return subscriptionProducts.map((product) => ({
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
}

function getDefaultPlanIndex(plans = []) {
  if (!plans.length) {
    return 0
  }

  let bestIndex = 0
  let bestDuration = 0

  plans.forEach((plan, index) => {
    const duration = plan.durationUnit === 'months' ? plan.durationValue : 0
    if (duration >= bestDuration) {
      bestDuration = duration
      bestIndex = index
    }
  })

  return bestIndex
}

export function SubscriptionPlanSelector({
  subscriptionProducts = [],
  subscriptionTable,
  onPurchase,
  context = 'hero',
}) {
  const { t } = useTranslation()
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
              {getCompactPlanLabel(plan, t)}
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
            <span className="creator-subscription-price-old">{selectedPlan.originalPriceLabel}</span>
          ) : null}
          <strong>{selectedPlan.priceLabel}</strong>
          <span>{selectedPlan.period}</span>
        </div>

        {selectedPlan.hasDiscount ? (
          <p className="creator-subscription-savings">
            {t('content.saveWithOffer', { amount: selectedPlan.savingsLabel })}
          </p>
        ) : null}

        {selectedPlan.promoNote ? <p className="subscription-plan-note">{selectedPlan.promoNote}</p> : null}

        <button
          className="hero-primary-cta creator-subscription-cta"
          type="button"
          onClick={() => onPurchase(selectedPlan.product)}
          disabled={!selectedPlan.product}
        >
          {subscriptionTable.ctaLabel || t('checkout.continue')}
        </button>
      </div>
    </div>
  )
}
