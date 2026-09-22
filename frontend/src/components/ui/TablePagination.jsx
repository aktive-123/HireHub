import Pagination from './Pagination'

// Item-count indicator + pagination for list/table views. Always shows
// "Showing X–Y of Z" so users know whether they're seeing the whole list;
// pagination controls only appear once there is more than one page.
export default function TablePagination({
  page = 1,
  pageSize,
  total = 0,
  onPageChange,
  align = 'between',
  className = '',
}) {
  const totalPages = Math.max(1, Math.ceil(Math.max(0, total) / Math.max(1, pageSize)))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div
      className={`hh-table-pagination hh-table-pagination--${align} ${className}`.trim()}
    >
      <span className="hh-results-meta">
        Showing <strong>{from}–{to}</strong> of <strong>{total}</strong>
      </span>
      {totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={onPageChange} />
      )}
    </div>
  )
}