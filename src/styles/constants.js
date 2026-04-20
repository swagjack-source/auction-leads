// Shared style constants — use these instead of inline duplicates.
// All values reference CSS custom properties defined in index.css.

export const inputStyle = {
  width: '100%',
  background: 'var(--bg)',
  border: '1px solid var(--line)',
  borderRadius: 9,
  padding: '8px 11px',
  fontSize: 13,
  color: 'var(--ink-1)',
  outline: 'none',
  fontFamily: 'inherit',
}

export const labelStyle = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--ink-3)',
  display: 'block',
  marginBottom: 5,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}

export const cardStyle = {
  background: 'var(--panel)',
  border: '1px solid var(--line)',
  borderRadius: 14,
  boxShadow: 'var(--shadow-1)',
}

export const modalOverlayStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 300,
  background: 'var(--overlay)',
  backdropFilter: 'blur(3px)',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding: '40px 20px',
  overflowY: 'auto',
  animation: 'fadein 150ms',
}

export const iconBtnStyle = {
  width: 28,
  height: 28,
  borderRadius: 8,
  border: '1px solid var(--line)',
  background: 'transparent',
  cursor: 'pointer',
  display: 'grid',
  placeItems: 'center',
  color: 'var(--ink-3)',
}

export const sectionDivider = {
  width: 1,
  height: 18,
  background: 'var(--line)',
}

export const pillBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  padding: '6px 11px',
  borderRadius: 10,
  border: '1px solid var(--line)',
  background: 'var(--panel)',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  color: 'var(--ink-2)',
  boxShadow: 'var(--shadow-1)',
  fontFamily: 'inherit',
}
