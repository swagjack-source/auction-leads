import { useNavigate } from 'react-router-dom'
import {
  ArrowRight, Gavel, Wallet, Phone, CalendarDays, Users,
  Plus, TriangleAlert, TrendingUp, CheckCircle2, Activity,
  Zap, FolderOpen, Clock,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useSupabaseQuery } from '../lib/useSupabaseQuery'
import { useAuth } from '../lib/AuthContext'

// ── Data helpers ──────────────────────────────────────────────

function formatTime12h(timeStr) {
  if (!timeStr) return ''
  const parts = timeStr.split(':')
  const h = parseInt(parts[0], 10)
  const m = parseInt(parts[1] || '0', 10)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function fmtMoney(n) {
  if (!n) return '$0'
  return n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : n >= 1000
      ? `$${(n / 1000).toFixed(0)}k`
      : `$${n}`
}

function fmtDayLabel(dateStr) {
  const today    = new Date().toISOString().slice(0, 10)
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
  if (dateStr === today)    return 'Today'
  if (dateStr === tomorrow) return 'Tomorrow'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

async function fetchHomeData() {
  const today       = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr    = today.toISOString().slice(0, 10)
  const tomorrowStr = new Date(today.getTime() + 86_400_000).toISOString().slice(0, 10)
  const weekEndStr  = new Date(today.getTime() + 7 * 86_400_000).toISOString().slice(0, 10)
  const monthStart  = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)

  const [leadsRes, meetingsRes, scoresRes, ctbidsRes] = await Promise.all([
    supabase
      .from('leads')
      .select('id, name, address, status, deal_score, job_type, created_at, updated_at, consult_at, project_start, project_end')
      .order('updated_at', { ascending: false })
      .limit(300),
    supabase
      .from('meetings')
      .select('id, title, date, time, purpose, address, contacts(name)')
      .gte('date', todayStr)
      .lte('date', weekEndStr)
      .order('date')
      .order('time'),
    supabase
      .from('deal_scores')
      .select('lead_id, recommended_bid')
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('ctbids_live')
      .select('lot_number, title, current_bid, bid_count, ends_at, status')
      .order('ends_at', { ascending: true })
      .limit(8),
  ])

  const leads    = leadsRes.data    || []
  const meetings = meetingsRes.data || []
  const scores   = scoresRes.data   || []
  // null = table doesn't exist / scraper not set up; [] = table exists but empty
  const ctbidsLots = ctbidsRes.error ? null : (ctbidsRes.data || [])

  // Latest recommended_bid per lead
  const bidMap = {}
  scores.forEach(s => { if (!(s.lead_id in bidMap)) bidMap[s.lead_id] = s.recommended_bid })

  // ── Hero stats ──────────────────────────────────────────────
  const activeProjects = leads.filter(l =>
    ['Project Accepted', 'Project Scheduled'].includes(l.status)
  ).length

  const bidsOut = leads.filter(l => l.status === 'Estimate Sent').length

  const wonThisMonth = leads.filter(l =>
    ['Won', 'Project Completed'].includes(l.status) &&
    (l.updated_at || l.created_at || '').slice(0, 10) >= monthStart
  )
  const revenueMTD = wonThisMonth.reduce((s, l) => s + (bidMap[l.id] || 0), 0)

  const scoredLeads = leads.filter(l =>
    l.deal_score != null && !['Lost', 'Backlog'].includes(l.status)
  )
  const avgScore = scoredLeads.length > 0
    ? +(scoredLeads.reduce((s, l) => s + l.deal_score, 0) / scoredLeads.length).toFixed(1)
    : null

  // ── Action card counts (1B) ──────────────────────────────────
  const newLeadsCount  = leads.filter(l => l.status === 'New Lead').length
  const followUpCount  = leads.filter(l => ['Contacted', 'In Talks'].includes(l.status)).length
  const todayConsults  = leads.filter(l => l.consult_at?.slice(0, 10) === todayStr).length

  // ── This Week agenda (1C) ────────────────────────────────────
  const meetingItems = meetings.map(m => ({
    dateStr:  m.date,
    sortKey:  `${m.date} ${(m.time || '00:00').slice(0, 5)}`,
    time:     formatTime12h(m.time),
    type:     'meeting',
    title:    m.title,
    detail:   m.contacts?.name ? `With ${m.contacts.name}` : (m.address || m.purpose || ''),
    hot:      false,
  }))

  const consultItems = leads
    .filter(l => {
      if (!l.consult_at) return false
      const d = l.consult_at.slice(0, 10)
      return d >= todayStr && d <= weekEndStr
    })
    .map(l => {
      const dt = new Date(l.consult_at)
      const hh = String(dt.getHours()).padStart(2, '0')
      const mm = String(dt.getMinutes()).padStart(2, '0')
      return {
        dateStr:  l.consult_at.slice(0, 10),
        sortKey:  `${l.consult_at.slice(0, 10)} ${hh}:${mm}`,
        time:     formatTime12h(`${hh}:${mm}`),
        type:     'consult',
        title:    `Consult — ${l.name}`,
        detail:   l.address || '',
        hot:      (l.deal_score ?? 0) >= 8,
      }
    })

  const weekAgenda = [...meetingItems, ...consultItems]
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))

  // ── Timeline (today + tomorrow, kept for heroSub counts) ────
  const timeline = weekAgenda.filter(i => i.dateStr === todayStr || i.dateStr === tomorrowStr)

  // ── Project Updates Feed (1D) — recently updated leads ───────
  const recentActivity = leads
    .filter(l => l.updated_at)
    .slice(0, 8)
    .map(l => ({
      id:      l.id,
      name:    l.name,
      status:  l.status,
      jobType: l.job_type,
      age:     timeAgo(l.updated_at),
    }))

  // ── New leads feed (kept for compatibility) ─────────────────
  const cutoff  = new Date(Date.now() - 48 * 3_600_000).toISOString()
  const newLeads = leads
    .filter(l => l.status === 'New Lead' || l.created_at >= cutoff)
    .slice(0, 5)
    .map(l => {
      const score = +(l.deal_score ?? 0).toFixed(1)
      const bid   = bidMap[l.id] || 0
      return {
        id:    l.id,
        name:  l.name  || 'Unnamed lead',
        addr:  l.address || '—',
        score,
        value: bid > 0 ? fmtMoney(bid) : '—',
        type:  l.job_type || '—',
        age:   timeAgo(l.created_at),
        hot:   score >= 8,
      }
    })

  // ── Project pulse ─────────────────────────────────────────────
  const projectLeads = leads.filter(l =>
    ['Project Accepted', 'Project Scheduled'].includes(l.status)
  )
  const projectPulse = projectLeads.slice(0, 6).map(l => {
    const start     = l.project_start ? new Date(l.project_start + 'T00:00:00') : null
    const end       = l.project_end   ? new Date(l.project_end   + 'T00:00:00') : null
    const isOverdue = end && end < today
    const startsSoon = start && start <= new Date(today.getTime() + 3 * 86_400_000)
    const status    = isOverdue ? 'overdue' : startsSoon ? 'starting' : 'ending'
    const bid       = bidMap[l.id] || 0
    return {
      status,
      title:  l.name,
      client: l.name,
      date:   start
                ? start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                : '—',
      crew:   '—',
      value:  bid > 0 ? fmtMoney(bid) : '—',
    }
  })

  // ── Needs attention ──────────────────────────────────────────
  const attention = []
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()

  leads.filter(l => l.status === 'Consult Completed').slice(0, 2).forEach(l =>
    attention.push({ priority: 'urgent', Icon: Wallet, text: `Send estimate — ${l.name}`, meta: 'Consult complete, no estimate sent yet', action: 'Send' })
  )
  leads.filter(l =>
    ['Project Accepted', 'Project Scheduled'].includes(l.status) &&
    l.project_end && new Date(l.project_end + 'T00:00:00') < today
  ).slice(0, 2).forEach(l =>
    attention.push({ priority: 'urgent', Icon: TriangleAlert, text: `Overdue project: ${l.name}`, meta: `End date was ${new Date(l.project_end + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`, action: 'Review' })
  )
  leads.filter(l => l.status === 'In Talks' && (l.updated_at || l.created_at || '') < sevenDaysAgo).slice(0, 2).forEach(l =>
    attention.push({ priority: 'today', Icon: Phone, text: `Follow up — ${l.name}`, meta: 'In talks for 7+ days', action: 'Call' })
  )
  leads.filter(l => l.status === 'Contacted' && (l.updated_at || l.created_at || '') < sevenDaysAgo).slice(0, 1).forEach(l =>
    attention.push({ priority: 'week', Icon: Phone, text: `Re-contact — ${l.name}`, meta: 'Contacted 7+ days ago', action: 'Call' })
  )
  leads.filter(l => l.status === 'Consult Scheduled').slice(0, 1).forEach(l =>
    attention.push({ priority: 'week', Icon: CalendarDays, text: `Prep for consult — ${l.name}`, meta: l.address || 'Review lead details before visit', action: 'Review' })
  )

  const meetingsToday      = timeline.filter(t => t.dateStr === todayStr).length
  const projectsEndingWeek = projectLeads.filter(l => {
    if (!l.project_end) return false
    const end     = new Date(l.project_end + 'T00:00:00')
    const weekOut = new Date(today.getTime() + 7 * 86_400_000)
    return end >= today && end <= weekOut
  }).length

  return {
    stats:          { activeProjects, bidsOut, revenueMTD, avgScore },
    heroSub:        { attentionCount: attention.length, meetingsToday, projectsEndingWeek },
    actionCards:    { newLeadsCount, followUpCount, todayConsults, activeProjects },
    weekAgenda,
    recentActivity,
    newLeads,
    projectPulse,
    attention,
    ctbidsLots,
    monthlySummary: { revenueMTD, completedCount: wonThisMonth.length },
  }
}

// ── Style maps ────────────────────────────────────────────────

const TYPE_STYLE = {
  meeting:   { color: 'var(--accent)',  bg: 'var(--accent-soft)',  label: 'Meeting'   },
  consult:   { color: '#B87333',        bg: '#F6EEE2',             label: 'Consult'   },
  milestone: { color: 'var(--win)',     bg: 'var(--win-soft)',     label: 'Milestone' },
  project:   { color: '#6B7B8C',        bg: '#EEF1F4',             label: 'Onsite'    },
}

const PULSE_STYLE = {
  starting: { label: 'Starting', color: 'var(--accent)', bg: 'var(--accent-soft)' },
  ending:   { label: 'Ending',   color: 'var(--win)',    bg: 'var(--win-soft)'    },
  overdue:  { label: 'Overdue',  color: 'var(--lose)',   bg: 'var(--lose-soft)'   },
}

const STATUS_COLORS = {
  'New Lead':           { color: 'var(--accent)',  bg: 'var(--accent-soft)'  },
  'Contacted':          { color: '#B87333',        bg: '#F6EEE2'             },
  'In Talks':           { color: 'var(--warn)',    bg: 'var(--warn-soft)'    },
  'Consult Scheduled':  { color: '#7C3AED',        bg: '#EDE9FE'             },
  'Consult Completed':  { color: 'var(--win)',     bg: 'var(--win-soft)'     },
  'Estimate Sent':      { color: '#0891B2',        bg: '#E0F2FE'             },
  'Project Accepted':   { color: 'var(--win)',     bg: 'var(--win-soft)'     },
  'Project Scheduled':  { color: 'var(--win)',     bg: 'var(--win-soft)'     },
  'Won':                { color: 'var(--win)',     bg: 'var(--win-soft)'     },
  'Lost':               { color: 'var(--lose)',    bg: 'var(--lose-soft)'    },
  'Backlog':            { color: 'var(--ink-3)',   bg: 'var(--bg-2)'         },
}

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

const emptyMsg = {
  padding: '24px 18px', textAlign: 'center',
  fontSize: 12, color: 'var(--ink-4)',
}

// ── Section 1A: Hero ──────────────────────────────────────────

function HomeHero({ greeting, dateStr, stats, heroSub, loading }) {
  const heroStats = [
    { label: 'Active projects', value: loading ? '—' : String(stats.activeProjects ?? 0), delta: 'in progress'          },
    { label: 'Bids out',        value: loading ? '—' : String(stats.bidsOut ?? 0),        delta: 'awaiting response'    },
    { label: 'Revenue MTD',     value: loading ? '—' : fmtMoney(stats.revenueMTD || 0),  delta: `${heroSub.projectsEndingWeek ?? 0} ending this week` },
    { label: 'Avg deal score',  value: loading ? '—' : (stats.avgScore != null ? String(stats.avgScore) : '—'), delta: 'across open leads' },
  ]

  const attentionCount     = heroSub.attentionCount     ?? 0
  const meetingsToday      = heroSub.meetingsToday      ?? 0
  const projectsEndingWeek = heroSub.projectsEndingWeek ?? 0

  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      padding: '26px 28px',
      background: 'linear-gradient(135deg, color-mix(in oklab, var(--accent-soft) 75%, var(--panel)) 0%, color-mix(in oklab, var(--accent-soft-2) 40%, var(--panel)) 100%)',
      border: '1px solid color-mix(in oklab, var(--accent) 12%, var(--line))',
      borderRadius: 16,
      boxShadow: 'var(--shadow-1)',
    }}>
      <div style={{ position: 'absolute', right: -60, top: -60, width: 240, height: 240, borderRadius: '50%', border: '1px solid color-mix(in oklab, var(--accent) 14%, transparent)', pointerEvents: 'none' }}/>
      <div style={{ position: 'absolute', right: -30, top: -30, width: 180, height: 180, borderRadius: '50%', border: '1px solid color-mix(in oklab, var(--accent) 10%, transparent)', pointerEvents: 'none' }}/>

      <div style={{ position: 'relative' }}>
        <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {dateStr}
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink-1)', margin: '6px 0 4px' }}>
          {greeting}
        </h1>
        {!loading && (
          <p style={{ fontSize: 13.5, color: 'var(--ink-2)', margin: 0 }}>
            {attentionCount > 0 && (
              <>
                <span style={{ color: 'var(--lose)', fontWeight: 600 }}>{attentionCount} need{attentionCount === 1 ? 's' : ''} attention</span>
                <span style={{ color: 'var(--ink-4)', margin: '0 8px' }}>·</span>
              </>
            )}
            <span>{meetingsToday} meeting{meetingsToday !== 1 ? 's' : ''} today</span>
            {projectsEndingWeek > 0 && (
              <>
                <span style={{ color: 'var(--ink-4)', margin: '0 8px' }}>·</span>
                <span>{projectsEndingWeek} project{projectsEndingWeek !== 1 ? 's' : ''} ending this week</span>
              </>
            )}
          </p>
        )}
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1,
        marginTop: 22,
        background: 'var(--line)',
        borderRadius: 12, overflow: 'hidden',
        border: '1px solid var(--line)',
      }}>
        {heroStats.map((s, i) => (
          <div key={i} style={{ background: 'var(--panel)', padding: '14px 16px' }}>
            <div style={{ fontSize: 10.5, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
              <span className="tnum" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink-1)' }}>{s.value}</span>
              {s.delta && <span className="tnum" style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 500 }}>{s.delta}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Section 1B: Action Cards ──────────────────────────────────

const ACTION_CARDS = [
  {
    key:      'newLeads',
    label:    'New Leads',
    sub:      'In pipeline',
    Icon:     Zap,
    color:    'var(--accent)',
    bg:       'var(--accent-soft)',
    route:    '/pipeline',
  },
  {
    key:      'followUpCount',
    label:    'Needs Follow-Up',
    sub:      'Contacted · In talks',
    Icon:     Phone,
    color:    'var(--warn)',
    bg:       'var(--warn-soft)',
    route:    '/pipeline',
  },
  {
    key:      'todayConsults',
    label:    "Today's Consults",
    sub:      'Scheduled today',
    Icon:     Clock,
    color:    '#7C3AED',
    bg:       '#EDE9FE',
    route:    '/calendar',
  },
  {
    key:      'activeProjects',
    label:    'Active Projects',
    sub:      'In progress',
    Icon:     FolderOpen,
    color:    'var(--win)',
    bg:       'var(--win-soft)',
    route:    '/projects',
  },
]

function ActionCards({ data, loading, navigate }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
      {ACTION_CARDS.map(card => (
        <button
          key={card.key}
          onClick={() => navigate(card.route)}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
            padding: '16px 18px',
            background: 'var(--panel)',
            border: '1px solid var(--line)',
            borderRadius: 14,
            boxShadow: 'var(--shadow-1)',
            cursor: 'pointer', textAlign: 'left',
            transition: 'border-color 120ms, box-shadow 120ms',
          }}
          onMouseOver={e => { e.currentTarget.style.borderColor = card.color; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
          onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.boxShadow = 'var(--shadow-1)' }}
        >
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: card.bg, color: card.color,
            display: 'grid', placeItems: 'center', marginBottom: 14,
          }}>
            <card.Icon size={17} strokeWidth={1.8}/>
          </div>
          <div className="tnum" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--ink-1)', lineHeight: 1 }}>
            {loading ? '—' : (data?.[card.key] ?? 0)}
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-1)', marginTop: 6 }}>{card.label}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{card.sub}</div>
        </button>
      ))}
    </div>
  )
}

// ── Section 1C (left): This Week Agenda ──────────────────────

function ThisWeekAgenda({ items, loading, onNewMeeting }) {
  // Group by dateStr
  const grouped = {}
  items.forEach(item => {
    if (!grouped[item.dateStr]) grouped[item.dateStr] = []
    grouped[item.dateStr].push(item)
  })
  const dates = Object.keys(grouped).sort()

  return (
    <Section
      title="This Week"
      subtitle="Next 7 days · meetings & consults"
      action={
        <button onClick={onNewMeeting} style={linkBtn}>
          Add event <ArrowRight size={13} strokeWidth={2}/>
        </button>
      }
    >
      <div style={{ padding: '4px 4px 4px' }}>
        {loading ? (
          <div style={emptyMsg}>Loading schedule…</div>
        ) : dates.length === 0 ? (
          <div style={emptyMsg}>Nothing scheduled this week</div>
        ) : (
          dates.map(dateStr => {
            const dayItems = grouped[dateStr]
            const dayLabel = fmtDayLabel(dateStr)
            return (
              <div key={dateStr}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px 6px' }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {dayLabel}
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'var(--line-2)' }}/>
                  <span className="tnum" style={{ fontSize: 10.5, color: 'var(--ink-4)', fontWeight: 500 }}>
                    {dayItems.length} event{dayItems.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {dayItems.map((item, i) => {
                  const s = TYPE_STYLE[item.type] || TYPE_STYLE.meeting
                  return (
                    <div key={i} style={{
                      display: 'grid', gridTemplateColumns: '80px 18px 1fr auto',
                      alignItems: 'center', gap: 12,
                      padding: '8px 18px',
                      borderRadius: 10, cursor: 'pointer',
                    }}
                      onMouseOver={e => e.currentTarget.style.background = 'var(--hover)'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div className="tnum" style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 500 }}>
                        {item.time || <span style={{ color: 'var(--ink-4)' }}>—</span>}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <div style={{
                          width: 9, height: 9, borderRadius: '50%',
                          background: s.color,
                          boxShadow: `0 0 0 2px var(--panel), 0 0 0 3px ${s.color}`,
                        }}/>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-1)', letterSpacing: '-0.005em' }}>
                            {item.title}
                          </span>
                          {item.hot && <span style={hotPill}>Hot</span>}
                        </div>
                        {item.detail && <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 1 }}>{item.detail}</div>}
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 4,
                        background: s.bg, color: s.color,
                        textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
                      }}>{s.label}</span>
                    </div>
                  )
                })}
              </div>
            )
          })
        )}
      </div>
      <div style={{ padding: '10px 18px 12px', borderTop: '1px solid var(--line-2)', marginTop: 4 }}>
        <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>Mon–Sun this week</span>
      </div>
    </Section>
  )
}

// ── Section 1C (right): Quick Actions ────────────────────────

function QuickActions({ onNewMeeting, navigate }) {
  const actions = [
    { Icon: Wallet,       label: 'Send invoice',   onClick: () => navigate('/projects')  },
    { Icon: Phone,        label: 'Log call back',  onClick: () => navigate('/contacts')  },
    { Icon: CalendarDays, label: 'Schedule crew',  onClick: () => navigate('/schedule')  },
    { Icon: Users,        label: 'Run payroll',    onClick: () => navigate('/employees') },
    { Icon: Plus,         label: 'New meeting',    onClick: onNewMeeting                 },
    { Icon: Gavel,        label: 'Post auction',   onClick: () => navigate('/ctbids')    },
  ]
  return (
    <Section title="Quick Actions">
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

// ── Section 1D: Project Updates Feed ─────────────────────────

function ProjectUpdatesFeed({ items, loading, onOpenPipeline }) {
  return (
    <Section
      title="Recent Activity"
      subtitle="Latest lead & project updates"
      icon={
        <div style={{
          width: 26, height: 26, borderRadius: 7,
          background: 'color-mix(in oklab, var(--accent-soft) 60%, var(--panel))',
          color: 'var(--accent)', display: 'grid', placeItems: 'center',
        }}>
          <Activity size={14} strokeWidth={1.8}/>
        </div>
      }
      action={
        <button onClick={onOpenPipeline} style={linkBtn}>
          Pipeline <ArrowRight size={13} strokeWidth={2}/>
        </button>
      }
    >
      <div style={{ padding: '4px 10px 10px' }}>
        {loading ? (
          <div style={emptyMsg}>Loading activity…</div>
        ) : items.length === 0 ? (
          <div style={emptyMsg}>No recent activity</div>
        ) : (
          items.map((item, i) => {
            const sc = STATUS_COLORS[item.status] || { color: 'var(--ink-3)', bg: 'var(--bg-2)' }
            return (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '9px 10px', borderRadius: 10, cursor: 'pointer',
                borderBottom: i < items.length - 1 ? '1px solid var(--line-2)' : 'none',
              }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--hover)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                onClick={onOpenPipeline}
              >
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: sc.color, flexShrink: 0,
                }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                    {item.jobType || 'Unknown type'}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                  <span style={{
                    fontSize: 10.5, fontWeight: 600,
                    padding: '2px 7px', borderRadius: 4,
                    background: sc.bg, color: sc.color,
                  }}>{item.status}</span>
                  <span className="tnum" style={{ fontSize: 10.5, color: 'var(--ink-4)' }}>{item.age}</span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </Section>
  )
}

// ── Section 1E: CTBids Snapshot ───────────────────────────────

function CTBidsSnapshot({ lots, loading, onViewAll }) {
  // lots === null  → scraper not connected
  // lots.length === 0 → no active lots
  // lots.length > 0 → show table

  function fmtEndsAt(iso) {
    if (!iso) return '—'
    const diff = new Date(iso).getTime() - Date.now()
    if (diff < 0) return 'Ended'
    const mins = Math.floor(diff / 60_000)
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ${mins % 60}m`
    return `${Math.floor(hrs / 24)}d ${hrs % 24}h`
  }

  return (
    <Section
      title="CTBids Live"
      subtitle={lots == null ? 'Scraper not connected' : lots.length === 0 ? 'No active lots' : `${lots.length} active lot${lots.length !== 1 ? 's' : ''}`}
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
          <button onClick={onViewAll} style={linkBtn}>
            View all <ArrowRight size={13} strokeWidth={2}/>
          </button>
        </div>
      }
    >
      {lots == null ? (
        <div style={{ padding: '28px 20px', textAlign: 'center' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'var(--warn-soft)', color: 'var(--warn)',
            display: 'grid', placeItems: 'center', margin: '0 auto 12px',
          }}>
            <Gavel size={18} strokeWidth={1.8}/>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-1)', marginBottom: 4 }}>
            CTBids scraper not connected
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', maxWidth: 280, margin: '0 auto' }}>
            Deploy the Railway scraper to see live auction data here.
          </div>
        </div>
      ) : lots.length === 0 ? (
        <div style={emptyMsg}>No active lots — check back when an auction is live.</div>
      ) : (
        <div>
          <div style={{
            display: 'grid', gridTemplateColumns: '80px 1fr 110px 60px 100px', gap: 12,
            padding: '8px 18px', fontSize: 10.5, fontWeight: 700, color: 'var(--ink-3)',
            textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--line-2)',
          }}>
            <span>Lot</span><span>Item</span>
            <span style={{ textAlign: 'right' }}>Current Bid</span>
            <span style={{ textAlign: 'right' }}>Bids</span>
            <span style={{ textAlign: 'right' }}>Ends In</span>
          </div>
          {lots.map((l, i) => {
            const endsIn      = fmtEndsAt(l.ends_at)
            const isUrgent    = l.ends_at && (new Date(l.ends_at).getTime() - Date.now()) < 3 * 3_600_000
            return (
              <div key={l.lot_number || i} style={{
                display: 'grid', gridTemplateColumns: '80px 1fr 110px 60px 100px', gap: 12,
                alignItems: 'center', padding: '11px 18px',
                borderBottom: i < lots.length - 1 ? '1px solid var(--line-2)' : 'none',
                cursor: 'pointer',
              }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--hover)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                <span className="tnum mono" style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600 }}>{l.lot_number}</span>
                <span style={{ fontSize: 13, color: 'var(--ink-1)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.title}</span>
                <span className="tnum" style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-1)', textAlign: 'right' }}>
                  {l.current_bid != null ? `$${Number(l.current_bid).toLocaleString()}` : '—'}
                </span>
                <span className="tnum" style={{ fontSize: 12, color: 'var(--ink-2)', textAlign: 'right' }}>{l.bid_count ?? '—'}</span>
                <span className="tnum" style={{
                  fontSize: 11.5, fontWeight: 600, textAlign: 'right',
                  color: isUrgent ? 'var(--lose)' : 'var(--ink-2)',
                }}>{endsIn}</span>
              </div>
            )
          })}
        </div>
      )}
    </Section>
  )
}

// ── Section 1F: Monthly Summary ───────────────────────────────

function MonthlySummary({ stats, loading }) {
  const month = new Date().toLocaleDateString('en-US', { month: 'long' })
  return (
    <Section
      title={`${month} Summary`}
      subtitle="Month-to-date performance"
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--line-2)' }}>
        {/* Revenue card */}
        <div style={{ background: 'var(--panel)', padding: '18px 18px 16px' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'var(--win-soft)', color: 'var(--win)',
            display: 'grid', placeItems: 'center', marginBottom: 12,
          }}>
            <TrendingUp size={16} strokeWidth={1.8}/>
          </div>
          <div className="tnum" style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink-1)', lineHeight: 1 }}>
            {loading ? '—' : fmtMoney(stats?.revenueMTD || 0)}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-1)', marginTop: 6 }}>Revenue MTD</div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>Closed deals this month</div>
        </div>

        {/* Completed card */}
        <div style={{ background: 'var(--panel)', padding: '18px 18px 16px' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'var(--accent-soft)', color: 'var(--accent)',
            display: 'grid', placeItems: 'center', marginBottom: 12,
          }}>
            <CheckCircle2 size={16} strokeWidth={1.8}/>
          </div>
          <div className="tnum" style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink-1)', lineHeight: 1 }}>
            {loading ? '—' : (stats?.completedCount ?? 0)}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-1)', marginTop: 6 }}>Completed</div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>Jobs won or finished</div>
        </div>
      </div>
    </Section>
  )
}

// ── Needs Attention ───────────────────────────────────────────

function NeedsAttention({ items, loading, onAction }) {
  const groups = [
    { id: 'urgent', label: 'Urgent',    color: 'var(--lose)', bg: 'var(--lose-soft)' },
    { id: 'today',  label: 'Today',     color: 'var(--warn)', bg: 'var(--warn-soft)' },
    { id: 'week',   label: 'This week', color: 'var(--ink-3)', bg: 'var(--bg-2)'     },
  ]
  const total = items.length
  return (
    <Section
      title="Needs Attention"
      subtitle={loading ? 'Loading…' : total > 0 ? `${total} open` : 'All clear'}
    >
      <div style={{ padding: '4px 10px 10px' }}>
        {loading ? (
          <div style={emptyMsg}>Loading…</div>
        ) : items.length === 0 ? (
          <div style={emptyMsg}>Nothing needs attention right now 🎉</div>
        ) : (
          groups.map(g => {
            const rows = items.filter(a => a.priority === g.id)
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
                    <button onClick={() => onAction(a.action)} style={microBtn}>{a.action}</button>
                  </div>
                ))}
              </div>
            )
          })
        )}
      </div>
    </Section>
  )
}

// ── Project Pulse ─────────────────────────────────────────────

function ProjectPulse({ items, loading, onOpenProjects }) {
  return (
    <Section
      title="Project Pulse"
      subtitle="Active projects"
      action={<button onClick={onOpenProjects} style={linkBtn}>All projects <ArrowRight size={13} strokeWidth={2}/></button>}
    >
      {loading ? (
        <div style={emptyMsg}>Loading projects…</div>
      ) : items.length === 0 ? (
        <div style={emptyMsg}>No active projects</div>
      ) : (
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
          {items.map((p, i) => {
            const s = PULSE_STYLE[p.status] || PULSE_STYLE.starting
            return (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '110px 1fr 140px 110px 90px', gap: 12,
                alignItems: 'center', padding: '11px 18px',
                borderBottom: i < items.length - 1 ? '1px solid var(--line-2)' : 'none',
                cursor: 'pointer',
              }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--hover)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                onClick={onOpenProjects}
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
      )}
    </Section>
  )
}

// ── Page ──────────────────────────────────────────────────────

const ATTENTION_ROUTES = {
  Send:   '/pipeline',
  Call:   '/contacts',
  Plan:   '/schedule',
  Run:    '/employees',
  Review: '/projects',
}

export default function Home() {
  const navigate = useNavigate()
  const { user }  = useAuth()

  const now   = new Date()
  const hour  = now.getHours()
  const greetingBase = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const userName = user?.user_metadata?.name
    || user?.user_metadata?.full_name
    || user?.email?.split('@')[0]
  const greeting = userName ? `${greetingBase}, ${userName}` : greetingBase
  const dateStr  = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const { data, loading, error } = useSupabaseQuery(fetchHomeData, [], {
    errorMessage: 'Failed to load dashboard data. Please try again.',
  })

  const stats          = data?.stats          || {}
  const heroSub        = data?.heroSub        || {}
  const actionCards    = data?.actionCards    || {}
  const weekAgenda     = data?.weekAgenda     || []
  const recentActivity = data?.recentActivity || []
  const projectPulse   = data?.projectPulse   || []
  const attention      = data?.attention      || []
  const ctbidsLots     = loading ? undefined : (data?.ctbidsLots ?? null)
  const monthlySummary = data?.monthlySummary || {}

  function handleAttentionAction(action) {
    const route = ATTENTION_ROUTES[action]
    if (route) navigate(route)
  }

  return (
    <div style={{ flex: 1, height: '100%', overflowY: 'auto', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 32px 80px' }}>

        {error && (
          <div style={{
            marginBottom: 16, padding: '12px 16px', borderRadius: 10,
            background: 'var(--lose-soft)', color: 'var(--lose)',
            border: '1px solid color-mix(in oklab, var(--lose) 20%, var(--line))',
            fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {/* Section 1A: Hero */}
        <HomeHero
          greeting={greeting}
          dateStr={dateStr}
          stats={stats}
          heroSub={heroSub}
          loading={loading}
        />

        {/* Section 1B: Action Cards */}
        <div style={{ marginTop: 18 }}>
          <ActionCards data={actionCards} loading={loading} navigate={navigate} />
        </div>

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.55fr) minmax(300px, 1fr)', gap: 18, marginTop: 18 }}>

          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>

            {/* Section 1C (left): This Week Agenda */}
            <ThisWeekAgenda
              items={weekAgenda}
              loading={loading}
              onNewMeeting={() => navigate('/calendar')}
            />

            {/* Section 1D: Project Updates Feed */}
            <ProjectUpdatesFeed
              items={recentActivity}
              loading={loading}
              onOpenPipeline={() => navigate('/pipeline')}
            />

          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>

            {/* Section 1C (right): Quick Actions */}
            <QuickActions
              onNewMeeting={() => navigate('/calendar')}
              navigate={navigate}
            />

            {/* Needs Attention */}
            <NeedsAttention
              items={attention}
              loading={loading}
              onAction={handleAttentionAction}
            />

            {/* Section 1F: Monthly Summary */}
            <MonthlySummary stats={monthlySummary} loading={loading} />

          </div>
        </div>

        {/* Section 1E: CTBids Snapshot */}
        <div style={{ marginTop: 18 }}>
          <CTBidsSnapshot
            lots={ctbidsLots}
            loading={loading}
            onViewAll={() => navigate('/ctbids')}
          />
        </div>

        {/* Project Pulse */}
        <div style={{ marginTop: 18 }}>
          <ProjectPulse
            items={projectPulse}
            loading={loading}
            onOpenProjects={() => navigate('/projects')}
          />
        </div>

      </div>
    </div>
  )
}
