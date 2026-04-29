import { useState, useEffect, useMemo } from 'react'
import { CalendarDays } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { supabase } from '../lib/supabase'

export default function CTBidsLiveTab({ PROFIT_THRESHOLD, D, onSwitchTab }) {
  const [summary, setSummary] = useState(undefined) // undefined = loading, null = no data
  const [lots, setLots] = useState([])
  const [lastUpdated, setLastUpdated] = useState(null)
  const [minutesAgo, setMinutesAgo] = useState(0)
  const [countdown, setCountdown] = useState('')
  const [countdownColor, setCountdownColor] = useState('var(--ink-2)')

  async function fetchData() {
    try {
      const [sumRes, lotsRes] = await Promise.all([
        supabase.from('ctbids_live_summary').select('*').eq('is_active', true).limit(1),
        supabase.from('ctbids_live').select('*').order('current_bid', { ascending: false }),
      ])
      setSummary(sumRes.data?.[0] || null)
      setLots(lotsRes.data || [])
      setLastUpdated(new Date())
      setMinutesAgo(0)
    } catch {
      setSummary(null)
      setLots([])
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Update "X min ago" every minute
  useEffect(() => {
    if (!lastUpdated) return
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - lastUpdated.getTime()) / 60000)
      setMinutesAgo(diff)
    }, 60000)
    return () => clearInterval(interval)
  }, [lastUpdated])

  // Countdown timer
  useEffect(() => {
    if (!summary?.auction_end_date) return
    function update() {
      const end = new Date(summary.auction_end_date)
      const diff = end - Date.now()
      if (diff <= 0) { setCountdown('Ended'); setCountdownColor('var(--ink-4)'); return }
      const totalH = Math.floor(diff / 3600000)
      const d = Math.floor(totalH / 24)
      const h = totalH % 24
      const m = Math.floor((diff % 3600000) / 60000)
      if (diff < 6 * 3600000) {
        setCountdown(`Ending soon! ${h}h ${m}m`)
        setCountdownColor('var(--lose)')
      } else if (diff < 24 * 3600000) {
        setCountdown(`Ends in ${h}h ${m}m`)
        setCountdownColor('var(--warn)')
      } else {
        setCountdown(`Ends in ${d}d ${h}h`)
        setCountdownColor('var(--ink-2)')
      }
    }
    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [summary])

  // Derived stats
  const abovePT = lots.filter(l => (l.current_bid || 0) >= PROFIT_THRESHOLD)
  const belowPT = lots.filter(l => (l.current_bid || 0) < PROFIT_THRESHOLD && (l.current_bid || 0) > 0)
  const totalBidSum = lots.reduce((s, l) => s + (l.current_bid || 0), 0)
  const abovePct = lots.length ? Math.round(abovePT.length / lots.length * 100) : 0
  const belowPct = lots.length ? Math.round(belowPT.length / lots.length * 100) : 0

  // Category breakdown
  const catData = useMemo(() => {
    const map = {}
    for (const lot of lots) {
      const cat = lot.category || (lot.title?.split(' ')[0]) || 'Uncategorized'
      if (!map[cat]) map[cat] = { cat, total: 0, count: 0 }
      map[cat].total += lot.current_bid || 0
      map[cat].count++
    }
    let arr = Object.values(map).sort((a, b) => b.total - a.total)
    if (arr.length > 10) {
      const other = arr.slice(10).reduce((s, c) => ({ cat: 'Other', total: s.total + c.total, count: s.count + c.count }), { cat: 'Other', total: 0, count: 0 })
      arr = [...arr.slice(0, 10), other]
    }
    return arr
  }, [lots])

  // Loading state
  if (summary === undefined) {
    return (
      <div style={{ padding: '0 28px 36px' }}>
        <div style={{ background: 'var(--bg-2)', borderRadius: 10, height: 200, animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>
    )
  }

  // No active auction
  if (!summary) {
    const lastSale = D?.sales?.[0]
    return (
      <div style={{ padding: '0 28px 36px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0 40px', gap: 12 }}>
          <CalendarDays size={48} color="var(--ink-4)" strokeWidth={1.4} />
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-1)', letterSpacing: '-0.01em' }}>No Active Auction</div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', textAlign: 'center', maxWidth: 400, lineHeight: 1.6 }}>
            Your next auction's data will appear here automatically when it goes live on CTBids.
          </div>
        </div>

        {lastSale && (
          <div style={{ maxWidth: 480, margin: '0 auto', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, padding: '18px 20px', boxShadow: 'var(--shadow-1)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Last Completed Auction</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-1)', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {lastSale.title.replace(/ Online Auction.*$/, '').replace(/ - Ends.*$/, '').replace(/–.*$/, '').trim()}
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              <div>
                <div style={{ fontSize: 10.5, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Items</div>
                <div style={{ fontSize: 16, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{lastSale.items}</div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Revenue</div>
                <div style={{ fontSize: 16, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>${Math.round(lastSale.rev).toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Avg Price</div>
                <div style={{ fontSize: 16, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>${Math.round(lastSale.avgPrice)}</div>
              </div>
            </div>
            <button
              onClick={() => onSwitchTab('auctions')}
              style={{ marginTop: 14, fontSize: 12, color: 'var(--accent-ink)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}
            >
              View auction history →
            </button>
          </div>
        )}
      </div>
    )
  }

  // Active auction
  return (
    <div style={{ padding: '0 28px 36px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink-1)' }}>
              {summary.sale_title}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: '#2F7A55', background: '#E3EEE8', padding: '3px 10px', borderRadius: 999 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2F7A55', display: 'inline-block', animation: 'livePulse 1.8s ease-in-out infinite' }} />
              Live
            </span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: countdownColor }}>{countdown}</div>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-4)', textAlign: 'right' }}>
          Last updated: {minutesAgo === 0 ? 'just now' : `${minutesAgo} min ago`}
          <button onClick={fetchData} style={{ marginLeft: 8, fontSize: 11, color: 'var(--accent-ink)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}>↻ Refresh</button>
        </div>
      </div>

      {/* CSS animation for live pulse */}
      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.35); }
        }
      `}</style>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
        {[
          { label: 'Total Items', value: lots.length, color: 'var(--ink-1)' },
          { label: 'Current Bid Total', value: `$${totalBidSum.toLocaleString()}`, color: 'var(--ink-1)' },
          { label: `Above $${PROFIT_THRESHOLD}`, value: `${abovePT.length} (${abovePct}%)`, color: '#2F7A55' },
          { label: `Below $${PROFIT_THRESHOLD}`, value: `${belowPT.length} (${belowPct}%)`, color: '#D97706' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, padding: '12px 14px', boxShadow: 'var(--shadow-1)' }}>
            <div style={{ fontSize: 10.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 600, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Profitability gauge */}
      {lots.length > 0 && (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 16px', marginBottom: 18, boxShadow: 'var(--shadow-1)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 8 }}>Lot Profitability</div>
          <div style={{ display: 'flex', height: 28, borderRadius: 8, overflow: 'hidden', gap: 2 }}>
            <div style={{ flex: abovePct, background: '#2F7A55', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'white', minWidth: abovePct > 5 ? 'auto' : 0 }}>
              {abovePct > 8 ? `${abovePct}%` : ''}
            </div>
            <div style={{ flex: 100 - abovePct, background: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'white', minWidth: (100 - abovePct) > 5 ? 'auto' : 0 }}>
              {(100 - abovePct) > 8 ? `${100 - abovePct}%` : ''}
            </div>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 6 }}>
            <span style={{ color: '#2F7A55', fontWeight: 600 }}>{abovePT.length} profitable lots</span>
            {' / '}
            <span style={{ color: '#D97706', fontWeight: 600 }}>{belowPT.length} at risk</span>
          </div>
        </div>
      )}

      {/* Two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 14, marginBottom: 18 }}>
        {/* Top Performers */}
        <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-1)' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line-2)', fontSize: 13, fontWeight: 600 }}>Top Performers</div>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 500 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 100px 60px 1fr', gap: 10, padding: '8px 16px', fontSize: 10.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, background: 'var(--bg-2)' }}>
                <span>Item Name</span><span>Current Bid</span><span>Bids</span><span>Category</span>
              </div>
              {lots.slice(0, 10).map((lot, i) => (
                <div
                  key={lot.lot_number || i}
                  onClick={() => lot.sale_url && window.open(lot.sale_url, '_blank')}
                  style={{
                    display: 'grid', gridTemplateColumns: '2fr 100px 60px 1fr', gap: 10,
                    padding: '10px 16px', alignItems: 'center', fontSize: 12.5,
                    borderLeft: `3px solid ${(lot.current_bid || 0) >= PROFIT_THRESHOLD ? '#2F7A55' : '#D97706'}`,
                    borderBottom: i < Math.min(lots.length, 10) - 1 ? '1px solid var(--line-2)' : 'none',
                    cursor: lot.sale_url ? 'pointer' : 'default',
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--bg-2)'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ fontWeight: 600, color: 'var(--ink-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lot.title}</span>
                  <span style={{ fontWeight: 600, color: '#2F7A55', fontVariantNumeric: 'tabular-nums' }}>${(lot.current_bid || 0).toLocaleString()}</span>
                  <span style={{ color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums' }}>{lot.bid_count || 0}</span>
                  <span style={{ color: 'var(--ink-3)', fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lot.category || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Below Threshold */}
        <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-1)' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line-2)' }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Below ${PROFIT_THRESHOLD} Threshold</div>
            <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>These lots may not cover labor costs</div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 320 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 90px 50px', gap: 10, padding: '8px 16px', fontSize: 10.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, background: 'var(--bg-2)' }}>
                <span>Item Name</span><span>Bid</span><span>Bids</span>
              </div>
              {belowPT.slice(0, 10).map((lot, i) => (
                <div
                  key={lot.lot_number || i}
                  style={{
                    display: 'grid', gridTemplateColumns: '2fr 90px 50px', gap: 10,
                    padding: '10px 16px', alignItems: 'center', fontSize: 12.5,
                    borderLeft: '3px solid #D97706',
                    borderBottom: i < Math.min(belowPT.length, 10) - 1 ? '1px solid var(--line-2)' : 'none',
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--bg-2)'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ fontWeight: 500, color: 'var(--ink-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>{lot.title}</span>
                  <span style={{ color: '#D97706', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>${(lot.current_bid || 0).toLocaleString()}</span>
                  <span style={{ color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums' }}>{lot.bid_count || 0}</span>
                </div>
              ))}
              {belowPT.length === 0 && (
                <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 12 }}>All lots are above threshold</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Category breakdown chart */}
      {catData.length > 0 && (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, padding: '16px', boxShadow: 'var(--shadow-1)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Current Auction by Category</div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={catData} layout="vertical" margin={{ left: 10, right: 40, top: 0, bottom: 0 }}>
              <XAxis type="number" tickFormatter={v => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="cat" width={120} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value, name) => [`$${value.toLocaleString()}`, 'Total Bids']}
                labelFormatter={label => {
                  const c = catData.find(d => d.cat === label)
                  return `${label} (${c?.count || 0} items)`
                }}
              />
              <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                {catData.map((entry, index) => (
                  <Cell key={index} fill="var(--accent)" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
