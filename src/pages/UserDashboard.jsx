import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { insforge } from '../lib/insforge'
import { useAuth } from '../contexts/AuthContext'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Loader } from '../components/ui/Loader'
import { MapPin, Clock, Search, Calendar } from 'lucide-react'

export default function UserDashboard() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('upcoming')

  useEffect(() => {
    if (user) fetchBookings()
  }, [user])

  const fetchBookings = async () => {
    const { data, error } = await insforge.database
      .from('bookings')
      .select('*, parking_locations!parking_id(title, address)')
      .eq('user_id', user.id)
      .order('start_time', { ascending: false })
    if (!error) setBookings(data || [])
    setLoading(false)
  }

  const now = new Date()
  const upcoming = bookings.filter(
    (b) => b.status === 'active' && new Date(b.end_time) > now
  )
  const past = bookings.filter(
    (b) => b.status !== 'active' || new Date(b.end_time) <= now
  )
  const displayed = tab === 'upcoming' ? upcoming : past

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">
            Hello, {profile?.name || 'there'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {upcoming.length} upcoming booking{upcoming.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => navigate('/explore')}>
          <Search className="w-4 h-4 mr-2" />
          Find Parking
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        <button
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
            tab === 'upcoming' ? 'bg-black text-white' : 'text-gray-500'
          }`}
          onClick={() => setTab('upcoming')}
        >
          Upcoming ({upcoming.length})
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
            tab === 'past' ? 'bg-black text-white' : 'text-gray-500'
          }`}
          onClick={() => setTab('past')}
        >
          Past ({past.length})
        </button>
      </div>

      {loading ? (
        <Loader />
      ) : displayed.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            {tab === 'upcoming' ? 'No upcoming bookings' : 'No past bookings'}
          </p>
          {tab === 'upcoming' && (
            <Button variant="outline" className="mt-4" onClick={() => navigate('/explore')}>
              Find parking
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((b) => {
            const parking = b.parking_locations
            const start = new Date(b.start_time)
            const end = new Date(b.end_time)
            return (
              <Card
                key={b.id}
                className="p-4 hover:border-black transition-colors"
                onClick={() => navigate(`/booking/${b.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">{parking?.title || 'Parking'}</h3>
                    <div className="flex items-center gap-1.5 mt-1 text-gray-500 text-sm">
                      <MapPin className="w-3.5 h-3.5" />
                      {parking?.address}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {start.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {start.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge status={b.status} />
                    <p className="font-bold mt-2">₹{b.total_amount}</p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
