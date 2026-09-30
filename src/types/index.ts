export type UserRole = 'admin' | 'manager' | 'employee'
export type SelectableRole = 'employee' | 'manager'

export type Language = 'en' | 'ta' | 'hi'

export interface User {
  id: string
  email: string
  google_id?: string
  full_name: string
  role: UserRole
  assigned_by?: string | null
  assigned_by_name?: string | null
  avatar_url?: string
  banner_url?: string
  bio?: string
  headline?: string
  location?: string
  company?: string
  position?: string
  skills?: string[]
  phone?: string
  date_of_birth?: string
  age?: number
  resume_url?: string
  language?: Language
  status?: string
  username?: string
  is_active?: number | boolean
  deactivated_until?: string | null
  followers_count?: number
  following_count?: number
  is_following?: boolean
  connections_count?: number
  match_score?: number
  matched_skills?: string[]
  missing_skills?: string[]
  created_at?: string
  updated_at?: string
}

export interface Job {
  id: string
  poster_id: string
  poster_name: string
  poster_avatar?: string
  title: string
  company_name: string
  company_logo?: string
  location: string
  workplace_type: 'Remote' | 'Hybrid' | 'On-site'
  employment_type: 'Full-time' | 'Part-time' | 'Contract' | 'Internship'
  description: string
  salary_range?: string
  applicants_count: number
  created_at: string
}

export interface Post {
  id: string
  author_id?: string
  author_name: string
  author_headline?: string
  author_avatar?: string
  author_role: UserRole
  content: string
  media_urls?: string[]
  likes_count: number
  comments_count: number
  shares_count?: number
  created_at: string
  liked_by_me?: boolean
}

export interface AdminStats {
  total_users: number
  admins: number
  managers_hr: number
  employees: number
  total_jobs: number
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface AppNotification {
  id: string
  user_id?: string | null
  type: 'job_posted' | 'application_received' | 'system'
  title: string
  message: string
  data?: string
  is_read: number | boolean
  created_at: string
}

export interface UserFollow {
  id: string
  follower_id: string
  following_id: string
  created_at: string
}

export interface PublicProfile {
  id: string
  full_name: string
  username: string
  headline?: string
  avatar_url?: string
  banner_url?: string
  bio?: string
  location?: string
  company?: string
  position?: string
  skills?: string[]
  followers_count: number
  following_count: number
  is_following: boolean
  is_self: boolean
  is_active: boolean
  created_at?: string
}

export interface ConversationParticipant {
  id: string
  full_name: string
  username?: string
  avatar_url?: string
  headline?: string
  is_active: boolean
}

export interface ChatMessage {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
  read_at?: string | null
  moderation_status?: 'APPROVED' | 'REJECTED' | 'PENDING'
}

export interface Conversation {
  id: string
  updated_at: string
  participant: ConversationParticipant
  last_message?: ChatMessage | null
  unread_count: number
}

export type ViolationType =
  | 'BAD_WORD'
  | 'HARASSMENT'
  | 'SEXUAL_TEXT'
  | 'NUDITY_IMAGE'
  | 'EXPLICIT_IMAGE'
  | 'VIOLENT_IMAGE'
  | 'OTHER'

export type ContentType = 'MESSAGE' | 'PROFILE' | 'IMAGE' | 'POST' | 'COMMENT'
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface UserViolation {
  id: string
  user_id: string
  violation_type: ViolationType
  content_type: ContentType
  severity: Severity
  reason: string
  created_at: string
  deactivated_until?: string | null
  metadata?: string | Record<string, any>
  full_name?: string
  email?: string
  avatar_url?: string
  user_status?: string
  user_is_active?: number | boolean
}

export interface ModerationResult {
  isSafe: boolean
  violationType?: ViolationType
  severity?: Severity
  reason?: string
  confidence?: number
  flaggedTerms?: string[]
}

