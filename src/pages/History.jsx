import { useState, useEffect, useRef } from 'react'
import { Upload, Plus, Trash2, X, Download } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getSizeBucket } from '../lib/scoring'
import { useAuth } from '../lib/AuthContext'
import { JOB_TYPES, DENSITY_OPTIONS } from '../lib/constants'

const CSV_HEADERS = [
  'job_date', 'job_type', 'square_footage', 'density',
  'item_quality', 'actual_labor_hours', 'actual_labor_cost',
  'actual_bid', 'actual_profit', 'zip_code', 'notes',
]

const EMPTY_FORM = {
  name: '',
  bid_tag: 'good_bid',
  job_date: '',
  job_type: 'Both',
  square_footage: '',
  density: 'Medium',
  item_quality: '',
  actual_labor_hours: '',
  actual_labor_cost: '',
  actual_bid: '',
  actual_profit: '',
  zip_code: '',
  notes: '',
}

const BID_TAGS = [
  { value: 'underbid', label: 'Underbid', color: '#ef4444' },
  { value: 'good_bid', label: 'Good Bid', color: '#22c55e' },
  { value: 'overbid',  label: 'Overbid',  color: '#f59e0b' },
]

function parseCSV(text) {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return { rows: [], errors: ['File appears empty'] }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
  const rows = []
  const errors = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const row = {}
    headers.forEach((h, idx) => { row[h] = values[idx] || '' })

    // Validate required
    if (!row.job_type || !['Clean Out', 'Auction', 'Both'].includes(row.job_type)) {
      errors.push(`Row ${i}: invalid job_type "${row.job_type}"`)
      continue
    }
    if (!row.square_footage || isNaN(Number(row.square_footage))) {
      errors.push(`Row ${i}: invalid square_footage`)
      continue
    }
    if (!row.density || !['Low', 'Medium', 'High'].includes(row.density)) {
      errors.push(`Row ${i}: invalid density "${row.density}"`)
      continue
    }

    rows.push({
      job_date:           row.job_date || null,
      job_type:           row.job_type,
      square_footage:     parseInt(row.square_footage),
      density:            row.density,
      item_quality:       row.item_quality ? parseInt(row.item_quality) : null,
      actual_labor_hours: row.actual_labor_hours ? parseInt(row.actual_labor_hours) : null,
      actual_labor_cost:  row.actual_labor_cost  ? parseInt(row.actual_labor_cost)  : null,
      actual_bid:         row.actual_bid         ? parseInt(row.actual_bid)         : null,
      actual_profit:      row.actual_profit      ? parseInt(row.actual_profit)      : null,
      zip_code:           row.zip_code || null,
      notes:              row.notes || null,
    })
  }

  return { rows, errors }
}

function downloadTemplate() {
  const example = [
    CSV_HEADERS.join(','),
    '2025-08-10,Both,2400,High,7,110,2420,8500,3850,60625,Estate cleanout + auction',
    '2025-07-22,Clean Out,1800,Medium,,90,1980,7000,2800,60641,',
  ].join('\n')
  const blob = new Blob([example], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'past_projects_template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

const inputStyle = {
  background: 'var(--bg)',
  border: '1px solid var(--line)',
  borderRadius: 7,
  padding: '7px 10px',
  fontSize: 13,
  color: 'var(--ink-1)',
  outline: 'none',
  width: '100%',
}

const selectStyle = { ...inputStyle, cursor: 'pointer' }

function AddModal({ onClose, onSaved }) {
  const { organizationId } = useAuth()
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave() {
    if (!form.square_footage || !form.job_type || !form.density) return
    setSaving(true)
    const { error } = await supabase.from('past_projects').insert({
      name:               form.name.trim() || null,
      bid_tag:            form.bid_tag || null,
      job_date:           form.job_date || null,
      job_type:           form.job_type,
      square_footage:     parseInt(form.square_footage),
      density:            form.density,
      item_quality:       form.item_quality ? parseInt(form.item_quality) : null,
      actual_labor_hours: form.actual_labor_hours ? parseInt(form.actual_labor_hours) : null,
      actual_labor_cost:  form.actual_labor_cost  ? parseInt(form.actual_labor_cost)  : null,
      actual_bid:         form.actual_bid         ? parseInt(form.actual_bid)         : null,
      actual_profit:      form.actual_profit      ? parseInt(form.actual_profit)      : null,
      zip_code:           form.zip_code || null,
      notes:              form.notes || null,
      organization_id:    organizationId,
    })
    setSaving(false)
    if (error) { setError(error.message); return }
    onSaved()
    onClose()
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink-1)' }}>Add Past Project</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)' }}><X size={18} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>Name</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Deborah and Lorraine" style={inputStyle} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Bid Result</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {BID_TAGS.map(tag => (
                <button key={tag.value} onClick={() => set('bid_tag', tag.value)} type="button"
                  style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: `2px solid ${form.bid_tag === tag.value ? tag.color : 'var(--line)'}`, background: form.bid_tag === tag.value ? `${tag.color}18` : 'var(--bg)', color: form.bid_tag === tag.value ? tag.color : 'var(--ink-3)', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
                  {tag.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
            {[
              { label: 'Job Date',            key: 'job_date',           type: 'date' },
              { label: 'ZIP Code',             key: 'zip_code',           type: 'text', placeholder: '60625' },
              { label: 'Square Footage *',     key: 'square_footage',     type: 'number', placeholder: '2400' },
              { label: 'Item Quality (1–10)',  key: 'item_quality',       type: 'number', placeholder: '7' },
              { label: 'Actual Labor Hours',   key: 'actual_labor_hours', type: 'number', placeholder: '110' },
              { label: 'Actual Labor Cost ($)', key: 'actual_labor_cost', type: 'number', placeholder: '2420' },
              { label: 'Actual Bid ($)',        key: 'actual_bid',         type: 'number', placeholder: '8500' },
              { label: 'Actual Profit ($)',     key: 'actual_profit',      type: 'number', placeholder: '3850' },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>{label}</label>
                <input type={type} value={form[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder} style={inputStyle} />
              </div>
            ))}

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>Job Type *</label>
              <select value={form.job_type} onChange={e => set('job_type', e.target.value)} style={selectStyle}>
                {JOB_TYPES.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>Density *</label>
              <select value={form.density} onChange={e => set('density', e.target.value)} style={selectStyle}>
                {DENSITY_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }} placeholder="Any notes about the job…" />
          </div>

          {error && <div style={{ marginTop: 12, color: '#ef4444', fontSize: 13 }}>{error}</div>}
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 18px', color: 'var(--ink-2)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !form.square_footage}
            style={{ background: form.square_footage ? 'linear-gradient(135deg, #A50050, #CD545B)' : 'var(--line)', border: 'none', borderRadius: 8, padding: '8px 20px', color: form.square_footage ? '#fff' : 'var(--ink-3)', fontSize: 13, fontWeight: 600, cursor: form.square_footage ? 'pointer' : 'not-allowed', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Saving…' : 'Save Project'}
          </button>
        </div>
      </div>
    </div>
  )
}

const COL_DEFS = [
  { key: 'job_date',           label: 'Date',         fmt: v => v || '—' },
  { key: 'job_type',           label: 'Type',         fmt: v => v },
  { key: 'square_footage',     label: 'Sq Ft',        fmt: v => v?.toLocaleString() },
  { key: 'density',            label: 'Density',      fmt: v => v },
  { key: 'item_quality',       label: 'Quality',      fmt: v => v != null ? `${v}/10` : '—' },
  { key: 'actual_labor_hours', label: 'Labor Hrs',    fmt: v => v != null ? `${v} hrs` : '—' },
  { key: 'actual_bid',         label: 'Actual Bid',   fmt: v => v != null ? `$${v.toLocaleString()}` : '—' },
  { key: 'actual_profit',      label: 'Profit',       fmt: v => v != null ? `$${v.toLocaleString()}` : '—', color: v => v > 0 ? '#22c55e' : v < 0 ? '#ef4444' : 'var(--ink-1)' },
  { key: 'zip_code',           label: 'ZIP',          fmt: v => v || '—' },
]

export default function History() {
  const { organizationId } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [importState, setImportState] = useState('idle') // idle | importing | done | error
  const [importResult, setImportResult] = useState(null)
  const [sortKey, setSortKey] = useState('job_date')
  const [sortDir, setSortDir] = useState('desc')
  const fileInputRef = useRef()

  useEffect(() => { fetchProjects() }, [])

  async function fetchProjects() {
    setLoading(true)
    const { data, error } = await supabase
      .from('past_projects')
      .select('*')
      .order('job_date', { ascending: false, nullsFirst: false })
    setLoading(false)
    if (error) { setError(error.message); return }
    setProjects(data || [])
  }

  async function handleFileImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const text = await file.text()
    const { rows, errors } = parseCSV(text)

    if (rows.length === 0) {
      setImportResult({ inserted: 0, errors })
      setImportState('error')
      return
    }

    setImportState('importing')
    const { error } = await supabase.from('past_projects').insert(rows.map(r => ({ ...r, organization_id: organizationId })))
    if (error) {
      setImportResult({ inserted: 0, errors: [error.message, ...errors] })
      setImportState('error')
      return
    }

    setImportResult({ inserted: rows.length, errors })
    setImportState('done')
    fetchProjects()
  }

  async function handleDelete(id) {
    await supabase.from('past_projects').delete().eq('id', id)
    setProjects(ps => ps.filter(p => p.id !== id))
  }

  // Aggregate stats for header
  const withHours  = projects.filter(p => p.actual_labor_hours)
  const withBid    = projects.filter(p => p.actual_bid)
  const withProfit = projects.filter(p => p.actual_profit != null)
  const avgHours   = withHours.length  ? Math.round(withHours.reduce((s, p) => s + p.actual_labor_hours, 0) / withHours.length)  : null
  const avgBid     = withBid.length    ? Math.round(withBid.reduce((s, p) => s + p.actual_bid, 0) / withBid.length)              : null
  const avgProfit  = withProfit.length ? Math.round(withProfit.reduce((s, p) => s + p.actual_profit, 0) / withProfit.length)     : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 28px', borderBottom: '1px solid var(--line)', flexShrink: 0, background: 'var(--panel)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-1)', margin: 0 }}>Past Projects</h1>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '2px 0 0' }}>
              {projects.length} project{projects.length !== 1 ? 's' : ''} — used to calibrate the Deal Scorer
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={downloadTemplate}
              style={{ background: 'none', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 14px', color: 'var(--ink-2)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Download size={14} />
              CSV Template
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 14px', color: 'var(--ink-1)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Upload size={14} />
              Import CSV
            </button>
            <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileImport} />
            <button
              onClick={() => setShowAddModal(true)}
              style={{ background: 'linear-gradient(135deg, #A50050, #CD545B)', border: 'none', borderRadius: 8, padding: '8px 16px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={14} />
              Add Project
            </button>
          </div>
        </div>

        {/* Stats */}
        {projects.length > 0 && (
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { label: 'Total Projects',   value: projects.length, color: 'var(--ink-1)' },
              { label: 'Avg Labor Hours',  value: avgHours  != null ? `${avgHours} hrs` : '—', color: '#A50050' },
              { label: 'Avg Actual Bid',   value: avgBid    != null ? `$${avgBid.toLocaleString()}` : '—', color: '#f59e0b' },
              { label: 'Avg Profit',       value: avgProfit != null ? `$${avgProfit.toLocaleString()}` : '—', color: avgProfit > 0 ? '#22c55e' : '#ef4444' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 10, padding: '12px 16px', minWidth: 130 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Import result */}
        {importState !== 'idle' && (
          <div style={{
            marginTop: 12,
            padding: '10px 14px',
            background: importState === 'done' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${importState === 'done' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            borderRadius: 8,
            fontSize: 13,
            color: importState === 'done' ? '#4ade80' : '#f87171',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}>
            <div>
              {importState === 'importing' && 'Importing…'}
              {importState === 'done' && `Imported ${importResult.inserted} project${importResult.inserted !== 1 ? 's' : ''}.${importResult.errors.length ? ` ${importResult.errors.length} row(s) skipped.` : ''}`}
              {importState === 'error' && `Import failed: ${importResult.errors[0]}`}
            </div>
            <button onClick={() => { setImportState('idle'); setImportResult(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 0, marginLeft: 12 }}>
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px', position: 'relative' }}>
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: '-5%', bottom: '-10%', width: '60%', height: '70%', background: 'radial-gradient(ellipse at center, rgba(130,40,210,0.078) 0%, transparent 65%)' }} />
          <div style={{ position: 'absolute', right: '-5%', top: '-10%', width: '55%', height: '60%', background: 'radial-gradient(ellipse at center, rgba(0,140,230,0.06) 0%, transparent 65%)' }} />
          <div style={{ position: 'absolute', left: '35%', top: '30%', width: '35%', height: '35%', background: 'radial-gradient(ellipse at center, rgba(0,200,210,0.03) 0%, transparent 65%)' }} />
          <svg viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.033 }}>
            <path d="M-100,400 C150,200 350,600 600,350 S900,100 1300,300" fill="none" stroke="rgba(150,100,255,1)" strokeWidth="2.5" />
            <path d="M-50,600 C200,400 450,700 700,450 S1000,200 1350,450" fill="none" stroke="rgba(80,160,255,1)" strokeWidth="2" />
            <path d="M100,50 C300,250 550,50 750,200 S1050,400 1300,150" fill="none" stroke="rgba(100,220,255,1)" strokeWidth="2" />
            <path d="M0,700 Q300,500 600,600 T1200,400" fill="none" stroke="rgba(180,80,220,1)" strokeWidth="1.5" />
          </svg>
        </div>
        {loading ? (
          <div style={{ color: 'var(--ink-3)', fontSize: 14 }}>Loading…</div>
        ) : error ? (
          <div style={{ color: '#ef4444', fontSize: 14 }}>{error}</div>
        ) : projects.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 10, color: 'var(--ink-3)' }}>
            <Upload size={36} color="var(--line)" />
            <div style={{ fontSize: 14 }}>No past projects yet.</div>
            <div style={{ fontSize: 13 }}>Import a CSV or add one manually to calibrate your Deal Scorer.</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {COL_DEFS.map(c => (
                  <th key={c.key} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.6px', borderBottom: '1px solid var(--line)' }}>
                    {c.label}
                  </th>
                ))}
                <th style={{ width: 40, borderBottom: '1px solid var(--line)' }} />
              </tr>
            </thead>
            <tbody>
              {projects.map((p, i) => (
                <tr
                  key={p.id}
                  style={{ background: i % 2 === 0 ? 'transparent' : 'var(--stripe)', borderBottom: '1px solid var(--line)' }}
                >
                  {COL_DEFS.map(c => (
                    <td key={c.key} style={{ padding: '10px 12px', color: c.color ? c.color(p[c.key]) : 'var(--ink-1)' }}>
                      {c.fmt(p[c.key])}
                    </td>
                  ))}
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleDelete(p.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 4 }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAddModal && (
        <AddModal onClose={() => setShowAddModal(false)} onSaved={fetchProjects} />
      )}
    </div>
  )
}
