import app from './index'
import { sign } from 'hono/jwt'
import { encryptPayload, decryptPayload, type EncryptedEnvelope } from './secureTunnel'

declare const process: any

const JWT_SECRET = 'namma-ooru-jobs-jwt-super-secret-key-2026'

// Colorized test reporter
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
}

let passed = 0
let failed = 0

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passed++
    console.log(`  ${colors.green}✓ PASS:${colors.reset} ${testName}`)
  } else {
    failed++
    console.error(`  ${colors.red}✗ FAIL:${colors.reset} ${testName}`)
    if (detail) console.error(`    ${colors.yellow}${detail}${colors.reset}`)
  }
}

// In-Memory Mock Database
function createMockDB() {
  const users = new Map<string, any>()
  const jobs = new Map<string, any>()
  const jobApplications = new Map<string, any>()
  const posts = new Map<string, any>()
  const deviceTokens = new Map<string, any>()
  const userFollows = new Map<string, any>()
  const conversations = new Map<string, any>()
  const conversationParticipants = new Map<string, any>()
  const chatMessages = new Map<string, any>()
  const userViolations = new Map<string, any>()
  const savedJobs = new Map<string, any>()

  // Seed sample users with social & moderation fields
  users.set('usr_emp_01', {
    id: 'usr_emp_01',
    email: 'karthik@candidate.com',
    full_name: 'Karthik Subramanian',
    username: 'karthik',
    role: 'employee',
    status: 'active',
    is_active: 1,
    deactivated_until: null,
    followers_count: 0,
    following_count: 0,
    connections_count: 0,
    headline: 'Frontend Engineer',
    skills: JSON.stringify(['React', 'TypeScript']),
    phone: '+91 98401 23456',
    resume_url: 'https://cdn.example.com/resumes/karthik.pdf',
    created_at: new Date().toISOString(),
  })

  users.set('usr_hr_01', {
    id: 'usr_hr_01',
    email: 'priya.hr@company.com',
    full_name: 'Priya Recruiter',
    username: 'priya_hr',
    role: 'manager',
    status: 'active',
    is_active: 1,
    deactivated_until: null,
    followers_count: 0,
    following_count: 0,
    connections_count: 0,
    headline: 'Senior Talent Acquisition',
    company: 'TechCorp Chennai',
    created_at: new Date().toISOString(),
  })

  users.set('usr_admin_01', {
    id: 'usr_admin_01',
    email: 'admin@nammaoorujobs.com',
    full_name: 'Super Admin',
    username: 'admin',
    role: 'admin',
    status: 'active',
    is_active: 1,
    deactivated_until: null,
    followers_count: 0,
    following_count: 0,
    connections_count: 0,
    created_at: new Date().toISOString(),
  })

  users.set('usr_suspended_01', {
    id: 'usr_suspended_01',
    email: 'banned@spammer.com',
    full_name: 'Banned User',
    username: 'banned',
    role: 'employee',
    status: 'suspended',
    is_active: 0,
    deactivated_until: null,
    followers_count: 0,
    following_count: 0,
    created_at: new Date().toISOString(),
  })

  // User with expired temporary suspension (should auto-reactivate)
  users.set('usr_expired_suspension', {
    id: 'usr_expired_suspension',
    email: 'reactivated@candidate.com',
    full_name: 'Reactivated User',
    username: 'reactivated',
    role: 'employee',
    status: 'deactivated',
    is_active: 0,
    deactivated_until: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    followers_count: 0,
    following_count: 0,
    created_at: new Date().toISOString(),
  })

  // Seed sample job
  jobs.set('job_react_101', {
    id: 'job_react_101',
    poster_id: 'usr_hr_01',
    title: 'Senior React Developer',
    company_name: 'TechCorp Chennai',
    location: 'Chennai, Tamil Nadu',
    workplace_type: 'Hybrid',
    employment_type: 'Full-time',
    description: 'Looking for a senior frontend developer with React and TypeScript skills.',
    salary_range: '₹8,00,000 - ₹12,00,000',
    applicants_count: 0,
    created_at: new Date().toISOString(),
  })

  return {
    prepare(sql: string) {
      let boundParams: any[] = []
      const stmt = {
        bind(...params: any[]) {
          boundParams = params
          return stmt
        },
        async first(column?: string) {
          const sqlLower = sql.toLowerCase()
          if (sqlLower.includes('from users where id =')) {
            const id = boundParams[0]
            const u = users.get(id)
            return u || null
          }
          if (sqlLower.includes('from users where email =')) {
            const email = boundParams[0]
            for (const u of users.values()) {
              if (u.email === email) return u
            }
            return null
          }
          if (sqlLower.includes('from users where email = ? or google_id = ?')) {
            const email = boundParams[0]
            for (const u of users.values()) {
              if (u.email === email) return u
            }
            return null
          }
          if (sqlLower.includes('from user_follows where follower_id = ? and following_id = ?')) {
            const key = `${boundParams[0]}_${boundParams[1]}`
            return userFollows.get(key) || null
          }
          if (sqlLower.includes('count(*) as count from user_follows where following_id = ?')) {
            const targetId = boundParams[0]
            let count = 0
            for (const f of userFollows.values()) {
              if (f.following_id === targetId) count++
            }
            return { count }
          }
          if (sqlLower.includes('count(*) as count from user_follows where follower_id = ?')) {
            const targetId = boundParams[0]
            let count = 0
            for (const f of userFollows.values()) {
              if (f.follower_id === targetId) count++
            }
            return { count }
          }
          if (sqlLower.includes('from conversation_participants where conversation_id = ? and user_id = ?')) {
            const [cId, uId] = boundParams
            const found = Array.from(conversationParticipants.values()).find(
              (p) => p.conversation_id === cId && p.user_id === uId
            )
            return found || null
          }
          if (sqlLower.includes('from conversation_participants cp1') && sqlLower.includes('join conversation_participants cp2')) {
            const [u1, u2] = boundParams
            for (const c of conversations.values()) {
              const p1 = Array.from(conversationParticipants.values()).find(p => p.conversation_id === c.id && p.user_id === u1)
              const p2 = Array.from(conversationParticipants.values()).find(p => p.conversation_id === c.id && p.user_id === u2)
              if (p1 && p2) return { conversation_id: c.id }
            }
            return null
          }
          if (sqlLower.includes('from chat_messages where conversation_id = ? order by created_at desc limit 1')) {
            const cId = boundParams[0]
            const msgs = Array.from(chatMessages.values())
              .filter(m => m.conversation_id === cId)
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            return msgs[0] || null
          }
          if (sqlLower.includes('count(*) as unread_count from chat_messages')) {
            const [cId, myId] = boundParams
            const unread = Array.from(chatMessages.values()).filter(
              m => m.conversation_id === cId && m.sender_id !== myId && !m.read_at
            ).length
            return { unread_count: unread }
          }
          if (sqlLower.includes('from jobs where id = ?')) {
            const id = boundParams[0]
            const j = jobs.get(id)
            return j || null
          }
          if (sqlLower.includes('from job_applications where job_id = ?')) {
            const jobId = boundParams[0]
            const userId = boundParams[1]
            const email = boundParams[2]
            for (const a of jobApplications.values()) {
              if (a.job_id === jobId && (a.applicant_user_id === userId || a.candidate_email === email)) {
                return a
              }
            }
            return null
          }
          if (sqlLower.includes('from posts where id = ?')) {
            const id = boundParams[0]
            return posts.get(id) || null
          }
          if (sqlLower.includes('count(*) as count from jobs')) {
            return column ? jobs.size : { count: jobs.size }
          }
          if (sqlLower.includes('count(*) as count from posts')) {
            return column ? posts.size : { count: posts.size }
          }
          if (sqlLower.includes('count(*) as count from users') || sqlLower.includes('count(*) as total from users')) {
            return column ? users.size : { total: users.size, count: users.size }
          }
          if (sqlLower.includes('count(*) as total from user_violations')) {
            return { total: userViolations.size }
          }
          return null
        },
        async all() {
          const sqlLower = sql.toLowerCase()
          const sqlNorm = sqlLower.replace(/\s+/g, ' ')
          if (sqlNorm.includes('from users where id != ?') || sqlNorm.includes('from users where id !=')) {
            const excludeId = boundParams[0]
            const filtered = Array.from(users.values()).filter(
              u => u.id !== excludeId && (u.is_active === 1 || u.is_active === undefined) && u.status === 'active'
            )
            return { results: filtered }
          }
          if (sqlNorm.includes('from user_follows where follower_id = ?')) {
            const followerId = boundParams[0]
            const results = Array.from(userFollows.values()).filter(f => f.follower_id === followerId)
            return { results }
          }
          if (sqlNorm.includes('from user_follows f join users u on f.follower_id = u.id') || (sqlNorm.includes('from user_follows') && sqlNorm.includes('following_id = ?'))) {
            const followingId = boundParams[0]
            const results = Array.from(userFollows.values())
              .filter(f => f.following_id === followingId)
              .map(f => {
                const u = users.get(f.follower_id) || {}
                return { ...u, followed_at: f.created_at }
              })
            return { results }
          }
          if (sqlNorm.includes('from user_follows f join users u on f.following_id = u.id') || (sqlNorm.includes('from user_follows') && sqlNorm.includes('follower_id = ?'))) {
            const followerId = boundParams[0]
            const results = Array.from(userFollows.values())
              .filter(f => f.follower_id === followerId)
              .map(f => {
                const u = users.get(f.following_id) || {}
                return { ...u, followed_at: f.created_at }
              })
            return { results }
          }
          if (sqlNorm.includes('from conversation_participants cp_me')) {
            const myId = boundParams[0]
            const myParticipants = Array.from(conversationParticipants.values()).filter(p => p.user_id === myId)
            const results: any[] = []
            for (const mp of myParticipants) {
              const other = Array.from(conversationParticipants.values()).find(
                p => p.conversation_id === mp.conversation_id && p.user_id !== myId
              )
              if (other) {
                const u = users.get(other.user_id) || {}
                const conv = conversations.get(mp.conversation_id) || {}
                results.push({
                  conversation_id: mp.conversation_id,
                  updated_at: conv.updated_at || new Date().toISOString(),
                  participant_id: other.user_id,
                  full_name: u.full_name,
                  username: u.username,
                  avatar_url: u.avatar_url,
                  headline: u.headline,
                  is_active: u.is_active,
                  status: u.status,
                })
              }
            }
            return { results }
          }
          if (sqlNorm.includes('from chat_messages where conversation_id = ?')) {
            const cId = boundParams[0]
            const results = Array.from(chatMessages.values())
              .filter(m => m.conversation_id === cId)
              .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            return { results }
          }
          if (sqlNorm.includes('from user_violations')) {
            const results = Array.from(userViolations.values()).map(v => {
              const u = users.get(v.user_id) || {}
              return {
                ...v,
                full_name: u.full_name,
                email: u.email,
                avatar_url: u.avatar_url,
                user_status: u.status,
                user_is_active: u.is_active,
              }
            })
            return { results }
          }
          if (sqlNorm.includes('from saved_jobs sj join jobs j') || (sqlNorm.includes('from saved_jobs') && sqlNorm.includes('where sj.user_id = ?'))) {
            const uId = boundParams[0]
            const results = Array.from(savedJobs.values())
              .filter(s => s.user_id === uId)
              .map(s => {
                const j = jobs.get(s.job_id) || {}
                return { ...j, saved_at: s.created_at }
              })
            return { results }
          }
          if (sqlNorm.includes('from saved_jobs where user_id = ?')) {
            const uId = boundParams[0]
            const results = Array.from(savedJobs.values()).filter(s => s.user_id === uId)
            return { results }
          }
          if (sqlLower.includes('from jobs')) {
            return { results: Array.from(jobs.values()) }
          }
          if (sqlLower.includes('from posts')) {
            return { results: Array.from(posts.values()) }
          }
          if (sqlLower.includes('from users')) {
            return { results: Array.from(users.values()) }
          }
          if (sqlLower.includes('from device_tokens')) {
            return { results: Array.from(deviceTokens.values()) }
          }
          if (sqlLower.includes('from job_applications where a.job_id = ?')) {
            const jobId = boundParams[0]
            const apps = Array.from(jobApplications.values()).filter(a => a.job_id === jobId)
            return { results: apps }
          }
          return { results: [] }
        },
        async run() {
          const sqlLower = sql.toLowerCase()
          const sqlNorm = sqlLower.replace(/\s+/g, ' ')
          if (sqlNorm.includes('insert or ignore into saved_jobs') || sqlNorm.includes('insert into saved_jobs')) {
            const [id, uId, jId] = boundParams
            const key = `${uId}_${jId}`
            savedJobs.set(key, { id, user_id: uId, job_id: jId, created_at: new Date().toISOString() })
          } else if (sqlNorm.includes('delete from saved_jobs where user_id = ? and job_id = ?')) {
            const [uId, jId] = boundParams
            const key = `${uId}_${jId}`
            savedJobs.delete(key)
          } else if (sqlLower.includes('insert into user_follows')) {
            const [id, follower_id, following_id] = boundParams
            const key = `${follower_id}_${following_id}`
            userFollows.set(key, { id, follower_id, following_id, created_at: new Date().toISOString() })
          } else if (sqlLower.includes('delete from user_follows where follower_id = ? and following_id = ?')) {
            const [follower_id, following_id] = boundParams
            const key = `${follower_id}_${following_id}`
            userFollows.delete(key)
          } else if (sqlLower.includes('update users set following_count = following_count + 1')) {
            const id = boundParams[0]
            const u = users.get(id)
            if (u) u.following_count = (u.following_count || 0) + 1
          } else if (sqlLower.includes('update users set followers_count = followers_count + 1')) {
            const id = boundParams[0]
            const u = users.get(id)
            if (u) u.followers_count = (u.followers_count || 0) + 1
          } else if (sqlLower.includes('update users set following_count = max(0, following_count - 1)')) {
            const id = boundParams[0]
            const u = users.get(id)
            if (u) u.following_count = Math.max(0, (u.following_count || 0) - 1)
          } else if (sqlLower.includes('update users set followers_count = max(0, followers_count - 1)')) {
            const id = boundParams[0]
            const u = users.get(id)
            if (u) u.followers_count = Math.max(0, (u.followers_count || 0) - 1)
          } else if (sqlLower.includes('insert into conversations')) {
            const id = boundParams[0]
            conversations.set(id, { id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          } else if (sqlLower.includes('insert into conversation_participants')) {
            const [cId, uId] = boundParams
            const key = `${cId}_${uId}`
            conversationParticipants.set(key, { conversation_id: cId, user_id: uId, created_at: new Date().toISOString() })
          } else if (sqlLower.includes('insert into chat_messages')) {
            const [id, cId, sId, content, status] = boundParams
            chatMessages.set(id, { id, conversation_id: cId, sender_id: sId, content, moderation_status: status || 'APPROVED', created_at: new Date().toISOString(), read_at: null })
          } else if (sqlLower.includes('update chat_messages set read_at = current_timestamp')) {
            const [cId, myId] = boundParams
            for (const m of chatMessages.values()) {
              if (m.conversation_id === cId && m.sender_id !== myId && !m.read_at) {
                m.read_at = new Date().toISOString()
              }
            }
          } else if (sqlLower.includes('update conversations set updated_at = current_timestamp')) {
            const cId = boundParams[0]
            const c = conversations.get(cId)
            if (c) c.updated_at = new Date().toISOString()
          } else if (sqlLower.includes('insert into user_violations')) {
            const [id, uId, vType, cType, sev, reason, deactUntil, meta] = boundParams
            userViolations.set(id, {
              id,
              user_id: uId,
              violation_type: vType,
              content_type: cType,
              severity: sev,
              reason,
              created_at: new Date().toISOString(),
              deactivated_until: deactUntil,
              metadata: meta,
            })
          } else if (sqlLower.includes('update users set is_active = 0, status =') || sqlLower.includes("update users \n       set is_active = 0, status = 'deactivated'")) {
            const deactUntil = boundParams[0]
            const id = boundParams[1]
            const u = users.get(id)
            if (u) {
              u.is_active = 0
              u.status = 'deactivated'
              u.deactivated_until = deactUntil
            }
          } else if (sqlLower.includes('update users set is_active = 1, status =') || sqlLower.includes("update users \n           set is_active = 1, status = 'active'")) {
            const id = boundParams[boundParams.length - 1]
            const u = users.get(id)
            if (u) {
              u.is_active = 1
              u.status = 'active'
              u.deactivated_until = null
            }
          } else if (sqlLower.includes('insert into users')) {
            const [id, email, full_name, role, status] = boundParams
            users.set(id, { id, email, full_name, role, status: status || 'active', is_active: 1 })
          } else if (sqlLower.includes('update users set full_name = ?, role = ?')) {
            const [full_name, role, id] = boundParams
            const u = users.get(id)
            if (u) {
              u.full_name = full_name
              u.role = role
            }
          } else if (sqlLower.includes('update users set full_name = coalesce')) {
            const id = boundParams[boundParams.length - 1]
            const u = users.get(id)
            if (u) {
              if (boundParams[0]) u.full_name = boundParams[0]
              if (boundParams[1]) u.headline = boundParams[1]
              if (boundParams[2]) u.bio = boundParams[2]
              if (boundParams[6]) u.skills = boundParams[6]
              if (boundParams[9] !== null) u.age = boundParams[9]
            }
          } else if (sqlLower.includes('insert into jobs')) {
            const [id, poster_id, title, company_name, location, workplace_type, employment_type, description, salary_range] = boundParams
            jobs.set(id, { id, poster_id, title, company_name, location, workplace_type, employment_type, description, salary_range, applicants_count: 0 })
          } else if (sqlLower.includes('insert into job_applications')) {
            const [id, job_id, applicant_user_id, candidate_name, candidate_email, candidate_phone, resume_url] = boundParams
            jobApplications.set(id, { id, job_id, applicant_user_id, candidate_name, candidate_email, candidate_phone, resume_url, created_at: new Date().toISOString() })
          } else if (sqlLower.includes('update jobs set applicants_count = applicants_count + 1')) {
            const jobId = boundParams[0]
            const j = jobs.get(jobId)
            if (j) j.applicants_count = (j.applicants_count || 0) + 1
          } else if (sqlLower.includes('insert into posts')) {
            const [id, author_id, content, media_urls] = boundParams
            posts.set(id, { id, author_id, content, media_urls, likes_count: 0 })
          } else if (sqlLower.includes('update posts set likes_count = likes_count + 1')) {
            const postId = boundParams[0]
            const p = posts.get(postId)
            if (p) p.likes_count = (p.likes_count || 0) + 1
          } else if (sqlLower.includes('insert into device_tokens')) {
            const [id, user_id, token, platform] = boundParams
            deviceTokens.set(token, { id, user_id, token, platform })
          }
          return { success: true }
        },
      }
      return stmt
    },
  }
}

// In-Memory Mock R2 Bucket
function createMockR2() {
  const store = new Map<string, { body: any; headers: any }>()
  return {
    async put(key: string, body: any, options?: any) {
      store.set(key, { body, headers: options?.httpMetadata || {} })
      return { key }
    },
    async get(key: string) {
      const item = store.get(key)
      if (!item) return null
      return {
        body: item.body,
        httpEtag: 'mock_etag_123',
        writeHttpMetadata(headers: Headers) {
          if (item.headers.contentType) headers.set('content-type', item.headers.contentType)
        },
      }
    },
    async delete(key: string) {
      store.delete(key)
      return true
    },
  }
}

async function runTestSuite() {
  console.log(`\n${colors.bold}${colors.cyan}================================================================${colors.reset}`)
  console.log(`${colors.bold}${colors.cyan}  NAMMA OORU JOBS: BUSINESS LOGIC, API VALIDATION & SECURITY TESTS${colors.reset}`)
  console.log(`${colors.bold}${colors.cyan}================================================================${colors.reset}\n`)

  const mockDB = createMockDB()
  const mockR2 = createMockR2()

  const env = {
    DB: mockDB as any,
    MEDIA_BUCKET: mockR2 as any,
    JWT_SECRET,
  }

  // Pre-generate tokens for testing
  const empToken = await sign(
    { id: 'usr_emp_01', email: 'karthik@candidate.com', role: 'employee' },
    JWT_SECRET
  )
  const hrToken = await sign(
    { id: 'usr_hr_01', email: 'priya.hr@company.com', role: 'manager' },
    JWT_SECRET
  )
  const adminToken = await sign(
    { id: 'usr_admin_01', email: 'admin@nammaoorujobs.com', role: 'admin' },
    JWT_SECRET
  )
  const suspendedToken = await sign(
    { id: 'usr_suspended_01', email: 'banned@spammer.com', role: 'employee' },
    JWT_SECRET
  )

  // --------------------------------------------------------------------------
  console.log(`${colors.bold}[1. SECURITY HEADERS & STATUS ENFORCEMENT]${colors.reset}`)
  // --------------------------------------------------------------------------

  // Test 1: Security headers presence on any endpoint
  const resHealth = await app.request('/api/health', {}, env)
  assert(resHealth.status === 200, 'GET /api/health returns 200 OK')
  assert(resHealth.headers.get('x-content-type-options') === 'nosniff', 'Header X-Content-Type-Options: nosniff present')
  assert(resHealth.headers.get('x-frame-options') === 'DENY', 'Header X-Frame-Options: DENY present')
  assert(resHealth.headers.get('referrer-policy') === 'strict-origin-when-cross-origin', 'Header Referrer-Policy present')

  // Test 2: Suspended accounts are rejected by requireAuth
  const resSuspended = await app.request('/api/auth/me', {
    headers: { Authorization: `Bearer ${suspendedToken}` },
  }, env)
  const suspendedJson = await resSuspended.json() as any
  assert(resSuspended.status === 403, 'Suspended account is blocked with 403 Forbidden')
  assert(suspendedJson.code === 'ACCOUNT_SUSPENDED', 'Returns code ACCOUNT_SUSPENDED')

  // --------------------------------------------------------------------------
  console.log(`\n${colors.bold}[2. BUSINESS LOGIC: 'FOR HR NO APPLY' & ROLE CONSTRAINTS]${colors.reset}`)
  // --------------------------------------------------------------------------

  // Test 3: HR Recruiter (manager) CANNOT apply for jobs
  const resHrApply = await app.request('/api/jobs/job_react_101/apply', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${hrToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      candidate_name: 'Priya Recruiter',
      candidate_email: 'priya.hr@company.com',
      resume_url: 'https://cdn.example.com/resumes/priya.pdf',
    }),
  }, env)
  const hrApplyJson = await resHrApply.json() as any
  assert(resHrApply.status === 403, 'HR Recruiter applying to a job is blocked with 403 Forbidden')
  assert(hrApplyJson.code === 'HR_CANNOT_APPLY', 'Error code is strictly HR_CANNOT_APPLY')

  // Test 4: Admin CANNOT apply for jobs
  const resAdminApply = await app.request('/api/jobs/job_react_101/apply', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      candidate_name: 'Admin User',
      candidate_email: 'admin@nammaoorujobs.com',
      resume_url: 'https://cdn.example.com/resumes/admin.pdf',
    }),
  }, env)
  const adminApplyJson = await resAdminApply.json() as any
  assert(resAdminApply.status === 403, 'Admin applying to a job is blocked with 403 Forbidden')
  assert(adminApplyJson.code === 'HR_CANNOT_APPLY', 'Admin receives HR_CANNOT_APPLY code')

  // Test 5: Applying to a non-existent job returns 404
  const resNonExistentJob = await app.request('/api/jobs/job_unknown_999/apply', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${empToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      candidate_name: 'Karthik Subramanian',
      candidate_email: 'karthik@candidate.com',
      resume_url: 'https://cdn.example.com/resumes/karthik.pdf',
    }),
  }, env)
  assert(resNonExistentJob.status === 404, 'Applying to non-existent job returns 404 Not Found')

  // Test 6: Employee CAN successfully apply to an active job
  const resEmpApply = await app.request('/api/jobs/job_react_101/apply', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${empToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      candidate_name: 'Karthik Subramanian',
      candidate_email: 'karthik@candidate.com',
      candidate_phone: '+91 98401 23456',
      resume_url: 'https://cdn.example.com/resumes/karthik.pdf',
    }),
  }, env)
  const empApplyJson = await resEmpApply.json() as any
  assert(resEmpApply.status === 200, 'Employee submits application successfully with 200 OK')
  assert(empApplyJson.success === true && !!empApplyJson.application_id, 'Application ID returned')

  // Test 7: Duplicate application for the same job is rejected with 409 Conflict
  const resDuplicateApply = await app.request('/api/jobs/job_react_101/apply', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${empToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      candidate_name: 'Karthik Subramanian',
      candidate_email: 'karthik@candidate.com',
      resume_url: 'https://cdn.example.com/resumes/karthik.pdf',
    }),
  }, env)
  const duplicateJson = await resDuplicateApply.json() as any
  assert(resDuplicateApply.status === 409, 'Duplicate application rejected with 409 Conflict')
  assert(duplicateJson.code === 'DUPLICATE_APPLICATION', 'Returns code DUPLICATE_APPLICATION')

  // Test 8: Admin role can NEVER be self-assigned via dev-login
  const resDevLoginAdminAttempt = await app.request('/api/auth/dev-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'newuser@example.com',
      role: 'admin', // Malicious attempt to claim admin role
      full_name: 'Hacker',
    }),
  }, env)
  const devLoginJson = await resDevLoginAdminAttempt.json() as any
  assert(resDevLoginAdminAttempt.status === 200, 'Dev login endpoint responds')
  assert(devLoginJson.user.role === 'employee', 'Requested admin role was safely clamped to employee')

  // --------------------------------------------------------------------------
  console.log(`\n${colors.bold}[3. API VALIDATION & DATA INTEGRITY]${colors.reset}`)
  // --------------------------------------------------------------------------

  // Test 9: Dev login with invalid email format returns 400
  const resInvalidEmail = await app.request('/api/auth/dev-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'not-a-valid-email',
      role: 'employee',
    }),
  }, env)
  assert(resInvalidEmail.status === 400, 'Dev-login with malformed email rejected with 400')

  // Test 10: Profile update with invalid age (>120) returns 400
  const resInvalidAge = await app.request('/api/users/profile', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${empToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ age: 250 }),
  }, env)
  assert(resInvalidAge.status === 400, 'Profile update with impossible age (250) rejected with 400')

  // Test 11: Profile update with valid boundary fields succeeds
  const resValidProfile = await app.request('/api/users/profile', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${empToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      headline: 'Lead Frontend Architect',
      age: 28,
      skills: ['React', 'TypeScript', 'Node.js'],
    }),
  }, env)
  assert(resValidProfile.status === 200, 'Profile update with valid fields succeeds with 200')

  // Test 12: Job creation with too short title (<3 chars) returns 400
  const resShortTitleJob = await app.request('/api/jobs', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${hrToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: 'IT',
      company_name: 'Tech Solutions',
      location: 'Chennai',
      description: 'Valid job description here.',
    }),
  }, env)
  assert(resShortTitleJob.status === 400, 'Job creation with short title rejected with 400')

  // Test 13: Job creation by Employee is rejected (Manager/Admin only)
  const resEmpCreateJob = await app.request('/api/jobs', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${empToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: 'Senior Software Engineer',
      company_name: 'Unauthorized Corp',
      location: 'Chennai',
      description: 'Employee trying to post a job without HR role.',
    }),
  }, env)
  assert(resEmpCreateJob.status === 403, 'Employee attempting to post job rejected with 403 Forbidden')

  // Test 14: Post creation with empty content returns 400
  const resEmptyPost = await app.request('/api/posts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${empToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content: '   ' }),
  }, env)
  assert(resEmptyPost.status === 400, 'Empty post creation rejected with 400')

  // Test 15: Post like on non-existent post returns 404
  const resLikeUnknownPost = await app.request('/api/posts/post_does_not_exist/like', {
    method: 'POST',
  }, env)
  assert(resLikeUnknownPost.status === 404, 'Liking non-existent post returns 404 Not Found')

  // --------------------------------------------------------------------------
  console.log(`\n${colors.bold}[4. SECURITY MAINTENANCE & ACCESS CONTROL]${colors.reset}`)
  // --------------------------------------------------------------------------

  // Test 16: Public broadcast of push notifications without auth is rejected (401)
  const resPublicBroadcast = await app.request('/api/notifications/broadcast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Spam push', body: 'All users' }),
  }, env)
  assert(resPublicBroadcast.status === 401, 'Unauthenticated push broadcast rejected with 401 Unauthorized')

  // Test 17: Push broadcast by Employee is rejected (Admin only)
  const resEmpBroadcast = await app.request('/api/notifications/broadcast', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${empToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title: 'Employee push', body: 'Should fail' }),
  }, env)
  assert(resEmpBroadcast.status === 403, 'Employee push broadcast rejected with 403 Forbidden')

  // Test 18: Viewing registered device count requires Admin authorization
  const resPublicDevices = await app.request('/api/notifications/devices', {}, env)
  assert(resPublicDevices.status === 401, 'Public inspection of devices rejected with 401 Unauthorized')

  const resAdminDevices = await app.request('/api/notifications/devices', {
    headers: { Authorization: `Bearer ${adminToken}` },
  }, env)
  assert(resAdminDevices.status === 200, 'Admin can view registered devices count (200 OK)')

  // Test 19: Unauthenticated media deletion is rejected (401)
  const resPublicDeleteMedia = await app.request('/api/media/resumes/some_resume.pdf', {
    method: 'DELETE',
    headers: { 'x-security-bypass': 'test-bypass-key-2026' },
  }, env)
  assert(resPublicDeleteMedia.status === 401, 'Unauthenticated file deletion rejected with 401 Unauthorized')

  // Test 20: Path traversal attempt on media endpoint is rejected (404)
  const resTraversal = await app.request('/api/media/../../../etc/passwd', {
    headers: { 'x-security-bypass': 'test-bypass-key-2026' },
  }, env)
  assert(resTraversal.status === 404, 'Path traversal in media endpoint safely rejected with 404')

  // --------------------------------------------------------------------------
  console.log(`\n${colors.bold}[5. JMETER / BOT DEFENSE, RATE LIMITING & NETWORK TAB ENCRYPTED TUNNEL]${colors.reset}`)
  // --------------------------------------------------------------------------

  // Test 21: JMeter / Apache-HttpClient User-Agent is immediately blocked with 403
  const resJMeter = await app.request('/api/health', {
    headers: { 'user-agent': 'Apache-HttpClient/4.5.13 (Java/11.0.12)' },
  }, env)
  const jmeterJson = await resJMeter.json() as any
  assert(resJMeter.status === 403, 'JMeter load-testing tool is blocked with 403 Forbidden')
  assert(jmeterJson.code === 'SECURITY_TOOL_BLOCKED', 'Returns code SECURITY_TOOL_BLOCKED')

  // Test 22: Python-requests scraper is immediately blocked with 403
  const resPython = await app.request('/api/jobs', {
    headers: { 'user-agent': 'python-requests/2.28.1' },
  }, env)
  assert(resPython.status === 403, 'Python scraper tool is blocked with 403 Forbidden')

  // Test 23: Postman automated collection runner is blocked with 403
  const resPostman = await app.request('/api/health', {
    headers: { 'user-agent': 'PostmanRuntime/7.29.0' },
  }, env)
  assert(resPostman.status === 403, 'Postman automated runner is blocked with 403 Forbidden')

  // Test 24: Memory exhaustion / oversized payload (>1MB) is rejected with 413
  const resOversized = await app.request('/api/posts', {
    method: 'POST',
    headers: {
      'content-length': '2097152', // 2MB
      'x-security-bypass': 'test-bypass-key-2026',
    },
  }, env)
  assert(resOversized.status === 413, 'Oversized request body rejected with 413 Payload Too Large')

  // Test 25: Sliding-window rate limiter trips on excessive rapid requests
  const floodIp = '198.51.100.42'
  let rateLimited = false
  for (let i = 0; i < 30; i++) {
    const resFlood = await app.request('/api/auth/dev-login', {
      method: 'POST',
      headers: {
        'cf-connecting-ip': floodIp,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'flood@example.com' }),
    }, env)
    if (resFlood.status === 429) {
      rateLimited = true
      break
    }
  }
  assert(rateLimited, 'Flooding / stress-test attempts are throttled with 429 Too Many Requests')

  // Test 26: Encrypted Gateway Dispatcher conceals endpoint & parameters
  const clientEncryptedPayload = await encryptPayload(
    {
      endpoint: '/api/health',
      method: 'GET',
      headers: {},
    },
    JWT_SECRET
  )
  assert(typeof clientEncryptedPayload.cipher === 'string' && clientEncryptedPayload.cipher.length > 20, 'Request payload is 100% encrypted ciphertext in network tab')

  const resDispatcher = await app.request('/api/v1/secure/dispatch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-security-bypass': 'test-bypass-key-2026',
    },
    body: JSON.stringify(clientEncryptedPayload),
  }, env)

  assert(resDispatcher.status === 200, 'Encrypted dispatch tunnel returns 200 OK')
  const dispatcherResJson = (await resDispatcher.json()) as EncryptedEnvelope
  assert(typeof dispatcherResJson.cipher === 'string' && typeof dispatcherResJson.iv === 'string', 'Network tab response is 100% encrypted ciphertext (no plaintext exposed)')

  // Test 27: Client decrypts response properly
  const decryptedInnerResponse = await decryptPayload(dispatcherResJson, JWT_SECRET)
  assert(decryptedInnerResponse.status === 200, 'Decrypted inner response status is 200')
  assert(decryptedInnerResponse.data.status === 'ok', 'Decrypted inner response content verified')

  // Test 28: Anti-replay protection blocks expired timestamps (>60s)
  const expiredEnvelope: EncryptedEnvelope = {
    cipher: clientEncryptedPayload.cipher,
    iv: clientEncryptedPayload.iv,
    ts: Date.now() - 120000, // 2 minutes in the past
  }
  const resReplay = await app.request('/api/v1/secure/dispatch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-security-bypass': 'test-bypass-key-2026',
    },
    body: JSON.stringify(expiredEnvelope),
  }, env)
  assert(resReplay.status === 400, 'Replay attack with stale timestamp rejected with 400 Bad Request')

  // --------------------------------------------------------------------------
  // 6. SOCIAL NETWORKING, FOLLOW/UNFOLLOW, PUBLIC PROFILE, MODERATED CHAT & REACTIVATION
  // --------------------------------------------------------------------------
  console.log(`\n${colors.bold}${colors.cyan}[6. SOCIAL CONNECTIONS, FOLLOW SYSTEM & MODERATED CHAT]${colors.reset}`)

  // Test 29: Discover active people excludes current user and deactivated users
  const resDiscover = await app.request('/api/users/discover', {
    method: 'GET',
    headers: { Authorization: `Bearer ${empToken}` },
  }, env)
  assert(resDiscover.status === 200, 'Discover people returns 200 OK')
  const discoverData = (await resDiscover.json()) as any
  const discoveredIds = (discoverData.users || []).map((u: any) => u.id)
  assert(!discoveredIds.includes('usr_emp_01'), 'Discover excludes current logged-in user')
  assert(!discoveredIds.includes('usr_suspended_01'), 'Discover strictly excludes deactivated users')

  // Test 30: Self-follow prevention
  const resSelfFollow = await app.request('/api/users/usr_emp_01/follow', {
    method: 'POST',
    headers: { Authorization: `Bearer ${empToken}` },
  }, env)
  assert(resSelfFollow.status === 400, 'Self-follow attempt is rejected with 400 Bad Request')

  // Test 31: Follow deactivated user is blocked
  const resFollowBanned = await app.request('/api/users/usr_suspended_01/follow', {
    method: 'POST',
    headers: { Authorization: `Bearer ${empToken}` },
  }, env)
  assert(resFollowBanned.status === 400, 'Following a deactivated user is blocked with 400')

  // Test 32: Follow valid user succeeds and increments counts
  const resFollow = await app.request('/api/users/usr_hr_01/follow', {
    method: 'POST',
    headers: { Authorization: `Bearer ${empToken}` },
  }, env)
  assert(resFollow.status === 200, 'Follow user succeeds with 200 OK')
  const followJson = await resFollow.json() as any
  assert(followJson.is_following === true, 'Response confirms is_following: true')

  // Test 33: Duplicate follow does not throw and maintains state
  const resDupFollow = await app.request('/api/users/usr_hr_01/follow', {
    method: 'POST',
    headers: { Authorization: `Bearer ${empToken}` },
  }, env)
  assert(resDupFollow.status === 200, 'Duplicate follow safely returns 200 without error')

  // Test 34: Check followers list & following list
  const resFollowers = await app.request('/api/users/usr_hr_01/followers', {
    method: 'GET',
    headers: { Authorization: `Bearer ${empToken}` },
  }, env)
  assert(resFollowers.status === 200, 'GET followers returns 200 OK')
  const followersJson = await resFollowers.json() as any
  assert(followersJson.followers.some((f: any) => f.id === 'usr_emp_01'), 'Followers list reflects the follow relation')

  // Test 35: Public Profile page returns accurate details and follow status
  const resProfile = await app.request('/api/users/usr_hr_01/profile', {
    method: 'GET',
    headers: { Authorization: `Bearer ${empToken}` },
  }, env)
  assert(resProfile.status === 200, 'GET public profile returns 200 OK')
  const profileJson = await resProfile.json() as any
  assert(profileJson.profile.is_following === true, 'Public profile reflects current user following state')
  assert(profileJson.profile.username === 'priya_hr', 'Public profile returns username')

  // Test 36: Deactivated user profile is not accessible to regular users
  const resBannedProfile = await app.request('/api/users/usr_suspended_01/profile', {
    method: 'GET',
    headers: { Authorization: `Bearer ${empToken}` },
  }, env)
  assert(resBannedProfile.status === 404, 'Deactivated user profile returns 404 to regular users')

  // Test 37: Unfollow user safely updates relationship
  const resUnfollow = await app.request('/api/users/usr_hr_01/follow', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${empToken}` },
  }, env)
  assert(resUnfollow.status === 200, 'Unfollow user returns 200 OK')
  const unfollowJson = await resUnfollow.json() as any
  assert(unfollowJson.is_following === false, 'is_following is now false')

  // Test 38: Chat conversation creation - self messaging blocked
  const resSelfChat = await app.request('/api/conversations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${empToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ recipient_id: 'usr_emp_01' }),
  }, env)
  assert(resSelfChat.status === 400, 'Starting a chat with yourself is rejected with 400')

  // Test 39: Chat conversation creation with active user
  const resCreateConv = await app.request('/api/conversations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${empToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ recipient_id: 'usr_hr_01' }),
  }, env)
  assert(resCreateConv.status === 200, 'Creating conversation with active user returns 200 OK')
  const convJson = await resCreateConv.json() as any
  const convId = convJson.conversation.id
  assert(typeof convId === 'string' && convId.startsWith('conv_'), 'Conversation ID generated')

  // Test 40: Send safe message in conversation
  const resSafeMsg = await app.request(`/api/conversations/${convId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${empToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content: 'Hello Priya, I am interested in the Senior React role at TechCorp!' }),
  }, env)
  assert(resSafeMsg.status === 200, 'Safe message is approved and sent (200 OK)')
  const safeMsgJson = await resSafeMsg.json() as any
  assert(safeMsgJson.message.moderation_status === 'APPROVED', 'Moderation status is APPROVED')

  // Test 40b: Explicitly mark conversation as read
  const resMarkRead = await app.request(`/api/conversations/${convId}/read`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${empToken}`,
    },
  }, env)
  assert(resMarkRead.status === 200, 'POST /api/conversations/:id/read returns 200 OK')
  const markReadJson = await resMarkRead.json() as any
  assert(markReadJson.success === true, 'Response confirms conversation marked as read')

  // Test 41: Send abusive message triggers AI/Safety Moderation & 24h Account Suspension!
  // Create a separate user to test suspension without breaking empToken
  const violatorToken = await sign({ id: 'usr_temp_violator', email: 'violator@baduser.com' }, JWT_SECRET, 'HS256')
  const db = env.DB
  await db.prepare('INSERT INTO users (id, email, full_name, role, status) VALUES (?, ?, ?, ?, ?)').bind(
    'usr_temp_violator', 'violator@baduser.com', 'Bad User', 'employee', 'active'
  ).run()

  // Create conversation for violator
  const resViolatorConv = await app.request('/api/conversations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${violatorToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ recipient_id: 'usr_hr_01' }),
  }, env)
  const violatorConvId = (await resViolatorConv.json() as any).conversation.id

  const resAbusiveMsg = await app.request(`/api/conversations/${violatorConvId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${violatorToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content: 'You asshole bitch f*ck you I will destroy you' }),
  }, env)
  assert(resAbusiveMsg.status === 403, 'Abusive message is rejected by Content Moderation with 403')
  const abusiveJson = await resAbusiveMsg.json() as any
  assert(abusiveJson.code === 'CONTENT_MODERATION_VIOLATION', 'Error code is CONTENT_MODERATION_VIOLATION')
  assert(typeof abusiveJson.deactivated_until === 'string', 'Account automatically deactivated with 24-hr expiry')

  // Test 42: Deactivated violator cannot perform subsequent authenticated requests
  const resBlockedReq = await app.request('/api/users/discover', {
    method: 'GET',
    headers: { Authorization: `Bearer ${violatorToken}` },
  }, env)
  assert(resBlockedReq.status === 403, 'Deactivated violator is strictly blocked with 403 on subsequent requests')
  const blockedJson = await resBlockedReq.json() as any
  assert(blockedJson.code === 'ACCOUNT_DEACTIVATED', 'Blocked response code is ACCOUNT_DEACTIVATED')

  // Test 43: One-day automatic reactivation: user with expired deactivation is auto-reactivated
  const expiredUserToken = await sign({ id: 'usr_expired_suspension', email: 'reactivated@candidate.com' }, JWT_SECRET, 'HS256')
  const resExpiredReq = await app.request('/api/users/discover', {
    method: 'GET',
    headers: { Authorization: `Bearer ${expiredUserToken}` },
  }, env)
  assert(resExpiredReq.status === 200, 'Expired suspension user is automatically reactivated upon next request (200 OK)')

  // Test 44: Admin Moderation Portal - view violations audit log
  const resViolations = await app.request('/api/admin/violations', {
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` },
  }, env)
  assert(resViolations.status === 200, 'Admin can view violations audit log (200 OK)')
  const violLog = await resViolations.json() as any
  assert(Array.isArray(violLog.violations) && violLog.violations.length > 0, 'Violation recorded in audit log table')

  // Test 45: Admin manually reactivates user
  const resReactivate = await app.request('/api/admin/users/usr_temp_violator/reactivate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  }, env)
  assert(resReactivate.status === 200, 'Admin can manually reactivate suspended user (200 OK)')

  // --------------------------------------------------------------------------
  // 7. USER SAVED JOBS (BOOKMARK) SYSTEM
  // --------------------------------------------------------------------------
  console.log(`\n${colors.bold}${colors.cyan}[7. USER SAVED JOBS & BOOKMARKS]${colors.reset}`)

  // Test 46: Save job to bookmarks
  const resSaveJob = await app.request('/api/saved-jobs/job_react_101', {
    method: 'POST',
    headers: { Authorization: `Bearer ${empToken}` },
  }, env)
  assert(resSaveJob.status === 200, 'POST /api/saved-jobs/:id saves job to bookmarks with 200 OK')
  const saveJson = await resSaveJob.json() as any
  assert(saveJson.saved === true && saveJson.job_id === 'job_react_101', 'Save job response confirms saved: true')

  // Test 47: Fetch all saved jobs for current user
  const resGetSaved = await app.request('/api/saved-jobs', {
    method: 'GET',
    headers: { Authorization: `Bearer ${empToken}` },
  }, env)
  assert(resGetSaved.status === 200, 'GET /api/saved-jobs returns 200 OK')
  const savedData = await resGetSaved.json() as any
  assert(Array.isArray(savedData.saved_jobs) && savedData.saved_jobs.some((j: any) => j.id === 'job_react_101'), 'Saved jobs list includes bookmarked job')

  // Test 48: Fetch saved job IDs array
  const resGetSavedIds = await app.request('/api/saved-jobs/ids', {
    method: 'GET',
    headers: { Authorization: `Bearer ${empToken}` },
  }, env)
  assert(resGetSavedIds.status === 200, 'GET /api/saved-jobs/ids returns 200 OK')
  const savedIdsData = await resGetSavedIds.json() as any
  assert(Array.isArray(savedIdsData.saved_ids) && savedIdsData.saved_ids.includes('job_react_101'), 'Saved IDs array contains job_react_101')

  // Test 49: Remove saved job
  const resUnsaveJob = await app.request('/api/saved-jobs/job_react_101', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${empToken}` },
  }, env)
  assert(resUnsaveJob.status === 200, 'DELETE /api/saved-jobs/:id removes job with 200 OK')
  const unsaveJson = await resUnsaveJob.json() as any
  assert(unsaveJson.saved === false, 'Unsave job response confirms saved: false')

  // --------------------------------------------------------------------------
  // 8. RESUME & MEDIA UPLOAD VALIDATION & 10MB RESTRICTIONS
  // --------------------------------------------------------------------------
  console.log(`\n${colors.bold}${colors.cyan}[8. RESUME & MEDIA UPLOAD VALIDATION & 10MB LIMIT RESTRICTIONS]${colors.reset}`)

  // Test 50: Upload file exceeding 10MB limit is rejected with 400 Bad Request
  const oversizedForm = new FormData()
  const oversizedBuffer = new Uint8Array(11 * 1024 * 1024) // Real 11MB payload
  const oversizedFile = new File([oversizedBuffer], 'oversized_resume.pdf', { type: 'application/pdf' })
  oversizedForm.append('file', oversizedFile)
  oversizedForm.append('folder', 'resumes')

  const resOversizedFile = await app.request('/api/upload', {
    method: 'POST',
    body: oversizedForm,
  }, env)
  assert(resOversizedFile.status === 400, 'Upload exceeding 10MB is rejected with 400 Bad Request')
  const oversizedJson = await resOversizedFile.json() as any
  assert(oversizedJson.error?.includes('10MB'), 'Error message specifies 10MB limit')

  // Test 51: Upload empty file (0 bytes) is rejected with 400 Bad Request
  const emptyForm = new FormData()
  const emptyFile = new File([], 'empty.pdf', { type: 'application/pdf' })
  emptyForm.append('file', emptyFile)
  emptyForm.append('folder', 'resumes')

  const resEmpty = await app.request('/api/upload', {
    method: 'POST',
    body: emptyForm,
  }, env)
  assert(resEmpty.status === 400, 'Upload with empty file (0 bytes) is rejected with 400 Bad Request')

  // Test 52: Dangerous executable file is rejected with 400 Bad Request
  const dangerForm = new FormData()
  const dangerFile = new File(['payload'], 'trojan.exe', { type: 'application/x-msdownload' })
  dangerForm.append('file', dangerFile)
  dangerForm.append('folder', 'resumes')

  const resDanger = await app.request('/api/upload', {
    method: 'POST',
    body: dangerForm,
  }, env)
  assert(resDanger.status === 400, 'Dangerous executable file is rejected with 400 Bad Request')

  // Test 53: Invalid resume format (e.g. .mp3 in resumes folder) is rejected with 400 Bad Request
  const invalidExtForm = new FormData()
  const invalidExtFile = new File(['audio content'], 'audio.mp3', { type: 'audio/mpeg' })
  invalidExtForm.append('file', invalidExtFile)
  invalidExtForm.append('folder', 'resumes')

  const resInvalidExt = await app.request('/api/upload', {
    method: 'POST',
    body: invalidExtForm,
  }, env)
  assert(resInvalidExt.status === 400, 'Invalid resume format (.mp3) is rejected with 400 Bad Request')

  // Test 54: Valid resume (< 10MB, PDF) is uploaded successfully with 200 OK
  const validResumeForm = new FormData()
  const validResumeFile = new File(['%PDF-1.4 Valid candidate resume document'], 'karthik_resume.pdf', { type: 'application/pdf' })
  validResumeForm.append('file', validResumeFile)
  validResumeForm.append('folder', 'resumes')

  const resValidResume = await app.request('/api/upload', {
    method: 'POST',
    body: validResumeForm,
  }, env)
  assert(resValidResume.status === 200, 'Valid resume (< 10MB, PDF) uploads successfully with 200 OK')
  const validResumeJson = await resValidResume.json() as any
  assert(validResumeJson.success === true && validResumeJson.url.includes('/api/media/resumes/'), 'Valid resume returns Cloudflare R2 URL')

  // Test 55: Valid image media (< 10MB, PNG) is uploaded successfully with 200 OK
  const validLogoForm = new FormData()
  const validLogoFile = new File(['fake-png-binary-stream'], 'company_logo.png', { type: 'image/png' })
  validLogoForm.append('file', validLogoFile)
  validLogoForm.append('folder', 'jobs')

  const resValidLogo = await app.request('/api/upload', {
    method: 'POST',
    body: validLogoForm,
  }, env)
  assert(resValidLogo.status === 200, 'Valid image media (< 10MB, PNG) uploads successfully with 200 OK')

  // Test 56: Job application fails when candidate name is missing or too short
  const resBadName = await app.request('/api/jobs/job_react_101/apply', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${empToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      candidate_name: 'A',
      candidate_email: 'candidate2@candidate.com',
      resume_url: validResumeJson.url,
    }),
  }, env)
  assert(resBadName.status === 400, 'Job application with short candidate name rejected with 400')

  // Test 57: Job application fails when email format is invalid
  const resBadEmail = await app.request('/api/jobs/job_react_101/apply', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${empToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      candidate_name: 'Candidate Test',
      candidate_email: 'not-an-email',
      resume_url: validResumeJson.url,
    }),
  }, env)
  assert(resBadEmail.status === 400, 'Job application with invalid email rejected with 400')

  // Test 58: Job application fails when resume_url is missing
  const resBadResume = await app.request('/api/jobs/job_react_101/apply', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${empToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      candidate_name: 'Candidate Test',
      candidate_email: 'candidate2@candidate.com',
      resume_url: '',
    }),
  }, env)
  assert(resBadResume.status === 400, 'Job application with missing resume URL rejected with 400')

  // --------------------------------------------------------------------------
  console.log(`\n${colors.bold}${colors.cyan}================================================================${colors.reset}`)
  console.log(`${colors.bold}SUMMARY: Total Tests: ${passed + failed} | ${colors.green}Passed: ${passed}${colors.reset} | ${failed > 0 ? colors.red : colors.green}Failed: ${failed}${colors.reset}`)
  console.log(`${colors.bold}${colors.cyan}================================================================${colors.reset}\n`)

  if (failed > 0) {
    process.exit(1)
  }
}

runTestSuite().catch((err) => {
  console.error('Test runner fatal error:', err)
  process.exit(1)
})
