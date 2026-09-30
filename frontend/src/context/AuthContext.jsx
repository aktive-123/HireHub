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
      .catch((err) => {
        if (!active) return

        // Only a real 401 means the token is no longer accepted. Everything else
        // — the API being down, a 500, a 429, the browser being offline — says
        // nothing about whether this session is still valid, and signing the
        // user out on a transient failure is exactly how a public page ends up
        // showing "logged out" while a perfectly good token sits in storage.
        //
        // Nothing needs doing here even for a 401: the API client has already
        // cleared the session and fired `hh:session-expired`, which the listener
        // below turns into a null user. Leaving the cached user in place keeps
        // the navbar stable while that round trip finishes.
        if (err?.status === 401 || err?.status === 419) return

        setUser((current) => current)
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

  /**
   * Revoke every token on the account, not just this browser's. This is the
   * action to take when a device may have been stolen, so it deliberately
   * leaves the user signed out everywhere including here.
   */
  const logoutAll = useCallback(async () => {
    try {
      await authApi.logoutAll()
    } finally {
      clearSession()
      setUser(null)
    }
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

  useEffect(() => {
    const onSessionExpired = () => {
      setUser(null)
    }
    window.addEventListener('hh:session-expired', onSessionExpired)
    return () => window.removeEventListener('hh:session-expired', onSessionExpired)
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
      logoutAll,
      setSession,
      refresh,
    }),
    [user, loading, bootstrapped, login, logout, logoutAll, setSession, refresh]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}