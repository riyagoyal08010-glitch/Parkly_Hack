export function Card({ children, className = '', onClick, ...props }) {
  return (
    <div
      className={`bg-white border border-gray-200/80 rounded-2xl shadow-sm ${onClick ? 'cursor-pointer hover:shadow-lg hover:border-gray-300 transition-all duration-300' : ''} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  )
}
