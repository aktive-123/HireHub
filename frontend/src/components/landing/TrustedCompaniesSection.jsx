const companies = [
    { name: 'Google', icon: 'google' },
    { name: 'Microsoft', icon: 'windows' },
    { name: 'Meta', icon: 'infinity' },
    { name: 'Flutterwave', icon: 'send-fill' },
    { name: 'Dangote', icon: 'buildings' },
    { name: 'Netflix', icon: 'film' },
    { name: 'Spotify', icon: 'spotify' },
    { name: 'Jumia', icon: 'cart-check-fill' },
  ]

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function TrustedCompaniesSection() {
  const groups = prefersReducedMotion() ? [companies] : [companies, companies]

  return (
    <section className="hh-trusted-section">
      <div className="page-container">
        <h3 className="hh-trusted-title">
          Trusted by Leading Companies &bull; Join thousands of organizations hiring on HireHub
        </h3>

        <div className="hh-trusted-marquee">
          <div className="hh-trusted-marquee-track">
            {groups.map((group, groupIndex) => (
              <div
                key={groupIndex}
                className="hh-trusted-marquee-group"
                aria-hidden={groupIndex === 1}
              >
                {group.map((co) => (
                  <span key={co.name} className="hh-trusted-brand" title={co.name}>
                    <i className={`bi bi-${co.icon}`} aria-hidden="true" />
                    <span>{co.name}</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}