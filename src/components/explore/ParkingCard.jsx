import { useState, forwardRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Car, Shield, Zap, Camera, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import StarRating from '../StarRating'
import SlotPreview from './SlotPreview'

const AMENITY_ICONS = {
  'CCTV': Camera,
  'EV Charging': Zap,
  '24/7 Access': Clock,
  'Security Guard': Shield,
}

function getAvailabilityStyle(available, total) {
  if (!total || available === 0) return { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100', label: 'Full' }
  const ratio = available / total
  if (ratio <= 0.25) return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', label: `${available} left` }
  return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', label: `${available} left` }
}

const ParkingCard = forwardRef(function ParkingCard({ parking, rating, isHighlighted, onClick }, ref) {
  const navigate = useNavigate()
  const [showSlots, setShowSlots] = useState(false)

  const avail = getAvailabilityStyle(parking.available_slots, parking.total_slots)
  const amenities = parking.amenities || []

  return (
    <div
      ref={ref}
      className={`group rounded-2xl border overflow-hidden transition-all duration-300 cursor-pointer bg-white
        ${isHighlighted
          ? 'border-black shadow-[0_8px_30px_rgba(0,0,0,0.12)] scale-[1.02] ring-1 ring-black/5'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]'
        }`}
      onClick={onClick}
    >
      {/* Image section */}
      {parking.photos && parking.photos.length > 0 ? (
        <div className="relative h-40 overflow-hidden">
          <img
            src={parking.photos[0]?.url || parking.photos[0]}
            alt={parking.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

          {/* Price badge */}
          <div className="absolute top-3 left-3">
            <span className="bg-white text-black text-sm font-bold px-3 py-1.5 rounded-xl shadow-lg">
              ₹{parking.price_per_hour}<span className="text-xs font-normal text-gray-500">/hr</span>
            </span>
          </div>

          {/* Availability badge */}
          <div className="absolute top-3 right-3">
            <span className={`${avail.bg} ${avail.text} ${avail.border} border text-[11px] font-semibold px-2.5 py-1 rounded-lg backdrop-blur-sm`}>
              {avail.label}
            </span>
          </div>

          {/* Bottom info */}
          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="font-bold text-white text-sm leading-tight drop-shadow-lg truncate">{parking.title}</h3>
          </div>
        </div>
      ) : (
        <div className="relative h-28 bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
          <Car className="w-10 h-10 text-gray-200" />
          <div className="absolute top-3 left-3">
            <span className="bg-white text-black text-sm font-bold px-3 py-1.5 rounded-xl shadow-sm">
              ₹{parking.price_per_hour}<span className="text-xs font-normal text-gray-500">/hr</span>
            </span>
          </div>
          <div className="absolute top-3 right-3">
            <span className={`${avail.bg} ${avail.text} ${avail.border} border text-[11px] font-semibold px-2.5 py-1 rounded-lg`}>
              {avail.label}
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {/* Title (shown if no image above) */}
        {(!parking.photos || parking.photos.length === 0) && (
          <h3 className="font-bold text-sm leading-tight mb-1.5 text-gray-900">{parking.title}</h3>
        )}

        {/* Address */}
        <div className="flex items-start gap-1.5 text-gray-400">
          <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span className="text-xs leading-relaxed line-clamp-2">{parking.address}</span>
        </div>

        {/* Amenity chips */}
        {amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {amenities.slice(0, 4).map((a) => {
              const Icon = AMENITY_ICONS[a] || Shield
              return (
                <span key={a} className="flex items-center gap-1 text-[10px] px-2 py-1 bg-gray-50 rounded-lg text-gray-500 font-medium border border-gray-100">
                  <Icon className="w-3 h-3" />
                  {a}
                </span>
              )
            })}
            {amenities.length > 4 && (
              <span className="text-[10px] px-2 py-1 bg-gray-50 rounded-lg text-gray-400 border border-gray-100">
                +{amenities.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Rating + slots */}
        <div className="flex items-center justify-between mt-3">
          {rating ? (
            <StarRating rating={rating.avg_rating} count={rating.review_count} size="sm" />
          ) : (
            <span className="text-[11px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded">New</span>
          )}
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Car className="w-3.5 h-3.5" />
            {parking.available_slots}/{parking.total_slots}
          </div>
        </div>

        {/* Slot preview toggle */}
        <button
          className="w-full mt-3 flex items-center justify-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors py-1"
          onClick={(e) => {
            e.stopPropagation()
            setShowSlots(!showSlots)
          }}
        >
          {showSlots ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {showSlots ? 'Hide slots' : 'Preview slots'}
        </button>

        {/* Slot preview grid */}
        {showSlots && (
          <div className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-100 animate-in slide-in-from-top-1">
            <SlotPreview
              parkingId={parking.id}
              totalSlots={parking.total_slots}
              availableSlots={parking.available_slots}
            />
          </div>
        )}

        {/* Book button */}
        <button
          className="w-full mt-3 py-2.5 bg-black text-white text-xs font-semibold rounded-xl hover:bg-gray-800 transition-all hover:shadow-md active:scale-[0.98]"
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/parking/${parking.id}`)
          }}
        >
          Book Now
        </button>
      </div>
    </div>
  )
})

export default ParkingCard
