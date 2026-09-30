import Modal from '../ui/Modal'
import StatusBadge from '../ui/StatusBadge'
import Badge from '../ui/Badge'

/**
 * Read-only detail panel for a console table row.
 *
 * The admin user, job-seeker and employer tables each had a "View" button that
 * did nothing because no detail endpoint existed for them. Rather than add
 * three near-identical GET routes, the panel renders the fields the list
 * endpoint already returns — which are real values, since the adapters no
 * longer substitute placeholders.
 *
 * `fields` is a list of { label, value } pairs; entries whose value is null or
 * an em dash are skipped so the panel does not show a column of blanks.
 */
export default function RowDetailModal({ isOpen, onClose, title, subtitle, status, fields = [] }) {
  const populated = fields.filter(
    (field) => field.value !== null && field.value !== undefined && field.value !== '' && field.value !== '—'
  )

  return (
    // Modal only takes a title, so supporting copy goes in the body — same
    // convention as the company/application admin modals.
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      {subtitle ? <p className="text-muted mb-3">{subtitle}</p> : null}

      {status ? (
        <div className="mb-3">
          <StatusBadge status={status.value} label={status.label} />
          {status.verified ? (
            <Badge variant="success" className="hh-ms-2">
              Verified
            </Badge>
          ) : null}
        </div>
      ) : null}

      {populated.length > 0 ? (
        // Each label/value pair must stay adjacent: HTML5 allows a <div> group
        // inside <dl>, and rendering every <dt> before every <dd> would break
        // the name-value pairing in the grid.
        <dl className="row g-0 mb-0">
          {populated.map((field) => (
            <div className="col-12 col-sm-6" key={field.label}>
              <dt className="text-muted small text-uppercase">{field.label}</dt>
              <dd className={`mb-2${field.muted ? ' text-muted' : ''}`}>{field.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-muted mb-0">No further details have been recorded yet.</p>
      )}
    </Modal>
  )
}
