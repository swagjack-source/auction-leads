import { useState, useEffect, useRef } from 'react'
import { X, Plus, Sparkles } from 'lucide-react'
import { calculateDeal, getScoreColor, getScoreLabel, getSizeBucket } from '../../lib/scoring'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'

const JOB_TYPE_OPTIONS = [
  { id: 'Clean Out',             title: 'Clean Out Only',        sub: 'Labor-focused, no auction' },
  { id: 'Auction',               title: 'Auction Only',          sub: 'Sell items, no cleanout' },
  { id: 'Both',                  title: 'Clean Out + Auction',   sub: 'Full-service premium job' },
  { id: 'Move',                  title: 'Move',                  sub: 'Relocation / moving service' },
  { id: 'In-person Estate Sale', title: 'In-person Estate Sale', sub: 'On-site sale with customers' },
]

const DENSITY_MULT = { Low: 0.7, Medium: 1.0, High: 1.45 }
const JOB_MULT     = { 'Clean Out': 0.85, Auction: 1.1, Both: 1.3, 'Move': 0.9, 'In-person Estate Sale': 1.05 }

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
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 7 }}>
        <span style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500 }}>Item Quality</span>
        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 5 }}>
          <span style={{ fontSize: 17, fontWeight: 600, color: tier.color, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
          <span style={{ fontSize: 10.5, color: 'var(--ink-4)' }}>/ 10</span>
        </span>
      </div>

      <div style={{ position: 'relative', height: 26 }}>
        <div style={{ position: 'absolute', top: 10, left: 0, right: 0, height: 6, borderRadius: 999, background: 'linear-gradient(90deg, color-mix(in oklab, var(--lose) 18%, var(--line-2)) 0%, color-mix(in oklab, var(--warn) 18%, var(--line-2)) 45%, color-mix(in oklab, var(--accent) 18%, var(--line-2)) 70%, color-mix(in oklab, var(--win) 22%, var(--line-2)) 100%)' }} />
        <div style={{ position: 'absolute', top: 10, left: 0, width: `${pct}%`, height: 6, borderRadius: 999, background: `linear-gradient(90deg, color-mix(in oklab, var(--lose) 70%, ${tier.color}) 0%, ${tier.color} 100%)`, transition: 'width 160ms ease' }} />
        <div style={{ position: 'absolute', top: 10, left: 0, right: 0, height: 6, display: 'flex', justifyContent: 'space-between', pointerEvents: 'none' }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} style={{ width: 2, height: 6, background: i + 1 <= value ? 'rgba(255,255,255,0.5)' : 'var(--ink-4)', opacity: i === 0 || i === 9 ? 0 : 0.35 }} />
          ))}
        </div>
        <div style={{ position: 'absolute', top: 3, left: `calc(${pct}% - 10px)`, width: 20, height: 20, borderRadius: '50%', background: 'var(--panel)', border: `2.5px solid ${tier.color}`, boxShadow: '0 2px 6px rgba(20,22,26,0.15)', pointerEvents: 'none', transition: 'left 160ms ease' }} />
        <input type="range" min="1" max="10" step="1" value={value}
          onChange={e => onChange(+e.target.value)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', margin: 0 }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2, padding: '0 2px' }}>
        {[1, 3, 5, 7, 10].map(n => (
          <span key={n} style={{ fontSize: 10, fontVariantNumeric: 'tabular-nums', color: n === value ? tier.color : 'var(--ink-4)', fontWeight: n === value ? 700 : 500 }}>{n}</span>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, padding: '8px 12px', borderRadius: 10, background: tier.bg, border: `1px solid color-mix(in oklab, ${tier.color} 18%, var(--line))` }}>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: tier.color, background: 'var(--panel)', padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.06em', boxShadow: '0 1px 0 rgba(20,22,26,0.04)', flexShrink: 0 }}>{tier.label}</span>
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

  const filtered = jobs.filter(j => !query || j.job_name?.toLowerCase().includes(query.toLowerCase()))

  const bidTagColor = { underbid: 'var(--lose)', good_bid: 'var(--win)', overbid: 'var(--warn)' }
  const bidTagLabel = { underbid: 'Underbid', good_bid: 'Good Bid', overbid: 'Overbid' }

  function pick(job) {
    setSelected(job)
    setQuery(job.job_name || '')
    setOpen(false)
    onSelect(job)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); if (!e.target.value) setSelected(null) }}
        onFocus={() => setOpen(true)}
        placeholder={jobs.length ? `Search ${jobs.length} past jobs…` : 'No saved jobs yet'}
        disabled={!jobs.length}
        style={{ width: '100%', padding: '9px 12px', fontSize: 13, border: '1px solid var(--line)', borderRadius: 10, background: 'var(--bg)', color: 'var(--ink-1)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', opacity: jobs.length ? 1 : 0.5 }}
      />
      {open && filtered.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 400, marginTop: 4, maxHeight: 200, overflowY: 'auto', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-1)' }}>
          {filtered.map((job, i) => (
            <button key={job.id} onClick={() => pick(job)} style={{ width: '100%', textAlign: 'left', padding: '9px 12px', border: 'none', borderBottom: i < filtered.length - 1 ? '1px solid var(--line-2)' : 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'block' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-1)', flex: 1 }}>{job.job_name}</span>
                {job.bid_tag && <span style={{ fontSize: 10, fontWeight: 700, color: bidTagColor[job.bid_tag] || 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{bidTagLabel[job.bid_tag] || job.bid_tag}</span>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                {job.square_footage?.toLocaleString()} sqft · {job.density} · {job.job_type}{job.recommended_bid ? ` · $${job.recommended_bid.toLocaleString()}` : ''}
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

// ── Score ring ─────────────────────────────────────────────────

function ScoreRing({ score, color }) {
  const r = 34, c = 2 * Math.PI * r
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" style={{ flexShrink: 0 }}>
      <circle cx="40" cy="40" r={r} fill="none" stroke="var(--line-2)" strokeWidth="6" />
      <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="6"
        strokeLinecap="round" strokeDasharray={`${c * (score / 10)} ${c}`}
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

// ── Skeleton results ───────────────────────────────────────────

function SkeletonResults() {
  const skel = (h, w = '100%', r = 6) => ({ height: h, width: w, borderRadius: r, background: 'var(--line-2)', display: 'block', flexShrink: 0 })
  return (
    <div style={{ opacity: 0.65 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--line-2)', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={skel(10, '35%', 4)} />
          <div style={skel(8, '100%', 999)} />
          <div style={skel(22, '28%', 999)} />
        </div>
      </div>
      <div style={{ marginTop: 18, padding: '22px 24px', borderRadius: 16, border: '1px solid var(--line)', background: 'var(--line-2)' }}>
        <div style={skel(10, '28%', 4)} />
        <div style={{ ...skel(42, '55%', 6), marginTop: 8 }} />
        <div style={{ ...skel(11, '38%', 4), marginTop: 8 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, padding: '12px 14px' }}>
            <div style={skel(10, '45%', 4)} />
            <div style={{ ...skel(22, '65%', 4), marginTop: 6 }} />
          </div>
        ))}
      </div>
      <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--ink-4)', fontSize: 12.5 }}>
        <Sparkles size={14} strokeWidth={1.6} />
        Fill in the form and click Calculate to see results
      </div>
    </div>
  )
}

// ── Modal ──────────────────────────────────────────────────────

export default function DealScorerModal({ onClose, onSaved }) {
  const { organizationId } = useAuth()
  const [sqft, setSqft]               = useState('')
  const [density, setDensity]         = useState('Medium')
  const [itemQuality, setItemQuality] = useState(7)
  const [jobType, setJobType]         = useState('Both')
  const [zipCode, setZipCode]         = useState('')
  const [result, setResult]           = useState(null)
  const [saving, setSaving]           = useState(false)
  const [tab, setTab]                 = useState('scorer')
  // Contact info for the new lead
  const [leadName, setLeadName]       = useState('')
  const [leadAddress, setLeadAddress] = useState('')
  const [leadPhone, setLeadPhone]     = useState('')
  const [leadEmail, setLeadEmail]     = useState('')
  const hasCalculated = useRef(false)

  // Live recalc after first Calculate click
  useEffect(() => {
    if (!hasCalculated.current) return
    if (!sqft || isNaN(Number(sqft)) || Number(sqft) <= 0) { setResult(null); return }
    setResult(calculateDeal({ sqft: Number(sqft), density, itemQuality: Number(itemQuality), jobType, zipCode }))
  }, [sqft, density, itemQuality, jobType, zipCode])

  function calculate() {
    if (!sqft) return
    hasCalculated.current = true
    setResult(calculateDeal({ sqft: Number(sqft), density, itemQuality: Number(itemQuality), jobType, zipCode }))
  }

  function handleJobSelect(job) {
    setSqft(job.square_footage?.toString() || '')
    setDensity(job.density || 'Medium')
    setItemQuality(job.item_quality ?? 7)
    setJobType(job.job_type || 'Both')
    setZipCode(job.zip_code || '')
    if (job.square_footage) hasCalculated.current = true
  }

  async function handleAddToPipeline() {
    if (!result) return
    setSaving(true)
    await supabase.from('leads').insert({
      name:               leadName.trim() || 'New Lead',
      status:             'New Lead',
      square_footage:     Number(sqft),
      density,
      item_quality_score: Number(itemQuality),
      job_type:           jobType,
      zip_code:           zipCode || null,
      address:            leadAddress || null,
      phone:              leadPhone || null,
      email:              leadEmail || null,
      deal_score:         result.dealScore,
      organization_id:    organizationId,
    })
    setSaving(false)
    onSaved?.()
    onClose()
  }

  const scoreColor = result ? getScoreColor(result.dealScore) : 'var(--ink-4)'
  const scoreLabel = result ? getScoreLabel(result.dealScore) : ''
  const scoreBg    = result
    ? result.dealScore >= 8 ? 'var(--win-soft)' : result.dealScore >= 6.5 ? 'var(--accent-soft)' : result.dealScore >= 5 ? 'var(--warn-soft)' : 'var(--lose-soft)'
    : 'var(--line-2)'

  const densityMult   = DENSITY_MULT[density] ?? 1
  const jobMult       = JOB_MULT[jobType] ?? 1
  const itemValueMult = (0.85 + Number(itemQuality) * 0.06).toFixed(2)

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'var(--overlay)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'fadein 150ms' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 18, boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 960, maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '14px 20px 0', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <Sparkles size={14} strokeWidth={1.8} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-1)' }}>New Project — Deal Scorer</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Estimate labor, costs, and deal quality</div>
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--ink-3)' }}>
              <X size={15} strokeWidth={1.8} />
            </button>
          </div>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0 }}>
            {[{ id: 'scorer', label: 'Deal Scorer' }, { id: 'contact', label: 'Contact Info' }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: '7px 16px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit',
                color: tab === t.id ? 'var(--accent)' : 'var(--ink-3)',
                borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -1,
              }}>{t.label}{t.id === 'contact' && (leadName || leadAddress || leadPhone) ? ' ●' : ''}</button>
            ))}
          </div>
        </div>

        {/* Contact Info Tab */}
        {tab === 'contact' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 4 }}>This info will be saved with the lead when you add it to the pipeline.</div>
            {[
              { label: 'Lead Name', value: leadName, set: setLeadName, placeholder: 'e.g. Jane Smith', type: 'text' },
              { label: 'Address', value: leadAddress, set: setLeadAddress, placeholder: 'e.g. 123 Main St, Denver CO', type: 'text' },
              { label: 'Phone', value: leadPhone, set: setLeadPhone, placeholder: 'e.g. 720-555-0100', type: 'tel' },
              { label: 'Email', value: leadEmail, set: setLeadEmail, placeholder: 'e.g. jane@example.com', type: 'email' },
            ].map(({ label, value, set, placeholder, type }) => (
              <div key={label}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>{label}</div>
                <input type={type} value={value} onChange={e => set(e.target.value)} placeholder={placeholder}
                  style={{ width: '100%', padding: '9px 12px', fontSize: 13, border: '1px solid var(--line)', borderRadius: 10, background: 'var(--bg)', outline: 'none', color: 'var(--ink-1)', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
            ))}
            {result && (
              <button onClick={handleAddToPipeline} disabled={saving} style={{
                marginTop: 8, padding: '11px', borderRadius: 12, border: 'none',
                background: 'var(--accent)', color: 'white',
                fontWeight: 600, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                opacity: saving ? 0.7 : 1,
              }}>
                <Plus size={14} strokeWidth={2} /> {saving ? 'Adding…' : 'Add to Pipeline'}
              </button>
            )}
            {!result && (
              <div style={{ padding: '14px', borderRadius: 10, background: 'var(--line-2)', fontSize: 12.5, color: 'var(--ink-3)', textAlign: 'center' }}>
                Run the Deal Scorer first to enable "Add to Pipeline"
              </div>
            )}
          </div>
        )}

        {/* Body */}
        {tab === 'scorer' && <div style={{ flex: 1, overflow: 'hidden', display: 'flex', minHeight: 0 }}>

          {/* Left: Form */}
          <div style={{ width: 360, flexShrink: 0, overflowY: 'auto', padding: '16px 20px 20px', borderRight: '1px solid var(--line)', background: 'var(--panel)' }}>

            <div style={{ fontSize: 10.5, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Load from past job</div>
            <SimilarJobPicker organizationId={organizationId} onSelect={handleJobSelect} />

            <div style={{ fontSize: 10.5, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '14px 0 8px' }}>Property</div>

            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500, marginBottom: 5 }}>Square Footage</div>
              <input type="number" value={sqft} onChange={e => setSqft(e.target.value)} placeholder="e.g. 2400"
                style={{ width: '100%', padding: '9px 12px', fontSize: 13, border: '1px solid var(--line)', borderRadius: 10, background: 'var(--bg)', outline: 'none', color: 'var(--ink-1)', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              {sqft && !isNaN(Number(sqft)) && Number(sqft) > 0 && (
                <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 3 }}>Size bucket: <strong style={{ color: 'var(--ink-1)' }}>{getSizeBucket(Number(sqft))}</strong></div>
              )}
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500, marginBottom: 5 }}>Property Density</div>
              <DensityToggle value={density} onChange={setDensity} />
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500, marginBottom: 5 }}>ZIP Code</div>
              <input value={zipCode} onChange={e => setZipCode(e.target.value)} placeholder="e.g. 80015"
                style={{ width: '100%', padding: '9px 12px', fontSize: 13, border: '1px solid var(--line)', borderRadius: 10, background: 'var(--bg)', outline: 'none', color: 'var(--ink-1)', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>

            <div style={{ fontSize: 10.5, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '14px 0 8px' }}>Deal Factors</div>

            <QualitySlider value={itemQuality} onChange={setItemQuality} />

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500, marginBottom: 5 }}>Job Type</div>
              <RadioStack options={JOB_TYPE_OPTIONS} value={jobType} onChange={setJobType} />
            </div>

            <button onClick={calculate} disabled={!sqft} style={{
              width: '100%', padding: '11px', borderRadius: 12, border: 'none',
              background: sqft ? 'var(--accent)' : 'var(--line)',
              color: sqft ? 'white' : 'var(--ink-4)',
              fontWeight: 600, fontSize: 13.5, cursor: sqft ? 'pointer' : 'not-allowed',
              boxShadow: sqft ? '0 1px 0 rgba(255,255,255,0.15) inset, 0 2px 6px rgba(43,68,104,0.2)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              Calculate Deal Score
              {hasCalculated.current && result && (
                <span style={{ fontSize: 10.5, fontWeight: 500, opacity: 0.8 }}>· auto-updating</span>
              )}
            </button>
          </div>

          {/* Right: Results */}
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
                        <div style={{ width: `${(result.dealScore / 10) * 100}%`, height: '100%', background: scoreColor, borderRadius: 999, transition: 'width 300ms' }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: scoreColor, fontVariantNumeric: 'tabular-nums' }}>{result.dealScore.toFixed(1)}/10</span>
                    </div>
                    <span style={{ display: 'inline-block', marginTop: 6, fontSize: 11, fontWeight: 600, color: scoreColor, background: scoreBg, padding: '2px 9px', borderRadius: 999 }}>{scoreLabel}</span>
                  </div>
                </div>

                {/* Bid hero */}
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

                {/* 2×2 grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                  <ResultCard label="Est. Profit"   value={`$${result.estimatedProfit.toLocaleString()}`} tone="win" />
                  <ResultCard label="Profit Margin" value={`${result.profitMarginPct}%`}                  tone="win" />
                  <ResultCard label="Labor Cost"    value={`$${result.labourCost.toLocaleString()}`}
                    sub={`+ $${result.overheadCost.toLocaleString()} overhead = $${result.totalCost.toLocaleString()} total`} />
                  <ResultCard label="Labor Hours"   value={`${result.labourHours} hrs`}
                    sub={`$22/hr · ${density.toLowerCase()} property`} />
                </div>

                {/* Breakdown */}
                <div style={{ fontSize: 10.5, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '18px 0 8px' }}>Calculation breakdown</div>
                <div style={{ border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', background: 'var(--panel)' }}>
                  {[
                    ['Property size',       `${Number(sqft).toLocaleString()} sq ft`],
                    ['Density multiplier',  `${densityMult}×`],
                    ['Job type multiplier', `${jobMult}×`],
                    ['Item quality factor', `${itemValueMult}×`],
                    ['ZIP cost index',      `${zipCode || '—'} · standard`],
                  ].map(([k, v], i, arr) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', fontSize: 12.5, borderBottom: i < arr.length - 1 ? '1px solid var(--line-2)' : 'none' }}>
                      <span style={{ color: 'var(--ink-3)' }}>{k}</span>
                      <span style={{ color: 'var(--ink-1)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{v}</span>
                    </div>
                  ))}
                </div>

                {/* CTAs */}
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button onClick={handleAddToPipeline} disabled={saving} style={{
                    flex: 1, padding: '11px', borderRadius: 12, border: 'none',
                    background: 'var(--accent)', color: 'white',
                    fontWeight: 600, fontSize: 13, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    opacity: saving ? 0.7 : 1,
                  }}>
                    <Plus size={14} strokeWidth={2} /> {saving ? 'Adding…' : 'Add to Pipeline'}
                  </button>
                  <button onClick={() => setTab('contact')} style={{ padding: '11px 16px', borderRadius: 12, border: '1px solid var(--line)', background: 'var(--panel)', fontWeight: 600, fontSize: 13, cursor: 'pointer', color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>
                    + Contact Info
                  </button>
                  <button onClick={onClose} style={{ padding: '11px 16px', borderRadius: 12, border: '1px solid var(--line)', background: 'var(--panel)', fontWeight: 600, fontSize: 13, cursor: 'pointer', color: 'var(--ink-1)' }}>
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>}
      </div>
    </div>
  )
}
