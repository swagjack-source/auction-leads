import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, ChevronRight, ChevronLeft } from 'lucide-react'

// ── Step definitions ───────────────────────────────────────────

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Homebase 👋',
    body: "This is your all-in-one operations platform for Caring Transitions Denver SE. Let's walk through the key features in about 60 seconds.",
    target: null,
    placement: 'center',
    route: null,
  },
  {
    id: 'pipeline',
    title: 'Pipeline',
    body: 'Every new lead lands here. Drag cards between stages — New Lead → Contacted → Consult Scheduled → Won. Click a card to open the full detail drawer.',
    target: 'a[href="/pipeline"]',
    placement: 'right',
    route: '/pipeline',
  },
  {
    id: 'deal-scorer',
    title: 'Deal Scorer',
    body: 'Open any lead and click "Open Deal Scorer" to get a recommended bid, labour estimate, and profit margin based on square footage, density, and job type.',
    target: 'a[href="/scorer"]',
    placement: 'right',
    route: '/scorer',
  },
  {
    id: 'projects',
    title: 'Projects',
    body: 'Completed and active jobs live here. The Completed tab shows P&L data — revenue, labour, royalties, and net profit. Import historical jobs from your spreadsheets.',
    target: 'a[href="/projects"]',
    placement: 'right',
    route: '/projects',
  },
  {
    id: 'bdr',
    title: 'BDR — Referral Partners',
    body: 'Track relationships with realtors, estate attorneys, and other referral partners. Move contacts through stages from Cold to Active Partner, log touchpoints, and track referrals sent.',
    target: 'a[href="/bdr"]',
    placement: 'right',
    route: '/bdr',
  },
  {
    id: 'calendar',
    title: 'Calendar',
    body: 'See all upcoming consults and active projects in Month, Week, or List view. Multi-day project bars span across days. Click "+ Meeting" to schedule a consult or walkthrough.',
    target: 'a[href="/calendar"]',
    placement: 'right',
    route: '/calendar',
  },
  {
    id: 'contacts',
    title: 'Contacts',
    body: 'Store client contact info independently from your pipeline. Useful for past clients, vendors, and anyone who doesn\'t fit neatly into a lead stage.',
    target: 'a[href="/contacts"]',
    placement: 'right',
    route: '/contacts',
  },
  {
    id: 'import',
    title: 'Importing Data',
    body: 'The Pipeline, Projects, and BDR pages all have an Import button. Drop in a CSV or XLSX file and the system maps columns automatically — status, job type, address, and more.',
    target: null,
    placement: 'center',
    route: null,
    icon: '📥',
  },
  {
    id: 'done',
    title: "You're all set! 🎉",
    body: "That covers the core of Homebase. Explore at your own pace — every drawer, tab, and button is built around your real workflow. Click the ? button anytime to replay this tour.",
    target: null,
    placement: 'center',
    route: null,
  },
]

// ── Helpers ────────────────────────────────────────────────────

function getRect(selector) {
  if (!selector) return null
  try {
    const el = document.querySelector(selector)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { top: r.top, left: r.left, width: r.width, height: r.height }
  } catch { return null }
}

const PAD = 10

function tooltipPosition(rect, placement, tw, th) {
  if (!rect || placement === 'center') {
    return {
      top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
    }
  }
  const vw = window.innerWidth, vh = window.innerHeight
  if (placement === 'right') {
    const left = Math.min(rect.left + rect.width + PAD * 2, vw - tw - 16)
    const top  = Math.max(16, Math.min(rect.top + rect.height / 2 - th / 2, vh - th - 16))
    return { top, left }
  }
  if (placement === 'bottom') {
    const top  = rect.top + rect.height + PAD * 2
    const left = Math.max(16, Math.min(rect.left + rect.width / 2 - tw / 2, vw - tw - 16))
    return { top, left }
  }
  return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
}

// ── Tour Component ─────────────────────────────────────────────

export default function Tour({ onClose }) {
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState(null)
  const tooltipRef = useRef(null)
  const navigate = useNavigate()

  const current = STEPS[step]
  const isFirst = step === 0
  const isLast  = step === STEPS.length - 1

  const updateRect = useCallback(() => {
    setRect(getRect(current.target))
  }, [current.target])

  useEffect(() => {
    if (current.route) navigate(current.route)
    const raf = requestAnimationFrame(() => {
      setTimeout(updateRect, 80)
    })
    window.addEventListener('resize', updateRect)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', updateRect)
    }
  }, [current.route, updateRect, navigate])

  function next() { isLast ? onClose() : setStep(s => s + 1) }
  function prev() { if (!isFirst) setStep(s => s - 1) }

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') prev() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  const hasSpotlight = rect && current.target
  const tooltipW = 300, tooltipH = 200

  const tipPos = tooltipPosition(rect, current.placement, tooltipW, tooltipH)
  const isAbsolute = typeof tipPos.top === 'number'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, pointerEvents: 'none' }}>

      {/* Dark overlay with spotlight cutout */}
      {hasSpotlight ? (
        <>
          {/* Top */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: rect.top - PAD, background: 'rgba(10,12,18,0.72)', pointerEvents: 'auto' }} onClick={onClose} />
          {/* Bottom */}
          <div style={{ position: 'absolute', top: rect.top + rect.height + PAD, left: 0, right: 0, bottom: 0, background: 'rgba(10,12,18,0.72)', pointerEvents: 'auto' }} onClick={onClose} />
          {/* Left */}
          <div style={{ position: 'absolute', top: rect.top - PAD, left: 0, width: rect.left - PAD, height: rect.height + PAD * 2, background: 'rgba(10,12,18,0.72)', pointerEvents: 'auto' }} onClick={onClose} />
          {/* Right */}
          <div style={{ position: 'absolute', top: rect.top - PAD, left: rect.left + rect.width + PAD, right: 0, height: rect.height + PAD * 2, background: 'rgba(10,12,18,0.72)', pointerEvents: 'auto' }} onClick={onClose} />
          {/* Spotlight ring */}
          <div style={{
            position: 'absolute',
            top: rect.top - PAD, left: rect.left - PAD,
            width: rect.width + PAD * 2, height: rect.height + PAD * 2,
            borderRadius: 12, border: '2px solid var(--accent)',
            boxShadow: '0 0 0 4px rgba(59,130,246,0.2)',
            pointerEvents: 'none',
          }} />
        </>
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,12,18,0.72)', pointerEvents: 'auto' }} onClick={e => { if (e.target === e.currentTarget) onClose() }} />
      )}

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        style={{
          position: 'absolute',
          width: tooltipW,
          pointerEvents: 'auto',
          ...(isAbsolute
            ? { top: tipPos.top, left: tipPos.left }
            : { top: tipPos.top, left: tipPos.left, transform: tipPos.transform }),
        }}
      >
        <div style={{
          background: 'var(--panel)', border: '1px solid var(--line)',
          borderRadius: 16, padding: '20px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-1)', letterSpacing: '-0.01em', lineHeight: 1.3, paddingRight: 8 }}>
              {current.title}
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', padding: 2, display: 'flex', flexShrink: 0, marginTop: 1 }}>
              <X size={14} />
            </button>
          </div>

          {/* Body */}
          <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6, margin: '0 0 16px' }}>
            {current.body}
          </p>

          {/* Progress dots */}
          <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginBottom: 14 }}>
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                style={{
                  width: i === step ? 18 : 6, height: 6, borderRadius: 999,
                  background: i === step ? 'var(--accent)' : i < step ? 'var(--accent-soft)' : 'var(--line)',
                  border: 'none', cursor: 'pointer', padding: 0,
                  transition: 'all 150ms',
                }}
              />
            ))}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            {!isFirst && (
              <button onClick={prev} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '7px 12px', borderRadius: 9,
                border: '1px solid var(--line)', background: 'var(--bg-2)',
                color: 'var(--ink-2)', fontSize: 12.5, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                <ChevronLeft size={13} /> Back
              </button>
            )}
            <button onClick={next} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              padding: '7px 12px', borderRadius: 9, border: 'none',
              background: 'var(--accent)', color: 'white',
              fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {isLast ? 'Finish' : <><span>Next</span><ChevronRight size={13} /></>}
            </button>
          </div>

          {!isLast && (
            <button onClick={onClose} style={{
              display: 'block', width: '100%', marginTop: 8,
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 11.5, color: 'var(--ink-4)', fontFamily: 'inherit',
            }}>
              Skip tour
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
