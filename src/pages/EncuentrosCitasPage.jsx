import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AtmosphericBackdrop } from '../components/AtmosphericBackdrop'
import { EncuentrosBookingWizardModal } from '../components/EncuentrosBookingWizardModal'
import { fetchEncuentrosBookingPricing } from '../lib/supabase'
import { useAppState } from '../state/AppState'
import {
  buildBookingDays,
  buildBookingTimes,
  buildEncuentrosBookingPricing,
  normalizeRecordingChoice,
} from '../utils/encuentrosBooking'

export function EncuentrosCitasPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { siteContent, createEncounterReservationRequest } = useAppState()
  const { i18n, t } = useTranslation()
  const booking = siteContent.encuentrosBooking || {}
  const dateLocale = i18n.resolvedLanguage === 'en' ? 'en-US' : 'es-PE'
  const bookingDays = useMemo(() => buildBookingDays(booking), [booking])
  const bookingTimes = useMemo(() => buildBookingTimes(booking), [booking])
  const [isBookingWizardOpen, setIsBookingWizardOpen] = useState(false)
  const [recordingChoice, setRecordingChoice] = useState(() =>
    normalizeRecordingChoice(searchParams.get('recording') || 'standard'),
  )
  const [error, setError] = useState('')
  const fallbackPricing = useMemo(
    () => buildEncuentrosBookingPricing(siteContent, recordingChoice, dateLocale),
    [dateLocale, recordingChoice, siteContent],
  )
  const [pricing, setPricing] = useState(() => fallbackPricing)

  useEffect(() => {
    let isCancelled = false

    setPricing(fallbackPricing)

    fetchEncuentrosBookingPricing(recordingChoice)
      .then((nextPricing) => {
        if (!isCancelled && nextPricing) {
          setPricing(nextPricing)
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setPricing(fallbackPricing)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [fallbackPricing, recordingChoice])

  useEffect(() => {
    const queryRecordingChoice = normalizeRecordingChoice(searchParams.get('recording') || 'standard')
    if (queryRecordingChoice !== recordingChoice) {
      setRecordingChoice(queryRecordingChoice)
    }
  }, [recordingChoice, searchParams])

  const handleRecordingChoiceChange = useCallback(
    (choice) => {
      const nextChoice = normalizeRecordingChoice(choice)
      setRecordingChoice(nextChoice)
      setSearchParams((current) => {
        const next = new URLSearchParams(current)
        next.set('recording', nextChoice)
        return next
      }, { replace: true })
    },
    [setSearchParams],
  )

  const handleOpenWizard = useCallback(() => {
    setError('')
    setIsBookingWizardOpen(true)
  }, [])

  const handleCloseWizard = useCallback(() => {
    setIsBookingWizardOpen(false)
  }, [])

  const handleReservationSubmit = useCallback(
    async ({ guestName, selectedDate, selectedTime, recordingChoice: choice }) => {
      setError('')

      if (!guestName) {
        setError(t('encuentros.bookingWizardGuestNameRequired'))
        return
      }

      if (!selectedDate || !selectedTime) {
        setError(t('encuentros.selectDateTime'))
        return
      }

      try {
        await createEncounterReservationRequest({
          guestName,
          selectedDate,
          selectedTime,
          recordingChoice: choice,
          pricing,
        })
      } catch (nextError) {
        setError(nextError.message || t('encuentros.bookingError'))
      }
    },
    [createEncounterReservationRequest, pricing, t],
  )

  return (
    <main className="creator-home encuentros-citas-page">
      <AtmosphericBackdrop
        variant="editorial"
        intensity="soft"
        glowPosition="center-right"
        grain={false}
        withVignette={false}
        className="encuentros-citas-backdrop"
      />

      <div className="encuentros-citas-shell encuentros-citas-shell-single">
        <section className="encuentros-citas-hero">
          <div className="encuentros-citas-hero-copy">
            <p className="section-kicker">{booking.bookingPageEyebrow || t('encuentros.bookingPageEyebrow')}</p>
            <h1>{booking.bookingPageTitle || t('encuentros.bookingPageTitle')}</h1>
            <p className="encuentros-citas-intro">{booking.bookingPageIntro || t('encuentros.bookingPageIntro')}</p>

            <div className="encuentros-citas-hero-actions">
              <button className="hero-primary-cta" type="button" onClick={handleOpenWizard}>
                {t('encuentros.goBooking')}
              </button>
              <Link to="/encuentros" className="hero-secondary-cta">
                {t('encuentros.backInfo')}
              </Link>
            </div>
          </div>

          <aside className="encuentros-citas-hero-card" aria-label={t('encuentros.bookingWizardTitle')}>
            <div className="encuentros-citas-hero-card-head">
              <p className="section-kicker">{booking.bookingWizardTitle || t('encuentros.bookingWizardTitle')}</p>
              <h2>{pricing.effectiveLabel}</h2>
              <p>{booking.recordingSelection || t('encuentros.recordingSelection')}</p>
            </div>

            <div className="encuentros-citas-hero-stats">
              <article className="encuentros-citas-stat">
                <span>{t('encuentros.selectedDate')}</span>
                <strong>{bookingDays.length}</strong>
              </article>
              <article className="encuentros-citas-stat">
                <span>{t('encuentros.selectedTime')}</span>
                <strong>{bookingTimes.length}</strong>
              </article>
              <article className="encuentros-citas-stat">
                <span>{t('encuentros.bookingWizardAdvanceDue')}</span>
                <strong>{pricing.advanceLabel}</strong>
              </article>
              <article className="encuentros-citas-stat">
                <span>{t('encuentros.dashboardConfigSource')}</span>
                <strong>{booking.loginNote || t('encuentros.bookingLoginNote')}</strong>
              </article>
            </div>
          </aside>
        </section>
      </div>

      <EncuentrosBookingWizardModal
        open={isBookingWizardOpen}
        booking={booking}
        pricing={pricing}
        bookingDays={bookingDays}
        bookingTimes={bookingTimes}
        recordingChoice={recordingChoice}
        onRecordingChoiceChange={handleRecordingChoiceChange}
        onClose={handleCloseWizard}
        onSubmit={handleReservationSubmit}
        isSubmitting={false}
        error={error}
      />
    </main>
  )
}
