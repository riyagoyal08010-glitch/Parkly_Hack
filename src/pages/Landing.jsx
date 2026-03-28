import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/Button'
import { MapPin, CreditCard, QrCode, Clock, Shield, Smartphone, ArrowRight, Car, Star, Zap } from 'lucide-react'
import { ROLES } from '../lib/constants'

export default function Landing() {
  const navigate = useNavigate()
  const { user, role } = useAuth()

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

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-gray-100 via-white to-white" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-20 sm:pb-32">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-black text-white text-xs font-medium rounded-full mb-8">
              <Zap className="w-3 h-3" />
              Now available in 50+ cities across India
            </div>
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[0.9]">
              Park
              <br />
              <span className="text-gray-300">Smarter.</span>
            </h1>
            <p className="mt-8 text-lg sm:text-xl text-gray-500 max-w-xl leading-relaxed">
              Find, book, and access parking spots instantly.
              One QR code. Zero hassle. From ₹10/hr.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Button size="lg" onClick={() => navigate('/auth?mode=signup&role=user')} className="group">
                Find Parking
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/auth?mode=signup&role=host')}>
                List Your Space
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="mt-12 flex items-center gap-8 text-sm text-gray-400">
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-black text-black" />
                <span><strong className="text-black">4.8</strong> avg rating</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Car className="w-4 h-4 text-black" />
                <span><strong className="text-black">10,000+</strong> bookings</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-black" />
                <span>Secure payments</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works - numbered steps */}
      <section className="py-20 sm:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold">How it works</h2>
            <p className="text-gray-400 mt-3 text-lg">Three steps to hassle-free parking</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                icon: MapPin,
                title: 'Search',
                desc: 'Explore the map, search your destination, and find available parking spots with real-time availability.',
              },
              {
                step: '02',
                icon: CreditCard,
                title: 'Book & Pay',
                desc: 'Choose your time slot, pay securely via Razorpay, and get instant booking confirmation.',
              },
              {
                step: '03',
                icon: QrCode,
                title: 'Scan & Park',
                desc: 'Show your unique QR code at entry. Drive in, park, and drive out. That simple.',
              },
            ].map((feature) => (
              <div
                key={feature.step}
                className="group relative bg-white rounded-2xl p-8 border border-gray-100 hover:border-black hover:shadow-xl transition-all duration-300"
              >
                <span className="text-6xl font-black text-gray-100 group-hover:text-gray-200 transition-colors absolute top-6 right-6">
                  {feature.step}
                </span>
                <div className="relative">
                  <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                    <feature.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats banner */}
      <section className="py-16 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '500+', label: 'Parking Spots' },
              { value: '10K+', label: 'Happy Users' },
              { value: '50+', label: 'Cities' },
              { value: '₹10', label: 'Starting Price' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl sm:text-4xl font-extrabold tracking-tight">{stat.value}</p>
                <p className="text-gray-400 text-sm mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Hosts */}
      <section className="bg-black text-white py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 text-white/80 text-xs font-medium rounded-full mb-6">
                For parking space owners
              </div>
              <h2 className="text-3xl sm:text-5xl font-bold leading-tight">
                Turn empty
                <br />
                spaces into
                <br />
                <span className="text-gray-500">income.</span>
              </h2>
              <p className="text-gray-400 text-lg mt-6 leading-relaxed">
                List your parking space, set your price, and start earning.
                We handle bookings, payments, and verification.
              </p>
              <Button
                variant="outline"
                size="lg"
                className="mt-8 border-white text-white hover:bg-white hover:text-black"
                onClick={() => navigate('/auth?mode=signup&role=host')}
              >
                Start Hosting
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
            <div className="space-y-4">
              {[
                { icon: Clock, title: 'Flexible schedule', desc: 'Set your own availability. List full-time or just during peak hours.' },
                { icon: Shield, title: 'Verified users', desc: 'Every user is verified. Your space is in safe hands.' },
                { icon: Smartphone, title: 'Easy management', desc: 'Track bookings, earnings, and reviews from your dashboard.' },
              ].map((item) => (
                <div key={item.title} className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
                    <item.icon className="w-5 h-5 text-white/70" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{item.title}</h4>
                    <p className="text-gray-500 text-sm mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
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
