import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AiOutlineDislike, AiOutlineLike } from 'react-icons/ai'
import { AiOutlineLock } from 'react-icons/ai'
import { HiOutlineShieldCheck } from 'react-icons/hi'
import { useTranslation } from 'react-i18next'
import { EncounterGalleryStatsBar } from './EncounterGalleryStatsBar'
import { EncounterSocialLinksSection } from './EncounterSocialLinksSection'
import { normalizeEncounterGallerySlides } from '../utils/encuentrosGallery'
import { useAppState } from '../state/AppState'

function GalleryReactionControls({
  photoId,
  reactionCounts = {},
  reactionVotes = {},
  onReact,
  compact = false,
}) {
  const { t } = useTranslation()
  const counts = reactionCounts[photoId] || { likes: 0, dislikes: 0 }
  const currentReaction = reactionVotes[photoId] || ''

  const handleReaction = (reaction) => {
    onReact?.(photoId, reaction)
  }

  return (
    <div
      className={
        compact
          ? 'encuentros-gallery-modal-thumb-reactions is-compact'
          : 'encuentros-gallery-modal-thumb-reactions'
      }
    >
      <button
        type="button"
        className={
          currentReaction === 'like'
            ? 'encuentros-gallery-modal-reaction is-active'
            : 'encuentros-gallery-modal-reaction'
        }
        onClick={(event) => {
          event.stopPropagation()
          handleReaction('like')
        }}
        aria-label={t('encuentros.galleryLike')}
        aria-pressed={currentReaction === 'like'}
      >
        <AiOutlineLike aria-hidden="true" />
        <span>{counts.likes || 0}</span>
      </button>

      <button
        type="button"
        className={
          currentReaction === 'dislike'
            ? 'encuentros-gallery-modal-reaction is-active'
            : 'encuentros-gallery-modal-reaction'
        }
        onClick={(event) => {
          event.stopPropagation()
          handleReaction('dislike')
        }}
        aria-label={t('encuentros.galleryDislike')}
        aria-pressed={currentReaction === 'dislike'}
      >
        <AiOutlineDislike aria-hidden="true" />
        <span>{counts.dislikes || 0}</span>
      </button>
    </div>
  )
}

export function EncuentrosGalleryModal({
  open = false,
  images = [],
  title,
  topBadge = 'Modelo Verificada',
  profileChips = [],
  socialLinks = [],
  reactionCounts = {},
  reactionVotes = {},
  onReact,
  onClose,
}) {
  const { t } = useTranslation()
  const { session } = useAppState()
  const location = useLocation()
  const previousActiveElementRef = useRef(null)
  const [previewSlide, setPreviewSlide] = useState(null)

  const slides = useMemo(
    () => normalizeEncounterGallerySlides(images),
    [images],
  )
  const isViewerLocked = !session?.accessToken
  const unlockHref = `/access?redirect=${encodeURIComponent(`${location.pathname}${location.search || ''}`)}`
  const totalLikes = useMemo(
    () =>
      slides.reduce((sum, slide) => {
        const counts = reactionCounts?.[slide.id] || {}
        return sum + (Number(counts.likes) || 0)
      }, 0),
    [reactionCounts, slides],
  )

  useEffect(() => {
    if (!open || typeof document === 'undefined') {
      return undefined
    }

    previousActiveElementRef.current = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    setPreviewSlide(null)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      const previousActiveElement = previousActiveElementRef.current
      if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
        previousActiveElement.focus()
      }
    }
  }, [open, onClose])

  if (!open) {
    return null
  }

  return (
    <div
      className="encuentros-gallery-modal"
      role="dialog"
      aria-modal="true"
      aria-label={title || t('encuentros.galleryTitle')}
      onClick={onClose}
    >
      <article className="encuentros-gallery-modal-card" onClick={(event) => event.stopPropagation()}>
        <header className="encuentros-gallery-modal-head">
          <div className="encuentros-gallery-modal-copy">
            <span className="encuentros-screen-status-pill encuentros-gallery-modal-status-pill">
              <HiOutlineShieldCheck aria-hidden="true" />
              <span>{topBadge}</span>
            </span>
            <h2>{title || t('encuentros.galleryTitle')}</h2>
            {Array.isArray(profileChips) && profileChips.length ? (
              <div className="encuentros-gallery-modal-profile-metadata" aria-label={t('encuentros.profileSummary', 'Perfil')}>
                {profileChips.map((item) => (
                  <span
                    key={item.key}
                    className={
                      item.tone === 'relationship'
                        ? 'encuentros-screen-profile-chip is-relationship'
                        : item.tone === 'attendance'
                          ? 'encuentros-screen-profile-chip is-attendance'
                          : 'encuentros-screen-profile-chip'
                    }
                  >
                    {item.label}
                  </span>
                ))}
              </div>
            ) : null}
            <EncounterGalleryStatsBar
              photosCount={slides.length}
              likesCount={totalLikes}
              className="encuentros-gallery-modal-stats"
            />
          </div>
        </header>

        <div className="encuentros-gallery-modal-body">
          <div className="encuentros-gallery-modal-grid-shell">
            <div className="encuentros-gallery-modal-grid" aria-label={t('encuentros.galleryTitle')}>
              {slides.length ? (
                slides.map((slide, index) => (
                  <article
                    className={
                      isViewerLocked && index >= 5
                        ? 'encuentros-gallery-modal-thumb is-locked'
                        : 'encuentros-gallery-modal-thumb'
                    }
                    key={`${slide.id}-${slide.src}-${index}`}
                  >
                    {isViewerLocked && index >= 5 ? (
                      <Link
                        className="encuentros-gallery-modal-thumb-open is-locked"
                        to={unlockHref}
                        aria-label={t('access.login', 'Foto bloqueada. Inicia sesion para desbloquear.')}
                      >
                        <img src={slide.src} alt={slide.alt} loading="lazy" />
                        <span className="encuentros-gallery-modal-thumb-lock">
                          <span className="encuentros-gallery-modal-thumb-lock-icon" aria-hidden="true">
                            <AiOutlineLock aria-hidden="true" />
                          </span>
                          <span className="encuentros-gallery-modal-thumb-lock-copy">
                            <span>{t('content.locked', 'Foto bloqueada')}</span>
                            <strong>{t('content.unlock', 'Desbloquear')}</strong>
                          </span>
                        </span>
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="encuentros-gallery-modal-thumb-open"
                        onClick={() => setPreviewSlide(slide)}
                        aria-label={t('encuentros.galleryPreview')}
                      >
                        <img src={slide.src} alt={slide.alt} loading={index < 2 ? 'eager' : 'lazy'} />
                      </button>
                    )}

                    {!(isViewerLocked && index >= 5) ? (
                      <GalleryReactionControls
                        photoId={slide.id}
                        reactionCounts={reactionCounts}
                        reactionVotes={reactionVotes}
                        onReact={onReact}
                      />
                    ) : null}
                  </article>
                ))
              ) : (
                <div className="encuentros-gallery-modal-empty">{t('encuentros.galleryEmpty')}</div>
              )}
            </div>
          </div>

          <div className="encuentros-gallery-modal-social-shell">
            <EncounterSocialLinksSection
              title={t('encuentros.socialNetworks', 'Redes sociales')}
              description={''}
              links={socialLinks}
              className="encuentros-gallery-modal-social-section"
              showTitle={false}
            />
          </div>
        </div>

        {previewSlide ? (
          <div className="encuentros-gallery-modal-preview" role="presentation" onClick={() => setPreviewSlide(null)}>
            <figure
              className="encuentros-gallery-modal-preview-frame"
              role="dialog"
              aria-modal="true"
              aria-label={previewSlide.alt}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="encuentros-gallery-modal-preview-close"
                onClick={() => setPreviewSlide(null)}
                aria-label={t('encuentros.galleryClosePreview')}
              >
                &times;
              </button>
              <img src={previewSlide.src} alt={previewSlide.alt} />

              <div className="encuentros-gallery-modal-preview-footer">
                <div className="encuentros-gallery-modal-preview-copy">
                  <span>{previewSlide.caption || previewSlide.alt}</span>
                </div>
                <GalleryReactionControls
                  photoId={previewSlide.id}
                  reactionCounts={reactionCounts}
                  reactionVotes={reactionVotes}
                  onReact={onReact}
                  compact
                />
              </div>
            </figure>
          </div>
        ) : null}
      </article>
    </div>
  )
}
