import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { insforge } from '../lib/insforge'
import { useAuth } from '../contexts/AuthContext'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Loader } from '../components/ui/Loader'
import { MapPin, Plus, Car, DollarSign, FileCheck, AlertCircle, Star, MessageSquare } from 'lucide-react'
import ReviewCard from '../components/ReviewCard'
import StarRating from '../components/StarRating'

export default function HostDashboard() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [parkings, setParkings] = useState([])
  const [documents, setDocuments] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('spots')
  const [reviews, setReviews] = useState([])
  const [hostRating, setHostRating] = useState({ avg_rating: 0, review_count: 0 })
  const [filterParking, setFilterParking] = useState('all')

  useEffect(() => {
    if (user) fetchData()
  }, [user])

  const fetchData = async () => {
    const [parkingRes, docRes] = await Promise.all([
      insforge.database
        .from('parking_locations')
        .select('*')
        .eq('host_id', user.id)
        .order('created_at', { ascending: false }),
      insforge.database
        .from('host_documents')
        .select('*')
        .eq('host_id', user.id),
    ])

    const parkingData = parkingRes.data || []
    setParkings(parkingData)
    setDocuments(docRes.data || [])

    // Fetch bookings for all host parkings
    if (parkingData.length > 0) {
      const parkingIds = parkingData.map((p) => p.id)
      const { data: bookingData } = await insforge.database
        .from('bookings')
        .select('*')
        .in('parking_id', parkingIds)
        .eq('payment_status', 'completed')
      setBookings(bookingData || [])
    }

    // Fetch reviews for host's parkings
    if (parkingData.length > 0) {
      const parkingIds = parkingData.map((p) => p.id)
      const { data: reviewData } = await insforge.database
        .from('reviews')
        .select('*, profiles!user_id(name), parking_locations!parking_id(title)')
        .in('parking_id', parkingIds)
        .eq('status', 'visible')
        .order('created_at', { ascending: false })
      setReviews(reviewData || [])
    }

    // Fetch host rating
    const { data: ratingData } = await insforge.database.rpc('get_host_ratings', { h_id: user.id })
    if (ratingData && ratingData.length > 0) {
      setHostRating(ratingData[0])
    }

    setLoading(false)
  }

  if (loading) return <Loader fullScreen />

  const hasApprovedDocs = documents.some((d) => d.status === 'approved')
  const pendingDocs = documents.filter((d) => d.status === 'pending')
  const approvedParkings = parkings.filter((p) => p.status === 'approved')
  const totalEarnings = bookings.reduce((sum, b) => sum + Number(b.total_amount), 0)

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Host Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome, {profile?.name}</p>
        </div>
        <Button onClick={() => navigate('/host/register')}>
          <Plus className="w-4 h-4 mr-2" />
          {hasApprovedDocs ? 'Add Parking' : 'Get Started'}
        </Button>
      </div>

      {/* Document warning */}
      {!hasApprovedDocs && (
        <Card className="p-4 mb-6 border-black bg-gray-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold text-sm">Documents Required</h3>
              <p className="text-sm text-gray-600 mt-1">
                {pendingDocs.length > 0
                  ? 'Your documents are under review. You\'ll be able to list parking spots once approved.'
                  : 'Upload your ID and property documents to start listing parking spots.'}
              </p>
              {pendingDocs.length === 0 && (
                <Button size="sm" className="mt-3" onClick={() => navigate('/host/register')}>
                  Upload Documents
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[
          { icon: Car, label: 'Total Spots', value: parkings.length },
          { icon: FileCheck, label: 'Active Spots', value: approvedParkings.length },
          { icon: Car, label: 'Total Bookings', value: bookings.length },
          { icon: DollarSign, label: 'Earnings', value: `₹${totalEarnings}`, link: '/host/earnings' },
          { icon: Star, label: 'Avg Rating', value: hostRating.avg_rating ? `${hostRating.avg_rating} ★` : '—' },
        ].map((stat) => (
          <Card
            key={stat.label}
            className={`p-4 ${stat.link ? 'cursor-pointer hover:shadow-md' : ''}`}
            onClick={stat.link ? () => navigate(stat.link) : undefined}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{stat.label}</p>
                <p className="text-xl font-bold">{stat.value}</p>
              </div>
            </div>
            {stat.link && <p className="text-[10px] text-gray-400 mt-2 text-right">View details →</p>}
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        <button
          className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'spots' ? 'bg-black text-white' : 'text-gray-500 hover:text-black'
          }`}
          onClick={() => setActiveTab('spots')}
        >
          My Spots ({parkings.length})
        </button>
        <button
          className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'reviews' ? 'bg-black text-white' : 'text-gray-500 hover:text-black'
          }`}
          onClick={() => setActiveTab('reviews')}
        >
          Reviews ({reviews.length})
        </button>
      </div>

      {activeTab === 'spots' && (
        <div>
          {/* Parking list */}
          <h2 className="font-semibold text-lg mb-4">My Parking Spots</h2>
          {parkings.length === 0 ? (
            <Card className="p-8 text-center">
              <Car className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No parking spots listed yet</p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {parkings.map((p) => (
                <Card key={p.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{p.title}</h3>
                      <div className="flex items-center gap-1.5 mt-1 text-gray-500 text-sm">
                        <MapPin className="w-3.5 h-3.5" />
                        {p.address}
                      </div>
                    </div>
                    <Badge status={p.status} />
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t text-sm">
                    <span>₹{p.price_per_hour}/hr</span>
                    <span className="text-gray-500">{p.total_slots} slots</span>
                  </div>
                  {p.rejection_reason && (
                    <p className="text-xs text-red-500 mt-2">Rejection reason: {p.rejection_reason}</p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'reviews' && (
        <div>
          {/* Rating summary */}
          {reviews.length > 0 && (
            <Card className="p-6 mb-6">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-4xl font-bold">{hostRating.avg_rating || '0'}</p>
                  <div className="flex gap-0.5 mt-1 justify-center">
                    {[1,2,3,4,5].map((s) => (
                      <Star key={s} className={`w-4 h-4 ${s <= Math.round(hostRating.avg_rating) ? 'fill-black text-black' : 'text-gray-200'}`} />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex-1 space-y-1">
                  {[5,4,3,2,1].map((star) => {
                    const count = reviews.filter((r) => r.rating === star).length
                    const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0
                    return (
                      <div key={star} className="flex items-center gap-2 text-xs">
                        <span className="w-3 text-gray-500">{star}</span>
                        <Star className="w-3 h-3 fill-black text-black" />
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-black rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-6 text-right text-gray-400">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </Card>
          )}

          {/* Filter by parking */}
          {parkings.length > 1 && (
            <div className="mb-4">
              <select
                value={filterParking}
                onChange={(e) => setFilterParking(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="all">All Parking Spots</option>
                {parkings.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
          )}

          {/* Reviews list */}
          <div className="space-y-3">
            {(() => {
              const filtered = reviews.filter((r) => filterParking === 'all' || r.parking_id === filterParking)
              if (reviews.length === 0) {
                return (
                  <Card className="p-12 text-center">
                    <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="font-medium text-gray-900">No reviews yet</p>
                    <p className="text-sm text-gray-400 mt-1">Reviews will appear here when users rate your parking spots</p>
                  </Card>
                )
              }
              if (filtered.length === 0) {
                return (
                  <Card className="p-8 text-center">
                    <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No reviews for this parking spot yet</p>
                  </Card>
                )
              }
              return filtered.map((review) => (
                <ReviewCard key={review.id} review={review} showParking={filterParking === 'all'} />
              ))
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
