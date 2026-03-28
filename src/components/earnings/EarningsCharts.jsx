import { useMemo, useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

const COLORS = ['#000000', '#6b7280', '#d1d5db', '#9ca3af', '#374151', '#e5e7eb']

export default function EarningsCharts({ bookings, properties, loading }) {
  const [timeRange, setTimeRange] = useState('month')

  // Filter bookings by time range
  const filteredBookings = useMemo(() => {
    const completed = bookings.filter((b) => b.payment_status === 'completed')
    if (timeRange === 'all') return completed
    const now = new Date()
    const cutoff = new Date()
    if (timeRange === 'today') cutoff.setHours(0, 0, 0, 0)
    else if (timeRange === 'week') cutoff.setDate(now.getDate() - 7)
    else if (timeRange === 'month') cutoff.setMonth(now.getMonth() - 1)
    return completed.filter((b) => new Date(b.start_time) >= cutoff)
  }, [bookings, timeRange])

  // 1. Line chart: daily earnings
  const dailyData = useMemo(() => {
    const dayMap = {}
    filteredBookings.forEach((b) => {
      const day = new Date(b.start_time).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
      dayMap[day] = (dayMap[day] || 0) + Number(b.total_amount || 0)
    })
    return Object.entries(dayMap)
      .map(([date, earnings]) => ({ date, earnings }))
      .reverse()
      .slice(-30)
  }, [filteredBookings])

  // 2. Bar chart: earnings per property
  const propertyData = useMemo(() => {
    const map = {}
    filteredBookings.forEach((b) => {
      map[b.parking_id] = (map[b.parking_id] || 0) + Number(b.total_amount || 0)
    })
    return properties
      .map((p) => ({
        name: p.title.length > 15 ? p.title.slice(0, 15) + '…' : p.title,
        earnings: map[p.id] || 0,
      }))
      .filter((p) => p.earnings > 0)
      .sort((a, b) => b.earnings - a.earnings)
      .slice(0, 8)
  }, [filteredBookings, properties])

  // 3. Pie chart: hourly distribution (slot usage by time of day)
  const slotData = useMemo(() => {
    const buckets = { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 }
    filteredBookings.forEach((b) => {
      const hour = new Date(b.start_time).getHours()
      if (hour >= 5 && hour < 12) buckets.Morning++
      else if (hour >= 12 && hour < 17) buckets.Afternoon++
      else if (hour >= 17 && hour < 21) buckets.Evening++
      else buckets.Night++
    })
    return Object.entries(buckets)
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.value > 0)
  }, [filteredBookings])

  if (loading) {
    return (
      <div className="grid lg:grid-cols-2 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={`border border-gray-100 rounded-xl p-6 animate-pulse ${i === 0 ? 'lg:col-span-2' : ''}`}>
            <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
            <div className="h-52 bg-gray-100 rounded-lg" />
          </div>
        ))}
      </div>
    )
  }

  const hasData = filteredBookings.length > 0

  return (
    <div>
      {/* Date filter */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold">Analytics</h3>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {[
            { key: 'today', label: 'Today' },
            { key: 'week', label: 'Week' },
            { key: 'month', label: 'Month' },
            { key: 'all', label: 'All' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setTimeRange(f.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                timeRange === f.key ? 'bg-black text-white' : 'text-gray-500 hover:text-black'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <div className="border border-gray-100 rounded-xl p-12 text-center">
          <p className="text-gray-400 text-sm">No booking data for this time range</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Line Chart - Earnings Over Time */}
          {dailyData.length > 1 && (
            <div className="lg:col-span-2 border border-gray-100 rounded-xl p-5">
              <h4 className="text-sm font-semibold mb-4 text-gray-700">Earnings Over Time</h4>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
                    formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, 'Earnings']}
                  />
                  <Line type="monotone" dataKey="earnings" stroke="#000" strokeWidth={2.5} dot={{ r: 3, fill: '#000' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Bar Chart - Per Property */}
          {propertyData.length > 0 && (
            <div className="border border-gray-100 rounded-xl p-5">
              <h4 className="text-sm font-semibold mb-4 text-gray-700">Earnings by Property</h4>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={propertyData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} width={100} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
                    formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, 'Earnings']}
                  />
                  <Bar dataKey="earnings" fill="#000" radius={[0, 6, 6, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Pie Chart - Slot Usage */}
          {slotData.length > 0 && (
            <div className="border border-gray-100 rounded-xl p-5">
              <h4 className="text-sm font-semibold mb-4 text-gray-700">Booking Time Distribution</h4>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={slotData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    dataKey="value"
                    paddingAngle={3}
                    stroke="none"
                  >
                    {slotData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
                    formatter={(v, name) => [`${v} booking${v !== 1 ? 's' : ''}`, name]}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
