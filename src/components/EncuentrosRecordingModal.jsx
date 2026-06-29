import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export function EncuentrosRecordingModal({
  open,
  booking,
  pricing,
  onClose,
  onChoose,
  title,
  description,
}) {
  const { t } = useTranslation()

  useEffect(() => {
    if (!open || typeof document === 'undefined') {
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  if (!open) {
    return null
  }

  const yesLabel = booking?.recordingYesLabel || t('encuentros.recordingYes')
  const noLabel = booking?.recordingNoLabel || t('encuentros.recordingNo')
  const headline = title || booking?.recordingPromptTitle || t('encuentros.recordingModalTitle')
  const body = description || booking?.recordingPromptDescription || t('encuentros.recordingModalDescription')

  return (
    <div className="encuentros-recording-modal" role="dialog" aria-modal="true" aria-label={headline}>
      <div className="encuentros-recording-modal-backdrop" onClick={onClose} role="presentation" />
      <div className="encuentros-recording-modal-card">
        <div className="encuentros-recording-modal-copy">
          <p className="section-kicker">{booking?.eyebrow || t('encuentros.bookingEyebrow')}</p>
          <h2>{headline}</h2>
          <p>{body}</p>
        </div>

        <div className="encuentros-recording-modal-pricing">
          <div className="encuentros-recording-modal-price">
            <span>{t('encuentros.recordingModalNormal')}</span>
            <strong>{pricing?.baseLabel || booking?.priceLabel || 'S/5.00'}</strong>
          </div>
          <div className="encuentros-recording-modal-price is-highlighted">
            <span>{t('encuentros.recordingModalWithRecording')}</span>
            <strong>{pricing?.effectiveLabel || booking?.priceLabel || 'S/5.00'}</strong>
            {pricing?.hasRecordingDiscount ? (
              <small>
                {t('encuentros.recordingModalDiscount', {
                  percent: pricing.discountPercent,
                })}
              </small>
            ) : null}
          </div>
        </div>

        <div className="encuentros-recording-modal-actions">
          <button type="button" className="hero-secondary-cta" onClick={() => onChoose('standard')}>
            {noLabel}
          </button>
          <button type="button" className="hero-primary-cta" onClick={() => onChoose('recording')}>
            {yesLabel}
          </button>
        </div>

        <button type="button" className="encuentros-recording-modal-close" onClick={onClose}>
          {t('content.close')}
        </button>
      </div>
    </div>
  )
}
