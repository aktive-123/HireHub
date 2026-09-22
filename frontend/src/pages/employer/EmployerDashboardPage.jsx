import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { employerApi } from '../../services/api'
import { useApiData } from '../../hooks/useApiData'
import { useAuth } from '../../context/AuthContext'
import StatusBadge from '../../components/ui/StatusBadge'
import TablePagination from '../../components/ui/TablePagination'
import EmptyState from '../../components/ui/EmptyState'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import LoadingState from '../../components/ui/LoadingState'
import Reveal from '../../components/ui/Reveal'

const PAGE_SIZE = 6

const APP_TREND = [
  { week: 'W1', count: 12 },
  { week: 'W2', count: 18 },
  { week: 'W3', count: 15 },
  { week: 'W4', count: 24 },
  { week: 'W5', count: 28 },
  { week: 'W6', count: 34 },
  { week: 'W7', count: 41 },
]

const STAT_ICONS = {
  jobs: 'bi-briefcase',
  active_jobs: 'bi-briefcase',
  applications: 'bi-file-earmark-text',
  candidates: 'bi-people',
  hired: 'bi-check2-circle',
  shortlisted: 'bi-star',
}

function normalizeJob(job) {
  return {
    ...job,
    company: typeof job.company === 'string' ? { name: job.company } : (job.company ?? {}),
    applications_count: job.applications ?? job.applications_count,
  }
}

const CHART_W = 620
const CHART_H = 232
const PLOT = { left: 34, right: 600, top: 16, bottom: 198 }

function buildChartGeometry(trend) {
  const pointsData = trend.length > 0 ? trend : APP_TREND
  const countFor = (d) => Number(d.count ?? d.value ?? 0)
  const max = Math.max(...pointsData.map(countFor))
  const niceMax = Math.ceil(max / 10) * 10 || 10
  const denom = Math.max(1, pointsData.length - 1)
  const x = (i) => PLOT.left + (i * (PLOT.right - PLOT.left)) / denom
  const y = (v) => PLOT.top + (1 - v / niceMax) * (PLOT.bottom - PLOT.top)
  const points = pointsData.map((d, i) => ({
    ...d,
    week: d.week || d.label || d.month || i,
    count: countFor(d),
    x: x(i),
    y: y(countFor(d)),
  }))
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${PLOT.bottom} L ${points[0].x} ${PLOT.bottom} Z`
  const gridlines = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const v = niceMax * f
    return { value: v, y: y(v) }
  })
  return { points, linePath, areaPath, gridlines }
}

export default function EmployerDashboardPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [page, setPage] = useState(1)
  const { user } = useAuth()

  const { data: dashboard, loading, error, reload } = useApiData(() => employerApi.dashboard(), [])
  const jobsData = useApiData(() => employerApi.jobs(), [])
  const applicantsData = useApiData(() => employerApi.applicants(), [])
  const companyData = useApiData(() => employerApi.company(), [])

  const company = companyData.data
  const listApplicants = applicantsData.data ?? []
  const publicJobs = useMemo(() => (jobsData.data?.items ?? []).map(normalizeJob), [jobsData.data])
  const isBusy = loading || jobsData.loading || applicantsData.loading

  const chartSeries = useMemo(() => {
    const byMonth = dashboard?.applications_by_month ?? []
    if (byMonth.length === 0) return APP_TREND
    return byMonth.map((d) => ({ week: d.label, count: Number(d.value) || 0 }))
  }, [dashboard])

  const geom = useMemo(() => buildChartGeometry(chartSeries), [chartSeries])
  const trendSum = chartSeries.reduce((sum, d) => sum + d.count, 0)
  const trendGrowth =
    chartSeries.length >= 2
      ? Math.round(((chartSeries[chartSeries.length - 1].count - chartSeries[chartSeries.length - 2].count) / (chartSeries[chartSeries.length - 2].count || 1)) * 100)
      : 0
  const peakWeek = chartSeries.reduce((best, d) => (d.count > best.count ? d : best), chartSeries[0] ?? { week: '-', count: -1 }).week
  const trendUnit = chartSeries[0]?.week?.startsWith('W') ? 'week' : 'month'

  const activeJobs = publicJobs.filter((j) => j.status === 'open')
  const closedJobs = publicJobs.filter((j) => j.status === 'closed')
  const totalApplications = publicJobs.reduce((sum, job) => sum + (job.applications_count || 0), 0)
  const totalCandidates = listApplicants.length
  const shortlistedCount = listApplicants.filter((a) => a.status === 'shortlisted' || a.status === 'interview').length
  const hasJobs = publicJobs.length > 0

  const stats = useMemo(
    () =>
      (dashboard?.stats ?? []).map((stat) => ({
        ...stat,
        icon: STAT_ICONS[stat.key] || 'bi-clipboard-data',
        tone: stat.tone || 'primary',
      })),
    [dashboard]
  )

  const visibleJobs = publicJobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const topCandidates = [...listApplicants].sort((a, b) => (b.match || 0) - (a.match || 0)).slice(0, 5)

  if (isBusy) {
    return (
      <section className="hh-section-space hh-canvas">
        <div className="page-container">
          <Reveal>
            <LoadingState text="Loading your dashboard…" />
          </Reveal>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="hh-section-space hh-canvas">
        <div className="page-container">
          <Reveal>
            <EmptyState
              icon="exclamation-triangle"
              title="Couldn't load your dashboard"
              text="Something went wrong while fetching your data. Please try again."
              action={
                <button type="button" className="hh-btn hh-btn-outline-primary hh-btn-pill" onClick={() => reload()}>
                  Try again
                </button>
              }
            />
          </Reveal>
        </div>
      </section>
    )
  }

  const donutSegments = [
    { label: 'Active', value: activeJobs.length, color: 'var(--hh-primary)' },
    { label: 'Closed', value: closedJobs.length, color: 'var(--hh-gray-400)' },
  ].filter((s) => s.value > 0)
  const donutTotal = activeJobs.length + closedJobs.length
  const donutBg =
    donutTotal > 0
      ? (() => {
          const acc = []
          let cursor = 0
          for (const seg of donutSegments) {
            const from = (cursor / donutTotal) * 360
            const to = ((cursor + seg.value) / donutTotal) * 360
            acc.push(`${seg.color} ${from}deg ${to}deg`)
            cursor += seg.value
          }
          return `conic-gradient(${acc.join(', ')})`
        })()
      : 'var(--hh-gray-100)'

  function statCard(stat) {
    if (stat.key === 'active_jobs' && stat.value === 0) {
      return (
        <Card className="hh-stat-card hh-card-hover">
          <div className="hh-stat-icon hh-stat-icon-primary">
            <i className="bi bi-plus-lg" aria-hidden="true" />
          </div>
          <div className="hh-stat-value">0</div>
          <div className="hh-stat-label">No active jobs yet — post one to start hiring</div>
          <Button to="/employer/jobs/create" variant="primary" size="sm" icon="bi-plus-lg">
            Post your first job
          </Button>
        </Card>
      )
    }
    return (
      <Card className="hh-stat-card hh-card-hover">
        <div className={`hh-stat-icon hh-stat-icon-${stat.tone}`}>
          <i className={`bi ${stat.icon}`} aria-hidden="true" />
        </div>
        <div className="hh-stat-value">{stat.value}</div>
        <div className="hh-stat-label">{stat.label}</div>
      </Card>
    )
  }

  return (
    <>
      <section className="hh-section-space hh-canvas">
        <div className="page-container">
          <div className="hh-welcome-hero hh-welcome-hero--employer">
            <span className="hh-dashboard-hero-orb" aria-hidden="true" />
            <div className="hh-welcome-hero-text">
              <div className="hh-dashboard-hero-id">
                <span
                  className="hh-avatar hh-dashboard-hero-avatar"
                  aria-hidden="true"
                  style={{
                    background: company?.logoBg || 'var(--hh-primary-light)',
                    color: company?.logoColor || 'var(--hh-primary)',
                  }}
                >
                  {company?.logoText || 'E'}
                </span>
                <div>
                  <span className="hh-welcome-eyebrow">EMPLOYER DASHBOARD</span>
                  <span className="hh-dashboard-hero-id-pill">{company?.name || 'Your company'}</span>
                </div>
              </div>
              <h1 className="hh-welcome-title">Welcome back, {user?.name?.split(' ')[0] || 'there'}</h1>
              <p className="hh-welcome-subtitle">
                Manage your job postings, track applicants and close great hires — all from one place.
              </p>
            </div>
            <div className="hh-welcome-hero-actions">
              <Button to="/employer/jobs/create" variant="white" icon="bi-plus-lg" pill block>
                Post a job
              </Button>
              <Button to="/employer/jobs" variant="outline-white" pill block>
                View all postings
              </Button>
            </div>
          </div>

          <div className="row g-4 hh-mb-4">
            {stats.map((stat, idx) => (
              <div className="col-12 col-sm-6 col-lg-3" key={stat.key}>
                <RevealWrap delay={idx * 60}>{statCard(stat)}</RevealWrap>
              </div>
            ))}
          </div>

          <div className="hh-tabs hh-mb-4" role="tablist" aria-label="Dashboard sections">
            {[
              ['overview', 'Overview'],
              ['jobs', 'My Jobs'],
              ['candidates', 'Candidates'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={activeTab === key}
                className={`hh-tab ${activeTab === key ? 'is-active' : ''}`}
                onClick={() => setActiveTab(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <>
              {!hasJobs ? (
                <Card className="hh-card-body">
                  <EmptyState
                    icon="briefcase"
                    title="No job postings yet"
                    text="Post your first job listing to start receiving applications."
                  />
                </Card>
              ) : (
                <div className="row g-4">
                  <div className="col-12 col-lg-8">
                    <Card className="hh-card-body hh-mb-4">
                      <div className="hh-chart-head">
                        <div>
                          <div className="hh-card-title-md">Applications over time</div>
                          <p className="hh-activity-meta hh-mb-0">Received across all job postings · last 7 weeks</p>
                        </div>
                        <span className="hh-kpi-chip">
                          <i className="bi bi-graph-up-arrow" aria-hidden="true" />
                          +{trendGrowth}% vs previous {trendUnit}
                        </span>
                      </div>
                      <svg
                        className="hh-chart-area"
                        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
                        role="img"
                        aria-label="Applications over the last seven weeks"
                      >
                        <defs>
                          <linearGradient id="hh-area-grad-1" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--hh-primary)" stopOpacity="0.26" />
                            <stop offset="100%" stopColor="var(--hh-primary)" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        {geom.gridlines.map((line) => (
                          <g key={line.value}>
                            <line className="hh-chart-grid" x1={PLOT.left} y1={line.y} x2={PLOT.right} y2={line.y} />
                            <text className="hh-chart-gridlabel" x={2} y={line.y + 3}>
                              {line.value}
                            </text>
                          </g>
                        ))}
                        <path fill="url(#hh-area-grad-1)" d={geom.areaPath} />
                        <path className="hh-chart-line" d={geom.linePath} />
                        {geom.points.map((p, idx) => (
                          <g key={p.week}>
                            <circle
                              className={idx === geom.points.length - 1 ? 'hh-chart-dot hh-chart-dot--last' : 'hh-chart-dot'}
                              cx={p.x}
                              cy={p.y}
                              r={idx === geom.points.length - 1 ? 5 : 3.5}
                            />
                            <text className="hh-chart-valuelabel" x={p.x} y={p.y - 9} textAnchor="middle">
                              {p.count}
                            </text>
                            <text className="hh-chart-axislabel" x={p.x} y={PLOT.bottom + 18} textAnchor="middle">
                              {p.week}
                            </text>
                          </g>
                        ))}
                      </svg>
                      <div className="hh-activity-meta hh-mt-3 hh-mb-0">
                        <i className="bi bi-arrow-down-up hh-me-1" aria-hidden="true" />
                        {trendSum} applications submitted in the tracked period · peak week {peakWeek}
                      </div>
                    </Card>

                    <Card className="hh-card-body">
                      <div className="hh-card-title-md hh-mb-3">Recent job postings</div>
                      {publicJobs.slice(0, 5).map((job) => (
                        <div className="hh-activity-row" key={job.id}>
                          <div className="hh-activity-content">
                            <span className="hh-activity-title">{job.title}</span>
                            <span className="hh-activity-meta">
                              {job.company?.name} · {job.industry || 'General'} · {job.applications_count || 0} applications
                            </span>
                          </div>
                          <StatusBadge status={job.status} />
                        </div>
                      ))}
                    </Card>
                  </div>

                  <div className="col-12 col-lg-4">
                    <Card className="hh-card-body hh-mb-4">
                      <div className="hh-card-title-md hh-mb-1">Job status</div>
                      <p className="hh-activity-meta hh-mb-4">Breakdown of your postings</p>
                      <div className="hh-donut" style={{ background: donutBg }} aria-hidden="true">
                        <div className="hh-donut-center">
                          <strong>{activeJobs.length}</strong>
                          <span>of {donutTotal} live</span>
                        </div>
                      </div>
                      {donutSegments.length > 0 ? (
                        <div className="hh-donut-legend">
                          {donutSegments.map((seg) => (
                            <div className="hh-donut-legend-row" key={seg.label}>
                              <span className="hh-donut-legend-dot" style={{ background: seg.color }} aria-hidden="true" />
                              <span className="hh-donut-legend-label">{seg.label}</span>
                              <strong className="hh-donut-legend-value">{seg.value}</strong>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="hh-donut-legend">
                          <span className="hh-activity-meta">Nothing to show yet.</span>
                        </div>
                      )}
                      <div className="hh-mt-4">
                        <Button to="/employer/jobs" variant="outline-primary" icon="bi-arrow-right" iconPosition="right" block pill>
                          Manage postings
                        </Button>
                      </div>
                    </Card>

                    <Card className="hh-card-body">
                      <div className="hh-card-title-md hh-mb-3">Quick actions</div>
                      <nav className="hh-vert-list gap-1" aria-label="Quick actions">
                        <Link to="/employer/jobs"><i className="bi bi-briefcase hh-me-2" aria-hidden="true" />View all jobs</Link>
                        <Link to="/employer/applicants"><i className="bi bi-people hh-me-2" aria-hidden="true" />All applicants</Link>
                        <Link to="/employer/tracking"><i className="bi bi-kanban hh-me-2" aria-hidden="true" />ATS pipeline</Link>
                        <Link to="/employer/interviews"><i className="bi bi-calendar-event hh-me-2" aria-hidden="true" />Interviews</Link>
                        <Link to="/employer/company"><i className="bi bi-building hh-me-2" aria-hidden="true" />Company profile</Link>
                      </nav>
                    </Card>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'jobs' && (
            <Card className="hh-card-body">
              <div className="hh-card-title-md hh-mb-3">My Job Postings</div>
              {publicJobs.length > 0 ? (
                <>
                  {visibleJobs.map((job) => (
                    <div className="hh-activity-row" key={job.id}>
                      <div className="hh-activity-content">
                        <span className="hh-activity-title">{job.title}</span>
                        <span className="hh-activity-meta">
                          {job.company?.name} · {job.applications_count || 0} applications · {job.views || 0} views
                        </span>
                      </div>
                      <StatusBadge status={job.status} />
                      <Link to={`/employer/jobs/${job.slug || job.id}`} className="hh-btn hh-btn-outline-primary hh-btn-sm">
                        Manage
                      </Link>
                    </div>
                  ))}
                  <div className="hh-mt-4">
                    <TablePagination page={page} pageSize={PAGE_SIZE} total={publicJobs.length} onPageChange={setPage} />
                  </div>
                </>
              ) : (
                <EmptyState icon="briefcase" title="No jobs posted" text="Post your first job listing to start receiving applications." />
              )}
            </Card>
          )}

          {activeTab === 'candidates' && (
            <Card className="hh-card-body">
              <div className="hh-toolbar hh-toolbar-between">
                <div className="hh-card-title-md hh-mb-3">Candidate Pipeline</div>
                <Button to="/employer/applicants" variant="ghost" size="sm" icon="bi-arrow-right" iconPosition="right">
                  View all
                </Button>
              </div>
              {topCandidates.length > 0 ? (
                topCandidates.map((candidate) => (
                  <div className="hh-app-row" key={candidate.id}>
                    <span className="hh-avatar hh-avatar-soft" aria-hidden="true">
                      {candidate.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </span>
                    <div className="hh-app-info">
                      <span className="hh-app-title">{candidate.name}</span>
                      <div className="hh-app-company">{candidate.role}</div>
                      <div className="hh-app-meta">
                        <span><i className="bi bi-lightning-charge hh-me-1" aria-hidden="true" />{candidate.match}% match</span>
                        <span><i className="bi bi-clock hh-me-1" aria-hidden="true" />Applied {candidate.applied}</span>
                      </div>
                    </div>
                    <div className="hh-app-action">
                      <StatusBadge status={candidate.status} />
                      <Link to={`/employer/applicants/${candidate.id}`} className="hh-btn hh-btn-outline-primary hh-btn-sm">
                        View
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState icon="people" title="No candidates yet" text="Once applicants apply to your jobs, they will appear here." />
              )}
            </Card>
          )}
        </div>
      </section>
    </>
  )
}

function RevealWrap({ children, delay = 0 }) {
  return (
    <div style={{ animation: `hh-hero-rise 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms both` }}>{children}</div>
  )
}