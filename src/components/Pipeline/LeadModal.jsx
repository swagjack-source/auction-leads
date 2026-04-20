import { useState, useEffect, useRef } from 'react'
import { X, ArrowRight, ExternalLink, Download, CalendarDays, CalendarPlus, Calculator, Send, CheckCircle } from 'lucide-react'
import { estimateCrew, estimateProjectDays } from '../../lib/scoring'
import { useIsMobile } from '../../hooks/useIsMobile'
import ScoreBadge from './ScoreBadge'
import { PIPELINE_STAGES, DENSITY_OPTIONS, JOB_TYPES, LEAD_SOURCES } from '../../lib/constants'
import { calculateDeal } from '../../lib/scoring'
import { useTeam } from '../../lib/TeamContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'

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

function StageActions({ status, estimate, onScheduleConsult, onOpenScorer, onSendEstimate, onMarkAccepted }) {
  const actions = []

  if (status === 'New Lead' || status === 'Contacted') {
    actions.push({
      label: 'Schedule Consult',
      icon: CalendarPlus,
      color: '#f59e0b',
      onClick: onScheduleConsult,
      desc: 'Set a consult date and advance to Consult Scheduled',
    })
  }

  if (status === 'Consult Scheduled') {
    actions.push({
      label: 'Open Deal Scorer',
      icon: Calculator,
      color: '#71C5E8',
      onClick: onOpenScorer,
      desc: 'Run numbers for this lead and get a bid recommendation',
    })
  }

  if (status === 'Consult Completed' || (status === 'Consult Scheduled' && !estimate)) {
    actions.push({
      label: estimate ? 'Re-send Estimate' : 'Send Estimate',
      icon: Send,
      color: '#A50050',
      onClick: onSendEstimate,
      desc: 'Save estimate from Deal Scorer numbers',
    })
  }

  if (estimate?.status === 'Sent' || estimate?.status === 'Draft') {
    actions.push({
      label: 'Mark Estimate Accepted',
      icon: CheckCircle,
      color: '#22c55e',
      onClick: onMarkAccepted,
      desc: 'Client agreed — advance to Project Scheduled',
    })
  }

  if (actions.length === 0) return null

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
        Next Actions
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {actions.map(({ label, icon: Icon, color, onClick, desc }) => (
          <button
            key={label}
            onClick={onClick}
            style={{
              width: '100%', textAlign: 'left',
              background: `${color}10`,
              border: `1px solid ${color}30`,
              borderRadius: 8, padding: '9px 11px',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = `${color}1e`; e.currentTarget.style.borderColor = `${color}60` }}
            onMouseLeave={e => { e.currentTarget.style.background = `${color}10`; e.currentTarget.style.borderColor = `${color}30` }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
              <Icon size={13} color={color} />
              <span style={{ fontSize: 12.5, fontWeight: 600, color }}>{label}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', paddingLeft: 20 }}>{desc}</div>
          </button>
        ))}
      </div>
    </div>
  )
}


function Field({ label, required, error, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'flex', alignItems: 'baseline', gap: 4, fontSize: 11.5, fontWeight: 600, color: error ? 'var(--lose)' : 'var(--ink-2)', marginBottom: 6 }}>
        {label}
        {required && <span style={{ color: 'var(--lose)', fontSize: 10 }}>*</span>}
      </label>
      {children}
      {error && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{error}</div>}
    </div>
  )
}

const inputStyle = {
  width: '100%',
  background: 'var(--panel)',
  border: '1px solid var(--line)',
  borderRadius: 9,
  padding: '8px 11px',
  fontSize: 12.5,
  color: 'var(--ink-1)',
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color 120ms, box-shadow 120ms',
}

const selectStyle = {
  ...inputStyle,
  cursor: 'pointer',
}

export default function LeadModal({ lead, isNew, onClose, onSave }) {
  const { organizationId } = useAuth()
  const [form, setForm] = useState({ ...lead })
  const [score, setScore] = useState(lead._scoreDetails || null)
  const [saving, setSaving] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [actionMsg, setActionMsg] = useState(null)
  const [estimate, setEstimate] = useState(null)
  const consultRef = useRef(null)
  const { members } = useTeam()
  const isMobile = useIsMobile()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isNew && lead.id) fetchEstimate()
  }, [lead.id])

  async function fetchEstimate() {
    const { data } = await supabase
      .from('estimates')
      .select('*')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setEstimate(data || null)
  }

  async function handleScheduleConsult() {
    handleChange('status', 'Consult Scheduled')
    consultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    consultRef.current?.focus()
    setActionMsg('Set a date and time above, then save.')
  }

  async function handleOpenScorer() {
    if (form.id) {
      await onSave({ ...form, deal_score: score?.dealScore ?? null }).catch(() => {})
    }
    navigate(`/scorer?lead=${form.id || ''}`)
    onClose()
  }

  async function handleSendEstimate() {
    if (!score) { setActionMsg('Run the Deal Scorer first to get bid numbers.'); return }
    setActionMsg(null)
    const payload = {
      lead_id: form.id,
      bid_amount: score.recommendedBid,
      labour_hours: score.labourHours,
      job_type: form.job_type,
      status: 'Sent',
      sent_at: new Date().toISOString(),
      notes: form.notes || null,
    }
    const { data, error } = await supabase.from('estimates').upsert(
      estimate?.id ? { ...payload, id: estimate.id } : { ...payload, organization_id: organizationId },
      { onConflict: 'id' }
    ).select().single()
    if (error) { setActionMsg('Error saving estimate: ' + error.message); return }
    setEstimate(data)
    handleChange('status', 'Consult Completed')
    setActionMsg(`Estimate of $${score.recommendedBid.toLocaleString()} saved. Mark it accepted once the client agrees.`)
  }

  async function handleMarkAccepted() {
    if (!estimate) return
    const { data, error } = await supabase
      .from('estimates')
      .update({ status: 'Accepted', accepted_at: new Date().toISOString() })
      .eq('id', estimate.id)
      .select()
      .single()
    if (error) { setActionMsg('Error: ' + error.message); return }
    setEstimate(data)
    handleChange('status', 'Project Scheduled')
    setActionMsg('Estimate accepted! Lead moved to Project Scheduled.')
  }

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

  const errors = {
    name:        attempted && !form.name?.trim()    ? 'Name is required' : null,
    assigned_to: attempted && !form.assigned_to      ? 'Please assign this lead to a team member' : null,
    lead_source: attempted && !form.lead_source      ? 'Please select a lead source' : null,
  }
  const hasErrors = Object.values(errors).some(Boolean)

  async function handleSave() {
    setAttempted(true)
    setSaveError(null)
    if (!form.name?.trim() || !form.assigned_to || !form.lead_source) return
    setSaving(true)
    try {
      await onSave({ ...form, deal_score: score?.dealScore ?? null })
    } catch (err) {
      setSaveError(err.message || 'Save failed. Please try again.')
      setSaving(false)
    }
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
        background: 'var(--overlay)',
        display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center',
        padding: isMobile ? 0 : 20,
        animation: 'fadein 160ms ease',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--panel)',
        borderRadius: isMobile ? '16px 16px 0 0' : 16,
        width: '100%',
        maxWidth: isMobile ? '100%' : 760,
        maxHeight: isMobile ? '95vh' : '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 24px 70px rgba(20,22,26,0.28)',
        animation: isMobile ? undefined : 'popin 220ms cubic-bezier(.2,.7,.3,1.05)',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink-1)', letterSpacing: '-0.01em' }}>{headerTitle}</div>
              {!isNew && lead.address && (
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{lead.address}</div>
              )}
            </div>
            {score && <ScoreBadge score={score.dealScore} size="lg" />}
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: 8,
              border: '1px solid var(--line)', background: 'var(--panel)',
              cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--ink-2)',
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body — scrollable */}
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>
          {/* Left: editable fields */}
          <div style={{ flex: 1, padding: isMobile ? '16px 16px' : '20px 22px', borderRight: isMobile ? 'none' : '1px solid var(--line)', borderBottom: isMobile ? '1px solid var(--line)' : 'none', overflowY: isMobile ? 'unset' : 'auto' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 16 }}>
              Lead Info
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <Field label="Name" required error={errors.name}>
                <input value={form.name || ''} onChange={e => handleChange('name', e.target.value)} style={{ ...inputStyle, borderColor: errors.name ? '#ef4444' : undefined }} placeholder="Full name" />
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

            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.6px', margin: '20px 0 16px' }}>
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
                  {JOB_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <Field label="Stage">
                <select value={form.status || 'New Lead'} onChange={e => handleChange('status', e.target.value)} style={selectStyle}>
                  {PIPELINE_STAGES.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Lead Source" required error={errors.lead_source}>
                <select value={form.lead_source || ''} onChange={e => handleChange('lead_source', e.target.value || null)} style={{ ...selectStyle, borderColor: errors.lead_source ? '#ef4444' : undefined }}>
                  <option value="">— Unknown —</option>
                  {LEAD_SOURCES.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
            </div>

            {/* Assignee + Consult date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <Field label="Assigned To" required error={errors.assigned_to}>
                <select
                  value={form.assigned_to || ''}
                  onChange={e => handleChange('assigned_to', e.target.value || null)}
                  style={{ ...selectStyle, borderColor: errors.assigned_to ? '#ef4444' : undefined }}
                >
                  <option value="">— Unassigned —</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </Field>
              <Field label="Consult Date & Time">
                <input
                  ref={consultRef}
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
                  style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 500, color: 'var(--ink-2)', textDecoration: 'none' }}
                >
                  <ExternalLink size={12} />
                  Add to Google Calendar
                </a>
                <button
                  onClick={() => downloadICS({ ...form }, members.find(m => m.id === form.assigned_to)?.name)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 500, color: 'var(--ink-2)', cursor: 'pointer' }}
                >
                  <Download size={12} />
                  Apple Calendar (.ics)
                </button>
              </div>
            )}

            {/* Project Scheduling */}
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.6px', margin: '20px 0 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <CalendarDays size={13} />
              Project Scheduling
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <Field label="Project Start">
                <input
                  type="date"
                  value={form.project_start || ''}
                  onChange={e => handleChange('project_start', e.target.value || null)}
                  style={inputStyle}
                />
              </Field>
              <Field label="Project End">
                <input
                  type="date"
                  value={form.project_end || ''}
                  onChange={e => handleChange('project_end', e.target.value || null)}
                  style={inputStyle}
                />
              </Field>
            </div>

            <Field label="Crew Size">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={form.crew_size || ''}
                  onChange={e => handleChange('crew_size', e.target.value ? Number(e.target.value) : null)}
                  style={{ ...inputStyle, width: 100 }}
                  placeholder="Auto"
                />
                {!form.crew_size && form.square_footage && form.density && form.job_type && (
                  <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                    Est. {estimateCrew(form.square_footage, form.density, form.job_type)} crew
                    {form.project_start ? ` · ~${estimateProjectDays(form.square_footage, form.density, form.job_type)} day${estimateProjectDays(form.square_footage, form.density, form.job_type) !== 1 ? 's' : ''}` : ''}
                  </span>
                )}
              </div>
            </Field>

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
          <div style={{ width: isMobile ? '100%' : 240, padding: isMobile ? '16px 16px' : '20px 18px', overflowY: isMobile ? 'unset' : 'auto', flexShrink: 0 }}>
            {score ? (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 14 }}>
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
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                    <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{label}</span>
                    <span style={{ fontSize: 12, fontWeight: bold ? 700 : 500, color: color || 'var(--ink-1)' }}>{value}</span>
                  </div>
                ))}

                {/* Move to next stage */}
                {nextStage && !isNew && (
                  <div style={{ marginTop: 24 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                      Move to next stage
                    </div>
                    <button
                      onClick={() => handleChange('status', nextStage)}
                      style={{
                        width: '100%',
                        background: 'rgba(165,0,80,0.12)',
                        border: '1px solid rgba(165,0,80,0.3)',
                        borderRadius: 8,
                        padding: '8px 12px',
                        color: '#f4adc5',
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
              <div style={{ color: 'var(--ink-3)', fontSize: 12 }}>Fill in square footage, density, item quality, and job type to see deal summary.</div>
            )}

            {/* Stage-aware action buttons */}
            {!isNew && (
              <StageActions
                status={form.status}
                estimate={estimate}
                onScheduleConsult={handleScheduleConsult}
                onOpenScorer={handleOpenScorer}
                onSendEstimate={handleSendEstimate}
                onMarkAccepted={handleMarkAccepted}
              />
            )}

            {actionMsg && (
              <div style={{
                marginTop: 12, padding: '8px 10px',
                background: 'rgba(113,197,232,0.08)',
                border: '1px solid rgba(113,197,232,0.25)',
                borderRadius: 7, fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5,
              }}>
                {actionMsg}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 22px',
          borderTop: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 10,
          flexShrink: 0,
        }}>
          {saveError && (
            <div style={{ flex: 1, fontSize: 12, color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 7, padding: '6px 10px' }}>
              {saveError}
            </div>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: '1px solid var(--line)',
              borderRadius: 8,
              padding: '8px 18px',
              color: 'var(--ink-2)',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: 'linear-gradient(135deg, #A50050, #CD545B)',
              border: 'none',
              borderRadius: 8,
              padding: '8px 20px',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
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
