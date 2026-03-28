import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ui/Toast'
import { Button } from '../components/ui/Button'
import { Shield, Lock, ArrowRight, Eye, EyeOff, UserPlus, LogIn } from 'lucide-react'
import { insforge } from '../lib/insforge'
import { ROLES } from '../lib/constants'

const COMPANY_CODE = 'PARKLY2026'

export default function AdminLogin() {
  const navigate = useNavigate()
  const { signIn, signUp, signOut, refreshSession } = useAuth()
  const toast = useToast()

  const [step, setStep] = useState('code') // 'code' | 'auth'
  const [authMode, setAuthMode] = useState('signin') // 'signin' | 'signup' | 'verify'
  const [companyCode, setCompanyCode] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [codeError, setCodeError] = useState('')

  const handleCodeSubmit = (e) => {
    e.preventDefault()
    if (companyCode === COMPANY_CODE) {
      setStep('auth')
      setCodeError('')
    } else {
      setCodeError('Invalid company code')
    }
  }

  const handleSignIn = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await signIn(email, password)
      const { data: profileData } = await insforge.database
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()
      if (profileData?.role !== 'admin') {
        await signOut()
        toast('Access denied. This account is not an admin.', 'error')
        return
      }
      toast('Welcome, Admin!', 'success')
      navigate('/admin/dashboard', { replace: true })
    } catch (err) {
      toast(err.message || 'Authentication failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await signUp(email, password, name, ROLES.ADMIN)
      if (data?.requireEmailVerification) {
        setAuthMode('verify')
        toast('Check your email for the 6-digit verification code', 'success')
      } else {
        // No verification needed — set admin role and go
        toast('Admin account created!', 'success')
        navigate('/admin/dashboard', { replace: true })
      }
    } catch (err) {
      toast(err.message || 'Sign up failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await insforge.auth.verifyEmail({ email, otp })
      if (error) throw error
      // Refresh session — this also applies the pending admin role
      await refreshSession()
      toast('Email verified! Welcome, Admin.', 'success')
      navigate('/admin/dashboard', { replace: true })
    } catch (err) {
      toast(err.message || 'Invalid or expired code', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    try {
      await insforge.auth.resendVerificationEmail({ email })
      toast('Verification code resent', 'success')
    } catch (err) {
      toast(err.message || 'Failed to resend', 'error')
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-black" />
          </div>
          <h1 className="text-3xl font-bold text-white">Admin Portal</h1>
          <p className="text-gray-500 mt-2 text-sm">Parkly Management Console</p>
        </div>

        {/* Step 1: Company Code */}
        {step === 'code' && (
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-4 h-4 text-gray-400" />
                <label className="text-sm font-medium text-gray-300">Company Access Code</label>
              </div>
              <input
                type="password"
                value={companyCode}
                onChange={(e) => { setCompanyCode(e.target.value); setCodeError('') }}
                placeholder="Enter company code"
                className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-white/30 font-mono tracking-widest text-center text-lg"
                required
              />
              {codeError && (
                <p className="text-red-400 text-xs mt-2 text-center">{codeError}</p>
              )}
            </div>
            <Button type="submit" size="lg" className="w-full bg-white text-black hover:bg-gray-200 rounded-xl">
              Verify Code
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>
        )}

        {/* Step 2: Auth (Sign In / Sign Up / Verify) */}
        {step === 'auth' && authMode === 'verify' && (
          <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
              <h3 className="text-white font-semibold mb-1">Verify your email</h3>
              <p className="text-gray-500 text-sm mb-4">
                Enter the 6-digit code sent to <span className="text-white font-medium">{email}</span>
              </p>
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white text-center text-2xl font-mono tracking-[0.5em] placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-white/30"
                  required
                />
                <Button type="submit" size="lg" loading={loading} className="w-full bg-white text-black hover:bg-gray-200 rounded-xl">
                  Verify & Enter
                </Button>
              </form>
              <button onClick={handleResendCode} className="mt-3 text-xs text-gray-600 hover:text-gray-400">
                Didn't get the code? Resend
              </button>
            </div>
          </div>
        )}

        {step === 'auth' && authMode !== 'verify' && (
          <>
            {/* Auth mode toggle */}
            <div className="flex bg-white/5 rounded-xl p-1 mb-6 border border-white/10">
              <button
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
                  authMode === 'signin' ? 'bg-white text-black' : 'text-gray-500'
                }`}
                onClick={() => setAuthMode('signin')}
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
              <button
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
                  authMode === 'signup' ? 'bg-white text-black' : 'text-gray-500'
                }`}
                onClick={() => setAuthMode('signup')}
              >
                <UserPlus className="w-4 h-4" />
                Sign Up
              </button>
            </div>

            <form onSubmit={authMode === 'signin' ? handleSignIn : handleSignUp} className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2 px-2 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <Shield className="w-3 h-3 text-green-400" />
                  <span className="text-xs text-green-400">Company code verified</span>
                </div>

                {authMode === 'signup' && (
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-1 block">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-white/30"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-300 mb-1 block">Admin Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@parkly.app"
                    className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-white/30"
                    required
                  />
                </div>
                <div className="relative">
                  <label className="text-sm font-medium text-gray-300 mb-1 block">Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={authMode === 'signup' ? 'Min 6 characters' : 'Enter password'}
                    className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-white/30 pr-12"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 bottom-3 text-gray-500 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" size="lg" loading={loading} className="w-full bg-white text-black hover:bg-gray-200 rounded-xl">
                {authMode === 'signin' ? 'Sign In as Admin' : 'Create Admin Account'}
              </Button>
            </form>

            <button
              type="button"
              onClick={() => setStep('code')}
              className="w-full text-center text-sm text-gray-600 hover:text-gray-400 mt-4"
            >
              Back to code entry
            </button>
          </>
        )}

        <p className="text-center text-xs text-gray-700 mt-8">
          Authorized personnel only. All access is logged.
        </p>
      </div>
    </div>
  )
}
