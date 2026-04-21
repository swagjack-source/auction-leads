import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Download, AlertCircle, X, Rss, Check, Copy } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { estimateCrew, estimateProjectDays } from '../lib/scoring'
import { useIsMobile } from '../hooks/useIsMobile'
import { useTeam } from '../lib/TeamContext'

// ── Date helpers ──────────────────────────────────────────────

function toDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatFullDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
}

// 42-slot grid (6 weeks) starting from Sunday before the 1st
function getMonthGrid(year, month) {
  const first = new Date(year, month, 1)
  const start = new Date(first)
  start.setDate(1 - first.getDay())
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

// ── Job-type chip styles ──────────────────────────────────────

const JOB_CHIP = {
  'Clean Out': { bg: 'rgba(165,0,80,0.13)',   accent: '#A50050', text: '#A50050'  },
  'Auction':   { bg: 'rgba(16,118,145,0.13)', accent: '#107691', text: '#107691'  },
  'Both':      { bg: 'rgba(205,84,91,0.13)',  accent: '#CD545B', text: '#CD545B'  },
}

// ── ConnectTeam export modal ──────────────────────────────────

function ExportModal({ projects, days, onClose }) {
  const [mode, setMode] = useState('shifts')

  const shiftRows = []
  const summaryRows = []

  days.forEach(dayStr => {
    const active = projects.filter(p =>
      p.project_start && p.project_start <= dayStr &&
      (p.project_end || p.project_start) >= dayStr
    )
    if (!active.length) return
    const fullDate = formatFullDate(dayStr)
    active.forEach(p => {
      const crew     = p.crew_size || estimateCrew(p.square_footage, p.density, p.job_type)
      const dayNum   = Math.round((new Date(dayStr) - new Date(p.project_start)) / 86400000) + 1
      const totalDays = p.project_end
        ? Math.round((new Date(p.project_end) - new Date(p.project_start)) / 86400000) + 1
        : estimateProjectDays(p.square_footage, p.density, p.job_type, crew)
      summaryRows.push({ dayStr, fullDate, name: p.name, address: p.address || '—', jobType: p.job_type, dayNum, totalDays, crew })
      for (let i = 1; i <= crew; i++) {
        shiftRows.push({ date: dayStr, fullDate, role: i === 1 ? 'Lead' : 'Staff', project: p.name, address: p.address || '—', jobType: p.job_type, start: '8:00 AM', end: '5:00 PM' })
      }
    })
  })

  function downloadCSV() {
    let csv
    if (mode === 'shifts') {
      csv = ['Date,Role,Project,Address,Job Type,Start,End']
        .concat(shiftRows.map(r => `${r.date},"${r.role}","${r.project}","${r.address}","${r.jobType}",${r.start},${r.end}`))
        .join('\n')
    } else {
      csv = ['Date,Project,Address,Job Type,Day #,Total Days,Crew Needed,Est. Start,Est. End']
        .concat(summaryRows.map(r => `${r.dayStr},"${r.name}","${r.address}","${r.jobType || ''}",${r.dayNum},${r.totalDays},${r.crew},8:00 AM,5:00 PM`))
        .join('\n')
    }
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
      download: `schedule-connectteam-${days[0]}.csv`,
    })
    a.click()
  }

  const rows = mode === 'shifts' ? shiftRows : summaryRows

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, width: '100%', maxWidth: 720, maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink-1)' }}>Export for ConnectTeam</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>Import CSV into ConnectTeam or use as a scheduling reference</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)' }}><X size={18} /></button>
        </div>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 8 }}>
          {[['shifts', 'Shift List (1 row per crew slot)'], ['summary', 'Project Summary']].map(([val, label]) => (
            <button key={val} onClick={() => setMode(val)} style={{ background: mode === val ? '#A50050' : 'var(--panel)', border: `1px solid ${mode === val ? '#A50050' : 'var(--line)'}`, borderRadius: 7, padding: '6px 14px', color: mode === val ? '#fff' : 'var(--ink-2)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {rows.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>No scheduled projects in this date range.</div>
          ) : mode === 'shifts' ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--bg)' }}>
                  {['Date', 'Role', 'Project', 'Address', 'Job Type', 'Start', 'End'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--line)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shiftRows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--line)', background: i % 2 === 0 ? 'transparent' : 'var(--stripe)' }}>
                    <td style={{ padding: '8px 12px', color: 'var(--ink-2)' }}>{r.date}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ background: r.role === 'Lead' ? 'rgba(165,0,80,0.2)' : 'rgba(61,122,153,0.2)', color: r.role === 'Lead' ? '#f4adc5' : '#71C5E8', borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 600 }}>{r.role}</span>
                    </td>
                    <td style={{ padding: '8px 12px', color: 'var(--ink-1)', fontWeight: 500 }}>{r.project}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--ink-2)' }}>{r.address}</td>
                    <td style={{ padding: '8px 12px', color: (JOB_CHIP[r.jobType] || JOB_CHIP['Both']).accent, fontSize: 11, fontWeight: 600 }}>{r.jobType}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--ink-1)' }}>{r.start}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--ink-1)' }}>{r.end}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--bg)' }}>
                  {['Date', 'Project', 'Address', 'Job Type', 'Day', 'Crew Needed', 'Est. Start', 'Est. End'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--line)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summaryRows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--line)', background: i % 2 === 0 ? 'transparent' : 'var(--stripe)' }}>
                    <td style={{ padding: '8px 12px', color: 'var(--ink-2)' }}>{r.dayStr}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--ink-1)', fontWeight: 500 }}>{r.name}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--ink-2)' }}>{r.address}</td>
                    <td style={{ padding: '8px 12px', color: (JOB_CHIP[r.jobType] || JOB_CHIP['Both']).accent, fontSize: 11, fontWeight: 600 }}>{r.jobType}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--ink-2)' }}>Day {r.dayNum} of {r.totalDays}</td>
                    <td style={{ padding: '8px 12px' }}><span style={{ fontWeight: 700, color: 'var(--ink-1)' }}>{r.crew}</span><span style={{ color: 'var(--ink-3)', marginLeft: 4 }}>people</span></td>
                    <td style={{ padding: '8px 12px', color: 'var(--ink-1)' }}>8:00 AM</td>
                    <td style={{ padding: '8px 12px', color: 'var(--ink-1)' }}>5:00 PM</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
            {mode === 'shifts' ? `${shiftRows.length} shift rows` : `${summaryRows.length} project-day rows`}
          </div>
          <button onClick={downloadCSV} style={{ background: 'linear-gradient(135deg, #A50050, #CD545B)', border: 'none', borderRadius: 8, padding: '8px 18px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={14} />
            Download CSV
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Calendar sync modal ───────────────────────────────────────

const FEEDS = [
  {
    key: 'projects',
    label: 'Projects',
    url: 'https://homebase-crm.netlify.app/api/calendar.ics',
    color: '#A50050',
    desc: 'All-day blocks for scheduled jobs',
  },
  {
    key: 'consults',
    label: 'Consults',
    url: 'https://homebase-crm.netlify.app/api/consults.ics',
    color: '#7c3aed',
    desc: 'Timed consult appointments with assignee & notes',
  },
]

function FeedRow({ feed }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(feed.url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: feed.color, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-1)' }}>{feed.label}</span>
        <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>— {feed.desc}</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input readOnly value={feed.url}
          style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: 'var(--ink-2)', outline: 'none', fontFamily: 'monospace' }}
        />
        <button onClick={copy}
          style={{ background: copied ? 'rgba(74,222,128,0.1)' : 'var(--panel)', border: `1px solid ${copied ? 'rgba(74,222,128,0.4)' : 'var(--line)'}`, borderRadius: 8, padding: '8px 13px', color: copied ? '#4ade80' : 'var(--ink-2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  )
}

function CalendarSyncModal({ onClose }) {
  const step = (num, text) => (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
      <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#A50050', color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{num}</div>
      <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>{text}</div>
    </div>
  )

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink-1)' }}>Subscribe to Team Calendar</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>Two live feeds — subscribe to both to see everything</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)' }}><X size={18} /></button>
        </div>

        <div style={{ padding: '18px 20px' }}>
          {/* Feed URLs */}
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
            Calendar Feed URLs
          </div>
          {FEEDS.map(f => <FeedRow key={f.key} feed={f} />)}

          <div style={{ height: 1, background: 'var(--line)', margin: '16px 0' }} />

          {/* Google Calendar */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-1)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 18, height: 18, borderRadius: 4, background: '#4285F4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 900, color: '#fff' }}>G</span>
              </div>
              Google Calendar
            </div>
            {step(1, 'Open Google Calendar on desktop → click the + next to "Other calendars"')}
            {step(2, <>Select <strong style={{ color: 'var(--ink-1)' }}>From URL</strong>, paste each URL and click Add Calendar</>)}
            {step(3, 'Repeat for both feeds — you can pick a different color for each')}
          </div>

          <div style={{ height: 1, background: 'var(--line)', marginBottom: 16 }} />

          {/* Apple Calendar */}
          <div style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-1)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 18, height: 18, borderRadius: 4, background: '#ff3b30', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 900, color: '#fff' }}>A</span>
              </div>
              Apple Calendar (Mac / iPhone)
            </div>
            {step(1, <>Mac: <strong style={{ color: 'var(--ink-1)' }}>File → New Calendar Subscription</strong>, paste a URL, click Subscribe</>)}
            {step(2, 'Set Auto-refresh to "Every hour" and click OK')}
            {step(3, 'Repeat for both feed URLs')}
          </div>

          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 14, padding: '8px 12px', background: 'var(--bg)', borderRadius: 7, lineHeight: 1.5 }}>
            Each team member subscribes independently. Feeds update automatically when leads are saved in the Pipeline.
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Schedule page ────────────────────────────────────────

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MAX_CHIPS   = 3

export default function Schedule() {
  const [projects, setProjects]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [viewDate, setViewDate]     = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [showExport, setShowExport] = useState(false)
  const [showSync, setShowSync]     = useState(false)
  const isMobile = useIsMobile()
  const { members } = useTeam()

  useEffect(() => { fetchProjects() }, [])

  async function fetchProjects() {
    setLoading(true)
    const { data } = await supabase
      .from('leads')
      .select('id, name, address, job_type, square_footage, density, project_start, project_end, crew_size, status, deal_score, consult_at, assigned_to, what_they_need, lead_source')
      .not('status', 'eq', 'Lost')
      .order('project_start', { ascending: true, nullsFirst: false })
    setProjects((data || []).map(p => ({
      ...p,
      project_start: p.project_start ? p.project_start.slice(0, 10) : null,
      project_end:   p.project_end   ? p.project_end.slice(0, 10)   : null,
    })))
    setLoading(false)
  }

  const year  = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const grid  = getMonthGrid(year, month)
  const todayStr = toDateStr(new Date())

  // Projects with dates set
  const scheduledProjects = projects.filter(p => p.project_start)
  const unscheduled       = projects.filter(p => !p.project_start && !p.consult_at)

  // Build a member id → name map from TeamContext
  const memberMap = Object.fromEntries(members.map(m => [m.id, m.name]))

  // Projects active on a given day
  function projectsForDay(dayStr) {
    return scheduledProjects.filter(p => {
      const end = p.project_end || p.project_start
      return p.project_start <= dayStr && end >= dayStr
    })
  }

  // Consults on a given day (date extracted in local timezone)
  function consultsForDay(dayStr) {
    return projects.filter(p => {
      if (!p.consult_at) return false
      const d = new Date(p.consult_at)
      const localDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      return localDate === dayStr
    })
  }

  function fmtConsultTime(isoStr) {
    return new Date(isoStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }

  // All day-strings in the current month (for export)
  const monthDays = grid.filter(d => d.getMonth() === month).map(toDateStr)

  const monthLabel = viewDate.toLocaleDateString([], { month: 'long', year: 'numeric' })

  function prevMonth() { setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)) }
  function nextMonth() { setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)) }
  function goToday()   { const t = new Date(); t.setDate(1); setViewDate(t) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ── Header ───────────────────────────────────────────── */}
      <div style={{ padding: '16px 28px', borderBottom: '1px solid var(--line)', flexShrink: 0, background: 'var(--panel)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          {/* Left: title + month nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            {!isMobile && <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-1)', margin: 0, whiteSpace: 'nowrap' }}>
              Project Schedule
            </h1>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button onClick={prevMonth} style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 7, padding: '5px 8px', color: 'var(--ink-2)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <ChevronLeft size={15} />
              </button>
              <button onClick={goToday} style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 7, padding: '5px 12px', color: 'var(--ink-2)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                Today
              </button>
              <button onClick={nextMonth} style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 7, padding: '5px 8px', color: 'var(--ink-2)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <ChevronRight size={15} />
              </button>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-1)', marginLeft: 6, minWidth: 160 }}>
                {monthLabel}
              </span>
            </div>
          </div>

          {/* Right: actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowSync(true)}
              style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 14px', color: 'var(--ink-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Rss size={13} />
              {!isMobile && 'Subscribe'}
            </button>
            <button
              onClick={() => setShowExport(true)}
              style={{ background: 'linear-gradient(135deg, #A50050, #CD545B)', border: 'none', borderRadius: 8, padding: '8px 16px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Download size={13} />
              {!isMobile && 'Export CSV'}
            </button>
          </div>
        </div>

        {/* Unscheduled warning */}
        {unscheduled.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 7, padding: '8px 12px', marginTop: 10, fontSize: 12 }}>
            <AlertCircle size={13} color="#f59e0b" style={{ flexShrink: 0 }} />
            <span style={{ color: '#f59e0b', fontWeight: 600 }}>{unscheduled.length} project{unscheduled.length !== 1 ? 's' : ''} need dates:</span>
            <span style={{ color: 'var(--ink-2)' }}>{unscheduled.map(p => p.name).join(', ')}</span>
            <span style={{ color: 'var(--ink-3)' }}>— open the lead in Pipeline to set dates</span>
          </div>
        )}
      </div>

      {/* ── Calendar grid ────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: '-5%', bottom: '-10%', width: '60%', height: '70%', background: 'radial-gradient(ellipse at center, rgba(130,40,210,0.078) 0%, transparent 65%)' }} />
          <div style={{ position: 'absolute', right: '-5%', top: '-10%', width: '55%', height: '60%', background: 'radial-gradient(ellipse at center, rgba(0,140,230,0.06) 0%, transparent 65%)' }} />
          <div style={{ position: 'absolute', left: '35%', top: '30%', width: '35%', height: '35%', background: 'radial-gradient(ellipse at center, rgba(0,200,210,0.03) 0%, transparent 65%)' }} />
          <svg viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.033 }}>
            <path d="M-100,400 C150,200 350,600 600,350 S900,100 1300,300" fill="none" stroke="rgba(150,100,255,1)" strokeWidth="2.5" />
            <path d="M-50,600 C200,400 450,700 700,450 S1000,200 1350,450" fill="none" stroke="rgba(80,160,255,1)" strokeWidth="2" />
            <path d="M100,50 C300,250 550,50 750,200 S1050,400 1300,150" fill="none" stroke="rgba(100,220,255,1)" strokeWidth="2" />
            <path d="M0,700 Q300,500 600,600 T1200,400" fill="none" stroke="rgba(180,80,220,1)" strokeWidth="1.5" />
          </svg>
        </div>
        <div style={{ minWidth: 420 }}>
        {/* Day-of-week header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          borderBottom: '1px solid var(--line)',
          position: 'sticky', top: 0, zIndex: 2,
          background: 'var(--bg)',
        }}>
          {DAY_HEADERS.map((day, i) => (
            <div key={day} style={{
              padding: '10px 0',
              textAlign: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: (i === 0 || i === 6) ? '#A50050' : 'var(--ink-3)',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              borderRight: i < 6 ? '1px solid var(--line)' : 'none',
            }}>
              {day}
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>Loading…</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {grid.map((date, idx) => {
              const dayStr          = toDateStr(date)
              const isCurrentMonth  = date.getMonth() === month
              const isToday         = dayStr === todayStr
              const isWeekend       = date.getDay() === 0 || date.getDay() === 6
              const dayProjects     = projectsForDay(dayStr)
              const dayConsults     = consultsForDay(dayStr)
              const allChips        = [...dayConsults.map(c => ({ ...c, _type: 'consult' })), ...dayProjects.map(p => ({ ...p, _type: 'project' }))]
              const overflow        = allChips.length - MAX_CHIPS
              const isLastInRow     = idx % 7 === 6

              return (
                <div
                  key={dayStr}
                  style={{
                    minHeight: 100,
                    padding: '6px 5px 4px',
                    borderRight:  isLastInRow ? 'none' : '1px solid var(--line)',
                    borderBottom: '1px solid var(--line)',
                    background: isToday
                      ? 'rgba(165,0,80,0.05)'
                      : isWeekend && isCurrentMonth
                        ? 'var(--stripe)'
                        : 'transparent',
                  }}
                >
                  {/* Day number */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 3 }}>
                    <span style={isToday ? {
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: '#A50050',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 800,
                    } : {
                      fontSize: 12,
                      fontWeight: 500,
                      color: isCurrentMonth ? 'var(--ink-2)' : 'var(--ink-3)',
                      opacity: isCurrentMonth ? 1 : 0.45,
                    }}>
                      {date.getDate()}
                    </span>
                  </div>

                  {/* Event chips */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {allChips.slice(0, MAX_CHIPS).map(item => {
                      if (item._type === 'consult') {
                        const assignee = item.assigned_to ? memberMap[item.assigned_to] : null
                        const tooltip = [
                          `Consult: ${item.name}`,
                          assignee && `Assignee: ${assignee}`,
                          fmtConsultTime(item.consult_at),
                          item.lead_source && `Source: ${item.lead_source}`,
                          item.what_they_need && `Notes: ${item.what_they_need}`,
                        ].filter(Boolean).join(' · ')
                        return (
                          <div key={`c-${item.id}`} title={tooltip} style={{
                            background: 'rgba(124,58,237,0.13)',
                            borderLeft: '3px solid #7c3aed',
                            borderRadius: '0 3px 3px 0',
                            padding: '2px 5px',
                            fontSize: 11,
                            fontWeight: 500,
                            color: '#a78bfa',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            lineHeight: '17px',
                            cursor: 'default',
                          }}>
                            {fmtConsultTime(item.consult_at)} {item.name}
                          </div>
                        )
                      }
                      const chip = JOB_CHIP[item.job_type] || JOB_CHIP['Both']
                      return (
                        <div key={`p-${item.id}`}
                          title={`${item.name} · ${item.job_type}${item.project_start ? ` · Starts ${item.project_start}` : ''}`}
                          style={{
                            background: chip.bg,
                            borderLeft: `3px solid ${chip.accent}`,
                            borderRadius: '0 3px 3px 0',
                            padding: '2px 5px',
                            fontSize: 11,
                            fontWeight: 500,
                            color: chip.text,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            lineHeight: '17px',
                            cursor: 'default',
                          }}
                        >
                          {item.name}
                        </div>
                      )
                    })}
                    {overflow > 0 && (
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-3)', padding: '1px 5px', lineHeight: '15px' }}>
                        +{overflow} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        </div>{/* end minWidth wrapper */}
      </div>

      {/* ── Legend ───────────────────────────────────────────── */}
      <div style={{ padding: '8px 24px', borderTop: '1px solid var(--line)', display: 'flex', gap: 20, alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: '#7c3aed' }} />
          <span style={{ fontSize: 11, color: 'var(--ink-2)' }}>Consult</span>
        </div>
        <div style={{ width: 1, height: 12, background: 'var(--line)' }} />
        {Object.entries(JOB_CHIP).map(([type, { accent }]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: accent }} />
            <span style={{ fontSize: 11, color: 'var(--ink-2)' }}>{type}</span>
          </div>
        ))}
        <span style={{ fontSize: 11, color: 'var(--ink-3)', marginLeft: 8 }}>
          {scheduledProjects.length} project{scheduledProjects.length !== 1 ? 's' : ''} · {projects.filter(p => p.consult_at).length} consult{projects.filter(p => p.consult_at).length !== 1 ? 's' : ''}
        </span>
      </div>

      {showExport && (
        <ExportModal projects={scheduledProjects} days={monthDays} onClose={() => setShowExport(false)} />
      )}
      {showSync && (
        <CalendarSyncModal onClose={() => setShowSync(false)} />
      )}
    </div>
  )
}
