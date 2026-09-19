import { ARTICLE_CATEGORY_LABEL } from '@/data/resources'

export default function ResourceCover({ article, className = '' }) {
  const label = ARTICLE_CATEGORY_LABEL[article.category]
  return (
    <div
      className={`hh-resource-cover hh-resource-cover--tone-${article.tone} ${className}`.trim()}
    >
      <span className="hh-resource-cover-ring hh-resource-cover-ring--a" aria-hidden="true" />
      <span className="hh-resource-cover-ring hh-resource-cover-ring--b" aria-hidden="true" />
      <span className="hh-resource-cover-icon" aria-hidden="true">
        <i className={`bi bi-${article.icon}`} />
      </span>
      <span className="hh-resource-cover-label">{label}</span>
    </div>
  )
}