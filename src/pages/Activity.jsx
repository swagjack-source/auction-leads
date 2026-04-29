import { useState } from 'react'
import { Bell, UserPlus, ArrowRight, Gavel, TrendingUp, CheckCircle, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useSupabaseQuery } from '../lib/useSupabaseQuery'

const TYPE_META = {
  new_lead:        { icon: UserPlus,     color: '#4A6FA5', soft: 'rgba(74,111,165,0.12)',  label: 'New Lead'         },
  status_change:   { icon: ArrowRight,   color: '#7A5CA5', soft: 'rgba(122,92,165,0.12)',  label: 'Status Changed'   },
  auction_ending:  { icon: Gavel,        color: '#C28A2A', soft: 'rgba(194,138,42,0.12)',  label: 'Auction Ending'   },
  score_update:    { icon: TrendingUp,   color: '#6A8A4A', soft: 'rgba(106,138,74,0.12)',  label: 'Score Updated'    },
  project_won:     { icon: CheckCircle,  color: '#2F7A55', soft: 'rgba(47,122,85,0.12)',   label: 'Project Won'      },
  reminder:        { icon: Clock,        color: '#6B7280', soft: 'rgba(107,114,128,0.12)', label: 'Reminder'         },
}

const FILTERS = ['All', 'New Lead', 'Status Changed', 'Auction Ending', 'Score Updated', 'Project Won']

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000
  if (diff < 60)  return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function buildActivityFromLeads(leads) {
  const events = []
  leads.forEach(l => {
    if (l.created_at) {
      events.push({
        id: `new-${l.id}`,
        type: 'new_lead',
        ts: l.created_at,
        title: `New lead: ${l.name}`,
        sub: l.address || l.job_type || '',
        leadId: l.id,
      })
    }
    if (l.status === 'Won') {
      events.push({
        id: `won-${l.id}`,
        type: 'project_won',
        ts: l.updated_at || l.created_at,
        title: `Won: ${l.name}`,
        sub: l.address || '',
        leadId: l.id,
      })
    }
    if (l.deal_score != null && l.deal_score >= 8) {
      events.push({
        id: `score-${l.id}`,
        type: 'score_update',
        ts: l.updated_at || l.created_at,
        title: `Hot deal: ${l.name}`,
        sub: `Score ${Math.round(l.deal_score)}/10`,
        leadId: l.id,
      })
    }
  })
  events.sort((a, b) => new Date(b.ts) - new Date(a.ts))
  return events
}

function ActivityItem({ item }) {
  const meta = TYPE_META[item.type] || TYPE_META.reminder
  const Icon = meta.icon
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '14px 20px',
      borderBottom: '1px solid var(--line-2)',
      transition: 'background 100ms',
    }}
    onMouseOver={e => e.currentTarget.style.background = 'var(--hover)'}
    onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
      <div style={{
        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
        background: meta.soft,
        display: 'grid', placeItems: 'center',
      }}>
        <Icon size={16} color={meta.color} strokeWidth={1.8} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-1)' }}>{item.title}</span>
          <span style={{ fontSize: 11, color: 'var(--ink-4)', flexShrink: 0 }}>{timeAgo(item.ts)}</span>
        </div>
        {item.sub && (
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{item.sub}</div>
        )}
      </div>
      <span style={{
        fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
        background: meta.soft, color: meta.color, flexShrink: 0, alignSelf: 'center',
      }}>{meta.label}</span>
    </div>
  )
}

export default function Activity() {
  const [filter, setFilter] = useState('All')

  const { data: events = [], loading, error } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('leads')
      .select('id, name, address, job_type, status, deal_score, created_at, updated_at')
      .order('created_at', { ascending: false })
      .range(0, 199)
    if (error) throw error
    return buildActivityFromLeads(data || [])
  }, [], { errorMessage: 'Failed to load activity. Please try again.' })

  const visible = filter === 'All'
    ? events
    : events.filter(e => TYPE_META[e.type]?.label === filter)

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px 12px',
        borderBottom: '1px solid var(--line)',
        background: 'var(--panel)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--accent-soft)', display: 'grid', placeItems: 'center' }}>
            <Bell size={16} color="var(--accent-ink)" strokeWidth={1.8} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-1)' }}>Activity</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Lead notifications, status updates, and alerts</div>
          </div>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>{visible.length} events</span>
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '5px 12px', borderRadius: 999,
              border: `1px solid ${filter === f ? 'var(--accent)' : 'var(--line)'}`,
              background: filter === f ? 'var(--accent-soft)' : 'var(--panel)',
              color: filter === f ? 'var(--accent-ink)' : 'var(--ink-2)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>{f}</button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div style={{ flex: 1, background: 'var(--panel)', borderRadius: 0 }}>
        {error ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--lose)', fontSize: 13 }}>{error}</div>
        ) : loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>Loading activity…</div>
        ) : visible.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink-4)' }}>
            <Bell size={32} strokeWidth={1.2} style={{ marginBottom: 12, opacity: 0.4 }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }}>No activity yet</div>
            <div style={{ fontSize: 13, color: 'var(--ink-4)' }}>Events will appear here as leads are created and updated.</div>
          </div>
        ) : (
          visible.map(item => <ActivityItem key={item.id} item={item} />)
        )}
      </div>
    </div>
  )
}
