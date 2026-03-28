import { Star } from 'lucide-react'

export default function StarRating({ rating, count, size = 'sm', showCount = true }) {
  if (!rating && !count) {
    return (
      <span className={`text-gray-400 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
        New
      </span>
    )
  }

  const starSize = size === 'sm' ? 'w-3.5 h-3.5' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'
  const textSize = size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'

  return (
    <div className="flex items-center gap-1">
      <Star className={`${starSize} fill-black text-black`} />
      <span className={`font-semibold ${textSize}`}>{rating || '0'}</span>
      {showCount && count > 0 && (
        <span className={`text-gray-400 ${textSize}`}>({count})</span>
      )}
    </div>
  )
}
