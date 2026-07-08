import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppState } from '../state/AppState'
import { buildVideoAccessActions } from '../utils/videoAccess'
import { resolveLocalizedRecord } from '../utils/localizedContent'
import { VideoPriceBadge } from './VideoPriceBadge'

function getVideoAccessNote(item, access, t) {
  if (access.accessMode === 'public') {
    return t('content.freeVideo')
  }

  if (access.unlocked) {
    return access.includedBySubscription ? t('content.includedSubscription') : t('content.unlocked')
  }

  if (access.accessMode === 'registered') {
    return t('content.registeredOnly')
  }

  if (access.accessMode === 'subscription') {
    return t('checkout.checkoutTypeSubscription')
  }

  return t('checkout.checkoutTypePurchase')
}

function getVideoTags(item = {}) {
  return Array.from(
    new Set(
      (Array.isArray(item.tags) ? item.tags : item.tag ? [item.tag] : [])
        .map((value) => String(value || '').trim())
        .filter(Boolean),
    ),
  ).slice(0, 5)
}

function VideoPreview({
  item,
  presentation = 'regular',
  showPriceBadge = false,
  isPublicPreviewLocked = false,
}) {
  const { t } = useTranslation()
  const isCatalogPresentation = presentation === 'catalog' || presentation === 'related' || presentation === 'showcase'
  const videoRef = useRef(null)
  const [isPreviewActive, setIsPreviewActive] = useState(false)
  const canHoverPlayback = useMemo(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return false
    }

    return window.matchMedia('(hover: hover) and (pointer: fine)').matches
  }, [])
  const previewVideoUrl = item.previewVideoUrl || item.previewSourceUrl || item.previewUrl || ''
  const hasPreviewVideo = Boolean(previewVideoUrl)

  useEffect(() => {
    setIsPreviewActive(false)
  }, [previewVideoUrl, item.slug])

  useEffect(() => {
    const video = videoRef.current

    if (!video || !hasPreviewVideo || isPublicPreviewLocked) {
      return undefined
    }

    if (!isPreviewActive) {
      video.pause()
      video.currentTime = 0
      return undefined
    }

    video.currentTime = 0

    const playResult = video.play()
    if (playResult?.catch) {
      playResult.catch(() => {})
    }

    return () => {
      video.pause()
    }
  }, [hasPreviewVideo, isPreviewActive, isPublicPreviewLocked, previewVideoUrl])

  const previewEventHandlers = hasPreviewVideo && !isPublicPreviewLocked
    ? canHoverPlayback
      ? {
          onPointerEnter: () => setIsPreviewActive(true),
          onPointerLeave: () => setIsPreviewActive(false),
          onFocus: () => setIsPreviewActive(true),
          onBlur: () => setIsPreviewActive(false),
        }
      : {
          role: 'button',
          tabIndex: 0,
          onClick: () => setIsPreviewActive((current) => !current),
          onKeyDown: (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              setIsPreviewActive((current) => !current)
            }
          },
        }
    : {}

  if (hasPreviewVideo) {
    return (
      <div
        className={`video-preview-stage${isCatalogPresentation ? ' is-portrait' : ''}${!canHoverPlayback ? ' is-touch-preview' : ''}${isPublicPreviewLocked ? ' is-public-preview' : ''}`}
        {...previewEventHandlers}
      >
          <video
          className="video-preview-player"
          ref={videoRef}
          src={previewVideoUrl}
          poster={item.posterImage || undefined}
          muted
          playsInline
          autoPlay={false}
          controls={false}
          loop
          preload="metadata"
        />
        {isPublicPreviewLocked ? (
          <div className="video-preview-overlay">
            <div className="video-preview-overlay-copy">
              <span>{t('content.registeredOnly')}</span>
            </div>
          </div>
        ) : null}
        <span className="video-preview-chip">
          {canHoverPlayback
            ? item.previewLabel || t('content.preview')
            : isPreviewActive
              ? t('content.tapToPause')
              : item.previewLabel || t('content.tapToPlay')}
        </span>
        {showPriceBadge ? (
          <VideoPriceBadge label={item.accessLabel || t('content.buyVideo')} price={item.priceLabel} />
        ) : null}
      </div>
    )
  }

  return (
      <div className={`video-preview-fallback${isCatalogPresentation ? ' is-portrait' : ''}`}>
        {item.posterImage ? (
          <img
            className="video-preview-fallback-image"
            src={item.posterImage}
            alt={item.title}
            loading="lazy"
            decoding="async"
          />
        ) : null}
        <div className="video-preview-fallback-copy">
          <span>{item.previewLabel || t('content.preview')}</span>
          <strong>{item.title}</strong>
          <p>{t('content.previewAvailableOpen')}</p>
        </div>
        {showPriceBadge ? (
          <VideoPriceBadge label={item.accessLabel || t('content.buyVideo')} price={item.priceLabel} />
        ) : null}
      </div>
  )
}

export function VideoCard({ item, presentation = 'regular', basePath = '' }) {
  const { getContentAccess, session, siteContent, subscriptionProduct } = useAppState()
  const { t, i18n } = useTranslation()
  const resolvedItem = resolveLocalizedRecord(item, i18n.resolvedLanguage)
  const localizedSiteContent = resolveLocalizedRecord(siteContent, i18n.resolvedLanguage)
  const videoSlug = String(resolvedItem.slug || '').trim()
  const access = videoSlug
    ? getContentAccess(`video:${videoSlug}`)
    : {
        unlocked: false,
        includedBySubscription: false,
        requiresPurchase: true,
        accessMode: 'purchase',
        content: resolvedItem,
      }
  const isPublicPreviewLocked = !session?.accessToken
  const accessNote = getVideoAccessNote(resolvedItem, access, t)
  const actions = videoSlug
    ? buildVideoAccessActions({
        access,
        session,
        subscriptionProduct,
        videoSlug,
        siteContent: localizedSiteContent,
        t,
        basePath,
      })
    : []
  const tagList = getVideoTags(resolvedItem)

  return (
    <article
      className={`video-card${presentation === 'catalog' ? ' is-catalog' : ''}${presentation === 'related' ? ' is-related' : ''}${presentation === 'showcase' ? ' is-showcase' : ''}`}
      key={videoSlug || resolvedItem.title || 'video-card'}
    >
      <VideoPreview
        item={resolvedItem}
        presentation={presentation}
        isPublicPreviewLocked={isPublicPreviewLocked}
        showPriceBadge={presentation === 'showcase' && !access.unlocked}
      />

      <div className="video-card-copy">
          <span className="video-card-exclusive-badge">Contenido exclusivo</span>
          <div className="video-card-meta">
            <div className="video-card-tag-list">
              {tagList.length ? tagList.map((tag) => <span key={tag}>{tag}</span>) : null}
            </div>
          <span>{resolvedItem.duration}</span>
          </div>
        <h3>{resolvedItem.title}</h3>
        {presentation === 'showcase' ? null : <p>{resolvedItem.description}</p>}
        {presentation === 'showcase' ? null : access.unlocked ? (
          <div className="video-card-access is-unlocked">
            <small>{accessNote}</small>
          </div>
        ) : (
          <div className="video-card-access">
            <strong>{resolvedItem.priceLabel}</strong>
            <small>{accessNote}</small>
          </div>
        )}
        <div className="video-card-actions">
          {actions.map((action) => (
            <Link
              key={action.key}
              className={action.variant === 'secondary' ? 'hero-secondary-cta' : 'video-buy-link'}
              to={action.href}
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </article>
  )
}
