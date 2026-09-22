import Reveal from '../../components/ui/Reveal'
import SectionHeading from '../../components/ui/SectionHeading'
import Button from '../../components/ui/Button'
import PageHero from '../../components/ui/PageHero'
import FinalCtaSection from '../../components/landing/FinalCtaSection'
import heroSlide1 from '../../assets/about.jpg'
import heroSlide2 from '../../assets/about2.jpg'
import heroSlide3 from '../../assets/about3.png'

const heroSlides = [heroSlide1, heroSlide2, heroSlide3]

const STATS = [
  { value: '8,500+', label: 'Companies hiring', icon: 'building' },
  { value: '12K+', label: 'Active job listings', icon: 'briefcase' },
  { value: '45K+', label: 'Job seekers', icon: 'people' },
  { value: '1,200+', label: 'Verified employers', icon: 'patch-check' },
]

const BELIEFS = [
  {
    icon: 'door-open',
    title: 'Opportunity should be accessible',
    text: 'Great careers should not depend on who you know. We open doors by surfacing roles that match your skills and ambitions.',
  },
  {
    icon: 'lightning-charge',
    title: 'Hiring should be simpler',
    text: 'Sourcing, screening, and hiring talented people should be fast and transparent — for companies of every size.',
  },
  {
    icon: 'person-check',
    title: 'Talent deserves to be discovered',
    text: 'We put candidates in front of the right employers and give every professional a fair chance to grow.',
  },
  {
    icon: 'buildings',
    title: 'Employers need better ways to connect',
    text: 'We build the tools — verified profiles, applicant tracking, and smart matching — that make connection effortless.',
  },
]

export default function AboutPage() {
  return (
    <>
      <PageHero
        deep
        images={heroSlides}
        eyebrow="ABOUT HIREHUB"
        title="We're Connecting People With Better Opportunities"
        subtitle="HireHub is a recruitment platform designed to make finding the right opportunity — and the right talent — simpler, faster, and more transparent."
      />

      <section className="hh-section-space bg-white">
        <div className="page-container">
          <Reveal>
            <div className="hh-stat-band hh-mb-5">
              {STATS.map((stat) => (
                <div className="hh-stat-tile" key={stat.label}>
                  <span className="hh-stat-tile-icon" aria-hidden="true">
                    <i className={`bi bi-${stat.icon}`} />
                  </span>
                  <span className="hh-stat-tile-value">{stat.value}</span>
                  <span className="hh-stat-tile-label">{stat.label}</span>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal>
            <div className="hh-mission-grid hh-mb-5">
              <div>
                <div className="hh-mission-eyebrow">Our Mission</div>
                <h2 className="hh-mission-title">
                  Making meaningful careers more accessible
                </h2>
                <p className="hh-mission-text">
                  Our mission is to make meaningful career opportunities more accessible
                  while helping employers discover talented professionals. We do this by
                  combining a clean, human job search with practical recruiting tools that
                  keep hiring honest and transparent for both sides.
                </p>
                <div className="hh-toolbar">
                  <Button to="/jobs" pill size="lg">Find Your Next Opportunity</Button>
                  <Button to="/employer/jobs/create" pill size="lg" variant="outline">
                    Start Hiring With HireHub
                  </Button>
                </div>
              </div>
              <div>
                <div className="hh-card hh-card-elevated hh-p-5">
                  <div className="hh-mission-eyebrow text-primary">Our Approach</div>
                  <ul className="hh-list-checks">
                    <li>
                      <i className="bi bi-check-circle-fill" aria-hidden="true" />
                      Every company profile is verified to keep listings trustworthy.
                    </li>
                    <li>
                      <i className="bi bi-check-circle-fill" aria-hidden="true" />
                      Search filters and smart matching put you in front of relevant roles fast.
                    </li>
                    <li>
                      <i className="bi bi-check-circle-fill" aria-hidden="true" />
                      Applicants track their status in real time — no black holes.
                    </li>
                    <li>
                      <i className="bi bi-check-circle-fill" aria-hidden="true" />
                      Employer tools simplify posting, screening, and interviews in one place.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="hh-section-space hh-bg-light-blue">
        <div className="page-container">
          <Reveal>
            <SectionHeading
              eyebrow="WHAT WE BELIEVE"
              title="Our values in action"
              subtitle="Four principles guide everything we build — from the job board to the hiring tools."
            />
          </Reveal>

          <div className="hh-value-grid">
            {BELIEFS.map((belief, index) => (
              <Reveal key={belief.title} delay={index * 90}>
                <div className="hh-value-card">
                  <div className="hh-value-icon" aria-hidden="true">
                    <i className={`bi bi-${belief.icon}`} />
                  </div>
                  <h3 className="hh-value-title">{belief.title}</h3>
                  <p className="hh-value-text">{belief.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <FinalCtaSection
        subtitle="Join thousands of professionals and companies building meaningful careers and teams on HireHub."
        secondaryTo="/register/job-seeker"
        secondaryLabel="Create Your Profile"
      />
    </>
  )
}