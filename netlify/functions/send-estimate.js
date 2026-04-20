exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  let body
  try {
    body = JSON.parse(event.body)
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' }
  }

  const { to, clientName, pdfBase64, subject } = body
  if (!to || !pdfBase64) {
    return { statusCode: 400, body: 'Missing required fields' }
  }

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
      html: `<p>Hi ${clientName || 'there'},</p>
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
    const text = await res.text()
    return { statusCode: res.status, body: text }
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) }
}
