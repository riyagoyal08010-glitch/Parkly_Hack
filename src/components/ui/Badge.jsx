export function Badge({ status, className = '' }) {
  const styles = {
    pending: 'bg-gray-100 text-gray-600 border border-gray-200',
    approved: 'bg-black text-white',
    rejected: 'bg-white text-black border-2 border-black',
    active: 'bg-black text-white',
    completed: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-white text-black border border-black',
    failed: 'bg-white text-red-600 border border-red-200',
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.pending} ${className}`}>
      {status}
    </span>
  )
}
