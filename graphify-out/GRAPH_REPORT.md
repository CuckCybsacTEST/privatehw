# Graph Report - PROJECTS  (2026-06-30)

## Corpus Check
- 102 files · ~125,599 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 726 nodes · 1552 edges · 32 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f0cab411`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
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
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 32|Community 32]]

## God Nodes (most connected - your core abstractions)
1. `useAppState()` - 80 edges
2. `resolveLocalizedSection()` - 41 edges
3. `resolveLocalizedRecord()` - 26 edges
4. `ContentEditor()` - 22 edges
5. `assertSupabase()` - 21 edges
6. `Noir After Dark` - 20 edges
7. `Components` - 20 edges
8. `PublicNav()` - 19 edges
9. `SiteFooter()` - 19 edges
10. `mergeSiteContent()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `createManualReservationOrder()` --calls--> `normalizeRecordingChoice()`  [EXTRACTED]
  server/index.js → src/utils/encuentrosBooking.js
- `resolveProductBySlug()` --calls--> `buildDerivedProducts()`  [EXTRACTED]
  server/index.js → src/data/defaultCommerce.js
- `getEncuentrosBookingPricing()` --calls--> `buildEncuentrosBookingPricing()`  [EXTRACTED]
  server/index.js → src/utils/encuentrosBooking.js
- `getEncuentrosBookingPricing()` --calls--> `normalizeRecordingChoice()`  [EXTRACTED]
  server/index.js → src/utils/encuentrosBooking.js
- `syncProductsFromSiteContent()` --calls--> `buildDefaultProducts()`  [EXTRACTED]
  server/index.js → src/data/defaultCommerce.js

## Import Cycles
- None detected.

## Communities (32 total, 0 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.17
Nodes (12): deepClone(), formatStatusLabel(), ModelCard(), normalizeLines(), parsePaymentMethods(), parseSlides(), setByPath(), defaultSiteContent (+4 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (16): AdminDashboardPage(), appendByPath(), buildSubscriptionDraftForUser(), deepClone(), ensurePackUiIds(), ensureVideoLibraryUiIds(), getActiveDigitalSubscription(), getByPath() (+8 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (73): isPersistentProductType(), base64UrlEncode(), buildGoogleDriveDownloadUrl(), fetchGoogleDriveMedia(), getGoogleDriveFolderId(), getServiceAccountAccessToken(), isGoogleDriveConfigured(), serviceAccountPrivateKey (+65 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (42): AgeVerificationGate(), AtmosphericBackdrop(), EncuentrosBookingWizardModal(), formatShortDateLabel(), EncuentrosGalleryModal(), fetchEncuentrosBookingPricing(), fetchEncuentrosModel(), EncuentrosCitasPage() (+34 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (34): BlogManager(), buildTaxonomyOptions(), emptyPost(), getAccessLabel(), getStatusLabel(), isEmptyHtml(), pruneLocalizedDraft(), uniqueValues() (+26 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (32): AppLoader(), HomePreviewTopBar(), LanguageSync(), MobileBottomNav(), fetchEncuentrosModels(), AccessPage, AdminDashboardPage, AdminLoginPage (+24 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (29): Accessibility Baseline, Active / pressed, Anti-Patterns, Card Rules, Color System, Dashboard Rules, Design Principles, Disabled (+21 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (30): dependencies, cors, dotenv, express, i18next, i18next-browser-languagedetector, i18next-localstorage-backend, react (+22 more)

### Community 8 - "Community 8"
Cohesion: 0.14
Nodes (21): assertSupabase(), deleteBlogPost(), fetchBlogPosts(), fetchCurrentEntitlements(), fetchCurrentOrders(), getCustomerAdminSnapshot(), getProfiles(), listenToAuthChanges() (+13 more)

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (15): mergeBlogPosts(), isDerivedProductType(), defaultUsers, uploadGoogleDriveVideoAsset(), createManagedUser(), createManualEncuentrosReservation(), getAdminAuditEvents(), isSupabaseConfigured (+7 more)

### Community 10 - "Community 10"
Cohesion: 0.10
Nodes (20): Anti-patterns, Badges and chips, Buttons, Cards, Cards de preview, Components, Content surfaces, CTA principal (+12 more)

### Community 11 - "Community 11"
Cohesion: 0.16
Nodes (15): buildBlogProducts(), buildDefaultProducts(), buildDefaultProductsWithBlogPosts(), buildDerivedProducts(), buildPersistentProducts(), calculateSubscriptionPricing(), DEFAULT_TIER_GRANTS, defaultEntitlements (+7 more)

### Community 12 - "Community 12"
Cohesion: 0.18
Nodes (17): bottomCarouselImages, normalizeFreeContentItem(), normalizePhysicalMerchItem(), normalizePriceLabel(), normalizeVideoCollectionItem(), normalizeVideoLibraryItem(), topCarouselImages, normalizePackAssets() (+9 more)

### Community 13 - "Community 13"
Cohesion: 0.15
Nodes (12): Breakpoints, Dashboard layout, Form layout, Layouts, Media and content layout, Modal and drawer layout, Navigation layout, Overall shell (+4 more)

### Community 14 - "Community 14"
Cohesion: 0.06
Nodes (64): AccessTotalSection(), BlogTeaserSection(), CollectionCard(), CreatorHero(), HomePreviewRail(), resolveSectionHref(), LanguageSwitcher(), MembershipSection() (+56 more)

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
Cohesion: 0.29
Nodes (10): delay(), fetchCurrentProfile(), getCurrentSession(), normalizeSession(), retrySupabaseOperation(), signInWithPassword(), signInWithTelegram(), signOut() (+2 more)

### Community 20 - "Community 20"
Cohesion: 0.32
Nodes (10): MemberLibraryPage(), summarizeAccess(), ProfilePage(), summarizeProfileAccess(), buildSubscriptionGrantSet(), getActiveDigitalEntitlement(), getActiveEntitlements(), getLatestDigitalEntitlement() (+2 more)

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
Cohesion: 0.27
Nodes (9): translateAdminContent(), ContentEditor(), hasSeedEnglishCatalogTitles(), normalizeVideoTags(), uniqueValues(), VideoLibraryItemEditor(), loadImage(), optimizeImageFile() (+1 more)

### Community 30 - "Community 30"
Cohesion: 0.29
Nodes (7): createDraftFromModel(), EncuentrosModelsManager(), mergeItemsBySlug(), mergeSiteContent(), normalizeCarouselSlides(), normalizeEncounterPriceLabel(), fetchSiteContent()

### Community 32 - "Community 32"
Cohesion: 0.48
Nodes (4): TelegramLoginWidget(), getRuntimeConfig(), readClientEnv(), AccessPage()

## Knowledge Gaps
- **172 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+167 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAppState()` connect `Community 14` to `Community 0`, `Community 32`, `Community 1`, `Community 3`, `Community 4`, `Community 5`, `Community 9`, `Community 20`, `Community 25`, `Community 30`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Why does `mergeSiteContent()` connect `Community 30` to `Community 0`, `Community 1`, `Community 2`, `Community 8`, `Community 9`, `Community 12`, `Community 16`, `Community 25`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `normalizeRecordingChoice()` connect `Community 3` to `Community 8`, `Community 9`, `Community 2`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _172 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.0746031746031746 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05220883534136546 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.06187202538339503 - nodes in this community are weakly interconnected._