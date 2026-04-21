import { useState } from 'react'
import { X, Plus, Sparkles } from 'lucide-react'
import { calculateDeal, getScoreColor, getScoreLabel, getSizeBucket } from '../../lib/scoring'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'

const DENSITY_OPTIONS = [
  { id: 'Low',    title: 'Low',    sub: 'Mostly empty rooms' },
  { id: 'Medium', title: 'Medium', sub: 'Average household clutter' },
  { id: 'High',   title: 'High',   sub: 'Heavy / hoarder conditions' },
]

const JOB_TYPE_OPTIONS = [
  { id: 'Clean Out', title: 'Clean Out Only',      sub: 'Labor-focused, no auction' },
  { id: 'Auction',   title: 'Auction Only',        sub: 'Sell items, no cleanout' },
  { id: 'Both',      title: 'Clean Out + Auction', sub: 'Full-service premium job' },
]

const DENSITY_MULT = { Low: 0.7, Medium: 1.0, High: 1.45 }
const JOB_MULT     = { 'Clean Out': 0.85, Auction: 1.1, Both: 1.3 }

// ── Shared design components ───────────────────────────────────

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
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500 }}>Item Quality</span>
        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 18, fontWeight: 600, color: tier.color, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
          <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>/ 10</span>
        </span>
      </div>

      <div style={{ position: 'relative', height: 28 }}>
        <div style={{
          position: 'absolute', top: 11, left: 0, right: 0, height: 6, borderRadius: 999,
          background: 'linear-gradient(90deg, color-mix(in oklab, var(--lose) 18%, var(--line-2)) 0%, color-mix(in oklab, var(--warn) 18%, var(--line-2)) 45%, color-mix(in oklab, var(--accent) 18%, var(--line-2)) 70%, color-mix(in oklab, var(--win) 22%, var(--line-2)) 100%)',
        }} />
        <div style={{
          position: 'absolute', top: 11, left: 0, width: `${pct}%`, height: 6, borderRadius: 999,
          background: `linear-gradient(90deg, color-mix(in oklab, var(--lose) 70%, ${tier.color}) 0%, ${tier.color} 100%)`,
          transition: 'width 160ms ease',
        }} />
        <div style={{ position: 'absolute', top: 11, left: 0, right: 0, height: 6, display: 'flex', justifyContent: 'space-between', pointerEvents: 'none' }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} style={{ width: 2, height: 6, background: i + 1 <= value ? 'rgba(255,255,255,0.5)' : 'var(--ink-4)', opacity: i === 0 || i === 9 ? 0 : 0.35 }} />
          ))}
        </div>
        <div style={{
          position: 'absolute', top: 4, left: `calc(${pct}% - 10px)`,
          width: 20, height: 20, borderRadius: '50%',
          background: 'var(--panel)', border: `2.5px solid ${tier.color}`,
          boxShadow: '0 2px 6px rgba(20,22,26,0.15)',
          pointerEvents: 'none', transition: 'left 160ms ease',
        }} />
        <input type="range" min="1" max="10" step="1" value={value}
          onChange={e => onChange(+e.target.value)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', margin: 0 }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2, padding: '0 2px' }}>
        {[1, 3, 5, 7, 10].map(n => (
          <span key={n} style={{ fontSize: 10, fontVariantNumeric: 'tabular-nums', color: n === value ? tier.color : 'var(--ink-4)', fontWeight: n === value ? 700 : 500 }}>{n}</span>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, padding: '10px 12px', borderRadius: 10, background: tier.bg, border: `1px solid color-mix(in oklab, ${tier.color} 18%, var(--line))` }}>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: tier.color, background: 'var(--panel)', padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.06em', boxShadow: '0 1px 0 rgba(20,22,26,0.04)', flexShrink: 0 }}>{tier.label}</span>
        <span style={{ fontSize: 11.5, color: 'var(--ink-2)', lineHeight: 1.35 }}>{tier.hint}</span>
      </div>
    </div>
  )
}

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
  const [added, setAdded]             = useState(false)

  function calculate() {
    if (!sqft) return
    setResult(calculateDeal({ sqft: Number(sqft), density, itemQuality: Number(itemQuality), jobType, zipCode }))
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
    setAdded(true)
    onSaved?.()
  }

  const scoreColor = result ? getScoreColor(result.dealScore) : 'var(--ink-4)'
  const scoreLabel = result ? getScoreLabel(result.dealScore) : ''
  const scoreBg = result
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
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
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

        {/* Body */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', minHeight: 0 }}>

          {/* Left: Form */}
          <div style={{ width: 360, flexShrink: 0, overflowY: 'auto', padding: '20px 24px', borderRight: '1px solid var(--line)', background: 'var(--panel)' }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink-1)' }}>Deal Scorer</h2>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.45 }}>Estimate labor, costs, and deal quality before your consult.</p>

            <div style={{ fontSize: 10.5, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Property</div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500, marginBottom: 6 }}>Square Footage</div>
              <input type="number" value={sqft} onChange={e => setSqft(e.target.value)} placeholder="e.g. 2400"
                style={{ width: '100%', padding: '10px 12px', fontSize: 13, border: '1px solid var(--line)', borderRadius: 10, background: 'var(--bg)', outline: 'none', color: 'var(--ink-1)', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              {sqft && !isNaN(Number(sqft)) && Number(sqft) > 0 && (
                <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 4 }}>Size bucket: <strong style={{ color: 'var(--ink-1)' }}>{getSizeBucket(Number(sqft))}</strong></div>
              )}
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500, marginBottom: 6 }}>Property Density</div>
              <RadioStack options={DENSITY_OPTIONS} value={density} onChange={setDensity} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500, marginBottom: 6 }}>ZIP Code</div>
              <input value={zipCode} onChange={e => setZipCode(e.target.value)} placeholder="e.g. 80015"
                style={{ width: '100%', padding: '10px 12px', fontSize: 13, border: '1px solid var(--line)', borderRadius: 10, background: 'var(--bg)', outline: 'none', color: 'var(--ink-1)', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>

            <div style={{ fontSize: 10.5, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '20px 0 10px' }}>Deal factors</div>

            <QualitySlider value={itemQuality} onChange={setItemQuality} />

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500, marginBottom: 6 }}>Job Type</div>
              <RadioStack options={JOB_TYPE_OPTIONS} value={jobType} onChange={setJobType} />
            </div>

            <button onClick={calculate} disabled={!sqft} style={{
              width: '100%', padding: '12px', borderRadius: 12, border: 'none',
              background: sqft ? 'var(--accent)' : 'var(--line)',
              color: sqft ? 'white' : 'var(--ink-4)',
              fontWeight: 600, fontSize: 13.5, cursor: sqft ? 'pointer' : 'not-allowed',
              boxShadow: sqft ? '0 1px 0 rgba(255,255,255,0.15) inset, 0 2px 6px rgba(43,68,104,0.2)' : 'none',
            }}>Calculate Deal Score</button>
          </div>

          {/* Right: Results */}
          <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '22px 28px 28px' }}>
            {!result ? (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-4)', fontSize: 13 }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', marginBottom: 12 }}>
                  <Sparkles size={28} strokeWidth={1.6} />
                </div>
                Fill in the form and click Calculate
              </div>
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
                <div style={{ fontSize: 10.5, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '20px 0 10px' }}>Calculation breakdown</div>
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
                  {added ? (
                    <div style={{ flex: 1, padding: '11px 16px', borderRadius: 12, background: 'color-mix(in oklab, var(--win) 10%, var(--panel))', border: '1px solid color-mix(in oklab, var(--win) 30%, var(--line))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--win)' }}>✓ Added to Pipeline</span>
                      <button onClick={onClose} style={{ fontSize: 12, color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer' }}>Close</button>
                    </div>
                  ) : (
                    <button onClick={handleAddToPipeline} disabled={saving} style={{
                      flex: 1, padding: '11px', borderRadius: 12, border: 'none',
                      background: 'var(--accent)', color: 'white',
                      fontWeight: 600, fontSize: 13, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      opacity: saving ? 0.7 : 1,
                    }}>
                      <Plus size={14} strokeWidth={2} /> {saving ? 'Adding…' : 'Add to Pipeline'}
                    </button>
                  )}
                  <button onClick={onClose} style={{ padding: '11px 20px', borderRadius: 12, border: '1px solid var(--line)', background: 'var(--panel)', fontWeight: 600, fontSize: 13, cursor: 'pointer', color: 'var(--ink-1)' }}>
                    Close
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
