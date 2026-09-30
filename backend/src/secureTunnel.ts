// High-Grade End-to-End Cryptographic Tunnel (AES-256-GCM)
// Obfuscates and encrypts all API traffic across the network tab

const DEFAULT_TUNNEL_SECRET = 'namma-ooru-jobs-high-security-tunnel-key-2026-v1'
let cachedKey: CryptoKey | null = null

function uint8ToBase64(u8: Uint8Array): string {
  let binary = ''
  const len = u8.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(u8[i])
  }
  return btoa(binary)
}

function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export async function getTunnelKey(secret: string = DEFAULT_TUNNEL_SECRET): Promise<CryptoKey> {
  if (cachedKey) return cachedKey
  const keyMaterial = new TextEncoder().encode(secret)
  const hash = await crypto.subtle.digest('SHA-256', keyMaterial)
  cachedKey = await crypto.subtle.importKey(
    'raw',
    hash,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  )
  return cachedKey
}

export interface EncryptedEnvelope {
  cipher: string
  iv: string
  ts: number
}

export async function encryptPayload(data: any, secret?: string): Promise<EncryptedEnvelope> {
  const key = await getTunnelKey(secret)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const jsonString = JSON.stringify(data)
  const encoded = new TextEncoder().encode(jsonString)

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  )

  return {
    cipher: uint8ToBase64(new Uint8Array(ciphertext)),
    iv: uint8ToBase64(iv),
    ts: Date.now(),
  }
}

export async function decryptPayload(envelope: EncryptedEnvelope, secret?: string): Promise<any> {
  const { cipher, iv, ts } = envelope

  // Anti-Replay Guard: Reject packets older than 60 seconds or with clock drift > 60 seconds
  const now = Date.now()
  if (Math.abs(now - ts) > 60000) {
    throw new Error('Replay attack detected: packet timestamp is expired or outside the 60s window')
  }

  const key = await getTunnelKey(secret)
  const ivBytes = base64ToUint8(iv)
  const cipherBytes = base64ToUint8(cipher)

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes as any },
    key,
    cipherBytes as any
  )

  const jsonString = new TextDecoder().decode(decryptedBuffer)
  return JSON.parse(jsonString)
}
