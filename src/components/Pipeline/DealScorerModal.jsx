import { useState } from 'react'
import { X, Plus, Settings } from 'lucide-react'
import { calculateDeal, getScoreColor, getScoreLabel } from '../../lib/scoring'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'

const DENSITY_OPTIONS = [
  { value: 'Low',    label: 'Low',    desc: 'Mostly empty rooms'        },
  { value: 'Medium', label: 'Medium', desc: 'Average household clutter' },
  { value: 'High',   label: 'High',   desc: 'Heavy / hoarder conditions'},
]

const JOB_TYPE_OPTIONS = [
  { value: 'Clean Out', label: 'Clean Out Only',      desc: 'Labor-focused, no auction'   },
  { value: 'Auction',   label: 'Auction Only',        desc: 'Sell items, no cleanout'     },
  { value: 'Both',      label: 'Clean Out + Auction', desc: 'Full-service premium job'    },
]

const inputStyle = {
  width: '100%', background: 'var(--bg)', border: '1px solid var(--line)',
  borderRadius: 9, padding: '8px 11px', fontSize: 13, color: 'var(--ink-1)',
  outline: 'none', fontFamily: 'inherit',
}

function RadioCard({ option, checked, onChange }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '9px 13px',
      background: checked ? 'var(--accent-soft)' : 'var(--bg)',
      border: `1px solid ${checked ? 'var(--accent)' : 'var(--line)'}`,
      borderLeft: `3px solid ${checked ? 'var(--accent)' : 'transparent'}`,
      borderRadius: 9, cursor: 'pointer', transition: 'all 0.15s', marginBottom: 6,
    }}>
      <input type="radio" value={option.value} checked={checked} onChange={onChange}
        style={{ accentColor: 'var(--accent)', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: checked ? 'var(--accent-ink)' : 'var(--ink-1)' }}>{option.label}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 1 }}>{option.desc}</div>
      </div>
    </label>
  )
}

function BreakdownRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--line-2)', fontSize: 12.5 }}>
      <span style={{ color: 'var(--ink-3)' }}>{label}</span>
      <span style={{ color: 'var(--ink-1)', fontWeight: 500 }} className="tnum">{value}</span>
    </div>
  )
}

export default function DealScorerModal({ onClose, onSaved }) {
  const { organizationId } = useAuth()
  const [sqft, setSqft]               = useState('')
  const [density, setDensity]         = useState('Medium')
  const [itemQuality, setItemQuality] = useState(7)
  const [jobType, setJobType]         = useState('Both')
  const [zipCode, setZipCode]         = useState('')
  const [result, setResult]           = useState(null)
  const [saving, setSaving]           = useState(false)

  function calculate() {
    if (!sqft) return
    const r = calculateDeal({ sqft: Number(sqft), density, itemQuality: Number(itemQuality), jobType, zipCode })
    setResult(r)
  }

  async function handleAddToPipeline() {
    if (!result) return
    setSaving(true)
    await supabase.from('leads').insert({
      name: 'New Lead', status: 'New Lead',
      square_footage: Number(sqft), density,
      item_quality_score: Number(itemQuality), job_type: jobType,
      zip_code: zipCode || null, deal_score: result.dealScore,
      organization_id: organizationId,
    })
    setSaving(false)
    onSaved?.()
    onClose()
  }

  async function handleSave() {
    if (!result) return
    setSaving(true)
    await supabase.from('leads').insert({
      name: 'Scored Deal', status: 'New Lead',
      square_footage: Number(sqft), density,
      item_quality_score: Number(itemQuality), job_type: jobType,
      zip_code: zipCode || null, deal_score: result.dealScore,
      organization_id: organizationId,
    })
    setSaving(false)
    onSaved?.()
    onClose()
  }

  const scoreColor = result ? getScoreColor(result.dealScore) : 'var(--ink-4)'
  const scoreLabel = result ? getScoreLabel(result.dealScore) : ''
  const scorePct   = result ? (result.dealScore / 10) * 100 : 0

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'var(--overlay)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'fadein 150ms' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 18, boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 900, maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Modal header */}
        <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <Settings size={14} strokeWidth={1.8} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-1)' }}>New Project — Deal Scorer</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Estimate labor, costs, and deal quality</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--ink-3)' }}>
            <X size={15} strokeWidth={1.8} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>

          {/* Left: Form */}
          <div style={{ width: 320, flexShrink: 0, overflowY: 'auto', padding: '20px 22px', borderRight: '1px solid var(--line)' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-1)', marginBottom: 4 }}>Deal Scorer</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 20 }}>Estimate labor, costs, and deal quality before your consult.</div>

            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Property</div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>Square Footage</label>
              <input type="number" value={sqft} onChange={e => setSqft(e.target.value)} placeholder="2100" style={inputStyle} />
              {sqft && <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 4 }}>Size bucket: <strong>{sqft < 1000 ? 'Small' : sqft < 2000 ? 'Small' : sqft < 3000 ? 'Medium' : sqft < 4500 ? 'Large' : 'XL'}</strong></div>}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>Property Density</label>
              {DENSITY_OPTIONS.map(opt => (
                <RadioCard key={opt.value} option={opt} checked={density === opt.value} onChange={() => setDensity(opt.value)} />
              ))}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>ZIP Code</label>
              <input value={zipCode} onChange={e => setZipCode(e.target.value)} placeholder="80120" style={inputStyle} />
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, marginTop: 4 }}>Deal Factors</div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>
                Item Quality — {itemQuality} / 10
              </label>
              <input type="range" min={1} max={10} value={itemQuality} onChange={e => setItemQuality(e.target.value)}
                style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--ink-4)', marginTop: 2 }}>
                <span>1 — Low value</span><span>10 — High value</span>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>Job Type</label>
              {JOB_TYPE_OPTIONS.map(opt => (
                <RadioCard key={opt.value} option={opt} checked={jobType === opt.value} onChange={() => setJobType(opt.value)} />
              ))}
            </div>

            <button
              onClick={calculate}
              disabled={!sqft}
              style={{
                width: '100%', padding: '11px', borderRadius: 10, border: 'none',
                background: sqft ? 'var(--accent)' : 'var(--line)',
                color: sqft ? 'white' : 'var(--ink-4)',
                fontSize: 13.5, fontWeight: 700, cursor: sqft ? 'pointer' : 'not-allowed',
                transition: 'background 0.15s',
              }}
            >
              Calculate Deal Score
            </button>
          </div>

          {/* Right: Results */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '28px 28px' }}>
            {!result ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: 'var(--ink-4)' }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--bg)', border: '2px dashed var(--line)', display: 'grid', placeItems: 'center', fontSize: 32 }}>⚡</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Fill in the form and click Calculate</div>
                <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>Your deal score and projections will appear here.</div>
              </div>
            ) : (
              <>
                {/* Score circle + bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
                  <div style={{
                    width: 76, height: 76, borderRadius: '50%', flexShrink: 0,
                    background: `${scoreColor}18`, border: `3px solid ${scoreColor}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 26, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{result.dealScore.toFixed(1)}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: 'var(--ink-4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>DEAL SCORE</div>
                    <div style={{ background: 'var(--line)', borderRadius: 4, height: 7, overflow: 'hidden', marginBottom: 8 }}>
                      <div style={{ width: `${scorePct}%`, height: '100%', background: scoreColor, borderRadius: 4, transition: 'width 0.6s ease' }} />
                    </div>
                    <span style={{ display: 'inline-block', background: `${scoreColor}18`, border: `1px solid ${scoreColor}40`, borderRadius: 20, padding: '3px 12px', fontSize: 13, fontWeight: 700, color: scoreColor }}>
                      {scoreLabel}
                    </span>
                  </div>
                </div>

                {/* Recommended bid */}
                <div style={{
                  background: 'linear-gradient(135deg, #0a4d6b 0%, #0e7490 100%)',
                  borderRadius: 14, padding: '18px 22px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
                }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6, fontWeight: 600 }}>RECOMMENDED BID</div>
                    <div style={{ fontSize: 36, fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-1px' }}>
                      ${result.recommendedBid.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Size bucket</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{result.size}</div>
                  </div>
                </div>

                {/* 2×2 metric grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                  {[
                    { label: 'EST. PROFIT',    value: `$${result.estimatedProfit.toLocaleString()}`,  color: result.estimatedProfit > 0 ? 'var(--win)' : 'var(--lose)' },
                    { label: 'PROFIT MARGIN',  value: `${result.profitMarginPct}%`,                   color: 'var(--ink-1)' },
                    { label: 'LABOR COST',     value: `$${result.labourCost.toLocaleString()}`,        sub: `+ $${result.overheadCost.toLocaleString()} overhead = $${result.totalCost.toLocaleString()} total` },
                    { label: 'LABOR HOURS',    value: `${result.labourHours} hrs`,                    sub: `$22/hr · ${density.toLowerCase()} property` },
                  ].map(({ label, value, sub, color }) => (
                    <div key={label} style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 16px' }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>{label}</div>
                      <div className="tnum" style={{ fontSize: 22, fontWeight: 800, color: color || 'var(--ink-1)', lineHeight: 1 }}>{value}</div>
                      {sub && <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 5 }}>{sub}</div>}
                    </div>
                  ))}
                </div>

                {/* Calculation breakdown */}
                <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>CALCULATION BREAKDOWN</div>
                  <BreakdownRow label="Property size"       value={`${Number(sqft).toLocaleString()} sq ft`} />
                  <BreakdownRow label="Density multiplier"  value={density === 'Low' ? '0.85×' : density === 'Medium' ? '1×' : '1.2×'} />
                  <BreakdownRow label="Job type multiplier" value={jobType === 'Clean Out' ? '1×' : jobType === 'Auction' ? '1.1×' : '1.3×'} />
                  <BreakdownRow label="Item quality factor" value={`${(0.8 + (Number(itemQuality) / 10) * 0.7).toFixed(2)}×`} />
                  <BreakdownRow label="ZIP cost index"      value={`${zipCode || '—'} · standard`} />
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={handleAddToPipeline}
                    disabled={saving}
                    style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: 'white', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
                  >
                    <Plus size={15} /> Add to Pipeline
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{ padding: '11px 20px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--ink-2)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Save
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
