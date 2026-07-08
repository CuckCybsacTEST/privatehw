# Graph Report - PROJECTS  (2026-07-08)

## Corpus Check
- 141 files · ~206,018 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1030 nodes · 2283 edges · 61 communities (55 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `12055f57`
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
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]

## God Nodes (most connected - your core abstractions)
1. `useAppState()` - 91 edges
2. `resolveLocalizedSection()` - 41 edges
3. `withBasePath()` - 29 edges
4. `resolveLocalizedRecord()` - 26 edges
5. `mergeSiteContent()` - 24 edges
6. `Seo()` - 23 edges
7. `ContentEditor()` - 22 edges
8. `SiteFooter()` - 21 edges
9. `assertSupabase()` - 21 edges
10. `PublicNav()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `createManualReservationOrder()` --calls--> `normalizeRecordingChoice()`  [EXTRACTED]
  server/index.js → src/utils/encuentrosBooking.js
- `createManualReservationOrder()` --calls--> `resolveEncounterFallbackSlug()`  [EXTRACTED]
  server/index.js → src/utils/encuentrosModels.js
- `resolveProductBySlug()` --calls--> `buildDerivedProducts()`  [EXTRACTED]
  server/index.js → src/data/defaultCommerce.js
- `getEncuentrosBookingPricing()` --calls--> `buildEncuentrosBookingPricing()`  [EXTRACTED]
  server/index.js → src/utils/encuentrosBooking.js
- `getEncuentrosBookingPricing()` --calls--> `normalizeRecordingChoice()`  [EXTRACTED]
  server/index.js → src/utils/encuentrosBooking.js

## Import Cycles
- None detected.

## Communities (61 total, 6 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (42): AGE_OPTIONS, ATTENDANCE_MODE_OPTIONS, BLANK_MODEL_DEFAULTS, BODY_HAIR_OPTIONS, createDraftFromModel(), deepClone(), EncuentrosModelsManager(), EXTRA_OPTIONS_PLACEHOLDER (+34 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (41): bottomCarouselImages, normalizeFreeContentItem(), normalizePhysicalMerchItem(), normalizePriceLabel(), normalizeVideoCollectionItem(), normalizeVideoLibraryItem(), topCarouselImages, AdminDashboardPage() (+33 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (26): app, buildRuntimeConfig(), buildTelegramDisplayName(), buildTelegramSyntheticEmail(), CLIENT_DIST_DIR, ENCUENTROS_MODEL_REQUESTS_FILE, ENCUENTROS_MODELS_FILE, escapeJsonForInlineScript() (+18 more)

### Community 3 - "Community 3"
Cohesion: 0.22
Nodes (3): buildPlans(), buildPlans(), normalizeSubscriptionTiers()

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (27): BlogManager(), buildTaxonomyOptions(), emptyPost(), getAccessLabel(), getStatusLabel(), isEmptyHtml(), pruneLocalizedDraft(), uniqueValues() (+19 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (26): AccessPage, AdminDashboardPage, AdminLoginPage, CalzonesPage, CheckoutCancelPage, CheckoutStartPage, CheckoutSuccessPage, CollectionCatalogPage (+18 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (29): Accessibility Baseline, Active / pressed, Anti-Patterns, Card Rules, Color System, Dashboard Rules, Design Principles, Disabled (+21 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (33): dependencies, cors, dotenv, express, i18next, i18next-browser-languagedetector, i18next-localstorage-backend, react (+25 more)

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (29): assertSupabase(), delay(), deleteBlogPost(), fetchBlogPosts(), fetchCurrentEntitlements(), fetchCurrentOrders(), fetchCurrentProfile(), fetchSiteContent() (+21 more)

### Community 9 - "Community 9"
Cohesion: 0.08
Nodes (19): mergeBlogPosts(), isDerivedProductType(), defaultUsers, uploadGoogleDriveVideoAsset(), createManagedUser(), createManualEncuentrosReservation(), fetchEncuentrosModels(), getAdminAuditEvents() (+11 more)

### Community 10 - "Community 10"
Cohesion: 0.10
Nodes (20): Anti-patterns, Badges and chips, Buttons, Cards, Cards de preview, Components, Content surfaces, CTA principal (+12 more)

### Community 11 - "Community 11"
Cohesion: 0.15
Nodes (16): buildBlogProducts(), buildDefaultProducts(), buildDefaultProductsWithBlogPosts(), buildDerivedProducts(), buildPersistentProducts(), calculateSubscriptionPricing(), DEFAULT_TIER_GRANTS, defaultEntitlements (+8 more)

### Community 12 - "Community 12"
Cohesion: 0.18
Nodes (10): Dónde estamos, Estado técnico importante, Kinkly - Estado actual y siguiente paso, Nota operativa, Prioridad alta, Prioridad baja, Prioridad media, Próximo paso recomendado (+2 more)

### Community 13 - "Community 13"
Cohesion: 0.15
Nodes (12): Breakpoints, Dashboard layout, Form layout, Layouts, Media and content layout, Modal and drawer layout, Navigation layout, Overall shell (+4 more)

### Community 14 - "Community 14"
Cohesion: 0.23
Nodes (12): normalizeSocialLink(), EncuentrosPage(), getInitialsFromName(), isContactChannelLink(), getSocialNetworkActionLabel(), getSocialNetworkKey(), getSocialNetworkOption(), normalizeSocialNetworkText() (+4 more)

### Community 15 - "Community 15"
Cohesion: 0.17
Nodes (10): Current repository reality, graphify, Output expectations, Ponytail, Purpose, Safety boundary, Source of truth, Tailwind and shadcn guidance (+2 more)

### Community 16 - "Community 16"
Cohesion: 0.33
Nodes (4): HomeFooter(), legalLinks, securityLinks, supportLinks

### Community 17 - "Community 17"
Cohesion: 0.18
Nodes (10): Accessibility, Baseline rules, Buttons and controls, Empty and loading states, Forms, Modals, Motion, Navigation (+2 more)

### Community 18 - "Community 18"
Cohesion: 0.18
Nodes (10): Follow-up options, Migration Plan, Phase 1, Phase 2, Phase 3, Recommendation, Risks detected, Safe implementation order (+2 more)

### Community 19 - "Community 19"
Cohesion: 0.19
Nodes (10): buildEncounterContactChannels(), EncuentrosBottomNav(), formatPriceValue(), getContactChannelIcon(), getEncounterNavToneStyles(), getProfileTextValue(), parsePriceValue(), PriceText() (+2 more)

### Community 20 - "Community 20"
Cohesion: 0.24
Nodes (10): AgeVerificationGate(), fetchGalleryReactionCounts(), getOrCreateGalleryVisitorKey(), getRandomVisitorKey(), readGalleryReactionState(), saveGalleryReaction(), writeGalleryReactionState(), readStorageValue() (+2 more)

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
Cohesion: 0.20
Nodes (9): EncounterGalleryStatsBar(), formatCompactCount(), GalleryStat(), EncounterSocialLinksSection(), EncuentrosGalleryModal(), getSlideSource(), normalizeEncounterGallerySlide(), normalizeEncounterGallerySlides() (+1 more)

### Community 30 - "Community 30"
Cohesion: 0.06
Nodes (48): claudeDir, {
  clearMode,
  isCodex,
  isCopilot,
  setMode,
  writeHookOutput,
}, fs, { getDefaultMode, getClaudeDir, isShellSafe }, { getPonytailInstructions }, mode, output, path (+40 more)

### Community 31 - "Community 31"
Cohesion: 0.22
Nodes (8): Boundaries, Intensity, Output, Persistence, Ponytail, Rules, The ladder, When NOT to be lazy

### Community 32 - "Community 32"
Cohesion: 0.40
Nodes (3): App(), resources, supportedLanguages

### Community 33 - "Community 33"
Cohesion: 0.25
Nodes (7): Configure Default Mode, Deactivate, Levels, More, Ponytail Help, Skills, Update

### Community 34 - "Community 34"
Cohesion: 0.40
Nodes (4): Boundaries, Hunt, Output, Tags

### Community 35 - "Community 35"
Cohesion: 0.40
Nodes (4): Boundaries, Honesty boundary, Ponytail Gain, Scoreboard

### Community 36 - "Community 36"
Cohesion: 0.40
Nodes (4): Boundaries, Examples, Format, Scoring

### Community 37 - "Community 37"
Cohesion: 0.50
Nodes (3): Boundaries, Output, Scan

### Community 38 - "Community 38"
Cohesion: 0.67
Nodes (3): EncuentrosLegacyBookingRedirect(), getEncounterFallbackSlug(), resolveEncounterFallbackSlug()

### Community 40 - "Community 40"
Cohesion: 0.18
Nodes (27): mergeItemsBySlug(), mergeSiteContent(), normalizeCarouselSlides(), normalizeEncounterPriceLabel(), assertSupabaseAuthConfig(), buildEncounterModelContentFromRequest(), createEncounterModel(), createEncounterModelFromRequest() (+19 more)

### Community 41 - "Community 41"
Cohesion: 0.25
Nodes (10): base64UrlEncode(), buildGoogleDriveDownloadUrl(), fetchGoogleDriveMedia(), getGoogleDriveFolderId(), getServiceAccountAccessToken(), isGoogleDriveConfigured(), serviceAccountPrivateKey, uploadGoogleDriveFile() (+2 more)

### Community 42 - "Community 42"
Cohesion: 0.08
Nodes (49): EncounterCatalogCard(), getTopBadgeLabel(), normalizeMediaUrl(), LatestAnnouncementsSection(), ModelCTASection(), PopularCitiesSection(), PrivateExperienceSection(), EncuentrosCatalogPage() (+41 more)

### Community 43 - "Community 43"
Cohesion: 0.44
Nodes (10): buildFallbackEncounterModel(), createManualReservationOrder(), fetchEncounterRelationRows(), getEncuentrosBookingPricing(), isMissingEncounterModelRelationTableError(), isMissingEncounterModelsTableError(), loadEncounterModelBySlug(), loadEncounterModels() (+2 more)

### Community 44 - "Community 44"
Cohesion: 0.67
Nodes (3): AppChrome(), AppRoutes(), withLegacyHomePath()

### Community 45 - "Community 45"
Cohesion: 0.33
Nodes (7): AtmosphericBackdrop(), EncuentrosBookingWizardModal(), formatShortDateLabel(), fetchEncuentrosBookingPricing(), fetchEncuentrosModel(), EncuentrosCitasPage(), normalizeRecordingChoice()

### Community 46 - "Community 46"
Cohesion: 0.24
Nodes (10): buildEncounterModelRecordPayload(), extractEncounterModelBookingPayload(), extractEncounterModelMedia(), extractEncounterModelProfilePayload(), extractEncounterModelRecordingPayload(), extractEncounterModelSocialLinks(), normalizeEncounterModelAge(), normalizeEncounterModelText() (+2 more)

### Community 47 - "Community 47"
Cohesion: 0.48
Nodes (4): TelegramLoginWidget(), getRuntimeConfig(), readClientEnv(), AccessPage()

### Community 48 - "Community 48"
Cohesion: 0.05
Nodes (79): AccessTotalSection(), BlogTeaserSection(), CollectionCard(), CreatorHero(), HomePreviewRail(), resolveSectionHref(), HomePreviewTopBar(), LanguageSwitcher() (+71 more)

### Community 49 - "Community 49"
Cohesion: 0.15
Nodes (23): addDays(), addMonths(), assertServerConfig(), computeSubscriptionExpiry(), createOrUpdateInvoiceOrder(), createOrUpdateOrder(), ensureStripeCustomer(), fetchProductRowFromTable() (+15 more)

### Community 50 - "Community 50"
Cohesion: 0.18
Nodes (17): buildBookingDays(), buildBookingTimes(), buildEncuentrosBookingPricing(), buildFutureBookingDays(), clampPercent(), formatCurrencyAmount(), formatMinutesToTime(), isEncounterRecordingEnabled() (+9 more)

### Community 54 - "Community 54"
Cohesion: 0.20
Nodes (5): submitEncounterModelRequest(), highlights, INITIAL_FORM, OpeningPage(), steps

### Community 55 - "Community 55"
Cohesion: 0.40
Nodes (4): Deployment Notes, Historical note, Production branch, Sanity check

### Community 59 - "Community 59"
Cohesion: 0.36
Nodes (7): defaultBlogPosts, getBlogPostTimestamp(), isNewerBlogPost(), normalizeBlogPost(), normalizeMediaItems(), parseBlogPriceAmount(), normalizeBlogPostRow()

### Community 60 - "Community 60"
Cohesion: 0.50
Nodes (4): uploadFileResumable(), uploadFileWithProgress(), uploadMediaAsset(), uploadMediaAssetFromUrl()

## Knowledge Gaps
- **273 isolated node(s):** `fs`, `path`, `{ getDefaultMode, getClaudeDir, isShellSafe }`, `{ getPonytailInstructions }`, `{
  clearMode,
  isCodex,
  isCopilot,
  setMode,
  writeHookOutput,
}` (+268 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAppState()` connect `Community 48` to `Community 0`, `Community 1`, `Community 4`, `Community 5`, `Community 39`, `Community 9`, `Community 42`, `Community 44`, `Community 45`, `Community 14`, `Community 47`, `Community 19`, `Community 54`, `Community 56`, `Community 25`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `mergeSiteContent()` connect `Community 40` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 8`, `Community 9`, `Community 43`, `Community 46`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `defaultSiteContent` connect `Community 11` to `Community 0`, `Community 1`, `Community 2`, `Community 8`, `Community 9`, `Community 42`, `Community 19`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `fs`, `path`, `{ getDefaultMode, getClaudeDir, isShellSafe }` to the rest of the system?**
  _273 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06382978723404255 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05443371378402107 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07807807807807808 - nodes in this community are weakly interconnected._