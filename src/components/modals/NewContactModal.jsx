import { useState, useEffect } from 'react'
import { X, BookUser } from 'lucide-react'

const fieldBase = {
  width: '100%', boxSizing: 'border-box',
  padding: '8px 11px', borderRadius: 9,
  border: '1px solid var(--line)',
  background: 'var(--panel)',
  fontSize: 12.5, fontFamily: 'inherit',
  color: 'var(--ink-1)', outline: 'none',
}

function Field({ label, required, help, span = 1, children }) {
  return (
    <div style={{ gridColumn: `span ${span}` }}>
      <label style={{ display: 'flex', alignItems: 'baseline', gap: 5, fontSize: 11.5, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }}>
        {label}
        {required && <span style={{ color: 'var(--lose, #C84A4A)', fontSize: 10 }}>*</span>}
        {help && <span style={{ fontSize: 10.5, color: 'var(--ink-4)', fontWeight: 400, marginLeft: 'auto' }}>{help}</span>}
      </label>
      {children}
    </div>
  )
}

function TextInput({ style, ...props }) {
  const [focused, setFocused] = useState(false)
  return (
    <input {...props}
      style={{ ...fieldBase, borderColor: focused ? 'var(--accent)' : 'var(--line)', boxShadow: focused ? '0 0 0 3px var(--accent-soft)' : 'none', ...style }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  )
}

function SelField({ options, value, onChange }) {
  return (
    <select value={value} onChange={onChange} style={{ ...fieldBase, appearance: 'none', cursor: 'pointer' }}>
      {options.map(o => {
        const val = o.value || o
        const label = o.label || o
        return <option key={val} value={val}>{label}</option>
      })}
    </select>
  )
}

const CAT_HUE = { Partner: 210, 'Senior Living': 150, Probate: 280, Donation: 60, Vendor: 30 }

export default function NewContactModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    name: '', cat: 'Partner', role: '', org: '', phone: '', email: '',
    city: '', fav: false, note: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const valid = form.name && form.cat

  const hue = CAT_HUE[form.cat] || 210
  const initials = form.name.split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSave = () => {
    if (!valid) return
    onSave && onSave(form)
    onClose()
  }

  const btnPrimary = {
    padding: '8px 16px', borderRadius: 9, border: 'none',
    background: 'var(--accent)', color: 'white',
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
    opacity: valid ? 1 : 0.5, pointerEvents: valid ? 'auto' : 'none',
  }
  const btnGhost = {
    padding: '8px 16px', borderRadius: 9, border: '1px solid var(--line)',
    background: 'var(--panel)', color: 'var(--ink-2)',
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20,22,26,0.24)', zIndex: 50 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 'min(580px, 94vw)', maxHeight: '90vh',
        background: 'var(--panel)', borderRadius: 16, zIndex: 51,
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 70px rgba(20,22,26,0.28)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--accent-soft)', color: 'var(--accent-ink)', display: 'grid', placeItems: 'center', marginRight: 12 }}>
            <BookUser size={17} strokeWidth={1.8} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>New Contact</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 1 }}>Add a partner, vendor, or referral source to your directory</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--panel)', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--ink-2)' }}>
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
          {/* Avatar preview */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18, padding: '14px', background: 'var(--bg-2)', border: '1px solid var(--line-2)', borderRadius: 12 }}>
            <span style={{
              width: 48, height: 48, borderRadius: 12,
              display: 'grid', placeItems: 'center',
              fontSize: 16, fontWeight: 600,
              background: `oklch(0.92 0.05 ${hue})`,
              color: `oklch(0.38 0.10 ${hue})`,
              flexShrink: 0,
            }}>{initials}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-1)' }}>{form.name || 'Contact name'}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{form.role || 'Role'}{form.org && ' · '}{form.org}</div>
            </div>
            <button type="button" onClick={() => set('fav', !form.fav)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: form.fav ? '#D4A24C' : 'var(--ink-4)', fontSize: 20, lineHeight: 1 }}>★</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Full name" required>
              <TextInput placeholder="First Last" value={form.name} onChange={e => set('name', e.target.value)} />
            </Field>
            <Field label="Category" required>
              <SelField value={form.cat} onChange={e => set('cat', e.target.value)} options={['Partner', 'Senior Living', 'Probate', 'Donation', 'Vendor']} />
            </Field>
            <Field label="Role / title">
              <TextInput placeholder="e.g. Move-in Coordinator" value={form.role} onChange={e => set('role', e.target.value)} />
            </Field>
            <Field label="Organization">
              <TextInput placeholder="Company or firm name" value={form.org} onChange={e => set('org', e.target.value)} />
            </Field>
            <Field label="Phone">
              <TextInput type="tel" placeholder="(555) 555-0100" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </Field>
            <Field label="Email">
              <TextInput type="email" placeholder="name@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
            </Field>
            <Field label="City" span={2}>
              <TextInput placeholder="City, State" value={form.city} onChange={e => set('city', e.target.value)} />
            </Field>
          </div>

          <div style={{ marginTop: 14 }}>
            <Field label="Notes" help="What should the team know?">
              <textarea value={form.note} onChange={e => set('note', e.target.value)} placeholder="Preferred contact method, hours, referral history…"
                style={{ ...fieldBase, minHeight: 68, resize: 'vertical' }} />
            </Field>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderTop: '1px solid var(--line)', background: 'var(--bg-2)' }}>
          <button style={btnGhost} onClick={onClose}>Cancel</button>
          <div style={{ flex: 1 }} />
          <button style={btnGhost} onClick={() => { onSave && onSave(form); setForm({ name: '', cat: 'Partner', role: '', org: '', phone: '', email: '', city: '', fav: false, note: '' }) }}>
            Save &amp; add another
          </button>
          <button style={btnPrimary} onClick={handleSave}>Save Contact</button>
        </div>
      </div>
    </>
  )
}
