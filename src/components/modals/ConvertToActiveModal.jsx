import { useState, useEffect } from 'react'
import { X, CalendarDays, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { estimateLabourHours } from '../../lib/scoring'
import { getChecklistForType } from '../../lib/checklists'
import logger from '../../lib/logger'

function addWorkdays(startDateStr, days) {
  const d = new Date(startDateStr + 'T00:00:00')
  let added = 0
  while (added < days - 1) {
    d.setDate(d.getDate() + 1)
    if (d.getDay() !== 0 && d.getDay() !== 6) added++
  }
  return d.toISOString().slice(0, 10)
}

export default function ConvertToActiveModal({ project, onClose, onConverted }) {
  const [startDate, setStartDate]       = useState('')
  const [employees, setEmployees]       = useState([])
  const [teamFallback, setTeamFallback] = useState(false)
  const [checked, setChecked]           = useState({})
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState(null)

  const labourHours = project._scoreDetails?.labourHours
    ?? estimateLabourHours(project.square_footage || 1500, project.density || 'Medium')
  const durationDays = Math.max(1, Math.ceil(labourHours / 8))
  const endDate = startDate ? addWorkdays(startDate, durationDays) : ''

  useEffect(() => {
    let cancelled = false
    async function load() {
      // Try job-type-matched team first
      if (project.job_type) {
        const { data: typeRow } = await supabase
          .from('project_types').select('id').eq('name', project.job_type).maybeSingle()
        if (typeRow?.id) {
          const { data: matched } = await supabase
            .from('employee_project_types')
            .select('employees(id, name, role, active)')
            .eq('project_type_id', typeRow.id)
          const matchedEmps = (matched || [])
            .map(r => r.employees)
            .filter(e => e && e.active !== false)
          if (!cancelled && matchedEmps.length > 0) {
            setEmployees(matchedEmps)
            setChecked(Object.fromEntries(matchedEmps.map(e => [e.id, true])))
            setTeamFallback(false)
            return
          }
        }
      }
      // Fallback: all active employees
      const { data, error: empErr } = await supabase
        .from('employees').select('id, name, role, active').eq('active', true).order('name')
      if (cancelled) return
      if (empErr) {
        logger.error('ConvertToActive load employees failed', empErr)
        setEmployees([])
        return
      }
      const emps = data || []
      setEmployees(emps)
      setChecked(Object.fromEntries(emps.map(e => [e.id, true])))
      setTeamFallback(true)
    }
    load()
    return () => { cancelled = true }
  }, [project.job_type])

  async function handleConfirm() {
    if (!startDate) { setError('Please select a start date'); return }
    setSaving(true)
    setError(null)

    try {
      const assignedIds = Object.entries(checked).filter(([, v]) => v).map(([id]) => id)

      // Generate checklist if the lead doesn't have one yet
      const existingChecklist = Array.isArray(project.checklist) && project.checklist.length > 0
        ? project.checklist
        : null
      const checklist = existingChecklist || getChecklistForType(project.job_type)

      // 1. Update lead row
      const { error: leadErr } = await supabase.from('leads').update({
        status:        'Project Scheduled',
        project_start: startDate,
        project_end:   endDate || startDate,
        checklist,
      }).eq('id', project.id)
      if (leadErr) {
        logger.error('ConvertToActive lead update failed', leadErr)
        setError(leadErr.message)
        setSaving(false)
        return
      }

      // 2. Insert scheduled_projects row
      const { error: schedErr } = await supabase.from('scheduled_projects').insert({
        lead_id:      project.id,
        start_date:   startDate,
        end_date:     endDate || startDate,
        labour_hours: labourHours,
        job_type:     project.job_type,
      })
      if (schedErr) {
        logger.error('ConvertToActive scheduled_projects insert failed', schedErr)
        // Non-fatal: lead is already updated. Surface as warning only.
      }

      // 3. Insert project_assignments per checked employee
      if (assignedIds.length > 0) {
        const rows = assignedIds.map(employee_id => ({
          lead_id: project.id,
          employee_id,
          estimated_hours: labourHours / Math.max(1, assignedIds.length),
        }))
        const { error: paErr } = await supabase.from('project_assignments').insert(rows)
        if (paErr) logger.error('ConvertToActive project_assignments insert failed', paErr)
      }

      onConverted?.({
        ...project,
        status: 'Project Scheduled',
        project_start: startDate,
        project_end: endDate || startDate,
        checklist,
      })
    } catch (e) {
      logger.error('ConvertToActive threw', e)
      setError(e?.message || 'Failed to convert project.')
      setSaving(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'var(--overlay-heavy)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--panel)', borderRadius: 16, width: '100%', maxWidth: 520, boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarDays size={16} color="var(--accent)" />
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink-1)' }}>Convert to Active</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'grid', placeItems: 'center' }}><X size={16} /></button>
        </div>

        <div style={{ padding: '20px', overflowY: 'auto', maxHeight: 540 }}>
          {/* Project summary */}
          <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 14px', marginBottom: 18 }}>
            <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--ink-1)', marginBottom: 3 }}>{project.name}</div>
            {project.address && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 4 }}>{project.address}</div>}
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-ink)', background: 'var(--accent-soft)', padding: '2px 8px', borderRadius: 999 }}>{project.job_type}</span>
          </div>

          {/* Date + duration */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 9, padding: '8px 10px', fontSize: 13, color: 'var(--ink-1)', outline: 'none', fontFamily: 'inherit' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Duration</label>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 9, padding: '8px 10px', fontSize: 13, color: 'var(--ink-1)' }}>
                {durationDays} day{durationDays !== 1 ? 's' : ''}
                {endDate && <span style={{ fontSize: 11, color: 'var(--ink-3)', marginLeft: 6 }}>→ {endDate}</span>}
              </div>
            </div>
          </div>

          {/* Team */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Users size={13} color="var(--ink-3)" />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Team</span>
            </div>
            {teamFallback && project.job_type && employees.length > 0 && (
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginBottom: 8, fontStyle: 'italic' }}>
                No team set up for {project.job_type} — showing all active employees.
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {employees.length === 0 && (
                <div style={{ fontSize: 12.5, color: 'var(--ink-4)', padding: '10px 0' }}>No active employees found.</div>
              )}
              {employees.map(emp => (
                <label key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--line)', background: checked[emp.id] ? 'var(--accent-soft)' : 'var(--bg)', cursor: 'pointer', transition: 'background 120ms' }}>
                  <input
                    type="checkbox"
                    checked={!!checked[emp.id]}
                    onChange={e => setChecked(c => ({ ...c, [emp.id]: e.target.checked }))}
                    style={{ width: 15, height: 15, accentColor: 'var(--accent)', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-1)' }}>{emp.name}</div>
                    {emp.role && <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{emp.role}</div>}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {error && <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--lose)', background: 'var(--lose-soft)', borderRadius: 8, padding: '8px 12px' }}>{error}</div>}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, justifyContent: 'flex-end', background: 'var(--bg-2)' }}>
          <button onClick={onClose} disabled={saving} style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={saving || !startDate} style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: saving || !startDate ? 'var(--line)' : 'var(--accent)', color: saving || !startDate ? 'var(--ink-3)' : '#FFFFFF', fontSize: 13, fontWeight: 600, cursor: saving || !startDate ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <CalendarDays size={13} /> {saving ? 'Converting…' : 'Convert to Active'}
          </button>
        </div>
      </div>
    </div>
  )
}
