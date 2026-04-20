import { Mail } from 'lucide-react'

export default function Inbox() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      gap: 14,
      color: 'var(--ink-4)',
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: 'var(--panel)', border: '1px solid var(--line)',
        display: 'grid', placeItems: 'center',
        boxShadow: 'var(--shadow-1)',
      }}>
        <Mail size={24} strokeWidth={1.5} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-1)', marginBottom: 6 }}>
          Inbox — Coming Soon
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', maxWidth: 320, lineHeight: 1.55 }}>
          Message threads and lead inquiries will appear here once the inbox feature is connected.
        </div>
      </div>
    </div>
  )
}
