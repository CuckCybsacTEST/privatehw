import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { normalizeSubscriptionTiers } from '../data/defaultCommerce'

function formatCurrency(amount = 0, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format((amount || 0) / 100)
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
      const durationValue = Number(plan.durationValue || product?.metadata?.durationValue || 1)
      const durationUnit = plan.durationUnit || product?.metadata?.durationUnit || 'months'
      const safeDurationValue = Number.isFinite(durationValue) ? durationValue : 1
      const periodLabel =
        plan.period ||
        product?.metadata?.planPeriod ||
        (durationUnit === 'days' ? `${safeDurationValue} days` : `${safeDurationValue} months`)
      const priceAmount =
        Number.isFinite(plan.discountedPriceAmount) && plan.discountedPriceAmount > 0
          ? plan.discountedPriceAmount
          : Number.isFinite(product?.priceAmount) && product.priceAmount > 0
            ? product.priceAmount
            : 0
      const priceLabel = plan.discountedPriceLabel || plan.price || product?.priceLabel || '$0'
      const currency = product?.currency || 'USD'
      const monthlyEquivalentAmount =
        durationUnit === 'months' && safeDurationValue > 0
          ? Math.round(priceAmount / safeDurationValue)
          : priceAmount

      return {
        slug: plan.slug,
        label: plan.label || product?.metadata?.planLabel || product?.title || plan.slug,
        shortLabel: plan.label || product?.metadata?.planLabel || product?.title || plan.slug,
        period: periodLabel,
        durationValue: safeDurationValue,
        durationUnit,
        priceAmount,
        priceLabel,
        currency,
        monthlyEquivalentAmount,
        monthlyEquivalentLabel: formatCurrency(monthlyEquivalentAmount, currency),
        product,
        promoNote: plan.promoNote || product?.metadata?.promoNote || '',
      }
    })
  }

  return subscriptionProducts.map((product) => {
    const durationValue = Number(
      product.metadata?.durationValue || product.metadata?.durationMonths || 1,
    )
    const durationUnit = product.metadata?.durationUnit || 'months'
    const safeDurationValue = Number.isFinite(durationValue) ? durationValue : 1
    const months = durationUnit === 'months' ? safeDurationValue : 1
    const periodLabel =
      product.metadata?.planPeriod ||
      (durationUnit === 'days' ? `${safeDurationValue} days` : `${safeDurationValue} months`)
    const monthlyEquivalent = months > 0 ? Math.round(product.priceAmount / months) : product.priceAmount

    return {
      slug: product.slug,
      label: product.metadata?.planLabel || product.title,
      shortLabel: product.metadata?.planLabel || product.title,
      period: periodLabel,
      durationValue: safeDurationValue,
      durationUnit,
      priceAmount: product.priceAmount,
      priceLabel: product.priceLabel,
      currency: product.currency || 'USD',
      monthlyEquivalentAmount: monthlyEquivalent,
      monthlyEquivalentLabel: formatCurrency(monthlyEquivalent, product.currency || 'USD'),
      product,
      promoNote: product.metadata?.promoNote || '',
    }
  })
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

export function AccessPricingCard({
  subscriptionProducts = [],
  subscriptionTable,
  onPurchase,
}) {
  const { t, i18n } = useTranslation()
  const localeKey =
    String(i18n.resolvedLanguage || 'es').slice(0, 2).toLowerCase() === 'en' ? 'en' : 'es'
  const safeSubscriptionTable = subscriptionTable || {}
  const benefitRows = Array.isArray(safeSubscriptionTable.rows) ? safeSubscriptionTable.rows : []
  const plans = useMemo(
    () => buildPlans(subscriptionProducts, subscriptionTable),
    [subscriptionProducts, subscriptionTable],
  )
  const [selectedIndex, setSelectedIndex] = useState(() => getDefaultPlanIndex(plans))
  const selectedPlan = plans[selectedIndex] || null
  const monthlyPlan = plans.find(
    (plan) => plan.durationUnit === 'months' && plan.durationValue === 1,
  )

  useEffect(() => {
    setSelectedIndex(getDefaultPlanIndex(plans))
  }, [plans])

  const savingsMessage = useMemo(() => {
    if (!selectedPlan || !monthlyPlan) {
      return ''
    }

    if (selectedPlan.durationUnit !== 'months' || selectedPlan.durationValue <= 1) {
      return ''
    }

    const baselineAmount = monthlyPlan.priceAmount * selectedPlan.durationValue
    const savingsAmount = Math.max(0, baselineAmount - selectedPlan.priceAmount)

    if (!savingsAmount) {
      return ''
    }

    const savingsPercent = Math.max(0, Math.round((savingsAmount / baselineAmount) * 100))

    return t('content.saveWithPlanPercent', {
      percent: savingsPercent,
      plan: selectedPlan.label.toLowerCase(),
    })
  }, [monthlyPlan, selectedPlan, t])

  if (!selectedPlan) {
    return null
  }

  const eyebrow =
    localeKey === 'en'
      ? t('content.accessTotal')
      : safeSubscriptionTable.eyebrow || t('content.accessTotal')
  const title =
    localeKey === 'en'
      ? t('content.subscriptionPremium')
      : safeSubscriptionTable.title || t('content.subscriptionPremium')
  const ctaLabel =
    localeKey === 'en'
      ? t('content.subscribeAndUnlock')
      : safeSubscriptionTable.ctaLabel || t('content.subscribeAndUnlock')

  function translateBenefitRow(row) {
    if (localeKey !== 'en') {
      return row
    }

    const label = String(row?.label || '').trim().toLowerCase()
    const value = String(row?.value || '').trim().toLowerCase()

    const labelMap = {
      'todos los videos': 'Premium videos',
      'todas las fotos': 'All photos',
      'todos los packs': 'All packs',
      'telegram vip': 'VIP Telegram',
      'encuentros personales': 'Private meetings',
      'videos premium': 'Premium videos',
      'packs destacados': 'Featured packs',
      'blog privado': 'Private blog',
      'actualizaciones': 'Updates',
    }

    const valueMap = {
      incluidos: 'Included',
      'acceso completo': 'Full access',
      'descuento 20%': '20% off',
      'acceso activo': 'Active access',
      semanales: 'Weekly',
    }

    return {
      ...row,
      label: labelMap[label] || row.label,
      value: valueMap[value] || row.value,
    }
  }

  function translatePlanPeriod(plan) {
    if (localeKey !== 'en') {
      return plan.period
    }

    const durationValue = Number(plan.durationValue || 1)

    if (plan.durationUnit === 'days') {
      return durationValue === 1 ? '1 day' : `${durationValue} days`
    }

    return durationValue === 1 ? '1 month' : `${durationValue} months`
  }

  return (
    <div className="access-pricing-card">
      <div className="access-pricing-header">
        <p className="creator-profile-eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>

      <div className="access-pricing-benefits">
        {benefitRows.map((row) => {
          const translatedRow = translateBenefitRow(row)

          return (
            <div className="access-pricing-benefit" key={row.label}>
              <span className="access-pricing-check" aria-hidden="true">
                ✓
              </span>
              <span>{translatedRow.label}</span>
              {translatedRow.value ? <strong>{translatedRow.value}</strong> : null}
            </div>
          )
        })}
      </div>

      <div className="access-pricing-panel">
        <div className="access-pricing-grid">
          {plans.map((plan, index) => (
            <button
              key={plan.slug}
              type="button"
              className={
                selectedIndex === index ? 'access-pricing-option is-active' : 'access-pricing-option'
              }
              onClick={() => setSelectedIndex(index)}
            >
              <span className="access-pricing-option-period">{translatePlanPeriod(plan)}</span>
              <strong>{plan.priceLabel}</strong>
            </button>
          ))}
        </div>

        {savingsMessage ? <p className="access-pricing-savings">{savingsMessage}</p> : null}

        <div className="access-pricing-trust">
          <span>{t('content.securePayment')}</span>
          <span>Visa</span>
          <span>Mastercard</span>
          <span>PayPal</span>
        </div>

        <button
          className="hero-primary-cta access-pricing-cta"
          type="button"
          onClick={() => onPurchase(selectedPlan.product)}
          disabled={!selectedPlan.product}
        >
          {ctaLabel}
        </button>

        <p className="access-pricing-footnote">{t('content.renewOrCancel')}</p>
      </div>
    </div>
  )
}
