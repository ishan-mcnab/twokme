export default function FullScreenLoader({ message = 'LOADING...' }) {
  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
      }}
    >
      <div className="pulse-dot" aria-hidden />
      <p
        style={{
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
          marginTop: '16px',
          fontSize: '12px',
          letterSpacing: '0.1em',
        }}
      >
        {message}
      </p>
    </div>
  )
}
