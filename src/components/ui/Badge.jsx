export function Badge({ status, className = '' }) {
  const styles = {
    pending: 'bg-amber-50 text-amber-700 border border-amber-200/80',
    approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
    rejected: 'bg-red-50 text-red-700 border border-red-200/80',
    active: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
    completed: 'bg-gray-100 text-gray-600 border border-gray-200/80',
    cancelled: 'bg-gray-50 text-gray-600 border border-gray-200/80',
    failed: 'bg-red-50 text-red-600 border border-red-200/80',
    visible: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
    flagged: 'bg-amber-50 text-amber-700 border border-amber-200/80',
    hidden: 'bg-gray-100 text-gray-500 border border-gray-200/80',
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold capitalize ${styles[status] || styles.pending} ${className}`}>
      {status}
    </span>
  )
}
