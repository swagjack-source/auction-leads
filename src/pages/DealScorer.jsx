import { useState, useEffect, useRef } from 'react'
import { Save, Check, Plus, X, Sparkles } from 'lucide-react'
import { calculateDeal, getScoreColor, getScoreLabel, getSizeBucket } from '../lib/scoring'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useIsMobile } from '../hooks/useIsMobile'
import logger from '../lib/logger'
import { useSearchParams, useLocation } from 'react-router-dom'

// ── Constants ──────────────────────────────────────────────────

const DENSITY_OPTIONS = [
  { id: 'Low',    title: 'Low',    sub: 'Mostly empty rooms' },
  { id: 'Medium', title: 'Medium', sub: 'Average household clutter' },
  { id: 'High',   title: 'High',   sub: 'Heavy / hoarder conditions' },
]

const JOB_TYPE_OPTIONS = [
  { id: 'Clean Out', title: 'Clean Out Only',      sub: 'Labour-focused, no auction' },
  { id: 'Auction',   title: 'Auction Only',        sub: 'Sell items, no cleanout' },
  { id: 'Both',      title: 'Clean Out + Auction', sub: 'Full-service premium job' },
]

const DENSITY_MULT = { Low: 0.7, Medium: 1.0, High: 1.45 }
const JOB_MULT     = { 'Clean Out': 0.85, Auction: 1.1, Both: 1.3 }

// ── Design sub-components ──────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 10.5, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '22px 0 10px' }}>
      {children}
    </div>
  )
}

function FieldLabel({ children }) {
  return <div style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500, margin: '12px 0 6px' }}>{children}</div>
}

function FieldInput(props) {
  return (
    <input {...props} style={{
      width: '100%', padding: '10px 12px', fontSize: 13,
      border: '1px solid var(--line)', borderRadius: 10,
      background: 'var(--bg)', outline: 'none', color: 'var(--ink-1)',
      fontFamily: 'inherit',
      boxSizing: 'border-box',
      ...(props.style || {}),
    }} />
  )
}

function RadioStack({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {options.map(o => {
        const sel = o.id === value
        return (
          <button key={o.id} onClick={() => onChange(o.id)} style={{
            display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
            padding: '10px 12px', borderRadius: 10,
            border: sel ? '1.5px solid var(--accent)' : '1px solid var(--line)',
            background: sel ? 'var(--accent-soft)' : 'var(--bg)',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <span style={{
              width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
              border: '1.5px solid ' + (sel ? 'var(--accent)' : 'var(--ink-4)'),
              background: sel ? 'var(--accent)' : 'var(--bg)',
              display: 'grid', placeItems: 'center',
            }}>
              {sel && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--panel)' }} />}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-1)' }}>{o.title}</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 1 }}>{o.sub}</div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function QualitySlider({ value, onChange }) {
  const tier = value >= 9 ? { label: 'Exceptional', color: 'var(--win)',    bg: 'var(--win-soft)',    hint: 'High-end antiques, designer pieces, collectibles' }
              : value >= 7 ? { label: 'Strong',      color: 'var(--accent)', bg: 'var(--accent-soft)', hint: 'Quality furniture, good brand names' }
              : value >= 5 ? { label: 'Average',     color: 'var(--warn)',   bg: 'var(--warn-soft)',   hint: 'Mixed contents, some sellable items' }
              :              { label: 'Low',          color: 'var(--lose)',   bg: 'var(--lose-soft)',   hint: 'Mostly donation-grade, minimal resale' }
  const pct = ((value - 1) / 9) * 100

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500 }}>Item Quality</span>
        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 18, fontWeight: 600, color: tier.color, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
          <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>/ 10</span>
        </span>
      </div>

      <div style={{ position: 'relative', height: 28 }}>
        {/* Base track */}
        <div style={{
          position: 'absolute', top: 11, left: 0, right: 0, height: 6, borderRadius: 999,
          background: 'linear-gradient(90deg, color-mix(in oklab, var(--lose) 18%, var(--line-2)) 0%, color-mix(in oklab, var(--warn) 18%, var(--line-2)) 45%, color-mix(in oklab, var(--accent) 18%, var(--line-2)) 70%, color-mix(in oklab, var(--win) 22%, var(--line-2)) 100%)',
        }} />
        {/* Filled portion */}
        <div style={{
          position: 'absolute', top: 11, left: 0, width: `${pct}%`, height: 6, borderRadius: 999,
          background: `linear-gradient(90deg, color-mix(in oklab, var(--lose) 70%, ${tier.color}) 0%, ${tier.color} 100%)`,
          transition: 'width 160ms ease',
        }} />
        {/* Tick marks */}
        <div style={{ position: 'absolute', top: 11, left: 0, right: 0, height: 6, display: 'flex', justifyContent: 'space-between', pointerEvents: 'none' }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} style={{
              width: 2, height: 6,
              background: i + 1 <= value ? 'rgba(255,255,255,0.5)' : 'var(--ink-4)',
              opacity: i === 0 || i === 9 ? 0 : 0.35,
            }} />
          ))}
        </div>
        {/* Thumb */}
        <div style={{
          position: 'absolute', top: 4, left: `calc(${pct}% - 10px)`,
          width: 20, height: 20, borderRadius: '50%',
          background: 'var(--panel)', border: `2.5px solid ${tier.color}`,
          boxShadow: '0 2px 6px rgba(20,22,26,0.15)',
          pointerEvents: 'none',
          transition: 'left 160ms ease',
        }} />
        {/* Invisible real slider */}
        <input
          type="range" min="1" max="10" step="1" value={value}
          onChange={e => onChange(+e.target.value)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', margin: 0 }}
        />
      </div>

      {/* Tick labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2, padding: '0 2px' }}>
        {[1, 3, 5, 7, 10].map(n => (
          <span key={n} style={{
            fontSize: 10, fontVariantNumeric: 'tabular-nums',
            color: n === value ? tier.color : 'var(--ink-4)',
            fontWeight: n === value ? 700 : 500,
          }}>{n}</span>
        ))}
      </div>

      {/* Tier badge + hint */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginTop: 12,
        padding: '10px 12px', borderRadius: 10,
        background: tier.bg,
        border: `1px solid color-mix(in oklab, ${tier.color} 18%, var(--line))`,
      }}>
        <span style={{
          fontSize: 10.5, fontWeight: 600, color: tier.color,
          background: 'var(--panel)', padding: '2px 8px', borderRadius: 4,
          textTransform: 'uppercase', letterSpacing: '0.06em',
          boxShadow: '0 1px 0 rgba(20,22,26,0.04)', flexShrink: 0,
        }}>{tier.label}</span>
        <span style={{ fontSize: 11.5, color: 'var(--ink-2)', lineHeight: 1.35 }}>{tier.hint}</span>
      </div>
    </div>
  )
}

// ── Score ring SVG ─────────────────────────────────────────────

function ScoreRing({ score, color }) {
  const r = 34
  const c = 2 * Math.PI * r
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" style={{ flexShrink: 0 }}>
      <circle cx="40" cy="40" r={r} fill="none" stroke="var(--line-2)" strokeWidth="6" />
      <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${c * (score / 10)} ${c}`}
        transform="rotate(-90 40 40)" />
      <text x="40" y="45" textAnchor="middle" fontSize="19" fontWeight="600" fill="var(--ink-1)"
        style={{ fontFamily: 'Inter', letterSpacing: '-0.02em' }}>
        {typeof score === 'number' ? score.toFixed(1) : score}
      </text>
    </svg>
  )
}

// ── Result card ────────────────────────────────────────────────

function ResultCard({ label, value, sub, tone }) {
  const toneColor = tone === 'win' ? 'var(--win)' : 'var(--ink-1)'
  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ fontSize: 10.5, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 4, color: toneColor, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────

function EmptyResults() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-4)', fontSize: 13 }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: 'var(--accent-soft)', color: 'var(--accent)',
        display: 'grid', placeItems: 'center', marginBottom: 12,
      }}>
        <Sparkles size={28} strokeWidth={1.6} />
      </div>
      Fill in the form and click Calculate
    </div>
  )
}

// ── Add-to-Pipeline modal ──────────────────────────────────────

function AddToPipelineModal({ scorerForm, result, onClose, onAdded }) {
  const { organizationId } = useAuth()
  const [name, setName]       = useState('')
  const [phone, setPhone]     = useState('')
  const [email, setEmail]     = useState('')
  const [address, setAddress] = useState('')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState(null)

  async function handleCreate() {
    if (!name.trim()) return
    setSaving(true)
    const { data, error } = await supabase.from('leads').insert({
      name: name.trim(), phone: phone || null, email: email || null,
      address: address || null, zip_code: scorerForm.zipCode || null,
      status: 'New Lead',
      square_footage: Number(scorerForm.sqft), density: scorerForm.density,
      item_quality_score: Number(scorerForm.itemQuality), job_type: scorerForm.jobType,
      deal_score: result.dealScore,
      organization_id: organizationId,
    }).select().single()
    setSaving(false)
    if (error) { setError(error.message); return }
    onAdded(data); onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, width: '100%', maxWidth: 420, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink-1)' }}>Add to Pipeline</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>Job details pre-filled · Deal Score {result.dealScore.toFixed(1)}</div>
        </div>
        <div style={{ margin: '14px 20px 0', padding: '10px 14px', background: 'var(--bg)', borderRadius: 8, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Size',    value: `${Number(scorerForm.sqft).toLocaleString()} sqft` },
            { label: 'Type',    value: scorerForm.jobType },
            { label: 'Density', value: scorerForm.density },
            { label: 'Bid',     value: `$${result.recommendedBid.toLocaleString()}` },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#A50050', marginTop: 2 }}>{value}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: 'Contact Name *', value: name,    set: setName,    placeholder: 'Full name' },
            { label: 'Phone',          value: phone,   set: setPhone,   placeholder: '(xxx) xxx-xxxx' },
            { label: 'Email',          value: email,   set: setEmail,   placeholder: 'email@example.com' },
            { label: 'Address',        value: address, set: setAddress, placeholder: 'Street address' },
          ].map(({ label, value, set, placeholder }) => (
            <div key={label}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>{label}</label>
              <input value={value} onChange={e => set(e.target.value)} placeholder={placeholder}
                style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 7, padding: '8px 11px', fontSize: 13, color: 'var(--ink-1)', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          ))}
          {error && <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>}
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 16px', color: 'var(--ink-2)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleCreate} disabled={saving || !name.trim()}
            style={{ background: name.trim() ? 'linear-gradient(135deg, #A50050, #CD545B)' : 'var(--line)', border: 'none', borderRadius: 8, padding: '8px 18px', color: name.trim() ? '#fff' : 'var(--ink-3)', fontSize: 13, fontWeight: 600, cursor: name.trim() ? 'pointer' : 'not-allowed', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} />
            {saving ? 'Creating…' : 'Create Lead'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Save Job Modal ─────────────────────────────────────────────

const BID_TAGS = [
  { value: 'underbid', label: 'Underbid', color: '#ef4444' },
  { value: 'good_bid', label: 'Good Bid', color: '#22c55e' },
  { value: 'overbid',  label: 'Overbid',  color: '#f59e0b' },
]

function SaveJobModal({ result, scorerForm, onClose, onSaved }) {
  const { organizationId } = useAuth()
  const [jobName, setJobName] = useState('')
  const [bidTag,  setBidTag]  = useState('good_bid')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState(null)

  async function handleSave() {
    setSaving(true)
    const { error } = await supabase.from('deal_scores').insert({
      job_name:               jobName.trim() || null,
      bid_tag:                bidTag,
      square_footage:         Number(scorerForm.sqft),
      density:                scorerForm.density,
      zip_code:               scorerForm.zipCode || null,
      item_quality:           Number(scorerForm.itemQuality),
      job_type:               scorerForm.jobType,
      estimated_labour_hours: result.labourHours,
      estimated_labour_cost:  result.labourCost,
      overhead_cost:          result.overheadCost,
      recommended_bid:        result.recommendedBid,
      estimated_profit:       result.estimatedProfit,
      deal_score:             result.dealScore,
      organization_id:        organizationId,
    })
    setSaving(false)
    if (error) { setError(error.message); return }
    onSaved(); onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, width: '100%', maxWidth: 400, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink-1)' }}>Save Job</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)' }}><X size={18} /></button>
        </div>
        <div style={{ margin: '14px 20px 0', padding: '10px 14px', background: 'var(--bg)', borderRadius: 8, display: 'flex', gap: 20 }}>
          {[
            { label: 'Bid',    value: `$${result.recommendedBid.toLocaleString()}` },
            { label: 'Profit', value: `$${result.estimatedProfit.toLocaleString()}` },
            { label: 'Score',  value: result.dealScore.toFixed(1) },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#A50050', marginTop: 2 }}>{value}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>Job Name</label>
            <input value={jobName} onChange={e => setJobName(e.target.value)} placeholder="e.g. Deborah and Lorraine"
              style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 7, padding: '8px 11px', fontSize: 13, color: 'var(--ink-1)', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Bid Result</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {BID_TAGS.map(tag => (
                <button key={tag.value} onClick={() => setBidTag(tag.value)}
                  style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: `2px solid ${bidTag === tag.value ? tag.color : 'var(--line)'}`, background: bidTag === tag.value ? `${tag.color}18` : 'var(--bg)', color: bidTag === tag.value ? tag.color : 'var(--ink-3)', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
                  {tag.label}
                </button>
              ))}
            </div>
          </div>
          {error && <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>}
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 16px', color: 'var(--ink-2)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            style={{ background: 'linear-gradient(135deg, #A50050, #CD545B)', border: 'none', borderRadius: 8, padding: '8px 18px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Save size={14} />
            {saving ? 'Saving…' : 'Save Job'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────

export default function DealScorer() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const isMobile = useIsMobile()

  const leadState  = location.state?.lead || null
  const fromLead   = searchParams.get('lead')

  const initialLead = leadState

  const [form, setForm] = useState(() => initialLead ? {
    sqft:        initialLead.square_footage?.toString() || '',
    density:     initialLead.density             || 'Medium',
    zipCode:     initialLead.zip_code            || '',
    itemQuality: initialLead.item_quality_score  ?? 7,
    jobType:     initialLead.job_type            || 'Both',
  } : {
    sqft: '', density: 'Medium', zipCode: '', itemQuality: 7, jobType: 'Both',
  })

  const [result, setResult]             = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [addedLead, setAddedLead]       = useState(null)
  const [savedDone, setSavedDone]       = useState(false)
  const hasCalculated = useRef(false)

  // Auto-calculate when opened from a lead
  useEffect(() => {
    if (initialLead?.square_footage) {
      const r = calculateDeal({
        sqft:        Number(initialLead.square_footage),
        density:     initialLead.density        || 'Medium',
        itemQuality: Number(initialLead.item_quality_score ?? 7),
        jobType:     initialLead.job_type       || 'Both',
        zipCode:     initialLead.zip_code       || '',
      })
      hasCalculated.current = true
      setResult(r)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Real-time recalc after first Calculate
  useEffect(() => {
    if (!hasCalculated.current) return
    if (!form.sqft || isNaN(Number(form.sqft)) || Number(form.sqft) <= 0) { setResult(null); return }
    const r = calculateDeal({
      sqft: Number(form.sqft), density: form.density,
      itemQuality: Number(form.itemQuality), jobType: form.jobType, zipCode: form.zipCode,
    })
    setResult(r)
    setAddedLead(null)
    setSavedDone(false)
  }, [form])

  function set(key, value) { setForm(f => ({ ...f, [key]: value })) }

  function calculate() {
    if (!form.sqft || isNaN(Number(form.sqft))) return
    const r = calculateDeal({
      sqft: Number(form.sqft), density: form.density,
      itemQuality: Number(form.itemQuality), jobType: form.jobType, zipCode: form.zipCode,
    })
    hasCalculated.current = true
    setResult(r)
    setAddedLead(null)
    setSavedDone(false)
  }

  const canCalculate = form.sqft && !isNaN(Number(form.sqft)) && Number(form.sqft) > 0

  // Breakdown values
  const sqftNum = Number(form.sqft) || 0
  const densityMult = DENSITY_MULT[form.density] ?? 1
  const jobMult     = JOB_MULT[form.jobType] ?? 1
  const itemValueMult = (0.85 + Number(form.itemQuality) * 0.06).toFixed(2)

  const scoreColor = result ? getScoreColor(result.dealScore) : 'var(--ink-3)'
  const scoreLabel = result ? getScoreLabel(result.dealScore) : ''
  const scoreBg    = result
    ? result.dealScore >= 8 ? 'var(--win-soft)'
    : result.dealScore >= 6.5 ? 'var(--accent-soft)'
    : result.dealScore >= 5 ? 'var(--warn-soft)'
    : 'var(--lose-soft)'
    : 'var(--line-2)'

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0, flexDirection: isMobile ? 'column' : 'row' }}>

      {/* ── LEFT: Form ────────────────────────────────────────── */}
      <div style={{
        width: isMobile ? '100%' : 460, flexShrink: 0,
        borderRight: isMobile ? 'none' : '1px solid var(--line)',
        borderBottom: isMobile ? '1px solid var(--line)' : 'none',
        background: 'var(--panel)', overflowY: 'auto',
      }}>
        <div style={{ padding: '22px 28px 26px' }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink-1)' }}>Deal Scorer</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--ink-3)', fontSize: 13, lineHeight: 1.45 }}>
            Estimate labour, costs, and deal quality before your consult.
          </p>

          <SectionLabel>Property</SectionLabel>

          <FieldLabel>Square Footage</FieldLabel>
          <FieldInput
            type="number" placeholder="e.g. 2400" value={form.sqft}
            onChange={e => set('sqft', e.target.value)}
          />
          {form.sqft && !isNaN(Number(form.sqft)) && Number(form.sqft) > 0 && (
            <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 4 }}>
              Size bucket: <strong style={{ color: 'var(--ink-1)' }}>{getSizeBucket(Number(form.sqft))}</strong>
            </div>
          )}

          <FieldLabel>Property Density</FieldLabel>
          <RadioStack options={DENSITY_OPTIONS} value={form.density} onChange={v => set('density', v)} />

          <FieldLabel>ZIP Code</FieldLabel>
          <FieldInput
            type="text" placeholder="e.g. 80015" value={form.zipCode}
            onChange={e => set('zipCode', e.target.value)}
          />

          <SectionLabel>Deal factors</SectionLabel>

          <QualitySlider value={form.itemQuality} onChange={v => set('itemQuality', v)} />

          <FieldLabel>Job Type</FieldLabel>
          <RadioStack options={JOB_TYPE_OPTIONS} value={form.jobType} onChange={v => set('jobType', v)} />

          <button onClick={calculate} disabled={!canCalculate} style={{
            width: '100%', marginTop: 20, padding: '12px',
            background: canCalculate ? 'var(--accent)' : 'var(--line)',
            color: canCalculate ? '#fff' : 'var(--ink-3)',
            border: 'none', borderRadius: 12,
            fontWeight: 600, fontSize: 13.5, cursor: canCalculate ? 'pointer' : 'not-allowed',
            boxShadow: canCalculate ? '0 1px 0 rgba(255,255,255,0.15) inset, 0 2px 6px rgba(43,68,104,0.2)' : 'none',
          }}>Calculate Deal Score</button>
        </div>
      </div>

      {/* ── RIGHT: Results ─────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '22px 28px 28px' }}>
        {!result ? (
          <EmptyResults />
        ) : (
          <>
            {/* Score header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <ScoreRing score={result.dealScore} color={scoreColor} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10.5, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Deal Score</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 3 }}>
                  <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'var(--line-2)', overflow: 'hidden' }}>
                    <div style={{
                      width: `${(result.dealScore / 10) * 100}%`, height: '100%',
                      background: scoreColor, borderRadius: 999,
                      transition: 'width 300ms',
                    }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: scoreColor, fontVariantNumeric: 'tabular-nums' }}>{result.dealScore.toFixed(1)}/10</span>
                </div>
                <span style={{
                  display: 'inline-block', marginTop: 6,
                  fontSize: 11, fontWeight: 600, color: scoreColor,
                  background: scoreBg, padding: '2px 9px', borderRadius: 999,
                }}>{scoreLabel}</span>
              </div>
            </div>

            {/* Recommended bid hero */}
            <div style={{
              position: 'relative', overflow: 'hidden',
              marginTop: 18, padding: '22px 24px',
              background: 'linear-gradient(135deg, color-mix(in oklab, var(--accent-soft) 80%, var(--panel)) 0%, color-mix(in oklab, var(--accent-soft) 50%, var(--panel)) 100%)',
              borderRadius: 16, border: '1px solid color-mix(in oklab, var(--accent) 12%, var(--line))',
              display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
              boxShadow: 'var(--shadow-1)',
            }}>
              <div style={{ position: 'absolute', right: -40, top: -40, width: 180, height: 180, borderRadius: '50%', border: '1px solid color-mix(in oklab, var(--accent) 18%, transparent)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', right: -20, top: -20, width: 140, height: 140, borderRadius: '50%', border: '1px solid color-mix(in oklab, var(--accent) 12%, transparent)', pointerEvents: 'none' }} />
              <div style={{ position: 'relative' }}>
                <div style={{ fontSize: 10.5, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Recommended Bid</div>
                <div style={{ fontSize: 44, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1, marginTop: 6, color: 'var(--ink-1)', fontVariantNumeric: 'tabular-nums' }}>
                  ${result.recommendedBid.toLocaleString()}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 6 }}>
                  Range{' '}
                  <span style={{ color: 'var(--ink-2)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>${Math.round(result.recommendedBid * 0.9).toLocaleString()}</span>
                  {' – '}
                  <span style={{ color: 'var(--ink-2)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>${Math.round(result.recommendedBid * 1.1).toLocaleString()}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right', position: 'relative' }}>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Size bucket</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-1)' }}>{result.size}</div>
              </div>
            </div>

            {/* 2×2 result grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <ResultCard label="Est. Profit"    value={`$${result.estimatedProfit.toLocaleString()}`}  tone="win" />
              <ResultCard label="Profit Margin"  value={`${result.profitMarginPct}%`}                   tone="win" />
              <ResultCard label="Labor Cost"     value={`$${result.labourCost.toLocaleString()}`}
                sub={`+ $${result.overheadCost.toLocaleString()} overhead = $${result.totalCost.toLocaleString()} total`} />
              <ResultCard label="Labor Hours"    value={`${result.labourHours} hrs`}
                sub={`$22/hr · ${form.density.toLowerCase()} property`} />
            </div>

            {/* Breakdown table */}
            <SectionLabel>Calculation breakdown</SectionLabel>
            <div style={{ border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', background: 'var(--panel)' }}>
              {[
                ['Property size',       `${sqftNum.toLocaleString()} sq ft`],
                ['Density multiplier',  `${densityMult}×`],
                ['Job type multiplier', `${jobMult}×`],
                ['Item quality factor', `${itemValueMult}×`],
                ['ZIP cost index',      `${form.zipCode || '—'} · standard`],
              ].map(([k, v], i, arr) => (
                <div key={k} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '10px 14px', fontSize: 12.5,
                  borderBottom: i < arr.length - 1 ? '1px solid var(--line-2)' : 'none',
                }}>
                  <span style={{ color: 'var(--ink-3)' }}>{k}</span>
                  <span style={{ color: 'var(--ink-1)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{v}</span>
                </div>
              ))}
            </div>

            {/* CTA row */}
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              {addedLead ? (
                <div style={{ flex: 1, background: 'color-mix(in oklab, var(--win) 10%, var(--panel))', border: '1px solid color-mix(in oklab, var(--win) 30%, var(--line))', borderRadius: 12, padding: '11px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Check size={15} color="var(--win)" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--win)' }}>Added: {addedLead.name}</span>
                  </div>
                  <a href="/" style={{ fontSize: 12, color: 'var(--win)', textDecoration: 'none' }}>View in Pipeline →</a>
                </div>
              ) : (
                <button onClick={() => setShowAddModal(true)} style={{
                  flex: 1, padding: '11px', borderRadius: 12,
                  border: 'none', background: 'var(--accent)', color: 'white',
                  fontWeight: 600, fontSize: 13, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <Plus size={14} strokeWidth={2} /> Add to Pipeline
                </button>
              )}
              <button onClick={() => setShowSaveModal(true)} style={{
                padding: '11px 20px', borderRadius: 12,
                border: '1px solid var(--line)', background: savedDone ? 'color-mix(in oklab, var(--win) 10%, var(--panel))' : 'var(--panel)',
                fontWeight: 600, fontSize: 13, cursor: 'pointer',
                color: savedDone ? 'var(--win)' : 'var(--ink-1)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {savedDone ? <Check size={14} /> : <Save size={14} />}
                {savedDone ? 'Saved' : 'Save'}
              </button>
            </div>
          </>
        )}
      </div>

      {showAddModal && result && (
        <AddToPipelineModal
          scorerForm={form} result={result}
          onClose={() => setShowAddModal(false)}
          onAdded={lead => setAddedLead(lead)}
        />
      )}

      {showSaveModal && result && (
        <SaveJobModal
          result={result} scorerForm={form}
          onClose={() => setShowSaveModal(false)}
          onSaved={() => setSavedDone(true)}
        />
      )}
    </div>
  )
}
