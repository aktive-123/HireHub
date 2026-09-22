import { useMemo, useState } from 'react'
import { jobsApi } from '../../services/api'
import { useApiData } from '../../hooks/useApiData'
import SectionHeading from '../../components/ui/SectionHeading'
import Reveal from '../../components/ui/Reveal'
import EmptyState from '../../components/ui/EmptyState'
import LoadingState from '../../components/ui/LoadingState'
import Pagination from '../../components/ui/Pagination'
import JobCard from '../../components/ui/JobCard'
import SortDropdown from '../../components/ui/SortDropdown'

const PAGE_SIZE = 6

const TYPES = ['all', 'Full-time', 'Contract', 'Part-time', 'Internship', 'Remote']

const SORT_OPTIONS = [
  { value: 'relevant', label: 'Most Relevant' },
  { value: 'newest', label: 'Newest' },
  { value: 'salary-high', label: 'Salary: High to Low' },
  { value: 'salary-low', label: 'Salary: Low to High' },
]

export default function SeekerBrowseJobsPage() {
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [sort, setSort] = useState('relevant')
  const [page, setPage] = useState(1)

  const { data, loading, error, reload } = useApiData(() => jobsApi.list({ per_page: 50 }), [])

  const jobs = data?.items ?? []

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = jobs.filter((job) => {
      const matchesQuery =
        !q ||
        job.title.toLowerCase().includes(q) ||
        job.location.toLowerCase().includes(q) ||
        (job.company?.name || '').toLowerCase().includes(q) ||
        (job.tags || []).some((t) => t.toLowerCase().includes(q))
      const matchesType = type === 'all' || job.employment_type === type || job.workplace === type
      return matchesQuery && matchesType
    })

    list = [...list].sort((a, b) => {
      if (sort === 'newest') return a.posted_days_ago - b.posted_days_ago
      if (sort === 'salary-high') return (b.salary?.max || 0) - (a.salary?.max || 0)
      if (sort === 'salary-low') return (a.salary?.min || 0) - (b.salary?.min || 0)
      return Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured))
    })

    return list
  }, [jobs, query, type, sort])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const clearAll = () => {
    setQuery('')
    setType('all')
    setSort('relevant')
    setPage(1)
  }

  if (loading) {
    return (
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <Reveal>
            <LoadingState text="Loading jobs…" />
          </Reveal>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <Reveal>
            <EmptyState
              icon="exclamation-triangle"
              title="Couldn't load jobs"
              text="Something went wrong while fetching jobs. Please try again."
              action={
                <button type="button" className="hh-btn hh-btn-outline-primary hh-btn-pill" onClick={() => reload()}>
                  Try again
                </button>
              }
            />
          </Reveal>
        </div>
      </section>
    )
  }

  return (
    <>
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <Reveal>
            <SectionHeading
              eyebrow="JOB SEEKER DASHBOARD"
              title="Find your next opportunity"
              subtitle="Search and discover jobs that match your skills, experience, and career goals."
            />
          </Reveal>

          <Reveal delay={60}>
            <div className="hh-jobs-toolbar">
              <div className="hh-toolbar hh-toolbar-between hh-jobs-toolbar-row">
                <div className="hh-search-field hh-search-field-lg">
                  <i className="bi bi-search" aria-hidden="true" />
                  <input
                    type="search"
                    className="hh-form-control"
                    placeholder="Job title, skills, or company…"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setPage(1) }}
                    aria-label="Search jobs"
                  />
                </div>
                <SortDropdown
                  options={SORT_OPTIONS}
                  value={sort}
                  onChange={(v) => { setSort(v); setPage(1) }}
                  label="Sort by"
                />
              </div>

              <div className="hh-filter-chips" aria-label="Filter by job type">
                {TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`hh-btn hh-btn-outline-primary hh-btn-sm ${
                      type === t ? 'is-active' : ''
                    }`}
                    onClick={() => { setType(t); setPage(1) }}
                  >
                    {t === 'all' ? 'All types' : t}
                  </button>
                ))}
              </div>
            </div>
          </Reveal>

          <div className="hh-job-results">
            <p className="hh-result-count">
              {filtered.length} {filtered.length === 1 ? 'job found' : 'jobs found'}
            </p>
            {type !== 'all' && (
              <span className="hh-result-summary">
                <i className="bi bi-sliders" aria-hidden="true" />
                Showing <strong>{type}</strong> roles
              </span>
            )}
          </div>

          {visible.length > 0 ? (
            <div className="row g-4">
              {visible.map((job, idx) => (
                <div className="col-12 col-md-6 col-lg-4" key={job.id}>
                  <JobCard job={job} index={idx} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="search"
              title="No jobs found"
              text="Try adjusting your search or clearing the filters."
              action={
                <button
                  type="button"
                  className="hh-btn hh-btn-outline-primary hh-btn-pill"
                  onClick={clearAll}
                >
                  Clear filters
                </button>
              }
            />
          )}

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