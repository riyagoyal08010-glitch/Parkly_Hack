import { useState, useEffect, useRef } from 'react'
import { insforge } from '../lib/insforge'
import { useAuth } from '../contexts/AuthContext'
import { Car } from 'lucide-react'

const SLOT_COLORS = {
  available: 'bg-white border-gray-300 hover:border-black hover:bg-gray-50 cursor-pointer',
  locked: 'bg-yellow-50 border-yellow-300 cursor-not-allowed',
  locked_mine: 'bg-black border-black text-white cursor-pointer',
  booked: 'bg-gray-200 border-gray-300 cursor-not-allowed opacity-60',
}

export default function SlotPicker({ parkingId, onSlotSelect, selectedSlotId }) {
  const { user } = useAuth()
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [locking, setLocking] = useState(false)
  const pollRef = useRef(null)

  useEffect(() => {
    fetchSlots()
    // Poll every 3 seconds for real-time updates
    pollRef.current = setInterval(fetchSlots, 3000)
    return () => clearInterval(pollRef.current)
  }, [parkingId])

  const fetchSlots = async () => {
    const { data } = await insforge.database
      .from('parking_slots')
      .select('*')
      .eq('parking_id', parkingId)
      .order('row_label', { ascending: true })
      .order('col_number', { ascending: true })
    if (data) {
      setSlots(data)
      setLoading(false)
    }
  }

  const handleSlotClick = async (slot) => {
    if (slot.status === 'booked') return
    if (slot.status === 'locked' && slot.locked_by !== user.id) return
    if (locking) return

    setLocking(true)

    // If clicking on my locked slot -> unlock it
    if (slot.status === 'locked' && slot.locked_by === user.id) {
      await insforge.database.rpc('unlock_slot', { slot_uuid: slot.id, user_uuid: user.id })
      onSlotSelect(null)
      await fetchSlots()
      setLocking(false)
      return
    }

    // Unlock previously selected slot
    if (selectedSlotId && selectedSlotId !== slot.id) {
      await insforge.database.rpc('unlock_slot', { slot_uuid: selectedSlotId, user_uuid: user.id })
    }

    // Lock new slot
    const { data: success } = await insforge.database.rpc('lock_slot', { slot_uuid: slot.id, user_uuid: user.id })
    if (success) {
      onSlotSelect(slot.id, slot)
    }
    await fetchSlots()
    setLocking(false)
  }

  // Group by rows
  const rows = {}
  slots.forEach((slot) => {
    if (!rows[slot.row_label]) rows[slot.row_label] = []
    rows[slot.row_label].push(slot)
  })

  const getSlotStyle = (slot) => {
    if (slot.status === 'booked') return SLOT_COLORS.booked
    if (slot.status === 'locked' && slot.locked_by === user.id) return SLOT_COLORS.locked_mine
    if (slot.status === 'locked') return SLOT_COLORS.locked
    return SLOT_COLORS.available
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
      </div>
    )
  }

  if (slots.length === 0) {
    return <p className="text-sm text-gray-500 text-center py-4">No slots configured for this parking</p>
  }

  return (
    <div>
      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4 text-xs">
        {[
          { color: 'bg-white border border-gray-300', label: 'Available' },
          { color: 'bg-black', label: 'Your Selection' },
          { color: 'bg-yellow-50 border border-yellow-300', label: 'Locked by Others' },
          { color: 'bg-gray-200 border border-gray-300 opacity-60', label: 'Booked' },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-4 h-3 rounded-sm ${l.color}`} />
            <span className="text-gray-500">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Entry indicator */}
      <div className="text-center mb-3">
        <span className="text-[10px] uppercase tracking-widest text-gray-400 bg-gray-100 px-4 py-1 rounded-full">
          Entry Gate
        </span>
      </div>

      {/* Slot grid */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
        <div className="flex flex-col gap-3 items-center">
          {Object.entries(rows).map(([rowLabel, rowSlots]) => (
            <div key={rowLabel} className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 w-5">{rowLabel}</span>
              <div className="flex gap-1.5">
                {rowSlots.map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => handleSlotClick(slot)}
                    disabled={slot.status === 'booked' || (slot.status === 'locked' && slot.locked_by !== user.id) || locking}
                    className={`w-12 h-10 rounded-lg border-2 flex flex-col items-center justify-center transition-all text-[10px] font-medium ${getSlotStyle(slot)}`}
                    title={`${slot.slot_label} - ${slot.status}`}
                  >
                    <Car className={`w-3.5 h-3.5 ${slot.status === 'locked' && slot.locked_by === user.id ? 'text-white' : 'text-gray-400'}`} />
                    <span className={slot.status === 'locked' && slot.locked_by === user.id ? 'text-white' : 'text-gray-500'}>
                      {slot.slot_label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Road */}
      <div className="mt-3 border-t-2 border-dashed border-gray-300 pt-2 text-center">
        <span className="text-[10px] uppercase tracking-widest text-gray-400">Road</span>
      </div>
    </div>
  )
}
