type SendEmailInput = {
  to: string | string[]
  subject: string
  text: string
}

type ResendSendResponse = {
  id?: string
  message?: string
  error?: string
}

function getRequiredEmailEnv(name: 'RESEND_API_KEY' | 'EMAIL_FROM') {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`${name} is missing.`)
  }

  return value
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function textToHtml(text: string) {
  return text
    .trim()
    .split(/\n\s*\n/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
    .join('')
}

export function isEmailDeliveryConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim())
}

export async function sendTransactionalEmail({ to, subject, text }: SendEmailInput) {
  const apiKey = getRequiredEmailEnv('RESEND_API_KEY')
  const from = getRequiredEmailEnv('EMAIL_FROM')
  const recipients = Array.isArray(to) ? to : [to]

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: recipients,
      subject,
      text,
      html: textToHtml(text),
    }),
  })

  const payload = (await response.json().catch(() => null)) as ResendSendResponse | null

  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || `Resend returned ${response.status}.`)
  }

  if (!payload?.id) {
    throw new Error('Resend did not return an email id.')
  }

  return {
    id: payload.id,
  }
}
