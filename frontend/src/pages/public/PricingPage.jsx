import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import LoadingState from '../../components/ui/LoadingState'
import PageHero from '../../components/ui/PageHero'
import SectionHeading from '../../components/ui/SectionHeading'
import { useAuth } from '../../context/AuthContext'
import { billingApi, plansApi } from '../../services/api'
import heroSlide1 from '../../assets/growth.jpg'
import heroSlide2 from '../../assets/growth2.jpg'
import heroSlide3 from '../../assets/hero4.jpg'

const HERO_IMAGES = [heroSlide1, heroSlide2, heroSlide3]

const PERIOD_SUFFIX = { month: 'per month', year: 'per year', once: 'one-off' }

function PlanCard({ plan, gateways, onChoose, busy, signedIn }) {
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

      <div className="mb-3">
        <span className="hh-plan-price">{plan.price_display}</span>
        {plan.billing_period && !plan.is_free && (
          <span className="text-muted small ms-1">{PERIOD_SUFFIX[plan.billing_period]}</span>
        )}
      </div>

      <ul className="list-unstyled hh-plan-features flex-grow-1 mb-4">
        {(plan.features ?? []).map((feature) => (
          <li key={feature}>
            <i className="bi bi-check-circle-fill" aria-hidden="true" /> {feature}
          </li>
        ))}
      </ul>

      <Button
        block
        pill
        variant={plan.is_featured ? 'primary' : 'outline'}
        onClick={onChoose}
        disabled={busy}
      >
        {plan.is_free ? 'Start Free' : 'Choose Plan'}
      </Button>

      {signedIn ? null : (
        <p className="small text-muted text-center mt-2 mb-0">
          You&apos;ll be asked to{' '}
          <Link to="/login" className="hh-auth-link">
            sign in
          </Link>{' '}
          first.
        </p>
      )}
    </Card>
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
    } finally {
      setBusy(false)
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
                    gateways={gateways}
                    onChoose={() => handleChoose(plan)}
                    busy={busy === plan.slug}
                    signedIn={isAuthenticated}
                  />
                </div>
              ))}
            </div>

            {gateways.length > 0 && (
              <p className="text-center text-muted small mt-4 mb-0">
                We accept {gateways.map((g) => g.label).join(', ')}. Card details are handled by
                the payment provider and never touch our servers.
              </p>
            )}
          </>
        )}

        <div className="mt-5 pt-4 border-top">
          <SectionHeading eyebrow="Questions" title="How billing works" />
          <div className="row g-4 mt-1">
            <div className="col-12 col-md-4">
              <h3 className="h6">When am I charged?</h3>
              <p className="small text-muted mb-0">
                When your subscription starts, and then on the same date each period. Cancel
                whenever you like and you keep everything until the period ends.
              </p>
            </div>
            <div className="col-12 col-md-4">
              <h3 className="h6">Can I change plans later?</h3>
              <p className="small text-muted mb-0">
                Yes. Upgrades take effect immediately and the difference is prorated; downgrades
                apply from your next billing date.
              </p>
            </div>
            <div className="col-12 col-md-4">
              <h3 className="h6">Do you offer refunds?</h3>
              <p className="small text-muted mb-0">
                If something has not worked as expected, contact us within 14 days of a charge
                and we will sort it out.
              </p>
            </div>
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
