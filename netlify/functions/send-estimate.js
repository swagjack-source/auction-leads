const { checkRateLimit, getCallerIp, checkOrigin } = require('./_utils/rateLimit')

// Domains that are allowed to call this function.
// Add your Netlify preview URL here if you need it during review.
const ALLOWED_ORIGINS = [
  'https://homebase-crm.netlify.app',
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Escape HTML entities so user-supplied strings can't inject markup into the
// email body (e.g. clientName = '<script>...' would otherwise render).
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  // Block requests from unknown origins (e.g. scrapers, other apps).
  const originErr = checkOrigin(event, ALLOWED_ORIGINS)
  if (originErr) return originErr

  // Rate limit: max 5 estimate emails per IP per minute.
  // Prevents Resend cost amplification from a single bad actor.
  const ip = getCallerIp(event)
  const { allowed, headers: rlHeaders } = checkRateLimit(ip, { max: 5, windowMs: 60_000 })
  if (!allowed) {
    return {
      statusCode: 429,
      headers: { ...rlHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Too many requests. Please wait a moment and try again.' }),
    }
  }

  let body
  try {
    body = JSON.parse(event.body)
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }
  }

  const { to, clientName, pdfBase64, subject } = body

  if (!to || !pdfBase64) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) }
  }

  // Validate email format before passing to Resend.
  if (!EMAIL_RE.test(to)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid email address' }) }
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('[send-estimate] RESEND_API_KEY is not set')
    return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfiguration' }) }
  }

  const safeName = escapeHtml(clientName) || 'there'

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Caring Transitions Denver SE <estimates@ctdenverse.com>',
      to: [to],
      subject: subject || 'Your Estimate from Caring Transitions Denver Southeast',
      html: `<p>Hi ${safeName},</p>
<p>Thank you for the opportunity to work with you. Please find your estimate attached.</p>
<p>This estimate is valid for 30 days. Don't hesitate to reach out with any questions.</p>
<p>— Caring Transitions Denver Southeast</p>`,
      attachments: [
        {
          filename: 'estimate.pdf',
          content: pdfBase64,
        },
      ],
    }),
  })

  if (!res.ok) {
    // Log the full Resend error server-side for debugging, but never send
    // raw API responses to the client — they can leak internal details.
    const text = await res.text()
    console.error('[send-estimate] Resend error:', res.status, text)
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Failed to send email. Please try again.' }),
    }
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) }
}
