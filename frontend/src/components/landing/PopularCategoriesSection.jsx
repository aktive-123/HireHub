import { Link } from 'react-router-dom'
import Reveal from '../ui/Reveal'

export default function PopularCategoriesSection() {
  const categories = [
    { id: 'tech', name: 'Technology', count: '12,460+ jobs', icon: 'code-slash' },
    { id: 'design', name: 'Design', count: '8,560+ jobs', icon: 'vector-pen' },
    { id: 'marketing', name: 'Marketing', count: '7,320+ jobs', icon: 'megaphone' },
    { id: 'finance', name: 'Finance', count: '6,210+ jobs', icon: 'cash-coin' },
    { id: 'healthcare', name: 'Healthcare', count: '4,120+ jobs', icon: 'heart-pulse' },
    { id: 'education', name: 'Education', count: '3,980+ jobs', icon: 'mortarboard' },
    { id: 'sales', name: 'Sales', count: '3,660+ jobs', icon: 'graph-up-arrow' },
    { id: 'support', name: 'Customer Support', count: '2,980+ jobs', icon: 'headset' },
  ]

  return (
    <section className="hh-section-space bg-white">
      <div className="page-container">
        {/* Header Row */}
        <div className="d-flex align-items-end justify-content-between mb-5 flex-wrap gap-3">
          <div>
            <div className="hh-section-eyebrow">BROWSE BY CATEGORY</div>
            <h2 className="hh-section-title mb-2">Popular Job Categories</h2>
            <p className="hh-section-subtitle">
              Explore jobs in your field and take the next step in your career.
            </p>
          </div>
          <Link to="/jobs" className="hh-btn hh-btn-outline-primary hh-btn-sm hh-btn-pill">
            View all categories <i className="bi bi-arrow-right ms-1" aria-hidden="true" />
          </Link>
        </div>

        {/* 8 Categories Grid */}
        <div className="row g-4">
          {categories.map((cat, index) => (
            <div key={cat.id} className="col-12 col-sm-6 col-lg-3">
              <Reveal delay={index * 80}>
                <Link to={`/jobs?cat=${cat.id}`} className="hh-category-card">
                  <div className="hh-category-icon hh-category-icon--brand">
                    <i className={`bi bi-${cat.icon}`} aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="hh-category-title">{cat.name}</h3>
                    <div className="hh-category-count">{cat.count}</div>
                  </div>
                </Link>
              </Reveal>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
