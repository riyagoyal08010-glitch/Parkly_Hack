import { Star, Eye, EyeOff, Flag, Trash2, MapPin } from 'lucide-react'
import { Badge } from './ui/Badge'

export default function ReviewCard({ review, showParking = false, showUser = true, showModeration = false, onModerate }) {
  const stars = Array.from({ length: 5 }, (_, i) => i + 1)
  const date = new Date(review.created_at).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric'
  })

  return (
    <div className={`p-4 rounded-xl border transition-all ${
      review.status === 'hidden' ? 'border-gray-200 bg-gray-50 opacity-60' :
      review.status === 'flagged' ? 'border-yellow-200 bg-yellow-50/30' :
      'border-gray-100 hover:border-gray-200'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Avatar */}
          <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
            {(review.profiles?.name || review.reviewer_name || '?')[0].toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            {/* Name + Rating */}
            <div className="flex items-center gap-2 flex-wrap">
              {showUser && (
                <span className="font-semibold text-sm">
                  {review.profiles?.name || review.reviewer_name || 'User'}
                </span>
              )}
              <div className="flex items-center gap-0.5">
                {stars.map((s) => (
                  <Star
                    key={s}
                    className={`w-3.5 h-3.5 ${s <= review.rating ? 'fill-black text-black' : 'text-gray-200'}`}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-400">{date}</span>
            </div>

            {/* Parking name */}
            {showParking && review.parking_locations && (
              <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-400">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{review.parking_locations.title}</span>
              </div>
            )}

            {/* Comment */}
            {review.comment && (
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">{review.comment}</p>
            )}

            {/* Moderation badge */}
            {showModeration && review.status !== 'visible' && (
              <div className="mt-2">
                <Badge status={review.status} />
              </div>
            )}
          </div>
        </div>

        {/* Moderation actions */}
        {showModeration && onModerate && (
          <div className="flex items-center gap-1 shrink-0">
            {review.status === 'visible' && (
              <>
                <button
                  onClick={() => onModerate(review.id, 'flagged')}
                  className="p-1.5 text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 rounded-lg transition-colors"
                  title="Flag review"
                >
                  <Flag className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onModerate(review.id, 'hidden')}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Hide review"
                >
                  <EyeOff className="w-4 h-4" />
                </button>
              </>
            )}
            {review.status === 'hidden' && (
              <button
                onClick={() => onModerate(review.id, 'visible')}
                className="p-1.5 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                title="Restore review"
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
            {review.status === 'flagged' && (
              <>
                <button
                  onClick={() => onModerate(review.id, 'visible')}
                  className="p-1.5 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                  title="Approve"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onModerate(review.id, 'hidden')}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Hide"
                >
                  <EyeOff className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
