import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
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

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200/80 rounded-2xl ${className}`} />
}

function InfoItem({ icon: Icon, label, value, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="flex items-center gap-3 p-3.5 bg-gray-50/80 rounded-xl border border-gray-100 hover:bg-gray-100/60 transition-colors duration-200"
    >
      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
        <Icon className="w-4 h-4 text-gray-500" />
      </div>
      <div>
        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value}</p>
      </div>
    </motion.div>
  )
}

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

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <Skeleton className="h-5 w-40 mb-6" />
        <Skeleton className="h-8 w-72 mb-6" />
        <Skeleton className="h-64 mb-4" />
        <Skeleton className="h-48" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <motion.button
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate('/admin/dashboard')}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-900 mb-6 transition-colors duration-200 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back to Dashboard
      </motion.button>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Review {type === 'host' ? 'Host Application' : 'Parking Spot'}
          </h1>
          <p className="text-sm text-gray-400 mt-1">Carefully review the details below</p>
        </div>
        <Badge status="pending" />
      </motion.div>

      {type === 'host' && hostProfile ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          className="space-y-6"
        >
          {/* Host profile card */}
          <Card className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                {hostProfile.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{hostProfile.name}</h2>
                <p className="text-gray-500 text-sm mt-0.5">Applied as Host</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <InfoItem icon={Mail} label="Email" value={hostProfile.email} delay={0.05} />
              <InfoItem icon={Phone} label="Phone" value={hostProfile.phone || 'Not provided'} delay={0.1} />
              <InfoItem icon={Calendar} label="Joined" value={new Date(hostProfile.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })} delay={0.15} />
              <InfoItem icon={User} label="Role" value={hostProfile.role} delay={0.2} />
            </div>
          </Card>

          {/* Documents */}
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4 text-gray-900">Uploaded Documents</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {hostDocs.map((doc, i) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 + i * 0.08 }}
                  className="border border-gray-200/80 rounded-2xl overflow-hidden group hover:border-gray-300 hover:shadow-lg transition-all duration-300"
                >
                  <div className="relative h-48 bg-gray-100">
                    <img
                      src={doc.document_url}
                      alt={doc.document_type}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                    <button
                      onClick={() => setPreviewImage(doc.document_url)}
                      className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-all duration-300"
                    >
                      <div className="w-10 h-10 bg-white/90 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-90 group-hover:scale-100">
                        <ZoomIn className="w-5 h-5 text-gray-700" />
                      </div>
                    </button>
                  </div>
                  <div className="p-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold capitalize text-gray-900">{doc.document_type.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(doc.created_at).toLocaleDateString()}</p>
                    </div>
                    <a href={doc.document_url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    </a>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>
      ) : type === 'parking' && parking ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          className="space-y-6"
        >
          <Card className="p-6">
            {parking.photos && parking.photos.length > 0 && (
              <div className="flex gap-3 overflow-x-auto mb-6 -mx-6 px-6 pb-1">
                {parking.photos.map((photo, i) => (
                  <motion.img
                    key={i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: i * 0.08 }}
                    src={photo?.url || photo}
                    alt=""
                    className="w-64 h-44 object-cover rounded-2xl shrink-0 cursor-pointer hover:opacity-90 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
                    onClick={() => setPreviewImage(photo?.url || photo)}
                  />
                ))}
              </div>
            )}

            <h2 className="text-xl font-bold text-gray-900">{parking.title}</h2>
            <div className="flex items-center gap-1.5 text-gray-500 text-sm mt-1.5">
              <MapPin className="w-3.5 h-3.5" /> {parking.address}
            </div>

            {parking.description && <p className="text-sm text-gray-600 mt-3 leading-relaxed">{parking.description}</p>}

            <div className="grid sm:grid-cols-3 gap-3 mt-6">
              <InfoItem icon={IndianRupee} label="Price/hr (Car)" value={`₹${parking.price_per_hour}`} delay={0.05} />
              <InfoItem icon={Car} label="Total Slots" value={parking.total_slots} delay={0.1} />
              <InfoItem icon={User} label="Host" value={parking.profiles?.name} delay={0.15} />
              <InfoItem icon={Ruler} label="Plot Size" value={parking.plot_length && parking.plot_width ? `${parking.plot_length}m x ${parking.plot_width}m` : 'Not specified'} delay={0.2} />
              <InfoItem icon={Car} label="Layout" value={`${parking.total_rows || 2} rows x ${parking.slots_per_row || Math.ceil(parking.total_slots / 2)} cols`} delay={0.25} />
              <InfoItem icon={MapPin} label="Coordinates" value={`${parking.lat?.toFixed(4)}, ${parking.lng?.toFixed(4)}`} delay={0.3} />
            </div>

            {parking.amenities && parking.amenities.length > 0 && (
              <div className="mt-6">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2.5">Amenities</p>
                <div className="flex flex-wrap gap-2">
                  {parking.amenities.map((a) => (
                    <span key={a} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors">
                      <Shield className="w-3 h-3" /> {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      ) : (
        <Card className="p-14 text-center">
          <p className="text-gray-500">Not found</p>
        </Card>
      )}

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="flex gap-3 mt-8 sticky bottom-6"
      >
        <Button
          size="lg"
          loading={acting}
          onClick={handleApprove}
          className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all duration-300"
        >
          <CheckCircle className="w-4 h-4 mr-2" /> Approve
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={() => setShowRejectModal(true)}
          className="flex-1 rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all duration-300"
        >
          <XCircle className="w-4 h-4 mr-2" /> Reject
        </Button>
      </motion.div>

      {/* Reject Modal */}
      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Reject Application">
        <Textarea label="Reason for rejection" placeholder="Please explain why this application is being rejected..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
        <div className="flex gap-3 mt-5">
          <Button loading={acting} onClick={handleReject} className="bg-red-600 hover:bg-red-700 text-white rounded-xl">
            Confirm Reject
          </Button>
          <Button variant="ghost" onClick={() => setShowRejectModal(false)} className="rounded-xl">Cancel</Button>
        </div>
      </Modal>

      {/* Image Preview Modal */}
      <Modal isOpen={!!previewImage} onClose={() => setPreviewImage(null)} title="Document Preview">
        {previewImage && <img src={previewImage} alt="Preview" className="w-full rounded-xl" />}
      </Modal>
    </div>
  )
}
