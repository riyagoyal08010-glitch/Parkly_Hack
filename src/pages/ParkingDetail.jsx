import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { insforge } from '../lib/insforge'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ui/Toast'
import { getStripe, createCheckoutSession } from '../lib/stripe'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { Loader } from '../components/ui/Loader'
import { MapPin, Star, Car, Clock, ArrowLeft, Shield, MessageSquare, Navigation, Hash } from 'lucide-react'
import SlotPicker from '../components/SlotPicker'
import StarRating from '../components/StarRating'
import ReviewCard from '../components/ReviewCard'

function createPriceIcon(price, isCurrent = false) {
  const bg = isCurrent ? '#000000' : 'rgba(255,255,255,0.95)'
  const fg = isCurrent ? '#ffffff' : '#000000'
  const shadow = isCurrent
    ? '0 0 0 2px #000, 0 4px 20px rgba(0,0,0,0.4)'
    : '0 2px 10px rgba(0,0,0,0.5)'
  const scale = isCurrent ? 'transform:scale(1.15);' : ''
  const pointer = isCurrent ? '#000000' : 'rgba(255,255,255,0.95)'
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="position:relative;display:inline-block;${scale}transition:transform 0.2s;cursor:pointer;">
      <div style="background:${bg};color:${fg};padding:6px 12px;border-radius:20px;font-size:13px;font-weight:700;white-space:nowrap;box-shadow:${shadow};letter-spacing:-0.02em;">₹${price}</div>
      <div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:7px solid ${pointer};margin:-1px auto 0;"></div>
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [35, 48],
    popupAnchor: [0, -48],
  })
}

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
  const [nearbySpots, setNearbySpots] = useState([])
  const [numberPlate, setNumberPlate] = useState('')
  const [plateError, setPlateError] = useState('')

  const fetchRating = async () => {
    const { data } = await insforge.database.rpc('get_parking_rating', { p_id: id })
    if (data && data.length > 0) setParkingRating(data[0])
  }

  useEffect(() => {
    fetchParking()
    fetchReviews()
    fetchRating()
    fetchNearbySpots()
  }, [id])

  const fetchNearbySpots = async () => {
    const { data } = await insforge.database
      .from('parking_locations')
      .select('id, title, address, lat, lng, price_per_hour, available_slots')
      .eq('status', 'approved')
    if (data) setNearbySpots(data)
  }

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

  // Indian vehicle number plate format: SS00SS0000 (e.g., PB10AB1234, MH12DE5678)
  // Accepts with or without spaces/hyphens
  const PLATE_REGEX = /^[A-Z]{2}\s?[0-9]{1,2}\s?[A-Z]{1,3}\s?[0-9]{1,4}$/i
  const validatePlate = (value) => {
    const cleaned = value.toUpperCase().replace(/[\s-]/g, '')
    if (!cleaned) return 'Vehicle number plate is required'
    if (cleaned.length < 6 || cleaned.length > 12) return 'Invalid plate length'
    if (!PLATE_REGEX.test(value.trim())) return 'Invalid format. Use Indian format (e.g., PB10AB1234)'
    return ''
  }

  const handlePlateChange = (e) => {
    const value = e.target.value.toUpperCase()
    setNumberPlate(value)
    if (plateError) setPlateError(validatePlate(value))
  }

  const handleBooking = async () => {
    if (duration <= 0) {
      toast('End time must be after start time', 'error')
      return
    }
    if (!selectedSlot) {
      toast('Please select a parking slot', 'error')
      return
    }
    // Validate number plate before proceeding
    const plateValidationError = validatePlate(numberPlate)
    if (plateValidationError) {
      setPlateError(plateValidationError)
      toast(plateValidationError, 'error')
      return
    }

    setBooking(true)
    try {
      // 1. Soft-lock the slot (60s expiry) before payment
      const { data: lockResult, error: lockError } = await insforge.database.rpc('lock_slot', {
        slot_uuid: selectedSlot,
        user_uuid: user.id,
      })

      // RPC returns boolean — may come as true, [true], or [{lock_slot: true}]
      const lockSuccess = lockResult === true
        || lockResult?.[0] === true
        || lockResult?.[0]?.lock_slot === true
        || (Array.isArray(lockResult) && lockResult.length > 0 && lockResult[0] !== false)

      if (lockError || !lockSuccess) {
        toast('Slot just got taken by someone else. Please select another.', 'error')
        setSelectedSlot(null)
        setSelectedSlotData(null)
        setBooking(false)
        return
      }

      const startTime = new Date(`${date}T${startHour.padStart(2, '0')}:00:00`)
      const endTime = new Date(`${date}T${endHour.padStart(2, '0')}:00:00`)

      // 2. Create booking with pending payment + number plate
      const cleanedPlate = numberPlate.toUpperCase().replace(/[\s-]/g, '')
      const { data: bookingData, error: bookingError } = await insforge.database
        .from('bookings')
        .insert([{
          user_id: user.id,
          parking_id: id,
          slot_id: selectedSlot,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          total_amount: totalAmount,
          payment_status: 'pending',
          status: 'active',
          number_plate: cleanedPlate,
        }])
        .select()
        .single()

      if (bookingError) {
        // Release lock if booking insert fails
        await insforge.database.rpc('unlock_slot', { slot_uuid: selectedSlot, user_uuid: user.id })
        throw new Error(bookingError.message)
      }

      // 3. Redirect to Stripe — slot stays soft-locked for 60s
      // If payment succeeds: BookingConfirmation marks it completed + calls book_slot
      // If payment fails/cancelled: lock auto-expires after 60s
      const session = await createCheckoutSession({
        bookingId: bookingData.id,
        amount: totalAmount,
        parkingTitle: parking.title,
        userEmail: profile?.email || user.email,
      })

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

          {/* Map with all parking spots */}
          {parking.lat && parking.lng && (
            <div>
              <h3 className="font-semibold mb-3">Location & Nearby Spots</h3>
              <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm" style={{ height: 300 }}>
                <MapContainer
                  center={[parking.lat, parking.lng]}
                  zoom={14}
                  style={{ width: '100%', height: '100%' }}
                  zoomControl={false}
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                  />
                  {nearbySpots.map((spot) => (
                    <Marker
                      key={spot.id}
                      position={[spot.lat, spot.lng]}
                      icon={createPriceIcon(spot.price_per_hour, spot.id === id)}
                      eventHandlers={{
                        mouseover: (e) => e.target.openPopup(),
                      }}
                    >
                      <Popup>
                        <div className="min-w-[170px] p-1">
                          <h4 className="font-bold text-sm">{spot.title}</h4>
                          <p className="text-xs text-gray-500 mt-0.5">{spot.address}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="font-bold text-sm">₹{spot.price_per_hour}/hr</span>
                            <span className="text-xs text-gray-400">{spot.available_slots} left</span>
                          </div>
                          {spot.id !== id && (
                            <button
                              onClick={() => navigate(`/parking/${spot.id}`)}
                              className="mt-2 w-full bg-black text-white text-xs py-1.5 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
                            >
                              View Details
                            </button>
                          )}
                          {spot.id === id && (
                            <p className="mt-2 text-center text-[10px] text-gray-400 font-medium">You are here</p>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
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
              {/* 1. Date & Time selection first */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => { setDate(e.target.value); setSelectedSlot(null); setSelectedSlotData(null) }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                  <select
                    value={startHour}
                    onChange={(e) => { setStartHour(e.target.value); setSelectedSlot(null); setSelectedSlotData(null) }}
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
                    onChange={(e) => { setEndHour(e.target.value); setSelectedSlot(null); setSelectedSlotData(null) }}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    {hours.map((h) => (
                      <option key={h} value={h}>{h.toString().padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border-t my-2" />

              {/* 2. Slot selection — date-aware */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Choose your spot</label>
                {duration <= 0 ? (
                  <div className="text-center py-6 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-400">Select a valid time range to see available slots</p>
                  </div>
                ) : (
                  <SlotPicker
                    parkingId={id}
                    selectedSlotId={selectedSlot}
                    date={date}
                    startHour={startHour}
                    endHour={endHour}
                    onSlotSelect={(slotId, slotData) => {
                      setSelectedSlot(slotId)
                      setSelectedSlotData(slotData)
                    }}
                  />
                )}
                {selectedSlotData && (
                  <p className="text-xs text-center mt-2 font-medium">
                    Selected: <span className="bg-black text-white px-2 py-0.5 rounded">{selectedSlotData.slot_label}</span>
                  </p>
                )}
              </div>

              {/* 3. Vehicle number plate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Number Plate
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={numberPlate}
                    onChange={handlePlateChange}
                    onBlur={() => setPlateError(validatePlate(numberPlate))}
                    placeholder="e.g. PB10AB1234"
                    maxLength={15}
                    className={`w-full pl-9 pr-4 py-2.5 border rounded-md text-sm font-mono uppercase tracking-wider focus:outline-none focus:ring-2 ${
                      plateError
                        ? 'border-red-300 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-black'
                    }`}
                  />
                </div>
                {plateError && (
                  <p className="text-xs text-red-500 mt-1">{plateError}</p>
                )}
                <p className="text-[10px] text-gray-400 mt-1">Indian format: SS00SS0000</p>
              </div>

              {/* 4. Pricing summary */}
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
                disabled={duration <= 0 || !selectedSlot || !numberPlate.trim() || !!plateError}
                onClick={handleBooking}
              >
                {`Pay ₹${totalAmount}`}
              </Button>

              {duration <= 0 && (
                <p className="text-xs text-red-500 text-center">Select valid time range</p>
              )}
              {duration > 0 && !selectedSlot && (
                <p className="text-xs text-gray-500 text-center">Select a parking slot to continue</p>
              )}
              {duration > 0 && selectedSlot && !numberPlate.trim() && (
                <p className="text-xs text-gray-500 text-center">Enter your vehicle number plate</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
