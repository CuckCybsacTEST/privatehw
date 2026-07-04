import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { normalizeRecordingChoice } from '../utils/encuentrosBooking'

function formatShortDateLabel(dateValue, locale) {
  if (!dateValue) {
    return ''
  }

  const parsed = new Date(`${dateValue}T00:00:00`)

  if (Number.isNaN(parsed.getTime())) {
    return dateValue
  }

  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(parsed)
}

export function EncuentrosBookingWizardModal({
  open,
  booking,
  modelProfile,
  isAuthenticated = false,
  currentUserName = '',
  canRecordEncounters = false,
  pricing,
  bookingDays,
  bookingTimes,
  recordingChoice,
  onRecordingChoiceChange,
  onClose,
  onSubmit,
  isSubmitting,
  error,
}) {
  const { i18n, t } = useTranslation()
  const previousActiveElementRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const [currentStep, setCurrentStep] = useState(0)
  const [maxStepReached, setMaxStepReached] = useState(0)
  const [selectedGuestName, setSelectedGuestName] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [validationMessage, setValidationMessage] = useState('')
  const [isFinalModalOpen, setIsFinalModalOpen] = useState(false)
  const dateLocale = i18n.resolvedLanguage === 'en' ? 'en-US' : 'es-PE'
  const showIdentityStep = !isAuthenticated
  const showRecordingStep = Boolean(canRecordEncounters)
  const safeRecordingChoice = showRecordingStep ? normalizeRecordingChoice(recordingChoice) : 'standard'
  const identityStepIndex = showIdentityStep ? 0 : -1
  const recordingStepIndex = showRecordingStep ? (showIdentityStep ? 1 : 0) : -1
  const dateStepIndex = (showIdentityStep ? 1 : 0) + (showRecordingStep ? 1 : 0)
  const timeStepIndex = dateStepIndex + 1
  const finalStepIndex = timeStepIndex + 1

  const steps = useMemo(
    () => [
      ...(showIdentityStep ? [t('encuentros.bookingWizardStepIdentity')] : []),
      ...(showRecordingStep ? [t('encuentros.bookingWizardStepRecording')] : []),
      t('encuentros.bookingWizardStepDate'),
      t('encuentros.bookingWizardStepTime'),
      t('encuentros.bookingWizardStepSummary'),
    ],
    [showIdentityStep, showRecordingStep, t],
  )

  const selectedDay = useMemo(
    () => bookingDays.find((day) => day.value === selectedDate) || bookingDays[0] || null,
    [bookingDays, selectedDate],
  )
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open || typeof document === 'undefined') {
      return undefined
    }

    previousActiveElementRef.current = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    setCurrentStep(0)
    setMaxStepReached(0)
    setSelectedGuestName(showIdentityStep ? '' : String(currentUserName || '').trim())
    setSelectedDate(bookingDays[0]?.value || '')
    setSelectedTime(bookingTimes[0] || '')
    setValidationMessage('')
    setIsFinalModalOpen(false)

    const focusTimer = window.setTimeout(() => {
      const firstInput = showIdentityStep
        ? document.querySelector('.encuentros-booking-guest-name')
        : document.querySelector('.booking-calendar [type="button"]')
      firstInput?.focus?.()
    }, 0)

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current?.()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previousActiveElementRef.current?.focus?.()
    }
  }, [bookingDays, bookingTimes, currentUserName, open, showIdentityStep])

  useEffect(() => {
    if (!open) return
    if (bookingDays.length && !bookingDays.some((day) => day.value === selectedDate)) {
      setSelectedDate(bookingDays[0].value)
    }
  }, [bookingDays, open, selectedDate])

  useEffect(() => {
    if (!open) return
    if (bookingTimes.length && !bookingTimes.includes(selectedTime)) {
      setSelectedTime(bookingTimes[0])
    }
  }, [bookingTimes, open, selectedTime])

  if (!open) {
    return null
  }

  function unlockStep(nextStepIndex) {
    setMaxStepReached((currentMax) => Math.max(currentMax, nextStepIndex))
  }

  function goToStep(stepIndex) {
    if (stepIndex <= maxStepReached) {
      setCurrentStep(stepIndex)
    }
  }

  function advanceFromStep(stepIndex) {
    const nextStepIndex = Math.min(stepIndex + 1, finalStepIndex)
    unlockStep(nextStepIndex)
    setCurrentStep(nextStepIndex)
  }

  function handleGuestNameChange(value) {
    setSelectedGuestName(value)
    if (validationMessage) {
      setValidationMessage('')
    }
  }

  function handleGuestNameContinue() {
    if (!showIdentityStep) {
      advanceFromStep(0)
      return
    }

    if (!selectedGuestName.trim()) {
      setValidationMessage(t('encuentros.bookingWizardGuestNameRequired'))
      return
    }

    advanceFromStep(0)
  }

  function handleRecordingSelection(choice) {
    onRecordingChoiceChange(choice)
    advanceFromStep(currentStep)
  }

  function handleDateSelection(value) {
    setSelectedDate(value)
    advanceFromStep(currentStep)
  }

  function handleTimeSelection(value) {
    setSelectedTime(value)
    advanceFromStep(currentStep)
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (currentStep !== finalStepIndex) {
      if (showIdentityStep && currentStep === identityStepIndex) {
        handleGuestNameContinue()
      } else if (!showIdentityStep && currentStep === 0) {
        advanceFromStep(0)
      }

      return
    }

    const safeGuestName = showIdentityStep
      ? selectedGuestName.trim()
      : String(currentUserName || selectedGuestName || '').trim()

    if (!safeGuestName) {
      if (showIdentityStep) {
        setCurrentStep(0)
        unlockStep(0)
        setValidationMessage(t('encuentros.bookingWizardGuestNameRequired'))
      }
      return
    }

    if (!selectedDate || !selectedTime) {
      const firstIncompleteStep = !selectedDate ? (showRecordingStep ? 2 : 1) : showRecordingStep ? 3 : 2
      setCurrentStep(firstIncompleteStep)
      unlockStep(firstIncompleteStep)
      return
    }

    await onSubmit({
      guestName: safeGuestName,
      recordingChoice: safeRecordingChoice,
      selectedDate,
      selectedTime,
    })

    setIsFinalModalOpen(true)
  }

  function handlePrimaryAction() {
    if (currentStep === 0) {
      handleGuestNameContinue()
      return
    }

    if (currentStep === finalStepIndex) {
      return
    }

    setCurrentStep((step) => Math.max(0, step - 1))
  }

  function getPrimaryActionLabel() {
    if (currentStep === 0) {
      return t('encuentros.bookingWizardContinue')
    }

    if (currentStep < finalStepIndex) {
      return t('encuentros.bookingWizardBack')
    }

    return 'De acuerdo'
  }

  async function handleFinalizeReservation() {
    await handleSubmit({ preventDefault() {} })
  }

  function handleCloseFinalModal() {
    setIsFinalModalOpen(false)
    onCloseRef.current?.()
  }

  const recordingChoiceLabel = safeRecordingChoice === 'recording' ? 'Si' : 'No'

  return (
    <div className="encuentros-booking-modal" role="presentation">
      <button
        type="button"
        className="encuentros-booking-modal-backdrop"
        onClick={onClose}
        aria-label={t('encuentros.bookingWizardClose')}
      />

      <section
        className="encuentros-booking-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="encuentros-booking-modal-title"
      >
        <div className="encuentros-booking-modal-head">
          <div className="encuentros-booking-modal-copy">
            <p className="section-kicker">{booking?.bookingPageEyebrow || t('encuentros.bookingPageEyebrow')}</p>
            <h2 id="encuentros-booking-modal-title">
              {booking?.bookingWizardTitle || 'Concreta el encuentro'}
            </h2>
            {modelProfile?.displayName ? (
              <p className="encuentros-booking-modal-model">
                <strong>{modelProfile.displayName}</strong>
                {[modelProfile.age ? `${modelProfile.age} años` : '', modelProfile.city, modelProfile.nationality]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            ) : null}
          </div>
        </div>

        <div className="encuentros-booking-modal-progress" role="list" aria-label={t('encuentros.bookingWizardTitle')}>
          {steps.map((stepLabel, index) => {
            const isActive = index === currentStep
            const isReachable = index <= maxStepReached

            return (
              <button
                key={stepLabel}
                type="button"
                className={isActive ? 'encuentros-booking-step is-active' : 'encuentros-booking-step'}
                onClick={() => goToStep(index)}
                disabled={!isReachable}
                aria-current={isActive ? 'step' : undefined}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{stepLabel}</strong>
              </button>
            )
          })}
        </div>

        <form className="encuentros-booking-modal-body" onSubmit={handleSubmit}>
          <div className="encuentros-booking-modal-main">
            {showIdentityStep && currentStep === identityStepIndex ? (
              <div className="booking-identity-block">
                <div className="booking-choice-copy">
                  <h3>{t('encuentros.bookingWizardStepIdentityTitle')}</h3>
                </div>
                <label className="encuentros-booking-identity-field">
                  <span>{t('encuentros.bookingWizardGuestName')}</span>
                  <input
                    className="encuentros-booking-guest-name"
                    type="text"
                    value={selectedGuestName}
                    onChange={(event) => handleGuestNameChange(event.target.value)}
                    placeholder={t('encuentros.bookingWizardGuestNamePlaceholder')}
                    autoComplete="name"
                    maxLength={80}
                  />
                </label>
                {validationMessage ? <p className="admin-error encuentros-booking-error">{validationMessage}</p> : null}
              </div>
            ) : null}

            {showRecordingStep && currentStep === recordingStepIndex ? (
              <div className="booking-choice-block booking-choice-block-intro">
                <div className="booking-choice-copy">
                  <h3>{booking?.recordingPromptTitle || t('encuentros.recordingPromptTitle')}</h3>
                  <p>{booking?.recordingPromptDescription || t('encuentros.recordingPromptDescription')}</p>
                </div>
                <div className="booking-choice-grid" role="radiogroup" aria-label={t('encuentros.recordingSelection')}>
                  <button
                    type="button"
                    className={
                      safeRecordingChoice === 'standard'
                        ? 'booking-choice-card is-active'
                        : 'booking-choice-card'
                    }
                    onClick={() => handleRecordingSelection('standard')}
                    aria-pressed={safeRecordingChoice === 'standard'}
                  >
                    <span>{booking?.recordingNoLabel || t('encuentros.recordingNo')}</span>
                  </button>

                  <button
                    type="button"
                    className={
                      safeRecordingChoice === 'recording'
                        ? 'booking-choice-card is-active'
                        : 'booking-choice-card'
                    }
                    onClick={() => handleRecordingSelection('recording')}
                    aria-pressed={safeRecordingChoice === 'recording'}
                  >
                    <span>{booking?.recordingYesLabel || t('encuentros.recordingYes')}</span>
                  </button>
                </div>
              </div>
            ) : null}

            {currentStep === dateStepIndex ? (
              <div className="booking-calendar-block">
                <div className="booking-block-label">
                  <span>{t('encuentros.selectDate')}</span>
                  <small>{selectedDay ? formatShortDateLabel(selectedDay.value, dateLocale) : ''}</small>
                </div>
                <div className="booking-calendar" role="listbox" aria-label={t('encuentros.selectDate')}>
                  {bookingDays.map((day) => {
                    const isActive = selectedDate === day.value

                    return (
                      <button
                        key={day.value}
                        className={isActive ? 'booking-day is-active' : 'booking-day'}
                        type="button"
                        onClick={() => handleDateSelection(day.value)}
                        aria-pressed={isActive}
                      >
                        <span>{new Intl.DateTimeFormat(dateLocale, { weekday: 'short' }).format(day.date)}</span>
                        <strong>{new Intl.DateTimeFormat(dateLocale, { day: 'numeric' }).format(day.date)}</strong>
                        <small>{formatShortDateLabel(day.value, dateLocale)}</small>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {currentStep === timeStepIndex ? (
              <div className="booking-time-block">
                <div className="booking-block-label">
                  <span>{t('encuentros.selectTime')}</span>
                </div>
                <div className="booking-time-grid" role="listbox" aria-label={t('encuentros.selectTime')}>
                  {bookingTimes.map((time) => {
                    const isActive = selectedTime === time

                    return (
                      <button
                        key={time}
                        className={isActive ? 'booking-time is-active' : 'booking-time'}
                        type="button"
                        onClick={() => handleTimeSelection(time)}
                        aria-pressed={isActive}
                      >
                        {time}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {currentStep === finalStepIndex ? (
              <div className="encuentros-booking-summary-shell">
                <div className="encuentros-booking-summary-head">
                  <p className="section-kicker">RESUMEN</p>
                </div>

                <div className="encuentros-booking-summary-payment-card">
                  <div className="encuentros-booking-summary-payment-lead">
                    <p>
                      Para completar tu reserva y por seguridad de ambos, realiza el PLIN o YAPE al numero
                      indicado abajo.
                    </p>
                  </div>

                  <div className="encuentros-booking-summary-payment-content">
                    <div className="encuentros-booking-summary-payment-main encuentros-booking-summary-payment-panel">
                      <div className="encuentros-booking-summary-payment-top">
                        <div className="encuentros-booking-summary-payment-advance">
                          <span>ADELANTO</span>
                          <strong>{pricing?.advanceLabel || booking?.advanceLabel || 'S/10.00'}</strong>
                        </div>

                        <div className="encuentros-booking-summary-payment-hotel">
                          <span>EN EL HOTEL</span>
                          <strong>{pricing?.remainingLabel || pricing?.effectiveLabel || booking?.priceLabel || 'S/160'}</strong>
                        </div>
                      </div>

                      <div className="encuentros-booking-summary-payment-recipient">
                        <span>Numero de pago</span>
                        <strong>+51931756041</strong>
                        <small>A nombre de Silvia ****</small>
                        <div className="encuentros-booking-summary-payment-methods">
                          <span>Metodos habilitados</span>
                          <strong className="encuentros-booking-summary-payment-method-value">PLIN / YAPE</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="encuentros-booking-summary-details-card">
                  <div className="encuentros-booking-summary-details-grid encuentros-booking-summary-details-grid-compact">
                    <div className="encuentros-booking-summary-details-row encuentros-booking-summary-details-row-inline">
                      <span>Nombre</span>
                      <strong>{showIdentityStep ? selectedGuestName || 'Sin nombre' : currentUserName || 'Sin nombre'}</strong>
                      <span>Fecha</span>
                      <strong>{selectedDay ? formatShortDateLabel(selectedDay.value, dateLocale) : 'Sin fecha'}</strong>
                    </div>
                    <div className="encuentros-booking-summary-details-row encuentros-booking-summary-details-row-inline">
                      <span>Hora</span>
                      <strong>{selectedTime || 'Sin hora'}</strong>
                      <span>Grabacion</span>
                      <strong>{recordingChoiceLabel}</strong>
                    </div>
                  </div>
                </div>

              </div>
            ) : null}

            {error ? <p className="admin-error encuentros-booking-error">{error}</p> : null}
          </div>

          <div className="encuentros-booking-modal-footer">
            {currentStep === finalStepIndex ? (
              <div className="encuentros-booking-modal-footer-dual">
                <button
                  className="hero-primary-cta encuentros-booking-primary-action"
                  type="button"
                  onClick={handleFinalizeReservation}
                  disabled={isSubmitting}
                >
                  De acuerdo
                </button>
                <button
                  className="hero-secondary-cta encuentros-booking-secondary-action"
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                className="hero-primary-cta encuentros-booking-primary-action"
                type="button"
                onClick={handlePrimaryAction}
                disabled={isSubmitting}
              >
                {getPrimaryActionLabel()}
              </button>
            )}
          </div>
        </form>

        {isFinalModalOpen ? (
          <div className="encuentros-booking-final-modal" role="presentation">
            <button
              type="button"
              className="encuentros-booking-final-modal-backdrop"
              onClick={handleCloseFinalModal}
              aria-label={t('encuentros.bookingWizardClose')}
            />
            <section
              className="encuentros-booking-final-modal-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="encuentros-booking-final-modal-title"
            >
              <div className="encuentros-booking-final-modal-copy">
                <p className="section-kicker">CONFIRMADO</p>
                <h3 id="encuentros-booking-final-modal-title">Reserva registrada</h3>
                <p>
                  Perfecto. Apenas me envíes la captura de la transacción confirmaré tu cita y estaré
                  pendiente de la hora indicada.
                </p>
              </div>
              <button
                type="button"
                className="hero-primary-cta encuentros-booking-final-modal-action"
                onClick={handleCloseFinalModal}
              >
                Entendido
              </button>
            </section>
          </div>
        ) : null}
      </section>
    </div>
  )
}
