export default function SectionHeading({
  eyebrow,
  eyebrowIcon,
  eyebrowAccent,
  title,
  titleWhite,
  subtitle,
  subtitleWhite,
  centered = true,
  className = '',
}) {
  return (
    <div
      className={`section-heading ${centered ? 'section-heading--centered' : ''} ${className}`.trim()}
    >
      {eyebrow && (
        <span className={`hh-section-eyebrow ${eyebrowAccent ? 'hh-section-eyebrow--accent' : ''}`}>
          {eyebrowIcon && <i className={`bi bi-${eyebrowIcon}`} aria-hidden="true" />}
          {eyebrow}
        </span>
      )}
      <h2 className={`hh-section-title ${titleWhite ? 'hh-section-title--white' : ''}`}>
        {title}
      </h2>
      {subtitle && (
        <p className={`hh-section-subtitle ${subtitleWhite ? 'hh-section-subtitle--white' : ''}`}>
          {subtitle}
        </p>
      )}
    </div>
  )
}