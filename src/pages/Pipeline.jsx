import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Search, X, Bell, CalendarDays, Send, TrendingUp, ArrowUpDown, ChevronDown, Upload, MapPin, ExternalLink } from 'lucide-react'
import * as XLSX from 'xlsx'
import StageColumn, { STAGE_META } from '../components/Pipeline/StageColumn'
import LeadCard from '../components/Pipeline/LeadCard'
import LeadModal from '../components/Pipeline/LeadModal'
import LeadDrawer from '../components/Pipeline/LeadDrawer'
import StageTransitionModal, { needsTransitionPrompt } from '../components/Pipeline/StageTransitionModal'
import NewLeadModal from '../components/Pipeline/NewLeadModal'
import ErrorBoundary from '../components/ErrorBoundary'
import { ACTIVE_STAGES, OUTCOME_STAGES } from '../lib/constants'
import { supabase } from '../lib/supabase'
import PipelineListView from '../components/Pipeline/PipelineListView'
import PipelineCalendarView from '../components/Pipeline/PipelineCalendarView'
import PipelineMapView from '../components/Pipeline/PipelineMapView'
import { calculateDeal } from '../lib/scoring'
import { useTeam } from '../lib/TeamContext'
import { useAuth } from '../lib/AuthContext'
import logger from '../lib/logger'
import { MOCK_LEADS } from '../lib/mockData'

const JOB_FILTERS = ['All', 'Clean Out', 'Auction', 'Both']

const OUTCOME_FILTERS = [
  { key: 'Won',     label: 'Won',     color: 'var(--win)',  soft: 'var(--win-soft)'  },
  { key: 'Lost',    label: 'Lost',    color: 'var(--lose)', soft: 'var(--lose-soft)' },
  { key: 'Backlog', label: 'Backlog', color: 'var(--ink-3)',soft: 'var(--hover)'     },
]

function BoardHeader({ jobFilter, setJobFilter, outcomeFilter, setOutcomeFilter, view, setView, onImport, fileRef, selectedMember, setSelectedMember, sortBy, setSortBy, search, setSearch }) {
  const { members } = useTeam()
  const [showSort, setShowSort] = useState(false)
  const sortRef = useRef(null)

  useEffect(() => {
    if (!showSort) return
    function handle(e) { if (sortRef.current && !sortRef.current.contains(e.target)) setShowSort(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [showSort])

  const SORT_OPTIONS = [
    { key: 'date_desc', label: 'Newest first' },
    { key: 'date_asc',  label: 'Oldest first' },
    { key: 'score',     label: 'Deal score ↓' },
    { key: 'value',     label: 'Est. value ↓' },
    { key: 'name',      label: 'Name A–Z' },
  ]

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 20px 10px',
      background: 'var(--panel)',
      borderBottom: '1px solid var(--line)',
      flexShrink: 0,
      flexWrap: 'wrap',
    }}>
      {/* Search */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)', pointerEvents: 'none' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search leads…"
          style={{ paddingLeft: 28, paddingRight: search ? 26 : 10, paddingTop: 6, paddingBottom: 6, fontSize: 12.5, border: '1px solid var(--line)', borderRadius: 10, background: 'var(--bg)', color: 'var(--ink-1)', outline: 'none', fontFamily: 'inherit', width: 180 }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', padding: 0, display: 'flex' }}>
            <X size={12} />
          </button>
        )}
      </div>

      <div style={{ width: 1, height: 18, background: 'var(--line)' }} />

      {/* View switcher */}
      <div style={{
        display: 'inline-flex',
        background: 'var(--panel)', border: '1px solid var(--line)',
        borderRadius: 10, padding: 2, boxShadow: 'var(--shadow-1)',
      }}>
        {['Board', 'List', 'Calendar', 'Map'].map(v => (
          <button key={v} onClick={() => setView(v.toLowerCase())} style={{
            padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 600,
            background: view === v.toLowerCase() ? 'var(--accent-soft)' : 'transparent',
            color: view === v.toLowerCase() ? 'var(--accent-ink)' : 'var(--ink-3)',
            fontFamily: 'inherit',
          }}>{v}</button>
        ))}
      </div>

      <div style={{ width: 1, height: 18, background: 'var(--line)' }} />

      {/* Job type filters */}
      <div style={{ display: 'flex', gap: 5 }}>
        {JOB_FILTERS.map(f => (
          <button key={f} onClick={() => setJobFilter(f)} style={{
            padding: '5px 11px', borderRadius: 999,
            border: '1px solid ' + (jobFilter === f ? '#C8CFD8' : 'var(--line)'),
            background: jobFilter === f ? 'var(--accent-soft)' : 'var(--panel)',
            color: jobFilter === f ? 'var(--accent-ink)' : 'var(--ink-2)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>{f}</button>
        ))}
      </div>

      <div style={{ width: 1, height: 18, background: 'var(--line)' }} />

      {/* Outcome filters */}
      <div style={{ display: 'flex', gap: 5 }}>
        {OUTCOME_FILTERS.map(({ key, label, color, soft }) => {
          const active = outcomeFilter === key
          return (
            <button key={key} onClick={() => setOutcomeFilter(active ? null : key)} style={{
              padding: '5px 11px', borderRadius: 999,
              border: `1px solid ${active ? color : 'var(--line)'}`,
              background: active ? soft : 'var(--panel)',
              color: active ? color : 'var(--ink-2)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
              {label}
            </button>
          )
        })}
      </div>

      <div style={{ flex: 1 }} />

      {/* Sort dropdown */}
      <div style={{ position: 'relative' }} ref={sortRef}>
        <button onClick={() => setShowSort(s => !s)} style={{ ...ctrlBtn, background: sortBy !== 'date_desc' ? 'var(--accent-soft)' : 'var(--panel)', color: sortBy !== 'date_desc' ? 'var(--accent-ink)' : 'var(--ink-2)' }}>
          <ArrowUpDown size={13} strokeWidth={1.8} /> Sort <ChevronDown size={11} strokeWidth={1.8} />
        </button>
        {showSort && (
          <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 200, background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', minWidth: 160, overflow: 'hidden' }}>
            {SORT_OPTIONS.map(o => (
              <button key={o.key} onClick={() => { setSortBy(o.key); setShowSort(false) }} style={{ display: 'block', width: '100%', padding: '8px 12px', border: 'none', background: sortBy === o.key ? 'var(--accent-soft)' : 'transparent', color: sortBy === o.key ? 'var(--accent-ink)' : 'var(--ink-2)', fontSize: 12.5, fontWeight: sortBy === o.key ? 600 : 400, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>{o.label}</button>
            ))}
          </div>
        )}
      </div>

      <button onClick={() => fileRef?.current?.click()} style={ctrlBtn}><Upload size={13} strokeWidth={1.8} /> Import</button>
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={onImport} />

      {/* Team avatars — click to filter */}
      <div style={{ display: 'flex', marginLeft: 4, alignItems: 'center' }}>
        {members.slice(0, 4).map((m, i) => (
          <div
            key={m.id}
            title={m.name}
            onClick={() => setSelectedMember(selectedMember === m.id ? null : m.id)}
            style={{
              width: 26, height: 26, borderRadius: '50%',
              background: m.color || '#6B7280',
              color: 'white', fontSize: 9, fontWeight: 700,
              display: 'grid', placeItems: 'center',
              border: selectedMember === m.id ? '2px solid var(--accent)' : '2px solid var(--panel)',
              marginLeft: i === 0 ? 0 : -7,
              zIndex: members.length - i,
              cursor: 'pointer',
              outline: selectedMember === m.id ? '2px solid var(--accent)' : 'none',
              outlineOffset: 1,
              opacity: selectedMember && selectedMember !== m.id ? 0.45 : 1,
            }}>
            {(m.initials || m.name?.[0] || '?').toUpperCase()}
          </div>
        ))}
        {members.length > 4 && (
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: 'var(--panel)', color: 'var(--ink-3)',
            fontSize: 9, fontWeight: 700,
            display: 'grid', placeItems: 'center',
            border: '2px solid var(--panel)',
            marginLeft: -7,
            boxShadow: '0 0 0 1px var(--line)',
          }}>+{members.length - 4}</div>
        )}
        {selectedMember && (
          <button onClick={() => setSelectedMember(null)} title="Clear member filter" style={{ marginLeft: 6, padding: '2px 6px', borderRadius: 6, border: '1px solid var(--accent)', background: 'var(--accent-soft)', color: 'var(--accent-ink)', fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
        )}
      </div>
    </div>
  )
}

const ctrlBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  padding: '6px 11px', borderRadius: 10,
  border: '1px solid var(--line)', background: 'var(--panel)',
  fontSize: 12, fontWeight: 500, cursor: 'pointer',
  color: 'var(--ink-2)', boxShadow: 'var(--shadow-1)',
  fontFamily: 'inherit',
}

const EMPTY_LEAD = {
  name: '',
  phone: '',
  email: '',
  address: '',
  zip_code: '',
  what_they_need: '',
  status: 'New Lead',
  square_footage: '',
  density: 'Medium',
  item_quality_score: 7,
  job_type: 'Both',
  notes: '',
  lead_source: null,
}

// ── Action stat cards ─────────────────────────────────────────

const QUICK_FILTER_LABELS = {
  stale:             'Stale leads (3+ days)',
  estimates_pending: 'Estimates pending',
  won_this_month:    'Won this month',
}

function ActionStatCard({ icon: Icon, iconColor, iconBg, label, value, subtext, subtextColor, cardBg, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: cardBg || 'var(--panel)',
        border: '1px solid var(--line)',
        borderRadius: 14, padding: '14px 16px',
        display: 'flex', flexDirection: 'column', gap: 10,
        boxShadow: 'var(--shadow-1)',
        cursor: 'pointer',
        transition: 'box-shadow 120ms, border-color 120ms, background 200ms',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 18px rgba(20,22,26,0.13)'; e.currentTarget.style.borderColor = 'var(--ink-4)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-1)'; e.currentTarget.style.borderColor = 'var(--line)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: iconBg, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Icon size={15} strokeWidth={1.8} color={iconColor} />
        </div>
        <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500 }}>{label}</span>
      </div>
      <div>
        <div className="tnum" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1, color: 'var(--ink-1)' }}>{value}</div>
        {subtext && (
          <div style={{ fontSize: 11, color: subtextColor || 'var(--ink-4)', marginTop: 5, fontWeight: subtextColor ? 600 : 400 }}>
            {subtext}
          </div>
        )}
      </div>
    </div>
  )
}

function ConsultsModal({ consults, onClose, onOpenLead }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20,22,26,0.25)', zIndex: 60, animation: 'fadein 160ms ease' }} />
      <div style={{
        position: 'fixed', top: '8vh', left: '50%', transform: 'translateX(-50%)',
        width: 'min(520px, 94vw)', maxHeight: '80vh',
        background: 'var(--panel)', borderRadius: 14, zIndex: 61,
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(20,22,26,0.25)',
        overflow: 'hidden',
        animation: 'popin 220ms cubic-bezier(.2,.7,.3,1.05)',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'color-mix(in oklab, #3E5C86 20%, var(--panel))', display: 'grid', placeItems: 'center' }}>
            <CalendarDays size={16} strokeWidth={1.8} color="#7BAAD4" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>Consults This Week</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{consults.length} scheduled</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--panel)', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--ink-3)', fontSize: 18, fontFamily: 'inherit' }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {consults.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>No consults scheduled this week</div>
          ) : consults.map((l, i) => {
            const dt = new Date(l.consult_at)
            const DAY = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dt.getDay()]
            const timeStr = dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
            const mapsUrl = l.address
              ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(l.address + (l.zip_code ? ' ' + l.zip_code : ''))}`
              : null
            return (
              <div key={l.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 20px', borderBottom: i < consults.length - 1 ? '1px solid var(--line-2)' : 'none' }}>
                <div style={{ width: 46, flexShrink: 0, textAlign: 'center', background: 'var(--bg)', borderRadius: 8, padding: '5px 0', border: '1px solid var(--line)' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{DAY}</div>
                  <div className="tnum" style={{ fontSize: 19, fontWeight: 700, color: 'var(--ink-1)', lineHeight: 1.2 }}>{dt.getDate()}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-1)' }}>{l.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{timeStr}</div>
                  {l.address && (
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 5, fontSize: 12, color: 'var(--ink-3)', textDecoration: 'none' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--ink-3)'}
                    >
                      <MapPin size={11} strokeWidth={1.8} />
                      {l.address}{l.zip_code ? `, ${l.zip_code}` : ''}
                    </a>
                  )}
                </div>
                <button
                  onClick={() => { onOpenLead(l); onClose() }}
                  style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--accent)', background: 'var(--accent-soft)', color: 'var(--accent-ink)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                >
                  Open <ExternalLink size={11} strokeWidth={2} />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

function ConsultsCard({ consults, nextConsultDay, onOpenLead }) {
  const [open, setOpen] = useState(false)
  const sub = consults.length === 0
    ? 'none scheduled'
    : nextConsultDay ? `next: ${nextConsultDay}` : 'this week'
  return (
    <>
      <ActionStatCard
        icon={CalendarDays} iconColor="#7BAAD4" iconBg="color-mix(in oklab, #3E5C86 20%, var(--panel))"
        label="Consults This Week"
        value={consults.length}
        subtext={sub}
        onClick={() => setOpen(true)}
      />
      {open && <ConsultsModal consults={consults} onClose={() => setOpen(false)} onOpenLead={onOpenLead} />}
    </>
  )
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

export default function Pipeline() {
  const { organizationId } = useAuth()
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [drawerLead, setDrawerLead] = useState(null)
  const [selectedLead, setSelectedLead] = useState(null)
  const [isNewLead, setIsNewLead] = useState(false)
  const [newLeadStage, setNewLeadStage] = useState('New Lead')
  const [pendingTransition, setPendingTransition] = useState(null) // { lead, toStage }

  const [view, setView] = useState('board')
  const [search, setSearch] = useState('')
  const [jobFilter, setJobFilter] = useState('All')
  const [outcomeFilter, setOutcomeFilter] = useState(null)
  const [selectedMember, setSelectedMember] = useState(null)
  const [sortBy, setSortBy] = useState('date_desc')
  // drag state — only used for overlay render + placeholder detection
  const [drag, setDrag] = useState(null)      // { id, lead, w, h }
  const [hoverCol, setHoverCol] = useState(null)
  const [estimates, setEstimates] = useState([])
  const [quickFilter, setQuickFilter] = useState(null)

  // Refs — mutated directly in pointer handlers to avoid render overhead
  const hoverColRef   = useRef(null)          // current hovered stage name
  const pendingRef    = useRef(null)          // { lead, startX, startY, offsetX, offsetY, w, h }
  const isDraggingRef = useRef(false)         // true once threshold crossed
  const overlayRef    = useRef(null)          // the floating overlay DOM node

  const boardRef = useRef(null)
  const importFileRef = useRef(null)


  useEffect(() => { fetchLeads() }, [])

  useEffect(() => {
    const btn = document.getElementById('global-new-lead')
    if (btn) btn.onclick = openNewLead
    return () => { if (btn) btn.onclick = null }
  })

  async function fetchLeads() {
    setLoading(true)
    setError(null)
    try {
      const [leadsRes, estRes] = await Promise.all([
        supabase.from('leads').select('*').order('created_at', { ascending: false }).range(0, 499),
        supabase.from('estimates').select('lead_id, status'),
      ])
      if (leadsRes.error) {
        logger.error('fetchLeads error', leadsRes.error)
        setError('Failed to load leads. Please try again.')
      } else {
        setLeads((leadsRes.data || []).map(enrichLead))
      }
      setEstimates(estRes.data || [])
    } catch (e) {
      logger.error('fetchLeads threw', e)
      setError('Failed to load leads. Please try again.')
    }
    setLoading(false)
  }

  const handleMoveStatus = useCallback(async (lead, newStatus, extraFields = {}) => {
    // Optimistic update — capture previous lead for revert
    let prevLead = null
    setLeads(ls => {
      prevLead = ls.find(l => l.id === lead.id) || null
      return ls.map(l => l.id === lead.id ? { ...l, status: newStatus, ...extraFields } : l)
    })
    setDrawerLead(prev => prev?.id === lead.id ? { ...prev, status: newStatus, ...extraFields } : prev)

    const { error } = await supabase
      .from('leads')
      .update({ status: newStatus, ...extraFields })
      .eq('id', lead.id)
    if (error) {
      logger.error('Move lead status failed', error)
      // Revert on error
      if (prevLead) {
        setLeads(ls => ls.map(l => l.id === lead.id ? prevLead : l))
        setDrawerLead(prev => prev?.id === lead.id ? prevLead : prev)
      }
    }
  }, []) // setLeads/setDrawerLead are stable; supabase is module-level

  const handleSave = useCallback(async (updated) => {
    const { _scoreDetails, ...raw } = updated
    const toSave = {
      ...raw,
      square_footage:     raw.square_footage     !== '' ? raw.square_footage     : null,
      item_quality_score: raw.item_quality_score !== '' ? raw.item_quality_score : null,
      crew_size:          raw.crew_size          !== '' ? raw.crew_size          : null,
    }

    if (!updated.id) {
      const { data, error } = await supabase
        .from('leads')
        .insert({ ...toSave, organization_id: organizationId })
        .select()
        .single()
      if (error) throw new Error(error.message)
      const enriched = enrichLead(data)
      setLeads(ls => [enriched, ...ls])
      setSelectedLead(null)
      setIsNewLead(false)
      return enriched
    } else {
      const { error } = await supabase
        .from('leads')
        .update(toSave)
        .eq('id', updated.id)
      if (error) throw new Error(error.message)
        const enriched = enrichLead({ ...updated, ...toSave })
      setLeads(ls => ls.map(l => l.id === updated.id ? enriched : l))
      setDrawerLead(prev => prev?.id === updated.id ? enriched : prev)
    }
    setSelectedLead(null)
    setIsNewLead(false)
  }, [organizationId])

  async function handleImportLeads(e) {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = ''
    try {
      let jsonRows = []
      if (file.name.match(/\.(xlsx|xls)$/i)) {
        const wb = XLSX.read(await file.arrayBuffer())
        const ws = wb.Sheets[wb.SheetNames[0]]
        jsonRows = XLSX.utils.sheet_to_json(ws, { defval: '' })
      } else {
        const lines = (await file.text()).trim().split('\n')
        const headers = lines[0].split(',').map(h => h.trim())
        jsonRows = lines.slice(1).map(line => {
          const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
          const row = {}; headers.forEach((h, i) => row[h] = vals[i] || ''); return row
        })
      }

      // Normalise keys
      const rows = jsonRows.map(r => {
        const n = {}
        Object.entries(r).forEach(([k, v]) => { n[k.toLowerCase().trim().replace(/\s+/g, '_')] = String(v).trim() })
        return n
      }).filter(r => r.name || r.client || r.full_name)

      if (!rows.length) { alert('No importable rows found. Expected a "Name" column.'); return }

      const STATUS_MAP = {
        'new lead': 'New Lead', 'contacted': 'Contacted', 'in talks': 'In Talks',
        'consult scheduled': 'Consult Scheduled', 'consult completed': 'Consult Completed',
        'estimate sent': 'Estimate Sent', 'project accepted': 'Project Accepted',
        'project scheduled': 'Project Scheduled', 'won': 'Won', 'lost': 'Lost',
      }
      const VALID_STATUSES = new Set(Object.values(STATUS_MAP))

      function mapJobType(raw) {
        const s = String(raw || '').toLowerCase()
        const hasAuction = s.includes('auction')
        const hasClean = s.includes('clean')
        if (hasAuction && hasClean) return 'Both'
        if (hasAuction) return 'Auction'
        if (hasClean) return 'Clean Out'
        return null
      }

      const toInsert = rows.map(r => {
        const rawStatus = String(r.status || '').trim()
        const mappedStatus = STATUS_MAP[rawStatus.toLowerCase()] || (VALID_STATUSES.has(rawStatus) ? rawStatus : 'New Lead')
        return {
          organization_id: organizationId,
          name:    r.name || r.client || r.full_name,
          phone:   r.phone || r.phone_number || r.cell || '',
          email:   r.email || r.email_address || '',
          address: r.address || '',
          notes:   r.notes || r.what_they_need || r.description || '',
          status:  mappedStatus,
          job_type: mapJobType(r.job_type || r.type || r.services) || undefined,
        }
      })

      const { error } = await supabase.from('leads').insert(toInsert)
      if (error) { alert(`Import failed: ${error.message}`); return }
      alert(`Imported ${toInsert.length} lead${toInsert.length !== 1 ? 's' : ''} successfully.`)
      fetchLeads()
    } catch (err) {
      alert(`Failed to read file: ${err.message}`)
    }
  }

  const openNewLead = useCallback(() => {
    setNewLeadStage('New Lead')
    setIsNewLead(true)
  }, [])

  const openNewLeadForStage = useCallback((stage) => {
    setNewLeadStage(stage)
    setIsNewLead(true)
  }, [])

  const filtered = useMemo(() => {
    const now = new Date()
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000
    const thisMonth = now.getMonth(), thisYear = now.getFullYear()

    let out = leads.filter(l => {
      if (search && !l.name.toLowerCase().includes(search.toLowerCase()) &&
          !l.address?.toLowerCase().includes(search.toLowerCase()) &&
          !l.phone?.includes(search)) return false
      if (jobFilter !== 'All' && l.job_type !== jobFilter) return false
      if (outcomeFilter && l.status !== outcomeFilter) return false
      if (selectedMember && l.assigned_to !== selectedMember) return false
      if (quickFilter === 'stale') {
        if (['Won', 'Lost', 'Backlog'].includes(l.status)) return false
        if (!l.updated_at || (now - new Date(l.updated_at)) <= THREE_DAYS_MS) return false
      }
      if (quickFilter === 'estimates_pending') {
        if (l.status !== 'Consult Completed') return false
      }
      if (quickFilter === 'won_this_month') {
        if (l.status !== 'Won') return false
        const d = new Date(l.updated_at)
        if (d.getMonth() !== thisMonth || d.getFullYear() !== thisYear) return false
      }
      return true
    })
    if (sortBy === 'date_asc')  out = [...out].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    if (sortBy === 'score')     out = [...out].sort((a, b) => (b.deal_score || 0) - (a.deal_score || 0))
    if (sortBy === 'value')     out = [...out].sort((a, b) => (b._scoreDetails?.recommendedBid || 0) - (a._scoreDetails?.recommendedBid || 0))
    if (sortBy === 'name')      out = [...out].sort((a, b) => a.name.localeCompare(b.name))
    return out
  }, [leads, search, jobFilter, outcomeFilter, selectedMember, sortBy, quickFilter])

  const grouped = useMemo(() => {
    const map = {}
    for (const l of filtered) {
      if (!map[l.status]) map[l.status] = []
      map[l.status].push(l)
    }
    return stage => map[stage] || []
  }, [filtered])

  // ── Pointer-events drag system ─────────────────────────────
  // Called from LeadCard onPointerDown via StageColumn → Pipeline
  const handleDragStart = useCallback((lead, e) => {
    if (e.button !== undefined && e.button !== 0) return  // left button only
    const rect = e.currentTarget.getBoundingClientRect()
    pendingRef.current = {
      lead,
      startX:  e.clientX,
      startY:  e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      w: rect.width,
      h: rect.height,
    }
    isDraggingRef.current = false
  }, [])

  // One effect, runs on mount — all drag logic lives here via refs
  useEffect(() => {
    function onMove(e) {
      const p = pendingRef.current
      if (!p) return

      if (!isDraggingRef.current) {
        const dist = Math.hypot(e.clientX - p.startX, e.clientY - p.startY)
        if (dist < 5) return  // haven't crossed threshold yet

        // Threshold crossed → activate drag
        isDraggingRef.current = true
        document.body.style.userSelect = 'none'
        document.body.style.cursor = 'grabbing'
        setDrag({ id: p.lead.id, lead: p.lead, w: p.w, h: p.h })
      }

      // Update overlay position directly in DOM — zero React overhead, perfectly smooth
      if (overlayRef.current) {
        const x = e.clientX - p.offsetX
        const y = e.clientY - p.offsetY
        overlayRef.current.style.transform =
          `translate3d(${x}px, ${y}px, 0) rotate(1.5deg) scale(1.04)`
      }

      // Detect which stage column the pointer is over
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const stage = el?.closest('[data-stage]')?.dataset.stage ?? null
      if (stage !== hoverColRef.current) {
        hoverColRef.current = stage
        setHoverCol(stage)
      }
    }

    function onUp(e) {
      const p = pendingRef.current
      const wasDragging = isDraggingRef.current

      // Reset everything
      isDraggingRef.current = false
      pendingRef.current = null
      document.body.style.userSelect = ''
      document.body.style.cursor = ''

      if (wasDragging) {
        // Resolve drop
        const el = document.elementFromPoint(e.clientX, e.clientY)
        const targetStage = el?.closest('[data-stage]')?.dataset.stage
        if (targetStage && p && targetStage !== p.lead.status) {
          if (needsTransitionPrompt(targetStage)) {
            // Show contextual modal before committing the move
            setPendingTransition({ lead: p.lead, toStage: targetStage })
          } else {
            handleMoveStatus(p.lead, targetStage)
          }
        }
        setDrag(null)
        hoverColRef.current = null
        setHoverCol(null)
      }
      // If !wasDragging it was a plain click → React's onClick fires naturally
    }

    document.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerup',   onUp)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup',   onUp)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // ↑ safe: handleMoveStatus / setDrag / setHoverCol are all stable references

  const { needsFollowUp, consultsThisWeek, nextConsultDay, estimatesPending, revThisMonth, revLastMonth } = useMemo(() => {
    const now = new Date()
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000

    // Card 1: stale active leads (not Won/Lost/Backlog, not touched in 3+ days)
    const stale = leads.filter(l =>
      !['Won', 'Lost', 'Backlog'].includes(l.status) &&
      l.updated_at && (now - new Date(l.updated_at)) > THREE_DAYS_MS
    )

    // Card 2: consults within Mon–Sun of current week
    const mon = new Date(now)
    mon.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    mon.setHours(0, 0, 0, 0)
    const sun = new Date(mon)
    sun.setDate(mon.getDate() + 7)

    const weekConsults = leads
      .filter(l => l.status === 'Consult Scheduled' && l.consult_at)
      .filter(l => { const d = new Date(l.consult_at); return d >= mon && d < sun })
      .sort((a, b) => new Date(a.consult_at) - new Date(b.consult_at))

    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const nextConsultDay = weekConsults[0]?.consult_at
      ? DAYS[new Date(weekConsults[0].consult_at).getDay()]
      : null

    // Card 3: Consult Completed with no sent/accepted estimate
    const sentIds = new Set(
      estimates.filter(e => e.status === 'Sent' || e.status === 'Accepted').map(e => e.lead_id)
    )
    const pendingEst = leads.filter(l => l.status === 'Consult Completed' && !sentIds.has(l.id))

    // Card 4: Won revenue this month vs last month
    const thisMonth = now.getMonth(), thisYear = now.getFullYear()
    const lastMonthDate = new Date(thisYear, thisMonth - 1, 1)

    const wonThis = leads.filter(l => {
      if (l.status !== 'Won') return false
      const d = new Date(l.updated_at)
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear
    })
    const wonLast = leads.filter(l => {
      if (l.status !== 'Won') return false
      const d = new Date(l.updated_at)
      return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear()
    })
    const revThis = wonThis.reduce((s, l) => s + (l._scoreDetails?.recommendedBid || 0), 0)
    const revLast = wonLast.reduce((s, l) => s + (l._scoreDetails?.recommendedBid || 0), 0)

    return {
      needsFollowUp:   stale,
      consultsThisWeek: weekConsults,
      nextConsultDay,
      estimatesPending: pendingEst,
      revThisMonth:    revThis,
      revLastMonth:    revLast,
    }
  }, [leads, estimates])

  const handleUpdateLead = useCallback((id, fields) => {
    setLeads(ls => ls.map(l => l.id === id ? enrichLead({ ...l, ...fields }) : l))
    setDrawerLead(prev => prev?.id === id ? enrichLead({ ...prev, ...fields }) : prev)
  }, [])

  // Stable handler refs so LeadDrawer doesn't bust memo if it ever gains React.memo
  const handleCloseDrawer = useCallback(() => setDrawerLead(null), [])
  const handleEditDrawer  = useCallback(() => { setSelectedLead(drawerLead) }, [drawerLead])
  const handleChecklistChange = useCallback((id, checklist) =>
    setLeads(ls => ls.map(l => l.id === id ? { ...l, checklist } : l))
  , [])
  const handleDeleteLead = useCallback(async id => {
    await supabase.from('leads').delete().eq('id', id)
    setLeads(ls => ls.filter(l => l.id !== id))
    setDrawerLead(null)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>

      {/* Stats bar */}
      {(() => {
        // Card 1 colours — color-mix adapts to dark/light mode automatically
        const staleCount = needsFollowUp.length
        const card1Bg = staleCount > 5
          ? 'color-mix(in oklab, var(--lose) 14%, var(--panel))'
          : staleCount === 0
            ? 'color-mix(in oklab, var(--win) 12%, var(--panel))'
            : 'var(--panel)'
        const card1Sub = staleCount === 0 ? 'all caught up' : 'untouched 3+ days'
        const card1SubColor = staleCount === 0 ? 'var(--win)' : staleCount > 5 ? 'var(--lose)' : undefined

        // Card 4 revenue
        const fmtRev = n => n > 0 ? `$${Math.round(n).toLocaleString()}` : '$0'
        const revDelta = revThisMonth - revLastMonth
        const revSub = revThisMonth === 0
          ? 'no closed deals yet'
          : revDelta === 0
            ? 'same as last month'
            : `${revDelta > 0 ? '+' : ''}$${Math.abs(Math.round(revDelta)).toLocaleString()} vs last month`
        const revSubColor = revThisMonth === 0 ? undefined
          : revDelta > 0 ? 'var(--win)' : revDelta < 0 ? 'var(--lose)' : undefined

        return (
          <div style={{
            padding: '14px 20px 8px',
            borderBottom: '1px solid var(--line)',
            flexShrink: 0,
            display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12,
          }}>
            {/* Card 1: Needs Follow-Up */}
            <ActionStatCard
              icon={Bell} iconColor="#F59E0B" iconBg="color-mix(in oklab, #F59E0B 18%, var(--panel))"
              label="Needs Follow-Up"
              value={staleCount}
              subtext={card1Sub}
              subtextColor={card1SubColor}
              cardBg={card1Bg}
              onClick={() => setQuickFilter(q => q === 'stale' ? null : 'stale')}
            />

            {/* Card 2: Consults This Week */}
            <ConsultsCard
              consults={consultsThisWeek}
              nextConsultDay={nextConsultDay}
              onOpenLead={setDrawerLead}
            />

            {/* Card 3: Estimates Pending */}
            <ActionStatCard
              icon={Send} iconColor="#F59E0B" iconBg="color-mix(in oklab, #F59E0B 18%, var(--panel))"
              label="Estimates Pending"
              value={estimatesPending.length}
              subtext={estimatesPending.length === 0 ? 'none pending' : 'ready to send'}
              onClick={() => setQuickFilter(q => q === 'estimates_pending' ? null : 'estimates_pending')}
            />

            {/* Card 4: Revenue This Month */}
            <ActionStatCard
              icon={TrendingUp} iconColor="#2F7A55" iconBg="color-mix(in oklab, #2F7A55 18%, var(--panel))"
              label="Revenue This Month"
              value={fmtRev(revThisMonth)}
              subtext={revSub}
              subtextColor={revSubColor}
              onClick={() => setQuickFilter(q => q === 'won_this_month' ? null : 'won_this_month')}
            />
          </div>
        )
      })()}

      {/* Board header */}
      <BoardHeader
        jobFilter={jobFilter} setJobFilter={setJobFilter}
        outcomeFilter={outcomeFilter} setOutcomeFilter={setOutcomeFilter}
        view={view} setView={setView}
        onImport={handleImportLeads} fileRef={importFileRef}
        selectedMember={selectedMember} setSelectedMember={setSelectedMember}
        sortBy={sortBy} setSortBy={setSortBy}
        search={search} setSearch={setSearch}
      />

      {/* Quick-filter chip */}
      {quickFilter && (
        <div style={{
          padding: '6px 20px',
          background: 'var(--accent-soft)',
          borderBottom: '1px solid var(--accent)30',
          display: 'flex', alignItems: 'center', gap: 8,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-ink)' }}>
            Filtered: {QUICK_FILTER_LABELS[quickFilter]}
          </span>
          <span style={{ fontSize: 12, color: 'var(--accent-ink)', opacity: 0.6 }}>
            · {filtered.length} {filtered.length === 1 ? 'lead' : 'leads'}
          </span>
          <button
            onClick={() => setQuickFilter(null)}
            title="Clear filter"
            style={{
              marginLeft: 4, display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 8px', borderRadius: 999,
              border: '1px solid var(--accent)50', background: 'var(--accent)15',
              color: 'var(--accent-ink)', fontSize: 11, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <X size={10} strokeWidth={2.5} /> Clear
          </button>
        </div>
      )}

      {/* View area */}
      {view === 'list' && (
        <PipelineListView leads={filtered} onOpen={setDrawerLead} onUpdate={handleUpdateLead} />
      )}
      {view === 'calendar' && (
        <PipelineCalendarView leads={filtered} onOpen={setDrawerLead} />
      )}
      {view === 'map' && (
        <PipelineMapView leads={filtered} onOpen={setDrawerLead} />
      )}
      {view === 'board' && (
      <div ref={boardRef} className="pipeline-board" style={{ flex: 1, minHeight: 0, overflowX: 'auto', overflowY: 'hidden', padding: '6px 20px 20px', scrollbarWidth: 'auto', scrollbarColor: 'var(--scrollbar) var(--bg-2)' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text3)', fontSize: 13 }}>
            Loading leads…
          </div>
        ) : error ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10 }}>
            <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>
            <button className="btn btn-secondary" onClick={fetchLeads}>Retry</button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridAutoFlow: 'column',
            gridAutoColumns: 286,
            gap: 12,
            height: '100%',
            width: 'max-content',
            alignItems: 'stretch',
          }}>
            {[...ACTIVE_STAGES, ...OUTCOME_STAGES].map(stage => (
              <StageColumn
                key={stage}
                stage={stage}
                leads={grouped(stage)}
                onCardClick={setDrawerLead}
                draggingId={drag?.id ?? null}
                isHover={hoverCol === stage}
                onDragStart={handleDragStart}
                onAddLead={openNewLeadForStage}
              />
            ))}
          </div>
        )}
      </div>
      )}

      {drawerLead && (
        <ErrorBoundary inline>
          <LeadDrawer
            lead={drawerLead}
            onClose={handleCloseDrawer}
            onEdit={handleEditDrawer}
            onMoveStatus={handleMoveStatus}
            onChecklistChange={handleChecklistChange}
            onDelete={handleDeleteLead}
          />
        </ErrorBoundary>
      )}

      {isNewLead && (
        <NewLeadModal
          initialStage={newLeadStage}
          onClose={() => setIsNewLead(false)}
          onSave={handleSave}
          onCreated={lead => setDrawerLead(lead)}
        />
      )}

      {!isNewLead && selectedLead && (
        <LeadModal
          lead={selectedLead}
          isNew={false}
          onClose={() => { setSelectedLead(null) }}
          onSave={handleSave}
        />
      )}

      {pendingTransition && (
        <StageTransitionModal
          lead={pendingTransition.lead}
          toStage={pendingTransition.toStage}
          onConfirm={(extraFields = {}) => {
            handleMoveStatus(pendingTransition.lead, pendingTransition.toStage, extraFields)
            setPendingTransition(null)
          }}
          onSkip={() => {
            handleMoveStatus(pendingTransition.lead, pendingTransition.toStage)
            setPendingTransition(null)
          }}
          onCancel={() => setPendingTransition(null)}
          onOpenScorer={lead => {
            setPendingTransition(null)
            setDrawerLead(lead)
          }}
        />
      )}

      {/* ── Drag overlay — rendered in <body> so it floats above everything ── */}
      {drag && createPortal(
        <div
          ref={overlayRef}
          style={{
            position: 'fixed',
            top: 0, left: 0,
            width: drag.w,
            pointerEvents: 'none',
            zIndex: 9999,
            willChange: 'transform',
            // Initial position off-screen; pointermove sets it on the first frame
            transform: 'translate3d(-9999px, -9999px, 0)',
            borderRadius: 12,
            boxShadow: '0 24px 60px rgba(0,0,0,0.28), 0 6px 20px rgba(0,0,0,0.14)',
          }}
        >
          <LeadCard
            lead={drag.lead}
            stageTint={STAGE_META[drag.lead.status]?.tint}
            stageSoft={STAGE_META[drag.lead.status]?.soft}
            isDragging={false}
          />
        </div>,
        document.body,
      )}
    </div>
  )
}
