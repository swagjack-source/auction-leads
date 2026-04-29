import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { STAGE_META } from './StageColumn'
import { supabase } from '../../lib/supabase'
import { useTeam } from '../../lib/TeamContext'

const STAGES_ORDER = [
  'New Lead', 'Contacted', 'In Talks', 'Consult Scheduled', 'Consult Completed',
  'Estimate Sent', 'Project Accepted', 'Project Scheduled', 'Won', 'Lost', 'Backlog',
]

const ALL_STAGES = STAGES_ORDER

const JOB_TYPES = ['Clean Out', 'Auction', 'Both', 'Move', 'Sorting/Organizing', 'Unknown']

// Columns: key, label, width, editable, type
const COLS = [
  { key: 'name',     label: 'Client',   width: 200, editable: true,  type: 'text'   },
  { key: 'phone',    label: 'Phone',    width: 130, editable: true,  type: 'tel'    },
  { key: 'address',  label: 'Address',  width: 220, editable: true,  type: 'text'   },
  { key: 'job_type', label: 'Type',     width: 130, editable: true,  type: 'select', options: JOB_TYPES },
  { key: 'status',   label: 'Stage',    width: 170, editable: true,  type: 'select', options: ALL_STAGES },
  { key: '_score',   label: 'Score',    width: 60,  editable: false, type: 'score'  },
  { key: '_value',   label: 'Value',    width: 80,  editable: false, type: 'value'  },
  { key: '_age',     label: 'Age',      width: 60,  editable: false, type: 'age'    },
]

function scoreColor(score) {
  const n = Number(score)
  if (n >= 7.5) return 'var(--win)'
  if (n >= 4.5) return 'var(--warn)'
  return 'var(--lose)'
}

function formatBid(value) {
  if (value == null) return '—'
  if (value >= 1000) return `$${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return `$${Math.round(value).toLocaleString()}`
}

function daysAgo(dateStr) {
  if (!dateStr) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000))
}

// ── Inline cell editor ─────────────────────────────────────────────────────

function EditableCell({ col, lead, editCell, editValue, onStartEdit, onCommit, onCancel, onTab, inputRef }) {
  const isEditing = editCell?.id === lead.id && editCell?.col === col.key

  const displayValue = () => {
    if (col.key === '_score') {
      const s = lead.deal_score ?? lead.item_quality_score ?? null
      return s != null ? (
        <span style={{ fontSize: 12, fontWeight: 600, color: scoreColor(s) }}>
          {Number(s).toFixed(1)}
        </span>
      ) : <span style={{ color: 'var(--ink-4)' }}>—</span>
    }
    if (col.key === '_value') {
      const bid = lead._scoreDetails?.recommendedBid ?? lead.bid_amount ?? null
      return <span className="tnum" style={{ fontWeight: 600, color: 'var(--ink-1)' }}>{formatBid(bid)}</span>
    }
    if (col.key === '_age') {
      const d = daysAgo(lead.last_status_change || lead.updated_at || lead.created_at)
      return (
        <span className="tnum" style={{ color: d >= 14 ? 'var(--lose)' : d >= 7 ? 'var(--warn)' : 'var(--ink-3)', fontWeight: d >= 7 ? 600 : 400 }}>
          {d}d
        </span>
      )
    }
    if (col.key === 'status') {
      const tint = STAGE_META[lead.status]?.tint || '#9CA3AF'
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 12, fontWeight: 600, color: tint,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: tint, flexShrink: 0 }} />
          {lead.status}
        </span>
      )
    }
    const val = lead[col.key]
    return (
      <span style={{ color: val ? 'var(--ink-1)' : 'var(--ink-4)', fontStyle: val ? 'normal' : 'italic' }}>
        {val || '—'}
      </span>
    )
  }

  const cellStyle = {
    width: col.width, minWidth: col.width, maxWidth: col.width,
    padding: '0 6px',
    display: 'flex', alignItems: 'center',
    fontSize: 12.5,
    overflow: 'hidden',
    flexShrink: 0,
    position: 'relative',
  }

  if (isEditing && col.type === 'select') {
    return (
      <div style={cellStyle}>
        <select
          ref={inputRef}
          value={editValue}
          onChange={e => onCommit(lead, col.key, e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Escape') { e.preventDefault(); onCancel() }
          }}
          onBlur={() => onCommit(lead, col.key, editValue)}
          style={{
            width: '100%', padding: '3px 4px',
            fontSize: 12, border: '1px solid var(--accent)',
            borderRadius: 5, background: 'var(--bg)',
            color: 'var(--ink-1)', outline: 'none',
            fontFamily: 'inherit',
          }}
        >
          {col.options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    )
  }

  if (isEditing && col.editable) {
    return (
      <div style={cellStyle}>
        <input
          ref={inputRef}
          type={col.type === 'tel' ? 'tel' : 'text'}
          value={editValue}
          onChange={e => {
            // Update via parent — but we need to use editValue state
            // The parent manages editValue, so we call onStartEdit with new value
            onStartEdit(lead, col.key, e.target.value)
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); onCommit(lead, col.key, editValue); onCancel() }
            if (e.key === 'Escape') { e.preventDefault(); onCancel() }
            if (e.key === 'Tab') { e.preventDefault(); onTab(lead, col.key, e.shiftKey) }
          }}
          onBlur={() => onCommit(lead, col.key, editValue)}
          style={{
            width: '100%', padding: '3px 4px',
            fontSize: 12, border: '1px solid var(--accent)',
            borderRadius: 5, background: 'var(--bg)',
            color: 'var(--ink-1)', outline: 'none',
            fontFamily: 'inherit',
          }}
        />
      </div>
    )
  }

  return (
    <div
      style={{
        ...cellStyle,
        cursor: col.editable ? 'text' : 'default',
        borderRadius: 4,
        transition: 'background 80ms',
      }}
      onClick={col.editable ? e => { e.stopPropagation(); onStartEdit(lead, col.key) } : undefined}
      title={col.editable ? `Click to edit ${col.label}` : undefined}
    >
      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
        {displayValue()}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function PipelineListView({ leads, onOpen, onUpdate }) {
  const { members } = useTeam()
  const [sort, setSort] = useState({ key: 'created_at', dir: 'desc' })
  const [expanded, setExpanded] = useState(() => new Set(STAGES_ORDER))
  const [editCell, setEditCell] = useState(null) // { id, col }
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (editCell) {
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [editCell])

  const toggleStage = useCallback((stage) => {
    setExpanded(prev => {
      const n = new Set(prev)
      n.has(stage) ? n.delete(stage) : n.add(stage)
      return n
    })
  }, [])

  const handleStartEdit = useCallback((lead, col, value) => {
    if (value !== undefined) {
      setEditValue(value)
    } else {
      setEditCell({ id: lead.id, col })
      setEditValue(lead[col] ?? '')
    }
  }, [])

  const handleCommit = useCallback(async (lead, col, value) => {
    const trimmed = (value ?? '').toString().trim()
    const original = (lead[col] ?? '').toString().trim()
    setEditCell(null)
    if (trimmed === original) return

    const update = { [col]: trimmed || null }
    onUpdate?.(lead.id, update)
    await supabase.from('leads').update(update).eq('id', lead.id)
  }, [onUpdate])

  const handleCancel = useCallback(() => {
    setEditCell(null)
    setEditValue('')
  }, [])

  const handleTab = useCallback((lead, currentCol, shift) => {
    const editableCols = COLS.filter(c => c.editable).map(c => c.key)
    const idx = editableCols.indexOf(currentCol)
    const nextIdx = shift ? idx - 1 : idx + 1
    if (nextIdx >= 0 && nextIdx < editableCols.length) {
      const nextCol = editableCols[nextIdx]
      setEditCell({ id: lead.id, col: nextCol })
      setEditValue(lead[nextCol] ?? '')
    } else {
      setEditCell(null)
    }
  }, [])

  const getMemberName = useCallback((assignedTo) => {
    if (!assignedTo) return null
    const m = members.find(m => String(m.id) === String(assignedTo))
    return m?.name || m?.initials || String(assignedTo).slice(0, 8)
  }, [members])

  const sortFn = useCallback((arr) => {
    const a = [...arr]
    const { key, dir } = sort
    a.sort((x, y) => {
      let xv, yv
      if (key === 'name') { xv = (x.name || '').toLowerCase(); yv = (y.name || '').toLowerCase() }
      else if (key === '_value') { xv = x._scoreDetails?.recommendedBid || 0; yv = y._scoreDetails?.recommendedBid || 0 }
      else if (key === '_score') { xv = x.deal_score || x.item_quality_score || 0; yv = y.deal_score || y.item_quality_score || 0 }
      else if (key === '_age') {
        xv = daysAgo(x.last_status_change || x.updated_at || x.created_at)
        yv = daysAgo(y.last_status_change || y.updated_at || y.created_at)
      }
      else if (key === 'created_at') { xv = new Date(x.created_at); yv = new Date(y.created_at) }
      else { xv = x[key] || ''; yv = y[key] || '' }
      if (xv < yv) return dir === 'asc' ? -1 : 1
      if (xv > yv) return dir === 'asc' ? 1 : -1
      return 0
    })
    return a
  }, [sort])

  const grouped = useMemo(() => {
    const g = {}
    for (const s of STAGES_ORDER) g[s] = []
    leads.forEach(l => { if (g[l.status]) g[l.status].push(l) })
    return g
  }, [leads])

  function toggleSort(key) {
    setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })
  }

  const totalWidth = COLS.reduce((s, c) => s + c.width, 0)

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '0 20px 20px' }}>
      <div style={{
        background: 'var(--panel)',
        border: '1px solid var(--line)',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-1)',
        minWidth: totalWidth + 120,
      }}>

        {/* Column headers */}
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '10px 16px 10px 14px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--bg-2)',
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          {/* Expand toggle placeholder */}
          <div style={{ width: 24, flexShrink: 0 }} />

          {COLS.map(col => (
            <button
              key={col.key}
              onClick={() => toggleSort(col.key)}
              style={{
                width: col.width, minWidth: col.width, maxWidth: col.width,
                flexShrink: 0, padding: '0 6px',
                display: 'flex', alignItems: 'center', gap: 4,
                border: 'none', background: 'transparent', cursor: 'pointer',
                fontSize: 11, fontWeight: 700, color: sort.key === col.key ? 'var(--accent-ink)' : 'var(--ink-4)',
                textTransform: 'uppercase', letterSpacing: '0.06em',
                fontFamily: 'inherit',
              }}
            >
              {col.label}
              {sort.key === col.key && (
                <span style={{ fontSize: 9 }}>{sort.dir === 'asc' ? '↑' : '↓'}</span>
              )}
            </button>
          ))}

          {/* Owner col */}
          <div style={{ width: 100, minWidth: 100, padding: '0 6px', fontSize: 11, fontWeight: 700, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
            Owner
          </div>

          <div style={{ flex: 1 }} />
        </div>

        {/* Grouped rows */}
        {STAGES_ORDER.map(stage => {
          const rows = sortFn(grouped[stage] || [])
          if (!rows.length) return null
          const meta = STAGE_META[stage] || { tint: '#9CA3AF', soft: 'var(--stage-backlog-soft)' }
          const open = expanded.has(stage)
          const total = rows.reduce((s, c) => s + (c._scoreDetails?.recommendedBid || 0), 0)

          return (
            <div key={stage}>
              {/* Stage group header */}
              <button
                onClick={() => toggleStage(stage)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '9px 16px 9px 14px',
                  background: `color-mix(in oklab, ${meta.soft} 18%, var(--bg-2))`,
                  border: 'none', borderTop: '1px solid var(--line)',
                  borderBottom: open ? '1px solid var(--line)' : 'none',
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                }}
              >
                <span style={{
                  fontSize: 10, color: 'var(--ink-3)',
                  display: 'inline-block',
                  transform: open ? 'rotate(90deg)' : 'none',
                  transition: 'transform 120ms',
                  width: 14,
                }}>▸</span>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.tint, flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-1)', letterSpacing: '-0.01em' }}>{stage}</span>
                <span style={{
                  fontSize: 11, fontWeight: 600, color: meta.tint,
                  background: `color-mix(in oklab, ${meta.tint} 15%, var(--panel))`,
                  border: `1px solid color-mix(in oklab, ${meta.tint} 20%, var(--line))`,
                  padding: '1px 7px', borderRadius: 999,
                }}>{rows.length}</span>
                <div style={{ flex: 1 }} />
                {total > 0 && (
                  <span className="tnum" style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>
                    {total >= 1000 ? `$${(total / 1000).toFixed(1)}k` : `$${total}`} pipeline
                  </span>
                )}
              </button>

              {/* Data rows */}
              {open && rows.map((lead, rowIdx) => {
                const memberName = getMemberName(lead.assigned_to)
                const memberColor = members.find(m => String(m.id) === String(lead.assigned_to))?.color

                return (
                  <div
                    key={lead.id}
                    style={{
                      display: 'flex', alignItems: 'center',
                      padding: '0 16px 0 14px',
                      height: 40,
                      borderTop: rowIdx > 0 ? '1px solid var(--line-2)' : 'none',
                      background: 'var(--panel)',
                      transition: 'background 80ms',
                    }}
                    onMouseEnter={e => { if (!editCell) e.currentTarget.style.background = 'var(--hover)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--panel)' }}
                  >
                    {/* Row open icon */}
                    <div style={{ width: 24, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                      <button
                        onClick={() => onOpen?.(lead)}
                        title="Open lead"
                        style={{
                          width: 20, height: 20, borderRadius: 5,
                          border: '1px solid var(--line)',
                          background: 'transparent', cursor: 'pointer',
                          display: 'grid', placeItems: 'center',
                          color: 'var(--ink-4)', fontSize: 11,
                          flexShrink: 0,
                        }}
                      >↗</button>
                    </div>

                    {/* Editable cells */}
                    {COLS.map(col => (
                      <EditableCell
                        key={col.key}
                        col={col}
                        lead={lead}
                        editCell={editCell}
                        editValue={editValue}
                        onStartEdit={(lead, col, val) => {
                          if (val !== undefined) {
                            setEditValue(val)
                          } else {
                            setEditCell({ id: lead.id, col })
                            setEditValue(lead[col] ?? '')
                          }
                        }}
                        onCommit={handleCommit}
                        onCancel={handleCancel}
                        onTab={handleTab}
                        inputRef={editCell?.id === lead.id && editCell?.col === col.key ? inputRef : null}
                      />
                    ))}

                    {/* Owner cell (read-only, avatar) */}
                    <div style={{ width: 100, minWidth: 100, padding: '0 6px', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {lead.assigned_to ? (
                        <>
                          <div style={{
                            width: 20, height: 20, borderRadius: '50%',
                            background: memberColor || meta.tint,
                            color: '#fff', fontSize: 8.5, fontWeight: 700,
                            display: 'grid', placeItems: 'center', flexShrink: 0,
                          }}>
                            {(memberName || '?').slice(0, 2).toUpperCase()}
                          </div>
                          <span style={{ fontSize: 11.5, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {memberName}
                          </span>
                        </>
                      ) : (
                        <span style={{ fontSize: 11.5, color: 'var(--ink-4)', fontStyle: 'italic' }}>Unassigned</span>
                      )}
                    </div>

                    <div style={{ flex: 1 }} />
                  </div>
                )
              })}
            </div>
          )
        })}

        {leads.length === 0 && (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>
            No leads match the current filters.
          </div>
        )}
      </div>

      <p style={{ fontSize: 11, color: 'var(--ink-4)', textAlign: 'center', marginTop: 10 }}>
        Click any cell to edit inline · Tab to advance · Enter or click away to save
      </p>
    </div>
  )
}
