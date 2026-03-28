import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { insforge } from '../lib/insforge'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Loader } from '../components/ui/Loader'
import { MapPin, Car, Search, SlidersHorizontal, X, Navigation } from 'lucide-react'
import { AMENITIES } from '../lib/constants'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

function createPriceIcon(price, isHighlighted = false) {
  const bg = isHighlighted ? '#ffffff' : 'rgba(255,255,255,0.95)'
  const fg = '#000'
  const shadow = isHighlighted
    ? '0 0 0 2px #fff, 0 4px 20px rgba(255,255,255,0.3)'
    : '0 2px 10px rgba(0,0,0,0.5)'
  const scale = isHighlighted ? 'transform:scale(1.2);' : ''
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="position:relative;display:inline-block;${scale}transition:transform 0.2s;">
      <div style="background:${bg};color:${fg};padding:6px 12px;border-radius:20px;font-size:13px;font-weight:700;white-space:nowrap;box-shadow:${shadow};letter-spacing:-0.02em;">₹${price}</div>
      <div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:7px solid ${bg};margin:-1px auto 0;"></div>
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [35, 48],
  })
}

function FlyTo({ center, zoom }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.flyTo(center, zoom || 14, { duration: 1.5 })
  }, [center, zoom, map])
  return null
}

// India bounds
const INDIA_BOUNDS = [[6.5, 68.0], [37.5, 97.5]]
const INDIA_CENTER = [20.5937, 78.9629]

export default function Explore() {
  const navigate = useNavigate()

  const [parkings, setParkings] = useState([])
  const [loading, setLoading] = useState(true)
  const [flyTarget, setFlyTarget] = useState(null)
  const [flyZoom, setFlyZoom] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [priceMax, setPriceMax] = useState(500)
  const [selectedAmenities, setSelectedAmenities] = useState([])
  const [highlightedId, setHighlightedId] = useState(null)

  useEffect(() => {
    fetchParkings()
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        // Only fly if within India
        if (latitude >= 6.5 && latitude <= 37.5 && longitude >= 68.0 && longitude <= 97.5) {
          setFlyTarget([latitude, longitude])
          setFlyZoom(13)
        }
      },
      () => {}
    )
  }, [])

  const fetchParkings = async () => {
    const { data, error } = await insforge.database
      .from('parking_locations')
      .select('*')
      .eq('status', 'approved')
    if (!error) setParkings(data || [])
    setLoading(false)
  }

  const filteredParkings = parkings.filter((p) => {
    if (p.price_per_hour > priceMax) return false
    if (selectedAmenities.length > 0) {
      const pAmenities = p.amenities || []
      if (!selectedAmenities.every((a) => pAmenities.includes(a))) return false
    }
    return true
  })

  const toggleAmenity = (amenity) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    )
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=in&limit=1`
      )
      const results = await res.json()
      if (results.length > 0) {
        setFlyTarget([parseFloat(results[0].lat), parseFloat(results[0].lon)])
        setFlyZoom(14)
      }
    } catch (err) {
      console.error('Search failed:', err)
    } finally {
      setSearching(false)
    }
  }

  const handleCardClick = (parking) => {
    setHighlightedId(parking.id)
    setFlyTarget([parking.lat, parking.lng])
    setFlyZoom(16)
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col md:flex-row">
      {/* Search bar - glassmorphism */}
      <div className="absolute top-20 left-4 right-4 md:left-4 md:right-auto md:w-[420px] z-[1000]">
        <div className="backdrop-blur-xl bg-black/80 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.4)] border border-white/10 p-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search any city in India..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20 placeholder:text-gray-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="px-4 bg-white text-black rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {searching ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Navigation className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 rounded-xl border transition-all ${
                showFilters
                  ? 'bg-white text-black border-white'
                  : 'bg-white/10 border-white/10 hover:bg-white/20 text-gray-400'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </form>

          {/* Filters */}
          {showFilters && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Filters</h4>
                {(selectedAmenities.length > 0 || priceMax < 500) && (
                  <button
                    onClick={() => { setSelectedAmenities([]); setPriceMax(500) }}
                    className="text-xs text-gray-500 hover:text-white"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-gray-500">Max price per hour</label>
                  <span className="text-xs font-bold text-white">₹{priceMax}</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="500"
                  step="10"
                  value={priceMax}
                  onChange={(e) => setPriceMax(Number(e.target.value))}
                  className="w-full h-1.5 accent-white cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
                  <span>₹10</span>
                  <span>₹500</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-2 block">Amenities</label>
                <div className="flex flex-wrap gap-1.5">
                  {AMENITIES.map((a) => (
                    <button
                      key={a}
                      onClick={() => toggleAmenity(a)}
                      className={`px-2.5 py-1 text-[11px] rounded-lg border transition-all ${
                        selectedAmenities.includes(a)
                          ? 'bg-white text-black border-white'
                          : 'border-white/20 text-gray-400 hover:border-white/40'
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Map - restricted to India */}
      <div className="flex-1 relative z-0">
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
          {filteredParkings.map((parking) => (
            <Marker
              key={parking.id}
              position={[parking.lat, parking.lng]}
              icon={createPriceIcon(parking.price_per_hour, highlightedId === parking.id)}
              eventHandlers={{
                click: () => setHighlightedId(parking.id),
              }}
            >
              <Popup>
                <div className="min-w-[200px] p-1">
                  {parking.photos && parking.photos.length > 0 && (
                    <img
                      src={parking.photos[0]?.url || parking.photos[0]}
                      alt={parking.title}
                      className="w-full h-24 object-cover rounded-lg mb-2"
                    />
                  )}
                  <h3 className="font-bold text-sm">{parking.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{parking.address}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-bold text-sm">₹{parking.price_per_hour}/hr</span>
                    <span className="text-xs text-gray-500">{parking.available_slots} left</span>
                  </div>
                  <button
                    onClick={() => navigate(`/parking/${parking.id}`)}
                    className="mt-2 w-full bg-black text-white text-xs py-2 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Side panel */}
      <div className="w-full md:w-[400px] border-l border-gray-100 overflow-y-auto bg-white">
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold">Nearby Parking</h2>
              <p className="text-xs text-gray-400 mt-0.5">{filteredParkings.length} spots available</p>
            </div>
          </div>

          {loading ? (
            <Loader />
          ) : filteredParkings.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Car className="w-8 h-8 text-gray-300" />
              </div>
              <p className="font-medium text-gray-900">No spots found</p>
              <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or search in a different area</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredParkings.map((parking) => (
                <div
                  key={parking.id}
                  className={`group rounded-xl border overflow-hidden transition-all duration-200 cursor-pointer ${
                    highlightedId === parking.id
                      ? 'border-black shadow-lg scale-[1.01]'
                      : 'border-gray-100 hover:border-gray-300 hover:shadow-md'
                  }`}
                  onClick={() => handleCardClick(parking)}
                >
                  {/* Image with gradient overlay */}
                  {parking.photos && parking.photos.length > 0 ? (
                    <div className="relative h-36 overflow-hidden">
                      <img
                        src={parking.photos[0]?.url || parking.photos[0]}
                        alt={parking.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute bottom-3 left-3">
                        <span className="bg-white text-black text-xs font-bold px-2.5 py-1 rounded-lg">
                          ₹{parking.price_per_hour}/hr
                        </span>
                      </div>
                      <div className="absolute bottom-3 right-3">
                        <span className="bg-black/70 text-white text-[10px] font-medium px-2 py-1 rounded-lg backdrop-blur-sm">
                          {parking.available_slots} left
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-24 bg-gray-100 flex items-center justify-center">
                      <Car className="w-8 h-8 text-gray-300" />
                    </div>
                  )}

                  <div className="p-3.5">
                    <h3 className="font-semibold text-sm leading-tight">{parking.title}</h3>
                    <div className="flex items-center gap-1 mt-1.5 text-gray-400">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="text-xs truncate">{parking.address}</span>
                    </div>

                    {parking.amenities && parking.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {parking.amenities.slice(0, 3).map((a) => (
                          <span key={a} className="text-[10px] px-2 py-0.5 bg-gray-50 rounded-md text-gray-500 font-medium">
                            {a}
                          </span>
                        ))}
                        {parking.amenities.length > 3 && (
                          <span className="text-[10px] px-2 py-0.5 bg-gray-50 rounded-md text-gray-400">
                            +{parking.amenities.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    <button
                      className="w-full mt-3 py-2 bg-black text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/parking/${parking.id}`)
                      }}
                    >
                      Book Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
