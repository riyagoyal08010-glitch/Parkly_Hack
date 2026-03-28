import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { insforge } from '../lib/insforge'
import { useAuth } from '../contexts/AuthContext'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Loader } from '../components/ui/Loader'
import { MapPin, Plus, Car, DollarSign, FileCheck, AlertCircle } from 'lucide-react'

export default function HostDashboard() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [parkings, setParkings] = useState([])
  const [documents, setDocuments] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Car, label: 'Total Spots', value: parkings.length },
          { icon: FileCheck, label: 'Active Spots', value: approvedParkings.length },
          { icon: Car, label: 'Total Bookings', value: bookings.length },
          { icon: DollarSign, label: 'Earnings', value: `₹${totalEarnings}` },
        ].map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{stat.label}</p>
                <p className="text-xl font-bold">{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

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
  )
}
