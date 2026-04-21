import { useState, useEffect } from 'react'
import { Calendar, Plus, Trash2, X, ExternalLink, Download, CalendarPlus, Building2, Pencil } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useTeam } from '../lib/TeamContext'
import { useAuth } from '../lib/AuthContext'
import { MOCK_LEADS } from '../lib/mockData'

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
    'PRODID:-//Homebase//EN',
    'BEGIN:VEVENT',
    `UID:${lead.id}@homebase`,
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

function googleCalendarUrlMeeting(meeting, memberName, contactName) {
  const dateTime = meeting.time ? `${meeting.date}T${meeting.time}` : `${meeting.date}T09:00`
  const start = new Date(dateTime)
  const end   = new Date(start.getTime() + 60 * 60 * 1000)
  const details = [
    meeting.purpose                  ? `Purpose: ${meeting.purpose}`        : '',
    contactName                      ? `Contact: ${contactName}`            : '',
    memberName                       ? `Assigned to: ${memberName}`         : '',
    meeting.address                  ? `Address: ${meeting.address}`        : '',
    meeting.notes                    ? `Notes: ${meeting.notes}`            : '',
  ].filter(Boolean).join('\n')
  const p = new URLSearchParams({
    action:   'TEMPLATE',
    text:     meeting.title,
    dates:    `${fmtUTC(start)}/${fmtUTC(end)}`,
    details,
    location: meeting.address || '',
  })
  return `https://calendar.google.com/calendar/render?${p}`
}

function downloadICSMeeting(meeting, memberName, contactName) {
  const dateTime = meeting.time ? `${meeting.date}T${meeting.time}` : `${meeting.date}T09:00`
  const start = new Date(dateTime)
  const end   = new Date(start.getTime() + 60 * 60 * 1000)
  const desc  = [
    meeting.purpose  ? `Purpose: ${meeting.purpose}`   : '',
    contactName      ? `Contact: ${contactName}`       : '',
    memberName       ? `Assigned to: ${memberName}`   : '',
    meeting.notes    ? `Notes: ${meeting.notes}`       : '',
  ].filter(Boolean).join('\\n')
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'PRODID:-//Homebase//EN',
    'BEGIN:VEVENT',
    `UID:${meeting.id}@homebase`,
    `DTSTART:${fmtUTC(start)}`,
    `DTEND:${fmtUTC(end)}`,
    `SUMMARY:${meeting.title}`,
    `DESCRIPTION:${desc}`,
    `LOCATION:${meeting.address || ''}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
  const blob = new Blob([ics], { type: 'text/calendar' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `meeting-${meeting.title.replace(/\s+/g, '-')}.ics`
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
  const { organizationId } = useAuth()
  const [name, setName]     = useState('')
  const [color, setColor]   = useState(PRESET_COLORS[0])
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (!name.trim()) return
    setSaving(true)
    await supabase.from('team_members').insert({ name: name.trim(), color, initials: initials(name), organization_id: organizationId })
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
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, width: '100%', maxWidth: 420, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink-1)' }}>Manage Team</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)' }}><X size={18} /></button>
        </div>
        <div style={{ padding: '16px 20px', maxHeight: 300, overflowY: 'auto' }}>
          {members.length === 0 ? (
            <div style={{ color: 'var(--ink-3)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No team members yet.</div>
          ) : (
            members.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {m.initials || initials(m.name)}
                  </div>
                  <span style={{ fontSize: 14, color: 'var(--ink-1)' }}>{m.name}</span>
                </div>
                <button onClick={() => handleDelete(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 4 }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--line)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Add Member</div>
          <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Full name"
            style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 7, padding: '8px 11px', fontSize: 13, color: 'var(--ink-1)', outline: 'none', marginBottom: 12 }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {PRESET_COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)}
                style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: color === c ? '3px solid var(--ink-1)' : '3px solid transparent', cursor: 'pointer', outline: 'none' }} />
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {name && (
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {initials(name)}
              </div>
            )}
            <button onClick={handleAdd} disabled={saving || !name.trim()}
              style={{ flex: 1, background: name.trim() ? color : 'var(--line)', border: 'none', borderRadius: 8, padding: '8px 16px', color: name.trim() ? '#fff' : 'var(--ink-3)', fontSize: 13, fontWeight: 600, cursor: name.trim() ? 'pointer' : 'not-allowed', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Adding…' : 'Add to Team'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Add Meeting Modal ─────────────────────────────────────────

const PURPOSE_OPTIONS = ['Partner Meeting', 'Senior Living Tour', 'Sales Meeting', 'Follow-up', 'Team Meeting', 'Other']

function AddMeetingModal({ contacts, members, onClose, onAdded, existing }) {
  const { organizationId } = useAuth()
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    title:       existing?.title       ?? '',
    assignee_id: existing?.assignee_id ?? '',
    contact_id:  existing?.contact_id  ?? '',
    date:        existing?.date        ?? today,
    time:        existing?.time        ?? '',
    purpose:     existing?.purpose     ?? 'Other',
    address:     existing?.address     ?? '',
    notes:       existing?.notes       ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave() {
    if (!form.title.trim() || !form.date) return
    setSaving(true)
    const payload = {
      title:           form.title.trim(),
      assignee_id:     form.assignee_id || null,
      contact_id:      form.contact_id  || null,
      date:            form.date,
      time:            form.time || null,
      purpose:         form.purpose || null,
      address:         form.address || null,
      notes:           form.notes || null,
      organization_id: organizationId,
    }
    const query = existing
      ? supabase.from('meetings').update(payload).eq('id', existing.id)
      : supabase.from('meetings').insert(payload)
    const { data, error } = await query.select('*, contacts(name, category)').single()
    setSaving(false)
    if (error) { setError(error.message); return }
    onAdded(data)
    onClose()
  }

  const inputStyle = { width: '100%', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 7, padding: '8px 11px', fontSize: 13, color: 'var(--ink-1)', outline: 'none', fontFamily: 'inherit' }
  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, width: '100%', maxWidth: 460, overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink-1)' }}>{existing ? 'Edit Meeting' : 'New Meeting'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)' }}><X size={18} /></button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
          {/* Title */}
          <div>
            <label style={labelStyle}>Meeting Name *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Tour at Sunrise Senior Living" style={inputStyle} />
          </div>

          {/* Date + Time row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Date *</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Time</label>
              <input type="time" value={form.time} onChange={e => set('time', e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Assignee */}
          <div>
            <label style={labelStyle}>Assignee</label>
            <select value={form.assignee_id} onChange={e => set('assignee_id', e.target.value)} style={inputStyle}>
              <option value="">— No assignee —</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          {/* Contact from directory */}
          <div>
            <label style={labelStyle}>Contact (from directory)</label>
            <select value={form.contact_id} onChange={e => set('contact_id', e.target.value)} style={inputStyle}>
              <option value="">— No contact —</option>
              {contacts.map(c => <option key={c.id} value={c.id}>{c.name} ({c.category})</option>)}
            </select>
          </div>

          {/* Purpose */}
          <div>
            <label style={labelStyle}>Purpose</label>
            <select value={form.purpose} onChange={e => set('purpose', e.target.value)} style={inputStyle}>
              {PURPOSE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Address */}
          <div>
            <label style={labelStyle}>Address</label>
            <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="e.g. 123 Main St, Denver, CO"
              style={inputStyle} />
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes..." rows={3}
              style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          {error && <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 16px', color: 'var(--ink-2)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.title.trim() || !form.date}
            style={{ background: (form.title.trim() && form.date) ? 'linear-gradient(135deg, #A50050, #CD545B)' : 'var(--line)', border: 'none', borderRadius: 8, padding: '8px 18px', color: (form.title.trim() && form.date) ? '#fff' : 'var(--ink-3)', fontSize: 13, fontWeight: 600, cursor: (form.title.trim() && form.date) ? 'pointer' : 'not-allowed', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
            {existing ? <Pencil size={14} /> : <CalendarPlus size={14} />}
            {saving ? 'Saving…' : existing ? 'Save Changes' : 'Add Meeting'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Consult card ──────────────────────────────────────────────

function ConsultCard({ lead, member }) {
  const time  = new Date(lead.consult_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const color = member?.color || 'var(--ink-3)'

  return (
    <div style={{ background: 'var(--panel)', border: `1px solid var(--line)`, borderLeft: `3px solid ${color}`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ minWidth: 68, fontSize: 14, fontWeight: 700, color: 'var(--ink-1)', fontVariantNumeric: 'tabular-nums' }}>
        {time}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink-1)', marginBottom: 2 }}>{lead.name}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>
          {[lead.address, lead.job_type, lead.deal_score ? `Score ${Number(lead.deal_score).toFixed(1)}` : null].filter(Boolean).join(' · ')}
        </div>
      </div>
      {member && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: `${color}18`, border: `1px solid ${color}35`, borderRadius: 20, padding: '4px 10px', flexShrink: 0 }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff' }}>
            {member.initials || member.name[0].toUpperCase()}
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color, whiteSpace: 'nowrap' }}>{member.name}</span>
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <a href={googleCalendarUrl(lead, member?.name)} target="_blank" rel="noreferrer" title="Add to Google Calendar"
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 7, padding: '5px 10px', fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
          <ExternalLink size={11} />Google Cal
        </a>
        <button onClick={() => downloadICS(lead, member?.name)} title="Download .ics"
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 7, padding: '5px 10px', fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', cursor: 'pointer' }}>
          <Download size={11} />.ics
        </button>
      </div>
    </div>
  )
}

// ── Meeting card ──────────────────────────────────────────────

function MeetingCard({ meeting, member, onDelete, onEdit }) {
  const timeLabel = meeting.time
    ? new Date(`2000-01-01T${meeting.time}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : 'All day'
  const color = member?.color || '#7c3aed'

  return (
    <div style={{ background: 'var(--panel)', border: `1px solid var(--line)`, borderLeft: `3px solid ${color}`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ minWidth: 68, fontSize: 14, fontWeight: 700, color: 'var(--ink-1)', fontVariantNumeric: 'tabular-nums' }}>
        {timeLabel}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink-1)' }}>{meeting.title}</span>
          <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 20, padding: '2px 7px', color: '#7c3aed', whiteSpace: 'nowrap' }}>
            Meeting
          </span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>
          {[
            meeting.purpose,
            meeting.contacts?.name ? meeting.contacts.name : null,
            meeting.address,
          ].filter(Boolean).join(' · ')}
        </div>
      </div>
      {meeting.contacts && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 20, padding: '4px 10px', flexShrink: 0 }}>
          <Building2 size={11} color="var(--ink-3)" />
          <span style={{ fontSize: 12, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>{meeting.contacts.name}</span>
        </div>
      )}
      {member && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: `${color}18`, border: `1px solid ${color}35`, borderRadius: 20, padding: '4px 10px', flexShrink: 0 }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff' }}>
            {member.initials || member.name[0].toUpperCase()}
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color, whiteSpace: 'nowrap' }}>{member.name}</span>
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <a
          href={googleCalendarUrlMeeting(meeting, member?.name, meeting.contacts?.name)}
          target="_blank"
          rel="noreferrer"
          title="Add to Google Calendar"
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 7, padding: '5px 10px', fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', textDecoration: 'none', whiteSpace: 'nowrap' }}
        >
          <ExternalLink size={11} />Google Cal
        </a>
        <button
          onClick={() => downloadICSMeeting(meeting, member?.name, meeting.contacts?.name)}
          title="Download .ics"
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 7, padding: '5px 10px', fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', cursor: 'pointer' }}
        >
          <Download size={11} />.ics
        </button>
      </div>
      <button onClick={() => onEdit(meeting)} title="Edit meeting" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 4, flexShrink: 0 }}>
        <Pencil size={14} />
      </button>
      <button onClick={() => onDelete(meeting.id)} title="Delete meeting" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 4, flexShrink: 0 }}>
        <Trash2 size={14} />
      </button>
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
  const [leads, setLeads]               = useState([])
  const [meetings, setMeetings]         = useState([])
  const [contacts, setContacts]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [showManage, setShowManage]         = useState(false)
  const [showAddMeeting, setShowAddMeeting] = useState(false)
  const [editingMeeting, setEditingMeeting] = useState(null)
  const [filterMember, setFilterMember] = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: leadsData }, { data: meetingsData }, { data: contactsData }] = await Promise.all([
      supabase.from('leads').select('*').not('consult_at', 'is', null).order('consult_at', { ascending: true }),
      supabase.from('meetings').select('*, contacts(name, category)').order('date', { ascending: true }),
      supabase.from('contacts').select('*').order('name'),
    ])
    const mockConsults = MOCK_LEADS.filter(l => l.consult_at)
    setLeads(leadsData && leadsData.length > 0 ? leadsData : mockConsults)
    setMeetings(meetingsData || [])
    setContacts(contactsData || [])
    setLoading(false)
  }

  async function handleDeleteMeeting(id) {
    await supabase.from('meetings').delete().eq('id', id)
    setMeetings(ms => ms.filter(m => m.id !== id))
  }

  const memberMap = Object.fromEntries(members.map(m => [m.id, m]))

  // Unified event list (optionally filtered by team member)
  const allEvents = [
    ...leads.map(l => ({
      type: 'consult',
      date: l.consult_at.slice(0, 10),
      sortKey: l.consult_at,
      data: l,
    })),
    ...meetings.map(m => ({
      type: 'meeting',
      date: m.date,
      sortKey: m.date + 'T' + (m.time || '00:00'),
      data: m,
    })),
  ].filter(e => {
    if (!filterMember) return true
    const assignee = e.type === 'consult' ? e.data.assigned_to : e.data.assignee_id
    return assignee === filterMember
  })

  const now = new Date(); now.setHours(0,0,0,0)
  const upcoming = allEvents.filter(e => new Date(e.date + 'T00:00:00') >= now)
  const past     = allEvents.filter(e => new Date(e.date + 'T00:00:00') <  now)

  function groupByDate(items) {
    const groups = {}
    items.forEach(e => {
      if (!groups[e.date]) groups[e.date] = []
      groups[e.date].push(e)
    })
    Object.values(groups).forEach(g => g.sort((a, b) => a.sortKey.localeCompare(b.sortKey)))
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }

  const upcomingGroups = groupByDate(upcoming)
  const pastGroups     = groupByDate(past).reverse()

  const todayStr = new Date().toISOString().slice(0, 10)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--line)', flexShrink: 0, background: 'var(--panel)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Team filter chips */}
          <button
            onClick={() => setFilterMember(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 999,
              border: `1px solid ${!filterMember ? 'var(--accent)' : 'var(--line)'}`,
              background: !filterMember ? 'var(--accent-soft)' : 'var(--bg)',
              color: !filterMember ? 'var(--accent-ink)' : 'var(--ink-2)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >All</button>
          {members.map(m => {
            const active = filterMember === m.id
            const count = leads.filter(l => l.assigned_to === m.id).length
            return (
              <button key={m.id} onClick={() => setFilterMember(active ? null : m.id)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 999,
                border: `1px solid ${active ? m.color + '70' : 'var(--line)'}`,
                background: active ? `${m.color}15` : 'var(--bg)',
                color: active ? m.color : 'var(--ink-2)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: m.color, display: 'grid', placeItems: 'center', fontSize: 8, fontWeight: 700, color: '#fff' }}>
                  {(m.initials || m.name[0]).toUpperCase()}
                </div>
                {m.name}
                {count > 0 && <span style={{ fontSize: 10.5, opacity: 0.7 }}>·{count}</span>}
              </button>
            )
          })}

          <div style={{ flex: 1 }} />

          <button
            onClick={() => setShowAddMeeting(true)}
            className="btn btn-secondary"
            style={{ fontSize: 12.5, padding: '7px 12px 7px 10px', borderRadius: 10 }}
          >
            <CalendarPlus size={13} strokeWidth={1.8} /> + Meeting
          </button>
          <button
            onClick={() => setShowManage(true)}
            className="btn btn-primary"
            style={{ fontSize: 12.5, padding: '7px 12px 7px 10px', borderRadius: 10 }}
          >
            <Plus size={13} strokeWidth={2.5} /> Manage Team
          </button>
        </div>

        <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginTop: 8 }}>
          {upcoming.length} upcoming · {past.length} past{filterMember ? ` · filtered by ${memberMap[filterMember]?.name}` : ''}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px', position: 'relative' }}>
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

        {loading ? (
          <div style={{ color: 'var(--ink-3)', fontSize: 14 }}>Loading…</div>
        ) : upcoming.length === 0 && past.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 10, color: 'var(--ink-3)', position: 'relative', zIndex: 1 }}>
            <Calendar size={36} color="var(--line)" />
            <div style={{ fontSize: 14 }}>No events scheduled yet.</div>
            <div style={{ fontSize: 13 }}>Add a meeting or schedule a consult from a lead.</div>
          </div>
        ) : (
          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Upcoming */}
            {upcomingGroups.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                {upcomingGroups.map(([date, items]) => (
                  <div key={date} style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: date === todayStr ? '#A50050' : 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>
                      {dateLabel(date)}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {items.map(event =>
                        event.type === 'consult'
                          ? <ConsultCard key={event.data.id} lead={event.data} member={memberMap[event.data.assigned_to]} />
                          : <MeetingCard key={event.data.id} meeting={event.data} member={memberMap[event.data.assignee_id]} onDelete={handleDeleteMeeting} onEdit={setEditingMeeting} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Past */}
            {pastGroups.length > 0 && (
              <details>
                <summary style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.6px', cursor: 'pointer', marginBottom: 14, userSelect: 'none' }}>
                  Past Events ({past.length})
                </summary>
                {pastGroups.map(([date, items]) => (
                  <div key={date} style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                      {dateLabel(date)}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {items.map(event =>
                        event.type === 'consult'
                          ? <ConsultCard key={event.data.id} lead={event.data} member={memberMap[event.data.assigned_to]} />
                          : <MeetingCard key={event.data.id} meeting={event.data} member={memberMap[event.data.assignee_id]} onDelete={handleDeleteMeeting} onEdit={setEditingMeeting} />
                      )}
                    </div>
                  </div>
                ))}
              </details>
            )}
          </div>
        )}
      </div>

      {showManage && (
        <ManageTeamModal onClose={() => { setShowManage(false); fetchAll() }} />
      )}
      {showAddMeeting && (
        <AddMeetingModal
          contacts={contacts}
          members={members}
          onClose={() => setShowAddMeeting(false)}
          onAdded={m => { setMeetings(ms => [...ms, m]); setShowAddMeeting(false) }}
        />
      )}
      {editingMeeting && (
        <AddMeetingModal
          contacts={contacts}
          members={members}
          existing={editingMeeting}
          onClose={() => setEditingMeeting(null)}
          onAdded={updated => {
            setMeetings(ms => ms.map(m => m.id === updated.id ? updated : m))
            setEditingMeeting(null)
          }}
        />
      )}
    </div>
  )
}
