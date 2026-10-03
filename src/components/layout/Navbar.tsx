import React, { useState } from 'react'
import {
  Briefcase,
  Home,
  PlusSquare,
  ShieldCheck,
  Search,
  ChevronDown,
  User as UserIcon,
  LogOut,
  Languages,
  Check,
  Bell,
  Users,
  MessageSquare,
  Bookmark,
  RotateCw,
  Building2,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { Badge } from '../ui/Badge'
import { Avatar } from '../ui/Avatar'
import { NotificationDropdown } from '../features/notifications/NotificationDropdown'
import { savedJobService } from '../../services/api'
import { Capacitor } from '@capacitor/core'
import type { SupportedLanguage } from '../../utils/i18n'

export type TabType =
  | 'home'
  | 'jobs'
  | 'saved-jobs'
  | 'feed'
  | 'connections'
  | 'messages'
  | 'post-job'
  | 'candidates'
  | 'admin-panel'
  | 'notifications'
  | 'profile'
  | 'clients'

interface NavbarProps {
  activeTab: TabType
  onSelectTab: (tab: TabType) => void
  unreadMessagesCount?: number
  unreadNotificationsCount?: number
  searchQuery: string
  onSearchChange: (q: string) => void
  onOpenProfileEdit: () => void
  onSelectNotificationJob?: (jobId: string, jobTitle?: string) => void
  onSelectNotificationUser?: (userId: string) => void
  onSelectNotificationConversation?: (recipientId?: string) => void
  onSelectNotificationFeed?: () => void
  onRefresh?: () => void
  isRefreshing?: boolean
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  unreadMessagesCount = 0,
  unreadNotificationsCount = 0,
  searchQuery,
  onSearchChange,
  onOpenProfileEdit,
  onSelectNotificationJob,
  onSelectNotificationUser,
  onSelectNotificationConversation,
  onSelectNotificationFeed,
  onRefresh,
  isRefreshing = false,
}) => {
  const { user, role, hasRole, logout } = useAuth()
  const { language, setLanguage, t, languages } = useLanguage()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showLangMenu, setShowLangMenu] = useState(false)
  const [savedCount, setSavedCount] = useState<number>(0)
  const isNativeApp = Capacitor.isNativePlatform()

  React.useEffect(() => {
    if (user?.id && user?.role === 'employee') {
      savedJobService.getSavedJobIds().then((ids) => {
        setSavedCount(ids.length)
      }).catch(() => {
        setSavedCount(0)
      })
    } else {
      setSavedCount(0)
    }

    const updateCount = () => {
      if (user?.id && user?.role === 'employee') {
        savedJobService.getSavedJobIds().then((ids) => {
          setSavedCount(ids.length)
        }).catch(() => {
          try {
            const raw = localStorage.getItem('namma_saved_job_ids')
            setSavedCount(raw ? JSON.parse(raw).length : 0)
          } catch {}
        })
      } else {
        setSavedCount(0)
      }
    }
    window.addEventListener('saved_jobs_updated', updateCount)
    return () => window.removeEventListener('saved_jobs_updated', updateCount)
  }, [user?.id, user?.role])

  const navigateToLogin = () => {
    window.history.pushState({}, '', '/login')
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  const currentLanguageOption = languages.find((l) => l.code === language) || languages[0]

  return (
    <>
      {/* Top Main Navbar */}
      <header className="sticky top-0 z-40 border-b border-[#E0DFDC] bg-white shadow-xs">
        <div className="mx-auto flex h-[58px] max-w-6xl items-center justify-between px-3 sm:px-6">
          {/* Left: Brand Logo & Global Search */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div
              onClick={() => {
                try {
                  window.history.pushState({}, '', '/')
                } catch {}
                onSelectTab(user ? (user.role === 'admin' ? 'admin-panel' : user.role === 'staff' ? 'clients' : 'jobs') : 'home')
              }}
              className="flex cursor-pointer items-center gap-2 transition hover:opacity-90 shrink-0"
              title={user ? (user.role === 'admin' ? 'Admin Dashboard' : 'Jobs Portal') : 'Home'}
            >
              <img
                src="/logo.png"
                onError={(e) => {
                  e.currentTarget.src = '/logo-icon.png'
                }}
                alt="NAMMA OORU JOBS"
                className="h-8 sm:h-9 w-auto object-contain"
              />
              <span className="text-xs sm:text-sm font-black tracking-tight text-[#0B2545] whitespace-nowrap">
                NAMMA OORU <span className="text-[#F97316]">JOBS</span>
              </span>
            </div>

            {/* LinkedIn-style Search Input (Desktop & Tablet) */}
            {activeTab !== 'feed' && activeTab !== 'profile' && activeTab !== 'connections' && (
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#64748B]" />
                <input
                  type="text"
                  placeholder={t('nav_search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="h-8 w-48 lg:w-64 rounded bg-[#EDF3F8] pl-8 pr-3 text-xs text-[#0F172A] placeholder-[#64748B] transition-all focus:w-72 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0B2545]"
                />
              </div>
            )}
          </div>

          {/* Center: Desktop Navigation Items */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-3">
            {/* Home / Info Landing Page (Unregistered guests only) */}
            {!user && (
              <button
                onClick={() => onSelectTab('home')}
                className={`flex flex-col items-center justify-center px-2.5 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'home'
                    ? 'border-b-2 border-[#0B2545] text-[#0B2545] font-bold'
                    : 'text-[#5E5E5E] hover:text-[#0F172A]'
                }`}
              >
                <Home className="h-5 w-5 shrink-0" />
                <span className="mt-0.5">{t('nav_home')}</span>
              </button>
            )}

            {/* Jobs */}
            <button
              onClick={() => onSelectTab('jobs')}
              className={`flex flex-col items-center justify-center px-2.5 py-1.5 text-[11px] font-medium transition-colors relative whitespace-nowrap cursor-pointer ${
                activeTab === 'jobs' || (activeTab === 'home' && !!user && user.role !== 'admin')
                  ? 'border-b-2 border-[#0B2545] text-[#0B2545] font-bold'
                  : 'text-[#5E5E5E] hover:text-[#0F172A]'
              }`}
            >
              <div className="relative">
                <Briefcase className="h-5 w-5 shrink-0" />
              </div>
              <span className="mt-0.5">{t('nav_jobs')}</span>
            </button>

            {/* Social Network / Discover Connections (Employees/Job Seekers only) */}
            {user && !hasRole(['admin', 'manager']) && (
              <button
                onClick={() => onSelectTab('connections')}
                className={`flex flex-col items-center justify-center px-2.5 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'connections'
                    ? 'border-b-2 border-[#0B2545] text-[#0B2545] font-bold'
                    : 'text-[#5E5E5E] hover:text-[#0F172A]'
                }`}
              >
                <Users className="h-5 w-5 shrink-0" />
                <span className="mt-0.5">{language === 'ta' ? 'நெட்வொர்க்' : language === 'hi' ? 'नेटवर्क' : 'Network'}</span>
              </button>
            )}

            {/* 1-to-1 Personal Chat / Messages */}
            {user && (
              <button
                onClick={() => onSelectTab('messages')}
                className={`flex flex-col items-center justify-center px-2.5 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'messages'
                    ? 'border-b-2 border-[#0B2545] text-[#0B2545] font-bold'
                    : 'text-[#5E5E5E] hover:text-[#0F172A]'
                }`}
              >
                <div className="relative">
                  <MessageSquare className="h-5 w-5 shrink-0" />
                  {unreadMessagesCount > 0 && (
                    <span className="absolute -top-1 -right-2.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-[#0B2545] px-1 text-[9px] font-bold text-white shadow-2xs animate-in zoom-in-50">
                      {unreadMessagesCount}
                    </span>
                  )}
                </div>
                <span className="mt-0.5">{language === 'ta' ? 'செய்திகள்' : language === 'hi' ? 'संदेश' : 'Messages'}</span>
              </button>
            )}

            {/* HR / Admin / Staff: Candidate Search by Skill */}
            {hasRole(['admin', 'manager', 'staff']) && (
              <button
                onClick={() => onSelectTab('candidates')}
                className={`flex flex-col items-center justify-center px-2.5 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'candidates'
                    ? 'border-b-2 border-[#0B2545] text-[#0B2545] font-bold'
                    : 'text-[#5E5E5E] hover:text-[#0F172A]'
                }`}
              >
                <Users className="h-5 w-5 shrink-0" />
                <span className="mt-0.5">Candidates</span>
              </button>
            )}

            {/* Staff / Admin: Client Maintenance */}
            {hasRole(['admin', 'staff']) && (
              <button
                onClick={() => onSelectTab('clients')}
                className={`flex flex-col items-center justify-center px-2.5 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'clients'
                    ? 'border-b-2 border-[#0B2545] text-[#0B2545] font-bold'
                    : 'text-[#5E5E5E] hover:text-[#0F172A]'
                }`}
              >
                <Building2 className="h-5 w-5 shrink-0" />
                <span className="mt-0.5">{t('nav_client_maintenance')}</span>
              </button>
            )}

            {/* Admin: Post a Job */}
            {hasRole(['admin']) && (
              <button
                onClick={() => onSelectTab('post-job')}
                className={`flex flex-col items-center justify-center px-2.5 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'post-job'
                    ? 'border-b-2 border-[#F97316] text-[#F97316] font-bold'
                    : 'text-[#5E5E5E] hover:text-[#0F172A]'
                }`}
              >
                <PlusSquare className="h-5 w-5 shrink-0" />
                <span className="mt-0.5">{t('nav_post_job')}</span>
              </button>
            )}

            {/* Admin: Management */}
            {hasRole(['admin']) && (
              <button
                onClick={() => onSelectTab('admin-panel')}
                className={`flex flex-col items-center justify-center px-2.5 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'admin-panel' || (activeTab === 'home' && user?.role === 'admin')
                    ? 'border-b-2 border-[#0B2545] text-[#0B2545] font-bold'
                    : 'text-[#5E5E5E] hover:text-[#0F172A]'
                }`}
              >
                <ShieldCheck className="h-5 w-5 shrink-0" />
                <span className="mt-0.5">{t('nav_admin')}</span>
              </button>
            )}
          </nav>

          {/* Right: Notifications, Language Switcher & User Profile Menu */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Notifications Dropdown (Desktop/tablet only; on mobile, notifications is a dedicated bottom tab) */}
            {user && (
              <div className="hidden md:block">
              <NotificationDropdown
                onSelectJob={onSelectNotificationJob}
                onSelectUser={onSelectNotificationUser}
                onSelectConversation={onSelectNotificationConversation}
                onSelectFeed={onSelectNotificationFeed}
              />
              </div>
            )}

            {/* Page Refresh Button (Accessible for Native App only across all pages) */}
            {isNativeApp && onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-gray-50/80 text-[#0B2545] hover:bg-gray-100 hover:text-[#F97316] transition cursor-pointer active:scale-90 disabled:opacity-60 shrink-0"
                title={language === 'ta' ? 'பக்கத்தைப் புதுப்பி' : language === 'hi' ? 'पेज रिफ्रेश करें' : 'Refresh Page'}
                aria-label="Refresh Page"
              >
                <RotateCw className={`h-3.5 w-3.5 transition-transform ${isRefreshing ? 'animate-spin text-[#F97316]' : 'text-[#0B2545]'}`} />
              </button>
            )}

            {/* Quick Language Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowLangMenu(!showLangMenu)
                  setShowProfileMenu(false)
                }}
                className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50/80 px-2.5 py-1 text-xs font-semibold text-[#0F172A] hover:bg-gray-100 transition cursor-pointer"
                title="Change Language"
              >
                <Languages className="h-3.5 w-3.5 text-[#0B2545]" />
                <span className="font-bold text-[11px]">{currentLanguageOption.nativeName}</span>
                <ChevronDown className="h-3 w-3 text-gray-500" />
              </button>

              {showLangMenu && (
                <div
                  className="absolute right-0 top-10 w-44 rounded-xl border border-[#E0DFDC] bg-white p-1.5 shadow-xl z-50 text-xs"
                  onClick={() => setShowLangMenu(false)}
                >
                  <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    {t('nav_select_language')}
                  </div>
                  {languages.map((item) => (
                    <button
                      key={item.code}
                      onClick={() => setLanguage(item.code as SupportedLanguage)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition cursor-pointer ${
                        language === item.code
                          ? 'bg-[#0B2545] text-white font-bold'
                          : 'text-[#0F172A] hover:bg-gray-100 font-medium'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span>{item.nativeName}</span>
                        <span
                          className={`text-[9px] ${
                            language === item.code ? 'text-blue-100' : 'text-gray-400'
                          }`}
                        >
                          {item.label}
                        </span>
                      </div>
                      {language === item.code && <Check className="h-3.5 w-3.5 shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Profile Dropdown / Sign In */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowProfileMenu(!showProfileMenu)
                    setShowLangMenu(false)
                  }}
                  className="flex items-center gap-1.5 sm:gap-2 rounded-full py-1 px-1.5 hover:bg-gray-100 transition cursor-pointer"
                >
                  <Avatar src={user?.avatar_url} name={user?.full_name} size="sm" />
                  <div className="hidden sm:flex items-center gap-1 text-left">
                    <span className="text-xs font-bold text-[#0F172A] leading-tight truncate max-w-[120px]">
                      {user?.full_name?.split(' ')[0]}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                  </div>
                </button>

                {/* Profile Dropdown Menu */}
                {showProfileMenu && (
                  <div
                    className="absolute right-0 top-11 w-68 rounded-xl border border-[#E0DFDC] bg-white p-3 shadow-xl z-50 text-xs"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    <div className="border-b border-gray-100 pb-3 flex items-center gap-3">
                      <Avatar src={user?.avatar_url} name={user?.full_name} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-[#0F172A] truncate">{user?.full_name}</p>
                        <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                        {role !== 'employee' && (
                          <div className="mt-1 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400">{t('profile_badge_role')}:</span>
                            <Badge variant="role" role={role} />
                          </div>
                        )}
                        {role === 'manager' && (
                          <div className="mt-1.5 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400">Status:</span>
                            {(user?.status || '').toUpperCase() === 'ACTIVE' ? (
                              <Badge variant="success">Verified HR</Badge>
                            ) : (user?.status || '').toUpperCase() === 'REJECTED' ? (
                              <Badge variant="danger">Rejected</Badge>
                            ) : (
                              <Badge variant="warning">Pending Verification</Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 space-y-1">
                      <button
                        onClick={() => {
                          setShowProfileMenu(false)
                          if (onOpenProfileEdit) {
                            onOpenProfileEdit()
                          } else {
                            onSelectTab('profile')
                          }
                        }}
                        className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-left font-semibold cursor-pointer transition ${
                          activeTab === 'profile'
                            ? 'bg-[#0B2545]/10 text-[#0B2545]'
                            : 'hover:bg-slate-100 text-slate-800'
                        }`}
                      >
                        <UserIcon className="h-4 w-4 text-[#0B2545]" />
                        <span>{t('profile_title') || 'Profile & Settings'}</span>
                      </button>

                      {(!user || user.role === 'employee') && (
                        <button
                          onClick={() => {
                            setShowProfileMenu(false)
                            onSelectTab('saved-jobs')
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-left font-semibold cursor-pointer transition ${
                            activeTab === 'saved-jobs'
                              ? 'bg-[#0B2545]/10 text-[#0B2545]'
                              : 'hover:bg-slate-100 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Bookmark className={`h-4 w-4 ${activeTab === 'saved-jobs' ? 'fill-[#0B2545] text-[#0B2545]' : 'text-[#0B2545]'}`} />
                            <span>{t('saved_jobs_title') || 'Saved Jobs'}</span>
                          </div>
                          {savedCount > 0 && (
                            <span className="rounded-full bg-[#0B2545] px-2 py-0.5 text-[10px] font-bold text-white">
                              {savedCount}
                            </span>
                          )}
                        </button>
                      )}

                      {isNativeApp && (
                        <button
                          onClick={() => {
                            setShowProfileMenu(false)
                            onRefresh?.()
                          }}
                          className="w-full flex items-center gap-2.5 p-2 rounded-lg text-left font-semibold cursor-pointer hover:bg-slate-100 text-slate-800 transition"
                        >
                          <RotateCw className={`h-4 w-4 text-[#0B2545] ${isRefreshing ? 'animate-spin text-[#F97316]' : ''}`} />
                          <span>{language === 'ta' ? 'பக்கத்தைப் புதுப்பி' : language === 'hi' ? 'पेज रिफ्रेश करें' : 'Refresh Page'}</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setShowProfileMenu(false)
                          logout()
                          onSelectTab('home')
                        }}
                        className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-red-50 text-red-600 text-left font-semibold cursor-pointer transition"
                      >
                        <LogOut className="h-4 w-4 text-red-500" />
                        <span>{t('nav_sign_out')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={navigateToLogin}
                className="rounded-full bg-[#0B2545] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#0B2545]/90 transition whitespace-nowrap shadow-xs cursor-pointer"
              >
                {t('nav_sign_in')}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Search Bar (Hidden on thoughts page, network page, jobs, messages, candidates, profile) */}
        {activeTab !== 'jobs' &&
          activeTab !== 'messages' &&
          activeTab !== 'candidates' &&
          activeTab !== 'feed' &&
          activeTab !== 'profile' &&
          activeTab !== 'connections' && (
          <div className="md:hidden border-t border-gray-100 px-3 py-2 bg-[#F8FAFC]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={t('nav_search_placeholder')}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white py-1.5 pl-8 pr-3 text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2545]"
              />
            </div>
          </div>
        )}
      </header>

      {/* Mobile Fixed Bottom Navigation Bar (LinkedIn Style for Phones) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[#E0DFDC] bg-white shadow-lg flex items-center justify-around py-1.5 px-2">
        {!user && (
          <button
            onClick={() => onSelectTab('home')}
            className={`flex flex-col items-center justify-center py-1 px-3 text-[10px] font-semibold transition cursor-pointer ${
              activeTab === 'home' ? 'text-[#0B2545] font-bold' : 'text-slate-500'
            }`}
          >
            <Home className="h-5 w-5" />
            <span>{t('nav_home')}</span>
          </button>
        )}

        <button
          onClick={() => onSelectTab('jobs')}
          className={`flex flex-col items-center justify-center py-1 px-3 text-[10px] font-semibold relative transition cursor-pointer ${
            activeTab === 'jobs' || (activeTab === 'home' && !!user) ? 'text-[#0B2545] font-bold' : 'text-slate-500'
          }`}
        >
          <div className="relative">
            <Briefcase className="h-5 w-5" />
          </div>
          <span>{t('nav_jobs')}</span>
        </button>

        {user && !hasRole(['admin', 'manager']) && (
          <button
            onClick={() => onSelectTab('connections')}
            className={`flex flex-col items-center justify-center py-1 px-3 text-[10px] font-semibold transition cursor-pointer ${
              activeTab === 'connections' ? 'text-[#0B2545] font-bold' : 'text-slate-500'
            }`}
          >
            <Users className="h-5 w-5" />
            <span>{language === 'ta' ? 'நெட்வொர்க்' : language === 'hi' ? 'नेटवर्क' : 'Network'}</span>
          </button>
        )}

        {user && (
          <button
            onClick={() => onSelectTab('messages')}
            className={`flex flex-col items-center justify-center py-1 px-3 text-[10px] font-semibold transition cursor-pointer ${
              activeTab === 'messages' ? 'text-[#0B2545] font-bold' : 'text-slate-500'
            }`}
          >
            <div className="relative">
              <MessageSquare className="h-5 w-5" />
              {unreadMessagesCount > 0 && (
                <span className="absolute -top-1 -right-2 flex h-3 min-w-[12px] items-center justify-center rounded-full bg-[#0B2545] px-0.5 text-[8px] font-bold text-white shadow-2xs">
                  {unreadMessagesCount}
                </span>
              )}
            </div>
            <span>{language === 'ta' ? 'செய்திகள்' : language === 'hi' ? 'संदेश' : 'Messages'}</span>
          </button>
        )}

        {hasRole(['admin', 'manager', 'staff']) && (
          <button
            onClick={() => onSelectTab('candidates')}
            className={`flex flex-col items-center justify-center py-1 px-3 text-[10px] font-semibold transition cursor-pointer ${
              activeTab === 'candidates' ? 'text-[#0B2545] font-bold' : 'text-slate-500'
            }`}
          >
            <Users className="h-5 w-5" />
            <span>{t('nav_candidates')}</span>
          </button>
        )}

        {hasRole(['admin', 'staff']) && (
          <button
            onClick={() => onSelectTab('clients')}
            className={`flex flex-col items-center justify-center py-1 px-3 text-[10px] font-semibold transition cursor-pointer ${
              activeTab === 'clients' ? 'text-[#0B2545] font-bold' : 'text-slate-500'
            }`}
          >
            <Building2 className="h-5 w-5" />
            <span>{t('nav_client_maintenance')}</span>
          </button>
        )}

        {hasRole(['admin']) && (
          <button
            onClick={() => onSelectTab('post-job')}
            className={`flex flex-col items-center justify-center py-1 px-3 text-[10px] font-semibold transition cursor-pointer ${
              activeTab === 'post-job' ? 'text-[#F97316] font-bold' : 'text-slate-500'
            }`}
          >
            <PlusSquare className="h-5 w-5" />
            <span>{t('nav_post_job')}</span>
          </button>
        )}

        {hasRole(['admin']) && (
          <button
            onClick={() => onSelectTab('admin-panel')}
            className={`flex flex-col items-center justify-center py-1 px-3 text-[10px] font-semibold transition cursor-pointer ${
              activeTab === 'admin-panel' || (activeTab === 'home' && user?.role === 'admin') ? 'text-[#0B2545] font-bold' : 'text-slate-500'
            }`}
          >
            <ShieldCheck className="h-5 w-5" />
            <span>{t('nav_admin')}</span>
          </button>
        )}

        {user && (
          <button
            onClick={() => onSelectTab('notifications')}
            className={`flex flex-col items-center justify-center py-1 px-3 text-[10px] font-semibold transition cursor-pointer relative ${
              activeTab === 'notifications' ? 'text-[#0B2545] font-bold' : 'text-slate-500'
            }`}
          >
            <div className="relative">
              <Bell className="h-5 w-5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-bold text-white shadow-xs">
                  {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                </span>
              )}
            </div>
            <span>{t('notif_title')}</span>
          </button>
        )}

        {user ? (
          <button
            onClick={() => onSelectTab('profile')}
            className={`flex flex-col items-center justify-center py-1 px-3 text-[10px] font-semibold transition cursor-pointer ${
              activeTab === 'profile' ? 'text-[#0B2545] font-bold' : 'text-slate-500 hover:text-[#0B2545]'
            }`}
          >
            <div className={`rounded-full ${activeTab === 'profile' ? 'ring-2 ring-[#0B2545]' : ''}`}>
              <Avatar src={user?.avatar_url} name={user?.full_name} size="xs" />
            </div>
            <span>{user?.full_name?.split(' ')[0] || t('nav_me')}</span>
          </button>
        ) : (
          <button
            onClick={navigateToLogin}
            className="flex flex-col items-center justify-center py-1 px-3 text-[10px] font-semibold text-slate-500 hover:text-[#0B2545] cursor-pointer"
          >
            <UserIcon className="h-5 w-5" />
            <span>{t('nav_sign_in')}</span>
          </button>
        )}
      </nav>
    </>
  )
}
