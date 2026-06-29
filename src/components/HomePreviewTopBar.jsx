import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AiOutlineBell, AiOutlineSearch } from 'react-icons/ai'
import { BiLogoTelegram } from 'react-icons/bi'
import { useAppState } from '../state/AppState'

export function HomePreviewTopBar() {
  const { session, siteContent } = useAppState()
  const { t } = useTranslation()
  const telegramUrl = siteContent?.socialUrl || 'https://t.me/SindyHotwife'

  return (
    <header className="home-topbar" aria-label="Barra superior">
      <label className="home-topbar-search">
        <AiOutlineSearch aria-hidden="true" />
        <input
          type="search"
          placeholder={t('homeSearchPlaceholder')}
          aria-label={t('homeSearchPlaceholder')}
        />
      </label>

      <div className="home-topbar-actions">
        <a
          className="home-topbar-icon-button"
          href={telegramUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('footer.telegram')}
        >
          <BiLogoTelegram aria-hidden="true" />
        </a>
        {session ? (
          <Link className="home-topbar-user" to="/profile" aria-label={t('profile.title')}>
            <span className="home-topbar-user-avatar" aria-hidden="true" />
            <strong>{session.name || t('profile.title')}</strong>
            <AiOutlineBell aria-hidden="true" className="home-topbar-user-bell" />
          </Link>
        ) : (
          <div className="home-topbar-auth">
            <Link className="home-topbar-auth-button home-topbar-auth-button-secondary" to="/access">
              {t('access.login')}
            </Link>
            <Link className="home-topbar-auth-button home-topbar-auth-button-primary" to="/access">
              {t('access.register')}
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
