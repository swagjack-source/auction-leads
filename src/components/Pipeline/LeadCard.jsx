import { memo, useMemo, useState } from 'react'
import { MapPin, Clock } from 'lucide-react'
import { useTeam } from '../../lib/TeamContext'

// ── Job type badge config ──────────────────────────────────────────────────

const JOB_TYPE_COLORS = {
  'Clean Out':          { text: '#4B80C1', bg: 'color-mix(in oklab, #4B80C1 14%, var(--panel))' },
  'Auction':            { text: '#7A5CA5', bg: 'color-mix(in oklab, #7A5CA5 14%, var(--panel))' },
  'Both':               { text: '#3E5C86', bg: 'color-mix(in oklab, #3E5C86 14%, var(--panel))' },
  'Move':               { text: '#3A9E8A', bg: 'color-mix(in oklab, #3A9E8A 14%, var(--panel))' },
}

const FALLBACK_JOB_COLOR = { text: '#6B7280', bg: 'color-mix(in oklab, #6B7280 12%, var(--panel))' }

// ── Helpers ────────────────────────────────────────────────────────────────

function daysAgo(dateStr) {
  if (!dateStr) return null
  const ms = Date.now() - new Date(dateStr).getTime()
  return Math.max(0, Math.floor(ms / 86400000))
}

function formatBid(value) {
  if (value == null) return null
  if (value >= 1000) return `$${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return `$${Math.round(value).toLocaleString()}`
}

function scoreColor(score) {
  const n = Number(score)
  if (n >= 7.5) return 'var(--win)'
  if (n >= 4.5) return 'var(--warn)'
  return 'var(--lose)'
}

// ── Pill ──────────────────────────────────────────────────────────────────

function Pill({ text, textColor, bgColor }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 7px',
      borderRadius: 999,
      fontSize: 10.5, fontWeight: 600,
      color: textColor,
      background: bgColor,
      border: `1px solid color-mix(in oklab, ${textColor} 22%, transparent)`,
      whiteSpace: 'nowrap',
      lineHeight: 1.5,
    }}>
      {text}
    </span>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

const LeadCard = memo(function LeadCard({
  lead, onClick, stageTint, stageSoft, isDragging, onPointerDown,
}) {
  const [hover, setHover] = useState(false)
  const { members } = useTeam()

  const member = useMemo(() => {
    if (!lead.assigned_to) return null
    return members.find(m => String(m.id) === String(lead.assigned_to)) || null
  }, [members, lead.assigned_to])

  const initials = useMemo(() => {
    if (member?.initials) return member.initials
    if (lead.assigned_to) return String(lead.assigned_to).slice(0, 2).toUpperCase()
    return null
  }, [member, lead.assigned_to])

  const days = useMemo(
    () => daysAgo(lead.last_status_change || lead.updated_at || lead.created_at),
    [lead.last_status_change, lead.updated_at, lead.created_at],
  )

  const daysLabel = days === null ? null : days === 0 ? 'Today' : `${days}d`
  const daysColor = days === null ? 'var(--ink-4)'
    : days < 7 ? 'var(--ink-4)'
    : days < 14 ? 'var(--warn)'
    : 'var(--lose)'

  const bid = lead._scoreDetails?.recommendedBid ?? lead.bid_amount ?? null
  const score = lead.deal_score ?? lead.item_quality_score ?? null
  const showScoreRow = score != null || bid != null

  const jobColors = JOB_TYPE_COLORS[lead.job_type] || (lead.job_type ? FALLBACK_JOB_COLOR : null)

  // Status badge
  const wonLostBacklog = ['Won', 'Lost', 'Backlog']
  let statusBadge = null
  if (score != null && !wonLostBacklog.includes(lead.status)) {
    statusBadge = (
      <Pill
        text="Scored"
        textColor="var(--win)"
        bgColor="color-mix(in oklab, var(--win) 14%, var(--panel))"
      />
    )
  } else if (lead.status === 'Estimate Sent') {
    statusBadge = (
      <Pill
        text="Estimate Sent"
        textColor="#4A6FA5"
        bgColor="color-mix(in oklab, #4A6FA5 14%, var(--panel))"
      />
    )
  } else if (score == null && lead.status === 'New Lead') {
    statusBadge = (
      <Pill
        text="Imported"
        textColor="var(--ink-3)"
        bgColor="color-mix(in oklab, var(--ink-3) 10%, var(--panel))"
      />
    )
  }

  if (isDragging) {
    return (
      <div style={{
        height: 120,
        borderRadius: 12,
        border: `1.5px dashed ${stageTint || 'var(--line)'}`,
        background: `color-mix(in oklab, ${stageTint || 'transparent'} 6%, var(--bg-2))`,
        flexShrink: 0,
      }} />
    )
  }

  return (
    <article
      onPointerDown={onPointerDown}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: 'var(--panel)',
        border: `1px solid ${hover ? (stageTint || 'var(--line)') : 'var(--line)'}`,
        borderRadius: 12,
        padding: '10px 11px',
        cursor: 'grab',
        transform: hover ? 'translateY(-1px)' : 'none',
        boxShadow: hover ? 'var(--shadow-2)' : 'var(--shadow-1)',
        transition: 'transform 140ms cubic-bezier(.2,.7,.3,1.1), box-shadow 140ms, border-color 120ms',
        display: 'flex', flexDirection: 'column',
        gap: 5,
        userSelect: 'none',
        touchAction: 'none',
        flexShrink: 0,
      }}
    >
      {/* Row 1: Badges */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, minHeight: 20 }}>
        <div>
          {jobColors && lead.job_type && (
            <Pill text={lead.job_type} textColor={jobColors.text} bgColor={jobColors.bg} />
          )}
        </div>
        <div>{statusBadge}</div>
      </div>

      {/* Row 2: Name */}
      <div style={{
        fontSize: 15, fontWeight: 700,
        color: 'var(--ink-1)',
        letterSpacing: '-0.02em',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {lead.name}
      </div>

      {/* Row 3: Address */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        fontSize: 11.5,
        color: lead.address ? 'var(--ink-3)' : 'var(--ink-4)',
        fontStyle: lead.address ? 'normal' : 'italic',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
      }}>
        <MapPin size={11} strokeWidth={1.8} style={{ flexShrink: 0, color: 'var(--ink-4)' }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {lead.address || 'No address added'}
        </span>
      </div>

      {/* Row 4: Score + Bid */}
      {showScoreRow && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {score != null && (
            <Pill
              text={`${Number(score).toFixed(1)}/10`}
              textColor={scoreColor(score)}
              bgColor={`color-mix(in oklab, ${scoreColor(score)} 12%, var(--panel))`}
            />
          )}
          {bid != null && (
            <span className="tnum" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-1)' }}>
              {formatBid(bid)}
            </span>
          )}
        </div>
      )}

      {/* Row 5: Avatar + Days */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
        {initials ? (
          <div style={{
            width: 24, height: 24, borderRadius: '50%',
            background: member?.color || stageTint || 'var(--ink-4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9.5, fontWeight: 700,
            color: '#fff',
            flexShrink: 0,
            letterSpacing: '0.01em',
          }}>
            {initials}
          </div>
        ) : (
          <div style={{
            width: 24, height: 24, borderRadius: '50%',
            border: '1.5px dashed var(--line-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, color: 'var(--ink-4)',
            flexShrink: 0,
          }}>
            ?
          </div>
        )}

        {daysLabel != null && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 3,
            fontSize: 11, color: daysColor,
            fontVariantNumeric: 'tabular-nums',
          }}>
            <Clock size={10} strokeWidth={2} style={{ flexShrink: 0 }} />
            {daysLabel}
          </div>
        )}
      </div>
    </article>
  )
})

export default LeadCard
