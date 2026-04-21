import { useMemo, useState } from 'react'
import { STAGE_META } from './StageColumn'

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

const JOB_DOT = {
  'Clean Out': '#C28A5A',
  'Auction':   '#8666BD',
  'Both':      '#5A7FB3',
}

const calNavBtn = {
  width: 26, height: 26, borderRadius: 7,
  border: '1px solid var(--line)', background: 'var(--panel)',
  color: 'var(--ink-2)', cursor: 'pointer',
  fontSize: 13, display: 'grid', placeItems: 'center',
  fontFamily: 'inherit',
}

export default function PipelineCalendarView({ leads, onOpen }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const totalCells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7
  const today = new Date()

  const byDay = useMemo(() => {
    const m = {}
    for (let d = 1; d <= daysInMonth; d++) m[d] = []
    leads.forEach(l => {
      if (!l.created_at) return
      const d = new Date(l.created_at)
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate()
        if (m[day]) m[day].push(l)
      }
    })
    return m
  }, [leads, year, month, daysInMonth])

  const cells = []
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - firstDayOfWeek + 1
    cells.push(dayNum >= 1 && dayNum <= daysInMonth ? dayNum : null)
  }

  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '0 20px 20px' }}>
      {/* Month header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 0 12px' }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-1)' }}>{monthLabel}</span>
        <div style={{ display: 'inline-flex', gap: 2 }}>
          <button style={calNavBtn} onClick={prevMonth}>‹</button>
          <button style={calNavBtn} onClick={nextMonth}>›</button>
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Leads by date created</span>
      </div>

      {/* Weekday header */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
        background: 'var(--bg-2)',
        borderRadius: '10px 10px 0 0',
        border: '1px solid var(--line)', borderBottom: 'none',
      }}>
        {WEEKDAYS.map(w => (
          <div key={w} style={{
            padding: '8px 10px',
            fontSize: 10.5, fontWeight: 600, color: 'var(--ink-3)',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            borderRight: '1px solid var(--line-2)',
          }}>{w}</div>
        ))}
      </div>

      {/* Grid */}
      <div style={{
        flex: 1, minHeight: 0, overflow: 'auto',
        border: '1px solid var(--line)',
        borderRadius: '0 0 10px 10px',
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
        gridAutoRows: 'minmax(130px, 1fr)',
        background: 'var(--panel)',
      }}>
        {cells.map((dayNum, i) => {
          const isToday = dayNum != null &&
            dayNum === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear()
          const rowLeads = dayNum ? (byDay[dayNum] || []) : []
          return (
            <div key={i} style={{
              borderRight: (i % 7 !== 6) ? '1px solid var(--line-2)' : 'none',
              borderTop: i >= 7 ? '1px solid var(--line-2)' : 'none',
              padding: 6,
              background: dayNum == null ? 'var(--bg-2)' : isToday ? 'var(--accent-soft)' : 'var(--panel)',
              display: 'flex', flexDirection: 'column', gap: 4,
              overflow: 'hidden', minHeight: 0,
            }}>
              {dayNum && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px 2px' }}>
                  <span className="tnum" style={{
                    fontSize: 12, fontWeight: isToday ? 700 : 500,
                    color: isToday ? 'var(--accent-ink)' : 'var(--ink-2)',
                  }}>{dayNum}</span>
                  {rowLeads.length > 0 && (
                    <span style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--ink-3)' }}>{rowLeads.length}</span>
                  )}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, overflow: 'hidden' }}>
                {rowLeads.slice(0, 4).map(l => {
                  const meta = STAGE_META[l.status] || { tint: '#9CA3AF', soft: 'var(--stage-backlog-soft)' }
                  return (
                    <button key={l.id}
                      onClick={() => onOpen && onOpen(l)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '3px 6px',
                        background: `color-mix(in oklab, ${meta.soft} 30%, var(--panel))`,
                        border: `1px solid color-mix(in oklab, ${meta.tint} 20%, var(--line))`,
                        borderLeft: `3px solid ${meta.tint}`,
                        borderRadius: 5, cursor: 'pointer', textAlign: 'left',
                        fontSize: 11, fontWeight: 500, color: 'var(--ink-1)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        minWidth: 0, fontFamily: 'inherit',
                      }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0, background: JOB_DOT[l.job_type] || '#9CA3AF' }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</span>
                    </button>
                  )
                })}
                {rowLeads.length > 4 && (
                  <span style={{ fontSize: 10.5, color: 'var(--ink-3)', padding: '1px 6px', fontWeight: 500 }}>
                    +{rowLeads.length - 4} more
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
