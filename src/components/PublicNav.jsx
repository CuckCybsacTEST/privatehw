import { Link, NavLink, useLocation } from 'react-router-dom'
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
    { label: 'Inicio', href: resolveSectionHref(pathname, 'home-top'), type: 'section' },
    { label: 'Acceso total', href: resolveSectionHref(pathname, 'access-total'), type: 'section' },
    { label: 'Videos premium', href: resolveSectionHref(pathname, 'videos'), type: 'section' },
    { label: 'Packs', href: resolveSectionHref(pathname, 'collections'), type: 'section' },
    { label: 'Calzones', href: resolveSectionHref(pathname, 'merch'), type: 'section' },
    { label: 'Blog', href: resolveSectionHref(pathname, 'blog'), type: 'section' },
    { label: session ? 'Mi biblioteca' : 'Ingresar', href: session ? '/library' : '/access', type: 'route' },
  ]

  return (
    <>
      <header className="public-nav">
        <Link className="public-brand" to="/">
          <span className="public-brand-mark">SM</span>
          <span className="public-brand-copy">
            <strong>Sindy Mireya</strong>
            <small>Creator Studio</small>
          </span>
        </Link>

        <nav className="public-nav-links" aria-label="Navegacion principal">
          {primaryItems.map((item) =>
            item.type === 'route' ? (
              <NavLink
                key={item.label}
                className={({ isActive }) => (isActive ? 'public-nav-link is-active' : 'public-nav-link')}
                to={item.href}
              >
                {item.label}
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
                onClick={() => {
                  const sectionId = item.href.split('#')[1]

                  if (pathname === '/' && sectionId) {
                    window.dispatchEvent(
                      new CustomEvent('section-nav-arrive', {
                        detail: { sectionId },
                      }),
                    )
                  }
                }}
              >
                {item.label}
              </a>
            ),
          )}
          <NavLink className="public-nav-link" to="/encuentros">
            Encuentros
          </NavLink>
          <Link className="public-admin-link" to="/admin/login">
            Admin
          </Link>
        </nav>
      </header>
      <MobileBottomNav session={session} />
    </>
  )
}
