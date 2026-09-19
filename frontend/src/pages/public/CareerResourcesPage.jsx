import { useMemo, useState } from 'react'
import HeroSection from '@/components/ui/HeroSection'
import SectionHeading from '@/components/ui/SectionHeading'
import Reveal from '@/components/ui/Reveal'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import ResourceCover from '@/components/ui/ResourceCover'
import AuthorAvatar from '@/components/ui/AuthorAvatar'
import FinalCtaSection from '@/components/landing/FinalCtaSection'
import {
  RESOURCE_CATEGORIES,
  RESOURCES,
  ARTICLE_CATEGORY_LABEL,
} from '@/data/resources'
import heroSlide1 from '@/assets/hero4.jpg'
import heroSlide2 from '@/assets/hero5.jpg'
import heroSlide3 from '@/assets/hero6.jpg'

const heroSlides = [heroSlide1, heroSlide2, heroSlide3]

const featured = RESOURCES[0]

export function ResourceCard({ article, featured = false }) {
  const label = ARTICLE_CATEGORY_LABEL[article.category]
  return (
    <article className={`hh-resource-card ${featured ? 'hh-resource-card--featured' : ''}`.trim()}>
      <a href={`/resources/${article.slug}`} className="hh-resource-cover-wrap" tabIndex={-1}>
        <ResourceCover article={article} />
      </a>
      <div className="hh-resource-card-body">
        <div className="hh-resource-card-meta">
          <span className="hh-chip">{label}</span>
          <span className="hh-resource-read">{article.readTime}</span>
        </div>
        <h3 className={featured ? 'hh-resource-featured-inline-title' : 'hh-resource-title'}>
          <a href={`/resources/${article.slug}`}>{article.title}</a>
        </h3>
        <p className="hh-resource-excerpt">{article.excerpt}</p>
        <div className="hh-resource-author">
          <AuthorAvatar name={article.author} />
          <span>
            {article.author}
            <span className="hh-resource-author-date"> · {article.date}</span>
          </span>
        </div>
      </div>
    </article>
  )
}

export default function CareerResourcesPage() {
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')

  const counts = useMemo(() => {
    const map = { all: RESOURCES.length }
    RESOURCE_CATEGORIES.forEach((c) => {
      map[c.id] = RESOURCES.filter((r) => r.category === c.id).length
    })
    return map
  }, [])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return RESOURCES.filter((r) => {
      const inCategory = category === 'all' || r.category === category
      if (!inCategory) return false
      if (!q) return true
      return (
        r.title.toLowerCase().includes(q) ||
        r.excerpt.toLowerCase().includes(q) ||
        r.author.toLowerCase().includes(q)
      )
    })
  }, [category, query])

  const showFeatured = category === 'all' && !query.trim()

  return (
    <>
      <HeroSection
        deep
        images={heroSlides}
        eyebrow="CAREER RESOURCES"
        title="Build Your Career With Confidence"
        subtitle="Practical resources to help you find opportunities, improve your skills, and navigate your career journey."
      />

      <section className="hh-section-space bg-white">
        <div className="page-container">
          <Reveal>
            <SectionHeading
              eyebrow="LEARN & GROW"
              title="Guides that actually help"
              subtitle="Recruiter-written playbooks on CVs, interviews, and career growth — short enough to finish, practical enough to use."
            />
          </Reveal>

          <Reveal delay={100}>
            <div className="hh-resource-toolbar">
              <div className="hh-resource-pills" role="tablist" aria-label="Filter guides by topic">
                <button
                  type="button"
                  className={`hh-resource-pill ${category === 'all' ? 'is-active' : ''}`}
                  onClick={() => setCategory('all')}
                >
                  All Guides <span>{counts.all}</span>
                </button>
                {RESOURCE_CATEGORIES.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    className={`hh-resource-pill ${category === c.id ? 'is-active' : ''}`}
                    onClick={() => setCategory(c.id)}
                  >
                    <i className={`bi bi-${c.icon}`} aria-hidden="true" />
                    {c.title} <span>{counts[c.id]}</span>
                  </button>
                ))}
              </div>

              <div className="hh-resource-search">
                <i className="bi bi-search hh-resource-search-icon" aria-hidden="true" />
                <input
                  type="search"
                  className="hh-resource-search-input"
                  placeholder="Search guides by topic or author"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search career guides"
                />
                {query && (
                  <button
                    type="button"
                    className="hh-resource-search-clear"
                    onClick={() => setQuery('')}
                    aria-label="Clear search"
                  >
                    <i className="bi bi-x-circle-fill" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          </Reveal>

          <div className="hh-resource-results-bar">
            <p className="hh-result-count">
              <strong>{shown.length}</strong> {shown.length === 1 ? 'guide' : 'guides'}
              {category !== 'all' && ` in ${ARTICLE_CATEGORY_LABEL[category]}`}
            </p>
            {(category !== 'all' || query) && (
              <button
                type="button"
                className="hh-filter-clear"
                onClick={() => {
                  setCategory('all')
                  setQuery('')
                }}
              >
                Clear filters
              </button>
            )}
          </div>

          {shown.length > 0 ? (
            <div className="hh-resource-grid hh-mt-4" key={`${category}-${query}`}>
              {showFeatured && (
                <Reveal className="hh-resource-grid-item--wide">
                  <ResourceCard article={featured} featured />
                </Reveal>
              )}
              {shown
                .filter((r) => r !== featured)
                .map((article, index) => (
                  <Reveal key={article.slug} delay={index * 70}>
                    <ResourceCard article={article} />
                  </Reveal>
                ))}
            </div>
          ) : (
            <EmptyState
              icon="search"
              title="No guides match your search"
              text="Try a different keyword, or browse every guide in the library."
              action={
                <Button
                  variant="outline"
                  pill
                  onClick={() => {
                    setCategory('all')
                    setQuery('')
                  }}
                >
                  Browse All Guides
                </Button>
              }
              className="hh-mt-5"
            />
          )}
        </div>
      </section>

      <FinalCtaSection
        eyebrow="BUILD YOUR CAREER WITH HIREHUB"
        title="One Profile, Every Opportunity"
        subtitle="Create a free profile, upload your CV, and let employers find you while you focus on growing."
        primaryTo="/register/job-seeker"
        primaryLabel="Create Your Profile"
        secondaryTo="/jobs"
        secondaryLabel="Find Jobs"
      />
    </>
  )
}