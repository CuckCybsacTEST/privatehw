import { Link, NavLink, useLocation } from 'react-router-dom'
import {
  HiBookOpen,
  HiCollection,
  HiGift,
  HiHome,
  HiPhotograph,
  HiOutlineLibrary,
  HiPlay,
} from 'react-icons/hi'
import { useAppState } from '../state/AppState'
import { MobileBottomNav } from './MobileBottomNav'

function resolveSectionHref(pathname, sectionId) {
  return pathname === '/' ? `#${sectionId}` : `/#${sectionId}`
}

export function PublicNav() {
  const location = useLocation()
  const { session } = useAppState()
  const pathname = location.pathname
  const primaryItems = [
    { label: 'Inicio', href: resolveSectionHref(pathname, 'home-top'), type: 'section', icon: HiHome },
    {
      label: 'Catalogo premium',
      href: resolveSectionHref(pathname, 'videos'),
      type: 'section',
      icon: HiPlay,
    },
    {
      label: 'Packs',
      href: resolveSectionHref(pathname, 'collections'),
      type: 'section',
      icon: HiCollection,
    },
    {
      label: 'Calzones',
      href: '/calzones',
      type: 'route',
      icon: HiGift,
    },
    { label: 'Blog', href: resolveSectionHref(pathname, 'blog'), type: 'section', icon: HiBookOpen },
  ]
  const freeContentItem = {
    label: 'Contenido Gratis',
    href: '/free-content',
    type: 'route',
    icon: HiPhotograph,
  }
  const visiblePrimaryItems = session ? primaryItems : [...primaryItems, freeContentItem]
  const utilityItems = [
    {
      label: session ? 'Mi biblioteca' : 'Ingresar',
      href: session ? '/library' : '/access',
      type: 'route',
      icon: HiOutlineLibrary,
    },
  ]
  const visibleUtilityItems = session ? [freeContentItem, ...utilityItems] : utilityItems

  function handleSectionClick(itemHref) {
    const sectionId = itemHref.split('#')[1]

    if (pathname === '/' && sectionId) {
      window.dispatchEvent(
        new CustomEvent('section-nav-arrive', {
          detail: { sectionId },
        }),
      )
    }
  }

  return (
    <>
      <header className="public-nav" aria-label="Navegacion principal">
        <Link className="public-brand" to="/">
          <span className="public-brand-mark">SM</span>
          <span className="public-brand-copy">
            <strong>Sindy Mireya</strong>
            <small>Creator Studio</small>
          </span>
        </Link>

        <div className="public-nav-sidebar">
          <nav className="public-nav-links" aria-label="Navegacion principal">
            {visiblePrimaryItems.map((item) => {
              const Icon = item.icon
              const isRoute = item.type === 'route'

              return isRoute ? (
                <NavLink
                  key={item.label}
                  className={({ isActive }) =>
                    isActive
                      ? 'public-nav-link public-nav-link-route is-active'
                      : 'public-nav-link public-nav-link-route'
                  }
                  to={item.href}
                >
                  <Icon aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              ) : (
                <a
                  key={item.label}
                  className={
                    pathname === '/' && item.label === 'Inicio'
                      ? 'public-nav-link is-active'
                      : 'public-nav-link'
                  }
                  href={item.href}
                  onClick={() => handleSectionClick(item.href)}
                >
                  <Icon aria-hidden="true" />
                  <span>{item.label}</span>
                </a>
              )
            })}
          </nav>

          <div className="public-nav-utility">
            {visibleUtilityItems.map((item) => {
              const Icon = item.icon

              return (
                <NavLink
                  key={item.label}
                  className={({ isActive }) =>
                    isActive ? 'public-nav-link public-nav-link-route is-active' : 'public-nav-link public-nav-link-route'
                  }
                  to={item.href}
                >
                  <Icon aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
            <NavLink className="public-nav-link public-nav-link-route" to="/encuentros">
              <HiCollection aria-hidden="true" />
              <span>Encuentros</span>
            </NavLink>
            <Link className="public-admin-link" to="/admin/login">
              Admin
            </Link>
          </div>
        </div>
      </header>
      <MobileBottomNav session={session} />
    </>
  )
}
