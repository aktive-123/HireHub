import { useEffect, useRef } from 'react'
import Reveal from '../ui/Reveal'

export default function WhyChooseUsSection() {
  const features = [
    {
      icon: 'shield-check',
      title: 'Verified Companies',
      desc: 'Work with vetted, trusted, and reputable employers across industries.',
    },
    {
      icon: 'file-earmark-check',
      title: 'Easy Applications',
      desc: 'Apply to opportunities in minutes using your standardized profile and CV.',
    },
    {
      icon: 'kanban',
      title: 'Applicant Tracking',
      desc: 'Track the status of your applications in real-time from review to offer.',
    },
    {
      icon: 'rocket-takeoff',
      title: 'Career Growth',
      desc: 'Discover remote, hybrid, and on-site roles aligned with your career ambition.',
    },
  ]

  const imageCardRef = useRef(null)
  const imageRef = useRef(null)

  useEffect(() => {
    const card = imageCardRef.current
    if (!card || typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let raf = 0
    const update = () => {
      raf = 0
      const rect = card.getBoundingClientRect()
      if (rect.bottom < 0 || rect.top > window.innerHeight) return
      const cycle = window.innerHeight + rect.height
      const center = rect.top + rect.height / 2
      const progress = Math.max(
        -1,
        Math.min(1, (window.innerHeight / 2 - center) / (cycle / 2))
      )
      if (imageRef.current) {
        imageRef.current.style.transform = `translate3d(0, ${progress * -16}px, 0) scale(1.12)`
      }
    }

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <section className="hh-why-section">
      <div className="page-container">
        <div className="row align-items-center g-5">
          {/* Left Column: Heading and 4 Features */}
          <div className="col-12 col-lg-7">
            <Reveal>
              <div className="hh-section-eyebrow text-info hh-why-eyebrow">WHY HIREHUB</div>
            </Reveal>
            <h2 className="hh-hero-title mb-3">Why Choose HireHub?</h2>
            <p className="hh-hero-subtitle mb-5">
              We make it easier for you to find the right job or hire the right talent with
              transparency, verified badges, and streamlined recruiting tools.
            </p>

            <div className="row g-3">
              {features.map((feat, index) => (
                <div key={feat.title} className="col-12 col-sm-6">
                  <Reveal delay={index * 100}>
                    <div className="hh-why-feature-card">
                      <div className="hh-why-feature-icon">
                        <i className={`bi bi-${feat.icon}`} aria-hidden="true" />
                      </div>
                      <div>
                        <h3 className="hh-why-feature-title">{feat.title}</h3>
                        <p className="hh-why-feature-desc">{feat.desc}</p>
                      </div>
                    </div>
                  </Reveal>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Professional Image */}
          <div className="col-12 col-lg-5">
            <Reveal delay={120} className="hh-reveal-zoom">
              <div className="position-relative">
                <div className="hh-why-image-card" ref={imageCardRef}>
                  <img
                    src="https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1000&q=80"
                    alt="Professional man working happily on laptop in office"
                    className="hh-why-image"
                    ref={imageRef}
                    loading="lazy"
                  />
                </div>

                <div className="hh-hero-floating-tag hh-why-floating-tag">
                  <i className="bi bi-lightbulb-fill text-warning" aria-hidden="true" />
                  <span>Your next opportunity is here ↗</span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}