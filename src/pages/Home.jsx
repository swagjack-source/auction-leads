import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight, Gavel, Wallet, Phone, CalendarDays, Users, FileText,
  Plus, Home as HomeIcon,
} from 'lucide-react'

// ── Shell data ────────────────────────────────────────────────

const TIMELINE = [
  { day: 'today',    time: '9:00 AM',  endTime: '9:30 AM',  type: 'meeting',   title: 'Standup — Ops team',              detail: '5 attendees · Zoom',               done: true  },
  { day: 'today',    time: '10:45 AM', endTime: '11:30 AM', type: 'consult',   title: 'Intake — Margaret Reyes',         detail: '1847 Oak Lane · Evanston',         done: false, hot: true },
  { day: 'today',    time: '1:00 PM',  endTime: null,       type: 'milestone', title: 'Halverson Estate — auction goes live', detail: 'CTBids · 48 lots posted',     done: false },
  { day: 'today',    time: '2:30 PM',  endTime: '4:00 PM',  type: 'project',   title: 'Chen cleanout — crew onsite',     detail: 'Dolores + 2 · 3804 Sheridan Rd',   done: false },
  { day: 'today',    time: '5:15 PM',  endTime: null,       type: 'meeting',   title: 'Call back — Franklin partner',    detail: 'Re: referral commission Q2',       done: false },
  { day: 'tomorrow', time: '8:30 AM',  endTime: '9:00 AM',  type: 'meeting',   title: 'Consult — Baker family',          detail: '2214 Ridge Ave · Winnetka',        done: false },
  { day: 'tomorrow', time: '11:00 AM', endTime: null,       type: 'milestone', title: 'Patel Estate — staging starts',   detail: 'Est. 3 days on site',              done: false },
  { day: 'tomorrow', time: '3:00 PM',  endTime: '3:45 PM',  type: 'meeting',   title: 'Review — Q2 revenue forecast',    detail: 'With Mike & Tasha',                done: false },
]

const TYPE_STYLE = {
  meeting:   { color: 'var(--accent)',  bg: 'var(--accent-soft)',  label: 'Meeting'   },
  consult:   { color: '#B87333',        bg: '#F6EEE2',             label: 'Consult'   },
  milestone: { color: 'var(--win)',     bg: 'var(--win-soft)',     label: 'Milestone' },
  project:   { color: '#6B7B8C',        bg: '#EEF1F4',             label: 'Onsite'    },
}

const NEW_LEADS = [
  { id: 'L-2041', name: 'Halverson Estate',   addr: 'Oak Park, IL',    score: 8.2, value: '$12.4k', type: 'Both',      age: '2h ago',  hot: true  },
  { id: 'L-2040', name: 'Patel / Kenilworth', addr: 'Kenilworth, IL',  score: 7.8, value: '$9.1k',  type: 'Auction',   age: '6h ago',  hot: true  },
  { id: 'L-2039', name: 'Baker family',        addr: 'Winnetka, IL',   score: 6.4, value: '$4.8k',  type: 'Clean Out', age: '1d ago',  hot: false },
]

const ATTENTION = [
  { priority: 'urgent', Icon: Wallet,      text: 'Send invoice to Margaret Reyes',   meta: 'Overdue by 2 days',    action: 'Send'   },
  { priority: 'urgent', Icon: Phone,       text: 'Call back — Franklin partner',      meta: 'Re: Q2 commission',    action: 'Call'   },
  { priority: 'today',  Icon: CalendarDays,text: 'Schedule Patel staging day',        meta: 'Needs 3-day window',   action: 'Plan'   },
  { priority: 'today',  Icon: Users,       text: 'Run payroll — 6 W-2s, 3 1099s',    meta: 'Cut-off 5:00 PM',      action: 'Run'    },
  { priority: 'week',   Icon: FileText,    text: 'Approve Harper family contract',    meta: 'Sent by legal Fri',    action: 'Review' },
]

const PULSE = [
  { status: 'starting', title: 'Patel Estate — staging',     client: 'Ravi Patel',     date: 'Tomorrow',   crew: 'Dolores + 2', value: '$14.2k' },
  { status: 'starting', title: 'Chen cleanout',              client: 'Chen family',    date: 'Today',      crew: 'Marcus + 1',  value: '$6.8k'  },
  { status: 'ending',   title: 'Halverson Estate — auction', client: 'Joan Halverson', date: 'Thu Apr 23', crew: 'CTBids',      value: '$12.4k' },
  { status: 'ending',   title: 'Ramirez move',               client: 'Ramirez',        date: 'Fri Apr 24', crew: 'Tasha + 3',   value: '$8.1k'  },
  { status: 'overdue',  title: 'Harper contract — review',   client: 'Harper family',  date: '3 days late', crew: 'Sarah',      value: '—'      },
]

const PULSE_STYLE = {
  starting: { label: 'Starting', color: 'var(--accent)', bg: 'var(--accent-soft)' },
  ending:   { label: 'Ending',   color: 'var(--win)',    bg: 'var(--win-soft)'    },
  overdue:  { label: 'Overdue',  color: 'var(--lose)',   bg: 'var(--lose-soft)'   },
}

const CTBIDS_LOTS = [
  { lot: '#1204', title: 'Mid-century walnut credenza',       current: '$485',   bids: 12, endsIn: '2h 14m', trend: 'up'   },
  { lot: '#1198', title: 'Pair of Tiffany-style table lamps', current: '$210',   bids: 7,  endsIn: '5h 02m', trend: 'up'   },
  { lot: '#1187', title: 'Persian rug — 8×10 Kashan',         current: '$1,340', bids: 24, endsIn: '18h 48m',trend: 'up'   },
  { lot: '#1176', title: 'Vintage Waterford crystal set',      current: '$95',    bids: 3,  endsIn: '1d 6h',  trend: 'flat' },
]

// ── Helpers ───────────────────────────────────────────────────

function scoreColor(s) {
  if (s >= 8) return 'var(--win)'
  if (s >= 7) return 'var(--accent)'
  if (s >= 5) return 'var(--warn)'
  return 'var(--lose)'
}
function scoreBg(s) {
  if (s >= 8) return 'var(--win-soft)'
  if (s >= 7) return 'var(--accent-soft)'
  if (s >= 5) return 'var(--warn-soft)'
  return 'var(--lose-soft)'
}

// ── Shared primitives ─────────────────────────────────────────

function Section({ title, subtitle, icon, action, children }) {
  return (
    <section style={{
      background: 'var(--panel)',
      border: '1px solid var(--line)',
      borderRadius: 14,
      boxShadow: 'var(--shadow-1)',
      overflow: 'hidden',
    }}>
      <header style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 18px 12px',
        borderBottom: '1px solid var(--line-2)',
      }}>
        {icon}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-1)', margin: 0, letterSpacing: '-0.005em' }}>{title}</h2>
          {subtitle && <p style={{ fontSize: 11.5, color: 'var(--ink-3)', margin: '2px 0 0' }}>{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}

const linkBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '5px 8px', borderRadius: 6,
  background: 'transparent', border: 'none',
  fontSize: 11.5, fontWeight: 600, color: 'var(--accent)',
  cursor: 'pointer',
}

const microBtn = {
  padding: '4px 10px', borderRadius: 7,
  background: 'var(--panel)', color: 'var(--ink-1)',
  border: '1px solid var(--line)',
  fontSize: 11.5, fontWeight: 600,
  cursor: 'pointer', flexShrink: 0,
}

const hotPill = {
  fontSize: 9.5, fontWeight: 700,
  padding: '2px 6px', borderRadius: 4,
  background: 'var(--lose-soft)', color: 'var(--lose)',
  textTransform: 'uppercase', letterSpacing: '0.06em',
}

// ── Hero ──────────────────────────────────────────────────────

function HomeHero({ greeting, dateStr }) {
  const stats = [
    { label: 'Active projects', value: '14',    delta: '+2 this wk',    up: true },
    { label: 'Bids out',        value: '47',    delta: '8 new',         up: true },
    { label: 'Revenue MTD',     value: '$186k', delta: '62% of goal',   up: true },
    { label: 'Avg deal score',  value: '7.7',   delta: '+0.4',          up: true },
  ]
  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      padding: '26px 28px',
      background: 'linear-gradient(135deg, color-mix(in oklab, var(--accent-soft) 75%, var(--panel)) 0%, color-mix(in oklab, var(--accent-soft-2) 40%, var(--panel)) 100%)',
      border: '1px solid color-mix(in oklab, var(--accent) 12%, var(--line))',
      borderRadius: 16,
      boxShadow: 'var(--shadow-1)',
    }}>
      {/* Decorative rings */}
      <div style={{ position: 'absolute', right: -60, top: -60, width: 240, height: 240, borderRadius: '50%', border: '1px solid color-mix(in oklab, var(--accent) 14%, transparent)', pointerEvents: 'none' }}/>
      <div style={{ position: 'absolute', right: -30, top: -30, width: 180, height: 180, borderRadius: '50%', border: '1px solid color-mix(in oklab, var(--accent) 10%, transparent)', pointerEvents: 'none' }}/>

      <div style={{ position: 'relative' }}>
        <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{dateStr}</div>
        <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink-1)', margin: '6px 0 4px' }}>
          {greeting}
        </h1>
        <p style={{ fontSize: 13.5, color: 'var(--ink-2)', margin: 0 }}>
          <span style={{ color: 'var(--lose)', fontWeight: 600 }}>3 need attention</span>
          <span style={{ color: 'var(--ink-4)', margin: '0 8px' }}>·</span>
          <span>2 meetings today</span>
          <span style={{ color: 'var(--ink-4)', margin: '0 8px' }}>·</span>
          <span>4 projects ending this week</span>
        </p>
      </div>

      {/* Stats strip */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1,
        marginTop: 22,
        background: 'var(--line)',
        borderRadius: 12, overflow: 'hidden',
        border: '1px solid var(--line)',
      }}>
        {stats.map((s, i) => (
          <div key={i} style={{ background: 'var(--panel)', padding: '14px 16px' }}>
            <div style={{ fontSize: 10.5, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
              <span className="tnum" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink-1)' }}>{s.value}</span>
              <span className="tnum" style={{ fontSize: 11, color: s.up ? 'var(--win)' : 'var(--ink-3)', fontWeight: 500 }}>{s.delta}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Today/Tomorrow Timeline ───────────────────────────────────

function TodayTimeline({ onNewMeeting }) {
  const [filter, setFilter] = useState('both')
  const items = TIMELINE.filter(t => filter === 'both' || t.day === filter)

  return (
    <Section
      title="Schedule"
      subtitle="Today & tomorrow"
      action={
        <div style={{ display: 'flex', gap: 2, padding: 2, background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 8 }}>
          {[{ id: 'today', label: 'Today' }, { id: 'tomorrow', label: 'Tomorrow' }, { id: 'both', label: 'Both' }].map(t => (
            <button key={t.id} onClick={() => setFilter(t.id)} style={{
              padding: '4px 10px', borderRadius: 6, border: 'none',
              background: filter === t.id ? 'var(--panel)' : 'transparent',
              boxShadow: filter === t.id ? 'var(--shadow-1)' : 'none',
              fontSize: 11.5, fontWeight: filter === t.id ? 600 : 500,
              color: filter === t.id ? 'var(--ink-1)' : 'var(--ink-3)',
              cursor: 'pointer',
            }}>{t.label}</button>
          ))}
        </div>
      }
    >
      <div style={{ padding: '4px 4px 0' }}>
        {items.reduce((acc, item, i) => {
          const prev = items[i - 1]
          if (!prev || prev.day !== item.day) {
            const label = item.day === 'today' ? 'TODAY · MONDAY, APRIL 20' : 'TOMORROW · TUESDAY, APRIL 21'
            acc.push(
              <div key={`d-${item.day}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px 8px' }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>{label}</span>
                <div style={{ flex: 1, height: 1, background: 'var(--line-2)' }}/>
              </div>
            )
          }
          const s = TYPE_STYLE[item.type]
          acc.push(
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '84px 20px 1fr auto',
              alignItems: 'center', gap: 12,
              padding: '9px 18px',
              borderRadius: 10,
              cursor: 'pointer',
              opacity: item.done ? 0.5 : 1,
            }}
              onMouseOver={e => e.currentTarget.style.background = 'var(--hover)'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              <div className="tnum" style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 500 }}>
                <div style={{ textDecoration: item.done ? 'line-through' : 'none' }}>{item.time}</div>
                {item.endTime && <div style={{ fontSize: 10.5, color: 'var(--ink-4)' }}>{item.endTime}</div>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: item.done ? 'transparent' : s.color,
                  border: item.done ? `2px solid ${s.color}` : `2px solid var(--panel)`,
                  boxShadow: item.done ? 'none' : `0 0 0 2px ${s.color}`,
                }}/>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-1)', letterSpacing: '-0.005em', textDecoration: item.done ? 'line-through' : 'none' }}>
                    {item.title}
                  </span>
                  {item.hot && <span style={hotPill}>Hot lead</span>}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>{item.detail}</div>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 4,
                background: s.bg, color: s.color,
                textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
              }}>{s.label}</span>
            </div>
          )
          return acc
        }, [])}
      </div>
      <div style={{ padding: '10px 18px 12px', borderTop: '1px solid var(--line-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>Next 48 hours</span>
        <button onClick={onNewMeeting} style={linkBtn}>
          Schedule new <ArrowRight size={13} strokeWidth={2}/>
        </button>
      </div>
    </Section>
  )
}

// ── New Leads ─────────────────────────────────────────────────

function NewLeadsCard({ onOpenPipeline }) {
  return (
    <Section
      title="New leads"
      subtitle="3 in the last 24h"
      action={<button onClick={onOpenPipeline} style={linkBtn}>Pipeline <ArrowRight size={13} strokeWidth={2}/></button>}
    >
      <div style={{ padding: '4px 10px 10px' }}>
        {NEW_LEADS.map(l => (
          <div key={l.id} onClick={onOpenPipeline} style={{
            display: 'grid', gridTemplateColumns: '36px 1fr auto', alignItems: 'center', gap: 10,
            padding: '10px 10px', borderRadius: 10, cursor: 'pointer',
          }}
            onMouseOver={e => e.currentTarget.style.background = 'var(--hover)'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          >
            <div className="tnum" style={{
              width: 36, height: 36, borderRadius: 10,
              background: scoreBg(l.score),
              display: 'grid', placeItems: 'center',
              color: scoreColor(l.score), fontWeight: 700, fontSize: 13,
            }}>{l.score}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-1)' }}>{l.name}</span>
                {l.hot && <span style={hotPill}>Hot</span>}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span>{l.addr}</span>
                <span style={{ color: 'var(--ink-4)' }}>·</span>
                <span>{l.type}</span>
                <span style={{ color: 'var(--ink-4)' }}>·</span>
                <span>{l.age}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="tnum" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-1)' }}>{l.value}</div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-4)' }}>est. value</div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

// ── Needs Attention ───────────────────────────────────────────

function NeedsAttention() {
  const groups = [
    { id: 'urgent', label: 'Urgent',    color: 'var(--lose)', bg: 'var(--lose-soft)' },
    { id: 'today',  label: 'Today',     color: 'var(--warn)', bg: 'var(--warn-soft)' },
    { id: 'week',   label: 'This week', color: 'var(--ink-3)', bg: 'var(--bg-2)'     },
  ]
  return (
    <Section title="Needs attention" subtitle="5 open">
      <div style={{ padding: '4px 10px 10px' }}>
        {groups.map(g => {
          const rows = ATTENTION.filter(a => a.priority === g.id)
          if (!rows.length) return null
          return (
            <div key={g.id} style={{ marginTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px 4px' }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: g.color,
                  padding: '2px 7px', borderRadius: 4, background: g.bg,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>{g.label}</span>
                <span className="tnum" style={{ fontSize: 11, color: 'var(--ink-4)', fontWeight: 500 }}>{rows.length}</span>
              </div>
              {rows.map((a, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 10px', borderRadius: 10, cursor: 'pointer',
                }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--hover)'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: g.bg, color: g.color,
                    display: 'grid', placeItems: 'center', flexShrink: 0,
                  }}>
                    <a.Icon size={15} strokeWidth={1.8}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink-1)' }}>{a.text}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{a.meta}</div>
                  </div>
                  <button style={microBtn}>{a.action}</button>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </Section>
  )
}

// ── Project Pulse ─────────────────────────────────────────────

function ProjectPulse({ onOpenProjects }) {
  return (
    <Section
      title="Project pulse"
      subtitle="This week"
      action={<button onClick={onOpenProjects} style={linkBtn}>All projects <ArrowRight size={13} strokeWidth={2}/></button>}
    >
      <div>
        <div style={{
          display: 'grid', gridTemplateColumns: '110px 1fr 140px 110px 90px', gap: 12,
          padding: '8px 18px', fontSize: 10.5, fontWeight: 700, color: 'var(--ink-3)',
          textTransform: 'uppercase', letterSpacing: '0.06em',
          borderBottom: '1px solid var(--line-2)',
        }}>
          <span>Status</span><span>Project</span><span>Crew</span><span>Date</span>
          <span style={{ textAlign: 'right' }}>Value</span>
        </div>
        {PULSE.map((p, i) => {
          const s = PULSE_STYLE[p.status]
          return (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '110px 1fr 140px 110px 90px', gap: 12,
              alignItems: 'center', padding: '11px 18px',
              borderBottom: i < PULSE.length - 1 ? '1px solid var(--line-2)' : 'none',
              cursor: 'pointer',
            }}
              onMouseOver={e => e.currentTarget.style.background = 'var(--hover)'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 11, fontWeight: 600, color: s.color,
                background: s.bg, padding: '3px 8px', borderRadius: 5, width: 'fit-content',
              }}>
                <span style={{ fontSize: 7 }}>●</span>{s.label}
              </span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-1)' }}>{p.title}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>{p.client}</div>
              </div>
              <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{p.crew}</span>
              <span className="tnum" style={{ fontSize: 12, color: p.status === 'overdue' ? 'var(--lose)' : 'var(--ink-2)', fontWeight: p.status === 'overdue' ? 600 : 500 }}>{p.date}</span>
              <span className="tnum" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-1)', textAlign: 'right' }}>{p.value}</span>
            </div>
          )
        })}
      </div>
    </Section>
  )
}

// ── CTBids Live ───────────────────────────────────────────────

function CTBidsTracker() {
  return (
    <Section
      title="CTBids live"
      subtitle="4 auctions ending ≤ 24h"
      icon={
        <div style={{
          width: 26, height: 26, borderRadius: 7,
          background: 'var(--warn-soft)',
          border: '1px solid color-mix(in oklab, var(--warn) 20%, var(--line))',
          color: 'var(--warn)', display: 'grid', placeItems: 'center',
        }}>
          <Gavel size={14} strokeWidth={1.8}/>
        </div>
      }
      action={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: 'var(--ink-3)', fontWeight: 600 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--win)', boxShadow: '0 0 0 3px var(--win-soft)', animation: 'ctbids-pulse 2s infinite' }}/>
            SYNCED 2m AGO
          </span>
          <button style={linkBtn}>Refresh <ArrowRight size={13} strokeWidth={2}/></button>
        </div>
      }
    >
      <div>
        <div style={{
          display: 'grid', gridTemplateColumns: '70px 1fr 100px 60px 90px', gap: 12,
          padding: '8px 18px', fontSize: 10.5, fontWeight: 700, color: 'var(--ink-3)',
          textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--line-2)',
        }}>
          <span>Lot</span><span>Item</span>
          <span style={{ textAlign: 'right' }}>Current</span>
          <span style={{ textAlign: 'right' }}>Bids</span>
          <span style={{ textAlign: 'right' }}>Ends in</span>
        </div>
        {CTBIDS_LOTS.map((l, i) => {
          const urgentHours = l.endsIn.includes('h') && !l.endsIn.includes('d') && parseInt(l.endsIn) < 6
          return (
            <div key={l.lot} style={{
              display: 'grid', gridTemplateColumns: '70px 1fr 100px 60px 90px', gap: 12,
              alignItems: 'center', padding: '11px 18px',
              borderBottom: i < CTBIDS_LOTS.length - 1 ? '1px solid var(--line-2)' : 'none',
              cursor: 'pointer',
            }}
              onMouseOver={e => e.currentTarget.style.background = 'var(--hover)'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              <span className="tnum mono" style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600 }}>{l.lot}</span>
              <span style={{ fontSize: 13, color: 'var(--ink-1)', fontWeight: 500 }}>{l.title}</span>
              <span style={{ textAlign: 'right' }}>
                <span className="tnum" style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-1)' }}>{l.current}</span>
                {l.trend === 'up' && <span style={{ fontSize: 10, color: 'var(--win)', marginLeft: 4 }}>▲</span>}
              </span>
              <span className="tnum" style={{ fontSize: 12, color: 'var(--ink-2)', textAlign: 'right' }}>{l.bids}</span>
              <span className="tnum" style={{
                fontSize: 11.5, fontWeight: 600, textAlign: 'right',
                color: urgentHours ? 'var(--lose)' : 'var(--ink-2)',
              }}>{l.endsIn}</span>
            </div>
          )
        })}
      </div>
      <style>{`@keyframes ctbids-pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.3 } }`}</style>
    </Section>
  )
}

// ── Quick Actions ─────────────────────────────────────────────

function QuickActions({ onOpenSchedule, onNewMeeting }) {
  const navigate = useNavigate()
  const actions = [
    { Icon: Wallet,      label: 'Send invoice',    onClick: () => {} },
    { Icon: Phone,       label: 'Log call back',   onClick: () => {} },
    { Icon: CalendarDays,label: 'Schedule crew',   onClick: () => navigate('/projects') },
    { Icon: Users,       label: 'Run payroll',     onClick: () => {} },
    { Icon: Plus,        label: 'New meeting',     onClick: onNewMeeting },
    { Icon: Gavel,       label: 'Post auction',    onClick: () => {} },
  ]
  return (
    <Section title="Quick actions">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, padding: '10px 14px 14px' }}>
        {actions.map((a, i) => (
          <button key={i} onClick={a.onClick} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '11px 12px',
            background: 'var(--panel)', border: '1px solid var(--line)',
            borderRadius: 10, cursor: 'pointer', textAlign: 'left',
          }}
            onMouseOver={e => { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.borderColor = 'var(--ink-4)' }}
            onMouseOut={e => { e.currentTarget.style.background = 'var(--panel)'; e.currentTarget.style.borderColor = 'var(--line)' }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'var(--accent-soft)', color: 'var(--accent)',
              display: 'grid', placeItems: 'center', flexShrink: 0,
            }}>
              <a.Icon size={14} strokeWidth={1.8}/>
            </div>
            <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink-1)' }}>{a.label}</span>
          </button>
        ))}
      </div>
    </Section>
  )
}

// ── Page ──────────────────────────────────────────────────────

export default function Home() {
  const navigate = useNavigate()
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div style={{ flex: 1, height: '100%', overflowY: 'auto', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 32px 80px' }}>
        <HomeHero greeting={greeting} dateStr={dateStr}/>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.55fr) minmax(300px, 1fr)', gap: 18, marginTop: 18 }}>
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
            <TodayTimeline onNewMeeting={() => {}}/>
            <ProjectPulse onOpenProjects={() => navigate('/projects')}/>
            <CTBidsTracker/>
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
            <NewLeadsCard onOpenPipeline={() => navigate('/')}/>
            <NeedsAttention/>
            <QuickActions onNewMeeting={() => {}}/>
          </div>
        </div>
      </div>
    </div>
  )
}
