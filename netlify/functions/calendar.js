// Live .ics calendar feed — subscribe to this URL in Google/Apple Calendar
// URL: https://caringtransitions-system.netlify.app/api/calendar.ics

const { createClient } = require('@supabase/supabase-js')

exports.handler = async function () {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  )

  const { data, error } = await supabase
    .from('leads')
    .select('id, name, address, job_type, project_start, project_end, crew_size, deal_score, status, what_they_need')
    .not('project_start', 'is', null)
    .order('project_start', { ascending: true })

  if (error) {
    return { statusCode: 500, body: error.message }
  }

  const events = (data || []).map(lead => {
    const start = lead.project_start.slice(0, 10).replace(/-/g, '')
    const endBase = lead.project_end
      ? lead.project_end.slice(0, 10)
      : lead.project_start.slice(0, 10)
    const end = addDay(endBase)

    const descParts = [
      lead.address     && `Address: ${lead.address}`,
      lead.crew_size   && `Crew: ${lead.crew_size}`,
      lead.deal_score  && `Deal Score: ${lead.deal_score}`,
      lead.status      && `Status: ${lead.status}`,
      lead.what_they_need && `Notes: ${lead.what_they_need}`,
    ].filter(Boolean)

    const summary = [lead.name, lead.job_type].filter(Boolean).join(' \u2014 ')

    const lines = [
      'BEGIN:VEVENT',
      `UID:lead-${lead.id}@caringtransitions-system.netlify.app`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${esc(summary)}`,
    ]
    if (lead.address) lines.push(`LOCATION:${esc(lead.address)}`)
    if (descParts.length) lines.push(`DESCRIPTION:${descParts.map(esc).join('\\n')}`)
    lines.push('END:VEVENT')
    return lines.join('\r\n')
  })

  const cal = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CT Denver SE//Lead Schedule//EN',
    'X-WR-CALNAME:CT Denver SE Schedule',
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

// iCal end date is exclusive, so add one day
function addDay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const next = new Date(Date.UTC(y, m - 1, d + 1))
  return next.toISOString().slice(0, 10).replace(/-/g, '')
}

function esc(str) {
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}
