import { useState, useEffect, useRef } from 'react'
import { Info, Save, Check, Plus, ArrowRight, X, ChevronDown, LayoutList, Calculator, Star, TrendingUp } from 'lucide-react'
import { calculateDeal, getScoreColor, getScoreLabel, getSizeBucket } from '../lib/scoring'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useIsMobile } from '../hooks/useIsMobile'
import logger from '../lib/logger'
import { useTheme } from '../lib/ThemeContext'
import { useSearchParams } from 'react-router-dom'

// ── Constants ─────────────────────────────────────────────────

const DENSITY_OPTIONS = [
  { value: 'Low',    label: 'Low',    desc: 'Mostly empty rooms',         color: '#22c55e' },
  { value: 'Medium', label: 'Medium', desc: 'Average household clutter',  color: '#f59e0b' },
  { value: 'High',   label: 'High',   desc: 'Heavy / hoarder conditions', color: '#ef4444' },
]

const JOB_TYPE_OPTIONS = [
  { value: 'Clean Out', label: 'Clean Out Only',      desc: 'Labour-focused, no auction', color: '#71C5E8' },
  { value: 'Auction',   label: 'Auction Only',        desc: 'Sell items, no cleanout',    color: '#f59e0b' },
  { value: 'Both',      label: 'Clean Out + Auction', desc: 'Full-service premium job',   color: '#A50050' },
]

function qualityColor(v) {
  const n = Number(v)
  if (n <= 3) return '#ef4444'
  if (n <= 6) return '#f59e0b'
  if (n <= 8) return '#22c55e'
  return '#14b8a6'
}

// ── Sub-components ─────────────────────────────────────────────

function SectionLabel({ children, txt3 }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 800, color: txt3 || 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.9px', marginBottom: 12, marginTop: 16 }}>
      {children}
    </div>
  )
}

function InputRow({ label, hint, children, txt2, txt3 }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
        <label style={{ fontSize: 13, fontWeight: 500, color: txt2 || 'rgba(255,255,255,0.75)' }}>{label}</label>
        {hint && <span title={hint} style={{ cursor: 'help', lineHeight: 1 }}><Info size={12} color={txt3 || 'rgba(255,255,255,0.3)'} /></span>}
      </div>
      {children}
    </div>
  )
}

// Radio-button card for density / job type
function RadioCard({ name, option, checked, onChange, txt1, txt3, uncheckedBg, uncheckedBorder, dark }) {
  const c = option.color || 'rgba(255,255,255,0.8)'
  const checkedBgAlpha     = dark ? '18' : '2e'
  const checkedBorderAlpha = dark ? '55' : '80'
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '9px 13px',
      background: checked ? `${c}${checkedBgAlpha}` : (uncheckedBg || 'rgba(255,255,255,0.04)'),
      border: `1px solid ${checked ? `${c}${checkedBorderAlpha}` : (uncheckedBorder || 'rgba(255,255,255,0.1)')}`,
      borderLeft: `3px solid ${checked ? c : 'transparent'}`,
      borderRadius: 9,
      cursor: 'pointer',
      transition: 'all 0.15s',
      marginBottom: 6,
    }}>
      <input type="radio" name={name} value={option.value} checked={checked} onChange={onChange} style={{ accentColor: c, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: c, opacity: checked ? 1 : 0.35, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: checked ? (txt1 || '#fff') : (txt3 || 'rgba(255,255,255,0.6)') }}>{option.label}</span>
        </div>
        <div style={{ fontSize: 11, color: txt3 || 'rgba(255,255,255,0.38)', marginTop: 2, paddingLeft: 13 }}>{option.desc}</div>
      </div>
    </label>
  )
}

// ── Skeleton right panel ───────────────────────────────────────

function SkeletonBlock({ h = 20, w = '100%', r = 8, opacity = 0.07, dark = true }) {
  const bg = dark ? `rgba(255,255,255,${opacity})` : `rgba(0,0,0,${opacity})`
  return <div style={{ height: h, width: w, borderRadius: r, background: bg }} />
}

function ResultSkeleton({ dark }) {
  return (
    <div style={{ padding: '40px 36px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Score skeleton */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
        <SkeletonBlock h={72} w={72} r={36} dark={dark} />
        <div style={{ flex: 1 }}>
          <SkeletonBlock h={14} w="50%" r={6} dark={dark} />
          <div style={{ marginTop: 10 }}><SkeletonBlock h={8} r={4} dark={dark} /></div>
          <div style={{ marginTop: 8 }}><SkeletonBlock h={22} w="40%" r={6} dark={dark} /></div>
        </div>
      </div>

      {/* Bid hero */}
      <SkeletonBlock h={88} r={12} opacity={0.05} dark={dark} />

      {/* 2×2 grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
        {[...Array(4)].map((_, i) => <SkeletonBlock key={i} h={76} r={10} opacity={0.05} dark={dark} />)}
      </div>

      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 32 }}>
        <SkeletonBlock h={14} w={14} r={7} dark={dark} />
        <SkeletonBlock h={14} w={160} r={6} opacity={0.05} dark={dark} />
      </div>
      <div style={{ fontSize: 12, color: dark ? 'rgba(255,255,255,0.25)' : 'var(--ink-3)', textAlign: 'center', marginTop: 16 }}>
        Fill in the form and click Calculate
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
            { label: 'Contact Name *', value: name, set: setName, placeholder: 'Full name' },
            { label: 'Phone',          value: phone, set: setPhone, placeholder: '(xxx) xxx-xxxx' },
            { label: 'Email',          value: email, set: setEmail, placeholder: 'email@example.com' },
            { label: 'Address',        value: address, set: setAddress, placeholder: 'Street address' },
          ].map(({ label, value, set, placeholder }) => (
            <div key={label}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>{label}</label>
              <input value={value} onChange={e => set(e.target.value)} placeholder={placeholder}
                style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 7, padding: '8px 11px', fontSize: 13, color: 'var(--ink-1)', outline: 'none' }} />
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

// ── Result panel ───────────────────────────────────────────────

function MetricCard({ label, value, sub, accent, large, fullWidth }) {
  return (
    <div style={{
      background: accent ? accent : 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 12,
      padding: large ? '18px 22px' : '14px 18px',
      gridColumn: fullWidth ? 'span 2' : undefined,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: large ? 32 : 24, fontWeight: 800, color: '#fff', lineHeight: 1, letterSpacing: '-0.5px' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 5 }}>{sub}</div>}
    </div>
  )
}

function ResultPanel({ result, scorerForm, addedLead, onAddToPipeline, saveState, onSaveClick, dark }) {
  const color = getScoreColor(result.dealScore)
  const label = getScoreLabel(result.dealScore)
  const pct   = (result.dealScore / 10) * 100

  const profitColor   = result.estimatedProfit > 0 ? '#4ade80' : '#f87171'
  const cardBg        = dark ? 'rgba(255,255,255,0.06)' : 'var(--panel)'
  const cardBorder    = dark ? 'rgba(255,255,255,0.1)'  : 'var(--line)'
  const labelColor    = dark ? 'rgba(255,255,255,0.45)' : 'var(--ink-3)'
  const valueColor    = dark ? '#fff'                   : 'var(--ink-1)'
  const subColor      = dark ? 'rgba(255,255,255,0.35)' : 'var(--ink-3)'
  const barTrack      = dark ? 'rgba(255,255,255,0.1)'  : 'var(--line)'
  const saveBtnIdle   = dark ? 'rgba(255,255,255,0.08)' : 'var(--panel)'
  const saveBtnBorder = dark ? 'rgba(255,255,255,0.15)' : 'var(--line)'
  const saveBtnColor  = dark ? 'rgba(255,255,255,0.6)'  : 'var(--ink-2)'

  return (
    <div style={{ padding: '36px 36px 28px', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>

      {/* ── Score row ───────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28 }}>
        <div style={{
          width: 76, height: 76, borderRadius: '50%', flexShrink: 0,
          background: `${color}22`, border: `3px solid ${color}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {result.dealScore.toFixed(1)}
          </span>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: labelColor, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
            Deal Score
          </div>
          <div style={{ background: barTrack, borderRadius: 4, height: 6, marginBottom: 8, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
          </div>
          <span style={{ display: 'inline-block', background: `${color}25`, border: `1px solid ${color}50`, borderRadius: 20, padding: '3px 12px', fontSize: 13, fontWeight: 700, color }}>
            {label}
          </span>
        </div>
      </div>

      {/* ── Metric grid ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, flex: 1 }}>

        {/* Recommended Bid — hero, full width */}
        <div style={{
          gridColumn: 'span 2',
          background: 'linear-gradient(135deg, #0a4d6b 0%, #0e7490 100%)',
          border: '1px solid rgba(14,116,144,0.5)',
          borderRadius: 14, padding: '18px 22px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>
              Recommended Bid
            </div>
            <div style={{ fontSize: 38, fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-1px' }}>
              ${result.recommendedBid.toLocaleString()}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Size bucket</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{result.size}</div>
          </div>
        </div>

        {/* Estimated Profit */}
        <div style={{
          background: result.estimatedProfit > 0 ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
          border: `1px solid ${result.estimatedProfit > 0 ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`,
          borderRadius: 12, padding: '14px 18px',
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: labelColor, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Est. Profit</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: profitColor, lineHeight: 1, letterSpacing: '-0.5px' }}>
            ${result.estimatedProfit.toLocaleString()}
          </div>
        </div>

        {/* Profit Margin */}
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: '14px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: labelColor, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Profit Margin</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: valueColor, lineHeight: 1, letterSpacing: '-0.5px' }}>{result.profitMarginPct}%</div>
        </div>

        {/* Labor Cost */}
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: '14px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: labelColor, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Labor Cost</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: valueColor, lineHeight: 1, letterSpacing: '-0.5px' }}>${result.labourCost.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: subColor, marginTop: 5 }}>
            + ${result.overheadCost.toLocaleString()} overhead = ${result.totalCost.toLocaleString()} total
          </div>
        </div>

        {/* Labor Hours */}
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: '14px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: labelColor, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Labor Hours</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: valueColor, lineHeight: 1, letterSpacing: '-0.5px' }}>{result.labourHours} hrs</div>
          <div style={{ fontSize: 11, color: subColor, marginTop: 5 }}>@ $22/hr · {result.size} property</div>
        </div>

      </div>

      {/* ── Action buttons ───────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        {addedLead ? (
          <div style={{ flex: 1, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 10, padding: '11px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Check size={15} color="#4ade80" />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#4ade80' }}>Added: {addedLead.name}</span>
            </div>
            <a href="/" style={{ fontSize: 12, color: '#4ade80', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              View in Pipeline <ArrowRight size={12} />
            </a>
          </div>
        ) : (
          <button onClick={onAddToPipeline}
            style={{ flex: 1, background: 'linear-gradient(135deg, #A50050, #CD545B)', border: 'none', borderRadius: 10, padding: '12px', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
            <Plus size={15} />
            Add to Pipeline
          </button>
        )}

        <button onClick={onSaveClick} disabled={saveState === 'saving' || saveState === 'saved'}
          style={{
            background: saveState === 'saved' ? 'rgba(74,222,128,0.1)' : saveState === 'error' ? 'rgba(248,113,113,0.1)' : saveBtnIdle,
            border: `1px solid ${saveState === 'saved' ? 'rgba(74,222,128,0.3)' : saveState === 'error' ? 'rgba(248,113,113,0.3)' : saveBtnBorder}`,
            borderRadius: 10, padding: '12px 16px',
            color: saveState === 'saved' ? '#4ade80' : saveState === 'error' ? '#f87171' : saveBtnColor,
            fontSize: 13, fontWeight: 600,
            cursor: saveState === 'saving' || saveState === 'saved' ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
            opacity: saveState === 'saving' ? 0.7 : 1,
          }}>
          {saveState === 'saved' ? <Check size={14} /> : <Save size={14} />}
          {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : saveState === 'error' ? 'Retry' : 'Save'}
        </button>
      </div>
    </div>
  )
}

// ── Save Job Modal ─────────────────────────────────────────────

const BID_TAGS = [
  { value: 'underbid', label: 'Underbid',  color: '#ef4444' },
  { value: 'good_bid', label: 'Good Bid',  color: '#22c55e' },
  { value: 'overbid',  label: 'Overbid',   color: '#f59e0b' },
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
    onSaved()
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, width: '100%', maxWidth: 400, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink-1)' }}>Save Job</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)' }}><X size={18} /></button>
        </div>

        {/* Score summary */}
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
              style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 7, padding: '8px 11px', fontSize: 13, color: 'var(--ink-1)', outline: 'none' }} />
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

// ── Past Jobs comparison card ───────────────────────────────────

const TAG_STYLE = {
  underbid: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  label: 'Underbid' },
  good_bid: { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)',  label: 'Good Bid' },
  overbid:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', label: 'Overbid'  },
}

function PastJobsCard({ dark, txt1, txt2, txt3, inputBg, inputBorder }) {
  const [pastJobs, setPastJobs]   = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [open, setOpen]           = useState(true)

  useEffect(() => {
    supabase.from('past_projects')
      .select('*')
      .not('name', 'is', null)
      .order('job_date', { ascending: false })
      .then(({ data }) => setPastJobs(data || []))
  }, [])

  if (pastJobs.length === 0) return null

  const job = pastJobs.find(j => j.id === selectedId)
  const tag = job?.bid_tag ? TAG_STYLE[job.bid_tag] : null

  return (
    <div style={{ marginTop: 20, background: dark ? 'rgba(255,255,255,0.04)' : 'var(--panel)', border: `1px solid ${inputBorder}`, borderRadius: 12, overflow: 'hidden' }}>
      {/* Header */}
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', background: 'none', border: 'none', cursor: 'pointer' }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: txt3, textTransform: 'uppercase', letterSpacing: '0.9px' }}>Compare to Past Job</span>
        <ChevronDown size={14} color={txt3} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {open && (
        <div style={{ padding: '0 14px 14px' }}>
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
            style={{ width: '100%', background: inputBg, border: `1px solid ${inputBorder}`, borderRadius: 9, padding: '9px 12px', fontSize: 13, color: txt1, outline: 'none', marginBottom: selectedId ? 12 : 0 }}>
            <option value="">— Select a past job —</option>
            {pastJobs.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
          </select>

          {job && (
            <>
              {/* Tag + job details row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                {tag && (
                  <span style={{ fontSize: 11, fontWeight: 700, background: tag.bg, border: `1px solid ${tag.border}`, borderRadius: 20, padding: '3px 10px', color: tag.color }}>
                    {tag.label}
                  </span>
                )}
                <span style={{ fontSize: 11, color: txt3 }}>
                  {job.job_type} · {job.density} · {Number(job.square_footage).toLocaleString()} sqft
                </span>
              </div>

              {/* Metric grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Actual Bid',    value: job.actual_bid    ? `$${Number(job.actual_bid).toLocaleString()}`    : '—' },
                  { label: 'Actual Profit', value: job.actual_profit ? `$${Number(job.actual_profit).toLocaleString()}` : '—' },
                  { label: 'Labor Hrs',     value: job.actual_labor_hours ? `${job.actual_labor_hours}h` : '—' },
                  { label: 'Labor Cost',    value: job.actual_labor_cost  ? `$${Number(job.actual_labor_cost).toLocaleString()}` : '—' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: dark ? 'rgba(255,255,255,0.05)' : 'var(--panel)', border: `1px solid ${inputBorder}`, borderRadius: 9, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: txt3, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: txt1, lineHeight: 1 }}>{value}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────

function DealScorerCalculator({ onBack }) {
  const isMobile = useIsMobile()
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const [form, setForm] = useState({
    sqft: '', density: 'Medium', zipCode: '', itemQuality: 7, jobType: 'Both',
  })
  const [result, setResult]             = useState(null)
  const [saveState, setSaveState]       = useState('idle')
  const [showAddModal, setShowAddModal] = useState(false)

  const [addedLead, setAddedLead]       = useState(null)
  const hasCalculated = useRef(false)

  // Real-time recalc — fires after the first manual Calculate click
  useEffect(() => {
    if (!hasCalculated.current) return
    if (!form.sqft || isNaN(Number(form.sqft)) || Number(form.sqft) <= 0) {
      setResult(null)
      return
    }
    const r = calculateDeal({
      sqft: Number(form.sqft), density: form.density,
      itemQuality: Number(form.itemQuality), jobType: form.jobType, zipCode: form.zipCode,
    })
    setResult(r)
    setSaveState('idle')
    setAddedLead(null)
  }, [form])

  function set(key, value) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function calculate() {
    if (!form.sqft || isNaN(Number(form.sqft))) return
    const r = calculateDeal({
      sqft: Number(form.sqft), density: form.density,
      itemQuality: Number(form.itemQuality), jobType: form.jobType, zipCode: form.zipCode,
    })
    hasCalculated.current = true
    setResult(r); setSaveState('idle'); setAddedLead(null)
  }

  async function handleSaveClick() {
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
      organization_id:        organizationId,
    })
    setSaveState(error ? 'error' : 'saved')
    if (error) logger.error('Deal score save failed', error)
  }

  const canCalculate = form.sqft && !isNaN(Number(form.sqft)) && Number(form.sqft) > 0

  const panelBg = dark
    ? 'linear-gradient(160deg, #001929 0%, #00263e 100%)'
    : 'var(--panel)'
  const txt1  = dark ? '#fff'                    : 'var(--ink-1)'
  const txt2  = dark ? 'rgba(255,255,255,0.75)'  : 'var(--ink-2)'
  const txt3  = dark ? 'rgba(255,255,255,0.45)'  : 'var(--ink-3)'
  const inputBg     = dark ? 'rgba(255,255,255,0.07)'  : 'var(--bg)'
  const inputBorder = dark ? 'rgba(255,255,255,0.15)'  : 'var(--line)'
  const radioUncheckedBg     = dark ? 'rgba(255,255,255,0.04)' : 'var(--bg)'
  const radioUncheckedBorder = dark ? 'rgba(255,255,255,0.1)'  : 'var(--line)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ── Page header ─────────────────────────────────────── */}
      <div style={{ padding: '16px 28px', borderBottom: '1px solid var(--line)', flexShrink: 0, background: 'var(--panel)' }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-1)', margin: 0 }}>Deal Scorer</h1>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '2px 0 0' }}>Estimate labour, costs, and deal quality before your consult</p>
      </div>

      {/* ── Two-column layout ───────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', flexDirection: isMobile ? 'column' : 'row', position: 'relative', background: panelBg }}>

        {/* Decorative background overlay — sits directly on the container bg */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
          {/* Purple radial glow — bottom-left */}
          <div style={{
            position: 'absolute', left: '-5%', bottom: '-10%',
            width: '60%', height: '70%',
            background: 'radial-gradient(ellipse at center, rgba(130,40,210,0.078) 0%, transparent 65%)',
          }} />
          {/* Blue radial glow — top-right */}
          <div style={{
            position: 'absolute', right: '-5%', top: '-10%',
            width: '55%', height: '60%',
            background: 'radial-gradient(ellipse at center, rgba(0,140,230,0.06) 0%, transparent 65%)',
          }} />
          {/* Teal accent — centre */}
          <div style={{
            position: 'absolute', left: '35%', top: '30%',
            width: '35%', height: '35%',
            background: 'radial-gradient(ellipse at center, rgba(0,200,210,0.03) 0%, transparent 65%)',
          }} />
          {/* Flowing SVG curves */}
          <svg viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.033 }}>
            <path d="M-100,400 C150,200 350,600 600,350 S900,100 1300,300" fill="none" stroke="rgba(150,100,255,1)" strokeWidth="2.5" />
            <path d="M-50,600 C200,400 450,700 700,450 S1000,200 1350,450" fill="none" stroke="rgba(80,160,255,1)" strokeWidth="2" />
            <path d="M100,50 C300,250 550,50 750,200 S1050,400 1300,150" fill="none" stroke="rgba(100,220,255,1)" strokeWidth="2" />
            <path d="M0,700 Q300,500 600,600 T1200,400" fill="none" stroke="rgba(180,80,220,1)" strokeWidth="1.5" />
          </svg>
        </div>

        {/* ── LEFT: Calculator form ──────────────────────────── */}
        <div style={{
          width: isMobile ? '100%' : '40%',
          flexShrink: 0,
          overflowY: 'auto',
          background: 'transparent',
          padding: '20px 26px 24px',
          borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.07)',
          borderBottom: isMobile ? '1px solid rgba(255,255,255,0.07)' : 'none',
          position: 'relative',
          zIndex: 1,
        }}>
          {/* Property section */}
          <SectionLabel txt3={txt3}>Property</SectionLabel>

          <InputRow label="Square Footage" hint="Total area being cleaned out or liquidated" txt2={txt2} txt3={txt3}>
            <input
              type="number" placeholder="e.g. 2400" value={form.sqft}
              onChange={e => set('sqft', e.target.value)}
              style={{ width: '100%', background: inputBg, border: `1px solid ${inputBorder}`, borderRadius: 9, padding: '10px 13px', fontSize: 14, color: txt1, outline: 'none' }}
            />
            {form.sqft && !isNaN(Number(form.sqft)) && (
              <div style={{ fontSize: 11, color: txt3, marginTop: 4 }}>
                Size bucket: <strong style={{ color: txt2 }}>{getSizeBucket(Number(form.sqft))}</strong>
              </div>
            )}
          </InputRow>

          <InputRow label="Property Density" hint="How cluttered is the space?" txt2={txt2} txt3={txt3}>
            {DENSITY_OPTIONS.map(opt => (
              <RadioCard key={opt.value} name="density" option={opt}
                checked={form.density === opt.value} onChange={() => set('density', opt.value)}
                txt1={txt1} txt3={txt3} uncheckedBg={radioUncheckedBg} uncheckedBorder={radioUncheckedBorder} dark={dark} />
            ))}
          </InputRow>

          <InputRow label="ZIP Code" hint="Used for future location scoring" txt2={txt2} txt3={txt3}>
            <input type="text" placeholder="e.g. 80015" value={form.zipCode}
              onChange={e => set('zipCode', e.target.value)}
              style={{ width: '100%', background: inputBg, border: `1px solid ${inputBorder}`, borderRadius: 9, padding: '10px 13px', fontSize: 14, color: txt1, outline: 'none' }} />
          </InputRow>

          {/* Deal factors section */}
          <SectionLabel txt3={txt3}>Deal Factors</SectionLabel>

          <InputRow label={`Item Quality — ${form.itemQuality} / 10`} hint="10 = jewelry, coins, antiques | 3 = random household items" txt2={txt2} txt3={txt3}>
            <input type="range" min={1} max={10} step={1} value={form.itemQuality}
              onChange={e => set('itemQuality', e.target.value)}
              style={{ width: '100%', accentColor: qualityColor(form.itemQuality), cursor: 'pointer' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: txt3, marginTop: 2 }}>
              <span>1 — Low value</span>
              <span>10 — High value</span>
            </div>
          </InputRow>

          <InputRow label="Job Type" txt2={txt2} txt3={txt3}>
            {JOB_TYPE_OPTIONS.map(opt => (
              <RadioCard key={opt.value} name="jobType" option={opt}
                checked={form.jobType === opt.value} onChange={() => set('jobType', opt.value)}
                txt1={txt1} txt3={txt3} uncheckedBg={radioUncheckedBg} uncheckedBorder={radioUncheckedBorder} dark={dark} />
            ))}
          </InputRow>

          {/* Calculate button */}
          <button
            onClick={calculate}
            disabled={!canCalculate}
            style={{
              width: '100%',
              marginTop: 8,
              background: canCalculate
                ? 'linear-gradient(135deg, #A50050 0%, #CD545B 100%)'
                : (dark ? 'rgba(255,255,255,0.08)' : 'var(--line)'),
              border: canCalculate ? 'none' : `1px solid ${inputBorder}`,
              borderRadius: 10,
              padding: '13px',
              color: canCalculate ? '#fff' : txt3,
              fontSize: 14,
              fontWeight: 700,
              cursor: canCalculate ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s',
            }}
          >
            Calculate Deal Score
          </button>

          <PastJobsCard dark={dark} txt1={txt1} txt2={txt2} txt3={txt3} inputBg={inputBg} inputBorder={inputBorder} />
        </div>

        {/* ── RIGHT: Results ─────────────────────────────────── */}
        <div style={{
          flex: 1,
          overflow: 'hidden',
          background: 'transparent',
          borderLeft: isMobile ? 'none' : `1px solid ${inputBorder}`,
          position: 'relative',
          zIndex: 1,
        }}>
          {result ? (
            <ResultPanel
              result={result}
              scorerForm={form}
              addedLead={addedLead}
              onAddToPipeline={() => setShowAddModal(true)}
              saveState={saveState}
              onSaveClick={handleSaveClick}
              dark={dark}
            />
          ) : (
            <ResultSkeleton dark={dark} />
          )}
        </div>
      </div>

      {showAddModal && (
        <AddToPipelineModal
          scorerForm={form} result={result}
          onClose={() => setShowAddModal(false)}
          onAdded={lead => setAddedLead(lead)}
        />
      )}

      {onBack && (
        <button
          onClick={onBack}
          style={{
            position: 'fixed', bottom: 24, left: 240,
            background: 'var(--panel)', border: '1px solid var(--line)',
            borderRadius: 'var(--radius-sm)', padding: '8px 14px',
            fontSize: 12, fontWeight: 600, color: 'var(--ink-2)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <LayoutList size={13} /> Back to Dashboard
        </button>
      )}
    </div>
  )
}

// ── Project Dashboard ──────────────────────────────────────────

const SCORE_COLOR = s => s >= 7.5 ? '#22c55e' : s >= 5 ? '#f59e0b' : '#ef4444'

function ScoreChip({ score }) {
  if (score == null) return <span style={{ color: 'var(--ink-3)', fontSize: 12 }}>—</span>
  const color = SCORE_COLOR(score)
  return (
    <span style={{
      fontSize: 12, fontWeight: 700, color,
      background: `${color}15`, border: `1px solid ${color}30`,
      padding: '1px 7px', borderRadius: 10,
    }}>
      {Number(score).toFixed(1)}
    </span>
  )
}

export default function DealScorer() {
  const { organizationId } = useAuth()
  const [searchParams] = useSearchParams()
  const fromLead = searchParams.get('lead')
  const [mode, setMode] = useState(fromLead ? 'calculator' : 'list')
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchScores() }, [])

  async function fetchScores() {
    setLoading(true)
    const { data } = await supabase
      .from('deal_scores')
      .select('*, leads(name, address, status)')
      .order('created_at', { ascending: false })
    setScores(data || [])
    setLoading(false)
  }

  if (mode === 'calculator') {
    return <DealScorerCalculator onBack={() => { setMode('list'); fetchScores() }} />
  }

  const avgScore = scores.length
    ? scores.reduce((s, r) => s + Number(r.deal_score || 0), 0) / scores.length
    : null
  const totalBid = scores.reduce((s, r) => s + Number(r.recommended_bid || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{
        padding: '16px 24px', borderBottom: '1px solid var(--line-2)',
        background: 'var(--panel)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <h1 style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink-1)', margin: 0 }}>Project Dashboard</h1>
            <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '2px 0 0', fontWeight: 500 }}>
              {scores.length} scored projects
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setMode('calculator')}>
            <Plus size={13} strokeWidth={2.5} />
            New Project
          </button>
        </div>

        {/* Summary stats */}
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { label: 'Total Projects', value: scores.length, icon: LayoutList, color: '#71C5E8' },
            { label: 'Avg Score',      value: avgScore != null ? avgScore.toFixed(1) : '—', icon: Star, color: '#f59e0b' },
            { label: 'Total Bid Value', value: totalBid > 0 ? `$${totalBid.toLocaleString()}` : '—', icon: TrendingUp, color: '#22c55e' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} style={{
              background: 'var(--panel)', border: '1px solid var(--line)',
              borderRadius: 'var(--radius-md)', padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 12,
              boxShadow: 'var(--shadow-sm)', minWidth: 160, flexShrink: 0,
            }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: `${color}18`, border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={14} color={color} />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-1)', lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 13, marginTop: 60 }}>Loading…</div>
        ) : scores.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: 80 }}>
            <Calculator size={40} color="var(--ink-3)" style={{ opacity: 0.3, margin: '0 auto 12px' }} />
            <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>No projects scored yet.</div>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setMode('calculator')}>
              <Plus size={13} /> Run Your First Estimate
            </button>
          </div>
        ) : (
          <div style={{ maxWidth: 960 }}>
            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1.2fr 80px 80px 80px 80px 100px',
              gap: 12, padding: '0 16px 8px',
              fontSize: 10.5, fontWeight: 700, color: 'var(--ink-3)',
              textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              {['Client / Address', 'Job Type', 'Sq Ft', 'Density', 'Hours', 'Score', 'Bid'].map(h => (
                <span key={h}>{h}</span>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {scores.map(row => (
                <div
                  key={row.id}
                  className="card"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1.2fr 80px 80px 80px 80px 100px',
                    gap: 12, padding: '12px 16px',
                    alignItems: 'center',
                    cursor: 'default',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink-1)' }}>
                      {row.leads?.name || '—'}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>
                      {row.leads?.address || row.zip_code || '—'}
                    </div>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{row.job_type}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{Number(row.square_footage).toLocaleString()}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{row.density}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{row.estimated_labour_hours}h</div>
                  <ScoreChip score={row.deal_score} />
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#22c55e' }}>
                    ${Number(row.recommended_bid || 0).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
