import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { ProtectedOwnerRoute } from './components/ProtectedOwnerRoute'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminDashboardPage } from './pages/AdminDashboardPage'
import { AdminLoginPage } from './pages/AdminLoginPage'
import { HomeGatewayPage } from './pages/HomeGatewayPage'
import { OwnerLoginPage } from './pages/OwnerLoginPage'
import { OwnerPortalPage } from './pages/OwnerPortalPage'
import { StaffPage } from './pages/StaffPage'
import { TournamentPublicPage } from './pages/TournamentPublicPage'
import { ownerLoginPath, ownerPortalPath } from './config/paths'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomeGatewayPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path={ownerLoginPath} element={<OwnerLoginPage />} />
          <Route
            path={ownerPortalPath}
            element={
              <ProtectedOwnerRoute>
                <OwnerPortalPage />
              </ProtectedOwnerRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route path="/t/:slug" element={<TournamentPublicPage />} />
          <Route path="/t/:slug/admin" element={<StaffPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
