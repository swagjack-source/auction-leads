// Projects + Project Events calendar feed
// URL: https://homebase-crm.netlify.app/api/calendar.ics
// Uses SECURITY DEFINER RPCs so the anon key can read all org data.

const { createClient } = require('@supabase/supabase-js')

const DOMAIN = 'homebase-crm.netlify.app'

exports.handler = async function () {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  )

  const [leadsRes, eventsRes] = await Promise.all([
    supabase.rpc('get_calendar_leads'),
    supabase.rpc('get_calendar_project_events'),
  ])

  if (leadsRes.error) {
    return { statusCode: 500, body: `get_calendar_leads: ${leadsRes.error.message}` }
  }

  const vevents = []

  // ── Project schedule bars ─────────────────────────────────────────────────
  for (const lead of leadsRes.data || []) {
    const start = isoToYMD(lead.project_start)
    const end   = nextDay(lead.project_end ? isoToYMD(lead.project_end) : start)

    const summary = [lead.name, lead.job_type].filter(Boolean).join(' — ')

    const descParts = [
      lead.address        && `Address: ${lead.address}`,
      lead.crew_size      && `Crew: ${lead.crew_size}`,
      lead.deal_score     && `Deal Score: ${lead.deal_score}`,
      lead.status         && `Status: ${lead.status}`,
      lead.what_they_need && `Notes: ${lead.what_they_need}`,
    ].filter(Boolean)

    const lines = [
      'BEGIN:VEVENT',
      `UID:lead-${lead.id}@${DOMAIN}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${esc(summary)}`,
    ]
    if (lead.address)     lines.push(`LOCATION:${esc(lead.address)}`)
    if (descParts.length) lines.push(`DESCRIPTION:${esc(descParts.join(' | '))}`)
    lines.push('END:VEVENT')
    vevents.push(lines.map(fold).join('\r\n'))
  }

  // ── Project events ────────────────────────────────────────────────────────
  for (const ev of eventsRes.data || []) {
    if (!ev.event_date) continue
    const lname   = lastName(ev.lead_name)
    const summary = `${lname} — ${ev.event_type}`
    const start   = isoToYMD(ev.event_date)
    const end     = ev.end_date ? nextDay(isoToYMD(ev.end_date)) : nextDay(start)

    const lines = [
      'BEGIN:VEVENT',
      `UID:pe-${ev.id}@${DOMAIN}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${esc(summary)}`,
      'CATEGORIES:PROJECT EVENT',
    ]
    if (ev.lead_address) lines.push(`LOCATION:${esc(ev.lead_address)}`)
    if (ev.notes)        lines.push(`DESCRIPTION:${esc(ev.notes)}`)
    lines.push('END:VEVENT')
    vevents.push(lines.map(fold).join('\r\n'))
  }

  const cal = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CT Denver SE//Homebase//EN',
    'X-WR-CALNAME:CT Denver SE Schedule',
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

// ── Helpers ───────────────────────────────────────────────────────────────

function isoToYMD(iso) {
  const d = new Date(iso)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

function nextDay(ymd) {
  const y = parseInt(ymd.slice(0, 4), 10)
  const m = parseInt(ymd.slice(4, 6), 10) - 1
  const d = parseInt(ymd.slice(6, 8), 10)
  const next = new Date(Date.UTC(y, m, d + 1))
  return `${next.getUTCFullYear()}${String(next.getUTCMonth() + 1).padStart(2, '0')}${String(next.getUTCDate()).padStart(2, '0')}`
}

function lastName(fullName) {
  if (!fullName) return 'Client'
  const parts = fullName.trim().split(/\s+/)
  return parts[parts.length - 1]
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
