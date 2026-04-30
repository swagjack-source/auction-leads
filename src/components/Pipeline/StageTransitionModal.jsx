import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useTeam } from '../../lib/TeamContext'
import logger from '../../lib/logger'

export function needsTransitionPrompt(toStage) {
  return ['Contacted', 'Consult Scheduled', 'Consult Completed', 'Lost', 'Backlog'].includes(toStage)
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDateLabel(date) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function prependNote(existing, note) {
  const today = formatDateLabel(new Date())
  const line = `[${today}] ${note.trim()}`
  return existing ? `${line}\n${existing}` : line
}

// ── Sub-panels ─────────────────────────────────────────────────────────────

function ContactedPanel({ lead, onConfirm, onSkip }) {
  const [note, setNote] = useState('')

  function handleSave() {
    const combined = prependNote(lead.notes || '', note)
    onConfirm({ notes: combined })
  }

  return (
    <>
      <p style={labelStyle}>Add a note about the call</p>
      <textarea
        autoFocus
        placeholder="Add a note about the call..."
        value={note}
        onChange={e => setNote(e.target.value)}
        style={textareaStyle}
        rows={4}
      />
      <div style={footerStyle}>
        <button onClick={onSkip} style={ghostBtn}>Skip</button>
        <button onClick={handleSave} disabled={!note.trim()} style={note.trim() ? accentBtn : disabledBtn}>
          Save &amp; Move
        </button>
      </div>
    </>
  )
}

function ConsultScheduledPanel({ lead, onConfirm, onCancel }) {
  const { members } = useTeam()
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [address, setAddress] = useState(lead.address || '')
  const [employees, setEmployees] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase
      .from('employees')
      .select('id, name')
      .eq('active', true)
      .then(({ data }) => {
        if (data && data.length > 0) setEmployees(data)
        else setEmployees(members.map(m => ({ id: m.id, name: m.name })))
      })
      .catch(() => {
        setEmployees(members.map(m => ({ id: m.id, name: m.name })))
      })
  }, [members])

  async function handleSchedule() {
    if (!date || !time || !assignedTo) {
      setError('Date, time, and assigned team member are required.')
      return
    }
    setError('')
    setSaving(true)
    try {
      const { error: calErr } = await supabase.from('calendar_events').insert({
        title: `Consult: ${lead.name}`,
        event_date: date,
        event_time: time,
        event_type: 'consult',
        address,
        assigned_to: assignedTo,
        lead_id: lead.id,
      })
      if (calErr) {
        logger.error('Consult calendar_events insert failed', calErr)
        setError(`Could not save calendar event: ${calErr.message}`)
        setSaving(false)
        return
      }
      onConfirm({
        consult_at: `${date}T${time}:00`,
        assigned_to: assignedTo,
        address,
      })
    } catch (e) {
      logger.error('Consult schedule threw', e)
      setError(e?.message || 'Failed to schedule consult.')
      setSaving(false)
    }
  }

  return (
    <>
      {error && <p style={errorStyle}>{error}</p>}
      <div style={fieldRow}>
        <div style={fieldGroup}>
          <label style={fieldLabel}>Date <span style={req}>*</span></label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
        </div>
        <div style={fieldGroup}>
          <label style={fieldLabel}>Time <span style={req}>*</span></label>
          <input type="time" value={time} onChange={e => setTime(e.target.value)} style={inputStyle} />
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <label style={fieldLabel}>Assigned To <span style={req}>*</span></label>
        <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} style={inputStyle}>
          <option value="">Select team member…</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>{emp.name}</option>
          ))}
        </select>
      </div>
      <div style={{ marginTop: 12 }}>
        <label style={fieldLabel}>Address</label>
        <input
          type="text"
          value={address}
          onChange={e => setAddress(e.target.value)}
          style={inputStyle}
          placeholder="Job site address"
        />
      </div>
      <div style={footerStyle}>
        <button onClick={onCancel} style={ghostBtn} disabled={saving}>Cancel</button>
        <button onClick={handleSchedule} disabled={saving} style={saving ? { ...accentBtn, opacity: 0.6 } : accentBtn}>
          {saving ? 'Scheduling…' : 'Schedule'}
        </button>
      </div>
    </>
  )
}

function ConsultCompletedPanel({ lead, onConfirm, onSkip, onOpenScorer }) {
  function handleOpenScorer() {
    onConfirm({})
    onOpenScorer(lead)
  }

  return (
    <>
      <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.5, margin: '4px 0 20px' }}>
        Would you like to run the Deal Scorer for <strong>{lead.name}</strong>?
      </p>
      <div style={footerStyle}>
        <button onClick={onSkip} style={ghostBtn}>Score Later</button>
        <button onClick={handleOpenScorer} style={accentBtn}>Open Deal Scorer</button>
      </div>
    </>
  )
}

const LOSS_REASONS = [
  'Declined Estimate',
  'Went With Competitor',
  'Not Ready Yet',
  'No Response',
  'Price Too High',
  'Other',
]

function LostPanel({ lead, onConfirm, onCancel }) {
  const [selected, setSelected] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  function handleMark() {
    if (!selected) {
      setError('Please select a reason.')
      return
    }
    setError('')
    const finalReason = selected === 'Other' ? customReason.trim() || 'Other' : selected
    const updates = { loss_reason: finalReason }
    if (note.trim()) updates.notes = prependNote(lead.notes || '', note)
    onConfirm(updates)
  }

  return (
    <>
      {error && <p style={errorStyle}>{error}</p>}
      <p style={labelStyle}>Reason</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {LOSS_REASONS.map(r => {
          const active = selected === r
          return (
            <button
              key={r}
              onClick={() => setSelected(r)}
              style={{
                padding: '5px 12px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: active ? 600 : 400,
                border: `1px solid ${active ? 'var(--lose)' : 'var(--line)'}`,
                background: active ? 'color-mix(in oklab, var(--lose) 14%, var(--panel))' : 'var(--bg-2)',
                color: active ? 'var(--lose)' : 'var(--ink-2)',
                cursor: 'pointer',
                transition: 'all 100ms',
              }}
            >
              {r}
            </button>
          )
        })}
      </div>
      {selected === 'Other' && (
        <input
          type="text"
          placeholder="Describe reason…"
          value={customReason}
          onChange={e => setCustomReason(e.target.value)}
          style={{ ...inputStyle, marginBottom: 12 }}
          autoFocus
        />
      )}
      <textarea
        placeholder="Any additional notes? (optional)"
        value={note}
        onChange={e => setNote(e.target.value)}
        style={textareaStyle}
        rows={3}
      />
      <div style={footerStyle}>
        <button onClick={onCancel} style={ghostBtn}>Cancel</button>
        <button onClick={handleMark} style={{ ...accentBtn, background: 'var(--lose)', color: '#fff' }}>
          Mark as Lost
        </button>
      </div>
    </>
  )
}

function BacklogPanel({ lead, onConfirm, onSkip }) {
  const [followUpDate, setFollowUpDate] = useState('')
  const [note, setNote] = useState('')

  function handleSave() {
    const updates = { follow_up_date: followUpDate || null }
    if (note.trim()) updates.notes = prependNote(lead.notes || '', note)
    onConfirm(updates)
  }

  return (
    <>
      <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.5, margin: '0 0 16px' }}>
        When should we follow up?
      </p>
      <div style={{ marginBottom: 12 }}>
        <label style={fieldLabel}>Follow-up Date</label>
        <input
          type="date"
          value={followUpDate}
          onChange={e => setFollowUpDate(e.target.value)}
          style={inputStyle}
        />
      </div>
      <textarea
        placeholder="Why is this on hold? (optional)"
        value={note}
        onChange={e => setNote(e.target.value)}
        style={textareaStyle}
        rows={3}
      />
      <div style={footerStyle}>
        <button onClick={onSkip} style={ghostBtn}>Skip</button>
        <button onClick={handleSave} style={accentBtn}>Save &amp; Move</button>
      </div>
    </>
  )
}

// ── Title map ──────────────────────────────────────────────────────────────

const TITLES = {
  'Contacted':         'Log your contact attempt',
  'Consult Scheduled': 'Schedule the consult',
  'Consult Completed': 'Consult complete — ready to score?',
  'Lost':              'Why was this lead lost?',
  'Backlog':           'Add to backlog',
}

// ── Main component ─────────────────────────────────────────────────────────

export default function StageTransitionModal({ lead, toStage, onConfirm, onSkip, onCancel, onOpenScorer }) {
  const overlayRef = useRef(null)

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onCancel()
  }

  function renderBody() {
    switch (toStage) {
      case 'Contacted':
        return <ContactedPanel lead={lead} onConfirm={onConfirm} onSkip={onSkip} />
      case 'Consult Scheduled':
        return <ConsultScheduledPanel lead={lead} onConfirm={onConfirm} onCancel={onCancel} />
      case 'Consult Completed':
        return <ConsultCompletedPanel lead={lead} onConfirm={onConfirm} onSkip={onSkip} onOpenScorer={onOpenScorer} />
      case 'Lost':
        return <LostPanel lead={lead} onConfirm={onConfirm} onCancel={onCancel} />
      case 'Backlog':
        return <BacklogPanel lead={lead} onConfirm={onConfirm} onSkip={onSkip} />
      default:
        return null
    }
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: 'var(--overlay)',
        display: 'grid', placeItems: 'center',
      }}
    >
      <div style={{
        position: 'relative', zIndex: 9999,
        background: 'var(--panel)',
        border: '1px solid var(--line)',
        borderRadius: 16,
        boxShadow: 'var(--shadow-lg)',
        width: '100%', maxWidth: 460,
        margin: '0 16px',
        padding: '20px 20px 0',
        animation: 'popin 160ms cubic-bezier(0.175,0.885,0.32,1.275)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ flex: 1, margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--ink-1)' }}>
            {TITLES[toStage] || toStage}
          </h2>
          <button onClick={onCancel} style={closeBtn}>
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div style={{ paddingBottom: 20 }}>
          {renderBody()}
        </div>
      </div>
    </div>
  )
}

// ── Shared styles ──────────────────────────────────────────────────────────

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '8px 10px',
  fontSize: 13, color: 'var(--ink-1)',
  background: 'var(--bg)',
  border: '1px solid var(--line-2)',
  borderRadius: 8,
  outline: 'none',
}

const textareaStyle = {
  ...inputStyle,
  display: 'block',
  resize: 'vertical',
  fontFamily: 'inherit',
  lineHeight: 1.5,
}

const footerStyle = {
  display: 'flex', justifyContent: 'flex-end', gap: 8,
  marginTop: 16,
}

const ghostBtn = {
  padding: '7px 16px', borderRadius: 8,
  fontSize: 13, fontWeight: 500,
  background: 'transparent',
  border: '1px solid var(--line-2)',
  color: 'var(--ink-2)',
  cursor: 'pointer',
}

const accentBtn = {
  padding: '7px 16px', borderRadius: 8,
  fontSize: 13, fontWeight: 600,
  background: 'var(--accent)',
  border: 'none',
  color: '#FFFFFF',
  cursor: 'pointer',
}

const disabledBtn = {
  ...accentBtn,
  opacity: 0.4,
  cursor: 'not-allowed',
}

const closeBtn = {
  width: 28, height: 28, borderRadius: 7,
  border: 'none', background: 'transparent',
  display: 'grid', placeItems: 'center',
  color: 'var(--ink-3)', cursor: 'pointer',
  flexShrink: 0,
}

const fieldLabel = {
  display: 'block',
  fontSize: 11.5, fontWeight: 600,
  color: 'var(--ink-3)',
  marginBottom: 4,
  letterSpacing: '0.02em',
}

const fieldRow = {
  display: 'flex', gap: 10,
}

const fieldGroup = {
  flex: 1,
}

const req = {
  color: 'var(--lose)',
}

const errorStyle = {
  fontSize: 12, color: 'var(--lose)',
  background: 'color-mix(in oklab, var(--lose) 10%, var(--panel))',
  border: '1px solid color-mix(in oklab, var(--lose) 20%, var(--line))',
  borderRadius: 7, padding: '6px 10px',
  marginBottom: 10,
}

const labelStyle = {
  fontSize: 12, fontWeight: 600, color: 'var(--ink-3)',
  marginBottom: 6, marginTop: 0,
}
