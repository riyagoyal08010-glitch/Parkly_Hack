import { Badge } from '../ui/Badge'
import { Receipt } from 'lucide-react'

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3"><div className="h-3 w-24 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3"><div className="h-3 w-20 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3"><div className="h-3 w-16 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3"><div className="h-3 w-20 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3"><div className="h-5 w-16 bg-gray-200 rounded-full" /></td>
    </tr>
  )
}

export default function TransactionsTable({ bookings, properties, loading }) {
  const propertyMap = {}
  properties.forEach((p) => { propertyMap[p.id] = p.title })

  // Last 10 completed bookings, sorted by date desc
  const recent = [...bookings]
    .filter((b) => b.payment_status === 'completed')
    .sort((a, b) => new Date(b.start_time) - new Date(a.start_time))
    .slice(0, 10)

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })

  if (loading) {
    return (
      <div className="border border-gray-100 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-3 font-medium">Property</th>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
          </tbody>
        </table>
      </div>
    )
  }

  if (recent.length === 0) {
    return (
      <div className="border border-gray-100 rounded-xl p-10 text-center">
        <Receipt className="w-10 h-10 text-gray-200 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No transactions yet</p>
        <p className="text-xs text-gray-400 mt-1">Completed bookings will appear here</p>
      </div>
    )
  }

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-3 font-medium">Property</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {recent.map((b) => (
              <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3">
                  <span className="font-medium text-gray-800 truncate block max-w-[180px]">
                    {propertyMap[b.parking_id] || 'Unknown'}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold text-emerald-600">
                  ₹{Number(b.total_amount).toLocaleString('en-IN')}
                </td>
                <td className="px-4 py-3 text-gray-500">{formatDate(b.start_time)}</td>
                <td className="px-4 py-3">
                  <Badge status={b.payment_status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
