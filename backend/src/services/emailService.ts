/**
 * Resend Production Email Service for Namma Ooru Jobs
 *
 * Clean, human, authentic email templates (no loud AI-marketing banners or badges).
 * Provides transactional and broadcast email delivery over Resend's REST API.
 * 100% compatible with both Cloudflare Workers runtime (fetch) and Node.js.
 * All environment variables, URLs, and database records are dynamically driven.
 *
 * Supported Scenarios:
 * 1. New Job Post Broadcast (sent dynamically to all active registered candidates)
 * 2. New Follower Notification (sent dynamically when a user follows another user)
 * 3. HR Recruiter Direct Interest (sent dynamically when HR recruiter expresses interest in an employee)
 */

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
  fromName?: string
  bcc?: string | string[]
}

export interface JobNotificationPayload {
  id: string
  title: string
  company_name: string
  location: string
  workplace_type: string
  employment_type: string
  description: string
  salary_range?: string
}

export interface FollowNotificationPayload {
  recipientEmail: string
  recipientName: string
  followerName: string
  followerHeadline?: string
  followerCompany?: string
  followerAvatar?: string
  followerId: string
}

export interface HrInterestNotificationPayload {
  candidateEmail: string
  candidateName: string
  hrName: string
  hrCompany: string
  hrPosition?: string
  hrId: string
  customMessage?: string
}

export function getResendConfig(env?: any) {
  const gProcess = (globalThis as any).process
  const apiKey =
    env?.RESEND_API_KEY ||
    gProcess?.env?.RESEND_API_KEY ||
    're_DivJhjK7_8i2yiWegDQjFpDWSH2icaUxw'
  const defaultFrom =
    env?.EMAIL_FROM ||
    gProcess?.env?.EMAIL_FROM ||
    'Namma Ooru Jobs <onboarding@resend.dev>'
  const appUrl =
    env?.APP_URL ||
    gProcess?.env?.APP_URL ||
    'https://namma-ooru-jobs.pages.dev'
  return {
    apiKey,
    defaultFrom,
    appUrl,
    apiUrl: 'https://api.resend.com/emails',
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Universal Send Email function - Powered by Resend REST API
 */
export async function sendEmail(options: EmailOptions, env?: any): Promise<{ id: string }> {
  const config = getResendConfig(env)
  const from = options.from
    ? (options.fromName ? `${options.fromName} <${options.from}>` : options.from)
    : config.defaultFrom

  const rawRecipients = Array.isArray(options.to) ? options.to : [options.to]
  const rawBcc = options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]) : []

  // Clean and filter valid recipient email addresses
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const validTo = rawRecipients
    .map((e) => e.trim().toLowerCase())
    .filter((e) => emailRegex.test(e) && !e.includes('@phone.nammaoorujobs.com'))
  const validBcc = rawBcc
    .map((e) => e.trim().toLowerCase())
    .filter((e) => emailRegex.test(e) && !e.includes('@phone.nammaoorujobs.com'))

  if (validTo.length === 0 && validBcc.length === 0) {
    console.warn('[EmailService] No valid recipient email addresses provided.')
    return { id: 'skipped_no_recipients' }
  }

  // Extract clean email address from sender for BCC fallback recipient
  const fromEmailMatch = from.match(/<([^>]+)>/)
  const fallbackFromEmail = fromEmailMatch ? fromEmailMatch[1] : from

  const payload: Record<string, any> = {
    from,
    to: validTo.length > 0 ? validTo : [fallbackFromEmail],
    subject: options.subject,
    html: options.html,
  }

  if (options.text) payload.text = options.text
  if (validBcc.length > 0) payload.bcc = validBcc

  const res = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '')
    throw new Error(`Resend API Error (${res.status}): ${errorBody}`)
  }

  const data = (await res.json().catch(() => ({ id: 'ok' }))) as { id: string }
  return data
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. SCENARIO: NEW JOB POSTING EMAIL TEMPLATE & BROADCAST
// ─────────────────────────────────────────────────────────────────────────────

export function buildNewJobEmailTemplate(job: JobNotificationPayload, appUrl = 'https://namma-ooru-jobs.pages.dev'): string {
  const jobUrl = `${appUrl}/jobs`
  const cleanDesc = (job.description || '')
    .replace(/<[^>]*>?/gm, '')
    .slice(0, 320)

  const salarySnippet = job.salary_range
    ? `<div style="font-size:13px;color:#0F172A;font-weight:600;margin-top:6px;">Compensation: ${escapeHtml(job.salary_range)}</div>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Job: ${escapeHtml(job.title)}</title>
</head>
<body style="margin:0;padding:24px 16px;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E293B;line-height:1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:540px;background-color:#FFFFFF;border-radius:12px;border:1px solid #E2E8F0;padding:28px 24px;text-align:left;">
          
          <!-- Simple Header -->
          <tr>
            <td style="padding-bottom:18px;border-bottom:1px solid #E2E8F0;">
              <div style="font-size:14px;font-weight:700;color:#0B2545;letter-spacing:-0.2px;">
                Namma Ooru Jobs
              </div>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding-top:20px;">
              <p style="font-size:15px;color:#1E293B;margin:0 0 16px 0;">
                Hi,
              </p>
              <p style="font-size:15px;color:#334155;margin:0 0 20px 0;line-height:1.6;">
                A new opening was just posted that matches opportunities in your area:
              </p>

              <!-- Job Snippet Box -->
              <div style="border:1px solid #E2E8F0;border-radius:8px;padding:16px 18px;margin:20px 0;background-color:#FAFAFA;">
                <div style="font-size:16px;font-weight:700;color:#0F172A;margin-bottom:4px;">
                  ${escapeHtml(job.title)}
                </div>
                <div style="font-size:13px;color:#475569;line-height:1.5;">
                  <strong>${escapeHtml(job.company_name)}</strong> &bull; ${escapeHtml(job.location)} (${escapeHtml(job.workplace_type || 'On-site')})
                </div>
                ${salarySnippet}
                <p style="font-size:13px;color:#475569;margin:12px 0 0 0;line-height:1.6;">
                  ${escapeHtml(cleanDesc)}...
                </p>
              </div>

              <!-- Button CTA -->
              <div style="margin:24px 0 20px 0;">
                <a href="${jobUrl}" target="_blank" style="display:inline-block;background-color:#0B2545;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:600;padding:10px 22px;border-radius:6px;">
                  View details &amp; apply
                </a>
              </div>

              <div style="font-size:13px;color:#64748B;line-height:1.5;">
                Best regards,<br>
                The Namma Ooru Jobs Team
              </div>
            </td>
          </tr>

          <!-- Subtle Footer -->
          <tr>
            <td style="padding-top:24px;border-top:1px solid #E2E8F0;margin-top:24px;font-size:12px;color:#94A3B8;line-height:1.5;">
              You received this job alert because you have an active account on Namma Ooru Jobs.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function broadcastNewJobEmail(
  db: any,
  job: JobNotificationPayload,
  env?: any
): Promise<{ totalSent: number; errors: number }> {
  try {
    const config = getResendConfig(env)
    const { results } = await db
      .prepare(
        `SELECT DISTINCT email, full_name, role 
         FROM users 
         WHERE email IS NOT NULL 
           AND email != '' 
           AND email NOT LIKE '%@phone.nammaoorujobs.com'
           AND is_active = 1`
      )
      .all()

    const users = (results || []) as { email: string; full_name: string; role: string }[]
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const validEmails = users
      .map((u) => u.email.trim().toLowerCase())
      .filter((e) => emailRegex.test(e))

    if (validEmails.length === 0) {
      console.log('[EmailService] No registered email users found for broadcast.')
      return { totalSent: 0, errors: 0 }
    }

    console.log(`[EmailService] Preparing new job alert broadcast for ${validEmails.length} dynamic users from database...`)

    const subject = `New Job Opening: ${job.title} at ${job.company_name}`
    const htmlContent = buildNewJobEmailTemplate(job, config.appUrl)

    const fromEmailMatch = config.defaultFrom.match(/<([^>]+)>/)
    const toFallback = fromEmailMatch ? fromEmailMatch[1] : config.defaultFrom

    const BATCH_SIZE = 40
    let totalSent = 0
    let errorCount = 0

    for (let i = 0; i < validEmails.length; i += BATCH_SIZE) {
      const batch = validEmails.slice(i, i + BATCH_SIZE)
      try {
        await sendEmail({
          to: toFallback,
          bcc: batch,
          subject,
          html: htmlContent,
        }, env)
        totalSent += batch.length
        console.log(`[EmailService] Successfully sent batch (${i + 1}-${i + batch.length}) of ${validEmails.length}`)
      } catch (batchErr) {
        errorCount += batch.length
        console.error(`[EmailService] Failed to send email batch:`, batchErr)
      }
    }

    return { totalSent, errors: errorCount }
  } catch (err) {
    console.error('[EmailService] Error during new job broadcast:', err)
    return { totalSent: 0, errors: 1 }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SCENARIO: NEW FOLLOWER EMAIL NOTIFICATION
// ─────────────────────────────────────────────────────────────────────────────

export function buildFollowNotificationEmail(payload: FollowNotificationPayload, appUrl = 'https://namma-ooru-jobs.pages.dev'): string {
  const profileUrl = `${appUrl}/network`
  const headlinePart = payload.followerHeadline
    ? ` (${escapeHtml(payload.followerHeadline)}${payload.followerCompany ? ` at ${escapeHtml(payload.followerCompany)}` : ''})`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(payload.followerName)} started following you</title>
</head>
<body style="margin:0;padding:24px 16px;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E293B;line-height:1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:540px;background-color:#FFFFFF;border-radius:12px;border:1px solid #E2E8F0;padding:28px 24px;text-align:left;">
          
          <!-- Simple Header -->
          <tr>
            <td style="padding-bottom:18px;border-bottom:1px solid #E2E8F0;">
              <div style="font-size:14px;font-weight:700;color:#0B2545;letter-spacing:-0.2px;">
                Namma Ooru Jobs
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding-top:20px;">
              <p style="font-size:15px;color:#1E293B;margin:0 0 16px 0;">
                Hi ${escapeHtml(payload.recipientName || 'there')},
              </p>
              <p style="font-size:15px;color:#334155;margin:0 0 20px 0;line-height:1.6;">
                <strong>${escapeHtml(payload.followerName)}</strong>${headlinePart} started following you on Namma Ooru Jobs.
              </p>

              <!-- Button CTA -->
              <div style="margin:24px 0 20px 0;">
                <a href="${profileUrl}" target="_blank" style="display:inline-block;background-color:#0B2545;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:600;padding:10px 22px;border-radius:6px;">
                  View profile
                </a>
              </div>

              <div style="font-size:13px;color:#64748B;line-height:1.5;">
                Best regards,<br>
                The Namma Ooru Jobs Team
              </div>
            </td>
          </tr>

          <!-- Subtle Footer -->
          <tr>
            <td style="padding-top:24px;border-top:1px solid #E2E8F0;margin-top:24px;font-size:12px;color:#94A3B8;line-height:1.5;">
              Namma Ooru Jobs &bull; Professional network for Tamil Nadu
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function sendNewFollowerEmail(payload: FollowNotificationPayload, env?: any): Promise<void> {
  const config = getResendConfig(env)
  const subject = `${payload.followerName} started following you on Namma Ooru Jobs`
  const html = buildFollowNotificationEmail(payload, config.appUrl)

  await sendEmail({
    to: payload.recipientEmail,
    subject,
    html,
  }, env)
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SCENARIO: HR RECRUITER EXPRESSES DIRECT INTEREST IN AN EMPLOYEE
// ─────────────────────────────────────────────────────────────────────────────

export function buildHrInterestEmailTemplate(payload: HrInterestNotificationPayload, appUrl = 'https://namma-ooru-jobs.pages.dev'): string {
  const messagesUrl = `${appUrl}/messages`

  const messageBox = payload.customMessage
    ? `
      <div style="border-left:3px solid #0B2545;background-color:#F8FAFC;padding:14px 18px;margin:20px 0;border-radius:0 8px 8px 0;">
        <p style="margin:0;font-size:14px;color:#1E293B;line-height:1.6;">
          &ldquo;${escapeHtml(payload.customMessage)}&rdquo;
        </p>
      </div>
    `
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Note from ${escapeHtml(payload.hrName)} at ${escapeHtml(payload.hrCompany)}</title>
</head>
<body style="margin:0;padding:24px 16px;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E293B;line-height:1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:540px;background-color:#FFFFFF;border-radius:12px;border:1px solid #E2E8F0;padding:28px 24px;text-align:left;">
          
          <!-- Simple Minimal Header -->
          <tr>
            <td style="padding-bottom:18px;border-bottom:1px solid #E2E8F0;">
              <div style="font-size:14px;font-weight:700;color:#0B2545;letter-spacing:-0.2px;">
                Namma Ooru Jobs
              </div>
            </td>
          </tr>

          <!-- Message Body -->
          <tr>
            <td style="padding-top:20px;">
              <p style="font-size:15px;color:#1E293B;margin:0 0 16px 0;">
                Hi ${escapeHtml(payload.candidateName || 'there')},
              </p>
              
              <p style="font-size:15px;color:#334155;margin:0 0 20px 0;line-height:1.6;">
                <strong>${escapeHtml(payload.hrName)}</strong> from <strong>${escapeHtml(payload.hrCompany)}</strong> reviewed your profile on Namma Ooru Jobs and would like to speak with you regarding open opportunities.
              </p>

              ${messageBox}

              <!-- Direct Reply Action -->
              <div style="margin:24px 0 24px 0;">
                <a href="${messagesUrl}" target="_blank" style="display:inline-block;background-color:#0B2545;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:600;padding:10px 22px;border-radius:6px;">
                  Reply to ${escapeHtml(payload.hrName)}
                </a>
              </div>

              <!-- Recruiter Signoff -->
              <div style="font-size:13px;color:#64748B;line-height:1.5;margin-bottom:24px;">
                <strong style="color:#0F172A;">${escapeHtml(payload.hrName)}</strong><br>
                ${escapeHtml(payload.hrPosition || 'HR Recruiter')}, ${escapeHtml(payload.hrCompany)}
              </div>
            </td>
          </tr>

          <!-- Clean Footer -->
          <tr>
            <td style="padding-top:20px;border-top:1px solid #E2E8F0;font-size:12px;color:#94A3B8;line-height:1.5;">
              This invitation was sent directly to you by a verified employer through Namma Ooru Jobs.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function sendHrInterestEmail(payload: HrInterestNotificationPayload, env?: any): Promise<void> {
  const config = getResendConfig(env)
  const subject = `${payload.hrName} from ${payload.hrCompany} is interested in your profile`
  const html = buildHrInterestEmailTemplate(payload, config.appUrl)

  await sendEmail({
    to: payload.candidateEmail,
    subject,
    html,
  }, env)
}
