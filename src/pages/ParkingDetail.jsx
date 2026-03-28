import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { insforge } from '../lib/insforge'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ui/Toast'
import { getStripe, createCheckoutSession } from '../lib/stripe'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { Loader } from '../components/ui/Loader'
import { MapPin, Star, Car, Clock, ArrowLeft, Shield, MessageSquare } from 'lucide-react'
import SlotPicker from '../components/SlotPicker'
import StarRating from '../components/StarRating'
import ReviewCard from '../components/ReviewCard'

export default function ParkingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const toast = useToast()

  const [parking, setParking] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [startHour, setStartHour] = useState('10')
  const [endHour, setEndHour] = useState('12')
  const [selectedPhoto, setSelectedPhoto] = useState(0)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [selectedSlotData, setSelectedSlotData] = useState(null)
  const [parkingRating, setParkingRating] = useState({ avg_rating: 0, review_count: 0 })

  const fetchRating = async () => {
    const { data } = await insforge.database.rpc('get_parking_rating', { p_id: id })
    if (data && data.length > 0) setParkingRating(data[0])
  }

  useEffect(() => {
    fetchParking()
    fetchReviews()
    fetchRating()
  }, [id])

  const fetchParking = async () => {
    const { data, error } = await insforge.database
      .from('parking_locations')
      .select('*')
      .eq('id', id)
      .single()
    if (!error) setParking(data)
    setLoading(false)
  }

  const fetchReviews = async () => {
    const { data } = await insforge.database
      .from('reviews')
      .select('*, profiles!user_id(name)')
      .eq('parking_id', id)
      .eq('status', 'visible')
      .order('created_at', { ascending: false })
    if (data) setReviews(data)
  }

  const hours = Array.from({ length: 24 }, (_, i) => i)
  const duration = Math.max(0, parseInt(endHour) - parseInt(startHour))
  const totalAmount = parking ? duration * parking.price_per_hour : 0

  const handleBooking = async () => {
    if (duration <= 0) {
      toast('End time must be after start time', 'error')
      return
    }
    if (!parking.available_slots || parking.available_slots <= 0) {
      toast('No slots available', 'error')
      return
    }

    setBooking(true)
    try {
      const startTime = new Date(`${date}T${startHour.padStart(2, '0')}:00:00`)
      const endTime = new Date(`${date}T${endHour.padStart(2, '0')}:00:00`)

      // Create booking
      const { data: bookingData, error: bookingError } = await insforge.database
        .from('bookings')
        .insert([{
          user_id: user.id,
          parking_id: id,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          total_amount: totalAmount,
          payment_status: 'pending',
          status: 'active',
        }])
        .select()
        .single()

      if (bookingError) throw new Error(bookingError.message)

      // Book the selected slot
      if (selectedSlot) {
        await insforge.database.rpc('book_slot', {
          slot_uuid: selectedSlot,
          user_uuid: user.id,
          b_id: bookingData.id,
        })
      }

      // Create Stripe Checkout Session
      const session = await createCheckoutSession({
        bookingId: bookingData.id,
        amount: totalAmount,
        parkingTitle: parking.title,
        userEmail: profile?.email || user.email,
      })

      // Redirect to Stripe Checkout
      if (session.url) {
        window.location.href = session.url
      } else {
        const stripe = await getStripe()
        const { error: stripeError } = await stripe.redirectToCheckout({
          sessionId: session.session_id,
        })
        if (stripeError) throw new Error(stripeError.message)
      }
    } catch (err) {
      toast(err.message || 'Booking failed', 'error')
    } finally {
      setBooking(false)
    }
  }

  if (loading) return <Loader fullScreen />
  if (!parking) return <div className="text-center py-20">Parking not found</div>

  const avgRating = parkingRating.avg_rating
  const reviewCount = parkingRating.review_count

  const photos = parking.photos || []

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-black mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to search
      </button>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Photos */}
          {photos.length > 0 && (
            <div>
              <img
                src={photos[selectedPhoto]?.url || photos[selectedPhoto]}
                alt={parking.title}
                className="w-full h-64 sm:h-96 object-cover rounded-lg"
              />
              {photos.length > 1 && (
                <div className="flex gap-2 mt-2 overflow-x-auto">
                  {photos.map((photo, i) => (
                    <img
                      key={i}
                      src={photo?.url || photo}
                      alt=""
                      className={`w-20 h-20 object-cover rounded cursor-pointer border-2 ${
                        i === selectedPhoto ? 'border-black' : 'border-transparent'
                      }`}
                      onClick={() => setSelectedPhoto(i)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Title & Info */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{parking.title}</h1>
            <div className="flex items-center gap-2 mt-2 text-gray-500">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">{parking.address}</span>
            </div>
            <div className="flex items-center gap-4 mt-3">
              <span className="text-2xl font-bold">₹{parking.price_per_hour}<span className="text-sm font-normal text-gray-500">/hr</span></span>
              <StarRating rating={avgRating} count={reviewCount} size="md" />
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Car className="w-4 h-4" />
                {parking.available_slots} / {parking.total_slots} available
              </div>
            </div>
          </div>

          {/* Description */}
          {parking.description && (
            <div>
              <h3 className="font-semibold mb-2">About</h3>
              <p className="text-gray-600 text-sm">{parking.description}</p>
            </div>
          )}

          {/* Amenities */}
          {parking.amenities && parking.amenities.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {parking.amenities.map((a) => (
                  <span key={a} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-sm">
                    <Shield className="w-3 h-3" />
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold">Reviews</h3>
                {reviewCount > 0 && (
                  <StarRating rating={avgRating} count={reviewCount} size="sm" />
                )}
              </div>
            </div>
            {reviews.length === 0 ? (
              <Card className="p-8 text-center">
                <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No reviews yet</p>
                <p className="text-xs text-gray-400 mt-1">Be the first to review after booking</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Booking */}
        <div>
          <Card className="p-6 sticky top-24">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Book this spot</h3>
              <StarRating rating={avgRating} count={reviewCount} size="sm" />
            </div>

            <div className="space-y-4">
              {/* Slot selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Choose your spot</label>
                <SlotPicker
                  parkingId={id}
                  selectedSlotId={selectedSlot}
                  onSlotSelect={(slotId, slotData) => {
                    setSelectedSlot(slotId)
                    setSelectedSlotData(slotData)
                  }}
                />
                {selectedSlotData && (
                  <p className="text-xs text-center mt-2 font-medium">
                    Selected: <span className="bg-black text-white px-2 py-0.5 rounded">{selectedSlotData.slot_label}</span>
                  </p>
                )}
              </div>

              <div className="border-t my-2" />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                  <select
                    value={startHour}
                    onChange={(e) => setStartHour(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    {hours.map((h) => (
                      <option key={h} value={h}>{h.toString().padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                  <select
                    value={endHour}
                    onChange={(e) => setEndHour(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    {hours.map((h) => (
                      <option key={h} value={h}>{h.toString().padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">₹{parking.price_per_hour} x {duration} hr{duration !== 1 ? 's' : ''}</span>
                  <span>₹{totalAmount}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>₹{totalAmount}</span>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                loading={booking}
                disabled={duration <= 0 || parking.available_slots <= 0 || !selectedSlot}
                onClick={handleBooking}
              >
                {parking.available_slots <= 0 ? 'Fully Booked' : `Pay ₹${totalAmount}`}
              </Button>

              {duration <= 0 && (
                <p className="text-xs text-red-500 text-center">Select valid time range</p>
              )}
              {duration > 0 && !selectedSlot && (
                <p className="text-xs text-gray-500 text-center">Select a parking slot above</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
