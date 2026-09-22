import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { companiesApi } from '../../services/api'
import { useApiData } from '../../hooks/useApiData'
import CompanyCard from '../../components/ui/CompanyCard'
import EmptyState from '../../components/ui/EmptyState'
import Pagination from '../../components/ui/Pagination'
import Button from '../../components/ui/Button'
import SortDropdown from '../../components/ui/SortDropdown'
import PageHero from '../../components/ui/PageHero'
import heroSlide1 from '../../assets/company1.jpg'
import heroSlide2 from '../../assets/company3.jpg'
import heroSlide3 from '../../assets/company4.jpg'

const heroSlides = [heroSlide1, heroSlide2, heroSlide3]

const POPULAR_SEARCHES = ['Paystack', 'Flutterwave', 'Fintech', 'Google', 'Technology']

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'open-jobs', label: 'Most Open Jobs' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'reviews', label: 'Most Reviews' },
]

const PAGE_SIZE = 8

export default function CompaniesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [page, setPage] = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const resultsRef = useRef(null)

  const { data: loaded, loading, error } = useApiData(() => companiesApi.list().then((r) => r.items), [])
  const companies = loaded ?? []

  const industriesList = useMemo(
    () => Array.from(new Set(companies.map((c) => c.industry).filter(Boolean))).sort(),
    [companies]
  )
  const locationsList = useMemo(
    () => Array.from(new Set(companies.map((c) => c.location).filter(Boolean))).sort(),
    [companies]
  )

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

  const q = searchParams.get('q') ?? ''

  const getMulti = (key) => (searchParams.get(key) || '').split(',').filter(Boolean)
  const industries = getMulti('ind')
  const locations = getMulti('loc')
  const verifiedOnly = searchParams.get('verified') === '1'

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

  const toggleVerified = () => {
    updateParam('verified', verifiedOnly ? '' : '1')
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
    const q = (searchParams.get('q') ?? '').trim().toLowerCase()
    const sort = searchParams.get('sort') ?? 'relevance'

    const industries = (searchParams.get('ind') || '').split(',').filter(Boolean)
    const locations = (searchParams.get('loc') || '').split(',').filter(Boolean)
    const verifiedOnly = searchParams.get('verified') === '1'

    const matchesQuery = (company) =>
      !q ||
      company.name.toLowerCase().includes(q) ||
      (company.industry || '').toLowerCase().includes(q) ||
      (company.location || '').toLowerCase().includes(q) ||
      (company.tagline || '').toLowerCase().includes(q)

    const matchesOther = (company, except) => {
      if (!matchesQuery(company)) return false
      if (except !== 'ind' && industries.length && !industries.includes(company.industry)) {
        return false
      }
      if (except !== 'loc' && locations.length && !locations.includes(company.location)) {
        return false
      }
      if (except !== 'verified' && verifiedOnly && !company.is_verified) return false
      return true
    }

    const countGroup = (except, values, getValue) =>
      Object.fromEntries(
        values.map((value) => [
          value,
          companies.filter((c) => matchesOther(c, except) && getValue(c) === value).length,
        ])
      )

    const counts = {
      industry: countGroup('ind', industriesList, (c) => c.industry),
      location: countGroup('loc', locationsList, (c) => c.location),
      verified: companies.filter((c) => matchesOther(c, 'verified')).length,
    }

    const list = companies.filter((company) => matchesOther(company, null))

    const sorted = [...list]
    if (sort === 'open-jobs') {
      sorted.sort((a, b) => (b.open_jobs_count ?? 0) - (a.open_jobs_count ?? 0))
    } else if (sort === 'rating') {
      sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    } else if (sort === 'reviews') {
      sorted.sort((a, b) => (b.reviews_count ?? 0) - (a.reviews_count ?? 0))
    }

    return { filtered: sorted, counts }
  }, [searchParams])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageCompanies = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const activeFilterCount =
    industries.length + locations.length + (verifiedOnly ? 1 : 0)

  const chips = []
  if (q) chips.push({ key: 'q', label: `"${q}"`, clear: () => updateParam('q', '') })
  industries.forEach((ind) =>
    chips.push({ key: `ind-${ind}`, label: ind, clear: () => toggleMulti('ind', ind) })
  )
  locations.forEach((loc) =>
    chips.push({ key: `loc-${loc}`, label: loc, clear: () => toggleMulti('loc', loc) })
  )
  if (verifiedOnly) chips.push({ key: 'verified', label: 'Verified only', clear: toggleVerified })

  const heroStats = [
    { value: `${companies.length}+`, icon: 'buildings', label: 'Hiring companies' },
    {
      value: `${companies.reduce((sum, c) => sum + (c.open_jobs_count ?? 0), 0)}+`,
      icon: 'briefcase',
      label: 'Open roles',
    },
    {
      value: `${companies.filter((c) => c.is_verified).length}+`,
      icon: 'patch-check-fill',
      label: 'Verified companies',
    },
  ]

  return (
    <>
      <PageHero
        images={heroSlides}
        eyebrow="COMPANY DIRECTORY"
        title="Companies Hiring Now"
        subtitle="Explore verified employers and growing teams looking for talent on HireHub."
      >
        <form className="hh-jobs-search" role="search" onSubmit={handleSearchSubmit}>
          <div className="hh-hero-search-bar">
            <div className="hh-search-field">
              <i className="bi bi-search hh-search-field-icon" aria-hidden="true" />
              <input
                type="search"
                className="hh-search-field-input"
                placeholder="Company name, industry, or location"
                value={q}
                onChange={(e) => updateParam('q', e.target.value)}
                aria-label="Search companies by name, industry, or location"
              />
            </div>

            <Button type="submit" size="lg" pill icon="search">
              Search Companies
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
      </PageHero>

      <section className="hh-section-space bg-white" ref={resultsRef}>
        <div className="page-container">
          <div className="hh-jobs-layout">
            <aside
              id="advanced-filters"
              className={`hh-jobs-filters ${filtersOpen ? 'is-open' : ''}`}
              aria-label="Company filters"
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
                  <h3>Industry</h3>
                  <div className="hh-filter-list">
                    {industriesList.map((name) => {
                      const count = counts.industry[name] || 0
                      return (
                        <label
                          className={`hh-filter-option ${count === 0 ? 'is-disabled' : ''}`}
                          key={name}
                        >
                          <input
                            type="checkbox"
                            checked={industries.includes(name)}
                            disabled={count === 0}
                            onChange={() => toggleMulti('ind', name)}
                          />
                          <span className="hh-filter-option-label">{name}</span>
                          <span className="hh-filter-count">{count}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div className="hh-filter-group">
                  <h3>Location</h3>
                  <div className="hh-filter-list">
                    {locationsList.map((name) => {
                      const count = counts.location[name] || 0
                      return (
                        <label
                          className={`hh-filter-option ${count === 0 ? 'is-disabled' : ''}`}
                          key={name}
                        >
                          <input
                            type="checkbox"
                            checked={locations.includes(name)}
                            disabled={count === 0}
                            onChange={() => toggleMulti('loc', name)}
                          />
                          <span className="hh-filter-option-label">{name}</span>
                          <span className="hh-filter-count">{count}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div className="hh-filter-group">
                  <h3>Company status</h3>
                  <div className="hh-filter-list">
                    <label
                      className={`hh-filter-option ${counts.verified === 0 ? 'is-disabled' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={verifiedOnly}
                        disabled={counts.verified === 0}
                        onChange={toggleVerified}
                      />
                      <span className="hh-filter-option-label">Verified only</span>
                      <span className="hh-filter-count">{counts.verified}</span>
                    </label>
                  </div>
                </div>

                <div className="hh-filters-actions d-lg-none">
                  <Button variant="primary" block onClick={() => setFiltersOpen(false)}>
                    Show {filtered.length} {filtered.length === 1 ? 'company' : 'companies'}
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
                      {filtered.length} {filtered.length === 1 ? 'company' : 'companies'} found
                    </p>
                  </div>

                  <SortDropdown
                    options={SORT_OPTIONS}
                    value={searchParams.get('sort') ?? 'relevance'}
                    onChange={(v) => updateParam('sort', v)}
                    ariaLabel="Sort companies"
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
                {loading ? (
                  <div className="hh-loading-block">
                    <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                    Loading companies…
                  </div>
                ) : error ? (
                  <EmptyState
                    icon="wifi-off"
                    title="Could not load companies"
                    text="There was a problem connecting to the company directory. Please try again."
                  />
                ) : pageCompanies.length > 0 ? (
                  <div className="row g-4">
                    {pageCompanies.map((company, index) => (
                      <div className="col-12 col-md-6" key={company.id}>
                        <CompanyCard company={company} index={index} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon="buildings"
                    title="No companies found"
                    text="Try a different search term or removing some filters."
                    action={
                      <Button variant="outline" icon="x-circle" iconPosition="left" onClick={clearFilters}>
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