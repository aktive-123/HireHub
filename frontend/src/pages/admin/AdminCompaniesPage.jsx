import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import UserCell from '../../components/admin/UserCell'
import Badge from '../../components/ui/Badge'
import StatusBadge from '../../components/ui/StatusBadge'
import DataTable from '../../components/ui/DataTable'
import TablePagination from '../../components/ui/TablePagination'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import FormInput from '../../components/ui/FormInput'
import FormSelect from '../../components/ui/FormSelect'
import { adminCompanies, ACCOUNT_LABELS } from '../../data/admin'
import { adminApi } from '../../services/api'
import { adaptCompanies } from '../../services/api/adminAdapters'
import { useAdminList } from '../../hooks/useAdminData'

const PAGE_SIZE = 8

const SIZE_OPTIONS = ['1-10', '11-50', '51-200', '201-500', '500+']

const EMPTY_FORM = {
  name: '',
  industry: '',
  location: '',
  size: '',
  website: '',
  tagline: '',
  description: '',
  logo_text: '',
}

export default function AdminCompaniesPage() {
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const { items: companies, refetch, loading, error } = useAdminList(
    () => adminApi.companies({}).then(adaptCompanies),
    adminCompanies
  )

  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  const activeCount = companies.filter((company) => company.status === 'active').length
  const pendingCount = companies.filter((company) => company.status === 'pending').length
  const verifiedCount = companies.filter((company) => company.verified).length

  const tabs = [
    { key: 'all', label: 'All', count: companies.length },
    { key: 'active', label: 'Active', count: activeCount },
    { key: 'pending', label: 'Pending', count: pendingCount },
  ]

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return companies.filter((company) => {
      const matchesTab = tab === 'all' || company.status === tab
      const matchesQuery =
        !q || company.name.toLowerCase().includes(q) || company.location.toLowerCase().includes(q)
      return matchesTab && matchesQuery
    })
  }, [tab, query, companies])

  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const openCreate = () => {
    setEditing({ isNew: true })
    setForm(EMPTY_FORM)
    setFormError(null)
  }

  const openEdit = (company) => {
    setEditing(company)
    setForm({
      name: company.name === '—' ? '' : company.name,
      industry: company.industry === '—' ? '' : company.industry,
      location: company.location === '—' ? '' : company.location,
      size: company.size === '—' ? '' : company.size,
      website: company.website ?? '',
      tagline: company.tagline ?? '',
      description: company.description ?? '',
      logo_text: company.logo_text ?? '',
    })
    setFormError(null)
  }

  const setField = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      const payload = {
        name: form.name.trim(),
        industry: form.industry.trim() || null,
        location: form.location.trim() || null,
        size: form.size || null,
        website: form.website.trim() || null,
        tagline: form.tagline.trim() || null,
        description: form.description.trim() || null,
        logo_text: form.logo_text.trim().toUpperCase() || null,
      }
      // Companies are addressed by slug, so the edit path uses the row key
      // rather than a numeric id.
      if (editing?.isNew) {
        await adminApi.createCompany(payload)
      } else {
        await adminApi.updateCompany(editing.id, payload)
      }
      setEditing(null)
      refetch()
    } catch (err) {
      setFormError(err?.message || 'Could not save the company.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="hh-section-space bg-white">
      <div className="page-container">
        <AdminPageHeader
          eyebrow="ADMIN CONSOLE"
          title="Companies"
          subtitle="Review company profiles, verification status and listing activity."
          action={
            <Button variant="primary" icon="bi-plus-lg" onClick={openCreate}>
              Add company
            </Button>
          }
        />

        <div className="row g-4 hh-mb-4">
          <div className="col-12 col-md-4">
            <Card className="hh-stat-card hh-card-hover">
              <div className="hh-stat-icon hh-stat-icon-primary">
                <i className="bi bi-buildings" aria-hidden="true" />
              </div>
              <div className="hh-stat-value">{companies.length}</div>
              <div className="hh-stat-label">Total Companies</div>
            </Card>
          </div>
          <div className="col-12 col-md-4">
            <Card className="hh-stat-card hh-card-hover">
              <div className="hh-stat-icon hh-stat-icon-success">
                <i className="bi bi-patch-check" aria-hidden="true" />
              </div>
              <div className="hh-stat-value">{verifiedCount}</div>
              <div className="hh-stat-label">Verified Companies</div>
            </Card>
          </div>
          <div className="col-12 col-md-4">
            <Card className="hh-stat-card hh-card-hover">
              <div className="hh-stat-icon hh-stat-icon-warning">
                <i className="bi bi-hourglass-split" aria-hidden="true" />
              </div>
              <div className="hh-stat-value">{pendingCount}</div>
              <div className="hh-stat-label">Pending Approval</div>
            </Card>
          </div>
        </div>

        <div className="hh-tabs hh-tabs--pills hh-mb-3" role="tablist" aria-label="Company status">
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
            placeholder="Search companies…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
            aria-label="Search companies"
          />
        </div>

        <Card className="hh-card-body hh-p-0 hh-card--table">
          {visible.length > 0 ? (
            <DataTable
              zebra
              columns={[
                { key: 'company', label: 'Company' },
                { key: 'industry', label: 'Industry' },
                { key: 'location', label: 'Location' },
                { key: 'size', label: 'Size' },
                { key: 'jobs', label: 'Open jobs' },
                { key: 'verified', label: 'Verified' },
                { key: 'status', label: 'Status' },
                { key: 'actions', label: 'Actions', align: 'right' },
              ]}
              rows={visible.map((company) => ({
                id: company.id,
                company: (
                  <UserCell
                    name={company.name}
                    meta={company.slug}
                    to={`/companies/${company.id}`}
                    logoText={company.logoText}
                    logoBg={company.logoBg}
                    logoColor={company.logoColor}
                    square
                  />
                ),
                industry: company.industry,
                location: company.location,
                size: company.size,
                jobs: company.jobs,
                verified: (
                  <Badge variant={company.verified ? 'success' : 'secondary'} sm icon={company.verified ? 'patch-check' : 'shield-x'}>
                    {company.verified ? 'Verified' : 'Unverified'}
                  </Badge>
                ),
                status: <StatusBadge status={company.status} label={ACCOUNT_LABELS[company.status]} />,
                actions: (
                  <div className="d-flex justify-content-end gap-2">
                    <Link to={`/companies/${company.id}`} className="hh-icon-btn" data-tooltip="View on site" aria-label={`View ${company.name} on site`}>
                      <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                    </Link>
                    <button
                      type="button"
                      className="hh-icon-btn"
                      data-tooltip="Edit company"
                      aria-label={`Edit ${company.name}`}
                      onClick={() => openEdit(company)}
                    >
                      <i className="bi bi-pencil" aria-hidden="true" />
                    </button>
                  </div>
                ),
              }))}
              rowKey={(row) => row.id}
            />
          ) : (
            <div className="hh-p-5">
              <EmptyState icon="buildings" title="No companies match" text="Try a different search term or status filter." />
            </div>
          )}
        </Card>

        <TablePagination
          page={page}
          pageSize={PAGE_SIZE}
          total={filtered.length}
          onPageChange={setPage}
        />

        {error ? (
          <div className="alert alert-danger mt-3 mb-0" role="alert">
            Could not load companies: {error.message}
          </div>
        ) : null}
        {loading ? <p className="text-muted small mt-3 mb-0">Refreshing companies…</p> : null}

        <Modal
          isOpen={Boolean(editing)}
          onClose={saving ? undefined : () => setEditing(null)}
          title={editing?.isNew ? 'Add company' : `Edit ${editing?.name ?? 'company'}`}
          footer={
            <>
              <Button variant="ghost" onClick={() => setEditing(null)} disabled={saving}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Saving…' : editing?.isNew ? 'Create company' : 'Save changes'}
              </Button>
            </>
          }
        >
          {editing ? (
            <>
              <div className="row g-3">
                <div className="col-12 col-md-8">
                  <FormInput
                    label="Company name"
                    value={form.name}
                    onChange={setField('name')}
                    disabled={saving}
                    required
                  />
                </div>
                <div className="col-12 col-md-4">
                  <FormInput
                    label="Logo text"
                    value={form.logo_text}
                    onChange={setField('logo_text')}
                    disabled={saving}
                    maxLength={4}
                    placeholder="e.g. GG"
                    hint="Up to 4 characters, shown when there is no logo image."
                  />
                </div>

                <div className="col-12 col-md-6">
                  <FormInput
                    label="Industry"
                    value={form.industry}
                    onChange={setField('industry')}
                    disabled={saving}
                  />
                </div>
                <div className="col-12 col-md-6">
                  <FormInput
                    label="Location"
                    value={form.location}
                    onChange={setField('location')}
                    disabled={saving}
                  />
                </div>

                <div className="col-12 col-md-6">
                  <FormSelect
                    label="Company size"
                    value={form.size}
                    onChange={setField('size')}
                    options={SIZE_OPTIONS.map((s) => ({ value: s, label: s }))}
                    placeholder="Select a size"
                    disabled={saving}
                  />
                </div>
                <div className="col-12 col-md-6">
                  <FormInput
                    label="Website"
                    type="url"
                    value={form.website}
                    onChange={setField('website')}
                    disabled={saving}
                    placeholder="https://"
                    hint="Must be a full URL including https://"
                  />
                </div>

                <div className="col-12">
                  <FormInput
                    label="Tagline"
                    value={form.tagline}
                    onChange={setField('tagline')}
                    disabled={saving}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label" htmlFor="company-description">
                    Description
                  </label>
                  <textarea
                    id="company-description"
                    className="form-control"
                    rows={3}
                    value={form.description}
                    onChange={setField('description')}
                    disabled={saving}
                  />
                </div>
              </div>

              {formError ? (
                <div className="alert alert-danger mb-0 mt-3" role="alert">
                  {formError}
                </div>
              ) : null}
            </>
          ) : null}
        </Modal>
      </div>
    </section>
  )
}