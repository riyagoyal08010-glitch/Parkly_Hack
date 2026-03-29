import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { ROLES } from '../../lib/constants'
import { Menu, X, LogOut, User } from 'lucide-react'
import { Button } from '../ui/Button'

export function Navbar() {
  const { user, profile, role, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const navLinks = () => {
    if (!user) return []
    switch (role) {
      case ROLES.USER:
        return [
          { to: '/explore', label: 'Explore' },
          { to: '/dashboard', label: 'My Bookings' },
        ]
      case ROLES.HOST:
        return [
          { to: '/host/dashboard', label: 'Dashboard' },
          { to: '/host/earnings', label: 'Earnings' },
          { to: '/host/register', label: 'Register Parking' },
          { to: '/plate-detection', label: 'Plate Scanner' },
        ]
      case ROLES.ADMIN:
        return [
          { to: '/admin/dashboard', label: 'Dashboard' },
        ]
      default:
        return []
    }
  }

  const isActive = (path) => location.pathname === path

  return (
    <nav className="bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">P</span>
            </div>
            <span className="text-xl font-bold tracking-tight">Parkly</span>
          </Link>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks().map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
                  isActive(link.to)
                    ? 'bg-black text-white'
                    : 'text-gray-500 hover:text-black hover:bg-gray-100'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full">
                  <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate">
                    {profile?.name || 'User'}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Button size="sm" onClick={() => navigate('/auth')} className="rounded-full">
                Get Started
              </Button>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 pt-2 border-t border-gray-100 space-y-1">
            {navLinks().map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`block px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  isActive(link.to)
                    ? 'bg-black text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <button
                onClick={() => { handleSignOut(); setMenuOpen(false) }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            ) : (
              <div className="px-4 pt-2">
                <Button size="sm" className="w-full rounded-full" onClick={() => { navigate('/auth'); setMenuOpen(false) }}>
                  Get Started
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
