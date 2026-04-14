import { useState, useEffect } from 'react'
import { Calculator, Info, Save, Check, Plus, ArrowRight } from 'lucide-react'
import { calculateDeal, getScoreColor, getScoreLabel, getSizeBucket } from '../lib/scoring'
import { supabase } from '../lib/supabase'

const DENSITY_OPTIONS = [
  { value: 'Low',    label: 'Low',    desc: 'Minimalist — mostly empty rooms' },
  { value: 'Medium', label: 'Medium', desc: 'Normal clutter — average household' },
  { value: 'High',   label: 'High',   desc: 'Heavy clutter / hoarder conditions' },
]

const JOB_TYPE_OPTIONS = [
  { value: 'Clean Out', label: 'Clean Out Only',      desc: 'Labour-focused, no auction' },
  { value: 'Auction',   label: 'Auction Only',        desc: 'Sell items, no cleanout' },
  { value: 'Both',      label: 'Clean Out + Auction', desc: 'Full-service premium job' },
]

function FormSection({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 14 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function InputRow({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <label style={{ fontSize: 13, fontWeight: 500, color: '#c4c8e8' }}>{label}</label>
        {hint && (
          <span title={hint} style={{ cursor: 'help' }}>
            <Info size={12} color="#555b75" />
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%',
  background: '#0f1117',
  border: '1px solid #2a2f45',
  borderRadius: 9,
  padding: '10px 13px',
  fontSize: 14,
  color: '#f0f2ff',
  outline: 'none',
  transition: 'border-color 0.15s',
}

function ScoreGauge({ score }) {
  const color = getScoreColor(score)
  const label = getScoreLabel(score)
  const pct = (score / 10) * 100

  return (
    <div style={{ textAlign: 'center', marginBottom: 28 }}>
      <div style={{ position: 'relative', display: 'inline-block', marginBottom: 12 }}>
        <svg width={160} height={160} viewBox="0 0 160 160">
          <circle cx={80} cy={80} r={65} fill="none" stroke="#2a2f45" strokeWidth={10}
            strokeDasharray={`${2 * Math.PI * 65 * 0.75} ${2 * Math.PI * 65 * 0.25}`}
            strokeDashoffset={2 * Math.PI * 65 * 0.125} strokeLinecap="round" transform="rotate(135 80 80)" />
          <circle cx={80} cy={80} r={65} fill="none" stroke={color} strokeWidth={10}
            strokeDasharray={`${2 * Math.PI * 65 * 0.75 * (pct / 100)} ${2 * Math.PI * 65}`}
            strokeDashoffset={2 * Math.PI * 65 * 0.125} strokeLinecap="round" transform="rotate(135 80 80)"
            style={{ transition: 'stroke-dasharray 0.6s ease, stroke 0.4s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 10 }}>
          <div style={{ fontSize: 38, fontWeight: 800, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{score.toFixed(1)}</div>
          <div style={{ fontSize: 12, color: '#8b8fa8', marginTop: 2 }}>/ 10</div>
        </div>
      </div>
      <div style={{ display: 'inline-block', background: `${color}18`, border: `1px solid ${color}40`, borderRadius: 20, padding: '4px 14px', fontSize: 13, fontWeight: 600, color }}>
        {label}
      </div>
    </div>
  )
}

function ResultRow({ label, value, color, bold, topBorder }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderTop: topBorder ? '1px solid #2a2f45' : 'none', borderBottom: '1px solid #2a2f45' }}>
      <span style={{ fontSize: 13, color: '#8b8fa8' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: bold ? 700 : 500, color: color || '#f0f2ff' }}>{value}</span>
    </div>
  )
}

const BREAKDOWN_COLORS = { size: '#6366f1', density: '#8b5cf6', quality: '#06b6d4', profit: '#22c55e', jobType: '#f59e0b' }
const BREAKDOWN_META = [
  { key: 'size',    label: 'Size Score',     hint: 'Weight: 20%' },
  { key: 'density', label: 'Density Score',  hint: 'Weight: 15%' },
  { key: 'quality', label: 'Item Quality',   hint: 'Weight: 30%' },
  { key: 'profit',  label: 'Profit Margin',  hint: 'Weight: 25%' },
  { key: 'jobType', label: 'Job Type Bonus', hint: 'Weight: 10%' },
]

// ── Add to Pipeline modal ──────────────────────────────────────
function AddToPipelineModal({ scorerForm, result, onClose, onAdded }) {
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
      name:               name.trim(),
      phone:              phone || null,
      email:              email || null,
      address:            address || null,
      zip_code:           scorerForm.zipCode || null,
      status:             'New Lead',
      square_footage:     Number(scorerForm.sqft),
      density:            scorerForm.density,
      item_quality_score: Number(scorerForm.itemQuality),
      job_type:           scorerForm.jobType,
      deal_score:         result.dealScore,
    }).select().single()
    setSaving(false)
    if (error) { setError(error.message); return }
    onAdded(data)
    onClose()
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: '#1a1d27', border: '1px solid #2a2f45', borderRadius: 14, width: '100%', maxWidth: 440, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #2a2f45' }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#f0f2ff' }}>Add to Pipeline</div>
          <div style={{ fontSize: 12, color: '#555b75', marginTop: 3 }}>
            Job details pre-filled from scorer · Deal Score {result.dealScore.toFixed(1)}
          </div>
        </div>

        {/* Pre-filled job summary */}
        <div style={{ margin: '16px 20px 0', padding: '10px 14px', background: '#0f1117', borderRadius: 8, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Size',    value: `${Number(scorerForm.sqft).toLocaleString()} sqft` },
            { label: 'Type',    value: scorerForm.jobType },
            { label: 'Density', value: scorerForm.density },
            { label: 'Bid',     value: `$${result.recommendedBid.toLocaleString()}` },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#555b75', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#a5b4fc', marginTop: 2 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Contact fields */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'Contact Name *', value: name, set: setName, placeholder: 'Full name', required: true },
            { label: 'Phone',          value: phone, set: setPhone, placeholder: '(xxx) xxx-xxxx' },
            { label: 'Email',          value: email, set: setEmail, placeholder: 'email@example.com' },
            { label: 'Address',        value: address, set: setAddress, placeholder: 'Street address' },
          ].map(({ label, value, set, placeholder }) => (
            <div key={label}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555b75', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>{label}</label>
              <input
                value={value}
                onChange={e => set(e.target.value)}
                placeholder={placeholder}
                style={{ ...inputStyle, fontSize: 13, padding: '8px 11px' }}
              />
            </div>
          ))}
          {error && <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #2a2f45', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid #2a2f45', borderRadius: 8, padding: '8px 18px', color: '#8b8fa8', fontSize: 13, cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || !name.trim()}
            style={{ background: name.trim() ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#2a2f45', border: 'none', borderRadius: 8, padding: '8px 20px', color: name.trim() ? '#fff' : '#555b75', fontSize: 13, fontWeight: 600, cursor: name.trim() ? 'pointer' : 'not-allowed', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={14} />
            {saving ? 'Creating…' : 'Create Lead'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Historical reference panel ────────────────────────────────
function HistoricalRef({ sqft, density, jobType }) {
  const [similar, setSimilar] = useState(null)

  useEffect(() => {
    if (!sqft || !density) return
    const size = getSizeBucket(Number(sqft))
    supabase
      .from('past_projects')
      .select('actual_labor_hours, actual_bid, actual_profit, square_footage')
      .eq('density', density)
      .then(({ data }) => {
        if (!data?.length) { setSimilar(null); return }
        const matches = data.filter(p => getSizeBucket(p.square_footage) === size)
        if (!matches.length) { setSimilar(null); return }
        const withHours  = matches.filter(p => p.actual_labor_hours)
        const withBid    = matches.filter(p => p.actual_bid)
        const withProfit = matches.filter(p => p.actual_profit != null)
        setSimilar({
          count:     matches.length,
          avgHours:  withHours.length  ? Math.round(withHours.reduce((s, p) => s + p.actual_labor_hours, 0) / withHours.length)  : null,
          avgBid:    withBid.length    ? Math.round(withBid.reduce((s, p) => s + p.actual_bid, 0) / withBid.length)              : null,
          avgProfit: withProfit.length ? Math.round(withProfit.reduce((s, p) => s + p.actual_profit, 0) / withProfit.length)     : null,
        })
      })
  }, [sqft, density])

  if (!similar) return null

  return (
    <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: '12px 14px', marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
        Historical Reference ({similar.count} similar job{similar.count !== 1 ? 's' : ''})
      </div>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Avg Labor Hours', value: similar.avgHours  != null ? `${similar.avgHours} hrs` : '—' },
          { label: 'Avg Actual Bid',  value: similar.avgBid    != null ? `$${similar.avgBid.toLocaleString()}` : '—' },
          { label: 'Avg Profit',      value: similar.avgProfit != null ? `$${similar.avgProfit.toLocaleString()}` : '—' },
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#555b75', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#a5b4fc', marginTop: 3 }}>{value}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: '#555b75', marginTop: 8 }}>
        Matched by size bucket ({getSizeBucket(Number(sqft))}) + {density} density · from Past Projects
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────
export default function DealScorer() {
  const [form, setForm] = useState({
    sqft: '',
    density: 'Medium',
    zipCode: '',
    itemQuality: 7,
    jobType: 'Both',
  })
  const [result, setResult]           = useState(null)
  const [saveState, setSaveState]     = useState('idle') // idle | saving | saved | error
  const [showAddModal, setShowAddModal] = useState(false)
  const [addedLead, setAddedLead]     = useState(null)

  function set(key, value) {
    setForm(f => ({ ...f, [key]: value }))
    setResult(null)
    setSaveState('idle')
    setAddedLead(null)
  }

  function calculate() {
    if (!form.sqft || isNaN(Number(form.sqft))) return
    const r = calculateDeal({
      sqft: Number(form.sqft),
      density: form.density,
      itemQuality: Number(form.itemQuality),
      jobType: form.jobType,
      zipCode: form.zipCode,
    })
    setResult(r)
    setSaveState('idle')
    setAddedLead(null)
  }

  async function handleSave() {
    if (!result) return
    setSaveState('saving')
    const { error } = await supabase.from('deal_scores').insert({
      square_footage:         Number(form.sqft),
      density:                form.density,
      zip_code:               form.zipCode || null,
      item_quality:           Number(form.itemQuality),
      job_type:               form.jobType,
      estimated_labour_hours: result.labourHours,
      estimated_labour_cost:  result.labourCost,
      overhead_cost:          result.overheadCost,
      recommended_bid:        result.recommendedBid,
      estimated_profit:       result.estimatedProfit,
      deal_score:             result.dealScore,
    })
    if (error) {
      console.error('Save error:', error)
      setSaveState('error')
    } else {
      setSaveState('saved')
    }
  }

  const canCalculate = form.sqft && !isNaN(Number(form.sqft)) && Number(form.sqft) > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid #2a2f45', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, background: 'rgba(99,102,241,0.15)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calculator size={18} color="#6366f1" />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f0f2ff', margin: 0 }}>Deal Scorer</h1>
            <p style={{ fontSize: 13, color: '#555b75', margin: 0 }}>Calculate estimated labour, costs, and deal quality</p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Form */}
        <div style={{ width: 380, flexShrink: 0, borderRight: '1px solid #2a2f45', padding: '24px 26px', overflowY: 'auto' }}>
          <FormSection title="Property">
            <InputRow label="Square Footage" hint="Total area being cleaned out or liquidated">
              <input
                type="number" placeholder="e.g. 2400" value={form.sqft}
                onChange={e => set('sqft', e.target.value)} style={inputStyle}
              />
              {form.sqft && !isNaN(Number(form.sqft)) && (
                <div style={{ fontSize: 11, color: '#555b75', marginTop: 4 }}>
                  Size bucket: <strong style={{ color: '#8b8fa8' }}>{getSizeBucket(Number(form.sqft))}</strong>
                </div>
              )}
            </InputRow>

            <InputRow label="Property Density" hint="How cluttered is the space?">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {DENSITY_OPTIONS.map(opt => (
                  <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', background: form.density === opt.value ? 'rgba(99,102,241,0.12)' : '#0f1117', border: `1px solid ${form.density === opt.value ? 'rgba(99,102,241,0.5)' : '#2a2f45'}`, borderRadius: 9, cursor: 'pointer', transition: 'all 0.15s' }}>
                    <input type="radio" name="density" value={opt.value} checked={form.density === opt.value} onChange={() => set('density', opt.value)} style={{ accentColor: '#6366f1' }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: form.density === opt.value ? '#a5b4fc' : '#f0f2ff' }}>{opt.label}</div>
                      <div style={{ fontSize: 11, color: '#555b75' }}>{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </InputRow>

            <InputRow label="ZIP Code" hint="Used for deal desirability scoring (coming soon)">
              <input type="text" placeholder="e.g. 60625" value={form.zipCode} onChange={e => set('zipCode', e.target.value)} style={inputStyle} />
            </InputRow>
          </FormSection>

          <FormSection title="Deal Factors">
            <InputRow label={`Item Quality — ${form.itemQuality}/10`} hint="10 = jewelry, coins, antiques | 3 = random household items">
              <input type="range" min={1} max={10} step={1} value={form.itemQuality} onChange={e => set('itemQuality', e.target.value)} style={{ width: '100%', accentColor: '#6366f1', cursor: 'pointer' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#555b75', marginTop: 2 }}>
                <span>1 — Low value</span>
                <span>10 — High value</span>
              </div>
              {[
                [1, 3,   'Random low-value household items'],
                [4, 5,   'Standard furniture and appliances'],
                [6, 7,   'Some antiques, decent quality'],
                [8, 9,   'Antiques, collectibles, jewelry'],
                [10, 10, 'Rare collectibles, fine jewelry, coins'],
              ].map(([min, max, desc]) =>
                form.itemQuality >= min && form.itemQuality <= max ? (
                  <div key={min} style={{ fontSize: 11, color: '#8b8fa8', marginTop: 6, padding: '4px 8px', background: '#1e2235', borderRadius: 5 }}>{desc}</div>
                ) : null
              )}
            </InputRow>

            <InputRow label="Job Type">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {JOB_TYPE_OPTIONS.map(opt => (
                  <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', background: form.jobType === opt.value ? 'rgba(99,102,241,0.12)' : '#0f1117', border: `1px solid ${form.jobType === opt.value ? 'rgba(99,102,241,0.5)' : '#2a2f45'}`, borderRadius: 9, cursor: 'pointer', transition: 'all 0.15s' }}>
                    <input type="radio" name="jobType" value={opt.value} checked={form.jobType === opt.value} onChange={() => set('jobType', opt.value)} style={{ accentColor: '#6366f1' }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: form.jobType === opt.value ? '#a5b4fc' : '#f0f2ff' }}>{opt.label}</div>
                      <div style={{ fontSize: 11, color: '#555b75' }}>{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </InputRow>
          </FormSection>

          <button
            onClick={calculate}
            disabled={!canCalculate}
            style={{ width: '100%', background: canCalculate ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#2a2f45', border: 'none', borderRadius: 10, padding: '13px', color: canCalculate ? '#fff' : '#555b75', fontSize: 14, fontWeight: 700, cursor: canCalculate ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.15s' }}
          >
            <Calculator size={15} />
            Calculate Deal Score
          </button>
        </div>

        {/* Results panel */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
          {!result ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#555b75' }}>
              <Calculator size={40} color="#2a2f45" />
              <div style={{ fontSize: 14 }}>Fill in the form and click Calculate to see results</div>
            </div>
          ) : (
            <div style={{ maxWidth: 580 }}>
              <ScoreGauge score={result.dealScore} />

              {/* Historical reference — shows when past projects exist for this size+density */}
              <HistoricalRef sqft={form.sqft} density={form.density} jobType={form.jobType} />

              {/* Financials */}
              <div style={{ background: '#1e2235', border: '1px solid #2a2f45', borderRadius: 12, padding: '18px 20px', marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>
                  Financial Breakdown
                </div>
                <ResultRow label="Estimated Labour Hours" value={`${result.labourHours} hrs`} />
                <ResultRow label="Labour Cost (@ $22/hr)"  value={`$${result.labourCost.toLocaleString()}`} />
                <ResultRow label="Overhead (20%)"          value={`$${result.overheadCost.toLocaleString()}`} />
                <ResultRow label="Total Cost"              value={`$${result.totalCost.toLocaleString()}`} bold topBorder />
                <ResultRow label="Recommended Bid"         value={`$${result.recommendedBid.toLocaleString()}`} color="#22c55e" bold />
                <ResultRow label="Estimated Profit"        value={`$${result.estimatedProfit.toLocaleString()}`} color={result.estimatedProfit > 0 ? '#22c55e' : '#ef4444'} bold />
                <ResultRow label="Profit Margin"           value={`${result.profitMarginPct}%`} />
                <div style={{ marginTop: 14, padding: '10px 14px', background: '#0f1117', borderRadius: 8, fontSize: 12, color: '#8b8fa8', lineHeight: 1.5 }}>
                  <strong style={{ color: '#f0f2ff' }}>Size Bucket:</strong> {result.size} &nbsp;·&nbsp;
                  <strong style={{ color: '#f0f2ff' }}>Labour estimate</strong> is based on {form.sqft} sqft × {form.density.toLowerCase()} density.
                </div>
              </div>

              {/* Score breakdown */}
              <div style={{ background: '#1e2235', border: '1px solid #2a2f45', borderRadius: 12, padding: '18px 20px', marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                  Score Breakdown
                </div>
                <div style={{ fontSize: 11, color: '#555b75', marginBottom: 16 }}>
                  Weighted components — adjust weights in <code style={{ background: '#0f1117', borderRadius: 4, padding: '1px 5px', fontSize: 11 }}>src/lib/scoring.js</code>
                </div>
                {BREAKDOWN_META.map(({ key, label }) => {
                  const { raw, weight, weighted } = result.scoreBreakdown[key]
                  const color = BREAKDOWN_COLORS[key]
                  const pct = (weighted / (weight * 10)) * 100
                  return (
                    <div key={key} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                        <div>
                          <span style={{ fontSize: 13, color: '#c4c8e8', fontWeight: 500 }}>{label}</span>
                          <span style={{ fontSize: 11, color: '#555b75', marginLeft: 8 }}>raw {raw}/10 × {(weight * 100).toFixed(0)}% weight</span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color }}>+{weighted}</span>
                      </div>
                      <div style={{ background: '#2a2f45', borderRadius: 4, height: 7, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  )
                })}
                <div style={{ borderTop: '1px solid #2a2f45', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#8b8fa8' }}>Total Score</span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: getScoreColor(result.dealScore) }}>{result.dealScore.toFixed(1)} / 10</span>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 10 }}>
                {/* Add to Pipeline */}
                {addedLead ? (
                  <div style={{ flex: 1, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Check size={15} color="#4ade80" />
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#4ade80' }}>Added: {addedLead.name}</span>
                    </div>
                    <a href="/" style={{ fontSize: 12, color: '#4ade80', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                      View in Pipeline <ArrowRight size={12} />
                    </a>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddModal(true)}
                    style={{ flex: 1, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: 10, padding: '12px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    <Plus size={15} />
                    Add to Pipeline
                  </button>
                )}

                {/* Save score */}
                <button
                  onClick={handleSave}
                  disabled={saveState === 'saving' || saveState === 'saved'}
                  style={{ background: saveState === 'saved' ? 'rgba(34,197,94,0.12)' : saveState === 'error' ? 'rgba(239,68,68,0.12)' : '#1e2235', border: `1px solid ${saveState === 'saved' ? 'rgba(34,197,94,0.3)' : saveState === 'error' ? 'rgba(239,68,68,0.3)' : '#2a2f45'}`, borderRadius: 10, padding: '12px 18px', color: saveState === 'saved' ? '#4ade80' : saveState === 'error' ? '#f87171' : '#8b8fa8', fontSize: 13, fontWeight: 600, cursor: saveState === 'saving' || saveState === 'saved' ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', opacity: saveState === 'saving' ? 0.7 : 1, whiteSpace: 'nowrap' }}
                >
                  {saveState === 'saved' ? <Check size={14} /> : <Save size={14} />}
                  {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : saveState === 'error' ? 'Retry' : 'Save Score'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <AddToPipelineModal
          scorerForm={form}
          result={result}
          onClose={() => setShowAddModal(false)}
          onAdded={lead => setAddedLead(lead)}
        />
      )}
    </div>
  )
}
