import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Search, Users, Trophy, Star, TrendingUp, Filter, ArrowUpDown, ChevronDown } from 'lucide-react'
import StageColumn from '../components/Pipeline/StageColumn'
import LeadModal from '../components/Pipeline/LeadModal'
import LeadDrawer from '../components/Pipeline/LeadDrawer'
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

function BoardHeader({ jobFilter, setJobFilter, outcomeFilter, setOutcomeFilter, view, setView }) {
  const { members } = useTeam()
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 20px 10px',
      background: 'var(--panel)',
      borderBottom: '1px solid var(--line)',
      flexShrink: 0,
      flexWrap: 'wrap',
    }}>
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

      {/* Controls */}
      <button style={ctrlBtn}><Filter size={13} strokeWidth={1.8} /> Filter</button>
      <button style={ctrlBtn}><ArrowUpDown size={13} strokeWidth={1.8} /> Sort</button>
      <button style={ctrlBtn}>Group: Stage <ChevronDown size={12} strokeWidth={1.8} /></button>

      {/* Team avatars */}
      <div style={{ display: 'flex', marginLeft: 4 }}>
        {members.slice(0, 4).map((m, i) => (
          <div key={m.id} title={m.name} style={{
            width: 24, height: 24, borderRadius: '50%',
            background: m.color || '#6B7280',
            color: 'white', fontSize: 9, fontWeight: 700,
            display: 'grid', placeItems: 'center',
            border: '2px solid var(--panel)',
            marginLeft: i === 0 ? 0 : -7,
            zIndex: members.length - i,
          }}>
            {(m.initials || m.name[0]).toUpperCase()}
          </div>
        ))}
        {members.length > 4 && (
          <div style={{
            width: 24, height: 24, borderRadius: '50%',
            background: 'var(--panel)', color: 'var(--ink-3)',
            fontSize: 9, fontWeight: 700,
            display: 'grid', placeItems: 'center',
            border: '2px solid var(--panel)',
            marginLeft: -7,
            boxShadow: '0 0 0 1px var(--line)',
          }}>+{members.length - 4}</div>
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

function StatContribModal({ label, leads, tint, tintFg, icon: Icon, onClose }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20,22,26,0.25)', zIndex: 60, animation: 'fadein 160ms ease' }} />
      <div style={{
        position: 'fixed', top: '8vh', left: '50%', transform: 'translateX(-50%)',
        width: 'min(720px, 94vw)', maxHeight: '80vh',
        background: 'var(--panel)', borderRadius: 14, zIndex: 61,
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(20,22,26,0.25)',
        overflow: 'hidden',
        animation: 'slidein 220ms cubic-bezier(.2,.7,.3,1.05)',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: tint, color: tintFg, display: 'grid', placeItems: 'center' }}>
            <Icon size={16} strokeWidth={1.8} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>{label}</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{leads.length} contributing {leads.length === 1 ? 'deal' : 'deals'}</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--panel)', cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: 16, color: 'var(--ink-3)' }}>×</button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 4px' }}>
          {leads.map((l, i) => (
            <div key={l.id} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 80px 60px', gap: 10, padding: '10px 16px', borderBottom: i < leads.length - 1 ? '1px solid var(--line-2)' : 'none', alignItems: 'center', fontSize: 12.5 }}>
              <div>
                <div style={{ fontWeight: 600 }}>{l.name}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{l.address}</div>
              </div>
              <span style={{ fontSize: 11, color: 'var(--ink-2)' }}>{l.job_type}</span>
              <span className="tnum" style={{ fontWeight: 600 }}>{l._scoreDetails?.recommendedBid ? `$${(l._scoreDetails.recommendedBid / 1000).toFixed(1)}k` : '—'}</span>
              <span className="tnum" style={{ fontSize: 11, fontWeight: 600, color: (l.deal_score || 0) >= 8 ? 'var(--win)' : (l.deal_score || 0) >= 5 ? 'var(--ink-2)' : 'var(--lose)' }}>{l.deal_score ? `${Math.round(l.deal_score)}/10` : '—'}</span>
            </div>
          ))}
          {leads.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 12.5 }}>No deals to display</div>
          )}
        </div>
      </div>
    </>
  )
}

function StatCard({ label, value, sub, delta, deltaDir, icon: Icon, tint, tintFg, contribLeads }) {
  const [modalOpen, setModalOpen] = useState(false)
  const spark = useMemo(() => Array.from({ length: 18 }, (_, i) =>
    30 + Math.sin(i * 0.7) * 8 + Math.random() * 5 + i * 0.8
  ), [])
  const max = Math.max(...spark), min = Math.min(...spark)
  const w = 72, h = 22
  const pts = spark.map((v, i) => {
    const x = (i / (spark.length - 1)) * w
    const y = h - ((v - min) / (max - min)) * h
    return `${x},${y}`
  }).join(' ')

  const cardBg = tint ? `color-mix(in oklab, ${tint} 25%, var(--panel))` : 'var(--panel)'
  const iconBg = tint || 'var(--accent-soft)'
  const iconFg = tintFg || 'var(--accent-ink)'

  return (
    <>
      <div
        onClick={() => contribLeads && setModalOpen(true)}
        onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-2)' }}
        onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-1)' }}
        style={{
          background: cardBg,
          border: '1px solid var(--line)',
          borderRadius: 14,
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          boxShadow: 'var(--shadow-1)',
          cursor: contribLeads ? 'pointer' : 'default',
          transition: 'transform 120ms, box-shadow 120ms',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, background: iconBg, color: iconFg, display: 'grid', placeItems: 'center' }}>
            <Icon size={14} strokeWidth={1.8} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500 }}>{label}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <div className="tnum" style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1, color: 'var(--ink-1)' }}>{value}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              {delta && (
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  color: deltaDir === 'up' ? 'var(--win)' : 'var(--lose)',
                  background: deltaDir === 'up' ? 'var(--win-soft)' : 'var(--lose-soft)',
                  padding: '1px 6px', borderRadius: 5,
                }}>{deltaDir === 'up' ? '↑' : '↓'} {delta}</span>
              )}
              {sub && <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>{sub}</span>}
            </div>
          </div>
          <svg width={w} height={h} style={{ flexShrink: 0 }}>
            <polyline fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" points={pts} />
            <polyline fill="var(--accent)" fillOpacity="0.08" stroke="none" points={`0,${h} ${pts} ${w},${h}`} />
          </svg>
        </div>
      </div>
      {modalOpen && contribLeads && (
        <StatContribModal
          label={label}
          leads={contribLeads}
          tint={iconBg}
          tintFg={iconFg}
          icon={Icon}
          onClose={() => setModalOpen(false)}
        />
      )}
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
  const [leads, setLeads] = useState(() => MOCK_LEADS.map(enrichLead))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [drawerLead, setDrawerLead] = useState(null)
  const [selectedLead, setSelectedLead] = useState(null)
  const [isNewLead, setIsNewLead] = useState(false)

  const [view, setView] = useState('board')
  const [search, setSearch] = useState('')
  const [jobFilter, setJobFilter] = useState('All')
  const [outcomeFilter, setOutcomeFilter] = useState(null)
  const [draggingId, setDraggingId] = useState(null)
  const [hoverCol, setHoverCol] = useState(null)
  const hoverColRef = useRef(null)
  const boardRef = useRef(null)

  useEffect(() => {
    const el = boardRef.current
    if (!el) return
    function onWheel(e) {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

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
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .range(0, 499)
      if (error) logger.error('fetchLeads error', error)
      const leads = data && data.length > 0 ? data : MOCK_LEADS
      setLeads(leads.map(enrichLead))
    } catch (e) {
      logger.error('fetchLeads threw', e)
      setLeads(MOCK_LEADS.map(enrichLead))
    }
    setLoading(false)
  }

  async function handleMoveStatus(lead, newStatus) {
    const { error } = await supabase
      .from('leads')
      .update({ status: newStatus })
      .eq('id', lead.id)
    if (error) { logger.error('Move lead status failed', error); return }
    setLeads(ls => ls.map(l => l.id === lead.id ? { ...l, status: newStatus } : l))
    setDrawerLead(prev => prev?.id === lead.id ? { ...prev, status: newStatus } : prev)
  }

  async function handleSave(updated) {
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
      setLeads(ls => [enrichLead(data), ...ls])
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
  }

  function openNewLead() {
    setIsNewLead(true)
    setSelectedLead({ ...EMPTY_LEAD })
  }

  const filtered = useMemo(() => leads.filter(l => {
    if (search && !l.name.toLowerCase().includes(search.toLowerCase()) &&
        !l.address?.toLowerCase().includes(search.toLowerCase()) &&
        !l.phone?.includes(search)) return false
    if (jobFilter !== 'All' && l.job_type !== jobFilter) return false
    if (outcomeFilter && l.status !== outcomeFilter) return false
    return true
  }), [leads, search, jobFilter, outcomeFilter])

  const grouped = useMemo(() => {
    const map = {}
    for (const l of filtered) {
      if (!map[l.status]) map[l.status] = []
      map[l.status].push(l)
    }
    return stage => map[stage] || []
  }, [filtered])

  const handleDragOver = useCallback((stage, e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (hoverColRef.current !== stage) {
      hoverColRef.current = stage
      setHoverCol(stage)
    }
  }, [])

  const handleDragLeave = useCallback((stage) => {
    if (hoverColRef.current === stage) {
      hoverColRef.current = null
      setHoverCol(null)
    }
  }, [])

  const handleDrop = useCallback((stage, e) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    if (id) {
      setLeads(ls => {
        const lead = ls.find(l => l.id === id)
        if (lead && lead.status !== stage) handleMoveStatus(lead, stage)
        return ls
      })
    }
    setDraggingId(null)
    hoverColRef.current = null
    setHoverCol(null)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDragStart = useCallback((id, e) => {
    setDraggingId(id)
    e.dataTransfer.effectAllowed = 'move'
    try { e.dataTransfer.setData('text/plain', id) } catch {}
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggingId(null)
    hoverColRef.current = null
    setHoverCol(null)
  }, [])

  const { activeLeads, wonLeads, avgScore, pipelineValue } = useMemo(() => {
    const active = leads.filter(l => ACTIVE_STAGES.includes(l.status))
    const won    = leads.filter(l => l.status === 'Won')
    const scored = leads.filter(l => l.deal_score)
    const avg    = scored.length
      ? scored.reduce((a, b) => a + b.deal_score, 0) / scored.length
      : null
    const pipeline = active.reduce((sum, l) => sum + (l._scoreDetails?.recommendedBid || 0), 0)
    return { activeLeads: active, wonLeads: won, avgScore: avg, pipelineValue: pipeline }
  }, [leads])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>

      {/* Stats bar */}
      <div style={{
        padding: '14px 20px 8px',
        borderBottom: '1px solid var(--line)',
        flexShrink: 0,
        display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12,
      }}>
        <StatCard icon={Users}      label="Active Leads"   value={activeLeads.length}                           sub="active in pipeline" delta="+3" deltaDir="up" tint="var(--accent-soft)"  tintFg="var(--accent-ink)" contribLeads={activeLeads} />
        <StatCard icon={Trophy}     label="Won This Month" value={wonLeads.length}                              sub="closed won"         delta="+1" deltaDir="up" tint="var(--win-soft)"    tintFg="var(--win)"        contribLeads={wonLeads} />
        <StatCard icon={Star}       label="Avg Deal Score" value={avgScore != null ? avgScore.toFixed(1) : '—'} sub="out of 10"          delta="+0.4" deltaDir="up" tint="var(--warn-soft)" tintFg="var(--warn)"       contribLeads={leads.filter(l => l.deal_score).sort((a,b)=>b.deal_score-a.deal_score).slice(0,10)} />
        <StatCard icon={TrendingUp} label="Pipeline Value" value={pipelineValue > 0 ? `$${Math.round(pipelineValue/1000)}k` : '—'} sub="weighted" delta="+12%" deltaDir="up" tint="var(--b-both-bg)" tintFg="var(--b-both-fg)" contribLeads={activeLeads.sort((a,b)=>(b._scoreDetails?.recommendedBid||0)-(a._scoreDetails?.recommendedBid||0))} />
      </div>

      {/* Board header */}
      <BoardHeader
        jobFilter={jobFilter} setJobFilter={setJobFilter}
        outcomeFilter={outcomeFilter} setOutcomeFilter={setOutcomeFilter}
        view={view} setView={setView}
      />

      {/* View area */}
      {view === 'list' && (
        <PipelineListView leads={filtered} onOpen={setDrawerLead} />
      )}
      {view === 'calendar' && (
        <PipelineCalendarView leads={filtered} onOpen={setDrawerLead} />
      )}
      {view === 'map' && (
        <PipelineMapView leads={filtered} onOpen={setDrawerLead} />
      )}
      {view === 'board' && (
      <div ref={boardRef} style={{ flex: 1, minHeight: 0, overflowX: 'scroll', overflowY: 'hidden', padding: '6px 20px 20px', scrollbarWidth: 'thin', scrollbarColor: '#6b7280 #11111b' }}>
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
                onMoveStatus={handleMoveStatus}
                draggingId={draggingId}
                isHover={hoverCol === stage}
                onDragOver={e => handleDragOver(stage, e)}
                onDragLeave={() => handleDragLeave(stage)}
                onDrop={e => handleDrop(stage, e)}
                onDragStart={(e, id) => handleDragStart(id, e)}
                onDragEnd={handleDragEnd}
              />
            ))}
          </div>
        )}
      </div>
      )}

      {drawerLead && (
        <LeadDrawer
          lead={drawerLead}
          onClose={() => setDrawerLead(null)}
          onEdit={() => { setSelectedLead(drawerLead) }}
          onMoveStatus={handleMoveStatus}
          onChecklistChange={(id, checklist) =>
            setLeads(ls => ls.map(l => l.id === id ? { ...l, checklist } : l))
          }
        />
      )}

      {selectedLead && (
        <LeadModal
          lead={selectedLead}
          isNew={isNewLead}
          onClose={() => { setSelectedLead(null); setIsNewLead(false) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
