import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { API_BASE } from '../constants'

export const syncDeviceTokenWithUser = async (userId: string, userToken?: string) => {
  if (!Capacitor.isNativePlatform()) return
  const fcmToken = localStorage.getItem('fcm_device_token')
  if (!fcmToken) return

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const authToken = userToken || localStorage.getItem('namma_token')
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }

    await fetch(`${API_BASE}/api/notifications/register-token`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        token: fcmToken,
        platform: 'android',
        user_id: userId,
      }),
    })
    console.log('[Push] Linked FCM token with user:', userId)
  } catch (err) {
    console.warn('[Push] Failed to link device token with user:', err)
  }
}

/**
 * Maps notification data to a namma:navigate custom event.
 * This is the single source of truth for all notification-to-screen mappings.
 */
function dispatchNavigationFromData(data: Record<string, string> | undefined | null) {
  if (!data?.type) return

  const type = data.type

  if (type === 'chat_message') {
    window.dispatchEvent(new CustomEvent('namma:navigate', {
      detail: { tab: 'messages', conversationUserId: data.sender_id || null },
    }))
  } else if (type === 'user_follow') {
    window.dispatchEvent(new CustomEvent('namma:navigate', {
      detail: { tab: 'notifications' },
    }))
  } else if (type === 'hr_interest') {
    window.dispatchEvent(new CustomEvent('namma:navigate', {
      detail: { tab: 'messages' },
    }))
  } else if (type === 'hr_account_approved' || type === 'hr_account_rejected') {
    window.dispatchEvent(new CustomEvent('namma:navigate', {
      detail: { tab: 'notifications' },
    }))
  } else if (type === 'profile_update_approved') {
    window.dispatchEvent(new CustomEvent('namma:navigate', {
      detail: { tab: 'profile' },
    }))
  } else if (type === 'profile_update_rejected') {
    window.dispatchEvent(new CustomEvent('namma:navigate', {
      detail: { tab: 'notifications' },
    }))
  } else if (type === 'job_posted') {
    window.dispatchEvent(new CustomEvent('namma:navigate', {
      detail: { tab: 'jobs', jobId: data.job_id || null },
    }))
  } else {
    // Default: open notifications tab
    window.dispatchEvent(new CustomEvent('namma:navigate', {
      detail: { tab: 'notifications' },
    }))
  }
}

export const initPushNotifications = async (
  onForegroundNotification?: () => void
) => {
  if (!Capacitor.isNativePlatform()) return

  try {
    // 1. Create High-Priority Notification Channel (Required for Android 8.0+)
    await PushNotifications.createChannel({
      id: 'namma_ooru_jobs_alerts',
      name: 'Namma Ooru Job Alerts & Messages',
      description: 'Instant alerts for job postings, messages, and followers',
      importance: 5,
      visibility: 1,
      sound: 'default',
      vibration: true,
      lights: true,
      lightColor: '#F97316',
    })

    // 2. Request permission (handles Android 13+ POST_NOTIFICATIONS)
    let permStatus = await PushNotifications.checkPermissions()
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions()
    }

    if (permStatus.receive !== 'granted') {
      console.warn('[Push] Notification permission not granted')
      return
    }

    // 3. Register with Google FCM
    await PushNotifications.register()

    // 4. Listen for FCM Device Token
    await PushNotifications.addListener('registration', async (token) => {
      console.log('[Push] FCM Token registered:', token.value)
      localStorage.setItem('fcm_device_token', token.value)

      try {
        const storedUser = localStorage.getItem('namma_user')
        const parsedUser = storedUser ? JSON.parse(storedUser) : null
        const authToken = localStorage.getItem('namma_token')

        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`
        }

        await fetch(`${API_BASE}/api/notifications/register-token`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            token: token.value,
            platform: 'android',
            user_id: parsedUser?.id || null,
          }),
        })
      } catch (err) {
        console.warn('[Push] Failed to save device token to edge API:', err)
      }
    })

    await PushNotifications.addListener('registrationError', (err) => {
      console.error('[Push] Registration error:', err.error)
    })

    // 5. Foreground notification received — silent, no popup
    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[Push] Foreground notification received:', notification.data)
      if (onForegroundNotification) {
        onForegroundNotification()
      }
    })

    // 6. User TAPPED a notification (works from background AND killed state)
    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[Push] Notification tapped:', action.notification?.data)
      const data = action.notification?.data as Record<string, string> | undefined

      // Small delay ensures React has mounted and user auth state is ready
      setTimeout(() => {
        dispatchNavigationFromData(data)
      }, 600)
    })

  } catch (err) {
    console.error('[Push] Initialization failed:', err)
  }
}
