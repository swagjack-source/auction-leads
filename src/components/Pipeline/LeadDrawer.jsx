import { useState } from 'react'
import { X, MapPin, Phone, Clock, CheckSquare, Square, ChevronDown, MoreHorizontal, Calendar, FileText, CheckCircle, Pencil } from 'lucide-react'
import { getScoreColor, getScoreLabel } from '../../lib/scoring'
import { supabase } from '../../lib/supabase'
import SendEstimateModal from './SendEstimateModal'
import ScheduleProjectModal from './ScheduleProjectModal'

const JOB_BADGE = {
  'Clean Out': { bg: 'var(--b-cleanout-bg)', fg: 'var(--b-cleanout-fg)' },
  'Auction':   { bg: 'var(--b-auction-bg)',  fg: 'var(--b-auction-fg)'  },
  'Both':      { bg: 'var(--b-both-bg)',     fg: 'var(--b-both-fg)'     },
}

const STAGE_TINT = {
  'New Lead':          '#8A8A80',
  'Contacted':         '#6B7A8F',
  'In Talks':          '#3E5C86',
  'Consult Scheduled': '#4A6FA5',
  'Consult Completed': '#7A5CA5',
  'Estimate Sent':     '#A50050',
  'Project Accepted':  '#6A8A4A',
  'Project Scheduled': '#C28A2A',
  'Won':               '#2F7A55',
  'Lost':              '#A14646',
  'Backlog':           '#6B7280',
}

const DEFAULT_CHECKLIST = [
  'Initial call logged',
  'Intake form complete',
  'Walkthrough scheduled',
  'Proposal sent',
  'Contract signed',
]

function KpiBox({ label, value, sub }) {
  return (
    <div style={{
      flex: 1, textAlign: 'center',
      padding: '10px 8px',
      background: 'var(--bg)',
      borderRadius: 10,
      border: '1px solid var(--line)',
    }}>
      <div className="tnum" style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink-1)', lineHeight: 1 }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 3 }}>{sub}</div>}
      <div style={{ fontSize: 10.5, color: 'var(--ink-4)', marginTop: 2, fontWeight: 500 }}>{label}</div>
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: 10.5, fontWeight: 700, color: 'var(--ink-4)',
      textTransform: 'uppercase', letterSpacing: '0.07em',
      paddingBottom: 8, borderBottom: '1px solid var(--line-2)', marginBottom: 10,
    }}>{children}</div>
  )
}

export default function LeadDrawer({ lead, onClose, onEdit, onMoveStatus, onChecklistChange }) {
  const [checklist, setChecklist] = useState(() => {
    if (Array.isArray(lead?.checklist) && lead.checklist.length > 0) return lead.checklist
    return DEFAULT_CHECKLIST.map(item => ({ label: item, done: false }))
  })
  const [showEstimateModal, setShowEstimateModal] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)

  if (!lead) return null

  const scoreColor = lead.deal_score != null ? getScoreColor(lead.deal_score) : null
  const scoreLabel = lead.deal_score != null ? getScoreLabel(lead.deal_score) : null
  const stageTint  = STAGE_TINT[lead.status] || '#6B7280'
  const badge      = JOB_BADGE[lead.job_type]
  const estValue   = lead._scoreDetails?.recommendedBid

  async function toggleCheck(i) {
    const updated = checklist.map((x, idx) => idx === i ? { ...x, done: !x.done } : x)
    setChecklist(updated)
    await supabase.from('leads').update({ checklist: updated }).eq('id', lead.id)
    onChecklistChange?.(lead.id, updated)
  }

  const mapsUrl = lead.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.address + (lead.zip_code ? ' ' + lead.zip_code : ''))}`
    : null

  function handleSent(newStatus) {
    setShowEstimateModal(false)
    onMoveStatus?.(lead, newStatus)
  }

  function handleMarkAccepted() {
    onMoveStatus?.(lead, 'Project Accepted')
  }

  function handleScheduled(newStatus) {
    setShowScheduleModal(false)
    onMoveStatus?.(lead, newStatus)
  }

  function renderFooter() {
    const status = lead.status

    const callBtn = (
      <a
        key="call"
        href={lead.phone ? `tel:${lead.phone}` : undefined}
        style={{
          flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          gap: 6, padding: '8px 12px', borderRadius: 9,
          border: '1px solid var(--line)', background: 'var(--panel)',
          color: 'var(--ink-2)', fontSize: 13, fontWeight: 600,
          textDecoration: 'none', cursor: lead.phone ? 'pointer' : 'default',
          opacity: lead.phone ? 1 : 0.4,
        }}
      >
        <Phone size={13} strokeWidth={1.8} /> Call
      </a>
    )

    const noteBtn = (
      <button key="note" style={{
        flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        gap: 6, padding: '8px 12px', borderRadius: 9,
        border: '1px solid var(--line)', background: 'var(--panel)',
        color: 'var(--ink-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        fontFamily: 'inherit',
      }}>
        <Clock size={13} strokeWidth={1.8} /> Add note
      </button>
    )

    if (status === 'Consult Completed') {
      return (
        <>
          {callBtn}
          {noteBtn}
          <button
            key="estimate"
            onClick={() => setShowEstimateModal(true)}
            style={{
              flex: 1.5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              gap: 6, padding: '8px 12px', borderRadius: 9,
              border: 'none', background: '#A50050',
              color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <FileText size={13} strokeWidth={1.8} /> Send Estimate
          </button>
        </>
      )
    }

    if (status === 'Estimate Sent') {
      return (
        <>
          {callBtn}
          {noteBtn}
          <button
            key="accept"
            onClick={handleMarkAccepted}
            style={{
              flex: 1.5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              gap: 6, padding: '8px 12px', borderRadius: 9,
              border: 'none', background: '#6A8A4A',
              color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <CheckCircle size={13} strokeWidth={1.8} /> Mark Accepted
          </button>
        </>
      )
    }

    if (status === 'Project Accepted') {
      return (
        <>
          {callBtn}
          {noteBtn}
          <button
            key="schedule"
            onClick={() => setShowScheduleModal(true)}
            style={{
              flex: 1.5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              gap: 6, padding: '8px 12px', borderRadius: 9,
              border: 'none', background: '#C28A2A',
              color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <Calendar size={13} strokeWidth={1.8} /> Add to Schedule
          </button>
        </>
      )
    }

    return (
      <>
        {callBtn}
        {noteBtn}
        <button
          key="consult"
          onClick={onEdit}
          style={{
            flex: 1.5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            gap: 6, padding: '8px 12px', borderRadius: 9,
            border: 'none', background: 'var(--accent)',
            color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <Calendar size={13} strokeWidth={1.8} /> Schedule consult
        </button>
      </>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'var(--overlay)',
          zIndex: 99,
        }}
      />

      {/* Drawer panel */}
      <aside style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 460,
        background: 'var(--panel)',
        borderLeft: '1px solid var(--line)',
        boxShadow: '-4px 0 24px rgba(20,22,26,0.10)',
        zIndex: 100,
        display: 'flex', flexDirection: 'column',
        animation: 'slidein 220ms cubic-bezier(.2,.7,.3,1.05)',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          padding: '14px 16px 12px',
          borderBottom: '1px solid var(--line)',
          flexShrink: 0,
        }}>
          {/* Top row: badges + close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            {badge && (
              <span style={{
                fontSize: 10.5, fontWeight: 700,
                background: badge.bg, color: badge.fg,
                padding: '2px 8px', borderRadius: 999,
              }}>{lead.job_type}</span>
            )}
            <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'inherit' }}>
              #{lead.id?.toString().slice(-6) || '—'}
            </span>
            <div style={{ flex: 1 }} />
            <button
              onClick={onEdit}
              title="Edit lead"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '0 10px', height: 30, borderRadius: 8,
                border: '1px solid var(--accent)', background: 'var(--accent-soft)',
                cursor: 'pointer', color: 'var(--accent)', fontSize: 12, fontWeight: 600,
                fontFamily: 'inherit',
              }}
            ><Pencil size={12} strokeWidth={2} /> Edit</button>
            <button
              onClick={onClose}
              style={{
                width: 30, height: 30, borderRadius: 8,
                border: '1px solid var(--line)', background: 'var(--panel)',
                display: 'grid', placeItems: 'center', cursor: 'pointer',
                color: 'var(--ink-3)',
              }}
            ><X size={15} strokeWidth={1.8} /></button>
          </div>

          {/* Name */}
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink-1)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {lead.name}
          </div>

          {/* Address — clickable Google Maps link */}
          {lead.address && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 5,
                color: 'var(--ink-3)', fontSize: 12.5, textDecoration: 'none',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--ink-3)'}
            >
              <MapPin size={12} strokeWidth={1.8} />
              <span>{lead.address}{lead.zip_code ? `, ${lead.zip_code}` : ''}</span>
            </a>
          )}

          {/* Stage + owner */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
            <button style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 999,
              border: `1px solid ${stageTint}50`,
              background: `${stageTint}12`,
              color: stageTint, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: stageTint, flexShrink: 0 }} />
              {lead.status}
              <ChevronDown size={11} strokeWidth={2} />
            </button>
            <span style={{ fontSize: 11.5, color: 'var(--ink-4)' }}>Owner · Margaret Reyes</span>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

          {/* KPI row */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <KpiBox
              label="Deal Score"
              value={lead.deal_score != null ? (
                <span style={{ color: scoreColor }}>{Math.round(lead.deal_score)}/10</span>
              ) : null}
              sub={scoreLabel}
            />
            <KpiBox
              label="Est. Value"
              value={estValue ? `$${(estValue / 1000).toFixed(1)}k` : null}
              sub=""
            />
            <KpiBox
              label="Days in Stage"
              value={lead.created_at ? Math.max(1, Math.floor((Date.now() - new Date(lead.created_at)) / 86400000)) : null}
              sub=""
            />
          </div>

          {/* Contact section */}
          <div style={{ marginBottom: 20 }}>
            <SectionTitle>Contact</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
              {[
                { label: 'Phone',     value: lead.phone },
                { label: 'Source',    value: lead.lead_source },
                { label: 'Email',     value: lead.email },
                { label: 'Preferred', value: lead.what_they_need },
              ].map(({ label, value }) => (
                <div key={label} style={{ padding: '5px 0', borderBottom: '1px solid var(--line-2)' }}>
                  <div style={{ fontSize: 10.5, color: 'var(--ink-4)', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 12.5, color: value ? 'var(--ink-1)' : 'var(--ink-4)', fontWeight: value ? 500 : 400 }}>
                    {value || '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity */}
          <div style={{ marginBottom: 20 }}>
            <SectionTitle>Activity</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { initials: 'MR', bg: 'linear-gradient(135deg,#A50050,#7A003A)', text: `Left voicemail for ${lead.name?.split(' ')[0] || 'client'}. Will follow up tomorrow.`, when: 'Today · 9:42 AM' },
                { initials: 'DK', bg: 'linear-gradient(135deg,#0F766E,#065F46)',  text: 'Added to pipeline from referral source.', when: 'Yesterday · 4:15 PM' },
                { initials: 'MR', bg: 'linear-gradient(135deg,#A50050,#7A003A)', text: 'Initial intake form received.', when: '2 days ago' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--line-2)' }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: item.bg, color: 'white', display: 'grid', placeItems: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{item.initials}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-1)', lineHeight: 1.4 }}>{item.text}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 3 }}>{item.when}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Deal details */}
          {(lead.square_footage || lead.density || lead.item_quality_score) && (
            <div style={{ marginBottom: 20 }}>
              <SectionTitle>Deal Details</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {lead.square_footage && (
                  <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10.5, color: 'var(--ink-4)' }}>Square Footage</div>
                    <div className="tnum" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-1)', marginTop: 2 }}>{lead.square_footage} sq ft</div>
                  </div>
                )}
                {lead.density && (
                  <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10.5, color: 'var(--ink-4)' }}>Density</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-1)', marginTop: 2 }}>{lead.density}</div>
                  </div>
                )}
                {lead.item_quality_score != null && (
                  <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10.5, color: 'var(--ink-4)' }}>Item Quality</div>
                    <div className="tnum" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-1)', marginTop: 2 }}>{lead.item_quality_score}/10</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {lead.notes && (
            <div style={{ marginBottom: 20 }}>
              <SectionTitle>Notes</SectionTitle>
              <div style={{
                fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55,
                background: 'var(--bg)', borderRadius: 8, padding: '10px 12px',
              }}>{lead.notes}</div>
            </div>
          )}

          {/* Checklist */}
          <div style={{ marginBottom: 20 }}>
            <SectionTitle>Checklist</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {checklist.map((item, i) => (
                <button
                  key={i}
                  onClick={() => toggleCheck(i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    padding: '7px 10px', borderRadius: 8,
                    border: '1px solid var(--line)',
                    background: item.done ? 'var(--win-soft)' : 'var(--bg)',
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'background 120ms',
                    fontFamily: 'inherit',
                  }}
                >
                  {item.done
                    ? <CheckSquare size={14} strokeWidth={1.8} color="var(--win)" />
                    : <Square size={14} strokeWidth={1.8} color="var(--ink-4)" />
                  }
                  <span style={{
                    fontSize: 12.5, color: item.done ? 'var(--win)' : 'var(--ink-2)',
                    fontWeight: item.done ? 500 : 400,
                    textDecoration: item.done ? 'line-through' : 'none',
                    opacity: item.done ? 0.75 : 1,
                  }}>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--line)',
          display: 'flex', gap: 8, flexShrink: 0,
          background: 'var(--panel)',
        }}>
          {renderFooter()}
        </div>
      </aside>

      {showEstimateModal && (
        <SendEstimateModal
          lead={lead}
          scoreDetails={lead._scoreDetails}
          onClose={() => setShowEstimateModal(false)}
          onSent={handleSent}
        />
      )}

      {showScheduleModal && (
        <ScheduleProjectModal
          lead={lead}
          onClose={() => setShowScheduleModal(false)}
          onScheduled={handleScheduled}
        />
      )}
    </>
  )
}
