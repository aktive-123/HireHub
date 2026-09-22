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

export const apiClient = {
  baseUrl: API_BASE_URL,

  xhr(path, options = {}) {
    const { headers = {}, body, ...rest } = options
    const token = getAuthToken()
    return fetch(`${API_BASE_URL}${path}`, {
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      credentials: 'include',
      ...rest,
    })
  },

  async request(path, options = {}) {
    const res = await apiClient.xhr(path, options)
    if (!res.ok) {
      if (res.status === 401 && getAuthToken()) {
        clearSession()
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('hh:session-expired'))
      }
      const error = new Error(`Request failed with status ${res.status}`)
      error.status = res.status
      try {
        error.payload = await res.json()
      } catch {
        error.payload = {}
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