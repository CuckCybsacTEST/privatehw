export function AtmosphericBackdrop({
  variant = 'editorial',
  intensity = 'medium',
  glowPosition = 'center-right',
  grain = true,
  withVignette = true,
  className = '',
}) {
  const classes = [
    'atmospheric-backdrop',
    `is-${variant}`,
    `is-${intensity}`,
    `is-glow-${glowPosition}`,
    grain ? 'has-grain' : '',
    withVignette ? 'has-vignette' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div aria-hidden="true" className={classes}>
      <span className="atmospheric-backdrop-layer atmospheric-backdrop-base" />
      <span className="atmospheric-backdrop-layer atmospheric-backdrop-glow" />
      <span className="atmospheric-backdrop-layer atmospheric-backdrop-wash" />
      {grain ? <span className="atmospheric-backdrop-layer atmospheric-backdrop-grain" /> : null}
      {withVignette ? (
        <span className="atmospheric-backdrop-layer atmospheric-backdrop-vignette" />
      ) : null}
    </div>
  )
}
