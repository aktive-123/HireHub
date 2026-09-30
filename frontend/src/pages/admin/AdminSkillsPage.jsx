import { useState, useMemo } from 'react'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import DataTable from '../../components/ui/DataTable'
import TablePagination from '../../components/ui/TablePagination'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import { adminSkills } from '../../data/admin'
import { adminApi } from '../../services/api'
import { adaptSkills } from '../../services/api/adminAdapters'
import { useAdminList } from '../../hooks/useAdminData'

const PAGE_SIZE = 8

const SORTS = [
  { key: 'usage', label: 'Most used' },
  { key: 'name', label: 'A–Z' },
]

export default function AdminSkillsPage() {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('usage')
  const [page, setPage] = useState(1)

  const { items: skills, loading, error } = useAdminList(
    () => adminApi.skills().then(adaptSkills),
    adminSkills
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = skills.filter((skill) => !q || skill.name.toLowerCase().includes(q))

    return [...matches].sort((a, b) =>
      sort === 'name' ? a.name.localeCompare(b.name) : b.usage - a.usage
    )
  }, [query, sort, skills])

  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Share is measured against the most-mentioned skill in the current result
  // set, so the bar always has a full-width leader to compare against.
  const maxUsage = Math.max(1, ...filtered.map((skill) => skill.usage))

  return (
    <section className="hh-section-space bg-white">
      <div className="page-container">
        <AdminPageHeader
          eyebrow="ADMIN CONSOLE"
          title="Skills in demand"
          subtitle="Derived from skills listed on candidate profiles and job postings."
        />

        {error ? (
          <div className="alert alert-danger" role="alert">
            Could not load skills: {error.message}
          </div>
        ) : null}

        <div className="hh-toolbar hh-toolbar-between hh-mb-4">
          <div className="hh-search-field-lg">
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

          <div className="hh-tabs hh-tabs--pills" role="tablist" aria-label="Sort skills">
            {SORTS.map((option) => (
              <button
                key={option.key}
                type="button"
                role="tab"
                aria-selected={sort === option.key}
                className={`hh-tab ${sort === option.key ? 'is-active' : ''}`}
                onClick={() => {
                  setSort(option.key)
                  setPage(1)
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <Card className="hh-card-body hh-p-0 hh-card--table">
          {visible.length > 0 ? (
            <DataTable
              zebra
              columns={[
                { key: 'rank', label: '#', width: 60 },
                { key: 'skill', label: 'Skill' },
                { key: 'usage', label: 'Mentions', minWidth: 220 },
              ]}
              rows={visible.map((skill, index) => {
                const pct = Math.round((skill.usage / maxUsage) * 100)
                return {
                  id: skill.name,
                  rank: <span className="text-muted">{page * PAGE_SIZE - PAGE_SIZE + index + 1}</span>,
                  skill: <span className="hh-fw-semibold">{skill.name}</span>,
                  usage: (
                    <>
                      <div className="hh-progress hh-mb-1">
                        <div className="hh-progress-bar" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-muted small">{skill.usage} mentions</span>
                    </>
                  ),
                }
              })}
              rowKey={(row) => row.id}
            />
          ) : (
            <div className="hh-p-5">
              <EmptyState
                icon="cpu"
                title="No skills match"
                text="Try a different search term."
              />
            </div>
          )}
        </Card>

        {loading ? <p className="text-muted small mt-3 mb-0">Refreshing skills…</p> : null}

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
