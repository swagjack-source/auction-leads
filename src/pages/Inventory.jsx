import { useState } from 'react'
import { Download, Plus, Box, Wallet, AlertTriangle, RefreshCw, MoreHorizontal } from 'lucide-react'

const INVENTORY = [
  { id: 'IN01', name: 'Small moving boxes (16")',    cat: 'Packing',   stock: 34,  par: 40,  unit: 'ea',     cost: 1.80,   location: 'Warehouse A · Bay 3', vendor: 'Uline',        lastOrder: 'Apr 2',    status: 'low'      },
  { id: 'IN02', name: 'Medium moving boxes (18")',   cat: 'Packing',   stock: 112, par: 80,  unit: 'ea',     cost: 2.40,   location: 'Warehouse A · Bay 3', vendor: 'Uline',        lastOrder: 'Apr 2',    status: 'ok'       },
  { id: 'IN03', name: 'Large moving boxes (24")',    cat: 'Packing',   stock: 68,  par: 60,  unit: 'ea',     cost: 3.95,   location: 'Warehouse A · Bay 3', vendor: 'Uline',        lastOrder: 'Apr 2',    status: 'ok'       },
  { id: 'IN04', name: 'Wardrobe boxes w/ bar',       cat: 'Packing',   stock: 8,   par: 20,  unit: 'ea',     cost: 14.50,  location: 'Warehouse A · Bay 4', vendor: 'Uline',        lastOrder: 'Mar 18',   status: 'critical' },
  { id: 'IN05', name: 'Packing paper (25 lb)',       cat: 'Packing',   stock: 22,  par: 15,  unit: 'bundle', cost: 38.00,  location: 'Warehouse A · Bay 4', vendor: 'Uline',        lastOrder: 'Apr 10',   status: 'ok'       },
  { id: 'IN06', name: 'Bubble wrap (12" × 250 ft)',  cat: 'Packing',   stock: 6,   par: 12,  unit: 'roll',   cost: 62.00,  location: 'Warehouse A · Bay 4', vendor: 'Uline',        lastOrder: 'Mar 22',   status: 'low'      },
  { id: 'IN07', name: 'Stretch wrap (18" × 1500ft)', cat: 'Packing',   stock: 14,  par: 10,  unit: 'roll',   cost: 24.50,  location: 'Warehouse A · Bay 4', vendor: 'Uline',        lastOrder: 'Apr 10',   status: 'ok'       },
  { id: 'IN08', name: 'Packing tape (clear, 2")',    cat: 'Packing',   stock: 45,  par: 60,  unit: 'roll',   cost: 3.20,   location: 'Warehouse A · Bay 4', vendor: 'Staples',      lastOrder: 'Apr 8',    status: 'low'      },
  { id: 'IN10', name: 'Photo backdrop — white',      cat: 'Auction',   stock: 3,   par: 4,   unit: 'ea',     cost: 89.00,  location: 'Studio',              vendor: 'B&H Photo',    lastOrder: 'Jan 5',    status: 'ok'       },
  { id: 'IN11', name: 'SD cards — 64GB',             cat: 'Auction',   stock: 2,   par: 6,   unit: 'ea',     cost: 18.00,  location: 'Studio',              vendor: 'Amazon',       lastOrder: 'Feb 12',   status: 'critical' },
  { id: 'IN12', name: 'Lot tags (printed)',          cat: 'Auction',   stock: 850, par: 500, unit: 'ea',     cost: 0.08,   location: 'Studio',              vendor: 'Vistaprint',   lastOrder: 'Apr 1',    status: 'ok'       },
  { id: 'IN13', name: 'Lot numbering stickers',      cat: 'Auction',   stock: 180, par: 300, unit: 'sheet',  cost: 4.50,   location: 'Studio',              vendor: 'Uline',        lastOrder: 'Mar 15',   status: 'low'      },
  { id: 'IN20', name: 'Furniture dollies',           cat: 'Equipment', stock: 7,   par: 8,   unit: 'ea',     cost: 85.00,  location: 'Van fleet',           vendor: 'Home Depot',   lastOrder: 'Jan 2024', status: 'ok'       },
  { id: 'IN21', name: 'Moving blankets',             cat: 'Equipment', stock: 24,  par: 30,  unit: 'ea',     cost: 16.50,  location: 'Van fleet',           vendor: 'Uline',        lastOrder: 'Feb 2',    status: 'low'      },
  { id: 'IN22', name: 'Appliance dolly',             cat: 'Equipment', stock: 2,   par: 2,   unit: 'ea',     cost: 340.00, location: 'Warehouse A',         vendor: 'Home Depot',   lastOrder: '2023',     status: 'ok'       },
  { id: 'IN23', name: 'Work gloves (M/L/XL)',        cat: 'Equipment', stock: 18,  par: 36,  unit: 'pair',   cost: 8.50,   location: 'Van fleet',           vendor: 'Grainger',     lastOrder: 'Apr 1',    status: 'low'      },
  { id: 'IN24', name: 'N95 masks',                   cat: 'Equipment', stock: 84,  par: 100, unit: 'ea',     cost: 0.95,   location: 'Van fleet',           vendor: 'Grainger',     lastOrder: 'Mar 20',   status: 'ok'       },
  { id: 'IN25', name: 'Safety goggles',              cat: 'Equipment', stock: 12,  par: 8,   unit: 'pair',   cost: 6.20,   location: 'Van fleet',           vendor: 'Grainger',     lastOrder: 'Mar 5',    status: 'ok'       },
  { id: 'IN26', name: 'Tool kit — basic',            cat: 'Equipment', stock: 4,   par: 4,   unit: 'ea',     cost: 120.00, location: 'Van fleet',           vendor: 'Home Depot',   lastOrder: '2023',     status: 'ok'       },
  { id: 'IN30', name: 'Printer paper (case)',        cat: 'Office',    stock: 3,   par: 4,   unit: 'case',   cost: 42.00,  location: 'Office',              vendor: 'Staples',      lastOrder: 'Apr 5',    status: 'ok'       },
  { id: 'IN31', name: 'Printer toner — color',       cat: 'Office',    stock: 1,   par: 2,   unit: 'ea',     cost: 180.00, location: 'Office',              vendor: 'Staples',      lastOrder: 'Feb 10',   status: 'critical' },
  { id: 'IN32', name: 'Label printer labels',        cat: 'Office',    stock: 12,  par: 10,  unit: 'roll',   cost: 16.00,  location: 'Office',              vendor: 'Dymo',         lastOrder: 'Mar 28',   status: 'ok'       },
]

const CAT_CHIP = {
  Packing:   { bg: '#ECE6F4', fg: '#5C3F88' },
  Auction:   { bg: '#E3EEE8', fg: '#2F7A55' },
  Equipment: { bg: '#EFEFEB', fg: '#60605A' },
  Office:    { bg: '#E4ECF6', fg: '#2B4468' },
}

function PageHeader({ title, subtitle, actions }) {
  return (
    <div style={{ padding: '20px 28px 16px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
      <div style={{ flex: 1 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>{title}</h1>
        {subtitle && <div style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 3 }}>{subtitle}</div>}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{actions}</div>
    </div>
  )
}

function MiniStat({ label, value, sub, tint, fg, icon: Ico }) {
  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, padding: '12px 14px', boxShadow: 'var(--shadow-1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{ width: 24, height: 24, borderRadius: 7, background: `color-mix(in oklab, ${tint} 25%, var(--panel))`, color: fg, border: `1px solid color-mix(in oklab, ${tint} 20%, var(--line))`, display: 'grid', placeItems: 'center' }}>
          <Ico size={13} strokeWidth={1.9} />
        </div>
        <span style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 500 }}>{label}</span>
      </div>
      <div className="tnum" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>{sub}</div>
    </div>
  )
}

export default function Inventory() {
  const [filter, setFilter] = useState('all')

  const lowStock = INVENTORY.filter(i => i.status !== 'ok')
  const critical = INVENTORY.filter(i => i.status === 'critical')
  const totalValue = INVENTORY.reduce((s, i) => s + i.stock * i.cost, 0)

  const filtered = filter === 'all' ? INVENTORY
    : filter === 'low' ? INVENTORY.filter(i => i.status !== 'ok')
    : INVENTORY.filter(i => i.cat.toLowerCase() === filter)

  const FILTERS = [
    { id: 'all',       label: 'All',              count: INVENTORY.length },
    { id: 'low',       label: 'Needs attention',  count: lowStock.length },
    { id: 'packing',   label: 'Packing',          count: INVENTORY.filter(i => i.cat === 'Packing').length },
    { id: 'auction',   label: 'Auction',          count: INVENTORY.filter(i => i.cat === 'Auction').length },
    { id: 'equipment', label: 'Equipment',        count: INVENTORY.filter(i => i.cat === 'Equipment').length },
    { id: 'office',    label: 'Office',           count: INVENTORY.filter(i => i.cat === 'Office').length },
  ]

  return (
    <div style={{ flex: 1, overflowY: 'auto', height: '100%' }}>
      <PageHeader
        title="Inventory"
        subtitle={`${INVENTORY.length} items tracked · $${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} on hand · ${lowStock.length} need attention`}
        actions={
          <>
            <button style={btnGhost}><Download size={14} strokeWidth={1.8} /> Export</button>
            <button style={btnPrimary}><Plus size={14} strokeWidth={2} /> Add Item</button>
          </>
        }
      />

      <div style={{ padding: '0 28px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <MiniStat label="Total items"        value={String(INVENTORY.length)}        sub="across 4 locations"              tint="#ECEEF2" fg="#3E5C86" icon={Box}           />
        <MiniStat label="Inventory value"    value={`$${(totalValue / 1000).toFixed(1)}k`} sub="at unit cost"             tint="#E3EEE8" fg="#2F7A55" icon={Wallet}        />
        <MiniStat label="Below par"          value={String(lowStock.length)}         sub={`${critical.length} critical`}   tint="#F5ECD6" fg="#7A5417" icon={AlertTriangle} />
        <MiniStat label="Auto-reorder queue" value="6"                               sub="$842 estimated"                  tint="#ECE6F4" fg="#5C3F88" icon={RefreshCw}     />
      </div>

      {critical.length > 0 && (
        <div style={{ padding: '16px 28px 0' }}>
          <div style={{ background: 'color-mix(in oklab, #F1E1E1 28%, var(--panel))', border: '1px solid color-mix(in oklab, #A14646 30%, var(--line))', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: '#F1E1E1', color: '#A14646', display: 'grid', placeItems: 'center' }}>
              <AlertTriangle size={15} strokeWidth={2} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-1)' }}>{critical.length} items at critical stock</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 1 }}>{critical.map(i => i.name).join(' · ')}</div>
            </div>
            <button style={{ ...btnPrimary, background: '#A14646' }}>Reorder now</button>
          </div>
        </div>
      )}

      <div style={{ padding: '18px 28px 12px', display: 'flex', gap: 6, alignItems: 'center' }}>
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{ padding: '5px 11px', borderRadius: 999, border: '1px solid ' + (filter === f.id ? '#C8CFD8' : 'var(--line)'), background: filter === f.id ? 'var(--accent-soft)' : 'var(--panel)', color: filter === f.id ? 'var(--accent-ink)' : 'var(--ink-2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {f.label} <span style={{ opacity: 0.65, marginLeft: 2 }}>{f.count}</span>
          </button>
        ))}
      </div>

      <div style={{ padding: '0 28px 28px' }}>
        <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-1)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1.4fr 1.4fr 90px 90px 36px', gap: 12, padding: '10px 16px', background: 'var(--bg-2)', borderBottom: '1px solid var(--line)', fontSize: 10.5, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            <span>Item</span><span>Category</span><span>Stock level</span><span>Location</span>
            <span style={{ textAlign: 'right' }}>Unit cost</span>
            <span style={{ textAlign: 'right' }}>Value</span>
            <span />
          </div>
          {filtered.map((item, i) => {
            const chip = CAT_CHIP[item.cat] || { bg: 'var(--hover)', fg: 'var(--ink-3)' }
            const pct = Math.min((item.stock / item.par) * 100, 150)
            const barColor = item.status === 'critical' ? '#A14646' : item.status === 'low' ? '#C8A14A' : '#2F7A55'
            return (
              <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1.4fr 1.4fr 90px 90px 36px', gap: 12, padding: '12px 16px', alignItems: 'center', borderBottom: i < filtered.length - 1 ? '1px solid var(--line-2)' : 'none', fontSize: 12.5 }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--ink-1)' }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 1 }}>Last ordered {item.lastOrder} · {item.vendor}</div>
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 600, color: chip.fg, background: chip.bg, padding: '2px 8px', borderRadius: 999, justifySelf: 'start' }}>{item.cat}</span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 4 }}>
                    <span className="tnum" style={{ fontSize: 13, fontWeight: 600, color: item.status !== 'ok' ? barColor : 'var(--ink-1)' }}>{item.stock}</span>
                    <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>/ {item.par} {item.unit}</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--bg-2)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: barColor, borderRadius: 2 }} />
                  </div>
                </div>
                <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{item.location}</span>
                <span className="tnum" style={{ textAlign: 'right', fontSize: 12 }}>${item.cost.toFixed(2)}</span>
                <span className="tnum" style={{ textAlign: 'right', fontWeight: 600 }}>${(item.stock * item.cost).toFixed(0)}</span>
                <button style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-3)', display: 'grid', placeItems: 'center' }}>
                  <MoreHorizontal size={14} />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const btnPrimary = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: 'white', fontWeight: 600, fontSize: 12.5, cursor: 'pointer', boxShadow: '0 1px 2px rgba(43,68,104,0.25)', fontFamily: 'inherit' }
const btnGhost   = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--panel)', fontWeight: 500, fontSize: 12.5, cursor: 'pointer', color: 'var(--ink-2)', fontFamily: 'inherit' }
