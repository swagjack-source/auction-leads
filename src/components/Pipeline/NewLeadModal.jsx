import { useState, useEffect, useRef } from 'react'
import { X, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useTeam } from '../../lib/TeamContext'
import logger from '../../lib/logger'
import { formatPhone, validatePhone, validateEmail } from '../../lib/validate'

const JOB_TYPES = ['Clean Out', 'Auction', 'Both', 'Move', 'Sorting/Organizing', 'Unknown']
const LEAD_SOURCES = ['Phone Call', 'Email', 'Referral', 'Maximum', 'Website', 'Walk-in', 'Other']

export default function NewLeadModal({ initialStage, onClose, onSave, onCreated }) {
  const { members } = useTeam()
  const nameRef = useRef(null)
  const overlayRef = useRef(null)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [zip, setZip] = useState('')
  const [notes, setNotes] = useState('')
  const [leadSource, setLeadSource] = useState('')
  const [jobType, setJobType] = useState('Unknown')
  const [assignedTo, setAssignedTo] = useState('')
  const [employees, setEmployees] = useState([])
  const [expanded, setExpanded] = useState(false)
  const [nameError, setNameError] = useState(false)
  const [phoneError, setPhoneError] = useState(null)
  const [emailError, setEmailError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

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

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose()
  }

  function handlePhoneBlur() {
    const formatted = formatPhone(phone)
    setPhone(formatted)
    setPhoneError(validatePhone(formatted))
  }

  function handleEmailBlur() {
    setEmailError(validateEmail(email))
  }

  function handlePhoneKeyDown(e) {
    if (e.key === 'Enter' && name.trim()) handleSubmit()
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setNameError(true)
      nameRef.current?.focus()
      return
    }
    // Phone/email are optional, but if filled they must validate.
    const pErr = validatePhone(phone)
    const eErr = validateEmail(email)
    if (pErr) { setPhoneError(pErr); return }
    if (eErr) { setEmailError(eErr); return }
    setNameError(false)
    setPhoneError(null)
    setEmailError(null)
    setSubmitError(null)
    setSaving(true)
    try {
      const leadData = {
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        zip_code: zip.trim() || null,
        notes: notes.trim() || null,
        lead_source: leadSource || null,
        job_type: jobType || 'Unknown',
        assigned_to: assignedTo || null,
        status: initialStage || 'New Lead',
      }
      const result = await onSave(leadData)
      if (result) onCreated?.(result)
      onClose()
    } catch (err) {
      logger.error('Create lead failed', err)
      setSubmitError(err?.message || 'Failed to create lead. Please try again.')
    } finally {
      setSaving(false)
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
        width: '100%', maxWidth: 400,
        margin: '0 16px',
        animation: 'popin 160ms cubic-bezier(0.175,0.885,0.32,1.275)',
        display: 'flex', flexDirection: 'column',
        maxHeight: 'calc(100vh - 48px)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '18px 20px 14px',
          borderBottom: '1px solid var(--line)',
          flexShrink: 0,
        }}>
          <h2 style={{ flex: 1, margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--ink-1)' }}>
            New Lead
          </h2>
          <button onClick={onClose} style={closeBtn}>
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
          {/* Name */}
          <div style={{ marginBottom: 12 }}>
            <label style={fieldLabel}>Name <span style={req}>*</span></label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); if (nameError) setNameError(false) }}
              placeholder="Client name"
              style={{ ...inputStyle, borderColor: nameError ? 'var(--lose)' : undefined }}
            />
            {nameError && <p style={inlineError}>Name is required.</p>}
          </div>

          {/* Phone */}
          <div style={{ marginBottom: 12 }}>
            <label style={fieldLabel}>Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={e => { setPhone(formatPhone(e.target.value)); if (phoneError) setPhoneError(null) }}
              onBlur={handlePhoneBlur}
              onKeyDown={handlePhoneKeyDown}
              placeholder="(555) 000-0000"
              style={{ ...inputStyle, borderColor: phoneError ? 'var(--lose)' : undefined }}
            />
            {phoneError && <p style={inlineError}>{phoneError}</p>}
          </div>

          {/* More Details collapsible */}
          <button
            onClick={() => setExpanded(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              width: '100%', padding: '6px 0',
              background: 'transparent', border: 'none',
              cursor: 'pointer',
              fontSize: 12.5, fontWeight: 600, color: 'var(--ink-3)',
              textAlign: 'left',
              marginBottom: expanded ? 12 : 0,
            }}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            More Details
          </button>

          {expanded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Email */}
              <div>
                <label style={fieldLabel}>Email</label>
                <input type="email" value={email}
                  onChange={e => { setEmail(e.target.value); if (emailError) setEmailError(null) }}
                  onBlur={handleEmailBlur}
                  placeholder="client@example.com"
                  style={{ ...inputStyle, borderColor: emailError ? 'var(--lose)' : undefined }} />
                {emailError && <p style={inlineError}>{emailError}</p>}
              </div>

              {/* Address */}
              <div>
                <label style={fieldLabel}>Address</label>
                <input type="text" value={address} onChange={e => setAddress(e.target.value)}
                  placeholder="123 Main St, Anytown" style={inputStyle} />
              </div>

              {/* ZIP */}
              <div>
                <label style={fieldLabel}>ZIP Code</label>
                <input type="text" value={zip} onChange={e => setZip(e.target.value)}
                  placeholder="06000" style={inputStyle} />
              </div>

              {/* Notes */}
              <div>
                <label style={fieldLabel}>What They Need</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Describe the job…"
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
                />
              </div>

              {/* Lead Source */}
              <div>
                <label style={fieldLabel}>Lead Source</label>
                <select value={leadSource} onChange={e => setLeadSource(e.target.value)} style={inputStyle}>
                  <option value="">Select source…</option>
                  {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Job Type */}
              <div>
                <label style={fieldLabel}>Job Type</label>
                <select value={jobType} onChange={e => setJobType(e.target.value)} style={inputStyle}>
                  {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Assigned To */}
              <div>
                <label style={fieldLabel}>Assigned To</label>
                <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} style={inputStyle}>
                  <option value="">Unassigned</option>
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          flexShrink: 0,
          borderTop: '1px solid var(--line)',
        }}>
          {submitError && (
            <div style={{
              margin: '12px 20px 0',
              padding: '8px 12px',
              fontSize: 12.5,
              color: 'var(--lose)',
              background: 'var(--lose-soft)',
              border: '1px solid color-mix(in oklab, var(--lose) 20%, var(--line))',
              borderRadius: 8,
            }}>
              {submitError}
            </div>
          )}
          <div style={{
            display: 'flex', justifyContent: 'flex-end', gap: 8,
            padding: '12px 20px 16px',
          }}>
            <button onClick={onClose} style={ghostBtn}>Cancel</button>
            <button onClick={handleSubmit} disabled={saving} style={saving ? { ...accentBtn, opacity: 0.6 } : accentBtn}>
              {saving ? 'Creating…' : 'Create Lead'}
            </button>
          </div>
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
  fontFamily: 'inherit',
}

const fieldLabel = {
  display: 'block',
  fontSize: 11.5, fontWeight: 600,
  color: 'var(--ink-3)',
  marginBottom: 4,
  letterSpacing: '0.02em',
}

const req = { color: 'var(--lose)' }

const inlineError = {
  fontSize: 11.5, color: 'var(--lose)',
  margin: '4px 0 0',
}

const closeBtn = {
  width: 28, height: 28, borderRadius: 7,
  border: 'none', background: 'transparent',
  display: 'grid', placeItems: 'center',
  color: 'var(--ink-3)', cursor: 'pointer',
  flexShrink: 0,
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
  padding: '7px 18px', borderRadius: 8,
  fontSize: 13, fontWeight: 600,
  background: 'var(--accent)',
  border: 'none',
  color: '#FFFFFF',
  cursor: 'pointer',
}
