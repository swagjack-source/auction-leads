import { useState, useEffect } from 'react'
import { Plus, Search, Trash2, X, Phone, Mail, MapPin, Building2, Pencil, Star, Upload, Download, ChevronRight, ExternalLink } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { CONTACT_TYPES } from '../lib/constants'
import { useAuth } from '../lib/AuthContext'

const TYPE_META = {
  'Partner':       { color: '#3b82f6', dot: '#3b82f6' },
  'Senior Living': { color: '#A50050', dot: '#A50050' },
  'Probate':       { color: '#f59e0b', dot: '#f59e0b' },
  'Donation':      { color: '#22c55e', dot: '#22c55e' },
  'Vendor':        { color: '#8b5cf6', dot: '#8b5cf6' },
  'Client':        { color: '#a855f7', dot: '#a855f7' },
  'Other':         { color: '#64748b', dot: '#64748b' },
}

const inputStyle = {
  width: '100%',
  background: 'var(--bg)',
  border: '1px solid var(--line)',
  borderRadius: 9,
  padding: '8px 11px',
  fontSize: 13,
  color: 'var(--ink-1)',
  outline: 'none',
  fontFamily: 'inherit',
}

const EMPTY = { name: '', company: '', type: 'Partner', phone: '', email: '', address: '', notes: '' }

function ContactModal({ contact, onClose, onSave, onSaveAnother }) {
  const isNew = !contact.id
  const [form, setForm] = useState({ ...EMPTY, ...contact })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const initials = form.name ? form.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : '?'
  const meta = TYPE_META[form.type] || { color: '#64748b' }

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function doSave() {
    if (!form.name.trim()) { setError('Name is required'); return null }
    setSaving(true); setError(null)
    try { await onSave(form); return true }
    catch (e) { setError(e.message); return false }
    finally { setSaving(false) }
  }

  async function handleSave() {
    if (await doSave()) onClose()
  }

  async function handleSaveAnother() {
    if (await doSave()) { setForm({ ...EMPTY, type: form.type }); onSaveAnother?.() }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'var(--overlay)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'fadein 150ms' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 18, boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 560, animation: 'popin 180ms cubic-bezier(.2,.7,.3,1.05)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', flexShrink: 0, fontSize: 16 }}>👤</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-1)' }}>{isNew ? 'New Contact' : 'Edit Contact'}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Add a partner, vendor, or referral source to your directory</div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--ink-3)' }}><X size={14} /></button>
        </div>

        {/* Form body with preview */}
        <div style={{ display: 'flex', gap: 0 }}>
          {/* Avatar preview */}
          <div style={{ padding: '20px 18px', borderRight: '1px solid var(--line-2)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, minWidth: 100 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: `${meta.color}20`, border: `2px solid ${meta.color}40`,
              color: meta.color, fontSize: 22, fontWeight: 700,
              display: 'grid', placeItems: 'center',
            }}>{initials}</div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-2)', textAlign: 'center', lineHeight: 1.3 }}>
              {form.name || 'Contact name'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-4)', textAlign: 'center' }}>{form.company || 'Role'}</div>
          </div>

          {/* Fields */}
          <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', maxHeight: '60vh' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 5 }}>Full name <span style={{ color: 'var(--lose)' }}>*</span></label>
                <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="First Last" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 5 }}>Category <span style={{ color: 'var(--lose)' }}>*</span></label>
                <select value={form.type} onChange={e => set('type', e.target.value)} style={inputStyle}>
                  {CONTACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 5 }}>Role / title</label>
                <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="e.g. Move-in Coordinator" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 5 }}>Organization</label>
                <input value={form.company} onChange={e => set('company', e.target.value)} placeholder="Company or firm name" style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 5 }}>Phone</label>
                <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 555-0100" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 5 }}>Email</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="name@example.com" style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 5 }}>City</label>
              <input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="City, State" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 5 }}>Notes</label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Preferred contact method, hours, referral history…" rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            {error && <div style={{ fontSize: 12, color: 'var(--lose)' }}>{error}</div>}
          </div>
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          {isNew && <button className="btn btn-secondary" onClick={handleSaveAnother} disabled={saving}>Save &amp; add another</button>}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : isNew ? 'Save Contact' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}

function Avatar({ name, color, size = 36 }) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `${color}22`, border: `1.5px solid ${color}40`,
      color, fontSize: size * 0.36, fontWeight: 700,
      display: 'grid', placeItems: 'center', flexShrink: 0,
    }}>{initials}</div>
  )
}

function timeAgo(dateStr) {
  if (!dateStr) return null
  const diff = Date.now() - new Date(dateStr)
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return '1d ago'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days/7)}w ago`
  return `${Math.floor(days/30)}mo ago`
}

export default function Contacts() {
  const { organizationId } = useAuth()
  const [contacts, setContacts]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [activeType, setActiveType]     = useState('All')
  const [selected, setSelected]         = useState(null)
  const [modalContact, setModalContact] = useState(null)
  const [showStarred, setShowStarred]   = useState(false)

  useEffect(() => { fetchContacts() }, [])

  async function fetchContacts() {
    setLoading(true)
    const { data } = await supabase.from('contacts').select('*').order('name')
    setContacts((data || []).map(c => ({ ...c, type: c.category })))
    setLoading(false)
  }

  async function handleSave(form) {
    const payload = {
      name: form.name.trim(), company: form.company || null,
      category: form.type || null,
      phone: form.phone || null, email: form.email || null,
      address: form.address || null, notes: form.notes || null,
      organization_id: organizationId,
    }
    if (!form.id) {
      const { error } = await supabase.from('contacts').insert(payload)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await supabase.from('contacts').update(payload).eq('id', form.id)
      if (error) throw new Error(error.message)
    }
    await fetchContacts()
  }

  async function handleDelete(id) {
    if (!confirm('Delete this contact?')) return
    await supabase.from('contacts').delete().eq('id', id)
    setContacts(cs => cs.filter(c => c.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  const typeCounts = CONTACT_TYPES.reduce((acc, t) => {
    acc[t] = contacts.filter(c => c.type === t).length
    return acc
  }, {})

  const catCount = Object.values(typeCounts).filter(n => n > 0).length

  const listFiltered = contacts.filter(c => {
    if (showStarred) return false
    if (activeType !== 'All' && c.type !== activeType) return false
    if (search) {
      const q = search.toLowerCase()
      if (!c.name.toLowerCase().includes(q) && !c.company?.toLowerCase().includes(q) && !c.phone?.includes(q)) return false
    }
    return true
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Page header */}
      <div style={{
        padding: '14px 24px',
        borderBottom: '1px solid var(--line)',
        background: 'var(--panel)',
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink-1)', margin: 0, letterSpacing: '-0.02em' }}>Contacts</h1>
          <p style={{ fontSize: 12.5, color: 'var(--ink-3)', margin: '2px 0 0' }}>
            {contacts.length} contact{contacts.length !== 1 ? 's' : ''} · {catCount} categories
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--ink-2)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', boxShadow: 'var(--shadow-1)' }}>
            <Upload size={13} strokeWidth={1.8} /> Import
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--ink-2)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', boxShadow: 'var(--shadow-1)' }}>
            <Download size={13} strokeWidth={1.8} /> Export
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setModalContact({ ...EMPTY })}
            style={{ fontSize: 12.5, padding: '7px 13px 7px 10px', borderRadius: 10 }}
          >
            <Plus size={13} strokeWidth={2.5} /> New Contact
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Pane 1: Category rail */}
        <div style={{
          width: 188, flexShrink: 0,
          borderRight: '1px solid var(--line)',
          background: 'var(--sidebar)',
          display: 'flex', flexDirection: 'column',
          padding: '14px 10px',
          overflowY: 'auto',
        }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 6px 8px' }}>
            Directory
          </div>

          {[{ label: 'All', count: contacts.length },
            ...CONTACT_TYPES.map(t => ({ label: t, count: typeCounts[t] || 0 }))
          ].filter(item => item.count > 0 || item.label === 'All').map(({ label, count }) => {
            const isActive = !showStarred && activeType === label
            const meta = TYPE_META[label]
            return (
              <button
                key={label}
                onClick={() => { setActiveType(label); setShowStarred(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 8px', borderRadius: 8, border: 'none',
                  background: isActive ? 'var(--panel)' : 'transparent',
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                  boxShadow: isActive ? 'var(--shadow-1)' : 'none',
                  marginBottom: 1,
                }}
              >
                {meta ? (
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.dot, flexShrink: 0 }} />
                ) : (
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                )}
                <span style={{ flex: 1, fontSize: 12.5, fontWeight: isActive ? 600 : 500, color: isActive ? 'var(--ink-1)' : 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {label === 'All' ? 'All' : label}
                </span>
                {count > 0 && (
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: isActive ? 'var(--accent-ink)' : 'var(--ink-4)', padding: '1px 6px', borderRadius: 999, background: isActive ? 'var(--accent-soft)' : 'transparent' }}>{count}</span>
                )}
              </button>
            )
          })}

          <div style={{ height: 1, background: 'var(--line-2)', margin: '10px 0' }} />

          <button
            onClick={() => setShowStarred(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 8px', borderRadius: 8, border: 'none',
              background: showStarred ? 'var(--panel)' : 'transparent',
              cursor: 'pointer', textAlign: 'left', width: '100%',
              boxShadow: showStarred ? 'var(--shadow-1)' : 'none',
            }}
          >
            <Star size={12} strokeWidth={1.8} color="#f59e0b" style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 12.5, fontWeight: showStarred ? 600 : 500, color: showStarred ? 'var(--ink-1)' : 'var(--ink-2)' }}>Starred</span>
          </button>
        </div>

        {/* Pane 2: Contact list */}
        <div style={{
          width: 320, flexShrink: 0,
          borderRight: '1px solid var(--line)',
          display: 'flex', flexDirection: 'column',
          background: 'var(--bg)',
        }}>
          {/* Search bar */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--line)', background: 'var(--panel)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 7, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 9, padding: '6px 10px' }}>
              <Search size={13} color="var(--ink-4)" strokeWidth={1.8} />
              <input
                placeholder="Search contacts, orgs, cities…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: 'var(--ink-1)', fontFamily: 'inherit' }}
              />
            </div>
            <button style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--ink-2)', fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>A-Z</button>
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-4)', fontSize: 12 }}>Loading…</div>
            ) : showStarred ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-4)', fontSize: 12 }}>No starred contacts yet</div>
            ) : listFiltered.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-4)', fontSize: 12 }}>
                {contacts.length === 0 ? 'No contacts yet' : 'No results'}
              </div>
            ) : (() => {
              const grouped = {}
              listFiltered.forEach(c => {
                const letter = c.name[0].toUpperCase()
                if (!grouped[letter]) grouped[letter] = []
                grouped[letter].push(c)
              })
              return Object.keys(grouped).sort().map(letter => (
                <div key={letter}>
                  <div style={{ padding: '6px 12px 3px', fontSize: 11, fontWeight: 700, color: 'var(--ink-4)' }}>{letter}</div>
                  {grouped[letter].map(c => {
                    const meta = TYPE_META[c.type] || { dot: '#64748b' }
                    const isSelected = selected?.id === c.id
                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelected(c)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          width: '100%', padding: '9px 12px',
                          border: 'none', borderBottom: '1px solid var(--line-2)',
                          background: isSelected ? '#EFF6FF' : 'var(--panel)',
                          cursor: 'pointer', textAlign: 'left',
                          transition: 'background 100ms',
                        }}
                      >
                        <Avatar name={c.name} color={meta.dot} size={34} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                            {[c.address, c.company].filter(Boolean).join(' · ') || c.type || ''}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          {c.phone && <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>{c.phone}</div>}
                          <div style={{ fontSize: 10.5, color: 'var(--ink-4)', marginTop: 1 }}>{timeAgo(c.created_at)}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ))
            })()}
          </div>
        </div>

        {/* Pane 3: Detail panel */}
        <div style={{ flex: 1, overflow: 'auto', background: 'var(--panel)' }}>
          {!selected ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ink-4)', gap: 8 }}>
              <div style={{ fontSize: 32 }}>👤</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Select a contact to view details</div>
            </div>
          ) : (() => {
            const meta = TYPE_META[selected.type] || { color: '#64748b' }
            const initials = selected.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
            return (
              <div style={{ maxWidth: 440, padding: '24px 28px' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                    background: `${meta.color}22`, border: `2px solid ${meta.color}40`,
                    color: meta.color, fontSize: 18, fontWeight: 700,
                    display: 'grid', placeItems: 'center',
                  }}>{initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink-1)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>{selected.name}</div>
                      <Star size={14} strokeWidth={1.8} color="#f59e0b" />
                    </div>
                    {selected.address && <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>{selected.address}</div>}
                    {selected.company && <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 1 }}>{selected.company}</div>}
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                      {selected.type && (
                        <span style={{ fontSize: 11, fontWeight: 700, background: `${meta.color}18`, color: meta.color, border: `1px solid ${meta.color}30`, padding: '3px 10px', borderRadius: 999 }}>{selected.type}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
                  <a
                    href={selected.phone ? `tel:${selected.phone}` : undefined}
                    style={{
                      flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      gap: 6, padding: '8px 12px', borderRadius: 9,
                      border: 'none', background: 'var(--accent)',
                      color: 'white', fontSize: 13, fontWeight: 600,
                      textDecoration: 'none', cursor: selected.phone ? 'pointer' : 'default',
                      opacity: selected.phone ? 1 : 0.4,
                    }}
                  >
                    <Phone size={13} strokeWidth={1.8} /> Call
                  </a>
                  <a
                    href={selected.email ? `mailto:${selected.email}` : undefined}
                    style={{
                      flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      gap: 6, padding: '8px 12px', borderRadius: 9,
                      border: '1px solid var(--line)', background: 'var(--panel)',
                      color: 'var(--ink-2)', fontSize: 13, fontWeight: 600,
                      textDecoration: 'none', cursor: selected.email ? 'pointer' : 'default',
                      opacity: selected.email ? 1 : 0.4,
                    }}
                  >
                    <Mail size={13} strokeWidth={1.8} /> Email
                  </a>
                  <button
                    onClick={() => setModalContact(selected)}
                    style={{
                      flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      gap: 6, padding: '8px 12px', borderRadius: 9,
                      border: '1px solid var(--line)', background: 'var(--panel)',
                      color: 'var(--ink-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    <Pencil size={13} strokeWidth={1.8} /> Edit
                  </button>
                </div>

                {/* Info rows */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--line)', marginBottom: 16 }}>
                  {[
                    { label: 'Phone',        value: selected.phone || '—' },
                    { label: 'Email',        value: selected.email || '—', truncate: true },
                    { label: 'City',         value: selected.company || '—' },
                    { label: 'Last contact', value: timeAgo(selected.created_at) || '—' },
                    { label: 'Projects',     value: '—' },
                  ].map(({ label, value, truncate }, i) => (
                    <div key={label} style={{
                      padding: '10px 14px',
                      background: 'var(--bg)',
                      borderBottom: i < 4 ? '1px solid var(--line-2)' : 'none',
                      borderRight: i % 2 === 0 ? '1px solid var(--line-2)' : 'none',
                    }}>
                      <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink-1)', overflow: truncate ? 'hidden' : undefined, textOverflow: truncate ? 'ellipsis' : undefined, whiteSpace: truncate ? 'nowrap' : undefined }}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* Notes */}
                {selected.notes && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Notes</div>
                    <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55, background: 'var(--bg)', borderRadius: 10, padding: '10px 12px', border: '1px solid var(--line)' }}>
                      {selected.notes}
                    </div>
                  </div>
                )}

                {/* Recent Activity */}
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Recent Activity</div>
                  {[
                    { time: '3d ago',      text: 'Called — left voicemail' },
                    { time: '2 weeks ago', text: 'Referred to Halverson Estate project' },
                    { time: '1 month ago', text: 'Added to directory' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, paddingBottom: 10, marginBottom: 8, borderBottom: i < 2 ? '1px solid var(--line-2)' : 'none' }}>
                      <div style={{ fontSize: 11, color: 'var(--ink-4)', whiteSpace: 'nowrap', minWidth: 70 }}>{item.time}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{item.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>
      </div>

      {modalContact && (
        <ContactModal
          contact={modalContact}
          onClose={() => setModalContact(null)}
          onSave={async (form) => {
            await handleSave(form)
            setModalContact(null)
            if (form.id) setSelected({ ...selected, ...form })
          }}
          onSaveAnother={() => fetchContacts()}
        />
      )}
    </div>
  )
}
