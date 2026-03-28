import { useState, useEffect } from 'react'
import { insforge } from '../../lib/insforge'

const TYPE_LABELS = { S: 'Small', M: 'Medium', L: 'Large' }
const TYPE_COLORS = {
  available: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  occupied: 'bg-gray-100 text-gray-400 border-gray-200',
}

export default function SlotPreview({ parkingId, totalSlots, availableSlots }) {
  const [slots, setSlots] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!parkingId) return
    let cancelled = false
    setLoading(true)
    insforge.database
      .from('parking_slots')
      .select('id, slot_label, slot_type, status')
      .eq('parking_id', parkingId)
      .order('slot_label')
      .then(({ data }) => {
        if (!cancelled) {
          setSlots(data || [])
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [parkingId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-3">
        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!slots || slots.length === 0) {
    // Fallback: show a simple grid based on totalSlots/availableSlots
    const total = totalSlots || 0
    const available = availableSlots || 0
    if (total === 0) return null

    const grid = Array.from({ length: Math.min(total, 20) }, (_, i) => ({
      available: i < available,
      label: `${i + 1}`,
    }))

    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Slot Preview</span>
          <span className="text-[10px] text-gray-400">{available}/{total} free</span>
        </div>
        <div className="grid grid-cols-5 gap-1">
          {grid.map((s, i) => (
            <div
              key={i}
              className={`h-6 rounded text-[9px] font-medium flex items-center justify-center border transition-all ${
                s.available ? TYPE_COLORS.available : TYPE_COLORS.occupied
              }`}
            >
              {s.label}
            </div>
          ))}
        </div>
        {total > 20 && (
          <p className="text-[10px] text-gray-400 text-center mt-1">+{total - 20} more</p>
        )}
      </div>
    )
  }

  // Group by type
  const grouped = {}
  for (const s of slots) {
    const type = s.slot_type || 'M'
    if (!grouped[type]) grouped[type] = []
    grouped[type].push(s)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Slot Preview</span>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[10px] text-gray-400">
            <span className="w-2 h-2 rounded-sm bg-emerald-400" /> Free
          </span>
          <span className="flex items-center gap-1 text-[10px] text-gray-400">
            <span className="w-2 h-2 rounded-sm bg-gray-300" /> Taken
          </span>
        </div>
      </div>
      {Object.entries(grouped).map(([type, typeSlots]) => (
        <div key={type} className="mb-2 last:mb-0">
          <p className="text-[10px] text-gray-400 font-medium mb-1">{TYPE_LABELS[type] || type}</p>
          <div className="grid grid-cols-6 gap-1">
            {typeSlots.slice(0, 12).map((s) => {
              const free = s.status === 'available'
              return (
                <div
                  key={s.id}
                  className={`h-6 rounded text-[9px] font-medium flex items-center justify-center border transition-all ${
                    free ? TYPE_COLORS.available : TYPE_COLORS.occupied
                  }`}
                  title={`${s.slot_label} - ${free ? 'Available' : 'Occupied'}`}
                >
                  {s.slot_label}
                </div>
              )
            })}
          </div>
          {typeSlots.length > 12 && (
            <p className="text-[10px] text-gray-400 mt-0.5">+{typeSlots.length - 12} more</p>
          )}
        </div>
      ))}
    </div>
  )
}
