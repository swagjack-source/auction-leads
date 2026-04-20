import { useState, useEffect } from 'react'
import { X, CalendarDays, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { estimateLabourHours } from '../../lib/scoring'

function addWorkdays(startDateStr, days) {
  const d = new Date(startDateStr + 'T00:00:00')
  let added = 0
  while (added < days - 1) {
    d.setDate(d.getDate() + 1)
    if (d.getDay() !== 0 && d.getDay() !== 6) added++
  }
  return d.toISOString().slice(0, 10)
}

export default function ScheduleProjectModal({ lead, onClose, onScheduled }) {
  const [startDate, setStartDate]   = useState('')
  const [employees, setEmployees]   = useState([])
  const [checked, setChecked]       = useState({})
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState(null)
  const [toast, setToast]           = useState(false)

  const labourHours = lead._scoreDetails?.labourHours
    ?? estimateLabourHours(lead.square_footage || 1500, lead.density || 'Medium')
  const durationDays = Math.max(1, Math.ceil(labourHours / 8))
  const endDate = startDate ? addWorkdays(startDate, durationDays) : ''

  useEffect(() => {
    supabase
      .from('employees')
      .select('id, name, role, is_active')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        const emps = data || []
        setEmployees(emps)
        setChecked(Object.fromEntries(emps.map(e => [e.id, true])))
      })
  }, [])

  async function handleSchedule() {
    if (!startDate) { setError('Please select a start date'); return }
    setSaving(true)
    setError(null)

    const assignedIds = Object.entries(checked).filter(([, v]) => v).map(([id]) => id)

    const { error: schedErr } = await supabase.from('scheduled_projects').insert({
      lead_id:      lead.id,
      start_date:   startDate,
      end_date:     endDate || startDate,
      labour_hours: labourHours,
      job_type:     lead.job_type,
    })
    if (schedErr) { setError(schedErr.message); setSaving(false); return }

    // Also update lead with project dates so Schedule page picks it up
    await supabase.from('leads').update({
      project_start: startDate,
      project_end:   endDate || startDate,
    }).eq('id', lead.id)

    onScheduled('Project Scheduled')
    setToast(true)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'var(--overlay-heavy)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--panel)', borderRadius: 16, width: '100%', maxWidth: 500, boxShadow: '0 24px 70px rgba(20,22,26,0.28)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarDays size={16} color="var(--accent)" />
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink-1)' }}>Add to Schedule</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'grid', placeItems: 'center' }}><X size={16} /></button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', overflowY: 'auto', maxHeight: 500 }}>

          {/* Project info */}
          <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 14px', marginBottom: 18 }}>
            <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--ink-1)', marginBottom: 3 }}>{lead.name}</div>
            {lead.address && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 2 }}>{lead.address}</div>}
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-ink)', background: 'var(--accent-soft)', padding: '2px 8px', borderRadius: 999 }}>{lead.job_type}</span>
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
                  <div>
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
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSchedule} disabled={saving || !startDate} style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: saving || !startDate ? 'var(--line)' : 'var(--accent)', color: saving || !startDate ? 'var(--ink-3)' : 'white', fontSize: 13, fontWeight: 600, cursor: saving || !startDate ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <CalendarDays size={13} /> {saving ? 'Scheduling…' : 'Schedule Project'}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', background: 'var(--ink-1)', color: 'var(--bg)', padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 500, zIndex: 999, whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
          ✓ Project added to schedule
        </div>
      )}
    </div>
  )
}
