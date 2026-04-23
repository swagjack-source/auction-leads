import { useState, useEffect } from 'react'
import { Plus, Search, Pencil, X, Check, Phone, Mail, DollarSign } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { ROLE_OPTIONS } from '../lib/constants'
import { useAuth } from '../lib/AuthContext'

const ROLE_COLORS = {
  'Owner':       '#A50050',
  'Manager':     '#3E5C86',
  'Lead Crew':   '#2F7A55',
  'Crew Member': '#6B7280',
  'Driver':      '#C28A2A',
  'Other':       '#71C5E8',
}

const EMPTY_EMPLOYEE = { name: '', role: '', phone: '', email: '', hourly_rate: '', active: true }

const inputStyle = {
  width: '100%', background: 'var(--bg)', border: '1px solid var(--line)',
  borderRadius: 9, padding: '8px 11px', fontSize: 13, color: 'var(--ink-1)',
  outline: 'none', fontFamily: 'inherit',
}

function EmployeeModal({ employee, projectTypes, onClose, onSave }) {
  const isNew = !employee.id
  const [form, setForm] = useState({ ...EMPTY_EMPLOYEE, ...employee })
  const [assignments, setAssignments] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { if (!isNew) fetchAssignments() }, [])

  async function fetchAssignments() {
    const { data } = await supabase.from('employee_project_types').select('project_type_id').eq('employee_id', employee.id)
    setAssignments((data || []).map(r => r.project_type_id))
  }

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }
  function toggleType(id) { setAssignments(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]) }

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true); setError(null)
    try { await onSave(form, assignments); onClose() }
    catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'var(--overlay)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'fadein 150ms' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 16, boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', animation: 'popin 180ms cubic-bezier(.2,.7,.3,1.05)' }}>
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-1)' }}>{isNew ? 'Add Employee' : 'Edit Employee'}</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--ink-3)' }}><X size={14} /></button>
        </div>

        <div style={{ padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)', borderRadius: 10, padding: '10px 14px' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>Active Employee</span>
            <button onClick={() => set('active', !form.active)} style={{ width: 40, height: 22, borderRadius: 11, background: form.active ? 'var(--win)' : 'var(--line)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
              <span style={{ position: 'absolute', top: 3, left: form.active ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
            </button>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Full Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Jane Smith" style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Role</label>
              <select value={form.role || ''} onChange={e => set('role', e.target.value)} style={inputStyle}>
                <option value="">— Select —</option>
                {ROLE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Hourly Rate ($)</label>
              <input type="number" value={form.hourly_rate || ''} onChange={e => set('hourly_rate', e.target.value)} placeholder="22.00" style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Phone</label>
              <input value={form.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="(303) 555-0100" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email</label>
              <input type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} placeholder="jane@email.com" style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Teams</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {projectTypes.map(pt => {
                const on = assignments.includes(pt.id)
                return (
                  <button key={pt.id} onClick={() => toggleType(pt.id)} style={{
                    padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    border: `1px solid ${on ? 'var(--accent)' : 'var(--line)'}`,
                    background: on ? 'var(--accent-soft)' : 'var(--bg)',
                    color: on ? 'var(--accent-ink)' : 'var(--ink-2)',
                    transition: 'all 0.12s',
                  }}>{pt.name}</button>
                )
              })}
            </div>
          </div>

          {error && <div style={{ fontSize: 12, color: 'var(--lose)' }}>{error}</div>}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : isNew ? 'Add Employee' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}

function EmployeeCard({ emp, types, onEdit, onToggle }) {
  const roleColor = ROLE_COLORS[emp.role] || '#6B7280'
  const initials = emp.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div style={{
      background: 'var(--panel)', border: '1px solid var(--line)',
      borderRadius: 14, padding: '16px',
      boxShadow: 'var(--shadow-1)',
      opacity: emp.active ? 1 : 0.55,
      display: 'flex', flexDirection: 'column', gap: 12,
      transition: 'box-shadow 140ms',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
          background: `${roleColor}18`, border: `2px solid ${roleColor}35`,
          display: 'grid', placeItems: 'center',
          fontSize: 15, fontWeight: 700, color: roleColor,
        }}>{initials}</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-1)', letterSpacing: '-0.01em', lineHeight: 1.2 }}>{emp.name}</div>
          <div style={{ display: 'flex', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
            {emp.active ? (
              <span style={{ fontSize: 10.5, fontWeight: 700, background: '#D1FAE5', color: '#065F46', border: '1px solid #A7F3D0', padding: '2px 8px', borderRadius: 999 }}>Active</span>
            ) : (
              <span style={{ fontSize: 10.5, fontWeight: 700, background: 'var(--bg)', color: 'var(--ink-4)', border: '1px solid var(--line)', padding: '2px 8px', borderRadius: 999 }}>Inactive</span>
            )}
          </div>
        </div>

        <button onClick={onEdit} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg)', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--ink-3)', flexShrink: 0 }}>
          <Pencil size={12} strokeWidth={1.8} />
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, paddingTop: 8, borderTop: '1px solid var(--line-2)' }}>
        {[
          { label: 'Active Deals', value: Math.floor(Math.random() * 12 + 3) },
          { label: 'Training',     value: `${Math.floor(Math.random() * 6 + 6)}/12` },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: 'var(--bg)', borderRadius: 8, padding: '7px 10px' }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
            <div className="tnum" style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-1)', marginTop: 2 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Contact info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {emp.email && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--ink-2)' }}>
            <Mail size={11} strokeWidth={1.8} color="var(--ink-4)" style={{ flexShrink: 0 }} />
            <a href={`mailto:${emp.email}`} style={{ color: 'inherit', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.email}</a>
          </div>
        )}
        {emp.phone && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--ink-2)' }}>
            <Phone size={11} strokeWidth={1.8} color="var(--ink-4)" style={{ flexShrink: 0 }} />
            <a href={`tel:${emp.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>{emp.phone}</a>
          </div>
        )}
      </div>

      {/* Teams */}
      {types.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {types.map(t => (
            <span key={t.id} style={{
              fontSize: 10.5, fontWeight: 600,
              background: 'var(--accent-soft)', color: 'var(--accent-ink)',
              border: '1px solid var(--accent-soft-2)',
              padding: '2px 8px', borderRadius: 999,
            }}>{t.name}</span>
          ))}
        </div>
      )}

      {/* Footer toggle */}
      <button
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          padding: '6px', borderRadius: 8, border: '1px solid var(--line)',
          background: 'var(--bg)', color: emp.active ? 'var(--ink-3)' : 'var(--win)',
          fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
        }}
      >
        {emp.active ? <><X size={11} strokeWidth={2} /> Deactivate</> : <><Check size={11} strokeWidth={2} /> Activate</>}
      </button>
    </div>
  )
}

export default function Employees() {
  const { organizationId } = useAuth()
  const [employees, setEmployees]     = useState([])
  const [projectTypes, setProjectTypes] = useState([])
  const [employeeTypes, setEmployeeTypes] = useState({})
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [filterActive, setFilterActive] = useState('active')
  const [modalEmployee, setModalEmployee] = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [empRes, ptRes, tmRes] = await Promise.all([
      supabase.from('employees').select('*').order('name'),
      supabase.from('project_types').select('*').order('name'),
      supabase.from('employee_project_types').select('employee_id, project_type_id, project_types(name)'),
    ])
    setEmployees(empRes.data || [])
    setProjectTypes(ptRes.data || [])
    const map = {}
    for (const row of (tmRes.data || [])) {
      if (!map[row.employee_id]) map[row.employee_id] = []
      map[row.employee_id].push({ id: row.project_type_id, name: row.project_types?.name })
    }
    setEmployeeTypes(map)
    setLoading(false)
  }

  async function handleSave(form, typeIds) {
    const payload = {
      name: form.name.trim(), role: form.role || null,
      phone: form.phone || null, email: form.email || null,
      hourly_rate: form.hourly_rate !== '' ? Number(form.hourly_rate) : null,
      active: form.active,
      organization_id: organizationId,
    }
    let empId = form.id
    if (!form.id) {
      const { data, error } = await supabase.from('employees').insert(payload).select().single()
      if (error) throw new Error(error.message)
      empId = data.id
    } else {
      const { error } = await supabase.from('employees').update(payload).eq('id', form.id)
      if (error) throw new Error(error.message)
    }
    await supabase.from('employee_project_types').delete().eq('employee_id', empId)
    if (typeIds.length > 0) {
      await supabase.from('employee_project_types').insert(typeIds.map(tid => ({ employee_id: empId, project_type_id: tid, organization_id: organizationId })))
    }
    await fetchAll()
  }

  async function toggleActive(emp) {
    await supabase.from('employees').update({ active: !emp.active }).eq('id', emp.id)
    setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, active: !emp.active } : e))
  }

  const filtered = employees.filter(e => {
    if (filterActive === 'active' && !e.active) return false
    if (filterActive === 'inactive' && e.active) return false
    if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.role?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const activeCount = employees.filter(e => e.active).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--line)', background: 'var(--panel)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink-1)', margin: 0, letterSpacing: '-0.02em' }}>Employees</h1>
            <p style={{ fontSize: 12.5, color: 'var(--ink-3)', margin: '2px 0 0' }}>
              {employees.length} on the team · {activeCount} active
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--ink-2)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', boxShadow: 'var(--shadow-1)' }}>
              Export
            </button>
            <button className="btn btn-primary" onClick={() => setModalEmployee({ ...EMPTY_EMPLOYEE })} style={{ fontSize: 12.5, padding: '7px 13px 7px 10px', borderRadius: 10 }}>
              <Plus size={13} strokeWidth={2.5} /> Invite Member
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 9, padding: '7px 10px' }}>
            <Search size={13} color="var(--ink-4)" strokeWidth={1.8} />
            <input placeholder="Search employees…" value={search} onChange={e => setSearch(e.target.value)} style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: 'var(--ink-1)', fontFamily: 'inherit', width: 160 }} />
          </div>
          <div style={{ display: 'inline-flex', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 10, padding: 2, boxShadow: 'var(--shadow-1)' }}>
            {[['all', 'All'], ['active', 'Active'], ['inactive', 'Inactive']].map(([val, label]) => (
              <button key={val} onClick={() => setFilterActive(val)} style={{
                padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                background: filterActive === val ? 'var(--accent-soft)' : 'transparent',
                color: filterActive === val ? 'var(--accent-ink)' : 'var(--ink-3)',
              }}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--ink-4)', fontSize: 13, marginTop: 60 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--ink-4)', fontSize: 13, marginTop: 60 }}>
            {employees.length === 0 ? 'No employees yet.' : 'No employees match your search.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, maxWidth: 1100 }}>
            {filtered.map(emp => (
              <EmployeeCard
                key={emp.id}
                emp={emp}
                types={employeeTypes[emp.id] || []}
                onEdit={() => setModalEmployee(emp)}
                onToggle={() => toggleActive(emp)}
              />
            ))}
          </div>
        )}
      </div>

      {modalEmployee && (
        <EmployeeModal employee={modalEmployee} projectTypes={projectTypes} onClose={() => setModalEmployee(null)} onSave={handleSave} />
      )}
    </div>
  )
}
