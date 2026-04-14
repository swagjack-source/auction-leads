import { MapPin, Phone, Briefcase } from 'lucide-react'
import ScoreBadge from './ScoreBadge'
import { useTeam } from '../../lib/TeamContext'

const JOB_COLORS = {
  'Clean Out': '#6366f1',
  'Auction':   '#8b5cf6',
  'Both':      '#06b6d4',
}

export default function LeadCard({ lead, onClick }) {
  const { members } = useTeam()
  const assignee = lead.assigned_to ? members.find(m => m.id === lead.assigned_to) : null

  return (
    <div
      onClick={onClick}
      style={{
        background: '#1e2235',
        border: '1px solid #2a2f45',
        borderRadius: 10,
        padding: '12px 14px',
        cursor: 'pointer',
        transition: 'all 0.15s',
        userSelect: 'none',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = '#6366f1'
        e.currentTarget.style.background = '#252840'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = '#2a2f45'
        e.currentTarget.style.background = '#1e2235'
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: '#f0f2ff', lineHeight: 1.3 }}>
          {lead.name}
        </div>
        {lead.deal_score != null && <ScoreBadge score={lead.deal_score} />}
      </div>

      {/* Phone */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
        <Phone size={11} color="#555b75" />
        <span style={{ fontSize: 12, color: '#8b8fa8' }}>{lead.phone}</span>
      </div>

      {/* Address */}
      {lead.address && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, marginBottom: 8 }}>
          <MapPin size={11} color="#555b75" style={{ marginTop: 2, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: '#8b8fa8', lineHeight: 1.4 }}>
            {lead.address.length > 40 ? lead.address.slice(0, 40) + '…' : lead.address}
          </span>
        </div>
      )}

      {/* Bottom row: job type + assignee */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
        {lead.job_type && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: `${JOB_COLORS[lead.job_type]}18`,
            border: `1px solid ${JOB_COLORS[lead.job_type]}30`,
            borderRadius: 5,
            padding: '2px 7px',
          }}>
            <Briefcase size={10} color={JOB_COLORS[lead.job_type]} />
            <span style={{ fontSize: 11, color: JOB_COLORS[lead.job_type], fontWeight: 500 }}>
              {lead.job_type}
            </span>
          </div>
        )}
        {assignee && (
          <div
            title={assignee.name}
            style={{ width: 22, height: 22, borderRadius: '50%', background: assignee.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0, marginLeft: 'auto' }}
          >
            {assignee.initials || assignee.name[0].toUpperCase()}
          </div>
        )}
      </div>
    </div>
  )
}
