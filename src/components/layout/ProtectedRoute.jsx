import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Loader } from '../ui/Loader'
import { ROLES } from '../../lib/constants'

export function ProtectedRoute({ allowedRoles }) {
  const { user, role, loading } = useAuth()

  if (loading) return <Loader fullScreen />
  if (!user) return <Navigate to="/auth" replace />

  if (allowedRoles && !allowedRoles.includes(role)) {
    const redirectMap = {
      [ROLES.USER]: '/dashboard',
      [ROLES.HOST]: '/host/dashboard',
      [ROLES.ADMIN]: '/admin/dashboard',
    }
    return <Navigate to={redirectMap[role] || '/auth'} replace />
  }

  return <Outlet />
}
