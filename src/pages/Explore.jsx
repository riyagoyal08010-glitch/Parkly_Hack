import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Map, List } from 'lucide-react'
import { insforge } from '../lib/insforge'
import SearchBar from '../components/explore/SearchBar'
import MapView from '../components/explore/MapView'
import ListingPanel from '../components/explore/ListingPanel'

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
  const [ratings, setRatings] = useState({})
  const [mobileView, setMobileView] = useState('map') // 'map' or 'list'

  useEffect(() => {
    fetchParkings()
    locateUser()
  }, [])

  const locateUser = () => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        if (latitude >= 6.5 && latitude <= 37.5 && longitude >= 68.0 && longitude <= 97.5) {
          setFlyTarget([latitude, longitude])
          setFlyZoom(13)
        }
      },
      () => {}
    )
  }

  const fetchParkings = async () => {
    const { data, error } = await insforge.database
      .from('parking_locations')
      .select('*')
      .eq('status', 'approved')
    if (!error) {
      setParkings(data || [])
      fetchRatings(data || [])
    }
    setLoading(false)
  }

  const fetchRatings = async (parkingList) => {
    const ratingMap = {}
    for (const p of parkingList) {
      const { data } = await insforge.database.rpc('get_parking_rating', { p_id: p.id })
      if (data && data.length > 0) ratingMap[p.id] = data[0]
    }
    setRatings(ratingMap)
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

  const activeFilterCount = (priceMax < 500 ? 1 : 0) + selectedAmenities.length

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
        setMobileView('map')
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

  const handleMarkerClick = (id) => {
    setHighlightedId(id)
    // ListingPanel auto-scrolls to highlighted card via useEffect
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col relative">
      {/* Search bar - floating on top */}
      <div className="absolute top-4 left-4 right-4 md:right-auto md:w-[480px] lg:w-[540px] z-[1000]">
        <SearchBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSearch={handleSearch}
          searching={searching}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          priceMax={priceMax}
          setPriceMax={setPriceMax}
          selectedAmenities={selectedAmenities}
          toggleAmenity={toggleAmenity}
          clearFilters={() => { setSelectedAmenities([]); setPriceMax(500) }}
          onLocateMe={locateUser}
          activeFilterCount={activeFilterCount}
        />
      </div>

      {/* Mobile view toggle - fixed bottom */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[1000]">
        <button
          onClick={() => setMobileView(mobileView === 'map' ? 'list' : 'map')}
          className="flex items-center gap-2 px-5 py-3 bg-black text-white rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.3)] font-medium text-sm hover:bg-gray-800 transition-all active:scale-95"
        >
          {mobileView === 'map' ? (
            <><List className="w-4 h-4" /> Show List</>
          ) : (
            <><Map className="w-4 h-4" /> Show Map</>
          )}
        </button>
      </div>

      {/* Main content: Map + Listings */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Map (60%) */}
        <MapView
          parkings={filteredParkings}
          ratings={ratings}
          highlightedId={highlightedId}
          setHighlightedId={handleMarkerClick}
          flyTarget={flyTarget}
          flyZoom={flyZoom}
          mobileView={mobileView}
        />

        {/* Listings panel (40%) */}
        <ListingPanel
          parkings={filteredParkings}
          ratings={ratings}
          loading={loading}
          highlightedId={highlightedId}
          onCardClick={handleCardClick}
          mobileView={mobileView}
          setMobileView={setMobileView}
        />
      </div>

    </div>
  )
}
