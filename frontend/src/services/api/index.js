import { apiClient } from './client'

const num = (value) => Number(value) || 0
const numericAppId = (item) => ({ ...item, id: String(item.id).replace(/^app-/, '') })

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
  async me() {
    const res = await apiClient.get('/v1/auth/me')
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
    const res = await apiClient.get(`/v1/seeker/applications/${num(id)}`)
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
  async notifications() {
    const res = await apiClient.get('/v1/seeker/notifications')
    return res.data
  },
  async markNotificationRead(id) {
    return apiClient.patch(`/v1/seeker/notifications/${id}/read`)
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
    return apiClient.delete(`/v1/employer/jobs/${slug}`)
  },
  async applicants(params = {}) {
    const res = await apiClient.get(`/v1/employer/applicants${buildQuery({ per_page: 50, ...params })}`)
    return (res.data ?? []).map(numericAppId)
  },
  async applicant(id) {
    const res = await apiClient.get(`/v1/employer/applicants/${num(id)}`)
    return numericAppId(res.data)
  },
  async updateApplicationStatus(id, status) {
    const res = await apiClient.patch(`/v1/employer/applicants/${num(id)}/status`, { status })
    return res.data
  },
  async company() {
    const res = await apiClient.get('/v1/employer/company')
    return res.data
  },
  async updateCompany(payload) {
    const res = await apiClient.put('/v1/employer/company', payload)
    return res.data
  },
  async notifications() {
    const res = await apiClient.get('/v1/employer/notifications')
    return res.data
  },
}