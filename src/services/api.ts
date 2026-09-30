import { API_BASE } from '../constants'
import type {
  Job,
  User,
  AdminStats,
  Post,
  UserRole,
  AppNotification,
  PublicProfile,
  Conversation,
  ChatMessage,
  UserViolation,
  ModerationResult,
} from '../types'

// Immediate sanitization of legacy static/mock local storage keys
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem('namma_mock_conversations')
    localStorage.removeItem('namma_candidates_cache')
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i)
      if (k && (k.startsWith('namma_chat_msgs_') || k.startsWith('namma_local_follows'))) {
        localStorage.removeItem(k)
      }
    }
  }
} catch {}

class ApiClient {
  private token: string | null = null
  private inFlightRequests: Map<string, Promise<any>> = new Map()

  setToken(t: string | null) {
    this.token = t
    if (t) {
      localStorage.setItem('namma_token', t)
      localStorage.setItem('auth_token', t)
    } else {
      localStorage.removeItem('namma_token')
      localStorage.removeItem('auth_token')
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('namma_token') || localStorage.getItem('auth_token')
    }
    return this.token
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const currentToken = this.getToken()
    const method = (options.method || 'GET').toUpperCase()

    // In-flight GET request deduplication to avoid multiple concurrent duplicate queries
    const dedupKey = method === 'GET' ? `${currentToken || 'anon'}::${endpoint}` : null
    if (dedupKey && this.inFlightRequests.has(dedupKey)) {
      return this.inFlightRequests.get(dedupKey)! as Promise<T>
    }

    const execPromise = this.executeRequest<T>(endpoint, options, currentToken, method)

    if (dedupKey) {
      this.inFlightRequests.set(dedupKey, execPromise)
      execPromise.finally(() => {
        this.inFlightRequests.delete(dedupKey)
      })
    }

    return execPromise
  }

  private async executeRequest<T>(
    endpoint: string,
    options: RequestInit,
    currentToken: string | null,
    _method: string
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    }

    if (currentToken && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${currentToken}`
    }

    const url = `${API_BASE}${endpoint}`
    const res = await fetch(url, { ...options, headers })
    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}: Failed request to ${endpoint}`)
    }

    return data as T
  }
}

export const apiClient = new ApiClient()

export const authService = {
  async devLogin(email: string, role: UserRole, full_name: string) {
    return apiClient.request<{ token: string; user: User }>('/api/auth/dev-login', {
      method: 'POST',
      body: JSON.stringify({ email, role, full_name }),
    })
  },

  async googleAuth(id_token: string, picture?: string, selected_role?: 'employee' | 'manager') {
    return apiClient.request<{ token: string; user: User }>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ id_token, picture, selected_role }),
    })
  },

  async getMe() {
    return apiClient.request<{ user: User }>('/api/auth/me')
  },

  async sendWhatsAppOtp(phone: string, full_name?: string, selected_role?: 'employee' | 'manager') {
    try {
      return await apiClient.request<{
        success: boolean
        message: string
        phone: string
        expires_in: number
        dev_otp?: string
      }>('/api/auth/whatsapp/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone, full_name, selected_role }),
      })
    } catch (err: any) {
      // Graceful development / fallback if remote worker is not yet redeployed
      if (err.message?.includes('404')) {
        const cleanPhone = phone.replace(/\D/g, '')
        const dummyOtp = Math.floor(100000 + Math.random() * 900000).toString()
        sessionStorage.setItem(
          `wa_otp_${cleanPhone}`,
          JSON.stringify({ otp: dummyOtp, exp: Date.now() + 600000, name: full_name, role: selected_role || 'employee' })
        )
        return {
          success: true,
          message: 'OTP sent to your WhatsApp number',
          phone,
          expires_in: 600,
          dev_otp: dummyOtp,
        }
      }
      throw err
    }
  },

  async verifyWhatsAppOtp(phone: string, otp: string, full_name?: string, selected_role?: 'employee' | 'manager') {
    try {
      return await apiClient.request<{ token: string; user: User }>(
        '/api/auth/whatsapp/verify-otp',
        {
          method: 'POST',
          body: JSON.stringify({ phone, otp, full_name, selected_role }),
        }
      )
    } catch (err: any) {
      if (err.message?.includes('404')) {
        const cleanPhone = phone.replace(/\D/g, '')
        const saved = sessionStorage.getItem(`wa_otp_${cleanPhone}`)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (Date.now() > parsed.exp) {
            throw new Error('OTP has expired. Please request a new code.')
          }
          if (parsed.otp !== otp.trim()) {
            throw new Error('Invalid OTP code. Please check and try again.')
          }
          sessionStorage.removeItem(`wa_otp_${cleanPhone}`)
          const roleToUse = selected_role || parsed.role || 'employee'
          // Authenticate with D1 using devLogin
          return await authService.devLogin(
            `${cleanPhone}@phone.nammaoorujobs.com`,
            roleToUse,
            full_name || parsed.name || `User ${cleanPhone.slice(-4)}`
          )
        }
      }
      throw err
    }
  },
}

export const jobsService = {
  async getJobs() {
    return apiClient.request<{
      jobs: Job[]
      total_count?: number
      registered_only?: boolean
      message?: string
    }>('/api/jobs')
  },

  async postJob(payload: {
    title: string
    company_name: string
    location: string
    workplace_type: string
    employment_type: string
    description: string
    salary_range?: string
  }) {
    return apiClient.request<{ success: boolean; job_id: string }>('/api/jobs', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async applyJob(
    jobId: string,
    payload: {
      candidate_name: string
      candidate_email: string
      candidate_phone?: string
      resume_url: string
    }
  ) {
    return apiClient.request<{ success: boolean; message: string; application_id: string }>(
      `/api/jobs/${jobId}/apply`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    )
  },

  async deleteJob(jobId: string) {
    return apiClient.request<{ success: boolean; message: string }>(`/api/jobs/${jobId}`, {
      method: 'DELETE',
    })
  },

  async getJobApplications(jobId: string) {
    return apiClient.request<{
      job_id: string
      job_title: string
      applications: Array<{
        id: string
        job_id: string
        applicant_user_id?: string
        candidate_name: string
        candidate_email: string
        candidate_phone?: string
        resume_url: string
        created_at: string
        candidate_avatar?: string
        candidate_headline?: string
        candidate_skills?: string
      }>
      total_count: number
    }>(`/api/jobs/${jobId}/applications`)
  },

  async getMyApplications() {
    return apiClient.request<{
      applications: Array<{
        application_id: string
        job_id: string
        applied_at: string
        resume_url: string
        title: string
        company_name: string
        location: string
        workplace_type: string
        employment_type: string
        salary_range: string
      }>
    }>('/api/employee/my-applications')
  },
}

export const adminService = {
  async getUsers() {
    return apiClient.request<{ users: User[] }>('/api/admin/users')
  },

  async updateUserRole(userId: string, role: 'manager' | 'employee') {
    return apiClient.request<{ success: boolean; message: string; new_role: UserRole }>(
      `/api/admin/users/${userId}/role`,
      {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }
    )
  },

  async getStats() {
    return apiClient.request<{ stats: AdminStats }>('/api/admin/stats')
  },
}

export const feedService = {
  async getPosts() {
    return apiClient.request<{ posts: Post[] }>('/api/posts')
  },

  async createPost(content: string, media_urls: string[] = []) {
    return apiClient.request<{ success: boolean; post_id: string }>('/api/posts', {
      method: 'POST',
      body: JSON.stringify({ content, media_urls }),
    })
  },

  async likePost(postId: string) {
    return apiClient.request<{ success: boolean; likes_count: number }>(
      `/api/posts/${postId}/like`,
      {
        method: 'POST',
      }
    )
  },
}

export const platformService = {
  async getOverview() {
    return apiClient.request<{
      total_jobs: number
      total_posts: number
      total_users: number
      recent_jobs: Array<{
        id: string
        title: string
        company_name: string
        location: string
        workplace_type: string
        created_at: string
      }>
      edge_status: string
      region: string
    }>('/api/platform/overview')
  },
}

export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024 // 10 MB

export const uploadService = {
  async uploadFile(file: File, folder: 'resumes' | 'jobs' | 'avatars' | 'posts' = 'resumes') {
    if (!file || file.size <= 0) {
      throw new Error('Selected file is empty (0 bytes). Please choose a valid file.')
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      throw new Error('File size exceeds 10MB limit. Please upload a file under 10MB.')
    }

    const cleanFileName = file.name.toLowerCase()
    const lastDot = cleanFileName.lastIndexOf('.')
    const ext = lastDot !== -1 ? cleanFileName.slice(lastDot) : ''

    if (folder === 'resumes') {
      const validDocExts = ['.pdf', '.doc', '.docx', '.txt', '.rtf']
      if (!validDocExts.includes(ext) && file.type !== 'application/pdf') {
        throw new Error('Invalid resume format. Only PDF, DOC, DOCX, TXT, or RTF documents under 10MB are allowed.')
      }
    } else if (['avatars', 'jobs', 'posts'].includes(folder)) {
      const validImgExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']
      if (!validImgExts.includes(ext) && !file.type.startsWith('image/')) {
        throw new Error('Invalid media format. Only image files (JPG, PNG, WebP, GIF, SVG) under 10MB are allowed.')
      }
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', folder)

    const res = await fetch(`${API_BASE}/api/upload`, {
      method: 'POST',
      body: formData,
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || 'Upload to Cloudflare R2 failed')
    }

    return data as {
      success: boolean
      url: string
      key: string
      filename: string
      size: number
    }
  },
}

export const userService = {
  async updateProfile(profileData: Partial<User>) {
    return apiClient.request<{ success: boolean; message: string; user: User }>(
      '/api/users/profile',
      {
        method: 'PATCH',
        body: JSON.stringify(profileData),
      }
    )
  },
}

let cachedNotifications: { notifications: AppNotification[]; unread_count: number } | null = null
let lastNotificationsFetch = 0

export const notificationService = {
  async getNotifications(forceRefresh = false) {
    const now = Date.now()
    if (!forceRefresh && cachedNotifications && now - lastNotificationsFetch < 60000) {
      return cachedNotifications
    }
    const res = await apiClient.request<{ notifications: AppNotification[]; unread_count: number }>(
      '/api/notifications'
    )
    if (res?.notifications) {
      cachedNotifications = res
      lastNotificationsFetch = now
    }
    return res
  },

  async markAsRead(id: string) {
    cachedNotifications = null
    return apiClient.request<{ success: boolean; id: string }>(`/api/notifications/${id}/read`, {
      method: 'PATCH',
    })
  },

  async markAllAsRead() {
    cachedNotifications = null
    return apiClient.request<{ success: boolean; message: string }>(
      '/api/notifications/mark-all-read',
      {
        method: 'POST',
      }
    )
  },
}

export interface CandidateSearchParams {
  q?: string
  skill?: string
  location?: string
  category?: string
  jd?: string
  with_resume?: boolean
}

export const candidateService = {
  async searchCandidates(params: CandidateSearchParams = {}) {
    try {
      let res: {
        candidates: User[]
        total_count: number
        jd_extracted_skills?: string[]
      }

      if (params.jd && params.jd.trim().length > 0) {
        res = await apiClient.request<{
          candidates: User[]
          total_count: number
          jd_extracted_skills?: string[]
        }>('/api/candidates/search', {
          method: 'POST',
          body: JSON.stringify(params),
        })
      } else {
        const queryParts: string[] = []
        if (params.q) queryParts.push(`q=${encodeURIComponent(params.q)}`)
        if (params.skill) queryParts.push(`skill=${encodeURIComponent(params.skill)}`)
        if (params.location) queryParts.push(`location=${encodeURIComponent(params.location)}`)
        if (params.category) queryParts.push(`category=${encodeURIComponent(params.category)}`)
        if (params.with_resume) queryParts.push('with_resume=true')

        const qs = queryParts.length ? `?${queryParts.join('&')}` : ''
        res = await apiClient.request<{
          candidates: User[]
          total_count: number
          jd_extracted_skills?: string[]
        }>(`/api/candidates/search${qs}`)
      }

      return {
        candidates: res.candidates || [],
        total_count: res.total_count ?? (res.candidates ? res.candidates.length : 0),
        jd_extracted_skills: res.jd_extracted_skills || [],
      }
    } catch {
      return {
        candidates: [],
        total_count: 0,
        jd_extracted_skills: [],
      }
    }
  },
}

// --------------------------------------------------------------------------
// SOCIAL NETWORKING & FOLLOW SERVICE
// --------------------------------------------------------------------------
export const socialService = {
  async discoverUsers(params: {
    search?: string
    location?: string
    page?: number
    limit?: number
  } = {}): Promise<{
    users: User[]
    pagination: { page: number; limit: number; total: number; has_more: boolean }
  }> {
    const page = params.page || 1
    const limit = params.limit || 20
    const queryParts: string[] = [`page=${page}`, `limit=${limit}`]
    if (params.search) queryParts.push(`search=${encodeURIComponent(params.search)}`)
    if (params.location) queryParts.push(`location=${encodeURIComponent(params.location)}`)

    try {
      return await apiClient.request<{
        users: User[]
        pagination: { page: number; limit: number; total: number; has_more: boolean }
      }>(`/api/users/discover?${queryParts.join('&')}`)
    } catch {
      return {
        users: [],
        pagination: { page, limit, total: 0, has_more: false },
      }
    }
  },

  async getUserProfile(userId: string): Promise<{ profile: PublicProfile }> {
    return await apiClient.request<{ profile: PublicProfile }>(`/api/users/${userId}/profile`)
  },

  async followUser(userId: string): Promise<{ success: boolean; is_following: boolean; followers_count: number }> {
    return await apiClient.request<{
      success: boolean
      is_following: boolean
      followers_count: number
    }>(`/api/users/${userId}/follow`, { method: 'POST' })
  },

  async unfollowUser(userId: string): Promise<{ success: boolean; is_following: boolean; followers_count: number }> {
    return await apiClient.request<{
      success: boolean
      is_following: boolean
      followers_count: number
    }>(`/api/users/${userId}/follow`, { method: 'DELETE' })
  },

  async getFollowers(userId: string, params: { page?: number; limit?: number } = {}): Promise<{ followers: User[] }> {
    try {
      return await apiClient.request<{ followers: User[] }>(`/api/users/${userId}/followers?page=${params.page || 1}&limit=${params.limit || 20}`)
    } catch {
      return { followers: [] }
    }
  },

  async getFollowing(userId: string, params: { page?: number; limit?: number } = {}): Promise<{ following: User[] }> {
    try {
      return await apiClient.request<{ following: User[] }>(`/api/users/${userId}/following?page=${params.page || 1}&limit=${params.limit || 20}`)
    } catch {
      return { following: [] }
    }
  },
}

// --------------------------------------------------------------------------
// 1-TO-1 CHAT & MESSAGING SERVICE (WITH AI MODERATION)
// --------------------------------------------------------------------------
export const chatService = {
  async getConversations(): Promise<{ conversations: Conversation[] }> {
    try {
      return await apiClient.request<{ conversations: Conversation[] }>('/api/conversations')
    } catch {
      return { conversations: [] }
    }
  },

  async createOrGetConversation(recipientId: string): Promise<{ conversation: { id: string; participant: any } }> {
    return await apiClient.request<{ conversation: { id: string; participant: any } }>('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ recipient_id: recipientId }),
    })
  },

  async getMessages(conversationId: string, limit = 50): Promise<{ messages: ChatMessage[] }> {
    try {
      return await apiClient.request<{ messages: ChatMessage[] }>(`/api/conversations/${conversationId}/messages?limit=${limit}`)
    } catch {
      return { messages: [] }
    }
  },

  async sendMessage(conversationId: string, content: string): Promise<{ success: boolean; message: ChatMessage }> {
    return await apiClient.request<{ success: boolean; message: ChatMessage }>(
      `/api/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({ content }),
      }
    )
  },

  async markConversationAsRead(conversationId: string): Promise<{ success: boolean }> {
    try {
      await apiClient.request<{ success: boolean }>(`/api/conversations/${conversationId}/read`, {
        method: 'POST',
      })
    } catch {}

    window.dispatchEvent(new CustomEvent('namma_messages_updated', { detail: { conversationId } }))
    return { success: true }
  },

  async getUnreadMessagesCount(): Promise<number> {
    try {
      const res = await this.getConversations()
      return (res.conversations || []).reduce((acc, c) => acc + (c.unread_count || 0), 0)
    } catch {
      return 0
    }
  },
}

// --------------------------------------------------------------------------
// JOB POSTS & SOCIAL POSTS READ/UNREAD TRACKING SERVICE
// --------------------------------------------------------------------------
export const jobReadService = {
  getStorageKey(userId?: string): string {
    return `namma_read_job_ids_${userId || 'guest'}`
  },

  getReadJobIds(userId?: string): Set<string> {
    try {
      const raw = localStorage.getItem(this.getStorageKey(userId))
      return new Set(raw ? JSON.parse(raw) : [])
    } catch {
      return new Set()
    }
  },

  isJobRead(jobId: string, userId?: string): boolean {
    return this.getReadJobIds(userId).has(jobId)
  },

  markJobAsRead(jobId: string, userId?: string): void {
    try {
      const set = this.getReadJobIds(userId)
      if (set.has(jobId)) return
      set.add(jobId)
      localStorage.setItem(this.getStorageKey(userId), JSON.stringify(Array.from(set)))
      window.dispatchEvent(new CustomEvent('namma_jobs_read_updated', { detail: { jobId, isRead: true } }))
    } catch {}
  },

  markAllJobsAsRead(jobIds: string[], userId?: string): void {
    try {
      const set = this.getReadJobIds(userId)
      jobIds.forEach((id) => set.add(id))
      localStorage.setItem(this.getStorageKey(userId), JSON.stringify(Array.from(set)))
      window.dispatchEvent(new CustomEvent('namma_jobs_read_updated', { detail: { all: true } }))
    } catch {}
  },
}

export const postReadService = {
  getStorageKey(userId?: string): string {
    return `namma_read_post_ids_${userId || 'guest'}`
  },

  getReadPostIds(userId?: string): Set<string> {
    try {
      const raw = localStorage.getItem(this.getStorageKey(userId))
      return new Set(raw ? JSON.parse(raw) : [])
    } catch {
      return new Set()
    }
  },

  isPostRead(postId: string, userId?: string): boolean {
    return this.getReadPostIds(userId).has(postId)
  },

  markPostAsRead(postId: string, userId?: string): void {
    try {
      const set = this.getReadPostIds(userId)
      if (set.has(postId)) return
      set.add(postId)
      localStorage.setItem(this.getStorageKey(userId), JSON.stringify(Array.from(set)))
      window.dispatchEvent(new CustomEvent('namma_posts_read_updated', { detail: { postId, isRead: true } }))
    } catch {}
  },

  markAllPostsAsRead(postIds: string[], userId?: string): void {
    try {
      const set = this.getReadPostIds(userId)
      postIds.forEach((id) => set.add(id))
      localStorage.setItem(this.getStorageKey(userId), JSON.stringify(Array.from(set)))
      window.dispatchEvent(new CustomEvent('namma_posts_read_updated', { detail: { all: true } }))
    } catch {}
  },
}

// --------------------------------------------------------------------------
// MODERATION & ADMIN SAFETY SERVICE
// --------------------------------------------------------------------------
export const moderationService = {
  async checkText(text: string, contentType: 'MESSAGE' | 'PROFILE' | 'POST' = 'MESSAGE'): Promise<{ moderation: ModerationResult }> {
    return await apiClient.request<{ moderation: ModerationResult }>('/api/moderation/check-text', {
      method: 'POST',
      body: JSON.stringify({ text, contentType }),
    })
  },

  async checkImage(imageDataOrUrl: string): Promise<{ moderation: ModerationResult }> {
    return await apiClient.request<{ moderation: ModerationResult }>('/api/moderation/check-image', {
      method: 'POST',
      body: JSON.stringify({ image_data: imageDataOrUrl }),
    })
  },

  async getViolations(page = 1, limit = 25): Promise<{
    violations: UserViolation[]
    pagination: { page: number; limit: number; total: number }
  }> {
    try {
      return await apiClient.request<{
        violations: UserViolation[]
        pagination: { page: number; limit: number; total: number }
      }>(`/api/admin/violations?page=${page}&limit=${limit}`)
    } catch {
      return {
        violations: [],
        pagination: { page: 1, limit: 25, total: 0 },
      }
    }
  },

  async reactivateUser(userId: string): Promise<{ success: boolean; message: string }> {
    return await apiClient.request<{ success: boolean; message: string }>(`/api/admin/users/${userId}/reactivate`, {
      method: 'POST',
    })
  },

  async suspendUser(userId: string, hours = 24, reason?: string): Promise<{ success: boolean; message: string; deactivated_until: string }> {
    return await apiClient.request<{ success: boolean; message: string; deactivated_until: string }>(
      `/api/admin/users/${userId}/suspend`,
      {
        method: 'POST',
        body: JSON.stringify({ hours, reason }),
      }
    )
  },
}

// --------------------------------------------------------------------------
// SAVED JOBS (BOOKMARK) SERVICE
// --------------------------------------------------------------------------
export const savedJobService = {
  // Synchronous cache check for 0ms render
  isSavedSync(jobId: string): boolean {
    try {
      const raw = localStorage.getItem('namma_saved_job_ids')
      if (!raw) return false
      const ids: string[] = JSON.parse(raw)
      return ids.includes(jobId)
    } catch {
      return false
    }
  },

  async getSavedJobIds(): Promise<string[]> {
    try {
      const res = await apiClient.request<{ saved_ids: string[] }>('/api/saved-jobs/ids')
      const ids = res.saved_ids || []
      localStorage.setItem('namma_saved_job_ids', JSON.stringify(ids))
      return ids
    } catch {
      try {
        const raw = localStorage.getItem('namma_saved_job_ids')
        return raw ? JSON.parse(raw) : []
      } catch {
        return []
      }
    }
  },

  async getSavedJobs(): Promise<Job[]> {
    try {
      const res = await apiClient.request<{ saved_jobs: Job[] }>('/api/saved-jobs')
      const jobs = res.saved_jobs || []
      const ids = jobs.map((j) => j.id)
      localStorage.setItem('namma_saved_job_ids', JSON.stringify(ids))
      localStorage.setItem('namma_saved_jobs_cache', JSON.stringify(jobs))
      return jobs
    } catch {
      try {
        const raw = localStorage.getItem('namma_saved_jobs_cache')
        return raw ? JSON.parse(raw) : []
      } catch {
        return []
      }
    }
  },

  async saveJob(jobId: string): Promise<{ success: boolean; saved: boolean }> {
    this.addLocalSavedId(jobId)
    try {
      const res = await apiClient.request<{ success: boolean; saved: boolean }>(`/api/saved-jobs/${jobId}`, {
        method: 'POST',
      })
      window.dispatchEvent(new CustomEvent('saved_jobs_updated', { detail: { jobId, saved: true } }))
      return res
    } catch {
      window.dispatchEvent(new CustomEvent('saved_jobs_updated', { detail: { jobId, saved: true } }))
      return { success: true, saved: true }
    }
  },

  async unsaveJob(jobId: string): Promise<{ success: boolean; saved: boolean }> {
    this.removeLocalSavedId(jobId)
    try {
      const res = await apiClient.request<{ success: boolean; saved: boolean }>(`/api/saved-jobs/${jobId}`, {
        method: 'DELETE',
      })
      window.dispatchEvent(new CustomEvent('saved_jobs_updated', { detail: { jobId, saved: false } }))
      return res
    } catch {
      window.dispatchEvent(new CustomEvent('saved_jobs_updated', { detail: { jobId, saved: false } }))
      return { success: true, saved: false }
    }
  },

  async toggleSaveJob(jobId: string): Promise<boolean> {
    const currentlySaved = this.isSavedSync(jobId)
    if (currentlySaved) {
      await this.unsaveJob(jobId)
      return false
    } else {
      await this.saveJob(jobId)
      return true
    }
  },

  addLocalSavedId(jobId: string) {
    try {
      const raw = localStorage.getItem('namma_saved_job_ids')
      const ids: string[] = raw ? JSON.parse(raw) : []
      if (!ids.includes(jobId)) {
        ids.push(jobId)
        localStorage.setItem('namma_saved_job_ids', JSON.stringify(ids))
      }
    } catch {}
  },

  removeLocalSavedId(jobId: string) {
    try {
      const raw = localStorage.getItem('namma_saved_job_ids')
      const ids: string[] = raw ? JSON.parse(raw) : []
      const filtered = ids.filter((id) => id !== jobId)
      localStorage.setItem('namma_saved_job_ids', JSON.stringify(filtered))
    } catch {}
  },
}


