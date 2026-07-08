import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AiOutlinePicture, AiOutlineRight, AiOutlineUser } from 'react-icons/ai'
import { HiOutlineLocationMarker, HiOutlineShieldCheck } from 'react-icons/hi'
import { getCatalogModelDetails } from '../utils/encuentrosCatalog'

function normalizeMediaUrl(src = '') {
  const value = String(src || '').trim()

  if (!value) {
    return ''
  }

  if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:') || value.startsWith('/')) {
    return value
  }

  return `/${value.replace(/^\/+/, '')}`
}

function collectModelImages(content = {}) {
  const pools = [
    content.profileGalleryImages,
    content.galleryImages,
    content.topCarouselImages,
    content.bottomCarouselImages,
  ]

  const images = []

  pools.forEach((pool) => {
    if (!Array.isArray(pool)) {
      return
    }

    pool.forEach((item) => {
      const src = normalizeMediaUrl(
        typeof item === 'string' ? item : item?.src || item?.image || item?.url || '',
      )

      if (src) {
        images.push(src)
      }
    })
  })

  return Array.from(new Set(images))
}

function getTopBadgeLabel(content = {}) {
  const raw =
    content.profileTopBadge ??
    content.topBadge ??
    content.badgeTop ??
    content.isTop ??
    content.featured ??
    ''

  if (typeof raw === 'string' && raw.trim()) {
    return raw.trim()
  }

  return raw ? 'Top' : ''
}

function ProfileMetaLine({ icon: Icon, label }) {
  if (!label) {
    return null
  }

  return (
    <div className="encuentros-catalog-card-meta-row">
      <Icon aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

export function EncounterCatalogCard({ model, className = '', actionLabel = 'Ver perfil' }) {
  const content = model?.content || {}
  const details = getCatalogModelDetails(model)
  const images = useMemo(() => collectModelImages(content), [content])
  const photoCount = images.length
  const coverImage = images[0] || normalizeMediaUrl(content.profileCoverImage || content.coverImage || '')
  const topBadge = getTopBadgeLabel(content)
  const profileHref = `/encuentros/${encodeURIComponent(model?.slug || '')}`

  return (
    <article className={['encuentros-catalog-card', className].filter(Boolean).join(' ')}>
      <Link className="encuentros-catalog-card-media" to={profileHref} aria-label={`Abrir perfil de ${details.title}`}>
        {coverImage ? (
          <img src={coverImage} alt={details.title} loading="lazy" />
        ) : (
          <div className="encuentros-catalog-card-empty">
            <AiOutlinePicture aria-hidden="true" />
          </div>
        )}

        {photoCount ? (
          <span className="encuentros-catalog-card-photo-badge">
            <AiOutlinePicture aria-hidden="true" />
            <span>{photoCount}</span>
          </span>
        ) : null}
      </Link>

      <div className="encuentros-catalog-card-body">
        {topBadge ? (
          <span className="encuentros-catalog-card-top-badge">
            <HiOutlineShieldCheck aria-hidden="true" />
            <span>{topBadge}</span>
          </span>
        ) : null}

        <div className="encuentros-catalog-card-copy">
          <h2 className="encuentros-catalog-card-title">
            <Link to={profileHref}>{details.title}</Link>
          </h2>
          {details.nationality ? <p className="encuentros-catalog-card-nationality">{details.nationality}</p> : null}
          <p className="encuentros-catalog-card-description">{details.description}</p>
        </div>

        <div className="encuentros-catalog-card-facts" aria-label={`Datos de ${details.title}`}>
          <ProfileMetaLine icon={AiOutlineUser} label={details.age} />
          <ProfileMetaLine icon={AiOutlineUser} label={details.heightLabel} />
          <ProfileMetaLine icon={HiOutlineLocationMarker} label={details.city} />
          <ProfileMetaLine icon={AiOutlinePicture} label={details.bodyHair} />
        </div>

        <div className="encuentros-catalog-card-actions">
          <Link className="encuentros-catalog-card-button" to={profileHref}>
            <span>{actionLabel}</span>
            <AiOutlineRight aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  )
}
