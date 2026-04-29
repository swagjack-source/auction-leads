import { useState, useEffect, useRef } from 'react'
import { Save, Check, Plus, X, Sparkles } from 'lucide-react'
import { calculateDeal, getScoreColor, getScoreLabel, getSizeBucket } from '../lib/scoring'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useIsMobile } from '../hooks/useIsMobile'
import logger from '../lib/logger'
import { useSearchParams, useLocation } from 'react-router-dom'

// ── Constants ──────────────────────────────────────────────────

const JOB_TYPE_OPTIONS = [
  { id: 'Clean Out', title: 'Clean Out Only',      sub: 'Labour-focused, no auction' },
  { id: 'Auction',   title: 'Auction Only',        sub: 'Sell items, no cleanout' },
  { id: 'Both',      title: 'Clean Out + Auction', sub: 'Full-service premium job' },
]

const DENSITY_MULT = { Low: 0.7, Medium: 1.0, High: 1.45 }
const JOB_MULT     = { 'Clean Out': 0.85, Auction: 1.1, Both: 1.3 }

// ── Design sub-components ──────────────────────────────────────

function SectionLabel({ children, style }) {
  return (
    <div style={{ fontSize: 10.5, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '14px 0 8px', ...style }}>
      {children}
    </div>
  )
}

function FieldLabel({ children }) {
  return <div style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500, margin: '8px 0 5px' }}>{children}</div>
}

function FieldInput(props) {
  return (
    <input {...props} style={{
      width: '100%', padding: '9px 12px', fontSize: 13,
      border: '1px solid var(--line)', borderRadius: 10,
      background: 'var(--bg)', outline: 'none', color: 'var(--ink-1)',
      fontFamily: 'inherit',
      boxSizing: 'border-box',
      ...(props.style || {}),
    }} />
  )
}

// ── Density segmented control ──────────────────────────────────

function DensityToggle({ value, onChange }) {
  const opts = [
    { id: 'Low',    label: 'Low',    sub: 'Mostly empty' },
    { id: 'Medium', label: 'Medium', sub: 'Avg. clutter' },
    { id: 'High',   label: 'High',   sub: 'Heavy / hoarder' },
  ]
  return (
    <div style={{ display: 'flex', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden', background: 'var(--bg)' }}>
      {opts.map((o, i) => {
        const sel = o.id === value
        return (
          <button key={o.id} onClick={() => onChange(o.id)} style={{
            flex: 1, padding: '8px 4px', border: 'none',
            borderRight: i < opts.length - 1 ? '1px solid var(--line)' : 'none',
            background: sel ? 'var(--accent-soft)' : 'transparent',
            cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center',
          }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: sel ? 'var(--accent)' : 'var(--ink-2)' }}>{o.label}</div>
            <div style={{ fontSize: 10, color: sel ? 'color-mix(in oklab, var(--accent) 80%, var(--ink-3))' : 'var(--ink-4)', marginTop: 1 }}>{o.sub}</div>
          </button>
        )
      })}
    </div>
  )
}

// ── Job type radio stack ───────────────────────────────────────

function RadioStack({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {options.map(o => {
        const sel = o.id === value
        return (
          <button key={o.id} onClick={() => onChange(o.id)} style={{
            display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
            padding: '9px 12px', borderRadius: 10,
            border: sel ? '1.5px solid var(--accent)' : '1px solid var(--line)',
            background: sel ? 'var(--accent-soft)' : 'var(--bg)',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <span style={{
              width: 15, height: 15, borderRadius: '50%', flexShrink: 0,
              border: '1.5px solid ' + (sel ? 'var(--accent)' : 'var(--ink-4)'),
              background: sel ? 'var(--accent)' : 'var(--bg)',
              display: 'grid', placeItems: 'center',
            }}>
              {sel && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--panel)' }} />}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-1)' }}>{o.title}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{o.sub}</div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ── Quality slider ─────────────────────────────────────────────

function QualitySlider({ value, onChange }) {
  const tier = value >= 9 ? { label: 'Exceptional', color: 'var(--win)',    bg: 'var(--win-soft)',    hint: 'High-end antiques, designer pieces, collectibles' }
              : value >= 7 ? { label: 'Strong',      color: 'var(--accent)', bg: 'var(--accent-soft)', hint: 'Quality furniture, good brand names' }
              : value >= 5 ? { label: 'Average',     color: 'var(--warn)',   bg: 'var(--warn-soft)',   hint: 'Mixed contents, some sellable items' }
              :              { label: 'Low',          color: 'var(--lose)',   bg: 'var(--lose-soft)',   hint: 'Mostly donation-grade, minimal resale' }
  const pct = ((value - 1) / 9) * 100

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 7 }}>
        <span style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500 }}>Item Quality</span>
        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 5 }}>
          <span style={{ fontSize: 17, fontWeight: 600, color: tier.color, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
          <span style={{ fontSize: 10.5, color: 'var(--ink-4)' }}>/ 10</span>
        </span>
      </div>

      <div style={{ position: 'relative', height: 26 }}>
        <div style={{
          position: 'absolute', top: 10, left: 0, right: 0, height: 6, borderRadius: 999,
          background: 'linear-gradient(90deg, color-mix(in oklab, var(--lose) 18%, var(--line-2)) 0%, color-mix(in oklab, var(--warn) 18%, var(--line-2)) 45%, color-mix(in oklab, var(--accent) 18%, var(--line-2)) 70%, color-mix(in oklab, var(--win) 22%, var(--line-2)) 100%)',
        }} />
        <div style={{
          position: 'absolute', top: 10, left: 0, width: `${pct}%`, height: 6, borderRadius: 999,
          background: `linear-gradient(90deg, color-mix(in oklab, var(--lose) 70%, ${tier.color}) 0%, ${tier.color} 100%)`,
          transition: 'width 160ms ease',
        }} />
        <div style={{ position: 'absolute', top: 10, left: 0, right: 0, height: 6, display: 'flex', justifyContent: 'space-between', pointerEvents: 'none' }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} style={{
              width: 2, height: 6,
              background: i + 1 <= value ? 'rgba(255,255,255,0.5)' : 'var(--ink-4)',
              opacity: i === 0 || i === 9 ? 0 : 0.35,
            }} />
          ))}
        </div>
        <div style={{
          position: 'absolute', top: 3, left: `calc(${pct}% - 10px)`,
          width: 20, height: 20, borderRadius: '50%',
          background: 'var(--panel)', border: `2.5px solid ${tier.color}`,
          boxShadow: '0 2px 6px rgba(20,22,26,0.15)',
          pointerEvents: 'none',
          transition: 'left 160ms ease',
        }} />
        <input
          type="range" min="1" max="10" step="1" value={value}
          onChange={e => onChange(+e.target.value)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', margin: 0 }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2, padding: '0 2px' }}>
        {[1, 3, 5, 7, 10].map(n => (
          <span key={n} style={{
            fontSize: 10, fontVariantNumeric: 'tabular-nums',
            color: n === value ? tier.color : 'var(--ink-4)',
            fontWeight: n === value ? 700 : 500,
          }}>{n}</span>
        ))}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginTop: 8,
        padding: '8px 12px', borderRadius: 10,
        background: tier.bg,
        border: `1px solid color-mix(in oklab, ${tier.color} 18%, var(--line))`,
      }}>
        <span style={{
          fontSize: 10.5, fontWeight: 600, color: tier.color,
          background: 'var(--panel)', padding: '2px 8px', borderRadius: 4,
          textTransform: 'uppercase', letterSpacing: '0.06em',
          boxShadow: '0 1px 0 rgba(20,22,26,0.04)', flexShrink: 0,
        }}>{tier.label}</span>
        <span style={{ fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.35 }}>{tier.hint}</span>
      </div>
    </div>
  )
}

// ── Similar job picker ─────────────────────────────────────────

function SimilarJobPicker({ organizationId, onSelect }) {
  const [jobs, setJobs]         = useState([])
  const [query, setQuery]       = useState('')
  const [open, setOpen]         = useState(false)
  const [selected, setSelected] = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    if (!organizationId) return
    supabase.from('deal_scores')
      .select('id, job_name, square_footage, density, job_type, item_quality, zip_code, recommended_bid, deal_score, bid_tag')
      .eq('organization_id', organizationId)
      .not('job_name', 'is', null)
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => setJobs(data || []))
  }, [organizationId])

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = jobs.filter(j =>
    !query || j.job_name?.toLowerCase().includes(query.toLowerCase())
  )

  function pick(job) {
    setSelected(job)
    setQuery(job.job_name || '')
    setOpen(false)
    onSelect(job)
  }

  const bidTagColor = { underbid: 'var(--lose)', good_bid: 'var(--win)', overbid: 'var(--warn)' }
  const bidTagLabel = { underbid: 'Underbid', good_bid: 'Good Bid', overbid: 'Overbid' }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); if (!e.target.value) setSelected(null) }}
        onFocus={() => setOpen(true)}
        placeholder={jobs.length ? `Search ${jobs.length} past jobs…` : 'No saved jobs yet'}
        disabled={!jobs.length}
        style={{
          width: '100%', padding: '9px 12px', fontSize: 13,
          border: '1px solid var(--line)', borderRadius: 10,
          background: 'var(--bg)', color: 'var(--ink-1)', outline: 'none',
          fontFamily: 'inherit', boxSizing: 'border-box',
          opacity: jobs.length ? 1 : 0.5,
        }}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          marginTop: 4, maxHeight: 220, overflowY: 'auto',
          background: 'var(--panel)', border: '1px solid var(--line)',
          borderRadius: 10, boxShadow: 'var(--shadow-1)',
        }}>
          {filtered.map((job, i) => (
            <button key={job.id} onClick={() => pick(job)} style={{
              width: '100%', textAlign: 'left', padding: '9px 12px',
              border: 'none', borderBottom: i < filtered.length - 1 ? '1px solid var(--line-2)' : 'none',
              background: 'none', cursor: 'pointer', fontFamily: 'inherit',
              display: 'block',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-1)', flex: 1 }}>{job.job_name}</span>
                {job.bid_tag && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: bidTagColor[job.bid_tag] || 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {bidTagLabel[job.bid_tag] || job.bid_tag}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                {job.square_footage?.toLocaleString()} sqft · {job.density} · {job.job_type}
                {job.recommended_bid ? ` · $${job.recommended_bid.toLocaleString()}` : ''}
              </div>
            </button>
          ))}
        </div>
      )}
      {selected && (
        <div style={{ marginTop: 7, padding: '8px 12px', background: 'var(--accent-soft)', borderRadius: 8, border: '1px solid color-mix(in oklab, var(--accent) 20%, var(--line))' }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
            Fields loaded from <strong style={{ color: 'var(--accent)' }}>{selected.job_name}</strong>
            {selected.recommended_bid && <span style={{ color: 'var(--ink-2)' }}> — original bid ${selected.recommended_bid.toLocaleString()}</span>}
          </div>
        </div>
      )}
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

// ── Skeleton state (before first calculate) ────────────────────

function SkeletonResults() {
  const skel = (h, w = '100%', r = 6) => ({
    height: h, width: w, borderRadius: r,
    background: 'var(--line-2)', display: 'block', flexShrink: 0,
  })
  return (
    <div style={{ opacity: 0.65 }}>
      {/* Score header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--line-2)', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={skel(10, '35%', 4)} />
          <div style={skel(8, '100%', 999)} />
          <div style={skel(22, '28%', 999)} />
        </div>
      </div>

      {/* Bid hero */}
      <div style={{ marginTop: 18, padding: '22px 24px', borderRadius: 16, border: '1px solid var(--line)', background: 'var(--line-2)' }}>
        <div style={skel(10, '28%', 4)} />
        <div style={{ ...skel(42, '55%', 6), marginTop: 8 }} />
        <div style={{ ...skel(11, '38%', 4), marginTop: 8 }} />
      </div>

      {/* 2×2 grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, padding: '12px 14px' }}>
            <div style={skel(10, '45%', 4)} />
            <div style={{ ...skel(22, '65%', 4), marginTop: 6 }} />
          </div>
        ))}
      </div>

      {/* Hint */}
      <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--ink-4)', fontSize: 12.5 }}>
        <Sparkles size={14} strokeWidth={1.6} />
        Fill in the form and click Calculate to see results
      </div>
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
  const { organizationId } = useAuth()

  const leadState  = location.state?.lead || null

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

  const [result, setResult]               = useState(null)
  const [showAddModal, setShowAddModal]   = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [addedLead, setAddedLead]         = useState(null)
  const [savedDone, setSavedDone]         = useState(false)
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

  // Live recalc after first Calculate click
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

  function handleJobSelect(job) {
    setForm({
      sqft:        job.square_footage?.toString() || '',
      density:     job.density      || 'Medium',
      zipCode:     job.zip_code     || '',
      itemQuality: job.item_quality ?? 7,
      jobType:     job.job_type     || 'Both',
    })
    // Trigger immediate calculation
    if (job.square_footage) {
      hasCalculated.current = true
    }
  }

  const canCalculate = form.sqft && !isNaN(Number(form.sqft)) && Number(form.sqft) > 0

  // Breakdown values
  const sqftNum      = Number(form.sqft) || 0
  const densityMult  = DENSITY_MULT[form.density] ?? 1
  const jobMult      = JOB_MULT[form.jobType] ?? 1
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
        width: isMobile ? '100%' : 440, flexShrink: 0,
        borderRight: isMobile ? 'none' : '1px solid var(--line)',
        borderBottom: isMobile ? '1px solid var(--line)' : 'none',
        background: 'var(--panel)', overflowY: 'auto',
      }}>
        <div style={{ padding: '16px 22px 20px' }}>

          <SectionLabel style={{ margin: '0 0 6px' }}>Load from past job</SectionLabel>
          <SimilarJobPicker organizationId={organizationId} onSelect={handleJobSelect} />

          <SectionLabel>Property</SectionLabel>

          <FieldLabel>Square Footage</FieldLabel>
          <FieldInput
            type="number" placeholder="e.g. 2400" value={form.sqft}
            onChange={e => set('sqft', e.target.value)}
          />
          {form.sqft && !isNaN(Number(form.sqft)) && Number(form.sqft) > 0 && (
            <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 3 }}>
              Size bucket: <strong style={{ color: 'var(--ink-1)' }}>{getSizeBucket(Number(form.sqft))}</strong>
            </div>
          )}

          <FieldLabel>Property Density</FieldLabel>
          <DensityToggle value={form.density} onChange={v => set('density', v)} />

          <FieldLabel>ZIP Code</FieldLabel>
          <FieldInput
            type="text" placeholder="e.g. 80015" value={form.zipCode}
            onChange={e => set('zipCode', e.target.value)}
          />

          <SectionLabel>Deal Factors</SectionLabel>

          <QualitySlider value={form.itemQuality} onChange={v => set('itemQuality', v)} />

          <FieldLabel>Job Type</FieldLabel>
          <RadioStack options={JOB_TYPE_OPTIONS} value={form.jobType} onChange={v => set('jobType', v)} />

          <button onClick={calculate} disabled={!canCalculate} style={{
            width: '100%', marginTop: 14, padding: '11px',
            background: canCalculate ? 'var(--accent)' : 'var(--line)',
            color: canCalculate ? '#fff' : 'var(--ink-3)',
            border: 'none', borderRadius: 12,
            fontWeight: 600, fontSize: 13.5, cursor: canCalculate ? 'pointer' : 'not-allowed',
            boxShadow: canCalculate ? '0 1px 0 rgba(255,255,255,0.15) inset, 0 2px 6px rgba(43,68,104,0.2)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            Calculate Deal Score
            {hasCalculated.current && result && (
              <span style={{ fontSize: 10.5, fontWeight: 500, opacity: 0.8 }}>· auto-updating</span>
            )}
          </button>
        </div>
      </div>

      {/* ── RIGHT: Results ─────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '22px 28px 28px' }}>
        {!result ? (
          <SkeletonResults />
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
                  <a href="/pipeline" style={{ fontSize: 12, color: 'var(--win)', textDecoration: 'none' }}>View in Pipeline →</a>
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
