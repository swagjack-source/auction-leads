// Consults calendar feed
// URL: https://homebase-crm.netlify.app/api/consults.ics
// Uses SECURITY DEFINER RPC so the anon key can read all org data.

const { createClient } = require('@supabase/supabase-js')

const DOMAIN = 'homebase-crm.netlify.app'

exports.handler = async function () {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  )

  const { data, error } = await supabase.rpc('get_calendar_consults')

  if (error) {
    return { statusCode: 500, body: `get_calendar_consults: ${error.message}` }
  }

  const vevents = (data || []).map(lead => {
    const start   = new Date(lead.consult_at)
    const end     = new Date(start.getTime() + 60 * 60 * 1000)

    const summary = lead.assignee_name
      ? `Consult: ${lead.name} (${lead.assignee_name})`
      : `Consult: ${lead.name}`

    const descParts = [
      lead.assignee_name  && `Assignee: ${lead.assignee_name}`,
      lead.address        && `Address: ${lead.address}`,
      lead.lead_source    && `Source: ${lead.lead_source}`,
      lead.what_they_need && `Notes: ${lead.what_they_need}`,
      lead.status         && `Status: ${lead.status}`,
    ].filter(Boolean)

    const lines = [
      'BEGIN:VEVENT',
      `UID:consult-${lead.id}@${DOMAIN}`,
      `DTSTART:${fmtIcal(start)}`,
      `DTEND:${fmtIcal(end)}`,
      `SUMMARY:${esc(summary)}`,
      'CATEGORIES:CONSULT',
    ]
    if (lead.address)     lines.push(`LOCATION:${esc(lead.address)}`)
    if (descParts.length) lines.push(`DESCRIPTION:${esc(descParts.join(' | '))}`)
    lines.push('END:VEVENT')
    return lines.map(fold).join('\r\n')
  })

  const cal = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CT Denver SE//Homebase//EN',
    'X-WR-CALNAME:CT Consults',
    'X-WR-TIMEZONE:America/Denver',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...vevents,
    'END:VCALENDAR',
  ].join('\r\n')

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=600',
      'Access-Control-Allow-Origin': '*',
    },
    body: cal,
  }
}

function fmtIcal(date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function esc(str) {
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

function fold(line) {
  if (line.length <= 75) return line
  const out = [line.slice(0, 75)]
  let i = 75
  while (i < line.length) {
    out.push(' ' + line.slice(i, i + 74))
    i += 74
  }
  return out.join('\r\n')
}
