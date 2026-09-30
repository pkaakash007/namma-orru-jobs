import type { UserRole } from '../types'

export const API_BASE = 'https://namma-ooru-jobs-api.apkavin483.workers.dev'

export const GOOGLE_WEB_CLIENT_ID =
  '1081442493959-s9906ironh3oq1vcso7hbbje8qi6uj65.apps.googleusercontent.com'

export const GOOGLE_ANDROID_CLIENT_ID =
  '1081442493959-foa9uho91jn2avckegn9fcf7q3cvai4g.apps.googleusercontent.com'

export const ROLE_CONFIG: Record<
  UserRole,
  {
    label: string
    badgeClass: string
    description: string
  }
> = {
  admin: {
    label: 'Admin',
    badgeClass: 'bg-[#0B2545] text-white border border-[#0B2545]',
    description: 'Full system oversight, manual DB assignment, assigns HR/Manager roles',
  },
  manager: {
    label: 'HR / Recruiter',
    badgeClass: 'bg-orange-50 text-[#EA580C] border border-orange-200',
    description: 'Assigned strictly by Admin, creates job listings, evaluates applicants',
  },
  employee: {
    label: 'Member',
    badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200',
    description: 'Default role for all registered professionals and members',
  },
}

export const WORKPLACE_TYPES = ['All', 'Remote', 'Hybrid', 'On-site'] as const

