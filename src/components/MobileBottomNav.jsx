import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { HiBookOpen, HiCollection, HiOutlineLibrary } from 'react-icons/hi'
import { AiFillFire, AiOutlineShopping, AiOutlineVideoCamera } from 'react-icons/ai'
import { useAppState } from '../state/AppState'

function getNavToneStyles(tone) {
  const tones = {
    home: {
      color: 'var(--color-primary-hover)',
      bg: 'rgba(209, 31, 66, 0.12)',
      border: 'rgba(209, 31, 66, 0.2)',
      glow: 'rgba(209, 31, 66, 0.16)',
    },
    premium: {
      color: 'var(--color-accent-fire)',
      bg: 'rgba(255, 138, 42, 0.12)',
      border: 'rgba(255, 138, 42, 0.2)',
      glow: 'rgba(255, 138, 42, 0.16)',
    },
    packs: {
      color: 'var(--color-accent)',
      bg: 'rgba(214, 90, 35, 0.12)',
      border: 'rgba(214, 90, 35, 0.2)',
      glow: 'rgba(214, 90, 35, 0.16)',
    },
    merch: {
      color: 'var(--color-accent)',
      bg: 'rgba(214, 90, 35, 0.12)',
      border: 'rgba(214, 90, 35, 0.2)',
      glow: 'rgba(214, 90, 35, 0.16)',
    },
    blog: {
      color: 'var(--color-text-secondary)',
      bg: 'rgba(245, 238, 231, 0.08)',
      border: 'rgba(245, 238, 231, 0.14)',
      glow: 'rgba(245, 238, 231, 0.1)',
    },
    library: {
      color: 'var(--color-accent-fire)',
      bg: 'rgba(255, 138, 42, 0.12)',
      border: 'rgba(255, 138, 42, 0.2)',
      glow: 'rgba(255, 138, 42, 0.16)',
    },
    access: {
      color: 'var(--color-warning)',
      bg: 'rgba(226, 178, 75, 0.12)',
      border: 'rgba(226, 178, 75, 0.2)',
      glow: 'rgba(226, 178, 75, 0.16)',
    },
  }

  const selectedTone = tones[tone] || tones.premium

  return {
    '--nav-icon-color': selectedTone.color,
    '--nav-icon-bg': selectedTone.bg,
    '--nav-icon-border': selectedTone.border,
    '--nav-icon-glow': selectedTone.glow,
  }
}

function isRouteActive(pathname, href) {
  if (href === '/') {
    return pathname === '/'
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

export function MobileBottomNav() {
  const { session } = useAppState()
  const { t } = useTranslation()
  const location = useLocation()
  const pathname = location.pathname
  const basePath = pathname.startsWith('/sindyprivate') ? '/sindyprivate' : ''
  const libraryHref = session ? (basePath ? `${basePath}/library` : '/library') : basePath ? `${basePath}/access` : '/access'
  const isEncuentrosPage = pathname.startsWith('/encuentros')

  if (isEncuentrosPage) {
    return null
  }

  return (
    <nav className="mobile-bottom-nav" aria-label="Navegacion movil">
      <div className="mobile-bottom-nav-track">
        {[
          { key: 'home', label: t('nav.home'), href: basePath || '/', icon: AiFillFire, tone: 'home' },
          { key: 'videos', label: t('nav.premium'), href: basePath ? `${basePath}/videos` : '/videos', icon: AiOutlineVideoCamera, tone: 'premium' },
          { key: 'packs', label: t('nav.packs'), href: basePath ? `${basePath}/packs` : '/packs', icon: HiCollection, tone: 'packs' },
          { key: 'calzones', label: t('nav.calzones'), href: basePath ? `${basePath}/calzones` : '/calzones', icon: AiOutlineShopping, tone: 'merch' },
          { key: 'blog', label: t('nav.blog'), href: basePath ? `${basePath}/blog` : '/blog', icon: HiBookOpen, tone: 'blog' },
          {
            key: 'library',
            label: session ? t('nav.library') : t('nav.signIn'),
            href: libraryHref,
            icon: HiOutlineLibrary,
            tone: session ? 'library' : 'access',
          },
        ].map((item) => {
          const Icon = item.icon
          const isActive = isRouteActive(pathname, item.href)

          return (
            <NavLink
              key={item.key}
              style={getNavToneStyles(item.tone)}
              className={isActive ? 'mobile-bottom-nav-item is-active' : 'mobile-bottom-nav-item'}
              to={item.href}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
            >
              <Icon aria-hidden="true" />
              <span className="sr-only">{item.label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
