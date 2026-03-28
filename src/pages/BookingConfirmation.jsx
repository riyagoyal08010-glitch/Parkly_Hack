import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { insforge } from '../lib/insforge'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ui/Toast'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Loader } from '../components/ui/Loader'
import { Textarea } from '../components/ui/Input'
import { QRCodeSVG } from 'qrcode.react'
import { CheckCircle, XCircle, MapPin, Clock, Download, ArrowLeft, Star, Send } from 'lucide-react'

const RATING_LABELS = ['', 'Poor', 'Below Average', 'Good', 'Very Good', 'Excellent']

export default function BookingConfirmation() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const toast = useToast()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  // Review state
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewHover, setReviewHover] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [existingReview, setExistingReview] = useState(null)

  const paymentStatus = searchParams.get('payment')

  useEffect(() => {
    handlePaymentReturn()
  }, [id, paymentStatus])

  const handlePaymentReturn = async () => {
    const { data, error } = await insforge.database
      .from('bookings')
      .select('*, parking_locations!parking_id(title, address, price_per_hour, lat, lng, host_id)')
      .eq('id', id)
      .single()

    if (error || !data) {
      setLoading(false)
      return
    }

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

      // Finalize the slot booking — clears soft lock, marks permanent for this date
      if (data.slot_id) {
        await insforge.database.rpc('book_slot', {
          slot_uuid: data.slot_id,
          user_uuid: data.user_id,
          b_id: data.id,
        })
      }

      await insforge.database.rpc('decrement_available_slots', {
        parking_uuid: data.parking_id,
      })

      const { data: updated } = await insforge.database
        .from('bookings')
        .select('*, parking_locations!parking_id(title, address, price_per_hour, lat, lng, host_id)')
        .eq('id', id)
        .single()

      setBooking(updated || data)
      setProcessing(false)
      toast('Payment successful! Booking confirmed.', 'success')
    } else if (paymentStatus === 'cancelled' && data.payment_status === 'pending') {
      // Release the soft lock immediately on cancel
      if (data.slot_id) {
        await insforge.database.rpc('unlock_slot', {
          slot_uuid: data.slot_id,
          user_uuid: data.user_id,
        })
      }
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

  // Fetch existing review for this booking
  useEffect(() => {
    if (booking?.id && user?.id) {
      fetchExistingReview()
    }
  }, [booking, user])

  const fetchExistingReview = async () => {
    const { data } = await insforge.database
      .from('reviews')
      .select('*')
      .eq('user_id', user.id)
      .eq('booking_id', booking.id)
      .maybeSingle()
    if (data) {
      setExistingReview(data)
      setReviewRating(data.rating)
      setReviewComment(data.comment || '')
    }
  }

  const handleSubmitReview = async () => {
    if (reviewRating === 0) {
      toast('Please select a rating', 'error')
      return
    }
    setSubmittingReview(true)
    try {
      const hostId = booking.parking_locations?.host_id || null
      const { error } = await insforge.database
        .from('reviews')
        .insert([{
          user_id: user.id,
          parking_id: booking.parking_id,
          booking_id: booking.id,
          host_id: hostId,
          rating: reviewRating,
          comment: reviewComment.trim() || null,
          status: 'visible',
        }])
      if (error) {
        if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
          toast('You have already reviewed this parking', 'error')
        } else {
          throw error
        }
      } else {
        setExistingReview({ rating: reviewRating, comment: reviewComment, status: 'visible' })
        toast('Review submitted! Thanks for your feedback.', 'success')
      }
    } catch (err) {
      toast(err.message || 'Failed to submit review', 'error')
    } finally {
      setSubmittingReview(false)
    }
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
  const canReview = isConfirmed && !existingReview

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

      {/* Review Section */}
      {isConfirmed && (
        <Card className="p-6 mt-6">
          <h3 className="font-semibold mb-1">Rate your experience</h3>
          <p className="text-xs text-gray-500 mb-5">Help others find great parking spots</p>

          {existingReview ? (
            <div>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`w-5 h-5 ${s <= existingReview.rating ? 'fill-black text-black' : 'text-gray-200'}`} />
                  ))}
                </div>
                <span className="text-sm font-medium">{RATING_LABELS[existingReview.rating]}</span>
              </div>
              {existingReview.comment && (
                <p className="text-sm text-gray-600 mt-3 italic leading-relaxed">"{existingReview.comment}"</p>
              )}
              <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Your review has been submitted
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Star selector */}
              <div>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      onMouseEnter={() => setReviewHover(star)}
                      onMouseLeave={() => setReviewHover(0)}
                      className="p-1 transition-transform hover:scale-125 active:scale-95"
                    >
                      <Star
                        className={`w-9 h-9 transition-all duration-150 ${
                          star <= (reviewHover || reviewRating)
                            ? 'fill-black text-black'
                            : 'text-gray-200'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {(reviewHover || reviewRating) > 0 && (
                  <p className="text-center text-sm font-medium mt-2 text-gray-600">
                    {RATING_LABELS[reviewHover || reviewRating]}
                  </p>
                )}
              </div>

              {/* Comment */}
              <Textarea
                placeholder="Tell others about your parking experience... (optional)"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
              />

              {/* Submit */}
              <Button
                className="w-full rounded-xl"
                size="lg"
                loading={submittingReview}
                disabled={reviewRating === 0}
                onClick={handleSubmitReview}
              >
                <Send className="w-4 h-4 mr-2" />
                Submit Review
              </Button>
            </div>
          )}
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
