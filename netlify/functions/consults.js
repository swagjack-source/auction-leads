// Live .ics consult calendar feed
// URL: https://caringtransitions-system.netlify.app/api/consults.ics

const { createClient } = require('@supabase/supabase-js')

exports.handler = async function () {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  )

  const [{ data: leads }, { data: members }] = await Promise.all([
    supabase
      .from('leads')
      .select('id, name, address, assigned_to, consult_at, what_they_need, lead_source, status')
      .not('consult_at', 'is', null)
      .not('status', 'eq', 'Lost')
      .order('consult_at', { ascending: true }),
    supabase
      .from('team_members')
      .select('id, name'),
  ])

  const memberMap = {}
  ;(members || []).forEach(m => { memberMap[m.id] = m.name })

  const events = (leads || []).map(lead => {
    const start = new Date(lead.consult_at)
    const end   = new Date(start.getTime() + 60 * 60 * 1000) // 1 hr default

    const assigneeName = lead.assigned_to ? memberMap[lead.assigned_to] : null

    const descParts = [
      assigneeName          && `Assignee: ${assigneeName}`,
      lead.address          && `Address: ${lead.address}`,
      lead.lead_source      && `Source: ${lead.lead_source}`,
      lead.what_they_need   && `Notes: ${lead.what_they_need}`,
      lead.status           && `Status: ${lead.status}`,
    ].filter(Boolean)

    const summary = assigneeName
      ? `Consult: ${lead.name} (${assigneeName})`
      : `Consult: ${lead.name}`

    const lines = [
      'BEGIN:VEVENT',
      `UID:consult-${lead.id}@caringtransitions-system.netlify.app`,
      `DTSTART:${fmtIcal(start)}`,
      `DTEND:${fmtIcal(end)}`,
      `SUMMARY:${esc(summary)}`,
      'CATEGORIES:CONSULT',
    ]
    if (lead.address) lines.push(`LOCATION:${esc(lead.address)}`)
    if (descParts.length) lines.push(`DESCRIPTION:${descParts.map(esc).join('\\n')}`)
    lines.push('END:VEVENT')
    return lines.join('\r\n')
  })

  const cal = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CT Denver SE//Consults//EN',
    'X-WR-CALNAME:CT Consults',
    'X-WR-TIMEZONE:America/Denver',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n')

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
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
