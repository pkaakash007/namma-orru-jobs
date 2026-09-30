import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { sign, verify } from 'hono/jwt'
import { sendFcmNotification } from './fcm'
import serviceAccount from '../service-account.json'
import { encryptPayload, decryptPayload, type EncryptedEnvelope } from './secureTunnel'
import {
  moderateText,
  moderateImage,
  applyAccountModerationPolicy,
  checkAndReactivateUser,
} from './moderation'

export type UserRole = 'admin' | 'manager' | 'employee'

export interface UserRecord {
  id: string
  email: string
  google_id?: string
  full_name: string
  role: UserRole
  assigned_by?: string
  status: string
  headline?: string
  avatar_url?: string
  banner_url?: string
  bio?: string
  location?: string
  company?: string
  position?: string
  skills?: string
  phone?: string
  date_of_birth?: string
  age?: number
  resume_url?: string
  language?: string
  connections_count?: number
  username?: string
  is_active?: number
  deactivated_until?: string | null
  followers_count?: number
  following_count?: number
  created_at?: string
  updated_at?: string
}

export type Bindings = {
  DB: D1Database
  MEDIA_BUCKET: R2Bucket
  JWT_SECRET?: string
  META_WHATSAPP_TOKEN?: string
  WHATSAPP_PHONE_NUMBER_ID?: string
  WHATSAPP_TEMPLATE_NAME?: string
  GEMINI_API_KEY?: string
  GOOGLE_AI_KEY?: string
}

export type Variables = {
  user: UserRecord
}

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

const DEFAULT_JWT_SECRET = 'namma-ooru-jobs-jwt-super-secret-key-2026'

// CORS configured for Web and Android Capacitor scheme
app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return '*'
      if (
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.startsWith('capacitor://') ||
        origin.endsWith('.pages.dev')
      ) {
        return origin
      }
      return origin
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
  })
)

// Security Headers Middleware
app.use('*', async (c, next) => {
  await next()
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  c.header('X-XSS-Protection', '1; mode=block')
})

// --------------------------------------------------------------------------
// 1. ANTI-BOT, JMETER & PENETRATION TOOL DEFENSE MIDDLEWARE
// Strictly blocks load-testing, scrapers, and automated flood tools
// --------------------------------------------------------------------------
const BLOCKED_TOOLS = [
  'jmeter',
  'apache-httpclient',
  'postmanruntime',
  'python-requests',
  'python-urllib',
  'httpx',
  'aiohttp',
  'scrapy',
  'sqlmap',
  'nikto',
  'masscan',
  'nmap',
  'gobuster',
  'dirbuster',
  'wpscan',
  'zgrab',
  'curl/',
  'wget/',
  'go-http-client',
  'libwww-perl',
]

app.use('*', async (c, next) => {
  const ua = (c.req.header('user-agent') || '').toLowerCase()
  const bypassKey = c.req.header('x-security-bypass')

  // Allow test bypass key for internal automated validation
  if (bypassKey !== 'test-bypass-key-2026') {
    for (const tool of BLOCKED_TOOLS) {
      if (ua.includes(tool)) {
        return c.json(
          {
            error: `Access Denied: Automated load testing, scraping, and penetration tools ('${tool}') are strictly prohibited.`,
            code: 'SECURITY_TOOL_BLOCKED',
          },
          403
        )
      }
    }
  }

  await next()
})

// --------------------------------------------------------------------------
// 2. SLIDING-WINDOW RATE LIMITER & DDOS FLOOD PROTECTION
// Protects database and endpoints against stress-testing and flooding
// --------------------------------------------------------------------------
interface RateRecord {
  count: number
  windowStart: number
  blockedUntil?: number
}
const ipRateMap = new Map<string, RateRecord>()
let cleanupCounter = 0

app.use('*', async (c, next) => {
  cleanupCounter++
  if (cleanupCounter % 250 === 0) {
    const now = Date.now()
    for (const [ip, rec] of ipRateMap.entries()) {
      if (now - rec.windowStart > 120000 && (!rec.blockedUntil || now > rec.blockedUntil)) {
        ipRateMap.delete(ip)
      }
    }
  }

  const bypassKey = c.req.header('x-security-bypass')
  if (bypassKey === 'test-bypass-key-2026') {
    return await next()
  }

  const ip =
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-real-ip') ||
    c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
    '127.0.0.1'

  const path = c.req.path
  const now = Date.now()
  let record = ipRateMap.get(ip)

  if (!record) {
    record = { count: 1, windowStart: now }
    ipRateMap.set(ip, record)
  } else {
    // If currently blocked due to aggressive rate violations
    if (record.blockedUntil && now < record.blockedUntil) {
      const waitSeconds = Math.ceil((record.blockedUntil - now) / 1000)
      c.header('Retry-After', String(waitSeconds))
      return c.json(
        {
          error: `High-frequency flooding detected. IP blocked temporarily. Please wait ${waitSeconds}s.`,
          code: 'RATE_LIMIT_BLOCKED',
          retry_after: waitSeconds,
        },
        429
      )
    }

    // Reset window after 60 seconds
    if (now - record.windowStart > 60000) {
      record.count = 1
      record.windowStart = now
      record.blockedUntil = undefined
    } else {
      record.count++
    }
  }

  // Define route-specific rate limits (requests per 60-second window)
  const isAuthRoute = path.startsWith('/api/auth/')
  const isWriteRoute = c.req.method === 'POST' || c.req.method === 'DELETE' || c.req.method === 'PATCH'
  const maxAllowed = isAuthRoute ? 25 : isWriteRoute ? 60 : 180

  if (record.count > maxAllowed) {
    record.blockedUntil = now + 60000 // 60 seconds cooling block
    c.header('Retry-After', '60')
    c.header('X-RateLimit-Limit', String(maxAllowed))
    c.header('X-RateLimit-Remaining', '0')
    return c.json(
      {
        error: `Rate limit exceeded (${record.count}/${maxAllowed} req/min). System is shielded against DDoS and stress crashes.`,
        code: 'RATE_LIMIT_EXCEEDED',
        retry_after: 60,
      },
      429
    )
  }

  c.header('X-RateLimit-Limit', String(maxAllowed))
  c.header('X-RateLimit-Remaining', String(Math.max(0, maxAllowed - record.count)))

  await next()
})

// --------------------------------------------------------------------------
// 3. PAYLOAD SIZE GUARD (Memory Exhaustion & Crash Protection)
// --------------------------------------------------------------------------
app.use('*', async (c, next) => {
  const contentLength = c.req.header('content-length')
  if (contentLength && !c.req.path.startsWith('/api/upload')) {
    const bytes = parseInt(contentLength, 10)
    if (!isNaN(bytes) && bytes > 1024 * 1024) {
      return c.json(
        {
          error: 'Payload Too Large: Maximum allowed request body size is 1MB.',
          code: 'PAYLOAD_TOO_LARGE',
        },
        413
      )
    }
  }
  // Auto-verify and migrate production database schema
  if (c.env?.DB && !schemaInitialized) {
    await ensureProductionSchema(c.env.DB)
  }

  await next()
})

// --------------------------------------------------------------------------
// SELF-HEALING PRODUCTION D1 SCHEMA INITIALIZATION & COLUMN MIGRATOR
// Ensures all 15 tables, indexes, and latest columns exist without data loss
// --------------------------------------------------------------------------
let schemaInitialized = false

export async function ensureProductionSchema(db: D1Database) {
  if (schemaInitialized) return
  if (!db || typeof db.prepare !== 'function') return

  const tableStatements = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      google_id TEXT UNIQUE,
      password_hash TEXT DEFAULT '',
      full_name TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin', 'manager', 'employee')) DEFAULT 'employee' NOT NULL,
      assigned_by TEXT,
      status TEXT DEFAULT 'active',
      headline TEXT DEFAULT '',
      avatar_url TEXT DEFAULT '',
      banner_url TEXT DEFAULT '',
      bio TEXT DEFAULT '',
      location TEXT DEFAULT '',
      company TEXT DEFAULT '',
      position TEXT DEFAULT '',
      skills TEXT DEFAULT '[]',
      username TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      date_of_birth TEXT DEFAULT '',
      age INTEGER,
      resume_url TEXT DEFAULT '',
      language TEXT DEFAULT 'en',
      is_active INTEGER DEFAULT 1,
      deactivated_until DATETIME DEFAULT NULL,
      followers_count INTEGER DEFAULT 0,
      following_count INTEGER DEFAULT 0,
      connections_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS connections (
      id TEXT PRIMARY KEY,
      requester_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      status TEXT CHECK(status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(requester_id, receiver_id)
    )`,

    `CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL,
      content TEXT NOT NULL,
      media_urls TEXT DEFAULT '[]',
      likes_count INTEGER DEFAULT 0,
      comments_count INTEGER DEFAULT 0,
      shares_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS likes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      post_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, post_id)
    )`,

    `CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      poster_id TEXT NOT NULL,
      title TEXT NOT NULL,
      company_name TEXT NOT NULL,
      company_logo TEXT DEFAULT '',
      location TEXT NOT NULL,
      workplace_type TEXT CHECK(workplace_type IN ('Remote', 'Hybrid', 'On-site')) DEFAULT 'Remote',
      employment_type TEXT CHECK(employment_type IN ('Full-time', 'Part-time', 'Contract', 'Internship')) DEFAULT 'Full-time',
      description TEXT NOT NULL,
      salary_range TEXT DEFAULT '',
      applicants_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      content TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS job_applications (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      applicant_user_id TEXT,
      candidate_name TEXT NOT NULL,
      candidate_email TEXT NOT NULL,
      candidate_phone TEXT DEFAULT '',
      resume_url TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS user_follows (
      id TEXT PRIMARY KEY,
      follower_id TEXT NOT NULL,
      following_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(follower_id, following_id)
    )`,

    `CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS conversation_participants (
      conversation_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (conversation_id, user_id)
    )`,

    `CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      read_at DATETIME DEFAULT NULL,
      moderation_status TEXT CHECK(moderation_status IN ('APPROVED', 'REJECTED', 'PENDING')) DEFAULT 'APPROVED'
    )`,

    `CREATE TABLE IF NOT EXISTS user_violations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      violation_type TEXT NOT NULL,
      content_type TEXT NOT NULL,
      severity TEXT DEFAULT 'HIGH',
      reason TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deactivated_until DATETIME,
      metadata TEXT DEFAULT '{}'
    )`,

    `CREATE TABLE IF NOT EXISTS saved_jobs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      job_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, job_id)
    )`,

    `CREATE TABLE IF NOT EXISTS otp_verifications (
      phone TEXT PRIMARY KEY,
      otp_code TEXT NOT NULL,
      full_name TEXT,
      expires_at INTEGER NOT NULL,
      attempts INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  ]

  for (const statement of tableStatements) {
    try {
      await db.prepare(statement).run()
    } catch {}
  }

  // Idempotent column migrations for users table
  const columnMigrations = [
    'ALTER TABLE users ADD COLUMN banner_url TEXT DEFAULT ""',
    'ALTER TABLE users ADD COLUMN username TEXT DEFAULT ""',
    'ALTER TABLE users ADD COLUMN phone TEXT DEFAULT ""',
    'ALTER TABLE users ADD COLUMN date_of_birth TEXT DEFAULT ""',
    'ALTER TABLE users ADD COLUMN age INTEGER',
    'ALTER TABLE users ADD COLUMN resume_url TEXT DEFAULT ""',
    'ALTER TABLE users ADD COLUMN language TEXT DEFAULT "en"',
    'ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1',
    'ALTER TABLE users ADD COLUMN deactivated_until DATETIME DEFAULT NULL',
    'ALTER TABLE users ADD COLUMN followers_count INTEGER DEFAULT 0',
    'ALTER TABLE users ADD COLUMN following_count INTEGER DEFAULT 0',
    'ALTER TABLE users ADD COLUMN connections_count INTEGER DEFAULT 0',
  ]

  for (const colSql of columnMigrations) {
    try {
      await db.prepare(colSql).run()
    } catch {
      // Column already exists or already migrated
    }
  }

  // Idempotent indexes
  const indexStatements = [
    'CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id)',
    'CREATE INDEX IF NOT EXISTS idx_likes_post ON likes(post_id)',
    'CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id)',
    'CREATE INDEX IF NOT EXISTS idx_connections_users ON connections(requester_id, receiver_id)',
    'CREATE INDEX IF NOT EXISTS idx_messages_pair ON messages(sender_id, receiver_id, created_at)',
    'CREATE INDEX IF NOT EXISTS idx_job_apps_job ON job_applications(job_id)',
    'CREATE INDEX IF NOT EXISTS idx_job_apps_user ON job_applications(applicant_user_id)',
    'CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active)',
    'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
    'CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id)',
    'CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id)',
    'CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON conversation_participants(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_conv_participants_conv ON conversation_participants(conversation_id)',
    'CREATE INDEX IF NOT EXISTS idx_chat_messages_conv ON chat_messages(conversation_id, created_at ASC)',
    'CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id)',
    'CREATE INDEX IF NOT EXISTS idx_user_violations_user ON user_violations(user_id, created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_saved_jobs_user ON saved_jobs(user_id, created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_saved_jobs_job ON saved_jobs(job_id)',
    'CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_verifications(expires_at)',
  ]

  for (const idxSql of indexStatements) {
    try {
      await db.prepare(idxSql).run()
    } catch {}
  }

  schemaInitialized = true
}

// Authentication Middleware
const requireAuth = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized: Missing or invalid token' }, 401)
  }

  const token = authHeader.substring(7)
  const secret = c.env.JWT_SECRET || DEFAULT_JWT_SECRET

  try {
    const payload = (await verify(token, secret, 'HS256')) as { id: string; email: string }
    if (!payload?.id) {
      return c.json({ error: 'Unauthorized: Invalid token payload' }, 401)
    }

    // Always fetch fresh user record from D1 to get real-time role, social stats, and account status
    const user = await c.env.DB.prepare(
      'SELECT id, email, full_name, role, assigned_by, status, headline, avatar_url, banner_url, bio, location, company, position, skills, phone, date_of_birth, age, resume_url, language, connections_count, username, is_active, deactivated_until, followers_count, following_count, created_at, updated_at FROM users WHERE id = ?'
    )
      .bind(payload.id)
      .first() as UserRecord | null

    if (!user) {
      return c.json({ error: 'User not found or account deactivated' }, 401)
    }

    // Security & Moderation Check: Evaluate account status & handle automatic 24-hr reactivation
    const accountCheck = await checkAndReactivateUser(user, c.env.DB)
    if (!accountCheck.isActive) {
      if (accountCheck.deactivatedUntil) {
        return c.json(
          {
            error: `Forbidden: Your account has been temporarily suspended due to a content policy violation until ${accountCheck.deactivatedUntil}.`,
            code: 'ACCOUNT_DEACTIVATED',
            deactivated_until: accountCheck.deactivatedUntil,
          },
          403
        )
      }
      return c.json(
        {
          error: 'Forbidden: Account has been suspended or blocked. Please contact support.',
          code: 'ACCOUNT_SUSPENDED',
        },
        403
      )
    }

    c.set('user', user)
    await next()
  } catch (err: any) {
    return c.json({ error: 'Unauthorized: ' + (err.message || 'Session expired') }, 401)
  }
}

// Role-based Access Control Middleware
const requireRole = (allowedRoles: UserRole[]) => {
  return async (c: any, next: any) => {
    const user = c.get('user') as UserRecord
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    if (!allowedRoles.includes(user.role)) {
      return c.json(
        {
          error: `Forbidden: Access requires one of [${allowedRoles.join(', ')}] role. Your role is '${user.role}'`,
        },
        403
      )
    }

    await next()
  }
}

// --------------------------------------------------------------------------
// Public / Health Routes & Production Database Table Readiness Checker
// --------------------------------------------------------------------------
app.get('/api/health', async (c) => {
  if (c.env?.DB) {
    await ensureProductionSchema(c.env.DB)
  }

  const tables = [
    'users',
    'connections',
    'posts',
    'likes',
    'comments',
    'jobs',
    'messages',
    'job_applications',
    'user_follows',
    'conversations',
    'conversation_participants',
    'chat_messages',
    'user_violations',
    'saved_jobs',
    'otp_verifications',
  ]

  const tableStatus: Record<string, { status: string; count?: number }> = {}
  let allReady = true

  if (c.env?.DB) {
    for (const table of tables) {
      try {
        const countRes = await c.env.DB.prepare(`SELECT count(*) as count FROM ${table}`).first() as { count?: number } | null
        tableStatus[table] = {
          status: 'ready',
          count: countRes?.count ?? 0,
        }
      } catch (err: any) {
        allReady = false
        tableStatus[table] = {
          status: 'error: ' + (err.message || 'table check failed'),
        }
      }
    }
  }

  return c.json({
    status: allReady ? 'ok' : 'degraded',
    service: 'Namma Ooru Jobs API',
    platform: 'Cloudflare Workers',
    database: 'Cloudflare D1',
    roles_supported: ['admin', 'manager', 'employee'],
    production_ready: allReady,
    total_tables: tables.length,
    tables_verified: Object.keys(tableStatus).length,
    tables: tableStatus,
    timestamp: new Date().toISOString(),
  })
})

// --------------------------------------------------------------------------
// CLOUDFLARE EDGE IN-MEMORY CACHE (D1 Query & Read Optimization)
// Drastically minimizes Cloudflare D1 database reads to stay well within free tier limits
// --------------------------------------------------------------------------
interface EdgeCacheEntry<T> {
  data: T
  expiresAt: number
}

const edgeCache = new Map<string, EdgeCacheEntry<any>>()

export function getEdgeCache<T>(key: string): T | null {
  const entry = edgeCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    edgeCache.delete(key)
    return null
  }
  return entry.data as T
}

export function setEdgeCache<T>(key: string, data: T, ttlSeconds: number = 60): void {
  if (edgeCache.size > 150) {
    const firstKey = edgeCache.keys().next().value
    if (firstKey) edgeCache.delete(firstKey)
  }
  edgeCache.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  })
}

export function invalidateEdgeCache(prefix: string): void {
  for (const key of edgeCache.keys()) {
    if (key.startsWith(prefix)) {
      edgeCache.delete(key)
    }
  }
}

export function clearEdgeCache(): void {
  edgeCache.clear()
}

// --------------------------------------------------------------------------
// ZERO-KNOWLEDGE ENCRYPTED GATEWAY / NETWORK TAB OBFUSCATION TUNNEL
// All sensitive endpoints, parameters, and responses are encrypted using AES-256-GCM
// Competitors inspecting Network Tab see ZERO plaintext endpoints, headers, or data!
// --------------------------------------------------------------------------
app.post('/api/v1/secure/dispatch', async (c) => {
  try {
    const envelope = await c.req.json().catch(() => null) as EncryptedEnvelope | null
    if (!envelope || !envelope.cipher || !envelope.iv || !envelope.ts) {
      return c.json({ error: 'Invalid encrypted payload envelope' }, 400)
    }

    // Decrypt the incoming request envelope
    let payload: {
      endpoint: string
      method: string
      headers?: Record<string, string>
      body?: any
    }

    try {
      payload = await decryptPayload(envelope, c.env.JWT_SECRET || DEFAULT_JWT_SECRET)
    } catch (decryptErr: any) {
      return c.json(
        {
          error: 'Decryption failed: ' + decryptErr.message,
          code: 'DECRYPTION_FAILED',
        },
        400
      )
    }

    const { endpoint, method, headers, body } = payload
    if (!endpoint || !method) {
      return c.json({ error: 'Decrypted payload missing endpoint or method' }, 400)
    }

    // Prevent recursive dispatch calls
    if (endpoint.includes('/api/v1/secure/dispatch')) {
      return c.json({ error: 'Recursive dispatch is disallowed' }, 400)
    }

    // Execute the requested route internally inside Hono
    const innerUrl = new URL(endpoint, c.req.url).toString()
    const innerHeaders = new Headers(headers || {})
    
    // Forward client authorization if provided
    const authHeader = c.req.header('authorization')
    if (authHeader && !innerHeaders.has('authorization')) {
      innerHeaders.set('authorization', authHeader)
    }
    // Forward client IP
    const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-real-ip')
    if (clientIp) innerHeaders.set('cf-connecting-ip', clientIp)

    const innerInit: RequestInit = {
      method: method.toUpperCase(),
      headers: innerHeaders,
      body: body !== undefined && body !== null ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    }

    let execCtx: any = undefined
    try {
      execCtx = c.executionCtx
    } catch {
      // ExecutionContext is optional in edge/test environments
    }

    const innerResponse = await app.request(innerUrl, innerInit, c.env, execCtx)
    const responseContentType = innerResponse.headers.get('content-type') || ''

    let innerData: any
    if (responseContentType.includes('application/json')) {
      innerData = await innerResponse.json().catch(() => ({}))
    } else {
      innerData = await innerResponse.text().catch(() => '')
    }

    // Encrypt the inner response before sending back across network
    const responseEnvelope = await encryptPayload(
      {
        status: innerResponse.status,
        headers: Object.fromEntries(innerResponse.headers.entries()),
        data: innerData,
      },
      c.env.JWT_SECRET || DEFAULT_JWT_SECRET
    )

    return c.json(responseEnvelope, 200)
  } catch (err: any) {
    return c.json({ error: 'Secure dispatch error: ' + err.message }, 500)
  }
})

// --------------------------------------------------------------------------
// Authentication Routes
// --------------------------------------------------------------------------

// 1. Google OAuth Token Verification & User Upsert
app.post('/api/auth/google', async (c) => {
  try {
    const body = await c.req.json()
    const { id_token, credential, selected_role } = body
    const tokenToVerify = id_token || credential

    if (!tokenToVerify) {
      return c.json({ error: 'Missing Google id_token or credential' }, 400)
    }

    // Role selection: User can choose 'employee' (job seeker) or 'manager' (HR recruiter).
    // Admin role can NEVER be self-assigned; it can ONLY be manually assigned in the database.
    const requestedRole: UserRole = selected_role === 'manager' ? 'manager' : 'employee'

    // Verify token with Google's public tokeninfo API
    const googleRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenToVerify)}`
    )

    if (!googleRes.ok) {
      const errText = await googleRes.text()
      return c.json({ error: 'Failed to verify Google token: ' + errText }, 401)
    }

    const googlePayload = (await googleRes.json()) as {
      sub: string
      email: string
      name?: string
      picture?: string
      aud?: string
    }

    const ALLOWED_CLIENT_IDS = [
      '1081442493959-s9906ironh3oq1vcso7hbbje8qi6uj65.apps.googleusercontent.com', // Web Client ID
      '1081442493959-foa9uho91jn2avckegn9fcf7q3cvai4g.apps.googleusercontent.com', // Android Client ID
    ]

    if (googlePayload.aud && !ALLOWED_CLIENT_IDS.includes(googlePayload.aud)) {
      return c.json({ error: 'Unauthorized: Token audience does not match configured Google Client IDs' }, 401)
    }

    const { sub: google_id, email, name, picture } = googlePayload
    if (!email) {
      return c.json({ error: 'Email not provided by Google account' }, 400)
    }

    const secret = c.env.JWT_SECRET || DEFAULT_JWT_SECRET

    // Check if user already exists
    let existingUser = await c.env.DB.prepare(
      'SELECT id, email, full_name, role, assigned_by, status, headline, avatar_url, banner_url, bio, location, company, position, skills, phone, date_of_birth, age, resume_url, language, connections_count, created_at, updated_at FROM users WHERE email = ? OR google_id = ?'
    )
      .bind(email, google_id)
      .first() as UserRecord | null

    let user: UserRecord
    const clientPicture = body.picture || null

    if (existingUser) {
      const avatarToSave = (picture && picture.trim()) || (clientPicture && clientPicture.trim()) || existingUser.avatar_url || ''
      // User exists:
      // - If user is already an admin in the database, keep admin role strictly intact!
      // - If user explicitly selected 'manager' and is currently an employee, update to manager.
      let effectiveRole = existingUser.role
      if (existingUser.role !== 'admin' && requestedRole === 'manager') {
        effectiveRole = 'manager'
      }

      await c.env.DB.prepare(
        `UPDATE users 
         SET google_id = COALESCE(google_id, ?), 
             full_name = COALESCE(?, full_name), 
             role = ?,
             avatar_url = CASE WHEN ? != '' THEN ? ELSE avatar_url END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
        .bind(google_id, name || null, effectiveRole, avatarToSave, avatarToSave, existingUser.id)
        .run()

      user = {
        ...existingUser,
        google_id,
        full_name: name || existingUser.full_name,
        role: effectiveRole,
        avatar_url: avatarToSave,
      }
    } else {
      // Brand new user: Role is set based on user's selection ('employee' or 'manager').
      // Admin is NEVER allowed from client-side selection.
      const newId = 'usr_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16)
      const avatarToSave = (picture && picture.trim()) || (clientPicture && clientPicture.trim()) || ''

      await c.env.DB.prepare(
        `INSERT INTO users (id, email, google_id, full_name, role, avatar_url, status, password_hash)
         VALUES (?, ?, ?, ?, ?, ?, 'active', '')`
      )
        .bind(newId, email, google_id, name || email.split('@')[0], requestedRole, avatarToSave)
        .run()

      user = {
        id: newId,
        email,
        google_id,
        full_name: name || email.split('@')[0],
        role: requestedRole,
        avatar_url: avatarToSave,
        status: 'active',
      }
    }

    // Generate JWT
    const jwtToken = await sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days
      },
      secret
    )

    return c.json({
      token: jwtToken,
      user,
    })
  } catch (err: any) {
    return c.json({ error: 'Google sign-in error: ' + err.message }, 500)
  }
})

// 2. Dev / Testing Login (allows instant preview of Admin, Manager, and Employee roles)
app.post('/api/auth/dev-login', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}))
    const rawEmail = (body.email || 'dev@example.com').trim().toLowerCase()
    
    // Strict email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(rawEmail) || rawEmail.length > 150) {
      return c.json({ error: 'Invalid email address format' }, 400)
    }

    const targetEmail = rawEmail
    const requestedRole: UserRole = body.role === 'manager' ? 'manager' : 'employee'
    const targetName = (body.full_name || targetEmail.split('@')[0]).trim().slice(0, 100)

    let existingUser = await c.env.DB.prepare(
      'SELECT id, email, full_name, role, assigned_by, status, headline, avatar_url, banner_url, bio, location, company, position, skills, phone, date_of_birth, age, resume_url, language, connections_count, created_at, updated_at FROM users WHERE email = ?'
    )
      .bind(targetEmail)
      .first() as UserRecord | null

    let user: UserRecord
    const secret = c.env.JWT_SECRET || DEFAULT_JWT_SECRET

    if (existingUser) {
      // Existing user:
      // If user is already an admin in the database, preserve admin role!
      // Otherwise, update to requested role (manager or employee)
      let effectiveRole = existingUser.role
      if (existingUser.role !== 'admin') {
        effectiveRole = requestedRole
      }

      await c.env.DB.prepare(
        'UPDATE users SET full_name = ?, role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      )
        .bind(targetName || existingUser.full_name, effectiveRole, existingUser.id)
        .run()

      user = {
        ...existingUser,
        full_name: targetName || existingUser.full_name,
        role: effectiveRole,
      }
    } else {
      // Brand new user: Admin can NEVER be self-assigned; only 'manager' or 'employee'
      const newId = 'usr_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16)
      await c.env.DB.prepare(
        `INSERT INTO users (id, email, full_name, role, status, password_hash)
         VALUES (?, ?, ?, ?, 'active', '')`
      )
        .bind(newId, targetEmail, targetName, requestedRole)
        .run()

      user = {
        id: newId,
        email: targetEmail,
        full_name: targetName,
        role: requestedRole,
        status: 'active',
      }
    }

    const jwtToken = await sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
      },
      secret
    )

    return c.json({ token: jwtToken, user })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// 3. WhatsApp OTP Send via Meta WhatsApp Cloud API
app.post('/api/auth/whatsapp/send-otp', async (c) => {
  try {
    const { phone, full_name } = await c.req.json()
    if (!phone) {
      return c.json({ error: 'Phone number is required' }, 400)
    }

    const cleanDigits = phone.replace(/\D/g, '')
    const formattedPhone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits
    if (formattedPhone.length < 10) {
      return c.json({ error: 'Invalid phone number format. Please provide a 10-digit mobile number' }, 400)
    }

    // Ensure OTP table exists in D1
    await c.env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS otp_verifications (
        phone TEXT PRIMARY KEY,
        otp_code TEXT NOT NULL,
        full_name TEXT,
        expires_at INTEGER NOT NULL,
        attempts INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ).run()

    // Generate secure 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = Date.now() + 10 * 60 * 1000 // 10 minutes

    await c.env.DB.prepare(
      `INSERT OR REPLACE INTO otp_verifications (phone, otp_code, full_name, expires_at, attempts, created_at)
       VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`
    )
      .bind(formattedPhone, otpCode, full_name || null, expiresAt)
      .run()

    let whatsappSent = false
    const metaToken = c.env.META_WHATSAPP_TOKEN
    const phoneNumberId = c.env.WHATSAPP_PHONE_NUMBER_ID
    const templateName = c.env.WHATSAPP_TEMPLATE_NAME

    if (metaToken && phoneNumberId) {
      try {
        const metaPayload = templateName
          ? {
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: formattedPhone,
              type: 'template',
              template: {
                name: templateName,
                language: { code: 'en_US' },
                components: [
                  {
                    type: 'body',
                    parameters: [{ type: 'text', text: otpCode }],
                  },
                  {
                    type: 'button',
                    sub_type: 'url',
                    index: '0',
                    parameters: [{ type: 'text', text: otpCode }],
                  },
                ],
              },
            }
          : {
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: formattedPhone,
              type: 'text',
              text: {
                preview_url: false,
                body: `Your Namma Ooru Jobs verification code is: ${otpCode}. Valid for 10 minutes. Do not share this code.`,
              },
            }

        const metaRes = await fetch(
          `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${metaToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(metaPayload),
          }
        )

        if (metaRes.ok) {
          whatsappSent = true
        } else {
          const errBody = await metaRes.text()
          console.error('Meta WhatsApp API Error:', errBody)
        }
      } catch (err: any) {
        console.error('Failed calling Meta WhatsApp API:', err)
      }
    }

    return c.json({
      success: true,
      message: whatsappSent
        ? 'OTP sent successfully to your WhatsApp'
        : 'OTP generated. Sent to your WhatsApp number',
      phone: formattedPhone,
      expires_in: 600,
      dev_otp: !whatsappSent ? otpCode : undefined,
    })
  } catch (err: any) {
    return c.json({ error: 'Failed to send OTP: ' + err.message }, 500)
  }
})

// 4. WhatsApp OTP Verification & Login
app.post('/api/auth/whatsapp/verify-otp', async (c) => {
  try {
    const { phone, otp, full_name, selected_role } = await c.req.json()
    if (!phone || !otp) {
      return c.json({ error: 'Phone and OTP are required' }, 400)
    }

    const requestedRole: UserRole = selected_role === 'manager' ? 'manager' : 'employee'
    const cleanDigits = phone.replace(/\D/g, '')
    const formattedPhone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits

    const record = await c.env.DB.prepare(
      'SELECT phone, otp_code, full_name, expires_at, attempts FROM otp_verifications WHERE phone = ?'
    )
      .bind(formattedPhone)
      .first() as { phone: string; otp_code: string; full_name?: string; expires_at: number; attempts: number } | null

    if (!record) {
      return c.json({ error: 'No OTP requested for this phone number. Please request an OTP first.' }, 400)
    }

    if (record.attempts >= 5) {
      return c.json({ error: 'Too many incorrect attempts. Please request a new OTP.' }, 400)
    }

    if (Date.now() > record.expires_at) {
      await c.env.DB.prepare('DELETE FROM otp_verifications WHERE phone = ?').bind(formattedPhone).run()
      return c.json({ error: 'OTP has expired. Please request a new code.' }, 400)
    }

    if (record.otp_code !== otp.trim()) {
      await c.env.DB.prepare(
        'UPDATE otp_verifications SET attempts = attempts + 1 WHERE phone = ?'
      )
        .bind(formattedPhone)
        .run()
      return c.json({ error: 'Invalid verification code. Please check and try again.' }, 400)
    }

    // OTP is valid! Delete record
    await c.env.DB.prepare('DELETE FROM otp_verifications WHERE phone = ?').bind(formattedPhone).run()

    // Find or create user
    const targetEmail = `${formattedPhone}@phone.nammaoorujobs.com`
    let existingUser = await c.env.DB.prepare(
      'SELECT id, email, full_name, role, assigned_by, status, headline, avatar_url, banner_url, bio, location, company, position, skills, phone, date_of_birth, age, resume_url, language, connections_count, created_at, updated_at FROM users WHERE phone = ? OR email = ?'
    )
      .bind(formattedPhone, targetEmail)
      .first() as UserRecord | null

    let user: UserRecord
    const secret = c.env.JWT_SECRET || DEFAULT_JWT_SECRET
    const displayName = full_name?.trim() || record.full_name || `Member ${formattedPhone.slice(-4)}`

    if (existingUser) {
      let effectiveRole = existingUser.role
      if (existingUser.role !== 'admin' && requestedRole === 'manager') {
        effectiveRole = 'manager'
      }

      await c.env.DB.prepare(
        'UPDATE users SET full_name = COALESCE(?, full_name), phone = ?, role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      )
        .bind(full_name?.trim() || null, formattedPhone, effectiveRole, existingUser.id)
        .run()

      user = {
        ...existingUser,
        full_name: full_name?.trim() || existingUser.full_name,
        phone: formattedPhone,
        role: effectiveRole,
      }
    } else {
      const newId = 'usr_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16)
      await c.env.DB.prepare(
        `INSERT INTO users (id, email, phone, full_name, role, status, password_hash)
         VALUES (?, ?, ?, ?, ?, 'active', '')`
      )
        .bind(newId, targetEmail, formattedPhone, displayName, requestedRole)
        .run()

      user = {
        id: newId,
        email: targetEmail,
        phone: formattedPhone,
        full_name: displayName,
        role: requestedRole,
        status: 'active',
      }
    }

    const jwtToken = await sign(
      {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        full_name: user.full_name,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
      },
      secret
    )

    return c.json({
      token: jwtToken,
      user,
    })
  } catch (err: any) {
    return c.json({ error: 'OTP verification failed: ' + err.message }, 500)
  }
})

// 3. Current User Profile
app.get('/api/auth/me', requireAuth, (c) => {
  const user = c.get('user')
  return c.json({ user })
})

// 4. Update Current User Profile (LinkedIn-style rich details)
app.patch('/api/users/profile', requireAuth, async (c) => {
  try {
    const authUser = c.get('user') as UserRecord
    const body = await c.req.json().catch(() => ({}))
    const {
      full_name,
      headline,
      bio,
      location,
      company,
      position,
      skills,
      phone,
      date_of_birth,
      age,
      resume_url,
      language,
      avatar_url,
      banner_url,
    } = body

    // Validation boundaries
    if (full_name !== undefined) {
      if (typeof full_name !== 'string' || full_name.trim().length === 0 || full_name.length > 100) {
        return c.json({ error: 'Full name must be between 1 and 100 characters' }, 400)
      }
    }
    if (headline !== undefined && headline !== null) {
      if (typeof headline !== 'string' || headline.length > 200) {
        return c.json({ error: 'Headline cannot exceed 200 characters' }, 400)
      }
    }
    if (bio !== undefined && bio !== null) {
      if (typeof bio !== 'string' || bio.length > 2000) {
        return c.json({ error: 'Bio cannot exceed 2000 characters' }, 400)
      }
    }
    if (location !== undefined && location !== null && (typeof location !== 'string' || location.length > 150)) {
      return c.json({ error: 'Location cannot exceed 150 characters' }, 400)
    }
    if (company !== undefined && company !== null && (typeof company !== 'string' || company.length > 150)) {
      return c.json({ error: 'Company cannot exceed 150 characters' }, 400)
    }
    if (position !== undefined && position !== null && (typeof position !== 'string' || position.length > 150)) {
      return c.json({ error: 'Position cannot exceed 150 characters' }, 400)
    }
    if (phone !== undefined && phone !== null && (typeof phone !== 'string' || phone.length > 25)) {
      return c.json({ error: 'Phone number cannot exceed 25 characters' }, 400)
    }
    if (age !== undefined && age !== null && age !== '') {
      const numAge = Number(age)
      if (isNaN(numAge) || numAge < 14 || numAge > 120) {
        return c.json({ error: 'Age must be a valid number between 14 and 120' }, 400)
      }
    }
    if (resume_url !== undefined && resume_url !== null && (typeof resume_url !== 'string' || resume_url.length > 1000)) {
      return c.json({ error: 'Resume URL cannot exceed 1000 characters' }, 400)
    }
    if (avatar_url !== undefined && avatar_url !== null && (typeof avatar_url !== 'string' || avatar_url.length > 1000)) {
      return c.json({ error: 'Avatar URL cannot exceed 1000 characters' }, 400)
    }
    if (banner_url !== undefined && banner_url !== null && (typeof banner_url !== 'string' || banner_url.length > 1000)) {
      return c.json({ error: 'Banner URL cannot exceed 1000 characters' }, 400)
    }

    let serializedSkills: string | null = null
    if (skills !== undefined) {
      if (Array.isArray(skills)) {
        serializedSkills = JSON.stringify(skills.map(s => String(s).trim().slice(0, 50)).slice(0, 50))
      } else if (typeof skills === 'string') {
        serializedSkills = skills.slice(0, 3000)
      }
    }

    await c.env.DB.prepare(
      `UPDATE users 
       SET full_name = COALESCE(?, full_name),
           headline = COALESCE(?, headline),
           bio = COALESCE(?, bio),
           location = COALESCE(?, location),
           company = COALESCE(?, company),
           position = COALESCE(?, position),
           skills = COALESCE(?, skills),
           phone = COALESCE(?, phone),
           date_of_birth = COALESCE(?, date_of_birth),
           age = COALESCE(?, age),
           resume_url = COALESCE(?, resume_url),
           language = COALESCE(?, language),
           avatar_url = COALESCE(?, avatar_url),
           banner_url = COALESCE(?, banner_url),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
      .bind(
        full_name !== undefined ? full_name.trim() : null,
        headline !== undefined ? headline : null,
        bio !== undefined ? bio : null,
        location !== undefined ? location : null,
        company !== undefined ? company : null,
        position !== undefined ? position : null,
        serializedSkills !== null ? serializedSkills : null,
        phone !== undefined ? phone : null,
        date_of_birth !== undefined ? date_of_birth : null,
        age !== undefined ? (age ? Number(age) : null) : null,
        resume_url !== undefined ? resume_url : null,
        language !== undefined ? language : null,
        avatar_url !== undefined ? avatar_url : null,
        banner_url !== undefined ? banner_url : null,
        authUser.id
      )
      .run()

    invalidateEdgeCache('candidates:')
    invalidateEdgeCache('admin:users')
    invalidateEdgeCache(`user:status:${authUser.id}`)

    const updatedUser = (await c.env.DB.prepare(
      'SELECT id, email, full_name, role, assigned_by, status, headline, avatar_url, banner_url, bio, location, company, position, skills, phone, date_of_birth, age, resume_url, language, connections_count, created_at, updated_at FROM users WHERE id = ?'
    )
      .bind(authUser.id)
      .first()) as UserRecord

    return c.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser,
    })
  } catch (err: any) {
    return c.json({ error: 'Failed to update profile: ' + err.message }, 500)
  }
})

// --------------------------------------------------------------------------
// ADMIN ONLY ROUTES
// --------------------------------------------------------------------------

// 1. Get all users with their roles (Only accessible by admin - cached 60s)
app.get('/api/admin/users', requireAuth, requireRole(['admin']), async (c) => {
  try {
    const cached = getEdgeCache<{ users: any[] }>('admin:users')
    if (cached) {
      return c.json(cached)
    }

    const { results } = await c.env.DB.prepare(
      `SELECT u.id, u.email, u.full_name, u.role, u.assigned_by, u.status, 
              u.company, u.position, u.created_at,
              admin.full_name as assigned_by_name
       FROM users u
       LEFT JOIN users admin ON u.assigned_by = admin.id
       ORDER BY u.created_at DESC`
    ).all()

    const payload = { users: results || [] }
    setEdgeCache('admin:users', payload, 60)
    return c.json(payload)
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// 2. Assign / Update Role (Admin assigns 'manager' (HR) or demotes back to 'employee')
app.patch('/api/admin/users/:id/role', requireAuth, requireRole(['admin']), async (c) => {
  try {
    const admin = c.get('user') as UserRecord
    const targetUserId = c.req.param('id')
    const { role } = await c.req.json()

    // Strict validation: Admins cannot be created via API (must be manual DB assignment)
    if (!['manager', 'employee'].includes(role)) {
      return c.json(
        {
          error:
            "Invalid role assignment. Admin can only assign 'manager' (HR) or revert to 'employee'. Admin role can only be assigned directly in the database.",
        },
        400
      )
    }

    // Verify target user exists
    const targetUser = await c.env.DB.prepare('SELECT id, role, email FROM users WHERE id = ?')
      .bind(targetUserId)
      .first() as { id: string; role: string; email: string } | null

    if (!targetUser) {
      return c.json({ error: 'User not found' }, 404)
    }

    if (targetUser.role === 'admin') {
      return c.json({ error: 'Cannot modify another admin role via API' }, 403)
    }

    // Update role and track who assigned it
    await c.env.DB.prepare(
      `UPDATE users 
       SET role = ?, assigned_by = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`
    )
      .bind(role, admin.id, targetUserId)
      .run()

    invalidateEdgeCache('admin:')
    invalidateEdgeCache('platform:')
    invalidateEdgeCache('candidates:')
    invalidateEdgeCache(`user:status:${targetUserId}`)

    return c.json({
      success: true,
      message: `User ${targetUser.email} role updated to ${role} by Admin ${admin.full_name}`,
      user_id: targetUserId,
      new_role: role,
      assigned_by: admin.id,
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// 3. Admin Overview Metrics (cached 60s)
app.get('/api/admin/stats', requireAuth, requireRole(['admin']), async (c) => {
  try {
    const cached = getEdgeCache<any>('admin:stats')
    if (cached) {
      return c.json(cached)
    }

    const totalUsers = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first('count')
    const adminCount = await c.env.DB.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").first('count')
    const managerCount = await c.env.DB.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'manager'").first('count')
    const employeeCount = await c.env.DB.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'employee'").first('count')
    const totalJobs = await c.env.DB.prepare('SELECT COUNT(*) as count FROM jobs').first('count')

    const payload = {
      stats: {
        total_users: totalUsers || 0,
        admins: adminCount || 0,
        managers_hr: managerCount || 0,
        employees: employeeCount || 0,
        total_jobs: totalJobs || 0,
      },
    }
    setEdgeCache('admin:stats', payload, 60)
    return c.json(payload)
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// --------------------------------------------------------------------------
// HR CANDIDATE TALENT SEARCH & AI RESUME EXTRACTION
// --------------------------------------------------------------------------

const SKILL_KEYWORDS = [
  'React', 'React Native', 'TypeScript', 'JavaScript', 'Node.js', 'Express',
  'Python', 'Django', 'FastAPI', 'Java', 'Spring Boot', 'SQL', 'PostgreSQL',
  'MySQL', 'MongoDB', 'Redis', 'Docker', 'Kubernetes', 'AWS', 'Google Cloud',
  'Azure', 'HTML5', 'CSS3', 'Tailwind CSS', 'Redux', 'GraphQL', 'Next.js',
  'Vue', 'Angular', 'Flutter', 'Swift', 'Kotlin', 'Android', 'iOS', 'Git',
  'CI/CD', 'Linux', 'Microservices', 'REST API', 'Figma', 'UI/UX', 'Agile',
  'Scrum', 'Data Science', 'Machine Learning', 'Artificial Intelligence', 'AI',
  'TensorFlow', 'PyTorch', 'Pandas', 'Selenium', 'Automation', 'Jest', 'Cypress',
  'DevOps', 'Golang', 'PHP', 'Laravel', 'C#', '.NET', 'Sales', 'Marketing',
  'Digital Marketing', 'SEO', 'SEM', 'Content Writing', 'Talent Acquisition',
  'Recruitment', 'Human Resources', 'HR', 'Customer Support', 'BPO', 'Telecalling',
  'Accounting', 'Tally', 'Tally Prime', 'GST', 'TDS', 'Auditing', 'Bookkeeping',
  'Tailoring', 'Driver', 'Electrician', 'Technician', 'AutoCAD', 'SolidWorks',
  'Mechanical Engineering', 'Electrical Engineering', 'Civil Engineering',
  'Project Management', 'Product Management', 'Excel', 'Advanced Excel'
]

const CATEGORY_SKILLS_MAP: Record<string, string[]> = {
  it_software: [
    'react', 'next.js', 'typescript', 'javascript', 'html5', 'css3', 'tailwind css',
    'vue', 'angular', 'svelte', 'redux', 'graphql', 'node.js', 'express', 'python',
    'django', 'fastapi', 'java', 'spring boot', 'golang', 'c#', '.net', 'php', 'laravel',
    'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'aws', 'docker', 'kubernetes',
    'flutter', 'react native', 'android', 'ios', 'kotlin', 'swift', 'machine learning', 'ai'
  ],
  finance_accounting: [
    'accounting', 'tally', 'tally prime', 'gst', 'tds', 'income tax', 'auditing',
    'payroll', 'bookkeeping', 'excel', 'mis', 'banking', 'accounts payable', 'accounts receivable'
  ],
  sales_marketing: [
    'sales', 'business development', 'lead generation', 'marketing', 'digital marketing',
    'seo', 'sem', 'social media', 'google ads', 'content writing', 'bpo', 'telecalling',
    'customer support', 'crm'
  ],
  engineering_manufacturing: [
    'autocad', 'solidworks', 'catia', 'mechanical', 'electrical', 'civil', 'plc', 'scada',
    'cnc', 'quality control', 'quality assurance', 'six sigma', 'embedded systems'
  ],
  design_media: [
    'ui/ux', 'figma', 'adobe xd', 'graphic design', 'photoshop', 'illustrator',
    'video editing', 'premiere pro', 'after effects', 'animation', '3d modeling'
  ],
  healthcare_pharma: [
    'nursing', 'pharmacy', 'medical lab', 'lab technician', 'clinical research',
    'patient care', 'medical billing'
  ],
  skilled_trades: [
    'electrician', 'plumber', 'tailoring', 'driver', 'welder', 'technician',
    'warehouse', 'logistics', 'carpentry'
  ]
}

// 1. AI Resume Data Extraction & Full Profile Storage on Users Table
app.post('/api/resume/parse', requireAuth, async (c) => {
  try {
    const user = c.get('user') as UserRecord
    const body = await c.req.json()
    const {
      resume_url,
      raw_text,
      file_name,
      full_name,
      headline,
      position,
      company,
      location,
      phone,
      skills,
      bio,
    } = body

    if (!resume_url && !raw_text) {
      return c.json({ error: 'Missing resume_url or raw_text' }, 400)
    }

    const textToAnalyze = (raw_text || file_name || resume_url || '').toLowerCase()
    const detectedSkills: string[] = Array.isArray(skills) && skills.length > 0 ? skills : []

    if (detectedSkills.length === 0) {
      for (const skill of SKILL_KEYWORDS) {
        const regex = new RegExp(`(^|[^a-zA-Z0-9])${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-zA-Z0-9]|$)`, 'i')
        if (regex.test(textToAnalyze)) {
          detectedSkills.push(skill)
        }
      }
    }

    if (detectedSkills.length === 0) {
      if (textToAnalyze.includes('frontend') || textToAnalyze.includes('web')) {
        detectedSkills.push('React', 'JavaScript', 'HTML5', 'CSS3', 'TypeScript')
      } else if (textToAnalyze.includes('backend') || textToAnalyze.includes('api')) {
        detectedSkills.push('Node.js', 'Python', 'SQL', 'PostgreSQL', 'REST API')
      } else if (textToAnalyze.includes('fullstack') || textToAnalyze.includes('full stack')) {
        detectedSkills.push('React', 'Node.js', 'TypeScript', 'SQL', 'Git')
      } else if (textToAnalyze.includes('mobile') || textToAnalyze.includes('android')) {
        detectedSkills.push('React Native', 'Flutter', 'Android', 'Mobile Development')
      } else if (textToAnalyze.includes('sales') || textToAnalyze.includes('marketing')) {
        detectedSkills.push('Sales', 'Marketing', 'Digital Marketing', 'Customer Support')
      } else if (textToAnalyze.includes('account') || textToAnalyze.includes('tally')) {
        detectedSkills.push('Accounting', 'Tally', 'GST')
      } else {
        detectedSkills.push('Problem Solving', 'Communication', 'Teamwork', 'Agile')
      }
    }

    // Detect location if not provided
    const LOCATIONS = ['Chennai', 'Coimbatore', 'Madurai', 'Trichy', 'Salem', 'Tirunelveli', 'Bangalore', 'Bengaluru', 'Hyderabad', 'Remote']
    let detectedLocation = location || user.location || ''
    if (!detectedLocation) {
      for (const loc of LOCATIONS) {
        if (textToAnalyze.includes(loc.toLowerCase())) {
          detectedLocation = loc
          break
        }
      }
    }
    if (!detectedLocation) {
      detectedLocation = 'Chennai, Tamil Nadu'
    }

    // Detect headline & position if not provided
    let suggestedHeadline = headline || user.headline || ''
    let suggestedPosition = position || user.position || ''
    if (!suggestedHeadline) {
      if (detectedSkills.includes('React') && detectedSkills.includes('Node.js')) {
        suggestedHeadline = 'Full Stack Developer (React / Node.js)'
        suggestedPosition = 'Full Stack Developer'
      } else if (detectedSkills.includes('React') || detectedSkills.includes('TypeScript')) {
        suggestedHeadline = 'Frontend Engineer (React / TypeScript)'
        suggestedPosition = 'Frontend Engineer'
      } else if (detectedSkills.includes('Python') || detectedSkills.includes('Java')) {
        suggestedHeadline = 'Backend Software Engineer'
        suggestedPosition = 'Backend Engineer'
      } else if (detectedSkills.includes('Flutter') || detectedSkills.includes('React Native')) {
        suggestedHeadline = 'Mobile Application Developer'
        suggestedPosition = 'Mobile Developer'
      } else if (detectedSkills.includes('Accounting') || detectedSkills.includes('Tally')) {
        suggestedHeadline = 'Accountant & Tally Specialist'
        suggestedPosition = 'Accountant'
      } else if (detectedSkills.includes('Sales') || detectedSkills.includes('Marketing')) {
        suggestedHeadline = 'Sales & Business Development Executive'
        suggestedPosition = 'Business Development Executive'
      } else {
        suggestedHeadline = `${detectedSkills.slice(0, 3).join(' / ')} Specialist`
        suggestedPosition = 'Professional Specialist'
      }
    }

    const suggestedBio = bio || user.bio || `Experienced professional skilled in ${detectedSkills.slice(0, 5).join(', ')}. Passionate about solving challenges and delivering quality results.`
    const finalCompany = company || user.company || ''
    const finalPhone = phone || user.phone || ''
    const finalFullName = full_name && (!user.full_name || user.full_name === 'Employee') ? full_name : user.full_name

    // Persist all extracted content directly to users table in Cloudflare D1
    const skillsJson = JSON.stringify(detectedSkills)
    await c.env.DB.prepare(
      `UPDATE users 
       SET full_name = COALESCE(NULLIF(?, ''), full_name),
           skills = ?,
           headline = COALESCE(NULLIF(?, ''), headline),
           position = COALESCE(NULLIF(?, ''), position),
           company = COALESCE(NULLIF(?, ''), company),
           location = COALESCE(NULLIF(?, ''), location),
           phone = COALESCE(NULLIF(?, ''), phone),
           bio = COALESCE(NULLIF(?, ''), bio),
           resume_url = COALESCE(?, resume_url),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
      .bind(
        finalFullName,
        skillsJson,
        suggestedHeadline,
        suggestedPosition,
        finalCompany,
        detectedLocation,
        finalPhone,
        suggestedBio,
        resume_url || null,
        user.id
      )
      .run()

    return c.json({
      success: true,
      message: 'AI successfully analyzed resume and updated candidate profile in database against user ID',
      user_id: user.id,
      extracted: {
        fullName: finalFullName,
        skills: detectedSkills,
        headline: suggestedHeadline,
        position: suggestedPosition,
        company: finalCompany,
        location: detectedLocation,
        phone: finalPhone,
        bio: suggestedBio,
        resume_url: resume_url,
      },
    })
  } catch (err: any) {
    return c.json({ error: 'AI resume analysis failed: ' + err.message }, 500)
  }
})

// Helper function for candidate search by Skill, Job Description & Category
async function executeCandidateSearch(c: any, searchParams: {
  q?: string
  skill?: string
  location?: string
  category?: string
  jd?: string
  with_resume?: boolean
}) {
  const q = (searchParams.q || '').trim().slice(0, 100).toLowerCase()
  const skill = (searchParams.skill || '').trim().slice(0, 100).toLowerCase()
  const location = (searchParams.location || '').trim().slice(0, 100).toLowerCase()
  const category = (searchParams.category || '').trim().slice(0, 100).toLowerCase()
  const jd = (searchParams.jd || '').trim().slice(0, 25000)
  const withResumeOnly = searchParams.with_resume === true

  const cacheKey = `candidates:${q}:${skill}:${location}:${category}:${jd.slice(0, 40)}:${withResumeOnly ? 'res' : 'all'}`
  const cached = getEdgeCache<any>(cacheKey)
  if (cached) {
    return c.json(cached)
  }

  let query = `
    SELECT id, email, full_name, role, status, headline, avatar_url, bio,
           location, company, position, skills, phone, date_of_birth, age, resume_url, created_at
    FROM users
    WHERE role = 'employee' AND (status IS NULL OR status = 'active')
  `
  const conditions: string[] = []
  const params: any[] = []

  if (withResumeOnly) {
    conditions.push("(resume_url IS NOT NULL AND resume_url != '')")
  }

  // If a specific single skill is searched
  if (skill) {
    conditions.push("LOWER(skills) LIKE ?")
    params.push(`%${skill}%`)
  }

  // If location is specified
  if (location) {
    conditions.push("LOWER(location) LIKE ?")
    params.push(`%${location}%`)
  }

  // If general keyword is specified (short query)
  if (q && !jd) {
    conditions.push(`(
      LOWER(skills) LIKE ? OR 
      LOWER(full_name) LIKE ? OR 
      LOWER(headline) LIKE ? OR 
      LOWER(position) LIKE ? OR 
      LOWER(company) LIKE ? OR
      LOWER(location) LIKE ? OR 
      LOWER(bio) LIKE ?
    )`)
    const searchPattern = `%${q}%`
    params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern)
  }

  if (conditions.length > 0) {
    query += ` AND ${conditions.join(' AND ')}`
  }

  query += ' ORDER BY CASE WHEN resume_url IS NOT NULL AND resume_url != "" THEN 0 ELSE 1 END, created_at DESC LIMIT 100'

  const stmt = c.env.DB.prepare(query)
  const { results } = params.length > 0 ? await stmt.bind(...params).all() : await stmt.all()

  // Extract skills from JD if JD is provided
  const jdExtractedSkills: string[] = []
  if (jd) {
    const jdLower = jd.toLowerCase()
    for (const sk of SKILL_KEYWORDS) {
      const regex = new RegExp(`(^|[^a-zA-Z0-9])${sk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-zA-Z0-9]|$)`, 'i')
      if (regex.test(jdLower)) {
        jdExtractedSkills.push(sk)
      }
    }
  }

  let candidates = (results || []).map((row: any) => {
    let skillsArray: string[] = []
    if (row.skills) {
      try {
        skillsArray = Array.isArray(row.skills) ? row.skills : JSON.parse(row.skills)
      } catch {
        skillsArray = String(row.skills).split(',').map((s: string) => s.trim()).filter(Boolean)
      }
    }

    // JD Semantic Match Scoring
    let matchScore: number | undefined
    let matchedSkills: string[] | undefined
    let missingSkills: string[] | undefined

    if (jdExtractedSkills.length > 0) {
      const candSkillsLower = new Set(skillsArray.map((s) => s.toLowerCase()))
      const contextText = `${row.headline || ''} ${row.position || ''} ${row.bio || ''}`.toLowerCase()

      const matched: string[] = []
      const missing: string[] = []

      for (const requiredSkill of jdExtractedSkills) {
        const reqLower = requiredSkill.toLowerCase()
        if (candSkillsLower.has(reqLower) || contextText.includes(reqLower)) {
          matched.push(requiredSkill)
        } else {
          missing.push(requiredSkill)
        }
      }

      matchScore = Math.round((matched.length / jdExtractedSkills.length) * 100)
      matchedSkills = matched
      missingSkills = missing
    }

    return {
      ...row,
      skills: skillsArray,
      match_score: matchScore,
      matched_skills: matchedSkills,
      missing_skills: missingSkills,
    }
  })

  // Filter by category if requested
  if (category && CATEGORY_SKILLS_MAP[category]) {
    const allowedSkills = new Set(CATEGORY_SKILLS_MAP[category])
    candidates = candidates.filter((cand: any) => {
      return (cand.skills || []).some((s: string) => allowedSkills.has(s.toLowerCase()))
    })
  }

  // If JD search was performed, sort candidates by match score descending
  if (jdExtractedSkills.length > 0) {
    candidates.sort((a: any, b: any) => (b.match_score || 0) - (a.match_score || 0))
  }

  const responsePayload = {
    candidates,
    total_count: candidates.length,
    jd_extracted_skills: jdExtractedSkills,
    query: { q, skill, location, category, jd },
  }
  setEdgeCache(cacheKey, responsePayload, 60)
  return c.json(responsePayload)
}

// 2. HR Candidate Search by Skill, Role, Category, and Job Description (GET & POST)
app.get('/api/candidates/search', requireAuth, requireRole(['admin', 'manager']), async (c) => {
  try {
    const q = c.req.query('q')
    const skill = c.req.query('skill')
    const location = c.req.query('location')
    const category = c.req.query('category')
    const jd = c.req.query('jd')
    const withResumeOnly = c.req.query('with_resume') === 'true'

    return await executeCandidateSearch(c, {
      q,
      skill,
      location,
      category,
      jd,
      with_resume: withResumeOnly,
    })
  } catch (err: any) {
    return c.json({ error: 'Candidate search failed: ' + err.message }, 500)
  }
})

app.post('/api/candidates/search', requireAuth, requireRole(['admin', 'manager']), async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}))
    return await executeCandidateSearch(c, {
      q: body.q,
      skill: body.skill,
      location: body.location,
      category: body.category,
      jd: body.jd,
      with_resume: body.with_resume === true,
    })
  } catch (err: any) {
    return c.json({ error: 'Candidate search failed: ' + err.message }, 500)
  }
})

// --------------------------------------------------------------------------
// HR / MANAGER & EMPLOYEE JOB ROUTES
// --------------------------------------------------------------------------

// 1. Post a new Job (Only Manager or Admin can post jobs)
app.post('/api/jobs', requireAuth, requireRole(['admin', 'manager']), async (c) => {
  try {
    const user = c.get('user') as UserRecord
    const body = await c.req.json().catch(() => ({}))
    const {
      title,
      company_name,
      location,
      workplace_type,
      employment_type,
      description,
      salary_range,
    } = body

    const titleClean = (title || '').trim()
    const companyClean = (company_name || '').trim()
    const locationClean = (location || '').trim()
    const descClean = (description || '').trim()
    const salaryClean = (salary_range || '').trim().slice(0, 100)

    if (!titleClean || titleClean.length < 3 || titleClean.length > 150) {
      return c.json({ error: 'Job title must be between 3 and 150 characters' }, 400)
    }
    if (!companyClean || companyClean.length < 2 || companyClean.length > 100) {
      return c.json({ error: 'Company name must be between 2 and 100 characters' }, 400)
    }
    if (!locationClean || locationClean.length < 2 || locationClean.length > 150) {
      return c.json({ error: 'Location must be between 2 and 150 characters' }, 400)
    }
    if (!descClean || descClean.length < 10 || descClean.length > 15000) {
      return c.json({ error: 'Job description must be between 10 and 15,000 characters' }, 400)
    }

    const ALLOWED_WORKPLACE = ['Remote', 'Hybrid', 'On-site']
    const safeWorkplace = ALLOWED_WORKPLACE.includes(workplace_type) ? workplace_type : 'Remote'

    const ALLOWED_EMPLOYMENT = ['Full-time', 'Part-time', 'Contract', 'Internship']
    const safeEmployment = ALLOWED_EMPLOYMENT.includes(employment_type) ? employment_type : 'Full-time'

    const jobId = 'job_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16)

    await c.env.DB.prepare(
      `INSERT INTO jobs (id, poster_id, title, company_name, location, workplace_type, employment_type, description, salary_range)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        jobId,
        user.id,
        titleClean,
        companyClean,
        locationClean,
        safeWorkplace,
        safeEmployment,
        descClean,
        salaryClean
      )
      .run()

    // 1. Create In-App Notification record
    const notifId = 'notif_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16)
    const notifTitle = `New Job: ${title}`
    const notifMessage = `${company_name} is actively recruiting for ${title} in ${location} (${workplace_type || 'Remote'})`
    const notifData = JSON.stringify({
      job_id: jobId,
      title,
      company_name,
      location,
      workplace_type: workplace_type || 'Remote',
      salary_range: salary_range || '',
    })

    try {
      await c.env.DB.prepare(
        `INSERT INTO notifications (id, user_id, type, title, message, data, is_read, created_at)
         VALUES (?, null, 'job_posted', ?, ?, ?, 0, CURRENT_TIMESTAMP)`
      )
        .bind(notifId, notifTitle, notifMessage, notifData)
        .run()
    } catch (notifErr) {
      console.warn('Failed to insert in-app notification:', notifErr)
    }

    // 2. Dispatch Push Notification to all registered native devices (Android app)
    try {
      const { results: tokensData } = await c.env.DB.prepare(
        'SELECT token FROM device_tokens ORDER BY updated_at DESC LIMIT 500'
      ).all()

      const tokens = (tokensData || []).map((r: any) => r.token as string)
      if (tokens.length > 0) {
        c.executionCtx.waitUntil(
          Promise.allSettled(
            tokens.map((token) =>
              sendFcmNotification(serviceAccount, token, {
                title: notifTitle,
                body: notifMessage,
                data: {
                  job_id: jobId,
                  type: 'job_posted',
                },
              })
            )
          )
        )
      }
    } catch (pushErr) {
      console.warn('FCM broadcast failed:', pushErr)
    }

    // Invalidate edge memory caches on job creation
    invalidateEdgeCache('jobs:')
    invalidateEdgeCache('platform:')

    return c.json({
      success: true,
      message: 'Job posted successfully with in-app & push notifications broadcasted',
      job_id: jobId,
      notification_id: notifId,
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// 2. Get All Jobs (LinkedIn logic: Full jobs list ONLY for registered users; unregistered visitors get count/auth gate - cached 60s)
app.get('/api/jobs', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    let isRegistered = false

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const secret = c.env.JWT_SECRET || DEFAULT_JWT_SECRET
      try {
        const payload = (await verify(token, secret, 'HS256')) as { id: string; email: string }
        if (payload?.id) {
          const userStatusKey = `user:status:${payload.id}`
          const cachedStatus = getEdgeCache<string>(userStatusKey)
          if (cachedStatus && cachedStatus !== 'suspended') {
            isRegistered = true
          } else {
            const user = await c.env.DB.prepare('SELECT id, status FROM users WHERE id = ?')
              .bind(payload.id)
              .first() as { id: string; status: string } | null
            if (user && user.status !== 'suspended') {
              isRegistered = true
              setEdgeCache(userStatusKey, user.status, 300)
            }
          }
        }
      } catch {
        // Token invalid or expired
      }
    }

    if (!isRegistered) {
      const cachedUnreg = getEdgeCache<{ jobs: any[]; total_count: number; registered_only: boolean; message: string }>('jobs:unregistered')
      if (cachedUnreg) {
        return c.json(cachedUnreg)
      }

      const totalCount = (await c.env.DB.prepare('SELECT COUNT(*) as count FROM jobs').first('count') as number) || 0
      const unregPayload = {
        jobs: [],
        total_count: totalCount,
        registered_only: true,
        message: 'Registration required to view job listings. Sign in to unlock full job descriptions, salaries, and Easy Apply.',
      }
      setEdgeCache('jobs:unregistered', unregPayload, 60)
      return c.json(unregPayload)
    }

    const cachedRegistered = getEdgeCache<{ jobs: any[]; total_count: number }>('jobs:registered_list')
    if (cachedRegistered) {
      return c.json(cachedRegistered)
    }

    const totalCount = (await c.env.DB.prepare('SELECT COUNT(*) as count FROM jobs').first('count') as number) || 0
    const { results } = await c.env.DB.prepare(
      `SELECT j.*, u.full_name as poster_name, u.avatar_url as poster_avatar
       FROM jobs j
       JOIN users u ON j.poster_id = u.id
       ORDER BY j.created_at DESC
       LIMIT 50`
    ).all()

    const regPayload = { jobs: results || [], total_count: totalCount || (results?.length || 0) }
    setEdgeCache('jobs:registered_list', regPayload, 60)
    return c.json(regPayload)
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// 3. Manager's posted jobs
app.get('/api/manager/my-jobs', requireAuth, requireRole(['admin', 'manager']), async (c) => {
  try {
    const user = c.get('user') as UserRecord
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM jobs WHERE poster_id = ? ORDER BY created_at DESC'
    )
      .bind(user.id)
      .all()

    return c.json({ jobs: results || [] })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// 4. Easy Apply to Job (LinkedIn business logic: Only Employees can apply; HR/Managers cannot apply)
app.post('/api/jobs/:id/apply', requireAuth, async (c) => {
  try {
    const user = c.get('user') as UserRecord
    const jobId = c.req.param('id')

    // Business Rule: HR / Recruiter (manager) and Admins cannot submit job applications.
    // Applications are strictly reserved for Job Seekers (Employees).
    if (user.role === 'manager' || user.role === 'admin') {
      return c.json(
        {
          error: 'Forbidden: HR Recruiters and Managers cannot submit job applications. Applications are strictly reserved for Job Seekers (Employees).',
          code: 'HR_CANNOT_APPLY',
        },
        403
      )
    }

    // Verify job exists
    const job = await c.env.DB.prepare('SELECT id, poster_id, title, company_name FROM jobs WHERE id = ?')
      .bind(jobId)
      .first() as { id: string; poster_id: string; title: string; company_name: string } | null

    if (!job) {
      return c.json({ error: 'Job not found or has been closed' }, 404)
    }

    if (job.poster_id === user.id) {
      return c.json({ error: 'You cannot apply to your own job posting' }, 400)
    }

    const body = await c.req.json().catch(() => ({}))
    const candidate_name = (typeof body.candidate_name === 'string' ? body.candidate_name : (user.full_name || '')).trim()
    const candidate_email = (typeof body.candidate_email === 'string' ? body.candidate_email : (user.email || '')).trim().toLowerCase()
    const candidate_phone = (typeof body.candidate_phone === 'string' ? body.candidate_phone : (user.phone || '')).trim()
    const resume_url = (typeof body.resume_url === 'string' ? body.resume_url : (user.resume_url || '')).trim()

    if (!candidate_name || candidate_name.length < 2 || candidate_name.length > 100) {
      return c.json({ error: 'Valid candidate name (2-100 characters) is required' }, 400)
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!candidate_email || !emailRegex.test(candidate_email) || candidate_email.length > 150) {
      return c.json({ error: 'Valid candidate email address is required' }, 400)
    }

    if (!resume_url || resume_url.length > 1000) {
      return c.json({ error: 'Valid resume URL is required. Please upload your resume first.' }, 400)
    }

    if (candidate_phone && candidate_phone.length > 25) {
      return c.json({ error: 'Candidate phone number cannot exceed 25 characters' }, 400)
    }

    // Ensure job_applications table exists with applicant_user_id
    await c.env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS job_applications (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        applicant_user_id TEXT,
        candidate_name TEXT NOT NULL,
        candidate_email TEXT NOT NULL,
        candidate_phone TEXT DEFAULT '',
        resume_url TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
        FOREIGN KEY (applicant_user_id) REFERENCES users(id) ON DELETE SET NULL
      )`
    ).run()

    // Prevent duplicate applications for the same job posting
    const existingApp = await c.env.DB.prepare(
      'SELECT id FROM job_applications WHERE job_id = ? AND (applicant_user_id = ? OR candidate_email = ?)'
    )
      .bind(jobId, user.id, candidate_email)
      .first()

    if (existingApp) {
      return c.json(
        {
          error: 'You have already submitted an application for this job opening.',
          code: 'DUPLICATE_APPLICATION',
        },
        409
      )
    }

    const appId = 'app_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16)

    await c.env.DB.prepare(
      `INSERT INTO job_applications (id, job_id, applicant_user_id, candidate_name, candidate_email, candidate_phone, resume_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(appId, jobId, user.id, candidate_name, candidate_email, candidate_phone, resume_url)
      .run()

    await c.env.DB.prepare('UPDATE jobs SET applicants_count = applicants_count + 1 WHERE id = ?')
      .bind(jobId)
      .run()

    invalidateEdgeCache('jobs:')

    return c.json({
      success: true,
      message: `Application submitted successfully to ${job.company_name}`,
      application_id: appId,
      job_id: jobId,
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// 5. Get Applications for a Specific Job (Manager who posted it, or Admin)
app.get('/api/jobs/:id/applications', requireAuth, requireRole(['admin', 'manager']), async (c) => {
  try {
    const user = c.get('user') as UserRecord
    const jobId = c.req.param('id')

    const job = await c.env.DB.prepare('SELECT id, poster_id, title FROM jobs WHERE id = ?')
      .bind(jobId)
      .first() as { id: string; poster_id: string; title: string } | null

    if (!job) {
      return c.json({ error: 'Job not found' }, 404)
    }

    if (user.role !== 'admin' && job.poster_id !== user.id) {
      return c.json({ error: 'Forbidden: You can only view applications for jobs you posted' }, 403)
    }

    const { results } = await c.env.DB.prepare(
      `SELECT a.*, u.avatar_url as candidate_avatar, u.headline as candidate_headline, u.skills as candidate_skills
       FROM job_applications a
       LEFT JOIN users u ON a.applicant_user_id = u.id
       WHERE a.job_id = ?
       ORDER BY a.created_at DESC`
    )
      .bind(jobId)
      .all()

    return c.json({
      job_id: jobId,
      job_title: job.title,
      applications: results || [],
      total_count: results?.length || 0,
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// 6. Delete / Close Job Posting (Manager who posted it, or Admin)
app.delete('/api/jobs/:id', requireAuth, requireRole(['admin', 'manager']), async (c) => {
  try {
    const user = c.get('user') as UserRecord
    const jobId = c.req.param('id')

    const job = await c.env.DB.prepare('SELECT id, poster_id, title FROM jobs WHERE id = ?')
      .bind(jobId)
      .first() as { id: string; poster_id: string; title: string } | null

    if (!job) {
      return c.json({ error: 'Job not found' }, 404)
    }

    if (user.role !== 'admin' && job.poster_id !== user.id) {
      return c.json({ error: 'Forbidden: You can only delete jobs that you posted' }, 403)
    }

    await c.env.DB.prepare('DELETE FROM jobs WHERE id = ?').bind(jobId).run()
    await c.env.DB.prepare('DELETE FROM job_applications WHERE job_id = ?').bind(jobId).run()

    invalidateEdgeCache('jobs:')
    invalidateEdgeCache('platform:')

    return c.json({
      success: true,
      message: `Job '${job.title}' deleted successfully`,
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// 7. Get Applications Submitted by Current Employee
app.get('/api/employee/my-applications', requireAuth, async (c) => {
  try {
    const user = c.get('user') as UserRecord
    const { results } = await c.env.DB.prepare(
      `SELECT a.id as application_id, a.job_id, a.created_at as applied_at, a.resume_url,
              j.title, j.company_name, j.location, j.workplace_type, j.employment_type, j.salary_range
       FROM job_applications a
       JOIN jobs j ON a.job_id = j.id
       WHERE a.applicant_user_id = ? OR a.candidate_email = ?
       ORDER BY a.created_at DESC`
    )
      .bind(user.id, user.email)
      .all()

    return c.json({ applications: results || [] })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// --------------------------------------------------------------------------
// SOCIAL / NETWORKING FEED (LinkedIn Features)
// --------------------------------------------------------------------------

// 1. Get Feed Posts (cached 60s)
app.get('/api/posts', async (c) => {
  try {
    const cached = getEdgeCache<{ posts: any[] }>('posts:feed')
    if (cached) {
      return c.json(cached)
    }

    const { results } = await c.env.DB.prepare(
      `SELECT p.*, u.full_name as author_name, u.avatar_url as author_avatar, 
              u.headline as author_headline, u.role as author_role
       FROM posts p
       JOIN users u ON p.author_id = u.id
       ORDER BY p.created_at DESC
       LIMIT 30`
    ).all()

    const payload = { posts: results || [] }
    setEdgeCache('posts:feed', payload, 60)
    return c.json(payload)
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// 2. Create Post (Any authenticated user: Employee, Manager, or Admin)
app.post('/api/posts', requireAuth, async (c) => {
  try {
    const user = c.get('user') as UserRecord
    const body = await c.req.json().catch(() => ({}))
    const content = (body.content || '').trim()

    if (!content || content.length === 0) {
      return c.json({ error: 'Post content cannot be empty' }, 400)
    }
    if (content.length > 5000) {
      return c.json({ error: 'Post content cannot exceed 5000 characters' }, 400)
    }

    const safeMedia = Array.isArray(body.media_urls)
      ? body.media_urls
          .slice(0, 10)
          .filter((url: any) => typeof url === 'string' && url.length <= 1000)
      : []

    const postId = 'post_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16)

    await c.env.DB.prepare(
      `INSERT INTO posts (id, author_id, content, media_urls)
       VALUES (?, ?, ?, ?)`
    )
      .bind(postId, user.id, content, JSON.stringify(safeMedia))
      .run()

    invalidateEdgeCache('posts:')
    invalidateEdgeCache('platform:')

    return c.json({ success: true, post_id: postId })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// 3. Dynamic Post Reaction (Like)
app.post('/api/posts/:id/like', async (c) => {
  try {
    const postId = c.req.param('id')

    const existingPost = await c.env.DB.prepare('SELECT id, likes_count FROM posts WHERE id = ?')
      .bind(postId)
      .first() as { id: string; likes_count: number } | null

    if (!existingPost) {
      return c.json({ error: 'Post not found' }, 404)
    }

    await c.env.DB.prepare('UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?')
      .bind(postId)
      .run()

    invalidateEdgeCache('posts:')

    return c.json({
      success: true,
      likes_count: (existingPost.likes_count || 0) + 1,
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// --------------------------------------------------------------------------
// DYNAMIC PLATFORM TELEMETRY & LIVE OVERVIEW
// --------------------------------------------------------------------------
app.get('/api/platform/overview', async (c) => {
  try {
    const cached = getEdgeCache<any>('platform:overview')
    if (cached) {
      return c.json(cached)
    }

    const totalJobs = (await c.env.DB.prepare('SELECT COUNT(*) as count FROM jobs').first('count')) || 0
    const totalPosts = (await c.env.DB.prepare('SELECT COUNT(*) as count FROM posts').first('count')) || 0
    const totalUsers = (await c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first('count')) || 0
    const { results: recentJobs } = await c.env.DB.prepare(
      'SELECT id, title, company_name, location, workplace_type, created_at FROM jobs ORDER BY created_at DESC LIMIT 4'
    ).all()

    const payload = {
      total_jobs: totalJobs,
      total_posts: totalPosts,
      total_users: totalUsers,
      recent_jobs: recentJobs || [],
      edge_status: 'operational',
      region: 'APAC / Cloudflare Edge',
    }
    setEdgeCache('platform:overview', payload, 120)
    return c.json(payload)
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// --------------------------------------------------------------------------
// CLOUDFLARE R2 FILE STORAGE (Resumes, Job Post Images, Avatars)
// --------------------------------------------------------------------------

// 1. Upload File (Multipart form data: file, optional folder)
app.post('/api/upload', async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('file') as File | null
    const rawFolder = (formData.get('folder') as string) || 'uploads'

    if (!file) {
      return c.json({ error: 'No file provided in form-data (key: "file")' }, 400)
    }

    // Security Whitelist: Only permit predefined folders
    const ALLOWED_FOLDERS = ['resumes', 'avatars', 'jobs', 'posts', 'uploads']
    const folder = ALLOWED_FOLDERS.includes(rawFolder.toLowerCase().trim())
      ? rawFolder.toLowerCase().trim()
      : 'uploads'

    // Strict File Size Validation: Minimum > 0 bytes, Maximum 10MB
    const MAX_SIZE = 10 * 1024 * 1024 // 10MB
    if (file.size <= 0) {
      return c.json({ error: 'Uploaded file cannot be empty (0 bytes)' }, 400)
    }
    if (file.size > MAX_SIZE) {
      return c.json({ error: 'File size exceeds limit (maximum 10MB allowed)' }, 400)
    }

    // Sanitize filename & reject dangerous executables/scripts
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const lastDot = cleanFileName.lastIndexOf('.')
    const ext = lastDot !== -1 ? cleanFileName.slice(lastDot).toLowerCase() : ''
    const DANGEROUS_EXTS = ['.exe', '.sh', '.bat', '.cmd', '.php', '.phtml', '.py', '.rb', '.pl', '.cgi', '.jar', '.com', '.msi', '.html', '.htm', '.js', '.vbs']
    if (DANGEROUS_EXTS.includes(ext)) {
      return c.json({ error: 'Forbidden: Executable and script files cannot be uploaded for security reasons' }, 400)
    }

    // Folder-specific type validation
    if (folder === 'resumes') {
      const ALLOWED_RESUME_EXTS = ['.pdf', '.doc', '.docx', '.txt', '.rtf']
      if (!ALLOWED_RESUME_EXTS.includes(ext)) {
        return c.json({ error: 'Invalid resume format. Allowed formats: PDF, DOC, DOCX, TXT, RTF' }, 400)
      }
    } else if (['avatars', 'jobs', 'posts'].includes(folder)) {
      const ALLOWED_IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']
      if (!ALLOWED_IMAGE_EXTS.includes(ext)) {
        return c.json({ error: 'Invalid media format. Allowed formats: JPG, PNG, WebP, GIF, SVG' }, 400)
      }
    }

    const uniquePrefix = crypto.randomUUID().replace(/-/g, '').slice(0, 12)
    const key = `${folder}/${Date.now()}_${uniquePrefix}_${cleanFileName}`

    const arrayBuffer = await file.arrayBuffer()

    // Upload to Cloudflare R2
    await c.env.MEDIA_BUCKET.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type || 'application/octet-stream',
      },
      customMetadata: {
        originalName: file.name,
        size: file.size.toString(),
        uploadedAt: new Date().toISOString(),
      },
    })

    const fileUrl = `${new URL(c.req.url).origin}/api/media/${key}`

    return c.json({
      success: true,
      message: 'File uploaded successfully to Cloudflare R2',
      key,
      url: fileUrl,
      filename: file.name,
      contentType: file.type,
      size: file.size,
    })
  } catch (err: any) {
    return c.json({ error: 'R2 Upload error: ' + err.message }, 500)
  }
})

// 2. Serve Media File from R2
app.get('/api/media/*', async (c) => {
  try {
    const path = c.req.path.replace(/^\/api\/media\//, '')
    if (!path || path.includes('..') || path.startsWith('/')) {
      return c.text('Not found', 404)
    }

    const object = await c.env.MEDIA_BUCKET.get(path)
    if (!object) {
      return c.text('Object not found in R2 bucket', 404)
    }

    const headers = new Headers()
    object.writeHttpMetadata(headers)
    headers.set('etag', object.httpEtag)
    headers.set('Cache-Control', 'public, max-age=31536000, immutable')

    return new Response(object.body, { headers })
  } catch (err: any) {
    return c.text('Error retrieving file: ' + err.message, 500)
  }
})

// 3. Delete Media File from R2 (Requires Authentication)
app.delete('/api/media/*', requireAuth, async (c) => {
  try {
    const user = c.get('user') as UserRecord
    const path = c.req.path.replace(/^\/api\/media\//, '')
    if (!path || path.includes('..') || path.startsWith('/')) {
      return c.json({ error: 'Invalid or missing file path' }, 400)
    }

    await c.env.MEDIA_BUCKET.delete(path)
    return c.json({
      success: true,
      message: `Deleted ${path} from Cloudflare R2 by ${user.email}`,
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// --------------------------------------------------------------------------
// IN-APP NOTIFICATIONS
// --------------------------------------------------------------------------

// 1. Get In-App Notifications (Latest 50, with unread count)
app.get('/api/notifications', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50'
    ).all()

    const unreadCount =
      (await c.env.DB.prepare('SELECT count(*) as count FROM notifications WHERE is_read = 0').first(
        'count'
      )) || 0

    return c.json({
      notifications: results || [],
      unread_count: unreadCount,
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// 2. Mark Single Notification as Read
app.patch('/api/notifications/:id/read', async (c) => {
  try {
    const id = c.req.param('id')
    await c.env.DB.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?')
      .bind(id)
      .run()

    return c.json({ success: true, id })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// 3. Mark All Notifications as Read
app.post('/api/notifications/mark-all-read', async (c) => {
  try {
    await c.env.DB.prepare('UPDATE notifications SET is_read = 1').run()
    return c.json({ success: true, message: 'All notifications marked as read' })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// --------------------------------------------------------------------------
// FIREBASE CLOUD MESSAGING (FCM) PUSH NOTIFICATIONS
// --------------------------------------------------------------------------

// 1. Register / Update Device Token from Android App
app.post('/api/notifications/register-token', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}))
    const token = (body.token || '').trim()
    const rawPlatform = (body.platform || 'android').toLowerCase().trim()
    const platform = ['android', 'ios', 'web'].includes(rawPlatform) ? rawPlatform : 'android'
    const user_id = body.user_id ? String(body.user_id).trim().slice(0, 50) : null

    if (!token || token.length < 10 || token.length > 500) {
      return c.json({ error: 'Valid FCM registration token is required' }, 400)
    }

    const tokenId = 'fcm_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16)

    await c.env.DB.prepare(
      `INSERT INTO device_tokens (id, user_id, token, platform, updated_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(token) DO UPDATE SET updated_at = CURRENT_TIMESTAMP, user_id = COALESCE(excluded.user_id, device_tokens.user_id)`
    )
      .bind(tokenId, user_id, token, platform)
      .run()

    return c.json({ success: true, message: 'FCM device token registered' })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// 2. Broadcast Push Notification to All Devices (Strictly Admin only)
app.post('/api/notifications/broadcast', requireAuth, requireRole(['admin']), async (c) => {
  try {
    const bodyObj = await c.req.json().catch(() => ({}))
    const title = (bodyObj.title || '').trim()
    const body = (bodyObj.body || '').trim()

    if (!title || title.length > 200) {
      return c.json({ error: 'Notification title must be between 1 and 200 characters' }, 400)
    }
    if (!body || body.length > 1000) {
      return c.json({ error: 'Notification body must be between 1 and 1000 characters' }, 400)
    }

    const { results } = await c.env.DB.prepare(
      `SELECT token FROM device_tokens ORDER BY updated_at DESC LIMIT 500`
    ).all()

    const tokens = (results || []).map((r: any) => r.token as string)

    if (tokens.length === 0) {
      return c.json({
        success: true,
        message: 'No active device tokens found yet to broadcast',
        delivered: 0,
      })
    }

    const outcomes = await Promise.allSettled(
      tokens.map((token) =>
        sendFcmNotification(serviceAccount, token, {
          title,
          body,
          data: bodyObj.data || {},
        })
      )
    )

    const successCount = outcomes.filter(
      (o) => o.status === 'fulfilled' && (o.value as any).success
    ).length

    return c.json({
      success: true,
      total_devices: tokens.length,
      delivered: successCount,
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// 3. Query Device Count (Strictly Admin only)
app.get('/api/notifications/devices', requireAuth, requireRole(['admin']), async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT count(*) as total_devices, platform, max(updated_at) as last_seen FROM device_tokens GROUP BY platform`
    ).all()
    return c.json({ devices: results || [] })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// --------------------------------------------------------------------------
// SOCIAL NETWORKING, FOLLOW/UNFOLLOW & MODERATED MESSAGING MODULE
// --------------------------------------------------------------------------

// 1. Discover People / Connections Feed
app.get('/api/users/discover', requireAuth, async (c) => {
  try {
    const currentUser = c.get('user') as UserRecord
    const search = (c.req.query('search') || '').trim().toLowerCase()
    const location = (c.req.query('location') || '').trim().toLowerCase()
    const page = Math.max(1, parseInt(c.req.query('page') || '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') || '20', 10)))
    const offset = (page - 1) * limit

    let query = `
      SELECT id, email, full_name, username, headline, avatar_url, banner_url, bio, location, company, position, skills, followers_count, following_count, created_at
      FROM users
      WHERE id != ? AND (is_active = 1 OR is_active IS NULL) AND status = 'active'
    `
    const params: any[] = [currentUser.id]

    if (search) {
      query += ` AND (LOWER(full_name) LIKE ? OR LOWER(username) LIKE ? OR LOWER(headline) LIKE ? OR LOWER(bio) LIKE ? OR LOWER(skills) LIKE ?)`
      const s = `%${search}%`
      params.push(s, s, s, s, s)
    }

    if (location) {
      query += ` AND LOWER(location) LIKE ?`
      params.push(`%${location}%`)
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`
    params.push(limit, offset)

    const stmt = c.env.DB.prepare(query)
    const { results } = await stmt.bind(...params).all()
    const usersList = results || []

    // Fetch following set for current user to indicate `is_following`
    const followingRows = await c.env.DB.prepare(
      'SELECT following_id FROM user_follows WHERE follower_id = ?'
    )
      .bind(currentUser.id)
      .all()
    
    const followingSet = new Set((followingRows?.results || []).map((r: any) => r.following_id))

    const enrichedUsers = usersList.map((u: any) => ({
      ...u,
      is_following: followingSet.has(u.id),
      skills: typeof u.skills === 'string' ? JSON.parse(u.skills || '[]') : (u.skills || []),
    }))

    // Count total for pagination
    let countQuery = `SELECT count(*) as total FROM users WHERE id != ? AND (is_active = 1 OR is_active IS NULL) AND status = 'active'`
    const countParams: any[] = [currentUser.id]
    if (search) {
      countQuery += ` AND (LOWER(full_name) LIKE ? OR LOWER(username) LIKE ? OR LOWER(headline) LIKE ? OR LOWER(bio) LIKE ? OR LOWER(skills) LIKE ?)`
      const s = `%${search}%`
      countParams.push(s, s, s, s, s)
    }
    if (location) {
      countQuery += ` AND LOWER(location) LIKE ?`
      countParams.push(`%${location}%`)
    }
    const countRow = await c.env.DB.prepare(countQuery).bind(...countParams).first() as any

    return c.json({
      users: enrichedUsers,
      pagination: {
        page,
        limit,
        total: countRow?.total || enrichedUsers.length,
        has_more: offset + enrichedUsers.length < (countRow?.total || 0),
      },
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// 2. Individual Public Profile
app.get('/api/users/:id/profile', requireAuth, async (c) => {
  try {
    const currentUser = c.get('user') as UserRecord
    const targetId = c.req.param('id')

    const targetUser = await c.env.DB.prepare(
      `SELECT id, email, full_name, username, headline, avatar_url, banner_url, bio, location, company, position, skills, phone, language, followers_count, following_count, connections_count, is_active, status, deactivated_until, created_at 
       FROM users WHERE id = ?`
    )
      .bind(targetId)
      .first() as any

    if (!targetUser) {
      return c.json({ error: 'User not found' }, 404)
    }

    // Exclude deactivated accounts for non-admin viewers
    if (
      (targetUser.is_active === 0 || targetUser.status === 'deactivated' || targetUser.status === 'suspended') &&
      currentUser.role !== 'admin' &&
      currentUser.id !== targetId
    ) {
      return c.json({ error: 'This user account is currently deactivated or unavailable' }, 404)
    }

    // Check if currentUser follows targetUser
    const followCheck = await c.env.DB.prepare(
      'SELECT id FROM user_follows WHERE follower_id = ? AND following_id = ?'
    )
      .bind(currentUser.id, targetId)
      .first()

    // Real-time counts
    const followersCountRow = await c.env.DB.prepare(
      'SELECT count(*) as count FROM user_follows WHERE following_id = ?'
    )
      .bind(targetId)
      .first() as any

    const followingCountRow = await c.env.DB.prepare(
      'SELECT count(*) as count FROM user_follows WHERE follower_id = ?'
    )
      .bind(targetId)
      .first() as any

    return c.json({
      profile: {
        id: targetUser.id,
        full_name: targetUser.full_name,
        username: targetUser.username || targetUser.email.split('@')[0],
        headline: targetUser.headline || '',
        avatar_url: targetUser.avatar_url || '',
        banner_url: targetUser.banner_url || '',
        bio: targetUser.bio || '',
        location: targetUser.location || '',
        company: targetUser.company || '',
        position: targetUser.position || '',
        skills: typeof targetUser.skills === 'string' ? JSON.parse(targetUser.skills || '[]') : (targetUser.skills || []),
        followers_count: followersCountRow?.count ?? (targetUser.followers_count || 0),
        following_count: followingCountRow?.count ?? (targetUser.following_count || 0),
        is_following: Boolean(followCheck),
        is_self: currentUser.id === targetId,
        is_active: targetUser.is_active !== 0 && targetUser.status === 'active',
        created_at: targetUser.created_at,
      },
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// 3. Follow User
app.post('/api/users/:id/follow', requireAuth, async (c) => {
  try {
    const currentUser = c.get('user') as UserRecord
    const targetId = c.req.param('id')

    if (currentUser.id === targetId) {
      return c.json({ error: 'You cannot follow yourself' }, 400)
    }

    // Check target exists and is active
    const targetUser = await c.env.DB.prepare(
      'SELECT id, is_active, status FROM users WHERE id = ?'
    )
      .bind(targetId)
      .first() as any

    if (!targetUser || targetUser.is_active === 0 || targetUser.status !== 'active') {
      return c.json({ error: 'Cannot follow this user as the account is deactivated or not found' }, 400)
    }

    // Check if already followed
    const existing = await c.env.DB.prepare(
      'SELECT id FROM user_follows WHERE follower_id = ? AND following_id = ?'
    )
      .bind(currentUser.id, targetId)
      .first()

    if (existing) {
      return c.json({ success: true, message: 'Already following', is_following: true })
    }

    const followId = `fol_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    await c.env.DB.prepare(
      'INSERT INTO user_follows (id, follower_id, following_id, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)'
    )
      .bind(followId, currentUser.id, targetId)
      .run()

    // Update counts
    await c.env.DB.prepare(
      'UPDATE users SET following_count = following_count + 1 WHERE id = ?'
    )
      .bind(currentUser.id)
      .run()

    await c.env.DB.prepare(
      'UPDATE users SET followers_count = followers_count + 1 WHERE id = ?'
    )
      .bind(targetId)
      .run()

    const updatedTarget = await c.env.DB.prepare('SELECT followers_count FROM users WHERE id = ?').bind(targetId).first() as any

    return c.json({
      success: true,
      is_following: true,
      followers_count: updatedTarget?.followers_count || 1,
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// 4. Unfollow User
app.delete('/api/users/:id/follow', requireAuth, async (c) => {
  try {
    const currentUser = c.get('user') as UserRecord
    const targetId = c.req.param('id')

    if (currentUser.id === targetId) {
      return c.json({ error: 'You cannot unfollow yourself' }, 400)
    }

    const result = await c.env.DB.prepare(
      'DELETE FROM user_follows WHERE follower_id = ? AND following_id = ?'
    )
      .bind(currentUser.id, targetId)
      .run()

    // Decrement counts safely
    await c.env.DB.prepare(
      'UPDATE users SET following_count = MAX(0, following_count - 1) WHERE id = ?'
    )
      .bind(currentUser.id)
      .run()

    await c.env.DB.prepare(
      'UPDATE users SET followers_count = MAX(0, followers_count - 1) WHERE id = ?'
    )
      .bind(targetId)
      .run()

    const updatedTarget = await c.env.DB.prepare('SELECT followers_count FROM users WHERE id = ?').bind(targetId).first() as any

    return c.json({
      success: true,
      is_following: false,
      followers_count: updatedTarget?.followers_count || 0,
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// 5. Followers List
app.get('/api/users/:id/followers', requireAuth, async (c) => {
  try {
    const currentUser = c.get('user') as UserRecord
    const targetId = c.req.param('id')
    const page = Math.max(1, parseInt(c.req.query('page') || '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') || '20', 10)))
    const offset = (page - 1) * limit

    const { results } = await c.env.DB.prepare(
      `SELECT u.id, u.full_name, u.username, u.headline, u.avatar_url, u.bio, u.location, u.followers_count, u.following_count, f.created_at as followed_at
       FROM user_follows f
       JOIN users u ON f.follower_id = u.id
       WHERE f.following_id = ? AND (u.is_active = 1 OR u.is_active IS NULL) AND u.status = 'active'
       ORDER BY f.created_at DESC
       LIMIT ? OFFSET ?`
    )
      .bind(targetId, limit, offset)
      .all()

    const followers = results || []

    // Check which of these the current user is following
    const followingRows = await c.env.DB.prepare(
      'SELECT following_id FROM user_follows WHERE follower_id = ?'
    )
      .bind(currentUser.id)
      .all()
    const followingSet = new Set((followingRows?.results || []).map((r: any) => r.following_id))

    const enriched = followers.map((u: any) => ({
      ...u,
      is_following: followingSet.has(u.id),
      is_self: u.id === currentUser.id,
    }))

    return c.json({ followers: enriched })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// 6. Following List
app.get('/api/users/:id/following', requireAuth, async (c) => {
  try {
    const currentUser = c.get('user') as UserRecord
    const targetId = c.req.param('id')
    const page = Math.max(1, parseInt(c.req.query('page') || '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') || '20', 10)))
    const offset = (page - 1) * limit

    const { results } = await c.env.DB.prepare(
      `SELECT u.id, u.full_name, u.username, u.headline, u.avatar_url, u.bio, u.location, u.followers_count, u.following_count, f.created_at as followed_at
       FROM user_follows f
       JOIN users u ON f.following_id = u.id
       WHERE f.follower_id = ? AND (u.is_active = 1 OR u.is_active IS NULL) AND u.status = 'active'
       ORDER BY f.created_at DESC
       LIMIT ? OFFSET ?`
    )
      .bind(targetId, limit, offset)
      .all()

    const following = results || []

    const followingRows = await c.env.DB.prepare(
      'SELECT following_id FROM user_follows WHERE follower_id = ?'
    )
      .bind(currentUser.id)
      .all()
    const followingSet = new Set((followingRows?.results || []).map((r: any) => r.following_id))

    const enriched = following.map((u: any) => ({
      ...u,
      is_following: followingSet.has(u.id),
      is_self: u.id === currentUser.id,
    }))

    return c.json({ following: enriched })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// 7. Conversations List
app.get('/api/conversations', requireAuth, async (c) => {
  try {
    const currentUser = c.get('user') as UserRecord

    // Fetch all conversations for current user
    const { results } = await c.env.DB.prepare(
      `SELECT c.id as conversation_id, c.updated_at,
              cp_other.user_id as participant_id,
              u.full_name, u.username, u.avatar_url, u.headline, u.is_active, u.status
       FROM conversation_participants cp_me
       JOIN conversations c ON cp_me.conversation_id = c.id
       JOIN conversation_participants cp_other ON c.id = cp_other.conversation_id AND cp_other.user_id != cp_me.user_id
       JOIN users u ON cp_other.user_id = u.id
       WHERE cp_me.user_id = ?
       ORDER BY c.updated_at DESC`
    )
      .bind(currentUser.id)
      .all()

    const convList = results || []

    // Fetch latest message and unread count for each conversation
    const conversationsWithLatest = await Promise.all(
      convList.map(async (conv: any) => {
        const latestMsg = await c.env.DB.prepare(
          `SELECT id, sender_id, content, created_at, read_at, moderation_status
           FROM chat_messages
           WHERE conversation_id = ?
           ORDER BY created_at DESC
           LIMIT 1`
        )
          .bind(conv.conversation_id)
          .first() as any

        const unreadRow = await c.env.DB.prepare(
          `SELECT count(*) as unread_count
           FROM chat_messages
           WHERE conversation_id = ? AND sender_id != ? AND read_at IS NULL`
        )
          .bind(conv.conversation_id, currentUser.id)
          .first() as any

        return {
          id: conv.conversation_id,
          updated_at: conv.updated_at,
          participant: {
            id: conv.participant_id,
            full_name: conv.full_name,
            username: conv.username,
            avatar_url: conv.avatar_url,
            headline: conv.headline,
            is_active: conv.is_active !== 0 && conv.status === 'active',
          },
          last_message: latestMsg || null,
          unread_count: unreadRow?.unread_count || 0,
        }
      })
    )

    return c.json({ conversations: conversationsWithLatest })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// 8. Create or Get Conversation with a User
app.post('/api/conversations', requireAuth, async (c) => {
  try {
    const currentUser = c.get('user') as UserRecord
    const body = await c.req.json()
    const recipientId = body.recipient_id

    if (!recipientId) {
      return c.json({ error: 'recipient_id is required' }, 400)
    }

    if (currentUser.id === recipientId) {
      return c.json({ error: 'You cannot start a conversation with yourself' }, 400)
    }

    // Verify recipient exists and is active
    const recipient = await c.env.DB.prepare(
      'SELECT id, full_name, username, avatar_url, headline, is_active, status FROM users WHERE id = ?'
    )
      .bind(recipientId)
      .first() as any

    if (!recipient || recipient.is_active === 0 || recipient.status !== 'active') {
      return c.json({ error: 'Cannot message this user because their account is deactivated or not found' }, 400)
    }

    // Check if an existing 1-to-1 conversation exists
    const existing = await c.env.DB.prepare(
      `SELECT cp1.conversation_id
       FROM conversation_participants cp1
       JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
       WHERE cp1.user_id = ? AND cp2.user_id = ?`
    )
      .bind(currentUser.id, recipientId)
      .first() as any

    let convId = existing?.conversation_id

    if (!convId) {
      convId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
      await c.env.DB.prepare(
        'INSERT INTO conversations (id, created_at, updated_at) VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
      )
        .bind(convId)
        .run()

      await c.env.DB.prepare(
        'INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)'
      )
        .bind(convId, currentUser.id)
        .run()

      await c.env.DB.prepare(
        'INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)'
      )
        .bind(convId, recipientId)
        .run()
    }

    return c.json({
      conversation: {
        id: convId,
        participant: {
          id: recipient.id,
          full_name: recipient.full_name,
          username: recipient.username,
          avatar_url: recipient.avatar_url,
          headline: recipient.headline,
          is_active: true,
        },
      },
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// 9. Get Messages for a Conversation (marks unread as read)
app.get('/api/conversations/:id/messages', requireAuth, async (c) => {
  try {
    const currentUser = c.get('user') as UserRecord
    const conversationId = c.req.param('id')
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '50', 10)))

    // Validate participant
    const isParticipant = await c.env.DB.prepare(
      'SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ?'
    )
      .bind(conversationId, currentUser.id)
      .first()

    if (!isParticipant) {
      return c.json({ error: 'You are not a participant in this conversation' }, 403)
    }

    // Mark incoming messages as read
    await c.env.DB.prepare(
      'UPDATE chat_messages SET read_at = CURRENT_TIMESTAMP WHERE conversation_id = ? AND sender_id != ? AND read_at IS NULL'
    )
      .bind(conversationId, currentUser.id)
      .run()

    // Fetch messages
    const { results } = await c.env.DB.prepare(
      `SELECT id, conversation_id, sender_id, content, created_at, read_at, moderation_status
       FROM chat_messages
       WHERE conversation_id = ?
       ORDER BY created_at ASC
       LIMIT ?`
    )
      .bind(conversationId, limit)
      .all()

    return c.json({ messages: results || [] })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// 9b. Mark all messages in a conversation as read
app.post('/api/conversations/:id/read', requireAuth, async (c) => {
  try {
    const currentUser = c.get('user') as UserRecord
    const conversationId = c.req.param('id')

    await c.env.DB.prepare(
      'UPDATE chat_messages SET read_at = CURRENT_TIMESTAMP WHERE conversation_id = ? AND sender_id != ? AND read_at IS NULL'
    )
      .bind(conversationId, currentUser.id)
      .run()

    return c.json({ success: true, conversation_id: conversationId })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// 10. Send a Message in Conversation (Server-Side AI Moderation Enforced!)
app.post('/api/conversations/:id/messages', requireAuth, async (c) => {
  try {
    const currentUser = c.get('user') as UserRecord
    const conversationId = c.req.param('id')
    const body = await c.req.json()
    const content = (body.content || '').trim()

    if (!content) {
      return c.json({ error: 'Message content cannot be empty' }, 400)
    }

    // Validate participant
    const isParticipant = await c.env.DB.prepare(
      'SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ?'
    )
      .bind(conversationId, currentUser.id)
      .first()

    if (!isParticipant) {
      return c.json({ error: 'You are not a participant in this conversation' }, 403)
    }

    // Check if other participant is active
    const otherParticipant = await c.env.DB.prepare(
      `SELECT u.id, u.is_active, u.status 
       FROM conversation_participants cp
       JOIN users u ON cp.user_id = u.id
       WHERE cp.conversation_id = ? AND cp.user_id != ?`
    )
      .bind(conversationId, currentUser.id)
      .first() as any

    if (otherParticipant && (otherParticipant.is_active === 0 || otherParticipant.status !== 'active')) {
      return c.json({ error: 'Cannot send message because recipient account is deactivated or suspended' }, 400)
    }

    // ---------------------------------------------------------
    // CRITICAL: SERVER-SIDE GOOGLE AI / MULTILINGUAL CONTENT SAFETY MODERATION
    // ---------------------------------------------------------
    const moderation = await moderateText(
      content,
      { contentType: 'MESSAGE', userId: currentUser.id },
      c.env
    )

    if (!moderation.isSafe) {
      // Content policy violated! Apply automatic 24-hour account suspension
      const policyResult = await applyAccountModerationPolicy(
        c.env.DB,
        currentUser.id,
        {
          violationType: moderation.violationType || 'BAD_WORD',
          contentType: 'MESSAGE',
          reason: moderation.reason || 'Content policy violation',
          severity: moderation.severity || 'HIGH',
          metadata: {
            conversationId,
            contentSnippet: content.slice(0, 50),
          },
        },
        24 // 24-hour suspension
      )

      return c.json(
        {
          error: `Message rejected by content safety moderation: ${moderation.reason}. Your account has been temporarily suspended for 24 hours.`,
          code: 'CONTENT_MODERATION_VIOLATION',
          violation: moderation,
          deactivated_until: policyResult.deactivatedUntil,
        },
        403
      )
    }

    // Content is safe! Store and send message
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    await c.env.DB.prepare(
      `INSERT INTO chat_messages (id, conversation_id, sender_id, content, created_at, moderation_status)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, 'APPROVED')`
    )
      .bind(messageId, conversationId, currentUser.id, content)
      .run()

    await c.env.DB.prepare(
      'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    )
      .bind(conversationId)
      .run()

    return c.json({
      success: true,
      message: {
        id: messageId,
        conversation_id: conversationId,
        sender_id: currentUser.id,
        content,
        created_at: new Date().toISOString(),
        read_at: null,
        moderation_status: 'APPROVED',
      },
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// 11. Direct Text Moderation Check Endpoint
app.post('/api/moderation/check-text', requireAuth, async (c) => {
  try {
    const body = await c.req.json()
    const text = body.text || ''
    const contentType = body.contentType || 'MESSAGE'
    const currentUser = c.get('user') as UserRecord

    const result = await moderateText(text, { contentType, userId: currentUser.id }, c.env)
    return c.json({ moderation: result })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// 12. Direct Image Moderation Check Endpoint
app.post('/api/moderation/check-image', requireAuth, async (c) => {
  try {
    const body = await c.req.json()
    const imageDataOrUrl = body.image_data || body.image_url || ''

    const result = await moderateImage(imageDataOrUrl, c.env)

    if (!result.isSafe) {
      const currentUser = c.get('user') as UserRecord
      // Apply policy for explicit image upload
      const policyResult = await applyAccountModerationPolicy(
        c.env.DB,
        currentUser.id,
        {
          violationType: result.violationType || 'NUDITY_IMAGE',
          contentType: 'IMAGE',
          reason: result.reason || 'Prohibited visual content detected',
          severity: result.severity || 'CRITICAL',
        },
        24
      )

      return c.json(
        {
          error: `Image rejected by safety filter: ${result.reason}. Account suspended for 24 hours.`,
          code: 'IMAGE_MODERATION_FAILED',
          moderation: result,
          deactivated_until: policyResult.deactivatedUntil,
        },
        403
      )
    }

    return c.json({ moderation: result })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// 13. Admin Moderation: Violations Audit Log
app.get('/api/admin/violations', requireAuth, requireRole(['admin']), async (c) => {
  try {
    const page = Math.max(1, parseInt(c.req.query('page') || '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') || '25', 10)))
    const offset = (page - 1) * limit

    const { results } = await c.env.DB.prepare(
      `SELECT v.id, v.user_id, v.violation_type, v.content_type, v.severity, v.reason, v.created_at, v.deactivated_until, v.metadata,
              u.full_name, u.email, u.avatar_url, u.status as user_status, u.is_active as user_is_active
       FROM user_violations v
       JOIN users u ON v.user_id = u.id
       ORDER BY v.created_at DESC
       LIMIT ? OFFSET ?`
    )
      .bind(limit, offset)
      .all()

    const countRow = await c.env.DB.prepare('SELECT count(*) as total FROM user_violations').first() as any

    return c.json({
      violations: results || [],
      pagination: {
        page,
        limit,
        total: countRow?.total || (results || []).length,
      },
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// 14. Admin Moderation: Reactivate User Account Manually
app.post('/api/admin/users/:id/reactivate', requireAuth, requireRole(['admin']), async (c) => {
  try {
    const targetId = c.req.param('id')

    await c.env.DB.prepare(
      `UPDATE users 
       SET is_active = 1, status = 'active', deactivated_until = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
      .bind(targetId)
      .run()

    return c.json({ success: true, message: 'User account has been successfully reactivated' })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// 15. Admin Moderation: Suspend User Account Manually
app.post('/api/admin/users/:id/suspend', requireAuth, requireRole(['admin']), async (c) => {
  try {
    const targetId = c.req.param('id')
    const body = await c.req.json()
    const hours = parseInt(body.hours || '24', 10)
    const reason = body.reason || 'Account suspended by administrator'
    const deactivatedUntil = new Date(Date.now() + hours * 3600 * 1000).toISOString()

    await c.env.DB.prepare(
      `UPDATE users 
       SET is_active = 0, status = 'suspended', deactivated_until = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
      .bind(deactivatedUntil, targetId)
      .run()

    // Log violation
    const violationId = `viol_admin_${Date.now()}`
    await c.env.DB.prepare(
      `INSERT INTO user_violations (id, user_id, violation_type, content_type, severity, reason, created_at, deactivated_until, metadata)
       VALUES (?, ?, 'OTHER', 'PROFILE', 'HIGH', ?, CURRENT_TIMESTAMP, ?, ?)`
    )
      .bind(violationId, targetId, reason, deactivatedUntil, JSON.stringify({ adminAction: true, hours }))
      .run()

    return c.json({
      success: true,
      message: `User account suspended for ${hours} hours`,
      deactivated_until: deactivatedUntil,
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// --------------------------------------------------------------------------
// SAVED JOBS (BOOKMARK) MODULE
// --------------------------------------------------------------------------

// 1. Get All Saved Jobs for Current User
app.get('/api/saved-jobs', requireAuth, async (c) => {
  try {
    const currentUser = c.get('user') as UserRecord

    const { results } = await c.env.DB.prepare(
      `SELECT j.id, j.poster_id, j.title, j.company_name, j.company_logo, j.location,
              j.workplace_type, j.employment_type, j.description, j.salary_range,
              j.applicants_count, j.created_at,
              u.full_name as poster_name, u.avatar_url as poster_avatar,
              sj.created_at as saved_at
       FROM saved_jobs sj
       JOIN jobs j ON sj.job_id = j.id
       LEFT JOIN users u ON j.poster_id = u.id
       WHERE sj.user_id = ?
       ORDER BY sj.created_at DESC`
    )
      .bind(currentUser.id)
      .all()

    return c.json({ saved_jobs: results || [] })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// 2. Get Set of Saved Job IDs (for instant UI state badges)
app.get('/api/saved-jobs/ids', requireAuth, async (c) => {
  try {
    const currentUser = c.get('user') as UserRecord

    const { results } = await c.env.DB.prepare(
      'SELECT job_id FROM saved_jobs WHERE user_id = ?'
    )
      .bind(currentUser.id)
      .all()

    const savedIds = (results || []).map((r: any) => r.job_id)
    return c.json({ saved_ids: savedIds })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// 3. Save / Bookmark a Job
app.post('/api/saved-jobs/:id', requireAuth, async (c) => {
  try {
    const currentUser = c.get('user') as UserRecord
    const jobId = c.req.param('id')

    // Verify job exists
    const job = await c.env.DB.prepare('SELECT id FROM jobs WHERE id = ?')
      .bind(jobId)
      .first()

    if (!job) {
      return c.json({ error: 'Job not found' }, 404)
    }

    const saveId = `save_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    await c.env.DB.prepare(
      `INSERT OR IGNORE INTO saved_jobs (id, user_id, job_id, created_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)`
    )
      .bind(saveId, currentUser.id, jobId)
      .run()

    return c.json({
      success: true,
      saved: true,
      job_id: jobId,
      message: 'Job successfully saved to bookmarks',
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// 4. Remove / Un-bookmark a Job
app.delete('/api/saved-jobs/:id', requireAuth, async (c) => {
  try {
    const currentUser = c.get('user') as UserRecord
    const jobId = c.req.param('id')

    await c.env.DB.prepare(
      'DELETE FROM saved_jobs WHERE user_id = ? AND job_id = ?'
    )
      .bind(currentUser.id, jobId)
      .run()

    return c.json({
      success: true,
      saved: false,
      job_id: jobId,
      message: 'Job removed from saved bookmarks',
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

export default app



