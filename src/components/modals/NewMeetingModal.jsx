import { useState, useEffect } from 'react'
import { X, CalendarDays } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import logger from '../../lib/logger'

const fieldBase = {
  width: '100%', boxSizing: 'border-box',
  padding: '8px 11px', borderRadius: 9,
  border: '1px solid var(--line)',
  background: 'var(--panel)',
  fontSize: 12.5, fontFamily: 'inherit',
  color: 'var(--ink-1)', outline: 'none',
}

function Field({ label, required, help, span = 1, children }) {
  return (
    <div style={{ gridColumn: `span ${span}` }}>
      <label style={{ display: 'flex', alignItems: 'baseline', gap: 5, fontSize: 11.5, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }}>
        {label}
        {required && <span style={{ color: 'var(--lose, #C84A4A)', fontSize: 10 }}>*</span>}
        {help && <span style={{ fontSize: 10.5, color: 'var(--ink-4)', fontWeight: 400, marginLeft: 'auto' }}>{help}</span>}
      </label>
      {children}
    </div>
  )
}

function TextInput({ style, ...props }) {
  const [focused, setFocused] = useState(false)
  return (
    <input {...props}
      style={{ ...fieldBase, borderColor: focused ? 'var(--accent)' : 'var(--line)', boxShadow: focused ? '0 0 0 3px var(--accent-soft)' : 'none', ...style }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  )
}

function Segmented({ value, onChange, options }) {
  return (
    <div style={{ display: 'inline-flex', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 9, padding: 2, width: '100%' }}>
      {options.map(o => {
        const val = o.value || o
        const label = o.label || o
        const active = value === val
        return (
          <button key={val} type="button" onClick={() => onChange(val)} style={{
            flex: 1, padding: '6px 10px', borderRadius: 7, border: 'none', cursor: 'pointer',
            background: active ? 'var(--panel)' : 'transparent',
            color: active ? 'var(--ink-1)' : 'var(--ink-3)',
            fontWeight: active ? 600 : 500, fontSize: 12, fontFamily: 'inherit',
            boxShadow: active ? 'var(--shadow-1)' : 'none',
            transition: 'all 120ms',
          }}>{label}</button>
        )
      })}
    </div>
  )
}

function SelField({ options, value, onChange }) {
  return (
    <select value={value} onChange={onChange} style={{ ...fieldBase, appearance: 'none', cursor: 'pointer' }}>
      {options.map(o => {
        const val = o.value || o
        const label = o.label || o
        return <option key={val} value={val}>{label}</option>
      })}
    </select>
  )
}

export default function NewMeetingModal({ onClose, onSave }) {
  const [employees, setEmployees] = useState([])
  const [form, setForm] = useState({
    type: 'consult', title: '', contact: '', date: '', time: '10:00',
    duration: '60', location: 'onsite', address: '', owner: '', notes: '',
    sendInvite: true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const valid = form.title && form.date && form.time && !saving

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Load real active employees for the assignee dropdown.
  useEffect(() => {
    let cancelled = false
    supabase.from('employees').select('id, name').eq('active', true).order('name')
      .then(({ data, error: empErr }) => {
        if (cancelled) return
        if (empErr) {
          logger.error('NewMeetingModal load employees failed', empErr)
          return
        }
        const list = data || []
        setEmployees(list)
        if (list.length > 0 && !form.owner) {
          setForm(f => ({ ...f, owner: list[0].id }))
        }
      })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async () => {
    if (!valid) return
    setSaving(true)
    setError(null)
    try {
      const eventType = form.type === 'consult' ? 'consult' : 'meeting'
      const { error: insErr } = await supabase.from('calendar_events').insert({
        title:       form.title.trim(),
        event_type:  eventType,
        event_date:  form.date,
        event_time:  form.time || null,
        address:     form.location === 'onsite' ? (form.address || null) : null,
        notes:       form.notes || null,
        assigned_to: form.owner || null,
      })
      if (insErr) {
        logger.error('NewMeetingModal insert failed', insErr)
        setError(insErr.message)
        setSaving(false)
        return
      }
      onSave && onSave(form)
      onClose()
    } catch (e) {
      logger.error('NewMeetingModal threw', e)
      setError(e?.message || 'Failed to save meeting.')
      setSaving(false)
    }
  }

  const btnPrimary = {
    padding: '8px 16px', borderRadius: 9, border: 'none',
    background: 'var(--accent)', color: 'white',
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
    opacity: valid ? 1 : 0.5, pointerEvents: valid ? 'auto' : 'none',
  }
  const btnGhost = {
    padding: '8px 16px', borderRadius: 9, border: '1px solid var(--line)',
    background: 'var(--panel)', color: 'var(--ink-2)',
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20,22,26,0.24)', zIndex: 50 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 'min(620px, 94vw)', maxHeight: '90vh',
        background: 'var(--panel)', borderRadius: 16, zIndex: 51,
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 70px rgba(20,22,26,0.28)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--accent-soft)', color: 'var(--accent-ink)', display: 'grid', placeItems: 'center', marginRight: 12 }}>
            <CalendarDays size={17} strokeWidth={1.8} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>New Meeting</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 1 }}>Schedule a consult, walkthrough, or internal meeting</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--panel)', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--ink-2)' }}>
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
          <Field label="Meeting type" required>
            <Segmented value={form.type} onChange={v => set('type', v)} options={[
              { value: 'consult', label: 'Consult' },
              { value: 'walkthrough', label: 'Walkthrough' },
              { value: 'internal', label: 'Internal' },
              { value: 'other', label: 'Other' },
            ]} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14, marginTop: 14 }}>
            <Field label="Title" required>
              <TextInput placeholder="e.g. Meeting with Patsy at MorningStar" value={form.title} onChange={e => set('title', e.target.value)} />
            </Field>
            <Field label="Assigned to" required>
              <SelField
                value={form.owner}
                onChange={e => set('owner', e.target.value)}
                options={
                  employees.length > 0
                    ? employees.map(e => ({ value: e.id, label: e.name }))
                    : [{ value: '', label: 'No employees yet' }]
                }
              />
            </Field>
          </div>

          <div style={{ marginTop: 14 }}>
            <Field label="Linked contact / lead" help="Optional">
              <TextInput placeholder="Search contacts or leads…" value={form.contact} onChange={e => set('contact', e.target.value)} />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginTop: 14 }}>
            <Field label="Date" required>
              <TextInput type="date" value={form.date} onChange={e => set('date', e.target.value)} />
            </Field>
            <Field label="Time" required>
              <TextInput type="time" value={form.time} onChange={e => set('time', e.target.value)} />
            </Field>
            <Field label="Duration">
              <SelField value={form.duration} onChange={e => set('duration', e.target.value)} options={[
                { value: '30', label: '30 min' },
                { value: '45', label: '45 min' },
                { value: '60', label: '1 hour' },
                { value: '90', label: '1.5 hours' },
                { value: '120', label: '2 hours' },
              ]} />
            </Field>
          </div>

          <div style={{ marginTop: 14 }}>
            <Field label="Location">
              <Segmented value={form.location} onChange={v => set('location', v)} options={[
                { value: 'onsite', label: 'On-site' },
                { value: 'office', label: 'Our office' },
                { value: 'phone', label: 'Phone' },
                { value: 'video', label: 'Video call' },
              ]} />
            </Field>
          </div>

          {form.location === 'onsite' && (
            <div style={{ marginTop: 14 }}>
              <Field label="Address">
                <TextInput placeholder="123 Main St, City, State ZIP" value={form.address} onChange={e => set('address', e.target.value)} />
              </Field>
            </div>
          )}

          <div style={{ marginTop: 14 }}>
            <Field label="Notes" help="Optional">
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Anything the team should know before the meeting…"
                style={{ ...fieldBase, minHeight: 68, resize: 'vertical' }} />
            </Field>
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid var(--line)', background: 'var(--bg-2)' }}>
          {error && (
            <div style={{ padding: '8px 20px 0', fontSize: 12, color: 'var(--lose)' }}>{error}</div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-3)', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.sendInvite} onChange={e => set('sendInvite', e.target.checked)} />
              Send calendar invite
            </label>
            <div style={{ flex: 1 }} />
            <button style={btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
            <button style={btnPrimary} onClick={handleSave}>{saving ? 'Saving…' : 'Schedule Meeting'}</button>
          </div>
        </div>
      </div>
    </>
  )
}
