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

  return (
    <main className="creator-home">
      <PublicNav />
      {sectionVisibility.creatorHero ? <CreatorHero content={siteContent} /> : null}
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
