import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './components/ui/Toast'
import { Navbar } from './components/layout/Navbar'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { ROLES } from './lib/constants'

import Landing from './pages/Landing'
import Auth from './pages/Auth'
import UserDashboard from './pages/UserDashboard'
import Explore from './pages/Explore'
import ParkingDetail from './pages/ParkingDetail'
import BookingConfirmation from './pages/BookingConfirmation'
import HostDashboard from './pages/HostDashboard'
import HostEarnings from './pages/HostEarnings'
import HostRegister from './pages/HostRegister'
import AdminDashboard from './pages/AdminDashboard'
import AdminReview from './pages/AdminReview'
import AdminLogin from './pages/AdminLogin'
import Chatbot from './components/Chatbot'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <div className="min-h-screen bg-white">
            <Navbar />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin" element={<AdminLogin />} />

              {/* User routes */}
              <Route element={<ProtectedRoute allowedRoles={[ROLES.USER]} />}>
                <Route path="/dashboard" element={<UserDashboard />} />
                <Route path="/explore" element={<Explore />} />
                <Route path="/parking/:id" element={<ParkingDetail />} />
                <Route path="/booking/:id" element={<BookingConfirmation />} />
              </Route>

              {/* Host routes */}
              <Route element={<ProtectedRoute allowedRoles={[ROLES.HOST]} />}>
                <Route path="/host/dashboard" element={<HostDashboard />} />
                <Route path="/host/earnings" element={<HostEarnings />} />
                <Route path="/host/register" element={<HostRegister />} />
              </Route>

              {/* Admin routes */}
              <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/review/:id" element={<AdminReview />} />
              </Route>
            </Routes>
            <Chatbot />
          </div>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
