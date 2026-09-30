import { apiClient } from './client'

// Re-exported so pages take one import for the whole API surface.
export { apiErrorMessage, UNREACHABLE_MESSAGE } from './client'
import { saveResponseAsFile } from '../../utils/exportData'

// Route-bound models are addressed by slug because their getRouteKeyName()
// returns 'slug' (Category, Company, Job, Plan); the rest are addressed by
// their surrogate key (User, Application).
//
// num() is used only for the surrogate-key routes. It deliberately THROWS on
// anything that is not a positive integer: the previous `Number(x) || 0` turned
// a slug into 0, which Laravel answered with a bare 404 and hid three broken
// admin mutations behind a plausible-looking request. Failing loudly in the
// console is far cheaper than a silent 404 in a data table.
const num = (value) => {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(
      `Expected a positive integer id for a route bound by primary key, but received ${JSON.stringify(value)}. ` +
        'If this entity binds by slug, pass the slug and do not wrap it in num().'
    )
  }
  return parsed
}
const numericAppId = (item) => ({ ...item, id: String(item.id).replace(/^app-/, '') })

// Application routes bind by the numeric primary key, but the API deliberately
// exposes a public `app-{id}` in ApplicationResource. Rows reach this layer from
// two directions — the list adapter and a detail fetch — so strip the prefix
// here instead of trusting every caller to have normalised it first. Without
// this, an `app-12` id reached num() and threw, breaking the admin and employer
// application detail/status/CV actions.
const appNum = (value) => num(String(value).replace(/^app-/, ''))

function buildQuery(params = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) search.set(key, value.join(','))
      else search.set(key, String(value))
    }
  })
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export const authApi = {
  async login(email, password) {
    const res = await apiClient.post('/v1/auth/login', { email, password })
    return res.data
  },
  async register(payload) {
    const res = await apiClient.post('/v1/auth/register', payload)
    return res.data
  },
  async logout() {
    return apiClient.post('/v1/auth/logout')
  },
  async logoutAll() {
    return apiClient.post('/v1/auth/logout-all')
  },
  async me() {
    const res = await apiClient.get('/v1/auth/me')
    return res.data
  },
  async settings() {
    const res = await apiClient.get('/v1/settings')
    return res.data
  },
  async updateSettings(payload) {
    const res = await apiClient.patch('/v1/settings', payload)
    return res.data
  },
  async changePassword(payload) {
    const res = await apiClient.patch('/v1/auth/password', payload)
    return res.data
  },
  async deactivateAccount() {
    return apiClient.post('/v1/account/deactivate')
  },
  async reactivateAccount() {
    return apiClient.post('/v1/account/reactivate')
  },

  /**
   * Recovery endpoints answer identically whether or not the address exists,
   * so the UI must not branch on the response — only ever tell the user a code
   * is on its way.
   */
  async forgotPassword(email) {
    const res = await apiClient.post('/v1/auth/forgot-password', { email })
    return res.data
  },

  /**
   * Redeem a one-time password.
   *
   * `purpose` is 'verify' to activate a new account, which hands back a bearer
   * token, or 'reset' to authorise a password change, which hands back a
   * single-use grant instead. The code is burned either way, so the same six
   * digits can never be spent twice.
   */
  async verifyOtp({ email, code, purpose = 'verify' }) {
    const res = await apiClient.post('/v1/auth/otp/verify', { email, code, purpose })
    return res.data
  },

  /**
   * Ask for a replacement code. Unauthenticated, so it also answers identically
   * for an address with no account. `cooldown_seconds` in the response is what
   * the resend button should count down from.
   */
  async resendOtp({ email, purpose = 'verify' }) {
    const res = await apiClient.post('/v1/auth/otp/resend', { email, purpose })
    return res.data
  },

  /**
   * Spend a reset grant. The six digits are exchanged for this at the verify
   * step precisely so this endpoint cannot be brute forced on its own.
   */
  async resetPassword({ grant, email, password, passwordConfirmation }) {
    const res = await apiClient.post('/v1/auth/reset-password', {
      grant,
      email,
      password,
      password_confirmation: passwordConfirmation,
    })
    return res.data
  },

  /**
   * Authenticated resend for a signed-in but unverified user. Unlike the
   * anonymous endpoint this may say plainly that the address is already
   * verified, because the caller has already proven who they are.
   */
  async sendVerificationEmail() {
    const res = await apiClient.post('/v1/auth/email/verification-notification')
    return res.data
  },
}

export const plansApi = {
  async list() {
    const res = await apiClient.get('/v1/plans')
    return { items: res.data ?? [], gateways: res.meta?.gateways ?? [] }
  },
  async bySlug(slug) {
    const res = await apiClient.get(`/v1/plans/${slug}`)
    return res.data
  },
}

export const billingApi = {
  async subscription() {
    const res = await apiClient.get('/v1/employer/billing/subscription')
    return res.data
  },
  /**
   * The company's live plan and what it has consumed, counted from the
   * database on the server. This is the single source for every allowance
   * indicator in the employer console.
   */
  async usage() {
    const res = await apiClient.get('/v1/employer/billing/usage')
    return res.data
  },
  async checkout(payload) {
    const res = await apiClient.post('/v1/employer/billing/checkout', payload)
    return res.data
  },
  async changePlan(payload) {
    const res = await apiClient.post('/v1/employer/billing/checkout/change-plan', payload)
    return res.data
  },
  async renew() {
    const res = await apiClient.post('/v1/employer/billing/subscription/renew')
    return res.data
  },
  async cancel() {
    return apiClient.post('/v1/employer/billing/subscription/cancel')
  },
  async payments(params = {}) {
    const res = await apiClient.get(`/v1/employer/billing/payments${buildQuery({ per_page: 20, ...params })}`)
    return { items: res.data ?? [], meta: res.meta ?? {} }
  },
  async payment(reference) {
    const res = await apiClient.get(`/v1/employer/billing/payments/${reference}`)
    return res.data
  },
}

export const jobsApi = {
  async list(params = {}) {
    const res = await apiClient.get(`/v1/jobs${buildQuery({ per_page: 50, ...params })}`)
    return { items: res.data ?? [], meta: res.meta }
  },
  async bySlug(slug) {
    const res = await apiClient.get(`/v1/jobs/${slug}`)
    return res.data
  },
}

export const companiesApi = {
  async list(params = {}) {
    const res = await apiClient.get(`/v1/companies${buildQuery({ per_page: 50, ...params })}`)
    return { items: res.data ?? [], meta: res.meta }
  },
  async bySlug(slug) {
    const res = await apiClient.get(`/v1/companies/${slug}`)
    return res.data
  },
}

export const categoriesApi = {
  async list() {
    const res = await apiClient.get('/v1/categories')
    return res.data ?? []
  },
}

/**
 * Public, unauthenticated marketing endpoints. Kept separate from the
 * dashboard APIs because these are called by anonymous visitors, including
 * from the footer on every page.
 */
export const publicApi = {
  async subscribeToNewsletter(email, source = 'footer') {
    const res = await apiClient.post('/v1/newsletter/subscribe', { email, source })
    return res
  },
}

export const seekerApi = {
  async dashboard() {
    const res = await apiClient.get('/v1/seeker/dashboard')
    return res.data
  },
  async applications(params = {}) {
    const res = await apiClient.get(`/v1/seeker/applications${buildQuery(params)}`)
    return (res.data ?? []).map(numericAppId)
  },
  async application(id) {
    const res = await apiClient.get(`/v1/seeker/applications/${appNum(id)}`)
    return numericAppId(res.data)
  },
  async apply(payload) {
    const res = await apiClient.post('/v1/seeker/applications', payload)
    return numericAppId(res.data)
  },
  async savedJobs() {
    const res = await apiClient.get('/v1/seeker/saved-jobs')
    return (res.data ?? []).map((item) => ({ ...(item.job ?? {}), saved_at: item.saved_at, saved_id: item.id }))
  },
  async saveJob(jobId) {
    const res = await apiClient.post('/v1/seeker/saved-jobs', { job_id: num(jobId) })
    return res.data
  },
  async unSaveJob(jobId) {
    return apiClient.delete(`/v1/seeker/saved-jobs/${num(jobId)}`)
  },
  async profile() {
    const res = await apiClient.get('/v1/seeker/profile')
    return res.data
  },
  async updateProfile(payload) {
    return apiClient.patch('/v1/seeker/profile', payload)
  },
  async notifications(params = {}) {
    const res = await apiClient.get(`/v1/seeker/notifications${buildQuery(params)}`)
    // `notifications` is nested because the unread badge count is read by the
    // shared notification bell, which needs it on every page load.
    return { ...res.data, meta: res.meta ?? {} }
  },
  async markNotificationRead(id) {
    return apiClient.patch(`/v1/seeker/notifications/${id}/read`)
  },
  async markAllNotificationsRead() {
    const res = await apiClient.post('/v1/seeker/notifications/read-all')
    return res.data
  },
}

export const employerApi = {
  async dashboard() {
    const res = await apiClient.get('/v1/employer/dashboard')
    return res.data
  },
  async jobs(params = {}) {
    const res = await apiClient.get(`/v1/employer/jobs${buildQuery({ per_page: 50, ...params })}`)
    return { items: res.data ?? [], meta: res.meta }
  },
  async createJob(payload) {
    const res = await apiClient.post('/v1/employer/jobs', payload)
    return res.data
  },
  async updateJob(slug, payload) {
    const res = await apiClient.put(`/v1/employer/jobs/${slug}`, payload)
    return res.data
  },
  async updateJobStatus(slug, status) {
    const res = await apiClient.patch(`/v1/employer/jobs/${slug}/status`, { status })
    return res.data
  },
  async deleteJob(slug) {
    const res = await apiClient.delete(`/v1/employer/jobs/${slug}`)
    return res.data
  },
  /**
   * Spend or release a featured slot. Rejects with a 403 carrying
   * `error_code: 'plan_limit_reached'` when the plan's credits are spent, so
   * the caller opens the upgrade modal on the server's say-so.
   */
  async setJobFeatured(slug, featured) {
    const res = await apiClient.patch(`/v1/employer/jobs/${slug}/featured`, { featured })
    return res.data
  },
  async usage() {
    const res = await apiClient.get('/v1/employer/billing/usage')
    return res.data
  },
  /**
   * Hiring analytics. Refused with `error_code: 'plan_upgrade_required'` unless
   * the company's plan grants the `analytics` entitlement.
   */
  async analytics(params = {}) {
    const res = await apiClient.get(`/v1/employer/analytics${buildQuery(params)}`)
    return res.data
  },
  async applicants(params = {}) {
    const res = await apiClient.get(`/v1/employer/applicants${buildQuery({ per_page: 50, ...params })}`)
    return (res.data ?? []).map(numericAppId)
  },
  async applicant(id) {
    const res = await apiClient.get(`/v1/employer/applicants/${appNum(id)}`)
    return numericAppId(res.data)
  },
  /**
   * Mark a candidate hired. Refused with HTTP 402 and
   * `error_code: 'hiring_fee_required'` until the placement fee for this
   * application has actually been paid — the browser cannot override that, and
   * the refusal carries the server's own quote in `err.payload.data.hiring_fee`
   * so the confirmation modal never has to invent a price.
   */
  async updateApplicationStatus(id, status) {
    const res = await apiClient.patch(`/v1/employer/applicants/${appNum(id)}/status`, { status })
    return res.data
  },

  // --- Hiring fee ------------------------------------------------------
  // The employer pays; a job seeker never reaches any of these.

  /** What this hire costs right now, priced on the server. */
  async hiringFeeQuote(id) {
    const res = await apiClient.get(`/v1/employer/applicants/${appNum(id)}/hiring-fee`)
    return res.data
  },
  /**
   * Open a gateway checkout. This does NOT complete the hire — the application
   * changes only when the gateway's signed webhook lands.
   */
  async createHiringFeeCheckout(id, gateway) {
    const res = await apiClient.post(`/v1/employer/applicants/${appNum(id)}/hiring-fee/checkout`, { gateway })
    return res.data
  },
  /**
   * Poll after returning from the gateway. Reconciles with the provider when
   * the webhook has not landed yet, so the confirmation appears without relying
   * on a round trip the employer cannot observe.
   */
  async hiringFeeStatus(id) {
    const res = await apiClient.get(`/v1/employer/applicants/${appNum(id)}/hiring-fee/status`)
    return res.data
  },
  async hiringFees(params = {}) {
    const res = await apiClient.get(`/v1/employer/hiring-fees${buildQuery({ per_page: 20, ...params })}`)
    return { items: res.data ?? [], meta: res.meta ?? {} }
  },
  async downloadCv(id) {
    const res = await apiClient.xhr(`/v1/employer/applicants/${appNum(id)}/cv`)
    return saveResponseAsFile(res, `candidate-cv-${Date.now()}.pdf`)
  },
  async company() {
    const res = await apiClient.get('/v1/employer/company')
    return res.data
  },
  async updateCompany(payload) {
    const res = await apiClient.put('/v1/employer/company', payload)
    return res.data
  },
  async notifications(params = {}) {
    const res = await apiClient.get(`/v1/employer/notifications${buildQuery(params)}`)
    return { ...res.data, meta: res.meta ?? {} }
  },
  async markNotificationRead(id) {
    return apiClient.patch(`/v1/employer/notifications/${id}/read`)
  },
  async markAllNotificationsRead() {
    const res = await apiClient.post('/v1/employer/notifications/read-all')
    return res.data
  },
}

export const cvApi = {
  async meta() {
    const res = await apiClient.get('/v1/seeker/cv')
    return res.data
  },
  async upload(file) {
    const body = new FormData()
    body.append('cv', file)
    return apiClient.post('/v1/seeker/cv', body)
  },
  async remove() {
    return apiClient.delete('/v1/seeker/cv')
  },
  async download() {
    const res = await apiClient.xhr('/v1/seeker/cv/download')
    return saveResponseAsFile(res, `cv-${Date.now()}.pdf`)
  },
}

export const interviewApi = {
  async employerList(params = {}) {
    const res = await apiClient.get(`/v1/employer/interviews${buildQuery({ per_page: 50, ...params })}`)
    return { items: res.data ?? [], meta: res.meta ?? {} }
  },
  async seekerList(params = {}) {
    const res = await apiClient.get(`/v1/seeker/interviews${buildQuery({ per_page: 50, ...params })}`)
    return { items: res.data ?? [], meta: res.meta ?? {} }
  },
  async schedule(payload) {
    const res = await apiClient.post('/v1/employer/interviews', payload)
    return res.data
  },
  async update(id, payload) {
    const res = await apiClient.patch(`/v1/employer/interviews/${id}`, payload)
    return res.data
  },
  async updateStatus(id, status) {
    const res = await apiClient.patch(`/v1/employer/interviews/${id}/status`, { status })
    return res.data
  },
  async remove(id) {
    return apiClient.delete(`/v1/employer/interviews/${id}`)
  },
}

export const adminApi = {
  async dashboard() {
    const res = await apiClient.get('/v1/admin/dashboard')
    return res.data
  },
  async users(params = {}) {
    const res = await apiClient.get(`/v1/admin/users${buildQuery({ per_page: 50, ...params })}`)
    return { items: res.data ?? [], meta: res.meta ?? {} }
  },
  async updateUserStatus(id, status) {
    const res = await apiClient.patch(`/v1/admin/users/${num(id)}/status`, { status })
    return res.data
  },
  async deleteUser(id) {
    return apiClient.delete(`/v1/admin/users/${num(id)}`)
  },
  async jobSeekers(params = {}) {
    const res = await apiClient.get(`/v1/admin/job-seekers${buildQuery({ per_page: 50, ...params })}`)
    return { items: res.data ?? [], meta: res.meta ?? {} }
  },
  async employers(params = {}) {
    const res = await apiClient.get(`/v1/admin/employers${buildQuery({ per_page: 50, ...params })}`)
    return { items: res.data ?? [], meta: res.meta ?? {} }
  },
  async companies(params = {}) {
    const res = await apiClient.get(`/v1/admin/companies${buildQuery({ per_page: 50, ...params })}`)
    return { items: res.data ?? [], meta: res.meta ?? {} }
  },
  async updateCompanyStatus(id, status) {
    const res = await apiClient.patch(`/v1/admin/companies/${id}/status`, { status })
    return res.data
  },
  async createCompany(payload) {
    const res = await apiClient.post('/v1/admin/companies', payload)
    return res.data
  },
  async updateCompany(id, payload) {
    // Companies are addressed by slug, not the surrogate key, because the
    // slug is regenerated on rename and the public site routes on it.
    const res = await apiClient.put(`/v1/admin/companies/${id}`, payload)
    return res.data
  },
  async jobs(params = {}) {
    const res = await apiClient.get(`/v1/admin/jobs${buildQuery({ per_page: 50, ...params })}`)
    return { items: res.data ?? [], meta: res.meta ?? {} }
  },
  async updateJobStatus(id, status) {
    const res = await apiClient.patch(`/v1/admin/jobs/${id}/status`, { status })
    return res.data
  },
  async deleteJob(id) {
    return apiClient.delete(`/v1/admin/jobs/${id}`)
  },
  async applications(params = {}) {
    const res = await apiClient.get(`/v1/admin/applications${buildQuery({ per_page: 50, ...params })}`)
    return { items: res.data ?? [], meta: res.meta ?? {} }
  },
  async application(id) {
    const res = await apiClient.get(`/v1/admin/applications/${appNum(id)}`)
    return res.data
  },
  async updateApplicationStatus(id, status) {
    const res = await apiClient.patch(`/v1/admin/applications/${appNum(id)}/status`, { status })
    return res.data
  },
  async categories() {
    const res = await apiClient.get('/v1/admin/categories')
    return res.data ?? []
  },
  async createCategory(payload) {
    return apiClient.post('/v1/admin/categories', payload)
  },
  async updateCategory(id, payload) {
    return apiClient.put(`/v1/admin/categories/${id}`, payload)
  },
  async deleteCategory(id) {
    return apiClient.delete(`/v1/admin/categories/${id}`)
  },
  async skills() {
    const res = await apiClient.get('/v1/admin/skills')
    return res.data ?? []
  },
  async reports() {
    const res = await apiClient.get('/v1/admin/reports')
    return res.data
  },
  async activityLogs(params = {}) {
    const res = await apiClient.get(`/v1/admin/activity-logs${buildQuery({ per_page: 50, ...params })}`)
    return { items: res.data ?? [], meta: res.meta ?? {} }
  },
  async settings() {
    const res = await apiClient.get('/v1/admin/settings')
    return res.data ?? {}
  },
  async updateSettings(settings) {
    return apiClient.patch('/v1/admin/settings', { settings })
  },

  // --- Hiring fees -----------------------------------------------------

  /**
   * Placement-fee revenue. Amounts are minor units (kobo) — `collected` and its
   * siblings are integers, and the server also sends a pre-formatted string.
   */
  async hiringFeeSummary(params = {}) {
    const res = await apiClient.get(`/v1/admin/hiring-fees/summary${buildQuery(params)}`)
    return res.data
  },
  async hiringFees(params = {}) {
    const res = await apiClient.get(`/v1/admin/hiring-fees${buildQuery({ per_page: 50, ...params })}`)
    return { items: res.data ?? [], meta: res.meta ?? {} }
  },
  async hiringFeeRates() {
    const res = await apiClient.get('/v1/admin/hiring-fee-rates')
    return res.data ?? []
  },
  /** `flat_amount` is minor units; `percentage_override` is basis points. */
  async updateHiringFeeRate(id, payload) {
    const res = await apiClient.put(`/v1/admin/hiring-fee-rates/${id}`, payload)
    return res.data
  },
  async deleteHiringFeeRate(id) {
    return apiClient.delete(`/v1/admin/hiring-fee-rates/${id}`)
  },
}