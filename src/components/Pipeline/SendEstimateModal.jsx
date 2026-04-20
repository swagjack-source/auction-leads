import { useState } from 'react'
import { X, Send, FileText } from 'lucide-react'
import { pdf } from '@react-pdf/renderer'
import EstimateDoc from './EstimateDoc'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'

export default function SendEstimateModal({ lead, scoreDetails, onClose, onSent }) {
  const { organizationId } = useAuth()
  const [email, setEmail] = useState(lead.email || '')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  const bid          = scoreDetails?.recommendedBid ?? 0
  const labourHours  = scoreDetails?.labourHours ?? 0
  const labourCost   = labourHours * 22
  const overhead     = Math.round(labourCost * 0.15)
  const total        = labourCost + overhead

  async function handleSend() {
    if (!email.trim()) { setError('Email is required'); return }
    setSending(true)
    setError(null)

    try {
      // 1. Generate PDF client-side
      const docData = { lead, bid, labourHours, labourCost, overhead, total }
      const blob = await pdf(<EstimateDoc {...docData} />).toBlob()
      const base64 = await blobToBase64(blob)

      // 2. Call Netlify function to email it
      const res = await fetch('/.netlify/functions/send-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email.trim(),
          clientName: lead.name,
          pdfBase64: base64,
          subject: 'Estimate from Caring Transitions Denver Southeast',
        }),
      })
      if (!res.ok) {
        const msg = await res.text()
        throw new Error(msg || 'Email failed')
      }

      // 3. Save estimate record
      await supabase.from('estimates').insert({
        lead_id:         lead.id,
        bid_amount:      bid,
        labour_hours:    labourHours,
        job_type:        lead.job_type,
        status:          'Sent',
        sent_at:         new Date().toISOString(),
        organization_id: organizationId,
      })

      onSent('Estimate Sent')
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'var(--overlay-heavy)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--panel)', borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 24px 70px rgba(20,22,26,0.28)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={16} color="var(--accent)" />
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink-1)' }}>Send Estimate</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'grid', placeItems: 'center' }}><X size={16} /></button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>

          {/* Client summary */}
          <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink-1)', marginBottom: 4 }}>{lead.name}</div>
            {lead.address && <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 2 }}>{lead.address}</div>}
            {lead.job_type && <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{lead.job_type}</div>}
          </div>

          {/* Line items */}
          <div style={{ border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
            {[
              { label: `Labour — ${labourHours} hrs @ $22/hr`, amount: labourCost },
              { label: 'Overhead (15%)',                        amount: overhead   },
            ].map(({ label, amount }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderBottom: '1px solid var(--line-2)', fontSize: 13, color: 'var(--ink-2)' }}>
                <span>{label}</span>
                <span className="tnum">${amount.toLocaleString()}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--accent-soft)', fontSize: 14, fontWeight: 700, color: 'var(--accent-ink)' }}>
              <span>Total Bid</span>
              <span className="tnum">${total.toLocaleString()}</span>
            </div>
          </div>

          {/* To: email */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>To</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="client@example.com"
              style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 9, padding: '9px 12px', fontSize: 13, color: 'var(--ink-1)', outline: 'none', fontFamily: 'inherit' }}
            />
          </div>

          {error && <div style={{ fontSize: 12.5, color: 'var(--lose)', marginBottom: 12, background: 'var(--lose-soft)', borderRadius: 8, padding: '8px 12px' }}>{error}</div>}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSend} disabled={sending} style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: '#A50050', color: 'white', fontSize: 13, fontWeight: 600, cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Send size={13} /> {sending ? 'Sending…' : 'Send Estimate'}
          </button>
        </div>
      </div>
    </div>
  )
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
