import { useState, useEffect } from 'react'
import { X, ArrowRight, ExternalLink, Download } from 'lucide-react'
import ScoreBadge from './ScoreBadge'
import { PIPELINE_STAGES } from '../../data/mockLeads'
import { calculateDeal } from '../../lib/scoring'
import { useTeam } from '../../lib/TeamContext'

function fmtUTC(d) { return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z' }

function googleCalUrl(lead, memberName) {
  const start = new Date(lead.consult_at)
  const end   = new Date(start.getTime() + 3600000)
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text:   `Consult: ${lead.name}`,
    dates:  `${fmtUTC(start)}/${fmtUTC(end)}`,
    details: [memberName && `Assigned to: ${memberName}`, lead.address && `Address: ${lead.address}`, lead.phone && `Phone: ${lead.phone}`].filter(Boolean).join('\n'),
    location: lead.address || '',
  })
  return `https://calendar.google.com/calendar/render?${p}`
}

function downloadICS(lead, memberName) {
  const start = new Date(lead.consult_at)
  const end   = new Date(start.getTime() + 3600000)
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'CALSCALE:GREGORIAN', 'PRODID:-//AuctionCRM//EN',
    'BEGIN:VEVENT',
    `UID:${lead.id}@auctioncrm`,
    `DTSTART:${fmtUTC(start)}`, `DTEND:${fmtUTC(end)}`,
    `SUMMARY:Consult: ${lead.name}`,
    `DESCRIPTION:${[memberName && `Assigned to: ${memberName}`, lead.address, lead.phone].filter(Boolean).join('\\n')}`,
    `LOCATION:${lead.address || ''}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })), download: `consult-${lead.name.replace(/\s+/g, '-')}.ics` })
  a.click()
}

const DENSITY_OPTIONS = ['Low', 'Medium', 'High']
const JOB_TYPE_OPTIONS = ['Clean Out', 'Auction', 'Both']

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555b75', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%',
  background: '#0f1117',
  border: '1px solid #2a2f45',
  borderRadius: 7,
  padding: '8px 11px',
  fontSize: 13,
  color: '#f0f2ff',
  outline: 'none',
}

const selectStyle = {
  ...inputStyle,
  cursor: 'pointer',
}

export default function LeadModal({ lead, isNew, onClose, onSave }) {
  const [form, setForm] = useState({ ...lead })
  const [score, setScore] = useState(lead._scoreDetails || null)
  const [saving, setSaving] = useState(false)
  const { members } = useTeam()

  // Convert DB ISO string to datetime-local input value
  const toInputDT = v => v ? new Date(v).toLocaleString('sv').slice(0, 16).replace(' ', 'T') : ''

  useEffect(() => {
    if (form.square_footage && form.density && form.item_quality_score && form.job_type) {
      const result = calculateDeal({
        sqft: Number(form.square_footage),
        density: form.density,
        itemQuality: Number(form.item_quality_score),
        jobType: form.job_type,
        zipCode: form.zip_code,
      })
      setScore(result)
    } else {
      setScore(null)
    }
  }, [form.square_footage, form.density, form.item_quality_score, form.job_type, form.zip_code])

  function handleChange(key, value) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    if (!form.name?.trim()) return
    setSaving(true)
    await onSave({ ...form, deal_score: score?.dealScore ?? null })
    setSaving(false)
  }

  const currentStageIdx = PIPELINE_STAGES.indexOf(form.status)
  const nextStage = currentStageIdx < PIPELINE_STAGES.length - 1
    ? PIPELINE_STAGES[currentStageIdx + 1]
    : null

  const headerTitle = isNew ? 'New Lead' : (lead.name || 'Edit Lead')

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#1a1d27',
        border: '1px solid #2a2f45',
        borderRadius: 14,
        width: '100%',
        maxWidth: 760,
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 22px',
          borderBottom: '1px solid #2a2f45',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 17, color: '#f0f2ff' }}>{headerTitle}</div>
              {!isNew && lead.address && (
                <div style={{ fontSize: 12, color: '#555b75', marginTop: 2 }}>{lead.address}</div>
              )}
            </div>
            {score && <ScoreBadge score={score.dealScore} size="lg" />}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555b75', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body — scrollable */}
        <div style={{ flex: 1, overflow: 'auto', display: 'flex' }}>
          {/* Left: editable fields */}
          <div style={{ flex: 1, padding: '20px 22px', borderRight: '1px solid #2a2f45', overflowY: 'auto' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>
              Lead Info
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <Field label="Name *">
                <input value={form.name || ''} onChange={e => handleChange('name', e.target.value)} style={inputStyle} placeholder="Full name" />
              </Field>
              <Field label="Phone">
                <input value={form.phone || ''} onChange={e => handleChange('phone', e.target.value)} style={inputStyle} placeholder="(xxx) xxx-xxxx" />
              </Field>
              <Field label="Email">
                <input value={form.email || ''} onChange={e => handleChange('email', e.target.value)} style={inputStyle} placeholder="email@example.com" />
              </Field>
              <Field label="ZIP Code">
                <input value={form.zip_code || ''} onChange={e => handleChange('zip_code', e.target.value)} style={inputStyle} placeholder="e.g. 60625" />
              </Field>
            </div>

            <Field label="Address">
              <input value={form.address || ''} onChange={e => handleChange('address', e.target.value)} style={inputStyle} placeholder="Street address" />
            </Field>

            <Field label="What they need">
              <textarea
                value={form.what_they_need || ''}
                onChange={e => handleChange('what_they_need', e.target.value)}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }}
                placeholder="Describe the job…"
              />
            </Field>

            <div style={{ fontSize: 12, fontWeight: 600, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '20px 0 16px' }}>
              Job Details
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <Field label="Square Footage">
                <input
                  type="number"
                  value={form.square_footage || ''}
                  onChange={e => handleChange('square_footage', e.target.value)}
                  style={inputStyle}
                  placeholder="e.g. 2400"
                />
              </Field>
              <Field label="Density">
                <select value={form.density || 'Medium'} onChange={e => handleChange('density', e.target.value)} style={selectStyle}>
                  {DENSITY_OPTIONS.map(d => <option key={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Item Quality (1–10)">
                <input
                  type="number" min={1} max={10}
                  value={form.item_quality_score || ''}
                  onChange={e => handleChange('item_quality_score', e.target.value)}
                  style={inputStyle}
                  placeholder="1–10"
                />
              </Field>
              <Field label="Job Type">
                <select value={form.job_type || 'Both'} onChange={e => handleChange('job_type', e.target.value)} style={selectStyle}>
                  {JOB_TYPE_OPTIONS.map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Stage">
              <select value={form.status || 'New Lead'} onChange={e => handleChange('status', e.target.value)} style={selectStyle}>
                {PIPELINE_STAGES.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>

            {/* Assignee + Consult date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <Field label="Assigned To">
                <select
                  value={form.assigned_to || ''}
                  onChange={e => handleChange('assigned_to', e.target.value || null)}
                  style={selectStyle}
                >
                  <option value="">— Unassigned —</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </Field>
              <Field label="Consult Date & Time">
                <input
                  type="datetime-local"
                  value={toInputDT(form.consult_at)}
                  onChange={e => handleChange('consult_at', e.target.value ? new Date(e.target.value).toISOString() : null)}
                  style={inputStyle}
                />
              </Field>
            </div>

            {/* Calendar export — only show when a consult is scheduled */}
            {form.consult_at && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <a
                  href={googleCalUrl({ ...form }, members.find(m => m.id === form.assigned_to)?.name)}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#0f1117', border: '1px solid #2a2f45', borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 500, color: '#8b8fa8', textDecoration: 'none' }}
                >
                  <ExternalLink size={12} />
                  Add to Google Calendar
                </a>
                <button
                  onClick={() => downloadICS({ ...form }, members.find(m => m.id === form.assigned_to)?.name)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#0f1117', border: '1px solid #2a2f45', borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 500, color: '#8b8fa8', cursor: 'pointer' }}
                >
                  <Download size={12} />
                  Apple Calendar (.ics)
                </button>
              </div>
            )}

            <Field label="Notes">
              <textarea
                value={form.notes || ''}
                onChange={e => handleChange('notes', e.target.value)}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
                placeholder="Any additional notes…"
              />
            </Field>
          </div>

          {/* Right: score breakdown + actions */}
          <div style={{ width: 240, padding: '20px 18px', overflowY: 'auto', flexShrink: 0 }}>
            {score ? (
              <>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>
                  Deal Summary
                </div>

                {[
                  { label: 'Labour Hours', value: `${score.labourHours} hrs` },
                  { label: 'Labour Cost',  value: `$${score.labourCost.toLocaleString()}` },
                  { label: 'Overhead',     value: `$${score.overheadCost.toLocaleString()}` },
                  { label: 'Total Cost',   value: `$${score.totalCost.toLocaleString()}`, bold: true },
                  { label: 'Suggested Bid', value: `$${score.recommendedBid.toLocaleString()}`, color: '#22c55e', bold: true },
                  { label: 'Est. Profit',  value: `$${score.estimatedProfit.toLocaleString()}`, color: score.estimatedProfit > 0 ? '#22c55e' : '#ef4444' },
                  { label: 'Margin',       value: `${score.profitMarginPct}%` },
                ].map(({ label, value, bold, color }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #2a2f45' }}>
                    <span style={{ fontSize: 12, color: '#8b8fa8' }}>{label}</span>
                    <span style={{ fontSize: 12, fontWeight: bold ? 700 : 500, color: color || '#f0f2ff' }}>{value}</span>
                  </div>
                ))}

                {/* Move to next stage */}
                {nextStage && !isNew && (
                  <div style={{ marginTop: 24 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#555b75', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                      Move to next stage
                    </div>
                    <button
                      onClick={() => handleChange('status', nextStage)}
                      style={{
                        width: '100%',
                        background: 'rgba(99,102,241,0.12)',
                        border: '1px solid rgba(99,102,241,0.3)',
                        borderRadius: 8,
                        padding: '8px 12px',
                        color: '#a5b4fc',
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      {nextStage}
                      <ArrowRight size={13} />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: '#555b75', fontSize: 12 }}>Fill in square footage, density, item quality, and job type to see deal summary.</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 22px',
          borderTop: '1px solid #2a2f45',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10,
          flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: '1px solid #2a2f45',
              borderRadius: 8,
              padding: '8px 18px',
              color: '#8b8fa8',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.name?.trim()}
            style={{
              background: form.name?.trim() ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#2a2f45',
              border: 'none',
              borderRadius: 8,
              padding: '8px 20px',
              color: form.name?.trim() ? '#fff' : '#555b75',
              fontSize: 13,
              fontWeight: 600,
              cursor: form.name?.trim() ? 'pointer' : 'not-allowed',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving…' : isNew ? 'Create Lead' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
