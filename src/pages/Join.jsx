import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useTheme } from '../lib/ThemeContext'

const ROLE_LABELS = {
  owner:    'Owner',
  co_owner: 'Co-Owner',
  admin:    'Admin',
  bdr:      'BDR',
  employee: 'Employee',
  member:   'Member',
}

export default function Join() {
  const { session } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const isDark = theme === 'dark'

  const token = new URLSearchParams(window.location.hash.slice(1)).get('token')

  const [invite, setInvite]         = useState(null)
  const [inviteState, setInviteState] = useState('loading') // loading | valid | invalid | expired | used
  const [mode, setMode]             = useState('signup')
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw]         = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [accepting, setAccepting]   = useState(false)
  const [error, setError]           = useState(null)

  // Load invite info (works unauthenticated via SECURITY DEFINER)
  useEffect(() => {
    if (!token) { setInviteState('invalid'); return }
    supabase.rpc('get_invite_by_token', { invite_token: token }).then(({ data }) => {
      if (!data) { setInviteState('invalid'); return }
      if (data.accepted_at) { setInviteState('used'); return }
      if (new Date(data.expires_at) < new Date()) { setInviteState('expired'); return }
      setInvite(data)
      if (data.email) setEmail(data.email)
      setInviteState('valid')
    })
  }, [token])

  // Once authenticated, accept the invite
  useEffect(() => {
    if (!session || inviteState !== 'valid' || accepting) return
    setAccepting(true)
    supabase.rpc('accept_invite', { invite_token: token }).then(({ data }) => {
      if (data?.error === 'email_mismatch') {
        setError(`This invite was sent to ${invite.email}. Please sign in with that address.`)
        setAccepting(false)
        supabase.auth.signOut()
        return
      }
      // Full reload so AuthContext re-fetches organization membership
      window.location.href = '/'
    })
  }, [session, inviteState])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setAuthLoading(true)
    if (mode === 'signup') {
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { skip_org_creation: 'true' } },
      })
      if (err) setError(err.message)
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) setError(err.message)
    }
    setAuthLoading(false)
  }

  const inputShell = {
    position: 'relative', display: 'flex', alignItems: 'center',
    background: 'var(--panel)', border: '1px solid var(--line)',
    borderRadius: 10, transition: 'all 150ms',
    boxShadow: '0 1px 0 rgba(20,22,26,0.03), 0 1px 2px rgba(20,22,26,0.04)',
  }

  // ── Status screens ─────────────────────────────────────────────────────────
  if (inviteState === 'loading') {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh', background: 'var(--bg)', color: 'var(--ink-3)', fontSize: 14 }}>
        Loading invite…
      </div>
    )
  }

  if (inviteState !== 'valid') {
    const messages = {
      invalid: { title: 'Invalid invite link', body: 'This link is not valid. Ask your team owner to send a new one.' },
      expired: { title: 'Invite expired',      body: 'This invite link has expired. Ask your team owner to send a new one.' },
      used:    { title: 'Already accepted',    body: 'This invite has already been used. Try signing in instead.' },
    }
    const msg = messages[inviteState]
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh', background: 'var(--bg)', fontFamily: "'Inter', -apple-system, sans-serif" }}>
        <div style={{ textAlign: 'center', maxWidth: 380, padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔗</div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink-1)', margin: '0 0 8px', letterSpacing: '-0.02em' }}>{msg.title}</h1>
          <p style={{ fontSize: 14, color: 'var(--ink-3)', margin: '0 0 24px' }}>{msg.body}</p>
          <button
            onClick={() => navigate('/login')}
            style={{ padding: '10px 20px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Go to sign in
          </button>
        </div>
      </div>
    )
  }

  // ── Accepting spinner (already logged in, waiting for RPC) ────────────────
  if (session && accepting) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh', background: 'var(--bg)', color: 'var(--ink-3)', fontSize: 14, fontFamily: "'Inter', -apple-system, sans-serif" }}>
        Joining {invite.organization_name}…
      </div>
    )
  }

  // ── Main invite page ───────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'var(--bg)', padding: 24,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <style>{`
        .join-input-shell:focus-within {
          border-color: var(--accent) !important;
          box-shadow: 0 0 0 3px color-mix(in oklab, var(--accent) 20%, transparent), 0 1px 0 rgba(20,22,26,0.03), 0 1px 2px rgba(20,22,26,0.04) !important;
        }
        .join-submit:hover { background: color-mix(in oklab, var(--accent) 88%, black) !important; transform: translateY(-0.5px); }
        .join-submit:active { transform: translateY(0) !important; }
        .join-theme-btn:hover { background: var(--hover) !important; }
      `}</style>

      {/* Theme toggle */}
      <button
        className="join-theme-btn"
        onClick={toggle}
        aria-label="Toggle theme"
        style={{ position: 'fixed', top: 20, right: 20, width: 34, height: 34, background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 10, color: 'var(--ink-2)', display: 'grid', placeItems: 'center', cursor: 'pointer', transition: 'all 150ms' }}
      >
        {isDark ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        )}
      </button>

      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'center' }}>
          <img
            src={isDark ? '/homebase-logo-white.svg' : '/homebase-logo-black.svg'}
            alt="Homebase"
            style={{ height: 26, width: 'auto' }}
          />
        </div>

        {/* Invite card */}
        <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 16, padding: '28px 28px 24px', boxShadow: '0 4px 16px rgba(20,22,26,0.07), 0 1px 3px rgba(20,22,26,0.05)' }}>
          {/* Invite header */}
          <div style={{ textAlign: 'center', marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--line-2)' }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, background: 'var(--accent-soft)',
              display: 'grid', placeItems: 'center', margin: '0 auto 14px',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink-1)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
              You're invited to join
            </h1>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--accent)' }}>
              {invite.organization_name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>
              Role: {ROLE_LABELS[invite.role] || invite.role}{invite.is_admin ? ' · Admin' : ''}
            </div>
          </div>

          {/* Auth form */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg)', borderRadius: 9, padding: 3, border: '1px solid var(--line-2)' }}>
            {['signup', 'signin'].map(m => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(null) }}
                style={{
                  flex: 1, padding: '7px 0', border: 'none', borderRadius: 7, cursor: 'pointer',
                  fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', transition: 'all 150ms',
                  background: mode === m ? 'var(--panel)' : 'transparent',
                  color: mode === m ? 'var(--ink-1)' : 'var(--ink-3)',
                  boxShadow: mode === m ? '0 1px 3px rgba(20,22,26,0.08)' : 'none',
                }}
              >
                {m === 'signup' ? 'Create account' : 'Sign in'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Email */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)' }}>Email</label>
              <div className="join-input-shell" style={inputShell}>
                <span style={{ padding: '0 10px 0 12px', color: 'var(--ink-4)', flexShrink: 0, display: 'flex' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>
                  </svg>
                </span>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required autoFocus={!invite.email}
                  placeholder="you@caringtransitions.com"
                  readOnly={!!invite.email}
                  style={{ flex: 1, padding: '10px 12px 10px 0', background: 'transparent', border: 'none', outline: 'none', fontSize: 13.5, color: 'var(--ink-1)', minWidth: 0, fontFamily: 'inherit', opacity: invite.email ? 0.7 : 1 }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)' }}>Password</label>
              <div className="join-input-shell" style={inputShell}>
                <span style={{ padding: '0 10px 0 12px', color: 'var(--ink-4)', flexShrink: 0, display: 'flex' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input
                  type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} required
                  placeholder="••••••••••"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  style={{ flex: 1, padding: '10px 0', background: 'transparent', border: 'none', outline: 'none', fontSize: 13.5, color: 'var(--ink-1)', minWidth: 0, fontFamily: 'inherit' }}
                />
                <button type="button" onClick={() => setShowPw(v => !v)} style={{ background: 'none', border: 'none', padding: '8px 12px', color: 'var(--ink-4)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                  {showPw ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirm password — signup only */}
            {mode === 'signup' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)' }}>Confirm Password</label>
                <div className="join-input-shell" style={inputShell}>
                  <span style={{ padding: '0 10px 0 12px', color: 'var(--ink-4)', flexShrink: 0, display: 'flex' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </span>
                  <input
                    type={showPw ? 'text' : 'password'} value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)} required
                    placeholder="••••••••••" autoComplete="new-password"
                    style={{ flex: 1, padding: '10px 12px 10px 0', background: 'transparent', border: 'none', outline: 'none', fontSize: 13.5, color: 'var(--ink-1)', minWidth: 0, fontFamily: 'inherit' }}
                  />
                </div>
              </div>
            )}

            {error && (
              <div style={{ fontSize: 12, color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 10px' }}>
                {error}
              </div>
            )}

            <button
              type="submit" disabled={authLoading}
              className="join-submit"
              style={{
                marginTop: 4, padding: '11px 16px',
                background: 'var(--accent)', color: 'white',
                border: 'none', borderRadius: 10,
                fontSize: 14, fontWeight: 600, letterSpacing: '-0.005em',
                cursor: authLoading ? 'default' : 'pointer',
                opacity: authLoading ? 0.7 : 1, transition: 'all 150ms',
                boxShadow: '0 1px 0 rgba(255,255,255,0.15) inset, 0 2px 8px color-mix(in oklab, var(--accent) 25%, transparent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontFamily: 'inherit',
              }}
            >
              {authLoading
                ? (mode === 'signup' ? 'Creating account…' : 'Signing in…')
                : (mode === 'signup' ? 'Create account & join' : 'Sign in & join')}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--ink-4)', marginTop: 20 }}>
          By joining, you agree to Homebase's terms of service.
        </p>
      </div>
    </div>
  )
}
