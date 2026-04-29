import { useState, useRef, useEffect } from 'react'
import { Plus, Upload, Phone, Mail, X, ChevronDown, Search, Users, Handshake } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useSupabaseQuery } from '../lib/useSupabaseQuery'

// ── Constants ──────────────────────────────────────────────────

const STAGES = [
  { key: 'Cold',           color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
  { key: 'Reached Out',    color: '#f59e0b', bg: 'rgba(245,158,11,0.15)'  },
  { key: 'Connected',      color: '#3b82f6', bg: 'rgba(59,130,246,0.15)'  },
  { key: 'Meeting Set',    color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)'  },
  { key: 'Active Partner', color: '#22c55e', bg: 'rgba(34,197,94,0.15)'   },
  { key: 'Inactive',       color: '#ef4444', bg: 'rgba(239,68,68,0.15)'   },
]

const TYPES = ['Realtor', 'Estate Attorney', 'Financial Advisor', 'Senior Living', 'Other']

const TYPE_COLORS = {
  'Realtor':            { color: '#2563eb', bg: 'rgba(37,99,235,0.12)'  },
  'Estate Attorney':    { color: '#7c3aed', bg: 'rgba(124,58,237,0.12)' },
  'Financial Advisor':  { color: '#0891b2', bg: 'rgba(8,145,178,0.12)'  },
  'Senior Living':      { color: '#059669', bg: 'rgba(5,150,105,0.12)'  },
  'Other':              { color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
}

// ── Helpers ────────────────────────────────────────────────────

const fieldBase = {
  width: '100%', boxSizing: 'border-box',
  padding: '8px 11px', borderRadius: 9,
  border: '1px solid var(--line)', background: 'var(--panel)',
  fontSize: 12.5, fontFamily: 'inherit', color: 'var(--ink-1)', outline: 'none',
}

function Field({ label, required, children, style }) {
  return (
    <div style={style}>
      <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 5 }}>
        {label}{required && <span style={{ color: '#C84A4A', marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  )
}

function FocusInput({ style, ...props }) {
  const [focused, setFocused] = useState(false)
  return (
    <input {...props}
      style={{ ...fieldBase, borderColor: focused ? 'var(--accent)' : 'var(--line)', boxShadow: focused ? '0 0 0 3px var(--accent-soft)' : 'none', ...style }}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    />
  )
}

function TypeChip({ type }) {
  const c = TYPE_COLORS[type] || TYPE_COLORS['Other']
  return (
    <span style={{ fontSize: 10.5, fontWeight: 600, color: c.color, background: c.bg, padding: '2px 7px', borderRadius: 999, whiteSpace: 'nowrap' }}>
      {type}
    </span>
  )
}

function StageChip({ stage }) {
  const s = STAGES.find(x => x.key === stage) || STAGES[0]
  return (
    <span style={{ fontSize: 10.5, fontWeight: 600, color: s.color, background: s.bg, padding: '2px 7px', borderRadius: 999, whiteSpace: 'nowrap' }}>
      {stage}
    </span>
  )
}

function relativeTime(ts) {
  if (!ts) return null
  const diff = Date.now() - new Date(ts).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return 'Today'
  if (d === 1) return 'Yesterday'
  if (d < 7) return `${d}d ago`
  if (d < 30) return `${Math.floor(d / 7)}w ago`
  return `${Math.floor(d / 30)}mo ago`
}

// ── Add / Edit Contact Modal ───────────────────────────────────

function ContactModal({ contact, onClose, onSave }) {
  const isEdit = !!contact?.id
  const [form, setForm] = useState({
    name: '', company: '', type: 'Realtor', phone: '', email: '',
    zip_code: '', address: '', stage: 'Cold', notes: '',
    ...(contact || {}),
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const valid = form.name.trim()

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20,22,26,0.24)', zIndex: 50 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 'min(560px,94vw)', maxHeight: '90vh', background: 'var(--panel)',
        borderRadius: 16, zIndex: 51, display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 70px rgba(20,22,26,0.28)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--accent-soft)', color: 'var(--accent-ink)', display: 'grid', placeItems: 'center', marginRight: 12 }}>
            <Handshake size={16} strokeWidth={1.8} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{isEdit ? 'Edit Contact' : 'Add BDR Contact'}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 1 }}>Referral partner in your territory</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--panel)', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--ink-2)' }}>
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Full name" required>
              <FocusInput placeholder="Jane Smith" value={form.name} onChange={e => set('name', e.target.value)} />
            </Field>
            <Field label="Company / Brokerage">
              <FocusInput placeholder="Coldwell Banker" value={form.company} onChange={e => set('company', e.target.value)} />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Type">
              <select value={form.type} onChange={e => set('type', e.target.value)} style={{ ...fieldBase, appearance: 'none', cursor: 'pointer' }}>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Stage">
              <select value={form.stage} onChange={e => set('stage', e.target.value)} style={{ ...fieldBase, appearance: 'none', cursor: 'pointer' }}>
                {STAGES.map(s => <option key={s.key} value={s.key}>{s.key}</option>)}
              </select>
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Phone">
              <FocusInput type="tel" placeholder="(312) 555-0100" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </Field>
            <Field label="Email">
              <FocusInput type="email" placeholder="jane@realty.com" value={form.email} onChange={e => set('email', e.target.value)} />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14 }}>
            <Field label="ZIP code">
              <FocusInput placeholder="60302" value={form.zip_code} onChange={e => set('zip_code', e.target.value)} />
            </Field>
            <Field label="Address">
              <FocusInput placeholder="123 Main St, Oak Park IL" value={form.address} onChange={e => set('address', e.target.value)} />
            </Field>
          </div>

          <Field label="Notes">
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Context, referral history, how you met…"
              style={{ ...fieldBase, minHeight: 72, resize: 'vertical' }} />
          </Field>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '12px 20px', borderTop: '1px solid var(--line)', background: 'var(--bg-2)' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={() => valid && onSave(form)} style={{ padding: '8px 16px', borderRadius: 9, border: 'none', background: 'var(--accent)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: valid ? 1 : 0.5 }}>
            {isEdit ? 'Save Changes' : 'Add Contact'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Contact Drawer ─────────────────────────────────────────────

function ContactDrawer({ contact, onClose, onUpdate, onDelete }) {
  const [form, setForm] = useState({ ...contact })
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => { setForm({ ...contact }) }, [contact?.id])

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  async function save() {
    setSaving(true)
    await onUpdate(form)
    setSaving(false)
  }

  async function markContacted() {
    const now = new Date().toISOString()
    const updated = { ...form, last_contact_at: now }
    setForm(updated)
    await onUpdate(updated)
  }

  const s = STAGES.find(x => x.key === form.stage) || STAGES[0]

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(440px, 100vw)',
        background: 'var(--panel)', borderLeft: '1px solid var(--line)',
        zIndex: 41, display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 32px rgba(20,22,26,0.12)',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: TYPE_COLORS[form.type]?.bg || 'var(--bg-2)',
            color: TYPE_COLORS[form.type]?.color || 'var(--ink-2)',
            display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 700,
          }}>
            {form.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--ink-1)' }}>{form.name}</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>{form.company || '—'}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <TypeChip type={form.type} />
              <StageChip stage={form.stage} />
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--panel)', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--ink-2)', flexShrink: 0 }}>
            <X size={15} />
          </button>
        </div>

        {/* Quick actions */}
        <div style={{ display: 'flex', gap: 8, padding: '12px 20px', borderBottom: '1px solid var(--line)' }}>
          {form.phone && (
            <a href={`tel:${form.phone}`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--ink-2)', fontSize: 12.5, fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}>
              <Phone size={13} strokeWidth={1.8} /> Call
            </a>
          )}
          {form.email && (
            <a href={`mailto:${form.email}`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--ink-2)', fontSize: 12.5, fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}>
              <Mail size={13} strokeWidth={1.8} /> Email
            </a>
          )}
          <button onClick={markContacted} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--ink-2)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            ✓ Contacted
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Last contacted */}
          {form.last_contact_at && (
            <div style={{ fontSize: 12, color: 'var(--ink-4)', background: 'var(--bg-2)', borderRadius: 8, padding: '6px 10px' }}>
              Last contacted: <strong style={{ color: 'var(--ink-2)' }}>{relativeTime(form.last_contact_at)}</strong>
              {' '}· {new Date(form.last_contact_at).toLocaleDateString()}
            </div>
          )}

          {/* Stage */}
          <Field label="Stage">
            <select value={form.stage} onChange={e => set('stage', e.target.value)} style={{ ...fieldBase, appearance: 'none', cursor: 'pointer', borderColor: s.color }}>
              {STAGES.map(st => <option key={st.key} value={st.key}>{st.key}</option>)}
            </select>
          </Field>

          {/* Contact info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Phone">
              <FocusInput type="tel" value={form.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="(312) 555-0100" />
            </Field>
            <Field label="Email">
              <FocusInput type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} placeholder="jane@realty.com" />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
            <Field label="ZIP">
              <FocusInput value={form.zip_code || ''} onChange={e => set('zip_code', e.target.value)} placeholder="60302" />
            </Field>
            <Field label="Company">
              <FocusInput value={form.company || ''} onChange={e => set('company', e.target.value)} placeholder="Coldwell Banker" />
            </Field>
          </div>

          <Field label="Type">
            <select value={form.type} onChange={e => set('type', e.target.value)} style={{ ...fieldBase, appearance: 'none', cursor: 'pointer' }}>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>

          <Field label="Notes">
            <textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)}
              placeholder="Context, how you met, referral history…"
              style={{ ...fieldBase, minHeight: 100, resize: 'vertical' }} />
          </Field>

          {/* Referrals sent */}
          <Field label="Referrals sent">
            <FocusInput type="number" min="0" value={form.referrals_sent ?? 0} onChange={e => set('referrals_sent', parseInt(e.target.value) || 0)} style={{ width: 100 }} />
          </Field>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line)', background: 'var(--bg-2)', display: 'flex', gap: 8 }}>
          {confirmDelete ? (
            <>
              <span style={{ fontSize: 12.5, color: 'var(--ink-3)', alignSelf: 'center', flex: 1 }}>Delete this contact?</span>
              <button onClick={() => setConfirmDelete(false)} style={{ padding: '8px 14px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => onDelete(contact.id)} style={{ padding: '8px 14px', borderRadius: 9, border: 'none', background: '#ef4444', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
            </>
          ) : (
            <>
              <button onClick={() => setConfirmDelete(true)} style={{ padding: '8px 14px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--panel)', color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
              <div style={{ flex: 1 }} />
              <button onClick={save} disabled={saving} style={{ padding: '8px 18px', borderRadius: 9, border: 'none', background: 'var(--accent)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}

// ── Contact Card ───────────────────────────────────────────────

function ContactCard({ contact, onClick }) {
  const s = STAGES.find(x => x.key === contact.stage) || STAGES[0]
  return (
    <div onClick={() => onClick(contact)} style={{
      background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12,
      padding: '12px 14px', cursor: 'pointer', transition: 'box-shadow 120ms',
      boxShadow: 'var(--shadow-1)',
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-2)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow-1)'}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink-1)', lineHeight: 1.3 }}>{contact.name}</div>
        <TypeChip type={contact.type} />
      </div>
      {contact.company && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 6 }}>{contact.company}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {contact.phone && (
          <div style={{ fontSize: 11.5, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Phone size={11} strokeWidth={1.6} /> {contact.phone}
          </div>
        )}
        {contact.email && (
          <div style={{ fontSize: 11.5, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <Mail size={11} strokeWidth={1.6} /> {contact.email}
          </div>
        )}
      </div>
      {contact.last_contact_at && (
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--ink-4)' }}>
          Last contact: {relativeTime(contact.last_contact_at)}
        </div>
      )}
      {contact.referrals_sent > 0 && (
        <div style={{ marginTop: 4, fontSize: 11, color: s.color, fontWeight: 600 }}>
          {contact.referrals_sent} referral{contact.referrals_sent !== 1 ? 's' : ''} sent
        </div>
      )}
    </div>
  )
}

// ── Stage Column ───────────────────────────────────────────────

function BDRColumn({ stage, contacts, onCardClick }) {
  const s = STAGES.find(x => x.key === stage)
  return (
    <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Column header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 4px 8px', marginBottom: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-1)' }}>{stage}</span>
        <span style={{ marginLeft: 'auto', fontSize: 11.5, fontWeight: 600, color: 'var(--ink-4)', background: 'var(--bg-2)', padding: '1px 7px', borderRadius: 999 }}>
          {contacts.length}
        </span>
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 100 }}>
        {contacts.map(c => <ContactCard key={c.id} contact={c} onClick={onCardClick} />)}
        {contacts.length === 0 && (
          <div style={{ border: '1.5px dashed var(--line)', borderRadius: 10, padding: '20px 12px', textAlign: 'center', fontSize: 12, color: 'var(--ink-4)' }}>
            No contacts
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────

export default function BDR() {
  const { organizationId } = useAuth()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [stageFilter, setStageFilter] = useState('All')
  const [sort, setSort] = useState('name-asc')
  const [view, setView] = useState('board')
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState(null)
  const fileRef = useRef()

  const {
    data: contacts = [],
    loading,
    error,
    refetch: refetchContacts,
    mutate: mutateContacts,
  } = useSupabaseQuery(async () => {
    const { data, error } = await supabase.from('bdr_contacts').select('*').order('name')
    if (error) throw error
    return data || []
  }, [organizationId], { enabled: !!organizationId, errorMessage: 'Failed to load BDR contacts. Please try again.' })

  async function addContact(form) {
    const { data } = await supabase.from('bdr_contacts')
      .insert({ ...form, org_id: organizationId })
      .select().single()
    if (data) {
      mutateContacts(prev => [...(prev || []), data].sort((a, b) => a.name.localeCompare(b.name)))
      setShowAdd(false)
    }
  }

  async function updateContact(form) {
    const { id, created_at, ...rest } = form
    const { data } = await supabase.from('bdr_contacts')
      .update({ ...rest, updated_at: new Date().toISOString() })
      .eq('id', id).select().single()
    if (data) {
      mutateContacts(prev => (prev || []).map(c => c.id === id ? data : c))
      setSelected(data)
    }
  }

  async function deleteContact(id) {
    await supabase.from('bdr_contacts').delete().eq('id', id)
    mutateContacts(prev => (prev || []).filter(c => c.id !== id))
    setSelected(null)
  }

  async function handleImport(e) {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = ''
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json(ws, { defval: '' })
      if (!raw.length) { alert('No rows found in file.'); return }

      // Normalise header names
      const rows = raw.map(row => {
        const n = {}
        Object.entries(row).forEach(([k, v]) => { n[k.toLowerCase().trim().replace(/[\s/]+/g, '_')] = String(v).trim() })
        return n
      })

      const contacts = rows
        .filter(r => r.name || r.full_name || r.first_name)
        .map(r => {
          const firstName = r.first_name || ''
          const lastName = r.last_name || ''
          const fullName = r.name || r.full_name || `${firstName} ${lastName}`.trim() || 'Unknown'
          const rawType = (r.type || r.contact_type || r.category || '').toLowerCase()
          let type = 'Other'
          if (rawType.includes('realtor') || rawType.includes('agent') || rawType.includes('real estate')) type = 'Realtor'
          else if (rawType.includes('attorney') || rawType.includes('lawyer') || rawType.includes('law')) type = 'Estate Attorney'
          else if (rawType.includes('financial') || rawType.includes('advisor') || rawType.includes('planner')) type = 'Financial Advisor'
          else if (rawType.includes('senior') || rawType.includes('assisted') || rawType.includes('living')) type = 'Senior Living'
          return {
            org_id: organizationId,
            name: fullName,
            company: r.company || r.brokerage || r.firm || r.office || '',
            type,
            phone: r.phone || r.cell || r.mobile || r.phone_number || '',
            email: r.email || r.email_address || '',
            zip_code: r.zip || r.zip_code || r.postal_code || '',
            address: r.address || '',
            stage: 'Cold',
            notes: r.notes || r.note || '',
          }
        })

      if (!contacts.length) {
        const cols = Object.keys(raw[0] || {}).join(', ')
        alert(`No importable rows.\n\nColumns found: ${cols}`)
        return
      }

      const { error } = await supabase.from('bdr_contacts').insert(contacts)
      if (error) { alert(`Import failed: ${error.message}`); return }
      alert(`Imported ${contacts.length} contacts successfully.`)
      refetchContacts()
    } catch (err) {
      alert(`Failed to read file: ${err.message}`)
    }
  }

  const SORT_OPTIONS = [
    { value: 'name-asc',          label: 'Name A–Z' },
    { value: 'name-desc',         label: 'Name Z–A' },
    { value: 'company-asc',       label: 'Company A–Z' },
    { value: 'last-contact-desc', label: 'Last Contact (recent)' },
    { value: 'last-contact-asc',  label: 'Last Contact (oldest)' },
    { value: 'referrals-desc',    label: 'Most Referrals' },
  ]

  const q = search.toLowerCase()
  const filtered = contacts
    .filter(c => {
      const matchSearch = !q || c.name.toLowerCase().includes(q) || (c.company || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q)
      const matchType = typeFilter === 'All' || c.type === typeFilter
      const matchStage = stageFilter === 'All' || c.stage === stageFilter
      return matchSearch && matchType && matchStage
    })
    .sort((a, b) => {
      if (sort === 'name-asc')          return a.name.localeCompare(b.name)
      if (sort === 'name-desc')         return b.name.localeCompare(a.name)
      if (sort === 'company-asc')       return (a.company || '').localeCompare(b.company || '')
      if (sort === 'last-contact-desc') return (b.last_contact_at || '').localeCompare(a.last_contact_at || '')
      if (sort === 'last-contact-asc')  return (a.last_contact_at || '').localeCompare(b.last_contact_at || '')
      if (sort === 'referrals-desc')    return (b.referrals_sent || 0) - (a.referrals_sent || 0)
      return 0
    })

  const byStage = STAGES.reduce((acc, s) => {
    acc[s.key] = filtered.filter(c => c.stage === s.key)
    return acc
  }, {})

  const stats = {
    total: contacts.length,
    active: contacts.filter(c => c.stage === 'Active Partner').length,
    meetings: contacts.filter(c => c.stage === 'Meeting Set').length,
    referrals: contacts.reduce((sum, c) => sum + (c.referrals_sent || 0), 0),
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--line)', background: 'var(--panel)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink-1)', margin: 0, letterSpacing: '-0.02em' }}>BDR</h1>
            <p style={{ fontSize: 12.5, color: 'var(--ink-3)', margin: '2px 0 0' }}>Referral partner relationships in your territory</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => fileRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--ink-2)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', boxShadow: 'var(--shadow-1)', fontFamily: 'inherit' }}>
              <Upload size={13} strokeWidth={1.8} /> Import XLSX
            </button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleImport} />
            <button onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px 7px 10px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: 'white', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Plus size={14} strokeWidth={2.2} /> Add Contact
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 20, marginTop: 14 }}>
          {[
            { label: 'Total contacts', value: stats.total },
            { label: 'Active partners', value: stats.active },
            { label: 'Meetings set', value: stats.meetings },
            { label: 'Referrals sent', value: stats.referrals },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink-1)', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--line)', background: 'var(--panel)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
        {/* View toggle */}
        <div style={{ display: 'inline-flex', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 9, padding: 2 }}>
          {['board', 'list'].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '5px 13px', borderRadius: 7, border: 'none', cursor: 'pointer',
              background: view === v ? 'var(--panel)' : 'transparent',
              color: view === v ? 'var(--ink-1)' : 'var(--ink-3)',
              fontWeight: view === v ? 600 : 500, fontSize: 12, fontFamily: 'inherit',
              boxShadow: view === v ? 'var(--shadow-1)' : 'none', transition: 'all 120ms',
              textTransform: 'capitalize',
            }}>{v}</button>
          ))}
        </div>

        <div style={{ width: 1, height: 18, background: 'var(--line)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 9, padding: '6px 10px', width: 200 }}>
          <Search size={13} color="var(--ink-4)" strokeWidth={1.8} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts…"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: 'var(--ink-1)', fontFamily: 'inherit' }} />
        </div>

        <div style={{ width: 1, height: 18, background: 'var(--line)' }} />

        {/* Type filter */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Type</span>
          {['All', ...TYPES].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} style={{
              padding: '5px 11px', borderRadius: 999, border: '1px solid ' + (typeFilter === t ? 'var(--accent)' : 'var(--line)'),
              background: typeFilter === t ? 'var(--accent-soft)' : 'var(--panel)',
              color: typeFilter === t ? 'var(--accent-ink)' : 'var(--ink-2)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>{t}</button>
          ))}
        </div>

        <div style={{ width: 1, height: 18, background: 'var(--line)' }} />

        {/* Stage filter */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Stage</span>
          {['All', ...STAGES.map(s => s.key)].map(s => {
            const stg = STAGES.find(x => x.key === s)
            const active = stageFilter === s
            return (
              <button key={s} onClick={() => setStageFilter(s)} style={{
                padding: '5px 11px', borderRadius: 999,
                border: `1px solid ${active ? (stg?.color || 'var(--accent)') : 'var(--line)'}`,
                background: active ? (stg?.bg || 'var(--accent-soft)') : 'var(--panel)',
                color: active ? (stg?.color || 'var(--accent-ink)') : 'var(--ink-2)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>{s}</button>
            )
          })}
        </div>

        <div style={{ flex: 1 }} />

        {/* Sort */}
        <select value={sort} onChange={e => setSort(e.target.value)} style={{
          padding: '6px 10px', borderRadius: 9, border: '1px solid var(--line)',
          background: 'var(--panel)', color: 'var(--ink-2)', fontSize: 12.5,
          fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
        }}>
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Board view */}
      {view === 'board' && (
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
          {error ? (
            <div style={{ color: 'var(--lose)', fontSize: 13, padding: 20 }}>{error}</div>
          ) : loading ? (
            <div style={{ color: 'var(--ink-4)', fontSize: 13, padding: 20 }}>Loading…</div>
          ) : (
            <div style={{ display: 'flex', gap: 14, minWidth: 'max-content', alignItems: 'flex-start', paddingBottom: 24 }}>
              {STAGES.map(s => (
                <BDRColumn key={s.key} stage={s.key} contacts={byStage[s.key] || []} onCardClick={setSelected} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {error ? (
            <div style={{ color: 'var(--lose)', fontSize: 13 }}>{error}</div>
          ) : loading ? (
            <div style={{ color: 'var(--ink-4)', fontSize: 13 }}>Loading…</div>
          ) : (
            <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
              {/* Table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1.2fr 1.5fr 1fr 1fr', gap: 0, padding: '9px 16px', borderBottom: '1px solid var(--line)', background: 'var(--bg-2)' }}>
                {['Name', 'Company', 'Type', 'Stage', 'Phone', 'ZIP', 'Last Contact'].map(h => (
                  <div key={h} style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
                ))}
              </div>

              {filtered.length === 0 && (
                <div style={{ padding: '32px 16px', textAlign: 'center', fontSize: 13, color: 'var(--ink-4)' }}>No contacts match your filters.</div>
              )}

              {filtered.map((c, i) => {
                const s = STAGES.find(x => x.key === c.stage) || STAGES[0]
                const tc = TYPE_COLORS[c.type] || TYPE_COLORS['Other']
                return (
                  <div key={c.id} onClick={() => setSelected(c)} style={{
                    display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1.2fr 1.5fr 1fr 1fr',
                    gap: 0, padding: '10px 16px', cursor: 'pointer',
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--line)' : 'none',
                    background: 'var(--panel)', transition: 'background 100ms',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--panel)'}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>{c.name}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>{c.company || '—'}</div>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: tc.color, background: tc.bg, padding: '2px 7px', borderRadius: 999, whiteSpace: 'nowrap' }}>{c.type}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: s.color, background: s.bg, padding: '2px 7px', borderRadius: 999, whiteSpace: 'nowrap' }}>{c.stage}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{c.phone || '—'}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{c.zip_code || '—'}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-4)' }}>{relativeTime(c.last_contact_at) || '—'}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showAdd && <ContactModal onClose={() => setShowAdd(false)} onSave={addContact} />}
      {selected && (
        <ContactDrawer
          contact={selected}
          onClose={() => setSelected(null)}
          onUpdate={updateContact}
          onDelete={deleteContact}
        />
      )}
    </div>
  )
}
