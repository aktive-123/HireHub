import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../../components/ui/PageHeader'
import StatusBadge from '../../components/ui/StatusBadge'
import DataTable from '../../components/ui/DataTable'
import TablePagination from '../../components/ui/TablePagination'
import EmptyState from '../../components/ui/EmptyState'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import FormInput from '../../components/ui/FormInput'
import FormSelect from '../../components/ui/FormSelect'
import LoadingState from '../../components/ui/LoadingState'
import { interviewApi, employerApi } from '../../services/api'

const PAGE_SIZE = 6
const STATUS_FILTERS = ['all', 'pending', 'scheduled', 'confirmed', 'completed', 'cancelled']

// The row action adapts to the interview's stage so users aren't offered one
// generic action regardless of status.
const ACTION = {
  pending: { label: 'Confirm', to: 'scheduled' },
  scheduled: { label: 'Confirm', to: 'confirmed' },
  confirmed: { label: 'Complete', to: 'completed' },
  completed: null,
  cancelled: { label: 'Rebook', to: 'scheduled' },
}

export default function EmployerInterviewsPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [saving, setSaving] = useState(null)

  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [applicants, setApplicants] = useState([])
  const [form, setForm] = useState({ application_id: '', scheduled_at: '', mode: 'video', link: '', notes: '' })

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await interviewApi.employerList()
      setItems(res.items ?? [])
    } catch (err) {
      // Prefer the server's wording (it distinguishes auth, validation and
      // network failures) and fall back to a generic line if none was sent.
      setError(err?.message || 'Could not load interviews. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    employerApi
      .applicants({ per_page: 50 })
      .then((list) => setApplicants(list ?? []))
      .catch(() => setApplicants([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((item) => {
      const matchesStatus = filter === 'all' || item.status === filter
      const matchesQuery =
        !q ||
        (item.applicant ?? '').toLowerCase().includes(q) ||
        (item.role ?? '').toLowerCase().includes(q)
      return matchesStatus && matchesQuery
    })
  }, [items, filter, query])

  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const runAction = async (interview) => {
    const step = ACTION[interview.status]
    if (!step) return
    setSaving(interview.id)
    try {
      await interviewApi.updateStatus(interview.id, step.to)
      await load()
    } catch {
      setError('Action failed. Please try again.')
    } finally {
      setSaving(null)
    }
  }

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const submitSchedule = async () => {
    if (!form.application_id || !form.scheduled_at) {
      setError('Pick an applicant and a date/time.')
      return
    }
    setSaving('schedule')
    try {
      await interviewApi.schedule({
        application_id: form.application_id,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        mode: form.mode,
        link: form.link || undefined,
        notes: form.notes || undefined,
      })
      setScheduleOpen(false)
      setForm({ application_id: '', scheduled_at: '', mode: 'video', link: '', notes: '' })
      await load()
    } catch {
      setError('Could not schedule the interview.')
    } finally {
      setSaving(null)
    }
  }

  return (
    <section className="hh-section-space bg-white">
      <div className="page-container">
        <PageHeader
          eyebrow="EMPLOYER DASHBOARD"
          title="Interviews"
          subtitle="Schedule, confirm and track your interview sessions."
          action={
            <Button
              variant="primary"
              icon="bi-plus-lg"
              onClick={() => setScheduleOpen(true)}
            >
              Schedule interview
            </Button>
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
            {STATUS_FILTERS.map((s) => (
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

        {error && (
          <div className="alert alert-danger hh-mb-4 d-flex justify-content-between align-items-center">
            <span>{error}</span>
            <button type="button" className="btn btn-sm btn-outline-danger" onClick={load}>
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <LoadingState label="Loading interviews…" />
        ) : visible.length > 0 ? (
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
              rows={visible.map((interview) => {
                const step = ACTION[interview.status]
                return {
                  id: interview.id,
                  applicant: <span className="hh-fw-semibold">{interview.applicant}</span>,
                  role: interview.role,
                  when: interview.when,
                  mode: interview.mode,
                  status: <StatusBadge status={interview.status} />,
                  action: step ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={saving === interview.id}
                      onClick={() => runAction(interview)}
                    >
                      {step.label}
                    </Button>
                  ) : (
                    <span className="text-secondary small">—</span>
                  ),
                }
              })}
              rowKey={(row) => row.id}
            />
          </Card>
        ) : (
          <Card className="hh-card-body">
            <EmptyState icon="calendar3" title="No interviews found" text="Try a different search or schedule your first interview." />
          </Card>
        )}

        <TablePagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
      </div>

      <Modal
        isOpen={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        title="Schedule an interview"
      >
        <div className="d-grid gap-3">
          <FormSelect
            label="Candidate"
            value={form.application_id}
            onChange={(e) => updateField('application_id', e.target.value)}
            placeholder="Select a candidate…"
            required
            options={applicants.map((applicant) => ({
              value: String(applicant.id).replace(/^app-/, ''),
              label: `${applicant.name} — ${applicant.job}`,
            }))}
          />
          <FormInput
            label="Date & time"
            type="datetime-local"
            value={form.scheduled_at}
            onChange={(e) => updateField('scheduled_at', e.target.value)}
            required
          />
          <FormSelect
            label="Mode"
            value={form.mode}
            onChange={(e) => updateField('mode', e.target.value)}
            options={[
              { value: 'video', label: 'Video' },
              { value: 'on-site', label: 'On-site' },
              { value: 'phone', label: 'Phone' },
            ]}
          />
          <FormInput
            label="Meeting link (video only)"
            type="url"
            placeholder="https://meet.example.com/xyz"
            value={form.link}
            onChange={(e) => updateField('link', e.target.value)}
          />
          <div>
            <label htmlFor="interview-notes" className="form-label">
              Notes
            </label>
            <textarea
              id="interview-notes"
              className="form-control"
              rows="3"
              placeholder="Agenda, instructions, prep material…"
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
            />
          </div>
          {error && <div className="alert alert-danger hh-mb-0">{error}</div>}
        </div>
        <div className="d-flex justify-content-end gap-2 mt-4">
          <Button variant="ghost" onClick={() => setScheduleOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" icon="bi-calendar-check" disabled={saving === 'schedule'} onClick={submitSchedule}>
            {saving === 'schedule' ? 'Scheduling…' : 'Schedule'}
          </Button>
        </div>
      </Modal>
    </section>
  )
}