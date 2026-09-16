import Reveal from '../ui/Reveal'

export default function HowItWorksSection() {
  const steps = [
    {
      num: 1,
      icon: 'person-plus',
      title: 'Create an Account',
      desc: 'Sign up as a job seeker or employer in minutes.',
    },
    {
      num: 2,
      icon: 'file-earmark-person',
      title: 'Build Your Profile',
      desc: 'Showcase your skills, experience, and career goals.',
    },
    {
      num: 3,
      icon: 'search',
      title: 'Find or Post Jobs',
      desc: 'Explore vetted opportunities or source top industry talent.',
    },
    {
      num: 4,
      icon: 'check2-circle',
      title: 'Get Hired',
      desc: 'Apply, interview, and step confidently into your next chapter.',
    },
  ]

  return (
    <section className="hh-how-section">
      <div className="page-container">
        <div className="text-center mb-5">
          <div className="hh-section-eyebrow">HOW IT WORKS</div>
          <h2 className="hh-section-title">Get Hired in 4 Simple Steps</h2>
          <p className="hh-section-subtitle mx-auto">
            From creating your profile to landing your dream job, HireHub makes the process simple and fast.
          </p>
        </div>

        <div className="row g-4 justify-content-center">
          {steps.map((step, index) => (
            <div key={step.num} className="col-12 col-sm-6 col-lg-3">
              <Reveal delay={index * 120}>
                <div className="hh-step-card">
                  <div className="hh-step-icon-wrapper">
                    <i className={`bi bi-${step.icon}`} aria-hidden="true" />
                    <span className="hh-step-number">{step.num}</span>
                  </div>
                  <h3 className="hh-step-title">{step.title}</h3>
                  <p className="hh-step-desc">{step.desc}</p>
                </div>
              </Reveal>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
