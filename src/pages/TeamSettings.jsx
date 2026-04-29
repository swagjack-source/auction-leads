import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Copy, Check, Trash2, X, Shield, User, Users,
  ChevronDown, Mail, Phone, DollarSign, Briefcase, AlertTriangle,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { validateEmail, validatePhone, validateRequired } from '../lib/validate'
import { useSupabaseQuery } from '../lib/useSupabaseQuery'

// ─── Shared styles ──────────────────────────────────────────────────────────

const inputStyle = {
  width: '100%', background: 'var(--bg)', border: '1px solid var(--line)',
  borderRadius: 9, padding: '8px 11px', fontSize: 13, color: 'var(--ink-1)',
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
}
const labelStyle = {
  fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', display: 'block',
  marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em',
}
const btnPrimary = {
  padding: '8px 16px', borderRadius: 9, border: 'none',
  background: 'var(--accent)', color: 'white',
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
const btnSecondary = {
  padding: '8px 14px', borderRadius: 9, border: '1px solid var(--line)',
  background: 'none', color: 'var(--ink-2)',
  fontSize: 13, fontWeight: 500, cursor: 'pointer',
}

// ─── Constants ───────────────────────────────────────────────────────────────

const INVITE_ROLES = [
  { value: 'owner',    label: 'Owner',    desc: 'Full access, franchise owner' },
  { value: 'co_owner', label: 'Co-Owner', desc: 'Full access, equal partner' },
  { value: 'admin',    label: 'Admin',    desc: 'Manage team, leads, projects' },
  { value: 'bdr',      label: 'BDR',      desc: 'Business development rep' },
]

const ROLE_COLORS = {
  owner:    '#A50050',
  co_owner: '#7c3aed',
  admin:    '#3E5C86',
  bdr:      '#C28A2A',
}

const STATUS_COLORS = {
  active:  '#22c55e',
  pending: '#f59e0b',
}

const EMPLOYEE_ROLES = [
  { value: 'Team Member', label: 'Team Member' },
  { value: 'Lead',        label: 'Lead'        },
  { value: 'BDR',         label: 'BDR'         },
  { value: 'Owner',       label: 'Owner'       },
]

const TEAM_COLORS = {
  'Clean Out':          '#3B82F6',
  'Auction':            '#7F77DD',
  'Senior Move':        '#1D9E75',
  'Packing/Unpacking':  '#D97706',
  'In-Person Sale':     '#C2410C',
}

const AVATAR_COLORS = ['#3B82F6','#7F77DD','#1D9E75','#D97706','#C2410C','#6366F1','#0891B2','#DB2777']
function avatarBg(str) {
  let h = 0
  for (let i = 0; i < (str||'').length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

// ─── Invite modal (for owners/admins) ────────────────────────────────────────

function InviteModal({ onClose, onInvited, organizationId }) {
  const { user } = useAuth()
  const [email,   setEmail]   = useState('')
  const [role,    setRole]    = useState('admin')
  const [isAdmin, setIsAdmin] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [link,    setLink]    = useState(null)
  const [copied,  setCopied]  = useState(false)
  const [error,   setError]   = useState(null)

  async function handleCreate() {
    const emailErr = validateEmail(email)
    if (emailErr) { setError(emailErr); return }
    setSaving(true); setError(null)
    const { data, error: err } = await supabase
      .from('org_invites')
      .insert({
        organization_id: organizationId,
        email: email.trim() || null,
        role, is_admin: isAdmin,
        invited_by: user?.id,
      })
      .select().single()
    setSaving(false)
    if (err) { setError(err.message); return }
    setLink(`${window.location.origin}/join#token=${data.token}`)
    onInvited?.()
  }

  function copyLink() {
    navigator.clipboard.writeText(link)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      style={{ position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.7)',
        display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background:'var(--panel)',border:'1px solid var(--line)',borderRadius:14,
        width:'100%',maxWidth:460,overflow:'hidden' }}>

        <div style={{ padding:'16px 20px',borderBottom:'1px solid var(--line)',
          display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:15,fontWeight:700,color:'var(--ink-1)' }}>Invite Team Member</div>
            <div style={{ fontSize:11.5,color:'var(--ink-3)',marginTop:2 }}>
              Owners, co-owners, admins &amp; BDRs — people with app login access
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--ink-3)' }}>
            <X size={16}/>
          </button>
        </div>

        {!link ? (
          <div style={{ padding:20,display:'flex',flexDirection:'column',gap:14 }}>
            <div>
              <label style={labelStyle}>Email (optional)</label>
              <input
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="teammate@example.com" style={inputStyle}
              />
              <div style={{ fontSize:11,color:'var(--ink-4)',marginTop:4 }}>
                Leave blank to create a general invite link anyone can use.
              </div>
            </div>

            <div>
              <label style={labelStyle}>Role</label>
              <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
                {INVITE_ROLES.map(r => (
                  <button
                    key={r.value} onClick={() => setRole(r.value)}
                    style={{
                      display:'flex',alignItems:'center',gap:10,padding:'8px 12px',
                      borderRadius:9,border:`1px solid ${role===r.value ? ROLE_COLORS[r.value] : 'var(--line)'}`,
                      background: role===r.value ? `${ROLE_COLORS[r.value]}10` : 'var(--bg)',
                      cursor:'pointer',textAlign:'left',fontFamily:'inherit',transition:'all 0.1s',
                    }}
                  >
                    <span style={{ width:10,height:10,borderRadius:'50%',background:ROLE_COLORS[r.value],flexShrink:0 }}/>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12.5,fontWeight:600,color:role===r.value?ROLE_COLORS[r.value]:'var(--ink-1)' }}>
                        {r.label}
                      </div>
                      <div style={{ fontSize:11,color:'var(--ink-4)' }}>{r.desc}</div>
                    </div>
                    {role === r.value && (
                      <Check size={13} color={ROLE_COLORS[r.value]}/>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',
              background:'var(--bg)',borderRadius:9,padding:'10px 14px' }}>
              <div>
                <div style={{ fontSize:12.5,fontWeight:600,color:'var(--ink-2)' }}>Admin access</div>
                <div style={{ fontSize:11,color:'var(--ink-4)' }}>Can manage team members and org settings</div>
              </div>
              <button
                onClick={() => setIsAdmin(a => !a)}
                style={{ width:40,height:22,borderRadius:11,background:isAdmin?'var(--accent)':'var(--line)',
                  border:'none',cursor:'pointer',position:'relative',transition:'background 0.2s',flexShrink:0 }}
              >
                <span style={{ position:'absolute',top:3,left:isAdmin?21:3,width:16,height:16,
                  borderRadius:'50%',background:'#fff',transition:'left 0.2s' }}/>
              </button>
            </div>

            {error && <div style={{ color:'#ef4444',fontSize:12.5 }}>{error}</div>}

            <div style={{ display:'flex',justifyContent:'flex-end',gap:8 }}>
              <button onClick={onClose} style={btnSecondary}>Cancel</button>
              <button onClick={handleCreate} disabled={saving}
                style={{ ...btnPrimary, opacity:saving?0.7:1 }}>
                {saving ? 'Generating…' : 'Generate Invite Link'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding:20,display:'flex',flexDirection:'column',gap:16 }}>
            <div style={{ textAlign:'center',padding:'12px 0' }}>
              <div style={{ fontSize:32,marginBottom:8 }}>🔗</div>
              <div style={{ fontSize:14,fontWeight:700,color:'var(--ink-1)' }}>Invite link created!</div>
              <div style={{ fontSize:12.5,color:'var(--ink-3)',marginTop:4 }}>
                Share this link with your team member. It expires in 7 days.
              </div>
            </div>
            <div style={{ background:'var(--bg)',border:'1px solid var(--line)',borderRadius:9,
              padding:'10px 12px',display:'flex',alignItems:'center',gap:8 }}>
              <span style={{ flex:1,fontSize:11.5,color:'var(--ink-2)',wordBreak:'break-all',fontFamily:'monospace' }}>
                {link}
              </span>
              <button onClick={copyLink} style={{ flexShrink:0,display:'flex',alignItems:'center',gap:5,
                padding:'5px 10px',borderRadius:7,border:'1px solid var(--line)',
                background:'var(--panel)',color:'var(--ink-2)',fontSize:12,fontWeight:600,cursor:'pointer' }}>
                {copied ? <Check size={12} color="#22c55e"/> : <Copy size={12}/>}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <button onClick={onClose} style={{ ...btnPrimary, width:'100%',padding:9,textAlign:'center' }}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Add / Edit Employee modal ───────────────────────────────────────────────

const EMPTY_EMP = { name:'', role:'Team Member', phone:'', email:'', hourly_rate:'' }

function EmployeeModal({ employee, currentTeamIds, projectTypes, onClose, onSaved }) {
  const isEdit = !!employee?.id
  const [form, setForm] = useState(employee ? {
    name:        employee.name        || '',
    role:        employee.role        || 'Team Member',
    phone:       employee.phone       || '',
    email:       employee.email       || '',
    hourly_rate: employee.hourly_rate != null ? String(employee.hourly_rate) : '',
  } : { ...EMPTY_EMP })
  const [selectedTeams, setSelectedTeams] = useState(currentTeamIds || [])
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)

  const [maxHours, setMaxHours] = useState(employee?.max_weekly_hours ?? 40)
  const [workDays, setWorkDays] = useState(employee?.work_days ?? ['Mon','Tue','Wed','Thu','Fri'])
  const [timeOffBlocks, setTimeOffBlocks] = useState([])
  const [loadingBlocks, setLoadingBlocks] = useState(false)
  const [newBlock, setNewBlock] = useState({ start_date:'', end_date:'', reason:'' })

  useEffect(() => {
    if (!employee?.id) return
    setLoadingBlocks(true)
    supabase.from('employee_unavailability')
      .select('*')
      .eq('employee_id', employee.id)
      .gte('end_date', new Date().toISOString().split('T')[0])
      .order('start_date')
      .then(({ data }) => { setTimeOffBlocks(data || []); setLoadingBlocks(false) })
  }, [employee?.id])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }
  function toggleTeam(id) {
    setSelectedTeams(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  function toggleDay(day) {
    setWorkDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])
  }

  async function handleSave() {
    const nameErr  = validateRequired(form.name, 'Name')
    const emailErr = validateEmail(form.email)
    const phoneErr = validatePhone(form.phone)
    if (nameErr || emailErr || phoneErr) { setError(nameErr || emailErr || phoneErr); return }

    setSaving(true); setError(null)
    const payload = {
      name:             form.name.trim(),
      role:             form.role || null,
      phone:            form.phone.trim() || null,
      email:            form.email.trim() || null,
      hourly_rate:      form.hourly_rate ? parseFloat(form.hourly_rate) : null,
      active:           true,
      max_weekly_hours: maxHours,
      work_days:        workDays,
    }

    let res
    if (isEdit) {
      res = await supabase.from('employees').update(payload).eq('id', employee.id).select().single()
    } else {
      res = await supabase.from('employees').insert(payload).select().single()
    }
    if (res.error) { setSaving(false); setError(res.error.message); return }

    const empId = res.data.id
    // Sync team assignments — delete existing, re-insert selected
    await supabase.from('employee_project_types').delete().eq('employee_id', empId)
    if (selectedTeams.length > 0) {
      await supabase.from('employee_project_types').insert(
        selectedTeams.map(ptId => ({ employee_id: empId, project_type_id: ptId }))
      )
    }

    // Sync unavailability — delete future blocks and re-insert
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('employee_unavailability').delete()
      .eq('employee_id', empId).gte('end_date', today)

    if (timeOffBlocks.length > 0) {
      await supabase.from('employee_unavailability').insert(
        timeOffBlocks.map(b => ({
          employee_id: empId,
          start_date:  b.start_date,
          end_date:    b.end_date,
          reason:      b.reason || null,
        }))
      )
    }

    setSaving(false)
    onSaved(res.data, isEdit, selectedTeams)
  }

  return (
    <div
      style={{ position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.7)',
        display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background:'var(--panel)',border:'1px solid var(--line)',borderRadius:14,
        width:'100%',maxWidth:460,maxHeight:'90vh',overflow:'hidden',display:'flex',flexDirection:'column' }}>

        <div style={{ padding:'16px 20px',borderBottom:'1px solid var(--line)',
          display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0 }}>
          <div>
            <div style={{ fontSize:15,fontWeight:700,color:'var(--ink-1)' }}>
              {isEdit ? 'Edit Employee' : 'Add Employee'}
            </div>
            <div style={{ fontSize:11.5,color:'var(--ink-3)',marginTop:2 }}>
              Field crew assigned to jobs on the Crew Schedule
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--ink-3)' }}>
            <X size={16}/>
          </button>
        </div>

        <div style={{ padding:20,display:'flex',flexDirection:'column',gap:14,overflowY:'auto' }}>
          {/* Name */}
          <div>
            <label style={labelStyle}>Full Name *</label>
            <div style={{ position:'relative' }}>
              <User size={13} color="var(--ink-4)" style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',pointerEvents:'none' }}/>
              <input
                value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="e.g. Marcus Williams"
                style={{ ...inputStyle, paddingLeft:30 }}
                autoFocus
              />
            </div>
          </div>

          {/* Role dropdown */}
          <div>
            <label style={labelStyle}>Role</label>
            <div style={{ position:'relative' }}>
              <Briefcase size={13} color="var(--ink-4)" style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',pointerEvents:'none' }}/>
              <ChevronDown size={13} color="var(--ink-4)" style={{ position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',pointerEvents:'none' }}/>
              <select
                value={form.role} onChange={e => set('role', e.target.value)}
                style={{ ...inputStyle, paddingLeft:30, paddingRight:30, appearance:'none', cursor:'pointer' }}
              >
                {EMPLOYEE_ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Teams multi-select */}
          <div>
            <label style={labelStyle}>Teams</label>
            <div style={{ fontSize:11.5,color:'var(--ink-4)',marginBottom:8 }}>
              Select which project types this employee works on
            </div>
            <div style={{ display:'flex',flexWrap:'wrap',gap:7 }}>
              {(projectTypes || []).map(pt => {
                const selected = selectedTeams.includes(pt.id)
                const color = TEAM_COLORS[pt.name] || '#6B7280'
                return (
                  <button
                    key={pt.id}
                    onClick={() => toggleTeam(pt.id)}
                    style={{
                      display:'flex',alignItems:'center',gap:6,
                      padding:'5px 12px',borderRadius:999,
                      border:`1.5px solid ${selected ? color : 'var(--line)'}`,
                      background: selected ? `${color}15` : 'var(--bg)',
                      color: selected ? color : 'var(--ink-3)',
                      fontSize:12,fontWeight:600,cursor:'pointer',
                      transition:'all 0.1s',fontFamily:'inherit',
                    }}
                  >
                    <span style={{ width:7,height:7,borderRadius:'50%',
                      background: selected ? color : 'var(--line)',flexShrink:0 }}/>
                    {pt.name}
                    {selected && <Check size={11}/>}
                  </button>
                )
              })}
              {(!projectTypes || projectTypes.length === 0) && (
                <div style={{ fontSize:12,color:'var(--ink-4)',fontStyle:'italic' }}>
                  No project types found
                </div>
              )}
            </div>
          </div>

          {/* Phone + Email row */}
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
            <div>
              <label style={labelStyle}>Phone</label>
              <div style={{ position:'relative' }}>
                <Phone size={13} color="var(--ink-4)" style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',pointerEvents:'none' }}/>
                <input
                  value={form.phone} onChange={e => set('phone', e.target.value)}
                  placeholder="(303) 555-0100"
                  style={{ ...inputStyle, paddingLeft:30 }}
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <div style={{ position:'relative' }}>
                <Mail size={13} color="var(--ink-4)" style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',pointerEvents:'none' }}/>
                <input
                  value={form.email} onChange={e => set('email', e.target.value)}
                  placeholder="name@email.com"
                  style={{ ...inputStyle, paddingLeft:30 }}
                />
              </div>
            </div>
          </div>

          {/* Hourly rate */}
          <div>
            <label style={labelStyle}>Hourly Rate</label>
            <div style={{ position:'relative' }}>
              <DollarSign size={13} color="var(--ink-4)" style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',pointerEvents:'none' }}/>
              <input
                value={form.hourly_rate} onChange={e => set('hourly_rate', e.target.value)}
                placeholder="22.00" type="number" min="0" step="0.50"
                style={{ ...inputStyle, paddingLeft:28 }}
              />
            </div>
          </div>

          {/* ── Availability ── */}
          <div style={{ borderTop:'1px solid var(--line-2)', paddingTop:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>
              Availability
            </div>

            {/* Max weekly hours */}
            <div style={{ marginBottom:12 }}>
              <label style={labelStyle}>Max Weekly Hours</label>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <input
                  type="number" min={1} max={80} value={maxHours}
                  onChange={e => setMaxHours(parseInt(e.target.value) || 40)}
                  style={{ ...inputStyle, width:90 }}
                />
                <span style={{ fontSize:12.5, color:'var(--ink-3)' }}>hrs / week (default 40)</span>
              </div>
            </div>

            {/* Work days */}
            <div style={{ marginBottom:14 }}>
              <label style={labelStyle}>Work Days</label>
              <div style={{ display:'flex', gap:6 }}>
                {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => {
                  const on = workDays.includes(day)
                  return (
                    <button key={day} onClick={() => toggleDay(day)}
                      style={{ width:38, height:34, borderRadius:8, border:`1.5px solid ${on ? 'var(--accent)' : 'var(--line)'}`,
                        background: on ? 'var(--accent-soft)' : 'var(--bg)',
                        color: on ? 'var(--accent)' : 'var(--ink-4)',
                        fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                      {day.slice(0,2)}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Time off blocks */}
            <div>
              <label style={labelStyle}>Time Off / Unavailable Dates</label>

              {loadingBlocks ? (
                <div style={{ fontSize:12, color:'var(--ink-4)' }}>Loading…</div>
              ) : (
                <>
                  {/* Existing blocks */}
                  {timeOffBlocks.map((b, i) => (
                    <div key={b.id || i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6,
                      background:'var(--bg)', border:'1px solid var(--line)', borderRadius:8, padding:'7px 10px' }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:12.5, fontWeight:600, color:'var(--ink-1)' }}>
                          {b.start_date} → {b.end_date}
                        </div>
                        {b.reason && <div style={{ fontSize:11.5, color:'var(--ink-3)' }}>{b.reason}</div>}
                      </div>
                      <button onClick={() => setTimeOffBlocks(prev => prev.filter((_, idx) => idx !== i))}
                        style={{ background:'none', border:'none', cursor:'pointer', color:'var(--ink-4)', padding:2 }}>
                        <X size={13}/>
                      </button>
                    </div>
                  ))}

                  {/* Add new block row */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto', gap:6, alignItems:'center', marginTop:6 }}>
                    <input type="date" value={newBlock.start_date}
                      onChange={e => setNewBlock(p => ({ ...p, start_date: e.target.value }))}
                      style={{ ...inputStyle, fontSize:12 }} placeholder="Start"/>
                    <input type="date" value={newBlock.end_date}
                      onChange={e => setNewBlock(p => ({ ...p, end_date: e.target.value }))}
                      style={{ ...inputStyle, fontSize:12 }} placeholder="End"/>
                    <input value={newBlock.reason}
                      onChange={e => setNewBlock(p => ({ ...p, reason: e.target.value }))}
                      style={{ ...inputStyle, fontSize:12 }} placeholder="Reason (optional)"/>
                    <button
                      onClick={() => {
                        if (!newBlock.start_date || !newBlock.end_date) return
                        setTimeOffBlocks(prev => [...prev, { ...newBlock, id: null }])
                        setNewBlock({ start_date:'', end_date:'', reason:'' })
                      }}
                      style={{ padding:'7px 10px', borderRadius:8, border:'none',
                        background:'var(--accent)', color:'white', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                      + Add
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {error && (
            <div style={{ display:'flex',alignItems:'center',gap:6,color:'#ef4444',fontSize:12.5 }}>
              <AlertTriangle size={13}/>{error}
            </div>
          )}

          <div style={{ display:'flex',justifyContent:'flex-end',gap:8,paddingTop:4 }}>
            <button onClick={onClose} style={btnSecondary}>Cancel</button>
            <button onClick={handleSave} disabled={saving}
              style={{ ...btnPrimary, opacity:saving?0.7:1 }}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Employee'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Employee row ─────────────────────────────────────────────────────────────

function EmployeeRow({ employee, idx, teams, onEdit, onToggleActive, onDelete }) {
  const bg = avatarBg(employee.name)
  const initials = employee.name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()

  return (
    <div style={{ display:'flex',alignItems:'center',gap:12,padding:'12px 16px',
      borderBottom:'1px solid var(--line-2)',
      opacity: employee.active ? 1 : 0.55 }}>

      {/* Avatar */}
      <div style={{ width:36,height:36,borderRadius:'50%',background:bg,color:'#fff',
        display:'grid',placeItems:'center',fontSize:12,fontWeight:700,flexShrink:0 }}>
        {initials}
      </div>

      {/* Info */}
      <div style={{ flex:1,minWidth:0 }}>
        <div style={{ fontSize:13,fontWeight:600,color:'var(--ink-1)',display:'flex',alignItems:'center',gap:6,flexWrap:'wrap' }}>
          {employee.name}
          {employee.role && (
            <span style={{ fontSize:10,fontWeight:700,color:'var(--ink-3)',background:'var(--line)',
              borderRadius:999,padding:'1px 7px' }}>{employee.role}</span>
          )}
          {!employee.active && (
            <span style={{ fontSize:10,fontWeight:700,color:'var(--ink-4)',background:'var(--line)',
              borderRadius:999,padding:'1px 6px' }}>Inactive</span>
          )}
        </div>
        <div style={{ display:'flex',gap:6,marginTop:4,flexWrap:'wrap',alignItems:'center' }}>
          {/* Team pills */}
          {(teams || []).map(t => {
            const color = TEAM_COLORS[t] || '#6B7280'
            return (
              <span key={t} style={{ fontSize:10.5,fontWeight:600,color,
                background:`${color}12`,border:`1px solid ${color}30`,
                borderRadius:999,padding:'1px 7px' }}>{t}</span>
            )
          })}
          {employee.hourly_rate != null && (
            <span style={{ fontSize:11.5,color:'var(--ink-4)' }}>${employee.hourly_rate}/hr</span>
          )}
          {employee.phone && (
            <span style={{ fontSize:11.5,color:'var(--ink-4)' }}>{employee.phone}</span>
          )}
        </div>
      </div>

      {/* Edit */}
      <button
        onClick={() => onEdit(employee)}
        style={{ padding:'5px 10px',borderRadius:8,border:'1px solid var(--line)',
          background:'var(--bg)',color:'var(--ink-3)',fontSize:12,fontWeight:500,cursor:'pointer' }}
      >
        Edit
      </button>

      {/* Active toggle */}
      <button
        onClick={() => onToggleActive(employee)}
        title={employee.active ? 'Deactivate' : 'Reactivate'}
        style={{ width:40,height:22,borderRadius:11,
          background:employee.active ? 'var(--accent)' : 'var(--line)',
          border:'none',cursor:'pointer',position:'relative',transition:'background 0.2s',flexShrink:0 }}
      >
        <span style={{ position:'absolute',top:3,left:employee.active?21:3,width:16,height:16,
          borderRadius:'50%',background:'#fff',transition:'left 0.2s' }}/>
      </button>

      {/* Delete */}
      <button
        onClick={() => onDelete(employee.id)}
        style={{ width:28,height:28,borderRadius:7,border:'1px solid var(--line)',
          background:'var(--bg)',cursor:'pointer',display:'grid',placeItems:'center',color:'var(--ink-4)' }}
      >
        <Trash2 size={13}/>
      </button>
    </div>
  )
}

// ─── Member row ───────────────────────────────────────────────────────────────

function MemberRow({ member, onDelete, onRoleChange, onAdminToggle }) {
  const roleColor = ROLE_COLORS[member.role] || '#6B7280'
  const roleLabel = INVITE_ROLES.find(r => r.value === member.role)?.label || member.role
  const [showRoles, setShowRoles] = useState(false)

  return (
    <div style={{ display:'flex',alignItems:'center',gap:12,padding:'12px 16px',
      borderBottom:'1px solid var(--line-2)' }}>
      <div style={{ width:36,height:36,borderRadius:'50%',
        background:`${roleColor}18`,border:`2px solid ${roleColor}30`,
        display:'grid',placeItems:'center',fontSize:13,fontWeight:700,color:roleColor,flexShrink:0 }}>
        {member.email?.[0]?.toUpperCase() || '?'}
      </div>

      <div style={{ flex:1,minWidth:0 }}>
        <div style={{ fontSize:13,fontWeight:600,color:'var(--ink-1)',
          overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
          {member.email}
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:6,marginTop:2 }}>
          <span style={{
            fontSize:10,fontWeight:700,
            color: STATUS_COLORS[member.status] || 'var(--ink-4)',
            background: `${STATUS_COLORS[member.status] || '#6B7280'}12`,
            border: `1px solid ${STATUS_COLORS[member.status] || '#6B7280'}30`,
            borderRadius:999,padding:'1px 6px',
          }}>{member.status}</span>
          {member.is_admin && (
            <span style={{ display:'flex',alignItems:'center',gap:3,fontSize:10,fontWeight:700,
              color:'#7c3aed',background:'rgba(124,58,237,0.1)',borderRadius:999,padding:'1px 6px' }}>
              <Shield size={8}/>Admin
            </span>
          )}
        </div>
      </div>

      {/* Role dropdown */}
      <div style={{ position:'relative' }}>
        <button
          onClick={() => setShowRoles(s => !s)}
          style={{ display:'flex',alignItems:'center',gap:5,padding:'5px 10px',borderRadius:8,
            border:`1px solid ${roleColor}40`,background:`${roleColor}10`,
            color:roleColor,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit' }}
        >
          {roleLabel}<ChevronDown size={11}/>
        </button>
        {showRoles && (
          <div style={{ position:'absolute',right:0,top:'calc(100% + 4px)',zIndex:50,
            background:'var(--panel)',border:'1px solid var(--line)',borderRadius:10,
            boxShadow:'0 4px 20px rgba(0,0,0,0.15)',minWidth:160,overflow:'hidden' }}>
            {INVITE_ROLES.map(r => (
              <button
                key={r.value}
                onClick={() => { onRoleChange(member.id, r.value); setShowRoles(false) }}
                style={{ display:'block',width:'100%',padding:'7px 12px',border:'none',
                  background: member.role===r.value ? `${ROLE_COLORS[r.value]}12` : 'transparent',
                  color: member.role===r.value ? ROLE_COLORS[r.value] : 'var(--ink-2)',
                  fontSize:12.5,fontWeight:member.role===r.value?600:400,
                  cursor:'pointer',textAlign:'left',fontFamily:'inherit' }}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => onAdminToggle(member)}
        title={member.is_admin ? 'Remove admin' : 'Make admin'}
        style={{ width:28,height:28,borderRadius:7,
          border:`1px solid ${member.is_admin?'#7c3aed':'var(--line)'}`,
          background:member.is_admin?'rgba(124,58,237,0.1)':'var(--bg)',
          cursor:'pointer',display:'grid',placeItems:'center',
          color:member.is_admin?'#7c3aed':'var(--ink-4)' }}
      >
        <Shield size={13}/>
      </button>
      <button
        onClick={() => onDelete(member.id)}
        style={{ width:28,height:28,borderRadius:7,border:'1px solid var(--line)',
          background:'var(--bg)',cursor:'pointer',display:'grid',placeItems:'center',color:'var(--ink-4)' }}
      >
        <Trash2 size={13}/>
      </button>
    </div>
  )
}

// ─── Invite row ───────────────────────────────────────────────────────────────

function InviteRow({ invite, onRevoke }) {
  const [copied, setCopied] = useState(false)
  const link = `${window.location.origin}/join#token=${invite.token}`
  function copy() {
    navigator.clipboard.writeText(link)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }
  const expired = invite.expires_at && new Date(invite.expires_at) < new Date()

  return (
    <div style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 16px',
      borderBottom:'1px solid var(--line-2)',opacity:expired?0.5:1 }}>
      <div style={{ flex:1,minWidth:0 }}>
        <div style={{ fontSize:12.5,fontWeight:600,color:'var(--ink-1)' }}>
          {invite.email || 'Open invite'}
        </div>
        <div style={{ fontSize:11,color:'var(--ink-4)',marginTop:1 }}>
          {INVITE_ROLES.find(r=>r.value===invite.role)?.label || invite.role}
          {invite.is_admin && ' · Admin'}
          {' · '}
          {expired ? 'Expired' : invite.accepted_at ? 'Accepted' : `Expires ${new Date(invite.expires_at).toLocaleDateString()}`}
        </div>
      </div>
      {!invite.accepted_at && !expired && (
        <button onClick={copy} style={{ display:'flex',alignItems:'center',gap:4,padding:'4px 9px',
          borderRadius:7,border:'1px solid var(--line)',background:'var(--bg)',
          color:'var(--ink-3)',fontSize:11.5,fontWeight:600,cursor:'pointer' }}>
          {copied ? <Check size={11} color="#22c55e"/> : <Copy size={11}/>}
          {copied ? 'Copied' : 'Copy link'}
        </button>
      )}
      <button onClick={() => onRevoke(invite.id)} style={{ width:26,height:26,borderRadius:7,
        border:'1px solid var(--line)',background:'var(--bg)',cursor:'pointer',
        display:'grid',placeItems:'center',color:'var(--ink-4)' }}>
        <X size={12}/>
      </button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TeamSettings() {
  const navigate = useNavigate()
  const { organizationId } = useAuth()
  const [tab,          setTab]          = useState('employees')
  const [showInvite,   setShowInvite]   = useState(false)
  const [editEmployee, setEditEmployee] = useState(null)   // null | {} (new) | {id,...} (edit)
  const [showInactive, setShowInactive] = useState(false)

  // ── Data ──────────────────────────────────────────────────────
  const { data, loading, error, refetch, mutate } = useSupabaseQuery(async () => {
    const [empRes, ptRes, eptRes, mRes, iRes] = await Promise.all([
      supabase.from('employees').select('*').order('name'),
      supabase.from('project_types').select('*').order('name'),
      supabase.from('employee_project_types').select('employee_id, project_type_id, project_types(name)'),
      supabase.from('org_members').select('*').order('created_at'),
      supabase.from('org_invites').select('*').order('created_at', { ascending:false }),
    ])

    // Build map: employee_id -> [project_type_id]
    const empTeamIds = {}
    // Build map: employee_id -> [team name]
    const empTeamNames = {}
    for (const r of (eptRes.data || [])) {
      if (!empTeamIds[r.employee_id])   empTeamIds[r.employee_id]   = []
      if (!empTeamNames[r.employee_id]) empTeamNames[r.employee_id] = []
      empTeamIds[r.employee_id].push(r.project_type_id)
      if (r.project_types?.name) empTeamNames[r.employee_id].push(r.project_types.name)
    }

    return {
      employees:      empRes.error ? [] : empRes.data || [],
      projectTypes:   ptRes.error  ? [] : ptRes.data  || [],
      empTeamIds,
      empTeamNames,
      members:        mRes.error   ? [] : mRes.data   || [],
      invites:        iRes.error   ? [] : iRes.data   || [],
      orgTablesExist: !mRes.error,
    }
  }, [], { errorMessage: 'Failed to load team data.' })

  const employees      = data?.employees    ?? []
  const projectTypes   = data?.projectTypes ?? []
  const empTeamIds     = data?.empTeamIds   ?? {}
  const empTeamNames   = data?.empTeamNames ?? {}
  const members        = data?.members      ?? []
  const invites        = data?.invites      ?? []
  const orgTablesExist = data?.orgTablesExist ?? false

  const activeEmployees   = employees.filter(e => e.active)
  const inactiveEmployees = employees.filter(e => !e.active)
  const pendingInvites    = invites.filter(i => !i.accepted_at && new Date(i.expires_at) > new Date())

  // ── Employee handlers ─────────────────────────────────────────

  function handleEmployeeSaved(emp, isEdit, selectedTeamIds) {
    mutate(prev => {
      if (!prev) return prev
      const list = isEdit
        ? prev.employees.map(e => e.id === emp.id ? emp : e)
        : [...prev.employees, emp]
      // Rebuild team maps
      const newTeamIds   = { ...prev.empTeamIds,   [emp.id]: selectedTeamIds }
      const newTeamNames = { ...prev.empTeamNames,  [emp.id]: (selectedTeamIds || [])
        .map(tid => prev.projectTypes.find(pt => pt.id === tid)?.name).filter(Boolean) }
      return { ...prev, employees: list, empTeamIds: newTeamIds, empTeamNames: newTeamNames }
    })
    setEditEmployee(null)
  }

  async function handleToggleActive(emp) {
    const active = !emp.active
    await supabase.from('employees').update({ active }).eq('id', emp.id)
    mutate(prev => prev ? {
      ...prev,
      employees: prev.employees.map(e => e.id === emp.id ? { ...e, active } : e),
    } : prev)
  }

  async function handleDeleteEmployee(id) {
    if (!window.confirm('Remove this employee? This cannot be undone.')) return
    await supabase.from('employees').delete().eq('id', id)
    mutate(prev => prev ? { ...prev, employees: prev.employees.filter(e => e.id !== id) } : prev)
  }

  // ── Member handlers ───────────────────────────────────────────

  async function handleDeleteMember(id) {
    await supabase.from('org_members').delete().eq('id', id)
    mutate(prev => prev ? { ...prev, members: prev.members.filter(m => m.id !== id) } : prev)
  }

  async function handleRoleChange(id, role) {
    await supabase.from('org_members').update({ role }).eq('id', id)
    mutate(prev => prev ? { ...prev, members: prev.members.map(m => m.id===id ? {...m,role} : m) } : prev)
  }

  async function handleAdminToggle(member) {
    const is_admin = !member.is_admin
    await supabase.from('org_members').update({ is_admin }).eq('id', member.id)
    mutate(prev => prev ? { ...prev, members: prev.members.map(m => m.id===member.id ? {...m,is_admin} : m) } : prev)
  }

  async function handleRevokeInvite(id) {
    await supabase.from('org_invites').delete().eq('id', id)
    mutate(prev => prev ? { ...prev, invites: prev.invites.filter(i => i.id !== id) } : prev)
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <div style={{ display:'flex',flexDirection:'column',height:'100%',overflow:'hidden' }}>

      {/* Header */}
      <div style={{ padding:'14px 24px',borderBottom:'1px solid var(--line)',
        background:'var(--panel)',flexShrink:0 }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14 }}>
          <div>
            <h1 style={{ fontSize:18,fontWeight:700,color:'var(--ink-1)',margin:0,letterSpacing:'-0.02em' }}>
              Team &amp; Access
            </h1>
            <p style={{ fontSize:12.5,color:'var(--ink-3)',margin:'2px 0 0' }}>
              {activeEmployees.length} active employee{activeEmployees.length!==1?'s':''} · {members.length} member{members.length!==1?'s':''} · {pendingInvites.length} pending invite{pendingInvites.length!==1?'s':''}
            </p>
          </div>
          {tab === 'employees' ? (
            <button
              onClick={() => setEditEmployee({})}
              style={{ display:'flex',alignItems:'center',gap:6,...btnPrimary }}
            >
              <Plus size={13}/>Add Employee
            </button>
          ) : (
            <button
              onClick={() => setShowInvite(true)}
              style={{ display:'flex',alignItems:'center',gap:6,...btnPrimary }}
            >
              <Plus size={13}/>Invite Member
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display:'inline-flex',background:'var(--bg)',border:'1px solid var(--line)',borderRadius:9,padding:2 }}>
          {[
            ['employees', 'Employees', activeEmployees.length],
            ['members',   'Team Members', members.length],
            ['invites',   'Pending Invites', pendingInvites.length],
          ].map(([k, l, count]) => (
            <button
              key={k} onClick={() => setTab(k)}
              style={{ padding:'5px 14px',borderRadius:7,border:'none',cursor:'pointer',
                fontSize:12,fontWeight:600,fontFamily:'inherit',
                background:tab===k?'var(--panel)':'transparent',
                color:tab===k?'var(--ink-1)':'var(--ink-3)',
                boxShadow:tab===k?'var(--shadow-1)':'none',
                display:'flex',alignItems:'center',gap:5 }}
            >
              {l}
              {count > 0 && (
                <span style={{ fontSize:10,fontWeight:700,
                  background:tab===k?'var(--accent-soft)':'var(--line)',
                  color:tab===k?'var(--accent)':'var(--ink-4)',
                  borderRadius:999,padding:'1px 5px' }}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex:1,overflowY:'auto' }}>
        {error ? (
          <div style={{ padding:24,color:'var(--lose)',fontSize:13 }}>{error}</div>
        ) : loading ? (
          <div style={{ padding:24,color:'var(--ink-3)',fontSize:13 }}>Loading…</div>

        ) : tab === 'employees' ? (
          /* ── EMPLOYEES TAB ── */
          <>
            {/* Explainer */}
            <div style={{ margin:'16px 24px 0',padding:'10px 14px',
              background:'rgba(59,130,246,0.06)',border:'1px solid rgba(59,130,246,0.15)',
              borderRadius:9,fontSize:12,color:'var(--ink-3)',lineHeight:1.5 }}>
              <strong style={{ color:'var(--ink-2)' }}>Employees</strong> are field crew assigned to jobs on the{' '}
              <button
                onClick={() => navigate('/schedule')}
                style={{ background:'none',border:'none',cursor:'pointer',color:'var(--accent)',
                  fontWeight:600,fontSize:12,padding:0,fontFamily:'inherit',textDecoration:'underline' }}
              >
                Crew Schedule
              </button>. They don't need a login — just add their name, role, and hourly rate.
            </div>

            {activeEmployees.length === 0 ? (
              <div style={{ display:'flex',flexDirection:'column',alignItems:'center',
                justifyContent:'center',gap:8,padding:'48px 24px',color:'var(--ink-3)' }}>
                <Users size={40} color="var(--line)"/>
                <div style={{ fontSize:14,fontWeight:600,color:'var(--ink-2)' }}>No employees yet</div>
                <div style={{ fontSize:12.5,textAlign:'center',maxWidth:320 }}>
                  Add your field crew so you can assign them to jobs on the Crew Schedule page.
                </div>
                <button onClick={() => setEditEmployee({})} style={{ ...btnPrimary,marginTop:8 }}>
                  <span style={{ display:'flex',alignItems:'center',gap:6 }}>
                    <Plus size={13}/>Add First Employee
                  </span>
                </button>
              </div>
            ) : (
              activeEmployees.map((emp, idx) => (
                <EmployeeRow
                  key={emp.id} employee={emp} idx={idx}
                  teams={empTeamNames[emp.id] || []}
                  onEdit={setEditEmployee}
                  onToggleActive={handleToggleActive}
                  onDelete={handleDeleteEmployee}
                />
              ))
            )}

            {/* Inactive section */}
            {inactiveEmployees.length > 0 && (
              <div style={{ margin:'8px 0' }}>
                <button
                  onClick={() => setShowInactive(v => !v)}
                  style={{ width:'100%',padding:'10px 16px',border:'none',borderTop:'1px solid var(--line-2)',
                    background:'transparent',cursor:'pointer',textAlign:'left',fontFamily:'inherit',
                    display:'flex',alignItems:'center',gap:6,
                    fontSize:12,fontWeight:600,color:'var(--ink-4)' }}
                >
                  <ChevronDown size={13} style={{ transform:showInactive?'rotate(180deg)':'none',transition:'transform 0.2s' }}/>
                  Inactive employees ({inactiveEmployees.length})
                </button>
                {showInactive && inactiveEmployees.map((emp, idx) => (
                  <EmployeeRow
                    key={emp.id} employee={emp} idx={activeEmployees.length + idx}
                    onEdit={setEditEmployee}
                    onToggleActive={handleToggleActive}
                    onDelete={handleDeleteEmployee}
                  />
                ))}
              </div>
            )}
          </>

        ) : tab === 'members' ? (
          /* ── MEMBERS TAB ── */
          <>
            <div style={{ margin:'16px 24px 0',padding:'10px 14px',
              background:'rgba(124,58,237,0.05)',border:'1px solid rgba(124,58,237,0.15)',
              borderRadius:9,fontSize:12,color:'var(--ink-3)',lineHeight:1.5 }}>
              <strong style={{ color:'var(--ink-2)' }}>Team Members</strong> are owners, admins, and BDRs who log into the app. Invite them with a link — they create their own account.
            </div>

            {!orgTablesExist && (
              <div style={{ margin:'12px 24px 0',padding:'10px 14px',
                background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.25)',
                borderRadius:9,display:'flex',alignItems:'center',gap:8,
                fontSize:12,color:'var(--ink-2)' }}>
                <AlertTriangle size={14} color="#f59e0b"/>
                The org_members and org_invites tables haven't been set up yet. Run the org schema SQL in Supabase to enable invites.
              </div>
            )}

            {members.length === 0 ? (
              <div style={{ display:'flex',flexDirection:'column',alignItems:'center',
                justifyContent:'center',gap:8,padding:'48px 24px',color:'var(--ink-3)' }}>
                <User size={40} color="var(--line)"/>
                <div style={{ fontSize:14,fontWeight:600,color:'var(--ink-2)' }}>No team members yet</div>
                <div style={{ fontSize:12.5,textAlign:'center',maxWidth:320 }}>
                  Invite your first team member to give them access.
                </div>
                <button onClick={() => setShowInvite(true)} style={{ ...btnPrimary,marginTop:8 }}>
                  <span style={{ display:'flex',alignItems:'center',gap:6 }}>
                    <Plus size={13}/>Invite Member
                  </span>
                </button>
              </div>
            ) : (
              members.map(m => (
                <MemberRow
                  key={m.id} member={m}
                  onDelete={handleDeleteMember}
                  onRoleChange={handleRoleChange}
                  onAdminToggle={handleAdminToggle}
                />
              ))
            )}
          </>

        ) : (
          /* ── INVITES TAB ── */
          <>
            {invites.length === 0 ? (
              <div style={{ display:'flex',flexDirection:'column',alignItems:'center',
                justifyContent:'center',gap:8,padding:'48px 24px',color:'var(--ink-3)' }}>
                <Mail size={40} color="var(--line)"/>
                <div style={{ fontSize:14 }}>No pending invites</div>
                <div style={{ fontSize:12.5 }}>Invite someone from the Team Members tab.</div>
              </div>
            ) : (
              invites.map(i => (
                <InviteRow key={i.id} invite={i} onRevoke={handleRevokeInvite}/>
              ))
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showInvite && (
        <InviteModal
          organizationId={organizationId}
          onClose={() => setShowInvite(false)}
          onInvited={refetch}
        />
      )}
      {editEmployee !== null && (
        <EmployeeModal
          employee={editEmployee?.id ? editEmployee : undefined}
          currentTeamIds={editEmployee?.id ? (empTeamIds[editEmployee.id] || []) : []}
          projectTypes={projectTypes}
          onClose={() => setEditEmployee(null)}
          onSaved={handleEmployeeSaved}
        />
      )}
    </div>
  )
}
