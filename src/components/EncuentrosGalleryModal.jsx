import { useEffect, useMemo, useRef, useState } from 'react'
import { AiOutlineDislike, AiOutlineEyeInvisible, AiOutlineLike } from 'react-icons/ai'
import { useTranslation } from 'react-i18next'
import { normalizeEncounterGallerySlides } from '../utils/encuentrosGallery'

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
  subtitle,
  exclusiveTitle,
  exclusiveDescription,
  reactionCounts = {},
  reactionVotes = {},
  onReact,
  onClose,
}) {
  const { t } = useTranslation()
  const previousActiveElementRef = useRef(null)
  const [previewSlide, setPreviewSlide] = useState(null)

  const slides = useMemo(
    () => normalizeEncounterGallerySlides(images),
    [images],
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
            <h2>{title || t('encuentros.galleryTitle')}</h2>
            <p className="encuentros-gallery-modal-subtitle">{subtitle || t('encuentros.gallerySubtitle')}</p>
          </div>
        </header>

        <div className="encuentros-gallery-modal-grid" aria-label={t('encuentros.galleryTitle')}>
          {slides.length ? (
            slides.map((slide, index) => (
              <article className="encuentros-gallery-modal-thumb" key={`${slide.id}-${slide.src}-${index}`}>
                <button
                  type="button"
                  className="encuentros-gallery-modal-thumb-open"
                  onClick={() => setPreviewSlide(slide)}
                  aria-label={t('encuentros.galleryPreview')}
                >
                  <img src={slide.src} alt={slide.alt} loading={index < 2 ? 'eager' : 'lazy'} />
                </button>

                <GalleryReactionControls
                  photoId={slide.id}
                  reactionCounts={reactionCounts}
                  reactionVotes={reactionVotes}
                  onReact={onReact}
                />
              </article>
            ))
          ) : (
            <div className="encuentros-gallery-modal-empty">{t('encuentros.galleryEmpty')}</div>
          )}
        </div>

        <section className="encuentros-gallery-modal-exclusive" aria-labelledby="encuentros-gallery-exclusive-title">
          <div className="encuentros-gallery-modal-exclusive-icon" aria-hidden="true">
            <AiOutlineEyeInvisible />
          </div>

          <div className="encuentros-gallery-modal-exclusive-copy">
            <h3 id="encuentros-gallery-exclusive-title">{exclusiveTitle || t('encuentros.galleryExclusiveTitle')}</h3>
            <p>{exclusiveDescription || t('encuentros.galleryExclusiveDescription')}</p>
          </div>
        </section>

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
