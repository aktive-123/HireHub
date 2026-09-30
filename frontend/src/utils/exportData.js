// Client-side CSV/print helpers shared by the admin and employer exports.
//
// The platform data already arrives as JSON from the Laravel API, so a
// spreadsheet can be produced in the browser without a server round trip. A
// UTF-8 BOM is prepended because Excel on Windows otherwise drops the accents
// in names like "Sérgio" when it opens a UTF-8 file without one.

// Wraps a value in quotes and doubles any quote inside it, so separators and
// newlines inside user-entered text cannot break the column layout.
function escapeCell(value) {
  if (value === null || value === undefined) return ''
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

// Derives column headers from the keys of the first row so callers pass plain
// data objects rather than maintaining a second header list in sync.
function headersFor(rows) {
  const seen = []
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.includes(key)) seen.push(key)
    }
  }
  return seen
}

export function toCsv(rows, columns = null) {
  if (!rows || rows.length === 0) return ''
  const headers = columns ?? headersFor(rows)
  const lines = [headers.map(escapeCell).join(',')]
  for (const row of rows) {
    lines.push(headers.map((header) => escapeCell(row[header])).join(','))
  }
  return lines.join('\r\n')
}

export function downloadCsv(filename, rows, columns = null) {
  const csv = toCsv(rows, columns)
  if (!csv) return false
  downloadBlob(filename, `\uFEFF${csv}`, 'text/csv;charset=utf-8;')
  return true
}

export function downloadJson(filename, payload) {
  downloadBlob(filename, JSON.stringify(payload, null, 2), 'application/json;')
}

function downloadBlob(filename, contents, mime) {
  const blob = new Blob([contents], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // Revoking immediately can cancel the download in some browsers; defer a
  // tick so the navigation has definitely started.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Saves a binary API response to disk, honouring the server's
 * Content-Disposition filename.
 *
 * File downloads cannot go through the JSON axios path: the response is a
 * stream, so the raw XHR helper is used and the body is read as a blob. Every
 * endpoint that returns an attachment (CVs, exports) should come through here
 * so the filename parsing and object-URL cleanup stay in one place.
 */
export async function saveResponseAsFile(response, fallbackName) {
  if (!response?.ok) {
    throw new Error(`Download failed with status ${response?.status ?? 0}`)
  }
  const disposition = response.headers?.get('content-disposition') ?? ''
  const filename = disposition.match(/filename="?([^";]+)"?/)?.[1] ?? fallbackName
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return filename
}

// Strips a trailing extension so callers can pass "reports-2026-09" and get
// either "reports-2026-09.csv" or a matching print window title.
export function withDateStamp(prefix, date = new Date()) {
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
  return `${prefix}-${stamp}`
}
