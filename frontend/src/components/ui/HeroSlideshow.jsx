import { useEffect, useMemo, useState } from 'react'

export default function HeroSlideshow({
  images = [],
  interval = 6000,
  className = '',
  overlay = true,
}) {
  const [index, setIndex] = useState(0)

  const reduceMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )

  useEffect(() => {
    if (reduceMotion || images.length <= 1) return undefined
    const id = setInterval(() => setIndex((i) => (i + 1) % images.length), interval)
    return () => clearInterval(id)
  }, [reduceMotion, images.length, interval])

  if (!images.length) return null

  return (
    <div className={`hh-hero-slideshow ${className}`} aria-hidden="true">
      {images.map((src, i) => (
        <div
          key={src}
          className={`hh-hero-slideshow-slide ${i === index ? 'is-active' : ''}`}
        >
          <img
            src={src}
            alt=""
            className="hh-hero-slideshow-img"
            loading={i === 0 ? 'eager' : 'lazy'}
            decoding="async"
          />
        </div>
      ))}
      {overlay && <div className="hh-hero-slideshow-overlay" />}
    </div>
  )
}