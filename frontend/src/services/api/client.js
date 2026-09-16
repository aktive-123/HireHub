const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export const apiClient = {
  baseUrl: API_BASE_URL,

  xhr(path, options = {}) {
    const { headers = {}, body, ...rest } = options
    return fetch(`${API_BASE_URL}${path}`, {
      headers: {
        Accept: 'application/json',
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