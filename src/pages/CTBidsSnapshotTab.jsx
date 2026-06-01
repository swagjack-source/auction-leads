import { useState, useEffect, useRef, useCallback } from 'react'
import { ExternalLink, X, RefreshCw, AlertTriangle, Clock, Package, MapPin, Radio } from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────────────────────
const LS_KEY      = 'ctbids_tracked_urls'
const MAX_TRACKED = 5
const POLL_MS     = 30_000

// Timezone offset map for CTBids timezoneid values (hours from UTC, standard time)
// We use the IANA name returned by the API when available.
const TZ_MAP = {
  'US/Eastern':  'America/New_York',
  'US/Central':  'America/Chicago',
  'US/Mountain': 'America/Denver',
  'US/Pacific':  'America/Los_Angeles',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseEndTime(endTimeStr, tzName) {
  if (!endTimeStr) return null
  // endTimeStr looks like "2026-06-01 18:30:00" — naive local time in tzName
  const ianaZone = TZ_MAP[tzName] || 'America/New_York'
  try {
    // Build a date string with timezone offset using Intl
    const naive = endTimeStr.replace(' ', 'T')
    // Use Intl to figure out UTC offset at that moment
    const tempDate = new Date(naive + 'Z') // treat as UTC first to get a base
    // Now apply zone correction: format tempDate in the target zone and compare
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: ianaZone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    })
    // Iterate to find real UTC time via binary-search-like correction
    // Simpler: use the offset of the formatted parts vs input
    const parts = fmt.formatToParts(tempDate)
    const p = Object.fromEntries(parts.map(x => [x.type, x.value]))
    const formattedISO = `${p.year}-${p.month}-${p.day}T${p.hour === '24' ? '00' : p.hour}:${p.minute}:${p.second}Z`
    const delta = tempDate.getTime() - new Date(formattedISO).getTime()
    return new Date(tempDate.getTime() + delta)
  } catch {
    return new Date(endTimeStr.replace(' ', 'T'))
  }
}

function formatRemaining(ms) {
  if (ms <= 0) return { text: 'Ended', urgent: false, ended: true }
  const s   = Math.floor(ms / 1000)
  const m   = Math.floor(s / 60)
  const h   = Math.floor(m / 60)
  const d   = Math.floor(h / 24)
  const urgent = ms < 3_600_000 // < 1 hour
  if (d > 0)  return { text: `${d}d ${h % 24}h`,         urgent: false, ended: false }
  if (h > 0)  return { text: `${h}h ${m % 60}m`,         urgent: false, ended: false }
  if (m > 0)  return { text: `${m}m ${s % 60}s`,         urgent: true,  ended: false }
  return      { text: `${s}s`,                           urgent: true,  ended: false }
}

function cleanTitle(title) {
  if (!title) return 'CTBids Auction'
  return title
    .replace(/\s*\|\s*Ends[^|]*/i, '')
    .replace(/\s*\|\s*PU[^|]*/i, '')
    .replace(/\s*–\s*Ends.*/i, '')
    .trim()
}

function loadTracked() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
}
function saveTracked(urls) {
  localStorage.setItem(LS_KEY, JSON.stringify(urls))
}

// ── SnapshotCard ──────────────────────────────────────────────────────────────

function SnapshotCard({ url, snapshot, loading, failCount, onRemove, onRefresh }) {
  const [, forceUpdate] = useState(0)
  const tickRef = useRef(null)

  // Tick every second when close to ending, otherwise every 30s
  useEffect(() => {
    if (!snapshot?.available || !snapshot.end_time) return
    const endDate = parseEndTime(snapshot.end_time, snapshot.timezone)
    if (!endDate) return
    function tick() {
      forceUpdate(n => n + 1)
      const remaining = endDate - Date.now()
      const next = remaining < 3_600_000 ? 1_000 : 30_000
      tickRef.current = setTimeout(tick, next)
    }
    tick()
    return () => clearTimeout(tickRef.current)
  }, [snapshot?.end_time, snapshot?.timezone])

  if (loading && !snapshot) {
    return (
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, padding: 20, animation: 'pulse 1.5s ease-in-out infinite', minHeight: 130 }} />
    )
  }

  if (!snapshot?.available) {
    return (
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <AlertTriangle size={16} color="var(--warn)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 3 }}>
              {snapshot?.error || 'Unable to fetch'} {failCount >= 3 && '· Auto-polling paused'}
            </div>
          </div>
          <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', padding: 2, display: 'flex', flexShrink: 0 }} title="Remove">
            <X size={14} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onRefresh} style={{ fontSize: 12, color: 'var(--accent-ink)', background: 'var(--accent-soft)', border: 'none', borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
            <RefreshCw size={12} /> Retry
          </button>
          <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--ink-3)', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 7, padding: '5px 12px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 500 }}>
            <ExternalLink size={11} /> Open
          </a>
        </div>
      </div>
    )
  }

  const endDate   = parseEndTime(snapshot.end_time, snapshot.timezone)
  const remaining = endDate ? formatRemaining(endDate - Date.now()) : null
  const isLive    = snapshot.status === 'Started' && !remaining?.ended
  const title     = cleanTitle(snapshot.title)

  return (
    <div style={{
      background: 'var(--panel)', border: `1px solid ${isLive ? 'color-mix(in oklab, var(--win) 30%, var(--line))' : 'var(--line)'}`,
      borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-1)',
    }}>
      {/* Header bar */}
      <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--line-2)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Live / Ended badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
            {isLive ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 700, color: '#2F7A55', background: '#E3EEE8', padding: '2px 8px', borderRadius: 999 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2F7A55', display: 'inline-block', animation: 'livePulse 1.8s ease-in-out infinite' }} />
                Live
              </span>
            ) : (
              <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--ink-4)', background: 'var(--bg)', border: '1px solid var(--line)', padding: '2px 8px', borderRadius: 999 }}>
                {remaining?.ended ? 'Ended' : snapshot.status}
              </span>
            )}
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-1)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {title}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <a href={url} target="_blank" rel="noopener noreferrer" title="Open in CTBids" style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink-3)', display: 'grid', placeItems: 'center', textDecoration: 'none' }}>
            <ExternalLink size={13} strokeWidth={1.8} />
          </a>
          <button onClick={onRemove} title="Stop tracking" style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink-3)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
            <X size={13} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
        {/* Time remaining */}
        <div style={{ padding: '12px 14px', borderRight: '1px solid var(--line-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
            <Clock size={11} color="var(--ink-4)" strokeWidth={1.8} />
            <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time Left</span>
          </div>
          {remaining ? (
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: remaining.urgent ? 'var(--lose)' : remaining.ended ? 'var(--ink-4)' : 'var(--ink-1)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              {remaining.text}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--ink-4)' }}>—</div>
          )}
          {endDate && !remaining?.ended && (
            <div style={{ fontSize: 10.5, color: 'var(--ink-4)', marginTop: 4 }}>
              Ends {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </div>
          )}
        </div>

        {/* Item count */}
        <div style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
            <Package size={11} color="var(--ink-4)" strokeWidth={1.8} />
            <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lots</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink-1)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            {snapshot.item_count ?? '—'}
          </div>
          {snapshot.city && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 4, fontSize: 10.5, color: 'var(--ink-4)' }}>
              <MapPin size={9} strokeWidth={1.8} />
              {snapshot.city}, {snapshot.state}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '6px 14px 8px', borderTop: '1px solid var(--line-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10.5, color: 'var(--ink-4)' }}>
          Updated {snapshot.fetched_at ? new Date(snapshot.fetched_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' }) : '—'}
        </span>
        <button
          onClick={onRefresh}
          disabled={loading}
          style={{ background: 'none', border: 'none', cursor: loading ? 'default' : 'pointer', color: loading ? 'var(--ink-4)' : 'var(--accent)', fontSize: 10.5, fontWeight: 600, padding: 0, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit', opacity: loading ? 0.5 : 1 }}
        >
          <RefreshCw size={10} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
    </div>
  )
}

// ── Main tab ──────────────────────────────────────────────────────────────────

export default function CTBidsSnapshotTab() {
  const [trackedUrls, setTrackedUrls] = useState(() => loadTracked())
  const [input, setInput]             = useState('')
  const [inputError, setInputError]   = useState(null)
  const [snapshots, setSnapshots]     = useState({})    // url → snapshot data
  const [loading, setLoading]         = useState({})    // url → boolean
  const [failCounts, setFailCounts]   = useState({})    // url → number
  const pollRef = useRef(null)

  // Persist tracked URLs
  useEffect(() => { saveTracked(trackedUrls) }, [trackedUrls])

  // Fetch a single URL
  const fetchSnapshot = useCallback(async (url) => {
    setLoading(prev => ({ ...prev, [url]: true }))
    try {
      const res = await fetch('/api/ctbids-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      setSnapshots(prev => ({ ...prev, [url]: data }))
      if (data.available) {
        setFailCounts(prev => ({ ...prev, [url]: 0 }))
      } else {
        setFailCounts(prev => ({ ...prev, [url]: (prev[url] || 0) + 1 }))
      }
    } catch {
      setSnapshots(prev => ({ ...prev, [url]: { available: false, error: 'Network error' } }))
      setFailCounts(prev => ({ ...prev, [url]: (prev[url] || 0) + 1 }))
    } finally {
      setLoading(prev => ({ ...prev, [url]: false }))
    }
  }, [])

  // Initial fetch for all tracked URLs
  useEffect(() => {
    trackedUrls.forEach(url => fetchSnapshot(url))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Polling — skip URLs with 3+ consecutive failures
  useEffect(() => {
    if (trackedUrls.length === 0) return
    pollRef.current = setInterval(() => {
      if (document.visibilityState === 'hidden') return
      trackedUrls.forEach(url => {
        if ((failCounts[url] || 0) >= 3) return // paused
        fetchSnapshot(url)
      })
    }, POLL_MS)
    return () => clearInterval(pollRef.current)
  }, [trackedUrls, failCounts, fetchSnapshot])

  function handleAdd() {
    setInputError(null)
    const trimmed = input.trim()
    if (!trimmed) { setInputError('Paste a CTBids auction URL'); return }
    try {
      const u = new URL(trimmed)
      if (!u.hostname.includes('ctbids.com')) { setInputError('Must be a ctbids.com URL'); return }
      if (!u.pathname.match(/\/estate-sale\/\d+/)) { setInputError('URL must be a ctbids.com/estate-sale/... page'); return }
    } catch { setInputError('Invalid URL'); return }
    if (trackedUrls.includes(trimmed)) { setInputError('Already tracking that auction'); return }
    if (trackedUrls.length >= MAX_TRACKED) { setInputError(`Max ${MAX_TRACKED} auctions at once`); return }
    setTrackedUrls(prev => [...prev, trimmed])
    setInput('')
    fetchSnapshot(trimmed)
  }

  function handleRemove(url) {
    setTrackedUrls(prev => prev.filter(u => u !== url))
    setSnapshots(prev => { const n = { ...prev }; delete n[url]; return n })
    setLoading(prev => { const n = { ...prev }; delete n[url]; return n })
    setFailCounts(prev => { const n = { ...prev }; delete n[url]; return n })
  }

  return (
    <div style={{ padding: '0 28px 36px' }}>

      {/* CSS for animations */}
      <style>{`
        @keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.35)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <Radio size={16} color="var(--accent)" strokeWidth={1.8} />
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-1)' }}>Track Live Auctions</span>
        <span style={{ fontSize: 11.5, color: 'var(--ink-4)', marginLeft: 4 }}>
          {trackedUrls.length}/{MAX_TRACKED} · refreshes every 30s
        </span>
      </div>

      {/* URL input */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--bg)', border: `1px solid ${inputError ? 'var(--lose)' : 'var(--line)'}`, borderRadius: 10, padding: '0 12px', gap: 8 }}>
            <ExternalLink size={13} color="var(--ink-4)" strokeWidth={1.8} style={{ flexShrink: 0 }} />
            <input
              value={input}
              onChange={e => { setInput(e.target.value); setInputError(null) }}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
              placeholder="https://ctbids.com/estate-sale/XXXXX"
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--ink-1)', padding: '10px 0', fontFamily: 'inherit' }}
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={trackedUrls.length >= MAX_TRACKED}
            style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: trackedUrls.length >= MAX_TRACKED ? 'var(--line)' : 'var(--accent)', color: trackedUrls.length >= MAX_TRACKED ? 'var(--ink-3)' : '#fff', fontSize: 13, fontWeight: 600, cursor: trackedUrls.length >= MAX_TRACKED ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}
          >
            Track
          </button>
        </div>
        {inputError && <div style={{ fontSize: 11.5, color: 'var(--lose)', marginTop: 5 }}>{inputError}</div>}
      </div>

      {/* Empty state */}
      {trackedUrls.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0 40px', gap: 12 }}>
          <Radio size={48} color="var(--ink-4)" strokeWidth={1.4} />
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-1)', letterSpacing: '-0.01em' }}>No auctions tracked</div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', textAlign: 'center', maxWidth: 380, lineHeight: 1.6 }}>
            Paste a CTBids auction URL above and click <strong>Track</strong> to monitor it live. Stats refresh every 30 seconds.
          </div>
        </div>
      )}

      {/* Snapshot cards */}
      {trackedUrls.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {trackedUrls.map(url => (
            <SnapshotCard
              key={url}
              url={url}
              snapshot={snapshots[url]}
              loading={!!loading[url]}
              failCount={failCounts[url] || 0}
              onRemove={() => handleRemove(url)}
              onRefresh={() => fetchSnapshot(url)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
