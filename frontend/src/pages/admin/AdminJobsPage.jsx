import { useState, useMemo } from 'react'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import UserCell from '../../components/admin/UserCell'
import StatusBadge from '../../components/ui/StatusBadge'
import DataTable from '../../components/ui/DataTable'
import TablePagination from '../../components/ui/TablePagination'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import {
  adminJobs,
  MODERATION_LABELS,
} from '../../data/admin'

const PAGE_SIZE = 8

export default function AdminJobsPage() {
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const tabs = [
    { key: 'all', label: 'All', count: adminJobs.length },
    { key: 'published', label: 'Published', count: adminJobs.filter((job) => job.status === 'published').length },
    { key: 'pending', label: 'Pending review', count: adminJobs.filter((job) => job.status === 'pending').length },
    { key: 'flagged', label: 'Flagged', count: adminJobs.filter((job) => job.status === 'flagged').length },
  ]

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return adminJobs.filter((job) => {
      const matchesTab = tab === 'all' || job.status === tab
      const matchesQuery =
        !q || job.title.toLowerCase().includes(q) || job.company.toLowerCase().includes(q)
      return matchesTab && matchesQuery
    })
  }, [tab, query])

  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <section className="hh-section-space bg-white">
      <div className="page-container">
        <AdminPageHeader
          eyebrow="ADMIN CONSOLE"
          title="Job Moderation"
          subtitle="Approve, review or flag job postings before and after publication."
        />

        <div className="hh-tabs hh-tabs--pills hh-mb-3" role="tablist" aria-label="Job moderation status">
          {tabs.map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              className={`hh-tab ${tab === key ? 'is-active' : ''}`}
              onClick={() => {
                setTab(key)
                setPage(1)
              }}
            >
              {label} <span className="hh-tab-count">{count}</span>
            </button>
          ))}
        </div>

        <div className="hh-search-field-lg hh-mb-4">
          <i className="bi bi-search" aria-hidden="true" />
          <input
            type="search"
            className="hh-form-control"
            placeholder="Search jobs or companies…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
            aria-label="Search jobs"
          />
        </div>

        <Card className="hh-card-body hh-p-0 hh-card--table">
          {visible.length > 0 ? (
            <DataTable
              zebra
              columns={[
                { key: 'job', label: 'Job' },
                { key: 'company', label: 'Company' },
                { key: 'category', label: 'Category' },
                { key: 'applications', label: 'Applications' },
                { key: 'views', label: 'Views' },
                { key: 'posted', label: 'Posted' },
                { key: 'status', label: 'Status' },
                { key: 'actions', label: 'Actions', align: 'right' },
              ]}
              rows={visible.map((job) => ({
                id: job.id,
                job: (
                  <>
                    <span className="hh-fw-semibold">{job.title}</span>
                    <span className="text-muted d-block small">{job.type}</span>
                  </>
                ),
                company: <UserCell name={job.company} />,
                category: job.category,
                applications: job.applications,
                views: job.views.toLocaleString(),
                posted: job.posted,
                status: <StatusBadge status={job.status} label={MODERATION_LABELS[job.status]} />,
                actions: (
                  <div className="d-flex justify-content-end gap-2">
                    {job.status !== 'published' && (
                      <button type="button" className="hh-icon-btn" data-tooltip="Approve job" aria-label={`Approve ${job.title}`}>
                        <i className="bi bi-check2-circle" aria-hidden="true" />
                      </button>
                    )}
                    <button
                      type="button"
                      className="hh-icon-btn"
                      data-tooltip="Pause job"
                      aria-label={`Pause ${job.title}`}
                      disabled={job.status !== 'published'}
                    >
                      <i className="bi bi-pause-circle" aria-hidden="true" />
                    </button>
                    <button type="button" className="hh-icon-btn hh-icon-btn-danger hh-tip-start" data-tooltip="Delete job" aria-label={`Delete ${job.title}`}>
                      <i className="bi bi-trash" aria-hidden="true" />
                    </button>
                  </div>
                ),
              }))}
              rowKey={(row) => row.id}
            />
          ) : (
            <div className="hh-p-5">
              <EmptyState icon="file-earmark-text" title="No jobs match" text="Try a different search term or moderation filter." />
            </div>
          )}
        </Card>

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