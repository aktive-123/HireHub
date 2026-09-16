export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  className = '',
}) {
  if (totalPages <= 1) return null

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <nav aria-label="Page navigation" className={`d-flex justify-content-center ${className}`}>
      <ul className="pagination gap-1">
        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
          <button
            className="page-link rounded-2"
            type="button"
            onClick={() => onPageChange && onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Previous"
          >
            <i className="bi bi-chevron-left" aria-hidden="true" />
          </button>
        </li>
        {pages.map((p) => (
          <li key={p} className={`page-item ${p === currentPage ? 'active' : ''}`}>
            <button
              className="page-link rounded-2"
              type="button"
              onClick={() => onPageChange && onPageChange(p)}
              aria-current={p === currentPage ? 'page' : undefined}
            >
              {p}
            </button>
          </li>
        ))}
        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
          <button
            className="page-link rounded-2"
            type="button"
            onClick={() => onPageChange && onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Next"
          >
            <i className="bi bi-chevron-right" aria-hidden="true" />
          </button>
        </li>
      </ul>
    </nav>
  )
}
