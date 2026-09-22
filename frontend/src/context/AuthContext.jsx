import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { authApi } from '../services/api'
import { clearSession, setAuthToken } from '../services/api/client'

const AuthContext = createContext(null)

const USER_KEY = 'hh_user'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY)) ?? null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('hh_token')))
  const [bootstrapped, setBootstrapped] = useState(false)

  useEffect(() => {
    let active = true
    const token = localStorage.getItem('hh_token')
    if (!token) {
      setBootstrapped(true)
      return
    }
    authApi
      .me()
      .then(async (payload) => {
        if (!active) return
        const next = payload.user ?? null
        localStorage.setItem(USER_KEY, JSON.stringify(next))
        setUser(next)
      })
      .catch(() => {
        if (!active) return
        clearSession()
        setUser(null)
      })
      .finally(() => {
        if (active) {
          setLoading(false)
          setBootstrapped(true)
        }
      })
    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const payload = await authApi.login(email, password)
    setAuthToken(payload.token)
    const next = payload.user ?? null
    if (next) localStorage.setItem(USER_KEY, JSON.stringify(next))
    setUser(next)
    return next
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // Ignore network errors on logout — clear locally regardless.
    }
    clearSession()
    setUser(null)
  }, [])

  const setSession = useCallback((payload) => {
    setAuthToken(payload.token)
    const next = payload.user ?? null
    if (next) localStorage.setItem(USER_KEY, JSON.stringify(next))
    setUser(next)
  }, [])

  const refresh = useCallback(async () => {
    const payload = await authApi.me()
    const next = payload.user ?? null
    if (next) localStorage.setItem(USER_KEY, JSON.stringify(next))
    setUser(next)
    return next
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      role: user?.role ?? null,
      loading,
      bootstrapped,
      login,
      logout,
      setSession,
      refresh,
    }),
    [user, loading, bootstrapped, login, logout, setSession, refresh]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}