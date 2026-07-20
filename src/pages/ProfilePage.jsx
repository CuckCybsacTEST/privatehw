import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AiFillFire, AiOutlineCalendar, AiOutlinePicture } from 'react-icons/ai'
import { HiOutlineUser } from 'react-icons/hi'
import { PublicNav } from '../components/PublicNav'
import { Seo } from '../components/Seo'
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

function getEncounterNavToneStyles(tone) {
  const tones = {
    home: { color: 'var(--color-primary-hover)' },
    gallery: { color: 'var(--color-warning)' },
    booking: { color: 'var(--color-accent-fire)' },
    profile: { color: 'var(--color-accent-fire)' },
  }

  const selectedTone = tones[tone] || tones.profile

  return {
    '--encuentros-nav-item-color': selectedTone.color,
  }
}

export function ProfilePage() {
  const { session, entitlements, orders, siteContent, logout, encuentrosModel } = useAppState()
  const { i18n, t } = useTranslation()
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const isEncuentrosContext = searchParams.get('source') === 'encuentros'
  const modelPath = searchParams.get('model') || '/encuentros'
  const encounterHomeHref = modelPath.startsWith('/encuentros/') ? modelPath : '/encuentros'
  const encounterGalleryHref = `${encounterHomeHref}?tab=gallery`
  const encounterBookingHref = `${encounterHomeHref}/citas`
  const dateLocale = i18n.resolvedLanguage === 'en' ? 'en-US' : 'es-PE'
  const accessSummary = summarizeProfileAccess(entitlements)
  const reservationOrders = orders.filter(
    (order) =>
      order.metadata?.checkoutType === 'reservation' ||
      order.metadata?.productType === 'reservation' ||
      String(order.items?.[0]?.productSlug || '').startsWith('reservation-'),
  )
  const fullName = session?.name || t('profile.noName')
  const audienceLabel =
    session?.audience === 'model'
      ? 'Modelo'
      : session?.audience === 'visitor'
        ? 'Visitante'
        : 'Cliente'
  const formattedExpiresAt = accessSummary.latestExpiresAt
    ? new Intl.DateTimeFormat(dateLocale, { dateStyle: 'medium' }).format(
        new Date(accessSummary.latestExpiresAt),
      )
    : ''

  return (
    <main className={isEncuentrosContext ? 'creator-home profile-shell-encuentros' : 'creator-home'}>
      <Seo
        title="Perfil | Kinkly"
        description="Panel de perfil privado con accesos, estado de cuenta y rutas de usuario."
        canonicalPath="/profile"
        noindex
      />
      {isEncuentrosContext ? null : <PublicNav />}
      <section className={isEncuentrosContext ? 'content-listing-page profile-page profile-page-encuentros' : 'content-listing-page profile-page'}>
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
                <span>{session?.role === 'admin' ? t('profile.roleAdmin') : audienceLabel}</span>
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

          {encuentrosModel ? (
            <article className="profile-card">
              <span>Panel de modelo</span>
              <strong>{encuentrosModel.displayName || encuentrosModel.slug}</strong>
              <p>Gestiona tu perfil verificado, fotos, agenda, voz y redes de suscripcion.</p>
              <Link className="hero-primary-cta" to="/modelo/dashboard">
                Abrir panel
              </Link>
            </article>
          ) : null}

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
      {isEncuentrosContext ? (
        <div className="encuentros-screen-bottom-nav-shell">
          <nav className="encuentros-screen-bottom-nav" aria-label="Navegacion de encuentros">
            <Link
              to={encounterHomeHref}
              style={getEncounterNavToneStyles('home')}
              className="encuentros-screen-bottom-nav-item"
              aria-label="Inicio"
              title="Inicio"
            >
              <AiFillFire aria-hidden="true" />
              <span>Inicio</span>
            </Link>
            <Link
              to={encounterGalleryHref}
              style={getEncounterNavToneStyles('gallery')}
              className="encuentros-screen-bottom-nav-item"
              aria-label="Galeria"
              title="Galeria"
            >
              <AiOutlinePicture aria-hidden="true" />
              <span>Galeria</span>
            </Link>
            <Link
              to={encounterBookingHref}
              style={getEncounterNavToneStyles('booking')}
              className="encuentros-screen-bottom-nav-item encuentros-screen-bottom-nav-item-primary"
              aria-label="Reserva"
              title="Reserva"
            >
              <AiOutlineCalendar aria-hidden="true" />
              <span>Reserva</span>
            </Link>
            <Link
              to={location.pathname + location.search}
              style={getEncounterNavToneStyles('profile')}
              className="encuentros-screen-bottom-nav-item is-active"
              aria-current="page"
              aria-label={t('profile.title')}
              title={t('profile.title')}
            >
              <HiOutlineUser aria-hidden="true" />
              <span>{t('profile.title')}</span>
            </Link>
          </nav>
        </div>
      ) : (
        <SiteFooter content={siteContent} />
      )}
    </main>
  )
}
