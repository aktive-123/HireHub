import { useEffect, useState } from 'react'
import { apiClient } from '../../services/api/client'
import './DevStatusBadge.css'

/**
 * Development-only connection badge.
 *
 * Answers the two questions that otherwise require asking someone: "which port
 * am I on?" and "is the API actually up?". The SPA proxies /api through Vite,
 * so a dead API looks identical to a broken page — this separates the two.
 *
 * Stripped from production builds by the `import.meta.env.DEV` guard, so it
 * never ships and costs nothing there.
 */
const CHECK_INTERVAL_MS = 10000

function useApiHealth() {
  const [state, setState] = useState('checking')

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    const check = async () => {
      try {
        const res = await apiClient.xhr('/v1/health', { signal: controller.signal })
        if (!cancelled) setState(res.ok ? 'up' : 'down')
      } catch (err) {
        // An aborted request is our own unmount/teardown, not a failure.
        if (cancelled || err?.name === 'AbortError') return
        setState('down')
      }
    }

    check()
    const timer = setInterval(check, CHECK_INTERVAL_MS)
    return () => {
      cancelled = true
      controller.abort()
      clearInterval(timer)
    }
  }, [])

  return state
}

const LABEL = {
  checking: 'checking API',
  up: 'API connected',
  down: 'API unreachable',
}

export default function DevStatusBadge() {
  const health = useApiHealth()
  const origin = window.location.origin
  const apiBase = `${origin}${apiClient.baseUrl}`

  return (
    <div className="dev-status" role="status" aria-live="polite">
      <span className="dev-status__row">
        <span className={`dev-status__dot dev-status__dot--${health}`} aria-hidden="true" />
        <span className="dev-status__label">{LABEL[health]}</span>
      </span>
      <span className="dev-status__row">
        <span className="dev-status__key">web</span>
        <span className="dev-status__value">{origin}</span>
      </span>
      <span className="dev-status__row">
        <span className="dev-status__key">api</span>
        <span className="dev-status__value">{apiBase}</span>
      </span>
    </div>
  )
}
