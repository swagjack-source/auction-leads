import { useMemo, useState } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, ReferenceLine,
  PieChart, Pie,
} from 'recharts'
import { PROFIT_THRESHOLD } from './CTBids'

function EmptyState({ message }) {
  return (
    <div style={{ background: 'var(--bg-2)', borderRadius: 10, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-4)', fontSize: 13 }}>
      {message}
    </div>
  )
}

function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{subtitle}</div>}
    </div>
  )
}

export default function CTBidsIntelligenceTab({ D }) {
  const [sortCol, setSortCol] = useState('price')
  const [sortDir, setSortDir] = useState('desc')

  // 7A: List More / Skip
  const listMore = D.categories
    .filter(c => (c.avg || 0) > 100 && (c.bids || 0) > 5 && c.sold > 10)
    .sort((a, b) => (b.avg * b.sold) - (a.avg * a.sold))
    .slice(0, 5)

  const skipCats = D.categories
    .filter(c => (c.avg || 0) < 40 && (c.bids || 0) < 3)
    .sort((a, b) => (a.avg || 0) - (b.avg || 0))
    .slice(0, 5)

  // 7B: Monthly Revenue
  const monthlyData = useMemo(() => D.monthly
    .filter(m => m.month && m.year && (m.online + m.auction) > 0)
    .map(m => ({
      label: `${m.month.slice(0, 3)} ${String(m.year).slice(-2)}`,
      revenue: m.online + m.auction,
    })), [D.monthly])

  // 7C: Avg Sale Price Trend
  const auctionTrend = useMemo(() => D.sales.map((s, i) => ({
    name: `Auction ${i + 1}`,
    shortName: s.title.split(':')[0].slice(0, 20),
    avgPrice: Math.round(s.avgPrice || 0),
  })), [D.sales])

  // 7E: Donuts
  const sellThrough = parseFloat(D.summary['Sell-Through Rate']) || 97
  const sold = D.summary['Total Items Sold'] || 0
  const listed = D.summary['Total Items Listed'] || 0
  const unsold = Math.max(0, listed - sold)
  const sellData = [
    { name: 'Sold', value: sold, fill: '#2F7A55' },
    { name: 'Unsold', value: unsold, fill: '#E5E7EB' },
  ]

  const paidRateRaw = D.summary['Paid Rate'] || '91.7%'
  const paidRate = parseFloat(paidRateRaw) || 91.7
  const unpaid = D.summary['Unpaid Invoices'] || 0
  const paidCount = Math.round(listed * paidRate / 100)
  const payData = [
    { name: 'Paid', value: paidCount, fill: '#2563EB' },
    { name: 'Unpaid', value: unpaid, fill: '#FCA5A5' },
  ]
  const unpaidHighAlert = unpaid > listed * 0.1

  // 7F: Fulfillment
  const fulfillmentData = D.sales.map((s, i) => ({
    name: `A${i + 1}`,
    pickup: Math.round(s.items * (s.pickupPct || 0)),
    shipping: Math.round(s.items * (1 - (s.pickupPct || 0))),
  }))

  // 7G: Top Sellers table
  const topSellers = useMemo(() => {
    let arr = [...(D.topItems || [])].sort((a, b) => {
      const av = sortCol === 'price' ? a.price : sortCol === 'bids' ? (a.bids || 0) : 0
      const bv = sortCol === 'price' ? b.price : sortCol === 'bids' ? (b.bids || 0) : 0
      return sortDir === 'desc' ? bv - av : av - bv
    })
    return arr.slice(0, 20)
  }, [D.topItems, sortCol, sortDir])

  function toggleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortCol(col); setSortDir('desc') }
  }

  const rowBg = [
    '#FEF3C7', // gold
    '#F9FAFB', // silver
    '#FEF2EE', // bronze
  ]

  return (
    <div style={{ padding: '0 28px 36px', display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* 7A: List More / Skip */}
      <div>
        <SectionHeader title="Listing Strategy" subtitle="Based on category performance across all auctions" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* List More Of */}
          <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-1)' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={16} color="#2F7A55" strokeWidth={2} />
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>List More Of</span>
            </div>
            {listMore.length === 0 ? (
              <div style={{ padding: 16, color: 'var(--ink-4)', fontSize: 12 }}>Not enough data yet</div>
            ) : listMore.map((c, i) => (
              <div key={c.cat} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', gap: 10, padding: '10px 16px', alignItems: 'center', fontSize: 12.5, borderLeft: '3px solid #2F7A55', borderBottom: i < listMore.length - 1 ? '1px solid var(--line-2)' : 'none' }}>
                <span style={{ fontWeight: 600, color: 'var(--ink-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.cat}</span>
                <span style={{ color: '#2F7A55', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>${Math.round(c.avg)} avg</span>
                <span style={{ color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums' }}>{c.sold} sold</span>
              </div>
            ))}
          </div>

          {/* Consider Skipping */}
          <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-1)' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingDown size={16} color="#DC2626" strokeWidth={2} />
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>Consider Skipping</span>
            </div>
            {skipCats.length === 0 ? (
              <div style={{ padding: 16, color: 'var(--ink-4)', fontSize: 12 }}>No underperforming categories found</div>
            ) : skipCats.map((c, i) => (
              <div key={c.cat} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', gap: 10, padding: '10px 16px', alignItems: 'center', fontSize: 12.5, borderLeft: '3px solid #DC2626', borderBottom: i < skipCats.length - 1 ? '1px solid var(--line-2)' : 'none' }}>
                <span style={{ fontWeight: 600, color: 'var(--ink-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.cat}
                  {c.sold < 5 && <span style={{ fontSize: 10.5, color: 'var(--ink-4)', fontWeight: 400, marginLeft: 6 }}>(low sample)</span>}
                </span>
                <span style={{ color: '#DC2626', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>${Math.round(c.avg)} avg</span>
                <span style={{ color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums' }}>{(c.bids || 0).toFixed(1)} bids</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 7B: Revenue by Month */}
      <div>
        <SectionHeader title="Auction Revenue Over Time" />
        {monthlyData.length < 3 ? (
          <EmptyState message="More data needed for trends (need at least 3 months)" />
        ) : (
          <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, padding: '16px', boxShadow: 'var(--shadow-1)' }}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyData} margin={{ left: 0, right: 20, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line-2)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']}
                  contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 10, fontSize: 12 }}
                />
                <Line
                  type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2}
                  dot={monthlyData.length <= 12}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 7C: Avg Sale Price Trend */}
      <div>
        <SectionHeader title="Average Sale Price Trend" subtitle={`Auctions above the $${PROFIT_THRESHOLD} threshold are profitable`} />
        {auctionTrend.length < 3 ? (
          <EmptyState message="Need at least 3 auctions for trend analysis" />
        ) : (
          <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, padding: '16px', boxShadow: 'var(--shadow-1)' }}>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={auctionTrend} margin={{ left: 0, right: 20, top: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line-2)" />
                <XAxis dataKey="shortName" tick={{ fontSize: 10, angle: -30, textAnchor: 'end' }} />
                <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => [`$${value}`, 'Avg Sale Price']}
                  contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 10, fontSize: 12 }}
                />
                <ReferenceLine
                  y={PROFIT_THRESHOLD}
                  stroke="#DC2626"
                  strokeDasharray="5 3"
                  label={{ value: `$${PROFIT_THRESHOLD} threshold`, fill: '#DC2626', fontSize: 11, position: 'right' }}
                />
                <Line
                  type="monotone"
                  dataKey="avgPrice"
                  stroke="#2563EB"
                  strokeWidth={2}
                  dot={(props) => {
                    const { cx, cy, payload } = props
                    const profitable = payload.avgPrice >= PROFIT_THRESHOLD
                    return <circle key={`dot-${props.index}`} cx={cx} cy={cy} r={4} fill={profitable ? '#2F7A55' : '#DC2626'} stroke="none" />
                  }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 7E: Donut charts */}
      <div>
        <SectionHeader title="Sell-Through & Payment Health" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* Sell-through donut */}
          <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, padding: '20px', boxShadow: 'var(--shadow-1)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Sell-Through Rate</div>
            <div style={{ position: 'relative', width: 180, height: 180 }}>
              <PieChart width={180} height={180}>
                <Pie data={sellData} cx={90} cy={90} innerRadius={55} outerRadius={80} dataKey="value" startAngle={90} endAngle={-270}>
                  {sellData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                </Pie>
              </PieChart>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#2F7A55', fontVariantNumeric: 'tabular-nums' }}>{sellThrough.toFixed(1)}%</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 8, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
              {sold.toLocaleString()} sold, {unsold.toLocaleString()} unsold
            </div>
          </div>

          {/* Payment rate donut */}
          <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, padding: '20px', boxShadow: 'var(--shadow-1)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Payment Rate</div>
            <div style={{ position: 'relative', width: 180, height: 180 }}>
              <PieChart width={180} height={180}>
                <Pie data={payData} cx={90} cy={90} innerRadius={55} outerRadius={80} dataKey="value" startAngle={90} endAngle={-270}>
                  {payData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                </Pie>
              </PieChart>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#2563EB', fontVariantNumeric: 'tabular-nums' }}>{paidRate.toFixed(1)}%</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 8, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
              {paidCount.toLocaleString()} paid, {unpaid.toLocaleString()} unpaid
            </div>
            {unpaidHighAlert && (
              <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--warn)', background: 'var(--warn-soft)', padding: '4px 10px', borderRadius: 8, fontWeight: 600 }}>
                ⚠ Unpaid rate exceeds 10%
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 7F: Pickup vs Shipping */}
      <div>
        <SectionHeader title="Fulfillment Method by Auction" />
        {fulfillmentData.length === 0 ? (
          <EmptyState message="No fulfillment data available" />
        ) : (
          <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, padding: '16px', boxShadow: 'var(--shadow-1)' }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={fulfillmentData} margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line-2)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 10, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="pickup" name="Pickup" stackId="a" fill="#2F7A55" />
                <Bar dataKey="shipping" name="Shipping" stackId="a" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 7G: All-Time Top Sellers */}
      <div>
        <SectionHeader title="All-Time Top Sellers" />
        <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, overflowX: 'auto', boxShadow: 'var(--shadow-1)' }}>
          <div style={{ minWidth: 860 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '36px 2fr 1.1fr 100px 60px 1fr', gap: 10, padding: '10px 16px', fontSize: 10.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, borderBottom: '1px solid var(--line)', background: 'var(--bg-2)' }}>
              <span>#</span>
              <span>Item Name</span>
              <span>Category</span>
              <button onClick={() => toggleSort('price')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10.5, color: sortCol === 'price' ? 'var(--accent-ink)' : 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', padding: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
                Sale Price {sortCol === 'price' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
              </button>
              <button onClick={() => toggleSort('bids')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10.5, color: sortCol === 'bids' ? 'var(--accent-ink)' : 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', padding: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
                Bids {sortCol === 'bids' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
              </button>
              <span>Auction</span>
            </div>
            {topSellers.map((it, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '36px 2fr 1.1fr 100px 60px 1fr', gap: 10, padding: '11px 16px', alignItems: 'center', fontSize: 12.5, borderBottom: i < topSellers.length - 1 ? '1px solid var(--line-2)' : 'none', background: i < 3 ? rowBg[i] : 'transparent' }}
                onMouseOver={e => { if (i >= 3) e.currentTarget.style.background = 'var(--bg-2)' }}
                onMouseOut={e => { if (i >= 3) e.currentTarget.style.background = 'transparent' }}>
                <span style={{ fontSize: 11, color: i < 3 ? '#7A5417' : 'var(--ink-4)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontWeight: 600, color: 'var(--ink-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</div>
                </div>
                <span style={{ fontSize: 11.5, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.cat}</span>
                <span style={{ fontWeight: 600, color: 'var(--win)', fontVariantNumeric: 'tabular-nums' }}>${it.price.toLocaleString()}</span>
                <span style={{ color: 'var(--ink-2)', fontVariantNumeric: 'tabular-nums' }}>{it.bids}</span>
                <span style={{ fontSize: 11, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.auction}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
