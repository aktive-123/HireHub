import Badge from './Badge'
import { STATUS_VARIANT, STATUS_LABEL } from '../../data/status'

// Renders any status value through the product-wide colour system so statuses
// mean the same colour everywhere (see data/status.js). Pass an explicit
// `label` only when the copy should differ from the canonical label.
export default function StatusBadge({
  status,
  label,
  dot = true,
  sm = false,
  icon,
  className = '',
}) {
  return (
    <Badge
      variant={STATUS_VARIANT[status] || 'secondary'}
      dot={dot}
      sm={sm}
      icon={icon}
      className={className}
    >
      {label || STATUS_LABEL[status] || status}
    </Badge>
  )
}