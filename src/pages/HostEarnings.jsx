import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { insforge } from '../lib/insforge'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ui/Toast'
import { Loader } from '../components/ui/Loader'
import {
  LayoutDashboard, Building2, Receipt, TrendingUp, Download, Menu, X,
} from 'lucide-react'
import SummaryCards from '../components/earnings/SummaryCards'
import PropertyList from '../components/earnings/PropertyList'
import PropertyDetails from '../components/earnings/PropertyDetails'
import EarningsCharts from '../components/earnings/EarningsCharts'
import TransactionsTable from '../components/earnings/TransactionsTable'

const SECTIONS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'properties', label: 'Properties', icon: Building2 },
  { key: 'transactions', label: 'Bookings', icon: Receipt },
  { key: 'analytics', label: 'Earnings', icon: TrendingUp },
]

export default function HostEarnings() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [properties, setProperties] = useState([])
  const [bookings, setBookings] = useState([])
  const [section, setSection] = useState('dashboard')
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (user) fetchData()
  }, [user])

  const fetchData = async () => {
    try {
      const { data: parkingData } = await insforge.database
        .from('parking_locations')
        .select('*')
        .eq('host_id', user.id)
        .order('created_at', { ascending: false })

      setProperties(parkingData || [])

      if (parkingData && parkingData.length > 0) {
        const parkingIds = parkingData.map((p) => p.id)
        const { data: bookingData } = await insforge.database
          .from('bookings')
          .select('*')
          .in('parking_id', parkingIds)
          .order('start_time', { ascending: false })
        setBookings(bookingData || [])
      }
    } catch (err) {
      toast('Failed to load earnings data', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Compute stats
  const stats = useMemo(() => {
    const completed = bookings.filter((b) => b.payment_status === 'completed')
    const now = new Date()

    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)

    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - 7)

    const monthStart = new Date(now)
    monthStart.setMonth(now.getMonth() - 1)

    const prevWeekStart = new Date(weekStart)
    prevWeekStart.setDate(prevWeekStart.getDate() - 7)

    const prevMonthStart = new Date(monthStart)
    prevMonthStart.setMonth(prevMonthStart.getMonth() - 1)

    const sum = (arr) => arr.reduce((s, b) => s + Number(b.total_amount || 0), 0)
    const byDate = (start, end) =>
      completed.filter((b) => {
        const d = new Date(b.start_time)
        return d >= start && (end ? d < end : true)
      })

    const totalEarnings = sum(completed)
    const todayEarnings = sum(byDate(todayStart))
    const weekEarnings = sum(byDate(weekStart))
    const monthEarnings = sum(byDate(monthStart))

    const prevWeekEarnings = sum(byDate(prevWeekStart, weekStart))
    const prevMonthEarnings = sum(byDate(prevMonthStart, monthStart))

    const growthPct = (curr, prev) => {
      if (prev === 0) return curr > 0 ? 100 : 0
      return Math.round(((curr - prev) / prev) * 100)
    }

    // Total growth: compare last 30 days to previous 30 days
    const last30 = sum(byDate(monthStart))
    const prev30 = sum(byDate(prevMonthStart, monthStart))

    return {
      totalEarnings,
      todayEarnings,
      weekEarnings,
      monthEarnings,
      totalBookings: completed.length,
      activeProperties: properties.filter((p) => p.status === 'approved').length,
      weekGrowth: growthPct(weekEarnings, prevWeekEarnings),
      monthGrowth: growthPct(monthEarnings, prevMonthEarnings),
      totalGrowth: growthPct(last30, prev30),
    }
  }, [bookings, properties])

  // CSV export for all earnings
  const exportAllCSV = () => {
    const completed = bookings.filter((b) => b.payment_status === 'completed')
    if (completed.length === 0) {
      toast('No earnings data to export', 'error')
      return
    }
    const propMap = {}
    properties.forEach((p) => { propMap[p.id] = p.title })

    const headers = ['Property', 'Amount', 'Date', 'Time Slot', 'Status']
    const rows = completed.map((b) => {
      const st = new Date(b.start_time)
      const et = new Date(b.end_time)
      return [
        propMap[b.parking_id] || 'Unknown',
        b.total_amount,
        st.toLocaleDateString('en-IN'),
        `${st.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} - ${et.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`,
        b.payment_status,
      ]
    })
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'parkly_earnings.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast('Earnings exported successfully', 'success')
  }

  const handleSectionChange = (key) => {
    setSection(key)
    setSelectedProperty(null)
    setSidebarOpen(false)
  }

  if (loading) return <Loader fullScreen />

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-60 border-r border-gray-100 bg-gray-50/50 shrink-0">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-bold text-sm">Earnings</h2>
          <p className="text-xs text-gray-400 mt-0.5">{profile?.name || 'Host'}</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => handleSectionChange(s.key)}
              className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${
                section === s.key
                  ? 'bg-black text-white'
                  : 'text-gray-500 hover:text-black hover:bg-gray-100'
              }`}
            >
              <s.icon className="w-4 h-4" />
              {s.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={exportAllCSV}
            className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-medium text-gray-500 hover:text-black hover:bg-gray-100 rounded-xl transition-all"
          >
            <Download className="w-4 h-4" />
            Export All CSV
          </button>
          <button
            onClick={() => navigate('/host/dashboard')}
            className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-medium text-gray-400 hover:text-black hover:bg-gray-100 rounded-xl transition-all mt-1"
          >
            ← Back to Dashboard
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white shadow-xl z-50 flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-sm">Earnings</h2>
                <p className="text-xs text-gray-400 mt-0.5">{profile?.name || 'Host'}</p>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {SECTIONS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => handleSectionChange(s.key)}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${
                    section === s.key
                      ? 'bg-black text-white'
                      : 'text-gray-500 hover:text-black hover:bg-gray-100'
                  }`}
                >
                  <s.icon className="w-4 h-4" />
                  {s.label}
                </button>
              ))}
            </nav>
            <div className="p-3 border-t border-gray-100">
              <button
                onClick={() => { exportAllCSV(); setSidebarOpen(false) }}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-medium text-gray-500 hover:text-black hover:bg-gray-100 rounded-xl transition-all"
              >
                <Download className="w-4 h-4" />
                Export All CSV
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          {/* Mobile header */}
          <div className="flex items-center justify-between mb-6 lg:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-bold">
              {SECTIONS.find((s) => s.key === section)?.label || 'Dashboard'}
            </h1>
            <button
              onClick={exportAllCSV}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>

          {/* Desktop header */}
          <div className="hidden lg:flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">
                {section === 'dashboard' && 'Earnings Overview'}
                {section === 'properties' && 'Property Earnings'}
                {section === 'transactions' && 'Recent Bookings'}
                {section === 'analytics' && 'Earnings Analytics'}
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">
                {section === 'dashboard' && 'Track your parking revenue at a glance'}
                {section === 'properties' && 'Earnings breakdown by property'}
                {section === 'transactions' && 'Your latest completed bookings'}
                {section === 'analytics' && 'Charts and insights about your earnings'}
              </p>
            </div>
          </div>

          {/* Dashboard section */}
          {section === 'dashboard' && (
            <div className="space-y-8">
              <SummaryCards stats={stats} loading={false} />

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Top Earning Properties</h3>
                  <button
                    onClick={() => setSection('properties')}
                    className="text-xs text-gray-500 hover:text-black transition-colors"
                  >
                    View all →
                  </button>
                </div>
                <PropertyList
                  properties={properties.slice(0, 3)}
                  bookings={bookings}
                  onSelect={(p) => { setSelectedProperty(p); setSection('properties') }}
                  loading={false}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Recent Transactions</h3>
                  <button
                    onClick={() => setSection('transactions')}
                    className="text-xs text-gray-500 hover:text-black transition-colors"
                  >
                    View all →
                  </button>
                </div>
                <TransactionsTable bookings={bookings} properties={properties} loading={false} />
              </div>
            </div>
          )}

          {/* Properties section */}
          {section === 'properties' && (
            selectedProperty ? (
              <PropertyDetails
                property={selectedProperty}
                bookings={bookings}
                onBack={() => setSelectedProperty(null)}
              />
            ) : (
              <PropertyList
                properties={properties}
                bookings={bookings}
                onSelect={setSelectedProperty}
                loading={false}
              />
            )
          )}

          {/* Transactions section */}
          {section === 'transactions' && (
            <TransactionsTable bookings={bookings} properties={properties} loading={false} />
          )}

          {/* Analytics section */}
          {section === 'analytics' && (
            <EarningsCharts bookings={bookings} properties={properties} loading={false} />
          )}
        </div>
      </main>
    </div>
  )
}
