import { useState, useEffect } from 'react'
import { Plus, Search, Copy, Pencil, Trash2, FileText, CheckCheck, X, Save } from 'lucide-react'
import { supabase } from '../lib/supabase'
import logger from '../lib/logger'
import { useAuth } from '../lib/AuthContext'

const CATEGORIES = ['Follow-up', 'Intro', 'Estimate', 'Thank You', 'Scheduling', 'Other']

const CAT_META = {
  'Follow-up':  { color: '#3E5C86', emoji: '📬' },
  'Intro':      { color: '#2F7A55', emoji: '👋' },
  'Estimate':   { color: '#C28A2A', emoji: '💰' },
  'Thank You':  { color: '#A50050', emoji: '🙏' },
  'Scheduling': { color: '#7A5CA5', emoji: '📅' },
  'Other':      { color: '#6B7280', emoji: '📄' },
}

const EMPTY_TEMPLATE = { name: '', category: 'Follow-up', subject: '', body: '' }

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'var(--bg)',
  border: '1px solid var(--line)',
  borderRadius: 8,
  padding: '8px 11px',
  fontSize: 13,
  color: 'var(--ink-1)',
  outline: 'none',
  fontFamily: 'inherit',
}

function copyText(text) { navigator.clipboard.writeText(text) }

function EditModal({ template, onClose, onSave }) {
  const isNew = !template?.id
  const [form, setForm] = useState(template ? { ...template } : { ...EMPTY_TEMPLATE })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave() {
    if (!form.name.trim() || !form.subject.trim() || !form.body.trim()) {
      setError('Name, subject, and body are required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave(form)
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: 'var(--panel)', border: '1px solid var(--line)',
        borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto',
      }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-1)' }}>
            {isNew ? 'New Template' : 'Edit Template'}
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--panel)', display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink-3)' }}>
            <X size={14} strokeWidth={1.8} />
          </button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 5 }}>Name</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Template name" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 5 }}>Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)} style={inputStyle}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 5 }}>Subject line</label>
            <input value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="Email subject…" style={inputStyle} />
          </div>

          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 5 }}>Body</label>
            <textarea
              value={form.body}
              onChange={e => set('body', e.target.value)}
              placeholder="Email body… Use {{name}}, {{agent_name}}, {{date}} as variables."
              rows={10}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {error && <div style={{ fontSize: 12, color: '#ef4444' }}>{error}</div>}
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 9, border: 'none', background: 'var(--accent)', color: 'white', fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}>
            <Save size={13} strokeWidth={1.8} /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Templates() {
  const { organizationId } = useAuth()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState(null)
  const [search, setSearch]       = useState('')
  const [filterCat, setFilterCat] = useState('All')
  const [copied, setCopied]       = useState(null)
  const [editTemplate, setEditTemplate] = useState(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => { fetchTemplates() }, [])

  async function fetchTemplates() {
    setLoading(true)
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) logger.error('Fetch templates failed', error)
    setTemplates(data || [])
    setLoading(false)
  }

  async function handleSave(form) {
    if (form.id) {
      const { error } = await supabase
        .from('email_templates')
        .update({ name: form.name, category: form.category, subject: form.subject, body: form.body, updated_at: new Date().toISOString() })
        .eq('id', form.id)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await supabase
        .from('email_templates')
        .insert({ name: form.name, category: form.category, subject: form.subject, body: form.body, organization_id: organizationId })
      if (error) throw new Error(error.message)
    }
    await fetchTemplates()
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('email_templates').delete().eq('id', id)
    if (error) { logger.error('Delete template failed', error); return }
    setTemplates(ts => ts.filter(t => t.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  const filtered = templates.filter(t => {
    if (filterCat !== 'All' && t.category !== filterCat) return false
    if (search) {
      const q = search.toLowerCase()
      if (!t.name.toLowerCase().includes(q) && !t.body.toLowerCase().includes(q)) return false
    }
    return true
  })

  function handleCopy(t) {
    copyText(`Subject: ${t.subject}\n\n${t.body}`)
    setCopied(t.id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Pane 1: Category rail */}
      <div style={{ width: 180, flexShrink: 0, borderRight: '1px solid var(--line)', background: 'var(--sidebar)', padding: '14px 10px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 6px 8px' }}>Categories</div>

        {[{ label: 'All Templates', key: 'All', count: templates.length },
          ...CATEGORIES.map(c => ({ label: c, key: c, count: templates.filter(t => t.category === c).length, ...CAT_META[c] }))
        ].map(({ label, key, count, color, emoji }) => {
          const active = filterCat === key
          return (
            <button key={key} onClick={() => { setFilterCat(key); setSelected(null) }} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 8px', borderRadius: 8, border: 'none',
              background: active ? 'var(--panel)' : 'transparent',
              boxShadow: active ? 'var(--shadow-1)' : 'none',
              cursor: 'pointer', textAlign: 'left', width: '100%', marginBottom: 1,
            }}>
              {emoji ? (
                <span style={{ fontSize: 13, lineHeight: 1 }}>{emoji}</span>
              ) : (
                <FileText size={13} strokeWidth={1.8} color={active ? 'var(--accent)' : 'var(--ink-4)'} />
              )}
              <span style={{ flex: 1, fontSize: 12.5, fontWeight: active ? 600 : 500, color: active ? 'var(--ink-1)' : 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
              {count > 0 && (
                <span style={{ fontSize: 10.5, fontWeight: 600, color: active ? (color || 'var(--accent-ink)') : 'var(--ink-4)', background: active ? `${color || 'var(--accent)'}18` : 'transparent', padding: '1px 6px', borderRadius: 999 }}>{count}</span>
              )}
            </button>
          )
        })}

        <div style={{ flex: 1 }} />
        <button
          onClick={() => { setEditTemplate(null); setShowModal(true) }}
          className="btn btn-primary"
          style={{ width: '100%', marginTop: 12, fontSize: 12, padding: '7px 10px', borderRadius: 10 }}
        >
          <Plus size={12} strokeWidth={2.5} /> New Template
        </button>
      </div>

      {/* Pane 2: Template list */}
      <div style={{ width: 280, flexShrink: 0, borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
        <div style={{ padding: '10px', borderBottom: '1px solid var(--line)', background: 'var(--panel)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 9, padding: '7px 10px' }}>
            <Search size={13} color="var(--ink-4)" strokeWidth={1.8} />
            <input placeholder="Search templates…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: 'var(--ink-1)', fontFamily: 'inherit' }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 6, paddingLeft: 2 }}>
            {loading ? 'Loading…' : `${filtered.length} template${filtered.length !== 1 ? 's' : ''}`}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {!loading && filtered.map(t => {
            const meta = CAT_META[t.category] || { color: '#6B7280' }
            const isSelected = selected?.id === t.id
            return (
              <button key={t.id} onClick={() => setSelected(t)} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                width: '100%', padding: '11px 12px',
                border: 'none', borderBottom: '1px solid var(--line-2)',
                background: isSelected ? 'var(--accent-soft)' : 'var(--panel)',
                cursor: 'pointer', textAlign: 'left', transition: 'background 100ms',
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  background: `${meta.color}15`, border: `1px solid ${meta.color}25`,
                  display: 'grid', placeItems: 'center', fontSize: 14,
                }}>{CAT_META[t.category]?.emoji || '📄'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: isSelected ? 'var(--accent-ink)' : 'var(--ink-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>{t.category}</div>
                </div>
                {isSelected && <div style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 6 }}>●</div>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Pane 3: Template detail */}
      <div style={{ flex: 1, overflow: 'auto', background: 'var(--panel)' }}>
        {!selected ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ink-4)', gap: 8 }}>
            <FileText size={32} strokeWidth={1.5} />
            <div style={{ fontSize: 13, fontWeight: 500 }}>Select a template to preview</div>
          </div>
        ) : (() => {
          const meta = CAT_META[selected.category] || { color: '#6B7280', emoji: '📄' }
          return (
            <div style={{ padding: '24px 28px', maxWidth: 660 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${meta.color}15`, border: `1px solid ${meta.color}25`, display: 'grid', placeItems: 'center', fontSize: 22, flexShrink: 0 }}>
                  {meta.emoji}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-1)', letterSpacing: '-0.02em' }}>{selected.name}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, background: `${meta.color}15`, color: meta.color, border: `1px solid ${meta.color}30`, padding: '2px 8px', borderRadius: 999, display: 'inline-block', marginTop: 5 }}>{selected.category}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => { setEditTemplate(selected); setShowModal(true) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink-2)', fontSize: 12, cursor: 'pointer' }}
                  >
                    <Pencil size={11} strokeWidth={1.8} />
                  </button>
                  <button
                    onClick={() => { if (window.confirm('Delete this template?')) handleDelete(selected.id) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--lose)', fontSize: 12, cursor: 'pointer' }}
                  >
                    <Trash2 size={11} strokeWidth={1.8} />
                  </button>
                </div>
              </div>

              <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Subject line</div>
                <div style={{ fontSize: 13, color: 'var(--ink-1)', fontWeight: 500 }}>{selected.subject}</div>
              </div>

              <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '14px', marginBottom: 16 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Message body</div>
                <pre style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.65, whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>{selected.body}</pre>
              </div>

              <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginBottom: 16 }}>
                Variables: <code style={{ background: 'var(--bg)', padding: '1px 5px', borderRadius: 4, fontSize: 11 }}>{'{{name}}'}</code>{' '}
                <code style={{ background: 'var(--bg)', padding: '1px 5px', borderRadius: 4, fontSize: 11 }}>{'{{agent_name}}'}</code>{' '}
                <code style={{ background: 'var(--bg)', padding: '1px 5px', borderRadius: 4, fontSize: 11 }}>{'{{date}}'}</code>
              </div>

              <button
                onClick={() => handleCopy(selected)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, border: 'none', background: copied === selected.id ? 'var(--win)' : 'var(--accent)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background 200ms' }}
              >
                {copied === selected.id ? <CheckCheck size={14} strokeWidth={2} /> : <Copy size={14} strokeWidth={1.8} />}
                {copied === selected.id ? 'Copied!' : 'Copy to clipboard'}
              </button>
            </div>
          )
        })()}
      </div>

      {showModal && (
        <EditModal
          template={editTemplate}
          onClose={() => { setShowModal(false); setEditTemplate(null) }}
          onSave={async (form) => {
            await handleSave(form)
            if (editTemplate) {
              // refresh selected if we just edited it
              setSelected(prev => prev?.id === editTemplate.id ? { ...prev, ...form } : prev)
            }
          }}
        />
      )}
    </div>
  )
}
