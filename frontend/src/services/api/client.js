const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

const TOKEN_KEY = 'hh_token'

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setAuthToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem('hh_user')
}

// Human-readable copy for the status codes a signed-in user can actually hit.
// Pages surface err.message directly (and several interpolate it into
// "Could not load X: ..."), so a raw "Request failed with status 401" used to
// leak straight into the UI. Mapping it here fixes every consumer at once and
// keeps the technical detail on error.status for anyone who needs to branch.
const STATUS_MESSAGES = {
  400: 'That request could not be understood. Please check the details and try again.',
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have permission to do that.',
  404: "We couldn't find what you were looking for.",
  409: 'That change conflicts with the current state. Please reload and try again.',
  413: 'That file is too large to upload.',
  419: 'Your session has expired. Please sign in again.',
  422: 'Please check the highlighted fields and try again.',
  429: 'Too many attempts. Please wait a moment and try again.',
  500: 'Something went wrong on our end. Please try again in a moment.',
  502: 'The service is temporarily unavailable. Please try again shortly.',
  503: 'The service is temporarily unavailable. Please try again shortly.',
  504: 'The request took too long. Please try again.',
}

function messageForStatus(status) {
  if (STATUS_MESSAGES[status]) return STATUS_MESSAGES[status]
  if (status >= 500) return 'Something went wrong on our end. Please try again in a moment.'
  if (status >= 400) return 'That request could not be completed. Please try again.'
  return `Request failed with status ${status}`
}

// Said when the request never reached the API at all (backend down, wrong port,
// no route). Callers used to fall back to wording like "we could not send your
// code", which blames the action the visitor took and hides the one thing they
// can act on: nothing is listening.
export const UNREACHABLE_MESSAGE = 'We could not reach HireHub. Please check your connection and try again.'

/**
 * The message to show for a failed request.
 *
 * Prefers the API's own wording, then the first field-level validation error,
 * and only then the caller's fallback. The unreachable case is checked first:
 * it has no payload at all, so without this a dead backend is indistinguishable
 * from a rejected request.
 */
export function apiErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (err?.status === 0) return UNREACHABLE_MESSAGE
  const errors = err?.payload?.errors
  if (Array.isArray(errors) && errors.length) return errors[0]
  if (errors && typeof errors === 'object') {
    const key = Object.keys(errors)[0]
    if (key) {
      const value = errors[key]
      return Array.isArray(value) ? value[0] : value
    }
  }
  return err?.payload?.message || fallback
}

export const apiClient = {
  baseUrl: API_BASE_URL,

  xhr(path, options = {}) {
    const { headers = {}, body, ...rest } = options
    const token = getAuthToken()
    const isForm = typeof FormData !== 'undefined' && body instanceof FormData
    return fetch(`${API_BASE_URL}${path}`, {
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      ...(body ? { body: isForm ? body : JSON.stringify(body) } : {}),
      credentials: 'include',
      ...rest,
    })
  },

  async request(path, options = {}) {
    let res
    try {
      res = await apiClient.xhr(path, options)
    } catch (cause) {
      // fetch only rejects on a transport failure, so this is "the API was
      // unreachable" rather than "the API said no".
      const error = new Error(UNREACHABLE_MESSAGE)
      error.status = 0
      error.cause = cause
      throw error
    }

    if (!res.ok) {
      const hadToken = Boolean(getAuthToken())
      if ((res.status === 401 || res.status === 419) && hadToken) {
        // The token is no longer accepted, so nothing signed-in can work until
        // the user signs in again. Drop the dead session and let AuthContext
        // route to /login rather than leaving every page in an error state.
        clearSession()
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('hh:session-expired'))
      }
      const error = new Error(messageForStatus(res.status))
      error.status = res.status
      // Exposed because a 429 without it leaves the UI guessing how long to
      // wait, which is the one thing the rate limiter exists to tell it. The
      // API sends it on every throttled response.
      const retryAfter = Number(res.headers.get('Retry-After'))
      if (Number.isFinite(retryAfter) && retryAfter > 0) {
        error.retryAfter = retryAfter
      }
      try {
        error.payload = await res.json()
      } catch {
        error.payload = {}
      }
      // Prefer the server's own wording, but only for statuses where it is
      // genuinely more specific than the generic copy above. For auth failures
      // the framework default is literally "Unauthenticated.", which is both
      // less useful and more alarming than saying the session expired.
      //
      // A plan refusal is also trusted on a 403: its message names the real
      // allowance ("you have used all 10 job posts on your Professional plan"),
      // which is far more actionable than the generic permission wording, and
      // the server, not this mapping, is the authority on that number.
      const PLAN_CODES = new Set(['plan_limit_reached', 'plan_upgrade_required'])
      // 402 is the hiring-fee refusal. Its message names the one thing the
      // employer has to do next ("confirm and pay the hiring fee"), so it is
      // more actionable than anything the generic map can offer.
      const TRUST_SERVER_MESSAGE = new Set([400, 402, 404, 409, 413, 422])
      const code = error.payload?.error_code
      if ((TRUST_SERVER_MESSAGE.has(res.status) || PLAN_CODES.has(code)) && error.payload?.message) {
        error.message = error.payload.message
      }
      // Copied onto the error so a component can branch on *why* it was refused
      // without pattern-matching prose that is free to be reworded. A 403
      // carrying a plan code is the signal that opens the upgrade modal — the
      // client never decides a limit was reached on its own.
      if (code) {
        error.code = code
        // The server sends the authoritative usage block with a plan refusal,
        // so the paywall can quote the real numbers instead of refetching.
        if (error.payload.data?.usage) {
          error.usage = error.payload.data.usage
        }
      }
      throw error
    }
    const text = await res.text()
    return text ? JSON.parse(text) : null
  },

  get: (path, options) => apiClient.request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => apiClient.request(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => apiClient.request(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options) => apiClient.request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => apiClient.request(path, { ...options, method: 'DELETE' }),
}