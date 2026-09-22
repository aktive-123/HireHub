import { ARTICLE_CATEGORY_LABEL } from '@/data/resources'

/* Per-category focal points: people-heavy shots (interviews) get more headroom
   so faces land comfortably inside the 4:3 crop; documents/misc stay central. */
const FOCAL_POINTS = {
  resume: '50% 42%',
  interviews: '50% 24%',
  growth: '50% 30%',
}

export default function ResourceCover({ article, className = '' }) {
  const label = ARTICLE_CATEGORY_LABEL[article.category]
  const hasImage = Boolean(article.image)
  const classes = [
    'hh-resource-cover',
    hasImage ? 'hh-resource-cover--image' : `hh-resource-cover--tone-${article.tone}`,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes}>
      {hasImage ? (
        <>
          <img
            src={article.image}
            alt=""
            className="hh-resource-cover-img"
            style={{ objectPosition: FOCAL_POINTS[article.category] }}
            loading="lazy"
            decoding="async"
            aria-hidden="true"
          />
          <span className="hh-resource-cover-shade" aria-hidden="true" />
        </>
      ) : (
        <>
          <span className="hh-resource-cover-ring hh-resource-cover-ring--a" aria-hidden="true" />
          <span className="hh-resource-cover-ring hh-resource-cover-ring--b" aria-hidden="true" />
          <span className="hh-resource-cover-icon" aria-hidden="true">
            <i className={`bi bi-${article.icon}`} />
          </span>
        </>
      )}
      <span className="hh-resource-cover-label">{label}</span>
    </div>
  )
}