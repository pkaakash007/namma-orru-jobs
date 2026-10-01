import React, { useState, useEffect, useCallback } from 'react'
import { Bell, Briefcase, UserPlus, MessageSquare, ThumbsUp, FileText } from 'lucide-react'
import { notificationService } from '../../../services/api'
import { useLanguage } from '../../../context/LanguageContext'
import { useToast } from '../../../context/ToastContext'
import { useAuth } from '../../../context/AuthContext'
import type { AppNotification } from '../../../types'
import {
  translateLocationSync,
  formatWorkplaceType,
  formatSalary,
  translateJobTitleSync,
  translateCompanySync,
} from '../../../services/googleAiTranslate'
import { formatRelativeTime } from '../../../utils/date'
import { DynamicTranslatedText } from '../../ui/DynamicTranslatedText'

interface NotificationSectionProps {
  onSelectJob?: (jobId: string, jobTitle?: string) => void
  onSelectUser?: (userId: string) => void
  onSelectConversation?: (recipientId?: string) => void
  onSelectFeed?: () => void
}

export const NotificationSection: React.FC<NotificationSectionProps> = ({
  onSelectJob,
  onSelectUser,
  onSelectConversation,
  onSelectFeed,
}) => {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [filterType, setFilterType] = useState<'all' | 'unread'>('all')
  const [isLoading, setIsLoading] = useState(true)

  const { t, language } = useLanguage()
  const { showToast } = useToast()

  const loadNotifications = useCallback(async (force = false) => {
    if (!user) {
      setIsLoading(false)
      return
    }
    try {
      const data = await notificationService.getNotifications(force)
      if (data?.notifications) {
        setNotifications(data.notifications)
        setUnreadCount(data.unread_count || 0)
      }
    } catch {
      // Quiet
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) {
      setNotifications([])
      setUnreadCount(0)
      setIsLoading(false)
      return
    }
    loadNotifications(true)

    // Relaxed 1-minute interval strictly while the notifications view is active
    const timer = setInterval(() => {
      loadNotifications(true)
    }, 60000)

    return () => clearInterval(timer)
  }, [user?.id, loadNotifications])

  if (!user) return null

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    try {
      await notificationService.markAsRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      )
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch {}
  }

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })))
      setUnreadCount(0)
      showToast('All notifications marked as read', 'info')
    } catch (err: any) {
      showToast(err.message || 'Failed to update', 'error')
    }
  }

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.is_read) {
      await handleMarkAsRead(notif.id)
    }

    if (notif.type === 'job_posted' && notif.data) {
      try {
        const parsed = JSON.parse(notif.data)
        if (parsed.job_id && onSelectJob) {
          onSelectJob(parsed.job_id, parsed.title)
        }
      } catch {}
    } else if (notif.type === 'user_follow') {
      try {
        const parsed = notif.data ? JSON.parse(notif.data) : null
        if (parsed?.follower_id && onSelectUser) {
          onSelectUser(parsed.follower_id)
        } else if (parsed?.follower_id) {
          window.history.pushState({}, '', `/profile/${parsed.follower_id}`)
          window.dispatchEvent(new PopStateEvent('popstate'))
        }
      } catch {}
    } else if (notif.type === 'chat_message') {
      try {
        const parsed = notif.data ? JSON.parse(notif.data) : null
        if (onSelectConversation) {
          onSelectConversation(parsed?.sender_id)
        } else {
          window.history.pushState({}, '', '/messages')
          window.dispatchEvent(new PopStateEvent('popstate'))
        }
      } catch {}
    } else if (notif.type === 'post_like') {
      if (onSelectFeed) {
        onSelectFeed()
      } else {
        window.history.pushState({}, '', '/feed')
        window.dispatchEvent(new PopStateEvent('popstate'))
      }
    } else if (notif.type === 'application_received' && notif.data) {
      try {
        const parsed = JSON.parse(notif.data)
        if (parsed.job_id && onSelectJob) {
          onSelectJob(parsed.job_id, 'Applications')
        }
      } catch {}
    }
  }



  const filteredNotifications = notifications.filter((n) => {
    if (filterType === 'unread') return !n.is_read
    return true
  })

  return (
    <div className="space-y-3.5 max-w-2xl mx-auto">
      {/* iOS-Style Clean Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            {t('notif_title') || 'Notifications'}
          </h2>
          {unreadCount > 0 && (
            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-semibold text-white">
              {unreadCount} {t('notif_new') || 'new'}
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition cursor-pointer"
          >
            {t('notif_mark_all_read') || 'Mark all as read'}
          </button>
        )}
      </div>

      {/* iOS Segmented Control */}
      <div className="flex justify-start px-1">
        <div className="inline-flex rounded-xl bg-slate-200/70 p-0.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`rounded-lg py-1 px-3.5 transition cursor-pointer ${
              filterType === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('notif_all') || 'All'} ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('unread')}
            className={`rounded-lg py-1 px-3.5 transition cursor-pointer ${
              filterType === 'unread'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('notif_unread') || 'Unread'} ({unreadCount})
          </button>
        </div>
      </div>

      {/* iOS Grouped Notifications List */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs divide-y divide-slate-100 overflow-hidden">
        {isLoading && notifications.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <p className="text-xs font-medium">{t('notif_loading') || 'Loading notifications...'}</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-14 px-4 text-center">
            <div className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Bell className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-slate-800">
              {filterType === 'unread' ? 'No unread notifications' : (t('notif_empty_title') || 'No notifications yet')}
            </p>
            <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              {filterType === 'unread'
                ? 'You have read all your notifications.'
                : (t('notif_empty_desc') || "When you receive new followers, messages, or role updates, they will appear here.")}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const isUnread = !notif.is_read
            let parsedData: any = null
            try {
              parsedData = notif.data ? JSON.parse(notif.data) : null
            } catch {}

            const companyName = parsedData?.company_name || ''
            const jobTitle = parsedData?.title || notif.title.replace(/^New Job:\s*/i, '').trim()
            const location = parsedData?.location || ''
            const workplaceType = parsedData?.workplace_type || ''
            const salary = parsedData?.salary_range || ''

            const avatarUrl =
              parsedData?.follower_avatar ||
              parsedData?.sender_avatar ||
              parsedData?.liker_avatar ||
              parsedData?.applicant_avatar ||
              parsedData?.company_logo ||
              null

            const displayName =
              parsedData?.follower_name ||
              parsedData?.sender_name ||
              parsedData?.liker_name ||
              parsedData?.applicant_name ||
              companyName ||
              notif.title

            const initial = displayName.trim().charAt(0).toUpperCase() || 'U'

            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`group flex items-start justify-between gap-3 px-4 py-3.5 transition cursor-pointer ${
                  isUnread ? 'bg-blue-50/30 hover:bg-blue-50/50' : 'bg-white hover:bg-slate-50/80'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {/* Authentic User Profile Picture / Logo with Action Badge */}
                  <div className="relative shrink-0 select-none">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        referrerPolicy="no-referrer"
                        className="h-10 w-10 rounded-full object-cover border border-slate-200 shadow-xs"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          if (e.currentTarget.nextElementSibling) {
                            (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex'
                          }
                        }}
                      />
                    ) : null}
                    <div
                      style={{ display: avatarUrl ? 'none' : 'flex' }}
                      className="h-10 w-10 rounded-full bg-[#0B2545] border border-slate-200 text-white font-bold text-sm items-center justify-center shadow-xs uppercase"
                    >
                      {initial}
                    </div>

                    {/* Action Mini-Badge */}
                    <div className="absolute -bottom-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full border-2 border-white shadow-xs">
                      {notif.type === 'user_follow' ? (
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-blue-600">
                          <UserPlus className="h-2.5 w-2.5 text-white" />
                        </div>
                      ) : notif.type === 'chat_message' ? (
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-[#EA580C]">
                          <MessageSquare className="h-2.5 w-2.5 text-white" />
                        </div>
                      ) : notif.type === 'post_like' ? (
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0A66C2]">
                          <ThumbsUp className="h-2.5 w-2.5 text-white" />
                        </div>
                      ) : notif.type === 'application_received' ? (
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-emerald-600">
                          <FileText className="h-2.5 w-2.5 text-white" />
                        </div>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-700">
                          <Briefcase className="h-2.5 w-2.5 text-white" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Clean Human Typography based on Notification Type */}
                  <div className="min-w-0 flex-1">
                    {notif.type === 'user_follow' ? (
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs sm:text-sm font-semibold text-slate-900">{notif.title}</p>
                          <span className="text-[11px] text-slate-400 shrink-0">
                            {formatRelativeTime(notif.created_at)}
                          </span>
                        </div>
                        <DynamicTranslatedText
                          text={notif.message}
                          as="p"
                          className="text-xs sm:text-sm text-slate-600 mt-0.5 leading-snug"
                        />
                      </div>
                    ) : notif.type === 'chat_message' ? (
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs sm:text-sm font-semibold text-slate-900">{notif.title}</p>
                          <span className="text-[11px] text-slate-400 shrink-0">
                            {formatRelativeTime(notif.created_at)}
                          </span>
                        </div>
                        <DynamicTranslatedText
                          text={notif.message}
                          as="p"
                          className="text-xs sm:text-sm text-slate-600 truncate mt-0.5 leading-snug"
                        />
                      </div>
                    ) : notif.type === 'post_like' ? (
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs sm:text-sm font-semibold text-slate-900">{notif.title}</p>
                          <span className="text-[11px] text-slate-400 shrink-0">
                            {formatRelativeTime(notif.created_at)}
                          </span>
                        </div>
                        <DynamicTranslatedText
                          text={notif.message}
                          as="p"
                          className="text-xs sm:text-sm text-slate-600 mt-0.5 leading-snug"
                        />
                      </div>
                    ) : notif.type === 'application_received' ? (
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs sm:text-sm font-semibold text-slate-900">{notif.title}</p>
                          <span className="text-[11px] text-slate-400 shrink-0">
                            {formatRelativeTime(notif.created_at)}
                          </span>
                        </div>
                        <DynamicTranslatedText
                          text={notif.message}
                          as="p"
                          className="text-xs sm:text-sm text-slate-600 mt-0.5 leading-snug"
                        />
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs sm:text-sm text-slate-800 leading-snug">
                            {companyName ? (
                              <>
                                <span className="font-semibold text-slate-900">
                                  {translateCompanySync(companyName, language) || companyName}
                                </span>{' '}
                                {language === 'ta'
                                  ? 'புதிய பணியிடத்தை அறிவித்துள்ளது: '
                                  : language === 'hi'
                                  ? 'ने नई नौकरी पोस्ट की: '
                                  : 'posted a new role: '}
                                <span className="font-medium text-slate-900">
                                  {translateJobTitleSync(jobTitle, language) || jobTitle}
                                </span>
                              </>
                            ) : (
                              <span className="font-medium text-slate-900">
                                {translateJobTitleSync(notif.title.replace(/^New Job:\s*/i, ''), language) || notif.title.replace(/^New Job:\s*/i, '')}
                              </span>
                            )}
                          </p>
                          <span className="text-[11px] text-slate-400 shrink-0">
                            {formatRelativeTime(notif.created_at)}
                          </span>
                        </div>

                        {(location || workplaceType || salary) && (
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                            {location && <span>{translateLocationSync(location, language)}</span>}
                            {location && workplaceType && <span>•</span>}
                            {workplaceType && (
                              <span>{formatWorkplaceType(workplaceType, language)}</span>
                            )}
                            {salary && (
                              <>
                                <span>•</span>
                                <span className="font-medium text-slate-600">
                                  {formatSalary(salary, language)}
                                </span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Subtle Unread Dot */}
                {isUnread && (
                  <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0 mt-2" />
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
