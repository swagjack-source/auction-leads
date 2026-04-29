import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Download, AlertCircle, X, Rss, Check, Copy, Plus, MapPin, ExternalLink } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { estimateCrew, estimateProjectDays } from '../lib/scoring'
import { useIsMobile } from '../hooks/useIsMobile'
import { useTeam } from '../lib/TeamContext'
import { useAuth } from '../lib/AuthContext'
import NewMeetingModal from '../components/modals/NewMeetingModal'

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

function getWeekStart(date) {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  return d
}

function fmtConsultTime(isoStr) {
  return new Date(isoStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function fmtTime(timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h < 12 ? 'AM' : 'PM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

function fmtDateRange(startStr, endStr) {
  if (!startStr) return ''
  const opts = { month: 'short', day: 'numeric' }
  const s = new Date(startStr + 'T00:00:00').toLocaleDateString([], opts)
  if (!endStr || endStr === startStr) return s
  const e = new Date(endStr + 'T00:00:00').toLocaleDateString([], opts)
  return `${s} – ${e}`
}

function consultsForDay(dayStr, consults) {
  return consults.filter(c => c.date === dayStr)
}

function meetingsForDay(dayStr, meetings) {
  return meetings.filter(m => m.date === dayStr)
}

// ── Colors ────────────────────────────────────────────────────

const JOB_CHIP = {
  'Clean Out': { bg: 'rgba(234,88,12,0.15)',  accent: '#ea580c', text: '#ea580c' },
  'Auction':   { bg: 'rgba(124,58,237,0.15)', accent: '#7c3aed', text: '#7c3aed' },
  'Both':      { bg: 'rgba(59,130,246,0.15)', accent: '#3b82f6', text: '#3b82f6' },
}

const AVATAR_COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899','#14b8a6']

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const BAR_H = 22
const BAR_GAP = 2
const DAY_NUM_H = 26

const navBtnStyle = {
  background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 7,
  padding: '5px 8px', color: 'var(--ink-2)', cursor: 'pointer',
  display: 'flex', alignItems: 'center',
}

// ── Sub-components ────────────────────────────────────────────

function MemberAvatar({ member, size = 20 }) {
  if (!member) return null
  const initials = member.name
    ? member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'
  const color = member.color || AVATAR_COLORS[member.name ? member.name.charCodeAt(0) % AVATAR_COLORS.length : 0]
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.floor(size * 0.42), fontWeight: 700, flexShrink: 0,
      border: '1.5px solid var(--panel)',
    }}>
      {initials}
    </div>
  )
}

// ── Project Edit Panel ────────────────────────────────────────

function ProjectEditPanel({ project, onClose, onSave }) {
  const [startDate, setStartDate] = useState(project.project_start || '')
  const [endDate, setEndDate] = useState(project.project_end || '')
  const [saving, setSaving] = useState(false)
  const chip = JOB_CHIP[project.job_type] || JOB_CHIP['Both']

  async function handleSave() {
    setSaving(true)
    await supabase.from('leads').update({
      project_start: startDate || null,
      project_end: endDate || null,
    }).eq('id', project.id)
    setSaving(false)
    onSave({ ...project, project_start: startDate, project_end: endDate })
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'rgba(0,0,0,0.3)' }}
      />
      {/* Panel */}
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, width: 320, zIndex: 50,
        background: 'var(--panel)', borderLeft: '1px solid var(--line)',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink-1)', marginBottom: 6 }}>{project.name}</div>
            <span style={{ background: chip.bg, color: chip.accent, borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
              {project.job_type}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {project.address && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>Address</div>
              <div style={{ fontSize: 14, color: 'var(--ink-1)' }}>{project.address}</div>
            </div>
          )}
          {project.status && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>Status</div>
              <div style={{ fontSize: 14, color: 'var(--ink-1)' }}>{project.status}</div>
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>Start Date</div>
            <input
              type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 12px', color: 'var(--ink-1)', fontSize: 13, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>End Date</div>
            <input
              type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 12px', color: 'var(--ink-1)', fontSize: 13, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }}
            />
          </div>
          {project.what_they_need && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>Notes</div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>{project.what_they_need}</div>
            </div>
          )}
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 8, padding: '9px', color: 'var(--ink-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={handleSave} disabled={saving}
            style={{ flex: 2, background: 'linear-gradient(135deg,#A50050,#CD545B)', border: 'none', borderRadius: 8, padding: '9px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Saving…' : 'Save Dates'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Lane assignment ───────────────────────────────────────────

function assignLanes(rowProjects) {
  const sorted = [...rowProjects].sort((a, b) => a.startCol - b.startCol)
  const laneEnds = []
  return sorted.map(p => {
    let lane = laneEnds.findIndex(endCol => endCol < p.startCol)
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(-1) }
    laneEnds[lane] = p.endCol
    return { ...p, lane }
  })
}

// ── Event Popover ─────────────────────────────────────────────

function EventPopover({ event, anchorRect, memberMap, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClickOutside)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClickOutside)
    }
  }, [onClose])

  if (!anchorRect) return null

  // Position: try to appear below-right, but avoid going off screen
  const W = 280
  const vw = window.innerWidth
  const vh = window.innerHeight
  let left = anchorRect.left
  let top = anchorRect.bottom + 6
  if (left + W > vw - 12) left = vw - W - 12
  if (left < 8) left = 8
  // if too close to bottom, flip above
  if (top + 260 > vh) top = anchorRect.top - 266

  const mapsUrl = event.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`
    : null

  const member = event.assigned_to
    ? memberMap[event.assigned_to]
    : event.assignee_id
      ? memberMap[event.assignee_id]
      : null

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top, left,
        width: W,
        zIndex: 200,
        background: 'var(--panel)',
        border: '1px solid var(--line)',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
        padding: 16,
        minWidth: 240,
        maxWidth: 320,
      }}
    >
      {/* Close btn */}
      <button onClick={onClose} style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 2 }}>
        <X size={14} />
      </button>

      {event.type === 'project' && (
        <>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink-1)', marginBottom: 6, paddingRight: 20 }}>{event.name}</div>
          {event.job_type && (
            <span style={{ background: (JOB_CHIP[event.job_type] || JOB_CHIP['Both']).bg, color: (JOB_CHIP[event.job_type] || JOB_CHIP['Both']).accent, borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 700, marginBottom: 10, display: 'inline-block' }}>
              {event.job_type}
            </span>
          )}
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>
              <span style={{ fontWeight: 600, color: 'var(--ink-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Dates </span>
              {fmtDateRange(event.project_start, event.project_end)}
            </div>
            {member && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-2)' }}>
                <MemberAvatar member={member} size={18} />
                {member.name}
              </div>
            )}
            {event.address && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, fontSize: 12, color: 'var(--ink-2)' }}>
                <MapPin size={12} style={{ marginTop: 2, flexShrink: 0, color: 'var(--ink-3)' }} />
                <span>{event.address}</span>
              </div>
            )}
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
            {mapsUrl && (
              <a href={mapsUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#3b82f6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={12} /> Directions
              </a>
            )}
            <a href="/projects" style={{ marginLeft: 'auto', background: 'linear-gradient(135deg,#A50050,#CD545B)', borderRadius: 7, padding: '5px 12px', color: '#fff', fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              <ExternalLink size={12} /> Open Project
            </a>
          </div>
        </>
      )}

      {event.type === 'consult' && (
        <>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink-1)', marginBottom: 4, paddingRight: 20 }}>{event.name}</div>
          {event.time && <div style={{ fontSize: 12, color: '#7F77DD', fontWeight: 600, marginBottom: 8 }}>{fmtTime(event.time)}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {member && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-2)' }}>
                <MemberAvatar member={member} size={18} />
                {member.name}
              </div>
            )}
            {event.address && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, fontSize: 12, color: 'var(--ink-2)' }}>
                <MapPin size={12} style={{ marginTop: 2, flexShrink: 0, color: 'var(--ink-3)' }} />
                <span>{event.address}</span>
              </div>
            )}
          </div>
          {mapsUrl && (
            <div style={{ marginTop: 10 }}>
              <a href={mapsUrl} target="_blank" rel="noreferrer" style={{ background: 'rgba(127,119,221,0.12)', border: '1px solid rgba(127,119,221,0.3)', borderRadius: 7, padding: '5px 12px', color: '#7F77DD', fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={12} /> Get Directions
              </a>
            </div>
          )}
        </>
      )}

      {event.type === 'meeting' && (
        <>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink-1)', marginBottom: 4, paddingRight: 20 }}>{event.title}</div>
          {event.time && <div style={{ fontSize: 12, color: '#1D9E75', fontWeight: 600, marginBottom: 8 }}>{fmtTime(event.time)}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {member && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-2)' }}>
                <MemberAvatar member={member} size={18} />
                {member.name}
              </div>
            )}
            {event.address && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, fontSize: 12, color: 'var(--ink-2)' }}>
                <MapPin size={12} style={{ marginTop: 2, flexShrink: 0, color: 'var(--ink-3)' }} />
                <span>{event.address}</span>
              </div>
            )}
            {event.notes && (
              <div style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {event.notes}
              </div>
            )}
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
            <button onClick={onClose} style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 7, padding: '5px 12px', color: 'var(--ink-2)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Edit
            </button>
            <button onClick={onClose} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7, padding: '5px 12px', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Quick Add Event Modal ─────────────────────────────────────

function QuickAddEventModal({ initialDate, leads, members, onClose, onSaved }) {
  const { organizationId } = useAuth()
  const [type, setType] = useState('consult')
  const [date, setDate] = useState(initialDate || '')
  const [time, setTime] = useState('')
  const [selectedLead, setSelectedLead] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [address, setAddress] = useState('')
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const consultLeads = leads.filter(l => !['Won', 'Lost'].includes(l.status))

  function handleLeadChange(leadId) {
    setSelectedLead(leadId)
    const lead = leads.find(l => l.id === leadId)
    if (lead) setAddress(lead.address || '')
  }

  async function handleSave() {
    setError('')
    if (type === 'consult') {
      if (!selectedLead) { setError('Please select a client'); return }
      if (!date) { setError('Please pick a date'); return }
    } else {
      if (!title.trim()) { setError('Please enter a title'); return }
      if (!date) { setError('Please pick a date'); return }
    }

    setSaving(true)
    try {
      if (type === 'consult') {
        const lead = leads.find(l => l.id === selectedLead)
        const isoDateTime = time ? `${date}T${time}:00` : `${date}T09:00:00`

        await supabase.from('calendar_events').insert({
          title: lead?.name || 'Consult',
          event_type: 'consult',
          event_date: date,
          event_time: time || null,
          address: address || null,
          assigned_to: assignedTo || null,
          lead_id: selectedLead,
        })

        if (lead && lead.status !== 'Consult Scheduled') {
          await supabase.from('leads').update({
            consult_at: isoDateTime,
            status: 'Consult Scheduled',
          }).eq('id', selectedLead)
        } else if (lead) {
          await supabase.from('leads').update({ consult_at: isoDateTime }).eq('id', selectedLead)
        }
      } else {
        await supabase.from('meetings').insert({
          title: title.trim(),
          date,
          time: time || null,
          address: location || null,
          notes: notes || null,
          assignee_id: assignedTo || null,
        })
      }
      onSaved()
    } catch (e) {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink-1)' }}>Add Event</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)' }}><X size={18} /></button>
        </div>

        {/* Type toggle */}
        <div style={{ padding: '14px 20px 0', display: 'flex', gap: 8 }}>
          {[['consult', 'Consult', '#7F77DD'], ['meeting', 'Meeting', '#1D9E75']].map(([val, label, color]) => (
            <button
              key={val}
              onClick={() => setType(val)}
              style={{
                background: type === val ? `rgba(${val === 'consult' ? '127,119,221' : '29,158,117'},0.12)` : 'var(--bg)',
                border: `1.5px solid ${type === val ? color : 'var(--line)'}`,
                borderRadius: 8,
                padding: '7px 18px',
                color: type === val ? color : 'var(--ink-3)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Form */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {type === 'consult' && (
            <>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Client *</label>
                <select
                  value={selectedLead}
                  onChange={e => handleLeadChange(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 12px', color: 'var(--ink-1)', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                >
                  <option value="">Select client…</option>
                  {consultLeads.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Address</label>
                <input
                  type="text" value={address} onChange={e => setAddress(e.target.value)}
                  placeholder="Auto-filled from lead"
                  style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 12px', color: 'var(--ink-1)', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>
            </>
          )}

          {type === 'meeting' && (
            <>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Title *</label>
                <input
                  type="text" value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="Meeting title"
                  style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 12px', color: 'var(--ink-1)', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Location</label>
                <input
                  type="text" value={location} onChange={e => setLocation(e.target.value)}
                  placeholder="Address or location"
                  style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 12px', color: 'var(--ink-1)', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>
            </>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Date *</label>
              <input
                type="date" value={date} onChange={e => setDate(e.target.value)}
                style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 12px', color: 'var(--ink-1)', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Time</label>
              <input
                type="time" value={time} onChange={e => setTime(e.target.value)}
                style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 12px', color: 'var(--ink-1)', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Assign To</label>
            <select
              value={assignedTo}
              onChange={e => setAssignedTo(e.target.value)}
              style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 12px', color: 'var(--ink-1)', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
            >
              <option value="">Unassigned</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {type === 'meeting' && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Notes</label>
              <textarea
                value={notes} onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Optional notes…"
                style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 12px', color: 'var(--ink-1)', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' }}
              />
            </div>
          )}

          {error && (
            <div style={{ fontSize: 12, color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7, padding: '7px 12px' }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 8, padding: '9px', color: 'var(--ink-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
            <button
              onClick={handleSave} disabled={saving}
              style={{ flex: 2, background: 'linear-gradient(135deg,#A50050,#CD545B)', border: 'none', borderRadius: 8, padding: '9px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Saving…' : 'Add Event'}
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', textAlign: 'center' }}>
            To add a project, schedule it from the Pipeline or Projects page.
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Month View ────────────────────────────────────────────────

function MonthView({ projects, consults, meetings, viewDate, todayStr, memberMap, onProjectClick, onEventClick, onDayCellClick, showTypes, activeEmployeeCount = 4 }) {
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const grid = getMonthGrid(year, month)
  const weeks = Array.from({ length: 6 }, (_, i) => grid.slice(i * 7, i * 7 + 7))
  const scheduled = projects.filter(p => p.project_start)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Day-of-week headers */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
        borderBottom: '1px solid var(--line)',
        position: 'sticky', top: 0, zIndex: 4, background: 'var(--bg)', flexShrink: 0,
      }}>
        {DAY_HEADERS.map((day, i) => (
          <div key={day} style={{
            padding: '8px 0', textAlign: 'center', fontSize: 11, fontWeight: 700,
            color: (i === 0 || i === 6) ? '#A50050' : 'var(--ink-3)',
            textTransform: 'uppercase', letterSpacing: '0.5px',
            borderRight: i < 6 ? '1px solid var(--line)' : 'none',
          }}>
            {day}
          </div>
        ))}
      </div>

      {/* Week rows */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {weeks.map((week, weekIdx) => {
          const weekDayStrs = week.map(toDateStr)
          const rowStart = weekDayStrs[0]
          const rowEnd = weekDayStrs[6]

          const rowProjects = scheduled
            .filter(p => {
              const end = p.project_end || p.project_start
              return p.project_start <= rowEnd && end >= rowStart
            })
            .map(p => {
              const end = p.project_end || p.project_start
              return {
                ...p,
                startCol: p.project_start < rowStart ? 0 : weekDayStrs.indexOf(p.project_start),
                endCol: end > rowEnd ? 6 : weekDayStrs.indexOf(end),
                continuedFrom: p.project_start < rowStart,
                continuesTo: end > rowEnd,
              }
            })

          const laidOut = assignLanes(rowProjects)
          const numLanes = laidOut.length > 0 ? Math.max(...laidOut.map(p => p.lane)) + 1 : 0
          const barAreaH = numLanes * (BAR_H + BAR_GAP) + (numLanes > 0 ? 4 : 0)

          return (
            <div
              key={weekIdx}
              style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', minHeight: 90 + barAreaH }}
            >
              {/* Day cells */}
              {week.map((date, col) => {
                const dayStr = weekDayStrs[col]
                const isCurrentMonth = date.getMonth() === month
                const isToday = dayStr === todayStr
                const isWeekend = date.getDay() === 0 || date.getDay() === 6
                const isPast = dayStr < todayStr

                // Day capacity calculation
                const dayProjects = scheduled.filter(p => {
                  const end = p.project_end || p.project_start
                  return p.project_start <= dayStr && end >= dayStr
                })
                let totalHours = 0
                dayProjects.forEach(p => {
                  const start = new Date(p.project_start + 'T00:00:00')
                  const end = p.project_end ? new Date(p.project_end + 'T00:00:00') : start
                  const projectDays = Math.max(Math.round((end - start) / 86400000) + 1, 1)
                  const dailyHours = (p.square_footage ? Math.round(p.square_footage * 0.008) : 8) / projectDays
                  totalHours += dailyHours
                })
                const capacity = activeEmployeeCount * 8
                const utilization = capacity > 0 ? totalHours / capacity : 0

                let capacityBg = 'transparent'
                if (utilization > 0 && utilization < 0.75) capacityBg = 'rgba(34,197,94,0.06)'
                else if (utilization >= 0.75 && utilization < 1) capacityBg = 'rgba(245,158,11,0.08)'
                else if (utilization >= 1) capacityBg = 'rgba(239,68,68,0.08)'

                const baseBg = isToday
                  ? 'rgba(59,130,246,0.06)'
                  : isWeekend && isCurrentMonth
                    ? 'var(--stripe)'
                    : 'transparent'

                // For today we layer capacity on top with a blend — use a div overlay instead
                const dayCons = showTypes.consults ? consultsForDay(dayStr, consults) : []
                const dayMeetings = showTypes.meetings ? meetingsForDay(dayStr, meetings) : []

                return (
                  <div
                    key={dayStr}
                    onClick={() => onDayCellClick?.(dayStr)}
                    style={{
                      borderRight: col < 6 ? '1px solid var(--line)' : 'none',
                      borderBottom: '1px solid var(--line)',
                      background: baseBg,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      position: 'relative',
                    }}
                  >
                    {/* Capacity tint overlay */}
                    {capacityBg !== 'transparent' && (
                      <div style={{ position: 'absolute', inset: 0, background: capacityBg, pointerEvents: 'none', zIndex: 0 }} />
                    )}
                    {/* Day number */}
                    <div style={{ height: DAY_NUM_H, display: 'flex', justifyContent: 'flex-end', padding: '5px 7px 0', position: 'relative', zIndex: 1 }}>
                      <span style={isToday ? {
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 22, height: 22, borderRadius: '50%',
                        background: '#A50050', color: '#fff', fontSize: 12, fontWeight: 800,
                      } : {
                        fontSize: 12, fontWeight: 500,
                        color: isCurrentMonth ? 'var(--ink-2)' : 'var(--ink-3)',
                        opacity: isCurrentMonth ? 1 : 0.4,
                      }}>
                        {date.getDate()}
                      </span>
                    </div>
                    {/* Spacer for project bar lanes */}
                    <div style={{ height: barAreaH, position: 'relative', zIndex: 1 }} />
                    {/* Consult chips */}
                    {dayCons.length > 0 && (
                      <div style={{ padding: '2px 4px 4px', display: 'flex', flexDirection: 'column', gap: 2, position: 'relative', zIndex: 1 }}>
                        {dayCons.slice(0, 2).map(c => {
                          const member = c.assigned_to ? memberMap[c.assigned_to] : null
                          return (
                            <div
                              key={c.id}
                              onClick={e => { e.stopPropagation(); onEventClick?.(c, e.currentTarget.getBoundingClientRect()) }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 4,
                                background: 'rgba(127,119,221,0.18)', borderRadius: 3,
                                padding: '2px 5px', fontSize: 10.5, color: '#7F77DD',
                                whiteSpace: 'nowrap', overflow: 'hidden', lineHeight: '16px',
                                opacity: isPast ? 0.4 : 1,
                                cursor: 'pointer',
                              }}
                            >
                              {member && <MemberAvatar member={member} size={14} />}
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {c.time ? fmtTime(c.time) + ' · ' : ''}{c.name}
                              </span>
                            </div>
                          )
                        })}
                        {dayCons.length > 2 && (
                          <div style={{ fontSize: 10, color: 'var(--ink-3)', padding: '0 5px' }}>
                            +{dayCons.length - 2} more
                          </div>
                        )}
                      </div>
                    )}
                    {/* Meeting pills */}
                    {dayMeetings.length > 0 && (
                      <div style={{ padding: '2px 4px 4px', display: 'flex', flexDirection: 'column', gap: 2, position: 'relative', zIndex: 1 }}>
                        {dayMeetings.slice(0, 2).map(m => {
                          const member = m.assignee_id ? memberMap[m.assignee_id] : null
                          return (
                            <div
                              key={m.id}
                              onClick={e => { e.stopPropagation(); onEventClick?.(m, e.currentTarget.getBoundingClientRect()) }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 4,
                                background: 'rgba(29,158,117,0.18)', borderRadius: 3,
                                padding: '2px 5px', fontSize: 10.5, color: '#1D9E75',
                                whiteSpace: 'nowrap', overflow: 'hidden', lineHeight: '16px',
                                opacity: isPast ? 0.4 : 1,
                                cursor: 'pointer',
                              }}
                            >
                              {member && <MemberAvatar member={member} size={14} />}
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {m.time ? fmtTime(m.time) + ' · ' : ''}{m.title}
                              </span>
                            </div>
                          )
                        })}
                        {dayMeetings.length > 2 && (
                          <div style={{ fontSize: 10, color: 'var(--ink-3)', padding: '0 5px' }}>
                            +{dayMeetings.length - 2} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Spanning project bars */}
              {showTypes.projects && laidOut.map(p => {
                const chip = JOB_CHIP[p.job_type] || JOB_CHIP['Both']
                const member = p.assigned_to ? memberMap[p.assigned_to] : null
                const leftPct = (p.startCol / 7) * 100
                const widthPct = ((p.endCol - p.startCol + 1) / 7) * 100
                const topPx = DAY_NUM_H + p.lane * (BAR_H + BAR_GAP) + 2
                const projectEnd = p.project_end || p.project_start
                const isPast = projectEnd < todayStr

                return (
                  <div
                    key={`${p.id}-w${weekIdx}`}
                    onClick={e => { e.stopPropagation(); onProjectClick(p) }}
                    title={`${p.name} — ${p.job_type}`}
                    style={{
                      position: 'absolute',
                      top: topPx,
                      left: `calc(${leftPct}% + ${p.continuedFrom ? 0 : 2}px)`,
                      width: `calc(${widthPct}% - ${p.continuedFrom ? 0 : 2}px - ${p.continuesTo ? 0 : 2}px)`,
                      height: BAR_H,
                      background: chip.bg,
                      borderLeft: p.continuedFrom ? 'none' : `3px solid ${chip.accent}`,
                      borderRadius: p.continuedFrom
                        ? (p.continuesTo ? 0 : '0 4px 4px 0')
                        : (p.continuesTo ? '4px 0 0 4px' : 4),
                      display: 'flex', alignItems: 'center',
                      padding: '0 5px',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      zIndex: 3,
                      transition: 'filter 0.1s',
                      opacity: isPast ? 0.4 : 1,
                    }}
                    onMouseEnter={e => e.currentTarget.style.filter = 'brightness(0.92)'}
                    onMouseLeave={e => e.currentTarget.style.filter = 'none'}
                  >
                    {p.continuedFrom && (
                      <ChevronLeft size={11} color={chip.accent} style={{ flexShrink: 0, marginRight: 1 }} />
                    )}
                    <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: chip.accent, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name}{p.job_type ? ` — ${p.job_type}` : ''}
                    </span>
                    {!p.continuesTo && member && (
                      <MemberAvatar member={member} size={16} />
                    )}
                    {p.continuesTo && (
                      <ChevronRight size={11} color={chip.accent} style={{ flexShrink: 0, marginLeft: 2 }} />
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Week View ─────────────────────────────────────────────────

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7) // 7 AM – 8 PM

function WeekView({ projects, consults, meetings, viewDate, todayStr, memberMap, onProjectClick, onEventClick, showTypes }) {
  const weekStart = getWeekStart(viewDate)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })
  const weekDayStrs = weekDays.map(toDateStr)
  const rowStart = weekDayStrs[0]
  const rowEnd = weekDayStrs[6]

  const scheduled = projects.filter(p => p.project_start)
  const rowProjects = scheduled
    .filter(p => {
      const end = p.project_end || p.project_start
      return p.project_start <= rowEnd && end >= rowStart
    })
    .map(p => {
      const end = p.project_end || p.project_start
      return {
        ...p,
        startCol: p.project_start < rowStart ? 0 : weekDayStrs.indexOf(p.project_start),
        endCol: end > rowEnd ? 6 : weekDayStrs.indexOf(end),
        continuedFrom: p.project_start < rowStart,
        continuesTo: end > rowEnd,
      }
    })

  const laidOut = assignLanes(rowProjects)
  const numLanes = laidOut.length > 0 ? Math.max(...laidOut.map(p => p.lane)) + 1 : 0
  const allDayH = numLanes * (BAR_H + BAR_GAP) + 10

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Column headers */}
      <div style={{
        display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)',
        borderBottom: '1px solid var(--line)', flexShrink: 0, background: 'var(--panel)',
      }}>
        <div style={{ borderRight: '1px solid var(--line)' }} />
        {weekDays.map((date, col) => {
          const dayStr = weekDayStrs[col]
          const isToday = dayStr === todayStr
          const isWeekend = date.getDay() === 0 || date.getDay() === 6
          return (
            <div key={dayStr} style={{
              padding: '8px 0', textAlign: 'center',
              borderRight: col < 6 ? '1px solid var(--line)' : 'none',
              background: isToday ? 'rgba(59,130,246,0.06)' : 'transparent',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: isWeekend ? '#A50050' : 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {DAY_HEADERS[date.getDay()]}
              </div>
              <div style={isToday ? {
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 26, height: 26, borderRadius: '50%',
                background: '#A50050', color: '#fff', fontSize: 14, fontWeight: 800, marginTop: 2,
              } : { fontSize: 14, fontWeight: 500, color: 'var(--ink-2)', marginTop: 2 }}>
                {date.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* All-day project bars */}
      {showTypes.projects && numLanes > 0 && (
        <div style={{ position: 'relative', height: allDayH + 4, flexShrink: 0, borderBottom: '2px solid var(--line)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', height: '100%' }}>
            <div style={{ borderRight: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 9, color: 'var(--ink-3)', fontWeight: 700, textTransform: 'uppercase', writingMode: 'vertical-rl', letterSpacing: '0.5px' }}>ALL DAY</span>
            </div>
            {weekDays.map((_, col) => (
              <div key={col} style={{ borderRight: col < 6 ? '1px solid var(--line)' : 'none', height: '100%' }} />
            ))}
          </div>
          {laidOut.map(p => {
            const chip = JOB_CHIP[p.job_type] || JOB_CHIP['Both']
            const member = p.assigned_to ? memberMap[p.assigned_to] : null
            const colW = `(100% - 52px) / 7`
            const leftVal = `calc(52px + ${p.startCol} * ${colW} + ${p.continuedFrom ? 0 : 2}px)`
            const widthVal = `calc(${p.endCol - p.startCol + 1} * ${colW} - ${p.continuedFrom ? 0 : 2}px - ${p.continuesTo ? 0 : 2}px)`
            const topPx = p.lane * (BAR_H + BAR_GAP) + 4
            const projectEnd = p.project_end || p.project_start
            const isPast = projectEnd < todayStr

            return (
              <div
                key={p.id}
                onClick={() => onProjectClick(p)}
                style={{
                  position: 'absolute', top: topPx,
                  left: leftVal, width: widthVal,
                  height: BAR_H, background: chip.bg,
                  borderLeft: p.continuedFrom ? 'none' : `3px solid ${chip.accent}`,
                  borderRadius: p.continuedFrom ? (p.continuesTo ? 0 : '0 4px 4px 0') : (p.continuesTo ? '4px 0 0 4px' : 4),
                  display: 'flex', alignItems: 'center', padding: '0 5px',
                  cursor: 'pointer', overflow: 'hidden', zIndex: 3,
                  transition: 'filter 0.1s',
                  opacity: isPast ? 0.4 : 1,
                }}
                onMouseEnter={e => e.currentTarget.style.filter = 'brightness(0.92)'}
                onMouseLeave={e => e.currentTarget.style.filter = 'none'}
              >
                {p.continuedFrom && <ChevronLeft size={11} color={chip.accent} style={{ flexShrink: 0, marginRight: 1 }} />}
                <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: chip.accent, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.name}{p.job_type ? ` — ${p.job_type}` : ''}
                </span>
                {!p.continuesTo && member && <MemberAvatar member={member} size={16} />}
                {p.continuesTo && <ChevronRight size={11} color={chip.accent} style={{ flexShrink: 0, marginLeft: 2 }} />}
              </div>
            )
          })}
        </div>
      )}

      {/* Time grid */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {HOURS.map(hour => {
          const h12 = hour % 12 || 12
          const ampm = hour < 12 ? 'AM' : 'PM'
          const hourLabel = `${h12} ${ampm}`
          return (
            <div key={hour} style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', minHeight: 56, borderBottom: '1px solid var(--line)' }}>
              <div style={{ borderRight: '1px solid var(--line)', padding: '4px 7px 0', textAlign: 'right', flexShrink: 0 }}>
                <span style={{ fontSize: 10, color: 'var(--ink-3)', fontWeight: 600 }}>{hourLabel}</span>
              </div>
              {weekDays.map((date, col) => {
                const dayStr = weekDayStrs[col]
                const isToday = dayStr === todayStr
                const isWeekend = date.getDay() === 0 || date.getDay() === 6
                const isPast = dayStr < todayStr

                const hourConsults = showTypes.consults
                  ? consults.filter(c => c.date === dayStr && c.time && parseInt(c.time.split(':')[0]) === hour)
                  : []
                const hourMeetings = showTypes.meetings
                  ? meetings.filter(m => m.date === dayStr && m.time && parseInt(m.time.split(':')[0]) === hour)
                  : []

                return (
                  <div key={col} style={{
                    borderRight: col < 6 ? '1px solid var(--line)' : 'none',
                    background: isToday ? 'rgba(59,130,246,0.06)' : isWeekend ? 'var(--stripe)' : 'transparent',
                    padding: 3,
                  }}>
                    {hourConsults.map(c => {
                      const member = c.assigned_to ? memberMap[c.assigned_to] : null
                      return (
                        <div
                          key={c.id}
                          onClick={() => onEventClick?.(c, null)}
                          style={{
                            background: 'rgba(124,58,237,0.15)',
                            borderLeft: '3px solid #7c3aed',
                            borderRadius: '0 4px 4px 0',
                            padding: '3px 6px', fontSize: 11, color: '#a78bfa',
                            display: 'flex', alignItems: 'center', gap: 4,
                            marginBottom: 2, cursor: 'pointer',
                            opacity: isPast ? 0.4 : 1,
                          }}
                        >
                          {member && <MemberAvatar member={member} size={14} />}
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.time ? fmtTime(c.time) : ''} · {c.name}
                          </span>
                        </div>
                      )
                    })}
                    {hourMeetings.map(m => {
                      const member = m.assignee_id ? memberMap[m.assignee_id] : null
                      return (
                        <div
                          key={m.id}
                          onClick={() => onEventClick?.(m, null)}
                          style={{
                            background: 'rgba(29,158,117,0.15)',
                            borderLeft: '3px solid #1D9E75',
                            borderRadius: '0 4px 4px 0',
                            padding: '3px 6px', fontSize: 11, color: '#1D9E75',
                            display: 'flex', alignItems: 'center', gap: 4,
                            marginBottom: 2, cursor: 'pointer',
                            opacity: isPast ? 0.4 : 1,
                          }}
                        >
                          {member && <MemberAvatar member={member} size={14} />}
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.time ? fmtTime(m.time) : ''} · {m.title}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── List View ─────────────────────────────────────────────────

function ListView({ projects, memberMap, onProjectClick }) {
  const today = toDateStr(new Date())

  const events = []
  projects.forEach(p => {
    if (p.project_start) events.push({ type: 'project', date: p.project_start, project: p })
    if (p.consult_at) {
      const d = new Date(p.consult_at)
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      events.push({ type: 'consult', date: ds, project: p })
    }
  })
  events.sort((a, b) => a.date.localeCompare(b.date))

  const upcoming = events.filter(e => e.date >= today)
  const past = [...events.filter(e => e.date < today)].reverse()

  function EventRow({ event }) {
    const { project: p } = event
    const chip = JOB_CHIP[p.job_type] || JOB_CHIP['Both']
    const member = p.assigned_to ? memberMap[p.assigned_to] : null
    const isProject = event.type === 'project'

    return (
      <div
        onClick={() => isProject && onProjectClick(p)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '11px 24px', borderBottom: '1px solid var(--line)',
          cursor: isProject ? 'pointer' : 'default',
          transition: 'background 0.1s',
        }}
        onMouseEnter={e => { if (isProject) e.currentTarget.style.background = 'var(--stripe)' }}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{ width: 4, height: 36, borderRadius: 2, background: isProject ? chip.accent : '#7c3aed', flexShrink: 0 }} />
        <div style={{ minWidth: 76, flexShrink: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-1)' }}>
            {new Date(event.date + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' })}
          </div>
          <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', marginTop: 2 }}>
            {new Date(event.date + 'T00:00:00').toLocaleDateString([], { weekday: 'short' })}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {p.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
            {isProject
              ? `${p.job_type || 'Project'}${p.project_end ? ` · ends ${p.project_end}` : ''}`
              : `Consult · ${fmtConsultTime(p.consult_at)}`}
          </div>
        </div>
        <span style={{
          background: isProject ? chip.bg : 'rgba(124,58,237,0.15)',
          color: isProject ? chip.accent : '#7c3aed',
          borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 700, flexShrink: 0,
        }}>
          {isProject ? p.job_type : 'Consult'}
        </span>
        {member && <MemberAvatar member={member} size={26} />}
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)', fontSize: 14 }}>
        No scheduled projects or consults
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {upcoming.length > 0 && (
        <>
          <div style={{ padding: '10px 24px 8px', fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--line)' }}>
            Upcoming
          </div>
          {upcoming.map((e, i) => <EventRow key={`u-${i}`} event={e} />)}
        </>
      )}
      {past.length > 0 && (
        <>
          <div style={{ padding: '10px 24px 8px', fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--line)', marginTop: 8 }}>
            Past
          </div>
          {past.map((e, i) => <EventRow key={`p-${i}`} event={e} />)}
        </>
      )}
    </div>
  )
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
      const crew = p.crew_size || estimateCrew(p.square_footage, p.density, p.job_type)
      const dayNum = Math.round((new Date(dayStr) - new Date(p.project_start)) / 86400000) + 1
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
  { key: 'projects', label: 'Projects', url: 'https://homebase-crm.netlify.app/api/calendar.ics', color: '#A50050', desc: 'All-day blocks for scheduled jobs' },
  { key: 'consults', label: 'Consults', url: 'https://homebase-crm.netlify.app/api/consults.ics', color: '#7c3aed', desc: 'Timed consult appointments' },
]

function FeedRow({ feed }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(feed.url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: feed.color, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-1)' }}>{feed.label}</span>
        <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>— {feed.desc}</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input readOnly value={feed.url} style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: 'var(--ink-2)', outline: 'none', fontFamily: 'monospace' }} />
        <button onClick={copy} style={{ background: copied ? 'rgba(74,222,128,0.1)' : 'var(--panel)', border: `1px solid ${copied ? 'rgba(74,222,128,0.4)' : 'var(--line)'}`, borderRadius: 8, padding: '8px 13px', color: copied ? '#4ade80' : 'var(--ink-2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink-1)' }}>Subscribe to Team Calendar</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>Two live feeds — subscribe to both to see everything</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)' }}><X size={18} /></button>
        </div>
        <div style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Calendar Feed URLs</div>
          {FEEDS.map(f => <FeedRow key={f.key} feed={f} />)}
          <div style={{ height: 1, background: 'var(--line)', margin: '16px 0' }} />
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-1)', marginBottom: 10 }}>Google Calendar</div>
            {step(1, 'Open Google Calendar on desktop → click the + next to "Other calendars"')}
            {step(2, <>Select <strong style={{ color: 'var(--ink-1)' }}>From URL</strong>, paste each URL and click Add Calendar</>)}
            {step(3, 'Repeat for both feeds — you can pick a different color for each')}
          </div>
          <div style={{ height: 1, background: 'var(--line)', marginBottom: 16 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-1)', marginBottom: 10 }}>Apple Calendar</div>
            {step(1, <>Mac: <strong style={{ color: 'var(--ink-1)' }}>File → New Calendar Subscription</strong>, paste a URL</>)}
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

export default function Schedule() {
  const [projects, setProjects] = useState([])
  const [meetingsData, setMeetingsData] = useState([])
  const [calEventsData, setCalEventsData] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewDate, setViewDate] = useState(new Date())
  const [activeView, setActiveView] = useState('month')
  const [selectedProject, setSelectedProject] = useState(null)
  const [showNewMeeting, setShowNewMeeting] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [showSync, setShowSync] = useState(false)
  const [showTypes, setShowTypes] = useState({ projects: true, consults: true, meetings: true })
  const [quickAddDate, setQuickAddDate] = useState(null)
  const [popoverEvent, setPopoverEvent] = useState(null)
  const [popoverRect, setPopoverRect] = useState(null)
  const isMobile = useIsMobile()
  const { members } = useTeam()

  useEffect(() => { fetchProjects() }, [])

  async function fetchProjects() {
    setLoading(true)
    try {
      const [{ data: leadsData }, { data: meetingsRaw }, { data: calEventsRaw }] = await Promise.all([
        supabase.from('leads')
          .select('id,name,address,job_type,square_footage,density,project_start,project_end,crew_size,status,deal_score,consult_at,assigned_to,what_they_need,lead_source')
          .not('status', 'eq', 'Lost')
          .order('project_start', { ascending: true, nullsFirst: false }),
        supabase.from('meetings').select('*').order('date', { ascending: true }),
        supabase.from('calendar_events').select('*').order('event_date', { ascending: true }),
      ])

      setProjects((leadsData || []).map(p => ({
        ...p,
        project_start: p.project_start ? p.project_start.slice(0, 10) : null,
        project_end: p.project_end ? p.project_end.slice(0, 10) : null,
      })))
      setMeetingsData(meetingsRaw || [])
      setCalEventsData(calEventsRaw || [])
    } finally {
      setLoading(false)
    }
  }

  const todayStr = toDateStr(new Date())
  const memberMap = Object.fromEntries(members.map(m => [m.id, m]))
  const scheduledProjects = projects.filter(p => p.project_start)
  const unscheduled = projects.filter(p => !p.project_start && !p.consult_at)

  // ── Merged consults (deduplicated by lead_id) ─────────────────
  const mergedConsults = (() => {
    const fromLeads = projects
      .filter(p => p.consult_at)
      .map(p => {
        const d = new Date(p.consult_at)
        const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
        return { id: p.id, type: 'consult', date, time, name: p.name, address: p.address, assigned_to: p.assigned_to, lead_id: p.id }
      })

    const fromCalEvents = calEventsData
      .filter(ce => ce.event_type === 'consult')
      .map(ce => ({ id: ce.id, type: 'consult', date: ce.event_date, time: ce.event_time, name: ce.title, address: ce.address, assigned_to: ce.assigned_to, lead_id: ce.lead_id }))

    // Deduplicate: if calEvent has a lead_id matching a lead consult, prefer calEvent
    const calEventLeadIds = new Set(fromCalEvents.filter(c => c.lead_id).map(c => c.lead_id))
    const filteredLeadConsults = fromLeads.filter(c => !calEventLeadIds.has(c.lead_id))

    return [...filteredLeadConsults, ...fromCalEvents]
  })()

  // ── Merged meetings ───────────────────────────────────────────
  const mergedMeetings = (() => {
    const fromMeetings = meetingsData.map(m => ({
      id: m.id, type: 'meeting', date: m.date, time: m.time,
      title: m.title, address: m.address, assignee_id: m.assignee_id,
      notes: m.notes, purpose: m.purpose,
    }))
    const fromCalEvents = calEventsData
      .filter(ce => ce.event_type === 'meeting')
      .map(ce => ({
        id: ce.id, type: 'meeting', date: ce.event_date, time: ce.event_time,
        title: ce.title, address: ce.address, assignee_id: ce.assigned_to,
        notes: null, purpose: null,
      }))
    return [...fromMeetings, ...fromCalEvents]
  })()

  function prev() {
    if (activeView === 'week') setViewDate(d => new Date(d.getTime() - 7 * 86400000))
    else setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  }
  function next() {
    if (activeView === 'week') setViewDate(d => new Date(d.getTime() + 7 * 86400000))
    else setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  }
  function goToday() { setViewDate(new Date()) }

  function getLabel() {
    if (activeView === 'week') {
      const ws = getWeekStart(viewDate)
      const we = new Date(ws.getTime() + 6 * 86400000)
      if (ws.getMonth() === we.getMonth()) {
        return `${ws.toLocaleDateString([], { month: 'long', day: 'numeric' })} – ${we.getDate()}, ${we.getFullYear()}`
      }
      return `${ws.toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${we.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`
    }
    return viewDate.toLocaleDateString([], { month: 'long', year: 'numeric' })
  }

  const monthDays = getMonthGrid(viewDate.getFullYear(), viewDate.getMonth())
    .filter(d => d.getMonth() === viewDate.getMonth())
    .map(toDateStr)

  function handleProjectSave(updated) {
    setProjects(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p))
    setSelectedProject(null)
  }

  function handleEventClick(event, rect) {
    if (event.type === 'project') {
      setSelectedProject(event)
    } else {
      setPopoverEvent(event)
      setPopoverRect(rect)
    }
  }

  // Type toggle config
  const typeToggleConfig = [
    { key: 'projects', label: 'Projects', color: '#3b82f6' },
    { key: 'consults', label: 'Consults', color: '#7F77DD' },
    { key: 'meetings', label: 'Meetings', color: '#1D9E75' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ── Header ───────────────────────────────────────────── */}
      <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--line)', flexShrink: 0, background: 'var(--panel)' }}>
        {/* Row 1: title + nav + view toggle + actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          {/* Left: title + nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {!isMobile && (
              <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-1)', margin: 0, whiteSpace: 'nowrap' }}>
                Project Schedule
              </h1>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <button onClick={prev} style={navBtnStyle}><ChevronLeft size={15} /></button>
              <button onClick={goToday} style={{ ...navBtnStyle, padding: '5px 12px', fontSize: 12, fontWeight: 600 }}>Today</button>
              <button onClick={next} style={navBtnStyle}><ChevronRight size={15} /></button>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-1)', marginLeft: 8, whiteSpace: 'nowrap' }}>
                {getLabel()}
              </span>
            </div>
          </div>

          {/* Right: view toggle + actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* View toggle */}
            <div style={{ display: 'flex', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
              {[['month', 'Month'], ['week', 'Week'], ['list', 'List']].map(([v, label]) => (
                <button key={v} onClick={() => setActiveView(v)} style={{
                  background: activeView === v ? 'var(--panel)' : 'transparent',
                  border: 'none',
                  borderRight: v !== 'list' ? '1px solid var(--line)' : 'none',
                  padding: '6px 14px', fontSize: 12, fontWeight: 600,
                  color: activeView === v ? 'var(--ink-1)' : 'var(--ink-3)',
                  cursor: 'pointer',
                }}>
                  {label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowSync(true)}
              style={{ ...navBtnStyle, gap: 5, padding: '6px 12px' }}
            >
              <Rss size={13} />
              {!isMobile && <span style={{ fontSize: 12, fontWeight: 600 }}>Subscribe</span>}
            </button>

            <button
              onClick={() => setShowExport(true)}
              style={{ ...navBtnStyle, gap: 5, padding: '6px 12px' }}
            >
              <Download size={13} />
              {!isMobile && <span style={{ fontSize: 12, fontWeight: 600 }}>Export</span>}
            </button>

            <button
              onClick={() => setQuickAddDate('')}
              style={{ background: 'linear-gradient(135deg,#1D9E75,#16a34a)', border: 'none', borderRadius: 8, padding: '7px 14px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}
            >
              <Plus size={14} />
              {!isMobile && 'Add Event'}
            </button>

            <button
              onClick={() => setShowNewMeeting(true)}
              style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', border: 'none', borderRadius: 8, padding: '7px 14px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}
            >
              <Plus size={14} />
              {!isMobile && 'Meeting'}
            </button>
          </div>
        </div>

        {/* Row 2: event type toggles */}
        {activeView !== 'list' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
            {typeToggleConfig.map(({ key, label, color }) => {
              const active = showTypes[key]
              return (
                <button
                  key={key}
                  onClick={() => setShowTypes(prev => ({ ...prev, [key]: !prev[key] }))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: active ? `rgba(${color === '#3b82f6' ? '59,130,246' : color === '#7F77DD' ? '127,119,221' : '29,158,117'},0.15)` : 'transparent',
                    border: `1.5px solid ${active ? color : 'var(--line)'}`,
                    borderRadius: 20,
                    padding: '4px 12px',
                    color: active ? color : 'var(--ink-3)',
                    fontSize: 12, fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: active ? color : 'var(--ink-3)', flexShrink: 0 }} />
                  {label}
                </button>
              )
            })}
          </div>
        )}

        {unscheduled.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 7, padding: '7px 12px', marginTop: 10, fontSize: 12 }}>
            <AlertCircle size={13} color="#f59e0b" style={{ flexShrink: 0 }} />
            <span style={{ color: '#f59e0b', fontWeight: 600 }}>{unscheduled.length} project{unscheduled.length !== 1 ? 's' : ''} need dates:</span>
            <span style={{ color: 'var(--ink-2)' }}>{unscheduled.map(p => p.name).join(', ')}</span>
            <span style={{ color: 'var(--ink-3)' }}>— open the lead in Pipeline to set dates</span>
          </div>
        )}
      </div>

      {/* ── Calendar body ─────────────────────────────────────── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)', fontSize: 14 }}>
            Loading…
          </div>
        ) : activeView === 'month' ? (
          <MonthView
            projects={projects}
            consults={mergedConsults}
            meetings={mergedMeetings}
            viewDate={viewDate}
            todayStr={todayStr}
            memberMap={memberMap}
            onProjectClick={setSelectedProject}
            onEventClick={handleEventClick}
            onDayCellClick={setQuickAddDate}
            showTypes={showTypes}
          />
        ) : activeView === 'week' ? (
          <WeekView
            projects={projects}
            consults={mergedConsults}
            meetings={mergedMeetings}
            viewDate={viewDate}
            todayStr={todayStr}
            memberMap={memberMap}
            onProjectClick={setSelectedProject}
            onEventClick={handleEventClick}
            showTypes={showTypes}
          />
        ) : (
          <ListView projects={projects} memberMap={memberMap} onProjectClick={setSelectedProject} />
        )}
      </div>

      {/* ── Legend ───────────────────────────────────────────── */}
      {activeView !== 'list' && (
        <div style={{ padding: '8px 24px', borderTop: '1px solid var(--line)', display: 'flex', gap: 16, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7F77DD' }} />
            <span style={{ fontSize: 11, color: 'var(--ink-2)' }}>Consult</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1D9E75' }} />
            <span style={{ fontSize: 11, color: 'var(--ink-2)' }}>Meeting</span>
          </div>
          <div style={{ width: 1, height: 12, background: 'var(--line)' }} />
          {Object.entries(JOB_CHIP).map(([type, { accent }]) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: accent }} />
              <span style={{ fontSize: 11, color: 'var(--ink-2)' }}>{type}</span>
            </div>
          ))}
          <span style={{ fontSize: 11, color: 'var(--ink-3)', marginLeft: 'auto' }}>
            {scheduledProjects.length} project{scheduledProjects.length !== 1 ? 's' : ''} · {mergedConsults.length} consult{mergedConsults.length !== 1 ? 's' : ''} · {mergedMeetings.length} meeting{mergedMeetings.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* ── Overlays ──────────────────────────────────────────── */}
      {selectedProject && (
        <ProjectEditPanel
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onSave={handleProjectSave}
        />
      )}
      {showNewMeeting && (
        <NewMeetingModal onClose={() => setShowNewMeeting(false)} onSave={() => { setShowNewMeeting(false); fetchProjects() }} />
      )}
      {showExport && (
        <ExportModal projects={scheduledProjects} days={monthDays} onClose={() => setShowExport(false)} />
      )}
      {showSync && (
        <CalendarSyncModal onClose={() => setShowSync(false)} />
      )}
      {quickAddDate !== null && (
        <QuickAddEventModal
          initialDate={quickAddDate}
          leads={projects}
          members={members}
          onClose={() => setQuickAddDate(null)}
          onSaved={() => { setQuickAddDate(null); fetchProjects() }}
        />
      )}
      {popoverEvent && (
        <EventPopover
          event={popoverEvent}
          anchorRect={popoverRect}
          memberMap={memberMap}
          onClose={() => { setPopoverEvent(null); setPopoverRect(null) }}
        />
      )}
    </div>
  )
}
