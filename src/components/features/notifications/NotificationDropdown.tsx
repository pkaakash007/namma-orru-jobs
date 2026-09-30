import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, Briefcase } from 'lucide-react'
import { notificationService } from '../../../services/api'
import { useLanguage } from '../../../context/LanguageContext'
import { useToast } from '../../../context/ToastContext'
import { useAuth } from '../../../context/AuthContext'
import type { AppNotification } from '../../../types'
import {
  translateLocationSync,
  formatWorkplaceType,
  translateJobTitleSync,
  translateCompanySync,
} from '../../../services/googleAiTranslate'

interface NotificationDropdownProps {
  onSelectJob?: (jobId: string, jobTitle?: string) => void
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onSelectJob }) => {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { t, language } = useLanguage()
  const { showToast } = useToast()

  const fetchNotifications = useCallback(async () => {
    if (!user) return
    try {
      const data = await notificationService.getNotifications()
      if (data?.notifications) {
        setNotifications(data.notifications)
        setUnreadCount(data.unread_count || 0)
      }
    } catch {
      // Quiet
    }
  }, [user?.id])

  // Load once on initial mount/login
  useEffect(() => {
    if (!user?.id) {
      setNotifications([])
      setUnreadCount(0)
      return
    }
    fetchNotifications()
  }, [user?.id, fetchNotifications])

  // Refresh whenever user actively opens the notifications menu
  useEffect(() => {
    if (isOpen && user?.id) {
      fetchNotifications()
    }
  }, [isOpen, user?.id, fetchNotifications])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

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
          setIsOpen(false)
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

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen)
          if (!isOpen) fetchNotifications()
        }}
        className="relative flex h-8 w-8 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
        title="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-bold text-white shadow-xs">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Clean Human Notification Popover */}
      {isOpen && (
        <div className="absolute right-0 top-10 z-50 w-80 sm:w-96 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden text-xs">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-white">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-900">{t('notif_title')}</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                  {unreadCount}
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-xs text-slate-500 hover:text-slate-900 font-normal hover:underline transition cursor-pointer"
              >
                {t('notif_mark_all_read')}
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Bell className="h-4 w-4" />
                </div>
                <p className="font-medium text-slate-700">{t('notif_empty_title')}</p>
                <p className="mt-0.5 text-xs text-slate-400 max-w-xs mx-auto">
                  {t('notif_empty_desc')}
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isUnread = !notif.is_read
                let parsedData: any = null
                try {
                  parsedData = notif.data ? JSON.parse(notif.data) : null
                } catch {}

                const companyName = parsedData?.company_name || ''
                const jobTitle = parsedData?.title || notif.title.replace(/^New Job:\s*/i, '').trim()
                const location = parsedData?.location || ''
                const workplaceType = parsedData?.workplace_type || ''

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`group flex items-start gap-3 px-4 py-3 transition cursor-pointer hover:bg-slate-50 ${
                      isUnread ? 'bg-slate-50/70' : 'bg-white'
                    }`}
                  >
                    {/* Company Initial or Briefcase */}
                    <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-700 font-semibold text-xs shrink-0 select-none">
                      {companyName ? (
                        <span>{companyName.charAt(0).toUpperCase()}</span>
                      ) : (
                        <Briefcase className="h-4 w-4 text-slate-500" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-800 leading-snug">
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

                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
                        {location && (
                          <>
                            <span className="truncate max-w-[130px]">
                              {translateLocationSync(location, language)}
                            </span>
                            <span>•</span>
                          </>
                        )}
                        {workplaceType && (
                          <>
                            <span>{formatWorkplaceType(workplaceType, language)}</span>
                            <span>•</span>
                          </>
                        )}
                        <span>{formatRelativeTime(notif.created_at)}</span>
                      </div>
                    </div>

                    {/* Subtle Unread Dot */}
                    {isUnread && (
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
