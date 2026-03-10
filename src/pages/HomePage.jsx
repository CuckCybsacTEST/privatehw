import { useEffect } from 'react'
import { AccessTotalSection } from '../components/AccessTotalSection'
import { BlogTeaserSection } from '../components/BlogTeaserSection'
import { CreatorHero } from '../components/CreatorHero'
import { MembershipSection } from '../components/MembershipSection'
import { PhysicalMerchSection } from '../components/PhysicalMerchSection'
import { PublicNav } from '../components/PublicNav'
import { SiteFooter } from '../components/SiteFooter'
import { SpotlightGrid } from '../components/SpotlightGrid'
import { VideoCollectionsSection } from '../components/VideoCollectionsSection'
import { VideoShowcase } from '../components/VideoShowcase'
import { useAppState } from '../state/AppState'

export function HomePage() {
  const { siteContent } = useAppState()
  const { sectionVisibility } = siteContent

  useEffect(() => {
    function highlightTarget(sectionId) {
      if (!sectionId) {
        return
      }

      const target = document.getElementById(sectionId)

      if (!target) {
        return
      }

      target.classList.remove('section-arrival-highlight')
      window.requestAnimationFrame(() => {
        target.classList.add('section-arrival-highlight')
      })

      window.setTimeout(() => {
        target.classList.remove('section-arrival-highlight')
      }, 1600)
    }

    function handleHashArrival() {
      highlightTarget(window.location.hash.replace('#', ''))
    }

    function handleManualArrival(event) {
      highlightTarget(event.detail?.sectionId)
    }

    handleHashArrival()
    window.addEventListener('hashchange', handleHashArrival)
    window.addEventListener('section-nav-arrive', handleManualArrival)

    return () => {
      window.removeEventListener('hashchange', handleHashArrival)
      window.removeEventListener('section-nav-arrive', handleManualArrival)
    }
  }, [])

  return (
    <main className="creator-home">
      <PublicNav />
      {sectionVisibility.creatorHero || sectionVisibility.accessTotal ? (
        <section className="hero-access-row">
          {sectionVisibility.creatorHero ? <CreatorHero content={siteContent} /> : null}
          {sectionVisibility.accessTotal ? <AccessTotalSection content={siteContent.accessTotal} /> : null}
        </section>
      ) : null}
      {sectionVisibility.mediaSpotlight ? <SpotlightGrid content={siteContent} /> : null}
      {sectionVisibility.videoLibrary ? <VideoShowcase content={siteContent} /> : null}
      {sectionVisibility.videoCollections || sectionVisibility.physicalMerch ? (
        <section className="collections-commerce-row">
          {sectionVisibility.videoCollections ? (
            <VideoCollectionsSection content={siteContent} />
          ) : null}
          {sectionVisibility.physicalMerch ? (
            <PhysicalMerchSection content={siteContent} />
          ) : null}
        </section>
      ) : null}
      {sectionVisibility.membership ? <MembershipSection content={siteContent} /> : null}
      {sectionVisibility.blogTeaser ? <BlogTeaserSection content={siteContent} /> : null}
      {sectionVisibility.siteFooter ? <SiteFooter content={siteContent} /> : null}
    </main>
  )
}
