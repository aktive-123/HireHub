import { useEffect, useRef, useState } from 'react'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia(REDUCED_MOTION_QUERY).matches
}

const FALLBACK_TIMEOUT = 1200

const supportsIntersectionObserver =
  typeof IntersectionObserver !== 'undefined'

export default function useInView({ threshold = 0.15, rootMargin = '0px 0px -40px 0px', once = false } = {}) {
  const ref = useRef(null)
  const [reducedMotion] = useState(() => prefersReducedMotion())
  const [inView, setInView] = useState(() => reducedMotion || !supportsIntersectionObserver)

  useEffect(() => {
    if (reducedMotion) return
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (once) {
          if (entry.isIntersecting) {
            setInView(true)
            observer.unobserve(entry.target)
          }
        } else {
          setInView(entry.isIntersecting)
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(el)

    const fallback = setTimeout(() => setInView(true), FALLBACK_TIMEOUT)

    return () => {
      observer.disconnect()
      clearTimeout(fallback)
    }
  }, [reducedMotion, threshold, rootMargin, once])

  return [ref, inView]
}