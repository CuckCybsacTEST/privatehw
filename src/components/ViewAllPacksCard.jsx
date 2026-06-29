import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function ViewAllPacksCard({ href, label, title, description }) {
  const { t } = useTranslation()
  const safeLabel = label || t('content.viewAllPacks')
  const safeTitle = title || t('content.premiumCatalog')

  return (
    <Link
      aria-label={`${safeLabel} ${safeTitle}`}
      className="pack-card pack-card-cta"
      to={href}
    >
      <div className="pack-card-cta-copy">
        <p className="video-collection-meta video-collection-meta-top">
          <span>{t('content.packsCategories')}</span>
        </p>
        <h3>{t('content.viewAllPacks')}</h3>
        <p>{description}</p>
        <span className="pack-card-cta-button">{safeLabel}</span>
      </div>
    </Link>
  )
}
