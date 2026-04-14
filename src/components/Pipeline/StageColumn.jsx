import LeadCard from './LeadCard'

const STAGE_COLORS = {
  'New Lead':          '#A50050',
  'Contacted':         '#CD545B',
  'In Talks':          '#71C5E8',
  'Consult Scheduled': '#f59e0b',
  'Consult Completed': '#f97316',
  'Project Scheduled': '#22c55e',
  'Backlog':           '#64748b',
  'Won':               '#22c55e',
  'Lost':              '#ef4444',
}

export default function StageColumn({ stage, leads, onCardClick }) {
  const color = STAGE_COLORS[stage] || '#A50050'

  return (
    <div style={{
      minWidth: 240,
      maxWidth: 240,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Column header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
        padding: '0 2px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: color,
            flexShrink: 0,
          }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#6da8c5', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {stage}
          </span>
        </div>
        <span style={{
          background: '#004065',
          color: '#6da8c5',
          fontSize: 11,
          fontWeight: 600,
          borderRadius: 10,
          padding: '1px 7px',
          minWidth: 20,
          textAlign: 'center',
        }}>
          {leads.length}
        </span>
      </div>

      {/* Cards */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minHeight: 80,
        borderTop: `2px solid ${color}`,
        paddingTop: 10,
      }}>
        {leads.length === 0 ? (
          <div style={{
            padding: '20px 12px',
            textAlign: 'center',
            fontSize: 12,
            color: '#3d7a99',
            border: '1px dashed #004065',
            borderRadius: 8,
          }}>
            No leads
          </div>
        ) : (
          leads.map(lead => (
            <LeadCard key={lead.id} lead={lead} onClick={() => onCardClick(lead)} />
          ))
        )}
      </div>
    </div>
  )
}
