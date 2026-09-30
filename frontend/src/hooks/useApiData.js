import { useCallback, useEffect, useRef, useState } from 'react'

export function useApiData(loader, deps = [], { initial = null, enabled = true } = {}) {
  const [data, setData] = useState(initial)
  const [loading, setLoading] = useState(Boolean(enabled))
  const [error, setError] = useState(null)
  const loaderRef = useRef(loader)

  useEffect(() => {
    loaderRef.current = loader
  }, [loader])

  const reload = useCallback(async () => {
    if (!loaderRef.current) return undefined
    setLoading(true)
    setError(null)
    try {
      const result = await loaderRef.current()
      setData(result)
      return result
    } catch (err) {
      // Recorded in state for the error branch to render, but deliberately not
      // re-thrown: most callers wire this straight to onClick, where a
      // rejection becomes an unhandled promise, and the ones that do await it
      // sit inside a try/catch for the primary action and would otherwise
      // report a failed refresh as a failed save.
      setError(err)
      return undefined
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps ?? [])

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    loaderRef
      .current?.()
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch((err) => {
        if (!cancelled) setError(err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps ?? [])

  return { data, loading, error, reload, setData }
}