// Server-Side Content & Image Moderation Engine with Google AI & 24h Auto-Suspension Policy

export type ViolationType =
  | 'BAD_WORD'
  | 'HARASSMENT'
  | 'SEXUAL_TEXT'
  | 'NUDITY_IMAGE'
  | 'EXPLICIT_IMAGE'
  | 'VIOLENT_IMAGE'
  | 'OTHER'

export type ContentType = 'MESSAGE' | 'PROFILE' | 'IMAGE' | 'POST' | 'COMMENT'
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface ModerationResult {
  isSafe: boolean
  violationType?: ViolationType
  severity?: Severity
  reason?: string
  confidence?: number
  flaggedTerms?: string[]
}

// Built-in multilingual safety dictionary (English, Tamil transliterated/Tanglish, Hindi)
// Provides instant zero-latency protection and safe fallback if external AI is unreachable
const SAFETY_PATTERNS: Array<{
  regex: RegExp
  type: ViolationType
  severity: Severity
  reason: string
}> = [
  // Harassment & Abusive Language
  {
    regex: /\b(f+u+c+k+|b+i+t+c+h+|a+s+s+h+o+l+e+|b+a+s+t+a+r+d+|d+i+c+k+h+e+a+d+|m+o+t+h+e+r+f+u+c+k+e+r+)\b/i,
    type: 'BAD_WORD',
    severity: 'HIGH',
    reason: 'Profane or abusive language detected',
  },
  // Threats & Violence
  {
    regex: /\b(i('?ll| will) (kill|murder|shoot|stab|destroy) you|i will hunt you down|commit suicide|die you bitch)\b/i,
    type: 'HARASSMENT',
    severity: 'CRITICAL',
    reason: 'Violent threats or severe harassment detected',
  },
  // Sexual & Explicit Content
  {
    regex: /\b(send nudes|naked photos|sex chat|call girl|escort service|pornography|blowjob|anal sex|nude pics)\b/i,
    type: 'SEXUAL_TEXT',
    severity: 'HIGH',
    reason: 'Sexually explicit solicitation or pornography detected',
  },
  // Tamil Tanglish Abusive terms
  {
    regex: /\b(thevidiya|thevidiya paiya|ombura|poolu|sunni|punda|pundamavane|oombu|kena punda)\b/i,
    type: 'BAD_WORD',
    severity: 'HIGH',
    reason: 'Abusive language or vulgarity detected (Tamil)',
  },
  // Hindi Abusive terms
  {
    regex: /\b(madarchod|bhenchod|chutiya|gandu|harami|bhosdike|raand|kuttiya)\b/i,
    type: 'BAD_WORD',
    severity: 'HIGH',
    reason: 'Abusive or derogatory language detected (Hindi)',
  },
]

/**
 * Moderate text using Google Gemini AI with high-reliability fallback
 */
export async function moderateText(
  text: string,
  context: { contentType: ContentType; userId?: string },
  env?: any
): Promise<ModerationResult> {
  const trimmed = (text || '').trim()
  if (!trimmed) {
    return { isSafe: true }
  }

  // 1. Instant zero-latency pre-check against safety patterns
  for (const rule of SAFETY_PATTERNS) {
    if (rule.regex.test(trimmed)) {
      return {
        isSafe: false,
        violationType: rule.type,
        severity: rule.severity,
        reason: rule.reason,
        confidence: 0.98,
      }
    }
  }

  // 2. Google Gemini AI Moderation (if API key available)
  const apiKey = env?.GEMINI_API_KEY || env?.GOOGLE_AI_KEY || env?.GOOGLE_CLOUD_API_KEY
  if (apiKey) {
    try {
      const prompt = `You are a strict server-side content moderation engine for a professional social and employment network.
Analyze the following user-submitted ${context.contentType}:
"""
${trimmed}
"""

Classify if this content contains any of:
- Abusive language, slurs, or vulgar profanity (BAD_WORD)
- Harassment, stalking, or targeted hate/bullying (HARASSMENT)
- Sexual solicitations, adult services, or explicit text (SEXUAL_TEXT)
- Violent threats or incitement to self-harm (HARASSMENT)

Respond ONLY with a valid JSON object in this exact schema, without markdown formatting:
{
  "isSafe": boolean,
  "violationType": "BAD_WORD" | "HARASSMENT" | "SEXUAL_TEXT" | "OTHER" | null,
  "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | null,
  "reason": "concise explanation if unsafe, else empty string",
  "confidence": number between 0.0 and 1.0
}`

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: 'application/json',
            },
          }),
        }
      )

      if (response.ok) {
        const data: any = await response.json()
        const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text
        if (rawJson) {
          const parsed = JSON.parse(rawJson)
          if (parsed && typeof parsed.isSafe === 'boolean') {
            return {
              isSafe: parsed.isSafe,
              violationType: parsed.violationType || 'BAD_WORD',
              severity: parsed.severity || 'HIGH',
              reason: parsed.reason || 'Flagged by Google AI Content Safety filter',
              confidence: parsed.confidence || 0.9,
            }
          }
        }
      }
    } catch (err) {
      console.warn('[Moderation] Gemini AI API call fallback:', err)
      // Safe fallback: deterministic check has already passed safely
    }
  }

  return { isSafe: true }
}

/**
 * Moderate image to detect nudity, sexually explicit, pornographic, or violent imagery
 */
export async function moderateImage(
  imageDataOrUrl: string,
  env?: any
): Promise<ModerationResult> {
  if (!imageDataOrUrl) {
    return { isSafe: true }
  }

  // Quick heuristic check for file name or mock flags
  const lower = imageDataOrUrl.toLowerCase()
  if (
    lower.includes('nude') ||
    lower.includes('explicit') ||
    lower.includes('nsfw') ||
    lower.includes('porn') ||
    lower.includes('gore')
  ) {
    return {
      isSafe: false,
      violationType: 'NUDITY_IMAGE',
      severity: 'CRITICAL',
      reason: 'Prohibited explicit visual content detected',
      confidence: 0.99,
    }
  }

  const apiKey = env?.GEMINI_API_KEY || env?.GOOGLE_AI_KEY || env?.GOOGLE_CLOUD_API_KEY
  if (apiKey && imageDataOrUrl.startsWith('data:image/')) {
    try {
      const match = imageDataOrUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/)
      if (match) {
        const mimeType = match[1]
        const base64Data = match[2]

        const prompt = `Analyze this image for safety. Does it contain adult nudity, sexually explicit content, graphic violence, or gore?
Respond ONLY with a JSON object:
{
  "isSafe": boolean,
  "violationType": "NUDITY_IMAGE" | "EXPLICIT_IMAGE" | "VIOLENT_IMAGE" | null,
  "severity": "LOW" | "HIGH" | "CRITICAL" | null,
  "reason": "explanation if unsafe"
}`

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt },
                    {
                      inlineData: {
                        mimeType,
                        data: base64Data,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.1,
                responseMimeType: 'application/json',
              },
            }),
          }
        )

        if (response.ok) {
          const data: any = await response.json()
          const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text
          if (rawJson) {
            const parsed = JSON.parse(rawJson)
            if (typeof parsed.isSafe === 'boolean') {
              return {
                isSafe: parsed.isSafe,
                violationType: parsed.violationType || 'NUDITY_IMAGE',
                severity: parsed.severity || 'HIGH',
                reason: parsed.reason || 'Flagged by Google AI Image Safety filter',
                confidence: 0.95,
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('[Moderation] Gemini Vision API call fallback:', err)
    }
  }

  return { isSafe: true }
}

/**
 * Record violation and apply the 24-hour automatic deactivation policy
 */
export async function applyAccountModerationPolicy(
  db: any,
  userId: string,
  violation: {
    violationType: ViolationType
    contentType: ContentType
    reason: string
    severity?: Severity
    metadata?: any
  },
  durationHours = 24
): Promise<{ deactivatedUntil: string; reason: string }> {
  const violationId = `viol_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  const deactivatedUntil = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString()
  const severity = violation.severity || 'HIGH'
  const metadataStr = JSON.stringify(violation.metadata || {})

  // 1. Record violation in audit log
  await db
    .prepare(
      `INSERT INTO user_violations (id, user_id, violation_type, content_type, severity, reason, created_at, deactivated_until, metadata)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)`
    )
    .bind(
      violationId,
      userId,
      violation.violationType,
      violation.contentType,
      severity,
      violation.reason,
      deactivatedUntil,
      metadataStr
    )
    .run()

  // 2. Automatically deactivate the user account
  await db
    .prepare(
      `UPDATE users 
       SET is_active = 0, status = 'deactivated', deactivated_until = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .bind(deactivatedUntil, userId)
    .run()

  return {
    deactivatedUntil,
    reason: violation.reason,
  }
}

/**
 * Validates whether user is active, and automatically reactivates if the 24h temporary ban has expired.
 * Returns { isActive: boolean, deactivatedUntil?: string, reactivated: boolean }
 */
export async function checkAndReactivateUser(
  user: any,
  db: any
): Promise<{ isActive: boolean; deactivatedUntil?: string; reactivated: boolean }> {
  if (!user) {
    return { isActive: false, reactivated: false }
  }

  const isDeactivated = user.is_active === 0 || user.status === 'deactivated' || user.status === 'suspended'

  if (!isDeactivated) {
    return { isActive: true, reactivated: false }
  }

  // Check if deactivatedUntil is present and has expired
  if (user.deactivated_until) {
    const expiryTime = new Date(user.deactivated_until).getTime()
    const now = Date.now()

    if (now >= expiryTime) {
      // 1-Day Suspension has elapsed! Automatically reactivate account!
      await db
        .prepare(
          `UPDATE users 
           SET is_active = 1, status = 'active', deactivated_until = NULL, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`
        )
        .bind(user.id)
        .run()

      user.is_active = 1
      user.status = 'active'
      user.deactivated_until = null

      return { isActive: true, reactivated: true }
    } else {
      // Still temporarily deactivated
      return {
        isActive: false,
        deactivatedUntil: user.deactivated_until,
        reactivated: false,
      }
    }
  }

  // Deactivated indefinitely (manual admin action)
  return { isActive: false, reactivated: false }
}
