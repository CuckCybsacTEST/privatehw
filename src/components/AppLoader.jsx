export function AppLoader({ title = 'Cargando...', subtitle = 'Preparando la experiencia.' }) {
  return (
    <main className="app-loader-screen" aria-live="polite" aria-busy="true">
      <div className="app-loader-card">
        <div className="app-loader-emojis" aria-hidden="true">
          <span className="app-loader-emoji is-fire">🔥</span>
        </div>
        <p className="app-loader-title">{title}</p>
        <p className="app-loader-subtitle">{subtitle}</p>
      </div>
    </main>
  )
}
