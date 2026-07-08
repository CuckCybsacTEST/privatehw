import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppState } from '../state/AppState'
import { resolveLocalizedSection } from '../utils/localizedContent'
import { withBasePath } from '../utils/routes'

function formatPlanPeriod(plan) {
  const durationValue = Number(plan.durationValue || plan.durationMonths || 1)
  const durationUnit = plan.durationUnit || 'months'

  if (durationUnit === 'days') {
    return durationValue === 1 ? '1 day' : `${durationValue} days`
  }

  if (durationValue === 1) {
    return 'Mensual'
  }

  if (durationValue === 3) {
    return 'Trimestral'
  }

  if (durationValue === 6) {
    return 'Semestral'
  }

  if (durationValue === 12) {
    return 'Anual'
  }

  return plan.period || `${durationValue} meses`
}

function getCardLabel(index, plan) {
  return plan.discountLabel || plan.label || (index === 0 ? 'Plan' : '')
}

export function MembershipSection({ content, basePath = '' }) {
  const navigate = useNavigate()
  const { session, subscriptionProducts } = useAppState()
  const { i18n, t } = useTranslation()
  const accessTotal = resolveLocalizedSection(
    content?.accessTotal ? content : { accessTotal: content },
    'accessTotal',
    i18n.resolvedLanguage,
  )

  const rows = Array.isArray(accessTotal.rows) ? accessTotal.rows.slice(0, 3) : []
  const tiers = Array.isArray(accessTotal.tiers) ? accessTotal.tiers.slice(0, 4) : []

  function handleSubscribe(selectedPlanProduct) {
    const targetProduct = selectedPlanProduct || subscriptionProducts[0] || null

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
    <section className="membership-section" id="membership">
      <div className="section-heading">
        <p className="section-kicker">{accessTotal.eyebrow || t('content.accessBenefits')}</p>
        <h2>{accessTotal.title || t('content.subscriptionPremium')}</h2>
        <p>{accessTotal.description}</p>
      </div>

      <div className="membership-plans-grid">
        {tiers.map((tier, index) => {
          const product =
            subscriptionProducts.find(
              (item) =>
                item.slug === `membership-${tier.slug}` &&
                item.accessScope === `tier:${tier.slug}`,
            ) ||
            subscriptionProducts[index] ||
            null
          const periodLabel = formatPlanPeriod(tier)
          const isFeatured = index === 1

          return (
            <article
              className={
                isFeatured ? 'membership-card membership-plan is-featured' : 'membership-card membership-plan'
              }
              key={tier.slug || index}
            >
              <span className="membership-card-label">{getCardLabel(index, tier)}</span>
              <h3>{tier.label || product?.metadata?.planLabel || product?.title || 'Plan de suscripcion'}</h3>
              <div className="membership-price">
                <strong>{product?.priceLabel || tier.price || '$0'}</strong>
                <span>/ {periodLabel}</span>
              </div>
              <ul>
                {rows.map((row) => (
                  <li key={`${tier.slug || index}-${row.label}`}>
                    {row.label}
                    {row.value ? ` ${row.value}` : ''}
                  </li>
                ))}
              </ul>
              <button
                className={isFeatured ? 'hero-primary-cta' : 'hero-secondary-cta'}
                type="button"
                onClick={() => handleSubscribe(product)}
              >
                {accessTotal.ctaLabel || t('content.subscribeAndUnlock')}
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}
