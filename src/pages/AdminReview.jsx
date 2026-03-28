import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { insforge } from '../lib/insforge'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ui/Toast'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Loader } from '../components/ui/Loader'
import { Textarea } from '../components/ui/Input'
import { ArrowLeft, MapPin, FileText, CheckCircle, XCircle, ExternalLink, Shield, Car, ZoomIn, User, Phone, Mail, Calendar, Ruler, IndianRupee } from 'lucide-react'

export default function AdminReview() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const type = searchParams.get('type') || 'host'
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [previewImage, setPreviewImage] = useState(null)

  const [hostProfile, setHostProfile] = useState(null)
  const [hostDocs, setHostDocs] = useState([])
  const [parking, setParking] = useState(null)

  useEffect(() => {
    if (type === 'host') fetchHostData()
    else fetchParkingData()
  }, [id, type])

  const fetchHostData = async () => {
    const [profileRes, docsRes] = await Promise.all([
      insforge.database.from('profiles').select('*').eq('id', id).single(),
      insforge.database.from('host_documents').select('*').eq('host_id', id),
    ])
    if (profileRes.data) setHostProfile(profileRes.data)
    setHostDocs(docsRes.data || [])
    setLoading(false)
  }

  const fetchParkingData = async () => {
    const { data } = await insforge.database
      .from('parking_locations')
      .select('*, profiles!host_id(name, email, phone)')
      .eq('id', id)
      .single()
    if (data) setParking(data)
    setLoading(false)
  }

  const handleApprove = async () => {
    setActing(true)
    try {
      if (type === 'host') {
        for (const doc of hostDocs) {
          await insforge.database
            .from('host_documents')
            .update({ status: 'approved', reviewed_by: user.id, reviewed_at: new Date().toISOString() })
            .eq('id', doc.id)
        }
        toast('Host approved successfully', 'success')
      } else {
        await insforge.database
          .from('parking_locations')
          .update({ status: 'approved', approved_by: user.id })
          .eq('id', id)

        // Generate parking slots
        const rows = parking.total_rows || 2
        const cols = parking.slots_per_row || Math.ceil(parking.total_slots / rows)
        await insforge.database.rpc('generate_parking_slots', {
          p_id: id,
          num_rows: rows,
          cols_per_row: cols,
        })

        toast('Parking approved & slots generated!', 'success')
      }
      navigate('/admin/dashboard')
    } catch (err) {
      toast(err.message || 'Failed to approve', 'error')
    } finally {
      setActing(false)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast('Please provide a reason', 'error'); return }
    setActing(true)
    try {
      if (type === 'host') {
        for (const doc of hostDocs) {
          await insforge.database
            .from('host_documents')
            .update({ status: 'rejected', rejection_reason: rejectReason, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
            .eq('id', doc.id)
        }
        toast('Host application rejected', 'success')
      } else {
        await insforge.database
          .from('parking_locations')
          .update({ status: 'rejected', rejection_reason: rejectReason })
          .eq('id', id)
        toast('Parking rejected', 'success')
      }
      setShowRejectModal(false)
      navigate('/admin/dashboard')
    } catch (err) {
      toast(err.message || 'Failed to reject', 'error')
    } finally {
      setActing(false)
    }
  }

  if (loading) return <Loader fullScreen />

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <button onClick={() => navigate('/admin/dashboard')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-black mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          Review {type === 'host' ? 'Host Application' : 'Parking Spot'}
        </h1>
        <Badge status="pending" />
      </div>

      {type === 'host' && hostProfile ? (
        <div className="space-y-6">
          {/* Host profile card */}
          <Card className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                {hostProfile.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <h2 className="text-xl font-bold">{hostProfile.name}</h2>
                <p className="text-gray-500 text-sm">Applied as Host</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: Mail, label: 'Email', value: hostProfile.email },
                { icon: Phone, label: 'Phone', value: hostProfile.phone || 'Not provided' },
                { icon: Calendar, label: 'Joined', value: new Date(hostProfile.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) },
                { icon: User, label: 'Role', value: hostProfile.role },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <item.icon className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">{item.label}</p>
                    <p className="text-sm font-medium">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Documents */}
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4">Uploaded Documents</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {hostDocs.map((doc) => (
                <div key={doc.id} className="border border-gray-200 rounded-xl overflow-hidden group">
                  <div className="relative h-48 bg-gray-100">
                    <img
                      src={doc.document_url}
                      alt={doc.document_type}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                    <button
                      onClick={() => setPreviewImage(doc.document_url)}
                      className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-all"
                    >
                      <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium capitalize">{doc.document_type.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-gray-400">{new Date(doc.created_at).toLocaleDateString()}</p>
                    </div>
                    <a href={doc.document_url} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-gray-100 rounded-lg">
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : type === 'parking' && parking ? (
        <div className="space-y-6">
          <Card className="p-6">
            {parking.photos && parking.photos.length > 0 && (
              <div className="flex gap-3 overflow-x-auto mb-6 -mx-6 px-6">
                {parking.photos.map((photo, i) => (
                  <img
                    key={i}
                    src={photo?.url || photo}
                    alt=""
                    className="w-64 h-44 object-cover rounded-xl shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setPreviewImage(photo?.url || photo)}
                  />
                ))}
              </div>
            )}

            <h2 className="text-xl font-bold">{parking.title}</h2>
            <div className="flex items-center gap-1.5 text-gray-500 text-sm mt-1">
              <MapPin className="w-3.5 h-3.5" /> {parking.address}
            </div>

            {parking.description && <p className="text-sm text-gray-600 mt-3">{parking.description}</p>}

            <div className="grid sm:grid-cols-3 gap-4 mt-6">
              {[
                { icon: IndianRupee, label: 'Price/hr (Car)', value: `₹${parking.price_per_hour}` },
                { icon: Car, label: 'Total Slots', value: parking.total_slots },
                { icon: User, label: 'Host', value: parking.profiles?.name },
                { icon: Ruler, label: 'Plot Size', value: parking.plot_length && parking.plot_width ? `${parking.plot_length}m x ${parking.plot_width}m` : 'Not specified' },
                { icon: Car, label: 'Layout', value: `${parking.total_rows || 2} rows x ${parking.slots_per_row || Math.ceil(parking.total_slots / 2)} cols` },
                { icon: MapPin, label: 'Coordinates', value: `${parking.lat?.toFixed(4)}, ${parking.lng?.toFixed(4)}` },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <item.icon className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">{item.label}</p>
                    <p className="text-sm font-medium">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {parking.amenities && parking.amenities.length > 0 && (
              <div className="mt-6">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Amenities</p>
                <div className="flex flex-wrap gap-2">
                  {parking.amenities.map((a) => (
                    <span key={a} className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-full text-xs font-medium">
                      <Shield className="w-3 h-3" /> {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      ) : (
        <p>Not found</p>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 mt-8 sticky bottom-6">
        <Button size="lg" loading={acting} onClick={handleApprove} className="flex-1 rounded-xl">
          <CheckCircle className="w-4 h-4 mr-2" /> Approve
        </Button>
        <Button size="lg" variant="outline" onClick={() => setShowRejectModal(true)} className="flex-1 rounded-xl">
          <XCircle className="w-4 h-4 mr-2" /> Reject
        </Button>
      </div>

      {/* Reject Modal */}
      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Reject Application">
        <Textarea label="Reason for rejection" placeholder="Please explain why..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
        <div className="flex gap-3 mt-4">
          <Button loading={acting} onClick={handleReject} className="bg-red-600 hover:bg-red-700 text-white">Confirm Reject</Button>
          <Button variant="ghost" onClick={() => setShowRejectModal(false)}>Cancel</Button>
        </div>
      </Modal>

      {/* Image Preview Modal */}
      <Modal isOpen={!!previewImage} onClose={() => setPreviewImage(null)} title="Document Preview">
        {previewImage && <img src={previewImage} alt="Preview" className="w-full rounded-lg" />}
      </Modal>
    </div>
  )
}
