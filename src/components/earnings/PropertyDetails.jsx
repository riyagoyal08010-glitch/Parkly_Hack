import { useState, useMemo } from 'react'
import { ArrowLeft, MapPin, Download, Clock, IndianRupee, Car } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Badge } from '../ui/Badge'

export default function PropertyDetails({ property, bookings, onBack }) {
  const [dateFilter, setDateFilter] = useState('all')

  const propBookings = useMemo(() => {
    let filtered = bookings
      .filter((b) => b.parking_id === property.id && b.payment_status === 'completed')
      .sort((a, b) => new Date(b.start_time) - new Date(a.start_time))

    if (dateFilter !== 'all') {
      const now = new Date()
      const cutoff = new Date()
      if (dateFilter === 'today') cutoff.setHours(0, 0, 0, 0)
      else if (dateFilter === 'week') cutoff.setDate(now.getDate() - 7)
      else if (dateFilter === 'month') cutoff.setMonth(now.getMonth() - 1)
      filtered = filtered.filter((b) => new Date(b.start_time) >= cutoff)
    }

    return filtered
  }, [bookings, property.id, dateFilter])

  const totalEarned = propBookings.reduce((s, b) => s + Number(b.total_amount || 0), 0)

  // Daily earnings chart data
  const chartData = useMemo(() => {
    const dayMap = {}
    propBookings.forEach((b) => {
      const day = new Date(b.start_time).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
      dayMap[day] = (dayMap[day] || 0) + Number(b.total_amount || 0)
    })
    return Object.entries(dayMap)
      .map(([date, amount]) => ({ date, amount }))
      .reverse()
      .slice(-14) // last 14 data points
  }, [propBookings])

  const formatTime = (iso) => {
    const d = new Date(iso)
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (iso) => {
    return new Date(iso).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const exportCSV = () => {
    const headers = ['Date', 'Time Slot', 'Amount', 'Status']
    const rows = propBookings.map((b) => [
      formatDate(b.start_time),
      `${formatTime(b.start_time)} - ${formatTime(b.end_time)}`,
      b.total_amount,
      b.payment_status,
    ])
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${property.title.replace(/\s+/g, '_')}_earnings.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      {/* Header */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-black mb-5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to all properties
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          {property.photos && property.photos.length > 0 ? (
            <img
              src={property.photos[0]?.url || property.photos[0]}
              alt={property.title}
              className="w-16 h-16 rounded-xl object-cover"
            />
          ) : (
            <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center">
              <MapPin className="w-6 h-6 text-gray-400" />
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold">{property.title}</h2>
            <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
              <MapPin className="w-3.5 h-3.5" />
              {property.address}
            </div>
          </div>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <IndianRupee className="w-4 h-4 mx-auto text-gray-400 mb-1" />
          <p className="text-lg font-bold">₹{totalEarned.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Earned</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <Car className="w-4 h-4 mx-auto text-gray-400 mb-1" />
          <p className="text-lg font-bold">{propBookings.length}</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Bookings</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <Clock className="w-4 h-4 mx-auto text-gray-400 mb-1" />
          <p className="text-lg font-bold">₹{propBookings.length > 0 ? Math.round(totalEarned / propBookings.length) : 0}</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Avg / Booking</p>
        </div>
      </div>

      {/* Date filter */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {[
          { key: 'all', label: 'All Time' },
          { key: 'today', label: 'Today' },
          { key: 'week', label: 'This Week' },
          { key: 'month', label: 'This Month' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setDateFilter(f.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              dateFilter === f.key ? 'bg-black text-white' : 'text-gray-500 hover:text-black'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Earnings chart */}
      {chartData.length > 1 && (
        <div className="border border-gray-100 rounded-xl p-5 mb-6">
          <h4 className="text-sm font-semibold mb-4">Earnings Over Time</h4>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
                formatter={(v) => [`₹${v}`, 'Earnings']}
              />
              <Line type="monotone" dataKey="amount" stroke="#000" strokeWidth={2} dot={{ r: 3, fill: '#000' }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Booking history table */}
      <h4 className="text-sm font-semibold mb-3">Booking History</h4>
      {propBookings.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">No bookings found for this filter</div>
      ) : (
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Time Slot</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {propBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-gray-700">{formatDate(b.start_time)}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatTime(b.start_time)} – {formatTime(b.end_time)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-600">₹{Number(b.total_amount).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3">
                      <Badge status={b.payment_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
