import { useState, useMemo } from 'react'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import UserCell from '../../components/admin/UserCell'
import Badge from '../../components/ui/Badge'
import StatusBadge from '../../components/ui/StatusBadge'
import DataTable from '../../components/ui/DataTable'
import TablePagination from '../../components/ui/TablePagination'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import FormSelect from '../../components/ui/FormSelect'
import Button from '../../components/ui/Button'
import { adminApplications } from '../../data/admin'
import { STATUS_OPTIONS, STATUS_LABEL } from '../../data/applicants'
import { adminApi } from '../../services/api'
import { adaptApplications } from '../../services/api/adminAdapters'
import { useAdminList } from '../../hooks/useAdminData'

const PAGE_SIZE = 8

// The pipeline order used by the "next stage" action. Terminal outcomes are
// deliberately excluded: an application is not "advanced" into a rejection.
const STAGE_ORDER = ['new', 'reviewing', 'shortlisted', 'interview', 'offer', 'hired']

/**
 * The stage one step further along the pipeline, or null at the end of it.
 * Returns null for rejected/withdrawn applications so the advance control is
 * disabled rather than silently doing nothing.
 */
function nextStageFor(status) {
  const index = STAGE_ORDER.indexOf(status)
  if (index === -1 || index === STAGE_ORDER.length - 1) return null
  return STAGE_ORDER[index + 1]
}

export default function AdminApplicationsPage() {
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const { items: applications, refetch } = useAdminList(
    () => adminApi.applications({}).then(adaptApplications),
    adminApplications
  )

  const [viewing, setViewing] = useState(null)
  const [advancing, setAdvancing] = useState(null)
  const [chosenStatus, setChosenStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)

  const openAdvance = (app) => {
    setAdvancing(app)
    setChosenStatus(nextStageFor(app.status) ?? '')
    setActionError(null)
  }

  const confirmAdvance = async () => {
    if (!advancing || !chosenStatus) return
    setBusy(true)
    setActionError(null)
    try {
      await adminApi.updateApplicationStatus(advancing.id, chosenStatus)
      setAdvancing(null)
      refetch()
    } catch (err) {
      setActionError(err?.message || 'Could not update the application status.')
    } finally {
      setBusy(false)
    }
  }

  const countByStatus = (status) =>
    applications.filter((app) => app.status === status).length

  const tabs = [
    { key: 'all', label: 'All', count: applications.length },
    ...STATUS_OPTIONS.filter((option) => option.value !== 'all').map((option) => ({
      key: option.value,
      label: STATUS_LABEL[option.value],
      count: countByStatus(option.value),
    })),
  ]

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return applications.filter((app) => {
      const matchesTab = tab === 'all' || app.status === tab
      const matchesQuery =
        !q ||
        app.applicant.toLowerCase().includes(q) ||
        app.job.toLowerCase().includes(q) ||
        app.company.toLowerCase().includes(q)
      return matchesTab && matchesQuery
    })
  }, [tab, query, applications])

  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <section className="hh-section-space bg-white">
      <div className="page-container">
        <AdminPageHeader
          eyebrow="ADMIN CONSOLE"
          title="Applications"
          subtitle="Review every application flowing through the platform and its current stage."
        />

        <div className="hh-tabs hh-tabs--pills hh-mb-3" role="tablist" aria-label="Application status">
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
            placeholder="Search by applicant, job or company…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
            aria-label="Search applications"
          />
        </div>

        <Card className="hh-card-body hh-p-0 hh-card--table">
          {visible.length > 0 ? (
            <DataTable
              zebra
              columns={[
                { key: 'applicant', label: 'Applicant' },
                { key: 'job', label: 'Applied for' },
                { key: 'applied', label: 'Applied' },
                { key: 'match', label: 'Match', align: 'center' },
                { key: 'status', label: 'Status' },
                { key: 'actions', label: 'Actions', align: 'right' },
              ]}
              rows={visible.map((app) => ({
                id: app.id,
                applicant: <UserCell name={app.applicant} meta={app.email} />,
                job: (
                  <>
                    <span className="hh-fw-medium">{app.job}</span>
                    <span className="text-muted d-block small">{app.company}</span>
                  </>
                ),
                applied: app.applied,
                match: <Badge variant="info" sm>{app.match}%</Badge>,
                status: <StatusBadge status={app.status} />,
                actions: (
                  <div className="d-flex justify-content-end gap-2">
                    <button
                      type="button"
                      className="hh-icon-btn"
                      data-tooltip="View application"
                      aria-label={`View application from ${app.applicant}`}
                      onClick={() => {
                        setViewing(app)
                        setActionError(null)
                      }}
                    >
                      <i className="bi bi-eye" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="hh-icon-btn"
                      data-tooltip="Move to next stage"
                      aria-label={`Move ${app.applicant} to next stage`}
                      disabled={!nextStageFor(app.status)}
                      onClick={() => openAdvance(app)}
                    >
                      <i className="bi bi-arrow-right-circle" aria-hidden="true" />
                    </button>
                  </div>
                ),
              }))}
              rowKey={(row) => row.id}
            />
          ) : (
            <div className="hh-p-5">
              <EmptyState icon="inbox" title="No applications match" text="Try a different search term or status filter." />
            </div>
          )}
        </Card>

        <TablePagination
          page={page}
          pageSize={PAGE_SIZE}
          total={filtered.length}
          onPageChange={setPage}
        />

        <Modal
          isOpen={Boolean(viewing)}
          onClose={() => setViewing(null)}
          title={viewing ? `Application — ${viewing.applicant}` : 'Application'}
        >
          {viewing ? (
            <div>
              <dl className="row mb-0">
                <dt className="col-sm-4">Applicant</dt>
                <dd className="col-sm-8">{viewing.applicant}</dd>

                <dt className="col-sm-4">Email</dt>
                <dd className="col-sm-8">{viewing.email}</dd>

                <dt className="col-sm-4">Applied for</dt>
                <dd className="col-sm-8">{viewing.job}</dd>

                <dt className="col-sm-4">Company</dt>
                <dd className="col-sm-8">{viewing.company}</dd>

                <dt className="col-sm-4">Applied</dt>
                <dd className="col-sm-8">{viewing.applied}</dd>

                <dt className="col-sm-4">Match</dt>
                <dd className="col-sm-8 mb-0">
                  <Badge variant="info" sm>
                    {viewing.match}%
                  </Badge>
                </dd>
              </dl>
            </div>
          ) : null}
        </Modal>

        <Modal
          isOpen={Boolean(advancing)}
          onClose={busy ? undefined : () => setAdvancing(null)}
          title="Move to next stage"
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setAdvancing(null)} disabled={busy}>
                Cancel
              </Button>
              <Button variant="primary" onClick={confirmAdvance} disabled={busy}>
                {busy ? 'Updating…' : 'Advance'}
              </Button>
            </>
          }
        >
          {advancing ? (
            <>
              <p className="mb-3">
                Move <strong>{advancing.applicant}</strong> for{' '}
                <strong>{advancing.job}</strong> to the next stage?
              </p>
              <FormSelect
                label="New stage"
                value={chosenStatus}
                onChange={(e) => setChosenStatus(e.target.value)}
                options={STATUS_OPTIONS.filter((o) => STAGE_ORDER.includes(o.value))}
                placeholder={null}
                disabled={busy}
              />
              {actionError ? (
                <div className="alert alert-danger mb-0" role="alert">
                  {actionError}
                </div>
              ) : null}
            </>
          ) : null}
        </Modal>
      </div>
    </section>
  )
}