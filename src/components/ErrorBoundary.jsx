import { Component } from 'react'
import { captureError } from '../lib/sentry.js'

/**
 * ErrorBoundary — catches React render errors and shows a fallback UI.
 *
 * Props:
 *   inline  {boolean}  If true, renders a compact inline error instead of a
 *                      full-page crash screen. Use this inside drawers/modals
 *                      so a single panel error doesn't take down the whole app.
 *   children
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack)
    captureError(error, { area: 'ErrorBoundary', componentStack: info.componentStack })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const retry = () => this.setState({ hasError: false, error: null })
    const msg = import.meta.env.DEV
      ? (this.state.error?.message ?? 'Unknown error')
      : 'An unexpected error occurred.'

    if (this.props.inline) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 10, padding: '32px 20px',
          color: 'var(--ink-3)', fontSize: 13, textAlign: 'center',
        }}>
          <span style={{ fontSize: 22 }}>⚠️</span>
          <span>{msg}</span>
          <button className="btn btn-secondary" onClick={retry} style={{ fontSize: 12 }}>
            Try again
          </button>
        </div>
      )
    }

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100vh', gap: 16,
        background: 'var(--bg)', color: 'var(--ink-1)',
      }}>
        <div style={{ fontSize: 32 }}>⚠️</div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Something went wrong</div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', maxWidth: 360, textAlign: 'center' }}>
          {msg}
        </div>
        <button className="btn btn-secondary" onClick={retry}>
          Try again
        </button>
      </div>
    )
  }
}
