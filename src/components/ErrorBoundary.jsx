import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '40px',
            textAlign: 'center',
            background: 'var(--bg-primary)',
            minHeight: '100vh',
          }}
        >
          <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--neon-red)' }}>
            SOMETHING WENT WRONG
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
            Try refreshing the page.
          </p>
          <button
            type="button"
            className="mt-8 rounded-xl border border-[var(--neon-blue)] bg-[rgba(0,212,255,0.12)] px-6 py-3 font-display text-sm font-bold uppercase tracking-wide text-[var(--neon-blue)] min-h-[44px]"
            onClick={() => {
              window.location.href = '/dashboard'
            }}
          >
            BACK TO DASHBOARD
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
