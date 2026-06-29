export function VideoPriceBadge({ label, price }) {
  if (!label && !price) {
    return null
  }

  return (
    <div className="video-price-badge">
      <span>{label}</span>
      <strong>{price}</strong>
    </div>
  )
}
