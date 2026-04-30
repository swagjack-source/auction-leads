import { useState } from 'react'
import { X, Star } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import logger from '../../lib/logger'

const ACCURACY_OPTIONS = [
  {
    key: 'Underbid',
    label: 'Underbid',
    subtitle: 'We charged too little',
    bg: 'color-mix(in oklab, var(--lose) 14%, var(--panel))',
    border: 'color-mix(in oklab, var(--lose) 35%, var(--line))',
    fg: 'var(--lose)',
  },
  {
    key: 'Good Bid',
    label: 'Good Bid',
    subtitle: 'Bid was well-calibrated',
    bg: 'color-mix(in oklab, var(--win) 14%, var(--panel))',
    border: 'color-mix(in oklab, var(--win) 35%, var(--line))',
    fg: 'var(--win)',
  },
  {
    key: 'Overbid',
    label: 'Overbid',
    subtitle: 'We charged too much',
    bg: 'color-mix(in oklab, var(--warn) 16%, var(--panel))',
    border: 'color-mix(in oklab, var(--warn) 35%, var(--line))',
    fg: 'var(--warn)',
  },
]

export default function MarkCompleteModal({ project, onClose, onCompleted }) {
  const [step, setStep] = useState(1)
  const [accuracy, setAccuracy] = useState(null)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleComplete(skipRating = false) {
    setSaving(true)
    setError(null)
    try {
      const updates = {
        status: 'Won',
        bid_accuracy: accuracy,
        retro_rating: skipRating ? null : (rating || null),
      }
      const { error: updErr } = await supabase
        .from('leads').update(updates).eq('id', project.id)
      if (updErr) {
        logger.error('Mark complete failed', updErr)
        setError(updErr.message)
        setSaving(false)
        return
      }
      onCompleted?.({ ...project, ...updates })
    } catch (e) {
      logger.error('Mark complete threw', e)
      setError(e?.message || 'Failed to mark complete.')
      setSaving(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'var(--overlay-heavy)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 16, width: '100%', maxWidth: 520, boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-1)' }}>
            {step === 1 && 'Mark project complete?'}
            {step === 2 && 'How was the bid?'}
            {step === 3 && 'Quick rating'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'grid', placeItems: 'center', padding: 4 }} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 4, padding: '8px 20px', background: 'var(--bg-2)' }}>
          {[1, 2, 3].map(n => (
            <div key={n} style={{ flex: 1, height: 3, borderRadius: 2, background: step >= n ? 'var(--accent)' : 'var(--line)' }} />
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          {step === 1 && (
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink-1)', marginBottom: 4 }}>
                {project.name} <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>— {project.job_type}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5 }}>
                This will move the project to the Completed tab.
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ACCURACY_OPTIONS.map(opt => {
                const selected = accuracy === opt.key
                return (
                  <button
                    key={opt.key}
                    onClick={() => setAccuracy(opt.key)}
                    style={{
                      display: 'flex', flexDirection: 'column', gap: 2,
                      padding: '14px 18px', borderRadius: 10,
                      background: opt.bg,
                      border: `1px solid ${selected ? opt.fg : opt.border}`,
                      boxShadow: selected ? `0 0 0 2px ${opt.fg}33` : 'none',
                      color: opt.fg, cursor: 'pointer', fontFamily: 'inherit',
                      textAlign: 'left',
                      transition: 'box-shadow 120ms, border-color 120ms',
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{opt.label}</span>
                    <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500 }}>{opt.subtitle}</span>
                  </button>
                )
              })}
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '16px 0' }}>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>How did the project feel overall?</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1, 2, 3, 4, 5].map(n => {
                  const filled = (hoverRating || rating) >= n
                  return (
                    <button
                      key={n}
                      onClick={() => setRating(n)}
                      onMouseEnter={() => setHoverRating(n)}
                      onMouseLeave={() => setHoverRating(0)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: filled ? '#F59E0B' : 'var(--ink-4)' }}
                      aria-label={`${n} star${n > 1 ? 's' : ''}`}
                    >
                      <Star size={32} strokeWidth={1.6} fill={filled ? '#F59E0B' : 'none'} />
                    </button>
                  )
                })}
              </div>
              <button
                onClick={() => handleComplete(true)}
                disabled={saving}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 12, textDecoration: 'underline', fontFamily: 'inherit' }}
              >
                Skip rating
              </button>
            </div>
          )}

          {error && (
            <div style={{ marginTop: 14, padding: '8px 12px', fontSize: 12.5, color: 'var(--lose)', background: 'var(--lose-soft)', border: '1px solid color-mix(in oklab, var(--lose) 25%, var(--line))', borderRadius: 8 }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={step === 1 ? onClose : () => setStep(s => s - 1)}
            disabled={saving}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          {step === 1 && (
            <button
              onClick={() => setStep(2)}
              style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#FFFFFF', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Yes, mark complete
            </button>
          )}
          {step === 2 && (
            <button
              onClick={() => setStep(3)}
              disabled={!accuracy}
              style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: accuracy ? 'var(--accent)' : 'var(--line)', color: accuracy ? '#FFFFFF' : 'var(--ink-3)', fontSize: 13, fontWeight: 600, cursor: accuracy ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
            >
              Next
            </button>
          )}
          {step === 3 && (
            <button
              onClick={() => handleComplete(false)}
              disabled={saving}
              style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#FFFFFF', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}
            >
              {saving ? 'Saving…' : 'Complete Project'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
