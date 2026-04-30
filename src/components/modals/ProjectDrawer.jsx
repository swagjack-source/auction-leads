import { useState, useEffect, useRef, useMemo } from 'react'
import {
  X, MapPin, MoreHorizontal, Pencil, CheckCircle, Trash2,
  Users, Plus, Star, Image as ImageIcon, FileText,
  CheckSquare, Square,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import { getChecklistForType, checklistProgress } from '../../lib/checklists'
import logger from '../../lib/logger'
import ConvertToActiveModal from './ConvertToActiveModal'
import MarkCompleteModal from './MarkCompleteModal'

const JOB_CHIP = {
  'Clean Out':            { bg: 'rgba(234,88,12,0.18)',  fg: '#ea580c' },
  'Auction':              { bg: 'rgba(124,58,237,0.18)', fg: '#7c3aed' },
  'Both':                 { bg: 'rgba(59,130,246,0.18)', fg: '#3b82f6' },
  'Move':                 { bg: 'rgba(20,184,166,0.18)', fg: '#0d9488' },
  'Sorting/Organizing':   { bg: 'rgba(168,85,247,0.18)', fg: '#a855f7' },
  'In-person Estate Sale':{ bg: 'rgba(234,179,8,0.18)',  fg: '#ca8a04' },
}

const AVATAR_COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899','#14b8a6']

const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME    || 'du5jkfzkf'
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'ct_listings'

// ── Helpers ────────────────────────────────────────────────────

function avatarColor(name = '') {
  return AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length]
}
function initials(name = '') {
  return name.split(' ').map(n => n[0]).filter(Boolean).join('').toUpperCase().slice(0, 2)
}
function fmt$(n) {
  if (n == null || n === '') return ''
  const num = Number(n)
  if (Number.isNaN(num)) return ''
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 })
}
function relTime(iso) {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.floor(ms / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function shortDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
function addWorkdays(startDateStr, days) {
  const d = new Date(startDateStr + 'T00:00:00')
  let added = 0
  while (added < days - 1) {
    d.setDate(d.getDate() + 1)
    if (d.getDay() !== 0 && d.getDay() !== 6) added++
  }
  return d.toISOString().slice(0, 10)
}

function timelineState(project) {
  const start = project.project_start ? startOfDay(project.project_start) : null
  const end   = project.project_end   ? startOfDay(project.project_end)   : null
  const today = startOfDay(new Date())
  if (project.status === 'Won' || project.status === 'Project Completed') {
    return { kind: 'completed', label: 'Completed', start, end, today }
  }
  if (!start || !end) return { kind: 'unscheduled', label: 'Not scheduled', start, end, today }
  if (today < start) {
    const days = Math.ceil((start - today) / 86400000)
    return { kind: 'upcoming', label: `Starts in ${days} day${days === 1 ? '' : 's'}`, start, end, today, days }
  }
  if (today > end) {
    const days = Math.ceil((today - end) / 86400000)
    return { kind: 'overdue', label: `Overdue by ${days} day${days === 1 ? '' : 's'}`, start, end, today, days }
  }
  const totalDays = Math.max(1, Math.round((end - start) / 86400000) + 1)
  const dayN = Math.round((today - start) / 86400000) + 1
  return { kind: 'active', label: `Day ${dayN} of ${totalDays}`, start, end, today, dayN, totalDays }
}

// ── Section wrapper ───────────────────────────────────────────

function SectionTitle({ children, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {children}
      </div>
      {right}
    </div>
  )
}

function Section({ children, style }) {
  return <div style={{ marginBottom: 22, ...style }}>{children}</div>
}

// ── 1. Header ────────────────────────────────────────────────

function HeaderSection({ project, timeline, onEdit, onMarkComplete, onDelete, onClose }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return
    function onClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  const chip = JOB_CHIP[project.job_type] || { bg: 'var(--bg-2)', fg: 'var(--ink-2)' }
  const mapsUrl = project.address
    ? `https://maps.google.com/?q=${encodeURIComponent(project.address)}`
    : null

  const tlColor =
    timeline.kind === 'completed' ? 'var(--win)'
    : timeline.kind === 'overdue' ? 'var(--lose)'
    : timeline.kind === 'active'  ? 'var(--accent)'
    : timeline.kind === 'upcoming' ? 'var(--warn)'
    : 'var(--ink-3)'
  const tlBg = `color-mix(in oklab, ${tlColor} 14%, var(--panel))`

  return (
    <div style={{ padding: '16px 18px 14px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, background: chip.bg, color: chip.fg, padding: '2px 8px', borderRadius: 5 }}>
              {project.job_type || 'Untitled'}
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: tlColor, background: tlBg, padding: '2px 8px', borderRadius: 999 }}>
              {timeline.label}
            </span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink-1)', letterSpacing: '-0.02em' }}>{project.name}</div>
          {project.address && (
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 4, fontSize: 12.5, color: 'var(--ink-3)', textDecoration: 'none' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--ink-3)'}
            >
              <MapPin size={12} strokeWidth={1.8} />
              <span>{project.address}</span>
            </a>
          )}
        </div>
        <div style={{ position: 'relative', display: 'flex', gap: 4 }} ref={menuRef}>
          <button onClick={() => setMenuOpen(s => !s)} style={iconBtn} title="More" aria-label="More actions">
            <MoreHorizontal size={16} />
          </button>
          <button onClick={onClose} style={iconBtn} title="Close" aria-label="Close">
            <X size={16} />
          </button>
          {menuOpen && (
            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 80, background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-2)', minWidth: 180, overflow: 'hidden' }}>
              <MenuItem icon={Pencil} label="Edit Details" onClick={() => { setMenuOpen(false); onEdit() }} />
              {timeline.kind !== 'completed' && (
                <MenuItem icon={CheckCircle} label="Mark Complete" onClick={() => { setMenuOpen(false); onMarkComplete() }} />
              )}
              <MenuItem icon={Trash2} danger label="Delete Project" onClick={() => { setMenuOpen(false); setConfirmDelete(true) }} />
            </div>
          )}
        </div>
      </div>

      {confirmDelete && (
        <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--lose-soft)', border: '1px solid color-mix(in oklab, var(--lose) 25%, var(--line))', borderRadius: 9, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ flex: 1, fontSize: 12.5, color: 'var(--lose)' }}>Delete this project? This cannot be undone.</span>
          <button onClick={() => setConfirmDelete(false)} style={{ ...secondaryBtn, padding: '5px 10px' }}>Cancel</button>
          <button onClick={() => { setConfirmDelete(false); onDelete(project.id) }} style={{ ...primaryBtn, background: 'var(--lose)', padding: '5px 10px' }}>Delete</button>
        </div>
      )}
    </div>
  )
}

function MenuItem({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
        padding: '8px 12px', border: 'none', background: 'transparent',
        color: danger ? 'var(--lose)' : 'var(--ink-1)',
        fontSize: 13, fontWeight: 500, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
      }}
      onMouseEnter={e => e.currentTarget.style.background = danger ? 'var(--lose-soft)' : 'var(--hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <Icon size={14} strokeWidth={1.8} />
      {label}
    </button>
  )
}

// ── 2. Timeline ──────────────────────────────────────────────

function TimelineSection({ project, timeline, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [start, setStart] = useState('')
  const [days, setDays] = useState(3)

  if (timeline.kind === 'unscheduled' && !editing) {
    return (
      <Section>
        <SectionTitle>Timeline</SectionTitle>
        <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10, padding: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 10 }}>No dates set</div>
          <button onClick={() => setEditing(true)} style={primaryBtn}>Set Dates</button>
        </div>
      </Section>
    )
  }

  if (editing) {
    const calcEnd = start ? addWorkdays(start, Math.max(1, Number(days) || 1)) : ''
    return (
      <Section>
        <SectionTitle>Timeline</SectionTitle>
        <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10, padding: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div style={fieldLabel}>Start Date</div>
            <input type="date" value={start} onChange={e => setStart(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <div style={fieldLabel}>Days (approx)</div>
            <input type="number" min={1} value={days} onChange={e => setDays(e.target.value)} style={inputStyle} />
          </div>
          {calcEnd && (
            <div style={{ gridColumn: '1 / -1', fontSize: 12, color: 'var(--ink-3)' }}>End: <strong style={{ color: 'var(--ink-1)' }}>{calcEnd}</strong></div>
          )}
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setEditing(false)} style={secondaryBtn}>Cancel</button>
            <button
              onClick={() => {
                if (!start) return
                onUpdate({ project_start: start, project_end: calcEnd || start })
                setEditing(false)
              }}
              disabled={!start}
              style={{ ...primaryBtn, opacity: start ? 1 : 0.5 }}
            >
              Save
            </button>
          </div>
        </div>
      </Section>
    )
  }

  // Render the bar
  const start_ = timeline.start
  const end_ = timeline.end
  const today = timeline.today
  const total = Math.max(1, end_ - start_)
  const elapsed = Math.max(0, today - start_)
  const fillPct = Math.min(100, (elapsed / total) * 100)
  const overdue = timeline.kind === 'overdue'
  const completed = timeline.kind === 'completed'

  const fillColor = completed ? 'var(--win)' : overdue ? 'var(--lose)' : 'var(--accent)'

  return (
    <Section>
      <SectionTitle right={<button onClick={() => setEditing(true)} style={linkBtn}>Edit</button>}>Timeline</SectionTitle>
      <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10, padding: '14px' }}>
        <div style={{ position: 'relative', height: 8, borderRadius: 4, background: 'var(--line)', overflow: 'visible' }}>
          <div style={{ position: 'absolute', inset: '0 auto 0 0', width: `${fillPct}%`, background: fillColor, borderRadius: 4 }} />
          {overdue && (
            <div style={{ position: 'absolute', top: 0, bottom: 0, right: -6, width: 6, background: 'var(--lose)', borderRadius: '0 4px 4px 0' }} />
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--ink-4)' }}>
          <span>{shortDate(start_)}</span>
          <span style={{ color: overdue ? 'var(--lose)' : 'var(--ink-2)', fontWeight: 600 }}>{timeline.label}</span>
          <span>{shortDate(end_)}</span>
        </div>
      </div>
    </Section>
  )
}

// ── 3. Team ──────────────────────────────────────────────────

function TeamSection({ project, assignments, onEditTeam }) {
  const hasTeam = assignments.length > 0

  if (!hasTeam) {
    return (
      <Section>
        <SectionTitle>Team</SectionTitle>
        <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10, padding: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 10 }}>No team assigned</div>
          <button onClick={onEditTeam} style={primaryBtn}>
            <Users size={13} style={{ marginRight: 6 }} /> Assign Team
          </button>
        </div>
      </Section>
    )
  }

  return (
    <Section>
      <SectionTitle right={<button onClick={onEditTeam} style={linkBtn}>Edit Team</button>}>Team</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
        {assignments.map(a => {
          const name = a.employees?.name || 'Unassigned'
          const role = a.employees?.role
          const hours = a.estimated_hours
          return (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 9, background: 'var(--bg)', border: '1px solid var(--line)' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: avatarColor(name), color: '#fff',
                display: 'grid', placeItems: 'center',
                fontSize: 11, fontWeight: 700,
              }}>{initials(name)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {role || (hours ? `~${Math.round(hours)} hrs` : '—')}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Section>
  )
}

// ── 4. Financials ────────────────────────────────────────────

const FIN_FIELDS = [
  { key: 'bid_amount',           label: 'Bid Amount' },
  { key: 'deposit_received',     label: 'Deposit Received' },
  { key: 'actual_labour_cost',   label: 'Labour Cost' },
  { key: 'actual_expenses',      label: 'Expenses' },
  { key: 'actual_royalties',     label: 'Royalties' },
]

function FinancialsSection({ project, onSave }) {
  const initialBid = project.bid_amount ?? project._scoreDetails?.recommendedBid ?? ''
  const [values, setValues] = useState({
    bid_amount:           initialBid === '' ? '' : String(initialBid),
    deposit_received:     project.deposit_received != null ? String(project.deposit_received) : '',
    actual_labour_cost:   project.actual_labour_cost != null ? String(project.actual_labour_cost) : '',
    actual_expenses:      project.actual_expenses != null ? String(project.actual_expenses) : '',
    actual_royalties:     project.actual_royalties != null ? String(project.actual_royalties) : '',
  })
  const [savedFlash, setSavedFlash] = useState(null) // field key
  const debounceTimers = useRef({})

  function commit(key, raw) {
    const num = raw === '' ? null : Number(raw)
    if (raw !== '' && Number.isNaN(num)) return
    onSave({ [key]: num })
    setSavedFlash(key)
    setTimeout(() => setSavedFlash(f => f === key ? null : f), 1200)
  }

  function setField(key, raw) {
    setValues(v => ({ ...v, [key]: raw }))
    clearTimeout(debounceTimers.current[key])
    debounceTimers.current[key] = setTimeout(() => commit(key, raw), 500)
  }

  useEffect(() => () => {
    Object.values(debounceTimers.current).forEach(clearTimeout)
  }, [])

  const bid = Number(values.bid_amount) || 0
  const labour = Number(values.actual_labour_cost) || 0
  const exp = Number(values.actual_expenses) || 0
  const roy = Number(values.actual_royalties) || 0
  const profit = bid - labour - exp - roy
  const margin = bid > 0 ? Math.round((profit / bid) * 100) : null

  const marginColor =
    margin == null ? 'var(--ink-3)'
    : margin > 40 ? 'var(--win)'
    : margin >= 20 ? 'var(--warn)'
    : 'var(--lose)'

  return (
    <Section>
      <SectionTitle>Financials</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {FIN_FIELDS.map(f => (
          <div key={f.key}>
            <div style={fieldLabel}>{f.label}</div>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)', fontSize: 12, pointerEvents: 'none' }}>$</span>
              <input
                type="number"
                inputMode="decimal"
                value={values[f.key]}
                onChange={e => setField(f.key, e.target.value)}
                onBlur={() => commit(f.key, values[f.key])}
                style={{ ...inputStyle, paddingLeft: 22 }}
                placeholder="0"
              />
              {savedFlash === f.key && (
                <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10.5, color: 'var(--win)', fontWeight: 600 }}>Saved ✓</span>
              )}
            </div>
          </div>
        ))}
        <div>
          <div style={fieldLabel}>Profit</div>
          <div style={{ ...readonlyBox, color: profit > 0 ? 'var(--win)' : profit < 0 ? 'var(--lose)' : 'var(--ink-2)', fontWeight: 700 }}>
            {bid ? `$${fmt$(profit)}` : '—'}
          </div>
        </div>
        <div>
          <div style={fieldLabel}>Margin</div>
          <div style={{ ...readonlyBox, color: marginColor, fontWeight: 700 }}>
            {margin != null ? `${margin}%` : '—'}
          </div>
        </div>
      </div>
    </Section>
  )
}

// ── 5. Notes / Updates ───────────────────────────────────────

function NotesSection({ project, currentUserName }) {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [noTable, setNoTable] = useState(false)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function fetch() {
      const { data, error } = await supabase
        .from('project_notes')
        .select('*')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (cancelled) return
      if (error) {
        if (error.code === '42P01') setNoTable(true)
        else logger.error('project_notes fetch failed', error)
        setNotes([])
      } else {
        setNotes(data || [])
      }
      setLoading(false)
    }
    fetch()
    return () => { cancelled = true }
  }, [project.id])

  async function handlePost() {
    if (!draft.trim()) return
    setSaving(true)
    const { data, error } = await supabase.from('project_notes').insert({
      project_id: project.id,
      project_type: 'lead',
      author: currentUserName || 'You',
      content: draft.trim(),
    }).select().single()
    if (error) {
      logger.error('project_notes insert failed', error)
      if (error.code === '42P01') setNoTable(true)
    } else if (data) {
      setNotes(ns => [data, ...ns])
      setDraft('')
      setAdding(false)
    }
    setSaving(false)
  }

  return (
    <Section>
      <SectionTitle right={!adding ? <button onClick={() => setAdding(true)} style={linkBtn}>+ Add update</button> : null}>Updates</SectionTitle>

      {noTable && (
        <div style={{ padding: '10px 12px', background: 'var(--warn-soft)', border: '1px solid color-mix(in oklab, var(--warn) 25%, var(--line))', borderRadius: 9, fontSize: 12, color: 'var(--ink-2)', marginBottom: 12 }}>
          The <code>project_notes</code> table isn't set up yet. Run the Phase 2 migration to enable updates.
        </div>
      )}

      {adding && (
        <div style={{ marginBottom: 12, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10, padding: 10 }}>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="What happened today?"
            rows={3}
            autoFocus
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit' }}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button onClick={() => { setAdding(false); setDraft('') }} style={secondaryBtn}>Cancel</button>
            <button onClick={handlePost} disabled={saving || !draft.trim()} style={{ ...primaryBtn, opacity: saving || !draft.trim() ? 0.5 : 1 }}>
              {saving ? 'Posting…' : 'Post'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: 12.5, color: 'var(--ink-4)' }}>Loading…</div>
      ) : notes.length === 0 && !noTable ? (
        <div style={{ fontSize: 12.5, color: 'var(--ink-4)' }}>No updates yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {notes.map((n, i) => (
            <div key={n.id} style={{
              padding: '10px 0',
              borderBottom: i < notes.length - 1 ? '1px solid var(--line-2)' : 'none',
            }}>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 4 }}>
                <span style={{ fontWeight: 600, color: 'var(--ink-2)' }}>{shortDate(n.created_at)}</span>
                {n.author && <> — <span style={{ fontWeight: 600, color: 'var(--ink-2)' }}>{n.author}</span></>}
                <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--ink-4)' }}>{relTime(n.created_at)}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-1)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{n.content}</div>
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}

// ── 6. Checklist ─────────────────────────────────────────────

function ChecklistSection({ project, onSave }) {
  const checklist = Array.isArray(project.checklist) ? project.checklist : []
  const { done, total } = checklistProgress(checklist)

  function toggle(i) {
    const updated = checklist.map((x, idx) => idx === i ? { ...x, done: !x.done } : x)
    onSave({ checklist: updated })
  }

  function generate() {
    onSave({ checklist: getChecklistForType(project.job_type) })
  }

  return (
    <Section>
      <SectionTitle right={total > 0 && <span style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 500 }}>{done} of {total} complete</span>}>
        Tasks
      </SectionTitle>

      {total === 0 ? (
        <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10, padding: '14px', textAlign: 'center' }}>
          {project.job_type ? (
            <>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 10 }}>No tasks yet for {project.job_type}</div>
              <button onClick={generate} style={primaryBtn}>Generate Tasks</button>
            </>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Set a job type to generate tasks.</div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {checklist.map((item, i) => (
            <button
              key={i}
              onClick={() => toggle(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)',
                background: item.done ? 'var(--win-soft)' : 'var(--bg)',
                cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
              }}
            >
              {item.done
                ? <CheckSquare size={14} strokeWidth={1.8} color="var(--win)" />
                : <Square size={14} strokeWidth={1.8} color="var(--ink-4)" />}
              <span style={{
                fontSize: 13, color: item.done ? 'var(--win)' : 'var(--ink-1)',
                textDecoration: item.done ? 'line-through' : 'none',
                opacity: item.done ? 0.75 : 1,
              }}>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </Section>
  )
}

// ── 7. Photos ────────────────────────────────────────────────

async function uploadToCloudinary(file) {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('upload_preset', UPLOAD_PRESET)
  let res
  try {
    res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
      method: 'POST', body: fd,
    })
  } catch (err) {
    throw new Error(`Network error: could not reach Cloudinary (${err.message}).`)
  }
  if (!res.ok) {
    let detail = ''
    try {
      const body = await res.json()
      detail = body?.error?.message || JSON.stringify(body)
    } catch {
      detail = await res.text().catch(() => '')
    }
    throw new Error(`Upload failed (HTTP ${res.status}): ${detail || 'unknown'}`)
  }
  return res.json()
}

function PhotosSection({ project, onSave }) {
  const photos = Array.isArray(project.photos) ? project.photos : []
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [lightbox, setLightbox] = useState(null)

  async function handleFiles(e) {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length === 0) return
    setUploading(true)
    setError(null)
    const added = []
    for (const file of files) {
      try {
        const data = await uploadToCloudinary(file)
        added.push({ url: data.secure_url, uploaded_at: new Date().toISOString() })
      } catch (err) {
        logger.error('Photo upload failed', err)
        setError(err.message)
      }
    }
    if (added.length > 0) {
      onSave({ photos: [...photos, ...added] })
    }
    setUploading(false)
  }

  function deletePhoto(idx) {
    const next = photos.filter((_, i) => i !== idx)
    onSave({ photos: next })
  }

  return (
    <Section>
      <SectionTitle right={
        <button onClick={() => fileRef.current?.click()} style={linkBtn} disabled={uploading}>
          {uploading ? 'Uploading…' : '+ Add Photos'}
        </button>
      }>Photos</SectionTitle>
      <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFiles} />

      {photos.length === 0 ? (
        <div style={{ fontSize: 12.5, color: 'var(--ink-4)' }}>No photos yet.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {photos.map((p, i) => (
            <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', background: 'var(--bg-2)', cursor: 'pointer' }}
              onClick={() => setLightbox(p.url)}
              onMouseEnter={e => { const btn = e.currentTarget.querySelector('[data-del]'); if (btn) btn.style.opacity = '1' }}
              onMouseLeave={e => { const btn = e.currentTarget.querySelector('[data-del]'); if (btn) btn.style.opacity = '0' }}
            >
              <img src={p.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <button
                data-del
                onClick={e => { e.stopPropagation(); deletePhoto(i) }}
                style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.55)', color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center', opacity: 0, transition: 'opacity 120ms' }}
                aria-label="Delete photo"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div style={{ marginTop: 10, padding: '6px 10px', fontSize: 12, color: 'var(--lose)', background: 'var(--lose-soft)', borderRadius: 6 }}>
          {error}
        </div>
      )}

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.85)', display: 'grid', placeItems: 'center', padding: 20, cursor: 'pointer' }}
        >
          <img src={lightbox} alt="" style={{ maxWidth: '95%', maxHeight: '95%', objectFit: 'contain', borderRadius: 8 }} />
        </div>
      )}
    </Section>
  )
}

// ── 8. Documents ─────────────────────────────────────────────

function DocumentsSection({ project }) {
  // Documents read-only / placeholder until Storage is configured.
  // This section exists so the panel always renders the full 8-section layout.
  return (
    <Section>
      <SectionTitle right={
        <button style={{ ...linkBtn, opacity: 0.5, cursor: 'not-allowed' }} title="Coming soon" disabled>+ Attach</button>
      }>Documents</SectionTitle>
      <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10, padding: '14px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 12.5 }}>
        No documents attached
      </div>
    </Section>
  )
}

// ── Main drawer ──────────────────────────────────────────────

export default function ProjectDrawer({ project, onClose, onProjectUpdated, onDelete, onOpenScorer }) {
  const { organizationId, user } = useAuth()
  const [local, setLocal] = useState(project)
  const [assignments, setAssignments] = useState([])
  const [showConvert, setShowConvert] = useState(false)
  const [showComplete, setShowComplete] = useState(false)

  useEffect(() => { setLocal(project) }, [project])

  const isCompleted = local?.status === 'Won' || local?.status === 'Project Completed'
  const timeline = useMemo(() => timelineState(local || {}), [local])

  // Load assignments once + when project id changes
  useEffect(() => {
    if (!local?.id) return
    let cancelled = false
    async function load() {
      const { data, error } = await supabase
        .from('project_assignments')
        .select('id, estimated_hours, employees(id, name, role, active)')
        .eq('lead_id', local.id)
      if (!cancelled && !error) setAssignments(data || [])
    }
    load()
    return () => { cancelled = true }
  }, [local?.id])

  if (!local) return null

  // Generic save: optimistic update + supabase update + bubble up
  async function saveFields(fields) {
    setLocal(prev => ({ ...prev, ...fields }))
    const { error } = await supabase.from('leads').update(fields).eq('id', local.id)
    if (error) {
      logger.error('ProjectDrawer save failed', error)
      // Revert (best-effort) by re-fetching
      const { data } = await supabase.from('leads').select('*').eq('id', local.id).single()
      if (data) setLocal(data)
    } else {
      onProjectUpdated?.()
    }
  }

  function handleEditTeam() {
    // Reuse the convert flow's team UI when project is not yet active.
    // For active/completed projects, open the scorer modal as a placeholder
    // until a dedicated team-edit modal is built.
    setShowConvert(true)
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'var(--overlay)' }} />

      {/* Drawer */}
      <aside style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 540, zIndex: 50,
        background: 'var(--panel)', borderLeft: '1px solid var(--line)',
        boxShadow: '-8px 0 48px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column',
        animation: 'slidein 220ms cubic-bezier(.2,.7,.3,1.05)',
      }}>
        <HeaderSection
          project={local}
          timeline={timeline}
          onClose={onClose}
          onEdit={() => onOpenScorer?.(local)}
          onMarkComplete={() => setShowComplete(true)}
          onDelete={onDelete}
        />

        {/* Scrollable body — all 8 sections in order, no tabs */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 18px 20px' }}>
          <TimelineSection project={local} timeline={timeline} onUpdate={saveFields} />
          <TeamSection project={local} assignments={assignments} onEditTeam={handleEditTeam} />
          <FinancialsSection project={local} onSave={saveFields} />
          <NotesSection project={local} currentUserName={user?.email || 'You'} />
          <ChecklistSection project={local} onSave={saveFields} />
          <PhotosSection project={local} onSave={saveFields} />
          <DocumentsSection project={local} />
        </div>

        {/* Footer — primary action depends on state */}
        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, flexShrink: 0 }}>
          {!isCompleted && timeline.kind !== 'active' && timeline.kind !== 'overdue' && (
            <button onClick={() => setShowConvert(true)} style={{ ...primaryBtn, flex: 1 }}>
              Convert to Active
            </button>
          )}
          {(timeline.kind === 'active' || timeline.kind === 'overdue') && !isCompleted && (
            <button onClick={() => setShowComplete(true)} style={{ ...primaryBtn, flex: 1 }}>
              <CheckCircle size={13} style={{ marginRight: 6 }} /> Mark Complete
            </button>
          )}
          {isCompleted && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, color: 'var(--win)', fontWeight: 600 }}>
              <CheckCircle size={13} style={{ marginRight: 6 }} /> Completed
            </div>
          )}
        </div>
      </aside>

      {showConvert && (
        <ConvertToActiveModal
          project={local}
          onClose={() => setShowConvert(false)}
          onConverted={updated => {
            setShowConvert(false)
            setLocal(updated)
            onProjectUpdated?.()
          }}
        />
      )}

      {showComplete && (
        <MarkCompleteModal
          project={local}
          onClose={() => setShowComplete(false)}
          onCompleted={updated => {
            setShowComplete(false)
            setLocal(updated)
            onProjectUpdated?.()
          }}
        />
      )}
    </>
  )
}

// ── Shared styles ────────────────────────────────────────────

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '8px 10px',
  fontSize: 13, color: 'var(--ink-1)',
  background: 'var(--panel)',
  border: '1px solid var(--line-2)',
  borderRadius: 8,
  outline: 'none', fontFamily: 'inherit',
}

const readonlyBox = {
  width: '100%', boxSizing: 'border-box',
  padding: '8px 10px',
  fontSize: 13,
  background: 'var(--bg-2)',
  border: '1px solid var(--line-2)',
  borderRadius: 8,
}

const fieldLabel = {
  display: 'block',
  fontSize: 11, fontWeight: 600,
  color: 'var(--ink-3)',
  marginBottom: 5,
  letterSpacing: '0.02em',
}

const primaryBtn = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  padding: '8px 14px', borderRadius: 8,
  fontSize: 13, fontWeight: 600,
  background: 'var(--accent)',
  border: 'none',
  color: '#FFFFFF',
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const secondaryBtn = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  padding: '8px 14px', borderRadius: 8,
  fontSize: 13, fontWeight: 500,
  background: 'transparent',
  border: '1px solid var(--line-2)',
  color: 'var(--ink-2)',
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const iconBtn = {
  width: 30, height: 30, borderRadius: 8,
  border: '1px solid var(--line)', background: 'var(--panel)',
  display: 'grid', placeItems: 'center', cursor: 'pointer',
  color: 'var(--ink-3)',
}

const linkBtn = {
  background: 'transparent', border: 'none', cursor: 'pointer',
  color: 'var(--accent-ink)', fontSize: 12, fontWeight: 600,
  fontFamily: 'inherit', padding: 0,
}
