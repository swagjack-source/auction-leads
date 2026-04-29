import { useState, useEffect, useRef, useMemo } from 'react'
import {
  Download, Upload, Plus, Search, X,
  Calendar, Clock, AlertCircle, DollarSign,
  CheckCircle, TrendingUp, BarChart2, Target,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import PortfolioBuilderModal from '../components/modals/PortfolioBuilderModal'
import ProjectDrawer from '../components/modals/ProjectDrawer'
import { supabase } from '../lib/supabase'
import { calculateDeal } from '../lib/scoring'
import { useAuth } from '../lib/AuthContext'
import DealScorerModal from '../components/Pipeline/DealScorerModal'
import logger from '../lib/logger'
import ErrorBoundary from '../components/ErrorBoundary'
import InsightsTab from '../components/Projects/InsightsTab'

// ── Helpers ────────────────────────────────────────────────────
function strToHue(str = '') {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360
  return h
}

function enrichLead(lead) {
  if (lead.square_footage && lead.density && lead.item_quality_score && lead.job_type) {
    const score = calculateDeal({
      sqft:        Number(lead.square_footage),
      density:     lead.density,
      itemQuality: Number(lead.item_quality_score),
      jobType:     lead.job_type,
      zipCode:     lead.zip_code,
    })
    return { ...lead, deal_score: score.dealScore, _scoreDetails: score }
  }
  return lead
}

function getProjectStatus(lead) {
  if (lead.status === 'Won')    return 'Won'
  if (lead.status === 'Lost')   return 'Lost'
  if (lead.status === 'Project Scheduled' || lead.status === 'Project Accepted') return 'Scheduled'
  return 'Scored'
}

function exportCSV(rows) {
  const headers = ['Name','Address','Job Type','Status','Square Footage','Density','Quality','Deal Score','Rec. Bid','Notes']
  const csvRows = [headers.join(',')]
  for (const l of rows) {
    csvRows.push([
      `"${(l.name  || '').replace(/"/g, '""')}"`,
      `"${(l.address || '').replace(/"/g, '""')}"`,
      l.job_type || '', l.status || '',
      l.square_footage || '', l.density || '',
      l.item_quality_score || '',
      l.deal_score != null ? l.deal_score.toFixed(1) : '',
      l._scoreDetails?.recommendedBid || '',
      `"${(l.notes || '').replace(/"/g, '""')}"`,
    ].join(','))
  }
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `projects-export-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

function downloadCSVTemplate() {
  const csv = [
    'name,job_type,square_footage,density,item_quality_score,zip_code,address,notes',
    'Halverson Estate,Both,2100,Medium,7,60302,418 Linden Ave Oak Park IL,Estate cleanout + auction',
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob); a.download = 'projects_template.csv'; a.click()
  URL.revokeObjectURL(a.href)
}

function fmtCurrency(n) {
  if (!n) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}k`
  return `$${Math.round(n).toLocaleString()}`
}

// ── Shared UI ──────────────────────────────────────────────────
function TabBtn({ active, onClick, label, count }) {
  return (
    <button onClick={onClick} style={{
      padding: '10px 4px', border: 'none', background: 'transparent', cursor: 'pointer',
      fontSize: 13, fontWeight: 600, letterSpacing: '-0.005em',
      color: active ? 'var(--ink-1)' : 'var(--ink-3)',
      borderBottom: '2px solid ' + (active ? 'var(--accent)' : 'transparent'),
      marginBottom: -1, display: 'inline-flex', alignItems: 'center', gap: 8,
      marginRight: 18, fontFamily: 'inherit',
    }}>
      {label}
      {count != null && (
        <span style={{
          fontSize: 11, fontWeight: 600,
          color: active ? 'var(--accent-ink)' : 'var(--ink-4)',
          background: active ? 'var(--accent-soft)' : 'var(--bg-2)',
          padding: '1px 7px', borderRadius: 999,
        }}>{count}</span>
      )}
    </button>
  )
}

function FilterChip({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 11px', borderRadius: 999,
      border: `1px solid ${active ? 'var(--accent)' : 'var(--line)'}`,
      background: active ? 'var(--accent-soft)' : 'var(--panel)',
      color: active ? 'var(--accent-ink)' : 'var(--ink-2)',
      fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
    }}>{label}</button>
  )
}

// ── ActionStatCard ─────────────────────────────────────────────
function ActionStatCard({ icon: Icon, iconBg, iconColor, value, label, subtext, subtextColor, onClick, tintBg, valueColor }) {
  const [hover, setHover] = useState(false)
  const isClick = !!onClick
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: tintBg || 'var(--panel)',
        border: `1px solid ${hover && isClick ? 'var(--accent)' : 'var(--line)'}`,
        borderRadius: 12, padding: '14px 16px',
        boxShadow: hover && isClick ? 'var(--shadow-2)' : 'var(--shadow-1)',
        cursor: isClick ? 'pointer' : 'default',
        transform: hover && isClick ? 'translateY(-1px)' : 'none',
        transition: 'transform 120ms, box-shadow 120ms, border-color 120ms',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9,
          background: iconBg, color: iconColor,
          display: 'grid', placeItems: 'center', flexShrink: 0,
        }}>
          <Icon size={16} strokeWidth={1.9} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="tnum" style={{ fontSize: 26, fontWeight: 700, color: valueColor || 'var(--ink-1)', letterSpacing: '-0.03em', lineHeight: 1 }}>
            {value}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 500, marginTop: 5 }}>{label}</div>
        </div>
      </div>
      {subtext && (
        <div style={{ fontSize: 11, color: subtextColor || 'var(--ink-4)', marginTop: 8, fontWeight: subtextColor ? 600 : 400 }}>
          {subtext}
        </div>
      )}
      {isClick && (
        <div style={{ fontSize: 11, color: hover ? 'var(--accent-ink)' : 'var(--ink-4)', fontWeight: 600, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4, transition: 'color 120ms' }}>
          {hover ? 'Filter by this →' : 'Click to filter'}
        </div>
      )}
    </div>
  )
}

// ── Bid Accuracy mini card ──────────────────────────────────────
function BidAccuracyStatCard({ dealScores }) {
  const tagged = dealScores.filter(d => d.bid_tag)
  const good  = tagged.filter(d => d.bid_tag === 'Good Bid').length
  const under = tagged.filter(d => d.bid_tag === 'Underbid').length
  const over  = tagged.filter(d => d.bid_tag === 'Overbid').length
  const total = tagged.length
  const goodPct = total ? Math.round((good / total) * 100) : null

  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 16px', boxShadow: 'var(--shadow-1)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: 'color-mix(in oklab, var(--accent) 16%, var(--panel))', color: 'var(--accent)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Target size={16} strokeWidth={1.9} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="tnum" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, color: total ? 'var(--win)' : 'var(--ink-1)' }}>
            {goodPct != null ? `${goodPct}%` : '—'}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 500, marginTop: 5 }}>Bid Accuracy</div>
        </div>
      </div>
      {total > 0 ? (
        <>
          <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 10, gap: 1 }}>
            {good  > 0 && <div style={{ flex: good,  background: '#22C55E', title: `Good: ${good}` }} />}
            {under > 0 && <div style={{ flex: under, background: '#EF4444' }} />}
            {over  > 0 && <div style={{ flex: over,  background: '#F59E0B' }} />}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 6 }}>
            {good} good · {under} under · {over} over ({total} tagged)
          </div>
        </>
      ) : (
        <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 8 }}>no bids tagged yet</div>
      )}
    </div>
  )
}

// ── ProjectCard ────────────────────────────────────────────────
function ProjectCard({ lead, onOpen }) {
  const score  = lead.deal_score
  const bid    = lead._scoreDetails?.recommendedBid
  const sqft   = lead.square_footage
  const status = getProjectStatus(lead)
  const owner  = (lead.assigned_to || 'MR').slice(0, 2).toUpperCase()
  const hue    = strToHue(lead.assigned_to || 'mr')
  const source = lead.deal_score ? 'Scored' : 'Imported'

  const scoreColor = score >= 8 ? 'var(--win)' : score >= 6 ? 'var(--accent-ink)' : score >= 4 ? 'var(--warn)' : 'var(--lose)'
  const scoreBg    = score >= 8 ? 'var(--win-soft)' : score >= 6 ? 'var(--accent-soft)' : score >= 4 ? 'var(--warn-soft)' : 'var(--lose-soft)'

  const statusStyle = {
    Scored:    { fg: 'var(--ink-2)',  bg: 'var(--bg-2)'      },
    Scheduled: { fg: 'var(--warn)',   bg: 'var(--warn-soft)' },
    Won:       { fg: 'var(--win)',    bg: 'var(--win-soft)'  },
    Lost:      { fg: 'var(--lose)',   bg: 'var(--lose-soft)' },
  }[status] || { fg: 'var(--ink-2)', bg: 'var(--bg-2)' }

  const typeStyle = {
    'Clean Out': { bg: 'var(--b-cleanout-bg)', fg: 'var(--b-cleanout-fg)' },
    'Auction':   { bg: 'var(--b-auction-bg)',  fg: 'var(--b-auction-fg)'  },
    'Both':      { bg: 'var(--b-both-bg)',     fg: 'var(--b-both-fg)'     },
  }[lead.job_type] || { bg: 'var(--bg-2)', fg: 'var(--ink-2)' }

  const dateStr = lead.created_at
    ? new Date(lead.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : null

  return (
    <div onClick={() => onOpen && onOpen(lead)} style={{
      background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14,
      padding: '14px 16px', boxShadow: 'var(--shadow-1)',
      display: 'flex', flexDirection: 'column', gap: 10, cursor: 'pointer',
      transition: 'transform 120ms, box-shadow 120ms',
    }}
    onMouseOver={e  => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-2)' }}
    onMouseOut={e   => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 10.5, fontWeight: 600, background: typeStyle.bg, color: typeStyle.fg, padding: '2px 7px', borderRadius: 5 }}>{lead.job_type || 'Unknown'}</span>
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-4)' }}>#{String(lead.id).slice(0, 6)}</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10.5, fontWeight: 600, color: statusStyle.fg, background: statusStyle.bg, padding: '2px 8px', borderRadius: 999 }}>{status}</span>
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-1)', letterSpacing: '-0.01em' }}>{lead.name}</div>
        {lead.address && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, marginTop: 3, fontSize: 12, color: 'var(--ink-3)' }}>
            <span style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 1, flexShrink: 0 }}>📍</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{lead.address}</span>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid var(--line-2)', borderBottom: '1px solid var(--line-2)' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Score</div>
          {score != null ? (
            <span className="tnum" style={{ fontSize: 13, fontWeight: 600, color: scoreColor, background: scoreBg, padding: '2px 8px', borderRadius: 999, display: 'inline-block', marginTop: 3 }}>{score.toFixed(1)}/10</span>
          ) : (
            <span style={{ fontSize: 13, color: 'var(--ink-4)', marginTop: 3, display: 'block' }}>—</span>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Rec. Bid</div>
          <div className="tnum" style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em', marginTop: 1 }}>{bid ? `$${bid.toLocaleString()}` : '—'}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Size</div>
          <div className="tnum" style={{ fontSize: 12.5, fontWeight: 500, marginTop: 3 }}>{sqft ? `${Number(sqft).toLocaleString()} sqft` : '—'}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--ink-3)' }}>
        <span style={{ width: 20, height: 20, borderRadius: '50%', background: `oklch(0.72 0.08 ${hue})`, color: 'white', fontSize: 9, fontWeight: 600, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{owner}</span>
        {dateStr && <span>{dateStr}</span>}
        <span>·</span>
        <span style={{ color: source === 'Imported' ? 'var(--warn)' : 'var(--accent-ink)', fontWeight: 600 }}>{source}</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: 'var(--accent-ink)', fontWeight: 600 }}>Open →</span>
      </div>
    </div>
  )
}

// ── ProjectTable ───────────────────────────────────────────────
function ProjectTable({ rows, onOpen }) {
  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, overflowX: 'auto' }}>
      <div style={{ minWidth: 860 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '60px 1.3fr 80px 60px 70px 70px 100px 80px 80px', gap: 8, padding: '10px 14px', fontSize: 10.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, borderBottom: '1px solid var(--line)', background: 'var(--bg-2)' }}>
          <span>ID</span><span>Project</span><span>Type</span><span>Score</span><span>Sq Ft</span><span>Density</span><span>Rec. Bid</span><span>Status</span><span>Owner</span>
        </div>
        {rows.map((lead, i) => {
          const status = getProjectStatus(lead)
          const owner  = (lead.assigned_to || 'MR').slice(0, 2).toUpperCase()
          const hue    = strToHue(lead.assigned_to || 'mr')
          return (
            <div key={lead.id} onClick={() => onOpen && onOpen(lead)}
              style={{ display: 'grid', gridTemplateColumns: '60px 1.3fr 80px 60px 70px 70px 100px 80px 80px', gap: 8, padding: '11px 14px', alignItems: 'center', fontSize: 12.5, borderBottom: i < rows.length - 1 ? '1px solid var(--line-2)' : 'none', cursor: 'pointer' }}
              onMouseOver={e => e.currentTarget.style.background = 'var(--bg-2)'}
              onMouseOut={e  => e.currentTarget.style.background = 'transparent'}>
              <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>#{String(lead.id).slice(0, 6)}</span>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--ink-1)' }}>{lead.name}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{lead.address}</div>
              </div>
              <span style={{ fontSize: 11, color: 'var(--ink-2)' }}>{lead.job_type}</span>
              <span className="tnum" style={{ fontWeight: 600 }}>{lead.deal_score ? lead.deal_score.toFixed(1) : '—'}</span>
              <span className="tnum" style={{ color: 'var(--ink-2)' }}>{lead.square_footage ? Number(lead.square_footage).toLocaleString() : '—'}</span>
              <span style={{ color: 'var(--ink-3)', fontSize: 11 }}>{lead.density || '—'}</span>
              <span className="tnum" style={{ fontWeight: 600 }}>{lead._scoreDetails?.recommendedBid ? `$${lead._scoreDetails.recommendedBid.toLocaleString()}` : '—'}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)' }}>{status}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: `oklch(0.72 0.08 ${hue})`, color: 'white', fontSize: 9, fontWeight: 600, display: 'grid', placeItems: 'center' }}>{owner}</span>
                {owner}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Portfolio ──────────────────────────────────────────────────
function PortfolioCard({ lead, onOpen }) {
  const hue = strToHue(lead.assigned_to || lead.name || 'mr')
  const bid = lead._scoreDetails?.recommendedBid
  return (
    <div onClick={() => onOpen && onOpen(lead)} style={{
      background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14,
      overflow: 'hidden', cursor: 'pointer', boxShadow: 'var(--shadow-1)',
      transition: 'transform 120ms, box-shadow 120ms',
    }}
    onMouseOver={e  => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-2)' }}
    onMouseOut={e   => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-1)' }}>
      <div style={{ aspectRatio: '16/10', background: `linear-gradient(135deg, oklch(0.82 0.08 ${hue}), oklch(0.62 0.11 ${hue}))`, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6 }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, background: 'rgba(255,255,255,0.9)', color: '#2a2a2a', padding: '2px 8px', borderRadius: 5 }}>{lead.job_type}</span>
          {lead.status === 'Won' && <span style={{ fontSize: 10.5, fontWeight: 600, background: 'var(--win)', color: 'white', padding: '2px 8px', borderRadius: 5 }}>✓ Won</span>}
        </div>
        {lead.deal_score != null && (
          <div style={{ position: 'absolute', bottom: 10, right: 10, fontSize: 22, fontWeight: 700, color: 'white', textShadow: '0 1px 8px rgba(0,0,0,0.25)' }} className="tnum">{lead.deal_score.toFixed(1)}</div>
        )}
      </div>
      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>{lead.name}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{lead.address}</div>
        <div style={{ display: 'flex', gap: 12, marginTop: 10, fontSize: 11.5 }}>
          {lead.square_footage && <span style={{ color: 'var(--ink-3)' }}><span className="tnum" style={{ fontWeight: 600, color: 'var(--ink-1)' }}>{Number(lead.square_footage).toLocaleString()}</span> sqft</span>}
          {bid && <><span style={{ color: 'var(--ink-3)' }}>·</span><span style={{ color: 'var(--ink-3)' }}>Bid <span className="tnum" style={{ fontWeight: 600, color: 'var(--ink-1)' }}>${(bid / 1000).toFixed(1)}k</span></span></>}
        </div>
      </div>
    </div>
  )
}

function PortfolioView({ rows, onOpen, onBuildDeck }) {
  const { Star } = { Star: () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> }
  const portfolio = rows.filter(l => (l.deal_score || 0) >= 7 || l.status === 'Won')
  return (
    <div>
      <div style={{ background: 'color-mix(in oklab, var(--accent-soft) 50%, var(--panel))', border: '1px solid color-mix(in oklab, var(--accent) 22%, var(--line))', borderRadius: 14, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent)', color: 'white', display: 'grid', placeItems: 'center' }}>
          <Star />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.01em' }}>Portfolio view</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Share-ready gallery of your best-performing projects.</div>
        </div>
        <button onClick={onBuildDeck} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px 7px 10px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: 'white', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          <Star /> Build deck
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {portfolio.map(l => <PortfolioCard key={l.id} lead={l} onOpen={onOpen} />)}
      </div>
      {portfolio.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)', fontSize: 12.5 }}>
          No portfolio-ready projects yet. Projects with a score ≥ 7 or status "Won" will appear here.
        </div>
      )}
    </div>
  )
}

// ── CurrentProjectsTab ─────────────────────────────────────────
function CurrentProjectsTab({ rows, allLeads, onOpen, onBuildDeck }) {
  const [view,        setView]        = useState('grid')
  const [status,      setStatus]      = useState('all')
  const [sort,        setSort]        = useState('recent')
  const [query,       setQuery]       = useState('')
  const [quickFilter, setQuickFilter] = useState(null) // 'starting_soon' | 'needs_scoring'

  const now       = new Date()
  const moStart   = new Date(now.getFullYear(), now.getMonth(), 1)
  const moEnd     = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  const in7       = new Date(now.getTime() + 7 * 86400000)

  // ── Stat computations ──────────────────────────────────────
  const stats = useMemo(() => {
    const thisMonth = rows.filter(l => {
      const ref = l.project_start ? new Date(l.project_start) : new Date(l.created_at)
      return ['Project Scheduled', 'Project Accepted'].includes(l.status) && ref >= moStart && ref <= moEnd
    })
    const startingSoon = rows.filter(l => {
      if (!l.project_start) return false
      const d = new Date(l.project_start)
      return d >= now && d <= in7
    })
    const needsScoring = allLeads.filter(l =>
      l.status === 'Consult Completed' && (!l.deal_score || l.deal_score === 0),
    )
    const estRevenue = thisMonth.reduce((s, l) => s + (l._scoreDetails?.recommendedBid || 0), 0)
    return { thisMonth, startingSoon, needsScoring, estRevenue }
  }, [rows, allLeads])

  // ── Filtered + sorted list ─────────────────────────────────
  const filtered = useMemo(() => {
    let list = rows

    if (quickFilter === 'starting_soon') {
      list = list.filter(l => {
        if (!l.project_start) return false
        const d = new Date(l.project_start)
        return d >= now && d <= in7
      })
    } else if (quickFilter === 'needs_scoring') {
      list = allLeads.filter(l =>
        l.status === 'Consult Completed' && (!l.deal_score || l.deal_score === 0),
      )
    }

    if (status !== 'all') list = list.filter(l => getProjectStatus(l).toLowerCase() === status)
    if (query) {
      const q = query.toLowerCase()
      list = list.filter(l => l.name?.toLowerCase().includes(q) || l.address?.toLowerCase().includes(q))
    }
    if (sort === 'score')  list = [...list].sort((a, b) => (b.deal_score || 0)                       - (a.deal_score || 0))
    if (sort === 'value')  list = [...list].sort((a, b) => (b._scoreDetails?.recommendedBid || 0)   - (a._scoreDetails?.recommendedBid || 0))
    if (sort === 'recent') list = [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    return list
  }, [rows, allLeads, status, sort, query, quickFilter])

  function toggleQF(key) { setQuickFilter(q => q === key ? null : key) }

  const amberBg = 'color-mix(in oklab, #F59E0B 14%, var(--panel))'
  const greenBg = 'color-mix(in oklab, var(--win) 12%, var(--panel))'

  return (
    <div style={{ padding: '0 28px 28px' }}>
      {/* ── Stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16, marginTop: 16 }}>
        <ActionStatCard
          icon={Calendar}
          iconBg="color-mix(in oklab, var(--accent) 16%, var(--panel))"
          iconColor="var(--accent)"
          value={stats.thisMonth.length}
          label="Projects This Month"
          subtext="active & scheduled"
        />
        <ActionStatCard
          icon={Clock}
          iconBg={stats.startingSoon.length > 3 ? 'color-mix(in oklab, var(--warn) 20%, var(--panel))' : 'color-mix(in oklab, var(--ink-3) 14%, var(--panel))'}
          iconColor={stats.startingSoon.length > 3 ? 'var(--warn)' : 'var(--ink-3)'}
          value={stats.startingSoon.length}
          label="Starting Soon"
          subtext={stats.startingSoon.length === 0 ? 'nothing upcoming' : 'next 7 days'}
          tintBg={stats.startingSoon.length > 3 ? amberBg : undefined}
          onClick={() => toggleQF('starting_soon')}
        />
        <ActionStatCard
          icon={AlertCircle}
          iconBg={stats.needsScoring.length > 0 ? 'color-mix(in oklab, var(--warn) 20%, var(--panel))' : 'color-mix(in oklab, var(--win) 16%, var(--panel))'}
          iconColor={stats.needsScoring.length > 0 ? 'var(--warn)' : 'var(--win)'}
          value={stats.needsScoring.length}
          label="Needs Scoring"
          subtext={stats.needsScoring.length === 0 ? 'all scored ✓' : 'no deal score yet'}
          tintBg={stats.needsScoring.length > 0 ? amberBg : greenBg}
          onClick={() => toggleQF('needs_scoring')}
        />
        <ActionStatCard
          icon={DollarSign}
          iconBg="color-mix(in oklab, var(--win) 16%, var(--panel))"
          iconColor="var(--win)"
          value={fmtCurrency(stats.estRevenue)}
          label="Estimated Revenue"
          subtext="active projects this month"
        />
      </div>

      {/* Active filter chip */}
      {quickFilter && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          <button onClick={() => setQuickFilter(null)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 11px', borderRadius: 999,
            background: 'var(--accent-soft)', border: '1px solid var(--accent)',
            color: 'var(--accent-ink)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {quickFilter === 'starting_soon' ? '⏱ Starting Soon' : '⚠ Needs Scoring'}
            <X size={11} />
          </button>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 10, padding: '6px 10px', minWidth: 240 }}>
          <Search size={13} strokeWidth={1.8} color="var(--ink-4)" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search projects…" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, fontFamily: 'inherit', color: 'var(--ink-1)' }} />
          {query && <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', display: 'flex', padding: 0 }}><X size={11} /></button>}
        </div>
        <FilterChip label="All"       active={status === 'all'}       onClick={() => setStatus('all')} />
        {['scored','scheduled','won','lost'].map(s => (
          <FilterChip key={s} label={s.charAt(0).toUpperCase() + s.slice(1)} active={status === s} onClick={() => setStatus(s)} />
        ))}
        <div style={{ flex: 1 }} />
        <select value={sort} onChange={e => setSort(e.target.value)} style={{ padding: '6px 10px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--panel)', fontSize: 12, color: 'var(--ink-2)', fontFamily: 'inherit', fontWeight: 500 }}>
          <option value="recent">Sort: Most recent</option>
          <option value="score">Sort: Highest score</option>
          <option value="value">Sort: Highest value</option>
        </select>
        <div style={{ display: 'inline-flex', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 10, padding: 2 }}>
          {['grid','table','portfolio'].map(v => (
            <button key={v} onClick={() => setView(v)} style={{ padding: '4px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11.5, fontWeight: 600, background: view === v ? 'var(--accent-soft)' : 'transparent', color: view === v ? 'var(--accent-ink)' : 'var(--ink-3)', fontFamily: 'inherit' }}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {view === 'grid' && (
        filtered.length === 0
          ? <div style={{ textAlign: 'center', color: 'var(--ink-4)', fontSize: 13, marginTop: 40 }}>No projects match your filters.</div>
          : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
              {filtered.map(l => <ProjectCard key={l.id} lead={l} onOpen={onOpen} />)}
            </div>
      )}
      {view === 'table'     && <ProjectTable rows={filtered} onOpen={onOpen} />}
      {view === 'portfolio' && <PortfolioView rows={filtered} onOpen={onOpen} onBuildDeck={onBuildDeck} />}
    </div>
  )
}

// ── CompletedProjectsTab ───────────────────────────────────────
function CompletedProjectsTab({ rows, dealScores }) {
  const [query, setQuery] = useState('')
  const [sort,  setSort]  = useState('recent')

  const now     = new Date()
  const moStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lmStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lmEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

  const moName  = now.toLocaleDateString('en-US', { month: 'long' })
  const lmName  = new Date(lmStart).toLocaleDateString('en-US', { month: 'long' })

  // ── Stat computations ──────────────────────────────────────
  const stats = useMemo(() => {
    const thisMonth = rows.filter(l => new Date(l.updated_at || l.created_at) >= moStart)
    const lastMonth = rows.filter(l => {
      const d = new Date(l.updated_at || l.created_at)
      return d >= lmStart && d <= lmEnd
    })

    const revThis = thisMonth.reduce((s, l) => s + (l._scoreDetails?.recommendedBid || 0), 0)
    const revLast = lastMonth.reduce((s, l) => s + (l._scoreDetails?.recommendedBid || 0), 0)
    const revDiff = revThis - revLast

    // Avg profit margin
    const withMargin = rows.filter(l => l._scoreDetails?.profitMarginPct != null)
    const avgMargin  = withMargin.length
      ? withMargin.reduce((s, l) => s + l._scoreDetails.profitMarginPct, 0) / withMargin.length
      : null

    return { thisMonth, revThis, revLast, revDiff, withMargin, avgMargin }
  }, [rows])

  const marginColor = stats.avgMargin == null ? 'var(--ink-1)'
    : stats.avgMargin >= 40 ? 'var(--win)'
    : stats.avgMargin >= 20 ? 'var(--warn)' : 'var(--lose)'

  const revDiffStr = stats.revDiff !== 0 && stats.revLast > 0
    ? (stats.revDiff > 0 ? `+${fmtCurrency(stats.revDiff)}` : `-${fmtCurrency(Math.abs(stats.revDiff))}`) + ` vs ${lmName}`
    : moName

  function getRevenue(l) { return l._scoreDetails?.recommendedBid || 0 }
  function getProfit(l)  { return l._scoreDetails?.estimatedProfit || 0 }
  function getMargin(l)  {
    if (l._scoreDetails?.profitMarginPct != null) return l._scoreDetails.profitMarginPct
    const rev = getRevenue(l); const profit = getProfit(l)
    return rev > 0 ? Math.round((profit / rev) * 100) : null
  }

  const filtered = useMemo(() => {
    let list = rows
    if (query) {
      const q = query.toLowerCase()
      list = list.filter(l => l.name?.toLowerCase().includes(q) || l.address?.toLowerCase().includes(q))
    }
    if (sort === 'profit')  list = [...list].sort((a, b) => getProfit(b)  - getProfit(a))
    if (sort === 'revenue') list = [...list].sort((a, b) => getRevenue(b) - getRevenue(a))
    if (sort === 'margin')  list = [...list].sort((a, b) => (getMargin(b) ?? -99) - (getMargin(a) ?? -99))
    if (sort === 'recent')  list = [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    return list
  }, [rows, sort, query])

  return (
    <div style={{ padding: '0 28px 28px' }}>
      {/* ── Stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16, marginTop: 16 }}>
        <ActionStatCard
          icon={CheckCircle}
          iconBg="color-mix(in oklab, var(--win) 16%, var(--panel))"
          iconColor="var(--win)"
          value={stats.thisMonth.length}
          label="Completed This Month"
          subtext={moName}
        />
        <ActionStatCard
          icon={TrendingUp}
          iconBg="color-mix(in oklab, var(--accent) 16%, var(--panel))"
          iconColor="var(--accent)"
          value={fmtCurrency(stats.revThis)}
          label="Total Revenue"
          subtext={revDiffStr}
          subtextColor={stats.revDiff > 0 ? 'var(--win)' : stats.revDiff < 0 ? 'var(--lose)' : undefined}
        />
        <ActionStatCard
          icon={BarChart2}
          iconBg={`color-mix(in oklab, ${stats.avgMargin == null ? 'var(--ink-3)' : stats.avgMargin >= 40 ? 'var(--win)' : stats.avgMargin >= 20 ? 'var(--warn)' : 'var(--lose)'} 16%, var(--panel))`}
          iconColor={marginColor}
          value={stats.avgMargin != null ? `${Math.round(stats.avgMargin)}%` : '—'}
          valueColor={marginColor}
          label="Avg Profit Margin"
          subtext={`across ${stats.withMargin.length} project${stats.withMargin.length !== 1 ? 's' : ''}`}
        />
        <BidAccuracyStatCard dealScores={dealScores} />
      </div>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 10, padding: '6px 10px', minWidth: 240 }}>
          <Search size={13} strokeWidth={1.8} color="var(--ink-4)" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search completed…" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, fontFamily: 'inherit', color: 'var(--ink-1)' }} />
        </div>
        <div style={{ flex: 1 }} />
        <select value={sort} onChange={e => setSort(e.target.value)} style={{ padding: '6px 10px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--panel)', fontSize: 12, color: 'var(--ink-2)', fontFamily: 'inherit', fontWeight: 500 }}>
          <option value="recent">Sort: Most recent</option>
          <option value="profit">Sort: Highest profit</option>
          <option value="revenue">Sort: Highest revenue</option>
          <option value="margin">Sort: Best margin</option>
        </select>
      </div>

      {/* ── Table ── */}
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, overflowX: 'auto' }}>
        <div style={{ minWidth: 800 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 70px 110px 100px 90px 110px 70px 60px', gap: 8, padding: '10px 14px', fontSize: 10.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, borderBottom: '1px solid var(--line)', background: 'var(--bg-2)' }}>
            <span>Client</span><span>Type</span><span>Revenue (Est.)</span><span>Labor (Est.)</span><span>Royalties</span><span>Profit (Est.)</span><span>Margin</span><span>Owner</span>
          </div>
          {filtered.map((lead, i) => {
            const bid        = lead._scoreDetails?.recommendedBid || 0
            const labor      = lead._scoreDetails?.labourCost || 0
            const royalties  = Math.round(bid * 0.08)
            const profit     = lead._scoreDetails?.estimatedProfit ?? null
            const marginPct  = lead._scoreDetails?.profitMarginPct != null ? Math.round(lead._scoreDetails.profitMarginPct) : null
            const marginColor = marginPct == null ? 'var(--ink-4)' : marginPct >= 40 ? 'var(--win)' : marginPct >= 20 ? 'var(--accent-ink)' : marginPct >= 10 ? 'var(--warn)' : 'var(--lose)'
            const owner      = (lead.assigned_to || 'MR').slice(0, 2).toUpperCase()
            const hue        = strToHue(lead.assigned_to || 'mr')
            return (
              <div key={lead.id} style={{ display: 'grid', gridTemplateColumns: '1.3fr 70px 110px 100px 90px 110px 70px 60px', gap: 8, padding: '11px 14px', alignItems: 'center', fontSize: 12.5, borderBottom: i < filtered.length - 1 ? '1px solid var(--line-2)' : 'none' }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--bg-2)'}
                onMouseOut={e  => e.currentTarget.style.background = 'transparent'}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--ink-1)' }}>{lead.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{lead.address || '—'}</div>
                </div>
                <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{lead.job_type}</span>
                <span className="tnum" style={{ fontWeight: 600 }}>{bid ? `$${bid.toLocaleString()}` : '—'}</span>
                <span className="tnum" style={{ color: 'var(--ink-3)' }}>{labor ? `$${labor.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}</span>
                <span className="tnum" style={{ color: 'var(--ink-3)' }}>{royalties ? `$${royalties.toLocaleString()}` : '—'}</span>
                <span className="tnum" style={{ fontWeight: 600, color: profit != null ? 'var(--win)' : 'var(--ink-4)' }}>{profit != null ? `$${profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : 'Pending'}</span>
                <span className="tnum" style={{ fontWeight: 600, color: marginColor }}>{marginPct != null ? `${marginPct}%` : '—'}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <span style={{ width: 20, height: 20, borderRadius: '50%', background: `oklch(0.72 0.08 ${hue})`, color: 'white', fontSize: 9, fontWeight: 600, display: 'grid', placeItems: 'center' }}>{owner}</span>
                </span>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-4)', fontSize: 12.5 }}>No completed projects yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────
export default function Projects() {
  const { organizationId } = useAuth()
  const [leads,      setLeads]      = useState([])
  const [dealScores, setDealScores] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [tab,        setTab]        = useState('current')
  const [showScorer,    setShowScorer]    = useState(false)
  const [showPortfolio, setShowPortfolio] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [scorerProject,   setScorerProject]   = useState(null)
  const fileRef = useRef()

  useEffect(() => {
    const btn = document.getElementById('projects-new-btn')
    if (btn) btn.onclick = () => setShowScorer(true)
  })

  useEffect(() => { fetchLeads() }, [])

  async function fetchLeads() {
    setLoading(true); setError(null)
    try {
      const [leadsRes, scoresRes] = await Promise.all([
        supabase.from('leads').select('*').order('created_at', { ascending: false }),
        supabase.from('deal_scores').select('id, lead_id, bid_tag, created_at'),
      ])
      if (leadsRes.error) {
        logger.error('Projects fetchLeads error', leadsRes.error)
        setError('Failed to load projects. Please try again.')
      } else {
        setLeads((leadsRes.data || []).map(enrichLead))
      }
      setDealScores(scoresRes.data || [])
    } catch (e) {
      logger.error('Projects fetchLeads threw', e)
      setError('Failed to load projects. Please try again.')
    }
    setLoading(false)
  }

  async function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    let jsonRows = []
    const isXlsx = file.name.match(/\.(xlsx|xls)$/i)
    try {
      if (isXlsx) {
        const buf = await file.arrayBuffer()
        const wb  = XLSX.read(buf)
        const ws  = wb.Sheets[wb.SheetNames[0]]
        jsonRows  = XLSX.utils.sheet_to_json(ws, { defval: '' })
      } else {
        const text  = await file.text()
        const lines = text.trim().split('\n')
        if (lines.length < 2) { alert('CSV appears empty.'); return }
        const headers = lines[0].split(',').map(h => h.trim())
        for (let i = 1; i < lines.length; i++) {
          const vals = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
          const row  = {}
          headers.forEach((h, idx) => { row[h] = vals[idx] || '' })
          jsonRows.push(row)
        }
      }
    } catch (err) { alert(`Failed to read file: ${err.message}`); return }

    if (!jsonRows.length) { alert('No rows found in file.'); return }

    const norm = jsonRows.map(row => {
      const n = {}
      Object.entries(row).forEach(([k, v]) => { n[k.toLowerCase().trim().replace(/\s+/g, '_')] = v })
      return n
    })

    const rows = norm
      .filter(r => r.name || r.client_name || r.property_name || r.address)
      .map(r => ({
        name:               String(r.name || r.client_name || r.property_name || r.address || 'Untitled'),
        job_type:           r.job_type || r.type || 'Both',
        square_footage:     r.square_footage || r.sqft ? parseInt(r.square_footage || r.sqft) : null,
        density:            r.density || 'Medium',
        item_quality_score: r.item_quality_score || r.quality ? parseInt(r.item_quality_score || r.quality) : null,
        zip_code:           r.zip_code || r.zip ? String(r.zip_code || r.zip) : null,
        address:            r.address || null,
        notes:              r.notes || r.note || null,
        status:             'Won',
      }))

    if (!rows.length) {
      alert(`No importable rows found.\n\nColumns detected: ${Object.keys(jsonRows[0] || {}).join(', ')}\n\nExpected: name, client_name, property_name, or address.`)
      return
    }

    const { error } = await supabase.from('leads').insert(rows.map(r => ({ ...r, organization_id: organizationId })))
    if (error) { alert(`Import failed: ${error.message}`) }
    else { alert(`Imported ${rows.length} project${rows.length !== 1 ? 's' : ''} successfully.`); fetchLeads() }
  }

  const completedLeads = leads.filter(l => l.status === 'Won' || l.status === 'Project Completed')
  const currentLeads   = leads.filter(l => l.status !== 'Won' && l.status !== 'Project Completed')

  const headerSubtext = {
    current:   `${currentLeads.length} active · scored & scheduled`,
    completed: `${completedLeads.length} completed · with P&L estimates`,
    insights:  'Analytics from your completed project history',
  }[tab]

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
      {/* Page header */}
      <div style={{ padding: '16px 28px', borderBottom: '1px solid var(--line)', background: 'var(--panel)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink-1)', margin: 0, letterSpacing: '-0.02em' }}>Projects</h1>
          <p style={{ fontSize: 12.5, color: 'var(--ink-3)', margin: '2px 0 0' }}>{headerSubtext}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => exportCSV(tab === 'current' ? currentLeads : completedLeads)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--ink-2)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', boxShadow: 'var(--shadow-1)', fontFamily: 'inherit' }}>
            <Download size={13} strokeWidth={1.8} /> Export CSV
          </button>
          <button onClick={downloadCSVTemplate} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--ink-2)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', boxShadow: 'var(--shadow-1)', fontFamily: 'inherit' }}>
            <Download size={13} strokeWidth={1.8} /> CSV Template
          </button>
          <button onClick={() => fileRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--ink-2)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', boxShadow: 'var(--shadow-1)', fontFamily: 'inherit' }}>
            <Upload size={13} strokeWidth={1.8} /> Import CSV / XLSX
          </button>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={handleImport} />
          <button id="projects-new-btn" onClick={() => setShowScorer(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px 7px 10px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: 'white', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Plus size={13} strokeWidth={2.5} /> New Project
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '0 28px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 4, background: 'var(--panel)' }}>
        <TabBtn active={tab === 'current'}   onClick={() => setTab('current')}   label="Current"   count={currentLeads.length} />
        <TabBtn active={tab === 'completed'} onClick={() => setTab('completed')} label="Completed" count={completedLeads.length} />
        <TabBtn active={tab === 'insights'}  onClick={() => setTab('insights')}  label="Insights" />
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 28px', padding: '10px 14px', borderRadius: 9, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 13 }}>
          {error}
          <button className="btn btn-secondary" onClick={fetchLeads} style={{ marginLeft: 'auto', fontSize: 12 }}>Retry</button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--ink-4)', fontSize: 13, marginTop: 60 }}>Loading…</div>
      ) : tab === 'current' ? (
        <CurrentProjectsTab rows={currentLeads} allLeads={leads} onOpen={setSelectedProject} onBuildDeck={() => setShowPortfolio(true)} />
      ) : tab === 'completed' ? (
        <CompletedProjectsTab rows={completedLeads} dealScores={dealScores} />
      ) : (
        <InsightsTab leads={leads} />
      )}

      {(showScorer || scorerProject) && (
        <DealScorerModal
          lead={scorerProject}
          onClose={() => { setShowScorer(false); setScorerProject(null) }}
          onSaved={fetchLeads}
        />
      )}
      <PortfolioBuilderModal open={showPortfolio} onClose={() => setShowPortfolio(false)} />
      {selectedProject && (
        <ErrorBoundary inline>
          <ProjectDrawer
            project={selectedProject}
            onClose={() => setSelectedProject(null)}
            onOpenScorer={p => { setSelectedProject(null); setScorerProject(p) }}
            onProjectUpdated={fetchLeads}
            onDelete={async id => {
              await supabase.from('leads').delete().eq('id', id)
              setLeads(prev => prev.filter(l => l.id !== id))
              setSelectedProject(null)
            }}
          />
        </ErrorBoundary>
      )}
    </div>
  )
}
