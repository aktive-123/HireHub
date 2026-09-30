import { useCallback, useEffect, useState } from 'react'
import { authApi } from '../services/api'

/**
 * Loads and persists the signed-in user's account settings.
 *
 * The settings screens used to show a green confirmation without persisting
 * anything, so this hook keeps the truth in one place: `dirty` is derived from
 * the last saved snapshot, the save button is disabled unless something really
 * changed, and a failed save surfaces the server's message instead of a
 * reassuring message that is not true.
 */
const DEFAULTS = {
  name: '',
  phone: '',
  timezone: 'UTC',
  two_factor_enabled: false,
  email_preferences: {},
  notification_preferences: {},
  privacy_preferences: {},
}

export function useAccountSettings() {
  const [settings, setSettings] = useState(DEFAULTS)
  const [saved, setSaved] = useState(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    let active = true

    authApi
      .settings()
      .then((data) => {
        if (!active || !data) return
        const next = { ...DEFAULTS, ...data }
        setSettings(next)
        setSaved(next)
      })
      .catch((err) => {
        if (active) setError(err)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const update = useCallback((patch) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }, [])

  // A nested preference object must be replaced wholesale, otherwise
  // `dirty` would compare the same reference and never see a toggle.
  const setPreference = useCallback((group, key, value) => {
    setSettings((prev) => ({
      ...prev,
      [group]: { ...(prev[group] ?? {}), [key]: value },
    }))
  }, [])

  const reset = useCallback(() => {
    setSettings(saved)
    setError(null)
  }, [saved])

  const save = useCallback(async () => {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const data = await authApi.updateSettings({
        name: settings.name,
        phone: settings.phone,
        timezone: settings.timezone,
        two_factor_enabled: settings.two_factor_enabled,
        email_preferences: settings.email_preferences,
        notification_preferences: settings.notification_preferences,
        privacy_preferences: settings.privacy_preferences,
      })
      const next = { ...DEFAULTS, ...(data ?? settings) }
      setSettings(next)
      setSaved(next)
      setMessage('Your settings have been updated.')
      return true
    } catch (err) {
      setError(err)
      return false
    } finally {
      setSaving(false)
    }
  }, [settings])

  return {
    settings,
    loading,
    saving,
    error,
    message,
    dirty: JSON.stringify(settings) !== JSON.stringify(saved),
    update,
    setPreference,
    reset,
    save,
    setError,
    clearMessage: useCallback(() => setMessage(null), []),
  }
}
