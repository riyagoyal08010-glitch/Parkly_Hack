import { Star, Eye, EyeOff, Flag, MapPin } from 'lucide-react'
import { Badge } from './ui/Badge'
import { motion } from 'framer-motion'

export default function ReviewCard({ review, showParking = false, showUser = true, showModeration = false, onModerate }) {
  const stars = Array.from({ length: 5 }, (_, i) => i + 1)
  const date = new Date(review.created_at).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric'
  })

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`p-5 rounded-2xl border transition-all duration-300 hover:shadow-md ${
        review.status === 'hidden' ? 'border-gray-200 bg-gray-50/80 opacity-60' :
        review.status === 'flagged' ? 'border-amber-200/80 bg-amber-50/30' :
        'border-gray-200/80 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          {/* Avatar */}
          <div className="w-10 h-10 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
            {(review.profiles?.name || review.reviewer_name || '?')[0].toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            {/* Name + Rating */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {showUser && (
                <span className="font-semibold text-sm text-gray-900">
                  {review.profiles?.name || review.reviewer_name || 'User'}
                </span>
              )}
              <div className="flex items-center gap-0.5">
                {stars.map((s) => (
                  <Star
                    key={s}
                    className={`w-3.5 h-3.5 transition-colors ${
                      s <= review.rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-200'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-400 font-medium">{date}</span>
            </div>

            {/* Parking name */}
            {showParking && review.parking_locations && (
              <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{review.parking_locations.title}</span>
              </div>
            )}

            {/* Comment */}
            {review.comment && (
              <p className="text-sm text-gray-600 mt-2.5 leading-relaxed">{review.comment}</p>
            )}

            {/* Moderation badge */}
            {showModeration && review.status !== 'visible' && (
              <div className="mt-2.5">
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
                  className="p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                  title="Flag review"
                >
                  <Flag className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onModerate(review.id, 'hidden')}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                  title="Hide review"
                >
                  <EyeOff className="w-4 h-4" />
                </button>
              </>
            )}
            {review.status === 'hidden' && (
              <button
                onClick={() => onModerate(review.id, 'visible')}
                className="p-2 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                title="Restore review"
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
            {review.status === 'flagged' && (
              <>
                <button
                  onClick={() => onModerate(review.id, 'visible')}
                  className="p-2 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                  title="Approve"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onModerate(review.id, 'hidden')}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                  title="Hide"
                >
                  <EyeOff className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}
