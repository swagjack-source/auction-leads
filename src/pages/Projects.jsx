import { useState, useEffect, useRef } from 'react'
import { Download, Upload, Plus, Search, ArrowUpDown, Grid3X3, List, MapPin, ExternalLink, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { calculateDeal } from '../lib/scoring'
import { useAuth } from '../lib/AuthContext'
import DealScorerModal from '../components/Pipeline/DealScorerModal'
import { MOCK_LEADS } from '../lib/mockData'

const JOB_FILTERS  = ['All', 'Clean Out', 'Auction', 'Both']
const STATUS_FILTERS = ['All', 'Scored', 'Scheduled', 'Won', 'Lost']

const TYPE_BADGE = {
  'Clean Out': { bg: 'var(--b-cleanout-bg)', fg: 'var(--b-cleanout-fg)' },
  'Auction':   { bg: 'var(--b-auction-bg)',  fg: 'var(--b-auction-fg)'  },
  'Both':      { bg: 'var(--b-both-bg)',     fg: 'var(--b-both-fg)'     },
}

const STATUS_BADGE = {
  'Won':       { bg: '#D1FAE5', fg: '#065F46' },
  'Lost':      { bg: '#FEE2E2', fg: '#991B1B' },
  'Scheduled': { bg: '#FEF3C7', fg: '#92400E' },
  'Scored':    { bg: '#EFF6FF', fg: '#1E40AF' },
  'Imported':  { bg: '#F3F4F6', fg: '#374151' },
}

function getProjectStatus(lead) {
  if (lead.status === 'Won') return 'Won'
  if (lead.status === 'Lost') return 'Lost'
  if (lead.status === 'Project Scheduled' || lead.status === 'Backlog') return 'Scheduled'
  if (lead.deal_score) return 'Scored'
  return 'Imported'
}

function getProjectName(lead) {
  const name = lead.name || ''
  if (name.startsWith('Estate of ')) return name.replace('Estate of ', '') + ' Estate'
  if (name.toLowerCase().includes('estate')) return name
  const parts = name.split(' ')
  const lastName = parts[parts.length - 1]
  if (lead.job_type === 'Auction') return `${lastName} Auction`
  if (lead.job_type === 'Clean Out') return `${lastName} Clean Out`
  return `${lastName} ${lead.job_type === 'Both' ? 'Both' : 'Estate'}`
}

function scoreColor(score) {
  if (score >= 8) return '#2F7A55'
  if (score >= 5) return '#C28A2A'
  return '#A14646'
}

function ProjectCard({ lead, index, onOpen }) {
  const [hover, setHover] = useState(false)
  const projectId = `#P${2828 + index}`
  const status = getProjectStatus(lead)
  const name = getProjectName(lead)
  const typeBadge = TYPE_BADGE[lead.job_type] || { bg: '#F3F4F6', fg: '#374151' }
  const statusBadge = STATUS_BADGE[status] || STATUS_BADGE['Imported']
  const score = lead.deal_score
  const bid = lead._scoreDetails?.recommendedBid
  const sqft = lead.square_footage

  const dateStr = lead.created_at
    ? new Date(lead.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric' })
    : null

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: 'var(--panel)',
        border: `1px solid ${hover ? 'var(--accent)' : 'var(--line)'}`,
        borderRadius: 14,
        padding: '16px',
        boxShadow: hover ? 'var(--shadow-2)' : 'var(--shadow-1)',
        transition: 'border-color 140ms, box-shadow 140ms',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
          background: typeBadge.bg, color: typeBadge.fg,
        }}>{lead.job_type || 'Unknown'}</span>
        <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'monospace' }}>{projectId}</span>
        <div style={{ flex: 1 }} />
        <span style={{
          fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
          background: statusBadge.bg, color: statusBadge.fg,
        }}>{status}</span>
      </div>

      {/* Name */}
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-1)', letterSpacing: '-0.015em', lineHeight: 1.2 }}>
        {name}
      </div>

      {/* Address */}
      {lead.address && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--ink-3)', fontSize: 12 }}>
          <MapPin size={11} strokeWidth={1.8} style={{ flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.address}</span>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Score</div>
          <div className="tnum" style={{ fontSize: 13.5, fontWeight: 700, color: score ? scoreColor(score) : 'var(--ink-4)', marginTop: 2 }}>
            {score ? `${score.toFixed(1)}/10` : '—'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Rec. Bid</div>
          <div className="tnum" style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-1)', marginTop: 2 }}>
            {bid ? `$${bid.toLocaleString()}` : '—'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Size</div>
          <div className="tnum" style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-1)', marginTop: 2 }}>
            {sqft ? `${Number(sqft).toLocaleString()} sqft` : '—'}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 8, borderTop: '1px solid var(--line-2)', marginTop: 2,
      }}>
        <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>
          {dateStr && <span>{dateStr} · </span>}
          <span style={{ color: statusBadge.fg, fontWeight: 600 }}>{status}</span>
        </div>
        <button
          onClick={() => onOpen(lead)}
          style={{
            fontSize: 12, fontWeight: 600, color: 'var(--accent)',
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4, padding: 0,
          }}
        >
          Open <ExternalLink size={11} strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}

function StatBox({ label, value, sub }) {
  return (
    <div style={{
      background: 'var(--panel)', border: '1px solid var(--line)',
      borderRadius: 12, padding: '14px 18px', flex: 1,
      boxShadow: 'var(--shadow-1)',
    }}>
      <div className="tnum" style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink-1)', letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 3 }}>{sub}</div>}
      <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 500, marginTop: 4 }}>{label}</div>
    </div>
  )
}

function downloadCSVTemplate() {
  const csv = [
    'name,job_type,square_footage,density,item_quality_score,zip_code,address,notes',
    'Halverson Estate,Both,2100,Medium,7,60302,418 Linden Ave Oak Park IL,Estate cleanout + auction',
    'Johnson Clean Out,Clean Out,1800,High,,60614,2200 N Lincoln Ave Chicago IL,',
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'projects_template.csv'; a.click()
  URL.revokeObjectURL(url)
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

export default function Projects() {
  const { organizationId } = useAuth()
  const [leads, setLeads]             = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [typeFilter, setTypeFilter]   = useState('All')
  const [showScorer, setShowScorer]   = useState(false)
  const [openLead, setOpenLead]       = useState(null)
  const fileRef                       = useRef()

  useEffect(() => { fetchLeads() }, [])

  async function fetchLeads() {
    setLoading(true)
    try {
      const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false })
      const leads = data && data.length > 0 ? data : MOCK_LEADS
      setLeads(leads.map(enrichLead))
    } catch (e) {
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
        notes: row.notes || null, status: 'New Lead',
      })
    }
    if (rows.length > 0) {
      await supabase.from('leads').insert(rows.map(r => ({ ...r, organization_id: organizationId })))
      fetchLeads()
    }
  }

  const filtered = leads.filter(l => {
    const status = getProjectStatus(l)
    if (statusFilter !== 'All' && status !== statusFilter) return false
    if (typeFilter !== 'All' && l.job_type !== typeFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!l.name?.toLowerCase().includes(q) && !l.address?.toLowerCase().includes(q)) return false
    }
    return true
  })

  const wonCount   = leads.filter(l => l.status === 'Won').length
  const scored     = leads.filter(l => l.deal_score)
  const avgScore   = scored.length ? scored.reduce((s, l) => s + l.deal_score, 0) / scored.length : null
  const pipeValue  = leads.filter(l => l._scoreDetails?.recommendedBid)
                          .reduce((s, l) => s + l._scoreDetails.recommendedBid, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Page header */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--line)',
        background: 'var(--panel)',
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink-1)', margin: 0, letterSpacing: '-0.02em' }}>Projects</h1>
          <p style={{ fontSize: 12.5, color: 'var(--ink-3)', margin: '2px 0 0' }}>
            {leads.length} project{leads.length !== 1 ? 's' : ''} · Scored &amp; imported deals
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={downloadCSVTemplate}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--ink-2)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', boxShadow: 'var(--shadow-1)' }}
          >
            <Download size={13} strokeWidth={1.8} /> CSV Template
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--ink-2)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', boxShadow: 'var(--shadow-1)' }}
          >
            <Upload size={13} strokeWidth={1.8} /> Import CSV
          </button>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCSVImport} />
          <button
            id="projects-new-btn"
            onClick={() => setShowScorer(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px 7px 10px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: 'white', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 2px rgba(43,68,104,0.3)' }}
          >
            <Plus size={13} strokeWidth={2.5} /> New Project
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{
        padding: '12px 24px',
        borderBottom: '1px solid var(--line)',
        flexShrink: 0,
        display: 'flex', gap: 12,
      }}>
        <StatBox label="Total Projects"   value={leads.length}  sub="" />
        <StatBox label="Won"              value={wonCount}       sub="closed" />
        <StatBox label="Avg Deal Score"   value={avgScore != null ? `${avgScore.toFixed(1)}/10` : '—'} sub="" />
        <StatBox label="Pipeline Value"   value={pipeValue > 0 ? `$${Math.round(pipeValue / 1000)}k` : '—'} sub="estimated" />
      </div>

      {/* Filter bar */}
      <div style={{
        padding: '10px 24px',
        borderBottom: '1px solid var(--line)',
        flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        background: 'var(--panel)',
      }}>
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 9, padding: '6px 10px', minWidth: 180 }}>
          <Search size={13} color="var(--ink-4)" strokeWidth={1.8} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search projects…"
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: 'var(--ink-1)', fontFamily: 'inherit', width: 150 }}
          />
          {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', display: 'flex', padding: 0 }}><X size={11} /></button>}
        </div>

        {/* Status filters */}
        <div style={{ display: 'inline-flex', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 10, padding: 2, boxShadow: 'var(--shadow-1)' }}>
          {STATUS_FILTERS.map(f => (
            <button key={f} onClick={() => setStatusFilter(f)} style={{
              padding: '5px 11px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
              background: statusFilter === f ? 'var(--accent-soft)' : 'transparent',
              color: statusFilter === f ? 'var(--accent-ink)' : 'var(--ink-3)',
            }}>{f}</button>
          ))}
        </div>

        {/* Type filters */}
        <div style={{ display: 'inline-flex', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 10, padding: 2, boxShadow: 'var(--shadow-1)' }}>
          {JOB_FILTERS.map(f => (
            <button key={f} onClick={() => setTypeFilter(f)} style={{
              padding: '5px 11px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
              background: typeFilter === f ? 'var(--accent-soft)' : 'transparent',
              color: typeFilter === f ? 'var(--accent-ink)' : 'var(--ink-3)',
            }}>{f}</button>
          ))}
        </div>

        <div style={{ flex: 1 }} />
        <button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--panel)', fontSize: 12, fontWeight: 500, cursor: 'pointer', color: 'var(--ink-2)', boxShadow: 'var(--shadow-1)', fontFamily: 'inherit' }}>
          <ArrowUpDown size={12} strokeWidth={1.8} /> Sort: Most recent
        </button>
        <div style={{ display: 'inline-flex', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 9, padding: 2, boxShadow: 'var(--shadow-1)' }}>
          <button style={{ padding: '5px 9px', borderRadius: 7, border: 'none', cursor: 'pointer', background: 'var(--accent-soft)', color: 'var(--accent-ink)', display: 'flex', alignItems: 'center' }}>
            <Grid3X3 size={13} strokeWidth={1.8} />
          </button>
          <button style={{ padding: '5px 9px', borderRadius: 7, border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--ink-3)', display: 'flex', alignItems: 'center' }}>
            <List size={13} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--ink-4)', fontSize: 13, marginTop: 60 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--ink-4)', fontSize: 13, marginTop: 60 }}>
            {leads.length === 0 ? 'No projects yet. Import a CSV or create a new project.' : 'No projects match your filters.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, maxWidth: 1400 }}>
            {filtered.map((lead, i) => (
              <ProjectCard
                key={lead.id}
                lead={lead}
                index={leads.indexOf(lead)}
                onOpen={setOpenLead}
              />
            ))}
          </div>
        )}
      </div>

      {showScorer && (
        <DealScorerModal onClose={() => setShowScorer(false)} onSaved={fetchLeads} />
      )}

      {openLead && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setOpenLead(null)}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 16, padding: '24px', maxWidth: 480, width: '100%', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-1)', marginBottom: 8 }}>{getProjectName(openLead)}</div>
            {openLead.address && <div style={{ color: 'var(--ink-3)', fontSize: 13, marginBottom: 16 }}>{openLead.address}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[
                ['Deal Score', openLead.deal_score ? `${openLead.deal_score.toFixed(1)}/10` : '—'],
                ['Rec. Bid', openLead._scoreDetails?.recommendedBid ? `$${openLead._scoreDetails.recommendedBid.toLocaleString()}` : '—'],
                ['Square Footage', openLead.square_footage ? `${openLead.square_footage.toLocaleString()} sqft` : '—'],
                ['Job Type', openLead.job_type || '—'],
              ].map(([label, value]) => (
                <div key={label} style={{ background: 'var(--bg)', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ fontSize: 10.5, color: 'var(--ink-4)' }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-1)', marginTop: 2 }}>{value}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setOpenLead(null)} style={{ width: '100%', padding: '9px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--panel)', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
