import useInView from '../../hooks/useInView'

export default function Reveal({ children, delay = 0, className = '', ...rest }) {
  const [ref, inView] = useInView({ once: true })
  return (
    <div
      ref={ref}
      className={`hh-reveal ${inView ? 'is-visible' : ''} ${className}`.trim()}
      style={{ transitionDelay: `${delay}ms`, '--hh-reveal-delay': `${delay}ms` }}
      {...rest}
    >
      {children}
    </div>
  )
}