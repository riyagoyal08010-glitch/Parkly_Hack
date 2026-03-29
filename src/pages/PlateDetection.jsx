import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Camera, Upload, ScanLine, ShieldCheck, ShieldX, Loader2,
  RotateCcw, Clock, Zap, Image as ImageIcon, ChevronDown, ChevronUp,
} from 'lucide-react'

const API_URL = import.meta.env.VITE_PLATE_API_URL || 'http://localhost:5050'

export default function PlateDetection() {
  const [image, setImage] = useState(null)        // File object
  const [preview, setPreview] = useState(null)     // data URL
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [showLog, setShowLog] = useState(false)
  const [log, setLog] = useState([])
  const [cameraMode, setCameraMode] = useState(false)

  const fileRef = useRef(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  // --- File upload ---
  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImage(file)
    setPreview(URL.createObjectURL(file))
    setResult(null)
    setError(null)
  }

  // --- Camera ---
  // Attach stream to video element whenever cameraMode turns on
  useEffect(() => {
    if (cameraMode && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [cameraMode])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          focusMode: { ideal: 'continuous' },
          exposureMode: { ideal: 'continuous' },
          whiteBalanceMode: { ideal: 'continuous' },
        },
      })
      streamRef.current = stream
      setCameraMode(true)
      setResult(null)
      setError(null)
    } catch {
      setError('Camera access denied')
    }
  }

  const capturePhoto = () => {
    const video = videoRef.current
    if (!video) return
    // Use native resolution for sharp capture
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((blob) => {
      const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' })
      setImage(file)
      setPreview(canvas.toDataURL('image/jpeg', 1.0))
      stopCamera()
    }, 'image/jpeg', 1.0) // full quality, no compression
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCameraMode(false)
  }

  // --- Detect ---
  const handleDetect = async () => {
    if (!image) return
    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('image', image)

      const res = await fetch(`${API_URL}/detect-plate`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(err.message || 'Detection failed')
    } finally {
      setLoading(false)
    }
  }

  // --- Log ---
  const fetchLog = async () => {
    try {
      const res = await fetch(`${API_URL}/detection-log`)
      const data = await res.json()
      setLog(data)
    } catch {}
  }

  const toggleLog = () => {
    if (!showLog) fetchLog()
    setShowLog(!showLog)
  }

  // --- Reset ---
  const handleReset = () => {
    setImage(null)
    setPreview(null)
    setResult(null)
    setError(null)
    stopCamera()
  }

  const isGranted = result?.status === 'granted'
  const isDenied = result?.status === 'denied'
  const isCooldown = result?.status === 'cooldown'

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
            <ScanLine className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Plate Detection</h1>
            <p className="text-sm text-gray-400">AI-powered vehicle number plate recognition</p>
          </div>
        </div>
      </motion.div>

      <div className="space-y-6">
        {/* Upload / Camera area */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm"
        >
          {/* Camera mode */}
          {cameraMode && (
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-72 sm:h-96 object-contain bg-black"
                style={{ imageRendering: 'auto' }}
              />
              {/* Scan overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[70%] h-24 border-2 border-white/60 rounded-xl">
                  <motion.div
                    className="h-0.5 bg-emerald-400 rounded-full mx-2"
                    animate={{ y: [0, 88, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>
              </div>
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
                <button
                  onClick={capturePhoto}
                  className="px-6 py-3 bg-white text-black rounded-xl font-semibold text-sm shadow-lg hover:bg-gray-100 transition-all active:scale-95"
                >
                  <Camera className="w-4 h-4 inline mr-2" />
                  Capture
                </button>
                <button
                  onClick={stopCamera}
                  className="px-4 py-3 bg-black/50 text-white rounded-xl text-sm backdrop-blur-sm hover:bg-black/70 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Preview */}
          {!cameraMode && preview && (
            <div className="relative">
              <img src={preview} alt="Vehicle" className="w-full h-72 sm:h-96 object-contain bg-gray-50" />
              <button
                onClick={handleReset}
                className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-xl shadow-sm hover:bg-white transition-all"
              >
                <RotateCcw className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          )}

          {/* Empty state: upload/camera buttons */}
          {!cameraMode && !preview && (
            <div className="p-10 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ImageIcon className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-900 font-semibold mb-1">Upload or capture a vehicle image</p>
              <p className="text-sm text-gray-400 mb-6">Supports JPG, PNG, WebP up to 10MB</p>

              <div className="flex justify-center gap-3">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 px-5 py-3 bg-black text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-all hover:scale-105 active:scale-95"
                >
                  <Upload className="w-4 h-4" />
                  Upload Image
                </button>
                <button
                  onClick={startCamera}
                  className="flex items-center gap-2 px-5 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-all hover:scale-105 active:scale-95"
                >
                  <Camera className="w-4 h-4" />
                  Use Camera
                </button>
              </div>

              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            </div>
          )}

          {/* Detect button */}
          {preview && !loading && (
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={handleDetect}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-black text-white rounded-xl font-semibold text-sm hover:bg-gray-800 transition-all hover:shadow-lg active:scale-[0.98]"
              >
                <Zap className="w-4 h-4" />
                Detect Plate
              </button>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="p-6 border-t border-gray-100">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <Loader2 className="w-8 h-8 text-gray-900 animate-spin" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-900">Analyzing image...</p>
                  <p className="text-xs text-gray-400 mt-0.5">Running YOLO detection + OCR</p>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="p-4 bg-red-50 border border-red-100 rounded-2xl"
            >
              <p className="text-sm text-red-600 font-medium">{error}</p>
              <p className="text-xs text-red-400 mt-1">Check that the AI server is running on {API_URL}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className={`rounded-2xl border overflow-hidden shadow-sm ${
                isGranted ? 'bg-emerald-50 border-emerald-200' :
                isCooldown ? 'bg-amber-50 border-amber-200' :
                'bg-red-50 border-red-200'
              }`}
            >
              {/* Status header */}
              <div className={`px-6 py-5 flex items-center gap-4 ${
                isGranted ? 'bg-emerald-100/50' :
                isCooldown ? 'bg-amber-100/50' :
                'bg-red-100/50'
              }`}>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                    isGranted ? 'bg-emerald-500' :
                    isCooldown ? 'bg-amber-500' :
                    'bg-red-500'
                  }`}
                >
                  {isGranted ? (
                    <ShieldCheck className="w-7 h-7 text-white" />
                  ) : isCooldown ? (
                    <Clock className="w-7 h-7 text-white" />
                  ) : (
                    <ShieldX className="w-7 h-7 text-white" />
                  )}
                </motion.div>
                <div>
                  <h3 className={`text-lg font-bold ${
                    isGranted ? 'text-emerald-800' :
                    isCooldown ? 'text-amber-800' :
                    'text-red-800'
                  }`}>
                    {isGranted ? 'Access Granted' : isCooldown ? 'Cooldown' : 'Access Denied'}
                  </h3>
                  <p className={`text-sm ${
                    isGranted ? 'text-emerald-600' :
                    isCooldown ? 'text-amber-600' :
                    'text-red-600'
                  }`}>
                    {result.message}
                  </p>
                </div>
              </div>

              {/* Details */}
              <div className="px-6 py-4 space-y-3">
                {/* Plate number */}
                {result.plate && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Plate Number</span>
                    <span className="font-mono font-bold text-lg tracking-wider bg-white px-4 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                      {result.plate}
                    </span>
                  </div>
                )}

                {/* Confidence */}
                {result.confidence > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Confidence</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${result.confidence * 100}%` }}
                          transition={{ duration: 0.6, delay: 0.2 }}
                          className={`h-full rounded-full ${
                            result.confidence > 0.7 ? 'bg-emerald-500' :
                            result.confidence > 0.4 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-700">
                        {Math.round(result.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Method */}
                {result.method && result.method !== 'none' && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Detection Method</span>
                    <span className="text-xs font-medium px-2.5 py-1 bg-gray-100 rounded-lg text-gray-600 capitalize">
                      {result.method === 'yolo' ? 'YOLOv8 AI' : 'OpenCV Contour'}
                    </span>
                  </div>
                )}

                {/* Booking details when plate has an active booking */}
                {result.booking && (
                  <div className="border-t border-gray-200 pt-3 mt-1 space-y-2">
                    <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Booking Details</span>
                    <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">From</span>
                        <span className="font-medium">{new Date(result.booking.start_time).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">To</span>
                        <span className="font-medium">{new Date(result.booking.end_time).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Amount</span>
                        <span className="font-bold">₹{result.booking.total_amount}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scan again */}
        {result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex gap-3"
          >
            <button
              onClick={handleReset}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              Scan Another
            </button>
            <button
              onClick={() => { fileRef.current?.click() }}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-black text-white rounded-xl font-semibold text-sm hover:bg-gray-800 transition-all"
            >
              <Upload className="w-4 h-4" />
              Upload New
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </motion.div>
        )}

        {/* Detection log */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
        >
          <button
            onClick={toggleLog}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-700">Detection Log</span>
            </div>
            {showLog ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>

          <AnimatePresence>
            {showLog && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="border-t border-gray-100"
              >
                {log.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-gray-400 text-center">No detections yet</p>
                ) : (
                  <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                    {log.map((entry, i) => (
                      <div key={i} className="px-5 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            entry.status === 'granted' ? 'bg-emerald-500' : 'bg-red-500'
                          }`} />
                          <span className="font-mono text-sm font-semibold">{entry.plate}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-semibold capitalize ${
                            entry.status === 'granted' ? 'text-emerald-600' : 'text-red-500'
                          }`}>
                            {entry.status}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
