import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PublicNav } from '../components/PublicNav'
import { SiteFooter } from '../components/SiteFooter'
import { useAppState } from '../state/AppState'
import {
  getActiveDigitalEntitlement,
  getActiveEntitlements,
  getLatestDigitalEntitlement,
} from '../utils/entitlements'

function summarizeProfileAccess(entitlements = []) {
  const activeEntitlements = getActiveEntitlements(entitlements)
  const activeSubscription = getActiveDigitalEntitlement(entitlements)
  const latestSubscription = getLatestDigitalEntitlement(entitlements)

  return {
    activeCount: activeEntitlements.length,
    hasSubscription: Boolean(activeSubscription),
    latestExpiresAt: latestSubscription?.expiresAt || null,
  }
}

export function ProfilePage() {
  const { session, entitlements, orders, siteContent, logout } = useAppState()
  const { i18n, t } = useTranslation()
  const dateLocale = i18n.resolvedLanguage === 'en' ? 'en-US' : 'es-PE'
  const accessSummary = summarizeProfileAccess(entitlements)
  const reservationOrders = orders.filter(
    (order) =>
      order.metadata?.checkoutType === 'reservation' ||
      order.metadata?.productType === 'reservation' ||
      String(order.items?.[0]?.productSlug || '').startsWith('reservation-'),
  )
  const fullName = session?.name || t('profile.noName')
  const formattedExpiresAt = accessSummary.latestExpiresAt
    ? new Intl.DateTimeFormat(dateLocale, { dateStyle: 'medium' }).format(
        new Date(accessSummary.latestExpiresAt),
      )
    : ''

  return (
    <main className="creator-home">
      <PublicNav />
      <section className="content-listing-page profile-page">
        <div className="section-heading">
          <p className="section-kicker">{t('profile.eyebrow')}</p>
          <h1>{t('profile.title')}</h1>
          <p>{t('profile.description')}</p>
        </div>

        <div className="profile-layout">
          <article className="profile-card profile-card-main">
            <div className="profile-avatar" aria-hidden="true">
              {(fullName || 'U').slice(0, 1).toUpperCase()}
            </div>
            <div className="profile-main-copy">
              <span>{t('profile.account')}</span>
              <strong>{fullName}</strong>
              <p>{session?.email}</p>
              <div className="profile-badges">
                <span>{session?.role === 'admin' ? t('profile.roleAdmin') : t('profile.roleMember')}</span>
                <span>{session?.status === 'active' ? t('profile.statusActive') : t('profile.statusInactive')}</span>
              </div>
            </div>
          </article>

          <article className="profile-card">
            <span>{t('profile.accessSummary')}</span>
            <strong>{accessSummary.hasSubscription ? t('profile.totalAccess') : t('profile.registeredAccess')}</strong>
            <p>{t('profile.accessCount', { count: accessSummary.activeCount })}</p>
            {formattedExpiresAt ? (
              <p className="member-access-note">
                {t('profile.expiresAt', { date: formattedExpiresAt })}
              </p>
            ) : null}
          </article>

          <article className="profile-card">
            <span>{t('profile.reservations')}</span>
            <strong>{reservationOrders.length}</strong>
            <p>{t('profile.reservationsDescription')}</p>
          </article>

          <article className="profile-card">
            <span>{t('profile.library')}</span>
            <strong>{siteContent?.videoLibrary?.items?.length || 0}</strong>
            <p>{t('profile.libraryDescription')}</p>
            <Link className="hero-secondary-cta" to="/library">
              {t('profile.goLibrary')}
            </Link>
          </article>

          <article className="profile-card profile-card-actions">
            <Link className="hero-primary-cta" to="/">
              {t('profile.goHome')}
            </Link>
            <button className="video-preview-link" type="button" onClick={logout}>
              {t('profile.signOut')}
            </button>
          </article>
        </div>
      </section>
      <SiteFooter content={siteContent} />
    </main>
  )
}
