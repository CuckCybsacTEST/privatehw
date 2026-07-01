import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppProvider, useAppState } from './state/AppState'
import { AgeVerificationGate } from './components/AgeVerificationGate'
import { LanguageSync } from './components/LanguageSync'
import { AppLoader } from './components/AppLoader'
import { fetchEncuentrosModels } from './lib/supabase'
import { HomePreviewTopBar } from './components/HomePreviewTopBar'
import { MobileBottomNav } from './components/MobileBottomNav'
import { HomePage } from './pages/HomePage'
import { BlogIndexPage } from './pages/BlogIndexPage'
import { BlogPostPage } from './pages/BlogPostPage'
import { resolveEncounterFallbackSlug } from './utils/encuentrosModels'
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

function ProtectedMemberRoute() {
  const { isBootstrapping, session } = useAppState()
  const { t } = useTranslation()

  if (isBootstrapping) {
    return <AppLoader title={t('loading.library')} subtitle={t('loading.subtitle')} />
  }

  if (!session) {
    return <Navigate to="/access?redirect=/library" replace />
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
        <Route path="/videos" element={<VideoCatalogPage />} />
        <Route path="/videos/:slug" element={<VideoDetailPage />} />
        <Route path="/packs" element={<CollectionCatalogPage />} />
        <Route path="/packs/:slug" element={<PackDetailPage />} />
        <Route path="/calzones" element={<CalzonesPage />} />
        <Route path="/calzones/:slug" element={<PhysicalProductPage />} />
        <Route
          path="/calzones/checkout/:slug"
          element={
            <ProtectedRegisteredRoute redirectTo={window.location.pathname ? `/access?redirect=${encodeURIComponent(window.location.pathname)}` : '/access?redirect=/calzones'}>
              <PhysicalCheckoutPage />
            </ProtectedRegisteredRoute>
          }
        />
        <Route path="/access" element={<AccessPage />} />
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
  const { pathname } = useLocation()

  if (pathname.startsWith('/encuentros') || pathname.startsWith('/admin') || pathname.startsWith('/access')) {
    return <MobileBottomNav />
  }

  const topbarLayoutClass =
    pathname === '/'
      ? 'site-topbar-shell is-home-layout'
      : 'site-topbar-shell is-sidebar-layout'

  return (
    <>
      <div className={topbarLayoutClass}>
        <HomePreviewTopBar />
      </div>
      <MobileBottomNav />
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
