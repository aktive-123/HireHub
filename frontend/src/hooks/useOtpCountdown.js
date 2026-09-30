import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Counts the resend cooldown down to zero.
 *
 * `seconds` is the value the server reported, not a number invented here, so
 * the browser and the API never disagree about when a new code may be asked
 * for. The countdown is only a courtesy: the endpoint enforces the same limit
 * server side, so a tampered timer cannot buy an extra email.
 *
 * The tick is driven by a wall-clock deadline rather than by decrementing a
 * counter, so a backgrounded tab does not silently lose a minute and come back
 * offering a resend the server will refuse.
 */
export default function useOtpCountdown(initialSeconds = 0) {
  const [seconds, setSeconds] = useState(() => Math.max(0, Math.ceil(initialSeconds || 0)))
  const deadline = useRef(null)

  const start = useCallback((value) => {
    const total = Math.max(0, Math.ceil(Number(value) || 0))

    deadline.current = total > 0 ? Date.now() + total * 1000 : null
    setSeconds(total)
  }, [])

  const stop = useCallback(() => {
    deadline.current = null
    setSeconds(0)
  }, [])

  useEffect(() => {
    // One interval for the lifetime of the component rather than one per tick.
    // Re-creating it on every state change would reset the phase and make the
    // displayed second drift out of step with the real deadline.
    const id = setInterval(() => {
      if (!deadline.current) return

      const remaining = Math.ceil((deadline.current - Date.now()) / 1000)

      if (remaining <= 0) {
        deadline.current = null
        setSeconds(0)
        return
      }

      setSeconds(remaining)
    }, 1000)

    return () => clearInterval(id)
  }, [])

  return { seconds, canResend: seconds <= 0, start, stop }
}
