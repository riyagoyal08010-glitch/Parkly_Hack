import { Loader2 } from 'lucide-react'

export function Loader({ fullScreen = false }) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        <Loader2 className="w-8 h-8 animate-spin text-black" />
      </div>
    )
  }
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-black" />
    </div>
  )
}
