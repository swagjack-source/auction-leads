import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  ArrowRight, Gavel, Phone, Users,
  PlusCircle, Columns, Calculator, Briefcase, CalendarPlus,
  TriangleAlert, TrendingUp, CheckCircle2, Activity,
  MapPin, Clock, FileText,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useSupabaseQuery } from '../lib/useSupabaseQuery'
import { useAuth } from '../lib/AuthContext'

// ── Date / format helpers ────────────────────────────────────

function formatTime12h(timeStr) {
  if (!timeStr) return ''
  const parts = String(timeStr).split(':')
  const h = parseInt(parts[0], 10)
  const m = parseInt(parts[1] || '0', 10)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 2)  return 'yesterday'
  if (days < 7)  return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

// ── Data fetcher ─────────────────────────────────────────────

async function fetchHomeData() {
  const today      = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr   = today.toISOString().slice(0, 10)
  const weekEndStr = new Date(today.getTime() + 6 * 86_400_000).toISOString().slice(0, 10)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  const threeDaysAgoIso = new Date(Date.now() - 3 * 86_400_000).toISOString()

  const [leadsRes, calEventsRes, scoresRes, ctbidsLiveRes, ctbidsAuctionRes, projectNotesRes] = await Promise.all([
    supabase
      .from('leads')
      .select('id, name, address, status, deal_score, job_type, created_at, updated_at, consult_at, project_start, project_end, bid_amount, checklist')
      .order('updated_at', { ascending: false })
      .limit(500),
    supabase
      .from('calendar_events')
      .select('id, title, event_date, event_time, event_type, address, lead_id, assigned_to, notes')
      .gte('event_date', todayStr)
      .lte('event_date', weekEndStr)
      .order('event_date')
      .order('event_time'),
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
    supabase
      .from('ctbids_auctions')
      .select('id, title, end_date, total_revenue, items_sold')
      .order('end_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('project_notes')
      .select('id, project_id, author, content, created_at')
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  const leads     = leadsRes.data    || []
  const calEvents = calEventsRes.data || []
  const scores    = scoresRes.data   || []
  const ctbidsLots = ctbidsLiveRes.error ? null : (ctbidsLiveRes.data || [])
  const lastAuction = ctbidsAuctionRes?.data || null
  const projectNotes = projectNotesRes.error ? [] : (projectNotesRes.data || [])

  // Latest recommended_bid per lead (for revenue MTD when bid_amount missing)
  const bidMap = {}
  scores.forEach(s => { if (!(s.lead_id in bidMap)) bidMap[s.lead_id] = s.recommended_bid })

  // ── Action card counts (3B) ─────────────────────────────────
  const newLeadsCount = leads.filter(l => l.status === 'New Lead').length

  // Stale = active leads (not Won/Lost/Backlog) untouched 3+ days
  const staleLeads = leads.filter(l =>
    !['Won', 'Lost', 'Backlog'].includes(l.status) &&
    (l.updated_at || l.created_at || '') < threeDaysAgoIso
  )
  const followUpCount = staleLeads.length

  // Today's consults (calendar_events of type consult on today)
  const todayConsultEvents = calEvents.filter(e => e.event_type === 'consult' && e.event_date === todayStr)
  const todayConsults = todayConsultEvents.length

  // Active projects: status=Project Scheduled and start <= today <= end
  const activeProjects = leads.filter(l =>
    l.status === 'Project Scheduled' &&
    l.project_start && l.project_end &&
    l.project_start <= todayStr && l.project_end >= todayStr
  ).length

  // ── Hero stats (kept for top headline) ──────────────────────
  const wonThisMonth = leads.filter(l =>
    ['Won', 'Project Completed'].includes(l.status) &&
    (l.updated_at || l.created_at || '').slice(0, 10) >= monthStart
  )
  const revenueMTD = wonThisMonth.reduce((s, l) => s + (l.bid_amount || bidMap[l.id] || 0), 0)
  const bidsOut = leads.filter(l => l.status === 'Estimate Sent').length
  const scoredLeads = leads.filter(l =>
    l.deal_score != null && !['Lost', 'Backlog'].includes(l.status)
  )
  const avgScore = scoredLeads.length > 0
    ? +(scoredLeads.reduce((s, l) => s + l.deal_score, 0) / scoredLeads.length).toFixed(1)
    : null

  // ── This Week agenda (3C) ──────────────────────────────────
  // Source 1: calendar_events (consults + meetings) for next 7 days
  const eventItems = calEvents.map(ev => ({
    dateStr: ev.event_date,
    sortKey: `${ev.event_date} ${(ev.event_time || '00:00').slice(0, 5)}`,
    time:    formatTime12h(ev.event_time),
    type:    ev.event_type === 'consult' ? 'consult' : 'meeting',
    title:   ev.event_type === 'consult' ? `Consult — ${ev.title}` : ev.title,
    detail:  ev.address || '',
    address: ev.address || null,
    leadId:  ev.lead_id,
    eventId: ev.id,
  }))

  // Source 2: leads with consult_at not yet promoted to calendar_events
  const eventConsultLeadIds = new Set(calEvents.filter(e => e.event_type === 'consult' && e.lead_id).map(e => e.lead_id))
  const consultFromLeads = leads
    .filter(l => l.consult_at && !eventConsultLeadIds.has(l.id))
    .filter(l => {
      const d = l.consult_at.slice(0, 10)
      return d >= todayStr && d <= weekEndStr
    })
    .map(l => {
      const dt = new Date(l.consult_at)
      const hh = String(dt.getHours()).padStart(2, '0')
      const mm = String(dt.getMinutes()).padStart(2, '0')
      return {
        dateStr: l.consult_at.slice(0, 10),
        sortKey: `${l.consult_at.slice(0, 10)} ${hh}:${mm}`,
        time:    formatTime12h(`${hh}:${mm}`),
        type:    'consult',
        title:   `Consult — ${l.name}`,
        detail:  l.address || '',
        address: l.address || null,
        leadId:  l.id,
        eventId: null,
      }
    })

  // Source 3: active projects intersecting this week
  const projectItems = []
  for (let i = 0; i < 7; i++) {
    const dStr = new Date(today.getTime() + i * 86_400_000).toISOString().slice(0, 10)
    leads.filter(l =>
      ['Project Scheduled'].includes(l.status) &&
      l.project_start && l.project_end &&
      l.project_start <= dStr && l.project_end >= dStr
    ).forEach(p => {
      const start = new Date(p.project_start + 'T00:00:00')
      const end   = new Date(p.project_end   + 'T00:00:00')
      const totalDays = Math.max(1, Math.round((end - start) / 86_400_000) + 1)
      const dayN = Math.round((new Date(dStr + 'T00:00:00') - start) / 86_400_000) + 1
      projectItems.push({
        dateStr: dStr,
        sortKey: `${dStr} 00:00`,
        time:    '',
        type:    'project',
        title:   p.name,
        detail:  `Day ${dayN} of ${totalDays}`,
        address: p.address || null,
        leadId:  p.id,
        eventId: null,
        projectId: p.id,
      })
    })
  }

  const weekAgenda = [...eventItems, ...consultFromLeads, ...projectItems]
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))

  // ── Project pulse: project_notes + recent lead status updates (3D) ──
  const noteItems = projectNotes.slice(0, 5).map(n => ({
    kind:     'note',
    leadId:   n.project_id,
    title:    leads.find(l => l.id === n.project_id)?.name || 'Project',
    detail:   `${n.author ? n.author + ': ' : ''}${(n.content || '').slice(0, 80)}${(n.content || '').length > 80 ? '…' : ''}`,
    when:     n.created_at,
  }))
  const updateItems = leads.slice(0, 8).map(l => ({
    kind:     'status',
    leadId:   l.id,
    title:    l.name,
    detail:   l.status,
    when:     l.updated_at || l.created_at,
  }))
  // Merge, dedupe-by-lead in favour of notes, sort newest first
  const combinedPulseMap = new Map()
  noteItems.forEach(i => combinedPulseMap.set(`note-${i.leadId}-${i.when}`, i))
  updateItems.forEach(i => {
    const key = `status-${i.leadId}`
    if (!combinedPulseMap.has(key)) combinedPulseMap.set(key, i)
  })
  const projectPulse = Array.from(combinedPulseMap.values())
    .sort((a, b) => new Date(b.when) - new Date(a.when))
    .slice(0, 8)

  // ── Needs Attention (3D right column) ───────────────────────
  const attentionItems = []

  // 1. Stale leads (top 5)
  staleLeads.slice(0, 5).forEach(l => {
    const days = Math.max(1, Math.floor((Date.now() - new Date(l.updated_at || l.created_at).getTime()) / 86_400_000))
    attentionItems.push({
      kind: 'stale',
      leadId: l.id,
      title: l.name,
      meta: `Untouched ${days} day${days === 1 ? '' : 's'} · ${l.status}`,
    })
  })

  // 2. Overdue projects
  leads.filter(l =>
    ['Project Scheduled', 'Project Accepted'].includes(l.status) &&
    l.project_end && l.project_end < todayStr
  ).slice(0, 3).forEach(l => {
    attentionItems.push({
      kind: 'overdue',
      leadId: l.id,
      title: l.name,
      meta: `Overdue — ended ${l.project_end}`,
    })
  })

  // 3. Estimates pending (consult completed, no estimate sent)
  leads.filter(l => l.status === 'Consult Completed').slice(0, 3).forEach(l => {
    attentionItems.push({
      kind: 'estimate',
      leadId: l.id,
      title: l.name,
      meta: 'Consult complete — estimate not sent',
    })
  })

  // 4. Post-consult score prompts (3L)
  const scorePrompts = []
  todayConsultEvents.forEach(ev => {
    if (!ev.event_time) return
    const lead = leads.find(l => l.id === ev.lead_id)
    if (!lead || lead.status !== 'Consult Scheduled') return
    const [hh, mm] = String(ev.event_time).split(':').map(Number)
    const consultEnd = new Date()
    consultEnd.setHours((hh || 0) + 1, mm || 0, 0, 0)
    if (Date.now() > consultEnd.getTime()) {
      const hoursAgo = Math.max(1, Math.round((Date.now() - consultEnd.getTime()) / 3_600_000))
      scorePrompts.push({
        leadId:  lead.id,
        title:   `Consult with ${lead.name} ended ${hoursAgo}h ago`,
        meta:    'Ready to score this deal?',
      })
    }
  })

  return {
    stats:          { activeProjects, bidsOut, revenueMTD, avgScore },
    actionCards:    { newLeadsCount, followUpCount, todayConsults, activeProjects },
    weekAgenda,
    projectPulse,
    attention:      attentionItems,
    scorePrompts,
    ctbidsLots,
    lastAuction,
    monthlySummary: { revenueMTD, completedCount: wonThisMonth.length },
  }
}

// ── Style maps ────────────────────────────────────────────────

const TYPE_DOT = {
  consult: { color: '#7C3AED', label: 'Consult' },
  meeting: { color: '#1D9E75', label: 'Meeting' },
  project: { color: 'var(--accent)', label: 'Project' },
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

const emptyMsg = {
  padding: '24px 18px', textAlign: 'center',
  fontSize: 12, color: 'var(--ink-4)',
}

// ── Hero ─────────────────────────────────────────────────────

function HomeHero({ greeting, dateStr, stats, attentionCount, todayConsults, activeProjects, loading }) {
  const heroStats = [
    { label: 'Active projects', value: loading ? '—' : String(stats.activeProjects ?? 0) },
    { label: 'Bids out',        value: loading ? '—' : String(stats.bidsOut ?? 0)        },
    { label: 'Revenue MTD',     value: loading ? '—' : fmtMoney(stats.revenueMTD || 0)   },
    { label: 'Avg deal score',  value: loading ? '—' : (stats.avgScore != null ? String(stats.avgScore) : '—') },
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
            <span>{todayConsults} consult{todayConsults !== 1 ? 's' : ''} today</span>
            <span style={{ color: 'var(--ink-4)', margin: '0 8px' }}>·</span>
            <span>{activeProjects} active project{activeProjects !== 1 ? 's' : ''}</span>
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
            <span className="tnum" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink-1)', display: 'block', marginTop: 4 }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Action Cards (3B) ────────────────────────────────────────

const ACTION_CARDS = [
  { key: 'newLeadsCount',  label: 'New Leads',         sub: 'In pipeline',    Icon: PlusCircle,  color: 'var(--accent)', bg: 'var(--accent-soft)', filterUrl: '/pipeline?filter=New Lead' },
  { key: 'followUpCount',  label: 'Needs Follow-Up',   sub: '3+ days stale',  Icon: Phone,       color: 'var(--warn)',   bg: 'var(--warn-soft)',   filterUrl: '/pipeline?filter=stale' },
  { key: 'todayConsults',  label: "Today's Consults",  sub: 'Scheduled today',Icon: Clock,       color: '#7C3AED',       bg: '#EDE9FE',            filterUrl: '/calendar?view=day' },
  { key: 'activeProjects', label: 'Active Projects',   sub: 'In progress',    Icon: Briefcase,   color: 'var(--win)',    bg: 'var(--win-soft)',    filterUrl: '/projects?tab=current' },
]

function ActionCards({ data, loading, navigate }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
      {ACTION_CARDS.map(card => (
        <button
          key={card.key}
          onClick={() => navigate(card.filterUrl)}
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

// ── Quick Actions (3A) ───────────────────────────────────────

function QuickActions({ navigate }) {
  const groups = [
    {
      label: 'Leads',
      items: [
        { Icon: PlusCircle, label: 'Add New Lead',   onClick: () => navigate('/pipeline?action=newLead') },
        { Icon: Columns,    label: 'View Pipeline',  onClick: () => navigate('/pipeline') },
      ],
    },
    {
      label: 'Projects',
      items: [
        { Icon: Calculator, label: 'Score a Project', onClick: () => navigate('/projects?openScorer=true') },
        { Icon: Briefcase,  label: 'Active Projects', onClick: () => navigate('/projects?tab=current') },
      ],
    },
    {
      label: 'Schedule',
      items: [
        { Icon: CalendarPlus, label: 'Add Consult',  onClick: () => navigate('/calendar?action=addEvent') },
        { Icon: Users,        label: 'Crew Schedule', onClick: () => navigate('/schedule') },
      ],
    },
  ]
  return (
    <Section title="Quick Actions">
      <div style={{ padding: '8px 12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {groups.map(g => (
          <div key={g.label}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '8px 6px 4px' }}>
              {g.label}
            </div>
            {g.items.map((it, i) => (
              <button
                key={i}
                onClick={it.onClick}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  width: '100%', height: 44,
                  padding: '0 10px',
                  border: 'none', background: 'transparent',
                  cursor: 'pointer', textAlign: 'left',
                  borderRadius: 8,
                  transition: 'background 100ms',
                  fontFamily: 'inherit',
                }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--hover)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                <it.Icon size={16} strokeWidth={1.8} color="var(--ink-3)" />
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-1)' }}>{it.label}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </Section>
  )
}

// ── This Week Agenda (3C) ────────────────────────────────────

function ThisWeekAgenda({ items, loading, navigate }) {
  const today = new Date().toISOString().slice(0, 10)
  // Build all 7 days even if empty
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + i)
    return d.toISOString().slice(0, 10)
  })

  function handleClick(item) {
    if (item.type === 'consult' && item.leadId) {
      navigate(`/pipeline?lead=${item.leadId}`)
    } else if (item.type === 'meeting') {
      navigate('/calendar')
    } else if (item.type === 'project' && item.projectId) {
      navigate('/projects?tab=current')
    }
  }

  return (
    <Section
      title="This Week"
      subtitle="Next 7 days"
      action={<button onClick={() => navigate('/calendar')} style={linkBtn}>Open calendar <ArrowRight size={13} strokeWidth={2}/></button>}
    >
      <div style={{ padding: '4px 0 8px' }}>
        {loading ? (
          <div style={emptyMsg}>Loading schedule…</div>
        ) : (
          days.map(dateStr => {
            const dayItems = items.filter(i => i.dateStr === dateStr)
            const isToday = dateStr === today
            return (
              <div key={dateStr} style={{
                position: 'relative',
                paddingLeft: isToday ? 3 : 0,
              }}>
                {isToday && <div style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, background: 'var(--accent)', borderRadius: 2 }} />}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px 4px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: isToday ? 'var(--accent-ink)' : 'var(--ink-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {fmtDayLabel(dateStr)}
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'var(--line-2)' }}/>
                </div>
                {dayItems.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--ink-4)', padding: '4px 18px 8px', fontStyle: 'italic' }}>
                    Nothing scheduled
                  </div>
                ) : (
                  dayItems.map((item, i) => {
                    const dot = TYPE_DOT[item.type] || TYPE_DOT.meeting
                    const mapsUrl = item.address
                      ? `https://maps.google.com/?q=${encodeURIComponent(item.address)}`
                      : null
                    return (
                      <div key={i}
                        onClick={() => handleClick(item)}
                        style={{
                          display: 'grid', gridTemplateColumns: '60px 14px 1fr auto',
                          alignItems: 'center', gap: 10,
                          padding: '7px 18px', cursor: 'pointer', borderRadius: 8,
                        }}
                        onMouseOver={e => e.currentTarget.style.background = 'var(--hover)'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div className="tnum" style={{ fontSize: 11.5, color: 'var(--ink-2)', fontWeight: 500 }}>
                          {item.time || <span style={{ color: 'var(--ink-4)' }}>—</span>}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot.color }} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.title}
                          </div>
                          {item.detail && <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.detail}</div>}
                        </div>
                        {item.type === 'consult' && mapsUrl && (
                          <a
                            href={mapsUrl} target="_blank" rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            style={{ display: 'inline-flex', alignItems: 'center', padding: 4, color: 'var(--ink-3)', textDecoration: 'none' }}
                            title="Open in Google Maps"
                          >
                            <MapPin size={13} />
                          </a>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            )
          })
        )}
      </div>
    </Section>
  )
}

// ── Needs Attention (3D right column) ────────────────────────

const ATTENTION_KIND_ICON = {
  stale:    { Icon: Phone,         color: 'var(--warn)' },
  overdue:  { Icon: TriangleAlert, color: 'var(--lose)' },
  estimate: { Icon: FileText,      color: 'var(--accent)' },
}

function NeedsAttention({ items, scorePrompts, dismissedScorePrompts, onDismissScorePrompt, loading, navigate }) {
  const visibleScorePrompts = scorePrompts.filter(p => !dismissedScorePrompts.has(p.leadId))
  const total = items.length + visibleScorePrompts.length
  return (
    <Section title="Needs Attention" subtitle={loading ? 'Loading…' : total > 0 ? `${total} open` : 'All clear'}>
      <div style={{ padding: '4px 8px 12px' }}>
        {loading ? (
          <div style={emptyMsg}>Loading…</div>
        ) : total === 0 ? (
          <div style={emptyMsg}>Nothing needs attention right now</div>
        ) : (
          <>
            {/* Post-consult score prompts (3L) */}
            {visibleScorePrompts.map(p => (
              <div key={`prompt-${p.leadId}`} style={{
                margin: '4px 4px 8px',
                padding: '10px 12px',
                background: 'color-mix(in oklab, var(--accent-soft) 70%, var(--panel))',
                border: '1px solid var(--accent)',
                borderLeft: '4px solid var(--accent)',
                borderRadius: 9,
              }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-1)' }}>{p.title}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{p.meta}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button
                    onClick={() => navigate(`/scorer?lead=${p.leadId}`)}
                    style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                  >Score Now</button>
                  <button
                    onClick={() => onDismissScorePrompt(p.leadId)}
                    style={{ background: 'transparent', color: 'var(--ink-3)', border: '1px solid var(--line)', borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                  >Later</button>
                </div>
              </div>
            ))}

            {/* Standard items */}
            {items.map((a, i) => {
              const meta = ATTENTION_KIND_ICON[a.kind] || ATTENTION_KIND_ICON.stale
              return (
                <div key={`${a.kind}-${a.leadId}-${i}`}
                  onClick={() => navigate(`/pipeline?lead=${a.leadId}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--hover)'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: `color-mix(in oklab, ${meta.color} 14%, var(--panel))`,
                    color: meta.color, display: 'grid', placeItems: 'center', flexShrink: 0,
                  }}>
                    <meta.Icon size={14} strokeWidth={1.8}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.meta}</div>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </Section>
  )
}

// ── Project Pulse (3D) ───────────────────────────────────────

function ProjectPulse({ items, loading, navigate }) {
  return (
    <Section
      title="Project Pulse"
      subtitle="Recent updates"
      icon={
        <div style={{ width: 26, height: 26, borderRadius: 7, background: 'color-mix(in oklab, var(--accent-soft) 60%, var(--panel))', color: 'var(--accent)', display: 'grid', placeItems: 'center' }}>
          <Activity size={14} strokeWidth={1.8}/>
        </div>
      }
      action={<button onClick={() => navigate('/projects')} style={linkBtn}>View all <ArrowRight size={13} strokeWidth={2}/></button>}
    >
      <div style={{ padding: '4px 10px 12px' }}>
        {loading ? (
          <div style={emptyMsg}>Loading…</div>
        ) : items.length === 0 ? (
          <div style={emptyMsg}>No recent updates</div>
        ) : (
          items.map((it, i) => (
            <div key={i}
              onClick={() => it.kind === 'note'
                ? navigate(`/projects?tab=current&lead=${it.leadId}`)
                : navigate(`/pipeline?lead=${it.leadId}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '9px 10px', borderRadius: 9, cursor: 'pointer',
                borderBottom: i < items.length - 1 ? '1px solid var(--line-2)' : 'none',
              }}
              onMouseOver={e => e.currentTarget.style.background = 'var(--hover)'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: it.kind === 'note' ? 'var(--accent)' : 'var(--ink-3)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.detail}</div>
              </div>
              <span className="tnum" style={{ fontSize: 11, color: 'var(--ink-4)', flexShrink: 0 }}>{timeAgo(it.when)}</span>
            </div>
          ))
        )}
      </div>
    </Section>
  )
}

// ── Monthly Summary (3D click + reorg) ───────────────────────

function MonthlySummary({ stats, loading, navigate }) {
  const month = new Date().toLocaleDateString('en-US', { month: 'long' })
  function CardCell({ Icon, color, bg, value, label, sub }) {
    return (
      <button
        onClick={() => navigate('/projects?tab=completed')}
        style={{
          background: 'var(--panel)', padding: '18px 18px 16px',
          border: 'none', cursor: 'pointer', textAlign: 'left',
          transition: 'background 120ms',
          fontFamily: 'inherit',
        }}
        onMouseOver={e => e.currentTarget.style.background = 'var(--hover)'}
        onMouseOut={e => e.currentTarget.style.background = 'var(--panel)'}
      >
        <div style={{ width: 32, height: 32, borderRadius: 9, background: bg, color, display: 'grid', placeItems: 'center', marginBottom: 12 }}>
          <Icon size={16} strokeWidth={1.8}/>
        </div>
        <div className="tnum" style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink-1)', lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-1)', marginTop: 6 }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{sub}</div>
      </button>
    )
  }
  return (
    <Section title={`${month} Summary`} subtitle="Month-to-date performance">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--line-2)' }}>
        <CardCell Icon={TrendingUp}  color="var(--win)"    bg="var(--win-soft)"
          value={loading ? '—' : fmtMoney(stats?.revenueMTD || 0)}
          label="Revenue MTD" sub="Closed deals this month" />
        <CardCell Icon={CheckCircle2} color="var(--accent)" bg="var(--accent-soft)"
          value={loading ? '—' : (stats?.completedCount ?? 0)}
          label="Completed" sub="Jobs won or finished" />
      </div>
    </Section>
  )
}

// ── CTBids Snapshot (3K) ─────────────────────────────────────

function CTBidsSnapshot({ lots, lastAuction, loading, navigate }) {
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

  const noActiveLots = !loading && (!lots || lots.length === 0)

  return (
    <Section
      title="CTBids Live"
      subtitle={
        loading ? '…'
        : lots == null ? 'Scraper not connected'
        : lots.length === 0 ? 'No active auction right now'
        : `${lots.length} active lot${lots.length !== 1 ? 's' : ''}`
      }
      icon={
        <div style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--warn-soft)', border: '1px solid color-mix(in oklab, var(--warn) 20%, var(--line))', color: 'var(--warn)', display: 'grid', placeItems: 'center' }}>
          <Gavel size={14} strokeWidth={1.8}/>
        </div>
      }
      action={
        <button onClick={() => navigate('/ctbids')} style={linkBtn}>
          View CTBids <ArrowRight size={13} strokeWidth={2}/>
        </button>
      }
    >
      {lots == null ? (
        <div style={{ padding: '28px 20px', textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--warn-soft)', color: 'var(--warn)', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}>
            <Gavel size={18} strokeWidth={1.8}/>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-1)', marginBottom: 4 }}>CTBids scraper not connected</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', maxWidth: 280, margin: '0 auto' }}>Deploy the Railway scraper to see live auction data here.</div>
        </div>
      ) : noActiveLots ? (
        <div style={{ padding: '24px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-1)', marginBottom: 6 }}>No active auction right now</div>
          {lastAuction ? (
            <>
              <div style={{ fontSize: 13, color: 'var(--ink-1)', fontWeight: 500 }}>{lastAuction.title}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>
                Ended {lastAuction.end_date ? new Date(lastAuction.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                {lastAuction.total_revenue != null && ` — ${fmtMoney(lastAuction.total_revenue)} revenue`}
                {lastAuction.items_sold != null && `, ${lastAuction.items_sold} items`}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Auction data will appear here once imported or scraped.</div>
          )}
        </div>
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
            const endsIn   = fmtEndsAt(l.ends_at)
            const isUrgent = l.ends_at && (new Date(l.ends_at).getTime() - Date.now()) < 3 * 3_600_000
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
                <span className="tnum" style={{ fontSize: 11.5, fontWeight: 600, textAlign: 'right', color: isUrgent ? 'var(--lose)' : 'var(--ink-2)' }}>{endsIn}</span>
              </div>
            )
          })}
        </div>
      )}
    </Section>
  )
}

// ── Page ─────────────────────────────────────────────────────

export default function Home() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [dismissedScorePrompts, setDismissedScorePrompts] = useState(new Set())

  const now    = new Date()
  const hour   = now.getHours()
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
  const actionCards    = data?.actionCards    || {}
  const weekAgenda     = data?.weekAgenda     || []
  const projectPulse   = data?.projectPulse   || []
  const attention      = data?.attention      || []
  const scorePrompts   = data?.scorePrompts   || []
  const ctbidsLots     = loading ? undefined : (data?.ctbidsLots ?? null)
  const lastAuction    = data?.lastAuction
  const monthlySummary = data?.monthlySummary || {}

  function dismissScorePrompt(leadId) {
    setDismissedScorePrompts(prev => new Set(prev).add(leadId))
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
          }}>{error}</div>
        )}

        {/* Row 1: Greeting hero */}
        <HomeHero
          greeting={greeting}
          dateStr={dateStr}
          stats={stats}
          attentionCount={attention.length + scorePrompts.filter(p => !dismissedScorePrompts.has(p.leadId)).length}
          todayConsults={actionCards.todayConsults || 0}
          activeProjects={actionCards.activeProjects || 0}
          loading={loading}
        />

        {/* Row 2: Action cards */}
        <div style={{ marginTop: 18 }}>
          <ActionCards data={actionCards} loading={loading} navigate={navigate} />
        </div>

        {/* Row 3: This Week (60%) | Needs Attention (40%) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(280px, 1fr)', gap: 18, marginTop: 18 }}>
          <ThisWeekAgenda items={weekAgenda} loading={loading} navigate={navigate} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
            <NeedsAttention
              items={attention}
              scorePrompts={scorePrompts}
              dismissedScorePrompts={dismissedScorePrompts}
              onDismissScorePrompt={dismissScorePrompt}
              loading={loading}
              navigate={navigate}
            />
            <QuickActions navigate={navigate} />
          </div>
        </div>

        {/* Row 4: Project Pulse */}
        <div style={{ marginTop: 18 }}>
          <ProjectPulse items={projectPulse} loading={loading} navigate={navigate} />
        </div>

        {/* Row 5: Monthly Summary */}
        <div style={{ marginTop: 18 }}>
          <MonthlySummary stats={monthlySummary} loading={loading} navigate={navigate} />
        </div>

        {/* Row 6: CTBids Snapshot */}
        <div style={{ marginTop: 18 }}>
          <CTBidsSnapshot lots={ctbidsLots} lastAuction={lastAuction} loading={loading} navigate={navigate} />
        </div>
      </div>
    </div>
  )
}
