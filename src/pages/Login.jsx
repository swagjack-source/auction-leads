import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useTheme } from '../lib/ThemeContext'

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'var(--bg)',
  border: '1px solid var(--line)',
  borderRadius: 9,
  padding: '9px 12px',
  fontSize: 13,
  color: 'var(--ink-1)',
  outline: 'none',
  fontFamily: 'inherit',
}

export default function Login() {
  const { session } = useAuth()
  const { theme } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  if (session) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <div style={{
        width: 360,
        background: 'var(--panel)',
        border: '1px solid var(--line)',
        borderRadius: 16,
        padding: '32px 28px',
        boxShadow: 'var(--shadow-2)',
      }}>
        <img
          src={theme === 'dark' ? '/ctlogo-white.png' : '/CT DenverSE logo - Black.png'}
          alt="Caring Transitions Denver Southeast"
          style={{ width: '100%', maxWidth: 200, height: 'auto', display: 'block', margin: '0 auto 28px' }}
        />

        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-1)', margin: '0 0 4px', textAlign: 'center' }}>
          Sign in to your workspace
        </h1>
        <p style={{ fontSize: 12.5, color: 'var(--ink-3)', textAlign: 'center', margin: '0 0 24px' }}>
          Caring Transitions Denver SE
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 5 }}>
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="you@caringtransitions.com"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 5 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={inputStyle}
            />
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

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4, padding: '10px', borderRadius: 10,
              border: 'none', background: 'var(--accent)', color: 'white',
              fontSize: 13.5, fontWeight: 600,
              cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.7 : 1,
              fontFamily: 'inherit',
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
