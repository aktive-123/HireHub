import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { seekerApi } from '../services/api'
import { useAuth } from './AuthContext'

const SavedJobsContext = createContext(null)

export function SavedJobsProvider({ children }) {
  const { role } = useAuth()
  const [ids, setIds] = useState(() => new Set())
  const [ready, setReady] = useState(false)

  const refresh = useCallback(async () => {
    if (role !== 'seeker') {
      setIds(new Set())
      setReady(true)
      return
    }
    setReady(false)
    try {
      const items = await seekerApi.savedJobs()
      setIds(new Set(items.map((item) => Number(item.id)).filter(Boolean)))
    } catch {
      setIds(new Set())
    } finally {
      setReady(true)
    }
  }, [role])

  useEffect(() => {
    refresh()
  }, [refresh])

  const isSaved = useCallback((jobId) => ids.has(Number(jobId)), [ids])

  const toggleSave = useCallback(
    async (jobId, next) => {
      const id = Number(jobId)
      if (next) await seekerApi.saveJob(id)
      else await seekerApi.unSaveJob(id)
      setIds((prev) => {
        const copy = new Set(prev)
        if (next) copy.add(id)
        else copy.delete(id)
        return copy
      })
    },
    []
  )

  const value = useMemo(
    () => ({ ids, isSaved, toggleSave, refresh, ready }),
    [ids, isSaved, toggleSave, refresh, ready]
  )

  return <SavedJobsContext.Provider value={value}>{children}</SavedJobsContext.Provider>
}

export function useSavedJobs() {
  const ctx = useContext(SavedJobsContext)
  if (!ctx) throw new Error('useSavedJobs must be used within a SavedJobsProvider')
  return ctx
}