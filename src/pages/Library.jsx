import { useState, useEffect, useRef } from 'react'
import { Plus, Search, X, Upload, FileText, Star, BookOpen, ClipboardList, Megaphone, Scale, FolderOpen, Pin, MoreHorizontal, Download, ExternalLink } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const DOC_TYPES = ['SOP', 'Contract', 'Checklist', 'Marketing', 'Legal', 'Other']

const TYPE_META = {
  'SOP':       { label: 'SOP',  bg: '#DBEAFE', fg: '#1D4ED8', icon: BookOpen },
  'Contract':  { label: 'DOC',  bg: '#FCE7F3', fg: '#9D174D', icon: FileText },
  'Checklist': { label: 'LIST', bg: '#D1FAE5', fg: '#065F46', icon: ClipboardList },
  'Marketing': { label: 'IMG',  bg: '#FEF3C7', fg: '#92400E', icon: Megaphone },
  'Legal':     { label: 'PDF',  bg: '#EDE9FE', fg: '#5B21B6', icon: Scale },
  'Other':     { label: 'DOC',  bg: '#F3F4F6', fg: '#374151', icon: FileText },
}

const NAV_ITEMS = [
  { label: 'All Documents', key: 'All',       icon: FolderOpen },
  { label: 'SOPs',          key: 'SOP',        icon: BookOpen },
  { label: 'Contracts',     key: 'Contract',   icon: FileText },
  { label: 'Checklists',    key: 'Checklist',  icon: ClipboardList },
  { label: 'Marketing',     key: 'Marketing',  icon: Megaphone },
  { label: 'Legal',         key: 'Legal',      icon: Scale },
]

const PINNED_DOCS = [
  { name: 'Intake Call Script', type: 'SOP' },
  { name: 'Pre-Consult Checklist', type: 'Checklist' },
]

const inputStyle = {
  width: '100%',
  background: 'var(--panel)',
  border: '1px solid var(--line)',
  borderRadius: 8,
  padding: '8px 11px',
  fontSize: 13,
  color: 'var(--ink-1)',
  outline: 'none',
  fontFamily: 'inherit',
}

const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME   || 'du5jkfzkf'
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'ct_listings'

async function uploadToCloudinary(file) {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('upload_preset', UPLOAD_PRESET)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
    method: 'POST', body: fd,
  })
  if (!res.ok) throw new Error('Upload failed')
  return res.json()
}

function DocModal({ doc, onClose, onSave }) {
  const isNew = !doc?.id
  const [form, setForm] = useState({
    name:  doc?.name  || '',
    type:  doc?.type  || 'SOP',
    tags:  (doc?.tags || []).join(', '),
    notes: doc?.notes || '',
  })
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const fileRef = useRef(null)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true); setError(null)
    try {
      let url = doc?.url || null
      if (file) {
        const res = await uploadToCloudinary(file)
        url = res.secure_url
      }
      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
      await onSave({
        ...(doc || {}),
        name: form.name.trim(),
        type: form.type,
        tags: tags.length > 0 ? tags : null,
        notes: form.notes || null,
        url,
        uploaded_by: null,
      })
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
        width: '100%', maxWidth: 480,
      }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--accent-soft)', display: 'grid', placeItems: 'center' }}>
              <FileText size={16} strokeWidth={1.8} color="var(--accent-ink)" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-1)' }}>{isNew ? 'New Document' : 'Edit Document'}</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-4)' }}>Add to the library</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--panel)', display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink-3)' }}>
            <X size={14} strokeWidth={1.8} />
          </button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 5 }}>Document Name</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Client Intake SOP" style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 5 }}>Category</label>
              <select value={form.type} onChange={e => set('type', e.target.value)} style={inputStyle}>
                {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 5 }}>Tags (comma-separated)</label>
              <input value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="Sales, Ops, Legal" style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 5 }}>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Brief description…" rows={3}
              style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          <div
            onClick={() => fileRef.current.click()}
            style={{
              border: `2px dashed ${file ? 'var(--accent)' : 'var(--line)'}`,
              borderRadius: 10, padding: '16px 20px', textAlign: 'center', cursor: 'pointer',
              background: file ? 'var(--accent-soft)' : 'var(--bg)',
            }}
          >
            <Upload size={18} color="var(--ink-3)" style={{ margin: '0 auto 6px' }} />
            <div style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500 }}>
              {file ? file.name : (doc?.url ? 'Replace file (optional)' : 'Attach file (optional)')}
            </div>
          </div>
          <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0] || null)} />

          {error && <div style={{ fontSize: 12, color: '#ef4444' }}>{error}</div>}
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ fontSize: 13 }}>
            {saving ? 'Saving…' : (isNew ? 'Add Document' : 'Save Changes')}
          </button>
        </div>
      </div>
    </div>
  )
}

function DocCard({ asset, onOpen, onStar, starred }) {
  const meta = TYPE_META[asset.type] || TYPE_META['Other']
  const TypeIcon = meta.icon
  const date = asset.created_at
    ? new Date(asset.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—'

  return (
    <div
      onClick={onOpen}
      style={{
        background: 'var(--panel)', border: '1px solid var(--line)',
        borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
        display: 'flex', alignItems: 'flex-start', gap: 14,
        transition: 'box-shadow 120ms, border-color 120ms',
        boxShadow: 'var(--shadow-1)',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)'; e.currentTarget.style.borderColor = 'var(--ink-3)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-1)'; e.currentTarget.style.borderColor = 'var(--line)' }}
    >
      {/* File type icon */}
      <div style={{
        width: 42, height: 42, borderRadius: 10, flexShrink: 0,
        background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 1,
      }}>
        <TypeIcon size={16} strokeWidth={1.8} color={meta.fg} />
        <span style={{ fontSize: 8, fontWeight: 800, color: meta.fg, letterSpacing: '0.04em' }}>{meta.label}</span>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-1)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {asset.name}
          </div>
          <button
            onClick={e => { e.stopPropagation(); onStar() }}
            style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: starred ? '#F59E0B' : 'var(--ink-4)' }}
          >
            <Star size={13} strokeWidth={1.8} fill={starred ? '#F59E0B' : 'none'} />
          </button>
        </div>

        <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginTop: 3 }}>{date}</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 999,
            background: meta.bg, color: meta.fg,
          }}>{asset.type}</span>
          {(asset.tags || []).map(t => (
            <span key={t} style={{
              fontSize: 10.5, padding: '2px 7px', borderRadius: 999,
              background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink-3)',
            }}>{t}</span>
          ))}
        </div>
      </div>

      {/* Avatar */}
      <div style={{
        width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg,#A50050,#7A003A)',
        display: 'grid', placeItems: 'center',
        fontSize: 8, fontWeight: 700, color: 'white',
      }}>MR</div>
    </div>
  )
}

export default function Library() {
  const { organizationId } = useAuth()
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [navKey, setNavKey] = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [editDoc, setEditDoc] = useState(null)
  const [starred, setStarred] = useState(new Set())
  const [previewAsset, setPreviewAsset] = useState(null)

  useEffect(() => { fetchAssets() }, [])

  async function fetchAssets() {
    setLoading(true)
    const { data } = await supabase.from('library_assets').select('*').order('created_at', { ascending: false })
    setAssets(data || [])
    setLoading(false)
  }

  async function handleSave(payload) {
    if (payload.id) {
      const { error } = await supabase.from('library_assets').update(payload).eq('id', payload.id)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await supabase.from('library_assets').insert({ ...payload, organization_id: organizationId })
      if (error) throw new Error(error.message)
    }
    await fetchAssets()
  }

  function countByType(key) {
    if (key === 'All') return assets.length
    return assets.filter(a => a.type === key).length
  }

  const filtered = assets.filter(a => {
    if (navKey !== 'All' && a.type !== navKey) return false
    if (search) {
      const q = search.toLowerCase()
      if (!a.name.toLowerCase().includes(q) && !(a.tags || []).some(t => t.toLowerCase().includes(q))) return false
    }
    return true
  })

  const subtitle = `${assets.length} documents · SOPs, contracts, checklists & marketing`

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* Left nav */}
      <div style={{
        width: 220, flexShrink: 0,
        background: 'var(--panel)',
        borderRight: '1px solid var(--line)',
        display: 'flex', flexDirection: 'column',
        padding: '20px 0',
        overflowY: 'auto',
      }}>
        <div style={{ padding: '0 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Browse</div>
          {NAV_ITEMS.map(({ label, key, icon: Icon }) => {
            const active = navKey === key
            const count = countByType(key)
            return (
              <button
                key={key}
                onClick={() => setNavKey(key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9, width: '100%',
                  padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: active ? 'var(--accent-soft)' : 'transparent',
                  color: active ? 'var(--accent-ink)' : 'var(--ink-2)',
                  fontSize: 13, fontWeight: active ? 600 : 400,
                  fontFamily: 'inherit', marginBottom: 2,
                  textAlign: 'left',
                }}
              >
                <Icon size={14} strokeWidth={1.8} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{label}</span>
                {count > 0 && (
                  <span style={{
                    fontSize: 10.5, fontWeight: 600, color: active ? 'var(--accent-ink)' : 'var(--ink-4)',
                    background: active ? 'transparent' : 'var(--bg)',
                    border: active ? 'none' : '1px solid var(--line)',
                    borderRadius: 999, padding: '0 6px', minWidth: 18, textAlign: 'center',
                  }}>{count}</span>
                )}
              </button>
            )
          })}
        </div>

        <div style={{ padding: '0 16px', marginTop: 8 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Pinned</div>
          {PINNED_DOCS.map(p => {
            const meta = TYPE_META[p.type] || TYPE_META['Other']
            return (
              <div key={p.name} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
                fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 400,
                marginBottom: 2,
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Pin size={11} strokeWidth={1.8} color={meta.fg} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--panel)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <h1 style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink-1)', margin: 0 }}>Library</h1>
              <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '3px 0 0', fontWeight: 500 }}>{subtitle}</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowModal(true)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 13px', borderRadius: 9,
                border: '1px solid var(--line)', background: 'var(--panel)',
                color: 'var(--ink-2)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
                fontFamily: 'inherit',
              }}>
                <Upload size={13} strokeWidth={1.8} /> Upload
              </button>
              <button onClick={() => { setEditDoc(null); setShowModal(true) }} className="btn btn-primary" style={{ fontSize: 12.5, padding: '7px 13px 7px 10px', borderRadius: 10 }}>
                <Plus size={13} strokeWidth={2.5} /> New Document
              </button>
            </div>
          </div>

          <div style={{ position: 'relative', maxWidth: 280 }}>
            <Search size={13} color="var(--ink-3)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              placeholder="Search documents…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ ...inputStyle, paddingLeft: 30 }}
            />
          </div>
        </div>

        {/* Document grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 13, marginTop: 60 }}>Loading documents…</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 13, marginTop: 60 }}>
              {assets.length === 0
                ? 'No documents yet — add your first one.'
                : 'No documents match your search.'}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
              {filtered.map(asset => (
                <DocCard
                  key={asset.id}
                  asset={asset}
                  starred={starred.has(asset.id)}
                  onStar={() => setStarred(s => {
                    const n = new Set(s)
                    n.has(asset.id) ? n.delete(asset.id) : n.add(asset.id)
                    return n
                  })}
                  onOpen={() => {
                    if (asset.url) window.open(asset.url, '_blank')
                    else { setEditDoc(asset); setShowModal(true) }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <DocModal
          doc={editDoc}
          onClose={() => { setShowModal(false); setEditDoc(null) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
