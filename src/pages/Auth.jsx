
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ui/Toast'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { ROLES } from '../lib/constants'
import { insforge } from '../lib/insforge'

export default function Auth() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, role: currentRole, signIn, signUp, refreshSession } = useAuth()
  const toast = useToast()

  const [mode, setMode] = useState(searchParams.get('mode') || 'signin')
  const [role, setRole] = useState(searchParams.get('role') || ROLES.USER)
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verifyEmail, setVerifyEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  })

  useEffect(() => {
    if (user && currentRole) {
      const redirectMap = {
        [ROLES.USER]: '/explore',
        [ROLES.HOST]: '/host/dashboard',
        [ROLES.ADMIN]: '/admin/dashboard',
      }
      navigate(redirectMap[currentRole] || '/dashboard', { replace: true })
    }
  }, [user, currentRole, navigate])

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'signup') {
        const data = await signUp(form.email, form.password, form.name, role)
        if (data?.requireEmailVerification) {
          setVerifyEmail(form.email)
          setVerifying(true)
          toast('Check your email for the 6-digit verification code', 'success')
        } else {
          toast('Account created successfully!', 'success')
        }
      } else {
        await signIn(form.email, form.password)
        toast('Welcome back!', 'success')
      }
    } catch (err) {
      toast(err.message || 'Something went wrong', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data, error } = await insforge.auth.verifyEmail({
        email: verifyEmail,
        otp,
      })
      if (error) throw error
      toast('Email verified! You are now signed in.', 'success')
      // verifyEmail auto-saves session — refresh user + profile in context
      await refreshSession()
    } catch (err) {
      toast(err.message || 'Invalid or expired code', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    try {
      await insforge.auth.resendVerificationEmail({ email: verifyEmail })
      toast('Verification code resent', 'success')
    } catch (err) {
      toast(err.message || 'Failed to resend', 'error')
    }
  }

  // Verification step
  if (verifying) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <h1 className="text-3xl font-bold mb-2">Verify your email</h1>
          <p className="text-gray-500 mb-8">
            Enter the 6-digit code sent to <span className="font-medium text-black">{verifyEmail}</span>
          </p>
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <Input
              placeholder="Enter 6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="text-center text-2xl tracking-[0.5em] font-mono"
              maxLength={6}
              required
            />
            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Verify
            </Button>
          </form>
          <button
            onClick={handleResendCode}
            className="mt-4 text-sm text-gray-500 hover:text-black"
          >
            Didn't receive the code? Resend
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">
            {mode === 'signin' ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="text-gray-500 mt-2">
            {mode === 'signin'
              ? 'Sign in to your Parkly account'
              : 'Get started with Parkly'}
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              mode === 'signin' ? 'bg-black text-white' : 'text-gray-500'
            }`}
            onClick={() => setMode('signin')}
          >
            Sign In
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              mode === 'signup' ? 'bg-black text-white' : 'text-gray-500'
            }`}
            onClick={() => setMode('signup')}
          >
            Sign Up
          </button>
        </div>

        {/* Role selector (sign up only) */}
        {mode === 'signup' && (
          <div className="flex gap-3 mb-6">
            <button
              className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                role === ROLES.USER
                  ? 'border-black bg-black text-white'
                  : 'border-gray-200 text-gray-500 hover:border-gray-400'
              }`}
              onClick={() => setRole(ROLES.USER)}
            >
              I need parking
            </button>
            <button
              className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                role === ROLES.HOST
                  ? 'border-black bg-black text-white'
                  : 'border-gray-200 text-gray-500 hover:border-gray-400'
              }`}
              onClick={() => setRole(ROLES.HOST)}
            >
              I have parking
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <>
              <Input
                label="Full Name"
                name="name"
                placeholder="John Doe"
                value={form.name}
                onChange={handleChange}
                required
              />
              <Input
                label="Phone"
                name="phone"
                type="tel"
                placeholder="+91 9876543210"
                value={form.phone}
                onChange={handleChange}
              />
            </>
          )}
          <Input
            label="Email"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
            required
          />
          <Input
            label="Password"
            name="password"
            type="password"
            placeholder="Min 6 characters"
            value={form.password}
            onChange={handleChange}
            required
            minLength={6}
          />
          <Button type="submit" className="w-full" size="lg" loading={loading}>
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          {mode === 'signin' ? (
            <>
              Don&apos;t have an account?{' '}
              <button className="text-black font-medium hover:underline" onClick={() => setMode('signup')}>
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button className="text-black font-medium hover:underline" onClick={() => setMode('signin')}>
                Sign in
              </button>
            </>
          )}
        </p>

        <button
          onClick={() => navigate('/admin')}
          className="block mx-auto mt-8 text-xs text-gray-300 hover:text-gray-500 transition-colors"
        >
          Admin Portal
        </button>
      </div>
    </div>
  )
}
