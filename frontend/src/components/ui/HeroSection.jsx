import Reveal from './Reveal'
import HeroSlideshow from './HeroSlideshow'

/* Shared hero system — the single source of truth for every header band on
   the site. It owns the background (photo slideshow + one brand overlay),
   the padding/min-height rhythm, the type scale, and left-aligned text-block
   widths, so all pages inherit the same system automatically.

   Props (all optional):
   - images: photo slideshow array (falls back to navy band if omitted)
   - eyebrow / title / subtitle: standard hero copy block (staggered reveal)
   - children: anything rendered after the copy block (search bars, detail rows, …)
   - deep: opt-in stronger scrim for photos that need extra contrast
 */
export default function HeroSection({
  images = [],
  eyebrow,
  title,
  subtitle,
  children,
  className = '',
  deep = false,
  ...rest
}) {
  const classes = ['hh-page-hero', deep && 'hh-page-hero--deep', className]
    .filter(Boolean)
    .join(' ')

  return (
    <section className={classes} {...rest}>
      <HeroSlideshow images={images} />
      <div className="page-container">
        {eyebrow && (
          <Reveal>
            <div className="hh-section-eyebrow">{eyebrow}</div>
          </Reveal>
        )}

        {title && (
          <Reveal delay={80}>
            <h1 className="hh-page-hero-title">{title}</h1>
          </Reveal>
        )}

        {subtitle && (
          <Reveal delay={160}>
            <p className="hh-page-hero-text">{subtitle}</p>
          </Reveal>
        )}

        {children}
      </div>
    </section>
  )
}