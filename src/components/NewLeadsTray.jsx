import { useState } from 'react'
import { Sparkles, ChevronRight } from 'lucide-react'

const UNTRIAGED = [
  { id: 'U-91', client: 'Eleanor Whitcombe',    addr: '902 Hinman Ave, Evanston, IL',      source: 'Maximum',                 sourceKind: 'max', job: 'cleanout', value: 7800,  phone: '(847) 555-0199', age: '14m', note: 'Form: "Downsizing to Westminster Place May 15. Need estimate."' },
  { id: 'U-92', client: 'Estate of P. Lorimer', addr: '41 Woodside Rd, Glencoe, IL',       source: 'Referral — Atty. Beckett', sourceKind: 'ref', job: 'auction', value: 52000, phone: '(847) 555-0122', age: '2h',  note: 'Probate, executor available this week.' },
  { id: 'U-93', client: 'Theo & Margot Aasen',  addr: '88 N Harlem, Oak Park, IL',         source: 'Website form',            sourceKind: 'web', job: 'both',     value: 18400, phone: '(708) 555-0150', age: '3h',  note: '"Mother passed. House + contents. Urgent."' },
  { id: 'U-94', client: 'Claude Oyelaran',       addr: '1201 S Prairie, Chicago, IL',       source: 'Maximum',                 sourceKind: 'max', job: 'cleanout', value: 4900,  phone: '(312) 555-0138', age: '5h',  note: 'Condo clean-out. 1BR high-rise.' },
  { id: 'U-95', client: 'Ilse Grunwald',         addr: '7 Orchard Ln, Lake Bluff, IL',      source: 'Google Ads',              sourceKind: 'ads', job: 'auction',  value: 22000, phone: '(847) 555-0114', age: '6h',  note: 'Mid-century collection, wants consult.' },
  { id: 'U-96', client: 'Edwin Shiflett',         addr: '530 Dempster, Skokie, IL',          source: 'Referral — Home of Hope', sourceKind: 'ref', job: 'both',     value: 11200, phone: '(847) 555-0107', age: '9h',  note: 'Senior community discharge coordinator.' },
  { id: 'U-97', client: 'Marisol Aponte',         addr: '14 Ridgewood, Hinsdale, IL',        source: 'Facebook ad',             sourceKind: 'ads', job: 'cleanout', value: 6100,  phone: '(630) 555-0144', age: '11h', note: 'Moving cross-country next month.' },
  { id: 'U-98', client: 'Estate of V. Lindqvist', addr: '2112 Central St, Evanston',         source: 'Maximum',                 sourceKind: 'max', job: 'auction',  value: 38500, phone: '(847) 555-0181', age: '1d',  note: 'Fine art + silver. Bank trust contact.' },
]

const SOURCE_STYLE = {
  max: { label: 'Max',     bg: '#FFEFD9', fg: '#7A5417' },
  web: { label: 'Web',     bg: '#E4ECF6', fg: '#3E5C86' },
  ref: { label: 'Referral',bg: '#E3EEE8', fg: '#2F7A55' },
  ads: { label: 'Ad',      bg: '#F5ECD6', fg: '#7A5A17' },
}

function fmtValue(v) {
  if (v >= 10000) return `$${(v / 1000).toFixed(0)}k`
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`
  return `$${v}`
}

export default function NewLeadsTray({ onAccept }) {
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem('homebase_tray') !== 'closed' } catch { return true }
  })
  const [leads, setLeads] = useState(UNTRIAGED)
  const [hover, setHover] = useState(null)

  const persistOpen = (v) => {
    setOpen(v)
    try { localStorage.setItem('homebase_tray', v ? 'open' : 'closed') } catch {}
  }

  const accept = (lead) => {
    setLeads(ls => ls.filter(l => l.id !== lead.id))
    onAccept && onAccept(lead)
  }
  const dismiss = (lead) => {
    setLeads(ls => ls.filter(l => l.id !== lead.id))
  }

  if (!open) {
    return (
      <button
        onClick={() => persistOpen(true)}
        title="New leads tray"
        style={{
          position: 'absolute', right: 20, top: 72, zIndex: 5,
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 11px', borderRadius: 10,
          border: '1px solid var(--line)', background: 'var(--panel)',
          fontSize: 12, fontWeight: 600, cursor: 'pointer',
          color: 'var(--ink-1)', boxShadow: 'var(--shadow-1)',
        }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#C84A4A' }} />
        {leads.length} new
        <ChevronRight size={13} style={{ transform: 'rotate(90deg)' }} />
      </button>
    )
  }

  return (
    <aside style={{
      width: 304, flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      background: 'var(--panel)',
      borderLeft: '1px solid var(--line)',
      minHeight: 0,
    }}>
      <header style={{
        padding: '12px 14px 10px',
        borderBottom: '1px solid var(--line-2)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#C84A4A' }} />
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em' }}>New leads</span>
            <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--ink-2)', background: 'var(--bg-2)', padding: '1px 6px', borderRadius: 999 }}>{leads.length}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>Awaiting triage · auto-synced</div>
        </div>
        <button onClick={() => persistOpen(false)} title="Hide tray" style={{
          width: 24, height: 24, borderRadius: 6, border: 'none',
          background: 'transparent', cursor: 'pointer',
          display: 'grid', placeItems: 'center', color: 'var(--ink-3)',
        }}>
          <ChevronRight size={14} style={{ transform: 'rotate(-90deg)' }} />
        </button>
      </header>

      {/* Source filter strip */}
      <div style={{ display: 'flex', gap: 4, padding: '8px 12px 6px', borderBottom: '1px solid var(--line-2)', fontSize: 10.5, flexWrap: 'wrap' }}>
        {Object.entries(SOURCE_STYLE).map(([k, s]) => {
          const count = leads.filter(l => l.sourceKind === k).length
          return (
            <div key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 999, background: s.bg, color: s.fg, fontWeight: 600 }}>
              {s.label} <span style={{ opacity: 0.6 }}>{count}</span>
            </div>
          )
        })}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 0' }}>
        {leads.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', fontSize: 12, color: 'var(--ink-4)' }}>
            All caught up.
            <div style={{ fontSize: 11, marginTop: 4 }}>New leads will appear here.</div>
          </div>
        ) : (
          leads.map(lead => {
            const src = SOURCE_STYLE[lead.sourceKind]
            const isHover = hover === lead.id
            return (
              <div key={lead.id}
                onMouseEnter={() => setHover(lead.id)}
                onMouseLeave={() => setHover(null)}
                style={{ padding: '10px 14px', borderBottom: '1px solid var(--line-2)', background: isHover ? 'var(--bg-2)' : 'transparent', transition: 'background 120ms' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.03em', color: src.fg, background: src.bg, padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase' }}>{src.label}</span>
                  <span style={{ fontSize: 10.5, color: 'var(--ink-4)' }}>{lead.age} ago</span>
                  <div style={{ flex: 1 }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', fontVariantNumeric: 'tabular-nums' }}>~{fmtValue(lead.value)}</span>
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-1)', letterSpacing: '-0.01em' }}>{lead.client}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>{lead.addr}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4, fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>"{lead.note}"</div>
                {isHover && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <button onClick={() => accept(lead)} style={{ flex: 1, padding: '5px 9px', borderRadius: 7, background: 'var(--accent)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 11.5, fontWeight: 600 }}>
                      Accept → Pipeline
                    </button>
                    <button onClick={() => dismiss(lead)} style={{ padding: '5px 9px', borderRadius: 7, background: 'var(--panel)', color: 'var(--ink-2)', border: '1px solid var(--line)', cursor: 'pointer', fontSize: 11.5, fontWeight: 600 }}>
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <footer style={{ padding: '10px 14px', borderTop: '1px solid var(--line-2)', fontSize: 11, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Sparkles size={12} strokeWidth={1.8} />
        <span>AI triage suggests accepting <b style={{ color: 'var(--ink-1)' }}>5 of {leads.length}</b></span>
      </footer>
    </aside>
  )
}
