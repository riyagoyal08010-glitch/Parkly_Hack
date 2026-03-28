import { createContext, useContext, useState, useEffect } from 'react'
import { insforge } from '../lib/insforge'
import { ROLES } from '../lib/constants'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId) => {
    const { data, error } = await insforge.database
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (!error && data) {
      setProfile(data)
    }
    return data
  }

  // Re-initialize user + profile from current session (useful after OTP verify)
  const refreshSession = async () => {
    try {
      const { data } = await insforge.auth.getCurrentUser()
      if (data?.user) {
        setUser(data.user)
        // If user just verified email, apply the pending role
        if (pendingRole && pendingRole !== ROLES.USER) {
          await insforge.database
            .from('profiles')
            .update({ role: pendingRole })
            .eq('id', data.user.id)
        }
        await fetchProfile(data.user.id)
        return data.user
      }
    } catch (e) {
      console.error('Refresh session error:', e)
    }
    return null
  }

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await insforge.auth.getCurrentUser()
        if (data?.user) {
          setUser(data.user)
          await fetchProfile(data.user.id)
        }
      } catch (e) {
        console.error('Auth init error:', e)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  // Store the intended role so we can set it after email verification
  const [pendingRole, setPendingRole] = useState(ROLES.USER)

  const signUp = async (email, password, name, role = ROLES.USER) => {
    setPendingRole(role)
    const { data, error } = await insforge.auth.signUp({
      email,
      password,
      name,
      data: { role, name },
    })
    if (error) throw error
    if (data?.accessToken) {
      // No email verification required — user is signed in immediately
      const { data: userData } = await insforge.auth.getCurrentUser()
      if (userData?.user) {
        setUser(userData.user)
        // Update profile role directly (trigger defaults to 'user')
        await insforge.database
          .from('profiles')
          .update({ role, name })
          .eq('id', userData.user.id)
        await fetchProfile(userData.user.id)
      }
    }
    return { ...data, _pendingRole: role }
  }

  const signIn = async (email, password) => {
    const { data, error } = await insforge.auth.signInWithPassword({ email, password })
    if (error) throw error
    setUser(data.user)
    await fetchProfile(data.user.id)
    return data
  }

  const signOut = async () => {
    await insforge.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const value = {
    user,
    profile,
    role: profile?.role || null,
    loading,
    signUp,
    signIn,
    signOut,
    fetchProfile,
    refreshSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
