import nodemailer from 'nodemailer'

let transporter

function isMailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
}

function getFromAddress() {
  return (
    process.env.MAIL_FROM ||
    process.env.SMTP_USER ||
    'PahadLink <noreply@pahadlink.com>'
  )
}

export function getAdminNotifyEmail() {
  return (
    process.env.ORDER_NOTIFY_EMAIL ||
    process.env.ADMIN_EMAIL ||
    'admin@pahadlink.com'
  )
}

function getTransporter() {
  if (transporter) return transporter
  if (!isMailConfigured()) return null

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_SECURE === '1',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
  return transporter
}

/**
 * Send an email. If SMTP is not configured, logs to console (dev-safe) and resolves.
 */
export async function sendMail({ to, subject, html, text }) {
  if (!to) {
    console.warn('[mail] skipped — missing recipient')
    return { skipped: true, reason: 'no-recipient' }
  }

  const payload = {
    from: getFromAddress(),
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
  }

  const tx = getTransporter()
  if (!tx) {
    console.log('[mail:dev] SMTP not configured — would send:', {
      to: payload.to,
      subject: payload.subject,
    })
    return { skipped: true, reason: 'smtp-not-configured' }
  }

  try {
    const info = await tx.sendMail(payload)
    console.log(`[mail] sent → ${to} (${subject}) id=${info.messageId}`)
    return { ok: true, messageId: info.messageId }
  } catch (error) {
    console.error(`[mail] failed → ${to}:`, error.message)
    return { ok: false, error: error.message }
  }
}
