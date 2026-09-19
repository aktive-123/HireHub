import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminStatGrid from '../../components/admin/AdminStatGrid'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Reveal from '../../components/ui/Reveal'
import {
  adminStats,
  applicationsByMonth,
  categoryDistribution,
  topCompanies,
} from '../../data/admin'

function formatValue(value) {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value)
}

export default function AdminReportsPage() {
  const metrics = adminStats.filter((stat) =>
    ['seekers', 'jobs', 'applications', 'hired'].includes(stat.key)
  )

  const maxApplications = Math.max(...applicationsByMonth.map((item) => item.value))
  const maxCategory = Math.max(...categoryDistribution.map((item) => item.value))
  const maxCompany = Math.max(...topCompanies.map((item) => item.applications))

  return (
    <section className="hh-section-space bg-white">
      <div className="page-container">
        <AdminPageHeader
          eyebrow="ADMIN CONSOLE"
          title="Reports & Analytics"
          subtitle="A snapshot of platform growth, application volume and hiring demand."
          action={
            <Button variant="outline" icon="bi-download">
              Export report
            </Button>
          }
        />

        <AdminStatGrid stats={metrics} cols={4} />

        <div className="hh-mb-4">
          <Reveal>
            <Card className="hh-card-body hh-card-hover">
              <div className="hh-toolbar hh-toolbar-between hh-mb-3">
                <h3 className="hh-card-title-md hh-mb-0">Applications over time</h3>
                <Badge variant="primary" sm>
                  Jan – Sep
                </Badge>
              </div>
              <div className="hh-chart">
                {applicationsByMonth.map((item) => (
                  <div className="hh-chart-bar" key={item.label}>
                    <span className="hh-chart-value">{formatValue(item.value)}</span>
                    <span
                      className="hh-chart-fill"
                      style={{ height: `${Math.round((item.value / maxApplications) * 100)}%` }}
                      aria-hidden="true"
                    />
                    <span className="hh-chart-label">{item.label}</span>
                  </div>
                ))}
              </div>
            </Card>
          </Reveal>
        </div>

        <div className="row g-4">
          <div className="col-12 col-lg-6">
            <Reveal delay={80}>
              <Card className="hh-card-body hh-card-hover h-100">
                <h3 className="hh-card-title-md hh-mb-3">Open roles by category</h3>
                <div className="hh-rank">
                  {categoryDistribution.map((item) => (
                    <div className="hh-rank-item" key={item.label}>
                      <span className="hh-rank-name">
                        <span className="hh-rank-name-text">{item.label}</span>
                      </span>
                      <span className="hh-rank-track">
                        <span
                          className="hh-rank-fill"
                          style={{ width: `${Math.max(8, Math.round((item.value / maxCategory) * 100))}%` }}
                        />
                      </span>
                      <span className="hh-rank-value">{item.value}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </Reveal>
          </div>

          <div className="col-12 col-lg-6">
            <Reveal delay={120}>
              <Card className="hh-card-body hh-card-hover h-100">
                <h3 className="hh-card-title-md hh-mb-3">Top companies by applications</h3>
                <div className="hh-rank">
                  {topCompanies.map((company) => (
                    <div className="hh-rank-item" key={company.id}>
                      <span className="hh-rank-name">
                        <span
                          className="hh-avatar hh-avatar-xs hh-avatar-soft hh-avatar-square"
                          style={{ background: company.logoBg, color: company.logoColor }}
                          aria-hidden="true"
                        >
                          {company.logoText}
                        </span>
                        <span className="hh-rank-name-text">{company.name}</span>
                      </span>
                      <span className="hh-rank-track">
                        <span
                          className="hh-rank-fill"
                          style={{ width: `${Math.max(8, Math.round((company.applications / maxCompany) * 100))}%` }}
                        />
                      </span>
                      <span className="hh-rank-value">{company.applications}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}