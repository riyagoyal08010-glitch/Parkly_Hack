import { MapPin, ChevronRight, TrendingUp } from 'lucide-react'

function SkeletonRow() {
  return (
    <div className="p-4 border border-gray-100 rounded-xl animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gray-200 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 bg-gray-200 rounded" />
          <div className="h-3 w-48 bg-gray-100 rounded" />
        </div>
        <div className="h-6 w-20 bg-gray-200 rounded" />
      </div>
    </div>
  )
}

export default function PropertyList({ properties, bookings, onSelect, loading }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}
      </div>
    )
  }

  if (properties.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <TrendingUp className="w-7 h-7 text-gray-300" />
        </div>
        <p className="font-medium text-gray-900">No properties yet</p>
        <p className="text-sm text-gray-400 mt-1">Add a parking property to start earning</p>
      </div>
    )
  }

  // Calculate per-property stats
  const propertyStats = properties.map((prop) => {
    const propBookings = bookings.filter(
      (b) => b.parking_id === prop.id && b.payment_status === 'completed'
    )
    const totalEarned = propBookings.reduce((s, b) => s + Number(b.total_amount || 0), 0)
    const totalBookingCount = propBookings.length

    // avg earnings per day since first booking
    let avgPerDay = 0
    if (propBookings.length > 0) {
      const dates = propBookings.map((b) => new Date(b.created_at || b.start_time))
      const earliest = new Date(Math.min(...dates))
      const daysDiff = Math.max(1, Math.ceil((Date.now() - earliest) / 86400000))
      avgPerDay = Math.round(totalEarned / daysDiff)
    }

    return { ...prop, totalEarned, totalBookingCount, avgPerDay }
  })

  // Sort by earnings desc
  propertyStats.sort((a, b) => b.totalEarned - a.totalEarned)

  return (
    <div className="space-y-3">
      {propertyStats.map((prop) => (
        <div
          key={prop.id}
          onClick={() => onSelect(prop)}
          className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:border-gray-300 hover:shadow-md transition-all cursor-pointer group"
        >
          {/* Thumbnail */}
          {prop.photos && prop.photos.length > 0 ? (
            <img
              src={prop.photos[0]?.url || prop.photos[0]}
              alt={prop.title}
              className="w-14 h-14 rounded-xl object-cover shrink-0"
            />
          ) : (
            <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-gray-400" />
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate">{prop.title}</h4>
            <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{prop.address}</span>
            </div>
            <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500">
              <span>{prop.totalBookingCount} booking{prop.totalBookingCount !== 1 ? 's' : ''}</span>
              <span>~₹{prop.avgPerDay}/day</span>
            </div>
          </div>

          {/* Earnings */}
          <div className="text-right shrink-0">
            <p className="font-bold text-base">₹{prop.totalEarned.toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">total earned</p>
          </div>

          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-black transition-colors shrink-0" />
        </div>
      ))}
    </div>
  )
}
