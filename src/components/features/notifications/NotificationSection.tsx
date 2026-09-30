import React, { useState, useEffect, useCallback } from 'react'
import { Bell, Briefcase } from 'lucide-react'
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

interface NotificationSectionProps {
  onSelectJob?: (jobId: string, jobTitle?: string) => void
}

export const NotificationSection: React.FC<NotificationSectionProps> = ({ onSelectJob }) => {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [filterType, setFilterType] = useState<'all' | 'unread'>('all')
  const [isLoading, setIsLoading] = useState(true)

  const { t, language } = useLanguage()
  const { showToast } = useToast()

  const loadNotifications = useCallback(async () => {
    if (!user) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const data = await notificationService.getNotifications()
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
    loadNotifications()
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
    }
  }

  const formatRelativeTime = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime()
      const diffMins = Math.floor(diffMs / 60000)
      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      const diffHours = Math.floor(diffMins / 60)
      if (diffHours < 24) return `${diffHours}h ago`
      const diffDays = Math.floor(diffHours / 24)
      return `${diffDays}d ago`
    } catch {
      return ''
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
            {t('notif_title')}
          </h2>
          {unreadCount > 0 && (
            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-semibold text-white">
              {unreadCount} {t('notif_new')}
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition cursor-pointer"
          >
            {t('notif_mark_all_read')}
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
            {t('notif_all')} ({notifications.length})
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
            {t('notif_unread')} ({unreadCount})
          </button>
        </div>
      </div>

      {/* iOS Grouped Notifications List */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs divide-y divide-slate-100 overflow-hidden">
        {isLoading && notifications.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <p className="text-xs font-medium">{t('notif_loading')}</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-14 px-4 text-center">
            <div className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Bell className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-slate-800">{t('notif_empty_title')}</p>
            <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              {t('notif_empty_desc')}
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

            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`group flex items-center justify-between gap-3 px-4 py-3.5 transition cursor-pointer ${
                  isUnread ? 'bg-blue-50/30 hover:bg-blue-50/50' : 'bg-white hover:bg-slate-50/80'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  {/* Clean Initial Avatar */}
                  <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-700 font-semibold text-xs shrink-0 select-none">
                    {companyName ? (
                      <span>{companyName.charAt(0).toUpperCase()}</span>
                    ) : (
                      <Briefcase className="h-4 w-4 text-slate-500" />
                    )}
                  </div>

                  {/* Clean Human Typography */}
                  <div className="min-w-0 flex-1">
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
                      <span>•</span>
                      <span>{formatRelativeTime(notif.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* iOS Subtle Blue Unread Indicator */}
                {isUnread && (
                  <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
