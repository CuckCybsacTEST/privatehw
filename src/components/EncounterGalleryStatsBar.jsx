import { AiOutlineHeart, AiOutlinePicture } from 'react-icons/ai'

function formatCompactCount(value = 0) {
  const safeValue = Number.isFinite(value) && value > 0 ? value : 0

  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: safeValue >= 1000 ? 1 : 0,
  }).format(safeValue)
}

function GalleryStat({ icon: Icon, value, label }) {
  return (
    <div className="encuentros-gallery-stats-item">
      <span className="encuentros-gallery-stats-icon" aria-hidden="true">
        <Icon aria-hidden="true" />
      </span>
      <strong>{formatCompactCount(value)}</strong>
      <span>{label}</span>
    </div>
  )
}

export function EncounterGalleryStatsBar({ photosCount = 0, likesCount = 0, className = '' }) {
  const safePhotosCount = Number.isFinite(photosCount) && photosCount > 0 ? photosCount : 0
  const safeLikesCount = Number.isFinite(likesCount) && likesCount > 0 ? likesCount : 0

  if (!safePhotosCount && !safeLikesCount) {
    return null
  }

  return (
    <div className={['encuentros-gallery-stats-bar', className].filter(Boolean).join(' ')}>
      <GalleryStat icon={AiOutlinePicture} value={safePhotosCount} label="Fotos" />
      <GalleryStat icon={AiOutlineHeart} value={safeLikesCount} label="Me gusta" />
    </div>
  )
}
