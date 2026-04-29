import { useState, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Line, Legend, Cell, LabelList,
} from 'recharts'
import {
  TrendingUp, Star, Users, MapPin, Target, Award, ChevronUp, ChevronDown,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

// ── Dark-mode-aware chart colors ───────────────────────────────
function getChartTheme() {
  const dark = document.documentElement.dataset.theme === 'dark'
  return {
    axis:    dark ? '#6E7480' : '#9AA0AB',
    grid:    dark ? '#2A2D34' : '#E8E8E6',
    tooltip: {
      bg:     dark ? '#1E2027' : '#FFFFFF',
      border: dark ? '#2A2D34' : '#E8E8E6',
      color:  dark ? '#ECEDEF' : '#14161A',
    },
  }
}

// ── Palette ────────────────────────────────────────────────────
const JOB_COLORS = {
  'Clean Out':          '#4B80C1',
  'Auction':            '#7A5CA5',
  'Both':               '#3E5C86',
  'Move':               '#3A9E8A',
  'Sorting/Organizing': '#C28A2A',
}

const ACC_COLORS = {
  'Good Bid': '#22C55E',
  'Underbid': '#EF4444',
  'Overbid':  '#F59E0B',
}

const MO = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const RANK_TINTS = [
  'color-mix(in oklab, #F59E0B 12%, var(--panel))',
  'color-mix(in oklab, #9CA3AF 12%, var(--panel))',
  'color-mix(in oklab, #D97706 10%, var(--panel))',
]

// ── Helpers ────────────────────────────────────────────────────
function fmtCurrency(n) {
  if (n == null || n === 0) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}k`
  return `$${Math.round(n).toLocaleString()}`
}

function extractZip(address = '', zipCode = '') {
  if (zipCode && String(zipCode).length >= 5) return String(zipCode).slice(0, 5)
  const m = String(address).match(/\b(\d{5})(?:-\d{4})?\b/)
  return m ? m[1] : null
}

function trailingMonths(n = 12) {
  const now = new Date()
  const list = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    list.push({
      key:   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: MO[d.getMonth()],
    })
  }
  return list
}

function leadMonthKey(lead) {
  const d = new Date(lead.updated_at || lead.created_at)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ── Shared UI ──────────────────────────────────────────────────
function InsightCard({ title, subtitle, topRight, children }) {
  return (
    <div style={{
      background: 'var(--panel)',
      border: '1px solid var(--line)',
      borderRadius: 14,
      boxShadow: 'var(--shadow-1)',
      overflow: 'hidden',
      animation: 'fadein 280ms ease',
    }}>
      <div style={{
        padding: '14px 18px 11px',
        borderBottom: '1px solid var(--line-2)',
        display: 'flex', alignItems: 'flex-start', gap: 10,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-1)', letterSpacing: '-0.01em' }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>{subtitle}</div>
          )}
        </div>
        {topRight}
      </div>
      <div style={{ padding: '16px 18px' }}>
        {children}
      </div>
    </div>
  )
}

function EmptyState({ icon: Icon, message }) {
  return (
    <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--ink-4)' }}>
      {Icon && <Icon size={30} strokeWidth={1.2} style={{ marginBottom: 8, opacity: 0.45, display: 'block', margin: '0 auto 10px' }} />}
      <div style={{ fontSize: 12.5 }}>{message}</div>
    </div>
  )
}

function TimeRangeFilter({ value, onChange }) {
  const opts = [
    { key: 'month',   label: 'This Month'   },
    { key: 'quarter', label: 'This Quarter' },
    { key: 'all',     label: 'All Time'     },
  ]
  return (
    <div style={{
      display: 'inline-flex',
      background: 'var(--bg-2)',
      border: '1px solid var(--line)',
      borderRadius: 8, padding: 2, gap: 2,
    }}>
      {opts.map(o => (
        <button key={o.key} onClick={() => onChange(o.key)} style={{
          padding: '4px 11px', borderRadius: 6, border: 'none', cursor: 'pointer',
          fontSize: 11.5, fontWeight: 600,
          background: value === o.key ? 'var(--panel)' : 'transparent',
          color: value === o.key ? 'var(--ink-1)' : 'var(--ink-3)',
          boxShadow: value === o.key ? 'var(--shadow-1)' : 'none',
          fontFamily: 'inherit', transition: 'background 120ms',
        }}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ── Custom tooltip ─────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  const t = getChartTheme()
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: t.tooltip.bg,
      border: `1px solid ${t.tooltip.border}`,
      borderRadius: 8, padding: '8px 12px',
      fontSize: 12, color: t.tooltip.color,
      boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 5 }}>{label}</div>
      {payload.map(p => {
        const isCount = p.name === 'Projects'
        return (
          <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color, flexShrink: 0, display: 'inline-block' }} />
            <span style={{ opacity: 0.7 }}>{p.name}:</span>
            <span style={{ fontWeight: 600 }}>
              {isCount ? p.value : typeof p.value === 'number' ? fmtCurrency(p.value) : p.value}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── 4A: Highlight Cards ────────────────────────────────────────
function HighlightCards({ wonLeads }) {
  const scored  = wonLeads.filter(l => l.deal_score != null)
  const withBid = wonLeads.filter(l => l._scoreDetails?.recommendedBid)

  const topScore = scored.length  ? [...scored].sort((a, b)  => (b.deal_score || 0) - (a.deal_score || 0))[0]                          : null
  const topValue = withBid.length ? [...withBid].sort((a, b) => (b._scoreDetails?.recommendedBid || 0) - (a._scoreDetails?.recommendedBid || 0))[0] : null

  if (!topScore && !topValue) return null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {topScore && (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, padding: '14px 16px', boxShadow: 'var(--shadow-1)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--win-soft)', color: 'var(--win)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <Star size={19} strokeWidth={1.9} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Top Score</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-1)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topScore.name}</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topScore.address || topScore.zip_code || '—'}</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div className="tnum" style={{ fontSize: 20, fontWeight: 700, color: 'var(--win)', letterSpacing: '-0.02em' }}>{topScore.deal_score?.toFixed(1)}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{topScore.job_type || '—'}</div>
          </div>
        </div>
      )}
      {topValue && (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, padding: '14px 16px', boxShadow: 'var(--shadow-1)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <TrendingUp size={19} strokeWidth={1.9} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Highest Value</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-1)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topValue.name}</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topValue.address || topValue.zip_code || '—'}</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div className="tnum" style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-ink)', letterSpacing: '-0.02em' }}>{fmtCurrency(topValue._scoreDetails.recommendedBid)}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{topValue.deal_score?.toFixed(1) ?? '—'}/10 score</div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── 4B: Revenue by Job Type ────────────────────────────────────
function RevenueByJobType({ wonLeads, timeRange }) {
  const t = getChartTheme()

  const data = useMemo(() => {
    const now  = new Date()
    let leads  = wonLeads
    if (timeRange === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      leads = wonLeads.filter(l => new Date(l.updated_at || l.created_at) >= start)
    } else if (timeRange === 'quarter') {
      const q     = Math.floor(now.getMonth() / 3)
      const start = new Date(now.getFullYear(), q * 3, 1)
      leads = wonLeads.filter(l => new Date(l.updated_at || l.created_at) >= start)
    }

    return ['Clean Out', 'Auction', 'Both', 'Move', 'Sorting/Organizing']
      .map(type => {
        const jobs    = leads.filter(l => l.job_type === type)
        const revenue = jobs.reduce((s, l) => s + (l._scoreDetails?.recommendedBid || 0), 0)
        return { type, revenue, count: jobs.length }
      })
      .filter(d => d.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
  }, [wonLeads, timeRange])

  if (!data.length) return <EmptyState message="No revenue data for this time range." />

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 58)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 90, bottom: 0, left: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={t.grid} horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: t.axis }} tickFormatter={fmtCurrency} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="type" tick={{ fontSize: 12, fill: t.axis }} width={126} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Bar dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]}>
          {data.map(d => <Cell key={d.type} fill={JOB_COLORS[d.type] || '#6B7280'} />)}
          <LabelList dataKey="revenue" position="right" formatter={fmtCurrency}
            style={{ fontSize: 11.5, fontWeight: 600, fill: t.axis }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── 4C: Revenue by Month ───────────────────────────────────────
function RevenueByMonth({ wonLeads }) {
  const t = getChartTheme()

  const data = useMemo(() => {
    const months = trailingMonths(12).map(m => ({ ...m, revenue: 0, count: 0 }))
    for (const lead of wonLeads) {
      const key = leadMonthKey(lead)
      const m   = months.find(x => x.key === key)
      if (m) {
        m.revenue += lead._scoreDetails?.recommendedBid || 0
        m.count   += 1
      }
    }
    const firstIdx = months.findIndex(m => m.revenue > 0)
    return firstIdx >= 0 ? months.slice(Math.min(firstIdx, months.length - 6)) : months.slice(-6)
  }, [wonLeads])

  if (data.every(d => d.revenue === 0)) return <EmptyState message="No completed project data yet." />

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 8, right: 40, bottom: 0, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={t.grid} vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: t.axis }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="rev" tick={{ fontSize: 11, fill: t.axis }} tickFormatter={fmtCurrency} axisLine={false} tickLine={false} width={60} />
        <YAxis yAxisId="cnt" orientation="right" tick={{ fontSize: 11, fill: t.axis }} axisLine={false} tickLine={false} width={28} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Legend iconType="square" iconSize={9} wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
        <Bar       yAxisId="rev" dataKey="revenue" name="Revenue"  fill="#4B80C1" radius={[3, 3, 0, 0]} opacity={0.88} />
        <Line      yAxisId="cnt" type="monotone" dataKey="count" name="Projects" stroke="#7A5CA5" strokeWidth={2} dot={{ r: 3, fill: '#7A5CA5' }} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

// ── 4D: Bid Accuracy Over Time ─────────────────────────────────
function BidAccuracyOverTime({ dealScores }) {
  const t      = getChartTheme()
  const tagged = dealScores.filter(d => d.bid_tag)

  const data = useMemo(() => {
    if (!tagged.length) return []
    const months = trailingMonths(12).map(m => ({ ...m, 'Good Bid': 0, Underbid: 0, Overbid: 0 }))
    for (const ds of tagged) {
      const d   = new Date(ds.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const m   = months.find(x => x.key === key)
      if (m && ds.bid_tag) m[ds.bid_tag] = (m[ds.bid_tag] || 0) + 1
    }
    return months.filter(m => m['Good Bid'] + m.Underbid + m.Overbid > 0)
  }, [tagged])

  if (!tagged.length || !data.length) {
    return (
      <EmptyState
        icon={Target}
        message="Tag your completed projects with bid accuracy to see trends here."
      />
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={t.grid} vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: t.axis }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: t.axis }} axisLine={false} tickLine={false} width={28} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Legend iconType="square" iconSize={9} wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
        <Bar dataKey="Good Bid" stackId="a" fill={ACC_COLORS['Good Bid']} />
        <Bar dataKey="Underbid" stackId="a" fill={ACC_COLORS['Underbid']} />
        <Bar dataKey="Overbid"  stackId="a" fill={ACC_COLORS['Overbid']}  radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── 4E: Labour Hours Table ─────────────────────────────────────
function LabourHoursTable({ wonLeads }) {
  const types     = ['Clean Out', 'Auction', 'Both', 'Move']
  const densities = ['Low', 'Medium', 'High']

  const table = useMemo(() => {
    const map = {}
    for (const type of types) {
      map[type] = {}
      for (const den of densities) {
        const matches = wonLeads.filter(l =>
          l.job_type === type && l.density === den && l._scoreDetails?.labourHours,
        )
        const avg = matches.length
          ? matches.reduce((s, l) => s + (l._scoreDetails.labourHours || 0), 0) / matches.length
          : null
        map[type][den] = { avg, count: matches.length }
      }
    }
    return map
  }, [wonLeads])

  const hasData = types.some(t => densities.some(d => table[t]?.[d]?.count > 0))
  if (!hasData) return <EmptyState message="Complete and score more projects to see labour hour trends." />

  function cellStyle(hrs) {
    if (hrs == null) return { bg: 'transparent', color: 'var(--ink-4)' }
    if (hrs < 50)  return { bg: 'color-mix(in oklab, #22C55E 14%, var(--panel))', color: 'var(--win)' }
    if (hrs <= 120) return { bg: 'color-mix(in oklab, #F59E0B 14%, var(--panel))', color: 'var(--warn)' }
    return { bg: 'color-mix(in oklab, #EF4444 14%, var(--panel))', color: 'var(--lose)' }
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
        <thead>
          <tr>
            <th style={thStyle('left')}>Type</th>
            {densities.map(d => <th key={d} style={thStyle('center')}>{d} Density</th>)}
          </tr>
        </thead>
        <tbody>
          {types.map((type, ti) => (
            <tr key={type} style={{ borderBottom: ti < types.length - 1 ? '1px solid var(--line-2)' : 'none' }}>
              <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--ink-2)' }}>{type}</td>
              {densities.map(den => {
                const cell = table[type][den]
                const { bg, color } = cellStyle(cell.avg)
                return (
                  <td key={den} style={{ padding: '8px 12px', textAlign: 'center' }}>
                    <span className="tnum" style={{
                      display: 'inline-block', padding: '3px 10px', borderRadius: 6,
                      background: bg, color,
                      fontWeight: cell.avg != null ? 600 : 400,
                    }}>
                      {cell.avg != null ? `${Math.round(cell.avg)}h` : '—'}
                    </span>
                    {cell.count > 0 && (
                      <div style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 2 }}>
                        {cell.count} job{cell.count !== 1 ? 's' : ''}
                      </div>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── 4F: Top ZIP Codes ──────────────────────────────────────────
function TopZipCodes({ wonLeads }) {
  const data = useMemo(() => {
    const map = {}
    for (const l of wonLeads) {
      const zip = extractZip(l.address || '', l.zip_code || '')
      if (!zip) continue
      if (!map[zip]) map[zip] = { zip, count: 0, revenue: 0, bids: [] }
      map[zip].count += 1
      const bid = l._scoreDetails?.recommendedBid || 0
      map[zip].revenue += bid
      if (bid > 0) map[zip].bids.push(bid)
    }
    return Object.values(map)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map((d, i) => ({
        ...d, rank: i + 1,
        avgBid: d.bids.length
          ? Math.round(d.bids.reduce((s, b) => s + b, 0) / d.bids.length)
          : null,
      }))
  }, [wonLeads])

  if (!data.length) return <EmptyState icon={MapPin} message="No completed projects with ZIP codes yet." />

  const rankBadge = [
    { bg: 'color-mix(in oklab, #F59E0B 22%, var(--panel))', color: '#92400E' },
    { bg: 'color-mix(in oklab, #9CA3AF 22%, var(--panel))', color: 'var(--ink-2)' },
    { bg: 'color-mix(in oklab, #D97706 18%, var(--panel))', color: '#78350F' },
  ]

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
      <thead>
        <tr>
          <th style={thStyle('center')}>Rank</th>
          <th style={thStyle('left')}>ZIP Code</th>
          <th style={thStyle('right')}>Projects</th>
          <th style={thStyle('right')}>Total Revenue</th>
          <th style={thStyle('right')}>Avg Bid</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => {
          const badge = rankBadge[i] || { bg: 'var(--bg-2)', color: 'var(--ink-4)' }
          return (
            <tr key={row.zip} style={{ borderBottom: i < data.length - 1 ? '1px solid var(--line-2)' : 'none' }}
              onMouseOver={e  => e.currentTarget.style.background = 'var(--bg-2)'}
              onMouseOut={e   => e.currentTarget.style.background = 'transparent'}>
              <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: badge.bg, color: badge.color, fontSize: 10.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  {row.rank}
                </span>
              </td>
              <td style={{ padding: '9px 10px', fontWeight: 600, color: 'var(--ink-1)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{row.zip}</td>
              <td style={{ padding: '9px 10px', textAlign: 'right', color: 'var(--ink-2)' }} className="tnum">{row.count}</td>
              <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 600 }} className="tnum">{fmtCurrency(row.revenue)}</td>
              <td style={{ padding: '9px 10px', textAlign: 'right', color: 'var(--ink-3)' }} className="tnum">{row.avgBid ? fmtCurrency(row.avgBid) : '—'}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ── 4G: Sales Funnel ───────────────────────────────────────────
const FUNNEL_STEPS = [
  { key: 'leads',     label: 'Total Leads',          color: '#4B80C1' },
  { key: 'consults',  label: 'Consults Completed',   color: '#3E5C86' },
  { key: 'estimates', label: 'Estimates Sent',        color: '#7A5CA5' },
  { key: 'won',       label: 'Projects Won',          color: '#2F7A55' },
]

const CONSULT_STATUSES  = new Set(['Consult Completed','Estimate Sent','Project Accepted','Project Scheduled','Won'])
const ESTIMATE_STATUSES = new Set(['Estimate Sent','Project Accepted','Project Scheduled','Won'])

function SalesFunnel({ allLeads }) {
  const counts = useMemo(() => ({
    leads:     allLeads.length,
    consults:  allLeads.filter(l => CONSULT_STATUSES.has(l.status)).length,
    estimates: allLeads.filter(l => ESTIMATE_STATUSES.has(l.status)).length,
    won:       allLeads.filter(l => l.status === 'Won').length,
  }), [allLeads])

  const steps = FUNNEL_STEPS.map(s => ({ ...s, count: counts[s.key] }))
  const max   = Math.max(...steps.map(s => s.count), 1)

  const convLabels = [null, 'of leads → consult', 'of consults → estimate', 'of estimates → won']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {steps.map((step, i) => {
        const widthPct = Math.max(18, Math.round((step.count / max) * 100))
        const prevCount = i > 0 ? steps[i - 1].count : null
        const pct = prevCount ? Math.round((step.count / prevCount) * 100) : null

        return (
          <div key={step.key}>
            {pct != null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', fontSize: 11, color: 'var(--ink-3)', paddingLeft: 4 }}>
                <div style={{ width: 1, height: 12, background: 'var(--line)', marginLeft: 20 }} />
                <span className="tnum" style={{ fontWeight: 700, color: pct >= 50 ? 'var(--win)' : pct >= 25 ? 'var(--warn)' : 'var(--lose)' }}>
                  {pct}%
                </span>
                <span>{convLabels[i]}</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ height: 42, background: 'var(--bg-2)', borderRadius: 9, overflow: 'hidden' }}>
                  <div style={{
                    width: `${widthPct}%`, height: '100%',
                    background: step.color, borderRadius: 9,
                    opacity: 0.88, minWidth: 130,
                    display: 'flex', alignItems: 'center', paddingLeft: 14,
                    transition: 'width 500ms ease',
                  }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'white', whiteSpace: 'nowrap' }}>
                      {step.label}
                    </span>
                  </div>
                </div>
              </div>
              <div className="tnum" style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink-1)', minWidth: 44, textAlign: 'right', letterSpacing: '-0.02em' }}>
                {step.count.toLocaleString()}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── 4H: Team Performance ──────────────────────────────────────
function TeamPerformance({ employees, assignments, wonLeads }) {
  const rows = useMemo(() => {
    if (!employees?.length || !assignments?.length) return []
    return employees.map(emp => {
      const empAsgn   = assignments.filter(a => a.employee_id === emp.id)
      const projIds   = new Set(empAsgn.map(a => a.lead_id))
      const projects  = wonLeads.filter(l => projIds.has(l.id))
      const hours     = empAsgn.reduce((s, a) => s + (a.estimated_hours || 0), 0)
      const revenue   = projects.reduce((s, l) => s + (l._scoreDetails?.recommendedBid || 0), 0)
      return { id: emp.id, name: emp.name, completed: projects.length, hours, avgHours: projects.length ? Math.round(hours / projects.length) : 0, revenue }
    }).sort((a, b) => b.revenue - a.revenue)
  }, [employees, assignments, wonLeads])

  if (!rows.length) {
    return <EmptyState icon={Users} message="Assign employees to projects to see performance data here." />
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
      <thead>
        <tr>
          <th style={thStyle('left')}>Employee</th>
          <th style={thStyle('right')}>Projects</th>
          <th style={thStyle('right')}>Total Hours</th>
          <th style={thStyle('right')}>Avg Hrs/Project</th>
          <th style={thStyle('right')}>Revenue</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={row.id} style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--line-2)' : 'none' }}
            onMouseOver={e => e.currentTarget.style.background = 'var(--bg-2)'}
            onMouseOut={e  => e.currentTarget.style.background = 'transparent'}>
            <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--ink-1)' }}>{row.name}</td>
            <td style={{ padding: '10px 12px', textAlign: 'right' }} className="tnum">{row.completed}</td>
            <td style={{ padding: '10px 12px', textAlign: 'right' }} className="tnum">{row.hours > 0 ? `${row.hours}h` : '—'}</td>
            <td style={{ padding: '10px 12px', textAlign: 'right' }} className="tnum">{row.avgHours > 0 ? `${row.avgHours}h` : '—'}</td>
            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }} className="tnum">{fmtCurrency(row.revenue)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ── 4I: Project Leaderboard ────────────────────────────────────
function ProjectLeaderboard({ wonLeads }) {
  const [sortKey, setSortKey] = useState('revenue')
  const [sortDir, setSortDir] = useState('desc')

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const rows = useMemo(() => {
    const base = wonLeads.map(l => ({
      id:      l.id,
      name:    l.name,
      type:    l.job_type || '—',
      revenue: l._scoreDetails?.recommendedBid    || 0,
      profit:  l._scoreDetails?.estimatedProfit   ?? null,
      margin:  l._scoreDetails?.profitMarginPct != null ? Math.round(l._scoreDetails.profitMarginPct) : null,
      hours:   l._scoreDetails?.labourHours        ?? null,
      score:   l.deal_score                        ?? null,
    }))
    return [...base].sort((a, b) => {
      const av = a[sortKey] ?? -Infinity
      const bv = b[sortKey] ?? -Infinity
      return sortDir === 'desc' ? bv - av : av - bv
    })
  }, [wonLeads, sortKey, sortDir])

  if (!rows.length) return <EmptyState icon={Award} message="Completed projects will appear here." />

  const cols = [
    { key: 'rank',    label: '#',        sortable: false, align: 'center' },
    { key: 'name',    label: 'Client',   sortable: false, align: 'left'   },
    { key: 'type',    label: 'Type',     sortable: false, align: 'left'   },
    { key: 'revenue', label: 'Revenue',  sortable: true,  align: 'right'  },
    { key: 'profit',  label: 'Profit',   sortable: true,  align: 'right'  },
    { key: 'margin',  label: 'Margin',   sortable: true,  align: 'right'  },
    { key: 'hours',   label: 'Hours',    sortable: true,  align: 'right'  },
    { key: 'score',   label: 'Score',    sortable: true,  align: 'right'  },
  ]

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 620 }}>
        <thead>
          <tr>
            {cols.map(col => (
              <th key={col.key}
                onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                style={{
                  textAlign: col.align, padding: '8px 10px',
                  fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600,
                  color: sortKey === col.key ? 'var(--accent-ink)' : 'var(--ink-4)',
                  borderBottom: '1px solid var(--line)',
                  cursor: col.sortable ? 'pointer' : 'default', userSelect: 'none',
                }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    sortDir === 'desc' ? <ChevronDown size={11} /> : <ChevronUp size={11} />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const marginColor = row.margin == null ? 'var(--ink-4)'
              : row.margin >= 40 ? 'var(--win)'
              : row.margin >= 20 ? 'var(--warn)' : 'var(--lose)'
            const rowBg = i < 3 ? RANK_TINTS[i] : undefined
            return (
              <tr key={row.id}
                style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--line-2)' : 'none', background: rowBg }}
                onMouseOver={e => { if (!rowBg) e.currentTarget.style.background = 'var(--bg-2)' }}
                onMouseOut={e  => { if (!rowBg) e.currentTarget.style.background = 'transparent' }}>
                <td style={{ padding: '10px', textAlign: 'center', fontWeight: 700, color: 'var(--ink-4)', fontSize: 11 }}>#{i + 1}</td>
                <td style={{ padding: '10px', fontWeight: 600, color: 'var(--ink-1)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</td>
                <td style={{ padding: '10px', fontSize: 11, color: 'var(--ink-3)' }}>{row.type}</td>
                <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600 }} className="tnum">{fmtCurrency(row.revenue)}</td>
                <td style={{ padding: '10px', textAlign: 'right', color: 'var(--win)', fontWeight: 600 }} className="tnum">{row.profit != null ? fmtCurrency(row.profit) : '—'}</td>
                <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600, color: marginColor }} className="tnum">{row.margin != null ? `${row.margin}%` : '—'}</td>
                <td style={{ padding: '10px', textAlign: 'right', color: 'var(--ink-3)' }} className="tnum">{row.hours != null ? `${Math.round(row.hours)}h` : '—'}</td>
                <td style={{ padding: '10px', textAlign: 'right' }} className="tnum">{row.score != null ? row.score.toFixed(1) : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Table header helper ────────────────────────────────────────
function thStyle(align = 'left') {
  return {
    textAlign: align, padding: '8px 10px',
    fontSize: 10.5, color: 'var(--ink-4)',
    textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600,
    borderBottom: '1px solid var(--line)',
  }
}

// ── Main export ────────────────────────────────────────────────
export default function InsightsTab({ leads }) {
  const [dealScores,  setDealScores]  = useState([])
  const [employees,   setEmployees]   = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [jobTypeRange, setJobTypeRange] = useState('all')

  const wonLeads = useMemo(() => leads.filter(l => l.status === 'Won'), [leads])

  useEffect(() => {
    async function load() {
      try {
        const [dsRes, empRes, asgRes] = await Promise.allSettled([
          supabase.from('deal_scores').select('*').order('created_at', { ascending: false }),
          supabase.from('employees').select('*').eq('active', true).order('name'),
          supabase.from('project_assignments').select('*'),
        ])
        if (dsRes.status  === 'fulfilled') setDealScores(dsRes.value.data   || [])
        if (empRes.status === 'fulfilled') setEmployees(empRes.value.data   || [])
        if (asgRes.status === 'fulfilled') setAssignments(asgRes.value.data || [])
      } catch { /* silent — charts show empty states */ }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--ink-4)', fontSize: 13, padding: 60 }}>
        Loading insights…
      </div>
    )
  }

  return (
    <div style={{ padding: '0 28px 48px', animation: 'fadein 220ms ease', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* 4A: Highlight cards */}
      <HighlightCards wonLeads={wonLeads} />

      {/* 4B: Revenue by Job Type */}
      <InsightCard
        title="Revenue by Job Type"
        subtitle="Total estimated revenue per job category from completed projects"
        topRight={<TimeRangeFilter value={jobTypeRange} onChange={setJobTypeRange} />}
      >
        <RevenueByJobType wonLeads={wonLeads} timeRange={jobTypeRange} />
      </InsightCard>

      {/* 4C: Revenue by Month */}
      <InsightCard
        title="Revenue by Month"
        subtitle="Trailing 12 months — bars = revenue, line = project count"
      >
        <RevenueByMonth wonLeads={wonLeads} />
      </InsightCard>

      {/* 4D: Bid Accuracy Over Time */}
      <InsightCard
        title="Bid Accuracy Over Time"
        subtitle="Monthly breakdown of good bids, underbids, and overbids"
      >
        <BidAccuracyOverTime dealScores={dealScores} />
      </InsightCard>

      {/* 4E: Labour Hours Table */}
      <InsightCard
        title="Average Labour Hours"
        subtitle="By project type and property density — from completed projects"
      >
        <LabourHoursTable wonLeads={wonLeads} />
      </InsightCard>

      {/* 4F + 4G: Side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <InsightCard title="Top Neighborhoods" subtitle="Top 10 ZIP codes by total revenue">
          <TopZipCodes wonLeads={wonLeads} />
        </InsightCard>
        <InsightCard title="Sales Funnel" subtitle="All-time conversion rates">
          <SalesFunnel allLeads={leads} />
        </InsightCard>
      </div>

      {/* 4H: Team Performance */}
      <InsightCard title="Team Performance" subtitle="Revenue and hours per employee">
        <TeamPerformance employees={employees} assignments={assignments} wonLeads={wonLeads} />
      </InsightCard>

      {/* 4I: Project Leaderboard */}
      <InsightCard
        title="Project Leaderboard"
        subtitle="All completed projects — click column headers to sort"
      >
        <ProjectLeaderboard wonLeads={wonLeads} />
      </InsightCard>

    </div>
  )
}
