export default function PlaceholderPage({
  stage,
  title,
  text = 'This page is part of the HireHub frontend build and will be implemented in a later stage.',
}) {
  return (
    <section className="page-container">
      <div className="hh-placeholder">
        <span className="hh-placeholder-stage">Stage {stage}</span>
        <h1 className="hh-placeholder-title">{title}</h1>
        <p className="hh-placeholder-text">{text}</p>
      </div>
    </section>
  )
}