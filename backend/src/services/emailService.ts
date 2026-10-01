/**
 * Brevo SMTP Production Email Service for Namma Ooru Jobs
 *
 * Provides transactional and broadcast email delivery over direct TLS (port 465).
 * Compatible with both Cloudflare Workers runtime (cloudflare:sockets / workerd)
 * and Node.js runtime (node:tls).
 *
 * Supported Scenarios:
 * 1. New Job Post Broadcast (sent to all registered candidates across Tamil Nadu)
 * 2. New Follower Notification (sent when a user follows another user)
 * 3. HR Recruiter Interest Notification (sent when HR recruiter expresses interest in an employee)
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

// Brevo SMTP Production Configuration
const SMTP_CONFIG = {
  host: 'smtp-relay.brevo.com',
  port: 465, // Direct SSL/TLS
  user: '4cd4a2002@smtp-brevo.com',
  pass: 'xsmtpsib-76c0a98f9ebf64698fc35d2f4a6430a7cc95b52da26ff914fb8e4ce10390d83f-H11ezP7PRspe4OG6',
  defaultFrom: '4cd4a2002@smtp-brevo.com',
  defaultFromName: 'Namma Ooru Jobs',
}

const APP_URL = 'https://namma-ooru-jobs.pages.dev'

function utf8ToBase64(str: string): string {
  try {
    return btoa(unescape(encodeURIComponent(str)))
  } catch {
    return btoa(str)
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
 * Sends an email using Cloudflare Workers TCP sockets (cloudflare:sockets)
 */
async function sendViaCloudflareSockets(
  envelopeFrom: string,
  fromName: string,
  recipients: string[],
  subject: string,
  html: string,
  _text?: string
): Promise<void> {
  const { connect } = await import('cloudflare:sockets')
  const socket = connect(
    { hostname: SMTP_CONFIG.host, port: SMTP_CONFIG.port },
    { secureTransport: 'on', allowHalfOpen: false }
  )

  const reader = socket.readable.getReader()
  const writer = socket.writable.getWriter()
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  let buffer = ''

  async function readLine(): Promise<string> {
    while (true) {
      const idx = buffer.indexOf('\r\n')
      if (idx !== -1) {
        const line = buffer.slice(0, idx)
        buffer = buffer.slice(idx + 2)
        return line
      }
      const { value, done } = await reader.read()
      if (done) {
        if (buffer.length > 0) {
          const line = buffer
          buffer = ''
          return line
        }
        throw new Error('SMTP connection closed prematurely')
      }
      buffer += decoder.decode(value, { stream: true })
    }
  }

  async function readResponse(): Promise<{ code: number; text: string }> {
    let fullText = ''
    while (true) {
      const line = await readLine()
      fullText += line + '\n'
      if (/^\d{3} /.test(line)) {
        const code = parseInt(line.slice(0, 3), 10)
        return { code, text: fullText.trim() }
      }
      if (!/^\d{3}-/.test(line)) {
        const code = parseInt(line.slice(0, 3), 10) || 0
        return { code, text: fullText.trim() }
      }
    }
  }

  async function writeLine(line: string) {
    await writer.write(encoder.encode(line + '\r\n'))
  }

  try {
    // 1. Initial Greeting
    const greeting = await readResponse()
    if (greeting.code !== 220) {
      throw new Error(`SMTP Greeting failed: ${greeting.text}`)
    }

    // 2. EHLO
    await writeLine('EHLO nammaoorujobs.com')
    const ehlo = await readResponse()
    if (ehlo.code !== 250) {
      throw new Error(`SMTP EHLO failed: ${ehlo.text}`)
    }

    // 3. AUTH LOGIN
    await writeLine('AUTH LOGIN')
    const auth1 = await readResponse()
    if (auth1.code !== 334) {
      throw new Error(`SMTP AUTH LOGIN initiation failed: ${auth1.text}`)
    }

    // Username (base64)
    await writeLine(utf8ToBase64(SMTP_CONFIG.user))
    const auth2 = await readResponse()
    if (auth2.code !== 334) {
      throw new Error(`SMTP username submission failed: ${auth2.text}`)
    }

    // Password (base64)
    await writeLine(utf8ToBase64(SMTP_CONFIG.pass))
    const authOk = await readResponse()
    if (authOk.code !== 235) {
      throw new Error(`SMTP authentication failed: ${authOk.text}`)
    }

    // 4. MAIL FROM
    await writeLine(`MAIL FROM:<${envelopeFrom}>`)
    const mailRes = await readResponse()
    if (mailRes.code !== 250) {
      throw new Error(`SMTP MAIL FROM rejected: ${mailRes.text}`)
    }

    // 5. RCPT TO for each recipient
    for (const rcpt of recipients) {
      await writeLine(`RCPT TO:<${rcpt}>`)
      const rcptRes = await readResponse()
      if (rcptRes.code !== 250 && rcptRes.code !== 251) {
        console.warn(`SMTP recipient rejected: ${rcpt} -> ${rcptRes.text}`)
      }
    }

    // 6. DATA
    await writeLine('DATA')
    const dataRes = await readResponse()
    if (dataRes.code !== 354) {
      throw new Error(`SMTP DATA rejected: ${dataRes.text}`)
    }

    // 7. Message Body
    const rfcDate = new Date().toUTCString()
    const rawHeaders = [
      `From: ${fromName} <${envelopeFrom}>`,
      `To: ${recipients.length === 1 ? recipients[0] : 'Namma Ooru Jobs Members <' + envelopeFrom + '>'}`,
      `Subject: =?UTF-8?B?${utf8ToBase64(subject)}?=`,
      `Date: ${rfcDate}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
    ].join('\r\n')

    const fullMessage = `${rawHeaders}\r\n\r\n${html}\r\n.`
    await writeLine(fullMessage)
    const sendRes = await readResponse()
    if (sendRes.code !== 250) {
      throw new Error(`SMTP Message delivery failed: ${sendRes.text}`)
    }

    // 8. QUIT
    await writeLine('QUIT')
    await readResponse().catch(() => {})
  } finally {
    try {
      await writer.close().catch(() => {})
      reader.releaseLock()
      await socket.close().catch(() => {})
    } catch {}
  }
}

/**
 * Sends an email using Node.js TLS (node:tls) - used in Node test environments
 */
async function sendViaNodeTls(
  envelopeFrom: string,
  fromName: string,
  recipients: string[],
  subject: string,
  html: string
): Promise<void> {
  // @ts-ignore
  const tls = await import('node:tls').catch(() => null)
  if (!tls) {
    throw new Error('Neither cloudflare:sockets nor node:tls is available in this environment')
  }

  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      {
        host: SMTP_CONFIG.host,
        port: SMTP_CONFIG.port,
      },
      () => {}
    )

    let buffer = ''
    let step = 0
    let recipientIndex = 0

    const sendLine = (line: string) => {
      socket.write(line + '\r\n')
    }

    socket.on('data', (chunk: any) => {
      buffer += chunk.toString()
      while (buffer.includes('\r\n')) {
        const lineEnd = buffer.indexOf('\r\n')
        const line = buffer.slice(0, lineEnd)
        buffer = buffer.slice(lineEnd + 2)

        // Ignore multiline intermediate replies (250-...)
        if (/^\d{3}-/.test(line)) {
          continue
        }

        const codeMatch = line.match(/^(\d{3})/)
        const code = codeMatch ? parseInt(codeMatch[1], 10) : 0

        if (step === 0 && code === 220) {
          step = 1
          sendLine('EHLO nammaoorujobs.com')
        } else if (step === 1 && code === 250) {
          step = 2
          sendLine('AUTH LOGIN')
        } else if (step === 2 && code === 334) {
          step = 3
          sendLine(utf8ToBase64(SMTP_CONFIG.user))
        } else if (step === 3 && code === 334) {
          step = 4
          sendLine(utf8ToBase64(SMTP_CONFIG.pass))
        } else if (step === 4 && code === 235) {
          step = 5
          sendLine(`MAIL FROM:<${envelopeFrom}>`)
        } else if (step === 5 && code === 250) {
          step = 6
          recipientIndex = 0
          sendLine(`RCPT TO:<${recipients[recipientIndex]}>`)
        } else if (step === 6 && (code === 250 || code === 251)) {
          recipientIndex++
          if (recipientIndex < recipients.length) {
            sendLine(`RCPT TO:<${recipients[recipientIndex]}>`)
          } else {
            step = 7
            sendLine('DATA')
          }
        } else if (step === 7 && code === 354) {
          step = 8
          const rfcDate = new Date().toUTCString()
          const toHeader =
            recipients.length === 1
              ? recipients[0]
              : `Namma Ooru Jobs Members <${envelopeFrom}>`
          const utf8Subject = `=?UTF-8?B?${utf8ToBase64(subject)}?=`

          const rawMessage = [
            `From: ${fromName} <${envelopeFrom}>`,
            `To: ${toHeader}`,
            `Subject: ${utf8Subject}`,
            `Date: ${rfcDate}`,
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
            'Content-Transfer-Encoding: 8bit',
            '',
            html,
            '',
            '.',
          ].join('\r\n')
          sendLine(rawMessage)
        } else if (step === 8 && code === 250) {
          step = 9
          sendLine('QUIT')
        } else if (step === 9 && code === 221) {
          socket.end()
          resolve()
        } else if (code >= 400) {
          socket.end()
          reject(new Error(`SMTP Error ${code}: ${line}`))
        }
      }
    })

    socket.on('error', (err: any) => {
      reject(err)
    })
  })
}

/**
 * Universal Send Email function - Automatically detects Workers vs Node runtime
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  const envelopeFrom = options.from || SMTP_CONFIG.defaultFrom
  const fromName = options.fromName || SMTP_CONFIG.defaultFromName
  const rawRecipients = Array.isArray(options.to) ? options.to : [options.to]
  const bccRecipients = options.bcc
    ? Array.isArray(options.bcc)
      ? options.bcc
      : [options.bcc]
    : []

  // Clean and filter valid email addresses
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const validRecipients = [...new Set([...rawRecipients, ...bccRecipients])].filter(
    (e) => emailRegex.test(e) && !e.includes('@phone.nammaoorujobs.com')
  )

  if (validRecipients.length === 0) {
    console.warn('[EmailService] No valid recipient email addresses provided.')
    return
  }

  // Try Cloudflare Sockets first (Workers runtime)
  let cloudflareSocketsAvailable = false
  try {
    const cf = await import('cloudflare:sockets')
    if (typeof cf?.connect === 'function') {
      cloudflareSocketsAvailable = true
    }
  } catch {}

  if (cloudflareSocketsAvailable) {
    await sendViaCloudflareSockets(
      envelopeFrom,
      fromName,
      validRecipients,
      options.subject,
      options.html,
      options.text
    )
  } else {
    // Node.js fallback (node:tls)
    await sendViaNodeTls(
      envelopeFrom,
      fromName,
      validRecipients,
      options.subject,
      options.html
    )
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. SCENARIO: NEW JOB POSTING EMAIL TEMPLATE & BROADCAST
// ─────────────────────────────────────────────────────────────────────────────

export function buildNewJobEmailTemplate(job: JobNotificationPayload): string {
  const jobUrl = `${APP_URL}/jobs`
  const cleanDesc = (job.description || '')
    .replace(/<[^>]*>?/gm, '')
    .slice(0, 350)
  const salaryBadge = job.salary_range
    ? `<span style="display:inline-block;padding:4px 10px;background-color:#FEF3C7;color:#92400E;font-size:12px;font-weight:700;border-radius:6px;margin-right:6px;">💰 ${escapeHtml(job.salary_range)}</span>`
    : ''

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Job Opening: ${escapeHtml(job.title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0F172A;line-height:1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F8FAFC;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:600px;background-color:#FFFFFF;border-radius:18px;border:1px solid #E2E8F0;box-shadow:0 8px 30px rgba(15,23,42,0.06);overflow:hidden;">
          
          <tr>
            <td style="background:linear-gradient(135deg, #0B2545 0%, #134074 100%);padding:28px 32px;text-align:left;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size:20px;font-weight:800;letter-spacing:-0.5px;color:#FFFFFF;margin-bottom:4px;">
                      NAMMA OORU JOBS
                    </div>
                    <div style="font-size:12px;font-weight:600;color:#93C5FD;letter-spacing:0.5px;text-transform:uppercase;">
                      Tamil Nadu Professional Network &bull; Verified Alert
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:32px;">
              <div style="display:inline-block;padding:4px 10px;background-color:#EFF6FF;color:#1D4ED8;font-size:11px;font-weight:800;border-radius:20px;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:12px;">
                🚀 Actively Recruiting
              </div>

              <h1 style="font-size:22px;font-weight:800;color:#0F172A;margin:0 0 8px 0;line-height:1.3;">
                ${escapeHtml(job.title)}
              </h1>

              <div style="font-size:16px;font-weight:700;color:#0B2545;margin-bottom:16px;">
                🏢 ${escapeHtml(job.company_name)}
              </div>

              <div style="margin-bottom:24px;">
                <span style="display:inline-block;padding:4px 10px;background-color:#F1F5F9;color:#334155;font-size:12px;font-weight:600;border-radius:6px;margin-right:6px;">
                  📍 ${escapeHtml(job.location)}
                </span>
                <span style="display:inline-block;padding:4px 10px;background-color:#F1F5F9;color:#334155;font-size:12px;font-weight:600;border-radius:6px;margin-right:6px;">
                  💼 ${escapeHtml(job.workplace_type || 'Remote')}
                </span>
                <span style="display:inline-block;padding:4px 10px;background-color:#F1F5F9;color:#334155;font-size:12px;font-weight:600;border-radius:6px;margin-right:6px;">
                  ⏱️ ${escapeHtml(job.employment_type || 'Full-time')}
                </span>
                ${salaryBadge}
              </div>

              <div style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:18px;margin-bottom:28px;">
                <div style="font-size:12px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">
                  Role Overview
                </div>
                <p style="font-size:14px;color:#334155;margin:0;line-height:1.6;">
                  ${escapeHtml(cleanDesc)}...
                </p>
              </div>

              <div style="text-align:center;margin-bottom:28px;">
                <a href="${jobUrl}" target="_blank" style="display:inline-block;background-color:#0B2545;color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;box-shadow:0 4px 14px rgba(11,37,69,0.25);">
                  View Job &amp; Apply Directly &rarr;
                </a>
              </div>

              <div style="border-top:1px solid #E2E8F0;padding-top:18px;font-size:12px;color:#64748B;line-height:1.5;">
                <strong style="color:#0F172A;">100% Direct Application:</strong> Your profile and resume are sent directly to the verified recruiter at <strong>${escapeHtml(job.company_name)}</strong>. Namma Ooru Jobs charges zero commission from job seekers.
              </div>
            </td>
          </tr>

          <tr>
            <td style="background-color:#F8FAFC;border-top:1px solid #E2E8F0;padding:24px 32px;text-align:center;font-size:11px;color:#94A3B8;">
              <p style="margin:0 0 6px 0;">
                You received this job alert because you are a registered member of <strong>Namma Ooru Jobs</strong>.
              </p>
              <p style="margin:0;">
                Connecting Talent &amp; Opportunities across Chennai, Coimbatore, Madurai, Trichy, Salem and beyond.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

export async function broadcastNewJobEmail(
  db: any,
  job: JobNotificationPayload
): Promise<{ totalSent: number; errors: number }> {
  try {
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

    console.log(`[EmailService] Preparing new job alert broadcast for ${validEmails.length} users...`)

    const subject = `🚀 New Job Opening: ${job.title} at ${job.company_name} | Namma Ooru Jobs`
    const htmlContent = buildNewJobEmailTemplate(job)

    const BATCH_SIZE = 40
    let totalSent = 0
    let errorCount = 0

    for (let i = 0; i < validEmails.length; i += BATCH_SIZE) {
      const batch = validEmails.slice(i, i + BATCH_SIZE)
      try {
        await sendEmail({
          to: SMTP_CONFIG.defaultFrom,
          bcc: batch,
          subject,
          html: htmlContent,
        })
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

export function buildFollowNotificationEmail(payload: FollowNotificationPayload): string {
  const profileUrl = `${APP_URL}/network`

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(payload.followerName)} started following you</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0F172A;line-height:1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F8FAFC;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:600px;background-color:#FFFFFF;border-radius:18px;border:1px solid #E2E8F0;box-shadow:0 8px 30px rgba(15,23,42,0.06);overflow:hidden;">
          
          <tr>
            <td style="background:linear-gradient(135deg, #0B2545 0%, #134074 100%);padding:28px 32px;text-align:left;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size:20px;font-weight:800;letter-spacing:-0.5px;color:#FFFFFF;margin-bottom:4px;">
                      NAMMA OORU JOBS
                    </div>
                    <div style="font-size:12px;font-weight:600;color:#93C5FD;letter-spacing:0.5px;text-transform:uppercase;">
                      Professional Network Alert
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:32px;">
              <div style="display:inline-block;padding:4px 10px;background-color:#F0FDF4;color:#15803D;font-size:11px;font-weight:800;border-radius:20px;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:12px;">
                👥 New Follower
              </div>

              <h1 style="font-size:20px;font-weight:800;color:#0F172A;margin:0 0 16px 0;line-height:1.3;">
                ${escapeHtml(payload.followerName)} started following you!
              </h1>

              <p style="font-size:14px;color:#475569;margin:0 0 24px 0;">
                Hello <strong>${escapeHtml(payload.recipientName || 'Member')}</strong>, your professional circle in Tamil Nadu is expanding.
              </p>

              <!-- Follower Profile Card -->
              <div style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:14px;padding:20px;margin-bottom:28px;">
                <div style="font-size:16px;font-weight:700;color:#0B2545;margin-bottom:4px;">
                  ${escapeHtml(payload.followerName)}
                </div>
                ${
                  payload.followerHeadline
                    ? `<div style="font-size:13px;color:#64748B;margin-bottom:4px;">${escapeHtml(payload.followerHeadline)}</div>`
                    : ''
                }
                ${
                  payload.followerCompany
                    ? `<div style="font-size:12px;font-weight:600;color:#334155;">🏢 ${escapeHtml(payload.followerCompany)}</div>`
                    : ''
                }
              </div>

              <!-- CTA Button -->
              <div style="text-align:center;margin-bottom:28px;">
                <a href="${profileUrl}" target="_blank" style="display:inline-block;background-color:#0B2545;color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;box-shadow:0 4px 14px rgba(11,37,69,0.25);">
                  View Profile &amp; Connect Back &rarr;
                </a>
              </div>

              <div style="border-top:1px solid #E2E8F0;padding-top:18px;font-size:12px;color:#64748B;line-height:1.5;">
                Connecting with professionals and recruiters increases your visibility for new job openings across Tamil Nadu.
              </div>
            </td>
          </tr>

          <tr>
            <td style="background-color:#F8FAFC;border-top:1px solid #E2E8F0;padding:24px 32px;text-align:center;font-size:11px;color:#94A3B8;">
              <p style="margin:0 0 6px 0;">
                You received this alert because you are a registered member of <strong>Namma Ooru Jobs</strong>.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

export async function sendNewFollowerEmail(payload: FollowNotificationPayload): Promise<void> {
  const subject = `👋 ${payload.followerName} started following you on Namma Ooru Jobs`
  const html = buildFollowNotificationEmail(payload)

  await sendEmail({
    to: payload.recipientEmail,
    subject,
    html,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SCENARIO: HR RECRUITER SHOWS INTEREST IN EMPLOYEE
// ─────────────────────────────────────────────────────────────────────────────

export function buildHrInterestEmailTemplate(payload: HrInterestNotificationPayload): string {
  const messagesUrl = `${APP_URL}/messages`

  const customQuoteBox = payload.customMessage
    ? `
      <div style="background-color:#FFFBEB;border-left:4px solid #F59E0B;padding:14px 16px;border-radius:6px;margin:20px 0;font-size:13px;color:#78350F;font-style:italic;">
        &ldquo;${escapeHtml(payload.customMessage)}&rdquo;
      </div>
    `
    : ''

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recruiter Interest Alert: ${escapeHtml(payload.hrCompany)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0F172A;line-height:1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F8FAFC;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:600px;background-color:#FFFFFF;border-radius:18px;border:1px solid #E2E8F0;box-shadow:0 8px 30px rgba(15,23,42,0.06);overflow:hidden;">
          
          <tr>
            <td style="background:linear-gradient(135deg, #0B2545 0%, #134074 100%);padding:28px 32px;text-align:left;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size:20px;font-weight:800;letter-spacing:-0.5px;color:#FFFFFF;margin-bottom:4px;">
                      NAMMA OORU JOBS
                    </div>
                    <div style="font-size:12px;font-weight:600;color:#FDE68A;letter-spacing:0.5px;text-transform:uppercase;">
                      ⭐ Verified Recruiter Outreach
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:32px;">
              <div style="display:inline-block;padding:4px 10px;background-color:#FEF3C7;color:#92400E;font-size:11px;font-weight:800;border-radius:20px;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:12px;">
                🎯 Direct Career Opportunity
              </div>

              <h1 style="font-size:22px;font-weight:800;color:#0F172A;margin:0 0 16px 0;line-height:1.3;">
                ${escapeHtml(payload.hrCompany)} is interested in your profile!
              </h1>

              <p style="font-size:14px;color:#334155;margin:0 0 20px 0;line-height:1.6;">
                Hello <strong>${escapeHtml(payload.candidateName)}</strong>,
              </p>

              <p style="font-size:14px;color:#334155;margin:0 0 20px 0;line-height:1.6;">
                <strong>${escapeHtml(payload.hrName)}</strong> (${escapeHtml(payload.hrPosition || 'Recruiter')} at <strong>${escapeHtml(payload.hrCompany)}</strong>) reviewed your skills and experience on Namma Ooru Jobs and has expressed direct interest in speaking with you regarding active openings.
              </p>

              ${customQuoteBox}

              <!-- Recruiter Info Card -->
              <div style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:20px;margin-bottom:28px;">
                <div style="font-size:12px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">
                  Hiring Organization
                </div>
                <div style="font-size:16px;font-weight:800;color:#0B2545;margin-bottom:4px;">
                  🏢 ${escapeHtml(payload.hrCompany)}
                </div>
                <div style="font-size:13px;color:#475569;">
                  Recruiter Contact: <strong>${escapeHtml(payload.hrName)}</strong> &bull; ${escapeHtml(payload.hrPosition || 'HR & Talent Acquisition')}
                </div>
              </div>

              <!-- Direct CTA Button -->
              <div style="text-align:center;margin-bottom:28px;">
                <a href="${messagesUrl}" target="_blank" style="display:inline-block;background-color:#0B2545;color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;box-shadow:0 4px 14px rgba(11,37,69,0.25);">
                  View Recruiter &amp; Message Back &rarr;
                </a>
              </div>

              <!-- Security Notice -->
              <div style="border-top:1px solid #E2E8F0;padding-top:18px;font-size:12px;color:#64748B;line-height:1.5;">
                <strong style="color:#0F172A;">Verified Recruiter Guarantee:</strong> All recruiter accounts on Namma Ooru Jobs are verified by our administrative team. Never pay any fee for interview scheduling or job placements.
              </div>
            </td>
          </tr>

          <tr>
            <td style="background-color:#F8FAFC;border-top:1px solid #E2E8F0;padding:24px 32px;text-align:center;font-size:11px;color:#94A3B8;">
              <p style="margin:0 0 6px 0;">
                You received this priority recruitment alert because you are a registered job seeker on <strong>Namma Ooru Jobs</strong>.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

export async function sendHrInterestEmail(payload: HrInterestNotificationPayload): Promise<void> {
  const subject = `🌟 ${payload.hrCompany || payload.hrName} is interested in your profile for career opportunities`
  const html = buildHrInterestEmailTemplate(payload)

  await sendEmail({
    to: payload.candidateEmail,
    subject,
    html,
  })
}
