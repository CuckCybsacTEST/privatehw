import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AiOutlineVideoCamera, AiOutlineShopping } from 'react-icons/ai'
import { HiBookOpen, HiOutlineLibrary, HiOutlineHome, HiOutlineUser } from 'react-icons/hi'
import { LanguageSwitcher } from './LanguageSwitcher'
import { useAppState } from '../state/AppState'
import { withBasePath } from '../utils/routes'

function resolveSectionHref(pathname, sectionId, homePath = '/') {
  return pathname === homePath ? `#${sectionId}` : `${homePath}#${sectionId}`
}

function RailItem({ href, icon: Icon, label, isActive = false, onClick, route = false, disabled = false }) {
  if (route) {
    return (
      <NavLink
        className={({ isActive: routeActive }) =>
          routeActive || isActive ? 'home-rail-item is-active' : 'home-rail-item'
        }
        to={href}
        aria-label={label}
      >
        <Icon aria-hidden="true" />
        <small>{label}</small>
      </NavLink>
    )
  }

  if (disabled) {
    return (
      <button
        type="button"
        className={isActive ? 'home-rail-item is-active' : 'home-rail-item'}
        aria-label={label}
        aria-disabled="true"
        disabled
      >
        <Icon aria-hidden="true" />
        <small>{label}</small>
      </button>
    )
  }

  return (
    <button
      type="button"
      className={isActive ? 'home-rail-item is-active' : 'home-rail-item'}
      onClick={onClick}
      aria-label={label}
    >
      <Icon aria-hidden="true" />
      <small>{label}</small>
    </button>
  )
}

export function HomePreviewRail({ homePath = '/' }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { session } = useAppState()
  const { t, i18n } = useTranslation()
  const pathname = location.pathname
  const isVideosPage = pathname === withBasePath(homePath, '/videos')
  const currentLanguage = i18n.resolvedLanguage?.slice(0, 2) || i18n.language?.slice(0, 2) || 'es'
  const primaryItems = [
    { label: t('nav.home'), href: resolveSectionHref(pathname, 'home-top', homePath), icon: HiOutlineHome },
    isVideosPage
      ? { label: t('nav.premium'), href: withBasePath(homePath, '/videos'), icon: AiOutlineVideoCamera, route: true, active: true }
      : { label: t('nav.premium'), href: resolveSectionHref(pathname, 'videos', homePath), icon: AiOutlineVideoCamera },
    { label: t('nav.packs'), href: withBasePath(homePath, '/packs'), icon: AiOutlineShopping, route: true },
    { label: t('nav.calzones'), href: withBasePath(homePath, '/calzones'), icon: HiOutlineUser, route: true },
    { label: t('nav.blog'), href: resolveSectionHref(pathname, 'blog', homePath), icon: HiBookOpen },
    { label: t('nav.library'), href: withBasePath(homePath, '/library'), icon: HiOutlineLibrary, route: true },
  ]

  function handleSectionClick(itemHref) {
    const sectionId = itemHref.split('#')[1]

    if ((pathname === '/' || pathname === homePath) && sectionId) {
      window.dispatchEvent(
        new CustomEvent('section-nav-arrive', {
          detail: { sectionId },
        }),
      )
      return
    }

    if (sectionId) {
      navigate(`${homePath}#${sectionId}`)
    }
  }

  return (
    <aside className="home-rail" aria-label="Navegacion principal">
      <div className="home-rail-brand">
        <span className="home-rail-brand-mark">SM</span>
      </div>

      <nav className="home-rail-nav" aria-label="Navegacion principal">
        {primaryItems.map((item) => (
          <RailItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            route={item.route}
            onClick={item.route ? undefined : () => handleSectionClick(item.href)}
            isActive={Boolean(item.active) || (!item.route && item.href === resolveSectionHref(pathname, 'home-top', homePath))}
          />
        ))}
      </nav>

      <div className="home-rail-footer">
      <RailItem
          href={session ? withBasePath(homePath, '/profile') : withBasePath(homePath, '/access')}
          icon={HiOutlineUser}
          label={session ? session.name || t('nav.profile') : t('nav.signIn')}
          route
        />
        <div className="home-rail-language">
          <span className="home-rail-language-label">{currentLanguage.toUpperCase()}</span>
          <LanguageSwitcher className="home-rail-language-switcher" />
        </div>
      </div>
    </aside>
  )
}
