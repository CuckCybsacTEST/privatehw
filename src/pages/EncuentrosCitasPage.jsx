import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AtmosphericBackdrop } from '../components/AtmosphericBackdrop'
import { EncuentrosBookingWizardModal } from '../components/EncuentrosBookingWizardModal'
import { fetchEncuentrosBookingPricing, fetchEncuentrosModel } from '../lib/supabase'
import { useAppState } from '../state/AppState'
import {
  buildBookingDays,
  buildBookingTimes,
  buildEncuentrosBookingPricing,
  normalizeRecordingChoice,
} from '../utils/encuentrosBooking'

export function EncuentrosCitasPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { slug } = useParams()
  const { siteContent, createEncounterReservationRequest } = useAppState()
  const { i18n, t } = useTranslation()
  const dateLocale = i18n.resolvedLanguage === 'en' ? 'en-US' : 'es-PE'
  const [model, setModel] = useState(null)
  const [modelLoading, setModelLoading] = useState(Boolean(slug))
  const [modelError, setModelError] = useState('')
  const [isBookingWizardOpen, setIsBookingWizardOpen] = useState(false)
  const [recordingChoice, setRecordingChoice] = useState(() =>
    normalizeRecordingChoice(searchParams.get('recording') || 'standard'),
  )
  const [error, setError] = useState('')
  const pageContent = model?.content || siteContent
  const booking = pageContent.encuentrosBooking || {}
  const modelSlug = model?.slug || slug || ''
  const bookingDays = useMemo(() => buildBookingDays(booking), [booking])
  const bookingTimes = useMemo(() => buildBookingTimes(booking), [booking])
  const fallbackPricing = useMemo(
    () => buildEncuentrosBookingPricing(pageContent, recordingChoice, dateLocale),
    [dateLocale, pageContent, recordingChoice],
  )
  const [pricing, setPricing] = useState(() => fallbackPricing)

  useEffect(() => {
    let cancelled = false

    if (!slug) {
      setModel(null)
      setModelLoading(false)
      setModelError('')
      return undefined
    }

    setModelLoading(true)
    setModelError('')

    fetchEncuentrosModel(slug)
      .then((nextModel) => {
        if (!cancelled) {
          setModel(nextModel)
        }
      })
      .catch((nextError) => {
        if (!cancelled) {
          setModel(null)
          setModelError(nextError?.message || t('encuentros.bookingError'))
        }
      })
      .finally(() => {
        if (!cancelled) {
          setModelLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [slug, t])

  useEffect(() => {
    let isCancelled = false

    setPricing(fallbackPricing)

    fetchEncuentrosBookingPricing(recordingChoice, modelSlug)
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
  }, [fallbackPricing, modelSlug, recordingChoice])

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
          modelSlug,
        })
      } catch (nextError) {
        setError(nextError.message || t('encuentros.bookingError'))
      }
    },
    [createEncounterReservationRequest, modelSlug, pricing, t],
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

      {modelLoading ? (
        <div className="encuentros-citas-shell encuentros-citas-shell-single">
          <section className="encuentros-citas-form encuentros-citas-form-single">
            <p>{t('loading.general')}</p>
          </section>
        </div>
      ) : null}

      {slug && modelError && !model ? (
        <div className="encuentros-citas-shell encuentros-citas-shell-single">
          <section className="encuentros-citas-form encuentros-citas-form-single">
            <p>{modelError}</p>
            <Link to="/encuentros" className="hero-secondary-cta">
              Volver al catalogo
            </Link>
          </section>
        </div>
      ) : null}

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
