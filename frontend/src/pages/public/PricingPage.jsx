import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import LoadingState from '../../components/ui/LoadingState'
import PageHero from '../../components/ui/PageHero'
import SectionHeading from '../../components/ui/SectionHeading'
import { useAuth } from '../../context/AuthContext'
import { billingApi, plansApi } from '../../services/api'
import { formatAmount } from '../../utils/format'
import heroSlide1 from '../../assets/growth.jpg'
import heroSlide2 from '../../assets/growth2.jpg'
import heroSlide3 from '../../assets/hero4.jpg'

const HERO_IMAGES = [heroSlide1, heroSlide2, heroSlide3]

/**
 * The rows of the comparison table, and the field each one reads.
 *
 * Declared here rather than derived from `features` because the feature
 * strings are prose ("Post up to 10 jobs") while a table needs the same
 * capability expressed as one comparable number per tier. Reading the numbers
 * from the plan's own limit columns is the part that matters: it means the
 * table cannot claim a limit the server does not actually enforce.
 */
const COMPARISON_ROWS = [
  { label: 'Job postings', field: 'job_post_limit', format: (v) => (v > 0 ? `${v}` : '—') },
  { label: 'Featured job slots', field: 'featured_job_limit', format: (v) => (v > 0 ? `${v}` : '—') },
  { label: 'CV views per month', field: 'cv_view_limit', format: (v) => (v > 0 ? `${v}` : '—') },
]

const FAQS = [
  {
    q: 'When am I charged?',
    a: 'When your subscription starts, and then on the same date each month. Cancel whenever you like and you keep everything until the period you have paid for ends.',
  },
  {
    q: 'Can I change plans later?',
    a: 'Yes. Upgrades take effect as soon as the payment is confirmed, and the difference is prorated against what you have already paid. Downgrades apply from your next billing date.',
  },
  {
    q: 'What happens if I go over my limit?',
    a: 'We will always tell you before anything stops working. You can upgrade at any point in the month and your new limits apply immediately.',
  },
  {
    q: 'Is there a hiring fee on top?',
    a: 'Only when you actually hire. Each hire carries a one-off confirmation fee, shown to you in full before you pay and never deducted silently from a payout.',
  },
  {
    q: 'Do you offer refunds?',
    a: 'If something has not worked as expected, contact us within 14 days of a charge and we will sort it out.',
  },
  {
    q: 'Can I pay by invoice or transfer?',
    a: 'For annual or enterprise arrangements, get in touch and we will issue a proforma invoice. Everything else is card payment at checkout.',
  },
]

const TRUST_POINTS = [
  { icon: 'credit-card-2-front', text: 'Card details handled by our payment provider — they never touch our servers' },
  { icon: 'lock', text: 'Secure checkout' },
  { icon: 'x-circle', text: 'Cancel any time, no lock-in' },
  { icon: 'receipt', text: 'A downloadable receipt for every payment' },
]

function PlanCard({ plan, onChoose, busy, signedIn }) {
  const isFree = plan.is_free

  return (
    <Card className={`h-100 d-flex flex-column${plan.is_featured ? ' hh-plan--featured' : ''}`}>
      {plan.is_featured && (
        <div className="hh-plan-flag">
          <i className="bi bi-stars" aria-hidden="true" /> Most Popular
        </div>
      )}

      <div className="mb-3">
        <h2 className="h5 mb-1">{plan.name}</h2>
        {plan.tagline && <p className="small text-muted mb-0">{plan.tagline}</p>}
      </div>

      {/* The free tier has no figure, so the row is given the same height with
          a word instead of a number. All three then share one baseline. */}
      <div className="hh-plan-price-row mb-3">
        {isFree ? (
          <>
            <span className="hh-plan-price hh-plan-price--free">Free</span>
            <span className="hh-plan-price-period">forever</span>
          </>
        ) : (
          <>
            <span className="hh-plan-price">{formatAmount(plan.price, plan.currency)}</span>
            <span className="hh-plan-price-period">/month</span>
          </>
        )}
      </div>

      <ul className="list-unstyled hh-plan-features flex-grow-1 mb-4">
        {(plan.features ?? []).map((feature) => (
          <li key={feature}>
            <i className="bi bi-check-circle-fill" aria-hidden="true" /> {feature}
          </li>
        ))}
      </ul>

      <div className="hh-plan-cta">
        {/* Business gets a solid CTA as well as the featured one: the two
            commercial tiers should not look like the secondary choice. */}
        <Button
          block
          pill
          variant={plan.is_featured || !isFree ? 'primary' : 'outline'}
          onClick={onChoose}
          disabled={busy}
        >
          {busy ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
              Redirecting…
            </>
          ) : isFree ? (
            'Start Free'
          ) : (
            `Choose ${plan.name}`
          )}
        </Button>

        {signedIn ? null : (
          <p className="hh-plan-note mb-0">
            You&apos;ll be asked to{' '}
            <Link to="/login" className="hh-auth-link">
              sign in
            </Link>{' '}
            first.
          </p>
        )}
      </div>
    </Card>
  )
}

function ComparisonTable({ plans }) {
  if (plans.length === 0) return null

  return (
    <div className="hh-compare">
      <div className="hh-compare-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Compare plans</th>
              {plans.map((plan) => (
                <th
                  key={plan.slug ?? plan.id}
                  scope="col"
                  className={plan.is_featured ? 'hh-compare--featured' : undefined}
                >
                  {plan.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Price</th>
              {plans.map((plan) => (
                <td
                  key={plan.slug ?? plan.id}
                  className={plan.is_featured ? 'hh-compare--featured' : undefined}
                >
                  {plan.is_free
                    ? 'Free'
                    : `${formatAmount(plan.price, plan.currency)}${
                        plan.billing_period === 'monthly' ? '/mo' : ''
                      }`}
                </td>
              ))}
            </tr>

            {COMPARISON_ROWS.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                {plans.map((plan) => (
                  <td
                    key={plan.slug ?? plan.id}
                    className={plan.is_featured ? 'hh-compare--featured' : undefined}
                  >
                    {row.format(plan[row.field])}
                  </td>
                ))}
              </tr>
            ))}

            <tr>
              <th scope="row">Applicant tracking</th>
              {plans.map((plan) => (
                <td
                  key={plan.slug ?? plan.id}
                  className={plan.is_featured ? 'hh-compare--featured' : undefined}
                >
                  <i className="bi bi-check-circle-fill hh-compare-yes" aria-hidden="true" />
                  <span className="visually-hidden">Included</span>
                </td>
              ))}
            </tr>

            <tr>
              <th scope="row">Company profile</th>
              {plans.map((plan) => (
                <td
                  key={plan.slug ?? plan.id}
                  className={plan.is_featured ? 'hh-compare--featured' : undefined}
                >
                  <i className="bi bi-check-circle-fill hh-compare-yes" aria-hidden="true" />
                  <span className="visually-hidden">Included</span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * Public pricing for employers.
 *
 * The catalogue is read from the API rather than hard coded, so a plan that is
 * retired or repriced disappears from this page without a redeploy, and the
 * figures shown are the same ones checkout will charge.
 */
export default function PricingPage() {
  const navigate = useNavigate()
  const { isAuthenticated, role } = useAuth()

  const [plans, setPlans] = useState([])
  const [gateways, setGateways] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(null)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true

    plansApi
      .list()
      .then((res) => {
        if (!active) return
        setPlans(res.items ?? [])
        setGateways(res.gateways ?? [])
      })
      .catch((err) => {
        if (active) setError(err?.message || 'Could not load our plans. Please try again.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  /**
   * Whether this employer already has a subscription. Only fetched when signed
   * in: it decides which checkout endpoint is correct, because subscribing and
   * changing an existing plan are different server-side operations (an existing
   * pending payment is reused, and a downgrade is recorded against the current
   * period rather than starting a new one).
   */
  const [hasSubscription, setHasSubscription] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || role !== 'employer') {
      setHasSubscription(false)
      return
    }
    let active = true
    billingApi
      .subscription()
      .then((payload) => {
        if (active) setHasSubscription(Boolean(payload?.subscription))
      })
      .catch(() => {
        // An employer with no company profile has no subscription; that is a
        // normal state, not an error worth surfacing on a pricing page.
        if (active) setHasSubscription(false)
      })
    return () => {
      active = false
    }
  }, [isAuthenticated, role])

  const gatewayLabel = useMemo(
    () => gateways.map((g) => g.label).join(', '),
    [gateways]
  )

  const handleChoose = async (plan) => {
    if (!isAuthenticated) {
      navigate(`/login?next=${encodeURIComponent(`/pricing?plan=${plan.slug}`)}`)
      return
    }

    if (role !== 'employer') {
      setNotice('Only employer accounts can start a subscription. Your account type cannot post jobs.')
      return
    }

    setBusy(plan.slug)
    setError('')
    setNotice('')

    try {
      const payload = hasSubscription
        ? await billingApi.changePlan({ plan: plan.slug })
        : await billingApi.checkout({ plan: plan.slug })

      // The gateway hands back a hosted checkout URL the customer authorises
      // on; only after they return from there is the subscription real.
      if (payload?.checkout_url) {
        window.location.assign(payload.checkout_url)
        return
      }

      navigate('/employer/billing?checkout=success', { replace: true })
    } catch (err) {
      setError(err?.message || 'We could not start checkout. Please try again.')
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <PageHero
        images={HERO_IMAGES}
        eyebrow="PRICING"
        title="Simple pricing that scales with your hiring"
        subtitle="Every plan includes candidate applications, CV access and a company profile. Upgrade when you need more reach."
      >
        <LoadingState label="Loading plans…" />
      </PageHero>
    )
  }

  return (
    <>
      <PageHero
        images={HERO_IMAGES}
        eyebrow="PRICING"
        title="Simple pricing that scales with your hiring"
        subtitle="Every plan includes candidate applications, CV access and a company profile. Upgrade when you need more reach."
      />

      <div className="page-container py-5">
        {error && (
          <Alert variant="danger" className="mb-4">
            {error}
          </Alert>
        )}

        {notice && (
          <Alert variant="info" className="mb-4">
            {notice}
          </Alert>
        )}

        {plans.length === 0 ? (
          <Alert variant="warning" icon="exclamation-triangle">
            No plans are available right now. Please get in touch and we&apos;ll help you post your
            first job.
          </Alert>
        ) : (
          <>
            <div className="row g-4">
              {plans.map((plan) => (
                <div key={plan.slug ?? plan.id} className="col-12 col-md-6 col-lg-4">
                  <PlanCard
                    plan={plan}
                    onChoose={() => handleChoose(plan)}
                    busy={busy === plan.slug}
                    signedIn={isAuthenticated}
                  />
                </div>
              ))}
            </div>

            <div className="hh-trust">
              {TRUST_POINTS.map((point) => (
                <span key={point.text} className="hh-trust-item">
                  <i className={`bi bi-${point.icon}`} aria-hidden="true" />
                  {point.text}
                </span>
              ))}
            </div>

            <div className="mt-5 pt-4 border-top">
              <SectionHeading eyebrow="Compare" title="What each plan includes" />
              <div className="mt-4">
                <ComparisonTable plans={plans} />
              </div>
              {gatewayLabel && (
                <p className="text-center text-muted small mt-3 mb-0">
                  We accept {gatewayLabel}.
                </p>
              )}
            </div>
          </>
        )}

        <div className="mt-5 pt-4 border-top">
          <SectionHeading eyebrow="Questions" title="How billing works" />
          <div className="row g-4 mt-1">
            {FAQS.map((faq) => (
              <div key={faq.q} className="col-12 col-md-6 col-lg-4">
                <div className="hh-faq-card">
                  <h3 className="hh-faq-q">
                    <i className="bi bi-question-circle-fill" aria-hidden="true" />
                    {faq.q}
                  </h3>
                  <p className="hh-faq-a">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-4">
            <Button to="/contact" variant="outline" pill icon="chat-dots">
              Talk to us
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}