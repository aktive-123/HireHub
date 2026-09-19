import { Link } from 'react-router-dom'
import Card from '../ui/Card'
import Reveal from '../ui/Reveal'

function statCard({ icon, tone = 'primary', value, label, to }) {
  const content = (
    <Card className="hh-stat-card hh-card-hover">
      <div className={`hh-stat-icon hh-stat-icon-${tone}`}>
        <i className={`bi ${icon}`} aria-hidden="true" />
      </div>
      <div className="hh-stat-value">{value}</div>
      <div className="hh-stat-label">{label}</div>
    </Card>
  )
  return to ? (
    <Link to={to} className="hh-stat-link" aria-label={label}>
      {content}
    </Link>
  ) : (
    content
  )
}

export default function AdminStatGrid({ stats = [], cols = 4 }) {
  return (
    <div className="row g-4 hh-mb-5">
      {stats.map((stat, index) => (
        <div
          className={`col-6 col-md-6 col-lg-${12 / cols}`}
          key={stat.key || stat.label}
        >
          <Reveal delay={index * 60}>{statCard(stat)}</Reveal>
        </div>
      ))}
    </div>
  )
}