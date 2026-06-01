import { useState } from 'react'
import { Plus, Search, X, Phone, Mail, Globe, Pencil, Trash2, ExternalLink } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useSupabaseQuery } from '../lib/useSupabaseQuery'
import { validateRequired, firstError } from '../lib/validate'
import ErrorBoundary from '../components/ErrorBoundary'
import logger from '../lib/logger'

// ── Specialty tag input ───────────────────────────────────────────────────────

function TagInput({ tags, onChange }) {
  const [inputVal, setInputVal] = useState('')

  function addTag(raw) {
    const tag = raw.trim().toLowerCase()
    if (tag && !tags.includes(tag)) onChange([...tags, tag])
    setInputVal('')
  }

  function handleKey(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(inputVal)
    } else if (e.key === 'Backspace' && !inputVal && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center',
      background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 9,
      padding: '6px 10px', minHeight: 38, cursor: 'text',
    }}
      onClick={e => e.currentTarget.querySelector('input')?.focus()}
    >
      {tags.map(t => (
        <span key={t} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: 'var(--accent-soft)', color: 'var(--accent-ink)',
          border: '1px solid color-mix(in oklab, var(--accent) 25%, transparent)',
          fontSize: 11.5, fontWeight: 500, borderRadius: 6, padding: '2px 8px',
        }}>
          {t}
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onChange(tags.filter(x => x !== t)) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--accent-ink)', opacity: 0.6, lineHeight: 1 }}
          >
            <X size={10} strokeWidth={2.5} />
          </button>
        </span>
      ))}
      <input
        value={inputVal}
        onChange={e => setInputVal(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => { if (inputVal.trim()) addTag(inputVal) }}
        placeholder={tags.length === 0 ? 'Type a specialty, press Enter…' : ''}
        style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: 'var(--ink-1)', fontFamily: 'inherit', minWidth: 140, flex: 1 }}
      />
    </div>
  )
}

// ── Partner form modal ────────────────────────────────────────────────────────

const EMPTY = { contact_name: '', business_name: '', phone: '', email: '', website: '', specialties: [], notes: '', is_active: true }

const inputStyle = {
  width: '100%', background: 'var(--bg)', border: '1px solid var(--line)',
  borderRadius: 9, padding: '8px 11px', fontSize: 13, color: 'var(--ink-1)',
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
}
const fieldLabel = { display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }

function PartnerModal({ partner, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({ ...EMPTY, ...partner })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [errors, setErrors] = useState({})

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave() {
    const errs = { contact_name: validateRequired(form.contact_name, 'Name') }
    const first = firstError(errs)
    if (first) { setErrors(errs); return }
    setSaving(true)
    try {
      await onSave(form)
      onClose()
    } catch (e) {
      logger.error('Partner save failed', e)
      setErrors({ _: e.message || 'Save failed.' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this partner?')) return
    setDeleting(true)
    try { await onDelete(form.id); onClose() }
    catch (e) { logger.error('Partner delete failed', e) }
    finally { setDeleting(false) }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'var(--overlay-heavy)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--panel)', borderRadius: 16, width: '100%', maxWidth: 520, boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: '90vh' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink-1)' }}>{form.id ? 'Edit Partner' : 'New Partner'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'grid', placeItems: 'center' }}><X size={16} /></button>
        </div>

        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={fieldLabel}>Contact Name *</label>
              <input value={form.contact_name} onChange={e => set('contact_name', e.target.value)} style={{ ...inputStyle, borderColor: errors.contact_name ? 'var(--lose)' : undefined }} />
              {errors.contact_name && <div style={{ fontSize: 11, color: 'var(--lose)', marginTop: 3 }}>{errors.contact_name}</div>}
            </div>
            <div>
              <label style={fieldLabel}>Business Name</label>
              <input value={form.business_name} onChange={e => set('business_name', e.target.value)} style={inputStyle} placeholder="Company or trade name" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={fieldLabel}>Phone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} style={inputStyle} type="tel" placeholder="(303) 555-0100" />
            </div>
            <div>
              <label style={fieldLabel}>Email</label>
              <input value={form.email} onChange={e => set('email', e.target.value)} style={inputStyle} type="email" placeholder="name@example.com" />
            </div>
          </div>

          <div>
            <label style={fieldLabel}>Website</label>
            <input value={form.website} onChange={e => set('website', e.target.value)} style={inputStyle} type="url" placeholder="https://example.com" />
          </div>

          <div>
            <label style={fieldLabel}>Specialties</label>
            <TagInput tags={form.specialties} onChange={v => set('specialties', v)} />
            <div style={{ fontSize: 10.5, color: 'var(--ink-4)', marginTop: 4 }}>Press Enter or comma to add · Backspace to remove last</div>
          </div>

          <div>
            <label style={fieldLabel}>Notes</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
              placeholder="Pricing notes, availability, referral info…"
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} style={{ width: 15, height: 15, accentColor: 'var(--accent)' }} />
            <span style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500 }}>Active partner</span>
          </label>

          {errors._ && <div style={{ fontSize: 12.5, color: 'var(--lose)', background: 'var(--lose-soft)', borderRadius: 8, padding: '8px 12px' }}>{errors._}</div>}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, background: 'var(--bg-2)' }}>
          {form.id && (
            <button onClick={handleDelete} disabled={deleting} style={{ padding: '9px 14px', borderRadius: 9, border: '1px solid var(--lose)', background: 'var(--lose-soft)', color: 'var(--lose)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Trash2 size={13} /> {deleting ? 'Deleting…' : 'Delete'}
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: saving ? 'var(--line)' : 'var(--accent)', color: saving ? 'var(--ink-3)' : '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Saving…' : 'Save Partner'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Partner card ─────────────────────────────────────────────────────────────

function PartnerCard({ partner, onEdit }) {
  return (
    <div style={{
      background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14,
      padding: '16px', display: 'flex', flexDirection: 'column', gap: 12,
      boxShadow: 'var(--shadow-1)',
      opacity: partner.is_active ? 1 : 0.55,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{partner.contact_name}</div>
          {partner.business_name && (
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{partner.business_name}</div>
          )}
          {!partner.is_active && <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ink-4)', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 4, padding: '1px 6px', marginTop: 4, display: 'inline-block' }}>Inactive</span>}
        </div>
        <button
          onClick={() => onEdit(partner)}
          style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink-3)', cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0 }}
          title="Edit partner"
        >
          <Pencil size={13} strokeWidth={1.8} />
        </button>
      </div>

      {/* Specialties */}
      {partner.specialties?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {partner.specialties.map(s => (
            <span key={s} style={{ fontSize: 11, fontWeight: 500, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 6, padding: '2px 8px', color: 'var(--ink-2)' }}>{s}</span>
          ))}
        </div>
      )}

      {/* Contact actions */}
      <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
        {partner.phone && (
          <a href={`tel:${partner.phone}`} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 10px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'white', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
            <Phone size={12} strokeWidth={2} /> Call
          </a>
        )}
        {partner.email && (
          <a href={`mailto:${partner.email}`} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--ink-2)', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
            <Mail size={12} strokeWidth={2} /> Email
          </a>
        )}
        {partner.website && (
          <a href={partner.website} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--ink-2)', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
            <Globe size={12} strokeWidth={2} /> Web
          </a>
        )}
        {!partner.phone && !partner.email && !partner.website && (
          <span style={{ fontSize: 11.5, color: 'var(--ink-4)', padding: '7px 0' }}>No contact info</span>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Partners() {
  const { organizationId } = useAuth()
  const [search, setSearch] = useState('')
  const [modalPartner, setModalPartner] = useState(null)
  const [showInactive, setShowInactive] = useState(false)

  const { data: partners = [], loading, error, refetch } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('partners')
      .select('*')
      .order('contact_name')
    if (error) throw error
    return data || []
  }, [], { errorMessage: 'Failed to load partners.' })

  async function handleSave(form) {
    const payload = {
      contact_name:    form.contact_name.trim(),
      business_name:   form.business_name?.trim() || null,
      phone:           form.phone?.trim() || null,
      email:           form.email?.trim() || null,
      website:         form.website?.trim() || null,
      specialties:     form.specialties || [],
      notes:           form.notes?.trim() || null,
      is_active:       form.is_active ?? true,
      organization_id: organizationId,
    }
    if (!form.id) {
      const { error } = await supabase.from('partners').insert(payload)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await supabase.from('partners').update(payload).eq('id', form.id)
      if (error) throw new Error(error.message)
    }
    await refetch()
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('partners').delete().eq('id', id)
    if (error) throw new Error(error.message)
    await refetch()
  }

  const filtered = partners.filter(p => {
    if (!showInactive && !p.is_active) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      p.contact_name?.toLowerCase().includes(q) ||
      p.business_name?.toLowerCase().includes(q) ||
      p.specialties?.some(s => s.toLowerCase().includes(q))
    )
  })

  const activeCount = partners.filter(p => p.is_active).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--line)', background: 'var(--panel)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink-1)', margin: 0, letterSpacing: '-0.02em' }}>Partners</h1>
          <p style={{ fontSize: 12.5, color: 'var(--ink-3)', margin: '2px 0 0' }}>{activeCount} active partner{activeCount !== 1 ? 's' : ''}</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setModalPartner({ ...EMPTY })}
          style={{ fontSize: 12.5, padding: '7px 13px 7px 10px', borderRadius: 10 }}
        >
          <Plus size={13} strokeWidth={2.5} /> New Partner
        </button>
      </div>

      {/* Toolbar */}
      <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--line)', background: 'var(--panel)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, maxWidth: 360, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10, padding: '7px 12px' }}>
          <Search size={13} color="var(--ink-4)" strokeWidth={1.8} />
          <input
            placeholder="Search by name, business, or specialty…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: 'var(--ink-1)', fontFamily: 'inherit' }}
          />
          {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', padding: 0, display: 'flex' }}><X size={12} /></button>}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12.5, color: 'var(--ink-3)', userSelect: 'none', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
          Show inactive
        </label>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {loading ? (
          <div style={{ display: 'grid', placeItems: 'center', height: 200, color: 'var(--ink-4)', fontSize: 13 }}>Loading…</div>
        ) : error ? (
          <div style={{ display: 'grid', placeItems: 'center', height: 200, color: 'var(--lose)', fontSize: 13 }}>{error}</div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'grid', placeItems: 'center', height: 200, color: 'var(--ink-4)', fontSize: 13 }}>
            {partners.length === 0 ? 'No partners yet — add your first.' : 'No results.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {filtered.map(p => (
              <PartnerCard key={p.id} partner={p} onEdit={setModalPartner} />
            ))}
          </div>
        )}
      </div>

      {modalPartner && (
        <ErrorBoundary inline>
          <PartnerModal
            partner={modalPartner}
            onClose={() => setModalPartner(null)}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        </ErrorBoundary>
      )}
    </div>
  )
}
