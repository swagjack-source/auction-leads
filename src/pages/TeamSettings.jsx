import { useState, useEffect } from 'react'
import { Plus, Copy, Check, Trash2, X, Shield, User, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const ROLE_OPTIONS = [
  { value: 'owner',    label: 'Owner',      desc: 'Full access, franchise owner' },
  { value: 'co_owner', label: 'Co-Owner',   desc: 'Full access, equal partner' },
  { value: 'admin',    label: 'Admin',      desc: 'Manage team, leads, projects' },
  { value: 'bdr',      label: 'BDR',        desc: 'Business development rep' },
  { value: 'employee', label: 'Employee',   desc: 'View and update assigned work' },
]

const ROLE_COLORS = {
  owner:    '#A50050',
  co_owner: '#7c3aed',
  admin:    '#3E5C86',
  bdr:      '#C28A2A',
  employee: '#6B7280',
}

const STATUS_COLORS = {
  active:  '#22c55e',
  pending: '#f59e0b',
}

const inputStyle = { width:'100%', background:'var(--bg)', border:'1px solid var(--line)', borderRadius:9, padding:'8px 11px', fontSize:13, color:'var(--ink-1)', outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
const labelStyle = { fontSize:11, fontWeight:600, color:'var(--ink-3)', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.06em' }

function InviteModal({ onClose, onInvited, organizationId }) {
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [role, setRole]   = useState('employee')
  const [isAdmin, setIsAdmin] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [link, setLink]       = useState(null)
  const [copied, setCopied]   = useState(false)
  const [error, setError]     = useState(null)

  async function handleCreate() {
    setSaving(true); setError(null)
    const { data, error } = await supabase.from('org_invites').insert({
      organization_id: organizationId,
      email: email.trim() || null,
      role, is_admin: isAdmin,
      invited_by: user?.id,
    }).select().single()
    setSaving(false)
    if (error) { setError(error.message); return }
    const base = window.location.origin
    setLink(`${base}/join?token=${data.token}`)
    onInvited?.()
  }

  function copyLink() {
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(()=>setCopied(false), 2000)
  }

  return (
    <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}
      onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div style={{background:'var(--panel)',border:'1px solid var(--line)',borderRadius:14,width:'100%',maxWidth:460,overflow:'hidden'}}>
        <div style={{padding:'16px 20px',borderBottom:'1px solid var(--line)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{fontSize:15,fontWeight:700,color:'var(--ink-1)'}}>Invite Team Member</div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'var(--ink-3)'}}><X size={16}/></button>
        </div>

        {!link ? (
          <div style={{padding:'20px',display:'flex',flexDirection:'column',gap:14}}>
            <div>
              <label style={labelStyle}>Email (optional)</label>
              <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="teammate@example.com" style={inputStyle}/>
              <div style={{fontSize:11,color:'var(--ink-4)',marginTop:4}}>Leave blank to create a general invite link anyone can use.</div>
            </div>

            <div>
              <label style={labelStyle}>Role</label>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {ROLE_OPTIONS.map(r=>(
                  <button key={r.value} onClick={()=>setRole(r.value)} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',borderRadius:9,border:`1px solid ${role===r.value?ROLE_COLORS[r.value]:'var(--line)'}`,background:role===r.value?`${ROLE_COLORS[r.value]}10`:'var(--bg)',cursor:'pointer',textAlign:'left',fontFamily:'inherit',transition:'all 0.1s'}}>
                    <span style={{width:10,height:10,borderRadius:'50%',background:ROLE_COLORS[r.value],flexShrink:0}}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12.5,fontWeight:600,color:role===r.value?ROLE_COLORS[r.value]:'var(--ink-1)'}}>{r.label}</div>
                      <div style={{fontSize:11,color:'var(--ink-4)'}}>{r.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'var(--bg)',borderRadius:9,padding:'10px 14px'}}>
              <div>
                <div style={{fontSize:12.5,fontWeight:600,color:'var(--ink-2)'}}>Admin access</div>
                <div style={{fontSize:11,color:'var(--ink-4)'}}>Can manage team members and org settings</div>
              </div>
              <button onClick={()=>setIsAdmin(a=>!a)} style={{width:40,height:22,borderRadius:11,background:isAdmin?'var(--accent)':'var(--line)',border:'none',cursor:'pointer',position:'relative',transition:'background 0.2s',flexShrink:0}}>
                <span style={{position:'absolute',top:3,left:isAdmin?21:3,width:16,height:16,borderRadius:'50%',background:'#fff',transition:'left 0.2s'}}/>
              </button>
            </div>

            {error && <div style={{color:'#ef4444',fontSize:12.5}}>{error}</div>}

            <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
              <button onClick={onClose} style={{padding:'7px 14px',borderRadius:8,border:'1px solid var(--line)',background:'none',color:'var(--ink-2)',fontSize:13,cursor:'pointer'}}>Cancel</button>
              <button onClick={handleCreate} disabled={saving} style={{padding:'7px 16px',borderRadius:8,border:'none',background:'var(--accent)',color:'white',fontSize:13,fontWeight:600,cursor:'pointer',opacity:saving?0.7:1}}>
                {saving?'Generating…':'Generate Invite Link'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{padding:'20px',display:'flex',flexDirection:'column',gap:16}}>
            <div style={{textAlign:'center',padding:'12px 0'}}>
              <div style={{fontSize:32,marginBottom:8}}>🔗</div>
              <div style={{fontSize:14,fontWeight:700,color:'var(--ink-1)'}}>Invite link created!</div>
              <div style={{fontSize:12.5,color:'var(--ink-3)',marginTop:4}}>
                Share this link with your team member. It expires in 7 days.
              </div>
            </div>
            <div style={{background:'var(--bg)',border:'1px solid var(--line)',borderRadius:9,padding:'10px 12px',display:'flex',alignItems:'center',gap:8}}>
              <span style={{flex:1,fontSize:11.5,color:'var(--ink-2)',wordBreak:'break-all',fontFamily:'monospace'}}>{link}</span>
              <button onClick={copyLink} style={{flexShrink:0,display:'flex',alignItems:'center',gap:5,padding:'5px 10px',borderRadius:7,border:'1px solid var(--line)',background:'var(--panel)',color:'var(--ink-2)',fontSize:12,fontWeight:600,cursor:'pointer'}}>
                {copied?<Check size={12} color="var(--win)"/>:<Copy size={12}/>}
                {copied?'Copied!':'Copy'}
              </button>
            </div>
            <button onClick={onClose} style={{width:'100%',padding:'9px',borderRadius:9,border:'none',background:'var(--accent)',color:'white',fontSize:13,fontWeight:600,cursor:'pointer'}}>Done</button>
          </div>
        )}
      </div>
    </div>
  )
}

function MemberRow({ member, onDelete, onRoleChange, onAdminToggle }) {
  const roleColor = ROLE_COLORS[member.role] || '#6B7280'
  const roleLabel = ROLE_OPTIONS.find(r=>r.value===member.role)?.label || member.role
  const [showRoles, setShowRoles] = useState(false)

  return (
    <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderBottom:'1px solid var(--line-2)'}}>
      <div style={{width:36,height:36,borderRadius:'50%',background:`${roleColor}18`,border:`2px solid ${roleColor}30`,display:'grid',placeItems:'center',fontSize:13,fontWeight:700,color:roleColor,flexShrink:0}}>
        {member.email?.[0]?.toUpperCase()||'?'}
      </div>

      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:13,fontWeight:600,color:'var(--ink-1)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{member.email}</div>
        <div style={{display:'flex',alignItems:'center',gap:6,marginTop:2}}>
          <span style={{fontSize:10,fontWeight:700,color:STATUS_COLORS[member.status]||'var(--ink-4)',background:`${STATUS_COLORS[member.status]||'#6B7280'}12`,border:`1px solid ${STATUS_COLORS[member.status]||'#6B7280'}30`,borderRadius:999,padding:'1px 6px'}}>{member.status}</span>
          {member.is_admin && <span style={{display:'flex',alignItems:'center',gap:3,fontSize:10,fontWeight:700,color:'#7c3aed',background:'rgba(124,58,237,0.1)',borderRadius:999,padding:'1px 6px'}}><Shield size={8}/>Admin</span>}
        </div>
      </div>

      {/* Role selector */}
      <div style={{position:'relative'}}>
        <button onClick={()=>setShowRoles(s=>!s)} style={{display:'flex',alignItems:'center',gap:5,padding:'5px 10px',borderRadius:8,border:`1px solid ${roleColor}40`,background:`${roleColor}10`,color:roleColor,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
          {roleLabel}<ChevronDown size={11}/>
        </button>
        {showRoles && (
          <div style={{position:'absolute',right:0,top:'calc(100% + 4px)',zIndex:50,background:'var(--panel)',border:'1px solid var(--line)',borderRadius:10,boxShadow:'0 4px 20px rgba(0,0,0,0.15)',minWidth:160,overflow:'hidden'}}>
            {ROLE_OPTIONS.map(r=>(
              <button key={r.value} onClick={()=>{onRoleChange(member.id,r.value);setShowRoles(false)}} style={{display:'block',width:'100%',padding:'7px 12px',border:'none',background:member.role===r.value?`${ROLE_COLORS[r.value]}12`:'transparent',color:member.role===r.value?ROLE_COLORS[r.value]:'var(--ink-2)',fontSize:12.5,fontWeight:member.role===r.value?600:400,cursor:'pointer',textAlign:'left',fontFamily:'inherit'}}>
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <button onClick={()=>onAdminToggle(member)} title={member.is_admin?'Remove admin':'Make admin'} style={{width:28,height:28,borderRadius:7,border:`1px solid ${member.is_admin?'#7c3aed':'var(--line)'}`,background:member.is_admin?'rgba(124,58,237,0.1)':'var(--bg)',cursor:'pointer',display:'grid',placeItems:'center',color:member.is_admin?'#7c3aed':'var(--ink-4)'}}>
        <Shield size={13}/>
      </button>
      <button onClick={()=>onDelete(member.id)} style={{width:28,height:28,borderRadius:7,border:'1px solid var(--line)',background:'var(--bg)',cursor:'pointer',display:'grid',placeItems:'center',color:'var(--ink-4)'}}>
        <Trash2 size={13}/>
      </button>
    </div>
  )
}

function InviteRow({ invite, onRevoke }) {
  const [copied, setCopied] = useState(false)
  const link = `${window.location.origin}/join?token=${invite.token}`

  function copy() {
    navigator.clipboard.writeText(link)
    setCopied(true); setTimeout(()=>setCopied(false),2000)
  }

  const expired = invite.expires_at && new Date(invite.expires_at) < new Date()

  return (
    <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 16px',borderBottom:'1px solid var(--line-2)',opacity:expired?0.5:1}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:12.5,fontWeight:600,color:'var(--ink-1)'}}>{invite.email||'Open invite'}</div>
        <div style={{fontSize:11,color:'var(--ink-4)',marginTop:1}}>
          {ROLE_OPTIONS.find(r=>r.value===invite.role)?.label||invite.role}
          {invite.is_admin&&' · Admin'}
          {' · '}
          {expired?'Expired':invite.accepted_at?'Accepted':`Expires ${new Date(invite.expires_at).toLocaleDateString()}`}
        </div>
      </div>
      {!invite.accepted_at && !expired && (
        <button onClick={copy} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:7,border:'1px solid var(--line)',background:'var(--bg)',color:'var(--ink-3)',fontSize:11.5,fontWeight:600,cursor:'pointer'}}>
          {copied?<Check size={11} color="var(--win)"/>:<Copy size={11}/>}{copied?'Copied':'Copy link'}
        </button>
      )}
      <button onClick={()=>onRevoke(invite.id)} style={{width:26,height:26,borderRadius:7,border:'1px solid var(--line)',background:'var(--bg)',cursor:'pointer',display:'grid',placeItems:'center',color:'var(--ink-4)'}}>
        <X size={12}/>
      </button>
    </div>
  )
}

export default function TeamSettings() {
  const { organizationId } = useAuth()
  const [members, setMembers]   = useState([])
  const [invites, setInvites]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [tab, setTab]           = useState('members')

  useEffect(()=>{ fetchAll() },[])

  async function fetchAll() {
    setLoading(true)
    const [mRes, iRes] = await Promise.all([
      supabase.from('org_members').select('*').order('created_at'),
      supabase.from('org_invites').select('*').order('created_at',{ascending:false}),
    ])
    setMembers(mRes.data||[])
    setInvites(iRes.data||[])
    setLoading(false)
  }

  async function handleDeleteMember(id) {
    await supabase.from('org_members').delete().eq('id',id)
    setMembers(ms=>ms.filter(m=>m.id!==id))
  }

  async function handleRoleChange(id, role) {
    await supabase.from('org_members').update({role}).eq('id',id)
    setMembers(ms=>ms.map(m=>m.id===id?{...m,role}:m))
  }

  async function handleAdminToggle(member) {
    const is_admin = !member.is_admin
    await supabase.from('org_members').update({is_admin}).eq('id',member.id)
    setMembers(ms=>ms.map(m=>m.id===member.id?{...m,is_admin}:m))
  }

  async function handleRevokeInvite(id) {
    await supabase.from('org_invites').delete().eq('id',id)
    setInvites(is=>is.filter(i=>i.id!==id))
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      <div style={{padding:'14px 24px',borderBottom:'1px solid var(--line)',background:'var(--panel)',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
          <div>
            <h1 style={{fontSize:18,fontWeight:700,color:'var(--ink-1)',margin:0,letterSpacing:'-0.02em'}}>Team & Access</h1>
            <p style={{fontSize:12.5,color:'var(--ink-3)',margin:'2px 0 0'}}>{members.length} member{members.length!==1?'s':''} · {invites.filter(i=>!i.accepted_at&&new Date(i.expires_at)>new Date()).length} pending invite{invites.length!==1?'s':''}</p>
          </div>
          <button onClick={()=>setShowInvite(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:9,border:'none',background:'var(--accent)',color:'white',fontSize:13,fontWeight:600,cursor:'pointer'}}>
            <Plus size={13}/>Invite Member
          </button>
        </div>

        <div style={{display:'inline-flex',background:'var(--bg)',border:'1px solid var(--line)',borderRadius:9,padding:2}}>
          {[['members','Members'],['invites','Pending Invites']].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)} style={{padding:'5px 14px',borderRadius:7,border:'none',cursor:'pointer',fontSize:12,fontWeight:600,fontFamily:'inherit',background:tab===k?'var(--panel)':'transparent',color:tab===k?'var(--ink-1)':'var(--ink-3)',boxShadow:tab===k?'var(--shadow-1)':'none'}}>{l}</button>
          ))}
        </div>

        <div style={{marginTop:10,padding:'10px 14px',background:'var(--bg)',borderRadius:9,border:'1px solid var(--line)',fontSize:12,color:'var(--ink-3)',lineHeight:1.5}}>
          <strong style={{color:'var(--ink-2)'}}>How it works:</strong> Send an invite link to a team member. They create an account at that link and are automatically added to your organization with the role you chose. Admins can manage team members and settings. Permissions by role will be added in a future update.
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto'}}>
        {loading ? (
          <div style={{padding:'24px',color:'var(--ink-3)',fontSize:13}}>Loading…</div>
        ) : tab==='members' ? (
          members.length===0 ? (
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:200,gap:8,color:'var(--ink-3)'}}>
              <User size={36} color="var(--line)"/>
              <div style={{fontSize:14}}>No team members yet.</div>
              <div style={{fontSize:12.5}}>Invite your first team member to get started.</div>
            </div>
          ) : (
            members.map(m=>(
              <MemberRow key={m.id} member={m} onDelete={handleDeleteMember} onRoleChange={handleRoleChange} onAdminToggle={handleAdminToggle}/>
            ))
          )
        ) : (
          invites.length===0 ? (
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:200,gap:8,color:'var(--ink-3)'}}>
              <div style={{fontSize:14}}>No pending invites.</div>
            </div>
          ) : (
            invites.map(i=>(
              <InviteRow key={i.id} invite={i} onRevoke={handleRevokeInvite}/>
            ))
          )
        )}
      </div>

      {showInvite && (
        <InviteModal organizationId={organizationId} onClose={()=>setShowInvite(false)} onInvited={fetchAll}/>
      )}
    </div>
  )
}
