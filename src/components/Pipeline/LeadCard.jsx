import { useState, memo, useMemo } from 'react'
import { Phone } from 'lucide-react'
import { useTeam } from '../../lib/TeamContext'

const JOB_DOT = {
  'Clean Out': '#C28A5A',
  'Auction':   '#8666BD',
  'Both':      '#5A7FB3',
}
const JOB_LABEL = {
  'Clean Out': 'Clean Out',
  'Auction':   'Auction',
  'Both':      'Both',
}

// Deterministic hue from any string → same member always gets same OKLCH color.
// Lightness 0.72 and chroma 0.08 are fixed so all avatars feel harmonious.
function strToHue(str = '') {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360
  return h
}

const LeadCard = memo(function LeadCard({ lead, onClick, stageTint, stageSoft, isDragging, onDragStart, onDragEnd }) {
  const [hover, setHover] = useState(false)
  const { members } = useTeam()
  const assignee = lead.assigned_to ? members.find(m => m.id === lead.assigned_to) : null

  const jobDot = JOB_DOT[lead.job_type] || '#9CA3AF'

  const score    = lead.deal_score != null ? Math.round(lead.deal_score) : null
  const scoreHot = score != null && score >= 8
  const scoreColor = score == null ? null
    : score >= 8 ? 'var(--win)'
    : score >= 5 ? 'var(--ink-2)'
    : 'var(--lose)'

  const bid = lead._scoreDetails?.recommendedBid
  const bidLabel = bid != null
    ? `$${bid >= 10000
        ? `${Math.round(bid / 1000)}k`
        : bid >= 1000
          ? `${(bid / 1000).toFixed(1)}k`
          : bid}`
    : null

  const cardBg     = useMemo(
    () => stageSoft ? `color-mix(in oklab, ${stageSoft} 18%, var(--panel))` : 'var(--panel)',
    [stageSoft]
  )
  const borderColor = hover ? (stageTint || '#C8CFD8') : 'var(--line)'

  // OKLCH avatar — lightness + chroma fixed, hue derived from member id
  const avatarInitials = assignee
    ? (assignee.initials || assignee.name?.[0] || '?').toUpperCase()
    : 'MR'
  const avatarHue = strToHue(assignee?.id ?? 'mr-default-12')
  const avatarBg  = `oklch(0.72 0.08 ${avatarHue})`

  return (
    <article
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: cardBg,
        border: `1px solid ${borderColor}`,
        borderRadius: 12,
        padding: '10px 12px',
        cursor: 'grab',
        opacity: isDragging ? 0.4 : 1,
        transform: hover && !isDragging ? 'translateY(-1px)' : 'none',
        boxShadow: hover && !isDragging ? 'var(--shadow-2)' : 'var(--shadow-1)',
        transition: 'transform 140ms cubic-bezier(.2,.7,.3,1.1), box-shadow 140ms, border-color 120ms, background 120ms',
        display: 'flex', flexDirection: 'column', gap: 4,
        userSelect: 'none',
      }}
    >
      {/* Row 1: job-dot · name · score */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span title={JOB_LABEL[lead.job_type]} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: jobDot, flexShrink: 0,
        }} />
        <span style={{
          fontSize: 13.5, fontWeight: 600, color: 'var(--ink-1)',
          letterSpacing: '-0.01em', lineHeight: 1.2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          flex: 1, minWidth: 0,
        }}>{lead.name}</span>
        {score != null && (
          <span className="tnum" style={{
            fontSize: 11, fontWeight: 700, color: scoreColor, flexShrink: 0,
          }}>{score}{scoreHot ? '★' : ''}</span>
        )}
      </div>

      {/* Row 2: address */}
      {lead.address && (
        <div style={{
          fontSize: 11.5, color: 'var(--ink-3)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          paddingLeft: 14,
        }}>{lead.address}</div>
      )}

      {/* Row 3: value · job label · OKLCH owner avatar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        paddingLeft: 14, marginTop: 2,
        fontSize: 11, color: 'var(--ink-3)',
      }}>
        {bidLabel && (
          <span className="tnum" style={{ fontWeight: 600, color: 'var(--ink-2)' }}>{bidLabel}</span>
        )}
        {bidLabel && lead.job_type && <span style={{ color: 'var(--ink-4)' }}>·</span>}
        {lead.job_type && <span style={{ color: 'var(--ink-4)' }}>{JOB_LABEL[lead.job_type]}</span>}
        <div style={{ flex: 1 }} />
        <div title={assignee?.name ?? 'Margaret Reyes'} style={{
          width: 18, height: 18, borderRadius: '50%',
          background: avatarBg,
          color: 'white', fontSize: 8.5, fontWeight: 700,
          display: 'grid', placeItems: 'center', flexShrink: 0,
        }}>{avatarInitials}</div>
      </div>

      {/* Row 4 (hover-only): phone */}
      {hover && lead.phone && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          paddingLeft: 14, marginTop: 2,
          fontSize: 11, color: 'var(--ink-3)',
        }}>
          <Phone size={10} strokeWidth={1.8} />
          <span className="tnum">{lead.phone}</span>
        </div>
      )}
    </article>
  )
})

export default LeadCard
