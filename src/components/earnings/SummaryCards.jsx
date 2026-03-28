import { DollarSign, Calendar, TrendingUp, Car, Building2, IndianRupee } from 'lucide-react'

function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-3 w-20 bg-gray-200 rounded" />
          <div className="h-7 w-28 bg-gray-200 rounded" />
        </div>
        <div className="w-11 h-11 bg-gray-100 rounded-xl" />
      </div>
    </div>
  )
}

export default function SummaryCards({ stats, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  const cards = [
    {
      label: 'Total Earnings',
      value: `₹${stats.totalEarnings.toLocaleString('en-IN')}`,
      icon: IndianRupee,
      color: 'bg-black text-white',
      iconColor: 'bg-white/20 text-white',
      growth: stats.totalGrowth,
    },
    {
      label: "Today's Earnings",
      value: `₹${stats.todayEarnings.toLocaleString('en-IN')}`,
      icon: DollarSign,
      color: 'bg-white',
      iconColor: 'bg-emerald-50 text-emerald-600',
      growth: null,
    },
    {
      label: 'This Week',
      value: `₹${stats.weekEarnings.toLocaleString('en-IN')}`,
      icon: Calendar,
      color: 'bg-white',
      iconColor: 'bg-blue-50 text-blue-600',
      growth: stats.weekGrowth,
    },
    {
      label: 'This Month',
      value: `₹${stats.monthEarnings.toLocaleString('en-IN')}`,
      icon: TrendingUp,
      color: 'bg-white',
      iconColor: 'bg-purple-50 text-purple-600',
      growth: stats.monthGrowth,
    },
    {
      label: 'Total Bookings',
      value: stats.totalBookings,
      icon: Car,
      color: 'bg-white',
      iconColor: 'bg-gray-100 text-gray-600',
      growth: null,
    },
    {
      label: 'Active Properties',
      value: stats.activeProperties,
      icon: Building2,
      color: 'bg-white',
      iconColor: 'bg-gray-100 text-gray-600',
      growth: null,
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`border border-gray-200 rounded-xl p-5 transition-all hover:shadow-md ${card.color}`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className={`text-xs font-medium uppercase tracking-wider ${card.color === 'bg-black text-white' ? 'text-gray-400' : 'text-gray-500'}`}>
                {card.label}
              </p>
              <p className={`text-2xl font-bold mt-1 ${card.color === 'bg-black text-white' ? 'text-white' : ''}`}>
                {card.value}
              </p>
              {card.growth !== null && card.growth !== undefined && (
                <p className={`text-xs font-medium mt-1.5 ${card.growth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {card.growth >= 0 ? '↑' : '↓'} {Math.abs(card.growth)}% vs last period
                </p>
              )}
            </div>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${card.iconColor}`}>
              <card.icon className="w-5 h-5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
