import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { API_BASE } from '../constants'

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
      description: 'Instant alerts for job postings, applications, and network messages',
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

      // Send token to Cloudflare Workers edge API
      try {
        await fetch(`${API_BASE}/api/notifications/register-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: token.value,
            platform: 'android',
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

    // 6. Notification tapped by user
    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[Push] Notification tapped:', action)
    })
  } catch (err) {
    console.error('[Push] Initialization failed:', err)
  }
}
