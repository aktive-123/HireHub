import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { publicJobs, publicJobCategories } from '../../data/jobs'
import JobCard from '../../components/ui/JobCard'
import EmptyState from '../../components/ui/EmptyState'
import Pagination from '../../components/ui/Pagination'
import Button from '../../components/ui/Button'
import SortDropdown from '../../components/ui/SortDropdown'
import HeroSection from '../../components/ui/HeroSection'
import heroSlide1 from '../../assets/findjob.webp'
import heroSlide2 from '../../assets/findjob2.jpg'
import heroSlide3 from '../../assets/findjob3.jpg'
import heroSlide4 from '../../assets/findjob4.jpg'

const heroSlides = [heroSlide1, heroSlide2, heroSlide3, heroSlide4]

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship']
const WORKPLACES = ['Remote', 'Hybrid', 'On-site']
const LEVELS = ['Entry Level', 'Mid Level', 'Senior', 'Executive']
const LOCATIONS = ['Lagos, Nigeria', 'Abuja, Nigeria', 'Remote']

const SALARY_BUCKETS = [
  { value: 'under-50k', label: 'Under $50k', min: 0, max: 50000 },
  { value: '50k-90k', label: '$50k - $90k', min: 50000, max: 90000 },
  { value: '90k-plus', label: '$90k and above', min: 90000, max: Infinity },
]

const CATEGORY_NAMES = Array.from(new Set(publicJobs.map((job) => job.category)))

const POPULAR_SEARCHES = ['Frontend Developer', 'Data Analyst', 'Designer', 'Laravel', 'Remote']

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'newest', label: 'Newest' },
  { value: 'salary-high', label: 'Salary: High to Low' },
  { value: 'salary-low', label: 'Salary: Low to High' },
]

const PAGE_SIZE = 6

const jobMatchesKeyword = (job, keyword) =>
  !keyword ||
  job.title.toLowerCase().includes(keyword) ||
  job.company.name.toLowerCase().includes(keyword) ||
  (job.tags || []).some((t) => t.toLowerCase().includes(keyword)) ||
  job.category.toLowerCase().includes(keyword)

const jobMatchesLocation = (job, location) =>
  !location ||
  (location === 'Remote' ? job.workplace === 'Remote' : job.location === location)

const jobMatchesSalary = (job, bucket) =>
  !bucket ||
  (job.salary?.min != null &&
    job.salary.min >= bucket.min &&
    job.salary.min < bucket.max)

export default function JobListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [page, setPage] = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const resultsRef = useRef(null)

  const q = searchParams.get('q') ?? ''
  const loc = searchParams.get('loc') ?? ''
  const salaryKey = searchParams.get('salary') ?? ''
  const sort = searchParams.get('sort') ?? 'relevance'

  const getMulti = (key) => (searchParams.get(key) || '').split(',').filter(Boolean)
  const types = getMulti('type')
  const workplaces = getMulti('workplace')
  const levels = getMulti('level')
  const cats = getMulti('cat')

  const filterSignature = searchParams.toString()

  const [refreshing, setRefreshing] = useState(false)
  const prevSignature = useRef(filterSignature)
  useEffect(() => {
    if (prevSignature.current === filterSignature) return
    prevSignature.current = filterSignature
    setRefreshing(true)
    const id = setTimeout(() => setRefreshing(false), 320)
    return () => clearTimeout(id)
  }, [filterSignature])

  const updateParam = (key, value) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true }
    )
    setPage(1)
  }

  const toggleMulti = (key, value) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        const current = (next.get(key) || '').split(',').filter(Boolean)
        const idx = current.indexOf(value)
        if (idx >= 0) current.splice(idx, 1)
        else current.push(value)
        if (current.length) next.set(key, current.join(','))
        else next.delete(key)
        return next
      },
      { replace: true }
    )
    setPage(1)
  }

  const clearFilters = () => {
    setSearchParams({})
    setPage(1)
  }

  const scrollToResults = () => {
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    scrollToResults()
  }

  const handlePopular = (term) => {
    updateParam('q', term)
    scrollToResults()
  }

  const { filtered, counts } = useMemo(() => {
    const keyword = q.trim().toLowerCase()
    const salaryBucket = SALARY_BUCKETS.find((b) => b.value === salaryKey)

    const matchesOther = (job, except) => {
      if (!jobMatchesKeyword(job, keyword)) return false
      if (!jobMatchesLocation(job, loc)) return false
      if (except !== 'type' && types.length && !types.includes(job.employment_type)) return false
      if (except !== 'workplace' && workplaces.length && !workplaces.includes(job.workplace)) return false
      if (except !== 'level' && levels.length && !levels.includes(job.level)) return false
      if (except !== 'cat' && cats.length && !cats.includes(job.category)) return false
      if (except !== 'salary' && !jobMatchesSalary(job, salaryBucket)) return false
      return true
    }

    const countGroup = (except, values, getValue) =>
      Object.fromEntries(
        values.map((value) => [
          value,
          publicJobs.filter((job) => matchesOther(job, except) && getValue(job) === value).length,
        ])
      )

    const counts = {
      type: countGroup('type', JOB_TYPES, (job) => job.employment_type),
      workplace: countGroup('workplace', WORKPLACES, (job) => job.workplace),
      level: countGroup('level', LEVELS, (job) => job.level),
      category: countGroup('cat', CATEGORY_NAMES, (job) => job.category),
      salary: Object.fromEntries(
        SALARY_BUCKETS.map((bucket) => [
          bucket.value,
          publicJobs.filter((job) => matchesOther(job, 'salary') && jobMatchesSalary(job, bucket))
            .length,
        ])
      ),
    }

    const list = publicJobs.filter((job) => matchesOther(job, null))

    const sorted = [...list]
    if (sort === 'salary-high') {
      sorted.sort((a, b) => (b.salary?.min ?? 0) - (a.salary?.min ?? 0))
    } else if (sort === 'salary-low') {
      sorted.sort((a, b) => (a.salary?.min ?? 0) - (b.salary?.min ?? 0))
    } else if (sort === 'newest') {
      sorted.sort((a, b) => (a.posted_days_ago ?? 0) - (b.posted_days_ago ?? 0))
    }

    return { filtered: sorted, counts }
  }, [q, loc, salaryKey, sort, types, workplaces, levels, cats])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageJobs = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const activeFilterCount =
    types.length + workplaces.length + levels.length + cats.length + (salaryKey ? 1 : 0)

  const chips = []
  if (q) chips.push({ key: 'q', label: `"${q}"`, clear: () => updateParam('q', '') })
  if (loc) chips.push({ key: 'loc', label: `Location: ${loc}`, clear: () => updateParam('loc', '') })
  types.forEach((t) =>
    chips.push({ key: `type-${t}`, label: t, clear: () => toggleMulti('type', t) })
  )
  workplaces.forEach((w) =>
    chips.push({ key: `workplace-${w}`, label: w, clear: () => toggleMulti('workplace', w) })
  )
  levels.forEach((l) =>
    chips.push({ key: `level-${l}`, label: l, clear: () => toggleMulti('level', l) })
  )
  cats.forEach((c) => chips.push({ key: `cat-${c}`, label: c, clear: () => toggleMulti('cat', c) }))
  if (salaryKey) {
    const bucket = SALARY_BUCKETS.find((b) => b.value === salaryKey)
    if (bucket) chips.push({ key: 'salary', label: bucket.label, clear: () => updateParam('salary', '') })
  }

  const heroStats = [
    { value: String(publicJobs.length), icon: 'briefcase', label: 'Active jobs' },
    {
      value: String(new Set(publicJobs.map((job) => job.company.name)).size),
      icon: 'buildings',
      label: 'Hiring companies',
    },
    {
      value: String(publicJobs.filter((job) => (job.posted_days_ago ?? 99) <= 7).length),
      icon: 'clock-history',
      label: 'New this week',
    },
  ]

  return (
    <>
      <HeroSection
        images={heroSlides}
        eyebrow="JOB SEARCH"
        title="Find Your Next Opportunity"
        subtitle="Search and discover jobs that match your skills, experience, and career goals."
      >
        <form className="hh-jobs-search" role="search" onSubmit={handleSearchSubmit}>
          <div className="hh-hero-search-bar">
            <div className="hh-search-field">
              <i className="bi bi-search hh-search-field-icon" aria-hidden="true" />
              <input
                type="search"
                className="hh-search-field-input"
                placeholder="Job title, skills, or company"
                value={q}
                onChange={(e) => updateParam('q', e.target.value)}
                aria-label="Search jobs by keyword"
              />
            </div>

            <div className="hh-search-field">
              <i className="bi bi-geo-alt hh-search-field-icon" aria-hidden="true" />
              <select
                className="hh-search-field-select"
                value={loc}
                onChange={(e) => updateParam('loc', e.target.value)}
                aria-label="Location"
              >
                <option value="">All locations</option>
                {LOCATIONS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            <div className="hh-search-field">
              <i className="bi bi-briefcase hh-search-field-icon" aria-hidden="true" />
              <select
                className="hh-search-field-select"
                value={types[0] || ''}
                onChange={(e) => updateParam('type', e.target.value)}
                aria-label="Job type"
              >
                <option value="">All job types</option>
                {JOB_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <Button type="submit" size="lg" pill icon="search">
              Search Jobs
            </Button>
          </div>

          <div className="hh-hero-popular-tags hh-hero-popular">
            <span className="hh-hero-popular-label">Popular:</span>
            {POPULAR_SEARCHES.map((term) => (
              <button
                type="button"
                key={term}
                className="hh-hero-tag-btn"
                onClick={() => handlePopular(term)}
              >
                {term}
              </button>
            ))}
          </div>
        </form>

        <div className="hh-hero-stats">
          {heroStats.map((stat) => (
            <div className="hh-hero-stat" key={stat.label}>
              <span className="hh-hero-stat-icon">
                <i className={`bi bi-${stat.icon}`} aria-hidden="true" />
              </span>
              <span className="hh-hero-stat-text">
                <span className="hh-hero-stat-value">{stat.value}</span>
                <span className="hh-hero-stat-label">{stat.label}</span>
              </span>
            </div>
          ))}
        </div>
      </HeroSection>

      <section className="hh-section-space bg-white" ref={resultsRef}>
        <div className="page-container">
          <div className="hh-jobs-layout">
            <aside
              id="advanced-filters"
              className={`hh-jobs-filters ${filtersOpen ? 'is-open' : ''}`}
              aria-label="Job filters"
            >
              <div className="hh-filter-panel">
                <div className="hh-filters-head">
                  <h2>Filters</h2>
                  <button
                    type="button"
                    className="hh-filters-head-clear"
                    onClick={clearFilters}
                    disabled={activeFilterCount === 0}
                  >
                    Clear all
                  </button>
                </div>

                <div className="hh-filter-group">
                  <h3>Job Type</h3>
                  <div className="hh-filter-list">
                    {JOB_TYPES.map((t) => {
                      const count = counts.type[t] || 0
                      return (
                        <label
                          className={`hh-filter-option ${count === 0 ? 'is-disabled' : ''}`}
                          key={t}
                        >
                          <input
                            type="checkbox"
                            checked={types.includes(t)}
                            disabled={count === 0}
                            onChange={() => toggleMulti('type', t)}
                          />
                          <span className="hh-filter-option-label">{t}</span>
                          <span className="hh-filter-count">{count}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div className="hh-filter-group">
                  <h3>Workplace</h3>
                  <div className="hh-filter-list">
                    {WORKPLACES.map((w) => {
                      const count = counts.workplace[w] || 0
                      return (
                        <label
                          className={`hh-filter-option ${count === 0 ? 'is-disabled' : ''}`}
                          key={w}
                        >
                          <input
                            type="checkbox"
                            checked={workplaces.includes(w)}
                            disabled={count === 0}
                            onChange={() => toggleMulti('workplace', w)}
                          />
                          <span className="hh-filter-option-label">{w}</span>
                          <span className="hh-filter-count">{count}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div className="hh-filter-group">
                  <h3>Experience Level</h3>
                  <div className="hh-filter-list">
                    {LEVELS.map((l) => {
                      const count = counts.level[l] || 0
                      return (
                        <label
                          className={`hh-filter-option ${count === 0 ? 'is-disabled' : ''}`}
                          key={l}
                        >
                          <input
                            type="checkbox"
                            checked={levels.includes(l)}
                            disabled={count === 0}
                            onChange={() => toggleMulti('level', l)}
                          />
                          <span className="hh-filter-option-label">{l}</span>
                          <span className="hh-filter-count">{count}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div className="hh-filter-group">
                  <h3>Category</h3>
                  <div className="hh-filter-list">
                    {publicJobCategories
                      .filter((c) => CATEGORY_NAMES.includes(c.name))
                      .map((c) => {
                        const count = counts.category[c.name] || 0
                        return (
                          <label
                            className={`hh-filter-option ${count === 0 ? 'is-disabled' : ''}`}
                            key={c.id}
                          >
                            <input
                              type="checkbox"
                              checked={cats.includes(c.name)}
                              disabled={count === 0}
                              onChange={() => toggleMulti('cat', c.name)}
                            />
                            <span className="hh-filter-option-label">{c.name}</span>
                            <span className="hh-filter-count">{count}</span>
                          </label>
                        )
                      })}
                  </div>
                </div>

                <div className="hh-filter-group">
                  <h3>Salary</h3>
                  <div className="hh-filter-list">
                    {SALARY_BUCKETS.map((b) => {
                      const count = counts.salary[b.value] || 0
                      return (
                        <label
                          className={`hh-filter-option ${count === 0 ? 'is-disabled' : ''}`}
                          key={b.value}
                        >
                          <input
                            type="radio"
                            name="salary"
                            checked={salaryKey === b.value}
                            disabled={count === 0}
                            onChange={() =>
                              updateParam('salary', salaryKey === b.value ? '' : b.value)
                            }
                          />
                          <span className="hh-filter-option-label">{b.label}</span>
                          <span className="hh-filter-count">{count}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div className="hh-filters-actions d-lg-none">
                  <Button variant="primary" block onClick={() => setFiltersOpen(false)}>
                    Show {filtered.length} {filtered.length === 1 ? 'job' : 'jobs'}
                  </Button>
                </div>
              </div>
            </aside>

            <div className="hh-jobs-results">
              <div className="hh-jobs-toolbar">
                <div className="hh-toolbar hh-toolbar-between">
                  <div className="hh-toolbar">
                    <Button
                      variant="ghost"
                      size="sm"
                      pill
                      icon="sliders"
                      iconPosition="left"
                      className="d-lg-none"
                      onClick={() => setFiltersOpen((v) => !v)}
                      aria-expanded={filtersOpen}
                      aria-controls="advanced-filters"
                    >
                      Filters
                      {activeFilterCount > 0 && (
                        <span className="hh-btn-badge">{activeFilterCount}</span>
                      )}
                    </Button>
                    <p className="hh-result-count">
                      {filtered.length} {filtered.length === 1 ? 'job' : 'jobs'} found
                    </p>
                  </div>

                  <SortDropdown
                    options={SORT_OPTIONS}
                    value={sort}
                    onChange={(v) => updateParam('sort', v)}
                    ariaLabel="Sort jobs"
                  />
                </div>

                {chips.length > 0 && (
                  <div className="hh-filter-chips">
                    {chips.map((chip) => (
                      <span className="hh-filter-chip" key={chip.key}>
                        {chip.label}
                        <button
                          type="button"
                          onClick={chip.clear}
                          aria-label={`Remove ${chip.label} filter`}
                        >
                          <i className="bi bi-x-lg" aria-hidden="true" />
                        </button>
                      </span>
                    ))}
                    <button type="button" className="hh-filter-clear" onClick={clearFilters}>
                      Clear all
                    </button>
                  </div>
                )}
              </div>

              <div className={`hh-results-body ${refreshing ? 'is-refreshing' : ''}`}>
                {pageJobs.length > 0 ? (
                  <div className="row g-4">
                    {pageJobs.map((job, index) => (
                      <div className="col-12 col-md-6" key={job.id}>
                        <JobCard job={job} index={index} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon="search"
                    title="No jobs found"
                    text="Try adjusting your search keywords or removing some filters."
                    action={
                      <Button
                        variant="outline"
                        icon="x-circle"
                        iconPosition="left"
                        onClick={clearFilters}
                      >
                        Clear filters
                      </Button>
                    }
                  />
                )}
              </div>

              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                className="hh-mt-5"
              />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}