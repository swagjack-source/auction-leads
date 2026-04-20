import { useState, useEffect, useRef } from 'react'
import DOMPurify from 'dompurify'
import { Plus, Search, BookOpen, Pencil, Trash2, X, ChevronLeft, Bold, Italic, List, Heading2, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const CATEGORIES = ['Onboarding', 'Clean Out', 'Auction', 'Senior Care', 'Sales', 'Operations', 'Safety', 'Tech', 'Other']

const CATEGORY_META = {
  Onboarding:   { color: '#3E5C86', emoji: '🎓', desc: 'Getting started',      display: 'ONBOARDING'  },
  'Clean Out':  { color: '#C28A2A', emoji: '🏠', desc: 'Clean out procedures', display: 'CLEAN OUT'   },
  Auction:      { color: '#7A5CA5', emoji: '🔨', desc: 'Auction procedures',   display: 'AUCTION'     },
  'Senior Care':{ color: '#A50050', emoji: '❤️', desc: 'Working with seniors', display: 'SENIOR CARE' },
  Sales:        { color: '#A50050', emoji: '💼', desc: 'Consults & closing',   display: 'SALES'       },
  Operations:   { color: '#C28A2A', emoji: '⚙️', desc: 'Day-to-day workflow',  display: 'OPERATIONS'  },
  Safety:       { color: '#A14646', emoji: '🦺', desc: 'Safety protocols',     display: 'SAFETY'      },
  Tech:         { color: '#2F7A55', emoji: '💻', desc: 'Tools & software',     display: 'TECH'        },
  Other:        { color: '#6B7280', emoji: '📄', desc: 'Miscellaneous',        display: 'OTHER'       },
}

const EMPTY_GUIDE = { title: '', category: '', content: '', created_by: '' }

const inputStyle = {
  width: '100%', background: 'var(--bg)', border: '1px solid var(--line)',
  borderRadius: 9, padding: '8px 11px', fontSize: 13, color: 'var(--ink-1)',
  outline: 'none', fontFamily: 'inherit',
}

function catColor(cat) { return CATEGORY_META[cat]?.color || '#64748b' }
function catEmoji(cat) { return CATEGORY_META[cat]?.emoji || '📄' }

function readTime(html) {
  const words = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').length
  return Math.max(1, Math.round(words / 200))
}

function RichEditor({ value, onChange }) {
  const ref = useRef(null)
  const lastHtml = useRef(value)

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value
  }, [])

  function handleInput() {
    const html = ref.current.innerHTML
    if (html !== lastHtml.current) { lastHtml.current = html; onChange(html) }
  }

  function exec(cmd, val) { document.execCommand(cmd, false, val); ref.current.focus() }

  const toolBtn = (label, cmd, val, Icon) => (
    <button key={cmd + (val || '')} type="button" onMouseDown={e => { e.preventDefault(); exec(cmd, val) }} title={label}
      style={{ padding: '4px 8px', borderRadius: 5, border: 'none', background: 'var(--bg)', color: 'var(--ink-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: 12 }}>
      {Icon ? <Icon size={13} /> : label}
    </button>
  )

  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 9, overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: 4, padding: '6px 8px', background: 'var(--bg)', borderBottom: '1px solid var(--line-2)', flexWrap: 'wrap' }}>
        {toolBtn('Bold', 'bold', null, Bold)}
        {toolBtn('Italic', 'italic', null, Italic)}
        {toolBtn('H2', 'formatBlock', '<h2>', Heading2)}
        {toolBtn('List', 'insertUnorderedList', null, List)}
      </div>
      <div ref={ref} contentEditable suppressContentEditableWarning onInput={handleInput}
        style={{ minHeight: 220, padding: '12px 14px', fontSize: 14, color: 'var(--ink-1)', background: 'var(--panel)', outline: 'none', lineHeight: 1.6 }} />
    </div>
  )
}

function GuideModal({ guide, onClose, onSave }) {
  const isNew = !guide.id
  const [form, setForm] = useState({ ...EMPTY_GUIDE, ...guide })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave() {
    if (!form.title.trim()) { setError('Title is required'); return }
    if (!form.content?.trim() || form.content === '<br>') { setError('Content is required'); return }
    setSaving(true); setError(null)
    try { await onSave(form); onClose() }
    catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'var(--overlay)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px', overflowY: 'auto', animation: 'fadein 150ms' }}>
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 16, boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 680 }}>
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-1)' }}>{isNew ? 'Create Guide' : 'Edit Guide'}</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--ink-3)' }}><X size={14} /></button>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Title</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Guide title…" style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)} style={inputStyle}>
                <option value="">— Select —</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Created By</label>
              <input value={form.created_by} onChange={e => set('created_by', e.target.value)} placeholder="Your name" style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Content</label>
            <RichEditor value={form.content} onChange={v => set('content', v)} />
          </div>
          {error && <div style={{ fontSize: 12, color: 'var(--lose)' }}>{error}</div>}
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : isNew ? 'Create Guide' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}

function GuideDetail({ guide, onBack, onEdit, onDelete }) {
  const color = catColor(guide.category)
  const mins = readTime(guide.content)
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink-2)', fontSize: 12, fontWeight: 500, cursor: 'pointer', marginBottom: 24 }}>
          <ChevronLeft size={13} /> Back to guides
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 12 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink-1)', lineHeight: 1.25, letterSpacing: '-0.025em', flex: 1, margin: 0 }}>{guide.title}</h1>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginTop: 2 }}>
            <button onClick={onEdit} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--ink-2)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
              <Pencil size={12} strokeWidth={1.8} /> Edit
            </button>
            <button onClick={onDelete} style={{ display: 'flex', alignItems: 'center', padding: '6px 8px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--lose)', cursor: 'pointer' }}>
              <Trash2 size={13} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 24 }}>
          {guide.category && (
            <span style={{ fontSize: 11, fontWeight: 700, background: `${color}15`, color, border: `1px solid ${color}30`, padding: '3px 10px', borderRadius: 999 }}>
              {catEmoji(guide.category)} {guide.category}
            </span>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--ink-4)' }}>
            <Clock size={11} strokeWidth={1.8} /> {mins} min read
          </span>
          {guide.created_by && <span style={{ fontSize: 11.5, color: 'var(--ink-4)' }}>· by {guide.created_by}</span>}
          <span style={{ fontSize: 11.5, color: 'var(--ink-4)' }}>· {new Date(guide.updated_at || guide.created_at).toLocaleDateString()}</span>
        </div>

        <div
          style={{ fontSize: 14.5, lineHeight: 1.75, color: 'var(--ink-1)', background: 'var(--panel)', borderRadius: 14, padding: '24px 28px', border: '1px solid var(--line)' }}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(guide.content) }}
        />
      </div>
    </div>
  )
}

function ModuleCard({ guide, onClick, onEdit, onDelete, index }) {
  const color = catColor(guide.category)
  const mins = readTime(guide.content)
  const progress = index === 0 ? 100 : index === 1 ? 100 : index === 2 ? 85 : index === 3 ? 65 : index === 4 ? 50 : index === 5 ? 40 : index === 6 ? 20 : 0
  const required = index === 5 || index === 7

  let btnLabel = progress === 100 ? 'Review' : progress > 0 ? 'Continue' : 'Start'
  let btnStyle = {
    width: '100%', padding: '8px', borderRadius: 9, fontSize: 12.5, fontWeight: 700,
    cursor: 'pointer', border: 'none', transition: 'opacity 120ms',
    background: progress === 100 ? 'transparent' : 'var(--accent)',
    color: progress === 100 ? 'var(--ink-1)' : 'white',
    border: progress === 100 ? '1px solid var(--line)' : 'none',
  }

  return (
    <div style={{
      background: 'var(--panel)', border: '1px solid var(--line)',
      borderRadius: 14, overflow: 'hidden',
      boxShadow: 'var(--shadow-1)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'var(--bg)', border: '1px solid var(--line)',
            display: 'grid', placeItems: 'center', fontSize: 16,
          }}>🎓</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-1)', lineHeight: 1.25, letterSpacing: '-0.01em' }}>
              {guide.title}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
              <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>{mins} min</span>
              {required && <span style={{ fontSize: 10, fontWeight: 700, color: '#DC2626', background: '#FEE2E2', padding: '1px 6px', borderRadius: 999 }}>Required</span>}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div style={{ background: 'var(--line)', borderRadius: 4, height: 5, overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: progress === 100 ? 'var(--win)' : 'var(--accent)', borderRadius: 4, transition: 'width 0.5s ease' }} />
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--ink-4)', marginTop: 3, textAlign: 'right' }}>{progress}%</div>
        </div>

        {/* Button */}
        <button onClick={onClick} style={btnStyle}>{btnLabel}</button>
      </div>
    </div>
  )
}

export default function Training() {
  const { organizationId } = useAuth()
  const [guides, setGuides]           = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [filterCat, setFilterCat]     = useState('All')
  const [selectedGuide, setSelectedGuide] = useState(null)
  const [modalGuide, setModalGuide]   = useState(null)

  useEffect(() => { fetchGuides() }, [])

  async function fetchGuides() {
    setLoading(true)
    const { data } = await supabase.from('training_guides').select('*').order('created_at', { ascending: false })
    setGuides(data || [])
    setLoading(false)
  }

  async function handleSave(form) {
    const payload = {
      title: form.title.trim(), category: form.category || null,
      content: DOMPurify.sanitize(form.content), created_by: form.created_by || null,
      updated_at: new Date().toISOString(),
      organization_id: organizationId,
    }
    if (!form.id) {
      const { error } = await supabase.from('training_guides').insert(payload)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await supabase.from('training_guides').update(payload).eq('id', form.id)
      if (error) throw new Error(error.message)
    }
    await fetchGuides()
  }

  async function handleDelete(guide) {
    if (!confirm(`Delete "${guide.title}"?`)) return
    await supabase.from('training_guides').delete().eq('id', guide.id)
    setSelectedGuide(null)
    await fetchGuides()
  }

  const categories = ['All', ...CATEGORIES.filter(c => guides.some(g => g.category === c))]

  const filtered = guides.filter(g => {
    if (filterCat !== 'All' && g.category !== filterCat) return false
    if (search && !g.title.toLowerCase().includes(search.toLowerCase()) && !g.category?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  if (selectedGuide) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <GuideDetail
          guide={selectedGuide}
          onBack={() => setSelectedGuide(null)}
          onEdit={() => { setModalGuide(selectedGuide); setSelectedGuide(null) }}
          onDelete={() => handleDelete(selectedGuide)}
        />
        {modalGuide && <GuideModal guide={modalGuide} onClose={() => setModalGuide(null)} onSave={handleSave} />}
      </div>
    )
  }

  const completedCount = Math.min(2, guides.length)
  const inProgressCount = Math.max(0, Math.min(7, guides.length - completedCount))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Page header */}
      <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--line)', background: 'var(--panel)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink-1)', margin: 0, letterSpacing: '-0.02em' }}>Training</h1>
            <p style={{ fontSize: 12.5, color: 'var(--ink-3)', margin: '2px 0 0' }}>
              {completedCount} of {guides.length} modules complete · Your progress
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--ink-2)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', boxShadow: 'var(--shadow-1)' }}>
              Assign to team
            </button>
            <button className="btn btn-primary" onClick={() => setModalGuide({ ...EMPTY_GUIDE })} style={{ fontSize: 12.5, padding: '7px 13px 7px 10px', borderRadius: 10 }}>
              <Plus size={13} strokeWidth={2.5} /> New Module
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {[
            { label: 'Completed',       value: `${completedCount} of ${guides.length || 12}`, sub: '' },
            { label: 'In Progress',     value: inProgressCount,  sub: 'modules' },
            { label: 'Hours this month', value: '8.2',            sub: 'logged' },
            { label: 'Team Average',    value: '82%',            sub: 'completion' },
          ].map(({ label, value, sub }) => (
            <div key={label} style={{ background: 'var(--bg)', borderRadius: 10, padding: '10px 14px', border: '1px solid var(--line)' }}>
              <div className="tnum" style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink-1)', letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</div>
              {sub && <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>{sub}</div>}
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 500, marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Category sections or grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--ink-4)', fontSize: 13, marginTop: 60 }}>Loading guides…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--ink-4)', fontSize: 13, marginTop: 60 }}>
            {guides.length === 0 ? 'No guides yet — create your first one.' : 'No guides match your search.'}
          </div>
        ) : filterCat !== 'All' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, maxWidth: 1100 }}>
            {filtered.map((g, idx) => (
              <ModuleCard key={g.id} guide={g} index={idx} onClick={() => setSelectedGuide(g)} onEdit={() => setModalGuide(g)} onDelete={() => handleDelete(g)} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 1100 }}>
            {CATEGORIES.filter(cat => filtered.some(g => g.category === cat)).map(cat => {
              const catGuides = filtered.filter(g => g.category === cat)
              const color = catColor(cat)
              return (
                <div key={cat}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
                      {CATEGORY_META[cat]?.display || cat.toUpperCase()}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                    {catGuides.map((g, idx) => (
                      <ModuleCard key={g.id} guide={g} index={idx} onClick={() => setSelectedGuide(g)} onEdit={() => setModalGuide(g)} onDelete={() => handleDelete(g)} />
                    ))}
                  </div>
                </div>
              )
            })}
            {filtered.filter(g => !g.category).length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 12 }}>Uncategorized</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                  {filtered.filter(g => !g.category).map((g, idx) => (
                    <ModuleCard key={g.id} guide={g} index={idx} onClick={() => setSelectedGuide(g)} onEdit={() => setModalGuide(g)} onDelete={() => handleDelete(g)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {modalGuide && <GuideModal guide={modalGuide} onClose={() => setModalGuide(null)} onSave={handleSave} />}
    </div>
  )
}
