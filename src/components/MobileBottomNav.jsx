import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  HiBookOpen,
  HiCollection,
  HiGift,
  HiHome,
  HiLockClosed,
  HiOutlineLibrary,
  HiPhotograph,
  HiPlay,
} from 'react-icons/hi'

function resolveSectionHref(pathname, sectionId) {
  return pathname === '/' ? `#${sectionId}` : `/#${sectionId}`
}

export function MobileBottomNav({ session }) {
  const location = useLocation()
  const pathname = location.pathname
  const itemRefs = useRef([])
  const manualScrollLockRef = useRef(0)
  const libraryLabel = session ? 'Biblioteca' : 'Ingresar'
  const libraryHref = session ? '/library' : '/access'
  const [activeKey, setActiveKey] = useState(pathname === '/' ? 'home' : libraryHref)

  const items = useMemo(
    () => {
      const freeContentItem = {
        key: '/free-content',
        label: 'Contenido Gratis',
        href: '/free-content',
        icon: HiPhotograph,
        type: 'route',
      }

      const baseItems = [
        {
          key: 'home',
          label: 'Inicio',
          href: resolveSectionHref(pathname, 'home-top'),
          icon: HiHome,
          type: 'section',
          sectionId: 'home-top',
        },
        {
          key: 'access-total',
          label: 'Acceso total',
          href: resolveSectionHref(pathname, 'access-total'),
          icon: HiLockClosed,
          type: 'section',
          sectionId: 'access-total',
        },
        {
          key: 'videos',
          label: 'Catalogo premium',
          href: resolveSectionHref(pathname, 'videos'),
          icon: HiPlay,
          type: 'section',
          sectionId: 'videos',
        },
        {
          key: 'collections',
          label: 'Packs',
          href: resolveSectionHref(pathname, 'collections'),
          icon: HiCollection,
          type: 'section',
          sectionId: 'collections',
        },
        {
          key: '/calzones',
          label: 'Calzones',
          href: '/calzones',
          icon: HiGift,
          type: 'route',
        },
        {
          key: 'blog',
          label: 'Blog',
          href: resolveSectionHref(pathname, 'blog'),
          icon: HiBookOpen,
          type: 'section',
          sectionId: 'blog',
        },
      ]

      if (!session) {
        return [
          ...baseItems,
          freeContentItem,
          {
            key: libraryHref,
            label: libraryLabel,
            href: libraryHref,
            icon: HiOutlineLibrary,
            type: 'route',
          },
        ]
      }

      return [
        ...baseItems,
        freeContentItem,
        {
          key: libraryHref,
          label: libraryLabel,
          href: libraryHref,
          icon: HiOutlineLibrary,
          type: 'route',
        },
      ]
    },
    [libraryHref, libraryLabel, pathname, session],
  )

  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, items.length)
  }, [items.length])

  useEffect(() => {
    if (pathname !== '/') {
      if (pathname.startsWith('/blog')) {
        setActiveKey('blog')
        return
      }

      if (pathname === '/free-content') {
        setActiveKey('/free-content')
        return
      }

      if (pathname === '/calzones') {
        setActiveKey('/calzones')
        return
      }

      if (pathname === '/library' || pathname === '/access') {
        setActiveKey(libraryHref)
        return
      }

      setActiveKey('home')
      return
    }

    const sectionItems = items.filter((item) => item.type === 'section')
    const sectionElements = sectionItems.map((item) => ({
      key: item.key,
      element: document.getElementById(item.sectionId),
    }))

    if (!sectionElements.some((item) => item.element)) {
      setActiveKey('home')
      return
    }

    function syncActiveSection() {
      if (Date.now() < manualScrollLockRef.current) {
        return
      }

      const viewportOffset = window.innerWidth <= 900 ? 96 : 32
      let nextActiveKey = sectionItems[0]?.key ?? 'home'
      const reachedSections = sectionElements
        .map((item, index) => ({
          key: item.key,
          index,
          top: item.element?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY,
        }))
        .filter((item) => item.top <= viewportOffset)
        .sort((left, right) => {
          if (left.top === right.top) {
            return left.index - right.index
          }

          return right.top - left.top
        })

      if (reachedSections.length) {
        nextActiveKey = reachedSections[0].key
      }

      const firstSection = sectionElements[0]?.element

      if (firstSection && firstSection.getBoundingClientRect().top > viewportOffset) {
        nextActiveKey = 'home'
      }

      setActiveKey((currentKey) => (currentKey === nextActiveKey ? currentKey : nextActiveKey))
    }

    syncActiveSection()
    window.addEventListener('scroll', syncActiveSection, { passive: true })
    window.addEventListener('resize', syncActiveSection)

    return () => {
      window.removeEventListener('scroll', syncActiveSection)
      window.removeEventListener('resize', syncActiveSection)
    }
  }, [items, libraryHref, pathname])

  useEffect(() => {
    const activeIndex = items.findIndex((item) => item.key === activeKey)
    const nextItem = itemRefs.current[activeIndex]

    if (!nextItem) {
      return
    }

    nextItem.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    })
  }, [activeKey, items])

  return (
    <nav className="mobile-bottom-nav" aria-label="Navegacion movil">
      <div className="mobile-bottom-nav-track">
        {items.map((item, index) => {
          const Icon = item.icon

          if (item.type === 'route') {
            return (
              <NavLink
                key={item.key}
                ref={(node) => {
                  itemRefs.current[index] = node
                }}
                className={({ isActive }) => {
                  const routeActive = item.href === '/' ? pathname === '/' : isActive
                  return routeActive ? 'mobile-bottom-nav-item is-active' : 'mobile-bottom-nav-item'
                }}
                to={item.href}
                onClick={() => setActiveKey(item.key)}
              >
                <Icon aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            )
          }

          const isActive = pathname === '/' && activeKey === item.key

          return (
          <a
            key={item.key}
            ref={(node) => {
              itemRefs.current[index] = node
            }}
            className={isActive ? 'mobile-bottom-nav-item is-active' : 'mobile-bottom-nav-item'}
            href={item.href}
            onClick={() => {
              manualScrollLockRef.current = Date.now() + 1200
              setActiveKey(item.key)
            }}
          >
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
            </a>
          )
        })}
      </div>
    </nav>
  )
}
