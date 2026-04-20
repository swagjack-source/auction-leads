import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // In production, route this to a monitoring service (e.g. Sentry)
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info.componentStack)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100vh', gap: 16,
          background: 'var(--bg)', color: 'var(--ink-1)',
        }}>
          <div style={{ fontSize: 32 }}>⚠️</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Something went wrong</div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', maxWidth: 360, textAlign: 'center' }}>
            {import.meta.env.DEV ? this.state.error?.message : 'An unexpected error occurred. Please refresh the page.'}
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
