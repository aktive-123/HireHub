import { useState } from 'react'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import StatusBadge from '../../components/ui/StatusBadge'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Reveal from '../../components/ui/Reveal'
import { adminCategories } from '../../data/admin'
import { adminApi } from '../../services/api'
import { adaptCategories } from '../../services/api/adminAdapters'
import { useAdminList } from '../../hooks/useAdminData'

const EMPTY_FORM = { name: '', icon: '', description: '', status: 'active' }

export default function AdminCategoriesPage() {
  const { items: categories, refetch, loading, error } = useAdminList(
    () => adminApi.categories().then(adaptCategories),
    adminCategories
  )

  const [editing, setEditing] = useState(null) // null | { ...category }
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  const openCreate = () => {
    setEditing({})
    setForm(EMPTY_FORM)
    setFormError(null)
  }

  const openEdit = (category) => {
    setEditing(category)
    setForm({
      name: category.name ?? '',
      icon: category.icon ?? '',
      description: category.description ?? '',
      status: category.status ?? 'active',
    })
    setFormError(null)
  }

  const closeForm = () => {
    if (saving) return
    setEditing(null)
    setFormError(null)
  }

  const handleChange = (field) => (event) => {
    const { value } = event.target
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      const payload = {
        name: form.name.trim(),
        icon: form.icon.trim() || null,
        description: form.description.trim() || null,
        status: form.status,
      }
      if (editing?.slug) {
        await adminApi.updateCategory(editing.slug, payload)
      } else {
        await adminApi.createCategory(payload)
      }
      setEditing(null)
      refetch()
    } catch (err) {
      setFormError(err?.message || 'Could not save the category.')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    setDeleting(true)
    setDeleteError(null)
    try {
      await adminApi.deleteCategory(pendingDelete.slug ?? pendingDelete.id)
      setPendingDelete(null)
      refetch()
    } catch (err) {
      setDeleteError(err?.message || 'Could not delete the category.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section className="hh-section-space bg-white">
      <div className="page-container">
        <AdminPageHeader
          eyebrow="ADMIN CONSOLE"
          title="Categories"
          subtitle="Curate the job categories shown across the listing pages."
          action={
            <Button variant="primary" icon="bi-plus-lg" onClick={openCreate}>
              Add category
            </Button>
          }
        />

        {error ? (
          <div className="alert alert-danger" role="alert">
            Could not load categories: {error.message}
          </div>
        ) : null}

        <div className="row g-4">
          {categories.map((category, index) => (
            <div className="col-12 col-sm-6 col-lg-3" key={category.id}>
              <Reveal delay={index * 50}>
                <Card className="hh-card-body hh-card-hover h-100 d-flex flex-column">
                  <div className="hh-stat-icon hh-stat-icon-primary hh-mb-2">
                    <i className={`bi bi-${category.icon}`} aria-hidden="true" />
                  </div>
                  <h3 className="hh-fw-semibold text-secondary hh-mb-0">{category.name}</h3>
                  <span className="text-muted small hh-mb-3">{category.jobs} open roles</span>
                  <div className="mt-auto d-flex align-items-center justify-content-between gap-2">
                    <StatusBadge status={category.status} />
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="hh-icon-btn"
                        data-tooltip="Edit category"
                        aria-label={`Edit ${category.name}`}
                        onClick={() => openEdit(category)}
                      >
                        <i className="bi bi-pencil" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="hh-icon-btn hh-icon-btn-danger hh-tip-start"
                        data-tooltip="Delete category"
                        aria-label={`Delete ${category.name}`}
                        onClick={() => {
                          setPendingDelete(category)
                          setDeleteError(null)
                        }}
                      >
                        <i className="bi bi-trash" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </Card>
              </Reveal>
            </div>
          ))}
        </div>

        {loading ? <p className="text-muted small mt-3 mb-0">Refreshing categories…</p> : null}

        <Modal
          isOpen={Boolean(editing)}
          onClose={closeForm}
          title={editing?.id ? 'Edit category' : 'Add category'}
          footer={
            <>
              <Button variant="ghost" onClick={closeForm} disabled={saving}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSubmit} disabled={saving || !form.name.trim()}>
                {saving ? 'Saving…' : editing?.id ? 'Save changes' : 'Create category'}
              </Button>
            </>
          }
        >
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label" htmlFor="category-name">
                Name
              </label>
              <input
                id="category-name"
                className="form-control"
                value={form.name}
                onChange={handleChange('name')}
                disabled={saving}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="category-icon">
                Icon
              </label>
              <input
                id="category-icon"
                className="form-control"
                value={form.icon}
                onChange={handleChange('icon')}
                disabled={saving}
                placeholder="e.g. code-slash"
              />
              <div className="form-text">
                Bootstrap Icons name, without the <code>bi-</code> prefix.
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="category-description">
                Description
              </label>
              <textarea
                id="category-description"
                className="form-control"
                rows={3}
                value={form.description}
                onChange={handleChange('description')}
                disabled={saving}
              />
            </div>
            <div className="mb-0">
              <label className="form-label" htmlFor="category-status">
                Status
              </label>
              <select
                id="category-status"
                className="form-select"
                value={form.status}
                onChange={handleChange('status')}
                disabled={saving}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            {formError ? (
              <div className="alert alert-danger mt-3 mb-0" role="alert">
                {formError}
              </div>
            ) : null}
          </form>
        </Modal>

        <ConfirmDialog
          isOpen={Boolean(pendingDelete)}
          title="Delete category"
          message={
            pendingDelete
              ? `Delete “${pendingDelete.name}”? This cannot be undone.`
              : ''
          }
          confirmLabel="Delete"
          busy={deleting}
          error={deleteError}
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmDelete}
        />
      </div>
    </section>
  )
}