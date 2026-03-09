import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider, useAppState } from './state/AppState'
import { BlogIndexPage } from './pages/BlogIndexPage'
import { BlogPostPage } from './pages/BlogPostPage'
import { CollectionCatalogPage } from './pages/CollectionCatalogPage'
import { EncuentrosPage } from './pages/EncuentrosPage'
import { HomePage } from './pages/HomePage'
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
