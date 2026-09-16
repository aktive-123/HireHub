import { useEffect, useRef, useState } from 'react'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia(REDUCED_MOTION_QUERY).matches
}

export default function useInView({ threshold = 0.15, rootMargin = '0px 0px -40px 0px', once = false } = {}) {
  const ref = useRef(null)
  const [reducedMotion] = useState(() => prefersReducedMotion())
  const [inView, setInView] = useState(() => reducedMotion)

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
    return () => observer.disconnect()
  }, [reducedMotion, threshold, rootMargin, once])

  return [ref, inView]
}