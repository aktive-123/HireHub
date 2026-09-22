import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../../components/ui/PageHeader'
import StatusBadge from '../../components/ui/StatusBadge'
import DataTable from '../../components/ui/DataTable'
import TablePagination from '../../components/ui/TablePagination'
import EmptyState from '../../components/ui/EmptyState'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'

const PAGE_SIZE = 6

const SAMPLE_INTERVIEWS = [
  { id: 'i1', applicant: 'Ada Obi', role: 'Frontend Engineer', when: 'Wed, Sep 17 · 10:00', mode: 'Video', status: 'scheduled' },
  { id: 'i2', applicant: 'Tunde Bakare', role: 'Full-Stack Developer', when: 'Thu, Sep 18 · 14:30', mode: 'On-site', status: 'scheduled' },
  { id: 'i3', applicant: 'Chidinma Nwosu', role: 'Designer', when: 'Fri, Sep 19 · 11:00', mode: 'Video', status: 'confirmed' },
  { id: 'i4', applicant: 'Ibrahim Musa', role: 'DevOps Engineer', when: 'Mon, Sep 22 · 09:30', mode: 'Video', status: 'pending' },
  { id: 'i5', applicant: 'Fatima Sani', role: 'Data Analyst', when: 'Tue, Sep 23 · 13:00', mode: 'On-site', status: 'completed' },
  { id: 'i6', applicant: 'Emeka Okafor', role: 'QA Engineer', when: 'Wed, Sep 24 · 15:00', mode: 'Video', status: 'scheduled' },
  { id: 'i7', applicant: 'Ngozi Eze', role: 'Backend Engineer', when: 'Thu, Sep 25 · 10:30', mode: 'Video', status: 'cancelled' },
  { id: 'i8', applicant: 'Yusuf Adeyemi', role: 'DevOps Engineer', when: 'Fri, Sep 26 · 12:00', mode: 'On-site', status: 'completed' },
]

// The row action adapts to the interview's stage so users aren't offered one
// generic action regardless of status.
const ACTION_LABEL = {
  pending: 'Confirm',
  scheduled: 'Reschedule',
  confirmed: 'Manage',
  completed: 'Review',
  cancelled: 'Rebook',
}

export default function EmployerInterviewsPage() {
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return SAMPLE_INTERVIEWS.filter((i) => {
      const matchesStatus = filter === 'all' || i.status === filter
      const matchesQuery = !q || i.applicant.toLowerCase().includes(q) || i.role.toLowerCase().includes(q)
      return matchesStatus && matchesQuery
    })
  }, [filter, query])

  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <section className="hh-section-space bg-white">
      <div className="page-container">
        <PageHeader
          eyebrow="EMPLOYER DASHBOARD"
          title="Interviews"
          subtitle="Schedule, confirm and track your interview sessions."
          action={
            <Link to="/employer/interviews/new">
              <Button variant="primary" icon="bi-plus-lg">Schedule interview</Button>
            </Link>
          }
        />

        <div className="hh-toolbar hh-toolbar-between hh-mb-4">
          <div className="hh-search-field hh-search-field-lg">
            <i className="bi bi-search" aria-hidden="true" />
            <input
              type="search"
              className="hh-form-control"
              placeholder="Search by applicant or role…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
              aria-label="Search interviews"
            />
          </div>
          <div className="hh-btn-group" role="group" aria-label="Filter interviews">
            {['all', 'scheduled', 'confirmed', 'completed', 'cancelled'].map((s) => (
              <button
                key={s}
                type="button"
                className={`hh-btn hh-btn-outline-primary hh-btn-sm ${filter === s ? 'is-active' : ''}`}
                onClick={() => {
                  setFilter(s)
                  setPage(1)
                }}
              >
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {visible.length > 0 ? (
          <Card className="hh-card-body hh-p-0 hh-card--table">
            <DataTable
              columns={[
                { key: 'applicant', label: 'Applicant' },
                { key: 'role', label: 'Role' },
                { key: 'when', label: 'When' },
                { key: 'mode', label: 'Mode' },
                { key: 'status', label: 'Status' },
                { key: 'action', label: 'Action', align: 'right' },
              ]}
              rows={visible.map((i) => ({
                id: i.id,
                applicant: <span className="hh-fw-semibold">{i.applicant}</span>,
                role: i.role,
                when: i.when,
                mode: i.mode,
                status: <StatusBadge status={i.status} />,
                action: (
                  <Link to={`/employer/interviews/${i.id}`}>
                    <Button variant="outline-primary" size="sm">
                      {ACTION_LABEL[i.status] || 'Manage'}
                    </Button>
                  </Link>
                ),
              }))}
              rowKey={(row) => row.id}
            />
          </Card>
        ) : (
          <Card className="hh-card-body">
            <EmptyState icon="calendar3" title="No interviews found" text="Try a different search or filter." />
          </Card>
        )}

        <TablePagination
          page={page}
          pageSize={PAGE_SIZE}
          total={filtered.length}
          onPageChange={setPage}
        />
      </div>
    </section>
  )
}