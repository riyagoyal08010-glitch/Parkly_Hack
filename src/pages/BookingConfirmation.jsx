import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { insforge } from '../lib/insforge'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ui/Toast'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Loader } from '../components/ui/Loader'
import { QRCodeSVG } from 'qrcode.react'
import { CheckCircle, XCircle, MapPin, Clock, Download, ArrowLeft } from 'lucide-react'

export default function BookingConfirmation() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const toast = useToast()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  const paymentStatus = searchParams.get('payment')

  useEffect(() => {
    handlePaymentReturn()
  }, [id, paymentStatus])

  const handlePaymentReturn = async () => {
    const { data, error } = await insforge.database
      .from('bookings')
      .select('*, parking_locations!parking_id(title, address, price_per_hour, lat, lng)')
      .eq('id', id)
      .single()

    if (error || !data) {
      setLoading(false)
      return
    }

    // If returning from Stripe with success and booking is still pending
    if (paymentStatus === 'success' && data.payment_status === 'pending') {
      setProcessing(true)
      const qrData = JSON.stringify({
        bid: data.id,
        uid: data.user_id,
        pid: data.parking_id,
        from: data.start_time,
        to: data.end_time,
        ts: Date.now(),
      })

      await insforge.database
        .from('bookings')
        .update({
          payment_status: 'completed',
          payment_id: `stripe_${Date.now()}`,
          qr_code_data: qrData,
        })
        .eq('id', id)

      await insforge.database.rpc('decrement_available_slots', {
        parking_uuid: data.parking_id,
      })

      // Re-fetch updated booking
      const { data: updated } = await insforge.database
        .from('bookings')
        .select('*, parking_locations!parking_id(title, address, price_per_hour, lat, lng)')
        .eq('id', id)
        .single()

      setBooking(updated || data)
      setProcessing(false)
      toast('Payment successful! Booking confirmed.', 'success')
    } else if (paymentStatus === 'cancelled' && data.payment_status === 'pending') {
      await insforge.database
        .from('bookings')
        .update({ payment_status: 'failed', status: 'cancelled' })
        .eq('id', id)

      data.payment_status = 'failed'
      data.status = 'cancelled'
      setBooking(data)
      toast('Payment was cancelled', 'error')
    } else {
      setBooking(data)
    }

    setLoading(false)
  }

  const downloadQR = () => {
    const svg = document.getElementById('booking-qr')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      canvas.width = img.width * 2
      canvas.height = img.height * 2
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const a = document.createElement('a')
      a.download = `parkly-booking-${id}.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
  }

  if (loading || processing) return <Loader fullScreen />
  if (!booking) return <div className="text-center py-20">Booking not found</div>

  const parking = booking.parking_locations
  const startTime = new Date(booking.start_time)
  const endTime = new Date(booking.end_time)
  const isConfirmed = booking.payment_status === 'completed'
  const isCancelled = booking.payment_status === 'failed' || booking.status === 'cancelled'

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-black mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        My Bookings
      </button>

      {isConfirmed && (
        <div className="flex items-center gap-3 mb-6">
          <CheckCircle className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">Booking Confirmed</h1>
            <p className="text-gray-500 text-sm">Your parking spot is reserved</p>
          </div>
        </div>
      )}

      {isCancelled && (
        <div className="flex items-center gap-3 mb-6">
          <XCircle className="w-8 h-8 text-gray-400" />
          <div>
            <h1 className="text-2xl font-bold">Payment Cancelled</h1>
            <p className="text-gray-500 text-sm">This booking was not completed</p>
          </div>
        </div>
      )}

      <Card className="p-6 mb-6">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg">{parking?.title}</h3>
            <div className="flex items-center gap-1.5 mt-1 text-gray-500 text-sm">
              <MapPin className="w-3.5 h-3.5" />
              {parking?.address}
            </div>
          </div>

          <div className="border-t pt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Date</p>
              <p className="font-medium text-sm">{startTime.toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Status</p>
              <Badge status={booking.status} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Time</p>
              <p className="font-medium text-sm flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {startTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} - {endTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Amount</p>
              <p className="font-bold">₹{booking.total_amount}</p>
            </div>
          </div>

          {booking.payment_id && (
            <div className="border-t pt-3">
              <p className="text-xs text-gray-500">Payment ID</p>
              <p className="text-xs font-mono">{booking.payment_id}</p>
            </div>
          )}
        </div>
      </Card>

      {/* QR Code */}
      {booking.qr_code_data && (
        <Card className="p-6 text-center">
          <h3 className="font-semibold mb-4">Your Entry QR Code</h3>
          <div className="inline-block p-4 bg-white border-2 border-black rounded-lg">
            <QRCodeSVG
              id="booking-qr"
              value={booking.qr_code_data}
              size={200}
              level="H"
              fgColor="#000000"
              bgColor="#ffffff"
            />
          </div>
          <p className="text-xs text-gray-500 mt-3">Show this QR code at the parking entrance</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={downloadQR}>
            <Download className="w-4 h-4 mr-2" />
            Download QR
          </Button>
        </Card>
      )}

      {/* Live Navigation */}
      {isConfirmed && booking.parking_locations && (
        <Card className="p-6 text-center mt-6">
          <h3 className="font-semibold mb-2">Get Directions</h3>
          <p className="text-xs text-gray-500 mb-4">Navigate to your parking spot</p>
          <Button
            size="lg"
            className="w-full rounded-xl"
            onClick={() => {
              const lat = booking.parking_locations.lat || ''
              const lng = booking.parking_locations.lng || ''
              const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
              window.open(url, '_blank')
            }}
          >
            <MapPin className="w-4 h-4 mr-2" />
            Open in Google Maps
          </Button>
        </Card>
      )}

      {isCancelled && (
        <div className="text-center mt-6">
          <Button onClick={() => navigate('/explore')}>
            Find another spot
          </Button>
        </div>
      )}
    </div>
  )
}
