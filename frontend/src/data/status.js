// Canonical status system for the whole product.
//
// One colour mapping used by every dashboard (employer + admin) so that a
// status always means the same colour everywhere:
//   green  = active / live / published / hired / confirmed / completed
//   gray   = new / closed / draft / hidden / paused / inactive
//   blue   = shortlisted / applied / scheduled
//   orange = pending / interview / review / under review
//   red    = rejected / cancelled / suspended / flagged / declined
//
// `StatusBadge` renders statuses through this map; pages never define their
// own per-status colours.

export const STATUS_VARIANT = {
  // Job posting state (employer + moderation)
  open: 'success',
  live: 'success',
  published: 'success',
  active: 'success',
  approved: 'success',
closed: 'secondary',
  draft: 'secondary',
  hidden: 'secondary',
  paused: 'secondary',
  inactive: 'secondary',
  archived: 'secondary',
  expired: 'secondary',
  new: 'secondary',
  verified: 'success',
  unverified: 'secondary',
  shortlisted: 'primary',
  applied: 'primary',
  scheduled: 'primary',
  pending: 'warning',
  interview: 'warning',
  review: 'warning',
  flagged: 'danger',
  hired: 'success',
  confirmed: 'success',
  completed: 'success',
  accepted: 'success',
  rejected: 'danger',
  cancelled: 'danger',
  suspended: 'danger',
  declined: 'danger',
}

export const STATUS_LABEL = {
  open: 'Live',
  live: 'Live',
  published: 'Published',
  active: 'Active',
  approved: 'Approved',
  closed: 'Closed',
  draft: 'Draft',
  hidden: 'Hidden',
  paused: 'Paused',
  inactive: 'Inactive',
  archived: 'Archived',
  expired: 'Expired',
  new: 'New',
  shortlisted: 'Shortlisted',
  applied: 'Applied',
  scheduled: 'Scheduled',
  pending: 'Pending',
  interview: 'Interview',
  review: 'Under review',
  flagged: 'Flagged',
  hired: 'Hired',
  confirmed: 'Confirmed',
  completed: 'Completed',
  accepted: 'Accepted',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  suspended: 'Suspended',
  declined: 'Declined',
}