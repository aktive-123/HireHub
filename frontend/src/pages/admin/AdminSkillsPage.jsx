import { useState, useMemo } from 'react'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import Badge from '../../components/ui/Badge'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import Pagination from '../../components/ui/Pagination'
import { adminSkills } from '../../data/admin'

const PAGE_SIZE = 8

const CATEGORY_VARIANT = { Technology: 'primary', Design: 'info', Business: 'success' }

const TREND_META = {
  up: { icon: 'bi-arrow-up-right', variant: 'success', label: 'Rising' },
  down: { icon: 'bi-arrow-down-right', variant: 'danger', label: 'Declining' },
  flat: { icon: 'bi-dash', variant: 'secondary', label: 'Steady' },
}

export default function AdminSkillsPage() {
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const categories = ['all', 'Technology', 'Design', 'Business']

  const tabs = categories.map((category) => ({
    key: category,
    label: category === 'all' ? 'All' : category,
    count: category === 'all' ? adminSkills.length : adminSkills.filter((skill) => skill.category === category).length,
  }))

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return adminSkills.filter((skill) => {
      const matchesTab = tab === 'all' || skill.category === tab
      const matchesQuery = !q || skill.name.toLowerCase().includes(q)
      return matchesTab && matchesQuery
    })
  }, [tab, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <section className="hh-section-space bg-white">
      <div className="page-container">
        <AdminPageHeader
          eyebrow="ADMIN CONSOLE"
          title="Skills"
          subtitle="Track how often skills appear across profiles and postings."
        />

        <div className="hh-tabs hh-tabs--pills hh-mb-3" role="tablist" aria-label="Skill category">
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

        <div className="hh-search-field hh-mb-4">
          <i className="bi bi-search" aria-hidden="true" />
          <input
            type="search"
            className="hh-form-control"
            placeholder="Search skills…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
            aria-label="Search skills"
          />
        </div>

        <Card className="hh-card-body hh-p-0 hh-card--table">
          {visible.length > 0 ? (
            <div className="table-responsive">
              <table className="hh-table hh-table-hover hh-mb-0">
                <thead>
                  <tr>
                    <th>Skill</th>
                    <th>Category</th>
                    <th style={{ minWidth: 200 }}>Usage</th>
                    <th>Trend</th>
                    <th>Status</th>
                    <th className="hh-table-col-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((skill) => {
                    const maxUsage = 400
                    const pct = Math.round((Math.min(skill.usage, maxUsage) / maxUsage) * 100)
                    const trend = TREND_META[skill.trend]
                    return (
                      <tr key={skill.id}>
                        <td className="hh-fw-semibold">{skill.name}</td>
                        <td>
                          <Badge variant={CATEGORY_VARIANT[skill.category]} sm>
                            {skill.category}
                          </Badge>
                        </td>
                        <td>
                          <div className="hh-progress hh-mb-1">
                            <div
                              className={`hh-progress-bar ${skill.trend === 'up' ? 'hh-progress-bar--success' : skill.trend === 'down' ? 'hh-progress-bar--accent' : ''}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-muted small">{skill.usage} mentions</span>
                        </td>
                        <td>
                          <Badge variant={trend.variant} sm icon={trend.icon}>
                            {trend.label}
                          </Badge>
                        </td>
                        <td>
                          <Badge variant={skill.status === 'active' ? 'success' : 'secondary'} dot sm>
                            {skill.status === 'active' ? 'Active' : 'Hidden'}
                          </Badge>
                        </td>
                        <td className="hh-table-col-right">
                          <div className="d-flex justify-content-end gap-2">
                            <button type="button" className="hh-icon-btn" data-tooltip="Edit skill" aria-label={`Edit ${skill.name}`}>
                              <i className="bi bi-pencil" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className={`hh-icon-btn ${skill.status === 'active' ? 'hh-icon-btn-danger' : ''} hh-tip-start`}
                              data-tooltip={skill.status === 'active' ? 'Hide skill' : 'Show skill'}
                              aria-label={skill.status === 'active' ? `Hide ${skill.name}` : `Show ${skill.name}`}
                            >
                              <i className={`bi ${skill.status === 'active' ? 'bi-eye-slash' : 'bi-eye'}`} aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="hh-p-5">
              <EmptyState icon="cpu" title="No skills match" text="Try a different search term or category filter." />
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
  )
}