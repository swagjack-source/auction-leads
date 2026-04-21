import { useState, useMemo } from 'react'
import { STAGE_META } from './StageColumn'

const CITY_COORDS = {
  'Oak Park':     { x: 0.28, y: 0.58 },
  'Chicago':      { x: 0.44, y: 0.52 },
  'Evanston':     { x: 0.56, y: 0.30 },
  'Wilmette':     { x: 0.62, y: 0.23 },
  'Glenview':     { x: 0.55, y: 0.18 },
  'Winnetka':     { x: 0.68, y: 0.18 },
  'Kenilworth':   { x: 0.65, y: 0.21 },
  'River Forest': { x: 0.26, y: 0.55 },
  'Hinsdale':     { x: 0.20, y: 0.72 },
  'Lake Forest':  { x: 0.76, y: 0.10 },
  'Glencoe':      { x: 0.72, y: 0.14 },
  'Homewood':     { x: 0.40, y: 0.88 },
}

const JOB_STYLE = {
  'Clean Out': { bg: 'var(--b-cleanout-bg)', fg: 'var(--b-cleanout-fg)' },
  'Auction':   { bg: 'var(--b-auction-bg)',  fg: 'var(--b-auction-fg)'  },
  'Both':      { bg: 'var(--b-both-bg)',     fg: 'var(--b-both-fg)'     },
}

function cityFromAddr(addr = '') {
  for (const city of Object.keys(CITY_COORDS)) {
    if (addr.includes(city)) return city
  }
  return 'Chicago'
}

function hash(s = '') {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

const mapChip = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  padding: '3px 8px', borderRadius: 999,
  border: '1px solid var(--line)',
  fontSize: 10.5, fontWeight: 500,
  cursor: 'pointer', background: 'transparent',
  fontFamily: 'inherit',
}
const zoomBtn = {
  width: 30, height: 30, border: 'none',
  background: 'var(--panel)', color: 'var(--ink-2)',
  cursor: 'pointer', fontSize: 16, fontWeight: 500,
  display: 'grid', placeItems: 'center',
  fontFamily: 'inherit',
}
const mapStatCell = { background: 'var(--panel)', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 2 }
const mapStatLabel = { fontSize: 10, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }
const mapStatValue = { fontSize: 14, fontWeight: 600, color: 'var(--ink-1)' }

const STAGES_ALL = [
  'New Lead', 'Contacted', 'In Talks', 'Consult Scheduled', 'Consult Completed',
  'Project Accepted', 'Project Scheduled', 'Won', 'Lost',
]

export default function PipelineMapView({ leads, onOpen }) {
  const [selectedId, setSelectedId] = useState(null)
  const [stageFilter, setStageFilter] = useState('all')

  const points = useMemo(() => leads.map(l => {
    const city = cityFromAddr(l.address)
    const base = CITY_COORDS[city] || CITY_COORDS['Chicago']
    const h = hash(String(l.id))
    const jx = ((h % 100) / 100 - 0.5) * 0.05
    const jy = (((h >> 8) % 100) / 100 - 0.5) * 0.05
    return { ...l, x: base.x + jx, y: base.y + jy, city }
  }), [leads])

  const filtered = stageFilter === 'all' ? points : points.filter(p => p.status === stageFilter)
  const selected = filtered.find(p => p.id === selectedId)

  const cityCounts = useMemo(() => {
    const g = {}
    filtered.forEach(p => g[p.city] = (g[p.city] || 0) + 1)
    return g
  }, [filtered])

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 12, padding: '0 20px 20px' }}>
      {/* Map panel */}
      <div style={{
        flex: 1, minWidth: 0,
        background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14,
        boxShadow: 'var(--shadow-1)', position: 'relative', overflow: 'hidden',
      }}>
        {/* Map canvas */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `
            radial-gradient(ellipse at 75% 40%, color-mix(in oklab, var(--accent-soft) 60%, var(--panel)) 0%, transparent 60%),
            linear-gradient(180deg, color-mix(in oklab, var(--bg-2), var(--panel)) 0%, var(--bg-2) 100%)
          `,
        }}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            <path d="M 82 0 Q 88 30, 85 55 Q 82 75, 90 100 L 100 100 L 100 0 Z"
              fill="color-mix(in oklab, var(--accent) 18%, var(--bg-2))"
              stroke="color-mix(in oklab, var(--accent) 30%, var(--line))" strokeWidth="0.15"/>
            <path d="M 0 50 L 82 50" stroke="var(--line)" strokeWidth="0.25" fill="none"/>
            <path d="M 0 70 L 82 70" stroke="var(--line)" strokeWidth="0.2" fill="none"/>
            <path d="M 30 0 L 30 100" stroke="var(--line)" strokeWidth="0.2" fill="none"/>
            <path d="M 55 0 L 55 100" stroke="var(--line)" strokeWidth="0.25" fill="none"/>
            <rect x="38" y="42" width="6" height="5" fill="color-mix(in oklab, var(--win) 22%, var(--bg-2))" opacity="0.7"/>
            <rect x="48" y="25" width="5" height="4" fill="color-mix(in oklab, var(--win) 22%, var(--bg-2))" opacity="0.7"/>
            {Object.keys(CITY_COORDS).map(city => (
              <text key={city}
                x={CITY_COORDS[city].x * 100} y={CITY_COORDS[city].y * 100 - 4.5}
                textAnchor="middle" fontSize="2" fill="var(--ink-4)" fontWeight="500"
                style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {city}
              </text>
            ))}
            <text x="92" y="30" textAnchor="middle" fontSize="2.2" fill="color-mix(in oklab, var(--accent) 50%, var(--ink-3))" fontWeight="600" style={{ letterSpacing: '0.15em' }}>LAKE</text>
            <text x="92" y="34" textAnchor="middle" fontSize="2.2" fill="color-mix(in oklab, var(--accent) 50%, var(--ink-3))" fontWeight="600" style={{ letterSpacing: '0.15em' }}>MICHIGAN</text>
          </svg>

          {filtered.map(p => {
            const meta = STAGE_META[p.status] || { tint: '#9CA3AF' }
            const isSel = p.id === selectedId
            const hot = (p.deal_score || 0) >= 8
            return (
              <button key={p.id}
                onClick={() => setSelectedId(p.id)}
                title={`${p.name} · ${p.status}`}
                style={{
                  position: 'absolute',
                  left: `${p.x * 100}%`, top: `${p.y * 100}%`,
                  transform: 'translate(-50%, -100%)',
                  border: 'none', background: 'transparent',
                  cursor: 'pointer', padding: 0,
                  zIndex: isSel ? 10 : hot ? 5 : 1,
                }}>
                <div style={{ position: 'relative', width: isSel ? 30 : 22, height: isSel ? 30 : 22, transition: 'all 160ms cubic-bezier(.2,.7,.3,1.2)' }}>
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: meta.tint, border: `2px solid var(--panel)`,
                    borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)',
                    boxShadow: isSel
                      ? `0 4px 12px rgba(0,0,0,0.25), 0 0 0 3px color-mix(in oklab, ${meta.tint} 25%, transparent)`
                      : '0 2px 4px rgba(0,0,0,0.15)',
                  }}/>
                  <div style={{
                    position: 'absolute', left: '50%', top: '42%',
                    transform: 'translate(-50%, -50%)',
                    width: isSel ? 10 : 7, height: isSel ? 10 : 7,
                    borderRadius: '50%', background: 'var(--panel)',
                  }}/>
                  {hot && !isSel && (
                    <div style={{
                      position: 'absolute', top: -2, right: -2,
                      width: 8, height: 8, borderRadius: '50%',
                      background: '#C84A4A', border: '1.5px solid var(--panel)',
                    }}/>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Stage legend */}
        <div style={{ position: 'absolute', bottom: 12, left: 12, maxWidth: 200, background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 10, padding: 10, boxShadow: 'var(--shadow-2)' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Stage</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            <button onClick={() => setStageFilter('all')} style={{ ...mapChip, background: stageFilter === 'all' ? 'var(--accent-soft)' : 'transparent', color: stageFilter === 'all' ? 'var(--accent-ink)' : 'var(--ink-2)', borderColor: stageFilter === 'all' ? 'transparent' : 'var(--line)' }}>All</button>
            {STAGES_ALL.map(s => {
              const meta = STAGE_META[s] || { tint: '#9CA3AF' }
              return (
                <button key={s} onClick={() => setStageFilter(s)} style={{
                  ...mapChip,
                  background: stageFilter === s ? `color-mix(in oklab, ${meta.tint} 20%, var(--panel))` : 'transparent',
                  borderColor: stageFilter === s ? meta.tint : 'var(--line)',
                  color: 'var(--ink-2)',
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.tint }} />
                  {s.split(' ')[0]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Zoom controls */}
        <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', flexDirection: 'column', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 8, boxShadow: 'var(--shadow-2)', overflow: 'hidden' }}>
          <button style={zoomBtn} title="Zoom in">+</button>
          <div style={{ height: 1, background: 'var(--line-2)' }}/>
          <button style={zoomBtn} title="Zoom out">−</button>
        </div>
      </div>

      {/* Right rail */}
      <aside style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'auto' }}>
        {selected ? (
          <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, padding: 16, boxShadow: 'var(--shadow-1)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', marginTop: 5, background: (STAGE_META[selected.status] || {}).tint || '#9CA3AF' }}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-1)', lineHeight: 1.25 }}>{selected.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>{selected.status}</div>
              </div>
              <button onClick={() => setSelectedId(null)} style={{ border: 'none', background: 'transparent', color: 'var(--ink-3)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 2 }}>×</button>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginBottom: 12, lineHeight: 1.4 }}>{selected.address}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--line-2)', borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
              <div style={mapStatCell}>
                <div style={mapStatLabel}>Score</div>
                <div className="tnum" style={{ ...mapStatValue, color: (selected.deal_score || 0) >= 8 ? 'var(--win)' : (selected.deal_score || 0) >= 5 ? 'var(--ink-1)' : 'var(--lose)' }}>
                  {selected.deal_score ? Math.round(selected.deal_score) : '—'}
                </div>
              </div>
              <div style={mapStatCell}>
                <div style={mapStatLabel}>Value</div>
                <div className="tnum" style={mapStatValue}>{selected._scoreDetails?.recommendedBid ? `$${(selected._scoreDetails.recommendedBid / 1000).toFixed(1)}k` : '—'}</div>
              </div>
              <div style={mapStatCell}>
                <div style={mapStatLabel}>Type</div>
                <div style={{ ...mapStatValue, fontSize: 11.5, background: (JOB_STYLE[selected.job_type] || {}).bg || 'var(--bg-2)', color: (JOB_STYLE[selected.job_type] || {}).fg || 'var(--ink-3)', padding: '2px 8px', borderRadius: 4, alignSelf: 'flex-start', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                  {selected.job_type || '—'}
                </div>
              </div>
              <div style={mapStatCell}>
                <div style={mapStatLabel}>Source</div>
                <div style={{ ...mapStatValue, fontSize: 12 }}>{selected.lead_source || '—'}</div>
              </div>
            </div>
            <button onClick={() => onOpen && onOpen(selected)} style={{ width: '100%', padding: '8px 12px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}>
              Open full details
            </button>
          </div>
        ) : (
          <>
            <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, padding: 14, boxShadow: 'var(--shadow-1)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Showing</div>
              <div className="tnum" style={{ fontSize: 26, fontWeight: 600, color: 'var(--ink-1)', letterSpacing: '-0.02em' }}>
                {filtered.length} <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-3)' }}>leads</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                {stageFilter === 'all' ? 'All stages' : stageFilter}
              </div>
            </div>

            <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, padding: 14, boxShadow: 'var(--shadow-1)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>By city</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).map(([city, count]) => {
                  const max = Math.max(...Object.values(cityCounts))
                  return (
                    <div key={city} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ fontSize: 12, color: 'var(--ink-2)', width: 100, minWidth: 100 }}>{city}</div>
                      <div style={{ flex: 1, height: 6, background: 'var(--bg-2)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${(count / max) * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: 3 }}/>
                      </div>
                      <div className="tnum" style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-2)', width: 24, textAlign: 'right' }}>{count}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', padding: '0 4px', lineHeight: 1.5 }}>
              Click a pin to see lead details. Red dot indicates a hot lead (score ≥ 8).
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
