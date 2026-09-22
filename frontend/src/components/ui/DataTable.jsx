// Shared data table. Defines the responsive wrapper + `<table>` shell with a
// consistent header treatment and default hover rows (via the hh-table CSS),
// so every dashboard table inherits the same polish. Columns:
//   { key, label, align: 'left'|'center'|'right', className, minWidth }
// Rows are plain objects keyed by column key; cell values are React nodes.
export default function DataTable({ columns = [], rows = [], rowKey, zebra = false }) {
  const alignClass = (align) =>
    align === 'center' ? 'hh-table-col-center' : align === 'right' ? 'hh-table-col-right' : ''

  if (!rowKey) {
    throw new Error('DataTable requires a `rowKey` prop (function of the row).')
  }

  return (
    <div className="table-responsive hh-table-responsive">
      <table className={`hh-table ${zebra ? 'hh-table--zebra' : ''} hh-mb-0`}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`${alignClass(col.align)} ${col.className || ''}`.trim()}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`${alignClass(col.align)} ${col.className || ''}`.trim()}
                  style={col.minWidth ? { minWidth: col.minWidth } : undefined}
                >
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}