import { useState, useEffect, useMemo } from 'react'
import { Download, Plus, X, ChevronLeft, ChevronRight, Users, Calendar, Clock, MapPin } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { estimateLabourHours, estimateProjectDays, estimateCrew } from '../lib/scoring'

// ── Date helpers ──────────────────────────────────────────────

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate()+n); return r }
function fmtShort(d) { return new Date(d+'T00:00:00').toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'}) }
function fmtFull(d) { return new Date(d+'T00:00:00').toLocaleDateString([],{weekday:'long',month:'long',day:'numeric'}) }

function getWeekDates(anchor) {
  const d = new Date(anchor)
  d.setDate(d.getDate() - d.getDay()) // Sunday
  return Array.from({length:7},(_,i)=>toDateStr(addDays(d,i)))
}

// ── ConnectTeam CSV export ────────────────────────────────────

function exportConnectTeam(projects, assignments, employees) {
  const rows = [['Employee','Job Title','Location','Date','Start Time','End Time','Hours','Notes']]
  for (const p of projects) {
    const crew = assignments[p.id] || []
    const hrs = estimateLabourHours(p.square_footage||1200, p.density||'Medium')
    const days = estimateProjectDays(p.square_footage||1200, p.density||'Medium', p.job_type||'Clean Out', crew.length||2)
    const start = p.start_date || ''
    const empNames = crew.length
      ? crew.map(eid => employees.find(e=>e.id===eid)?.name||'').filter(Boolean)
      : ['Unassigned']
    empNames.forEach(name => {
      rows.push([
        name,
        p.name || 'Project',
        p.address || '',
        start,
        '08:00',
        `${8 + Math.round(hrs/Math.max(crew.length,1))}:00`,
        Math.round(hrs/Math.max(crew.length,1)),
        [p.job_type, p.density ? `${p.density} density` : '', p.notes||''].filter(Boolean).join(' | '),
      ])
    })
  }
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
  const blob = new Blob([csv],{type:'text/csv'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href=url; a.download='connectteam-schedule.csv'; a.click()
  URL.revokeObjectURL(url)
}

// ── Assign crew modal ─────────────────────────────────────────

function AssignCrewModal({ project, employees, employeeTypes, currentAssignment, onClose, onSave }) {
  const [selected, setSelected] = useState(currentAssignment || [])
  const toggle = id => setSelected(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id])

  // Auto-suggest based on project job_type matching employee teams
  const suggested = useMemo(() => {
    return employees.filter(e => {
      const types = employeeTypes[e.id] || []
      const jt = (project.job_type||'').toLowerCase()
      return types.some(t => t.name?.toLowerCase().includes(jt.split(' ')[0]))
    })
  }, [employees, project, employeeTypes])

  const estSize = estimateCrew(project.square_footage||1200, project.density||'Medium', project.job_type||'Clean Out')

  return (
    <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}
      onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div style={{background:'var(--panel)',border:'1px solid var(--line)',borderRadius:14,width:'100%',maxWidth:480,maxHeight:'85vh',overflow:'hidden',display:'flex',flexDirection:'column'}}>
        <div style={{padding:'14px 18px',borderBottom:'1px solid var(--line)',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:'var(--ink-1)'}}>Assign Crew</div>
            <div style={{fontSize:12,color:'var(--ink-3)',marginTop:2}}>{project.name} · Recommended: {estSize} people</div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'var(--ink-3)'}}><X size={16}/></button>
        </div>

        {suggested.length > 0 && (
          <div style={{padding:'10px 18px 4px',borderBottom:'1px solid var(--line-2)',flexShrink:0}}>
            <div style={{fontSize:10.5,fontWeight:700,color:'var(--accent)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}}>Suggested by team</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {suggested.map(e=>(
                <button key={e.id} onClick={()=>toggle(e.id)} style={{padding:'4px 10px',borderRadius:999,fontSize:12,fontWeight:600,cursor:'pointer',border:`1px solid ${selected.includes(e.id)?'var(--accent)':'var(--line)'}`,background:selected.includes(e.id)?'var(--accent-soft)':'var(--bg)',color:selected.includes(e.id)?'var(--accent-ink)':'var(--ink-2)',transition:'all 0.12s'}}>
                  {e.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{flex:1,overflowY:'auto',padding:'10px 18px'}}>
          <div style={{fontSize:10.5,fontWeight:700,color:'var(--ink-4)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>All Active Employees</div>
          {employees.filter(e=>e.active).map(e=>{
            const on = selected.includes(e.id)
            const types = employeeTypes[e.id]||[]
            return (
              <button key={e.id} onClick={()=>toggle(e.id)} style={{width:'100%',textAlign:'left',padding:'8px 10px',borderRadius:9,border:`1px solid ${on?'var(--accent)':'var(--line)'}`,background:on?'var(--accent-soft)':'transparent',marginBottom:5,cursor:'pointer',display:'flex',alignItems:'center',gap:10,fontFamily:'inherit',transition:'all 0.1s'}}>
                <div style={{width:30,height:30,borderRadius:'50%',background:on?'var(--accent)':'var(--line-2)',color:on?'white':'var(--ink-3)',display:'grid',placeItems:'center',fontSize:11,fontWeight:700,flexShrink:0}}>
                  {e.name.split(' ').map(w=>w[0]).slice(0,2).join('')}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:on?'var(--accent-ink)':'var(--ink-1)'}}>{e.name}</div>
                  {types.length>0 && <div style={{fontSize:11,color:'var(--ink-4)'}}>{types.map(t=>t.name).join(', ')}</div>}
                </div>
                {on && <div style={{width:16,height:16,borderRadius:'50%',background:'var(--accent)',display:'grid',placeItems:'center',flexShrink:0}}>
                  <X size={9} color="white"/>
                </div>}
              </button>
            )
          })}
        </div>

        <div style={{padding:'12px 18px',borderTop:'1px solid var(--line)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <span style={{fontSize:12.5,color:'var(--ink-3)'}}>{selected.length} selected</span>
          <div style={{display:'flex',gap:8}}>
            <button onClick={onClose} style={{padding:'7px 14px',borderRadius:8,border:'1px solid var(--line)',background:'none',color:'var(--ink-2)',fontSize:13,cursor:'pointer'}}>Cancel</button>
            <button onClick={()=>onSave(selected)} style={{padding:'7px 16px',borderRadius:8,border:'none',background:'var(--accent)',color:'white',fontSize:13,fontWeight:600,cursor:'pointer'}}>Save Crew</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Project row ───────────────────────────────────────────────

function ProjectRow({ project, employees, employeeTypes, assignment, onAssign, weekDates }) {
  const crew = assignment || []
  const hrs = project.square_footage ? estimateLabourHours(project.square_footage, project.density||'Medium') : null
  const days = hrs ? estimateProjectDays(project.square_footage, project.density||'Medium', project.job_type||'Clean Out', crew.length||2) : null
  const estSize = estimateCrew(project.square_footage||1200, project.density||'Medium', project.job_type||'Clean Out')

  const startDate = project.start_date
  const endDate   = project.end_date || (startDate && days ? toDateStr(addDays(new Date(startDate+'T00:00:00'), days-1)) : null)

  const JOB_COLORS = {
    'Clean Out': '#3E5C86', Auction: '#A50050', Both: '#2F7A55',
    Move: '#C28A2A', 'In-person Estate Sale': '#7c3aed',
  }
  const jobColor = JOB_COLORS[project.job_type] || 'var(--ink-3)'

  return (
    <div style={{background:'var(--panel)',border:'1px solid var(--line)',borderRadius:12,padding:'14px 16px',display:'flex',flexDirection:'column',gap:10}}>
      {/* Top row */}
      <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
            <span style={{fontSize:13,fontWeight:700,color:'var(--ink-1)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{project.name||'Unnamed Project'}</span>
            {project.job_type && <span style={{fontSize:10,fontWeight:700,color:jobColor,background:`${jobColor}14`,border:`1px solid ${jobColor}30`,borderRadius:999,padding:'2px 7px',flexShrink:0}}>{project.job_type}</span>}
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:'4px 12px'}}>
            {project.address && <span style={{display:'flex',alignItems:'center',gap:4,fontSize:11.5,color:'var(--ink-3)'}}><MapPin size={10}/>{project.address}</span>}
            {hrs && <span style={{display:'flex',alignItems:'center',gap:4,fontSize:11.5,color:'var(--ink-3)'}}><Clock size={10}/>{hrs} hrs est.</span>}
            {project.square_footage && <span style={{fontSize:11.5,color:'var(--ink-3)'}}>{project.square_footage.toLocaleString()} sq ft · {project.density}</span>}
          </div>
          {project.notes && <div style={{fontSize:11.5,color:'var(--ink-4)',marginTop:4,fontStyle:'italic'}}>{project.notes}</div>}
        </div>

        {/* Timeline */}
        <div style={{textAlign:'right',flexShrink:0}}>
          {startDate ? (
            <>
              <div style={{fontSize:11,color:'var(--ink-4)'}}>Start</div>
              <div style={{fontSize:12,fontWeight:600,color:'var(--ink-1)'}}>{fmtShort(startDate)}</div>
              {endDate && endDate !== startDate && <>
                <div style={{fontSize:11,color:'var(--ink-4)',marginTop:4}}>End</div>
                <div style={{fontSize:12,fontWeight:600,color:'var(--ink-1)'}}>{fmtShort(endDate)}</div>
              </>}
              {days && <div style={{fontSize:11,color:'var(--ink-4)',marginTop:2}}>{days} day{days!==1?'s':''}</div>}
            </>
          ) : (
            <div style={{fontSize:11.5,color:'var(--ink-4)',fontStyle:'italic'}}>No date set</div>
          )}
        </div>
      </div>

      {/* Week bar — show which days project spans */}
      {startDate && weekDates && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3}}>
          {weekDates.map(d=>{
            const inRange = d >= (startDate) && d <= (endDate||startDate)
            return (
              <div key={d} style={{height:4,borderRadius:999,background:inRange?jobColor:'var(--line-2)',opacity:inRange?0.8:0.4,transition:'background 0.15s'}}/>
            )
          })}
        </div>
      )}

      {/* Crew row */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingTop:6,borderTop:'1px solid var(--line-2)'}}>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <Users size={12} color="var(--ink-4)" strokeWidth={1.8}/>
          {crew.length === 0 ? (
            <span style={{fontSize:11.5,color:'var(--ink-4)',fontStyle:'italic'}}>No crew assigned · needs {estSize}</span>
          ) : (
            <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
              {crew.map(eid=>{
                const emp = employees.find(e=>e.id===eid)
                if(!emp) return null
                return <span key={eid} style={{fontSize:11.5,fontWeight:600,background:'var(--bg)',border:'1px solid var(--line)',borderRadius:999,padding:'2px 8px',color:'var(--ink-2)'}}>{emp.name}</span>
              })}
            </div>
          )}
        </div>
        <button onClick={onAssign} style={{display:'flex',alignItems:'center',gap:5,padding:'5px 10px',borderRadius:8,border:'1px solid var(--line)',background:'var(--bg)',color:'var(--ink-2)',fontSize:12,fontWeight:600,cursor:'pointer'}}>
          <Plus size={11}/>{crew.length?'Edit Crew':'Assign Crew'}
        </button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────

export default function CrewSchedule() {
  const { organizationId } = useAuth()
  const [projects, setProjects]     = useState([])
  const [employees, setEmployees]   = useState([])
  const [employeeTypes, setEmpTypes]= useState({})
  const [assignments, setAssignments]= useState({}) // projectId → [empId]
  const [loading, setLoading]       = useState(true)
  const [weekAnchor, setWeekAnchor] = useState(toDateStr(new Date()))
  const [assigningProject, setAssigningProject] = useState(null)
  const [tab, setTab]               = useState('week') // 'week' | 'all'

  useEffect(()=>{ fetchAll() },[])

  async function fetchAll() {
    setLoading(true)
    try {
      const [pRes, eRes, etRes, paRes] = await Promise.all([
        supabase.from('leads').select('*').in('status',['Project Accepted','Project Scheduled','Won']).order('start_date',{ascending:true,nullsFirst:false}),
        supabase.from('employees').select('*').eq('active',true).order('name'),
        supabase.from('employee_project_types').select('employee_id, project_type_id, project_types(name)'),
        supabase.from('project_assignments').select('lead_id, employee_id'),
      ])
      setProjects(pRes.data||[])
      setEmployees(eRes.data||[])
      const em = {}
      for(const r of (etRes.data||[])){
        if(!em[r.employee_id]) em[r.employee_id]=[]
        em[r.employee_id].push({id:r.project_type_id,name:r.project_types?.name})
      }
      setEmpTypes(em)
      const am = {}
      for(const r of (paRes.data||[])){
        if(!am[r.lead_id]) am[r.lead_id]=[]
        am[r.lead_id].push(r.employee_id)
      }
      const local = JSON.parse(localStorage.getItem('crew_assignments')||'{}')
      setAssignments({...local,...am})
    } finally {
      setLoading(false)
    }
  }

  const weekDates = getWeekDates(weekAnchor)

  const projectsInWeek = useMemo(()=>projects.filter(p=>{
    if(!p.start_date) return false
    const startOk = p.start_date <= weekDates[6]
    const endDate  = p.end_date || p.start_date
    const endOk   = endDate >= weekDates[0]
    return startOk && endOk
  }),[projects, weekDates])

  const displayProjects = tab==='week' ? projectsInWeek : projects

  async function handleSaveAssignment(projectId, empIds) {
    // Save to localStorage (and attempt DB if table exists)
    const next = {...assignments,[projectId]:empIds}
    setAssignments(next)
    localStorage.setItem('crew_assignments', JSON.stringify(next))
    try {
      await supabase.from('project_assignments').delete().eq('lead_id',projectId)
      if(empIds.length){
        await supabase.from('project_assignments').insert(empIds.map(eid=>({lead_id:projectId,employee_id:eid,organization_id:organizationId})))
      }
    } catch {}
    setAssigningProject(null)
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      {/* Header */}
      <div style={{padding:'12px 24px',borderBottom:'1px solid var(--line)',background:'var(--panel)',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <div>
            <h1 style={{fontSize:18,fontWeight:700,color:'var(--ink-1)',margin:0,letterSpacing:'-0.02em'}}>Crew Schedule</h1>
            <p style={{fontSize:12.5,color:'var(--ink-3)',margin:'2px 0 0'}}>{projects.length} active projects · {employees.length} active crew members</p>
          </div>
          <button
            onClick={()=>exportConnectTeam(displayProjects,assignments,employees)}
            style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:9,border:'1px solid var(--line)',background:'var(--panel)',color:'var(--ink-2)',fontSize:13,fontWeight:600,cursor:'pointer',boxShadow:'var(--shadow-1)'}}>
            <Download size={13}/> Export to ConnectTeam
          </button>
        </div>

        {/* Tabs + week nav */}
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{display:'inline-flex',background:'var(--bg)',border:'1px solid var(--line)',borderRadius:9,padding:2}}>
            {[['week','This Week'],['all','All Projects']].map(([k,l])=>(
              <button key={k} onClick={()=>setTab(k)} style={{padding:'5px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:12,fontWeight:600,fontFamily:'inherit',background:tab===k?'var(--panel)':'transparent',color:tab===k?'var(--ink-1)':'var(--ink-3)',boxShadow:tab===k?'var(--shadow-1)':'none'}}>{l}</button>
            ))}
          </div>

          {tab==='week' && (
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <button onClick={()=>setWeekAnchor(toDateStr(addDays(new Date(weekAnchor+'T00:00:00'),-7)))} style={{width:28,height:28,borderRadius:7,border:'1px solid var(--line)',background:'var(--panel)',cursor:'pointer',display:'grid',placeItems:'center',color:'var(--ink-3)'}}>
                <ChevronLeft size={14}/>
              </button>
              <span style={{fontSize:12.5,fontWeight:600,color:'var(--ink-2)',whiteSpace:'nowrap'}}>
                {fmtShort(weekDates[0])} – {fmtShort(weekDates[6])}
              </span>
              <button onClick={()=>setWeekAnchor(toDateStr(addDays(new Date(weekAnchor+'T00:00:00'),7)))} style={{width:28,height:28,borderRadius:7,border:'1px solid var(--line)',background:'var(--panel)',cursor:'pointer',display:'grid',placeItems:'center',color:'var(--ink-3)'}}>
                <ChevronRight size={14}/>
              </button>
              <button onClick={()=>setWeekAnchor(toDateStr(new Date()))} style={{padding:'4px 10px',borderRadius:7,border:'1px solid var(--line)',background:'var(--panel)',cursor:'pointer',fontSize:11.5,fontWeight:600,color:'var(--ink-3)',fontFamily:'inherit'}}>
                Today
              </button>
            </div>
          )}
        </div>

        {/* Day header row */}
        {tab==='week' && (
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4,marginTop:10}}>
            {weekDates.map(d=>{
              const isToday = d===toDateStr(new Date())
              const hasProjects = projectsInWeek.some(p=>{
                const end = p.end_date||p.start_date
                return p.start_date && d>=p.start_date && d<=(end||p.start_date)
              })
              return (
                <div key={d} style={{textAlign:'center',padding:'5px 4px',borderRadius:8,background:isToday?'var(--accent-soft)':'transparent',border:isToday?'1px solid var(--accent)':'1px solid transparent'}}>
                  <div style={{fontSize:9.5,fontWeight:700,color:isToday?'var(--accent)':'var(--ink-4)',textTransform:'uppercase',letterSpacing:'0.05em'}}>
                    {new Date(d+'T00:00:00').toLocaleDateString([],{weekday:'short'})}
                  </div>
                  <div style={{fontSize:13,fontWeight:700,color:isToday?'var(--accent)':'var(--ink-2)'}}>
                    {new Date(d+'T00:00:00').getDate()}
                  </div>
                  {hasProjects && <div style={{width:4,height:4,borderRadius:'50%',background:isToday?'var(--accent)':'var(--ink-3)',margin:'2px auto 0'}}/>}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{flex:1,overflowY:'auto',padding:'16px 24px'}}>
        {loading ? (
          <div style={{color:'var(--ink-3)',fontSize:14}}>Loading projects…</div>
        ) : displayProjects.length===0 ? (
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:200,gap:8,color:'var(--ink-3)'}}>
            <Calendar size={36} color="var(--line)"/>
            <div style={{fontSize:14}}>{tab==='week'?'No projects this week.':'No active projects.'}</div>
            <div style={{fontSize:12.5}}>Projects move here when marked "Project Accepted" or "Project Scheduled".</div>
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {displayProjects.map(p=>(
              <ProjectRow
                key={p.id}
                project={p}
                employees={employees}
                employeeTypes={employeeTypes}
                assignment={assignments[p.id]}
                onAssign={()=>setAssigningProject(p)}
                weekDates={tab==='week'?weekDates:null}
              />
            ))}
          </div>
        )}
      </div>

      {assigningProject && (
        <AssignCrewModal
          project={assigningProject}
          employees={employees}
          employeeTypes={employeeTypes}
          currentAssignment={assignments[assigningProject.id]}
          onClose={()=>setAssigningProject(null)}
          onSave={empIds=>handleSaveAssignment(assigningProject.id, empIds)}
        />
      )}
    </div>
  )
}
