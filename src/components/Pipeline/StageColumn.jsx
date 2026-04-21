import { memo } from 'react'
import { Plus, MoreHorizontal } from 'lucide-react'
import LeadCard from './LeadCard'

export const STAGE_META = {
  'New Lead':          { tint: '#8A8A80', soft: 'var(--stage-new-soft)'       },
  'Contacted':         { tint: '#6B7A8F', soft: 'var(--stage-contacted-soft)' },
  'In Talks':          { tint: '#3E5C86', soft: 'var(--stage-talks-soft)'     },
  'Consult Scheduled': { tint: '#4A6FA5', soft: 'var(--stage-sched-soft)'     },
  'Consult Completed': { tint: '#7A5CA5', soft: 'var(--stage-done-soft)'      },
  'Estimate Sent':     { tint: '#A50050', soft: 'var(--stage-new-soft)'       },
  'Project Accepted':  { tint: '#6A8A4A', soft: 'var(--stage-accepted-soft)'  },
  'Project Scheduled': { tint: '#C28A2A', soft: 'var(--stage-project-soft)'   },
  'Won':               { tint: '#2F7A55', soft: 'var(--stage-won-soft)'       },
  'Lost':              { tint: '#A14646', soft: 'var(--stage-lost-soft)'      },
  'Backlog':           { tint: '#6B7280', soft: 'var(--stage-backlog-soft)'   },
}

const STAGE_DISPLAY = {
  'Project Scheduled': 'Scheduled',
}

const StageColumn = memo(function StageColumn({
  stage, leads, onCardClick, onMoveStatus,
  draggingId, isHover,
  onDragOver, onDragLeave, onDrop,
  onDragStart, onDragEnd,
}) {
  const meta = STAGE_META[stage] || { tint: '#9CA3AF', soft: 'var(--stage-backlog-soft)' }
  const displayName = STAGE_DISPLAY[stage] || stage

  const totalValue = leads.reduce((s, l) => s + (l._scoreDetails?.recommendedBid || 0), 0)
  const pipelineLabel = totalValue > 0
    ? `$${totalValue >= 1000 ? `${(totalValue / 1000).toFixed(1)}k` : totalValue} pipeline`
    : `${leads.length} ${leads.length === 1 ? 'lead' : 'leads'}`

  return (
    <section
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: isHover
          ? 'var(--accent-soft)'
          : `color-mix(in oklab, ${meta.soft} 38%, var(--bg-2))`,
        border: isHover ? '1px dashed var(--accent)' : '1px solid var(--line)',
        borderRadius: 14,
        minHeight: 200,
        transition: 'background 120ms, border-color 120ms',
      }}>

      {/* Column header */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '11px 12px 10px',
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: meta.tint,
          boxShadow: `0 0 0 3px color-mix(in oklab, ${meta.tint} 20%, var(--bg-2))`,
          flexShrink: 0,
        }} />
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-1)', flex: 1 }}>{displayName}</span>
        <span style={{
          fontSize: 11, fontWeight: 600, color: 'var(--ink-1)',
          background: `color-mix(in oklab, ${meta.tint} 22%, var(--panel))`,
          border: `1px solid color-mix(in oklab, ${meta.tint} 18%, var(--line))`,
          padding: '1px 7px', borderRadius: 999,
        }}>{leads.length}</span>
        <button onClick={e => e.stopPropagation()} style={iconBtn}>
          <Plus size={14} strokeWidth={2} />
        </button>
        <button onClick={e => e.stopPropagation()} style={iconBtn}>
          <MoreHorizontal size={14} strokeWidth={2} />
        </button>
      </header>

      {/* Pipeline value sub-line */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0 12px 6px',
        fontSize: 11, color: 'var(--ink-4)',
      }}>
        <span className="tnum">{pipelineLabel}</span>
        {totalValue > 0 && (
          <span className="tnum">{leads.length} {leads.length === 1 ? 'deal' : 'deals'}</span>
        )}
      </div>

      {/* Cards */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '4px 10px 10px',
        overflowY: 'auto',
        minHeight: 60,
      }}>
        {leads.length === 0 ? (
          <div style={{
            padding: '16px 10px', textAlign: 'center',
            fontSize: 11.5, color: 'var(--ink-4)',
            border: '1px dashed var(--line)', borderRadius: 10, marginTop: 4,
          }}>
            Drop a lead here
          </div>
        ) : (
          leads.map(lead => (
            <LeadCard
              key={lead.id}
              lead={lead}
              stageTint={meta.tint}
              stageSoft={meta.soft}
              isDragging={draggingId === lead.id}
              onDragStart={(e) => onDragStart(e, lead.id)}
              onDragEnd={onDragEnd}
              onClick={() => onCardClick(lead)}
            />
          ))
        )}
      </div>
    </section>
  )
})

export default StageColumn

const iconBtn = {
  width: 22, height: 22, borderRadius: 6, border: 'none',
  background: 'transparent', cursor: 'pointer',
  display: 'grid', placeItems: 'center',
  color: 'var(--ink-3)', flexShrink: 0,
}
