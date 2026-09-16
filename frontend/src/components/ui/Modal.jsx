import { useEffect } from 'react'

export default function Modal({
  isOpen = false,
  onClose,
  title,
  size = 'md',
  children,
  footer,
  className = '',
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose()
      }
    }
    if (isOpen) {
      document.body.classList.add('modal-open')
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.body.classList.remove('modal-open')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizeClass = size === 'lg' ? 'modal-lg' : size === 'sm' ? 'modal-sm' : ''

  return (
    <>
      <div
        className="modal fade show d-block"
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
      >
        <div className={`modal-dialog modal-dialog-centered ${sizeClass} ${className}`}>
          <div className="modal-content hh-card-elevated border-0 rounded-4">
            {title && (
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold text-dark">{title}</h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={onClose}
                />
              </div>
            )}
            <div className="modal-body p-4">{children}</div>
            {footer && (
              <div className="modal-footer border-top p-3">{footer}</div>
            )}
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" onClick={onClose} />
    </>
  )
}
