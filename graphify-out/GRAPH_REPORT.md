# Graph Report - PROJECTS  (2026-06-29)

## Corpus Check
- 98 files · ~120,187 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 677 nodes · 1439 edges · 27 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ff8dd695`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]

## God Nodes (most connected - your core abstractions)
1. `useAppState()` - 78 edges
2. `resolveLocalizedSection()` - 41 edges
3. `resolveLocalizedRecord()` - 26 edges
4. `ContentEditor()` - 22 edges
5. `assertSupabase()` - 21 edges
6. `Noir After Dark` - 20 edges
7. `Components` - 20 edges
8. `PublicNav()` - 19 edges
9. `SiteFooter()` - 19 edges
10. `assertServerConfig()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `getVideoSource()` --calls--> `extractGoogleDriveFileId()`  [EXTRACTED]
  server/index.js → src/utils/videoMedia.js
- `getCollectionSource()` --calls--> `extractGoogleDriveFileId()`  [EXTRACTED]
  server/index.js → src/utils/videoMedia.js
- `getFreeContentSource()` --calls--> `extractGoogleDriveFileId()`  [EXTRACTED]
  server/index.js → src/utils/videoMedia.js
- `resolveProductBySlug()` --calls--> `buildDerivedProducts()`  [EXTRACTED]
  server/index.js → src/data/defaultCommerce.js
- `syncProductsFromSiteContent()` --calls--> `buildDefaultProducts()`  [EXTRACTED]
  server/index.js → src/data/defaultCommerce.js

## Import Cycles
- None detected.

## Communities (27 total, 0 thin omitted)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (43): bottomCarouselImages, mergeItemsBySlug(), mergeSiteContent(), normalizeCarouselSlides(), normalizeEncounterPriceLabel(), normalizeFreeContentItem(), normalizePhysicalMerchItem(), normalizePriceLabel() (+35 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (57): isPersistentProductType(), base64UrlEncode(), buildGoogleDriveDownloadUrl(), fetchGoogleDriveMedia(), getGoogleDriveFolderId(), getServiceAccountAccessToken(), isGoogleDriveConfigured(), serviceAccountPrivateKey (+49 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (39): AtmosphericBackdrop(), EncuentrosBookingWizardModal(), formatShortDateLabel(), EncuentrosGalleryModal(), fetchEncuentrosBookingPricing(), EncuentrosCitasPage(), EncuentrosBottomNav(), EncuentrosPage() (+31 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (35): BlogManager(), buildTaxonomyOptions(), emptyPost(), getAccessLabel(), getStatusLabel(), isEmptyHtml(), pruneLocalizedDraft(), uniqueValues() (+27 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (30): AgeVerificationGate(), AppLoader(), HomePreviewTopBar(), LanguageSync(), HomePage(), AccessPage, AdminDashboardPage, AdminLoginPage (+22 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (29): Accessibility Baseline, Active / pressed, Anti-Patterns, Card Rules, Color System, Dashboard Rules, Design Principles, Disabled (+21 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (29): dependencies, cors, dotenv, express, i18next, i18next-browser-languagedetector, i18next-localstorage-backend, react (+21 more)

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (24): assertSupabase(), createManagedUser(), createManualEncuentrosReservation(), deleteBlogPost(), fetchBlogPosts(), fetchCurrentEntitlements(), fetchCurrentOrders(), getAdminAuditEvents() (+16 more)

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (16): mergeBlogPosts(), isDerivedProductType(), defaultUsers, uploadGoogleDriveVideoAsset(), applyTranslatedBlogPost(), AppProvider(), buildBlogTranslationSource(), buildOrderDateMap() (+8 more)

### Community 10 - "Community 10"
Cohesion: 0.10
Nodes (20): Anti-patterns, Badges and chips, Buttons, Cards, Cards de preview, Components, Content surfaces, CTA principal (+12 more)

### Community 11 - "Community 11"
Cohesion: 0.15
Nodes (16): buildBlogProducts(), buildDefaultProducts(), buildDefaultProductsWithBlogPosts(), buildDerivedProducts(), buildPersistentProducts(), calculateSubscriptionPricing(), DEFAULT_TIER_GRANTS, defaultEntitlements (+8 more)

### Community 13 - "Community 13"
Cohesion: 0.15
Nodes (12): Breakpoints, Dashboard layout, Form layout, Layouts, Media and content layout, Modal and drawer layout, Navigation layout, Overall shell (+4 more)

### Community 14 - "Community 14"
Cohesion: 0.06
Nodes (62): AccessTotalSection(), BlogTeaserSection(), CollectionCard(), CreatorHero(), HomePreviewRail(), resolveSectionHref(), LanguageSwitcher(), MembershipSection() (+54 more)

### Community 15 - "Community 15"
Cohesion: 0.18
Nodes (9): Current repository reality, graphify, Output expectations, Purpose, Safety boundary, Source of truth, Tailwind and shadcn guidance, Validation (+1 more)

### Community 16 - "Community 16"
Cohesion: 0.22
Nodes (3): buildPlans(), buildPlans(), normalizeSubscriptionTiers()

### Community 17 - "Community 17"
Cohesion: 0.18
Nodes (10): Accessibility, Baseline rules, Buttons and controls, Empty and loading states, Forms, Modals, Motion, Navigation (+2 more)

### Community 18 - "Community 18"
Cohesion: 0.18
Nodes (10): Follow-up options, Migration Plan, Phase 1, Phase 2, Phase 3, Recommendation, Risks detected, Safe implementation order (+2 more)

### Community 19 - "Community 19"
Cohesion: 0.25
Nodes (11): delay(), fetchCurrentProfile(), getCurrentSession(), normalizeSession(), retrySupabaseOperation(), signInWithOAuth(), signInWithPassword(), signInWithTelegram() (+3 more)

### Community 21 - "Community 21"
Cohesion: 0.22
Nodes (8): Flujo de prueba, Migracion de datos legado, Regla actual, Stripe Sandbox Setup, Stripe test mode, Supabase, Variables, Webhook local

### Community 22 - "Community 22"
Cohesion: 0.25
Nodes (7): Authority, Current stack audit, Current visual direction, Design System Master, Files in this folder, Guardrails, Usage rule

### Community 23 - "Community 23"
Cohesion: 0.25
Nodes (7): Commerce Phase 1, Estado actual del frontend, Que ejecutar en Supabase, Que se agrego, Regla de acceso implementada, Siguiente fase, Variables que necesitaremos despues

### Community 24 - "Community 24"
Cohesion: 0.33
Nodes (5): Current limits, Decision, Supabase Setup, What was prepared in the codebase, What you need to do in your Supabase account

### Community 25 - "Community 25"
Cohesion: 0.21
Nodes (11): pickRelatedVideos(), RelatedVideosSection(), shuffleItems(), getVideoAccessNote(), getVideoTags(), VideoCard(), VideoPriceBadge(), getVideoAccessNote() (+3 more)

## Knowledge Gaps
- **168 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+163 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAppState()` connect `Community 14` to `Community 1`, `Community 3`, `Community 4`, `Community 5`, `Community 9`, `Community 25`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Why does `mergeSiteContent()` connect `Community 1` to `Community 16`, `Community 8`, `Community 2`, `Community 9`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `normalizeRecordingChoice()` connect `Community 3` to `Community 8`, `Community 9`, `Community 2`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _168 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05662862159789289 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06105834464043419 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.07616892911010557 - nodes in this community are weakly interconnected._