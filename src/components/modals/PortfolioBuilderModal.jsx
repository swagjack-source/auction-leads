import { useState } from 'react'
import { X, Star, Download, Link, FileText } from 'lucide-react'

const SAMPLE_PROJECTS = [
  { id: 'P1',  name: 'Whitmore Estate — Glencoe',      type: 'Auction',   status: 'Won', bid: 48000, hue: 220 },
  { id: 'P2',  name: 'Johnson Residence — Oak Park',   type: 'Both',      status: 'Won', bid: 22000, hue: 150 },
  { id: 'P3',  name: 'Berger Clean-out — Aurora',      type: 'Clean Out', status: 'Won', bid: 8500,  hue: 40  },
  { id: 'P4',  name: 'Keller Senior Move — Naperville',type: 'Both',      status: 'Won', bid: 31000, hue: 280 },
  { id: 'P5',  name: 'Park Estate — Evanston',         type: 'Auction',   status: 'Won', bid: 55000, hue: 190 },
  { id: 'P6',  name: 'Mercer Downsizing — Hinsdale',   type: 'Both',      status: 'Won', bid: 14800, hue: 330 },
  { id: 'P7',  name: 'Cole Collection — Glenview',     type: 'Auction',   status: 'Won', bid: 39000, hue: 80  },
  { id: 'P8',  name: 'Anderson Home — Lake Forest',    type: 'Clean Out', status: 'Won', bid: 11200, hue: 160 },
]

const drwBtnPrimary = {
  padding: '7px 12px', borderRadius: 8, border: 'none',
  background: 'var(--accent)', color: 'white',
  fontSize: 12, fontWeight: 600, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 6,
}
const drwBtnGhost = {
  padding: '7px 12px', borderRadius: 8, border: '1px solid var(--line)',
  background: 'var(--panel)', color: 'var(--ink-2)',
  fontSize: 12, fontWeight: 600, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 6,
}

export default function PortfolioBuilderModal({ open, onClose }) {
  const [selected, setSelected] = useState({})
  const [title, setTitle] = useState('Homebase — 2026 Project Highlights')
  const [intro, setIntro] = useState('A snapshot of our most impactful senior-move and estate-auction projects this year.')
  const [includePhotos, setIncludePhotos] = useState(true)
  const [includeFinancials, setIncludeFinancials] = useState(false)
  const [includeTestimonials, setIncludeTestimonials] = useState(true)

  const pool = SAMPLE_PROJECTS
  const chosen = pool.filter(p => selected[p.id])

  if (!open) return null

  const inputStyle = {
    width: '100%', padding: '8px 10px', borderRadius: 8,
    border: '1px solid var(--line)', background: 'var(--bg-2)',
    fontFamily: 'inherit', fontSize: 12.5, color: 'var(--ink-1)',
    boxSizing: 'border-box', outline: 'none',
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20,22,26,0.22)', zIndex: 60 }} />
      <div style={{
        position: 'fixed', top: '4vh', left: '50%', transform: 'translateX(-50%)',
        width: 'min(1100px, 94vw)', height: '92vh',
        background: 'var(--bg)', borderRadius: 16, zIndex: 61,
        display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(20,22,26,0.25)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--line)', background: 'var(--panel)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent-ink)', display: 'grid', placeItems: 'center' }}>
              <Star size={15} strokeWidth={1.9} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>Portfolio deck builder</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>Assemble a shareable deck from your best projects</div>
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--panel)', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--ink-2)' }}>
            <X size={15} />
          </button>
        </div>

        {/* Body: 2-col */}
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '320px 1fr' }}>
          {/* Settings rail */}
          <div style={{ borderRight: '1px solid var(--line)', padding: '18px 20px', overflowY: 'auto', background: 'var(--panel)' }}>
            <div style={{ fontSize: 10.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 6 }}>Deck title</div>
            <input value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />

            <div style={{ fontSize: 10.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, margin: '14px 0 6px' }}>Intro</div>
            <textarea value={intro} onChange={e => setIntro(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />

            <div style={{ fontSize: 10.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, margin: '14px 0 8px' }}>Include</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: 'pointer', fontSize: 12.5 }}>
              <input type="checkbox" checked={includePhotos} onChange={e => setIncludePhotos(e.target.checked)} /> Before / after photos
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: 'pointer', fontSize: 12.5 }}>
              <input type="checkbox" checked={includeTestimonials} onChange={e => setIncludeTestimonials(e.target.checked)} /> Client testimonials
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: 'pointer', fontSize: 12.5 }}>
              <input type="checkbox" checked={includeFinancials} onChange={e => setIncludeFinancials(e.target.checked)} /> Revenue figures
            </label>

            <div style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
              <div style={{ fontSize: 10.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 8 }}>Export</div>
              <button style={{ ...drwBtnPrimary, width: '100%', marginBottom: 8, justifyContent: 'center' }}>
                <Download size={13} strokeWidth={1.9} /> Export PDF ({chosen.length} slides)
              </button>
              <button style={{ ...drwBtnGhost, width: '100%', marginBottom: 8, justifyContent: 'center' }}>
                <Link size={13} strokeWidth={1.9} /> Generate shareable link
              </button>
              <button style={{ ...drwBtnGhost, width: '100%', justifyContent: 'center' }}>
                <FileText size={13} strokeWidth={1.9} /> Open in Canva
              </button>
            </div>
          </div>

          {/* Preview */}
          <div style={{ overflowY: 'auto', padding: '20px 24px', background: 'var(--bg)' }}>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pick projects to include</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 24 }}>
              {pool.map(p => {
                const isSel = !!selected[p.id]
                return (
                  <div key={p.id} onClick={() => setSelected({ ...selected, [p.id]: !isSel })} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 10,
                    border: '1.5px solid ' + (isSel ? 'var(--accent)' : 'var(--line)'),
                    background: isSel ? 'var(--accent-soft)' : 'var(--panel)',
                    cursor: 'pointer', transition: 'all 120ms',
                  }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: 4,
                      border: '1.5px solid ' + (isSel ? 'var(--accent)' : 'var(--line)'),
                      background: isSel ? 'var(--accent)' : 'var(--panel)',
                      color: 'white', display: 'grid', placeItems: 'center',
                      fontSize: 10, fontWeight: 700, flexShrink: 0,
                    }}>{isSel && '✓'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{p.type} · {p.status}</div>
                    </div>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-2)', fontVariantNumeric: 'tabular-nums' }}>${(p.bid / 1000).toFixed(0)}k</span>
                  </div>
                )
              })}
            </div>

            {chosen.length > 0 && (
              <>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Preview · {chosen.length + 2} slides</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {/* Title slide */}
                  <div style={{ aspectRatio: '16/10', borderRadius: 8, border: '1px solid var(--line)', background: 'linear-gradient(135deg, var(--accent), var(--accent-ink))', color: 'white', padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    <div style={{ fontSize: 9, opacity: 0.8, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Title</div>
                    <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4, letterSpacing: '-0.005em', lineHeight: 1.3 }}>{title}</div>
                  </div>
                  {/* Intro slide */}
                  <div style={{ aspectRatio: '16/10', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--panel)', padding: '14px 16px' }}>
                    <div style={{ fontSize: 9, color: 'var(--ink-4)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Overview</div>
                    <div style={{ fontSize: 9.5, color: 'var(--ink-2)', marginTop: 6, lineHeight: 1.4 }}>{intro}</div>
                  </div>
                  {/* Project slides */}
                  {chosen.map(p => (
                    <div key={p.id} style={{ aspectRatio: '16/10', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--panel)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ flex: 1, background: `linear-gradient(135deg, oklch(0.82 0.08 ${p.hue}), oklch(0.62 0.11 ${p.hue}))` }} />
                      <div style={{ padding: '6px 8px' }}>
                        <div style={{ fontSize: 10, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                        <div style={{ fontSize: 8.5, color: 'var(--ink-4)' }}>{p.type}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {chosen.length === 0 && (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 12.5 }}>
                Select projects above to preview your deck.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
