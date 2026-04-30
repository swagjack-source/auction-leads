import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, MapPin, ChevronLeft, ChevronRight, Download, X,
  Calendar, Clock, LayoutGrid, List, CheckSquare, Square,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useSupabaseQuery } from '../lib/useSupabaseQuery'
import { estimateLabourHours, estimateProjectDays, estimateCrew } from '../lib/scoring'
import logger from '../lib/logger'

// ─── Date helpers ───────────────────────────────────────────────────────────

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate()+n); return r }
function getWeekDates(anchor) {
  const d = new Date(anchor)
  d.setDate(d.getDate() - d.getDay())
  return Array.from({length:7},(_,i)=>toDateStr(addDays(d,i)))
}
function addWorkdays(startStr, n) {
  let d = new Date(startStr+'T00:00:00'), count = 0
  while (count < n) {
    d = addDays(d, 1)
    if (d.getDay() !== 0 && d.getDay() !== 6) count++
  }
  return toDateStr(d)
}
function fmtShort(dateStr) {
  return new Date(dateStr+'T00:00:00').toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'})
}
function daysBetween(a, b) {
  return Math.max(0, Math.round((new Date(b+'T00:00:00') - new Date(a+'T00:00:00')) / 86400000))
}
function getWeekLabel(anchor) {
  const dates = getWeekDates(anchor)
  const s = new Date(dates[0]+'T00:00:00')
  const e = new Date(dates[6]+'T00:00:00')
  const so = s.toLocaleDateString([],{month:'short',day:'numeric'})
  const eo = e.toLocaleDateString([],{month:'short',day:'numeric'})
  return `${so} – ${eo}`
}
function getSundayOfWeek(dateStr) {
  const d = new Date(dateStr+'T00:00:00')
  d.setDate(d.getDate() - d.getDay())
  return toDateStr(d)
}

// ─── Constants ──────────────────────────────────────────────────────────────

// Muted job-type palette — bg/text pairs used on pills, badges, and grid bars.
const JOB_COLORS = {
  'Clean Out':           { bg: '#E6F1FB', text: '#0C447C', accent: '#0C447C' },
  'Auction':             { bg: '#EEEDFE', text: '#3C3489', accent: '#3C3489' },
  'Both':                { bg: '#E6E0FA', text: '#4338CA', accent: '#4338CA' },
  'Move':                { bg: '#E1F5EE', text: '#085041', accent: '#085041' },
  'Sorting/Organizing':  { bg: '#FAEEDA', text: '#633806', accent: '#633806' },
  'In-Person Sale':      { bg: '#FAECE7', text: '#712B13', accent: '#712B13' },
}
function jobChip(type) {
  return JOB_COLORS[type] || { bg: 'var(--bg-2)', text: 'var(--ink-2)', accent: 'var(--ink-3)' }
}

// Section accent colors for time-period group headers.
const SECTION_ACCENTS = {
  'This Week':   '#3B82F6',
  'Next Week':   '#7F77DD',
  'Upcoming':    '#A8A29E',
  'Needs Dates': '#F59E0B',
}

// Staffing palette — used for status dots, text, and card left border.
const STAFFING = {
  none:    { dot: '#EF4444', text: '#791F1F', border: '#EF4444', label: 'Needs crew' },
  partial: { dot: '#F59E0B', text: '#633806', border: '#F59E0B', label: 'Partially staffed' },
  full:    { dot: '#22C55E', text: '#27500A', border: '#22C55E', label: 'Fully staffed' },
}

const AVATAR_COLORS = ['#3B82F6','#7F77DD','#1D9E75','#D97706','#C2410C','#6366F1','#0891B2','#DB2777']
function avatarColor(idx) { return AVATAR_COLORS[idx % AVATAR_COLORS.length] }

const DAY_LABELS = ['S','M','T','W','T','F','S']

// ─── Availability computation ───────────────────────────────────────────────

function computeAvailability(employees, projects, assignments, assignmentHours, weekDates, unavailability) {
  return employees.map(emp => {
    const capacity = emp.max_weekly_hours ?? 40
    const workDays = emp.work_days ?? ['Mon','Tue','Wed','Thu','Fri']
    const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

    const dailyHours = {}

    // Mark unavailable days as fully booked
    for (const block of (unavailability || [])) {
      if (block.employee_id !== emp.id) continue
      let d = new Date(block.start_date + 'T00:00:00')
      const end = new Date(block.end_date + 'T00:00:00')
      while (d <= end) {
        const ds = toDateStr(d)
        if (weekDates.includes(ds)) {
          dailyHours[ds] = (capacity / 5) // mark as fully used for that day
        }
        d = addDays(d, 1)
      }
    }

    // Add project assignment hours
    for (const p of projects) {
      const pIds = assignments[p.id] || []
      if (!pIds.includes(emp.id)) continue
      if (!p.project_start) continue
      const pEnd = p.project_end || p.project_start
      const hrs = (assignmentHours[p.id]?.[emp.id]) || 0
      const workdays = []
      let d = new Date(p.project_start + 'T00:00:00')
      const end = new Date(pEnd + 'T00:00:00')
      while (d <= end) {
        const dayName = DAY_NAMES[d.getDay()]
        if (workDays.includes(dayName)) workdays.push(toDateStr(d))
        d = addDays(d, 1)
      }
      if (workdays.length === 0) continue
      const hrsPerDay = hrs / workdays.length
      for (const wd of workdays) {
        if (!dailyHours[wd]) dailyHours[wd] = 0
        dailyHours[wd] += hrsPerDay
      }
    }

    let totalHours = 0
    for (const d of weekDates) {
      totalHours += dailyHours[d] || 0
    }

    // Mark non-work days
    const nonWorkDays = weekDates.filter(d => {
      const dayName = DAY_NAMES[new Date(d + 'T00:00:00').getDay()]
      return !workDays.includes(dayName)
    })

    return { ...emp, dailyHours, totalHours: Math.round(totalHours * 10) / 10, capacity, nonWorkDays }
  })
}

// Compute overlap hours for an employee against projects they're on that overlap a date range
function overlapHours(empId, targetStart, targetEnd, projects, assignments, assignmentHours) {
  if (!targetStart) return 0
  const te = targetEnd || targetStart
  let total = 0
  for (const p of projects) {
    if (p.project_start === targetStart && (p.project_end || p.project_start) === te) continue // same project
    const pIds = assignments[p.id] || []
    if (!pIds.includes(empId)) continue
    if (!p.project_start) continue
    const pEnd = p.project_end || p.project_start
    // Check overlap
    if (p.project_start > te || pEnd < targetStart) continue
    total += (assignmentHours[p.id]?.[empId]) || 0
  }
  return Math.round(total)
}

// ─── ConnectTeam CSV export ──────────────────────────────────────────────────

function exportConnectTeam(projects, assignments, employees) {
  const rows = [['Employee','Job Title','Location','Date','Start Time','End Time','Hours','Notes']]
  for (const p of projects) {
    const crew = assignments[p.id] || []
    const hrs = estimateLabourHours(p.square_footage||1200, p.density||'Medium')
    const empNames = crew.length
      ? crew.map(eid => employees.find(e=>e.id===eid)?.name||'').filter(Boolean)
      : ['Unassigned']
    empNames.forEach(name => {
      rows.push([
        name,
        p.name || 'Project',
        p.address || '',
        p.project_start || '',
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

// ─── Small reusable bits ─────────────────────────────────────────────────────

function Avatar({ name, idx, size = 28 }) {
  const bg = avatarColor(idx)
  const initials = (name||'?').split(' ').map(p=>p[0]).slice(0,2).join('').toUpperCase()
  return (
    <div style={{
      width:size, height:size, borderRadius:'50%', background:bg,
      color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
      fontSize: size <= 28 ? 10 : 12, fontWeight:700, flexShrink:0,
    }}>
      {initials}
    </div>
  )
}

function StatusDot({ color }) {
  return <span style={{
    display:'inline-block', width:8, height:8, borderRadius:'50%',
    background:color, marginRight:5, flexShrink:0,
  }} />
}

function Toast({ message, type }) {
  if (!message) return null
  const bg = type === 'success' ? '#22C55E' : '#EF4444'
  return (
    <div style={{
      position:'fixed', bottom:24, right:24, zIndex:9999,
      background:bg, color:'#fff', borderRadius:10,
      padding:'10px 18px', fontWeight:600, fontSize:14,
      boxShadow:'0 4px 16px rgba(0,0,0,0.18)',
      pointerEvents:'none',
    }}>
      {message}
    </div>
  )
}

function SkeletonBox({ height = 120 }) {
  return (
    <div style={{
      background:'var(--line)', borderRadius:12, height,
      marginBottom:10, animation:'pulse 1.5s ease-in-out infinite',
      opacity:0.5,
    }} />
  )
}

function SectionHeader({ label, dateRange, count, onToggle, expanded }) {
  const accent = SECTION_ACCENTS[label] || 'var(--ink-3)'
  return (
    <div
      onClick={onToggle}
      style={{
        display:'flex', alignItems:'center', gap:10,
        marginBottom:10, marginTop:24,
        paddingLeft: 10,
        borderLeft: `3px solid ${accent}`,
        cursor: onToggle ? 'pointer' : 'default',
      }}
    >
      <span style={{ fontSize:13, fontWeight:500, color:'var(--ink-1)' }}>
        {label}
        {dateRange && <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}> — {dateRange}</span>}
      </span>
      {count != null && (
        <span style={{
          background:'var(--bg-2)', color:'var(--ink-2)',
          borderRadius:999, fontSize:11, fontWeight:600,
          padding:'1px 8px',
        }}>
          {count}
        </span>
      )}
      {onToggle && (
        <span style={{color:'var(--ink-3)', fontSize:12, marginLeft:'auto'}}>
          {expanded ? '▲' : '▼'}
        </span>
      )}
    </div>
  )
}

// ─── Inline Set-Dates expansion ──────────────────────────────────────────────

function SetDatesExpansion({ project, onSave, onCancel }) {
  const hrs = estimateLabourHours(project.square_footage||1200, project.density||'Medium')
  const today = toDateStr(new Date())
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(() => addWorkdays(today, Math.ceil(hrs/8)))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (startDate) {
      setEndDate(addWorkdays(startDate, Math.max(1, Math.ceil(hrs/8))))
    }
  }, [startDate, hrs])

  async function handleSave() {
    if (!startDate) return
    setSaving(true)
    try {
      const { error } = await supabase.from('leads')
        .update({ project_start: startDate, project_end: endDate || startDate })
        .eq('id', project.id)
      if (error) throw error
      onSave(project.id, startDate, endDate || startDate)
    } catch(e) {
      logger.error('SetDates save error', e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      borderTop:'1px solid var(--line)', background:'var(--bg)',
      padding:'14px 16px',
    }}>
      <div style={{fontSize:13,fontWeight:600,color:'var(--ink-1)',marginBottom:10}}>
        Set project dates for {project.name}
      </div>
      <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:12}}>
        <label style={{display:'flex',flexDirection:'column',gap:4,fontSize:12,color:'var(--ink-2)'}}>
          Start date
          <input
            type="date" value={startDate}
            onChange={e=>setStartDate(e.target.value)}
            style={{
              padding:'6px 10px', borderRadius:7, border:'1px solid var(--line)',
              background:'var(--panel)', color:'var(--ink-1)', fontSize:13,
            }}
          />
        </label>
        <label style={{display:'flex',flexDirection:'column',gap:4,fontSize:12,color:'var(--ink-2)'}}>
          End date
          <input
            type="date" value={endDate}
            onChange={e=>setEndDate(e.target.value)}
            style={{
              padding:'6px 10px', borderRadius:7, border:'1px solid var(--line)',
              background:'var(--panel)', color:'var(--ink-1)', fontSize:13,
            }}
          />
        </label>
      </div>
      <div style={{fontSize:12,color:'var(--ink-3)',marginBottom:12}}>
        Auto-calculated from ~{hrs} estimated hrs ({Math.ceil(hrs/8)} workdays)
      </div>
      <div style={{display:'flex',gap:8}}>
        <button
          onClick={handleSave} disabled={saving}
          style={{
            flex:1, padding:'8px 0', borderRadius:8,
            background:'var(--accent)', color:'#fff', border:'none',
            fontWeight:600, fontSize:13, cursor:'pointer', opacity:saving?0.7:1,
          }}
        >
          {saving ? 'Saving…' : 'Save Dates'}
        </button>
        <button
          onClick={onCancel}
          style={{
            flex:1, padding:'8px 0', borderRadius:8,
            background:'var(--line)', color:'var(--ink-1)', border:'none',
            fontWeight:600, fontSize:13, cursor:'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Inline crew assignment expansion ────────────────────────────────────────

function AssignCrewExpansion({
  project, employees, employeeTypes,
  assignments, assignmentHours,
  projects,
  onConfirm, onCancel,
}) {
  const { organizationId } = useAuth()
  const hrs = estimateLabourHours(project.square_footage||1200, project.density||'Medium')
  const neededCrew = estimateCrew(project.square_footage||1200, project.density||'Medium', project.job_type||'Clean Out')

  // Figure out which job type IDs apply to this project
  const jobTypeName = project.job_type || ''
  // Find employees pre-qualified for this type
  const qualifiedEmpIds = useMemo(() => {
    const s = new Set()
    for (const [eid, types] of Object.entries(employeeTypes)) {
      if (types.some(t => t.name === jobTypeName)) s.add(eid)
    }
    return s
  }, [employeeTypes, jobTypeName])

  const existingAssigned = assignments[project.id] || []

  // Per-employee overlap hours
  const empOverlap = useMemo(() => {
    const m = {}
    for (const emp of employees) {
      m[emp.id] = overlapHours(
        emp.id,
        project.project_start,
        project.project_end || project.project_start,
        projects, assignments, assignmentHours
      )
    }
    return m
  }, [employees, project, projects, assignments, assignmentHours])

  // Pre-select: qualified + not fully booked OR already assigned
  const initialSelected = useMemo(() => {
    const s = new Set(existingAssigned)
    for (const emp of employees) {
      if (qualifiedEmpIds.has(emp.id) && (empOverlap[emp.id]||0) < 40) {
        s.add(emp.id)
      }
    }
    return s
  }, [existingAssigned, employees, qualifiedEmpIds, empOverlap])

  const [selected, setSelected] = useState(initialSelected)
  const [customHours, setCustomHours] = useState({})
  const [saving, setSaving] = useState(false)

  const selectedArr = Array.from(selected)
  const autoHrsPerPerson = selectedArr.length > 0 ? Math.round(hrs / selectedArr.length) : hrs

  function toggleEmp(id) {
    setSelected(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function getHrsForEmp(id) {
    return customHours[id] != null ? customHours[id] : autoHrsPerPerson
  }

  async function handleConfirm() {
    setSaving(true)
    try {
      // Delete existing
      const { error: delErr } = await supabase.from('project_assignments')
        .delete().eq('lead_id', project.id)
      if (delErr) throw delErr

      // Insert new — organization_id is required by the RLS policy on
      // project_assignments (WITH CHECK organization_id IN user_orgs()).
      const rows = selectedArr.map(eid => ({
        lead_id: project.id,
        employee_id: eid,
        estimated_hours: getHrsForEmp(eid),
        organization_id: organizationId,
      }))
      if (rows.length > 0) {
        const { error: insErr } = await supabase.from('project_assignments').insert(rows)
        if (insErr) throw insErr
      }

      const hoursMap = {}
      for (const eid of selectedArr) hoursMap[eid] = getHrsForEmp(eid)
      onConfirm(project.id, selectedArr, hoursMap)
    } catch(e) {
      logger.error('AssignCrew save error', e)
      onConfirm(null, null, null, e.message)
    } finally {
      setSaving(false)
    }
  }

  const dateRange = project.project_start
    ? `${fmtShort(project.project_start)} – ${project.project_end ? fmtShort(project.project_end) : fmtShort(project.project_start)}`
    : 'No dates set'

  return (
    <div style={{
      borderTop:'1px solid var(--line)', background:'var(--bg)',
      maxHeight: 480, display:'flex', flexDirection:'column',
      transition:'all 300ms ease-out',
    }}>
      <div style={{padding:'14px 16px 8px', flexShrink: 0}}>
        <div style={{fontSize:14,fontWeight:700,color:'var(--ink-1)',marginBottom:2}}>
          Assign crew to {project.name}
        </div>
        <div style={{fontSize:12,color:'var(--ink-3)'}}>
          {project.job_type} · {dateRange} · {hrs} hrs estimated
        </div>
      </div>

      {/* Scrollable employee list */}
      <div style={{
        flex: 1, minHeight: 0, overflowY: 'auto',
        padding: '0 16px',
      }}>
        {employees.map((emp, idx) => {
          const overlap = empOverlap[emp.id] || 0
          const isSelected = selected.has(emp.id)
          const fullyBooked = overlap >= 40
          const availColor = overlap < 20 ? '#22C55E' : overlap < 40 ? '#F59E0B' : '#EF4444'
          const availLabel = overlap < 20 ? 'Available' : overlap < 40 ? `Partially booked (${overlap} hrs)` : 'Fully booked'

          return (
            <div
              key={emp.id}
              onClick={() => toggleEmp(emp.id)}
              style={{
                display:'flex', alignItems:'center', gap:10,
                padding:'8px 0', borderBottom:'1px solid var(--line)',
                cursor:'pointer', opacity: fullyBooked ? 0.5 : 1,
              }}
            >
              <div style={{flexShrink:0}}>
                {isSelected
                  ? <CheckSquare size={16} color="var(--accent)" />
                  : <Square size={16} color="var(--ink-3)" />
                }
              </div>
              <Avatar name={emp.name} idx={idx} size={28} />
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,color:'var(--ink-1)'}}>
                  {emp.name}
                </div>
                <div style={{fontSize:11,color:'var(--ink-3)'}}>
                  {emp.role}
                </div>
              </div>
              <div style={{textAlign:'right',flexShrink:0}}>
                <div style={{fontSize:11,fontWeight:600,color:availColor}}>
                  {availLabel}
                </div>
                <div style={{
                  fontSize:10, color:'var(--ink-4)',
                  background:'var(--line)', borderRadius:4, padding:'1px 5px',
                  marginTop:2,
                }}>
                  {overlap} / 40 hrs
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Sticky footer — hours calculator + buttons always visible */}
      <div style={{
        flexShrink: 0,
        borderTop: '1px solid var(--line)',
        background: 'var(--panel)',
        padding: '12px 16px 14px',
      }}>
        {/* Hours calculator */}
        <div style={{
          background:'var(--bg-2)', borderRadius:9, padding:'10px 12px', marginBottom:10,
        }}>
          <div style={{fontSize:12,color:'var(--ink-2)',marginBottom: selectedArr.length > 0 ? 6 : 0}}>
            Total project hours: <strong>{hrs}</strong> &nbsp;·&nbsp;
            Selected: <strong>{selectedArr.length} crew</strong> &nbsp;·&nbsp;
            Hours per person: <strong>~{autoHrsPerPerson} hrs</strong>
          </div>
          {selectedArr.map(eid => {
            const emp = employees.find(e=>e.id===eid)
            if (!emp) return null
            return (
              <div key={eid} style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                <span style={{fontSize:12,color:'var(--ink-2)',minWidth:90,flex:1}}>{emp.name}:</span>
                <input
                  type="number"
                  value={customHours[eid] != null ? customHours[eid] : autoHrsPerPerson}
                  onClick={e => e.stopPropagation()}
                  onChange={e => {
                    e.stopPropagation()
                    setCustomHours(prev => ({...prev, [eid]: parseInt(e.target.value)||0}))
                  }}
                  style={{
                    width:64, padding:'3px 7px', borderRadius:6,
                    border:'1px solid var(--line)', background:'var(--panel)',
                    color:'var(--ink-1)', fontSize:12,
                  }}
                />
                <span style={{fontSize:12,color:'var(--ink-3)'}}>hrs</span>
              </div>
            )
          })}
        </div>

        <div style={{display:'flex',gap:8}}>
          <button
            onClick={e => { e.stopPropagation(); handleConfirm() }}
            disabled={saving || selectedArr.length === 0}
            style={{
              flex:1, padding:'9px 0', borderRadius:8,
              background:'var(--accent)', color:'#fff', border:'none',
              fontWeight:600, fontSize:13, cursor:'pointer',
              opacity: (saving || selectedArr.length === 0) ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving…' : `Assign ${selectedArr.length} crew member${selectedArr.length!==1?'s':''}`}
          </button>
          <button
            onClick={e => { e.stopPropagation(); onCancel() }}
            style={{
              flex:1, padding:'9px 0', borderRadius:8,
              background:'var(--line)', color:'var(--ink-1)', border:'none',
              fontWeight:600, fontSize:13, cursor:'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({
  project, idx, employees, employeeTypes,
  assignments, assignmentHours, projects,
  expanded, expandingDates,
  onAssignClick, onAssignConfirm, onAssignCancel,
  onSetDatesClick, onSetDatesSave, onSetDatesCancel,
}) {
  const empIds = assignments[project.id] || []
  const hrs = estimateLabourHours(project.square_footage||1200, project.density||'Medium')
  const neededCrew = estimateCrew(project.square_footage||1200, project.density||'Medium', project.job_type||'Clean Out')
  const assignedCount = empIds.length
  const staffingState = assignedCount === 0 ? STAFFING.none : assignedCount < neededCrew ? STAFFING.partial : STAFFING.full
  const staffingColor = staffingState.dot
  const staffingLabel = staffingState.label

  const hasNoDates = !project.project_start

  const projectDays = project.project_start && project.project_end
    ? daysBetween(project.project_start, project.project_end) + 1
    : project.project_start ? 1 : null

  const assignedEmps = empIds.map((eid, i) => ({
    emp: employees.find(e=>e.id===eid),
    eid,
    i,
  })).filter(x=>x.emp)

  const mapsUrl = project.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.address)}`
    : null

  return (
    <div style={{
      background:'var(--panel)',
      border:'1px solid var(--line)',
      borderRadius:12,
      borderLeft:`3px solid ${staffingState.border}`,
      marginBottom:10,
      overflow:'hidden',
    }}>
      <div
        style={{padding:'14px 16px', cursor:'default'}}
        onClick={() => {}}
      >
        {/* Top row */}
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,flexWrap:'wrap'}}>
          <span style={{fontWeight:700,fontSize:15,color:'var(--ink-1)',flex:1,minWidth:0}}>
            {project.name}
          </span>
          {project.job_type && (() => {
            const c = jobChip(project.job_type)
            return (
              <span style={{
                fontSize:10.5, fontWeight:700,
                background: c.bg, color: c.text,
                borderRadius:999, padding:'2px 9px',
                flexShrink:0,
              }}>
                {project.job_type}
              </span>
            )
          })()}
          <div style={{display:'flex',alignItems:'center',gap:4,flexShrink:0}}>
            <StatusDot color={staffingState.dot} />
            <span style={{fontSize:12,color:staffingState.text,fontWeight:600}}>{staffingLabel}</span>
          </div>
        </div>

        {/* Second row */}
        <div style={{display:'flex',flexWrap:'wrap',gap:'6px 16px',marginBottom:8,fontSize:12,color:'var(--ink-2)'}}>
          {project.address && (
            <a
              href={mapsUrl||'#'} target="_blank" rel="noopener noreferrer"
              style={{display:'flex',alignItems:'center',gap:4,color:'var(--ink-2)',textDecoration:'none'}}
              onClick={e=>e.stopPropagation()}
            >
              <MapPin size={12} />
              {project.address}
            </a>
          )}
          <div style={{display:'flex',alignItems:'center',gap:4}}>
            <Calendar size={12} />
            {hasNoDates ? (
              <span style={{color:'#F59E0B',fontWeight:600}}>No dates set</span>
            ) : (
              <span>
                {fmtShort(project.project_start)}{project.project_end && project.project_end !== project.project_start ? ` – ${fmtShort(project.project_end)}` : ''}
                {projectDays ? ` (${projectDays} day${projectDays!==1?'s':''})` : ''}
              </span>
            )}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:4}}>
            <Clock size={12} />
            {hrs} hrs est. · needs {neededCrew} crew
          </div>
        </div>

        {/* Crew section */}
        {assignedCount > 0 ? (
          <div>
            <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:6}}>
              {assignedEmps.map(({emp,eid,i}) => (
                <div key={eid} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
                  <Avatar name={emp.name} idx={i} size={28} />
                  <span style={{fontSize:10,color:'var(--ink-2)',maxWidth:52,textAlign:'center',lineHeight:'1.2'}}>
                    {emp.name.split(' ')[0]}
                  </span>
                </div>
              ))}
            </div>
            <div style={{
              display:'flex',alignItems:'center',justifyContent:'space-between',
              fontSize:12,color:'var(--ink-3)',
            }}>
              <span>
                hours per person: ~{assignedCount > 0 ? Math.round(hrs/assignedCount) : hrs} hrs
              </span>
              <button
                onClick={() => onAssignClick(project.id)}
                style={{
                  background:'none', border:'none', color:'var(--accent)',
                  fontWeight:600, fontSize:12, cursor:'pointer', padding:'2px 4px',
                }}
              >
                Edit
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{fontSize:12,color:'var(--ink-3)',fontStyle:'italic',marginBottom:8}}>
              No crew assigned
            </div>
            {hasNoDates ? (
              <button
                onClick={() => onSetDatesClick(project.id)}
                style={{
                  width:'100%', padding:'8px 0', borderRadius:8,
                  background:'#F59E0B', color:'#fff', border:'none',
                  fontWeight:600, fontSize:13, cursor:'pointer',
                }}
              >
                Set Dates
              </button>
            ) : (
              <button
                onClick={() => onAssignClick(project.id)}
                style={{
                  width:'100%', padding:'8px 0', borderRadius:8,
                  background:'var(--accent)', color:'#fff', border:'none',
                  fontWeight:600, fontSize:13, cursor:'pointer',
                }}
              >
                + Assign Crew
              </button>
            )}
          </div>
        )}
      </div>

      {/* Inline expansions */}
      {expanded && (
        <AssignCrewExpansion
          project={project}
          employees={employees}
          employeeTypes={employeeTypes}
          assignments={assignments}
          assignmentHours={assignmentHours}
          projects={projects}
          onConfirm={onAssignConfirm}
          onCancel={onAssignCancel}
        />
      )}
      {expandingDates && (
        <SetDatesExpansion
          project={project}
          onSave={onSetDatesSave}
          onCancel={onSetDatesCancel}
        />
      )}
    </div>
  )
}

// ─── Grid View ────────────────────────────────────────────────────────────────

function GridView({
  weekDates, projects, employees, assignments, assignmentHours,
  onProjectClick,
}) {
  const today = toDateStr(new Date())

  return (
    <div style={{overflowX:'auto'}}>
      <table style={{width:'100%', borderCollapse:'collapse', minWidth:700}}>
        <thead>
          <tr>
            <th style={{
              width:180, padding:'8px 12px', fontSize:12, fontWeight:700,
              color:'var(--ink-2)', textAlign:'left',
              borderBottom:'2px solid var(--line)',
            }}>Employee</th>
            {weekDates.map(d => {
              const label = new Date(d+'T00:00:00').toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'})
              const isToday = d === today
              return (
                <th key={d} style={{
                  width:110, padding:'8px 6px', fontSize:11, fontWeight:700,
                  color: isToday ? 'var(--accent)' : 'var(--ink-2)',
                  textAlign:'center', borderBottom:'2px solid var(--line)',
                  background: isToday ? 'rgba(59,130,246,0.06)' : 'transparent',
                }}>
                  {label}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {employees.map((emp, empIdx) => (
            <tr key={emp.id}>
              <td style={{
                padding:'6px 12px', borderBottom:'1px solid var(--line)',
                background:'var(--panel)',
              }}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <Avatar name={emp.name} idx={empIdx} size={24} />
                  <span style={{fontSize:12,fontWeight:600,color:'var(--ink-1)'}}>{emp.name}</span>
                </div>
              </td>
              {weekDates.map(d => {
                const isToday = d === today
                // Find projects this employee is on that cover this day
                const dayProjects = projects.filter(p => {
                  const pIds = assignments[p.id] || []
                  if (!pIds.includes(emp.id)) return false
                  if (!p.project_start) return false
                  const pEnd = p.project_end || p.project_start
                  return p.project_start <= d && pEnd >= d
                })
                return (
                  <td key={d} style={{
                    padding:'4px 4px', borderBottom:'1px solid var(--line)',
                    background: isToday ? 'rgba(59,130,246,0.06)' : 'transparent',
                    verticalAlign:'top',
                    minHeight:40,
                  }}>
                    {dayProjects.map(p => {
                      const c = jobChip(p.job_type)
                      return (
                        <div
                          key={p.id}
                          onClick={() => onProjectClick(p.id)}
                          style={{
                            background: c.bg, color: c.text,
                            borderLeft: `3px solid ${c.accent}`,
                            borderRadius: 5,
                            fontSize: 10.5, fontWeight: 600,
                            padding: '3px 6px', marginBottom: 2,
                            cursor: 'pointer', lineHeight: '1.3',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}
                          title={p.name}
                        >
                          {p.name}
                        </div>
                      )
                    })}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Crew Availability Panel ──────────────────────────────────────────────────

function AvailabilityPanel({
  employees, projects, assignments, assignmentHours,
  weekAnchor, panelWeekOffset, onPanelWeekChange,
  sortMode, onSortChange,
  employeeTypes,
  unavailability,
}) {
  const panelAnchor = useMemo(() => {
    const d = new Date(weekAnchor+'T00:00:00')
    d.setDate(d.getDate() + panelWeekOffset * 7)
    return toDateStr(d)
  }, [weekAnchor, panelWeekOffset])

  const weekDates = useMemo(() => getWeekDates(panelAnchor), [panelAnchor])

  const availability = useMemo(() =>
    computeAvailability(employees, projects, assignments, assignmentHours, weekDates, unavailability),
    [employees, projects, assignments, assignmentHours, weekDates, unavailability]
  )

  const sorted = useMemo(() => {
    const arr = [...availability]
    if (sortMode === 'available') arr.sort((a,b) => a.totalHours - b.totalHours)
    else if (sortMode === 'az') arr.sort((a,b) => a.name.localeCompare(b.name))
    else if (sortMode === 'team') {
      arr.sort((a,b) => {
        const at = (employeeTypes[a.id]||[])[0]?.name || 'zzz'
        const bt = (employeeTypes[b.id]||[])[0]?.name || 'zzz'
        return at.localeCompare(bt) || a.name.localeCompare(b.name)
      })
    }
    return arr
  }, [availability, sortMode, employeeTypes])

  const totalBooked = sorted.reduce((s,e)=>s+e.totalHours,0)
  const totalCap = employees.reduce((s, e) => s + (e.capacity ?? 40), 0)
  const capPct = totalCap > 0 ? Math.round(totalBooked / totalCap * 100) : 0
  const capColor = capPct < 60 ? '#22C55E' : capPct < 90 ? '#F59E0B' : '#EF4444'

  const btnStyle = (active) => ({
    background:'none', border:'none', fontWeight: active?700:400,
    color: active ? 'var(--accent)' : 'var(--ink-3)',
    fontSize:12, cursor:'pointer', padding:'2px 6px',
  })

  return (
    <div style={{
      background:'var(--bg)', border:'1px solid var(--line)',
      borderRadius:12, padding:16,
    }}>
      <div style={{fontWeight:700,fontSize:14,color:'var(--ink-1)',marginBottom:8}}>
        Team Availability
      </div>

      {/* Week toggle */}
      <div style={{display:'flex',gap:4,marginBottom:8}}>
        <button onClick={()=>onPanelWeekChange(0)} style={btnStyle(panelWeekOffset===0)}>
          This Week
        </button>
        <span style={{color:'var(--ink-4)',fontSize:12}}>|</span>
        <button onClick={()=>onPanelWeekChange(1)} style={btnStyle(panelWeekOffset===1)}>
          Next Week
        </button>
      </div>

      {/* Sort toggle */}
      <div style={{display:'flex',gap:4,marginBottom:12,flexWrap:'wrap'}}>
        <button onClick={()=>onSortChange('available')} style={btnStyle(sortMode==='available')}>
          Most Available
        </button>
        <span style={{color:'var(--ink-4)',fontSize:12}}>|</span>
        <button onClick={()=>onSortChange('az')} style={btnStyle(sortMode==='az')}>
          A-Z
        </button>
        <span style={{color:'var(--ink-4)',fontSize:12}}>|</span>
        <button onClick={()=>onSortChange('team')} style={btnStyle(sortMode==='team')}>
          By Team
        </button>
      </div>

      {/* Employee cards */}
      {sorted.map((emp, empIdx) => {
        const booked = emp.totalHours
        const empCap = emp.capacity ?? 40
        const barColor = booked < empCap * 0.75 ? '#22C55E' : booked < empCap ? '#F59E0B' : '#EF4444'
        const barPct = Math.min(100, Math.round(booked / empCap * 100))
        const types = employeeTypes[emp.id] || []

        // Get project names per day for tooltip
        const dayProjectNames = {}
        for (const p of projects) {
          const pIds = assignments[p.id] || []
          if (!pIds.includes(emp.id)) continue
          if (!p.project_start) continue
          const pEnd = p.project_end || p.project_start
          for (const d of weekDates) {
            if (p.project_start <= d && pEnd >= d) {
              if (!dayProjectNames[d]) dayProjectNames[d] = []
              dayProjectNames[d].push(p.name)
            }
          }
        }

        return (
          <div key={emp.id} style={{
            background:'var(--panel)', borderRadius:9,
            padding:'10px 12px', marginBottom:8,
          }}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
              <Avatar name={emp.name} idx={empIdx} size={32} />
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:'var(--ink-1)'}}>{emp.name}</div>
                <div style={{fontSize:11,color:'var(--ink-3)'}}>{emp.role}</div>
              </div>
              {/* Type dots */}
              <div style={{display:'flex',gap:3,flexShrink:0}}>
                {types.map(t => (
                  <span
                    key={t.id}
                    title={t.name}
                    style={{
                      display:'inline-block', width:8, height:8, borderRadius:'50%',
                      background: jobChip(t.name).accent,
                      cursor:'help',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Hours bar — bar at 60% opacity, label kept solid for readability */}
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
              <div style={{
                flex:1, height:6, borderRadius:999,
                background:'var(--line)', overflow:'hidden',
              }}>
                <div style={{
                  height:'100%', width:`${barPct}%`,
                  background:barColor, opacity: 0.6, borderRadius:999,
                  transition:'width 300ms ease',
                }} />
              </div>
              <span style={{fontSize:11,color:barColor,fontWeight:600,flexShrink:0}}>
                {booked} / {empCap} hrs
              </span>
            </div>

            {/* Daily dots */}
            <div>
              <div style={{display:'flex',gap:4}}>
                {weekDates.map((d, di) => {
                  const dayHrs = emp.dailyHours[d] || 0
                  const isNonWorkDay = (emp.nonWorkDays || []).includes(d)
                  const dotColor = isNonWorkDay ? 'var(--line)' :
                    dayHrs === 0 ? '#22C55E' :
                    dayHrs < 8   ? '#F59E0B' :
                                   '#EF4444'
                  const tooltip = isNonWorkDay ? 'Non-work day' : (dayProjectNames[d]?.join(', ') || 'Free')
                  return (
                    <div
                      key={d}
                      title={`${DAY_LABELS[di]}: ${tooltip} (${Math.round(dayHrs*10)/10} hrs)`}
                      style={{
                        width:12, height:12, borderRadius:'50%',
                        background:dotColor, opacity: isNonWorkDay ? 1 : 0.6, cursor:'help',
                      }}
                    />
                  )
                })}
              </div>
              <div style={{display:'flex',gap:4,marginTop:2}}>
                {DAY_LABELS.map((l,i)=>(
                  <span key={i} style={{
                    width:12, textAlign:'center', fontSize:9,
                    color:'var(--ink-4)', display:'block',
                  }}>{l}</span>
                ))}
              </div>
            </div>
          </div>
        )
      })}

      {/* Team total */}
      <div style={{
        borderTop:'1px solid var(--line)', paddingTop:10, marginTop:4,
      }}>
        <div style={{
          display:'flex',justifyContent:'space-between',
          fontSize:12, fontWeight:700, color:'var(--ink-1)', marginBottom:6,
        }}>
          <span>Team Total</span>
          <span style={{color:capColor}}>{capPct}%</span>
        </div>
        <div style={{
          height:8, borderRadius:999, background:'var(--line)',
          overflow:'hidden', marginBottom:6,
        }}>
          <div style={{
            height:'100%', width:`${capPct}%`, background:capColor,
            borderRadius:999, transition:'width 300ms ease',
          }} />
        </div>
        <div style={{fontSize:12,color:'var(--ink-2)',marginBottom:2}}>
          {Math.round(totalBooked)} / {totalCap} hrs ({capPct}%)
        </div>
        <div style={{fontSize:12,fontWeight:600,color:capColor}}>
          {Math.round(totalCap - totalBooked)} hrs available this week
        </div>
      </div>
    </div>
  )
}

// ─── Setup banner ─────────────────────────────────────────────────────────────

function SetupBanner({ onDismiss, onGoToEmployees }) {
  return (
    <div style={{
      background:'#FAEEDA', border:'1px solid #ECD5A4',
      borderRadius:10, padding:'12px 16px', marginBottom:16,
      display:'flex', alignItems:'flex-start', gap:12,
    }}>
      <Users size={20} color="#D97706" style={{flexShrink:0, marginTop:2}} />
      <div style={{flex:1}}>
        <div style={{fontWeight:700,fontSize:13,color:'#92400E',marginBottom:4}}>
          Add your team to start scheduling
        </div>
        <div style={{fontSize:12,color:'#B45309',lineHeight:'1.5',marginBottom:8}}>
          You need at least 3 employees to use crew scheduling effectively.
          Add your team members, their roles, and hourly rates first.
        </div>
        <button
          onClick={onGoToEmployees}
          style={{
            background:'#D97706', color:'#fff', border:'none',
            borderRadius:7, padding:'6px 14px', fontWeight:600,
            fontSize:12, cursor:'pointer',
          }}
        >
          Go to Employees →
        </button>
      </div>
      <button
        onClick={onDismiss}
        style={{background:'none',border:'none',cursor:'pointer',color:'#92400E',padding:2}}
      >
        <X size={16} />
      </button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CrewSchedule() {
  const navigate = useNavigate()
  const { user, organizationId } = useAuth()

  // ── State ──
  const today = toDateStr(new Date())
  const [weekAnchor, setWeekAnchor] = useState(() => getSundayOfWeek(today))
  const [viewMode, setViewMode] = useState('cards') // 'cards' | 'grid'
  const [assignments, setAssignments] = useState({})
  const [assignmentHours, setAssignmentHours] = useState({})
  const [expandedProject, setExpandedProject] = useState(null)
  const [expandingDates, setExpandingDates] = useState(null)
  const [availabilityWeekOffset, setAvailabilityWeekOffset] = useState(0)
  const [sortMode, setSortMode] = useState('available')
  const [upcomingExpanded, setUpcomingExpanded] = useState(false)
  const [toast, setToast] = useState(null)
  const [setupDismissed, setSetupDismissed] = useState(
    () => sessionStorage.getItem('crew_setup_dismissed') === '1'
  )
  // Store projects locally so we can update dates
  const [localProjects, setLocalProjects] = useState(null)

  // ── Data load ──
  const { data, loading, error } = useSupabaseQuery(async () => {
    const [pRes, eRes, etRes, paRes, unavailRes] = await Promise.all([
      supabase.from('leads').select('*')
        .in('status', ['Project Accepted','Project Scheduled','Won'])
        .order('project_start', {ascending:true, nullsFirst:false}),
      supabase.from('employees').select('*').eq('active', true).order('name'),
      supabase.from('employee_project_types').select('employee_id, project_type_id, project_types(name)'),
      supabase.from('project_assignments').select('lead_id, employee_id, estimated_hours'),
      Promise.resolve(supabase.from('employee_unavailability').select('*')
        .gte('end_date', new Date().toISOString().split('T')[0])).catch(() => ({ data: [] })),
    ])
    if (pRes.error) throw pRes.error
    if (eRes.error) throw eRes.error

    const employeeTypes = {}
    for (const r of (etRes.data||[])) {
      if (!employeeTypes[r.employee_id]) employeeTypes[r.employee_id] = []
      employeeTypes[r.employee_id].push({ id: r.project_type_id, name: r.project_types?.name })
    }

    const dbAssignments = {}
    const dbAssignmentHours = {}
    for (const r of (paRes.data||[])) {
      if (!dbAssignments[r.lead_id]) dbAssignments[r.lead_id] = []
      dbAssignments[r.lead_id].push(r.employee_id)
      if (!dbAssignmentHours[r.lead_id]) dbAssignmentHours[r.lead_id] = {}
      dbAssignmentHours[r.lead_id][r.employee_id] = r.estimated_hours || 0
    }

    return {
      projects: pRes.data || [],
      employees: eRes.data || [],
      employeeTypes,
      dbAssignments,
      dbAssignmentHours,
      unavailability: unavailRes?.data || [],
    }
  })

  useEffect(() => {
    if (data) {
      setAssignments(data.dbAssignments)
      setAssignmentHours(data.dbAssignmentHours)
      setLocalProjects(data.projects)
    }
  }, [data])

  // Toast helper
  function showToast(message, type = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Derived data ──
  const projects = localProjects || data?.projects || []
  const employees = data?.employees || []
  const employeeTypes = data?.employeeTypes || {}
  const unavailability = data?.unavailability ?? []

  const weekDates = useMemo(() => getWeekDates(weekAnchor), [weekAnchor])
  const weekStart = weekDates[0]
  const weekEnd = weekDates[6]

  const nextWeekAnchor = useMemo(() => toDateStr(addDays(new Date(weekAnchor+'T00:00:00'), 7)), [weekAnchor])
  const nextWeekDates = useMemo(() => getWeekDates(nextWeekAnchor), [nextWeekAnchor])
  const nextWeekStart = nextWeekDates[0]
  const nextWeekEnd = nextWeekDates[6]

  // Group projects
  const { thisWeek, nextWeek, upcoming, needsDates } = useMemo(() => {
    const thisWeek = [], nextWeek = [], upcoming = [], needsDates = []
    for (const p of projects) {
      if (!p.project_start) { needsDates.push(p); continue }
      const pEnd = p.project_end || p.project_start
      const overlapsThis = p.project_start <= weekEnd && pEnd >= weekStart
      const overlapsNext = p.project_start <= nextWeekEnd && pEnd >= nextWeekStart
      if (overlapsThis) thisWeek.push(p)
      else if (overlapsNext) nextWeek.push(p)
      else upcoming.push(p)
    }
    return { thisWeek, nextWeek, upcoming, needsDates }
  }, [projects, weekStart, weekEnd, nextWeekStart, nextWeekEnd])

  // ── Event handlers ──
  // Track week-change for the fade transition.
  const [weekFading, setWeekFading] = useState(false)
  function handleWeekNav(dir) {
    setWeekFading(true)
    setWeekAnchor(prev => toDateStr(addDays(new Date(prev+'T00:00:00'), dir * 7)))
    setTimeout(() => setWeekFading(false), 200)
  }

  function handleAssignClick(pid) {
    setExpandedProject(prev => prev === pid ? null : pid)
    setExpandingDates(null)
  }

  function handleAssignConfirm(pid, empIds, hoursMap, err) {
    if (err) {
      showToast(`Crew assign failed: ${err}`, 'error')
      return
    }
    const p = projects.find(x=>x.id===pid)
    setAssignments(prev => ({ ...prev, [pid]: empIds }))
    setAssignmentHours(prev => ({ ...prev, [pid]: hoursMap }))
    setExpandedProject(null)
    showToast(`Crew assigned to ${p?.name || 'project'}`, 'success')
  }

  function handleAssignCancel() {
    setExpandedProject(null)
  }

  function handleSetDatesClick(pid) {
    setExpandingDates(prev => prev === pid ? null : pid)
    setExpandedProject(null)
  }

  function handleSetDatesSave(pid, startDate, endDate) {
    setLocalProjects(prev =>
      (prev||[]).map(p => p.id === pid ? { ...p, project_start: startDate, project_end: endDate } : p)
    )
    setExpandingDates(null)
    showToast('Dates saved', 'success')
  }

  function handleSetDatesCancel() {
    setExpandingDates(null)
  }

  function handleDismissSetup() {
    sessionStorage.setItem('crew_setup_dismissed', '1')
    setSetupDismissed(true)
  }

  // ── Render helpers ──
  function renderProjectCard(p) {
    return (
      <ProjectCard
        key={p.id}
        project={p}
        idx={0}
        employees={employees}
        employeeTypes={employeeTypes}
        assignments={assignments}
        assignmentHours={assignmentHours}
        projects={projects}
        expanded={expandedProject === p.id}
        expandingDates={expandingDates === p.id}
        onAssignClick={handleAssignClick}
        onAssignConfirm={handleAssignConfirm}
        onAssignCancel={handleAssignCancel}
        onSetDatesClick={handleSetDatesClick}
        onSetDatesSave={handleSetDatesSave}
        onSetDatesCancel={handleSetDatesCancel}
      />
    )
  }

  // ── Skeleton ──
  if (loading) {
    return (
      <div style={{padding:'24px 16px', maxWidth:1200, margin:'0 auto'}}>
        <style>{`@keyframes pulse { 0%,100%{opacity:0.5} 50%{opacity:0.8} }`}</style>
        <div style={{display:'flex',gap:24,flexWrap:'wrap'}}>
          <div style={{flex:'1 1 60%',minWidth:280}}>
            {[1,2,3].map(i=><SkeletonBox key={i} height={120} />)}
          </div>
          <div style={{flex:'1 1 35%',minWidth:220}}>
            {[1,2,3,4].map(i=><SkeletonBox key={i} height={72} />)}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{padding:32, color:'var(--lose)', textAlign:'center'}}>
        Failed to load crew schedule: {error.message}
      </div>
    )
  }

  const activeProjectCount = projects.length
  const activeCrewCount = employees.length

  return (
    <div style={{padding:'24px 16px', maxWidth:1280, margin:'0 auto'}}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:0.5} 50%{opacity:0.8} }
        @media (max-width:768px) {
          .crew-split { flex-direction: column !important; }
          .crew-right { position: static !important; max-height: none !important; }
        }
      `}</style>

      {/* Page header */}
      <div style={{
        display:'flex', alignItems:'flex-start', justifyContent:'space-between',
        gap:16, flexWrap:'wrap', marginBottom:20,
      }}>
        <div>
          <h1 style={{fontSize:24,fontWeight:800,color:'var(--ink-1)',margin:0,marginBottom:4}}>
            Crew Schedule
          </h1>
          <div style={{fontSize:14,color:'var(--ink-3)'}}>
            {activeProjectCount} active project{activeProjectCount!==1?'s':''} · {activeCrewCount} active crew member{activeCrewCount!==1?'s':''}
          </div>
        </div>
        <button
          onClick={() => exportConnectTeam(projects, assignments, employees)}
          style={{
            display:'flex', alignItems:'center', gap:8,
            background:'var(--accent)', color:'#fff', border:'none',
            borderRadius:9, padding:'9px 16px', fontWeight:600,
            fontSize:13, cursor:'pointer',
          }}
        >
          <Download size={15} />
          Export to ConnectTeam
        </button>
      </div>

      {/* Setup banner */}
      {!setupDismissed && employees.length < 3 && (
        <SetupBanner
          onDismiss={handleDismissSetup}
          onGoToEmployees={() => navigate('/employees')}
        />
      )}

      {/* Split layout */}
      <div className="crew-split" style={{display:'flex',gap:20,alignItems:'flex-start'}}>
        {/* LEFT */}
        <div style={{flex:'1 1 60%', minWidth:0}}>

          {/* Week navigator */}
          <div style={{
            display:'flex', alignItems:'center', gap:10,
            marginBottom:16, flexWrap:'wrap',
          }}>
            <div style={{display:'flex',alignItems:'center',gap:6,flex:1,minWidth:200}}>
              <button
                onClick={() => handleWeekNav(-1)}
                style={{
                  background:'var(--panel)', border:'1px solid var(--line)',
                  borderRadius:7, padding:'5px 8px', cursor:'pointer',
                  color:'var(--ink-2)', display:'flex', alignItems:'center',
                }}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{
                fontSize:14, fontWeight:600, color:'var(--ink-1)',
                flex:1, textAlign:'center',
              }}>
                {(() => {
                  const offset = Math.round((new Date(weekAnchor+'T00:00:00') - new Date(getSundayOfWeek(today)+'T00:00:00')) / (7 * 86400000))
                  const prefix = offset === 0 ? 'This Week: '
                    : offset === 1 ? 'Next Week: '
                    : offset === -1 ? 'Last Week: '
                    : ''
                  return `${prefix}${getWeekLabel(weekAnchor)}`
                })()}
              </span>
              <button
                onClick={() => handleWeekNav(1)}
                style={{
                  background:'var(--panel)', border:'1px solid var(--line)',
                  borderRadius:7, padding:'5px 8px', cursor:'pointer',
                  color:'var(--ink-2)', display:'flex', alignItems:'center',
                }}
              >
                <ChevronRight size={16} />
              </button>
              {(() => {
                const isCurrent = weekAnchor === getSundayOfWeek(today)
                return (
                  <button
                    onClick={() => { setWeekFading(true); setWeekAnchor(getSundayOfWeek(today)); setTimeout(() => setWeekFading(false), 200) }}
                    style={{
                      background: isCurrent ? 'var(--panel)' : 'var(--accent)',
                      border:'1px solid ' + (isCurrent ? 'var(--line)' : 'var(--accent)'),
                      borderRadius:7, padding:'5px 12px', fontSize:12,
                      fontWeight:600, cursor:'pointer',
                      color: isCurrent ? 'var(--ink-2)' : '#FFFFFF',
                    }}
                  >
                    Today
                  </button>
                )
              })()}
            </div>

            {/* View toggle */}
            <div style={{
              display:'flex', gap:0,
              border:'1px solid var(--line)', borderRadius:8, overflow:'hidden',
            }}>
              <button
                onClick={() => setViewMode('cards')}
                style={{
                  padding:'5px 12px', fontSize:12, fontWeight:600,
                  border:'none', cursor:'pointer',
                  background: viewMode==='cards' ? 'var(--accent)' : 'var(--panel)',
                  color: viewMode==='cards' ? '#fff' : 'var(--ink-2)',
                  display:'flex', alignItems:'center', gap:4,
                }}
              >
                <List size={13} /> Cards
              </button>
              <button
                onClick={() => setViewMode('grid')}
                style={{
                  padding:'5px 12px', fontSize:12, fontWeight:600,
                  border:'none', cursor:'pointer',
                  background: viewMode==='grid' ? 'var(--accent)' : 'var(--panel)',
                  color: viewMode==='grid' ? '#fff' : 'var(--ink-2)',
                  display:'flex', alignItems:'center', gap:4,
                }}
              >
                <LayoutGrid size={13} /> Grid
              </button>
            </div>
          </div>

          <div style={{
            opacity: weekFading ? 0.4 : 1,
            transition: 'opacity 200ms ease',
          }}>
          {viewMode === 'grid' ? (
            <GridView
              weekDates={weekDates}
              projects={projects}
              employees={employees}
              assignments={assignments}
              assignmentHours={assignmentHours}
              onProjectClick={handleAssignClick}
            />
          ) : (
            <>
              {/* This Week */}
              <SectionHeader label="This Week" dateRange={getWeekLabel(weekAnchor)} count={thisWeek.length} />
              {thisWeek.length === 0 ? (
                <p style={{fontSize:12,color:'var(--ink-4)',fontStyle:'italic',marginBottom:12,paddingLeft:13}}>
                  No projects this week
                </p>
              ) : thisWeek.map(renderProjectCard)}

              {/* Next Week */}
              <SectionHeader label="Next Week" dateRange={getWeekLabel(nextWeekAnchor)} count={nextWeek.length} />
              {nextWeek.length === 0 ? (
                <p style={{fontSize:12,color:'var(--ink-4)',fontStyle:'italic',marginBottom:12,paddingLeft:13}}>
                  No projects next week
                </p>
              ) : nextWeek.map(renderProjectCard)}

              {/* Upcoming */}
              <SectionHeader
                label="Upcoming"
                count={upcoming.length}
                onToggle={upcoming.length > 0 ? () => setUpcomingExpanded(p=>!p) : undefined}
                expanded={upcomingExpanded}
              />
              {upcomingExpanded && (
                upcoming.length === 0 ? (
                  <p style={{fontSize:12,color:'var(--ink-4)',fontStyle:'italic',marginBottom:12,paddingLeft:13}}>
                    No upcoming projects
                  </p>
                ) : upcoming.map(renderProjectCard)
              )}

              {/* Needs Dates */}
              {needsDates.length > 0 && (
                <>
                  <SectionHeader label="Needs Dates" count={needsDates.length} />
                  {needsDates.map(renderProjectCard)}
                </>
              )}
            </>
          )}
          </div>
        </div>

        {/* RIGHT */}
        <div
          className="crew-right"
          style={{
            flex:'1 1 35%', minWidth:220,
            position:'sticky', top:80,
            maxHeight:'calc(100vh - 100px)',
            overflowY:'auto',
          }}
        >
          {employees.length > 0 ? (
            <AvailabilityPanel
              employees={employees}
              projects={projects}
              assignments={assignments}
              assignmentHours={assignmentHours}
              weekAnchor={weekAnchor}
              panelWeekOffset={availabilityWeekOffset}
              onPanelWeekChange={setAvailabilityWeekOffset}
              sortMode={sortMode}
              onSortChange={setSortMode}
              employeeTypes={employeeTypes}
              unavailability={unavailability}
            />
          ) : (
            <div style={{
              background:'var(--bg)', border:'1px solid var(--line)',
              borderRadius:12, padding:24, textAlign:'center',
              color:'var(--ink-3)', fontSize:13,
            }}>
              <Users size={32} color="var(--ink-4)" style={{marginBottom:8}} />
              <div>No active employees found.</div>
              <button
                onClick={() => navigate('/employees')}
                style={{
                  marginTop:12, background:'var(--accent)', color:'#fff',
                  border:'none', borderRadius:8, padding:'7px 16px',
                  fontWeight:600, fontSize:12, cursor:'pointer',
                }}
              >
                Add Employees
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      <Toast message={toast?.message} type={toast?.type} />
    </div>
  )
}
