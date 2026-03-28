import { useState, useEffect, useRef, useCallback } from 'react'
import { insforge } from '../lib/insforge'
import { useAuth } from '../contexts/AuthContext'
import { Car, AlertCircle } from 'lucide-react'

const STATUS_STYLES = {
  available: 'bg-white border-gray-300 hover:border-black hover:bg-gray-50 cursor-pointer',
  selected: 'bg-black border-black text-white cursor-pointer shadow-lg ring-2 ring-black/20',
  locked: 'bg-yellow-50 border-yellow-300 cursor-not-allowed',
  booked: 'bg-gray-200 border-gray-300 cursor-not-allowed opacity-60',
}

const ICON_COLOR = {
  available: 'text-gray-400',
  selected: 'text-white',
  locked: 'text-yellow-400',
  booked: 'text-gray-400',
}

const TEXT_COLOR = {
  available: 'text-gray-500',
  selected: 'text-white',
  locked: 'text-yellow-600',
  booked: 'text-gray-400',
}

export default function SlotPicker({ parkingId, onSlotSelect, selectedSlotId, date, startHour, endHour }) {
  const { user } = useAuth()
  const [slots, setSlots] = useState([])
  const [bookingsForDate, setBookingsForDate] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const pollRef = useRef(null)

  const fetchSlots = useCallback(async () => {
    try {
      const { data: slotData } = await insforge.database
        .from('parking_slots')
        .select('*')
        .eq('parking_id', parkingId)
        .order('row_label', { ascending: true })
        .order('col_number', { ascending: true })

      if (slotData) setSlots(slotData)

      // Fetch bookings for the selected date to determine availability
      if (date) {
        const dayStart = `${date}T00:00:00`
        const dayEnd = `${date}T23:59:59`

        const { data: bookingData } = await insforge.database
          .from('bookings')
          .select('id, parking_id, slot_id, start_time, end_time, status, payment_status, user_id')
          .eq('parking_id', parkingId)
          .gte('start_time', dayStart)
          .lte('start_time', dayEnd)
          .in('payment_status', ['completed', 'pending'])
          .neq('status', 'cancelled')

        setBookingsForDate(bookingData || [])
      } else {
        setBookingsForDate([])
      }

      setLoading(false)
    } catch (err) {
      setLoading(false)
    }
  }, [parkingId, date])

  useEffect(() => {
    setLoading(true)
    fetchSlots()
    pollRef.current = setInterval(fetchSlots, 3000)
    return () => clearInterval(pollRef.current)
  }, [fetchSlots])

  // Determine slot status for the selected date+time
  const getSlotStatus = (slot) => {
    const startInt = parseInt(startHour)
    const endInt = parseInt(endHour)

    // Check overlapping bookings for this slot on selected date+time
    const overlapping = bookingsForDate.filter((b) => {
      if (b.slot_id !== slot.id) return false
      const bStart = new Date(b.start_time).getHours()
      const bEnd = new Date(b.end_time).getHours()
      return bStart < endInt && bEnd > startInt
    })

    const hasCompleted = overlapping.some((b) => b.payment_status === 'completed')
    if (hasCompleted) return 'booked'

    const hasPending = overlapping.find((b) => b.payment_status === 'pending')
    if (hasPending && hasPending.user_id !== user.id) return 'locked'

    // Check physical slot lock (with expiry)
    if (slot.status === 'locked' && slot.locked_by !== user.id) {
      if (slot.locked_until && new Date(slot.locked_until) < new Date()) return 'available'
      return 'locked'
    }

    return 'available'
  }

  const handleSlotClick = (slot) => {
    const status = getSlotStatus(slot)
    if (status === 'booked' || status === 'locked') return

    setError(null)

    // Toggle: click same slot to deselect
    if (selectedSlotId === slot.id) {
      onSlotSelect(null, null)
    } else {
      onSlotSelect(slot.id, slot)
    }
  }

  // Group by rows
  const rows = {}
  slots.forEach((slot) => {
    if (!rows[slot.row_label]) rows[slot.row_label] = []
    rows[slot.row_label].push(slot)
  })
  const rowEntries = Object.entries(rows)
  const maxCols = Math.max(...rowEntries.map(([, r]) => r.length), 0)

  // Counts
  const statusCounts = { available: 0, booked: 0, locked: 0 }
  slots.forEach((slot) => {
    const s = getSlotStatus(slot)
    if (s === 'available') statusCounts.available++
    else if (s === 'booked') statusCounts.booked++
    else if (s === 'locked') statusCounts.locked++
  })

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
      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 text-red-600 rounded-xl mb-3 text-xs">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">×</button>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-3 text-xs">
        {[
          { color: 'bg-white border border-gray-300', label: 'Available', count: statusCounts.available },
          { color: 'bg-black', label: 'Your Selection', count: null },
          { color: 'bg-yellow-50 border border-yellow-300', label: 'Locked', count: statusCounts.locked },
          { color: 'bg-gray-200 border border-gray-300 opacity-60', label: 'Booked', count: statusCounts.booked },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-4 h-3 rounded-sm ${l.color}`} />
            <span className="text-gray-500">
              {l.label}{l.count !== null ? ` (${l.count})` : ''}
            </span>
          </div>
        ))}
      </div>

      {/* Date indicator */}
      {date && (
        <div className="text-center mb-2">
          <span className="text-[10px] text-gray-400">
            {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
            {startHour && endHour ? `, ${String(startHour).padStart(2, '0')}:00 – ${String(endHour).padStart(2, '0')}:00` : ''}
          </span>
        </div>
      )}

      {/* Entry gate */}
      <div className="text-center mb-3">
        <span className="text-[10px] uppercase tracking-widest text-gray-400 bg-gray-100 px-4 py-1 rounded-full">
          Entry Gate
        </span>
      </div>

      {/* Dynamic slot grid */}
      <div className="bg-gray-50 rounded-xl p-3 sm:p-4 border border-gray-100 overflow-x-auto">
        <div className="inline-flex flex-col gap-2 min-w-fit mx-auto">
          {rowEntries.map(([rowLabel, rowSlots]) => (
            <div key={rowLabel} className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 w-4 shrink-0 text-right">{rowLabel}</span>
              <div
                className="grid gap-1.5"
                style={{
                  gridTemplateColumns: `repeat(${maxCols}, minmax(38px, 1fr))`,
                }}
              >
                {rowSlots.map((slot) => {
                  const status = getSlotStatus(slot)
                  const isSelected = selectedSlotId === slot.id && status === 'available'
                  const styleKey = isSelected ? 'selected' : status
                  return (
                    <button
                      key={slot.id}
                      onClick={() => handleSlotClick(slot)}
                      disabled={status === 'booked' || status === 'locked'}
                      className={`h-10 rounded-lg border-2 flex flex-col items-center justify-center transition-all duration-200 text-[10px] font-medium ${STATUS_STYLES[styleKey]}`}
                      title={`${slot.slot_label} — ${isSelected ? 'Selected' : status}`}
                    >
                      <Car className={`w-3.5 h-3.5 ${ICON_COLOR[styleKey]}`} />
                      <span className={TEXT_COLOR[styleKey]}>
                        {slot.slot_label}
                      </span>
                    </button>
                  )
                })}
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
