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
  reviewing: 'warning',
  // The employer has paid and the offer is with the candidate. Orange, not
  // green: nothing is complete until the seeker accepts, and colouring it as
  // "hired" would read as a filled vacancy that can still be declined.
  offer_confirmed_pending_acceptance: 'warning',
  withdrawn: 'secondary',
  flagged: 'danger',
  hired: 'success',
  confirmed: 'success',
  completed: 'success',
  accepted: 'success',
  rejected: 'danger',
  cancelled: 'danger',
  suspended: 'danger',
  declined: 'danger',

  // Money (PaymentStatus). "succeeded" is the only green one: a pending or
  // processing charge has not paid for anything yet, so showing it as
  // active would overstate entitlements the employer does not have.
  succeeded: 'success',
  refunded: 'secondary',
  processing: 'primary',
  failed: 'danger',

  // Subscriptions (SubscriptionStatus). past_due is orange rather than red:
  // access is still granted while the retry window is open, so the warning has
  // to be actionable without reading as "your account is closed".
  trialing: 'primary',
  past_due: 'warning',
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
  reviewing: 'Under review',
  // Neutral wording, because this map is shared: the employer sees the same badge
  // the seeker does. "Awaiting your acceptance" is only correct on the seeker's
  // own screens, so those pages pass an explicit label instead.
  offer_confirmed_pending_acceptance: 'Awaiting response',
  withdrawn: 'Withdrawn',
  flagged: 'Flagged',
  hired: 'Hired',
  confirmed: 'Confirmed',
  completed: 'Completed',
  accepted: 'Accepted',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  suspended: 'Suspended',
  declined: 'Declined',

  succeeded: 'Paid',
  refunded: 'Refunded',
  processing: 'Processing',
  failed: 'Failed',

  trialing: 'Trial',
  past_due: 'Past due',
}