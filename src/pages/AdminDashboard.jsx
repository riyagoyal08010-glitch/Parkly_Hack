import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { insforge } from '../lib/insforge'
import { useAuth } from '../contexts/AuthContext'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Loader } from '../components/ui/Loader'
import { Users, Car, FileCheck, Calendar, MapPin, ChevronRight, DollarSign, Clock, AlertTriangle, CheckCircle, MessageSquare, Search, Star, Filter } from 'lucide-react'
import ReviewCard from '../components/ReviewCard'

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

    // Fetch all reviews for admin with host info
    const { data: reviewsData } = await insforge.database
      .from('reviews')
      .select('*, profiles!user_id(name, email), parking_locations!parking_id(title, host_id, profiles!host_id(name))')
      .order('created_at', { ascending: false })
    setAllReviews(reviewsData || [])

    setLoading(false)
  }

  if (loading) return <Loader fullScreen />

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Manage hosts, parking spots, and users</p>
        </div>
        {stats.pending > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full text-sm font-medium">
            <AlertTriangle className="w-4 h-4" />
            {stats.pending} pending review{stats.pending !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {[
          { icon: Users, label: 'Total Users', value: stats.users, color: 'bg-gray-100' },
          { icon: Users, label: 'Total Hosts', value: stats.hosts, color: 'bg-gray-100' },
          { icon: Car, label: 'Active Parking', value: stats.parkings, color: 'bg-gray-100' },
          { icon: Calendar, label: 'Completed Bookings', value: stats.bookings, color: 'bg-gray-100' },
          { icon: DollarSign, label: 'Total Revenue', value: `₹${stats.revenue.toLocaleString()}`, color: 'bg-black text-white' },
          { icon: Clock, label: 'Pending Reviews', value: stats.pending, color: stats.pending > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-100' },
        ].map((stat) => (
          <Card key={stat.label} className={`p-5 ${stat.color}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{stat.label}</p>
                <p className={`text-2xl font-bold mt-1 ${stat.color.includes('text-white') ? 'text-white' : ''}`}>{stat.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color.includes('text-white') ? 'bg-white/20' : 'bg-white'}`}>
                <stat.icon className={`w-5 h-5 ${stat.color.includes('text-white') ? 'text-white' : 'text-gray-600'}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {[
          { key: 'hosts', label: 'Host Applications', count: pendingHosts.length },
          { key: 'parkings', label: 'Parking Approvals', count: pendingParkings.length },
          { key: 'reviews', label: 'All Reviews', count: allReviews.length },
        ].map((t) => (
          <button
            key={t.key}
            className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
              tab === t.key ? 'bg-black text-white' : 'text-gray-500 hover:text-black'
            }`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold ${
                tab === t.key ? 'bg-white text-black' : 'bg-red-500 text-white'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Pending Hosts */}
      {tab === 'hosts' && (
        <div className="space-y-3">
          {pendingHosts.length === 0 ? (
            <Card className="p-12 text-center">
              <CheckCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="font-medium text-gray-900">All caught up!</p>
              <p className="text-sm text-gray-400 mt-1">No pending host applications</p>
            </Card>
          ) : (
            pendingHosts.map((host) => (
              <Card
                key={host.host_id}
                className="p-5 hover:border-black hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => navigate(`/admin/review/${host.host_id}?type=host`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center text-white font-bold text-lg">
                      {(host.profile?.name || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold">{host.profile?.name || 'Unknown'}</h3>
                      <p className="text-sm text-gray-500">{host.profile?.email}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <FileCheck className="w-3 h-3" />
                          {host.documents.length} document(s)
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(host.submitted_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-black transition-colors" />
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Pending Parkings */}
      {tab === 'parkings' && (
        <div className="space-y-3">
          {pendingParkings.length === 0 ? (
            <Card className="p-12 text-center">
              <CheckCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="font-medium text-gray-900">All caught up!</p>
              <p className="text-sm text-gray-400 mt-1">No pending parking approvals</p>
            </Card>
          ) : (
            pendingParkings.map((parking) => (
              <Card
                key={parking.id}
                className="p-5 hover:border-black hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => navigate(`/admin/review/${parking.id}?type=parking`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {parking.photos && parking.photos.length > 0 ? (
                      <img
                        src={parking.photos[0]?.url || parking.photos[0]}
                        alt=""
                        className="w-12 h-12 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                        <Car className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold">{parking.title}</h3>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <MapPin className="w-3 h-3" />
                        {parking.address}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span>₹{parking.price_per_hour}/hr</span>
                        <span>{parking.total_slots} slots</span>
                        <span>Host: {parking.profiles?.name}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-black transition-colors" />
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* All Reviews */}
      {tab === 'reviews' && (
        <div>
          {/* Review stats summary */}
          {allReviews.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Total Reviews', value: allReviews.length, icon: MessageSquare },
                { label: 'Visible', value: allReviews.filter((r) => r.status === 'visible').length, icon: CheckCircle },
                { label: 'Flagged', value: allReviews.filter((r) => r.status === 'flagged').length, icon: AlertTriangle },
                {
                  label: 'Avg Rating',
                  value: (allReviews.filter((r) => r.status === 'visible').reduce((s, r) => s + r.rating, 0) / (allReviews.filter((r) => r.status === 'visible').length || 1)).toFixed(1),
                  icon: Star,
                },
              ].map((s) => (
                <Card key={s.label} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                      <s.icon className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{s.label}</p>
                      <p className="text-lg font-bold">{s.value}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Search and filter bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by user, parking, or host name..."
                value={reviewSearch}
                onChange={(e) => setReviewSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {['all', 'visible', 'flagged', 'hidden'].map((status) => (
                <button
                  key={status}
                  onClick={() => setReviewStatusFilter(status)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all capitalize ${
                    reviewStatusFilter === status ? 'bg-black text-white' : 'text-gray-500 hover:text-black'
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
                  <Card className="p-12 text-center">
                    <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="font-medium text-gray-900">No reviews yet</p>
                    <p className="text-sm text-gray-400 mt-1">Reviews will appear as users rate parking spots</p>
                  </Card>
                )
              }

              if (filtered.length === 0) {
                return (
                  <Card className="p-8 text-center">
                    <Search className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No reviews match your filters</p>
                  </Card>
                )
              }

              return filtered.map((review) => (
                <div key={review.id}>
                  {/* Host name label */}
                  {review.parking_locations?.profiles?.name && (
                    <p className="text-[10px] text-gray-400 mb-1 ml-1">
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
        </div>
      )}
    </div>
  )
}
