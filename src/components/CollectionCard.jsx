import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppState } from '../state/AppState'
import { buildPackAccessActions } from '../utils/packAccess'
import { resolveLocalizedRecord } from '../utils/localizedContent'

export function CollectionCard({ collection, isFeatured = false, presentation = 'default' }) {
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
  const showFeaturedTreatment = isFeatured

  return (
    <article
      className={`video-collection-card${showFeaturedTreatment ? ' is-featured' : ''}`}
      key={resolvedCollection.slug}
    >
      <div className="video-collection-visual">
        <img
          src={resolvedCollection.coverImage}
          alt={resolvedCollection.title}
          loading="lazy"
          decoding="async"
        />
        {access.unlocked ? (
          <div className="video-collection-overlay is-unlocked">
            <span>{resolvedCollection.itemCount}</span>
          </div>
        ) : (
          <div className="video-collection-overlay">
            <span>{resolvedCollection.itemCount}</span>
            <strong>{resolvedCollection.priceLabel}</strong>
          </div>
        )}
      </div>
      <div className="video-collection-copy">
        <div className="video-collection-meta video-collection-meta-top">
          <span>{showFeaturedTreatment ? 'Pack principal' : t('content.curatedPack')}</span>
        </div>

        <h3>{resolvedCollection.title}</h3>
        <p>{resolvedCollection.description}</p>

        <ul className="video-collection-tags">
          {resolvedCollection.highlights.slice(0, 2).map((highlight) => (
            <li key={highlight}>{highlight}</li>
          ))}
        </ul>

        <p className="video-collection-note">
          {showFeaturedTreatment
            ? 'Pack principal con mayor presencia visual y acceso directo al detalle.'
            : 'Vista previa editorial, acceso curado y compra directa sin friccion.'}
        </p>

        <p className="video-collection-access">
          {access.unlocked
            ? access.includedBySubscription
              ? t('content.includedSubscription')
              : t('content.unlocked')
            : resolvedCollection.accessLabel}
        </p>

        <div className="video-collection-actions">
          {actions.map((action) => (
            <Link
              key={action.key}
              className={action.variant === 'secondary' ? 'hero-secondary-cta' : 'video-buy-link'}
              to={action.href}
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </article>
  )
}
