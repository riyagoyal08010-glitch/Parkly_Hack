import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useAuth } from '../contexts/AuthContext'
import { insforge } from '../lib/insforge'
import { Button } from '../components/ui/Button'
import { MapPin, CreditCard, QrCode, Clock, Shield, Smartphone, ArrowRight, Car, Star, Zap, ChevronDown, Navigation } from 'lucide-react'
import { ROLES } from '../lib/constants'

// Custom price marker for map
function createLandingMarker(price) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="position:relative;display:inline-block;">
      <div style="background:#000;color:#fff;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.3);">₹${price}/hr</div>
      <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:6px solid #000;margin:-1px auto 0;"></div>
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [30, 40],
  })
}

// Auto-fit map to markers
function FitBounds({ spots }) {
  const map = useMap()
  useEffect(() => {
    if (spots.length > 0) {
      const bounds = L.latLngBounds(spots.map((s) => [s.lat, s.lng]))
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 })
    }
  }, [spots, map])
  return null
}

// Floating particle that drifts upward
function FloatingParticle({ delay, duration, left, size, opacity }) {
  return (
    <div
      className="absolute rounded-full bg-black pointer-events-none"
      style={{
        width: size,
        height: size,
        left: `${left}%`,
        bottom: '-20px',
        opacity,
        animation: `floatUp ${duration}s ${delay}s ease-out infinite`,
      }}
    />
  )
}

// Floating card that hovers in space
function FloatingCard({ children, className = '', delay = 0, y = 0 }) {
  return (
    <div
      className={`${className}`}
      style={{
        animation: `hover ${4 + delay}s ease-in-out infinite`,
        animationDelay: `${delay}s`,
        transform: `translateY(${y}px)`,
      }}
    >
      {children}
    </div>
  )
}

// Hook for scroll-triggered reveal
function useReveal() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return [ref, visible]
}

export default function Landing() {
  const navigate = useNavigate()
  const { user, role } = useAuth()
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [mapSpots, setMapSpots] = useState([])
  const [mapLoaded, setMapLoaded] = useState(false)

  useEffect(() => {
    if (user && role) {
      const redirectMap = {
        [ROLES.USER]: '/explore',
        [ROLES.HOST]: '/host/dashboard',
        [ROLES.ADMIN]: '/admin/dashboard',
      }
      navigate(redirectMap[role] || '/dashboard', { replace: true })
    }
  }, [user, role, navigate])

  // Fetch parking spots for map preview
  useEffect(() => {
    const fetchSpots = async () => {
      const { data } = await insforge.database
        .from('parking_locations')
        .select('id, title, address, lat, lng, price_per_hour, available_slots, photos')
        .eq('status', 'approved')
        .limit(20)
      if (data) setMapSpots(data)
    }
    fetchSpots()
  }, [])

  // Parallax mouse tracking for hero
  const handleMouseMove = (e) => {
    const { clientX, clientY } = e
    const x = (clientX / window.innerWidth - 0.5) * 20
    const y = (clientY / window.innerHeight - 0.5) * 20
    setMousePos({ x, y })
  }

  const [stepsRef, stepsVisible] = useReveal()
  const [statsRef, statsVisible] = useReveal()
  const [hostsRef, hostsVisible] = useReveal()

  return (
    <div className="bg-white overflow-hidden">
      {/* Antigravity CSS */}
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(1); opacity: 0; }
          10% { opacity: var(--particle-opacity, 0.15); }
          90% { opacity: var(--particle-opacity, 0.15); }
          100% { transform: translateY(-100vh) scale(0.5); opacity: 0; }
        }
        @keyframes hover {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes hoverSlow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(1deg); }
        }
        @keyframes revealUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes revealScale {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes float-rotate {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-15px) rotate(2deg); }
          75% { transform: translateY(-8px) rotate(-1deg); }
        }
        .reveal-up {
          animation: revealUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .reveal-scale {
          animation: revealScale 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .stagger-1 { animation-delay: 0.1s; }
        .stagger-2 { animation-delay: 0.2s; }
        .stagger-3 { animation-delay: 0.3s; }
        .stagger-4 { animation-delay: 0.4s; }
      `}</style>

      {/* ===== HERO ===== */}
      <section
        className="relative min-h-[100vh] flex items-center overflow-hidden"
        onMouseMove={handleMouseMove}
      >
        {/* Animated gradient background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,_rgba(0,0,0,0.06),_transparent)]" />
          <div className="absolute top-1/4 -right-20 w-[500px] h-[500px] bg-gray-100 rounded-full blur-3xl opacity-60" />
          <div className="absolute bottom-1/4 -left-20 w-[400px] h-[400px] bg-gray-50 rounded-full blur-3xl opacity-80" />
        </div>

        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[
            { delay: 0, duration: 8, left: 10, size: 4, opacity: 0.08 },
            { delay: 2, duration: 10, left: 25, size: 6, opacity: 0.06 },
            { delay: 1, duration: 7, left: 40, size: 3, opacity: 0.1 },
            { delay: 3, duration: 9, left: 55, size: 5, opacity: 0.07 },
            { delay: 0.5, duration: 11, left: 70, size: 4, opacity: 0.08 },
            { delay: 4, duration: 8, left: 85, size: 3, opacity: 0.09 },
            { delay: 2.5, duration: 10, left: 15, size: 5, opacity: 0.06 },
            { delay: 1.5, duration: 9, left: 60, size: 4, opacity: 0.07 },
            { delay: 3.5, duration: 7, left: 90, size: 6, opacity: 0.05 },
            { delay: 0.8, duration: 12, left: 35, size: 3, opacity: 0.08 },
          ].map((p, i) => (
            <FloatingParticle key={i} {...p} />
          ))}
        </div>

        {/* Grid lines background */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
            backgroundSize: '80px 80px',
            transform: `translate(${mousePos.x * 0.3}px, ${mousePos.y * 0.3}px)`,
            transition: 'transform 0.3s ease-out',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text */}
            <div className="pt-16 sm:pt-0">
              <div
                className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white text-xs font-medium rounded-full mb-8 reveal-up"
                style={{ animationDelay: '0.2s', animationFillMode: 'both' }}
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" style={{ animation: 'pulse-ring 1.5s cubic-bezier(0, 0, 0.2, 1) infinite' }} />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                Now available in 50+ cities across India
              </div>

              <h1
                className="text-5xl sm:text-7xl lg:text-[5.5rem] font-black tracking-tight leading-[0.88] reveal-up"
                style={{ animationDelay: '0.4s', animationFillMode: 'both' }}
              >
                Park
                <br />
                <span className="text-gray-300 inline-block" style={{ animation: 'hoverSlow 6s ease-in-out infinite' }}>
                  Smarter.
                </span>
              </h1>

              <p
                className="mt-8 text-lg sm:text-xl text-gray-500 max-w-xl leading-relaxed reveal-up"
                style={{ animationDelay: '0.6s', animationFillMode: 'both' }}
              >
                Find, book, and access parking spots instantly.
                One QR code. Zero hassle. From ₹10/hr.
              </p>

              <div
                className="mt-10 flex flex-wrap gap-4 reveal-up"
                style={{ animationDelay: '0.8s', animationFillMode: 'both' }}
              >
                <Button size="lg" onClick={() => navigate('/auth?mode=signup&role=user')} className="group rounded-full px-8">
                  Find Parking
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate('/auth?mode=signup&role=host')} className="rounded-full px-8">
                  List Your Space
                </Button>
              </div>

              {/* Trust row */}
              <div
                className="mt-14 flex items-center gap-8 text-sm text-gray-400 reveal-up"
                style={{ animationDelay: '1s', animationFillMode: 'both' }}
              >
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-black text-black" />
                  <span><strong className="text-black">4.8</strong> avg rating</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Car className="w-4 h-4 text-black" />
                  <span><strong className="text-black">10,000+</strong> bookings</span>
                </div>
                <div className="hidden sm:flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-black" />
                  <span>Secure payments</span>
                </div>
              </div>
            </div>

            {/* Right: Live Map Preview */}
            <div
              className="hidden lg:block relative reveal-up"
              style={{ animationDelay: '0.6s', animationFillMode: 'both' }}
            >
              <div
                className="relative rounded-3xl overflow-hidden shadow-2xl border border-gray-200"
                style={{
                  height: 520,
                  transform: `translate(${mousePos.x * -0.15}px, ${mousePos.y * -0.15}px)`,
                  transition: 'transform 0.4s ease-out',
                }}
              >
                {/* Map */}
                <MapContainer
                  center={[20.5937, 78.9629]}
                  zoom={5}
                  minZoom={4}
                  maxZoom={16}
                  style={{ width: '100%', height: '100%' }}
                  zoomControl={false}
                  scrollWheelZoom={false}
                  dragging={true}
                  whenReady={() => setMapLoaded(true)}
                >
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                  />
                  {mapSpots.length > 0 && <FitBounds spots={mapSpots} />}
                  {mapSpots.map((spot) => (
                    <Marker
                      key={spot.id}
                      position={[spot.lat, spot.lng]}
                      icon={createLandingMarker(spot.price_per_hour)}
                    >
                      <Popup>
                        <div className="min-w-[180px] p-1">
                          {spot.photos && spot.photos.length > 0 && (
                            <img
                              src={spot.photos[0]?.url || spot.photos[0]}
                              alt={spot.title}
                              className="w-full h-20 object-cover rounded-lg mb-2"
                            />
                          )}
                          <h4 className="font-bold text-sm">{spot.title}</h4>
                          <p className="text-xs text-gray-500 mt-0.5">{spot.address}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="font-bold text-sm">₹{spot.price_per_hour}/hr</span>
                            <span className="text-xs text-gray-400">{spot.available_slots} left</span>
                          </div>
                          <button
                            onClick={() => navigate('/auth?mode=signup&role=user')}
                            className="mt-2 w-full bg-black text-white text-xs py-1.5 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
                          >
                            Book Now
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>

                {/* Glass overlay header */}
                <div className="absolute top-4 left-4 right-4 z-[1000] pointer-events-none">
                  <div className="backdrop-blur-xl bg-black/60 rounded-2xl px-4 py-3 flex items-center justify-between border border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-white" />
                        <span
                          className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full"
                          style={{ animation: 'pulse-ring 2s cubic-bezier(0, 0, 0.2, 1) infinite' }}
                        />
                      </div>
                      <span className="text-white text-xs font-semibold">
                        {mapSpots.length > 0 ? `${mapSpots.length} spots live` : 'Loading spots...'}
                      </span>
                    </div>
                    <span className="text-white/50 text-[10px]">Click markers to explore</span>
                  </div>
                </div>

                {/* Floating stat chips over map */}
                {mapLoaded && (
                  <>
                    <FloatingCard delay={0.5} className="absolute bottom-4 left-4 z-[1000]">
                      <div className="backdrop-blur-xl bg-white/90 rounded-xl px-4 py-2.5 shadow-lg border border-white/50 flex items-center gap-2">
                        <Star className="w-3.5 h-3.5 fill-black text-black" />
                        <span className="text-xs font-bold">4.8</span>
                        <span className="text-[10px] text-gray-400">avg rating</span>
                      </div>
                    </FloatingCard>
                    <FloatingCard delay={1.2} className="absolute bottom-4 right-4 z-[1000]">
                      <div className="backdrop-blur-xl bg-emerald-500/90 rounded-xl px-4 py-2.5 shadow-lg flex items-center gap-2">
                        <span className="text-xs font-bold text-white">From ₹10/hr</span>
                      </div>
                    </FloatingCard>
                  </>
                )}

                {/* Gradient fade at bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white/20 to-transparent pointer-events-none z-[999]" />
              </div>

              {/* Decorative dots */}
              <div
                className="absolute -top-3 -right-3 w-3 h-3 bg-black rounded-full"
                style={{ animation: 'float-rotate 5s ease-in-out infinite' }}
              />
              <div
                className="absolute -bottom-2 -left-2 w-2 h-2 bg-gray-300 rounded-full"
                style={{ animation: 'float-rotate 7s ease-in-out infinite 1s' }}
              />
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-300" style={{ animation: 'hover 2s ease-in-out infinite' }}>
          <span className="text-[10px] uppercase tracking-widest">Scroll</span>
          <ChevronDown className="w-4 h-4" />
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section ref={stepsRef} className="py-24 sm:py-32 bg-gray-50 relative">
        {/* Floating particles in this section too */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <FloatingParticle delay={0} duration={9} left={20} size={4} opacity={0.05} />
          <FloatingParticle delay={3} duration={11} left={75} size={3} opacity={0.06} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
          <div
            className={`text-center mb-20 ${stepsVisible ? 'reveal-up' : 'opacity-0'}`}
            style={{ animationFillMode: 'both' }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 mb-4">Simple process</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight">How it works</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: MapPin,
                title: 'Search',
                desc: 'Explore the interactive map, search your destination, and discover parking spots with live availability.',
              },
              {
                step: '02',
                icon: CreditCard,
                title: 'Book & Pay',
                desc: 'Choose your time slot, select your spot, and pay securely. Get instant confirmation with a QR code.',
              },
              {
                step: '03',
                icon: QrCode,
                title: 'Scan & Park',
                desc: 'Show your QR code at entry. Drive in, park, and drive out. It\'s that simple.',
              },
            ].map((feature, idx) => (
              <div
                key={feature.step}
                className={`${stepsVisible ? 'reveal-up stagger-' + (idx + 1) : 'opacity-0'}`}
                style={{ animationFillMode: 'both' }}
              >
                <FloatingCard delay={idx * 0.5}>
                  <div className="group relative bg-white rounded-3xl p-8 border border-gray-100 hover:border-black transition-all duration-500 hover:shadow-2xl">
                    {/* Step number - floating */}
                    <span className="absolute -top-4 -right-2 text-7xl font-black text-gray-100 group-hover:text-gray-200 group-hover:-translate-y-2 transition-all duration-500 select-none">
                      {feature.step}
                    </span>
                    <div className="relative">
                      <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg">
                        <feature.icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                      <p className="text-gray-500 leading-relaxed">{feature.desc}</p>
                    </div>

                    {/* Bottom accent */}
                    <div className="absolute bottom-0 left-8 right-8 h-[2px] bg-black scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left rounded-full" />
                  </div>
                </FloatingCard>
              </div>
            ))}
          </div>

          {/* Connecting line between steps (desktop) */}
          <div className="hidden md:block absolute top-[55%] left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section ref={statsRef} className="py-20 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12">
            {[
              { value: '500+', label: 'Parking Spots', suffix: '' },
              { value: '10K+', label: 'Happy Users', suffix: '' },
              { value: '50+', label: 'Cities', suffix: '' },
              { value: '₹10', label: 'Starting Price', suffix: '/hr' },
            ].map((stat, idx) => (
              <div
                key={stat.label}
                className={`text-center ${statsVisible ? 'reveal-scale stagger-' + (idx + 1) : 'opacity-0'}`}
                style={{ animationFillMode: 'both' }}
              >
                <FloatingCard delay={idx * 0.3}>
                  <p className="text-4xl sm:text-5xl font-black tracking-tight">
                    {stat.value}<span className="text-gray-300 text-lg">{stat.suffix}</span>
                  </p>
                  <p className="text-gray-400 text-sm mt-2 font-medium">{stat.label}</p>
                </FloatingCard>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FOR HOSTS ===== */}
      <section ref={hostsRef} className="bg-black text-white py-24 sm:py-32 relative overflow-hidden">
        {/* Background particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[
            { delay: 0, duration: 10, left: 15, size: 3, opacity: 0.1 },
            { delay: 2, duration: 8, left: 50, size: 4, opacity: 0.08 },
            { delay: 4, duration: 12, left: 80, size: 3, opacity: 0.1 },
          ].map((p, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white pointer-events-none"
              style={{
                width: p.size,
                height: p.size,
                left: `${p.left}%`,
                bottom: '-20px',
                opacity: p.opacity,
                animation: `floatUp ${p.duration}s ${p.delay}s ease-out infinite`,
              }}
            />
          ))}
        </div>

        {/* Gradient orbs */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/[0.02] rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-white/[0.02] rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className={hostsVisible ? 'reveal-up' : 'opacity-0'} style={{ animationFillMode: 'both' }}>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-white/80 text-xs font-medium rounded-full mb-8 backdrop-blur-sm">
                <Zap className="w-3 h-3" />
                For parking space owners
              </div>
              <h2 className="text-4xl sm:text-6xl font-black leading-[0.95] tracking-tight">
                Turn empty
                <br />
                spaces into
                <br />
                <span className="text-gray-600 inline-block" style={{ animation: 'hoverSlow 5s ease-in-out infinite 0.5s' }}>
                  income.
                </span>
              </h2>
              <p className="text-gray-400 text-lg mt-8 leading-relaxed max-w-md">
                List your parking space, set your price, and start earning.
                We handle bookings, payments, and verification.
              </p>
              <Button
                variant="outline"
                size="lg"
                className="mt-10 border-white text-white hover:bg-white hover:text-black rounded-full px-8"
                onClick={() => navigate('/auth?mode=signup&role=host')}
              >
                Start Hosting
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            <div className={`space-y-4 ${hostsVisible ? '' : 'opacity-0'}`}>
              {[
                { icon: Clock, title: 'Flexible schedule', desc: 'Set your own availability. List full-time or just during peak hours.', delay: 0 },
                { icon: Shield, title: 'Verified users', desc: 'Every user is verified. Your space is in safe hands.', delay: 1 },
                { icon: Smartphone, title: 'Easy management', desc: 'Track bookings, earnings, and reviews from your dashboard.', delay: 2 },
              ].map((item, idx) => (
                <div
                  key={item.title}
                  className={hostsVisible ? `reveal-up stagger-${idx + 1}` : 'opacity-0'}
                  style={{ animationFillMode: 'both' }}
                >
                  <FloatingCard delay={idx * 0.6}>
                    <div className="flex gap-4 p-5 rounded-2xl bg-white/[0.05] border border-white/10 hover:bg-white/[0.08] hover:border-white/20 transition-all duration-300 backdrop-blur-sm group">
                      <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <item.icon className="w-5 h-5 text-white/70" />
                      </div>
                      <div>
                        <h4 className="font-bold">{item.title}</h4>
                        <p className="text-gray-500 text-sm mt-1 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  </FloatingCard>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="py-24 sm:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,0,0,0.03),_transparent_70%)]" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative">
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
            Ready to park smarter?
          </h2>
          <p className="text-gray-400 text-lg mt-4">
            Join thousands of users who never circle the block again.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button size="lg" onClick={() => navigate('/auth?mode=signup&role=user')} className="group rounded-full px-8">
              Get Started Free
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="py-8 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-black rounded-md flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">P</span>
              </div>
              <span className="text-lg font-bold">Parkly</span>
              <span className="text-xs text-gray-400">© 2026</span>
            </div>
            <div className="flex gap-6 text-sm text-gray-400">
              <a href="#" className="hover:text-black transition-colors">Privacy</a>
              <a href="#" className="hover:text-black transition-colors">Terms</a>
              <a href="#" className="hover:text-black transition-colors">Contact</a>
              <button onClick={() => navigate('/admin')} className="hover:text-black transition-colors">Admin</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
