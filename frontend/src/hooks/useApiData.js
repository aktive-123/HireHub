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
    if (!loaderRef.current) return
    setLoading(true)
    setError(null)
    try {
      const result = await loaderRef.current()
      setData(result)
      return result
    } catch (err) {
      setError(err)
      throw err
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