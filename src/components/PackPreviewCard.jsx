import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppState } from '../state/AppState'
import { buildPackAccessActions } from '../utils/packAccess'
import { resolveLocalizedRecord } from '../utils/localizedContent'

export function PackPreviewCard({ collection }) {
  const { getContentAccess, session, siteContent, subscriptionProduct } = useAppState()
  const { t, i18n } = useTranslation()
  const resolvedCollection = resolveLocalizedRecord(collection, i18n.resolvedLanguage)
  const localizedSiteContent = resolveLocalizedRecord(siteContent, i18n.resolvedLanguage)
  const access = getContentAccess(`pack:${resolvedCollection.slug}`)
  const actions = buildPackAccessActions({
    access,
    collectionSlug: resolvedCollection.slug,
    session,
    subscriptionProduct,
    siteContent: localizedSiteContent,
    t,
    viewHref: `/packs/${resolvedCollection.slug}`,
  })
  const primaryAction = actions.find((action) => action.variant === 'primary') || actions[0] || null
  const displayPrice = access.product?.priceLabel || resolvedCollection.priceLabel

  return (
    <article
      className="pack-card pack-card-pack"
      key={resolvedCollection.slug}
    >
      <div
        className="pack-card-media"
        aria-hidden="true"
        style={{ backgroundImage: `url("${resolvedCollection.coverImage}")` }}
      />
      <div className="pack-card-overlay" aria-hidden="true" />

      <div className="pack-card-body">
        <div className="video-collection-meta video-collection-meta-top">
          <span>{t('content.curatedPack')}</span>
        </div>

        <h3>{resolvedCollection.title}</h3>
        <p>{resolvedCollection.description}</p>

        <strong className="pack-card-price">{displayPrice}</strong>
        {primaryAction ? (
          <Link className="pack-card-button" to={primaryAction.href}>
            {primaryAction.label}
          </Link>
        ) : null}
      </div>
    </article>
  )
}
