import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useTheme } from '../lib/ThemeContext'

export default function Login() {
  const { session } = useAuth()
  const { theme, toggle } = useTheme()
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [keepSignedIn, setKeepSignedIn] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  if (session) return <Navigate to="/" replace />

  function switchMode(newMode) {
    setMode(newMode)
    setError(null)
    setSuccess(null)
    setPassword('')
    setConfirmPassword('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setSuccess('Account created! Check your email to confirm, then sign in.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    }
    setLoading(false)
  }

  const isDark = theme === 'dark'

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1.05fr 1fr',
      height: '100vh',
      width: '100vw',
      minHeight: 640,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <style>{`
        @media (max-width: 760px) {
          .login-brand-panel { display: none !important; }
          .login-wrap { grid-template-columns: 1fr !important; }
          .login-mobile-head { display: flex !important; }
        }
        .login-sso-btn:hover {
          background: var(--hover) !important;
          border-color: color-mix(in oklab, var(--ink-4) 40%, var(--line)) !important;
        }
        .login-submit:hover {
          background: color-mix(in oklab, var(--accent) 88%, black) !important;
          transform: translateY(-0.5px);
        }
        .login-submit:active { transform: translateY(0) !important; }
        .login-theme-btn:hover { background: var(--hover) !important; }
        .login-input-shell:focus-within {
          border-color: var(--accent) !important;
          box-shadow: 0 0 0 3px color-mix(in oklab, var(--accent) 20%, transparent), 0 1px 0 rgba(20,22,26,0.03), 0 1px 2px rgba(20,22,26,0.04) !important;
        }
        .login-preview-row + .login-preview-row { border-top: 1px solid var(--line-2); }
        .login-forgot:hover { text-decoration: underline; }
        .login-trouble a:hover { color: var(--accent) !important; }
        .login-footer a:hover { color: var(--ink-1) !important; }
      `}</style>

      {/* ── Brand panel (left) ── */}
      <aside className="login-brand-panel" style={{
        position: 'relative',
        padding: 40,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: isDark
          ? `radial-gradient(ellipse 80% 60% at 20% 0%, color-mix(in oklab, var(--accent) 18%, var(--bg)) 0%, transparent 55%),
             radial-gradient(ellipse 60% 80% at 90% 100%, color-mix(in oklab, var(--accent) 10%, var(--bg)) 0%, transparent 50%),
             var(--bg)`
          : `radial-gradient(ellipse 80% 60% at 20% 0%, color-mix(in oklab, var(--accent-soft-2) 55%, var(--bg-2)) 0%, transparent 55%),
             radial-gradient(ellipse 60% 80% at 90% 100%, color-mix(in oklab, var(--accent-soft) 80%, var(--bg-2)) 0%, transparent 50%),
             var(--bg-2)`,
        overflow: 'hidden',
      }}>
        {/* Grid overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `linear-gradient(var(--line-2) 1px, transparent 1px), linear-gradient(90deg, var(--line-2) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
          opacity: 0.35,
          maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 80%)',
          pointerEvents: 'none',
        }} />

        {/* Brand head */}
        <div style={{ position: 'relative' }}>
          <img
            src={isDark ? '/homebase-logo-white.svg' : '/homebase-logo-black.svg'}
            alt="Homebase"
            style={{ height: 28, width: 'auto' }}
          />
        </div>

        {/* Brand body */}
        <div style={{ position: 'relative', maxWidth: 440 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '4px 10px 4px 6px', borderRadius: 999,
            background: 'var(--panel)', border: '1px solid var(--line)',
            color: 'var(--ink-2)', fontSize: 11.5, fontWeight: 500,
            boxShadow: '0 1px 0 rgba(20,22,26,0.03), 0 1px 2px rgba(20,22,26,0.04)',
            marginBottom: 20,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--win)',
              boxShadow: '0 0 0 3px color-mix(in oklab, var(--win) 25%, transparent)',
              display: 'inline-block',
            }} />
            Internal Operations · v2.4
          </div>

          <h1 style={{
            fontSize: 38, fontWeight: 600, letterSpacing: '-0.025em',
            lineHeight: 1.1, color: 'var(--ink-1)', margin: '0 0 14px',
          }}>
            Your pipeline,<br />
            from <span style={{ color: 'var(--accent)', fontStyle: 'normal' }}>intake to auction.</span>
          </h1>
          <p style={{
            fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.55,
            margin: '0 0 28px', maxWidth: 420,
          }}>
            One workspace for senior move coordinators, auction staff, and field teams — deals, schedules, contacts, and payouts in one place.
          </p>

          {/* Mini pipeline preview */}
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--line)',
            borderRadius: 14, padding: 14,
            boxShadow: '0 10px 30px rgba(20,22,26,0.08), 0 2px 6px rgba(20,22,26,0.05)',
            maxWidth: 440,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              paddingBottom: 10, borderBottom: '1px solid var(--line-2)', marginBottom: 10,
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>Today's Pipeline</span>
              <span style={{
                fontSize: 10, fontWeight: 600, color: 'var(--accent-ink)',
                background: 'var(--accent-soft)', padding: '2px 7px', borderRadius: 4,
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>Live</span>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 500 }}>
                <b style={{ color: 'var(--ink-1)', fontWeight: 600 }}>19</b> active
              </span>
            </div>

            {[
              { dot: '#C28A5A', name: 'Estate of W. Petrov',   initials: 'JM', avatarBg: 'oklch(0.72 0.08 210)', val: '$18.4k' },
              { dot: '#8666BD', name: 'Dorothy Halverson',     initials: 'SK', avatarBg: 'oklch(0.72 0.08 340)', val: '$9.2k'  },
              { dot: '#5A7FB3', name: 'Frank & Anita Cole',    initials: 'RT', avatarBg: 'oklch(0.72 0.08 140)', val: '$27.1k' },
            ].map(row => (
              <div key={row.name} className="login-preview-row" style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 6px', borderRadius: 8,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: row.dot, flexShrink: 0 }} />
                <span style={{
                  flex: 1, minWidth: 0,
                  fontSize: 12.5, fontWeight: 500, color: 'var(--ink-1)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{row.name}</span>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: row.avatarBg, color: 'white',
                  fontSize: 9, fontWeight: 700,
                  display: 'grid', placeItems: 'center',
                  border: '2px solid var(--panel)',
                }}>{row.initials}</div>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', fontVariantNumeric: 'tabular-nums' }}>{row.val}</span>
              </div>
            ))}

            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
              gap: 1, background: 'var(--line-2)',
              borderTop: '1px solid var(--line-2)',
              borderRadius: '0 0 12px 12px',
              margin: '10px -14px -14px',
              overflow: 'hidden',
            }}>
              {[
                { label: 'Won MTD',  num: '3',     delta: '↑ $113.3k' },
                { label: 'Avg score', num: '7.2',  delta: '↑ 0.4' },
                { label: 'Pipeline', num: '$429k', delta: '↑ 12%' },
              ].map(s => (
                <div key={s.label} style={{ padding: '10px 12px', background: 'var(--panel)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</span>
                  <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink-1)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>{s.num}</span>
                  <span style={{ fontSize: 10.5, color: 'var(--win)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{s.delta}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Brand footer */}
        <div className="login-footer" style={{
          position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 11.5, color: 'var(--ink-3)',
        }}>
          <span>© 2026 Homebase</span>
          <span style={{ display: 'flex', gap: 16 }}>
            <a href="#" style={{ color: 'var(--ink-3)', textDecoration: 'none' }}>Privacy</a>
            <a href="#" style={{ color: 'var(--ink-3)', textDecoration: 'none' }}>Terms</a>
          </span>
        </div>
      </aside>

      {/* ── Form panel (right) ── */}
      <section style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 40, background: 'var(--bg)', position: 'relative',
      }}>
        {/* Theme toggle */}
        <button
          className="login-theme-btn"
          onClick={toggle}
          title="Toggle theme"
          aria-label="Toggle theme"
          style={{
            position: 'absolute', top: 24, right: 24,
            width: 34, height: 34,
            background: 'var(--panel)', border: '1px solid var(--line)',
            borderRadius: 10, color: 'var(--ink-2)',
            display: 'grid', placeItems: 'center',
            boxShadow: '0 1px 0 rgba(20,22,26,0.03), 0 1px 2px rgba(20,22,26,0.04)',
            cursor: 'pointer', transition: 'all 150ms',
          }}
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

        <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column' }}>
          {/* Mobile-only brand head */}
          <div className="login-mobile-head" style={{
            display: 'none', alignItems: 'center', marginBottom: 28,
          }}>
            <img
              src={isDark ? '/homebase-logo-white.svg' : '/homebase-logo-black.svg'}
              alt="Homebase"
              style={{ height: 22, width: 'auto' }}
            />
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink-1)', margin: '0 0 6px' }}>
            {mode === 'signup' ? 'Create an account' : 'Welcome back'}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--ink-3)', margin: '0 0 28px' }}>
            {mode === 'signup' ? 'Sign up to get started with Homebase.' : 'Sign in to continue to your workspace.'}
          </p>

          {/* SSO buttons — sign-in only */}
          <div style={{ display: mode === 'signup' ? 'none' : 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
            {[
              {
                label: 'Continue with Google',
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                ),
              },
              {
                label: 'Continue with Microsoft',
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
                    <rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>
                    <rect x="1" y="13" width="10" height="10" fill="#00A4EF"/>
                    <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
                  </svg>
                ),
              },
              {
                label: 'Single sign-on (SSO)',
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                ),
              },
            ].map(btn => (
              <button
                key={btn.label}
                type="button"
                className="login-sso-btn"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 10, padding: '10px 14px',
                  background: 'var(--panel)', color: 'var(--ink-1)',
                  border: '1px solid var(--line)', borderRadius: 10,
                  fontSize: 13.5, fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 150ms',
                  boxShadow: '0 1px 0 rgba(20,22,26,0.03), 0 1px 2px rgba(20,22,26,0.04)',
                  fontFamily: 'inherit',
                }}
              >
                {btn.icon}
                {btn.label}
              </button>
            ))}
          </div>

          {/* Divider — sign-in only */}
          {mode === 'signin' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              margin: '0 0 22px',
              color: 'var(--ink-4)', fontSize: 11, fontWeight: 500,
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
              or with email
              <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Email */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)' }} htmlFor="email">Email</label>
              <div className="login-input-shell" style={{
                position: 'relative', display: 'flex', alignItems: 'center',
                background: 'var(--panel)', border: '1px solid var(--line)',
                borderRadius: 10, transition: 'all 150ms',
                boxShadow: '0 1px 0 rgba(20,22,26,0.03), 0 1px 2px rgba(20,22,26,0.04)',
              }}>
                <span style={{ padding: '0 10px 0 12px', color: 'var(--ink-4)', flexShrink: 0, display: 'flex' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>
                  </svg>
                </span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder="you@caringtransitions.com"
                  autoComplete="email"
                  style={{
                    flex: 1, padding: '10px 12px 10px 0',
                    background: 'transparent', border: 'none', outline: 'none',
                    fontSize: 14, color: 'var(--ink-1)', minWidth: 0, fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} htmlFor="password">
                <span>Password</span>
                {mode === 'signin' && (
                  <a href="#" className="login-forgot" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500, fontSize: 11.5 }}>Forgot?</a>
                )}
              </label>
              <div className="login-input-shell" style={{
                position: 'relative', display: 'flex', alignItems: 'center',
                background: 'var(--panel)', border: '1px solid var(--line)',
                borderRadius: 10, transition: 'all 150ms',
                boxShadow: '0 1px 0 rgba(20,22,26,0.03), 0 1px 2px rgba(20,22,26,0.04)',
              }}>
                <span style={{ padding: '0 10px 0 12px', color: 'var(--ink-4)', flexShrink: 0, display: 'flex' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  style={{
                    flex: 1, padding: '10px 0',
                    background: 'transparent', border: 'none', outline: 'none',
                    fontSize: 14, color: 'var(--ink-1)', minWidth: 0, fontFamily: 'inherit',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  aria-label="Show password"
                  style={{
                    background: 'none', border: 'none', padding: '8px 12px',
                    color: 'var(--ink-4)', display: 'grid', placeItems: 'center', cursor: 'pointer',
                  }}
                >
                  {showPw ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirm password — sign-up only */}
            {mode === 'signup' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)' }} htmlFor="confirmPassword">Confirm Password</label>
                <div className="login-input-shell" style={{
                  position: 'relative', display: 'flex', alignItems: 'center',
                  background: 'var(--panel)', border: '1px solid var(--line)',
                  borderRadius: 10, transition: 'all 150ms',
                  boxShadow: '0 1px 0 rgba(20,22,26,0.03), 0 1px 2px rgba(20,22,26,0.04)',
                }}>
                  <span style={{ padding: '0 10px 0 12px', color: 'var(--ink-4)', flexShrink: 0, display: 'flex' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </span>
                  <input
                    id="confirmPassword"
                    type={showPw ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    placeholder="••••••••••"
                    autoComplete="new-password"
                    style={{
                      flex: 1, padding: '10px 12px 10px 0',
                      background: 'transparent', border: 'none', outline: 'none',
                      fontSize: 14, color: 'var(--ink-1)', minWidth: 0, fontFamily: 'inherit',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Keep signed in — sign-in only */}
            <div style={{ display: mode === 'signup' ? 'none' : 'flex', alignItems: 'center', marginTop: 4 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--ink-2)', cursor: 'pointer', userSelect: 'none' }}>
                <input type="checkbox" checked={keepSignedIn} onChange={e => setKeepSignedIn(e.target.checked)} style={{ display: 'none' }} />
                <span style={{
                  width: 16, height: 16, border: `1.5px solid ${keepSignedIn ? 'var(--accent)' : 'var(--line)'}`,
                  borderRadius: 4, background: keepSignedIn ? 'var(--accent)' : 'var(--panel)',
                  display: 'grid', placeItems: 'center', transition: 'all 120ms', flexShrink: 0,
                }}>
                  {keepSignedIn && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  )}
                </span>
                Keep me signed in
              </label>
            </div>

            {error && (
              <div style={{
                fontSize: 12, color: '#ef4444',
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 8, padding: '8px 10px',
              }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{
                fontSize: 12, color: '#16a34a',
                background: '#f0fdf4', border: '1px solid #bbf7d0',
                borderRadius: 8, padding: '8px 10px',
              }}>
                {success}
              </div>
            )}

            {!success && (
              <button
                type="submit"
                disabled={loading}
                className="login-submit"
                style={{
                  marginTop: 8, padding: '11px 16px',
                  background: 'var(--accent)', color: 'white',
                  border: 'none', borderRadius: 10,
                  fontSize: 14, fontWeight: 600, letterSpacing: '-0.005em',
                  cursor: loading ? 'default' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  transition: 'all 150ms',
                  boxShadow: '0 1px 0 rgba(255,255,255,0.15) inset, 0 2px 8px color-mix(in oklab, var(--accent) 25%, transparent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontFamily: 'inherit',
                }}
              >
                {loading ? (mode === 'signup' ? 'Creating account…' : 'Signing in…') : (mode === 'signup' ? 'Create account' : 'Sign in')}
                {!loading && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 5l7 7-7 7"/>
                  </svg>
                )}
              </button>
            )}
          </form>

          <div className="login-trouble" style={{ marginTop: 26, textAlign: 'center', fontSize: 12.5, color: 'var(--ink-3)' }}>
            {mode === 'signin' ? (
              <>
                Don't have an account?{' '}
                <button onClick={() => switchMode('signup')} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent)', fontWeight: 500, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button onClick={() => switchMode('signin')} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent)', fontWeight: 500, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
