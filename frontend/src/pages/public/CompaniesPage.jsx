import { useMemo, useState } from 'react'
import { publicCompanies } from '../../data/companies'
import CompanyCard from '../../components/ui/CompanyCard'
import SectionHeading from '../../components/ui/SectionHeading'
import Reveal from '../../components/ui/Reveal'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'

const INDUSTRIES = [
  'All',
  'Technology',
  'Fintech',
  'Finance',
  'Healthcare',
  'Education',
  'E-commerce',
  'E-commerce & Retail',
]

export default function CompaniesPage() {
  const [query, setQuery] = useState('')
  const [industry, setIndustry] = useState('All')
  const [verifiedOnly, setVerifiedOnly] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return publicCompanies.filter((c) => {
      const matchesIndustry = industry === 'All' || c.industry === industry
      const matchesQuery = !q || c.name.toLowerCase().includes(q) || (c.location || '').toLowerCase().includes(q)
      const matchesVerified = !verifiedOnly || c.is_verified
      return matchesIndustry && matchesQuery && matchesVerified
    })
  }, [query, industry, verifiedOnly])

  return (
    <>
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <Reveal>
            <div className="hh-toolbar hh-toolbar-between hh-mb-4">
              <SectionHeading
                eyebrow="COMPANY DIRECTORY"
                title="Browse Companies"
                subtitle="Explore verified employers hiring on HireHub."
              />
            </div>
          </Reveal>

          <Reveal>
            <div className="hh-toolbar hh-toolbar-between hh-mb-4">
              <div className="hh-search-field hh-search-field-lg">
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
              <select
                className="hh-form-select hh-form-select-sm"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                aria-label="Filter by industry"
              >
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>
              <label className="hh-check hh-check-sm hh-mb-0">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => setVerifiedOnly(e.target.checked)}
                />
                <span className="hh-small">Verified only</span>
              </label>
            </div>
          </Reveal>

          <p className="hh-result-count hh-mb-4">
            {filtered.length} {filtered.length === 1 ? 'company' : 'companies'} found
          </p>

          {filtered.length > 0 ? (
            <div className="row g-4">
              {filtered.map((company, index) => (
                <div className="col-12 col-sm-6 col-lg-4" key={company.id}>
                  <Reveal delay={Math.min(index * 60, 420)}>
                    <CompanyCard company={company} index={index} />
                  </Reveal>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="buildings"
              title="No companies found"
              text="Try a different search term or clear your filters."
            />
          )}

          {filtered.length > 9 && (
            <div className="hh-toolbar-center hh-mt-5">
              <button
                type="button"
                className="hh-btn hh-btn-outline-primary hh-btn-pill"
                onClick={() => setPage((p) => p + 1)}
              >
                Load more companies
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
