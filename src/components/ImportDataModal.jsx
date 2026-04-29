import { useState, useRef } from 'react'
import { X, Upload, CheckCircle, AlertCircle, Loader, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { importCategories, importAuctions, importItems, importPastProjects } from '../lib/importData'
import { modalOverlayStyle } from '../styles/constants'

function downloadTemplate() {
  const wb = XLSX.utils.book_new()

  const catHeaders = ['Category','Items Sold','Total Revenue','Avg Price','Median Price','Max Price','Avg Bids','Avg Views']
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([catHeaders]), 'CTBids — Categories')

  const auctionHeaders = ['Auction Title','Start Date','End Date','Items Sold','Total Revenue','Buyers Premium','Avg Price','Pickup Count','Shipping Count']
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([auctionHeaders]), 'CTBids — Auctions')

  const itemHeaders = ['Item Name','Category','SKU','Sale Price','Buyers Premium','Tax','Bids','Views','Method','Status','Auction Title','End Date']
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([itemHeaders]), 'CTBids — Items')

  const ppHeaders = ['Client Name','Address','Month','Year','Job Type','Scope — Cost Range Low','Scope — Cost Range High','Deposit','Services Total (Invoiced)','Auction Revenue','Buyers Premium','Labour Cost','Expenses','Royalties','Net Profit','Bid Accuracy']
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([ppHeaders]), 'Past Projects')

  XLSX.writeFile(wb, 'Homebase_Import_Template.xlsx')
}

const SHEETS = [
  { key: 'categories',   label: 'CTBids — Categories', sheetName: 'CTBids — Categories' },
  { key: 'auctions',     label: 'CTBids — Auctions',   sheetName: 'CTBids — Auctions'   },
  { key: 'items',        label: 'CTBids — Items',       sheetName: 'CTBids — Items'       },
  { key: 'pastProjects', label: 'Past Projects',        sheetName: 'Past Projects'        },
]

const IMPORTERS = {
  categories:   importCategories,
  auctions:     importAuctions,
  items:        importItems,
  pastProjects: importPastProjects,
}

export default function ImportDataModal({ onClose, onComplete }) {
  const fileRef = useRef()
  const [parsedSheets, setParsedSheets] = useState(null)
  const [selected, setSelected] = useState({ categories: true, auctions: true, items: true, pastProjects: true })
  const [status, setStatus] = useState({})
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array', cellDates: false })
      const sheets = {}
      for (const { key, sheetName } of SHEETS) {
        const ws = wb.Sheets[sheetName]
        if (!ws) { sheets[key] = []; continue }

        // Get raw rows as arrays so we can find the real header row
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

        // Find the first row with 3+ non-empty cells — that's the real header row
        let headerIdx = 0
        for (let i = 0; i < Math.min(10, raw.length); i++) {
          const nonEmpty = raw[i].filter(c => c !== '' && c != null)
          if (nonEmpty.length >= 3) { headerIdx = i; break }
        }

        const headers = raw[headerIdx].map(h => String(h ?? '').trim())
        const dataRows = raw.slice(headerIdx + 1)

        sheets[key] = dataRows
          .filter(row => row.some(c => c !== '' && c != null))
          .map(row => {
            const obj = {}
            headers.forEach((h, i) => { if (h) obj[h] = row[i] ?? '' })
            return obj
          })
      }
      setParsedSheets(sheets)
    } catch (err) {
      setError('Could not parse file. Make sure it is a valid .xlsx file.')
    }
  }

  async function handleImport() {
    if (!parsedSheets) return
    setImporting(true)
    setStatus({})

    for (const { key } of SHEETS) {
      if (!selected[key]) continue
      setStatus(s => ({ ...s, [key]: 'loading' }))
      const result = await IMPORTERS[key](parsedSheets[key] ?? [])
      setStatus(s => ({ ...s, [key]: result }))
      if (!result.success) break
    }

    setImporting(false)
    setDone(true)
  }

  const totalCounts = parsedSheets ? {
    categories:   parsedSheets.categories?.length   ?? 0,
    auctions:     parsedSheets.auctions?.length     ?? 0,
    items:        parsedSheets.items?.length         ?? 0,
    pastProjects: parsedSheets.pastProjects?.length ?? 0,
  } : null

  const anyError = Object.values(status).some(s => s?.success === false)

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--panel)', border: '1px solid var(--line)',
          borderRadius: 16, padding: 28, width: '100%', maxWidth: 480,
          boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', gap: 20,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink-1)', letterSpacing: '-0.015em' }}>Import Data</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>Upload Homebase_Import_Data.xlsx</div>
          </div>
          <button
            onClick={downloadTemplate}
            title="Download blank template"
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--ink-2)', fontSize: 11.5, fontWeight: 500, cursor: 'pointer', marginRight: 4 }}
          >
            <Download size={12} strokeWidth={1.8} /> Template
          </button>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'flex', padding: 4, borderRadius: 6 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* File upload */}
        {!parsedSheets && (
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              border: '2px dashed var(--line)', borderRadius: 12, padding: '28px 20px',
              textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 8,
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--line)'}
          >
            <Upload size={24} color="var(--ink-4)" strokeWidth={1.5} />
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-2)' }}>Click to choose file</div>
            <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>Accepts .xlsx</div>
            <input ref={fileRef} type="file" accept=".xlsx" style={{ display: 'none' }} onChange={handleFile} />
          </div>
        )}

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#FEE2E2', borderRadius: 9, color: '#991B1B', fontSize: 13 }}>
            <AlertCircle size={15} strokeWidth={2} />
            {error}
          </div>
        )}

        {/* Preview + sheet selection */}
        {parsedSheets && !done && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Sheets found — select to import
            </div>
            {SHEETS.map(({ key, label }) => {
              const count = totalCounts[key]
              const st = status[key]
              return (
                <label
                  key={key}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', borderRadius: 10,
                    border: `1px solid ${selected[key] ? 'var(--accent)' : 'var(--line)'}`,
                    background: selected[key] ? 'var(--accent-soft)' : 'var(--bg)',
                    cursor: 'pointer', userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected[key]}
                    onChange={e => setSelected(s => ({ ...s, [key]: e.target.checked }))}
                    disabled={importing}
                    style={{ accentColor: 'var(--accent)', width: 15, height: 15 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-1)' }}>{label}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 1 }}>
                      {count === 0 ? 'Sheet not found or empty' : `${count} rows`}
                    </div>
                    {count > 0 && parsedSheets[key]?.[0] && (
                      <div style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 3, wordBreak: 'break-all', lineHeight: 1.4 }}>
                        Cols: {Object.keys(parsedSheets[key][0]).join(' · ')}
                      </div>
                    )}
                  </div>
                  {st === 'loading' && <Loader size={15} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />}
                  {st?.success === true  && <CheckCircle size={15} color="#059669" />}
                  {st?.success === false && <AlertCircle size={15} color="#DC2626" />}
                  {st?.success === true  && <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>{st.count} imported</span>}
                  {st?.success === false && <span style={{ fontSize: 11, color: '#DC2626', fontWeight: 600 }}>Error</span>}
                  {st?.success === true && st.count === 0 && st.detectedHeaders?.length > 0 && (
                    <div style={{ width: '100%', marginTop: 6, fontSize: 10.5, color: 'var(--ink-4)', wordBreak: 'break-all' }}>
                      Detected columns: {st.detectedHeaders.join(' · ')}
                    </div>
                  )}
                </label>
              )
            })}
          </div>
        )}

        {/* Error details */}
        {anyError && (
          <div style={{ padding: '10px 14px', background: '#FEE2E2', borderRadius: 9, fontSize: 12, color: '#991B1B' }}>
            {Object.entries(status).filter(([,s]) => s?.success === false).map(([key, s]) => (
              <div key={key}><strong>{key}:</strong> {s.error}</div>
            ))}
          </div>
        )}

        {/* Done state */}
        {done && !anyError && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '12px 0' }}>
            <CheckCircle size={36} color="#059669" strokeWidth={1.5} />
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-1)' }}>Import complete</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', textAlign: 'center' }}>
              {SHEETS.filter(({ key }) => status[key]?.success).map(({ key, label }) =>
                `${status[key].count} ${label}`
              ).join(' · ')}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {done ? (
            <button
              onClick={() => { onComplete?.(); onClose() }}
              style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Done
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                style={{ padding: '8px 16px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
              >
                Cancel
              </button>
              {parsedSheets && (
                <button
                  onClick={handleImport}
                  disabled={importing || !Object.values(selected).some(Boolean)}
                  style={{
                    padding: '8px 18px', borderRadius: 10, border: 'none',
                    background: importing ? 'var(--ink-4)' : 'var(--accent)',
                    color: 'white', fontSize: 13, fontWeight: 600,
                    cursor: importing ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  {importing && <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} />}
                  {importing ? 'Importing…' : 'Import'}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
