import { memo, useState, useEffect, useRef, useMemo } from 'react'
import { Plus, MoreHorizontal, ArrowUpDown, ArrowUp, ArrowDown, DollarSign, Star, ChevronsLeft, ChevronsRight, Inbox, CheckCircle } from 'lucide-react'
import LeadCard from './LeadCard'

const EMPTY_STATES = {
  'New Lead':          { icon: 'Inbox',       title: 'No new leads',            sub: 'Click + New Lead above or import from a spreadsheet' },
  'Contacted':         { icon: null,           title: 'No leads in contact',     sub: 'Drag a new lead here after making first contact' },
  'In Talks':          { icon: null,           title: 'No leads in talks',       sub: 'Move a contacted lead here when conversation starts' },
  'Consult Scheduled': { icon: null,           title: 'No consults scheduled',   sub: 'Schedule a consult from any lead card' },
  'Consult Completed': { icon: null,           title: 'No consults completed',   sub: 'Complete a consult to run the Deal Scorer' },
  'Estimate Sent':     { icon: null,           title: 'No estimates sent',       sub: 'Send an estimate after completing a consult' },
  'Project Accepted':  { icon: null,           title: 'No accepted projects',    sub: 'Mark an estimate as accepted to move leads here' },
  'Project Scheduled': { icon: null,           title: 'Nothing scheduled',       sub: 'Schedule a project start date' },
  'Won':               { icon: 'CheckCircle',  title: 'No won deals yet',        sub: "Keep going!" },
  'Lost':              { icon: null,           title: 'No lost leads',           sub: "That's a good thing!" },
  'Backlog':           { icon: null,           title: 'Backlog is empty',        sub: 'Leads on hold will appear here' },
}

const EMPTY_ICON_MAP = { Inbox, CheckCircle }

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

const SORT_OPTIONS = [
  { key: 'newest',  label: 'Newest first',      Icon: ArrowDown  },
  { key: 'oldest',  label: 'Oldest first',       Icon: ArrowUp    },
  { key: 'value',   label: 'Highest value',      Icon: DollarSign },
  { key: 'score',   label: 'Highest score',      Icon: Star       },
]

function sortLeads(leads, key) {
  if (!key || key === 'newest') {
    return [...leads].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }
  if (key === 'oldest') {
    return [...leads].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  }
  if (key === 'value') {
    return [...leads].sort((a, b) =>
      (b._scoreDetails?.recommendedBid || 0) - (a._scoreDetails?.recommendedBid || 0)
    )
  }
  if (key === 'score') {
    return [...leads].sort((a, b) => {
      const sa = a.deal_score ?? a.item_quality_score ?? 0
      const sb = b.deal_score ?? b.item_quality_score ?? 0
      return Number(sb) - Number(sa)
    })
  }
  return leads
}

const StageColumn = memo(function StageColumn({
  stage, leads, onCardClick, draggingId, isHover, onDragStart, onAddLead,
}) {
  const meta = STAGE_META[stage] || { tint: '#9CA3AF', soft: 'var(--stage-backlog-soft)' }
  const displayName = STAGE_DISPLAY[stage] || stage

  const [menuOpen, setMenuOpen]     = useState(false)
  const [collapsed, setCollapsed]   = useState(false)
  const [colSort, setColSort]       = useState('newest')
  const menuRef                     = useRef(null)
  const btnRef                      = useRef(null)

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    function onDown(e) {
      if (!menuRef.current?.contains(e.target) && !btnRef.current?.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [menuOpen])

  const sortedLeads = useMemo(() => sortLeads(leads, colSort), [leads, colSort])

  const totalValue = leads.reduce((s, l) => s + (l._scoreDetails?.recommendedBid || 0), 0)
  const pipelineLabel = totalValue > 0
    ? `$${totalValue >= 1000 ? `${(totalValue / 1000).toFixed(1)}k` : totalValue} pipeline`
    : `${leads.length} ${leads.length === 1 ? 'lead' : 'leads'}`

  const activeSortLabel = SORT_OPTIONS.find(o => o.key === colSort)?.label ?? 'Newest first'

  // ── Collapsed state ────────────────────────────────────────────
  if (collapsed) {
    return (
      <section
        data-stage={stage}
        title={`${displayName} — ${leads.length} ${leads.length === 1 ? 'lead' : 'leads'}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: 44,
          minWidth: 44,
          flexShrink: 0,
          background: `color-mix(in oklab, ${meta.soft} 38%, var(--bg-2))`,
          border: '1px solid var(--line)',
          borderRadius: 14,
          padding: '12px 0',
          cursor: 'pointer',
          transition: 'background 180ms ease',
        }}
        onClick={() => setCollapsed(false)}
      >
        {/* Expand icon */}
        <button
          onClick={e => { e.stopPropagation(); setCollapsed(false) }}
          style={{ ...iconBtn, color: meta.tint }}
          title="Expand column"
        >
          <ChevronsRight size={14} strokeWidth={2} />
        </button>

        {/* Rotated stage name */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}>
          <span style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            fontSize: 11.5,
            fontWeight: 600,
            color: 'var(--ink-2)',
            letterSpacing: '0.03em',
            whiteSpace: 'nowrap',
            maxHeight: 160,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {displayName}
          </span>
        </div>

        {/* Lead count badge */}
        <span style={{
          fontSize: 10.5, fontWeight: 700, color: meta.tint,
          background: `color-mix(in oklab, ${meta.tint} 18%, var(--panel))`,
          border: `1px solid color-mix(in oklab, ${meta.tint} 15%, var(--line))`,
          padding: '2px 6px', borderRadius: 999,
          lineHeight: 1.5,
        }}>
          {leads.length}
        </span>
      </section>
    )
  }

  // ── Expanded state ─────────────────────────────────────────────
  return (
    <section
      data-stage={stage}
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: isHover
          ? `color-mix(in oklab, var(--accent) 8%, var(--bg-2))`
          : `color-mix(in oklab, ${meta.soft} 38%, var(--bg-2))`,
        border: isHover
          ? '1.5px dashed var(--accent)'
          : '1px solid var(--line)',
        borderRadius: 14,
        minHeight: 200,
        transition: 'background 180ms ease, border-color 180ms ease',
        position: 'relative',
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
        <button onClick={() => onAddLead?.(stage)} title={`New lead in ${displayName}`} style={iconBtn}>
          <Plus size={14} strokeWidth={2} />
        </button>
        <button
          ref={btnRef}
          onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}
          style={{ ...iconBtn, background: menuOpen ? 'var(--hover)' : 'transparent', color: menuOpen ? 'var(--ink-1)' : 'var(--ink-3)' }}
          title="Column options"
        >
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

      {/* ── Context menu ── */}
      {menuOpen && (
        <div
          ref={menuRef}
          style={{
            position: 'absolute',
            top: 46,
            right: 8,
            zIndex: 200,
            background: 'var(--panel)',
            border: '1px solid var(--line)',
            borderRadius: 10,
            boxShadow: 'var(--shadow-2)',
            minWidth: 190,
            padding: '6px 0',
            animation: 'fadein 100ms ease',
          }}
        >
          {/* Sort section */}
          <div style={{
            padding: '4px 12px 6px',
            fontSize: 10.5, fontWeight: 700,
            color: 'var(--ink-4)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            Sort
          </div>
          {SORT_OPTIONS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => { setColSort(key); setMenuOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                width: '100%', padding: '7px 12px',
                background: colSort === key ? 'var(--accent-soft)' : 'transparent',
                border: 'none', cursor: 'pointer',
                fontSize: 12.5, color: colSort === key ? 'var(--accent-ink)' : 'var(--ink-2)',
                fontWeight: colSort === key ? 600 : 400,
                textAlign: 'left',
                transition: 'background 80ms',
              }}
              onMouseEnter={e => { if (colSort !== key) e.currentTarget.style.background = 'var(--hover)' }}
              onMouseLeave={e => { if (colSort !== key) e.currentTarget.style.background = 'transparent' }}
            >
              <Icon size={13} strokeWidth={colSort === key ? 2.2 : 1.8}
                style={{ flexShrink: 0, color: colSort === key ? 'var(--accent)' : 'var(--ink-4)' }} />
              {label}
              {colSort === key && (
                <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--accent)', fontWeight: 700 }}>✓</span>
              )}
            </button>
          ))}

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--line)', margin: '6px 0' }} />

          {/* Collapse */}
          <button
            onClick={() => { setCollapsed(true); setMenuOpen(false) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 9,
              width: '100%', padding: '7px 12px',
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: 12.5, color: 'var(--ink-2)',
              textAlign: 'left',
              transition: 'background 80ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <ChevronsLeft size={13} strokeWidth={1.8} style={{ flexShrink: 0, color: 'var(--ink-4)' }} />
            Collapse column
          </button>
        </div>
      )}

      {/* Cards */}
      <div className="stage-cards" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '4px 10px 10px',
        overflowY: 'auto',
        minHeight: 60,
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}>
        {sortedLeads.length === 0 ? (
          isHover ? (
            <div style={{
              padding: '16px 10px', textAlign: 'center',
              fontSize: 11.5, color: 'var(--accent)',
              border: '1px dashed var(--accent)',
              borderRadius: 10, marginTop: 4,
              transition: 'color 180ms, border-color 180ms',
            }}>
              Drop here
            </div>
          ) : (() => {
            const es = EMPTY_STATES[stage] || { icon: null, title: 'No leads', sub: '' }
            const IconComp = es.icon ? EMPTY_ICON_MAP[es.icon] : null
            return (
              <div style={{ padding: '20px 10px', textAlign: 'center' }}>
                {IconComp && (
                  <IconComp
                    size={24}
                    strokeWidth={1.5}
                    style={{ color: 'var(--ink-4)', opacity: 0.4, display: 'block', margin: '0 auto 8px' }}
                  />
                )}
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)' }}>{es.title}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 4 }}>{es.sub}</div>
              </div>
            )
          })()
        ) : (
          sortedLeads.map(lead => (
            <LeadCard
              key={lead.id}
              lead={lead}
              stageTint={meta.tint}
              stageSoft={meta.soft}
              isDragging={draggingId === lead.id}
              onPointerDown={e => onDragStart?.(lead, e)}
              onClick={() => onCardClick?.(lead)}
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
