import { useState } from 'react'
import Schedule from './Schedule'
import CalendarView from './CalendarView'

const TABS = ['Calendar', 'Schedule']

export default function CalendarPage() {
  const [tab, setTab] = useState('Calendar')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 2,
        padding: '8px 20px 0',
        borderBottom: '1px solid var(--line)',
        background: 'var(--panel)',
        flexShrink: 0,
      }}>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '7px 16px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: tab === t ? 600 : 500,
              color: tab === t ? 'var(--ink-1)' : 'var(--ink-3)',
              borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1,
              fontFamily: 'inherit',
              transition: 'color 120ms',
            }}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab content — each child must handle its own overflow */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {tab === 'Calendar' ? <Schedule /> : <CalendarView />}
      </div>
    </div>
  )
}
