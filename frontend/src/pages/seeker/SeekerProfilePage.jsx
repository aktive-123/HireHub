import SectionHeading from '../../components/ui/SectionHeading'
import Reveal from '../../components/ui/Reveal'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'

const SKILLS = ['React', 'JavaScript', 'TypeScript', 'CSS', 'HTML', 'Git', 'Figma', 'SQL']
const CERTIFICATIONS = [
  'Meta Front-End Developer Professional Certificate',
  'Responsive Web Design – freeCodeCamp',
]
const PORTFOLIO = ['github.com/sarah-obi', 'sarahobi.dev', 'dribbble.com/sarahobi']
const SOCIALS = [
  { platform: 'LinkedIn', value: 'linkedin.com/in/sarahobi', icon: 'linkedin' },
  { platform: 'Twitter', value: '@sarahobi', icon: 'twitter-x' },
  { platform: 'GitHub', value: 'github.com/sarah-obi', icon: 'github' },
]

const EXPERIENCE = [
  { role: 'Frontend Developer', org: 'Paystack — Lagos, Nigeria', period: '2022 – Present' },
  { role: 'UI Developer', org: 'Andela — Remote', period: '2020 – 2022' },
]

const EDUCATION = [
  { degree: 'B.Sc. Computer Science', org: 'University of Lagos', period: '2015 – 2019' },
]

export default function SeekerProfilePage() {
  return (
    <>
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <div className="hh-toolbar hh-toolbar-between hh-mb-4">
            <SectionHeading
              eyebrow="JOB SEEKER DASHBOARD"
              title="Your professional profile"
              subtitle="Show employers the value you bring at a glance."
            />
            <div className="d-flex gap-2">
              <Button to="/seeker/profile/edit" variant="outline-primary" icon="bi-pencil" pill>
                Edit profile
              </Button>
              <Button to="/" variant="primary" icon="bi-eye" pill>
                Preview profile
              </Button>
            </div>
          </div>

          <Reveal>
            <Card className="hh-card-body hh-mb-4">
              <div className="hh-profile-head">
                <span className="hh-avatar hh-avatar-lg hh-avatar-soft" aria-hidden="true">SO</span>
                <div className="hh-profile-head-main">
                  <h2 className="hh-profile-name">Sarah Obi</h2>
                  <div className="hh-profile-title-line">
                    <span>Frontend Developer</span>
                    <Badge variant="success" sm dot>Open to work</Badge>
                  </div>
                  <div className="hh-app-meta">
                    <span><i className="bi bi-geo-alt hh-me-1" aria-hidden="true" />Lagos, Nigeria</span>
                    <span><i className="bi bi-clock hh-me-1" aria-hidden="true" />5 years experience</span>
                    <span><i className="bi bi-briefcase hh-me-1" aria-hidden="true" />12 applications</span>
                  </div>
                </div>
                <div className="hh-profile-head-actions">
                  <Button to="/seeker/resume" variant="outline-primary" icon="bi-download" size="sm">Download CV</Button>
                </div>
              </div>
            </Card>
          </Reveal>

          <div className="row g-4">
            <div className="col-12 col-lg-6">
              <Reveal delay={40}>
                <Card className="hh-card-body hh-mb-4">
                  <div className="hh-profile-card-title hh-card-title-md">
                    <i className="bi bi-person" aria-hidden="true" /> About me
                  </div>
                  <p className="hh-profile-row-value">
                    Frontend developer with 5 years of experience building fast, accessible web
                    applications. I love turning complex problems into simple, delightful
                    interfaces and collaborating with designers and engineers to ship great products.
                  </p>
                </Card>
              </Reveal>

              <Reveal delay={80}>
                <Card className="hh-card-body hh-mb-4">
                  <div className="hh-profile-card-title hh-card-title-md">
                    <i className="bi bi-briefcase" aria-hidden="true" /> Work experience
                  </div>
                  {EXPERIENCE.map((item) => (
                    <div className="hh-resume-entry" key={item.role}>
                      <div className="hh-resume-entry-title">{item.role}</div>
                      <div className="hh-resume-entry-org">{item.org} · {item.period}</div>
                    </div>
                  ))}
                </Card>
              </Reveal>

              <Reveal delay={120}>
                <Card className="hh-card-body hh-mb-4">
                  <div className="hh-profile-card-title hh-card-title-md">
                    <i className="bi bi-mortarboard" aria-hidden="true" /> Education
                  </div>
                  {EDUCATION.map((item) => (
                    <div className="hh-resume-entry" key={item.degree}>
                      <div className="hh-resume-entry-title">{item.degree}</div>
                      <div className="hh-resume-entry-org">{item.org} · {item.period}</div>
                    </div>
                  ))}
                </Card>
              </Reveal>

              <Reveal delay={160}>
                <Card className="hh-card-body">
                  <div className="hh-profile-card-title hh-card-title-md">
                    <i className="bi bi-award" aria-hidden="true" /> Certifications
                  </div>
                  <ul className="hh-benefit-list">
                    {CERTIFICATIONS.map((item) => (
                      <li key={item}><i className="bi bi-patch-check" aria-hidden="true" />{item}</li>
                    ))}
                  </ul>
                </Card>
              </Reveal>
            </div>

            <div className="col-12 col-lg-6">
              <Reveal delay={60}>
                <Card className="hh-card-body hh-mb-4">
                  <div className="hh-profile-card-title hh-card-title-md">
                    <i className="bi bi-tools" aria-hidden="true" /> Skills
                  </div>
                  <div className="hh-chip-row">
                    {SKILLS.map((skill) => (
                      <span className="hh-chip" key={skill}>{skill}</span>
                    ))}
                  </div>
                </Card>
              </Reveal>

              <Reveal delay={100}>
                <Card className="hh-card-body hh-mb-4">
                  <div className="hh-profile-card-title hh-card-title-md">
                    <i className="bi bi-folder2-open" aria-hidden="true" /> Portfolio
                  </div>
                  <ul className="hh-vert-list">
                    {PORTFOLIO.map((url) => (
                      <li key={url}><a href="#"><i className="bi bi-box-arrow-up-right hh-me-2" aria-hidden="true" />{url}</a></li>
                    ))}
                  </ul>
                </Card>
              </Reveal>

              <Reveal delay={140}>
                <Card className="hh-card-body hh-mb-4">
                  <div className="hh-profile-card-title hh-card-title-md">
                    <i className="bi bi-share" aria-hidden="true" /> Social links
                  </div>
                  <ul className="hh-vert-list">
                    {SOCIALS.map((item) => (
                      <li key={item.platform}>
                        <a href="#"><i className={`bi bi-${item.icon} hh-me-2`} aria-hidden="true" />{item.platform} — {item.value}</a>
                      </li>
                    ))}
                  </ul>
                </Card>
              </Reveal>

              <Reveal delay={180}>
                <Card className="hh-card-body">
                  <div className="hh-profile-card-title hh-card-title-md">
                    <i className="bi bi-file-earmark-person" aria-hidden="true" /> Resume / CV
                  </div>
                  <div className="hh-app-row hh-p-0">
                    <span className="hh-file-icon" aria-hidden="true"><i className="bi bi-file-earmark-pdf" /></span>
                    <div className="hh-file-info">
                      <span className="hh-file-name">Sarah_Obi_Resume.pdf</span>
                      <span className="hh-file-size">246 KB · Updated September 2026</span>
                    </div>
                    <div className="hh-app-action">
                      <Button to="/seeker/resume" variant="outline-primary" size="sm">Manage CV</Button>
                    </div>
                  </div>
                </Card>
              </Reveal>
            </div>
          </div>

          <Reveal delay={120}>
            <Card className="hh-card-body hh-mt-4">
              <div className="hh-toolbar hh-toolbar-between">
                <div>
                  <div className="hh-card-title-md">Profile completeness</div>
                  <p className="hh-settings-desc mt-2">Complete these sections to stand out to recruiters.</p>
                </div>
                <Button to="/seeker/profile/edit" variant="primary" icon="bi-pencil" pill>Complete profile</Button>
              </div>
              <div className="hh-progress hh-mt-4">
                <div className="hh-progress-bar" style={{ width: '75%' }} />
              </div>
            </Card>
          </Reveal>
        </div>
      </section>
    </>
  )
}