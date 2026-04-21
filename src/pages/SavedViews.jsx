import { Plus } from 'lucide-react'

const SAVED_VIEWS = [
  { name: 'High-value leads',       icon: '★', desc: 'Score ≥ 8 · Not lost',         count: 9,  owner: 'MR', hue: 12  },
  { name: 'Due for follow-up',      icon: '⏰', desc: 'In Contacted > 3 days',        count: 4,  owner: 'MR', hue: 12  },
  { name: 'Auction — Chicago area', icon: '📍', desc: 'Job = Auction · IL',           count: 6,  owner: 'DK', hue: 210 },
  { name: 'Probate estates',        icon: '§',  desc: 'Source contains "atty"',       count: 5,  owner: 'DK', hue: 210 },
  { name: "This week's consults",   icon: '📆', desc: 'Stage = Consult Scheduled',    count: 3,  owner: 'LT', hue: 150 },
  { name: 'Lost — last 30 days',    icon: '⚠',  desc: 'Review for re-engagement',     count: 8,  owner: 'MR', hue: 12  },
  { name: 'My accounts',            icon: '◉',  desc: 'Owner = me',                   count: 11, owner: 'MR', hue: 12  },
  { name: 'Pipeline over $25k',     icon: '$',  desc: 'Active · Value > $25k',        count: 7,  owner: 'DK', hue: 210 },
]

const btnPrimary = {
  padding: '7px 13px', borderRadius: 10,
  background: 'var(--accent)', color: 'white',
  border: 'none', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 6,
}

export default function SavedViews() {
  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {/* Page header */}
      <div style={{ padding: '22px 28px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: 'var(--ink-1)' }}>Saved Views</h1>
          <p style={{ fontSize: 12.5, color: 'var(--ink-3)', margin: '3px 0 0' }}>Custom filters across your pipeline</p>
        </div>
        <div style={{ flexShrink: 0 }}>
          <button style={btnPrimary}><Plus size={14} strokeWidth={2} /> New View</button>
        </div>
      </div>

      <div style={{ padding: '22px 28px 36px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {SAVED_VIEWS.map(v => (
            <div key={v.name} style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, padding: '14px 16px', cursor: 'pointer', transition: 'box-shadow 120ms, border-color 120ms' }}
              onMouseOver={e => { e.currentTarget.style.boxShadow = 'var(--shadow-1)'; e.currentTarget.style.borderColor = 'var(--accent)' }}
              onMouseOut={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--accent-soft)', color: 'var(--accent-ink)', display: 'grid', placeItems: 'center', fontSize: 16, fontWeight: 600, flexShrink: 0 }}>
                  {v.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-1)' }}>{v.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{v.desc}</div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-ink)', background: 'var(--accent-soft)', padding: '2px 9px', borderRadius: 999, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{v.count}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line-2)' }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: `oklch(0.72 0.08 ${v.hue})`, color: 'white', fontSize: 9, fontWeight: 600, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{v.owner}</span>
                <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Owned by you</span>
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 12, color: 'var(--accent-ink)', fontWeight: 600 }}>Open →</span>
              </div>
            </div>
          ))}
        </div>

        {/* Empty state hint */}
        <div style={{ marginTop: 24, padding: '16px 20px', background: 'var(--bg-2)', border: '1px dashed var(--line)', borderRadius: 12, fontSize: 12.5, color: 'var(--ink-3)', textAlign: 'center' }}>
          Create views with any combination of filters — stage, job type, score, date, owner, and more.
          <br />Views stay in sync automatically as your pipeline changes.
        </div>
      </div>
    </div>
  )
}
