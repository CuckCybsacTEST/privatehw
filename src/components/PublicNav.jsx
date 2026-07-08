import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  HiBookOpen,
  HiCollection,
  HiOutlineGlobe,
  HiOutlineLibrary,
  HiUser,
} from 'react-icons/hi'
import { AiFillFire, AiOutlineShopping, AiOutlineVideoCamera } from 'react-icons/ai'
import { useAppState } from '../state/AppState'
import { LanguageSwitcher } from './LanguageSwitcher'

function resolveSectionHref(pathname, sectionId, homePath = '/') {
  return pathname === homePath ? `#${sectionId}` : `${homePath}#${sectionId}`
}

function getNavToneStyles(tone) {
  const tones = {
    home: {
      color: 'var(--color-primary-hover)',
      bg: 'rgba(209, 31, 66, 0.12)',
      border: 'rgba(209, 31, 66, 0.22)',
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
    calzones: {
      color: 'var(--color-warning)',
      bg: 'rgba(226, 178, 75, 0.12)',
      border: 'rgba(226, 178, 75, 0.2)',
      glow: 'rgba(226, 178, 75, 0.16)',
    },
    blog: {
      color: 'var(--color-text-secondary)',
      bg: 'rgba(245, 238, 231, 0.08)',
      border: 'rgba(245, 238, 231, 0.14)',
      glow: 'rgba(245, 238, 231, 0.1)',
    },
    profile: {
      color: 'var(--color-primary)',
      bg: 'rgba(171, 21, 51, 0.12)',
      border: 'rgba(171, 21, 51, 0.2)',
      glow: 'rgba(171, 21, 51, 0.16)',
    },
    library: {
      color: 'var(--color-accent-fire)',
      bg: 'rgba(255, 138, 42, 0.12)',
      border: 'rgba(255, 138, 42, 0.2)',
      glow: 'rgba(255, 138, 42, 0.16)',
    },
    signin: {
      color: 'var(--color-warning)',
      bg: 'rgba(226, 178, 75, 0.12)',
      border: 'rgba(226, 178, 75, 0.2)',
      glow: 'rgba(226, 178, 75, 0.16)',
    },
    language: {
      color: 'var(--color-text-secondary)',
      bg: 'rgba(245, 238, 231, 0.06)',
      border: 'rgba(245, 238, 231, 0.12)',
      glow: 'rgba(245, 238, 231, 0.08)',
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

function PublicNavCardLink({ href, active, onClick, children, route = false }) {
  const className = route ? 'public-nav-card public-nav-card-route' : 'public-nav-card'

  if (route) {
    return (
      <NavLink className={({ isActive }) => (isActive ? `${className} is-active` : className)} to={href}>
        {children}
      </NavLink>
    )
  }

  return (
    <Link className={active ? `${className} is-active` : className} to={href} onClick={onClick}>
      {children}
    </Link>
  )
}

export function PublicNav({ homePath = '/' }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { session } = useAppState()
  const { t, i18n } = useTranslation()
  const pathname = location.pathname
  const basePath = pathname.startsWith('/sindyprivate') ? '/sindyprivate' : ''
  const resolvedHomePath = homePath === '/' && basePath ? basePath : homePath
  const currentLanguage = i18n.resolvedLanguage?.slice(0, 2) || i18n.language?.slice(0, 2) || 'es'

  const primaryItems = [
    {
      label: t('nav.home'),
      href: resolveSectionHref(pathname, 'home-top', resolvedHomePath),
      type: 'section',
      icon: AiFillFire,
      tone: 'home',
    },
    {
      label: t('nav.premium'),
      href: resolveSectionHref(pathname, 'videos', resolvedHomePath),
      type: 'section',
      icon: AiOutlineVideoCamera,
      tone: 'premium',
    },
    {
      label: t('nav.packs'),
      href: basePath ? `${basePath}/packs` : '/packs',
      type: 'route',
      icon: HiCollection,
      tone: 'packs',
    },
    {
      label: t('nav.calzones'),
      href: basePath ? `${basePath}/calzones` : '/calzones',
      type: 'route',
      icon: AiOutlineShopping,
      tone: 'calzones',
    },
    {
      label: t('nav.blog'),
      href: resolveSectionHref(pathname, 'blog', resolvedHomePath),
      type: 'section',
      icon: HiBookOpen,
      tone: 'blog',
    },
  ]

  const utilityItems = session
    ? [
        {
          label: session.name || t('nav.profile'),
          href: basePath ? `${basePath}/profile` : '/profile',
          type: 'route',
          icon: HiUser,
          tone: 'profile',
        },
        {
          label: t('nav.library'),
          href: basePath ? `${basePath}/library` : '/library',
          type: 'route',
          icon: HiOutlineLibrary,
          tone: 'library',
        },
      ]
    : [
        {
          label: t('nav.signIn'),
          href: basePath ? `${basePath}/access` : '/access',
          type: 'route',
          icon: HiOutlineLibrary,
          tone: 'signin',
        },
      ]

  function handleSectionClick(itemHref) {
    const sectionId = itemHref.split('#')[1]

    if ((pathname === '/' || pathname === resolvedHomePath) && sectionId) {
      window.dispatchEvent(
        new CustomEvent('section-nav-arrive', {
          detail: { sectionId },
        }),
      )
      return
    }

    if (sectionId) {
      navigate(`${resolvedHomePath}#${sectionId}`)
    }
  }

  return (
    <>
      <header className="public-nav" aria-label="Navegacion principal">
        <Link className="public-brand public-nav-brandcard" to={resolvedHomePath}>
          <span className="public-brand-mark">K</span>
          <span className="public-brand-copy">
            <strong>Kinkly</strong>
            <small>Directorio</small>
          </span>
        </Link>

        <div className="public-nav-sidebar">
          <nav className="public-nav-panel" aria-label="Navegacion principal">
            {primaryItems.map((item) => {
              const Icon = item.icon
              const isRoute = item.type === 'route'

              return (
                <PublicNavCardLink
                  key={item.href}
                  href={item.href}
                  active={item.href === resolveSectionHref(pathname, 'home-top', resolvedHomePath)}
                  onClick={() => handleSectionClick(item.href)}
                  route={isRoute}
                >
                  <span className="public-nav-card-icon" aria-hidden="true" style={getNavToneStyles(item.tone)}>
                    <Icon />
                  </span>
                  <span className="public-nav-card-copy">
                    <strong>{item.label}</strong>
                  </span>
                  <span className="public-nav-card-chevron" aria-hidden="true">
                    {'>'}
                  </span>
                </PublicNavCardLink>
              )
            })}
          </nav>

          <div className="public-nav-divider" aria-hidden="true" />

          <div className="public-nav-panel public-nav-panel-utility">
            {utilityItems.map((item) => {
              const Icon = item.icon

              return (
              <PublicNavCardLink key={item.href} href={item.href} route>
                <span className="public-nav-card-icon" aria-hidden="true" style={getNavToneStyles(item.tone)}>
                  <Icon />
                </span>
                  <span className="public-nav-card-copy">
                    <strong>{item.label}</strong>
                  </span>
                  <span className="public-nav-card-chevron" aria-hidden="true">
                    {'>'}
                  </span>
                </PublicNavCardLink>
              )
            })}

            <div className="public-nav-language-card">
              <span className="public-nav-language-icon" aria-hidden="true" style={getNavToneStyles('language')}>
                <HiOutlineGlobe />
              </span>
              <div className="public-nav-language-copy">
                <strong>{t('language.label')}</strong>
                <small>{currentLanguage.toUpperCase()}</small>
              </div>
              <LanguageSwitcher className="public-nav-language" />
            </div>
          </div>
        </div>
      </header>
    </>
  )
}
