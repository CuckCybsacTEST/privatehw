import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { AtmosphericBackdrop } from '../components/AtmosphericBackdrop'
import { AccessTotalSection } from '../components/AccessTotalSection'
import { BlogTeaserSection } from '../components/BlogTeaserSection'
import { CreatorHero } from '../components/CreatorHero'
import { HomePreviewRail } from '../components/HomePreviewRail'
import { MembershipSection } from '../components/MembershipSection'
import { SiteFooter } from '../components/SiteFooter'
import { SpotlightGrid } from '../components/SpotlightGrid'
import { VideoCollectionsSection } from '../components/VideoCollectionsSection'
import { VideoShowcase } from '../components/VideoShowcase'
import { useAppState } from '../state/AppState'

export function LegacyHomePage() {
  const { siteContent } = useAppState()
  const { i18n } = useTranslation()
  const { sectionVisibility } = siteContent
  const legacyHomePath = '/sindyprivate'
  const lastSectionIdRef = useRef('')
  const sectionScrollLockRef = useRef(false)
  const sectionScrollUnlockRef = useRef(null)
  const languageScrollLockRef = useRef(false)
  const languageScrollUnlockRef = useRef(null)

  useEffect(() => {
    languageScrollLockRef.current = true

    if (languageScrollUnlockRef.current) {
      window.clearTimeout(languageScrollUnlockRef.current)
    }

    languageScrollUnlockRef.current = window.setTimeout(() => {
      languageScrollLockRef.current = false
    }, 300)

    return () => {
      if (languageScrollUnlockRef.current) {
        window.clearTimeout(languageScrollUnlockRef.current)
      }
    }
  }, [i18n.resolvedLanguage])

  useEffect(() => {
    function revealTarget(sectionId) {
      if (!sectionId) {
        return
      }

      if (languageScrollLockRef.current) {
        return
      }

      if (sectionScrollLockRef.current && lastSectionIdRef.current === sectionId) {
        return
      }

      if (lastSectionIdRef.current === sectionId) {
        return
      }

      const target = document.getElementById(sectionId)

      if (!target) {
        return
      }

      lastSectionIdRef.current = sectionId
      sectionScrollLockRef.current = true
      if (sectionScrollUnlockRef.current) {
        window.clearTimeout(sectionScrollUnlockRef.current)
      }

      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })

      target.classList.remove('section-arrival-highlight')
      window.requestAnimationFrame(() => {
        target.classList.add('section-arrival-highlight')
      })

      window.setTimeout(() => {
        target.classList.remove('section-arrival-highlight')
      }, 1600)

      sectionScrollUnlockRef.current = window.setTimeout(() => {
        sectionScrollLockRef.current = false
      }, 650)
    }

    function handleHashArrival() {
      revealTarget(window.location.hash.replace('#', ''))
    }

    function handleManualArrival(event) {
      revealTarget(event.detail?.sectionId)
    }

    handleHashArrival()
    window.addEventListener('hashchange', handleHashArrival)
    window.addEventListener('section-nav-arrive', handleManualArrival)

    return () => {
      window.removeEventListener('hashchange', handleHashArrival)
      window.removeEventListener('section-nav-arrive', handleManualArrival)
      if (sectionScrollUnlockRef.current) {
        window.clearTimeout(sectionScrollUnlockRef.current)
      }
    }
  }, [])

  return (
    <main className="creator-home home-preview-page">
      <AtmosphericBackdrop
        variant="editorial"
        intensity="soft"
        glowPosition="center-right"
        grain={false}
        withVignette={false}
        className="home-backdrop"
      />
      <HomePreviewRail homePath={legacyHomePath} />
      <div className="home-preview-main">
        {sectionVisibility.creatorHero || sectionVisibility.accessTotal ? (
          <section className="hero-access-row">
            {sectionVisibility.creatorHero ? <CreatorHero content={siteContent} basePath={legacyHomePath} /> : null}
            {sectionVisibility.accessTotal ? <AccessTotalSection content={siteContent.accessTotal} basePath={legacyHomePath} /> : null}
          </section>
        ) : null}
        {sectionVisibility.mediaSpotlight ? <SpotlightGrid content={siteContent} /> : null}
        {sectionVisibility.videoLibrary ? <VideoShowcase content={siteContent} basePath={legacyHomePath} /> : null}
        {sectionVisibility.membership ? <MembershipSection content={siteContent} basePath={legacyHomePath} /> : null}
        {sectionVisibility.videoCollections ? <VideoCollectionsSection content={siteContent} basePath={legacyHomePath} /> : null}
        {sectionVisibility.blogTeaser ? <BlogTeaserSection content={siteContent} basePath={legacyHomePath} /> : null}
        {sectionVisibility.siteFooter ? <SiteFooter content={siteContent} basePath={legacyHomePath} /> : null}
      </div>
    </main>
  )
}
