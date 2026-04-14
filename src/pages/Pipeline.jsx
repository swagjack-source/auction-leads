import { useState, useEffect } from 'react'
import { Plus, Search } from 'lucide-react'
import StageColumn from '../components/Pipeline/StageColumn'
import LeadModal from '../components/Pipeline/LeadModal'
import { ACTIVE_STAGES, OUTCOME_STAGES } from '../data/mockLeads'
import { supabase } from '../lib/supabase'
import { calculateDeal } from '../lib/scoring'

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
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: '#1e2235',
      border: '1px solid #2a2f45',
      borderRadius: 10,
      padding: '14px 18px',
      minWidth: 140,
    }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || '#f0f2ff' }}>{value}</div>
      <div style={{ fontSize: 12, color: '#8b8fa8', marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#555b75', marginTop: 2 }}>{sub}</div>}
    </div>
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
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedLead, setSelectedLead] = useState(null)
  const [isNewLead, setIsNewLead] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchLeads() }, [])

  async function fetchLeads() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setLeads((data || []).map(enrichLead))
    setLoading(false)
  }

  async function handleSave(updated) {
    const { _scoreDetails, ...toSave } = updated

    if (!updated.id) {
      // Insert new lead
      const { data, error } = await supabase
        .from('leads')
        .insert(toSave)
        .select()
        .single()
      if (error) { console.error('Insert error:', error); return }
      setLeads(ls => [enrichLead(data), ...ls])
    } else {
      // Update existing lead
      const { error } = await supabase
        .from('leads')
        .update(toSave)
        .eq('id', updated.id)
      if (error) { console.error('Update error:', error); return }
      setLeads(ls => ls.map(l => l.id === updated.id ? enrichLead({ ...updated, ...toSave }) : l))
    }
    setSelectedLead(null)
    setIsNewLead(false)
  }

  function openNewLead() {
    setIsNewLead(true)
    setSelectedLead({ ...EMPTY_LEAD })
  }

  const filtered = leads.filter(l =>
    !search ||
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.address?.toLowerCase().includes(search.toLowerCase()) ||
    l.phone?.includes(search)
  )

  const grouped = stage => filtered.filter(l => l.status === stage)

  // Stats
  const activeLeads = leads.filter(l => [...ACTIVE_STAGES, 'Project Scheduled'].includes(l.status))
  const wonLeads = leads.filter(l => l.status === 'Won')
  const scoredLeads = leads.filter(l => l.deal_score)
  const avgScore = scoredLeads.length
    ? scoredLeads.reduce((a, b) => a + b.deal_score, 0) / scoredLeads.length
    : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{
        padding: '20px 28px 16px',
        borderBottom: '1px solid #2a2f45',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f0f2ff', margin: 0 }}>Lead Pipeline</h1>
            <p style={{ fontSize: 13, color: '#555b75', margin: '3px 0 0' }}>{leads.length} total leads</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} color="#555b75" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                placeholder="Search leads…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  background: '#1e2235',
                  border: '1px solid #2a2f45',
                  borderRadius: 8,
                  padding: '8px 12px 8px 32px',
                  fontSize: 13,
                  color: '#f0f2ff',
                  outline: 'none',
                  width: 200,
                }}
              />
            </div>
            <button
              onClick={openNewLead}
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                border: 'none',
                borderRadius: 8,
                padding: '8px 16px',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
              <Plus size={14} />
              Add Lead
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 12 }}>
          <StatCard label="Active Leads" value={activeLeads.length} />
          <StatCard label="Closed Won" value={wonLeads.length} color="#22c55e" />
          <StatCard label="Avg Deal Score" value={scoredLeads.length ? avgScore.toFixed(1) : '—'} color="#6366f1" />
          <StatCard
            label="Est. Pipeline Value"
            value={`$${(activeLeads.reduce((sum, l) => sum + (l._scoreDetails?.recommendedBid || 0), 0)).toLocaleString()}`}
            sub="based on scored leads"
            color="#f59e0b"
          />
        </div>
      </div>

      {/* Board */}
      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555b75', fontSize: 14 }}>
          Loading leads…
        </div>
      ) : error ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <div style={{ color: '#ef4444', fontSize: 14 }}>{error}</div>
          <button onClick={fetchLeads} style={{ background: 'none', border: '1px solid #2a2f45', borderRadius: 7, padding: '6px 14px', color: '#8b8fa8', fontSize: 13, cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      ) : (
        <div style={{ flex: 1, overflowX: 'auto', padding: '20px 28px', overflowY: 'auto' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#555b75', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>
            Active Pipeline
          </div>
          <div style={{ display: 'flex', gap: 16, minWidth: 'max-content', marginBottom: 32 }}>
            {ACTIVE_STAGES.map(stage => (
              <StageColumn
                key={stage}
                stage={stage}
                leads={grouped(stage)}
                onCardClick={setSelectedLead}
              />
            ))}
          </div>

          <div style={{ fontSize: 11, fontWeight: 600, color: '#555b75', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>
            Outcomes
          </div>
          <div style={{ display: 'flex', gap: 16, minWidth: 'max-content' }}>
            {OUTCOME_STAGES.map(stage => (
              <StageColumn
                key={stage}
                stage={stage}
                leads={grouped(stage)}
                onCardClick={setSelectedLead}
              />
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
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
