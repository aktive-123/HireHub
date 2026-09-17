import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import SectionHeading from '../../components/ui/SectionHeading'
import Reveal from '../../components/ui/Reveal'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import Pagination from '../../components/ui/Pagination'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'

const PAGE_SIZE = 8

const SAMPLE_APPLICANTS = [
  { id: 'ap1', name: 'Ada Obi', role: 'Frontend Engineer', job: 'Senior Frontend Engineer', applied: '12 Sep', match: 92, status: 'shortlisted' },
  { id: 'ap2', name: 'Tunde Bakare', role: 'Full-Stack Developer', job: 'Full-Stack Developer', applied: '11 Sep', match: 88, status: 'new' },
  { id: 'ap3', name: 'Chidinma Nwosu', role: 'Backend Engineer', job: 'Backend Engineer (Node.js)', applied: '10 Sep', match: 85, status: 'interview' },
  { id: 'ap4', name: 'Ibrahim Musa', role: 'DevOps Engineer', job: 'DevOps Engineer', applied: '09 Sep', match: 79, status: 'new' },
  { id: 'ap5', name: 'Fatima Sani', role: 'Data Analyst', job: 'Data Analyst', applied: '08 Sep', match: 76, status: 'hired' },
  { id: 'ap6', name: 'Emeka Okafor', role: 'Product Designer', job: 'Product Designer', applied: '07 Sep', match: 74, status: 'rejected' },
  { id: 'ap7', name: 'Ngozi Eze', role: 'QA Engineer', job: 'QA Engineer', applied: '06 Sep', match: 69, status: 'new' },
  { id: 'ap8', name: 'Yusuf Adeyemi', role: 'DevOps Engineer', job: 'Platform Engineer', applied: '05 Sep', match: 82, status: 'shortlisted' },
  { id: 'ap9', name: 'Aisha Bello', role: 'Project Manager', job: 'Project Manager', applied: '04 Sep', match: 71, status: 'interview' },
  { id: 'ap10', name: 'Tobi Alabi', role: 'Frontend Engineer', job: 'Senior Frontend Engineer', applied: '03 Sep', match: 90, status: 'hired' },
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'All applicants' },
  { value: 'new', label: 'New' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'interview', label: 'Interview' },
  { value: 'hired', label: 'Hired' },
  { value: 'rejected', label: 'Rejected' },
]

const STATUS_VARIANT = {
  new: 'secondary',
  shortlisted: 'primary',
  interview: 'warning',
  hired: 'success',
  rejected: 'danger',
}

export default function EmployerApplicantsPage() {
  const [status, setStatus] = useState('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return SAMPLE_APPLICANTS.filter((a) => {
      const matchesStatus = status === 'all' || a.status === status
      const matchesQuery =
        !q || a.name.toLowerCase().includes(q) || a.role.toLowerCase().includes(q) || a.job.toLowerCase().includes(q)
      return matchesStatus && matchesQuery
    })
  }, [status, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <>
      <section classNameName="hh-section-space bg-white">
        <div classNameName="page-container">
          <Reveal>
            <div classNameName="hh-toolbar hh-toolbar-between hh-mb-4">
              <SectionHeading
                eyebrow="EMPLOYER DASHBOARD"
                title="Applicants"
                subtitle="Review and manage applications submitted to your jobs."
              />
              <div classNameName="hh-search-field hh-search-field-lg">
                <i classNameName="bi bi-search" aria-hidden="true" />
                <input
                  type="search"
                  classNameName="hh-form-control"
                  placeholder="Search applicants…"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setPage(1)
                  }}
                  aria-label="Search applicants"
                />
              </div>
            </div>
          </Reveal>

          <div classNameName="hh-tabs hh-mb-4" role="tablist" aria-label="Filter by status">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="tab"
                aria-selected={status === opt.value}
                classNameName={`hh-tab ${status === opt.value ? 'is-active' : ''}`}
                onClick={() => {
                  setStatus(opt.value)
                  setPage(1)
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {visible.length > 0 ? (
            <Reveal>
              <Card classNameName="hh-card-body hh-p-0 hh-overflow-hidden">
                <div classNameName="table-responsive">
                  <table classNameName="hh-table hh-table-hover hh-mb-0">
                    <thead>
                      <tr>
                        <th>Applicant</th>
                        <th>Role</th>
                        <th>Job</th>
                        <th>Applied</th>
                        <th>Match</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((a) => (
                        <tr key={a.id}>
                          <td classNameName="hh-fw-semibold">{a.name}</td>
                          <td>{a.role}</td>
                          <td>{a.job}</td>
                          <td>{a.applied}</td>
                          <td>
                            <Badge variant="primary">{a.match}%</Badge>
                          </td>
                          <td>
                            <Badge variant={STATUS_VARIANT[a.status] || 'secondary'}>{a.status}</Badge>
                          </td>
                          <td>
                            <Link to={`/employer/applicants/${a.id}`}>
                              <Button variant="outline-primary" size="sm">
                                Review
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </Reveal>
          ) : (
            <EmptyState icon="inbox" title="No applicants found" text="Try a different search or status filter." />
          )}

          {totalPages > 1 && (
            <div classNameName="hh-mt-4">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </div>
      </section>
    </>
  )
}
