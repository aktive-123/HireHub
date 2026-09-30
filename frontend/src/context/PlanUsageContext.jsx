import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { billingApi } from '../services/api'
import { useAuth } from './AuthContext'

/**
 * The employer's live plan and usage, for the whole console.
 *
 * One provider rather than a hook per component, because the plan is a single
 * fact with several readers: the sidebar counter, the dashboard card and the
 * paywall. If each fetched its own copy they could disagree within a session —
 * post a job, and the sidebar would say one job while the card said two.
 *
 * Every number here originates from `GET /v1/employer/billing/usage`, which
 * counts the rows in the database. Nothing is inferred client-side, and the
 * paywall is only ever opened in response to a 403 that says
 * `plan_limit_reached` — never because a locally held number looked full.
 */
const PlanUsageContext = createContext(null)

/** Allowance labels, keyed to the `usage` keys the API returns. */
export const USAGE_LABELS = {
  job_posts: 'Job posts',
  featured: 'Featured job slots',
  cv_views: 'CV views this month',
}

export function PlanUsageProvider({ children }) {
  const { user, role, bootstrapped } = useAuth()
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [paywall, setPaywall] = useState(null)
  // A ref so `applyServerPlan` stays referentially stable while still writing
  // the latest value; keeping it in state would re-create every callback in
  // this provider on each refresh.
  const planRef = useRef(null)

  const active = bootstrapped && Boolean(user) && role === 'employer'

  const refresh = useCallback(async () => {
    if (!active) {
      setPlan(null)
      planRef.current = null
      return null
    }

    setLoading(true)
    setError('')

    try {
      const data = await billingApi.usage()
      planRef.current = data
      setPlan(data)
      return data
    } catch (err) {
      // An employer without a company profile gets a 403 here. That is a real
      // state, not a failure to retry, so it is surfaced as a message and the
      // console simply shows no allowance.
      setError(err?.message || 'We could not load your plan details.')
      setPlan(null)
      planRef.current = null
      return null
    } finally {
      setLoading(false)
    }
  }, [active])

  useEffect(() => {
    refresh()
  }, [refresh])

  /**
   * Adopt a usage block the server sent alongside a write.
   *
   * Job creation, featuring, deleting and the paywall-free upgrade all return
   * the post-write allowance. Adopting it means the counters update from the
   * same response that performed the action, so the UI is correct on the very
   * next paint and no follow-up request can race in between.
   */
  const applyServerPlan = useCallback((block) => {
    if (!block) return
    planRef.current = block
    setPlan(block)
  }, [])

  /**
   * Called when a request comes back 403 `plan_limit_reached`.
   *
   * The `error.usage` carried on the rejection is the authoritative state
   * measured by the server at the moment it refused, which is why the modal
   * can quote it directly. It is also adopted as the new plan, since the
   * refusal means the local copy was stale.
   */
  const showPaywall = useCallback(
    (error, context = {}) => {
      if (error?.code !== 'plan_limit_reached') return false

      if (error.usage) applyServerPlan(error.usage)
      else refresh()

      setPaywall({
        resource: error.payload?.data?.resource ?? context.resource ?? 'job_post',
        message: error.message,
        usage: error.usage ?? planRef.current,
        action: context.action,
      })
      return true
    },
    [applyServerPlan, refresh],
  )

  /**
   * Called when a request comes back 403 `plan_upgrade_required` — a capability
   * the plan does not carry, as opposed to a spent allowance.
   */
  const showUpgradeNotice = useCallback(
    (error) => {
      if (error?.code !== 'plan_upgrade_required') return false
      if (error.usage) applyServerPlan(error.usage)
      setPaywall({
        resource: 'feature',
        feature: error.payload?.data?.feature ?? null,
        message: error.message,
        usage: error.usage ?? planRef.current,
      })
      return true
    },
    [applyServerPlan],
  )

  const closePaywall = useCallback(() => setPaywall(null), [])

  /**
   * Re-read the allowance after a checkout returns. The plan only changes once
   * the gateway confirms the payment, so this is also the poll the billing page
   * relies on rather than assuming success from the redirect.
   */
  const syncAfterPayment = useCallback(async () => {
    const next = await refresh()
    return next
  }, [refresh])

  const value = useMemo(
    () => ({
      plan,
      usage: plan?.usage ?? null,
      currentPlan: plan?.plan ?? null,
      loading,
      error,
      paywall,
      refresh,
      applyServerPlan,
      showPaywall,
      showUpgradeNotice,
      closePaywall,
      syncAfterPayment,
      canPostJob: (plan?.usage?.job_posts?.remaining ?? 0) > 0,
      canFeatureJob: (plan?.usage?.featured?.remaining ?? 0) > 0,
      canViewCv: (plan?.usage?.cv_views?.remaining ?? 0) > 0,
      grants: (feature) => Boolean(plan?.plan?.entitlements?.[feature]),
    }),
    [
      plan,
      loading,
      error,
      paywall,
      refresh,
      applyServerPlan,
      showPaywall,
      showUpgradeNotice,
      closePaywall,
      syncAfterPayment,
    ],
  )

  return <PlanUsageContext.Provider value={value}>{children}</PlanUsageContext.Provider>
}

export function usePlanUsage() {
  const ctx = useContext(PlanUsageContext)

  // Deliberately not throwing: the provider is mounted for the employer console
  // only, and a page rendered outside it should render rather than crash.
  return ctx ?? EMPTY
}

const EMPTY = {
  plan: null,
  usage: null,
  currentPlan: null,
  loading: false,
  error: '',
  paywall: null,
  refresh: async () => null,
  applyServerPlan: () => {},
  showPaywall: () => false,
  showUpgradeNotice: () => false,
  closePaywall: () => {},
  syncAfterPayment: async () => null,
  canPostJob: true,
  canFeatureJob: true,
  canViewCv: true,
  grants: () => false,
}
