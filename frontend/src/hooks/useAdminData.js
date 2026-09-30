import { useEffect, useState } from 'react'

// Loads an admin list from the API, seeding with the provided fallback
// (mock) data while the request is in flight and on failure so the admin
// console stays usable even without the backend running.
//
// Also returns a `refetch` so mutations made elsewhere in the page (create,
// update, delete) can refresh the table straight away instead of waiting for
// a remount, plus `loading`/`error` so a failed save is visible rather than
// silently falling back to mock rows.
//
// `meta` carries the API's pagination envelope (total, current_page, ...)
// through unchanged. Lists that fall back to a fixed mock array have no server
// pagination, so `meta` stays null and callers should derive a total from the
// items instead.
export function useAdminList(fetcher, fallback, deps = []) {
  const [items, setItems] = useState(fallback)
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [reloadToken, setReloadToken] = useState(0)

  const refetch = () => setReloadToken((n) => n + 1)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    fetcher()
      .then((result) => {
        if (!active) return
        const next = result?.items ?? result ?? []
        setItems(next)
        setMeta(result?.meta ?? null)
      })
      .catch((err) => {
        if (active) {
          setItems(fallback)
          // Clear stale pagination so a failed request cannot leave the old
          // total on screen next to fallback rows.
          setMeta(null)
          setError(err)
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadToken])

  return { items, meta, refetch, loading, error }
}

// Same idea but for a single object payload (dashboard, reports, settings).
export function useAdminData(fetcher, fallback, deps = []) {
  const [data, setData] = useState(fallback)

  useEffect(() => {
    let active = true
    setData(fallback)
    fetcher()
      .then((result) => {
        if (active) setData(result)
      })
      .catch(() => {
        if (active) setData(fallback)
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return data
}