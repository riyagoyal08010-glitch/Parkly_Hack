import { createRef, useEffect, useMemo } from 'react'
import { Car, Map, List } from 'lucide-react'
import { Loader } from '../ui/Loader'
import ParkingCard from './ParkingCard'

export default function ListingPanel({
  parkings,
  ratings,
  loading,
  highlightedId,
  onCardClick,
  mobileView,
  setMobileView,
}) {
  // Create refs for each parking card to scroll into view
  const cardRefs = useMemo(() => {
    const refs = {}
    parkings.forEach((p) => { refs[p.id] = createRef() })
    return refs
  }, [parkings])

  // Scroll highlighted card into view when marker is clicked
  useEffect(() => {
    if (highlightedId && cardRefs[highlightedId]?.current) {
      cardRefs[highlightedId].current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [highlightedId, cardRefs])

  return (
    <div className={`
      w-full md:w-[40%] md:min-w-[360px] md:max-w-[480px]
      border-l border-gray-200
      bg-gray-50
      flex flex-col
      ${mobileView === 'map' ? 'hidden md:flex' : 'flex'}
    `}>
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Nearby Parking</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {parkings.length} spot{parkings.length !== 1 ? 's' : ''} found
            </p>
          </div>

          {/* Mobile view toggle */}
          <button
            className="md:hidden p-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
            onClick={() => setMobileView(mobileView === 'list' ? 'map' : 'list')}
          >
            {mobileView === 'list' ? <Map className="w-4 h-4" /> : <List className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Card list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 listing-scroll">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader />
          </div>
        ) : parkings.length === 0 ? (
          <div className="text-center py-20 px-4">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Car className="w-8 h-8 text-gray-300" />
            </div>
            <p className="font-semibold text-gray-900">No spots found</p>
            <p className="text-sm text-gray-400 mt-1.5">Try adjusting your filters or searching another area</p>
          </div>
        ) : (
          parkings.map((parking) => (
            <ParkingCard
              key={parking.id}
              ref={cardRefs[parking.id]}
              parking={parking}
              rating={ratings[parking.id]}
              isHighlighted={highlightedId === parking.id}
              onClick={() => onCardClick(parking)}
            />
          ))
        )}
      </div>
    </div>
  )
}
