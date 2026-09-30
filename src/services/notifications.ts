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

export const initPushNotifications = async (
  onNotification?: (title: string, body: string) => void
) => {
  if (!Capacitor.isNativePlatform()) {
    // Web fallback / development mode
    return
  }

  try {
    // 1. Create High-Priority Notification Channel (Required for Android 8.0+)
    await PushNotifications.createChannel({
      id: 'namma_ooru_jobs_alerts',
      name: 'Namma Ooru Job Alerts & Messages',
      description: 'Instant alerts for job postings, messages, and followers',
      importance: 5, // High importance (heads-up notification + sound)
      visibility: 1, // Visible on lockscreen
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

      // Send token to Cloudflare Workers edge API with auth if present
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

    // 5. Foreground notification received
    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[Push] Foreground notification:', notification)
      if (onNotification && notification.title) {
        onNotification(notification.title, notification.body || '')
      }
    })

    // 6. Notification tapped by user -> deep link to relevant screen
    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[Push] Notification tapped:', action)
      const data = action.notification?.data
      if (data?.type === 'chat_message') {
        window.dispatchEvent(new CustomEvent('namma:navigate', { detail: { path: '/messages' } }))
      } else if (data?.type === 'user_follow' && data.follower_id) {
        window.dispatchEvent(new CustomEvent('namma:navigate', { detail: { path: `/profile/${data.follower_id}` } }))
      } else if (data?.type === 'job_posted' && data.job_id) {
        window.dispatchEvent(new CustomEvent('namma:navigate', { detail: { path: `/jobs/${data.job_id}` } }))
      }
    })
  } catch (err) {
    console.error('[Push] Initialization failed:', err)
  }
}
