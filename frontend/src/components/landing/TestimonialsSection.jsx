import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

const AUTO_DELAY = 4500
const RESUME_DELAY = 5000

const testimonials = [
  {
    id: 1,
    quote:
      '“HireHub made my job search so easy. I got hired within 2 weeks, and the platform is super user-friendly!”',
    name: 'Sarah Johnson',
    role: 'UI/UX Designer',
    avatarUrl:
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80',
  },
  {
    id: 2,
    quote:
      '“As an employer, HireHub helped us find the right talent quickly. The quality of candidates is amazing!”',
    name: 'David Okafor',
    role: 'CTO, TechSolutions',
    avatarUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
  },
  {
    id: 3,
    quote:
      '“I love how easy it is to track my applications and get updates. The platform truly supports job seekers!”',
    name: 'Blessing Adeyemi',
    role: 'Software Engineer',
    avatarUrl:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  },
]

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function TestimonialsSection() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const viewportRef = useRef(null)
  const slideRefs = useRef([])
  const resumeTimerRef = useRef(null)

  const reducedMotion = prefersReducedMotion()
  const count = testimonials.length

  useLayoutEffect(() => {
    const el = slideRefs.current[active]
    if (el && viewportRef.current) {
      viewportRef.current.style.height = `${el.offsetHeight}px`
    }
  }, [active])

  useEffect(() => {
    if (paused || reducedMotion || count < 2) return
    const id = setInterval(() => {
      setActive((a) => (a + 1) % count)
    }, AUTO_DELAY)
    return () => clearInterval(id)
  }, [paused, reducedMotion, count])

  useEffect(() => () => clearTimeout(resumeTimerRef.current), [])

  const pauseForInteraction = () => {
    setPaused(true)
    clearTimeout(resumeTimerRef.current)
    resumeTimerRef.current = setTimeout(() => setPaused(false), RESUME_DELAY)
  }

  const goTo = (i) => {
    pauseForInteraction()
    setActive(((i % count) + count) % count)
  }

  const next = () => {
    pauseForInteraction()
    setActive((a) => (a + 1) % count)
  }

  const prev = () => {
    pauseForInteraction()
    setActive((a) => (a - 1 + count) % count)
  }

  return (
    <section className="hh-section-space bg-white">
      <div className="page-container">
        {/* Header Row */}
        <div className="d-flex align-items-end justify-content-between mb-5 flex-wrap gap-3">
          <div>
            <div className="hh-section-eyebrow">TESTIMONIALS</div>
            <h2 className="hh-section-title mb-2">What Our Users Say</h2>
            <p className="hh-section-subtitle">
              Real stories from real people who found career success on HireHub.
            </p>
          </div>
          <Link to="/about" className="hh-btn hh-btn-outline-primary hh-btn-sm hh-btn-pill">
            View more testimonials <i className="bi bi-arrow-right hh-btn-arrow ms-1" aria-hidden="true" />
          </Link>
        </div>

        {/* Auto-advancing Testimonial Carousel */}
        <div
          className="hh-testimonial-carousel"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="hh-testimonial-viewport" ref={viewportRef}>
            <div
              className="hh-testimonial-track"
              style={{ transform: `translateX(-${active * 100}%)` }}
            >
              {testimonials.map((t, i) => (
                <article
                  key={t.id}
                  ref={(el) => { slideRefs.current[i] = el }}
                  className="hh-testimonial-slide hh-testimonial-card"
                  aria-hidden={i !== active}
                >
                  <p className="hh-testimonial-quote">{t.quote}</p>

                  <div className="hh-testimonial-user">
                    <img
                      src={t.avatarUrl}
                      alt={t.name}
                      className="hh-testimonial-avatar"
                      loading="lazy"
                    />
                    <div>
                      <div className="hh-testimonial-name">{t.name}</div>
                      <div className="hh-testimonial-role">{t.role}</div>
                      <div className="hh-rating-stars" aria-label="5 out of 5 stars">
                        <i className="bi bi-star-fill" />
                        <i className="bi bi-star-fill" />
                        <i className="bi bi-star-fill" />
                        <i className="bi bi-star-fill" />
                        <i className="bi bi-star-fill" />
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="hh-testimonial-controls">
            <button
              type="button"
              className="hh-testimonial-nav"
              onClick={prev}
              aria-label="Previous testimonial"
            >
              <i className="bi bi-chevron-left" aria-hidden="true" />
            </button>

            <div className="hh-testimonial-dots" role="tablist" aria-label="Choose testimonial">
              {testimonials.map((t, i) => (
                <button
                  key={t.id}
                  type="button"
                  className={`hh-testimonial-dot ${i === active ? 'is-active' : ''}`}
                  onClick={() => goTo(i)}
                  aria-label={`Show testimonial from ${t.name}`}
                  aria-selected={i === active}
                  role="tab"
                />
              ))}
            </div>

            <button
              type="button"
              className="hh-testimonial-nav"
              onClick={next}
              aria-label="Next testimonial"
            >
              <i className="bi bi-chevron-right" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}