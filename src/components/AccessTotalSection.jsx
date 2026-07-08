import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { normalizeSubscriptionTiers } from '../data/defaultCommerce'
import { useAppState } from '../state/AppState'
import { resolveLocalizedSection } from '../utils/localizedContent'
import { withBasePath } from '../utils/routes'

export function AccessTotalSection({ content, basePath = '' }) {
  const navigate = useNavigate()
  const { session, subscriptionProducts } = useAppState()
  const { i18n, t } = useTranslation()
  const defaultSubscriptionProduct = subscriptionProducts[0] || null
  const accessTotal = resolveLocalizedSection(
    content?.accessTotal ? content : { accessTotal: content },
    'accessTotal',
    i18n.resolvedLanguage,
  )
  const pricingPlans = useMemo(
    () =>
      normalizeSubscriptionTiers(accessTotal)
        .slice(0, 4)
        .map((plan, index) => {
          const product =
            subscriptionProducts.find(
              (item) =>
                item.slug === `membership-${plan.slug}` &&
                item.accessScope === `tier:${plan.slug}`,
            ) ||
            subscriptionProducts[index] ||
            null

          return {
            ...plan,
            product,
            priceLabel: product?.priceLabel || plan.discountedPriceLabel || plan.price || '$0',
          }
        }),
    [accessTotal, subscriptionProducts],
  )
  const valuePhrases = useMemo(() => {
    const phrases = t('content.accessTotalValuePhrases', { returnObjects: true })
    return Array.isArray(phrases) ? phrases : []
  }, [t, i18n.resolvedLanguage])
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(0)
  const safeSelectedPlanIndex =
    selectedPlanIndex >= 0 && selectedPlanIndex < pricingPlans.length ? selectedPlanIndex : 0
  const selectedPlan = pricingPlans[safeSelectedPlanIndex] || null
  const selectedValuePhrase = valuePhrases.length
    ? valuePhrases[safeSelectedPlanIndex % valuePhrases.length]
    : selectedPlan?.label || ''
  const progressPercent = pricingPlans.length
    ? Math.round(((safeSelectedPlanIndex + 1) / pricingPlans.length) * 100)
    : 0

  useEffect(() => {
    if (selectedPlanIndex >= pricingPlans.length) {
      setSelectedPlanIndex(0)
    }
  }, [pricingPlans.length, selectedPlanIndex])

  useEffect(() => {
    if (pricingPlans.length <= 1) {
      return undefined
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setSelectedPlanIndex((currentIndex) => (currentIndex + 1) % pricingPlans.length)
    }, 3200)

    return () => window.clearInterval(intervalId)
  }, [pricingPlans.length])

  function handleMembershipRoute() {
    const targetProduct = selectedPlan?.product || defaultSubscriptionProduct

    if (!targetProduct) {
      if (accessTotal.ctaUrl) {
        if (accessTotal.ctaUrl.startsWith('/')) {
          navigate(withBasePath(basePath, accessTotal.ctaUrl))
          return
        }

        window.location.assign(accessTotal.ctaUrl)
      }

      return
    }

    if (!session || !session.accessToken) {
      navigate(withBasePath(basePath, `/access?redirect=/checkout/start/${targetProduct.slug}`))
      return
    }

    navigate(withBasePath(basePath, `/checkout/start/${targetProduct.slug}`))
  }

  return (
    <section className="access-total-section" id="access-total">
      <div className="access-total-shell">
        <div
          className="access-total-compact-card"
          style={{ '--access-total-progress': `${progressPercent}%` }}
        >
          <span className="access-total-kicker">{accessTotal.eyebrow || t('content.accessBenefits')}</span>
          <h2>{accessTotal.title || t('content.subscriptionPremium')}</h2>
          <p className="access-total-lede">
            {accessTotal.description ||
              'Comparacion resumida para convertir rapido. El detalle completo aparece mas abajo.'}
          </p>

          <div className="access-total-plan-grid">
            {pricingPlans.map((plan, index) => (
              <button
                className={
                  index === safeSelectedPlanIndex
                    ? 'access-total-plan-tile is-active'
                    : 'access-total-plan-tile'
                }
                key={plan.slug}
                type="button"
                onClick={() => setSelectedPlanIndex(index)}
                aria-pressed={index === safeSelectedPlanIndex}
              >
                <span>{plan.label}</span>
                <strong>{plan.priceLabel}</strong>
              </button>
            ))}
          </div>

          {selectedPlan ? (
            <div className="access-total-selected-strip" aria-live="polite">
              <span>{selectedPlan.label}</span>
              <strong>{selectedValuePhrase}</strong>
            </div>
          ) : null}

          <button className="hero-primary-cta access-total-cta" type="button" onClick={handleMembershipRoute}>
            {accessTotal.ctaLabel || t('content.subscribeAndUnlock')}
          </button>

          <div className="access-total-accent-bar" aria-hidden="true" />
        </div>
      </div>
    </section>
  )
}
