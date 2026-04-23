import { useState, useEffect, useRef } from 'react'
import {
  X, Phone, FileText, Image, File, Download, Trash2,
  Upload, Plus, Star, Copy, Check,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import { useTeam } from '../../lib/TeamContext'

// ── Constants ─────────────────────────────────────────────────

const JOB_CHIP = {
  'Clean Out':     { bg: 'rgba(234,88,12,0.2)',  accent: '#ea580c' },
  'Auction':       { bg: 'rgba(124,58,237,0.2)', accent: '#7c3aed' },
  'Both':          { bg: 'rgba(59,130,246,0.2)', accent: '#3b82f6' },
  'In-Person Sale':{ bg: 'rgba(234,179,8,0.2)',  accent: '#ca8a04' },
}

const SENTIMENTS = [
  { key: 'tough',  label: '😤 Tough' },
  { key: 'okay',   label: '😊 Okay' },
  { key: 'happy',  label: '😄 Happy' },
  { key: 'raving', label: '🤩 Raving' },
]

const AVATAR_COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899','#14b8a6']

// ── Tiny helpers ──────────────────────────────────────────────

function avatarColor(name = '') {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}
function initials(name = '') {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}
function fmt$(n) { return n ? `$${Math.round(n).toLocaleString()}` : '—' }
function fmtBytes(b) {
  if (!b) return ''
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b/1024).toFixed(1)} KB`
  return `${(b/1048576).toFixed(1)} MB`
}
function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' })
}
function relDate(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Today · ${new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
  if (hrs < 48) return 'Yesterday'
  return fmtDate(iso)
}

// ── Shared sub-components ─────────────────────────────────────

function StatBox({ label, value, sub, color }) {
  return (
    <div style={{ flex: 1, minWidth: 0, background: 'var(--bg-2)', borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: color || 'var(--ink-1)', letterSpacing: '-0.01em' }}>{value || '—'}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{sub}</div>}
    </div>
  )
}

function MetricPair({ a, b }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{a.label}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-1)', marginTop: 2 }}>{a.value ?? '—'}</div>
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{b.label}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-1)', marginTop: 2 }}>{b.value ?? '—'}</div>
      </div>
    </div>
  )
}

function Section({ label, children, style }) {
  return (
    <div style={{ marginBottom: 20, ...style }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{label}</div>
      {children}
    </div>
  )
}

function Avatar({ name, size = 28 }) {
  const color = avatarColor(name)
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.floor(size * 0.38), fontWeight: 700, border: '2px solid var(--panel)', flexShrink: 0 }}>
      {initials(name)}
    </div>
  )
}

function QuickLogButton({ label, onLog }) {
  return (
    <button onClick={() => onLog(label)} style={{
      background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 9,
      padding: '10px 12px', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
      display: 'flex', flexDirection: 'column', gap: 2,
    }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent-ink)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>+ LOG</span>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-1)' }}>{label}</span>
    </button>
  )
}

function FileIcon({ name = '' }) {
  const ext = name.split('.').pop().toLowerCase()
  if (['jpg','jpeg','png','gif','webp','heic'].includes(ext)) return <Image size={14} />
  if (ext === 'pdf') return <FileText size={14} />
  return <File size={14} />
}

// ── OVERVIEW TAB ─────────────────────────────────────────────

function OverviewTab({ project, members, isCompleted, logs, onLog, onAssign }) {
  const d = project._scoreDetails || {}
  const assignedMember = members.find(m => m.id === project.assigned_to)
  const [showAssignMenu, setShowAssignMenu] = useState(false)
  const assignRef = useRef(null)

  useEffect(() => {
    if (!showAssignMenu) return
    function handle(e) { if (assignRef.current && !assignRef.current.contains(e.target)) setShowAssignMenu(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [showAssignMenu])

  return (
    <div>
      <Section label="Project Metrics">
        {isCompleted ? (
          <>
            <MetricPair
              a={{ label: 'Days on Site', value: project.project_start && project.project_end
                ? Math.round((new Date(project.project_end) - new Date(project.project_start)) / 86400000) + 1
                : d.projectDays ?? '—' }}
              b={{ label: 'Lot Count', value: '—' }}
            />
            <MetricPair
              a={{ label: 'Labor Hrs', value: d.labourHours ? Math.round(d.labourHours) : '—' }}
              b={{ label: 'Dumpster Fees', value: '—' }}
            />
          </>
        ) : (
          <>
            <MetricPair
              a={{ label: 'Setup Days', value: d.projectDays ?? '—' }}
              b={{ label: 'Labor Hrs', value: d.labourHours ? Math.round(d.labourHours) : '—' }}
            />
            <MetricPair
              a={{ label: 'Crew Size', value: project.crew_size || d.crewSize || '—' }}
              b={{ label: 'Rec. Bid', value: d.recommendedBid ? fmt$(d.recommendedBid) : '—' }}
            />
          </>
        )}
      </Section>

      <Section label="Client">
        <MetricPair
          a={{ label: 'Primary', value: project.name }}
          b={{ label: 'Phone', value: project.phone || '—' }}
        />
        <MetricPair
          a={{ label: 'Email', value: project.email || '—' }}
          b={{ label: 'Referred By', value: project.lead_source || '—' }}
        />
      </Section>

      <Section label="Crew">
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }} ref={assignRef}>
          {assignedMember ? (
            <Avatar name={assignedMember.name} size={30} />
          ) : (
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--bg-2)', border: '2px dashed var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={12} color="var(--ink-3)" />
            </div>
          )}
          <button
            onClick={() => setShowAssignMenu(s => !s)}
            style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-ink)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }}
          >
            {assignedMember ? `${assignedMember.name} ▾` : '+ Assign'}
          </button>
          {showAssignMenu && (
            <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 100, background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', minWidth: 180, overflow: 'hidden', marginTop: 4 }}>
              {members.length === 0 && (
                <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--ink-3)' }}>No team members yet. Add via Calendar → Manage Team.</div>
              )}
              {members.map(m => (
                <button key={m.id} onClick={() => { onAssign(m.id); setShowAssignMenu(false) }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', border: 'none', background: project.assigned_to === m.id ? 'var(--accent-soft)' : 'transparent', color: project.assigned_to === m.id ? 'var(--accent-ink)' : 'var(--ink-1)', fontSize: 12.5, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: m.color || avatarColor(m.name), color: 'white', display: 'grid', placeItems: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{(m.initials || m.name?.[0] || '?').toUpperCase()}</div>
                  {m.name}
                </button>
              ))}
              {assignedMember && (
                <button onClick={() => { onAssign(null); setShowAssignMenu(false) }} style={{ display: 'block', width: '100%', padding: '8px 12px', border: 'none', borderTop: '1px solid var(--line)', background: 'transparent', color: 'var(--ink-3)', fontSize: 12, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>Remove assignee</button>
              )}
            </div>
          )}
        </div>
      </Section>

      {!isCompleted && (
        <Section label="Quick Updates">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <QuickLogButton label="Labor hours"   onLog={onLog} />
            <QuickLogButton label="Supplies spent" onLog={onLog} />
            <QuickLogButton label="Dumpster fee"   onLog={onLog} />
            <QuickLogButton label="Notes"          onLog={onLog} />
          </div>
        </Section>
      )}
    </div>
  )
}

// ── SCORER TAB ───────────────────────────────────────────────

function scoreFactor(label, detail, delta) {
  if (delta == null) return null
  const pos = delta >= 0
  return { label, detail, delta, pos }
}

function getDealFactors(project) {
  const { square_footage: sqft, density, item_quality_score: quality, job_type } = project
  const factors = []

  if (sqft) {
    const delta = sqft < 1500 ? -0.5 : sqft < 3500 ? +0.2 : +0.8
    factors.push(scoreFactor('Square footage', `${Number(sqft).toLocaleString()} sqft`, delta))
  }
  if (density) {
    const delta = { Low: -0.4, Medium: 0, High: +0.4 }[density] ?? 0
    factors.push(scoreFactor('Item density', density, delta))
  }
  if (quality) {
    const delta = quality <= 3 ? -0.5 : quality <= 5 ? 0 : quality <= 7 ? +0.4 : +0.8
    factors.push(scoreFactor('Item quality', `${quality}/10`, delta))
  }
  if (job_type) {
    const delta = job_type === 'Auction' ? +0.6 : job_type === 'Both' ? +0.4 : 0
    factors.push(scoreFactor('Job type', job_type, delta))
  }
  return factors.filter(Boolean)
}

function ScorerTab({ project }) {
  const d = project._scoreDetails || {}
  const score = project.deal_score
  const bid = d.recommendedBid
  const scoreColor = !score ? 'var(--ink-3)' : score >= 8 ? 'var(--win)' : score >= 6 ? '#3b82f6' : score >= 4 ? 'var(--warn)' : 'var(--lose)'
  const factors = getDealFactors(project)
  const labor = d.labourCost || 0
  const royalties = bid ? Math.round(bid * 0.08) : 0
  const overhead = bid ? Math.round(bid * 0.15) : 0

  return (
    <div>
      {/* Score + bid hero */}
      <div style={{ background: 'var(--bg-2)', borderRadius: 12, padding: '16px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--panel)', border: `3px solid ${scoreColor}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{score != null ? score.toFixed(0) : '—'}</span>
          <span style={{ fontSize: 9, color: 'var(--ink-3)', fontWeight: 600 }}>/ 10</span>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recommended Bid</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--ink-1)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{bid ? fmt$(bid) : '—'}</div>
          {bid && (
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 3 }}>
              Range {fmt$(bid * 0.85)} – {fmt$(bid * 1.15)} · 80% confidence
            </div>
          )}
        </div>
      </div>

      {/* Deal factors */}
      {factors.length > 0 && (
        <Section label="Deal Factors">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, background: 'var(--bg-2)', borderRadius: 10, overflow: 'hidden' }}>
            {factors.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: i < factors.length - 1 ? '1px solid var(--line)' : 'none' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-1)' }}>{f.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{f.detail}</div>
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 5,
                  background: f.pos ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                  color: f.pos ? '#22c55e' : '#ef4444',
                }}>
                  {f.delta >= 0 ? '+' : ''}{f.delta.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Bid composition */}
      {bid > 0 && (
        <Section label="Bid Composition">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              ['Labor (est.)', labor ? fmt$(labor) : '—'],
              ['Royalties (8%)', fmt$(royalties)],
              ['Overhead (15%)', fmt$(overhead)],
              ['Profit (est.)', fmt$(bid - labor - royalties - overhead)],
            ].map(([label, value]) => (
              <div key={label} style={{ background: 'var(--bg-2)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-1)' }}>{value}</div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

// ── TIMELINE TAB ─────────────────────────────────────────────

function TimelineTab({ logs, loading, noTable }) {
  if (loading) return <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
  if (noTable) return (
    <div style={{ padding: '16px', background: 'var(--warn-soft)', border: '1px solid var(--warn)', borderRadius: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--warn)', marginBottom: 4 }}>Timeline not set up</div>
      <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>
        Run the project drawer migration in your Supabase SQL editor to enable the activity timeline.
      </div>
    </div>
  )
  if (logs.length === 0) return (
    <div style={{ textAlign: 'center', color: 'var(--ink-4)', fontSize: 13, padding: '20px 0' }}>
      No activity yet. Use the quick log buttons on the Overview tab.
    </div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Recent Activity</div>
      {logs.map((log, i) => (
        <div key={log.id} style={{ display: 'flex', gap: 10, paddingBottom: 14, position: 'relative' }}>
          {i < logs.length - 1 && (
            <div style={{ position: 'absolute', left: 13, top: 28, bottom: 0, width: 2, background: 'var(--line)' }} />
          )}
          <Avatar name={log.user_name || 'System'} size={26} />
          <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
            <div style={{ fontSize: 13, color: 'var(--ink-1)', lineHeight: 1.4 }}>{log.text}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 3 }}>{relDate(log.created_at)}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── FILES TAB ────────────────────────────────────────────────

function FilesTab({ project, orgId }) {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const fileRef = useRef()

  useEffect(() => { fetchFiles() }, [project.id])

  async function fetchFiles() {
    setLoading(true)
    try {
      const { data, error: e } = await supabase.storage
        .from('project-files')
        .list(`${orgId}/${project.id}/files`, { sortBy: { column: 'created_at', order: 'desc' } })
      if (e) { setError(e.message?.includes('bucket') ? 'setup' : e.message); setFiles([]) }
      else setFiles((data || []).filter(f => f.name !== '.emptyFolderPlaceholder'))
    } catch { setError('setup') }
    setLoading(false)
  }

  async function upload(e) {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = ''
    setUploading(true)
    const { error: uploadErr } = await supabase.storage.from('project-files')
      .upload(`${orgId}/${project.id}/files/${Date.now()}-${file.name}`, file)
    if (uploadErr) setError(uploadErr.message)
    else await fetchFiles()
    setUploading(false)
  }

  async function openFile(file) {
    const { data } = await supabase.storage.from('project-files')
      .createSignedUrl(`${orgId}/${project.id}/files/${file.name}`, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function deleteFile(file) {
    if (!confirm(`Delete "${file.name.replace(/^\d+-/, '')}"?`)) return
    await supabase.storage.from('project-files').remove([`${orgId}/${project.id}/files/${file.name}`])
    setFiles(prev => prev.filter(f => f.name !== file.name))
  }

  if (error === 'setup') return (
    <div style={{ padding: '16px', background: 'var(--warn-soft)', border: '1px solid var(--warn)', borderRadius: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--warn)', marginBottom: 4 }}>Storage not configured</div>
      <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>
        Create a Supabase Storage bucket named <code style={{ background: 'var(--bg-2)', padding: '1px 5px', borderRadius: 3 }}>project-files</code> (Private) to enable file attachments.
      </div>
    </div>
  )

  return (
    <div>
      <Section label="Attachments">
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 13, padding: '16px 0' }}>Loading…</div>
        ) : files.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--ink-4)', fontSize: 13, padding: '12px 0' }}>No files attached yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
            {files.map(file => {
              const displayName = file.name.replace(/^\d+-/, '')
              return (
                <div key={file.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg-2)', borderRadius: 9, border: '1px solid var(--line)' }}>
                  <span style={{ color: 'var(--ink-3)', flexShrink: 0 }}><FileIcon name={displayName} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
                    {file.metadata?.size && <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{fmtBytes(file.metadata.size)}</div>}
                  </div>
                  <button onClick={() => openFile(file)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--ink-2)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Open</button>
                  <button onClick={() => deleteFile(file)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--lose)', padding: 4, display: 'flex', alignItems: 'center' }}><Trash2 size={13} /></button>
                </div>
              )
            })}
          </div>
        )}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{ width: '100%', padding: '10px', border: '2px dashed var(--line)', borderRadius: 9, background: 'transparent', color: 'var(--ink-3)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          {uploading ? 'Uploading…' : '+ Attach file'}
        </button>
        <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={upload} accept="image/*,.pdf,.doc,.docx,.xlsx,.xls,.csv,.zip" />
      </Section>
    </div>
  )
}

// ── P&L TAB ──────────────────────────────────────────────────

function PLTab({ project }) {
  const d = project._scoreDetails || {}
  const revenue = d.recommendedBid || 0
  const labor = d.labourCost || 0
  const royalties = revenue ? Math.round(revenue * 0.08) : 0
  const expenses = 0 // actual expenses would come from project_logs
  const netProfit = revenue - labor - royalties - expenses
  const laborPct   = revenue ? Math.round((labor / revenue) * 100) : 0
  const expPct     = revenue ? Math.round((expenses / revenue) * 100) : 0
  const royPct     = revenue ? Math.round((royalties / revenue) * 100) : 0
  const profitPct  = 100 - laborPct - expPct - royPct

  const PLRow = ({ label, value, net, indent }) => (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: net ? '12px 14px' : '10px 14px',
      background: net ? 'rgba(34,197,94,0.12)' : 'transparent',
      borderBottom: net ? 'none' : '1px solid var(--line)',
      paddingLeft: indent ? 20 : 14,
    }}>
      <span style={{ fontSize: net ? 14 : 13, fontWeight: net ? 700 : 500, color: net ? 'var(--win)' : 'var(--ink-1)' }}>{label}</span>
      <span style={{ fontSize: net ? 15 : 13, fontWeight: 700, color: net ? 'var(--win)' : value < 0 ? 'var(--lose)' : value === 0 ? 'var(--ink-3)' : 'var(--ink-1)' }}>
        {value === 0 ? '—' : value < 0 ? `– ${fmt$(Math.abs(value))}` : fmt$(value)}
      </span>
    </div>
  )

  return (
    <div>
      <Section label="Profit & Loss">
        <div style={{ background: 'var(--bg-2)', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--line)' }}>
          <PLRow label="Revenue" value={revenue} />
          <PLRow label="Labor" value={-labor} />
          <PLRow label="Expenses" value={-expenses} />
          <PLRow label="Royalties" value={-royalties} />
          <PLRow label="Net Profit" value={netProfit} net />
        </div>
      </Section>

      <Section label="Margin Breakdown">
        <div style={{ height: 14, borderRadius: 7, overflow: 'hidden', display: 'flex', marginBottom: 10 }}>
          <div style={{ width: `${laborPct}%`, background: '#3b82f6' }} />
          <div style={{ width: `${expPct}%`, background: '#eab308' }} />
          <div style={{ width: `${royPct}%`, background: '#6b7280' }} />
          <div style={{ width: `${profitPct}%`, background: '#22c55e' }} />
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { color: '#3b82f6', label: `Labor ${laborPct}%` },
            { color: '#eab308', label: `Expenses ${expPct}%` },
            { color: '#6b7280', label: `Royalties ${royPct}%` },
            { color: '#22c55e', label: `Profit ${profitPct}%` },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
              <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{label}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}

// ── RETROSPECTIVE TAB ─────────────────────────────────────────

function RetrospectiveTab({ project, orgId }) {
  const [retro, setRetro] = useState({ went_well: '', didnt_work: '', lessons: '', sentiment: 'okay', depth: 'lightweight' })
  const [saved, setSaved] = useState(null) // iso string of last save
  const [noTable, setNoTable] = useState(false)
  const saveTimer = useRef(null)

  useEffect(() => {
    fetchRetro()
    return () => clearTimeout(saveTimer.current)
  }, [project.id])

  async function fetchRetro() {
    try {
      const { data, error } = await supabase.from('project_retrospectives')
        .select('*').eq('lead_id', project.id).maybeSingle()
      if (error) { if (error.code === '42P01') setNoTable(true); return }
      if (data) setRetro({ went_well: data.went_well || '', didnt_work: data.didnt_work || '', lessons: data.lessons || '', sentiment: data.sentiment || 'okay', depth: data.depth || 'lightweight' })
    } catch { setNoTable(true) }
  }

  function update(key, value) {
    setRetro(r => ({ ...r, [key]: value }))
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => autoSave({ ...retro, [key]: value }), 1200)
  }

  async function autoSave(data) {
    try {
      await supabase.from('project_retrospectives').upsert({
        lead_id: project.id, organization_id: orgId,
        went_well: data.went_well, didnt_work: data.didnt_work,
        lessons: data.lessons, sentiment: data.sentiment, depth: data.depth,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'lead_id' })
      setSaved(new Date().toISOString())
    } catch { /* table may not exist */ }
  }

  const Textarea = ({ field, placeholder }) => (
    <textarea
      value={retro[field]}
      onChange={e => update(field, e.target.value)}
      placeholder={placeholder}
      rows={3}
      style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 9, padding: '10px 12px', color: 'var(--ink-1)', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none', lineHeight: 1.5 }}
    />
  )

  if (noTable) return (
    <div style={{ padding: '16px', background: 'var(--warn-soft)', border: '1px solid var(--warn)', borderRadius: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--warn)', marginBottom: 4 }}>Retrospective not set up</div>
      <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>Run the project drawer migration SQL in Supabase to enable retrospectives.</div>
    </div>
  )

  return (
    <div>
      {/* Depth toggle + save indicator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 8, padding: 2 }}>
          {['lightweight', 'full'].map(d => (
            <button key={d} onClick={() => update('depth', d)} style={{ padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', background: retro.depth === d ? 'var(--accent)' : 'transparent', color: retro.depth === d ? 'white' : 'var(--ink-3)', textTransform: 'capitalize' }}>
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
        {saved && (
          <span style={{ fontSize: 11, color: 'var(--win)', background: 'var(--win-soft)', padding: '3px 8px', borderRadius: 5 }}>
            Draft saved · {relDate(saved)}
          </span>
        )}
      </div>

      <Section label="What went well?">
        <Textarea field="went_well" placeholder="What worked great on this project?" />
      </Section>
      <Section label="What didn't?">
        <Textarea field="didnt_work" placeholder="What would you do differently?" />
      </Section>
      <Section label="Lessons for next time">
        <Textarea field="lessons" placeholder="Key takeaways for the team…" />
      </Section>

      <Section label="Client Sentiment">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SENTIMENTS.map(s => (
            <button key={s.key} onClick={() => update('sentiment', s.key)} style={{
              padding: '8px 14px', borderRadius: 9, border: '1px solid var(--line)',
              background: retro.sentiment === s.key ? 'var(--win)' : 'var(--bg-2)',
              color: retro.sentiment === s.key ? 'white' : 'var(--ink-2)',
              fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {s.label}
            </button>
          ))}
        </div>
      </Section>
    </div>
  )
}

// ── PHOTOS TAB ────────────────────────────────────────────────

const PHASES = ['Before', 'During', 'After']

function PhotosTab({ project, orgId }) {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadPhase, setUploadPhase] = useState('Before')
  const [portfolio, setPortfolio] = useState(false)
  const [storageErr, setStorageErr] = useState(false)
  const fileRef = useRef()

  useEffect(() => { fetchPhotos() }, [project.id])

  async function fetchPhotos() {
    setLoading(true)
    try {
      const { data, error } = await supabase.storage
        .from('project-files')
        .list(`${orgId}/${project.id}/photos`, { sortBy: { column: 'created_at', order: 'asc' } })
      if (error) { setStorageErr(true); setPhotos([]) }
      else setPhotos((data || []).filter(f => f.name !== '.emptyFolderPlaceholder'))
    } catch { setStorageErr(true) }
    setLoading(false)
  }

  async function upload(e) {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = ''
    setUploading(true)
    const path = `${orgId}/${project.id}/photos/${uploadPhase}-${Date.now()}-${file.name}`
    await supabase.storage.from('project-files').upload(path, file)
    await fetchPhotos()
    setUploading(false)
  }

  async function openPhoto(photo) {
    const { data } = await supabase.storage.from('project-files')
      .createSignedUrl(`${orgId}/${project.id}/photos/${photo.name}`, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  if (storageErr) return (
    <div style={{ padding: '16px', background: 'var(--warn-soft)', border: '1px solid var(--warn)', borderRadius: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--warn)', marginBottom: 4 }}>Storage not configured</div>
      <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>Create a <code style={{ background: 'var(--bg-2)', padding: '1px 5px', borderRadius: 3 }}>project-files</code> bucket in Supabase Storage (Private).</div>
    </div>
  )

  return (
    <div>
      <Section label="Before · During · After">
        {/* Phase selector */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {PHASES.map(p => (
            <button key={p} onClick={() => setUploadPhase(p)} style={{ padding: '4px 12px', borderRadius: 7, border: '1px solid var(--line)', background: uploadPhase === p ? 'var(--accent)' : 'var(--bg-2)', color: uploadPhase === p ? 'white' : 'var(--ink-2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              {p}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 13, padding: '20px 0' }}>Loading…</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
            {photos.map(photo => {
              const phase = photo.name.split('-')[0]
              const hue = phase === 'Before' ? 140 : phase === 'During' ? 200 : 280
              return (
                <div key={photo.name} onClick={() => openPhoto(photo)}
                  style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', background: `linear-gradient(135deg, oklch(0.75 0.1 ${hue}), oklch(0.6 0.12 ${hue + 20}))`, cursor: 'pointer' }}>
                  <span style={{ position: 'absolute', top: 6, left: 6, fontSize: 9.5, fontWeight: 700, background: 'rgba(0,0,0,0.5)', color: 'white', padding: '2px 7px', borderRadius: 4 }}>{phase}</span>
                </div>
              )
            })}
            {/* Upload tile */}
            <div onClick={() => fileRef.current?.click()}
              style={{ aspectRatio: '1', borderRadius: 8, border: '2px dashed var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'var(--bg-2)' }}>
              <span style={{ fontSize: 22, color: 'var(--ink-3)', fontWeight: 300 }}>{uploading ? '…' : '+'}</span>
            </div>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={upload} />
      </Section>

      <Section label="Portfolio Settings">
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 12px', background: 'var(--bg-2)', borderRadius: 9, border: '1px solid var(--line)' }}>
          <input type="checkbox" checked={portfolio} onChange={e => setPortfolio(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-1)' }}>Include in public portfolio</span>
        </label>
      </Section>
    </div>
  )
}

// ── LOG MODAL ─────────────────────────────────────────────────

function LogModal({ category, onClose, onSave }) {
  const [text, setText] = useState('')
  const [amount, setAmount] = useState('')
  const hasAmount = ['Labor hours', 'Supplies spent', 'Dumpster fee'].includes(category)

  function handleSave() {
    if (!text.trim()) return
    onSave({ text: text.trim(), category, amount: amount ? parseFloat(amount) : null })
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, width: '100%', maxWidth: 380, padding: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-1)', marginBottom: 14 }}>Log {category}</div>
        <textarea value={text} onChange={e => setText(e.target.value)}
          placeholder={`Note about ${category.toLowerCase()}…`} rows={3} autoFocus
          style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 9, padding: '10px 12px', color: 'var(--ink-1)', fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none', marginBottom: 10 }}
        />
        {hasAmount && (
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder={category === 'Labor hours' ? 'Hours (e.g. 4.5)' : 'Amount ($)'}
            style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 9, padding: '8px 12px', color: 'var(--ink-1)', fontSize: 13, fontFamily: 'inherit', outline: 'none', marginBottom: 10 }}
          />
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '9px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--bg-2)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={handleSave} disabled={!text.trim()} style={{ flex: 2, padding: '9px', borderRadius: 9, border: 'none', background: 'var(--accent)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: text.trim() ? 1 : 0.5 }}>Save Log</button>
        </div>
      </div>
    </div>
  )
}

// ── MAIN DRAWER ───────────────────────────────────────────────

export default function ProjectDrawer({ project, onClose, onDelete, onProjectUpdated }) {
  const { organizationId } = useAuth()
  const { members } = useTeam()
  const [activeTab, setActiveTab] = useState('overview')
  const [logs, setLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsNoTable, setLogsNoTable] = useState(false)
  const [logModal, setLogModal] = useState(null)
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isCompleted = project?.status === 'Won' || project?.status === 'Project Completed'

  const TABS = isCompleted
    ? [['overview', 'Overview'], ['pl', 'P&L'], ['retrospective', 'Retrospective'], ['photos', 'Photos']]
    : [['overview', 'Overview'], ['scorer', 'Scorer'], ['timeline', 'Timeline'], ['files', 'Files']]

  useEffect(() => {
    if (!project?.id) return
    setActiveTab('overview')
    if (!isCompleted) fetchLogs()
  }, [project?.id])

  async function fetchLogs() {
    setLogsLoading(true)
    try {
      const { data, error } = await supabase.from('project_logs')
        .select('*').eq('lead_id', project.id)
        .order('created_at', { ascending: false }).limit(30)
      if (error) { if (error.code === '42P01') setLogsNoTable(true); setLogs([]) }
      else setLogs(data || [])
    } catch { setLogsNoTable(true) }
    setLogsLoading(false)
  }

  async function saveLog({ text, category, amount }) {
    try {
      await supabase.from('project_logs').insert({
        lead_id: project.id, organization_id: organizationId,
        user_name: 'You', text, category, amount,
      })
      fetchLogs()
    } catch { /* table may not exist */ }
  }

  async function convertToOngoing() {
    await supabase.from('leads').update({ status: 'Project Scheduled' }).eq('id', project.id)
    onClose()
  }

  async function handleAssign(memberId) {
    await supabase.from('leads').update({ assigned_to: memberId }).eq('id', project.id)
    onProjectUpdated?.()
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.origin + `/?project=${project.id}`)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  if (!project) return null

  const d = project._scoreDetails || {}
  const chip = JOB_CHIP[project.job_type] || JOB_CHIP['Both']
  const idShort = '#' + String(project.id).replace(/-/g, '').slice(0, 6).toUpperCase()

  const statusColor = isCompleted ? '#22c55e'
    : project.status === 'Lost' ? 'var(--lose)'
    : project.status?.includes('Scheduled') ? 'var(--warn)'
    : 'var(--ink-3)'
  const statusLabel = isCompleted ? 'Completed'
    : project.status?.includes('Scheduled') ? 'Scheduled'
    : project.deal_score ? 'Scored' : 'Draft'

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'rgba(0,0,0,0.4)' }} />

      {/* Drawer */}
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, width: 520, zIndex: 50,
        background: 'var(--panel)', borderLeft: '1px solid var(--line)',
        boxShadow: '-8px 0 48px rgba(0,0,0,0.24)', display: 'flex', flexDirection: 'column',
        overflowY: 'hidden',
      }}>
        {/* ── Top header ── */}
        <div style={{ padding: '14px 18px 0', flexShrink: 0 }}>
          {/* Chips row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, background: chip.bg, color: chip.accent, padding: '2px 8px', borderRadius: 5 }}>
              {project.job_type}
            </span>
            <span style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 500 }}>{idShort}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: statusColor }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, display: 'inline-block' }} />
              {statusLabel}
            </span>
            <div style={{ flex: 1 }} />
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 4, display: 'flex' }}><X size={17} /></button>
          </div>

          {/* Name + address */}
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink-1)', letterSpacing: '-0.02em', marginBottom: 4 }}>{project.name}</div>
          {project.address && (
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 4 }}>📍 {project.address}</div>
          )}
          {project.notes && (
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 10, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {project.notes}
            </div>
          )}

          {/* Stats bar */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {isCompleted ? (
              <>
                <StatBox label="Revenue" value={d.recommendedBid ? fmt$(d.recommendedBid) : '—'} />
                <StatBox label="Profit" value={d.estimatedProfit ? fmt$(d.estimatedProfit) : 'Pending'} color={d.estimatedProfit ? 'var(--win)' : 'var(--ink-3)'} />
                <StatBox label="Margin" value={d.profitMarginPct != null ? `${Math.round(d.profitMarginPct)}%` : '—'} />
                <StatBox label="Labor" value={d.labourCost ? fmt$(d.labourCost) : '—'} />
              </>
            ) : (
              <>
                <StatBox label="Deal Score" value={project.deal_score != null ? `${project.deal_score.toFixed(1)}/10` : '—'} color={project.deal_score >= 7 ? 'var(--win)' : project.deal_score >= 5 ? '#3b82f6' : 'var(--warn)'} />
                <StatBox label="Rec. Bid" value={d.recommendedBid ? fmt$(d.recommendedBid) : '—'} />
                <StatBox label="Sq Ft" value={project.square_footage ? Number(project.square_footage).toLocaleString() : '—'} />
                <StatBox label="Quality" value={project.item_quality_score ? `${project.item_quality_score}/10` : '—'} />
              </>
            )}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', marginBottom: 0 }}>
            {TABS.map(([key, label]) => (
              <button key={key} onClick={() => setActiveTab(key)} style={{
                padding: '8px 14px', border: 'none', background: 'transparent', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                color: activeTab === key ? 'var(--ink-1)' : 'var(--ink-3)',
                borderBottom: activeTab === key ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -1,
              }}>{label}</button>
            ))}
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 18px 8px' }}>
          {activeTab === 'overview' && (
            <OverviewTab
              project={project}
              members={members}
              isCompleted={isCompleted}
              logs={logs}
              onLog={cat => setLogModal(cat)}
              onAssign={handleAssign}
            />
          )}
          {activeTab === 'scorer' && <ScorerTab project={project} />}
          {activeTab === 'timeline' && <TimelineTab logs={logs} loading={logsLoading} noTable={logsNoTable} />}
          {activeTab === 'files' && <FilesTab project={project} orgId={organizationId} />}
          {activeTab === 'pl' && <PLTab project={project} />}
          {activeTab === 'retrospective' && <RetrospectiveTab project={project} orgId={organizationId} />}
          {activeTab === 'photos' && <PhotosTab project={project} orgId={organizationId} />}
        </div>

        {/* ── Footer ── */}
        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--line)', flexShrink: 0, display: 'flex', gap: 8 }}>
          {confirmDelete ? (
            <>
              <span style={{ fontSize: 12.5, color: 'var(--ink-3)', alignSelf: 'center', flex: 1 }}>Delete this project?</span>
              <button onClick={() => setConfirmDelete(false)} style={{ padding: '8px 14px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--bg-2)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={() => onDelete?.(project.id)} style={{ padding: '8px 14px', borderRadius: 9, border: 'none', background: '#ef4444', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
            </>
          ) : isCompleted ? (
            <>
              <button onClick={() => setConfirmDelete(true)} style={{ padding: '9px 12px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--bg-2)', color: '#ef4444', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Trash2 size={13} />
              </button>
              <button style={{ flex: 1, padding: '9px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--bg-2)', color: 'var(--ink-2)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Download size={13} /> Export PDF
              </button>
              <button onClick={copyLink} style={{ flex: 1, padding: '9px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--bg-2)', color: 'var(--ink-2)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copied!' : 'Share link'}
              </button>
              <button style={{ flex: 1.5, padding: '9px', borderRadius: 9, border: 'none', background: 'var(--accent)', color: 'white', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Star size={13} /> Add to Portfolio
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setConfirmDelete(true)} style={{ padding: '9px 12px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--bg-2)', color: '#ef4444', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Trash2 size={13} />
              </button>
              <button
                onClick={() => project.phone && (window.location.href = `tel:${project.phone}`)}
                style={{ flex: 1, padding: '9px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--bg-2)', color: 'var(--ink-2)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <Phone size={13} /> Call
              </button>
              <button onClick={() => setLogModal('Notes')} style={{ flex: 1, padding: '9px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--bg-2)', color: 'var(--ink-2)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <FileText size={13} /> Log note
              </button>
              <button onClick={convertToOngoing} style={{ flex: 1.5, padding: '9px', borderRadius: 9, border: 'none', background: 'var(--accent)', color: 'white', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Convert to Ongoing
              </button>
            </>
          )}
        </div>
      </div>

      {/* Log modal */}
      {logModal && (
        <LogModal
          category={logModal}
          onClose={() => setLogModal(null)}
          onSave={saveLog}
        />
      )}
    </>
  )
}
