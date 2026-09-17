import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { publicJobs } from '../../data/jobs'
import SectionHeading from '../../components/ui/SectionHeading'
import Reveal from '../../components/ui/Reveal'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import Pagination from '../../components/ui/Pagination'
import Card from '../../components/ui/Card'

const PAGE_SIZE = 8
const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'closed', label: 'Closed' },
]

export default function EmployerJobsPage() {
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return publicJobs.filter((job) => {
      const matchesTab = tab === 'all' || job.status === tab
      const matchesQuery = !q || job.title.toLowerCase().includes(q)
      return matchesTab && matchesQuery
    })
  }, [tab, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <>
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <Reveal>
            <div className="hh-toolbar hh-toolbar-between hh-mb-4">
              <SectionHeading eyebrow="EMPLOYER" title="My Job Posts" subtitle="Create, manage and track all of your job postings." />
              <Link to="/employer/post-job" className="hh-btn hh-btn-primary hh-btn-pill">
                <i className="bi bi-plus-lg hh-me-1" aria-hidden="true" />
                Post a new job
              </Link>
            </div>
          </Reveal>

          <div className="hh-tabs hh-mb-3" role="tablist" aria-label="Job status">
            {STATUS_TABS.map(({ key, label }) => (
              <button key={key} type="button" className={`hh-tab ${tab === key ? 'is-active' : ''}`} role="tab" aria-selected={tab === key} onClick={() => { setTab(key); setPage(1) }}>
                {label}
              </button>
            ))}
          </div>

          <div className="hh-search-field hh-mb-4">
            <i className="bi bi-search" aria-hidden="true" />
            <input type="search" className="hh-form-control" placeholder="Search your jobs…" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1) }} aria-label="Search jobs" />
          </div>

          <Card className="hh-card-body hh-p-0 hh-overflow-hidden">
            {visible.length > 0 ? (
              <div className="table-responsive">
                <table className="hh-table hh-table-hover hh-mb-0">
                  <thead>
                    <tr>
                      <th>Job title</th>
                      <th>Applicants</th>
                      <th>View counts</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((job) => (
                      <tr key={job.id}>
                        <td className="hh-fw-semibold">{job.title}</td>
                        <td>{job.applications || 0}</td>
                        <td>{job.views || 0}</td>
                        <td>
                          <Badge variant={job.status === 'open' ? 'success' : 'secondary'}>{job.status}</Badge>
                        </td>
                        <td>
                          <Link to={`/employer/jobs/${job.id}`} className="hh-btn hh-btn-outline-primary hh-btn-sm">Manage</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="hh-p-5">
                <EmptyState icon="briefcase" title="No jobs match" text="Try a different status or search term." />
              </div>
            )}
          </Card>

          {totalPages > 1 && (
            <div className="hh-mt-4">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </div>
      </section>
    </>
  )
}
