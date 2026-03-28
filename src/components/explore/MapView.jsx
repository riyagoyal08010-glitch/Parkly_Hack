import { useEffect, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl, useMapEvents } from 'react-leaflet'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import StarRating from '../StarRating'

// India bounds
const INDIA_BOUNDS = [[6.5, 68.0], [37.5, 97.5]]
const INDIA_CENTER = [20.5937, 78.9629]

function getMarkerColor(available, total) {
  if (!total || available === 0) return { bg: '#ef4444', fg: '#fff', glow: 'rgba(239,68,68,0.3)' }
  const ratio = available / total
  if (ratio <= 0.25) return { bg: '#f59e0b', fg: '#000', glow: 'rgba(245,158,11,0.3)' }
  return { bg: '#10b981', fg: '#fff', glow: 'rgba(16,185,129,0.3)' }
}

function createPriceMarker(price, available, total, isHighlighted = false) {
  const color = getMarkerColor(available, total)
  const scale = isHighlighted ? 'transform:scale(1.25);z-index:1000 !important;' : ''
  const ring = isHighlighted ? `box-shadow:0 0 0 3px ${color.bg}, 0 0 20px ${color.glow}, 0 4px 16px rgba(0,0,0,0.25);` : `box-shadow:0 2px 12px rgba(0,0,0,0.3);`
  const slotsText = available === 0 ? 'Full' : `${available} left`

  return L.divIcon({
    className: 'custom-marker',
    html: `<div class="explore-marker" style="position:relative;display:inline-block;${scale}transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1);cursor:pointer;">
      <div style="background:${color.bg};color:${color.fg};padding:5px 10px;border-radius:12px;font-size:12px;font-weight:700;white-space:nowrap;${ring}display:flex;align-items:center;gap:5px;letter-spacing:-0.01em;">
        <span>₹${price}</span>
        <span style="font-size:9px;font-weight:500;opacity:0.85;border-left:1px solid ${color.fg === '#fff' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'};padding-left:5px;">${slotsText}</span>
      </div>
      <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:6px solid ${color.bg};margin:-1px auto 0;filter:drop-shadow(0 2px 2px rgba(0,0,0,0.15));"></div>
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [45, 48],
    popupAnchor: [0, -48],
  })
}

function FlyTo({ center, zoom }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.flyTo(center, zoom || 14, { duration: 1.2 })
  }, [center, zoom, map])
  return null
}

export default function MapView({
  parkings,
  ratings,
  highlightedId,
  setHighlightedId,
  flyTarget,
  flyZoom,
  mobileView,
}) {
  const navigate = useNavigate()

  return (
    <div className={`
      flex-1 relative z-0
      ${mobileView === 'list' ? 'hidden md:block' : 'block'}
    `}>
      <MapContainer
        center={INDIA_CENTER}
        zoom={5}
        minZoom={5}
        maxBounds={INDIA_BOUNDS}
        maxBoundsViscosity={1.0}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
      >
        <ZoomControl position="bottomright" />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {flyTarget && <FlyTo center={flyTarget} zoom={flyZoom} />}

        {parkings.map((parking) => (
          <Marker
            key={parking.id}
            position={[parking.lat, parking.lng]}
            icon={createPriceMarker(
              parking.price_per_hour,
              parking.available_slots,
              parking.total_slots,
              highlightedId === parking.id
            )}
            eventHandlers={{
              click: () => setHighlightedId(parking.id),
              mouseover: (e) => e.target.openPopup(),
            }}
          >
            <Popup>
              <div className="min-w-[220px] p-1">
                {parking.photos && parking.photos.length > 0 && (
                  <img
                    src={parking.photos[0]?.url || parking.photos[0]}
                    alt={parking.title}
                    className="w-full h-28 object-cover rounded-lg mb-2"
                  />
                )}
                <h3 className="font-bold text-sm">{parking.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{parking.address}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-bold text-sm">₹{parking.price_per_hour}/hr</span>
                  <span className={`text-xs font-medium ${
                    parking.available_slots === 0 ? 'text-red-500' :
                    parking.available_slots <= 3 ? 'text-amber-500' : 'text-emerald-500'
                  }`}>
                    {parking.available_slots === 0 ? 'Full' : `${parking.available_slots} left`}
                  </span>
                </div>
                {ratings[parking.id] && (
                  <div className="mt-1.5">
                    <StarRating rating={ratings[parking.id].avg_rating} count={ratings[parking.id].review_count} size="sm" />
                  </div>
                )}
                <button
                  onClick={() => navigate(`/parking/${parking.id}`)}
                  className="mt-2 w-full bg-black text-white text-xs py-2.5 rounded-xl font-semibold hover:bg-gray-800 transition-all active:scale-[0.98]"
                >
                  View Details
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}

export { INDIA_BOUNDS, INDIA_CENTER }
