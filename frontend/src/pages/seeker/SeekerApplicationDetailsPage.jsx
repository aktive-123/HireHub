import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { seekerApi } from '../../services/api'
import { useApiData } from '../../hooks/useApiData'
import PageHeader from '../../components/ui/PageHeader'
import Reveal from '../../components/ui/Reveal'
import StatusBadge from '../../components/ui/StatusBadge'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Alert from '../../components/ui/Alert'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import EmptyState from '../../components/ui/EmptyState'
import LoadingState from '../../components/ui/LoadingState'
import UpsellModal from '../../components/seeker/UpsellModal'

// The seeker-visible stages, in the order they happen. `offer` is deliberately
// absent: it is the employer's unconfirmed offer, and the seeker's own timeline
// only starts paying attention once the employer has committed the hiring fee.
const STAGES = [
  { key: 'new', label: 'Application submitted' },
  { key: 'reviewing', label: 'Under review' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'interview', label: 'Interview' },
  { key: 'offer_confirmed_pending_acceptance', label: 'Offer confirmed' },
  { key: 'hired', label: 'Hired' },
]

// Every status that ends the pipeline, and the copy that explains it. Without
// this the seeker sees "Withdrawn" on an offer they declined and has no idea
// whether to expect anything further.
const TERMINAL_COPY = {
  rejected:
    'This application was closed by the employer. There is nothing further to do here, but you can keep applying to other roles.',
  withdrawn:
    'You declined this offer, so the application is closed. The role stays open with the employer, and nothing further is expected from you.',
}

/**
 * How the seeker should read the current state, and what they can do about it.
 *
 * The single most important case is `offer_confirmed_pending_acceptance`: the
 * employer has already paid the hiring fee, which confirms the offer, but the
 * hire only completes when the seeker accepts. That makes accepting the most
 * consequential button in the product, so it gets a real confirmation dialog
 * rather than a direct call.
 */
function useNextStep(status) {
  return useMemo(() => {
    switch (status) {
      case 'offer_confirmed_pending_acceptance':
        return {
          title: 'You have an offer to accept',
          body: 'This employer has confirmed the offer and paid the placement fee, so the role is yours if you want it. Accepting closes the listing and notifies the employer. Declining is final and the placement fee is not refunded, because the employer committed to the hire.',
          primary: { label: 'Accept offer', icon: 'bi-check-lg' },
          secondary: { label: 'Decline offer', icon: 'bi-x-lg' },
          canAct: true,
        }
      case 'hired':
        return {
          title: 'You are hired',
          body: 'You accepted this offer, so the role is filled and the listing has closed. The employer will contact you with onboarding details.',
          primary: { label: 'Add interview prep', icon: 'bi-stars' },
          secondary: null,
          canAct: false,
        }
      case 'interview':
        return {
          title: 'Interview stage',
          body: 'Your interview has been scheduled. Review the details and confirm your availability.',
          primary: { label: 'View interview details', icon: 'bi-camera-video', to: '/seeker/notifications' },
          secondary: null,
          canAct: false,
        }
      case 'withdrawn':
      case 'rejected':
        return {
          title: 'This application is closed',
          body: TERMINAL_COPY[status],
          primary: { label: 'Browse more roles', icon: 'bi-search', to: '/jobs' },
          secondary: null,
          canAct: false,
        }
      default:
        return {
          title: "What's next?",
          body: 'Keep this application moving by staying responsive to employer messages.',
          primary: null,
          secondary: null,
          canAct: false,
        }
    }
  }, [status])
}

export default function SeekerApplicationDetailsPage() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: application, loading, error, reload } = useApiData(
    () => seekerApi.application(id),
    [id]
  )

  const [confirming, setConfirming] = useState(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [notice, setNotice] = useState('')
  const [upsells, setUpsells] = useState(null)

  // The gateway returns here after a paid add-on. Read during the first render
  // rather than in an effect: this is a fresh page load off the redirect, the
  // flag is present exactly once, and the URL is scrubbed immediately afterwards
  // so a refresh does not reopen the modal over whatever the seeker does next.
  const [justReturned] = useState(() => searchParams.get('upsell_return') === '1')
  const [upsellOpen, setUpsellOpen] = useState(justReturned)

  useEffect(() => {
    if (!searchParams.has('upsell_return')) return
    const next = new URLSearchParams(searchParams)
    next.delete('upsell_return')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const status = application?.status || ''
  const isHired = status === 'hired'
  const isClosed = status === 'rejected' || status === 'withdrawn'
  const canAct = status === 'offer_confirmed_pending_acceptance'
  const nextStep = useNextStep(status)

  const timeline = useMemo(() => {
    const currentIndex = STAGES.findIndex((stage) => stage.key === status)

    return STAGES.map((stage, index) => {
      let state = 'is-pending'

      if (isHired) {
        // Everything is behind us once the seeker is hired.
        state = 'is-complete'
      } else if (isClosed) {
        // The pipeline stopped early: everything up to where it stopped
        // happened, and nothing after it will.
        state = currentIndex === -1 ? 'is-pending' : index <= currentIndex ? 'is-complete' : 'is-pending'
      } else if (currentIndex !== -1) {
        if (index < currentIndex) state = 'is-complete'
        if (index === currentIndex) state = 'is-current'
      }

      return { ...stage, state }
    })
  }, [status, isHired, isClosed])

  const handleAccept = async () => {
    setBusy(true)
    setActionError(null)

    try {
      const result = await seekerApi.acceptOffer(id)
      setConfirming(null)
      setNotice('Offer accepted. You are hired — the employer has been notified.')
      // The accept response carries the catalogue for exactly this moment, so
      // the add-on offer can appear without another round trip. Left null means
      // "nothing for sale", which the modal renders as an empty state.
      setUpsells(result.upsells ?? [])
      setUpsellOpen(true)
      await reload()
    } catch (err) {
      setActionError(err?.message || 'We could not record your acceptance. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const handleDecline = async () => {
    setBusy(true)
    setActionError(null)

    try {
      await seekerApi.declineOffer(id)
      setConfirming(null)
      setNotice('Offer declined. The employer has been told.')
      await reload()
    } catch (err) {
      setActionError(err?.message || 'We could not record that. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  // Stable identities: the upsell modal restarts its poll whenever these change,
  // and inline arrows would restart it on every render of this page.
  const handleUpsellClose = useCallback(() => {
    setUpsellOpen(false)
    setUpsells(null)
  }, [])

  const handleUpsellPurchased = useCallback(() => {
    reload()
  }, [reload])

  if (loading) {
    return (
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <Reveal>
            <LoadingState text="Loading application…" />
          </Reveal>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <Reveal>
            <EmptyState
              icon="exclamation-triangle"
              title="Couldn't load this application"
              text="Something went wrong while fetching this application. Please try again."
              action={
                <button type="button" className="hh-btn hh-btn-outline-primary hh-btn-pill" onClick={() => reload()}>
                  Try again
                </button>
              }
            />
          </Reveal>
        </div>
      </section>
    )
  }

  if (!application) {
    return (
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <EmptyState
            icon="file-earmark-x"
            title="Application not found"
            text="This application may have been removed, or the link is incorrect."
          />
          <div className="text-center hh-mt-4">
            <Button to="/seeker/applications" variant="outline">Back to applications</Button>
          </div>
        </div>
      </section>
    )
  }

  const companyName = typeof application.company === 'string' ? application.company : application.company?.name

  return (
    <>
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <PageHeader
            eyebrow="JOB SEEKER DASHBOARD"
            title="Application details"
            subtitle="Review your application and follow its progress."
          />

          {notice && (
            <Alert variant="success" dismissible onDismiss={() => setNotice('')} className="hh-mb-4">
              {notice}
            </Alert>
          )}

          {actionError && (
            <Alert variant="danger" dismissible onDismiss={() => setActionError(null)} className="hh-mb-4">
              {actionError}
            </Alert>
          )}

          <div className="row g-4">
            <div className="col-12 col-lg-8">
              <Reveal>
                <Card className="hh-card-body hh-mb-4">
                  <div className="hh-app-row hh-p-0">
                    <div
                      className="hh-app-logo"
                      style={{
                        background: 'var(--hh-bg-soft)',
                        color: 'var(--hh-primary)',
                      }}
                    >
                      {String(companyName ?? '?').charAt(0)}
                    </div>
                    <div className="hh-app-info">
                      <span className="hh-app-title">{application.job}</span>
                      <div className="hh-app-company">{companyName}</div>
                      <div className="hh-app-meta">
                        {application.location ? (
                          <span>
                            <i className="bi bi-geo-alt hh-me-1" aria-hidden="true" />
                            {application.location}
                          </span>
                        ) : null}
                        <span>
                          <i className="bi bi-clock hh-me-1" aria-hidden="true" />
                          Applied {application.applied}
                        </span>
                      </div>
                    </div>
                    <div className="hh-app-action">
                      <StatusBadge
                        status={status}
                        label={
                          status === 'offer_confirmed_pending_acceptance'
                            ? 'Awaiting your acceptance'
                            : undefined
                        }
                      />
                    </div>
                  </div>
                </Card>
              </Reveal>

              <Reveal delay={60}>
                <Card className="hh-card-body">
                  <div className="hh-card-title-md hh-mb-4">Application timeline</div>
                  <ol className="hh-timeline">
                    {timeline.map((stage) => (
                      <li className={`hh-timeline-item ${stage.state}`} key={stage.key}>
                        <span className="hh-timeline-marker" aria-hidden="true" />
                        <div className="hh-timeline-title">{stage.label}</div>
                        {stage.state === 'is-current' && (
                          <div className="hh-timeline-desc">
                            This is where your application currently stands.
                          </div>
                        )}
                        {/* Real dates come off the application record. The
                            previous version hardcoded "September 12" and friends,
                            which rendered on every application regardless of when
                            it was actually submitted. */}
                        {stage.state === 'is-current' && application.status_changed_label && (
                          <div className="hh-timeline-meta">
                            Since {application.status_changed_label}
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>
                </Card>
              </Reveal>

              {canAct && (
                <Reveal delay={120}>
                  <Card className="hh-card-body hh-mt-4 hh-mb-4 hh-border-primary">
                    <div className="hh-profile-card-title">
                      <i className="bi bi-envelope-check-fill" aria-hidden="true" />
                      <span className="hh-card-title-md hh-mb-0">Action needed</span>
                    </div>
                    <p className="hh-settings-desc">
                      {companyName} has paid the placement fee and confirmed your offer for{' '}
                      <strong>{application.job}</strong>. This role is not filled until you accept.
                    </p>
                    <div className="d-flex flex-column flex-sm-row gap-2">
                      <Button
                        variant="primary"
                        icon="bi-check-lg"
                        pill
                        onClick={() => setConfirming('accept')}
                        disabled={busy}
                      >
                        Accept offer
                      </Button>
                      <Button
                        variant="outline"
                        icon="bi-x-lg"
                        pill
                        onClick={() => setConfirming('decline')}
                        disabled={busy}
                      >
                        Decline offer
                      </Button>
                    </div>
                  </Card>
                </Reveal>
              )}
            </div>

            <div className="col-12 col-lg-4">
              <Reveal delay={120}>
                <Card className="hh-card-body hh-mb-4">
                  <div className="hh-card-title-md hh-mb-3">Role snapshot</div>
                  <ul className="hh-meta-list">
                    {application.match != null && (
                      <li>
                        <i className="bi bi-graph-up-arrow" aria-hidden="true" />
                        <span>{application.match}% match</span>
                      </li>
                    )}
                    <li>
                      <i className="bi bi-cash-stack" aria-hidden="true" />
                      <span>Applied {application.applied}</span>
                    </li>
                    <li>
                      <i className="bi bi-file-earmark-person" aria-hidden="true" />
                      <span>{application.has_cv ? 'CV attached' : 'No CV attached'}</span>
                    </li>
                  </ul>
                </Card>
              </Reveal>

              <Reveal delay={180}>
                <Card className="hh-card-body">
                  <div className="hh-card-title-md hh-mb-3">{nextStep.title}</div>
                  <p className="hh-settings-desc hh-mb-4">{nextStep.body}</p>

                  <div className="d-flex flex-column gap-2">
                    {/* Only surfaced on a page that has not already put the same
                        action above; the detail card is the fallback column. */}
                    {canAct ? null : nextStep.primary &&
                      nextStep.primary.to ? (
                        <Button to={nextStep.primary.to} variant="primary" icon={nextStep.primary.icon} block pill>
                          {nextStep.primary.label}
                        </Button>
                      ) : null}

                    {isHired && (
                      <Button
                        variant="primary"
                        icon="bi-stars"
                        block
                        pill
                        onClick={() => {
                          setUpsells(null)
                          setUpsellOpen(true)
                        }}
                      >
                        Add interview prep
                      </Button>
                    )}

                    {application.job_slug && (
                      <Button to={`/jobs/${application.job_slug}`} variant="outline" icon="bi-eye" block pill>
                        View job posting
                      </Button>
                    )}
                  </div>
                </Card>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      <ConfirmDialog
        isOpen={confirming === 'accept'}
        title="Accept this offer?"
        message={`Accepting confirms you will take the role at ${companyName ?? 'this company'}. The listing closes immediately and the employer is notified.`}
        confirmLabel="Yes, accept the offer"
        cancelLabel="Not yet"
        variant="primary"
        busy={busy}
        error={actionError}
        onConfirm={handleAccept}
        onCancel={() => {
          setConfirming(null)
          setActionError(null)
        }}
      />

      <ConfirmDialog
        isOpen={confirming === 'decline'}
        title="Decline this offer?"
        message="This is final. The employer keeps the placement fee they already paid, so it is not refunded, and the application closes."
        confirmLabel="Yes, decline"
        cancelLabel="Keep the offer"
        busy={busy}
        error={actionError}
        onConfirm={handleDecline}
        onCancel={() => {
          setConfirming(null)
          setActionError(null)
        }}
      />

      <UpsellModal
        isOpen={upsellOpen}
        applicationId={id}
        items={upsells}
        justReturned={justReturned}
        onClose={handleUpsellClose}
        onPurchased={handleUpsellPurchased}
      />
    </>
  )
}
