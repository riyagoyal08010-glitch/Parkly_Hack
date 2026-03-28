import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { insforge } from '../lib/insforge'
import { useAuth } from '../contexts/AuthContext'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Loader } from '../components/ui/Loader'
import {
  Users, Car, FileCheck, Calendar, MapPin, ChevronRight, IndianRupee,
  Clock, AlertTriangle, CheckCircle, MessageSquare, Search, Star,
  TrendingUp, TrendingDown, Zap, Shield, BarChart3,
} from 'lucide-react'
import ReviewCard from '../components/ReviewCard'

// Skeleton loader block
function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200/80 rounded-2xl ${className}`} />
}

// Animated stat card
function StatCard({ icon: Icon, label, value, color, iconBg, trend, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="p-5 group hover:shadow-lg hover:border-gray-300 hover:-translate-y-0.5 transition-all duration-300">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
            <p className={`text-2xl font-bold mt-1.5 ${color || 'text-gray-900'}`}>{value}</p>
            {trend && (
              <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${
                trend.up ? 'text-emerald-600' : 'text-red-500'
              }`}>
                {trend.up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {trend.value}
              </div>
            )}
          </div>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${iconBg || 'bg-gray-100'}`}>
            <Icon className={`w-5 h-5 ${iconBg?.includes('bg-black') || iconBg?.includes('bg-gray-900') ? 'text-white' : 'text-gray-600'}`} />
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { role } = useAuth()
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('hosts')
  const [pendingHosts, setPendingHosts] = useState([])
  const [pendingParkings, setPendingParkings] = useState([])
  const [stats, setStats] = useState({ users: 0, hosts: 0, parkings: 0, bookings: 0, revenue: 0, pending: 0 })
  const [allReviews, setAllReviews] = useState([])
  const [reviewStatusFilter, setReviewStatusFilter] = useState('all')
  const [reviewSearch, setReviewSearch] = useState('')

  useEffect(() => {
    if (role === 'admin') fetchData()
  }, [role])

  const fetchData = async () => {
    const [hostsRes, parkingsRes, userCountRes, hostCountRes, parkingCountRes, bookingRes] =
      await Promise.all([
        insforge.database
          .from('host_documents')
          .select('*, profiles!host_id(name, email, phone, created_at)')
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
        insforge.database
          .from('parking_locations')
          .select('*, profiles!host_id(name, email)')
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
        insforge.database.from('profiles').select('id', { count: 'exact' }).eq('role', 'user'),
        insforge.database.from('profiles').select('id', { count: 'exact' }).eq('role', 'host'),
        insforge.database.from('parking_locations').select('id', { count: 'exact' }).eq('status', 'approved'),
        insforge.database.from('bookings').select('id, total_amount, payment_status').eq('payment_status', 'completed'),
      ])

    const hostMap = new Map()
    ;(hostsRes.data || []).forEach((doc) => {
      if (!hostMap.has(doc.host_id)) {
        hostMap.set(doc.host_id, {
          host_id: doc.host_id,
          profile: doc.profiles,
          documents: [],
          submitted_at: doc.created_at,
        })
      }
      hostMap.get(doc.host_id).documents.push(doc)
    })
    setPendingHosts(Array.from(hostMap.values()))
    setPendingParkings(parkingsRes.data || [])

    const completedBookings = bookingRes.data || []
    const totalRevenue = completedBookings.reduce((sum, b) => sum + Number(b.total_amount || 0), 0)

    setStats({
      users: userCountRes.count || 0,
      hosts: hostCountRes.count || 0,
      parkings: parkingCountRes.count || 0,
      bookings: completedBookings.length,
      revenue: totalRevenue,
      pending: (hostsRes.data?.length || 0) + (parkingsRes.data?.length || 0),
    })

    const { data: reviewsData } = await insforge.database
      .from('reviews')
      .select('*, profiles!user_id(name, email), parking_locations!parking_id(title, host_id, profiles!host_id(name))')
      .order('created_at', { ascending: false })
    setAllReviews(reviewsData || [])

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-4 w-48 mb-8" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-12 w-96 mb-6" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    )
  }

  const tabs = [
    { key: 'hosts', label: 'Host Applications', count: pendingHosts.length, icon: FileCheck },
    { key: 'parkings', label: 'Parking Approvals', count: pendingParkings.length, icon: Car },
    { key: 'reviews', label: 'All Reviews', count: allReviews.length, icon: MessageSquare },
  ]

  const visibleReviews = allReviews.filter((r) => r.status === 'visible')
  const avgRating = visibleReviews.length > 0
    ? (visibleReviews.reduce((s, r) => s + r.rating, 0) / visibleReviews.length).toFixed(1)
    : '0.0'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Manage hosts, parking spots, and reviews</p>
        </div>
        {stats.pending > 0 && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 border border-amber-200/80 rounded-xl text-sm font-semibold"
          >
            <AlertTriangle className="w-4 h-4" />
            {stats.pending} pending
          </motion.div>
        )}
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard icon={Users} label="Total Users" value={stats.users} iconBg="bg-blue-50" delay={0.05} trend={{ up: true, value: 'Active users' }} />
        <StatCard icon={Shield} label="Total Hosts" value={stats.hosts} iconBg="bg-violet-50" delay={0.1} trend={{ up: true, value: 'Verified hosts' }} />
        <StatCard icon={Car} label="Active Parking" value={stats.parkings} iconBg="bg-emerald-50" delay={0.15} trend={{ up: true, value: 'Live spots' }} />
        <StatCard icon={Calendar} label="Bookings" value={stats.bookings} iconBg="bg-cyan-50" delay={0.2} trend={{ up: true, value: 'Completed' }} />
        <StatCard icon={IndianRupee} label="Revenue" value={`₹${stats.revenue.toLocaleString()}`} iconBg="bg-gray-900" color="text-emerald-600" delay={0.25} trend={{ up: true, value: 'Total earned' }} />
        <StatCard
          icon={Clock}
          label="Pending Reviews"
          value={stats.pending}
          iconBg={stats.pending > 0 ? 'bg-amber-50' : 'bg-gray-100'}
          delay={0.3}
          trend={stats.pending > 0 ? { up: false, value: 'Needs attention' } : undefined}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100/80 rounded-2xl p-1.5 mb-6 w-fit border border-gray-200/60">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`relative px-5 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 flex items-center gap-2 ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setTab(t.key)}
          >
            <t.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{t.label}</span>
            {t.count > 0 && (
              <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[10px] flex items-center justify-center font-bold transition-all ${
                tab === t.key ? 'bg-gray-900 text-white' : 'bg-red-500 text-white'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {/* Pending Hosts */}
        {tab === 'hosts' && (
          <motion.div
            key="hosts"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-3"
          >
            {pendingHosts.length === 0 ? (
              <Card className="p-14 text-center">
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                </div>
                <p className="font-semibold text-gray-900">All caught up!</p>
                <p className="text-sm text-gray-400 mt-1.5">No pending host applications</p>
              </Card>
            ) : (
              pendingHosts.map((host, i) => (
                <motion.div
                  key={host.host_id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                >
                  <Card
                    className="p-5 hover:border-gray-300 hover:shadow-lg transition-all duration-300 cursor-pointer group"
                    onClick={() => navigate(`/admin/review/${host.host_id}?type=host`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm group-hover:scale-105 transition-transform duration-300">
                          {(host.profile?.name || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{host.profile?.name || 'Unknown'}</h3>
                          <p className="text-sm text-gray-500">{host.profile?.email}</p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-xs text-gray-400 flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded-md">
                              <FileCheck className="w-3 h-3" />
                              {host.documents.length} doc{host.documents.length !== 1 ? 's' : ''}
                            </span>
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(host.submitted_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge status="pending" />
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all duration-200" />
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))
            )}
          </motion.div>
        )}

        {/* Pending Parkings */}
        {tab === 'parkings' && (
          <motion.div
            key="parkings"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-3"
          >
            {pendingParkings.length === 0 ? (
              <Card className="p-14 text-center">
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                </div>
                <p className="font-semibold text-gray-900">All caught up!</p>
                <p className="text-sm text-gray-400 mt-1.5">No pending parking approvals</p>
              </Card>
            ) : (
              pendingParkings.map((parking, i) => (
                <motion.div
                  key={parking.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                >
                  <Card
                    className="p-5 hover:border-gray-300 hover:shadow-lg transition-all duration-300 cursor-pointer group"
                    onClick={() => navigate(`/admin/review/${parking.id}?type=parking`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {parking.photos && parking.photos.length > 0 ? (
                          <img
                            src={parking.photos[0]?.url || parking.photos[0]}
                            alt=""
                            className="w-14 h-14 rounded-xl object-cover shadow-sm group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center">
                            <Car className="w-6 h-6 text-gray-300" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-semibold text-gray-900">{parking.title}</h3>
                          <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate max-w-[240px]">{parking.address}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-xs font-semibold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md">₹{parking.price_per_hour}/hr</span>
                            <span className="text-xs text-gray-400">{parking.total_slots} slots</span>
                            <span className="text-xs text-gray-400">by {parking.profiles?.name}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge status="pending" />
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all duration-200" />
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))
            )}
          </motion.div>
        )}

        {/* All Reviews */}
        {tab === 'reviews' && (
          <motion.div
            key="reviews"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {/* Review analytics mini-cards */}
            {allReviews.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                  {
                    label: 'Total Reviews', value: allReviews.length,
                    icon: MessageSquare, iconBg: 'bg-blue-50', iconColor: 'text-blue-600',
                  },
                  {
                    label: 'Visible', value: visibleReviews.length,
                    icon: CheckCircle, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600',
                  },
                  {
                    label: 'Flagged', value: allReviews.filter((r) => r.status === 'flagged').length,
                    icon: AlertTriangle, iconBg: 'bg-amber-50', iconColor: 'text-amber-600',
                  },
                  {
                    label: 'Avg Rating', value: avgRating,
                    icon: Star, iconBg: 'bg-amber-50', iconColor: 'text-amber-500',
                    extra: (
                      <div className="flex items-center gap-0.5 mt-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`w-3 h-3 ${s <= Math.round(Number(avgRating)) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                        ))}
                      </div>
                    ),
                  },
                ].map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.06 }}
                  >
                    <Card className="p-4 hover:shadow-md hover:border-gray-300 transition-all duration-300">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.iconBg}`}>
                          <s.icon className={`w-4.5 h-4.5 ${s.iconColor}`} />
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 font-medium">{s.label}</p>
                          <p className="text-lg font-bold text-gray-900">{s.value}</p>
                          {s.extra}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Search and filter bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="flex-1 relative group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-colors group-focus-within:text-gray-600" />
                <input
                  type="text"
                  placeholder="Search by user, parking, or host name..."
                  value={reviewSearch}
                  onChange={(e) => setReviewSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all duration-200 placeholder:text-gray-400"
                />
              </div>
              <div className="flex gap-1 bg-gray-100/80 rounded-xl p-1 border border-gray-200/60">
                {['all', 'visible', 'flagged', 'hidden'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setReviewStatusFilter(status)}
                    className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all duration-200 capitalize ${
                      reviewStatusFilter === status
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Reviews list */}
            <div className="space-y-3">
              {(() => {
                const filtered = allReviews.filter((r) => {
                  if (reviewStatusFilter !== 'all' && r.status !== reviewStatusFilter) return false
                  if (reviewSearch.trim()) {
                    const q = reviewSearch.toLowerCase()
                    const userName = (r.profiles?.name || '').toLowerCase()
                    const parkingName = (r.parking_locations?.title || '').toLowerCase()
                    const hostName = (r.parking_locations?.profiles?.name || '').toLowerCase()
                    if (!userName.includes(q) && !parkingName.includes(q) && !hostName.includes(q)) return false
                  }
                  return true
                })

                if (allReviews.length === 0) {
                  return (
                    <Card className="p-14 text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <MessageSquare className="w-8 h-8 text-gray-300" />
                      </div>
                      <p className="font-semibold text-gray-900">No reviews yet</p>
                      <p className="text-sm text-gray-400 mt-1.5">Reviews will appear as users rate parking spots</p>
                    </Card>
                  )
                }

                if (filtered.length === 0) {
                  return (
                    <Card className="p-10 text-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <Search className="w-6 h-6 text-gray-300" />
                      </div>
                      <p className="text-sm text-gray-500 font-medium">No reviews match your filters</p>
                    </Card>
                  )
                }

                return filtered.map((review) => (
                  <div key={review.id}>
                    {review.parking_locations?.profiles?.name && (
                      <p className="text-[10px] text-gray-400 font-medium mb-1.5 ml-1 uppercase tracking-wider">
                        Host: {review.parking_locations.profiles.name}
                      </p>
                    )}
                    <ReviewCard
                      review={review}
                      showParking
                      showUser
                      showModeration
                      onModerate={async (reviewId, newStatus) => {
                        await insforge.database
                          .from('reviews')
                          .update({ status: newStatus })
                          .eq('id', reviewId)
                        setAllReviews((prev) =>
                          prev.map((r) => r.id === reviewId ? { ...r, status: newStatus } : r)
                        )
                      }}
                    />
                  </div>
                ))
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
