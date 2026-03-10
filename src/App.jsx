import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider, useAppState } from './state/AppState'
import { AccessPage } from './pages/AccessPage'
import { BlogIndexPage } from './pages/BlogIndexPage'
import { BlogPostPage } from './pages/BlogPostPage'
import { CheckoutCancelPage } from './pages/CheckoutCancelPage'
import { CheckoutStartPage } from './pages/CheckoutStartPage'
import { CheckoutSuccessPage } from './pages/CheckoutSuccessPage'
import { CollectionCatalogPage } from './pages/CollectionCatalogPage'
import { EncuentrosPage } from './pages/EncuentrosPage'
import { HomePage } from './pages/HomePage'
import { MemberLibraryPage } from './pages/MemberLibraryPage'
import { VideoCatalogPage } from './pages/VideoCatalogPage'
import { VideoDetailPage } from './pages/VideoDetailPage'

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

function ProtectedAdminRoute() {
  const { isBootstrapping, session } = useAppState()

  if (isBootstrapping) {
    return <main className="admin-shell">Cargando panel...</main>
  }

  if (session?.role !== 'admin') {
    return <Navigate to="/admin/login" replace />
  }

  return <AdminDashboardPage />
}

function ProtectedMemberRoute() {
  const { isBootstrapping, session } = useAppState()

  if (isBootstrapping) {
    return <main className="admin-shell">Cargando biblioteca...</main>
  }

  if (!session) {
    return <Navigate to="/access?redirect=/library" replace />
  }

  return <MemberLibraryPage />
}

function AppRoutes() {
  const { session } = useAppState()

  return (
    <Suspense fallback={<main className="admin-shell">Cargando...</main>}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/encuentros" element={<EncuentrosPage />} />
        <Route path="/blog" element={<BlogIndexPage />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />
        <Route path="/videos" element={<VideoCatalogPage />} />
        <Route path="/videos/:slug" element={<VideoDetailPage />} />
        <Route path="/packs" element={<CollectionCatalogPage />} />
        <Route path="/access" element={<AccessPage />} />
        <Route path="/library" element={<ProtectedMemberRoute />} />
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

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  )
}
