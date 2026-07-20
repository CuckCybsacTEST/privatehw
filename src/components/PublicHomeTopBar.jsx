import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BiLogoTelegram } from 'react-icons/bi'
import { AiOutlineLogout } from 'react-icons/ai'
import { useAppState } from '../state/AppState'

export function PublicHomeTopBar() {
  const navigate = useNavigate()
  const { session, siteContent, logout } = useAppState()
  const { t } = useTranslation()
  const telegramUrl = siteContent?.socialUrl || 'https://t.me/Kinkly'

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <header className="public-home-topbar" aria-label="Barra superior principal">
      <Link className="public-home-topbar-brand" to="/" aria-label={t('nav.home')}>
        <span className="public-home-topbar-brand-mark">K</span>
        <span className="public-home-topbar-brand-copy">
          <strong>Kinkly</strong>
          <small>Directorio privado</small>
        </span>
      </Link>

      <div className="public-home-topbar-actions">
        <a
          className="public-home-topbar-telegram"
          href={telegramUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('footer.telegram')}
          title={t('footer.telegram')}
        >
          <BiLogoTelegram aria-hidden="true" />
        </a>

        <Link className="public-home-topbar-cta is-primary" to="/muy-pronto">
          {t('home.publishFree', { defaultValue: 'Muy pronto' })}
        </Link>

        {session ? (
          <button className="public-home-topbar-cta" type="button" onClick={handleLogout}>
            <AiOutlineLogout aria-hidden="true" />
            <span>{t('admin.logout', { defaultValue: 'Cerrar sesion' })}</span>
          </button>
        ) : (
          <>
            <Link className="public-home-topbar-cta" to="/access">
              {t('access.login')}
            </Link>
            <Link className="public-home-topbar-cta" to="/access?tab=register">
              {t('access.register')}
            </Link>
          </>
        )}
      </div>
    </header>
  )
}
