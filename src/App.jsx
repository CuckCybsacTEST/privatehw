import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppProvider, useAppState } from './state/AppState'
import { AgeVerificationGate } from './components/AgeVerificationGate'
import { LanguageSync } from './components/LanguageSync'
import { AppLoader } from './components/AppLoader'
import { fetchEncuentrosModels } from './lib/supabase'
import { HomePreviewTopBar } from './components/HomePreviewTopBar'
import { PublicHomeTopBar } from './components/PublicHomeTopBar'
import { MobileBottomNav } from './components/MobileBottomNav'
import { HomePage } from './pages/HomePage'
import { BlogIndexPage } from './pages/BlogIndexPage'
import { BlogPostPage } from './pages/BlogPostPage'
import { StaticContentPage } from './components/StaticContentPage'
import { staticPages } from './data/staticPages'
import { resolveEncounterFallbackSlug } from './utils/encuentrosModels'

const legacyHomeBasePath = '/sindyprivate'
const legacyHomeRedirectPath = '/home-anterior'

function withLegacyHomePath(path = '') {
  return `${legacyHomeBasePath}${path}`
}

const AccessPage = lazy(() => import('./pages/AccessPage').then((module) => ({ default: module.AccessPage })))
const CheckoutCancelPage = lazy(() =>
  import('./pages/CheckoutCancelPage').then((module) => ({ default: module.CheckoutCancelPage })),
)
const CheckoutStartPage = lazy(() =>
  import('./pages/CheckoutStartPage').then((module) => ({ default: module.CheckoutStartPage })),
)
const CheckoutSuccessPage = lazy(() =>
  import('./pages/CheckoutSuccessPage').then((module) => ({ default: module.CheckoutSuccessPage })),
)
const CalzonesPage = lazy(() => import('./pages/CalzonesPage').then((module) => ({ default: module.CalzonesPage })))
const CollectionCatalogPage = lazy(() =>
  import('./pages/CollectionCatalogPage').then((module) => ({ default: module.CollectionCatalogPage })),
)
const EncuentrosCatalogPage = lazy(() =>
  import('./pages/EncuentrosCatalogPage').then((module) => ({ default: module.EncuentrosCatalogPage })),
)
const EncuentrosFacetPage = lazy(() =>
  import('./pages/EncuentrosFacetPage').then((module) => ({ default: module.EncuentrosFacetPage })),
)
const EncuentrosPage = lazy(() => import('./pages/EncuentrosPage').then((module) => ({ default: module.EncuentrosPage })))
const EncuentrosCitasPage = lazy(() =>
  import('./pages/EncuentrosCitasPage').then((module) => ({ default: module.EncuentrosCitasPage })),
)
const PackDetailPage = lazy(() =>
  import('./pages/PackDetailPage').then((module) => ({ default: module.PackDetailPage })),
)
const FreeContentPage = lazy(() => import('./pages/FreeContentPage').then((module) => ({ default: module.FreeContentPage })))
const MemberLibraryPage = lazy(() =>
  import('./pages/MemberLibraryPage').then((module) => ({ default: module.MemberLibraryPage })),
)
const LegacyHomePage = lazy(() =>
  import('./pages/LegacyHomePage').then((module) => ({ default: module.LegacyHomePage })),
)
const ModelsLandingPage = lazy(() =>
  import('./pages/ModelsLandingPage').then((module) => ({ default: module.ModelsLandingPage })),
)
const ModelDashboardPage = lazy(() =>
  import('./pages/ModelDashboardPage').then((module) => ({ default: module.ModelDashboardPage })),
)
const OpeningPage = lazy(() =>
  import('./pages/OpeningPage').then((module) => ({ default: module.OpeningPage })),
)
const ModelRequestPage = lazy(() =>
  import('./pages/ModelRequestPage').then((module) => ({ default: module.ModelRequestPage })),
)
const ProfilePage = lazy(() =>
  import('./pages/ProfilePage').then((module) => ({ default: module.ProfilePage })),
)
const VideoCatalogPage = lazy(() => import('./pages/VideoCatalogPage').then((module) => ({ default: module.VideoCatalogPage })))
const VideoDetailPage = lazy(() => import('./pages/VideoDetailPage').then((module) => ({ default: module.VideoDetailPage })))
const PhysicalCheckoutPage = lazy(() =>
  import('./pages/PhysicalCheckoutPage').then((module) => ({ default: module.PhysicalCheckoutPage })),
)
const PhysicalProductPage = lazy(() =>
  import('./pages/PhysicalProductPage').then((module) => ({ default: module.PhysicalProductPage })),
)

const AdminDashboardPage = lazy(() =>
  import('./pages/AdminDashboardPage').then((module) => ({
    default: module.AdminDashboardPage,
  })),
)
const AdminLoginPage = lazy(() =>
  import('./pages/AdminLoginPage').then((module) => ({
    default: module.AdminLoginPage,
  })),
)

function EncuentrosLegacyBookingRedirect() {
  const { t } = useTranslation()
  const [targetPath, setTargetPath] = useState('')

  useEffect(() => {
    let isCancelled = false

    fetchEncuentrosModels()
      .then((models) => {
        if (isCancelled) {
          return
        }

        const firstPublishedSlug = resolveEncounterFallbackSlug(() => Promise.resolve(models))
        setTargetPath(
          firstPublishedSlug ? `/encuentros/${encodeURIComponent(firstPublishedSlug)}/citas` : '/encuentros',
        )
      })
      .catch(() => {
        if (!isCancelled) {
          setTargetPath('/encuentros')
        }
      })

    return () => {
      isCancelled = true
    }
  }, [])

  if (targetPath) {
    return <Navigate to={targetPath} replace />
  }

  return <AppLoader title={t('loading.general')} subtitle={t('loading.subtitle')} />
}

function ProtectedAdminRoute() {
  const { isBootstrapping, session } = useAppState()
  const { t } = useTranslation()

  if (isBootstrapping) {
    return <AppLoader title={t('loading.panel')} subtitle={t('loading.subtitle')} />
  }

  if (session?.role !== 'admin') {
    return <Navigate to="/admin/login" replace />
  }

  return <AdminDashboardPage />
}

function ProtectedMemberRoute({ redirectTo = '/access?redirect=/library' }) {
  const { isBootstrapping, session } = useAppState()
  const { t } = useTranslation()

  if (isBootstrapping) {
    return <AppLoader title={t('loading.library')} subtitle={t('loading.subtitle')} />
  }

  if (!session) {
    return <Navigate to={redirectTo} replace />
  }

  return <MemberLibraryPage />
}

function ProtectedRegisteredRoute({ children, redirectTo = '/access' }) {
  const { isBootstrapping, session } = useAppState()
  const { t } = useTranslation()

  if (isBootstrapping) {
    return <AppLoader title={t('loading.content')} subtitle={t('loading.subtitle')} />
  }

  if (!session) {
    return <Navigate to={redirectTo} replace />
  }

  return children
}

function AppRoutes() {
  const { isBootstrapping, session } = useAppState()
  const { t } = useTranslation()

  if (isBootstrapping) {
    return <AppLoader title={t('loading.home')} subtitle={t('loading.subtitle')} />
  }

  return (
    <Suspense fallback={<AppLoader title={t('loading.general')} subtitle={t('loading.subtitle')} />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/encuentros" element={<EncuentrosCatalogPage />} />
        <Route path="/encuentros/ciudad" element={<EncuentrosFacetPage facetType="city" />} />
        <Route path="/encuentros/ciudad/:citySlug" element={<EncuentrosFacetPage facetType="city" />} />
        <Route
          path="/encuentros/ciudad/:citySlug/nacionalidad/:nationalitySlug"
          element={<EncuentrosFacetPage facetType="city" secondaryFacetType="nationality" />}
        />
        <Route path="/encuentros/nacionalidad" element={<EncuentrosFacetPage facetType="nationality" />} />
        <Route path="/encuentros/nacionalidad/:nationalitySlug" element={<EncuentrosFacetPage facetType="nationality" />} />
        <Route path="/encuentros/:slug" element={<EncuentrosPage />} />
        <Route path="/encuentros/:slug/citas" element={<EncuentrosCitasPage />} />
        <Route path="/encuentros/citas" element={<EncuentrosLegacyBookingRedirect />} />
        <Route path="/encuentros/encuentros" element={<Navigate to="/encuentros" replace />} />
        <Route path="/encuentros/citas/encuentros" element={<EncuentrosLegacyBookingRedirect />} />
        <Route path="/encuentros/citas/citas" element={<EncuentrosLegacyBookingRedirect />} />
        <Route path="/encuentross" element={<Navigate to="/encuentros" replace />} />
        <Route path="/encuentross/citas" element={<EncuentrosLegacyBookingRedirect />} />
        <Route path="/blog" element={<BlogIndexPage />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />
        <Route path="/access" element={<AccessPage />} />
        <Route path={legacyHomeRedirectPath} element={<Navigate to={legacyHomeBasePath} replace />} />
        <Route path={legacyHomeBasePath} element={<LegacyHomePage />} />
        <Route path="/apertura" element={<Navigate to="/muy-pronto" replace />} />
        <Route path="/muy-pronto" element={<OpeningPage />} />
        <Route path="/registro-modelos" element={<ModelRequestPage />} />
        <Route
          path="/modelo/dashboard"
          element={
            <ProtectedRegisteredRoute redirectTo="/access?redirect=/modelo/dashboard">
              <ModelDashboardPage />
            </ProtectedRegisteredRoute>
          }
        />
        <Route path="/model/dashboard" element={<Navigate to="/modelo/dashboard" replace />} />
        <Route path={withLegacyHomePath('/blog')} element={<BlogIndexPage />} />
        <Route path={withLegacyHomePath('/blog/:slug')} element={<BlogPostPage />} />
        <Route path={withLegacyHomePath('/videos')} element={<VideoCatalogPage />} />
        <Route path={withLegacyHomePath('/videos/:slug')} element={<VideoDetailPage />} />
        <Route path={withLegacyHomePath('/packs')} element={<CollectionCatalogPage />} />
        <Route path={withLegacyHomePath('/packs/:slug')} element={<PackDetailPage />} />
        <Route path={withLegacyHomePath('/calzones')} element={<CalzonesPage />} />
        <Route path={withLegacyHomePath('/calzones/:slug')} element={<PhysicalProductPage />} />
        <Route
          path={withLegacyHomePath('/calzones/checkout/:slug')}
          element={
            <ProtectedRegisteredRoute
              redirectTo={
                window.location.pathname
                  ? `${legacyHomeBasePath}/access?redirect=${encodeURIComponent(window.location.pathname)}`
                  : `${legacyHomeBasePath}/access?redirect=/calzones`
              }
            >
              <PhysicalCheckoutPage />
            </ProtectedRegisteredRoute>
          }
        />
        <Route path={withLegacyHomePath('/access')} element={<AccessPage />} />
        <Route
          path={withLegacyHomePath('/library')}
          element={<ProtectedMemberRoute redirectTo={withLegacyHomePath('/access?redirect=/library')} />}
        />
        <Route
          path={withLegacyHomePath('/profile')}
          element={
            <ProtectedRegisteredRoute redirectTo={withLegacyHomePath('/access?redirect=/profile')}>
              <ProfilePage />
            </ProtectedRegisteredRoute>
          }
        />
        <Route
          path={withLegacyHomePath('/free-content')}
          element={
            <ProtectedRegisteredRoute redirectTo={withLegacyHomePath('/access?redirect=/free-content')}>
              <FreeContentPage />
            </ProtectedRegisteredRoute>
          }
        />
        <Route path={withLegacyHomePath('/checkout/start/:productSlug')} element={<CheckoutStartPage />} />
        <Route path={withLegacyHomePath('/checkout/success')} element={<CheckoutSuccessPage />} />
        <Route path={withLegacyHomePath('/checkout/cancel')} element={<CheckoutCancelPage />} />
        <Route path="/modelos" element={<ModelsLandingPage />} />
        <Route path="/terminos" element={<StaticContentPage page={staticPages.terms} />} />
        <Route path="/privacidad" element={<StaticContentPage page={staticPages.privacy} />} />
        <Route path="/cookies" element={<StaticContentPage page={staticPages.cookies} />} />
        <Route path="/contacto" element={<StaticContentPage page={staticPages.contact} />} />
        <Route path="/ayuda" element={<StaticContentPage page={staticPages.help} />} />
        <Route path="/denunciar-estafa" element={<StaticContentPage page={staticPages.report} />} />
        <Route
          path="/calzones/checkout/:slug"
          element={
            <ProtectedRegisteredRoute redirectTo={window.location.pathname ? `/access?redirect=${encodeURIComponent(window.location.pathname)}` : '/access?redirect=/calzones'}>
              <PhysicalCheckoutPage />
            </ProtectedRegisteredRoute>
          }
        />
        <Route path="/library" element={<ProtectedMemberRoute />} />
        <Route
          path="/profile"
          element={
            <ProtectedRegisteredRoute redirectTo="/access?redirect=/profile">
              <ProfilePage />
            </ProtectedRegisteredRoute>
          }
        />
        <Route
          path="/cliente/dashboard"
          element={
            <ProtectedRegisteredRoute redirectTo="/access?redirect=/cliente/dashboard">
              <ProfilePage />
            </ProtectedRegisteredRoute>
          }
        />
        <Route path="/cliente" element={<Navigate to="/cliente/dashboard" replace />} />
        <Route
          path="/free-content"
          element={
            <ProtectedRegisteredRoute redirectTo="/access?redirect=/free-content">
              <FreeContentPage />
            </ProtectedRegisteredRoute>
          }
        />
        <Route path="/checkout/start/:productSlug" element={<CheckoutStartPage />} />
        <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
        <Route path="/checkout/cancel" element={<CheckoutCancelPage />} />
        <Route
          path="/admin"
          element={
            session?.role === 'admin' ? (
              <Navigate to="/admin/dashboard" replace />
            ) : (
              <Navigate to="/admin/login" replace />
            )
          }
        />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<ProtectedAdminRoute />} />
      </Routes>
    </Suspense>
  )
}

function AppChrome() {
  const { pathname, search } = useLocation()
  const isEncuentrosProfileContext =
    pathname === '/profile' && new URLSearchParams(search).get('source') === 'encuentros'
  const isLegacyHomeContext = pathname === legacyHomeBasePath
  const isCurrentHomeContext = pathname === '/'

  if (
    pathname.startsWith('/access') ||
    pathname.startsWith('/admin') ||
    isEncuentrosProfileContext
  ) {
    return null
  }

  if (pathname.startsWith('/encuentros')) {
    return <MobileBottomNav />
  }

  if (!isCurrentHomeContext && !isLegacyHomeContext) {
    return null
  }

  const topbarLayoutClass = isCurrentHomeContext
    ? 'site-topbar-shell is-public-home-layout'
    : 'site-topbar-shell is-home-layout'

  return (
    <>
      <div className={topbarLayoutClass}>
        {isCurrentHomeContext ? <PublicHomeTopBar /> : <HomePreviewTopBar basePath={legacyHomeBasePath} />}
      </div>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AgeVerificationGate>
          <LanguageSync />
          <AppChrome />
          <AppRoutes />
        </AgeVerificationGate>
      </AppProvider>
    </BrowserRouter>
  )
}
