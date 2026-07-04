# Graph Report - PROJECTS  (2026-07-04)

## Corpus Check
- 124 files · ~142,203 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 892 nodes · 1862 edges · 58 communities (57 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `565db839`
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
- [[_COMMUNITY_Community 39|Community 39]]
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

## God Nodes (most connected - your core abstractions)
1. `useAppState()` - 85 edges
2. `resolveLocalizedSection()` - 41 edges
3. `resolveLocalizedRecord()` - 26 edges
4. `ContentEditor()` - 22 edges
5. `mergeSiteContent()` - 21 edges
6. `assertSupabase()` - 21 edges
7. `Noir After Dark` - 20 edges
8. `Components` - 20 edges
9. `PublicNav()` - 19 edges
10. `SiteFooter()` - 19 edges

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

## Communities (58 total, 1 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (36): AGE_OPTIONS, ATTENDANCE_MODE_OPTIONS, BLANK_MODEL_DEFAULTS, CITY_OPTIONS_BY_NATIONALITY, createDraftFromModel(), deepClone(), EncuentrosModelsManager(), EXTRA_OPTIONS_PLACEHOLDER (+28 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (9): AdminDashboardPage(), buildSubscriptionDraftForUser(), getActiveDigitalSubscription(), getLatestDigitalSubscription(), hasSeedEnglishCatalogTitles(), PhysicalOrdersEditor(), ReservationOrdersEditor(), toDatetimeLocalValue() (+1 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (22): app, buildRuntimeConfig(), buildTelegramDisplayName(), buildTelegramSyntheticEmail(), CLIENT_DIST_DIR, escapeJsonForInlineScript(), GALLERY_REACTIONS_FILE, getAuthenticatedUser() (+14 more)

### Community 3 - "Community 3"
Cohesion: 0.22
Nodes (11): buildEncounterContactChannels(), EncuentrosBottomNav(), EncuentrosPage(), formatPriceValue(), getEncounterNavToneStyles(), getInitialsFromName(), getProfileTextValue(), parsePriceValue() (+3 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (33): BlogManager(), buildTaxonomyOptions(), emptyPost(), getAccessLabel(), getStatusLabel(), isEmptyHtml(), pruneLocalizedDraft(), uniqueValues() (+25 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (29): AppLoader(), LanguageSync(), MobileBottomNav(), AccessPage, AdminDashboardPage, AdminLoginPage, App(), AppRoutes() (+21 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (29): Accessibility Baseline, Active / pressed, Anti-Patterns, Card Rules, Color System, Dashboard Rules, Design Principles, Disabled (+21 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (30): dependencies, cors, dotenv, express, i18next, i18next-browser-languagedetector, i18next-localstorage-backend, react (+22 more)

### Community 8 - "Community 8"
Cohesion: 0.10
Nodes (28): defaultBlogPosts, assertSupabase(), createManagedUser(), createManualEncuentrosReservation(), deleteBlogPost(), fetchBlogPosts(), fetchCurrentEntitlements(), fetchCurrentOrders() (+20 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (10): mergeBlogPosts(), isDerivedProductType(), defaultUsers, uploadGoogleDriveVideoAsset(), applyTranslatedBlogPost(), AppProvider(), buildBlogTranslationSource(), buildOrderDateMap() (+2 more)

### Community 10 - "Community 10"
Cohesion: 0.10
Nodes (20): Anti-patterns, Badges and chips, Buttons, Cards, Cards de preview, Components, Content surfaces, CTA principal (+12 more)

### Community 11 - "Community 11"
Cohesion: 0.16
Nodes (15): buildBlogProducts(), buildDefaultProducts(), buildDefaultProductsWithBlogPosts(), buildDerivedProducts(), buildPersistentProducts(), calculateSubscriptionPricing(), DEFAULT_TIER_GRANTS, defaultEntitlements (+7 more)

### Community 12 - "Community 12"
Cohesion: 0.22
Nodes (9): EncounterGalleryStatsBar(), formatCompactCount(), GalleryStat(), EncounterSocialLinksSection(), EncuentrosGalleryModal(), getSlideSource(), normalizeEncounterGallerySlide(), normalizeEncounterGallerySlides() (+1 more)

### Community 13 - "Community 13"
Cohesion: 0.15
Nodes (12): Breakpoints, Dashboard layout, Form layout, Layouts, Media and content layout, Modal and drawer layout, Navigation layout, Overall shell (+4 more)

### Community 14 - "Community 14"
Cohesion: 0.17
Nodes (17): getNavToneStyles(), PublicNav(), resolveSectionHref(), SiteFooter(), BlogPostPage(), formatPostDate(), CheckoutCancelPage(), buildProductSummary() (+9 more)

### Community 15 - "Community 15"
Cohesion: 0.17
Nodes (10): Current repository reality, graphify, Output expectations, Ponytail, Purpose, Safety boundary, Source of truth, Tailwind and shadcn guidance (+2 more)

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
Cohesion: 0.24
Nodes (11): normalizeSocialLink(), getContactChannelIcon(), isContactChannelLink(), getSocialNetworkActionLabel(), getSocialNetworkKey(), getSocialNetworkOption(), normalizeSocialNetworkText(), normalizeSocialNetworkValue() (+3 more)

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
Cohesion: 0.17
Nodes (13): pickRelatedVideos(), RelatedVideosSection(), shuffleItems(), getVideoAccessNote(), getVideoTags(), VideoCard(), VideoPriceBadge(), VideoCatalogPage() (+5 more)

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
Cohesion: 0.21
Nodes (8): HomePreviewRail(), resolveSectionHref(), LanguageSwitcher(), TelegramLoginWidget(), getRuntimeConfig(), readClientEnv(), AccessPage(), AdminLoginPage()

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
Cohesion: 0.24
Nodes (10): buildEncounterModelRecordPayload(), extractEncounterModelBookingPayload(), extractEncounterModelMedia(), extractEncounterModelProfilePayload(), extractEncounterModelRecordingPayload(), extractEncounterModelSocialLinks(), normalizeEncounterModelAge(), normalizeEncounterModelText() (+2 more)

### Community 39 - "Community 39"
Cohesion: 0.18
Nodes (15): bottomCarouselImages, mergeItemsBySlug(), normalizeCarouselSlides(), normalizeEncounterPriceLabel(), normalizeFreeContentItem(), normalizePhysicalMerchItem(), normalizePriceLabel(), normalizeVideoCollectionItem() (+7 more)

### Community 40 - "Community 40"
Cohesion: 0.28
Nodes (13): mergeSiteContent(), assertSupabaseAuthConfig(), createEncounterModel(), deleteEncounterModel(), deleteEncounterReservationHistoryByModelSlug(), getEncounterModelDisplayName(), hydrateEncounterModelContent(), logAdminAuditEvent() (+5 more)

### Community 41 - "Community 41"
Cohesion: 0.25
Nodes (10): base64UrlEncode(), buildGoogleDriveDownloadUrl(), fetchGoogleDriveMedia(), getGoogleDriveFolderId(), getServiceAccountAccessToken(), isGoogleDriveConfigured(), serviceAccountPrivateKey, uploadGoogleDriveFile() (+2 more)

### Community 42 - "Community 42"
Cohesion: 0.29
Nodes (10): addDays(), addMonths(), computeSubscriptionExpiry(), grantEntitlement(), handleSubscriptionDeleted(), isSubscriptionAccessScope(), parseDateOrNull(), provisionManagedUser() (+2 more)

### Community 43 - "Community 43"
Cohesion: 0.42
Nodes (10): buildFallbackEncounterModel(), createManualReservationOrder(), fetchEncounterRelationRows(), getEncuentrosBookingPricing(), isMissingEncounterModelRelationTableError(), isMissingEncounterModelsTableError(), loadEncounterModelBySlug(), loadEncounterModels() (+2 more)

### Community 44 - "Community 44"
Cohesion: 0.11
Nodes (19): AccessTotalSection(), AtmosphericBackdrop(), BlogTeaserSection(), CreatorHero(), HomePreviewTopBar(), MembershipSection(), PhysicalMerchSection(), SpotlightGrid() (+11 more)

### Community 45 - "Community 45"
Cohesion: 0.30
Nodes (11): MemberLibraryPage(), summarizeAccess(), getEncounterNavToneStyles(), ProfilePage(), summarizeProfileAccess(), buildSubscriptionGrantSet(), getActiveDigitalEntitlement(), getActiveEntitlements() (+3 more)

### Community 46 - "Community 46"
Cohesion: 0.34
Nodes (10): CollectionCard(), PackPreviewCard(), ContentEditor(), getItemIdentity(), getLocaleKey(), isPlainObject(), mergeLocalizedValue(), resolveLocalizedRecord() (+2 more)

### Community 47 - "Community 47"
Cohesion: 0.25
Nodes (11): delay(), fetchCurrentProfile(), getCurrentSession(), normalizeSession(), retrySupabaseOperation(), signInWithOAuth(), signInWithPassword(), signInWithTelegram() (+3 more)

### Community 48 - "Community 48"
Cohesion: 0.43
Nodes (6): EncuentrosBookingWizardModal(), formatShortDateLabel(), fetchEncuentrosBookingPricing(), fetchEncuentrosModel(), EncuentrosCitasPage(), normalizeRecordingChoice()

### Community 49 - "Community 49"
Cohesion: 0.22
Nodes (14): isPersistentProductType(), assertServerConfig(), createOrUpdateInvoiceOrder(), createOrUpdateOrder(), ensureStripeCustomer(), fetchProductRowFromTable(), handleCheckoutCompleted(), handleInvoicePaymentSucceeded() (+6 more)

### Community 50 - "Community 50"
Cohesion: 0.18
Nodes (17): buildBookingDays(), buildBookingTimes(), buildEncuentrosBookingPricing(), buildFutureBookingDays(), clampPercent(), formatCurrencyAmount(), formatMinutesToTime(), isEncounterRecordingEnabled() (+9 more)

### Community 51 - "Community 51"
Cohesion: 0.29
Nodes (8): appendByPath(), deepClone(), ensurePackUiIds(), ensureVideoLibraryUiIds(), getByPath(), removeByPath(), setByPath(), updateByPath()

### Community 52 - "Community 52"
Cohesion: 0.36
Nodes (4): CatalogCard(), getFirstTextValue(), getTopBadgeLabel(), normalizeMediaUrl()

### Community 53 - "Community 53"
Cohesion: 0.47
Nodes (4): getPackAssets(), getPackGalleryClassName(), getPackPhotos(), PackDetailPage()

### Community 54 - "Community 54"
Cohesion: 0.50
Nodes (4): fetchEncuentrosModels(), EncuentrosLegacyBookingRedirect(), getEncounterFallbackSlug(), resolveEncounterFallbackSlug()

### Community 55 - "Community 55"
Cohesion: 0.40
Nodes (5): normalizePackAssets(), getCollectionSource(), getFreeContentSource(), getVideoSource(), extractGoogleDriveFileId()

### Community 56 - "Community 56"
Cohesion: 0.67
Nodes (4): normalizeVideoTags(), uniqueValues(), VideoLibraryItemEditor(), isInternalMediaUrl()

## Knowledge Gaps
- **242 isolated node(s):** `fs`, `path`, `{ getDefaultMode, getClaudeDir, isShellSafe }`, `{ getPonytailInstructions }`, `{
  clearMode,
  isCodex,
  isCopilot,
  setMode,
  writeHookOutput,
}` (+237 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAppState()` connect `Community 14` to `Community 0`, `Community 32`, `Community 1`, `Community 3`, `Community 4`, `Community 5`, `Community 9`, `Community 44`, `Community 12`, `Community 46`, `Community 45`, `Community 48`, `Community 19`, `Community 53`, `Community 25`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `mergeSiteContent()` connect `Community 40` to `Community 0`, `Community 1`, `Community 2`, `Community 38`, `Community 39`, `Community 8`, `Community 9`, `Community 43`, `Community 46`, `Community 16`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `resolveEncounterFallbackSlug()` connect `Community 54` to `Community 9`, `Community 2`, `Community 43`, `Community 5`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `fs`, `path`, `{ getDefaultMode, getClaudeDir, isShellSafe }` to the rest of the system?**
  _242 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07195121951219512 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07311827956989247 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08901515151515152 - nodes in this community are weakly interconnected._