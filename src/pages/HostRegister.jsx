import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { insforge } from '../lib/insforge'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ui/Toast'
import { Button } from '../components/ui/Button'
import { Input, Textarea } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Loader } from '../components/ui/Loader'
import { AMENITIES, DOCUMENT_TYPES } from '../lib/constants'
import { Upload, FileCheck, MapPin, X, Image, ChevronRight, CheckCircle, Ruler, Car, IndianRupee, Grid3X3, ArrowLeft } from 'lucide-react'

export default function HostRegister() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState(1) // 1=docs, 2=details, 3=photos+amenities

  const [form, setForm] = useState({
    title: '',
    description: '',
    address: '',
    lat: '',
    lng: '',
    price_per_hour: '',
    price_per_hour_bike: '',
    price_per_hour_ev: '',
    total_slots: '10',
    total_rows: '2',
    slots_per_row: '5',
    plot_length: '',
    plot_width: '',
  })
  const [selectedAmenities, setSelectedAmenities] = useState([])
  const [photos, setPhotos] = useState([])
  const [photoFiles, setPhotoFiles] = useState([])

  useEffect(() => { fetchDocuments() }, [])

  const fetchDocuments = async () => {
    const { data } = await insforge.database.from('host_documents').select('*').eq('host_id', user.id)
    setDocuments(data || [])
    setLoading(false)
  }

  const hasApprovedDocs = documents.some((d) => d.status === 'approved')
  const hasPendingDocs = documents.some((d) => d.status === 'pending')
  const hasRejectedDocs = documents.some((d) => d.status === 'rejected')

  const requiredDocs = [
    { type: 'aadhaar_card', label: 'Aadhaar Card', desc: 'Government-issued Aadhaar card (front & back)', icon: '\u{1FAAA}' },
    { type: 'property_proof', label: 'Property Document', desc: 'Property ownership deed, lease agreement, or NOC', icon: '\u{1F4C4}' },
    { type: 'id_proof', label: 'PAN Card / Driving License', desc: 'Additional identity verification', icon: '\u{1F194}' },
  ]

  const handleDocUpload = async (type) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*,.pdf'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return
      setUploading((prev) => ({ ...prev, [type]: true }))
      try {
        const filePath = `${user.id}/${type}/${Date.now()}-${file.name}`
        const { data, error } = await insforge.storage.from('documents').upload(filePath, file)
        if (error) throw new Error(error.message)
        const { error: dbError } = await insforge.database.from('host_documents').insert([{
          host_id: user.id, document_type: type, document_url: data.url, document_key: data.key,
        }])
        if (dbError) throw new Error(dbError.message)
        toast(`${type.replace(/_/g, ' ')} uploaded`, 'success')
        fetchDocuments()
      } catch (err) {
        toast(err.message || 'Upload failed', 'error')
      } finally {
        setUploading((prev) => ({ ...prev, [type]: false }))
      }
    }
    input.click()
  }

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files).slice(0, 8 - photos.length)
    const previews = files.map((f) => ({ file: f, preview: URL.createObjectURL(f) }))
    setPhotos((prev) => [...prev, ...previews])
    setPhotoFiles((prev) => [...prev, ...files])
  }

  const removePhoto = (i) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== i))
    setPhotoFiles((prev) => prev.filter((_, idx) => idx !== i))
  }

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const toggleAmenity = (a) => setSelectedAmenities((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a])

  const handleGetLocation = () => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({ ...prev, lat: pos.coords.latitude.toString(), lng: pos.coords.longitude.toString() }))
        toast('Location detected', 'success')
      },
      () => toast('Could not get location', 'error')
    )
  }

  const handleSubmitParking = async (e) => {
    e.preventDefault()
    if (!form.lat || !form.lng) { toast('Please provide location coordinates', 'error'); return }
    if (photoFiles.length === 0) { toast('Please add at least one photo', 'error'); return }

    setSubmitting(true)
    try {
      const uploadedPhotos = []
      for (const file of photoFiles) {
        const filePath = `${user.id}/${Date.now()}-${file.name}`
        const { data, error } = await insforge.storage.from('parking-photos').upload(filePath, file)
        if (error) throw new Error(error.message)
        uploadedPhotos.push({ url: data.url, key: data.key })
      }

      const totalSlots = parseInt(form.total_rows) * parseInt(form.slots_per_row)

      const { error } = await insforge.database.from('parking_locations').insert([{
        host_id: user.id,
        title: form.title, description: form.description,
        address: form.address, lat: parseFloat(form.lat), lng: parseFloat(form.lng),
        price_per_hour: parseFloat(form.price_per_hour),
        price_per_hour_bike: form.price_per_hour_bike ? parseFloat(form.price_per_hour_bike) : null,
        price_per_hour_ev: form.price_per_hour_ev ? parseFloat(form.price_per_hour_ev) : null,
        total_slots: totalSlots, available_slots: totalSlots,
        total_rows: parseInt(form.total_rows), slots_per_row: parseInt(form.slots_per_row),
        plot_length: form.plot_length ? parseFloat(form.plot_length) : null,
        plot_width: form.plot_width ? parseFloat(form.plot_width) : null,
        photos: uploadedPhotos, amenities: selectedAmenities, status: 'pending',
      }])
      if (error) throw new Error(error.message)
      toast('Parking spot submitted for review!', 'success')
      navigate('/host/dashboard')
    } catch (err) {
      toast(err.message || 'Failed to submit', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Loader fullScreen />

  // Step 0: Documents
  if (!hasApprovedDocs) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button onClick={() => navigate('/host/dashboard')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-black mb-6">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </button>

        <div className="mb-8">
          <h1 className="text-2xl font-bold">Become a Host</h1>
          <p className="text-gray-500 mt-1">Upload verification documents to start listing</p>
        </div>

        {hasPendingDocs && !hasRejectedDocs ? (
          <Card className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileCheck className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-bold text-lg">Under Review</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              Your documents are being reviewed. This usually takes 24-48 hours. We'll notify you once approved.
            </p>
            <div className="mt-6 space-y-2 max-w-sm mx-auto">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm font-medium capitalize">{doc.document_type.replace(/_/g, ' ')}</span>
                  <Badge status={doc.status} />
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {requiredDocs.map((doc) => {
              const uploaded = documents.find((d) => d.document_type === doc.type)
              const isUploading = uploading[doc.type]
              return (
                <Card key={doc.type} className={`p-5 transition-all ${uploaded ? 'border-green-200 bg-green-50/30' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl">
                        {doc.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{doc.label}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{doc.desc}</p>
                        {uploaded?.status === 'rejected' && (
                          <p className="text-xs text-red-500 mt-1">Rejected: {uploaded.rejection_reason || 'Please re-upload'}</p>
                        )}
                      </div>
                    </div>
                    {uploaded && uploaded.status !== 'rejected' ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <Button size="sm" variant="outline" loading={isUploading} onClick={() => handleDocUpload(doc.type)} className="rounded-lg">
                        <Upload className="w-4 h-4 mr-1" />
                        {uploaded?.status === 'rejected' ? 'Re-upload' : 'Upload'}
                      </Button>
                    )}
                  </div>
                </Card>
              )
            })}

            {documents.filter((d) => d.status !== 'rejected').length >= 3 && (
              <p className="text-center text-sm text-gray-500 mt-4">All documents uploaded! Click submit to send for review.</p>
            )}

            {documents.filter((d) => d.status !== 'rejected').length < requiredDocs.length && (
              <p className="text-center text-xs text-gray-400 mt-4">Upload all {requiredDocs.length} documents to proceed</p>
            )}
          </div>
        )}
      </div>
    )
  }

  // Parking registration form (multi-step)
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button onClick={() => navigate('/host/dashboard')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-black mb-6">
        <ArrowLeft className="w-4 h-4" /> Dashboard
      </button>

      <div className="mb-8">
        <h1 className="text-2xl font-bold">Register Parking Spot</h1>
        <p className="text-gray-500 mt-1">Step {step} of 3</p>
        <div className="flex gap-1 mt-3">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-all ${s <= step ? 'bg-black' : 'bg-gray-200'}`} />
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmitParking}>
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-5">
            <Input label="Parking Name" name="title" placeholder="e.g., Secure Basement Parking - MG Road" value={form.title} onChange={handleChange} required />
            <Textarea label="Description" name="description" placeholder="Describe your parking space, surroundings, entry instructions..." value={form.description} onChange={handleChange} />
            <Input label="Full Address" name="address" placeholder="123, MG Road, Bengaluru 560001" value={form.address} onChange={handleChange} required />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location Coordinates</label>
              <div className="grid grid-cols-2 gap-3">
                <Input name="lat" placeholder="Latitude" type="number" step="any" value={form.lat} onChange={handleChange} required />
                <Input name="lng" placeholder="Longitude" type="number" step="any" value={form.lng} onChange={handleChange} required />
              </div>
              <button type="button" onClick={handleGetLocation} className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 hover:text-black">
                <MapPin className="w-3 h-3" /> Detect my location
              </button>
            </div>

            <Button type="button" size="lg" className="w-full rounded-xl" onClick={() => {
              if (!form.title || !form.address || !form.lat || !form.lng) { toast('Fill all required fields', 'error'); return }
              setStep(2)
            }}>
              Next: Dimensions & Pricing <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Step 2: Dimensions & Pricing */}
        {step === 2 && (
          <div className="space-y-5">
            <Card className="p-5 bg-gray-50">
              <div className="flex items-center gap-2 mb-4">
                <Ruler className="w-4 h-4" />
                <h3 className="font-semibold text-sm">Plot Dimensions</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Length (meters)" name="plot_length" type="number" step="0.1" placeholder="30" value={form.plot_length} onChange={handleChange} />
                <Input label="Width (meters)" name="plot_width" type="number" step="0.1" placeholder="20" value={form.plot_width} onChange={handleChange} />
              </div>
            </Card>

            <Card className="p-5 bg-gray-50">
              <div className="flex items-center gap-2 mb-4">
                <Grid3X3 className="w-4 h-4" />
                <h3 className="font-semibold text-sm">Parking Layout</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Number of Rows" name="total_rows" type="number" min="1" max="26" placeholder="2" value={form.total_rows} onChange={handleChange} required />
                <Input label="Slots per Row" name="slots_per_row" type="number" min="1" max="50" placeholder="5" value={form.slots_per_row} onChange={handleChange} required />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Total capacity: <strong>{(parseInt(form.total_rows) || 0) * (parseInt(form.slots_per_row) || 0)} slots</strong>
              </p>
              {/* Mini preview */}
              <div className="mt-3 p-3 bg-white rounded-lg border">
                <p className="text-[10px] text-gray-400 mb-2">Preview</p>
                <div className="flex flex-col gap-1 items-center">
                  {Array.from({ length: Math.min(parseInt(form.total_rows) || 0, 4) }).map((_, r) => (
                    <div key={r} className="flex gap-1">
                      {Array.from({ length: Math.min(parseInt(form.slots_per_row) || 0, 10) }).map((_, c) => (
                        <div key={c} className="w-6 h-4 bg-gray-200 rounded-sm border border-gray-300 flex items-center justify-center">
                          <span className="text-[6px] text-gray-400">{String.fromCharCode(65 + r)}{c + 1}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card className="p-5 bg-gray-50">
              <div className="flex items-center gap-2 mb-4">
                <IndianRupee className="w-4 h-4" />
                <h3 className="font-semibold text-sm">Pricing</h3>
              </div>
              <div className="space-y-3">
                <Input label="Car (₹/hr) *" name="price_per_hour" type="number" min="1" placeholder="50" value={form.price_per_hour} onChange={handleChange} required />
                <Input label="Bike (₹/hr)" name="price_per_hour_bike" type="number" min="1" placeholder="20" value={form.price_per_hour_bike} onChange={handleChange} />
                <Input label="EV (₹/hr)" name="price_per_hour_ev" type="number" min="1" placeholder="40" value={form.price_per_hour_ev} onChange={handleChange} />
              </div>
            </Card>

            <div className="flex gap-3">
              <Button type="button" variant="outline" size="lg" className="flex-1 rounded-xl" onClick={() => setStep(1)}>Back</Button>
              <Button type="button" size="lg" className="flex-1 rounded-xl" onClick={() => {
                if (!form.price_per_hour) { toast('Car price is required', 'error'); return }
                setStep(3)
              }}>
                Next: Photos <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Photos & Amenities */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Parking Photos ({photos.length}/8) *</label>
              <div className="grid grid-cols-4 gap-3">
                {photos.map((photo, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden group">
                    <img src={photo.preview} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removePhoto(i)} className="absolute top-1 right-1 w-6 h-6 bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {photos.length < 8 && (
                  <label className="aspect-square border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-black transition-colors">
                    <Image className="w-6 h-6 text-gray-400" />
                    <span className="text-[10px] text-gray-400 mt-1">Add photo</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelect} />
                  </label>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Amenities</label>
              <div className="grid grid-cols-2 gap-2">
                {AMENITIES.map((a) => (
                  <button key={a} type="button" onClick={() => toggleAmenity(a)}
                    className={`p-3 text-sm rounded-xl border text-left transition-all ${
                      selectedAmenities.includes(a) ? 'bg-black text-white border-black' : 'border-gray-200 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" size="lg" className="flex-1 rounded-xl" onClick={() => setStep(2)}>Back</Button>
              <Button type="submit" size="lg" className="flex-1 rounded-xl" loading={submitting}>Submit for Review</Button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
