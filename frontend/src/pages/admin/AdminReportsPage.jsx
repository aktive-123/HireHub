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
import { adminApi } from '../../services/api'
import { useAdminData } from '../../hooks/useAdminData'
import { downloadCsv, withDateStamp } from '../../utils/exportData'

function formatValue(value) {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value)
}

function initials(name) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function AdminReportsPage() {
  const reports = useAdminData(() => adminApi.reports(), {})
  const categoryData = useAdminData(() => adminApi.categories(), null)

  const metrics = adminStats
    .filter((stat) => ['seekers', 'jobs', 'applications', 'hired'].includes(stat.key))
    .map((stat) => {
      let value = stat.value
      if (stat.key === 'seekers') value = reports.new_users ?? value
      else if (stat.key === 'jobs') value = reports.new_jobs ?? value
      else if (stat.key === 'applications') value = reports.new_applications ?? value
      return { ...stat, value }
    })

  const applicationsOverTime = (reports.applications_by_day ?? applicationsByMonth)
    .slice(-9)
    .map((item) => ({ label: item.label ?? item.date, value: item.value }))

  const categoryDist =
    (categoryData ?? []).length > 0
      ? categoryData.map((category) => ({ label: category.name, value: category.jobs_count ?? 0 }))
      : categoryDistribution

  const topCompanyList = (reports.top_companies ?? topCompanies).map((company) => ({
    id: company.id ?? company.name,
    name: company.name,
    logoText: company.logoText ?? initials(company.name),
    logoBg: company.logoBg ?? '#eef2ff',
    logoColor: company.logoColor ?? '#4f46e5',
    jobs: company.jobs ?? company.jobs_count ?? 0,
    applications: company.applications ?? company.jobs_count ?? 0,
  }))

  const maxApplications = Math.max(...applicationsOverTime.map((item) => item.value))
  const maxCategory = Math.max(...categoryDist.map((item) => item.value))
  const maxCompany = Math.max(...topCompanyList.map((item) => item.applications))

  // One row per section keeps the spreadsheet readable instead of flattening
  // every chart into a single mismatched table.
  const handleExport = () => {
    const stamp = withDateStamp('hirehub-report')
    downloadCsv(
      `${stamp}.csv`,
      [
        {
          section: 'Summary',
          metric: 'New job seekers',
          period: 'This month',
          value: reports.new_users ?? 0,
        },
        {
          section: 'Summary',
          metric: 'New jobs',
          period: 'This month',
          value: reports.new_jobs ?? 0,
        },
        {
          section: 'Summary',
          metric: 'New applications',
          period: 'This month',
          value: reports.new_applications ?? 0,
        },
        ...applicationsOverTime.map((item) => ({
          section: 'Applications over time',
          metric: item.label,
          period: '',
          value: item.value,
        })),
        ...categoryDist.map((item) => ({
          section: 'Jobs by category',
          metric: item.label,
          period: '',
          value: item.value,
        })),
        ...topCompanyList.map((item) => ({
          section: 'Top companies',
          metric: item.name,
          period: 'jobs',
          value: item.jobs,
        })),
        ...topCompanyList.map((item) => ({
          section: 'Top companies',
          metric: item.name,
          period: 'applications',
          value: item.applications,
        })),
      ],
      ['section', 'metric', 'period', 'value']
    )
  }

  return (
    <section className="hh-section-space bg-white">
      <div className="page-container">
        <AdminPageHeader
          eyebrow="ADMIN CONSOLE"
          title="Reports & Analytics"
          subtitle="A snapshot of platform growth, application volume and hiring demand."
          action={
            <Button variant="outline" icon="bi-download" onClick={handleExport}>
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
                {applicationsOverTime.map((item) => (
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
                  {categoryDist.map((item) => (
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
                  {topCompanyList.map((company) => (
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