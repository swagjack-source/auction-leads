import { useState, useEffect } from 'react'
import { Calendar, Plus, Trash2, X, ExternalLink, Download } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useTeam } from '../lib/TeamContext'

// ── Calendar export helpers ───────────────────────────────────

function fmtUTC(date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function googleCalendarUrl(lead, memberName) {
  const start = new Date(lead.consult_at)
  const end   = new Date(start.getTime() + 60 * 60 * 1000)
  const details = [
    memberName      ? `Assigned to: ${memberName}` : '',
    lead.address    ? `Address: ${lead.address}`   : '',
    lead.phone      ? `Phone: ${lead.phone}`       : '',
    lead.job_type   ? `Job Type: ${lead.job_type}` : '',
    lead.deal_score ? `Deal Score: ${Number(lead.deal_score).toFixed(1)}` : '',
  ].filter(Boolean).join('\n')
  const p = new URLSearchParams({
    action:   'TEMPLATE',
    text:     `Consult: ${lead.name}`,
    dates:    `${fmtUTC(start)}/${fmtUTC(end)}`,
    details,
    location: lead.address || '',
  })
  return `https://calendar.google.com/calendar/render?${p}`
}

function downloadICS(lead, memberName) {
  const start = new Date(lead.consult_at)
  const end   = new Date(start.getTime() + 60 * 60 * 1000)
  const desc  = [
    memberName    ? `Assigned to: ${memberName}` : '',
    lead.address  ? `Address: ${lead.address}`   : '',
    lead.phone    ? `Phone: ${lead.phone}`        : '',
  ].filter(Boolean).join('\\n')
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'PRODID:-//AuctionCRM//EN',
    'BEGIN:VEVENT',
    `UID:${lead.id}@auctioncrm`,
    `DTSTART:${fmtUTC(start)}`,
    `DTEND:${fmtUTC(end)}`,
    `SUMMARY:Consult: ${lead.name}`,
    `DESCRIPTION:${desc}`,
    `LOCATION:${lead.address || ''}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
  const blob = new Blob([ics], { type: 'text/calendar' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `consult-${lead.name.replace(/\s+/g, '-')}.ics`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Team management modal ─────────────────────────────────────

const PRESET_COLORS = [
  '#A50050', '#CD545B', '#ec4899', '#ef4444',
  '#f59e0b', '#22c55e', '#71C5E8', '#3b82f6',
  '#f97316', '#84cc16', '#14b8a6', '#a855f7',
]

function initials(name) {
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

function ManageTeamModal({ onClose }) {
  const { members, refetch } = useTeam()
  const [name, setName]   = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (!name.trim()) return
    setSaving(true)
    await supabase.from('team_members').insert({ name: name.trim(), color, initials: initials(name) })
    await refetch()
    setName('')
    setColor(PRESET_COLORS[0])
    setSaving(false)
  }

  async function handleDelete(id) {
    await supabase.from('team_members').delete().eq('id', id)
    await refetch()
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: '#00263E', border: '1px solid #004065', borderRadius: 14, width: '100%', maxWidth: 420, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #004065', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#f0f2ff' }}>Manage Team</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3d7a99' }}><X size={18} /></button>
        </div>

        {/* Member list */}
        <div style={{ padding: '16px 20px', maxHeight: 300, overflowY: 'auto' }}>
          {members.length === 0 ? (
            <div style={{ color: '#3d7a99', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No team members yet.</div>
          ) : (
            members.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #004065' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {m.initials || initials(m.name)}
                  </div>
                  <span style={{ fontSize: 14, color: '#f0f2ff' }}>{m.name}</span>
                </div>
                <button onClick={() => handleDelete(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3d7a99', padding: 4 }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add new */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid #004065' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#3d7a99', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Add Member</div>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Full name"
            style={{ width: '100%', background: '#001929', border: '1px solid #004065', borderRadius: 7, padding: '8px 11px', fontSize: 13, color: '#f0f2ff', outline: 'none', marginBottom: 12 }}
          />
          {/* Color swatches */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: color === c ? '3px solid #f0f2ff' : '3px solid transparent', cursor: 'pointer', outline: 'none' }}
              />
            ))}
          </div>
          {/* Preview + Add */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {name && (
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {initials(name)}
              </div>
            )}
            <button
              onClick={handleAdd}
              disabled={saving || !name.trim()}
              style={{ flex: 1, background: name.trim() ? color : '#004065', border: 'none', borderRadius: 8, padding: '8px 16px', color: name.trim() ? '#fff' : '#3d7a99', fontSize: 13, fontWeight: 600, cursor: name.trim() ? 'pointer' : 'not-allowed', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Adding…' : 'Add to Team'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Consult card ──────────────────────────────────────────────

function ConsultCard({ lead, member }) {
  const time = new Date(lead.consult_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const color = member?.color || '#3d7a99'

  return (
    <div style={{ background: '#002d4a', border: `1px solid #004065`, borderLeft: `3px solid ${color}`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
      {/* Time */}
      <div style={{ minWidth: 68, fontSize: 14, fontWeight: 700, color: '#f0f2ff', fontVariantNumeric: 'tabular-nums' }}>
        {time}
      </div>

      {/* Lead info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: '#f0f2ff', marginBottom: 2 }}>{lead.name}</div>
        <div style={{ fontSize: 12, color: '#6da8c5' }}>
          {[lead.address, lead.job_type, lead.deal_score ? `Score ${Number(lead.deal_score).toFixed(1)}` : null].filter(Boolean).join(' · ')}
        </div>
      </div>

      {/* Assignee badge */}
      {member && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: `${color}18`, border: `1px solid ${color}35`, borderRadius: 20, padding: '4px 10px', flexShrink: 0 }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff' }}>
            {member.initials || member.name[0].toUpperCase()}
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color, whiteSpace: 'nowrap' }}>{member.name}</span>
        </div>
      )}

      {/* Calendar export buttons */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <a
          href={googleCalendarUrl(lead, member?.name)}
          target="_blank"
          rel="noreferrer"
          title="Add to Google Calendar"
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#001929', border: '1px solid #004065', borderRadius: 7, padding: '5px 10px', fontSize: 11, fontWeight: 600, color: '#6da8c5', textDecoration: 'none', whiteSpace: 'nowrap' }}
        >
          <ExternalLink size={11} />
          Google Cal
        </a>
        <button
          onClick={() => downloadICS(lead, member?.name)}
          title="Download .ics (Apple Calendar / Outlook)"
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#001929', border: '1px solid #004065', borderRadius: 7, padding: '5px 10px', fontSize: 11, fontWeight: 600, color: '#6da8c5', cursor: 'pointer' }}
        >
          <Download size={11} />
          .ics
        </button>
      </div>
    </div>
  )
}

// ── Date group helpers ────────────────────────────────────────

function dateLabel(dateStr) {
  const d     = new Date(dateStr + 'T00:00:00')
  const today = new Date(); today.setHours(0,0,0,0)
  const diff  = Math.round((d - today) / 86400000)
  const weekday = d.toLocaleDateString([], { weekday: 'long' })
  const full    = d.toLocaleDateString([], { month: 'long', day: 'numeric' })
  if (diff === 0) return `TODAY — ${weekday}, ${full}`
  if (diff === 1) return `TOMORROW — ${weekday}, ${full}`
  if (diff === -1) return `YESTERDAY — ${weekday}, ${full}`
  if (diff < 0)  return `${Math.abs(diff)} days ago — ${weekday}, ${full}`
  if (diff < 7)  return `${weekday}, ${full}`
  return full
}

// ── Main component ────────────────────────────────────────────

export default function CalendarView() {
  const { members } = useTeam()
  const [leads, setLeads]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [showManage, setShowManage] = useState(false)

  useEffect(() => { fetchConsults() }, [])

  async function fetchConsults() {
    setLoading(true)
    const { data } = await supabase
      .from('leads')
      .select('*')
      .not('consult_at', 'is', null)
      .order('consult_at', { ascending: true })
    setLeads(data || [])
    setLoading(false)
  }

  const memberMap = Object.fromEntries(members.map(m => [m.id, m]))

  // Split into upcoming (today onward) and past
  const now = new Date(); now.setHours(0,0,0,0)
  const upcoming = leads.filter(l => new Date(l.consult_at) >= now)
  const past     = leads.filter(l => new Date(l.consult_at) <  now)

  // Group by date string YYYY-MM-DD
  function groupByDate(items) {
    const groups = {}
    items.forEach(l => {
      const d = l.consult_at.slice(0, 10)
      if (!groups[d]) groups[d] = []
      groups[d].push(l)
    })
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }

  const upcomingGroups = groupByDate(upcoming)
  const pastGroups     = groupByDate(past).reverse() // most recent past first

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid #004065', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, background: 'rgba(165,0,80,0.15)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={18} color="#A50050" />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f0f2ff', margin: 0 }}>Consult Calendar</h1>
              <p style={{ fontSize: 13, color: '#3d7a99', margin: 0 }}>
                {upcoming.length} upcoming · {past.length} past
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowManage(true)}
            style={{ background: '#002d4a', border: '1px solid #004065', borderRadius: 8, padding: '8px 14px', color: '#f0f2ff', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={14} />
            Manage Team
          </button>
        </div>

        {/* Team member pills */}
        {members.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {members.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 7, background: `${m.color}15`, border: `1px solid ${m.color}35`, borderRadius: 20, padding: '4px 12px' }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#fff' }}>
                  {m.initials || m.name[0].toUpperCase()}
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: m.color }}>
                  {m.name} · {leads.filter(l => l.assigned_to === m.id).length} consult{leads.filter(l => l.assigned_to === m.id).length !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>
        {loading ? (
          <div style={{ color: '#3d7a99', fontSize: 14 }}>Loading…</div>
        ) : upcoming.length === 0 && past.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 10, color: '#3d7a99' }}>
            <Calendar size={36} color="#004065" />
            <div style={{ fontSize: 14 }}>No consults scheduled yet.</div>
            <div style={{ fontSize: 13 }}>Open a lead, set a consult date and assign it to someone.</div>
          </div>
        ) : (
          <>
            {/* Upcoming */}
            {upcomingGroups.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                {upcomingGroups.map(([date, items]) => (
                  <div key={date} style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: date === new Date().toISOString().slice(0, 10) ? '#A50050' : '#3d7a99', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>
                      {dateLabel(date)}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {items.map(lead => (
                        <ConsultCard key={lead.id} lead={lead} member={memberMap[lead.assigned_to]} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Past */}
            {pastGroups.length > 0 && (
              <details>
                <summary style={{ fontSize: 11, fontWeight: 700, color: '#3d7a99', textTransform: 'uppercase', letterSpacing: '0.6px', cursor: 'pointer', marginBottom: 14, userSelect: 'none' }}>
                  Past Consults ({past.length})
                </summary>
                {pastGroups.map(([date, items]) => (
                  <div key={date} style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#3d7a99', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                      {dateLabel(date)}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {items.map(lead => (
                        <ConsultCard key={lead.id} lead={lead} member={memberMap[lead.assigned_to]} />
                      ))}
                    </div>
                  </div>
                ))}
              </details>
            )}
          </>
        )}
      </div>

      {showManage && (
        <ManageTeamModal onClose={() => { setShowManage(false); fetchConsults() }} />
      )}
    </div>
  )
}
