import { useState } from 'react'
import HeroSection from '@/components/ui/HeroSection'
import Reveal from '@/components/ui/Reveal'
import { FAQ } from '@/data/resources'
import heroSlide1 from '@/assets/contact4.jpg'
import heroSlide2 from '@/assets/contact3.jpg'
import heroSlide3 from '@/assets/contact.jpg'

const heroSlides = [heroSlide1, heroSlide2, heroSlide3]

function FaqItem({ item }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`hh-faq-item ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        className="hh-faq-question"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span>{item.q}</span>
        <i className={`bi ${open ? 'bi-dash' : 'bi-plus'}`} aria-hidden="true" />
      </button>
      <div className="hh-faq-answer">
        <p>{item.a}</p>
      </div>
    </div>
  )
}

export default function FaqPage() {
  return (
    <>
      <HeroSection
        deep
        images={heroSlides}
        eyebrow="HELP & SUPPORT"
        title="Frequently Asked Questions"
        subtitle="Quick answers for job seekers and employers. Can't find what you need? Our team is one message away."
      />

      <section className="hh-section-space bg-white">
        <div className="page-container">
          {FAQ.map((group, groupIndex) => (
            <div key={group.group} className={groupIndex > 0 ? 'hh-mt-8' : ''}>
              <Reveal>
                <div className="hh-faq-group-head">
                  <div className="hh-value-icon" aria-hidden="true">
                    <i
                      className={`bi ${group.group === 'job-seekers' ? 'bi-person-heart' : 'bi-buildings'}`}
                    />
                  </div>
                  <div>
                    <div className="hh-section-eyebrow">{group.groupLabel}</div>
                    <h2 className="hh-mission-title">
                      {group.group === 'job-seekers'
                        ? 'Everything about applying with HireHub'
                        : 'Everything about hiring with HireHub'}
                    </h2>
                  </div>
                </div>
              </Reveal>

              <div className="hh-faq-list hh-mt-4">
                {group.items.map((item, index) => (
                  <Reveal key={item.q} delay={index * 50}>
                    <FaqItem item={item} />
                  </Reveal>
                ))}
              </div>
            </div>
          ))}

          <Reveal>
            <div className="hh-faq-contact">
              <div>
                <h2>Still have questions?</h2>
                <p>
                  Our support team is happy to help with anything related to your profile, applications,
                  or hiring questions.
                </p>
              </div>
              <div className="hh-toolbar">
                <a href="/contact" className="hh-btn hh-btn-primary hh-btn-lg hh-btn-pill">
                  Contact Us <i className="bi bi-arrow-right hh-btn-arrow" aria-hidden="true" />
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}