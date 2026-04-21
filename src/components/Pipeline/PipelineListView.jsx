import { useState, useMemo } from 'react'
import { STAGE_META } from './StageColumn'

const STAGES_ORDER = [
  'New Lead', 'Contacted', 'In Talks', 'Consult Scheduled', 'Consult Completed',
  'Project Accepted', 'Project Scheduled', 'Won', 'Lost', 'Backlog',
]

const JOB_STYLE = {
  'Clean Out': { bg: 'var(--b-cleanout-bg)', fg: 'var(--b-cleanout-fg)' },
  'Auction':   { bg: 'var(--b-auction-bg)',  fg: 'var(--b-auction-fg)'  },
  'Both':      { bg: 'var(--b-both-bg)',     fg: 'var(--b-both-fg)'     },
}

function strToHue(str = '') {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360
  return h
}

export default function PipelineListView({ leads, onOpen }) {
  const [sort, setSort] = useState({ key: 'age', dir: 'asc' })
  const [expanded, setExpanded] = useState(() => new Set(STAGES_ORDER))

  const toggleStage = (id) => {
    setExpanded(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  const sortFn = (arr) => {
    const a = [...arr]
    const { key, dir } = sort
    a.sort((x, y) => {
      let xv = key === 'name' ? (x.name || '').toLowerCase()
             : key === 'value' ? (x._scoreDetails?.recommendedBid || 0)
             : key === 'score' ? (x.deal_score || 0)
             : key === 'age'   ? (x._agedays || 0)
             : x[key]
      let yv = key === 'name' ? (y.name || '').toLowerCase()
             : key === 'value' ? (y._scoreDetails?.recommendedBid || 0)
             : key === 'score' ? (y.deal_score || 0)
             : key === 'age'   ? (y._agedays || 0)
             : y[key]
      if (xv < yv) return dir === 'asc' ? -1 : 1
      if (xv > yv) return dir === 'asc' ?  1 : -1
      return 0
    })
    return a
  }

  const grouped = useMemo(() => {
    const g = {}
    for (const s of STAGES_ORDER) g[s] = []
    leads.forEach(l => { if (g[l.status]) g[l.status].push(l) })
    return g
  }, [leads])

  const headerCell = (label, key, w, align) => (
    <button
      onClick={() => setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        border: 'none', background: 'transparent', cursor: 'pointer',
        fontSize: 11, fontWeight: 600, color: 'var(--ink-3)',
        textTransform: 'uppercase', letterSpacing: '0.05em',
        padding: 0, justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
        width: w, minWidth: w, fontFamily: 'inherit',
      }}>
      {label}
      {sort.key === key && (
        <span style={{ fontSize: 9, color: 'var(--ink-2)' }}>{sort.dir === 'asc' ? '↑' : '↓'}</span>
      )}
    </button>
  )

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '0 20px 20px' }}>
      <div style={{
        background: 'var(--panel)', border: '1px solid var(--line)',
        borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-1)',
      }}>
        {/* Column header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '11px 16px 11px 38px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--bg-2)',
        }}>
          {headerCell('Client', 'name', 260)}
          {headerCell('Address', 'address', 260)}
          {headerCell('Type', 'job_type', 90)}
          {headerCell('Score', 'score', 60, 'right')}
          {headerCell('Value', 'value', 90, 'right')}
          {headerCell('Owner', 'assigned_to', 90)}
          {headerCell('Age', 'age', 60, 'right')}
          <div style={{ flex: 1 }} />
        </div>

        {STAGES_ORDER.map(stage => {
          const rows = sortFn(grouped[stage] || [])
          if (!rows.length) return null
          const meta = STAGE_META[stage] || { tint: '#9CA3AF', soft: 'var(--stage-backlog-soft)' }
          const open = expanded.has(stage)
          const total = rows.reduce((s, c) => s + (c._scoreDetails?.recommendedBid || 0), 0)
          return (
            <div key={stage}>
              <button onClick={() => toggleStage(stage)} style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '10px 16px 10px 14px',
                background: `color-mix(in oklab, ${meta.soft} 16%, var(--bg-2))`,
                border: 'none', borderTop: '1px solid var(--line)',
                borderBottom: open ? '1px solid var(--line)' : 'none',
                cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
              }}>
                <span style={{ color: 'var(--ink-3)', fontSize: 11, display: 'inline-block', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 120ms' }}>▸</span>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.tint, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-1)' }}>{stage}</span>
                <span style={{
                  fontSize: 11, fontWeight: 600, color: 'var(--ink-3)',
                  background: 'var(--panel)', padding: '1px 7px', borderRadius: 999,
                  border: '1px solid var(--line)',
                }}>{rows.length}</span>
                <div style={{ flex: 1 }} />
                <span className="tnum" style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                  {total > 0 ? `$${(total / 1000).toFixed(1)}k` : ''}
                </span>
              </button>

              {open && rows.map(c => {
                const jobStyle = JOB_STYLE[c.job_type] || { bg: 'var(--bg-2)', fg: 'var(--ink-3)' }
                const score = c.deal_score != null ? Math.round(c.deal_score) : null
                const hot = score != null && score >= 8
                const bid = c._scoreDetails?.recommendedBid
                const bidLabel = bid != null ? `$${bid >= 1000 ? `${(bid / 1000).toFixed(1)}k` : bid}` : '—'
                const avatarHue = strToHue(c.assigned_to || 'mr')
                const ageDays = c.created_at
                  ? Math.floor((Date.now() - new Date(c.created_at)) / 86400000)
                  : 0
                return (
                  <div key={c.id}
                    onClick={() => onOpen && onOpen(c)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '12px 16px 12px 38px',
                      borderTop: '1px solid var(--line-2)',
                      cursor: 'pointer',
                      background: 'var(--panel)',
                      transition: 'background 100ms',
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'var(--hover)'}
                    onMouseOut={e => e.currentTarget.style.background = 'var(--panel)'}>
                    <div style={{ width: 260, minWidth: 260, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono, monospace' }}>#{String(c.id).slice(0, 6)}</span>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                    </div>
                    <div style={{ width: 260, minWidth: 260, fontSize: 12.5, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.address}</div>
                    <div style={{ width: 90, minWidth: 90 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.01em', background: jobStyle.bg, color: jobStyle.fg, padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase' }}>{c.job_type || '—'}</span>
                    </div>
                    <div className="tnum" style={{ width: 60, minWidth: 60, textAlign: 'right', fontSize: 13, fontWeight: 600, color: hot ? 'var(--win)' : score != null && score >= 5 ? 'var(--ink-2)' : score != null ? 'var(--lose)' : 'var(--ink-4)' }}>
                      {score != null ? `${score}` : '—'}
                    </div>
                    <div className="tnum" style={{ width: 90, minWidth: 90, textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--ink-1)' }}>{bidLabel}</div>
                    <div style={{ width: 90, minWidth: 90, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: `oklch(0.72 0.08 ${avatarHue})`, color: 'white', fontSize: 9, fontWeight: 600, display: 'grid', placeItems: 'center' }}>
                        {(c.assigned_to || 'MR').slice(0, 2).toUpperCase()}
                      </div>
                    </div>
                    <div className="tnum" style={{ width: 60, minWidth: 60, textAlign: 'right', fontSize: 12, color: ageDays > 7 ? 'var(--lose)' : 'var(--ink-3)', fontWeight: ageDays > 7 ? 600 : 400 }}>{ageDays}d</div>
                    <div style={{ flex: 1 }} />
                    <span style={{ color: 'var(--ink-4)', fontSize: 13 }}>›</span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
