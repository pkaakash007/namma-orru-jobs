// Firebase Cloud Messaging (FCM) HTTP v1 Client for Cloudflare Workers
// Implements RFC 7523 OAuth2 JWT Bearer authorization using native Web Crypto API

interface ServiceAccount {
  project_id: string
  client_email: string
  private_key: string
}

function base64url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function strToBase64url(str: string): string {
  return base64url(new TextEncoder().encode(str))
}

function pemToBinary(pem: string): Uint8Array {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '')
  const raw = atob(b64)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i)
  }
  return bytes
}

// In-memory token cache to minimize Google OAuth token exchanges
let cachedAccessToken: string | null = null
let tokenExpiry = 0

export async function getGoogleAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  if (cachedAccessToken && now < tokenExpiry - 60) {
    return cachedAccessToken
  }

  const header = { alg: 'RS256', typ: 'JWT' }
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }

  const encodedHeader = strToBase64url(JSON.stringify(header))
  const encodedClaim = strToBase64url(JSON.stringify(claim))
  const unsignedToken = `${encodedHeader}.${encodedClaim}`

  const binaryKey = pemToBinary(sa.private_key)
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey.buffer as ArrayBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  )

  const signedJwt = `${unsignedToken}.${base64url(signature)}`

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: signedJwt,
    }).toString(),
  })

  if (!tokenRes.ok) {
    const errText = await tokenRes.text()
    throw new Error(`Google OAuth error (${tokenRes.status}): ${errText}`)
  }

  const tokenData = (await tokenRes.json()) as { access_token: string; expires_in: number }
  cachedAccessToken = tokenData.access_token
  tokenExpiry = now + (tokenData.expires_in || 3600)
  return cachedAccessToken
}

export interface FcmPayload {
  title: string
  body: string
  data?: Record<string, string>
}

export async function sendFcmNotification(
  sa: ServiceAccount,
  deviceToken: string,
  payload: FcmPayload
): Promise<{ success: boolean; response?: any; error?: string }> {
  try {
    const accessToken = await getGoogleAccessToken(sa)

    const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`

    const message = {
      message: {
        token: deviceToken,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        android: {
          priority: 'high',
          notification: {
            channel_id: 'namma_ooru_jobs_alerts',
            color: '#F97316',
            default_sound: true,
            default_vibrate_timings: true,
          },
        },
        data: payload.data || {},
      },
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })

    if (!res.ok) {
      const err = await res.text()
      return { success: false, error: err }
    }

    const data = await res.json()
    return { success: true, response: data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
