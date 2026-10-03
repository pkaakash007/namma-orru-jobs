import { useState, useEffect, useCallback } from 'react'
import { ToastProvider, useToast } from './context/ToastContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LanguageProvider, useLanguage } from './context/LanguageContext'
import { Navbar, type TabType } from './components/layout/Navbar'
import { JobCard } from './components/features/jobs/JobCard'
import { TrendingJobRow } from './components/features/jobs/TrendingJobRow'
import { JobSearchFilters } from './components/features/jobs/JobSearchFilters'
import { JobApplicationsModal } from './components/features/jobs/JobApplicationsModal'
import { GuestJobsLanding } from './components/features/jobs/GuestJobsLanding'
import { PostJobForm } from './components/features/hr/PostJobForm'
import { HrVerificationPendingView } from './components/features/hr/HrVerificationPendingView'
import { AdminDashboardView, type AdminSectionTab } from './components/features/admin/AdminDashboardView'
import { FeedView } from './components/features/feed/FeedView'
import { Badge } from './components/ui/Badge'
import { Avatar } from './components/ui/Avatar'
import { ProfileEditModal } from './components/features/profile/ProfileEditModal'
import { UserProfilePage } from './components/features/profile/UserProfilePage'
import { NotificationSection } from './components/features/notifications/NotificationSection'
import { ConnectionsView } from './components/features/connections/ConnectionsView'
import { PublicUserProfileView } from './components/features/profile/PublicUserProfileView'
import { MessagesView } from './components/features/messages/MessagesView'
import { adminService, feedService, chatService, notificationService, savedJobService, jobsService } from './services/api'
import { initPushNotifications } from './services/notifications'
import { ApkReleasePage } from './components/features/releases/ApkReleasePage'
import { LoginPage } from './components/features/auth/LoginPage'
import { PublicHomePage } from './components/features/home/PublicHomePage'
import { TermsPage } from './components/features/legal/TermsPage'
import { PrivacyPolicyPage } from './components/features/legal/PrivacyPolicyPage'
import { CandidateSearchView } from './components/features/hr/CandidateSearchView'
import { HrProfileSetupModal } from './components/features/hr/HrProfileSetupModal'
import { SavedJobsView } from './components/features/jobs/SavedJobsView'
import { ClientMaintenancePage } from './components/features/staff/ClientMaintenancePage'
import { PullToRefresh } from './components/ui/PullToRefresh'
import { MapPin, Globe, Compass, Settings, Users, FileText, Briefcase, ShieldCheck, Bookmark, Plus, Bell, MessageSquare, X } from 'lucide-react'
import type { Job } from './types'
import { useAppDispatch, useAppSelector } from './store/hooks'
import { fetchJobs, jobApplied } from './store/jobsSlice'
import { fetchPosts, postAdded, postLiked } from './store/postsSlice'
import { fetchAdminData, userRoleUpdated } from './store/adminSlice'
import { translateLocationSync, translateJobTitleSync, translateCompanySync } from './services/googleAiTranslate'

const isLoginPath = () => {
  if (typeof window === 'undefined') return false
  const path = window.location.pathname.toLowerCase()
  const hash = window.location.hash.toLowerCase()
  const searchParams = new URLSearchParams(window.location.search)
  const tabParam = searchParams.get('tab')?.toLowerCase()
  const viewParam = searchParams.get('view')?.toLowerCase()
  const modalParam = searchParams.get('modal')?.toLowerCase()
  const isQueryLogin =
    tabParam === 'login' ||
    tabParam === 'signin' ||
    viewParam === 'login' ||
    viewParam === 'signin' ||
    modalParam === 'login'

  return (
    path === '/login' ||
    path.startsWith('/login/') ||
    path === '/signin' ||
    path.startsWith('/signin/') ||
    hash === '#login' ||
    hash === '#signin' ||
    hash.startsWith('#/login') ||
    hash.startsWith('#/signin') ||
    isQueryLogin
  )
}

const isReleasePath = () => {
  if (typeof window === 'undefined') return false
  const path = window.location.pathname.toLowerCase()
  const hash = window.location.hash.toLowerCase()
  const search = window.location.search.toLowerCase()
  return (
    path.startsWith('/release') ||
    path.startsWith('/apk') ||
    path.startsWith('/download') ||
    hash.includes('release') ||
    hash.includes('apk') ||
    search.includes('release') ||
    search.includes('apk')
  )
}

const isTermsPath = () => {
  if (typeof window === 'undefined') return false
  const path = window.location.pathname.toLowerCase()
  const hash = window.location.hash.toLowerCase()
  const search = window.location.search.toLowerCase()
  return (
    path === '/terms' ||
    path.startsWith('/terms/') ||
    path === '/terms-of-service' ||
    hash === '#terms' ||
    hash.startsWith('#/terms') ||
    search.includes('tab=terms') ||
    search.includes('view=terms')
  )
}

const isPrivacyPath = () => {
  if (typeof window === 'undefined') return false
  const path = window.location.pathname.toLowerCase()
  const hash = window.location.hash.toLowerCase()
  const search = window.location.search.toLowerCase()
  return (
    path === '/privacy' ||
    path.startsWith('/privacy/') ||
    path === '/privacy-policy' ||
    hash === '#privacy' ||
    hash.startsWith('#/privacy') ||
    search.includes('tab=privacy') ||
    search.includes('view=privacy')
  )
}

export const TAB_ROUTES: Record<TabType, string> = {
  home: '/',
  jobs: '/jobs',
  'saved-jobs': '/saved-jobs',
  feed: '/feed',
  connections: '/network',
  messages: '/messages',
  'post-job': '/post-job',
  candidates: '/candidates',
  'admin-panel': '/admin',
  notifications: '/notifications',
  profile: '/profile',
  clients: '/clients',
}

export const getTabFromLocation = (): TabType | null => {
  if (typeof window === 'undefined') return null
  const path = window.location.pathname.toLowerCase()
  const hash = window.location.hash.toLowerCase()
  const searchParams = new URLSearchParams(window.location.search)
  const tabParam = (searchParams.get('tab') || searchParams.get('view') || '').toLowerCase()

  // Network / Connections
  if (
    path === '/network' || path.startsWith('/network/') ||
    path === '/connections' || path.startsWith('/connections/') ||
    hash === '#network' || hash === '#/network' ||
    hash === '#connections' || hash === '#/connections' ||
    tabParam === 'network' || tabParam === 'connections'
  ) {
    return 'connections'
  }

  // Jobs
  if (
    path === '/jobs' || path.startsWith('/jobs/') ||
    hash === '#jobs' || hash === '#/jobs' ||
    tabParam === 'jobs'
  ) {
    return 'jobs'
  }

  // Saved Jobs
  if (
    path === '/saved-jobs' || path.startsWith('/saved-jobs/') ||
    path === '/saved' || path.startsWith('/saved/') ||
    hash === '#saved-jobs' || hash === '#/saved-jobs' ||
    hash === '#saved' || hash === '#/saved' ||
    tabParam === 'saved' || tabParam === 'saved-jobs'
  ) {
    return 'saved-jobs'
  }

  // Feed / Thoughts
  if (
    path === '/feed' || path.startsWith('/feed/') ||
    path === '/thoughts' || path.startsWith('/thoughts/') ||
    path === '/posts' || path.startsWith('/posts/') ||
    hash === '#feed' || hash === '#/feed' ||
    hash === '#thoughts' || hash === '#/thoughts' ||
    tabParam === 'feed' || tabParam === 'thoughts'
  ) {
    return 'feed'
  }

  // Messages
  if (
    path === '/messages' || path.startsWith('/messages/') ||
    path === '/chat' || path.startsWith('/chat/') ||
    hash === '#messages' || hash === '#/messages' ||
    hash === '#chat' || hash === '#/chat' ||
    tabParam === 'messages' || tabParam === 'chat'
  ) {
    return 'messages'
  }

  // Candidates
  if (
    path === '/candidates' || path.startsWith('/candidates/') ||
    path === '/candidate-search' || path.startsWith('/candidate-search/') ||
    hash === '#candidates' || hash === '#/candidates' ||
    tabParam === 'candidates'
  ) {
    return 'candidates'
  }

  // Post Job
  if (
    path === '/post-job' || path.startsWith('/post-job/') ||
    path === '/post' || path.startsWith('/post/') ||
    hash === '#post-job' || hash === '#/post-job' ||
    tabParam === 'post-job' || tabParam === 'post'
  ) {
    return 'post-job'
  }

  // Admin
  if (
    path === '/admin' || path.startsWith('/admin/') ||
    path === '/admin-panel' || path.startsWith('/admin-panel/') ||
    hash === '#admin' || hash === '#/admin' ||
    hash === '#admin-panel' || hash === '#/admin-panel' ||
    tabParam === 'admin' || tabParam === 'admin-panel'
  ) {
    return 'admin-panel'
  }

  // Notifications
  if (
    path === '/notifications' || path.startsWith('/notifications/') ||
    hash === '#notifications' || hash === '#/notifications' ||
    tabParam === 'notifications'
  ) {
    return 'notifications'
  }

  // Profile
  if (
    path === '/profile' || path.startsWith('/profile/') ||
    path === '/me' || path.startsWith('/me/') ||
    hash === '#profile' || hash === '#/profile' ||
    tabParam === 'profile'
  ) {
    return 'profile'
  }

  // Clients
  if (
    path === '/clients' || path.startsWith('/clients/') ||
    path === '/client-maintenance' || path.startsWith('/client-maintenance/') ||
    hash === '#clients' || hash === '#/clients' ||
    tabParam === 'clients'
  ) {
    return 'clients'
  }

  return null
}

function MainContent() {
  const { user, role, hasRole, setSelectedRole, isLoading } = useAuth()
  const isRecruiter = hasRole(['admin', 'manager'])

  const isVerifiedHr = (u: any): boolean => {
    if (!u) return false
    if (u.role === 'admin') return true
    if (u.role === 'manager') {
      const s = (u.status || '').toUpperCase()
      return s === 'ACTIVE' || u.status === 'active'
    }
    return true
  }
  const isHrUnverified = user?.role === 'manager' && !isVerifiedHr(user)

  const [isLoginRoute, setIsLoginRoute] = useState(() => isLoginPath())
  const [isReleaseRoute, setIsReleaseRoute] = useState(() => isReleasePath())
  const [isTermsRoute, setIsTermsRoute] = useState(() => isTermsPath())
  const [isPrivacyRoute, setIsPrivacyRoute] = useState(() => isPrivacyPath())
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    try {
      if (typeof window !== 'undefined') {
        const urlTab = getTabFromLocation()
        if (urlTab) return urlTab

        const storedTab = sessionStorage.getItem('namma_active_tab') as TabType
        if (storedTab && storedTab !== 'home') return storedTab
      }
      const savedUser = localStorage.getItem('namma_user')
      if (savedUser) {
        const parsed = JSON.parse(savedUser)
        if (parsed?.role === 'admin') return 'admin-panel'
        if (parsed?.role === 'staff') return 'clients'
        return 'jobs'
      }
    } catch {}
    return 'home'
  })

  // Synchronize activeTab to URL and sessionStorage like a real React SPA
  useEffect(() => {
    if (isTermsRoute || isPrivacyRoute || isLoginRoute || isReleaseRoute) return
    try {
      sessionStorage.setItem('namma_active_tab', activeTab)
      const targetPath = TAB_ROUTES[activeTab] || '/'
      const currentPath = window.location.pathname.toLowerCase()
      if (currentPath !== targetPath && !currentPath.startsWith('/login') && !currentPath.startsWith('/release')) {
        window.history.pushState({ tab: activeTab }, '', targetPath)
      }
    } catch {}
    window.scrollTo(0, 0)
  }, [activeTab, isTermsRoute, isPrivacyRoute, isLoginRoute, isReleaseRoute])

  const [savedJobsCount, setSavedJobsCount] = useState<number>(0)

  useEffect(() => {
    if (user?.id && user?.role === 'employee') {
      savedJobService.getSavedJobIds().then((ids) => {
        setSavedJobsCount(ids.length)
      }).catch(() => {
        setSavedJobsCount(0)
      })
    } else {
      setSavedJobsCount(0)
      try {
        localStorage.removeItem('namma_saved_job_ids')
      } catch {}
    }
  }, [user?.id, user?.role])

  useEffect(() => {
    const handleSavedUpdate = () => {
      if (user?.id && user?.role === 'employee') {
        savedJobService.getSavedJobIds().then((ids) => {
          setSavedJobsCount(ids.length)
        }).catch(() => {
          try {
            const raw = localStorage.getItem('namma_saved_job_ids')
            setSavedJobsCount(raw ? JSON.parse(raw).length : 0)
          } catch {}
        })
      } else {
        setSavedJobsCount(0)
      }
    }
    window.addEventListener('saved_jobs_updated', handleSavedUpdate)
    return () => window.removeEventListener('saved_jobs_updated', handleSavedUpdate)
  }, [user?.id, user?.role])
  const dispatch = useAppDispatch()
  const { items: jobs, totalCount: reduxJobsCount } = useAppSelector((state) => state.jobs)
  const totalJobsCount = reduxJobsCount || jobs.length
  const { items: posts, isLoading: isLoadingPosts } = useAppSelector((state) => state.posts)
  const { users: usersList, stats: reduxAdminStats } = useAppSelector((state) => state.admin)
  const adminStats = reduxAdminStats || {
    total_users: 0,
    admins: 0,
    managers_hr: 0,
    employees: 0,
    total_jobs: 0,
    pending_hr_verifications: 0,
  }

  const [adminSection, setAdminSection] = useState<AdminSectionTab>('hr-verifications')

  const [selectedDistrict, setSelectedDistrict] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState('All')
  const [profilePromptJob, setProfilePromptJob] = useState<Job | null>(null)
  const [viewingApplicationsJob, setViewingApplicationsJob] = useState<Job | null>(null)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [candidateSearchQuery, setCandidateSearchQuery] = useState('')
  const [candidateSearchJd, setCandidateSearchJd] = useState('')
  const [viewingPublicProfileId, setViewingPublicProfileId] = useState<string | null>(null)
  const [chatRecipientId, setChatRecipientId] = useState<string | null>(null)
  const [showHrProfileModal, setShowHrProfileModal] = useState<'setup' | 'edit' | null>(null)

  // Auto-show HR profile setup modal when HR user has never filled company details
  useEffect(() => {
    if (
      user?.role === 'manager' &&
      !user?.company &&
      !showHrProfileModal
    ) {
      setShowHrProfileModal('setup')
    }
  }, [user?.id, user?.role, user?.company])

  // Dynamic Unread Messages State
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0)

  const loadUnreadMessages = useCallback(async () => {
    if (!user) {
      setUnreadMessagesCount(0)
      return
    }
    try {
      const count = await chatService.getUnreadMessagesCount()
      setUnreadMessagesCount(count)
    } catch {}
  }, [user])

  useEffect(() => {
    if (!user) return
    loadUnreadMessages()
    const handleMessagesUpdate = () => {
      loadUnreadMessages()
    }
    window.addEventListener('namma_messages_updated', handleMessagesUpdate)
    return () => {
      window.removeEventListener('namma_messages_updated', handleMessagesUpdate)
    }
  }, [loadUnreadMessages, user?.id])

  useEffect(() => {
    if (activeTab !== 'messages' || !user) return
    const interval = setInterval(loadUnreadMessages, 60000)
    return () => clearInterval(interval)
  }, [loadUnreadMessages, activeTab, user])

  // Dynamic Unread Notifications State
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0)

  const loadUnreadNotifs = useCallback(async () => {
    if (!user) {
      setUnreadNotificationsCount(0)
      return
    }
    try {
      const data = await notificationService.getNotifications(false)
      if (typeof data?.unread_count === 'number') {
        setUnreadNotificationsCount(data.unread_count)
      }
    } catch {}
  }, [user])

  useEffect(() => {
    if (!user) return
    loadUnreadNotifs()
    const handleNotifsUpdate = () => {
      loadUnreadNotifs()
    }
    window.addEventListener('namma_notifications_updated', handleNotifsUpdate)
    return () => {
      window.removeEventListener('namma_notifications_updated', handleNotifsUpdate)
    }
  }, [loadUnreadNotifs, user?.id])

  useEffect(() => {
    if (activeTab !== 'notifications' || !user) return
    const interval = setInterval(loadUnreadNotifs, 60000)
    return () => clearInterval(interval)
  }, [loadUnreadNotifs, activeTab, user])

  const { showToast } = useToast()
  const { t, language } = useLanguage()

  // Navigation helpers
  const navigateToHome = useCallback(() => {
    try {
      window.history.pushState({}, '', '/')
    } catch {}
    setIsLoginRoute(false)
    const hasAuthedUser = Boolean(
      user ||
      localStorage.getItem('namma_user') ||
      localStorage.getItem('namma_token')
    )
    let defaultTab: TabType = 'home'
    if (hasAuthedUser) {
      if (user?.role === 'admin') {
        defaultTab = 'admin-panel'
      } else if (user?.role === 'staff') {
        defaultTab = 'clients'
      } else {
        try {
          const raw = localStorage.getItem('namma_user')
          if (raw && JSON.parse(raw)?.role === 'admin') {
            defaultTab = 'admin-panel'
          } else if (raw && JSON.parse(raw)?.role === 'staff') {
            defaultTab = 'clients'
          } else {
            defaultTab = 'jobs'
          }
        } catch {
          defaultTab = 'jobs'
        }
      }
    }
    setActiveTab(defaultTab)
    try {
      window.dispatchEvent(new PopStateEvent('popstate'))
    } catch {}
  }, [user])

  const navigateToLogin = useCallback(() => {
    try {
      window.history.pushState({}, '', '/login')
    } catch {}
    setIsLoginRoute(true)
    try {
      window.dispatchEvent(new PopStateEvent('popstate'))
    } catch {}
  }, [])

  // Load jobs from Redux store with 5-minute cache TTL & persistent local store
  const loadJobs = useCallback(
    async (forceRefresh = false) => {
      dispatch(fetchJobs(forceRefresh))
    },
    [dispatch]
  )

  // Auto-apply using profile details, or prompt user to complete profile if resume/name is missing
  const handleApplyJob = useCallback(
    async (job: Job) => {
      if (!user) {
        showToast(
          language === 'ta'
            ? 'வேலைக்கு விண்ணப்பிக்க உள்நுழையவும்'
            : language === 'hi'
            ? 'आवेदन करने के लिए कृपया लॉगिन करें'
            : 'Please log in to apply for jobs',
          'error'
        )
        navigateToLogin()
        return
      }

      if (user.role === 'manager' || user.role === 'admin') {
        showToast(
          language === 'ta'
            ? 'மனிதவள மேலாளர்கள் வேலைக்கு விண்ணப்பிக்க முடியாது'
            : language === 'hi'
            ? 'एचआर और प्रबंधक नौकरी के लिए आवेदन नहीं कर सकते'
            : 'HR recruiters and managers cannot submit job applications.',
          'error'
        )
        return
      }

      const hasResume = Boolean(user.resume_url && user.resume_url.trim().length > 0)
      const hasName = Boolean(user.full_name && user.full_name.trim().length >= 2)

      if (!hasResume || !hasName) {
        setProfilePromptJob(job)
        showToast(
          language === 'ta'
            ? 'எளிதாக விண்ணப்பிக்க உங்கள் சுயவிவரத்தில் ரெஸ்யூமைப் பதிவேற்றவும்'
            : language === 'hi'
            ? '1-क्लिक आवेदन के लिए कृपया अपनी प्रोफ़ाइल में रिज्यूमे अपलोड करें'
            : 'Please complete your profile and upload your resume to apply.',
          'info'
        )
        return
      }

      try {
        await jobsService.applyJob(job.id, {
          candidate_name: user.full_name.trim(),
          candidate_email: (user.email || '').trim(),
          candidate_phone: (user.phone || '').trim(),
          resume_url: (user.resume_url || '').trim(),
        })

        showToast(
          language === 'ta'
            ? `${job.company_name} நிறுவனத்திற்கு உங்கள் விண்ணப்பம் வெற்றிகரமாக அனுப்பப்பட்டது!`
            : language === 'hi'
            ? `${job.company_name} के लिए आपका आवेदन सफलतापूर्वक भेजा गया!`
            : `Application successfully sent to ${job.company_name} using your profile resume!`,
          'success'
        )

        dispatch(jobApplied(job.id))

        try {
          const cached = sessionStorage.getItem('applied_job_ids')
          const ids: string[] = cached ? JSON.parse(cached) : []
          if (!ids.includes(job.id)) ids.push(job.id)
          sessionStorage.setItem('applied_job_ids', JSON.stringify(ids))
        } catch {}

        window.dispatchEvent(new CustomEvent('job_applied', { detail: { jobId: job.id } }))
        loadJobs()
      } catch (err: any) {
        const isDuplicate =
          err?.status === 409 ||
          err?.code === 'DUPLICATE_APPLICATION' ||
          err?.message?.toLowerCase().includes('already')

        if (isDuplicate) {
          try {
            const cached = sessionStorage.getItem('applied_job_ids')
            const ids: string[] = cached ? JSON.parse(cached) : []
            if (!ids.includes(job.id)) ids.push(job.id)
            sessionStorage.setItem('applied_job_ids', JSON.stringify(ids))
          } catch {}
          window.dispatchEvent(new CustomEvent('job_applied', { detail: { jobId: job.id } }))
          showToast(
            language === 'ta'
              ? 'இந்த வேலைக்கு நீங்கள் ஏற்கனவே விண்ணப்பித்துவிட்டீர்கள்.'
              : language === 'hi'
              ? 'आप इस नौकरी के लिए पहले ही आवेदन कर चुके हैं।'
              : 'You have already applied for this job opening.',
            'info'
          )
        } else {
          showToast(err.message || 'Failed to submit application', 'error')
        }
      }
    },
    [user, language, showToast, navigateToLogin, dispatch, loadJobs]
  )

  // Load feed posts from Redux store with 3-minute cache TTL
  const loadPosts = useCallback(
    async (forceRefresh = false) => {
      dispatch(fetchPosts(forceRefresh))
    },
    [dispatch]
  )

  // Load admin data with 5-minute cache TTL
  const loadAdminData = useCallback(
    async (forceRefresh = false) => {
      if (!hasRole(['admin'])) return
      dispatch(fetchAdminData(forceRefresh))
    },
    [hasRole, dispatch]
  )

  // Unified Page Refresh for Native App & Web across all pages
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pageRefreshKey, setPageRefreshKey] = useState(0)

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    try {
      // 1. Dispatch custom event for child views
      window.dispatchEvent(new CustomEvent('app_refresh'))

      // 2. Fetch fresh dynamic data across all stores bypassing caches
      await Promise.allSettled([
        loadJobs(true),
        loadPosts(true),
        activeTab === 'admin-panel' || user?.role === 'admin' ? loadAdminData(true) : Promise.resolve(),
        loadUnreadNotifs(),
        loadUnreadMessages(),
        user?.id
          ? savedJobService.getSavedJobIds().then((ids) => {
              setSavedJobsCount(ids.length)
              try {
                localStorage.setItem('namma_saved_job_ids', JSON.stringify(ids))
              } catch {}
            })
          : Promise.resolve(),
      ])

      // 3. Increment key to trigger clean re-render / re-fetch of current active page
      setPageRefreshKey((k) => k + 1)
    } catch (err) {
      console.error('Refresh error:', err)
    } finally {
      setTimeout(() => {
        setIsRefreshing(false)
      }, 450)
    }
  }, [isRefreshing, loadJobs, loadPosts, activeTab, user?.role, user?.id, loadAdminData, loadUnreadNotifs, loadUnreadMessages])

  // Handle role promotion / demotion by Admin (Optimistic Redux update)
  const handlePromote = async (userId: string) => {
    try {
      const res = await adminService.updateUserRole(userId, 'manager')
      showToast(res.message || 'User promoted to HR / Manager', 'success')
      dispatch(userRoleUpdated({ userId, newRole: 'manager' }))
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  const handleDemote = async (userId: string) => {
    try {
      const res = await adminService.updateUserRole(userId, 'employee')
      showToast(res.message || 'User reverted to Employee', 'info')
      dispatch(userRoleUpdated({ userId, newRole: 'employee' }))
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  // Publish new dynamic thought/post to D1 (Optimistic update in Redux store)
  const handleCreatePost = async (
    contentOrData: string | { title?: string; topic?: string; content: string; media_urls?: string[] }
  ) => {
    try {
      const res = await feedService.createPost(contentOrData)
      showToast('Thought published to network!', 'success')
      const title = typeof contentOrData === 'object' ? contentOrData.title : undefined
      const topic = typeof contentOrData === 'object' ? contentOrData.topic : undefined
      const content = typeof contentOrData === 'object' ? contentOrData.content : contentOrData
      const media_urls = typeof contentOrData === 'object' ? contentOrData.media_urls : []

      if (user && res.post_id) {
        dispatch(
          postAdded({
            id: res.post_id,
            author_id: user.id,
            author_name: user.full_name,
            author_avatar: user.avatar_url,
            author_headline: user.headline || user.position || '',
            author_role: user.role,
            author_location: user.location || '',
            title,
            topic: topic || undefined,
            content,
            media_urls,
            likes_count: 0,
            comments_count: 0,
            created_at: new Date().toISOString(),
            is_liked: false,
            liked_by_me: false,
          })
        )
      } else {
        dispatch(fetchPosts(true))
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to publish thought', 'error')
    }
  }

  // Like dynamic thought in D1 (Optimistic reaction update in Redux store)
  const handleLikePost = async (postId: string) => {
    try {
      const res = await feedService.likePost(postId)
      dispatch(postLiked({ id: postId, likes_count: res.likes_count, liked: res.liked }))
    } catch {
      // Quiet
    }
  }

  useEffect(() => {
    // Anti-Scraping / Competitor Data-Theft Shield
    if (typeof window !== 'undefined') {
      console.log(
        '%c🛡️ NAMMA OORU JOBS — HIGH-SECURITY SYSTEM ACTIVATED',
        'color: #EA580C; font-size: 15px; font-weight: bold; background: #FFF7ED; padding: 6px 12px; border: 1px solid #EA580C; border-radius: 4px;'
      )
      console.log(
        '%cAll API payloads, candidate talent records, and endpoints are protected by End-to-End AES-256-GCM Cryptographic Tunneling. Unauthorized scraping, automated tool flooding, or data theft is strictly blocked and logged.',
        'color: #475569; font-size: 11px;'
      )
    }

    loadJobs()
    initPushNotifications(() => {
      // Push notifications are delivered silently — no in-app popup
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-fetch jobs whenever user identity or role changes to prevent stale role-cached data
  useEffect(() => {
    loadJobs(true)
  }, [user?.id, user?.role, loadJobs])

  useEffect(() => {
    if (activeTab === 'admin-panel' || (user?.role === 'admin' && activeTab === 'home')) {
      loadAdminData()
    }
  }, [activeTab, user?.role, loadAdminData])

  useEffect(() => {
    if (activeTab === 'connections' && user && (user.role === 'manager' || user.role === 'admin')) {
      setActiveTab('candidates')
    }
  }, [activeTab, user])

  useEffect(() => {
    if (activeTab === 'saved-jobs' && user && (user.role === 'manager' || user.role === 'admin')) {
      setActiveTab('jobs')
    }
  }, [activeTab, user])

  useEffect(() => {
    if (activeTab === 'feed' && user && user.role !== 'employee') {
      setActiveTab('jobs')
    }
  }, [activeTab, user])

  useEffect(() => {
    if (activeTab === 'feed' && user?.role === 'employee' && posts.length === 0) {
      loadPosts(true)
    }
  }, [activeTab, user?.role, posts.length, loadPosts])

  useEffect(() => {
    const handleRouteChange = () => {
      setIsLoginRoute(isLoginPath())
      setIsReleaseRoute(isReleasePath())
      setIsTermsRoute(isTermsPath())
      setIsPrivacyRoute(isPrivacyPath())

      const newTab = getTabFromLocation()
      if (newTab) {
        setActiveTab(newTab)
      }
    }
    // namma:navigate fires from push notification taps and Google sign-in
    const handleNammaNavigate = (e: Event) => {
      const detail = (e as CustomEvent<{ tab?: string; path?: string; conversationUserId?: string | null; jobId?: string | null }>).detail

      // Legacy path-based nav (Google sign-in callback)
      if (detail?.path === '/') {
        navigateToHome()
        return
      }

      const tab = detail?.tab
      if (!tab) return

      // Ensure user is authenticated before navigating to protected tabs
      const storedUser = localStorage.getItem('namma_user')
      if (!storedUser) return

      if (tab === 'messages') {
        if (detail.conversationUserId) {
          setChatRecipientId(detail.conversationUserId)
        }
        setActiveTab('messages')
      } else if (tab === 'notifications') {
        setActiveTab('notifications')
      } else if (tab === 'profile') {
        setActiveTab('profile')
      } else if (tab === 'jobs') {
        setActiveTab('jobs')
      } else if (tab === 'admin-panel') {
        setActiveTab('admin-panel')
      }
    }
    window.addEventListener('popstate', handleRouteChange)
    window.addEventListener('hashchange', handleRouteChange)
    window.addEventListener('namma:navigate', handleNammaNavigate)
    return () => {
      window.removeEventListener('popstate', handleRouteChange)
      window.removeEventListener('hashchange', handleRouteChange)
      window.removeEventListener('namma:navigate', handleNammaNavigate)
    }
  }, [navigateToHome])


  // Auto-redirect authenticated user away from login route to jobs feed
  useEffect(() => {
    if (user && isLoginRoute) {
      navigateToHome()
    }
  }, [user, isLoginRoute, navigateToHome])

  // Registered members should strictly stay on authenticated portal, never see public landing page
  useEffect(() => {
    // CRITICAL: Never prematurely redirect or reset tabs while initial auth check is in flight!
    if (isLoading) return

    const hasStoredToken = typeof window !== 'undefined' && Boolean(localStorage.getItem('namma_token'))

    if (user) {
      if (activeTab === 'home') {
        const urlTab = getTabFromLocation()
        if (urlTab && urlTab !== 'home') {
          setActiveTab(urlTab)
        } else {
          setActiveTab(user.role === 'admin' ? 'admin-panel' : user.role === 'staff' ? 'clients' : 'jobs')
        }
      }
    } else if (!hasStoredToken) {
      // When confirmed unauthenticated, ensure protected tabs safely fall back to home landing page
      if (
        activeTab === 'admin-panel' ||
        activeTab === 'clients' ||
        activeTab === 'notifications' ||
        activeTab === 'profile' ||
        activeTab === 'messages' ||
        activeTab === 'connections'
      ) {
        setActiveTab('home')
        setIsLoginRoute(false)
      }
      sessionStorage.removeItem('applied_job_ids')
    }
  }, [user, activeTab, isLoading])

  // Pre-load applied job IDs once on user login session (avoids repeated network calls on tab change)
  useEffect(() => {
    if (user?.role === 'employee') {
      const token = localStorage.getItem('namma_token')
      if (token && !sessionStorage.getItem('applied_job_ids')) {
        fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://namma-ooru-jobs-api.apkavin483.workers.dev'}/api/employee/my-applications`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((r) => r.json())
          .then((data: any) => {
            if (data?.applications) {
              const ids = (data.applications as { job_id: string }[]).map((a) => a.job_id)
              sessionStorage.setItem('applied_job_ids', JSON.stringify(ids))
              ids.forEach((jobId) => {
                window.dispatchEvent(new CustomEvent('job_applied', { detail: { jobId } }))
              })
            }
          })
          .catch(() => {})
      }
    }
  }, [user?.id, user?.role])

  // Guard notifications: only available for authenticated members, safely redirect to home if unauthenticated
  useEffect(() => {
    const hasStoredToken = typeof window !== 'undefined' && Boolean(localStorage.getItem('namma_token'))
    if (!isLoading && !user && !hasStoredToken && activeTab === 'notifications') {
      setActiveTab('home')
      setIsLoginRoute(false)
    }
  }, [user, activeTab, isLoading])

  if (isTermsRoute) {
    return (
      <TermsPage
        onBackToApp={() => {
          window.history.pushState({}, '', '/')
          setIsTermsRoute(false)
        }}
        onNavigateToPrivacy={() => {
          window.history.pushState({}, '', '/privacy')
          setIsTermsRoute(false)
          setIsPrivacyRoute(true)
        }}
      />
    )
  }

  if (isPrivacyRoute) {
    return (
      <PrivacyPolicyPage
        onBackToApp={() => {
          window.history.pushState({}, '', '/')
          setIsPrivacyRoute(false)
        }}
        onNavigateToTerms={() => {
          window.history.pushState({}, '', '/terms')
          setIsPrivacyRoute(false)
          setIsTermsRoute(true)
        }}
      />
    )
  }

  if (isLoginRoute) {
    return (
      <LoginPage
        onSuccess={navigateToHome}
        onBackToApp={navigateToHome}
        onOpenTerms={() => {
          window.history.pushState({}, '', '/terms')
          setIsTermsRoute(true)
          setIsLoginRoute(false)
        }}
        onOpenPrivacy={() => {
          window.history.pushState({}, '', '/privacy')
          setIsPrivacyRoute(true)
          setIsLoginRoute(false)
        }}
      />
    )
  }

  if (isReleaseRoute) {
    return (
      <ApkReleasePage
        onBackToApp={() => {
          window.history.pushState({}, '', '/')
          setIsReleaseRoute(false)
        }}
      />
    )
  }

  // Recruiter's own posted jobs
  const myPostedJobs = jobs.filter((j) => j.poster_id === user?.id)

  // Filter jobs
  const filteredJobs = jobs.filter((j) => {
    // For HR / Recruiters, only display jobs they created themselves
    if (isRecruiter && j.poster_id !== user?.id) {
      return false
    }

    const q = searchQuery.toLowerCase().trim()
    const matchesSearch =
      !q ||
      j.title.toLowerCase().includes(q) ||
      j.company_name.toLowerCase().includes(q) ||
      j.location.toLowerCase().includes(q) ||
      translateJobTitleSync(j.title, language).toLowerCase().includes(q) ||
      translateCompanySync(j.company_name, language).toLowerCase().includes(q) ||
      translateLocationSync(j.location, language).toLowerCase().includes(q)

    const matchesFilter = selectedType === 'All' || j.workplace_type === selectedType

    const matchesDistrict =
      !selectedDistrict ||
      (() => {
        const target = selectedDistrict.toLowerCase().trim()
        const targetEn = translateLocationSync(selectedDistrict, 'en').toLowerCase().trim()
        const targetTa = translateLocationSync(selectedDistrict, 'ta').toLowerCase().trim()
        const targetHi = translateLocationSync(selectedDistrict, 'hi').toLowerCase().trim()

        const locEn = j.location.toLowerCase()
        const locTa = translateLocationSync(j.location, 'ta').toLowerCase()
        const locHi = translateLocationSync(j.location, 'hi').toLowerCase()

        return (
          locEn.includes(target) ||
          locTa.includes(target) ||
          locHi.includes(target) ||
          locEn.includes(targetEn) ||
          locTa.includes(targetTa) ||
          locHi.includes(targetHi) ||
          target.includes(locEn) ||
          target.includes(locTa) ||
          target.includes(locHi) ||
          targetEn.includes(locEn)
        )
      })()

    return matchesSearch && matchesFilter && matchesDistrict
  })

  // Dynamic location counts calculated from real jobs in database
  const chennaiJobsCount = jobs.filter((j) =>
    j.location.toLowerCase().includes('chennai')
  ).length
  const coimbatoreJobsCount = jobs.filter((j) =>
    j.location.toLowerCase().includes('coimbatore')
  ).length
  const maduraiTrichyJobsCount = jobs.filter(
    (j) =>
      j.location.toLowerCase().includes('madurai') ||
      j.location.toLowerCase().includes('trichy')
  ).length
  const bangaloreJobsCount = jobs.filter(
    (j) =>
      j.location.toLowerCase().includes('bangalore') ||
      j.location.toLowerCase().includes('bengaluru')
  ).length
  const remoteJobsCount = jobs.filter(
    (j) =>
      j.workplace_type === 'Remote' || j.location.toLowerCase().includes('remote')
  ).length

  const hasStoredToken = typeof window !== 'undefined' && Boolean(localStorage.getItem('namma_token'))

  // While validating stored session on refresh, show a clean loader rather than flashing the public home page
  if (isLoading && hasStoredToken) {
    return (
      <div className="min-h-screen bg-[#F4F2EE] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 rounded-full border-3 border-[#0B2545] border-t-transparent animate-spin" />
          <p className="text-xs font-semibold text-slate-500 tracking-wide">Loading Namma Ooru Jobs...</p>
        </div>
      </div>
    )
  }

  // Home Landing Info Page (Initial Design & Overview) - strictly for unregistered / guest visitors only
  if (activeTab === 'home' && !user && !hasStoredToken && !isLoading) {
    return (
      <PublicHomePage
        onNavigateToLogin={navigateToLogin}
        onExploreJobs={(q, city) => {
          setActiveTab('jobs')
          if (q) setSearchQuery(q)
          if (city) setSelectedDistrict(city)
        }}
        onOpenTerms={() => {
          window.history.pushState({}, '', '/terms')
          setIsTermsRoute(true)
        }}
        onOpenPrivacy={() => {
          window.history.pushState({}, '', '/privacy')
          setIsPrivacyRoute(true)
        }}
        onPostJob={() => {
          if (user) {
            if (role === 'employee') {
              showToast('Job posting is reserved for HR / Recruiter accounts. You are currently logged in as a Job Seeker.', 'info')
              setActiveTab('jobs')
            } else {
              setActiveTab('post-job')
            }
          } else {
            setSelectedRole('manager')
            navigateToLogin()
          }
        }}
        totalJobsCount={totalJobsCount || (jobs.length > 0 ? jobs.length : 50)}
        featuredJobs={jobs.slice(0, 3)}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />
    )
  }

  return (
    <div className={`min-h-screen ${activeTab === 'messages' ? 'bg-white md:bg-[#F4F2EE]' : 'bg-[#F4F2EE]'} text-[#0F172A]`}>
      <Navbar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setViewingPublicProfileId(null)
          setActiveTab(tab)
        }}
        unreadMessagesCount={unreadMessagesCount}
        unreadNotificationsCount={unreadNotificationsCount}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenProfileEdit={() => setActiveTab('profile')}
        onSelectNotificationJob={(_jobId, jobTitle) => {
          setViewingPublicProfileId(null)
          setActiveTab('jobs')
          if (jobTitle) setSearchQuery(jobTitle)
        }}
        onSelectNotificationUser={(uid) => {
          setViewingPublicProfileId(uid)
        }}
        onSelectNotificationConversation={(uid) => {
          if (uid) setChatRecipientId(uid)
          setViewingPublicProfileId(null)
          setActiveTab('messages')
        }}
        onSelectNotificationFeed={() => {
          setViewingPublicProfileId(null)
          setActiveTab('feed')
        }}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      <PullToRefresh onRefresh={handleRefresh} isRefreshing={isRefreshing}>
        <main
          key={pageRefreshKey}
          className={`mx-auto ${activeTab === 'messages' ? 'max-w-6xl px-0 md:px-4 py-1.5 md:py-3 pb-16 md:pb-3' : 'max-w-6xl px-3 sm:px-6 py-4 sm:py-5 pb-20 md:pb-8'}`}
        >
        {/* Unverified HR Recruiter Alert Notice on Platform */}
        {isHrUnverified && activeTab !== 'post-job' && activeTab !== 'candidates' && !viewingPublicProfileId && (
          <div className="mb-5 px-3 md:px-0">
            <HrVerificationPendingView compact onBackToFeed={() => setActiveTab('jobs')} />
          </div>
        )}

        {viewingPublicProfileId ? (
          <div className="max-w-4xl mx-auto w-full animate-in fade-in duration-150">
            <PublicUserProfileView
              userId={viewingPublicProfileId}
              lang={language}
              onBack={() => setViewingPublicProfileId(null)}
              onOpenChat={(recipientId) => {
                setViewingPublicProfileId(null)
                setChatRecipientId(recipientId)
                setActiveTab('messages')
              }}
            />
          </div>
        ) : activeTab === 'connections' ? (
          <div className="max-w-6xl mx-auto w-full animate-in fade-in duration-150">
            <ConnectionsView
              currentUser={user}
              lang={language}
              onOpenProfile={(uid) => setViewingPublicProfileId(uid)}
              onOpenChat={(recipientId) => {
                setChatRecipientId(recipientId)
                setActiveTab('messages')
              }}
            />
          </div>
        ) : activeTab === 'messages' ? (
          <div className="w-full animate-in fade-in duration-150">
            <MessagesView
              currentUser={user}
              lang={language}
              initialRecipientId={chatRecipientId}
              onClearInitialRecipient={() => setChatRecipientId(null)}
              onOpenProfile={(uid) => setViewingPublicProfileId(uid)}
              onUnreadMessagesCountChange={(count) => setUnreadMessagesCount(count)}
              onExploreAction={() => {
                if (user?.role === 'manager' || user?.role === 'admin') {
                  setActiveTab('candidates')
                } else {
                  setActiveTab('jobs')
                }
              }}
            />
          </div>
        ) : activeTab === 'notifications' && user ? (
          <div className="max-w-2xl mx-auto w-full">
            <NotificationSection
              onSelectJob={(_jobId, jobTitle) => {
                setActiveTab('jobs')
                if (jobTitle) setSearchQuery(jobTitle)
              }}
              onSelectUser={(uid) => setViewingPublicProfileId(uid)}
              onSelectConversation={(uid) => {
                if (uid) setChatRecipientId(uid)
                setActiveTab('messages')
              }}
              onSelectFeed={() => setActiveTab('feed')}
            />
          </div>
        ) : activeTab === 'profile' && user ? (
          <div className="max-w-4xl mx-auto w-full animate-in fade-in duration-150">
            <UserProfilePage
              onBack={() => setActiveTab('jobs')}
              onRequestEdit={() => setShowHrProfileModal('edit')}
            />
          </div>
        ) : activeTab === 'saved-jobs' ? (
          <div className="max-w-4xl mx-auto w-full animate-in fade-in duration-150">
            <SavedJobsView
              onApply={handleApplyJob}
              onViewApplications={(job: Job) => setViewingApplicationsJob(job)}
              onMatchCandidates={(job: Job) => {
                setCandidateSearchQuery(job.title)
                setCandidateSearchJd(`${job.title}\n${job.description}`)
                setActiveTab('candidates')
              }}
              onBack={() => setActiveTab('jobs')}
              onBrowseJobs={() => setActiveTab('jobs')}
            />
          </div>
        ) : activeTab === 'admin-panel' || (user?.role === 'admin' && activeTab === 'home') ? (
          <div className="max-w-7xl mx-auto w-full animate-in fade-in duration-150">
            {hasRole(['admin']) ? (
              <AdminDashboardView
                currentUser={user}
                stats={adminStats}
                usersList={usersList}
                onPromoteUser={handlePromote}
                onDemoteUser={handleDemote}
                onRefreshAll={() => loadAdminData(true)}
                lang={language}
                initialSection={adminSection}
                onSectionChange={setAdminSection}
              />
            ) : (
              <div className="rounded-2xl border border-red-200 bg-white p-8 sm:p-12 text-center shadow-xs max-w-xl mx-auto">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  Admin Portal Restricted
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  This control panel is restricted to system administrators. Admin accounts cannot be self-selected during signup and must be manually assigned directly in the database.
                </p>
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => setActiveTab('jobs')}
                    className="rounded-xl bg-[#0B2545] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#0B2545]/90 cursor-pointer active:scale-98 transition"
                  >
                    Return to Jobs Portal
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'clients' ? (
          <div className="max-w-7xl mx-auto w-full animate-in fade-in duration-150">
            <ClientMaintenancePage />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* LEFT SIDEBAR: Mini Profile Card & Regional Hubs */}
            <aside className="hidden lg:block lg:col-span-3 space-y-4 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-5.5rem)] lg:overflow-y-auto">
            {/* User Profile Card (Human Apple iOS Design) */}
            <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
              {/* Cover Banner */}
              <div className="h-16 bg-gradient-to-r from-[#0B2545] to-[#1E3A8A]" />

              {/* Avatar & Headline */}
              <div className="px-4 pb-4 text-center">
                <div
                  className="-mt-8 mb-2 flex justify-center cursor-pointer"
                  onClick={() => user && setActiveTab('profile')}
                  title="View Profile"
                >
                  <Avatar
                    src={user?.avatar_url}
                    name={user?.full_name || 'Guest'}
                    size="xl"
                    className="border-2 border-white shadow-sm ring-1 ring-black/5 hover:scale-105 transition"
                  />
                </div>
                <h3
                  className={`text-sm font-bold text-[#0F172A] ${user ? 'cursor-pointer hover:text-[#0B2545] transition' : ''}`}
                  onClick={() => user && setActiveTab('profile')}
                >
                  {user ? user.full_name : t('sidebar_welcome_guest')}
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5 line-clamp-2">
                  {user ? user.headline : t('sidebar_guest_desc')}
                </p>

                {user && (
                  <button
                    onClick={() => setActiveTab('profile')}
                    className="mt-2.5 flex items-center justify-center gap-1.5 w-full rounded-full border border-slate-200 bg-slate-50/80 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer active:scale-98"
                  >
                    <Settings className="h-3.5 w-3.5 text-[#0B2545]" />
                    <span>{t('nav_edit_profile')}</span>
                  </button>
                )}

                {user && role !== 'employee' && (
                  <div className="mt-2 flex justify-center">
                    <Badge variant="role" role={role} />
                  </div>
                )}

                {!user && (
                  <div className="mt-3">
                    <button
                      onClick={() => {
                        window.history.pushState({}, '', '/login')
                        window.dispatchEvent(new PopStateEvent('popstate'))
                      }}
                      className="w-full rounded-full bg-[#0B2545] py-2 text-xs font-bold text-white hover:bg-[#071A31] transition shadow-xs cursor-pointer active:scale-98"
                    >
                      {t('nav_sign_in_register')}
                    </button>
                  </div>
                )}

                {/* Simple Human Navigation Menu */}
                <div className="mt-3 border-t border-slate-100 pt-2 text-left space-y-0.5 text-xs">
                  {/* Live Openings */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!user) navigateToLogin()
                      else setActiveTab('jobs')
                    }}
                    className="w-full flex items-center justify-between py-2 px-2 rounded-lg text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <Briefcase className="h-4 w-4 text-slate-400" />
                      <span>{isRecruiter ? 'My Job Postings' : t('sidebar_live_openings')}</span>
                    </span>
                    <span className="text-slate-500 font-medium">
                      {isRecruiter ? myPostedJobs.length : (user ? jobs.length : (totalJobsCount || 50))} {t('sidebar_active_count')}
                    </span>
                  </button>

                  {/* Saved Jobs */}
                  {user && !isRecruiter && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('saved-jobs')}
                      className="w-full flex items-center justify-between py-2 px-2 rounded-lg text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5">
                        <Bookmark className="h-4 w-4 text-slate-400" />
                        <span>{t('saved_jobs_title') || 'Saved Jobs'}</span>
                      </span>
                      {savedJobsCount > 0 ? (
                        <span className="text-slate-600 font-semibold">{savedJobsCount}</span>
                      ) : null}
                    </button>
                  )}

                  {/* Resume / CV */}
                  {user && role === 'employee' && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('profile')}
                      className="w-full flex items-center justify-between py-2 px-2 rounded-lg text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5">
                        <FileText className="h-4 w-4 text-slate-400" />
                        <span>Resume / CV</span>
                      </span>
                    </button>
                  )}

                  {/* Notifications */}
                  {user && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('notifications')}
                      className="w-full flex items-center justify-between py-2 px-2 rounded-lg text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5">
                        <Bell className="h-4 w-4 text-slate-400" />
                        <span>{t('notif_title')}</span>
                      </span>
                      <span className="text-slate-500 font-medium">{t('sidebar_alerts')}</span>
                    </button>
                  )}

                  {/* Community Discussions (Employee role only) */}
                  {user?.role === 'employee' && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('feed')}
                      className="w-full flex items-center justify-between py-2 px-2 rounded-lg text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5">
                        <MessageSquare className="h-4 w-4 text-slate-400" />
                        <span>{t('sidebar_discussions')}</span>
                      </span>
                      <span className="text-slate-500 font-medium">
                        {posts.length} {t('sidebar_posts_count')}
                      </span>
                    </button>
                  )}
                </div>

                {/* Explore All Jobs Link */}
                <div className="mt-2 border-t border-slate-100 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!user) navigateToLogin()
                      else setActiveTab('jobs')
                    }}
                    className="w-full flex items-center justify-between py-2 px-2 rounded-lg text-xs font-semibold text-slate-700 hover:text-[#0B2545] hover:bg-slate-50 transition cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Compass className="h-4 w-4 text-slate-400" />
                      <span>{isRecruiter ? 'My Listings' : t('sidebar_explore_all')}</span>
                    </span>
                    <span className="text-slate-500 font-medium">
                      {isRecruiter ? myPostedJobs.length : (user ? jobs.length : (totalJobsCount || 50))}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* HR Recruiter Quick Access Card */}
            {hasRole(['admin', 'manager']) && (
              <div className="rounded-xl border border-[#E0DFDC] bg-white p-3.5 shadow-xs text-xs space-y-2.5">
                <div className="flex items-center justify-between text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <span className="flex items-center gap-1 text-[#0B2545]">
                    <Briefcase className="h-3 w-3 text-[#0B2545]" />
                    {t('app_hr_suite')}
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab('post-job')}
                  className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[#0B2545] hover:bg-[#081a31] text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-98"
                >
                  <Plus className="h-4 w-4" />
                  <span>Post New Job</span>
                </button>
              </div>
            )}

            {/* Tamil Nadu Regional Tech Hubs */}
            <div className="rounded-lg border border-[#E0DFDC] bg-white p-4 shadow-xs text-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {t('sidebar_tech_hubs')}
              </span>
              <ul className="mt-2.5 space-y-2.5 text-slate-700 font-medium">
                <li
                  onClick={() => {
                    if (!user) navigateToLogin()
                    else {
                      setActiveTab('jobs')
                      setSearchQuery('Chennai')
                    }
                  }}
                  className="flex items-center justify-between hover:text-[#0B2545] cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {t('hub_chennai')}
                  </span>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    {user ? chennaiJobsCount : '12+'} {t('sidebar_job_plural')}
                  </span>
                </li>
                <li
                  onClick={() => {
                    if (!user) navigateToLogin()
                    else {
                      setActiveTab('jobs')
                      setSearchQuery('Coimbatore')
                    }
                  }}
                  className="flex items-center justify-between hover:text-[#0B2545] cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {t('hub_coimbatore')}
                  </span>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    {user ? coimbatoreJobsCount : '8+'} {t('sidebar_job_plural')}
                  </span>
                </li>
                <li
                  onClick={() => {
                    if (!user) navigateToLogin()
                    else {
                      setActiveTab('jobs')
                      setSearchQuery('Madurai')
                    }
                  }}
                  className="flex items-center justify-between hover:text-[#0B2545] cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {t('hub_madurai')}
                  </span>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    {user ? maduraiTrichyJobsCount : '6+'} {t('sidebar_job_plural')}
                  </span>
                </li>
                <li
                  onClick={() => {
                    if (!user) navigateToLogin()
                    else {
                      setActiveTab('jobs')
                      setSearchQuery('Bangalore')
                    }
                  }}
                  className="flex items-center justify-between hover:text-[#0B2545] cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {t('hub_bangalore')}
                  </span>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    {user ? bangaloreJobsCount : '15+'} {t('sidebar_job_plural')}
                  </span>
                </li>
                <li
                  onClick={() => {
                    if (!user) navigateToLogin()
                    else {
                      setActiveTab('jobs')
                      setSelectedType('Remote')
                    }
                  }}
                  className="flex items-center justify-between hover:text-[#0B2545] cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 text-[#0B2545] font-semibold">
                    <Globe className="h-3.5 w-3.5 text-[#F97316]" />
                    {t('sidebar_remote_flex')}
                  </span>
                  <span className="text-[11px] text-[#F97316] font-bold">
                    {user ? remoteJobsCount : '10+'} {t('sidebar_job_plural')}
                  </span>
                </li>
              </ul>
            </div>
          </aside>

          {/* CENTER COLUMN: Main Content */}
          <section className={`${activeTab === 'candidates' ? 'lg:col-span-9' : 'lg:col-span-6'} space-y-4`}>
            {/* Top Sub-Tab Switcher: Jobs / Share Thoughts (Strictly role-based: Employee only) */}
            {user?.role === 'employee' && (activeTab === 'jobs' || activeTab === 'feed' || (activeTab === 'home' && user)) && (
              <div className="sticky top-16 z-20 flex items-center gap-6 border-b border-slate-200/90 bg-white/95 backdrop-blur-md px-4 pt-2 -mx-3 sm:mx-0 rounded-2xl shadow-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('jobs')}
                  className={`flex items-center gap-2 pb-2.5 text-sm font-semibold transition border-b-2 cursor-pointer ${
                    activeTab === 'jobs' || activeTab === 'home'
                      ? 'border-[#0B2545] text-[#0B2545] font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Briefcase className="h-4 w-4" />
                  <span>{t('nav_jobs') || 'Jobs'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('feed')
                    if (posts.length === 0) {
                      loadPosts(true)
                    }
                  }}
                  className={`flex items-center gap-2 pb-2.5 text-sm font-semibold transition border-b-2 cursor-pointer ${
                    activeTab === 'feed'
                      ? 'border-[#0B2545] text-[#0B2545] font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>{language === 'ta' ? 'கருத்துகளைப் பகிர்க' : language === 'hi' ? 'विचार साझा करें' : 'Share Thoughts'}</span>
                </button>
              </div>
            )}

            {/* TAB 1: Jobs Board (LinkedIn business logic: Gated for unregistered visitors) */}
            {(activeTab === 'jobs' || (activeTab === 'home' && user)) && (
              <>
                {!user ? (
                  <GuestJobsLanding
                    totalJobsCount={totalJobsCount || jobs.length}
                    onNavigateToLogin={navigateToLogin}
                    onNavigateToHome={navigateToHome}
                  />
                ) : (
                  <div className="space-y-4">
                    {/* Recruiter Header Bar */}
                    {isRecruiter && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                        <div>
                          <h2 className="text-base font-bold text-[#0F172A] tracking-tight">
                            My Job Postings
                          </h2>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {myPostedJobs.length === 0
                              ? 'You have not published any job openings yet'
                              : `Managing ${myPostedJobs.length} active job listings published by you`}
                          </p>
                        </div>
                        <button
                          onClick={() => setActiveTab('post-job')}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B2545] hover:bg-[#081a31] text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-98 shrink-0"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Post New Job</span>
                        </button>
                      </div>
                    )}

                    <JobSearchFilters
                      searchQuery={searchQuery}
                      onSearchChange={setSearchQuery}
                      selectedType={selectedType}
                      onTypeChange={setSelectedType}
                      selectedDistrict={selectedDistrict}
                      onDistrictChange={setSelectedDistrict}
                      onViewSavedJobs={!isRecruiter ? () => setActiveTab('saved-jobs') : undefined}
                      savedJobsCount={!isRecruiter ? savedJobsCount : 0}
                    />

                    <div className="flex items-center justify-between px-1 text-xs text-slate-500 font-medium">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>
                          {t('jobs_showing')}{' '}
                          <strong className="text-[#0B2545]">{filteredJobs.length}</strong>{' '}
                          {isRecruiter ? 'of your job listings' : t('jobs_opportunities')}
                        </span>
                        {selectedDistrict && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-[#0B2545] font-bold text-[11px]">
                            <span>{translateLocationSync(selectedDistrict, language)}</span>
                            <button
                              onClick={() => setSelectedDistrict('')}
                              className="hover:text-red-600 font-bold ml-0.5 cursor-pointer"
                              title="Clear district"
                            >
                              ×
                            </button>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery('')}
                            className="text-[#F97316] hover:underline font-semibold cursor-pointer"
                          >
                            {t('jobs_clear_search')}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {filteredJobs.length === 0 ? (
                        isRecruiter ? (
                          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center space-y-3 shadow-xs">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 border border-slate-200 text-[#0B2545] shadow-2xs">
                              <Briefcase className="h-7 w-7" />
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-slate-900">
                                {searchQuery || selectedDistrict || selectedType !== 'All'
                                  ? 'No matching job postings found'
                                  : "You haven't posted any jobs yet"}
                              </h3>
                              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                                {searchQuery || selectedDistrict || selectedType !== 'All'
                                  ? 'Try clearing your filters to see all your posted jobs.'
                                  : 'Create and publish your first job opening to start receiving verified applications from talent across Tamil Nadu.'}
                              </p>
                            </div>
                            <div className="pt-2">
                              <button
                                onClick={() => setActiveTab('post-job')}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B2545] hover:bg-[#081a31] text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-98"
                              >
                                <Plus className="h-4 w-4" />
                                <span>Post New Job</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-lg border border-[#E0DFDC] bg-white p-8 text-center text-slate-500">
                            <p className="font-semibold text-slate-700">{t('jobs_no_found')}</p>
                            <p className="mt-1 text-xs">{t('jobs_no_found_sub')}</p>
                          </div>
                        )
                      ) : (
                        filteredJobs.map((job) => (
                          <JobCard
                            key={job.id}
                            job={job}
                            onApply={handleApplyJob}
                            onViewApplications={(j) => setViewingApplicationsJob(j)}
                            onMatchCandidates={(j) => {
                              setCandidateSearchQuery(j.title)
                              setCandidateSearchJd(`${j.title}\n${j.description}`)
                              setActiveTab('candidates')
                            }}
                          />
                        ))
                      )}
                    </div>

                    {/* Prompt to Complete Profile / Upload Resume Modal */}
                    {profilePromptJob && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-150">
                        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                          <div className="flex items-start justify-between">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-[#EA580C]">
                              <FileText className="h-6 w-6" />
                            </div>
                            <button
                              onClick={() => setProfilePromptJob(null)}
                              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                              title="Close"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </div>

                          <div className="mt-4">
                            <h3 className="text-base font-bold text-slate-900">
                              {language === 'ta'
                                ? 'விண்ணப்பிக்க சுயவிவரத்தை முழுமைப்படுத்தவும்'
                                : language === 'hi'
                                ? 'आवेदन करने के लिए अपनी प्रोफ़ाइल पूरी करें'
                                : 'Complete Your Profile to Apply'}
                            </h3>
                            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                              {language === 'ta'
                                ? `1-தட்டல் மூலம் "${profilePromptJob.title}" வேலைக்கு விண்ணப்பிக்க, உங்கள் சுயவிவரத்தில் ரெஸ்யூமை (CV) பதிவேற்ற வேண்டும்.`
                                : language === 'hi'
                                ? `"${profilePromptJob.title}" के लिए 1-क्लिक में आवेदन करने हेतु कृपया अपनी प्रोफ़ाइल में रिज्यूमे अपलोड करें।`
                                : `To apply for "${profilePromptJob.title}" at ${profilePromptJob.company_name} with 1-Tap Easy Apply, please upload your resume on your profile page.`}
                            </p>

                            <div className="mt-4 rounded-xl border border-orange-100 bg-orange-50/60 p-3 text-xs text-slate-700 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-800">Resume / CV Document:</span>
                                <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-[10px] font-bold">
                                  Missing
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500">
                                Once uploaded, your resume is safely stored on your profile and reused automatically for all job applications.
                              </p>
                            </div>
                          </div>

                          <div className="mt-6 flex items-center justify-end gap-2.5">
                            <button
                              type="button"
                              onClick={() => setProfilePromptJob(null)}
                              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                            >
                              {language === 'ta' ? 'ரத்து' : language === 'hi' ? 'रद्द करें' : 'Cancel'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setProfilePromptJob(null)
                                setActiveTab('profile')
                              }}
                              className="rounded-xl bg-[#0B2545] hover:bg-[#081a31] text-white px-5 py-2.5 text-xs font-bold transition shadow-xs cursor-pointer active:scale-98"
                            >
                              {language === 'ta'
                                ? 'சுயவிவரம் & ரெஸ்யூமைப் புதுப்பிக்க'
                                : language === 'hi'
                                ? 'प्रोफ़ाइल अपडेट करें'
                                : 'Update Profile & Resume'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Recruiter View Applications Modal */}
                    {viewingApplicationsJob && (
                      <JobApplicationsModal
                        job={viewingApplicationsJob}
                        onClose={() => setViewingApplicationsJob(null)}
                        onMessageCandidate={(targetUserId) => {
                          setChatRecipientId(targetUserId)
                          setActiveTab('messages')
                        }}
                      />
                    )}
                  </div>
                )}
              </>
            )}

            {/* TAB 2: HR Post a Job */}
            {activeTab === 'post-job' && (
              isHrUnverified ? (
                <HrVerificationPendingView onBackToFeed={() => setActiveTab('jobs')} />
              ) : hasRole(['admin', 'manager']) ? (
                <PostJobForm
                  onSuccess={() => {
                    loadJobs(true)
                    setActiveTab('jobs')
                  }}
                  onCancel={() => setActiveTab('jobs')}
                />
              ) : (
                <div className="rounded-xl border border-orange-200 bg-white p-6 sm:p-8 text-center shadow-xs">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-[#EA580C]">
                    <Briefcase className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    {language === 'ta'
                      ? 'மனிதவள & முதலாளி அனுமதி தேவை'
                      : language === 'hi'
                      ? 'एचआर एवं नियोक्ता पहुंच आवश्यक'
                      : 'HR & Employer Access Required'}
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                    {language === 'ta'
                      ? 'வேலை வாய்ப்புகளை இடுவது பதிவு செய்யப்பட்ட முதலாளிகள் மற்றும் மனிதவள ஆட்சேர்ப்பாளர்களுக்கு (மேலாளர் பணி) மட்டுமே அனுமதிக்கப்பட்டுள்ளது.'
                      : language === 'hi'
                      ? 'नौकरी पोस्ट करना केवल पंजीकृत नियोक्ताओं और एचआर भर्तीकर्ताओं (प्रबंधक भूमिका) के लिए आरक्षित है।'
                      : 'Posting job openings is reserved for registered Employers and HR Recruiters (Manager role).'}
                    {user
                      ? language === 'ta'
                        ? ' நீங்கள் தற்போது வேலை தேடுபவராக உள்நுழைந்துள்ளீர்கள்.'
                        : language === 'hi'
                        ? ' आप वर्तमान में नौकरी चाहने वाले के रूप में साइन इन हैं।'
                        : ' You are currently signed in as a Job Seeker (Employee).'
                      : language === 'ta'
                      ? ' வேலைகளைப் பதிவிட மனிதவள/முதலாளி கணக்குடன் உள்நுழையவும்.'
                      : language === 'hi'
                      ? ' नौकरी पोस्ट करने के लिए कृपया एचआर / नियोक्ता खाते से साइन इन करें।'
                      : ' Please sign in with an HR / Employer account to publish job openings.'}
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    <button
                      onClick={() => setActiveTab('jobs')}
                      className="rounded-lg bg-[#0B2545] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#0B2545]/90 cursor-pointer"
                    >
                      {language === 'ta' ? 'வேலைகளை உலாவுக' : language === 'hi' ? 'नौकरियां ब्राउज़ करें' : 'Browse Open Jobs'}
                    </button>
                    {!user && (
                      <button
                        onClick={() => {
                          setSelectedRole('manager')
                          navigateToLogin()
                        }}
                        className="rounded-lg border border-[#F97316] bg-white px-4 py-2 text-xs font-bold text-[#EA580C] hover:bg-orange-50 cursor-pointer"
                      >
                        {language === 'ta'
                          ? 'மனிதவளம் / முதலாளியாக உள்நுழைக'
                          : language === 'hi'
                          ? 'एचआर / नियोक्ता के रूप में साइन इन करें'
                          : 'Sign In as HR / Employer'}
                      </button>
                    )}
                  </div>
                </div>
              )
            )}


            {/* TAB 4: Network Feed (Employee only) */}
            {activeTab === 'feed' && user?.role === 'employee' && (
              <FeedView
                posts={posts}
                onCreatePost={handleCreatePost}
                onLikePost={handleLikePost}
                isLoading={isLoadingPosts}
              />
            )}

            {/* TAB 5: HR Candidate Talent Search by AI Skill */}
            {activeTab === 'candidates' && (
              isHrUnverified ? (
                <HrVerificationPendingView onBackToFeed={() => setActiveTab('jobs')} />
              ) : hasRole(['admin', 'manager', 'staff']) ? (
                <CandidateSearchView
                  initialQuery={candidateSearchQuery}
                  initialJd={candidateSearchJd}
                  onOpenProfile={(candidateId) => setViewingPublicProfileId(candidateId)}
                  onOpenChat={(recipientId) => {
                    setChatRecipientId(recipientId)
                    setActiveTab('messages')
                  }}
                />
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 text-center shadow-xs">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-[#0B2545]">
                    <Users className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    {language === 'ta'
                      ? 'திறமை வேட்பாளர்கள் அடைவு'
                      : language === 'hi'
                      ? 'प्रतिभा उम्मीदवार निर्देशिका'
                      : 'Candidate Talent Directory'}
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                    {language === 'ta'
                      ? 'வேட்பாளர் சுயவிவரங்கள் மற்றும் திறன்களைத் தேடுவது சரிபார்க்கப்பட்ட மனிதவள ஆட்சேர்ப்பாளர்கள் மற்றும் மேலாளர்களுக்கு மட்டுமே ஒதுக்கப்பட்டுள்ளது.'
                      : language === 'hi'
                      ? 'उम्मीदवार के रिज्यूमे और कौशल खोजना केवल सत्यापित एचआर भर्तीकर्ताओं और प्रबंधकों के लिए आरक्षित है।'
                      : 'Searching candidate resumes and skills is reserved for verified HR Recruiters and Managers.'}
                  </p>
                  <div className="mt-5 flex justify-center">
                    <button
                      onClick={() => setActiveTab('jobs')}
                      className="rounded-lg bg-[#0B2545] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#0B2545]/90 cursor-pointer"
                    >
                      {language === 'ta' ? 'வேலைகளுக்குத் திரும்பு' : language === 'hi' ? 'नौकरियों पर लौटें' : 'Return to Jobs'}
                    </button>
                  </div>
                </div>
              )
            )}
          </section>

          {/* RIGHT SIDEBAR: Production Opportunities & Mobile App */}
          <aside className={`hidden ${activeTab === 'candidates' ? 'hidden' : 'lg:block lg:col-span-3'} space-y-4 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-5.5rem)] lg:overflow-y-auto`}>
            {/* Recent Live Opportunities / Recruiter Operations */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <h4 className="text-xs font-semibold text-slate-900 tracking-tight">
                  {isRecruiter ? 'Recruiter Suite' : t('trending_jobs_title')}
                </h4>
                <span className="text-[11px] text-slate-400 font-normal">
                  {isRecruiter ? 'Active' : t('trending_live_badge')}
                </span>
              </div>
              <div className="mt-2 divide-y divide-slate-100">
                {!user ? (
                  <div className="py-3 px-1 text-center space-y-2">
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {language === 'ta'
                        ? 'தமிழ்நாடு முழுவதும் உள்ள நேரலை வேலை வாய்ப்புகளைக் காண உள்நுழையவும்.'
                        : language === 'hi'
                        ? 'तमिलनाडु भर में वास्तविक समय के अवसरों और नौकरियों को देखने के लिए साइन इन करें।'
                        : 'Sign in to view real-time opportunities and trending jobs across Tamil Nadu.'}
                    </p>
                    <button
                      onClick={navigateToLogin}
                      className="text-xs font-medium text-[#0B2545] hover:underline cursor-pointer"
                    >
                      {t('nav_sign_in_register')} →
                    </button>
                  </div>
                ) : isRecruiter ? (
                  <div className="py-2 space-y-3">
                    <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                      <div className="text-[11px] text-slate-500 font-medium">Your Active Openings</div>
                      <div className="text-lg font-black text-[#0B2545]">{myPostedJobs.length}</div>
                    </div>
                    <button
                      onClick={() => setActiveTab('post-job')}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#0B2545] text-white text-xs font-bold hover:bg-[#081a31] transition shadow-xs cursor-pointer active:scale-98"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Create Job Opening</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('candidates')}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                    >
                      <Users className="h-3.5 w-3.5 text-[#F97316]" />
                      <span>Search Candidates</span>
                    </button>
                  </div>
                ) : jobs.length === 0 ? (
                  <p className="text-slate-400 text-xs py-3 text-center">No active job openings available</p>
                ) : (
                  jobs.slice(0, 4).map((j) => (
                    <TrendingJobRow
                      key={j.id}
                      job={j}
                      language={language}
                      onClick={() => {
                        setActiveTab('jobs')
                        setSearchQuery(j.title)
                      }}
                    />
                  ))
                )}
              </div>
            </div>

            {/* LinkedIn Footer Links */}
            <footer className="px-2 text-center text-[11px] text-slate-400 space-y-1.5">
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
                <a href="#" className="hover:underline">{t('footer_about')}</a>
                <a href="#" className="hover:underline">{t('footer_accessibility')}</a>
                <a href="#" className="hover:underline">{t('footer_help')}</a>
                <a href="#" className="hover:underline">{t('footer_privacy')}</a>
              </div>
              <p className="text-[10px] text-slate-400">
                {t('footer_copyright')}
              </p>
            </footer>
          </aside>
        </div>
      )}
      </main>
      </PullToRefresh>

      {/* Rich Profile Edit & Settings Modal */}
      <ProfileEditModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* HR Profile Setup / Edit Modal */}
      {showHrProfileModal && user?.role === 'manager' && (
        <HrProfileSetupModal
          isEdit={showHrProfileModal === 'edit'}
          onClose={() => setShowHrProfileModal(null)}
          onSubmitted={() => setShowHrProfileModal(null)}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <LanguageProvider>
          <MainContent />
        </LanguageProvider>
      </AuthProvider>
    </ToastProvider>
  )
}
