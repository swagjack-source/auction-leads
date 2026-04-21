import { useState, useEffect, useRef, useMemo, useId } from 'react'
import { Download, Upload, Plus, Search, MapPin, TrendingUp, Star, X } from 'lucide-react'
import PortfolioBuilderModal from '../components/modals/PortfolioBuilderModal'
import { supabase } from '../lib/supabase'
import { calculateDeal } from '../lib/scoring'
import { useAuth } from '../lib/AuthContext'
import DealScorerModal from '../components/Pipeline/DealScorerModal'
import { MOCK_LEADS } from '../lib/mockData'

function strToHue(str = '') {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360
  return h
}

function enrichLead(lead) {
  if (lead.square_footage && lead.density && lead.item_quality_score && lead.job_type) {
    const score = calculateDeal({
      sqft: Number(lead.square_footage),
      density: lead.density,
      itemQuality: Number(lead.item_quality_score),
      jobType: lead.job_type,
      zipCode: lead.zip_code,
    })
    return { ...lead, deal_score: score.dealScore, _scoreDetails: score }
  }
  return lead
}

function getProjectStatus(lead) {
  if (lead.status === 'Won') return 'Won'
  if (lead.status === 'Lost') return 'Lost'
  if (lead.status === 'Project Scheduled' || lead.status === 'Project Accepted') return 'Scheduled'
  return 'Scored'
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

// ── Shared UI ──────────────────────────────────────────────────

function StatMini({ label, value, suffix }) {
  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 16px', boxShadow: 'var(--shadow-1)' }}>
      <div className="tnum" style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1, color: 'var(--ink-1)' }}>{value}</div>
      {suffix && <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>{suffix}</div>}
      <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 500, marginTop: 4 }}>{label}</div>
    </div>
  )
}

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
      <span style={{
        fontSize: 11, fontWeight: 600,
        color: active ? 'var(--accent-ink)' : 'var(--ink-4)',
        background: active ? 'var(--accent-soft)' : 'var(--bg-2)',
        padding: '1px 7px', borderRadius: 999,
      }}>{count}</span>
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

// ── ProjectCard ────────────────────────────────────────────────

function ProjectCard({ lead, onOpen }) {
  const score = lead.deal_score
  const bid = lead._scoreDetails?.recommendedBid
  const sqft = lead.square_footage
  const status = getProjectStatus(lead)
  const owner = (lead.assigned_to || 'MR').slice(0, 2).toUpperCase()
  const hue = strToHue(lead.assigned_to || 'mr')
  const source = lead.deal_score ? 'Scored' : 'Imported'

  const scoreColor = score >= 8 ? 'var(--win)' : score >= 6 ? 'var(--accent-ink)' : score >= 4 ? 'var(--warn)' : 'var(--lose)'
  const scoreBg    = score >= 8 ? 'var(--win-soft)' : score >= 6 ? 'var(--accent-soft)' : score >= 4 ? 'var(--warn-soft)' : 'var(--lose-soft)'

  const statusStyle = {
    Scored:    { fg: 'var(--ink-2)',  bg: 'var(--bg-2)'       },
    Scheduled: { fg: 'var(--warn)',   bg: 'var(--warn-soft)'  },
    Won:       { fg: 'var(--win)',    bg: 'var(--win-soft)'   },
    Lost:      { fg: 'var(--lose)',   bg: 'var(--lose-soft)'  },
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
    onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-2)' }}
    onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-1)' }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 10.5, fontWeight: 600, background: typeStyle.bg, color: typeStyle.fg, padding: '2px 7px', borderRadius: 5 }}>{lead.job_type || 'Unknown'}</span>
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-4)' }}>#{String(lead.id).slice(0, 6)}</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10.5, fontWeight: 600, color: statusStyle.fg, background: statusStyle.bg, padding: '2px 8px', borderRadius: 999 }}>{status}</span>
      </div>

      {/* Name + Address */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-1)', letterSpacing: '-0.01em' }}>{lead.name}</div>
        {lead.address && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, marginTop: 3, fontSize: 12, color: 'var(--ink-3)' }}>
            <MapPin size={12} strokeWidth={1.8} color="var(--ink-4)" style={{ marginTop: 1, flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{lead.address}</span>
          </div>
        )}
      </div>

      {/* Score / Bid / Size */}
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

      {/* Footer */}
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
          const owner = (lead.assigned_to || 'MR').slice(0, 2).toUpperCase()
          const hue = strToHue(lead.assigned_to || 'mr')
          return (
            <div key={lead.id} onClick={() => onOpen && onOpen(lead)}
              style={{ display: 'grid', gridTemplateColumns: '60px 1.3fr 80px 60px 70px 70px 100px 80px 80px', gap: 8, padding: '11px 14px', alignItems: 'center', fontSize: 12.5, borderBottom: i < rows.length - 1 ? '1px solid var(--line-2)' : 'none', cursor: 'pointer' }}
              onMouseOver={e => e.currentTarget.style.background = 'var(--bg-2)'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
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
    onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-2)' }}
    onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-1)' }}>
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
  const portfolio = rows.filter(l => (l.deal_score || 0) >= 7 || l.status === 'Won')
  return (
    <div>
      <div style={{ background: 'color-mix(in oklab, var(--accent-soft) 50%, var(--panel))', border: '1px solid color-mix(in oklab, var(--accent) 22%, var(--line))', borderRadius: 14, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent)', color: 'white', display: 'grid', placeItems: 'center' }}>
          <Star size={17} strokeWidth={1.9} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.01em' }}>Portfolio view</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Share-ready gallery of your best-performing projects.</div>
        </div>
        <button onClick={onBuildDeck} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px 7px 10px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: 'white', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          <Star size={13} strokeWidth={1.9} /> Build deck
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

function CurrentProjectsTab({ rows, onOpen, onBuildDeck }) {
  const [view, setView] = useState('grid')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('recent')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    let list = rows
    if (status !== 'all') list = list.filter(l => getProjectStatus(l).toLowerCase() === status)
    if (query) {
      const q = query.toLowerCase()
      list = list.filter(l => l.name?.toLowerCase().includes(q) || l.address?.toLowerCase().includes(q))
    }
    if (sort === 'score')  list = [...list].sort((a, b) => (b.deal_score || 0) - (a.deal_score || 0))
    if (sort === 'value')  list = [...list].sort((a, b) => (b._scoreDetails?.recommendedBid || 0) - (a._scoreDetails?.recommendedBid || 0))
    if (sort === 'recent') list = [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    return list
  }, [rows, status, sort, query])

  const totalValue = filtered.reduce((s, l) => s + (l._scoreDetails?.recommendedBid || 0), 0)
  const scored = filtered.filter(l => l.deal_score)
  const avgScore = scored.length ? scored.reduce((s, l) => s + l.deal_score, 0) / scored.length : null
  const wonCount = filtered.filter(l => l.status === 'Won').length

  return (
    <div style={{ padding: '0 28px 28px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <StatMini label="Total Projects" value={filtered.length} suffix={filtered.length !== rows.length ? `of ${rows.length}` : ''} />
        <StatMini label="Won" value={wonCount} suffix="closed" />
        <StatMini label="Avg Deal Score" value={avgScore != null ? avgScore.toFixed(1) : '—'} suffix="out of 10" />
        <StatMini label="Pipeline Value" value={totalValue > 0 ? `$${(totalValue / 1000).toFixed(0)}k` : '—'} suffix="estimated" />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 10, padding: '6px 10px', minWidth: 240 }}>
          <Search size={13} strokeWidth={1.8} color="var(--ink-4)" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search projects…" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, fontFamily: 'inherit', color: 'var(--ink-1)' }} />
          {query && <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', display: 'flex', padding: 0 }}><X size={11} /></button>}
        </div>
        <FilterChip label="All" active={status === 'all'} onClick={() => setStatus('all')} />
        {['scored', 'scheduled', 'won', 'lost'].map(s => (
          <FilterChip key={s} label={s.charAt(0).toUpperCase() + s.slice(1)} active={status === s} onClick={() => setStatus(s)} />
        ))}
        <div style={{ flex: 1 }} />
        <select value={sort} onChange={e => setSort(e.target.value)} style={{ padding: '6px 10px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--panel)', fontSize: 12, color: 'var(--ink-2)', fontFamily: 'inherit', fontWeight: 500 }}>
          <option value="recent">Sort: Most recent</option>
          <option value="score">Sort: Highest score</option>
          <option value="value">Sort: Highest value</option>
        </select>
        <div style={{ display: 'inline-flex', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 10, padding: 2 }}>
          {['grid', 'table', 'portfolio'].map(v => (
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
      {view === 'table' && <ProjectTable rows={filtered} onOpen={onOpen} />}
      {view === 'portfolio' && <PortfolioView rows={filtered} onOpen={onOpen} onBuildDeck={onBuildDeck} />}
    </div>
  )
}

// ── HighlightCard ──────────────────────────────────────────────

function HighlightCard({ label, client, period, amount, margin, positive }) {
  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, padding: '14px 16px', boxShadow: 'var(--shadow-1)', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: positive ? 'var(--win-soft)' : 'var(--warn-soft)', color: positive ? 'var(--win)' : 'var(--warn)', display: 'grid', placeItems: 'center' }}>
        <TrendingUp size={20} strokeWidth={2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10.5, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-1)', marginTop: 2, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client}</div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{period}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div className="tnum" style={{ fontSize: 16, fontWeight: 600, color: positive ? 'var(--win)' : 'var(--warn)', letterSpacing: '-0.015em' }}>{amount}</div>
        <div className="tnum" style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{margin}</div>
      </div>
    </div>
  )
}

// ── CompletedProjectsTab ───────────────────────────────────────

function CompletedProjectsTab({ rows }) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('recent')

  const filtered = useMemo(() => {
    let list = rows
    if (query) {
      const q = query.toLowerCase()
      list = list.filter(l => l.name?.toLowerCase().includes(q) || l.address?.toLowerCase().includes(q))
    }
    if (sort === 'profit')  list = [...list].sort((a, b) => (b._scoreDetails?.estimatedProfit || 0) - (a._scoreDetails?.estimatedProfit || 0))
    if (sort === 'revenue') list = [...list].sort((a, b) => (b._scoreDetails?.recommendedBid || 0) - (a._scoreDetails?.recommendedBid || 0))
    if (sort === 'margin')  list = [...list].sort((a, b) => (b._scoreDetails?.profitMarginPct || 0) - (a._scoreDetails?.profitMarginPct || 0))
    if (sort === 'recent')  list = [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    return list
  }, [rows, sort, query])

  const totalRev = filtered.reduce((s, l) => s + (l._scoreDetails?.recommendedBid || 0), 0)
  const totalProfit = filtered.reduce((s, l) => s + (l._scoreDetails?.estimatedProfit || 0), 0)
  const withMargin = filtered.filter(l => l._scoreDetails?.profitMarginPct != null)
  const avgMargin = withMargin.length
    ? (withMargin.reduce((s, l) => s + (l._scoreDetails?.profitMarginPct || 0), 0) / withMargin.length).toFixed(0)
    : null

  const withProfit = filtered.filter(l => l._scoreDetails?.estimatedProfit)
  const best  = withProfit.length ? [...withProfit].sort((a, b) => (b._scoreDetails?.estimatedProfit || 0) - (a._scoreDetails?.estimatedProfit || 0))[0] : null
  const worst = withProfit.length ? [...withProfit].sort((a, b) => (a._scoreDetails?.profitMarginPct || 0) - (b._scoreDetails?.profitMarginPct || 0))[0] : null

  return (
    <div style={{ padding: '0 28px 28px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <StatMini label="Completed" value={rows.length} suffix="projects" />
        <StatMini label="Total Revenue (Est.)" value={totalRev > 0 ? `$${(totalRev / 1000).toFixed(1)}k` : '—'} suffix="all completed" />
        <StatMini label="Total Profit (Est.)" value={totalProfit > 0 ? `$${(totalProfit / 1000).toFixed(1)}k` : '—'} suffix={`${filtered.length} projects`} />
        <StatMini label="Avg Margin (Est.)" value={avgMargin != null ? `${avgMargin}%` : '—'} suffix="net estimated" />
      </div>

      {best && worst && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <HighlightCard
            label="Best Performer" client={best.name} period={best.address || '—'}
            amount={`+$${(best._scoreDetails?.estimatedProfit || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            margin={`${Math.round(best._scoreDetails?.profitMarginPct || 0)}% margin`}
            positive
          />
          <HighlightCard
            label="Lowest Margin" client={worst.name} period={worst.address || '—'}
            amount={`+$${(worst._scoreDetails?.estimatedProfit || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            margin={`${Math.round(worst._scoreDetails?.profitMarginPct || 0)}% margin`}
          />
        </div>
      )}

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

      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, overflowX: 'auto' }}>
        <div style={{ minWidth: 800 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 70px 110px 100px 90px 110px 70px 60px', gap: 8, padding: '10px 14px', fontSize: 10.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, borderBottom: '1px solid var(--line)', background: 'var(--bg-2)' }}>
            <span>Client</span><span>Type</span><span>Revenue (Est.)</span><span>Labor (Est.)</span><span>Royalties</span><span>Profit (Est.)</span><span>Margin</span><span>Owner</span>
          </div>
          {filtered.map((lead, i) => {
            const bid = lead._scoreDetails?.recommendedBid || 0
            const labor = lead._scoreDetails?.labourCost || 0
            const royalties = Math.round(bid * 0.08)
            const profit = lead._scoreDetails?.estimatedProfit ?? null
            const marginPct = lead._scoreDetails?.profitMarginPct != null ? Math.round(lead._scoreDetails.profitMarginPct) : null
            const marginColor = marginPct == null ? 'var(--ink-4)'
              : marginPct >= 40 ? 'var(--win)'
              : marginPct >= 20 ? 'var(--accent-ink)'
              : marginPct >= 10 ? 'var(--warn)' : 'var(--lose)'
            const owner = (lead.assigned_to || 'MR').slice(0, 2).toUpperCase()
            const hue = strToHue(lead.assigned_to || 'mr')
            return (
              <div key={lead.id} style={{ display: 'grid', gridTemplateColumns: '1.3fr 70px 110px 100px 90px 110px 70px 60px', gap: 8, padding: '11px 14px', alignItems: 'center', fontSize: 12.5, borderBottom: i < filtered.length - 1 ? '1px solid var(--line-2)' : 'none' }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--bg-2)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--ink-1)' }}>{lead.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{lead.address || '—'}</div>
                </div>
                <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{lead.job_type}</span>
                <span className="tnum" style={{ fontWeight: 600 }}>{bid ? `$${bid.toLocaleString()}` : '—'}</span>
                <span className="tnum" style={{ color: 'var(--ink-3)' }}>{labor ? `$${labor.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}</span>
                <span className="tnum" style={{ color: 'var(--ink-3)' }}>{royalties ? `$${royalties.toLocaleString()}` : '—'}</span>
                <span className="tnum" style={{ fontWeight: 600, color: profit != null ? 'var(--win)' : 'var(--ink-4)' }}>
                  {profit != null ? `$${profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : 'Pending'}
                </span>
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
  const [leads, setLeads] = useState(() => MOCK_LEADS.map(enrichLead))
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('current')
  const [showScorer, setShowScorer] = useState(false)
  const [showPortfolio, setShowPortfolio] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    const btn = document.getElementById('projects-new-btn')
    if (btn) btn.onclick = () => setShowScorer(true)
  })

  useEffect(() => { fetchLeads() }, [])

  async function fetchLeads() {
    setLoading(true)
    try {
      const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false })
      const result = data && data.length > 0 ? data : MOCK_LEADS
      setLeads(result.map(enrichLead))
    } catch {
      setLeads(MOCK_LEADS.map(enrichLead))
    }
    setLoading(false)
  }

  async function handleCSVImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const text = await file.text()
    const lines = text.trim().split('\n')
    if (lines.length < 2) return
    const headers = lines[0].split(',').map(h => h.trim())
    const rows = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      const row = {}
      headers.forEach((h, idx) => { row[h] = values[idx] || '' })
      if (row.name) rows.push({
        name: row.name, job_type: row.job_type || 'Both',
        square_footage: row.square_footage ? parseInt(row.square_footage) : null,
        density: row.density || 'Medium',
        item_quality_score: row.item_quality_score ? parseInt(row.item_quality_score) : null,
        zip_code: row.zip_code || null, address: row.address || null,
        notes: row.notes || null, status: 'Project Completed',
      })
    }
    if (rows.length > 0) {
      await supabase.from('leads').insert(rows.map(r => ({ ...r, organization_id: organizationId })))
      fetchLeads()
    }
  }

  const currentLeads = leads.filter(l => l.status !== 'Project Completed')
  const completedLeads = leads.filter(l => l.status === 'Project Completed')

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
      {/* Page header */}
      <div style={{ padding: '16px 28px', borderBottom: '1px solid var(--line)', background: 'var(--panel)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink-1)', margin: 0, letterSpacing: '-0.02em' }}>Projects</h1>
          <p style={{ fontSize: 12.5, color: 'var(--ink-3)', margin: '2px 0 0' }}>
            {tab === 'current'
              ? `${currentLeads.length} active · scored & scheduled`
              : `${completedLeads.length} completed · with P&L estimates`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={downloadCSVTemplate} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--ink-2)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', boxShadow: 'var(--shadow-1)', fontFamily: 'inherit' }}>
            <Download size={13} strokeWidth={1.8} /> CSV Template
          </button>
          <button onClick={() => fileRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--ink-2)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', boxShadow: 'var(--shadow-1)', fontFamily: 'inherit' }}>
            <Upload size={13} strokeWidth={1.8} /> Import CSV
          </button>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCSVImport} />
          <button id="projects-new-btn" onClick={() => setShowScorer(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px 7px 10px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: 'white', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Plus size={13} strokeWidth={2.5} /> New Project
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '0 28px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 4, background: 'var(--panel)' }}>
        <TabBtn active={tab === 'current'}   onClick={() => setTab('current')}   label="Current"   count={currentLeads.length} />
        <TabBtn active={tab === 'completed'} onClick={() => setTab('completed')} label="Completed" count={completedLeads.length} />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--ink-4)', fontSize: 13, marginTop: 60 }}>Loading…</div>
      ) : tab === 'current' ? (
        <CurrentProjectsTab rows={currentLeads} onOpen={() => {}} onBuildDeck={() => setShowPortfolio(true)} />
      ) : (
        <CompletedProjectsTab rows={completedLeads} />
      )}

      {showScorer && <DealScorerModal onClose={() => setShowScorer(false)} onSaved={fetchLeads} />}
      <PortfolioBuilderModal open={showPortfolio} onClose={() => setShowPortfolio(false)} />
    </div>
  )
}
