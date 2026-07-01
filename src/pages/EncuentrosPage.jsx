import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  AiOutlineCalendar,
  AiOutlineCheckCircle,
  AiFillCrown,
  AiOutlineHome,
  AiOutlinePicture,
  AiOutlineRight,
} from 'react-icons/ai'
import {
  HiOutlineCalendar,
  HiOutlineShieldCheck,
} from 'react-icons/hi'
import { defaultSiteContent } from '../data/defaultSiteContent'
import { AtmosphericBackdrop } from '../components/AtmosphericBackdrop'
import { EncuentrosBookingWizardModal } from '../components/EncuentrosBookingWizardModal'
import { EncuentrosGalleryModal } from '../components/EncuentrosGalleryModal'
import { fetchEncuentrosBookingPricing, fetchEncuentrosModel } from '../lib/supabase'
import { useAppState } from '../state/AppState'
import {
  buildBookingDays,
  buildBookingTimes,
  buildEncuentrosBookingPricing,
  normalizeRecordingChoice,
} from '../utils/encuentrosBooking'
import {
  fetchGalleryReactionCounts,
  getOrCreateGalleryVisitorKey,
  readGalleryReactionState,
  saveGalleryReaction,
  writeGalleryReactionState,
} from '../utils/encuentrosGalleryReactions'
import { normalizeEncounterGallerySlides } from '../utils/encuentrosGallery'

function parsePriceValue(value) {
  const parsed = Number.parseFloat(String(value || '').replace(/[^\d.,]/g, '').replace(',', '.'))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function formatPriceValue(value) {
  if (!Number.isFinite(value)) {
    return 'S/0'
  }

  return Number.isInteger(value) ? `S/${value}` : `S/${value.toFixed(2)}`
}

function PriceText({ value, className = '' }) {
  const amount = parsePriceValue(value)
  const formatted = amount > 0 ? formatPriceValue(amount) : String(value || '')
  const amountText = formatted.startsWith('S/') ? formatted.slice(2) : formatted

  return (
    <span className={['encuentros-screen-money', className].filter(Boolean).join(' ')}>
      <span className="encuentros-screen-money-symbol">S/</span>
      <span className="encuentros-screen-money-amount">{amountText}</span>
    </span>
  )
}

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

function ScreenCard({ className = '', children, as: Tag = 'section', ...props }) {
  return (
    <Tag className={['encuentros-screen-card', className].filter(Boolean).join(' ')} {...props}>
      {children}
    </Tag>
  )
}

function EncuentrosBottomNav({
  activeKey,
  hasGalleryImages,
  onHome,
  onOpenGallery,
  onOpenWizard,
  galleryLabel,
  bookingLabel,
}) {
  const nav = (
    <div className="encuentros-screen-bottom-nav-shell">
      <nav className="encuentros-screen-bottom-nav" aria-label={bookingLabel}>
        <button
          type="button"
          style={getEncounterNavToneStyles('home')}
          className={
            activeKey === 'home'
              ? 'encuentros-screen-bottom-nav-item is-active'
              : 'encuentros-screen-bottom-nav-item'
          }
          onClick={onHome}
          aria-label="Inicio"
          title="Inicio"
        >
          <AiOutlineHome aria-hidden="true" />
          <span>Inicio</span>
        </button>

        {hasGalleryImages ? (
          <button
            type="button"
            style={getEncounterNavToneStyles('gallery')}
            className={
              activeKey === 'gallery'
                ? 'encuentros-screen-bottom-nav-item is-active'
                : 'encuentros-screen-bottom-nav-item'
            }
            onClick={onOpenGallery}
            aria-label={galleryLabel}
            title={galleryLabel}
          >
            <AiOutlinePicture aria-hidden="true" />
            <span>{galleryLabel}</span>
          </button>
        ) : null}

        <button
          type="button"
          style={getEncounterNavToneStyles('booking')}
          className={
            activeKey === 'booking'
              ? 'encuentros-screen-bottom-nav-item encuentros-screen-bottom-nav-item-primary is-active'
              : 'encuentros-screen-bottom-nav-item encuentros-screen-bottom-nav-item-primary'
          }
          onClick={onOpenWizard}
          aria-label={bookingLabel}
          title={bookingLabel}
        >
          <AiOutlineCalendar aria-hidden="true" />
          <span>{bookingLabel}</span>
        </button>
      </nav>
    </div>
  )

  if (typeof document === 'undefined') {
    return nav
  }

  return createPortal(nav, document.body)
}

function getEncounterNavToneStyles(tone) {
  const tones = {
    home: {
      color: 'var(--color-primary-hover)',
    },
    gallery: {
      color: 'var(--color-warning)',
    },
    booking: {
      color: 'var(--color-accent-fire)',
    },
  }

  const selectedTone = tones[tone] || tones.home

  return {
    '--encuentros-nav-item-color': selectedTone.color,
  }
}

export function EncuentrosPage() {
  const { siteContent, createEncounterReservationRequest } = useAppState()
  const { slug } = useParams()
  const { i18n, t } = useTranslation()
  const dateLocale = i18n.resolvedLanguage === 'en' ? 'en-US' : 'es-PE'
  const [model, setModel] = useState(null)
  const [modelLoading, setModelLoading] = useState(Boolean(slug))
  const [modelError, setModelError] = useState('')
  const [isGalleryOpen, setIsGalleryOpen] = useState(false)
  const [isBookingWizardOpen, setIsBookingWizardOpen] = useState(false)
  const [activeBottomNavKey, setActiveBottomNavKey] = useState('home')
  const [recordingChoice, setRecordingChoice] = useState('standard')
  const [error, setError] = useState('')
  const pageContent = model?.content || siteContent
  const booking = pageContent.encuentrosBooking || {}
  const modelSlug = model?.slug || slug || ''
  const modelDisplayName =
    model?.displayName ||
    booking.galleryTitle ||
    pageContent.heroTitle ||
    t('encuentros.bookingPageTitle')
  const bookingDays = useMemo(() => buildBookingDays(booking), [booking])
  const bookingTimes = useMemo(() => buildBookingTimes(booking), [booking])
  const fallbackPricing = useMemo(
    () => buildEncuentrosBookingPricing(pageContent, recordingChoice, dateLocale),
    [dateLocale, pageContent, recordingChoice],
  )
  const [pricing, setPricing] = useState(() => fallbackPricing)
  const presencialBasePrice = parsePriceValue(pageContent.presencialPrice)
  const recordingDiscountPercent =
    Number.parseFloat(String(booking.recordingDiscountPercent || '0').replace(',', '.')) || 0
  const recordingPrice =
    presencialBasePrice > 0 && recordingDiscountPercent > 0
      ? Math.max(0, presencialBasePrice - presencialBasePrice * (recordingDiscountPercent / 100))
      : 0
  const topCarouselImages = Array.isArray(pageContent.topCarouselImages) ? pageContent.topCarouselImages : []
  const availableDates = Array.isArray(booking.availableDates) ? booking.availableDates.filter(Boolean) : []
  const extraServices = Array.isArray(pageContent.extraItems) ? pageContent.extraItems.filter(Boolean) : []
  const presencialFeatures = Array.isArray(pageContent.presencialFeatures)
    ? pageContent.presencialFeatures.filter(Boolean).slice(0, 6)
    : []
  const heroAvailableDates = useMemo(
    () =>
      availableDates.slice(0, 4).map((dateValue) => ({
        value: dateValue,
        label: formatShortDateLabel(dateValue, dateLocale),
      })),
    [availableDates, dateLocale],
  )
  const hasGalleryImages = topCarouselImages.length > 0
  const showRecordingDiscount = recordingDiscountPercent > 0 && recordingPrice > 0
  const recordingDiscountPercentValue =
    recordingDiscountPercent % 1 === 0
      ? `${recordingDiscountPercent.toFixed(0)}% OFF`
      : `${recordingDiscountPercent.toFixed(1)}% OFF`
  const normalizedTopCarouselImages = useMemo(
    () => normalizeEncounterGallerySlides(pageContent.topCarouselImages || []),
    [pageContent.topCarouselImages],
  )
  const galleryPhotoIds = useMemo(
    () => normalizedTopCarouselImages.map((slide) => slide.id).filter(Boolean),
    [normalizedTopCarouselImages],
  )
  const heroTopBar =
    (pageContent.topBarDesktopHighlight || pageContent.topBarDesktop || t('nav.encuentros')).length > 42
      ? defaultSiteContent.topBarDesktopHighlight
      : pageContent.topBarDesktopHighlight || pageContent.topBarDesktop || t('nav.encuentros')
  const [galleryReactionCounts, setGalleryReactionCounts] = useState({})
  const [galleryReactionVotes, setGalleryReactionVotes] = useState(() => readGalleryReactionState())
  const galleryVisitorKey = useMemo(() => getOrCreateGalleryVisitorKey(), [])

  useEffect(() => {
    let isCancelled = false

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
        if (!isCancelled) {
          setModel(nextModel)
        }
      })
      .catch((nextError) => {
        if (!isCancelled) {
          setModel(null)
          setModelError(nextError?.message || t('encuentros.bookingError'))
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setModelLoading(false)
        }
      })

    return () => {
      isCancelled = true
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

  const openGallery = useCallback(() => {
    if (!hasGalleryImages) {
      return
    }

    setIsBookingWizardOpen(false)
    setActiveBottomNavKey('gallery')
    setIsGalleryOpen(true)
  }, [hasGalleryImages])

  const closeGallery = useCallback(() => {
    setIsGalleryOpen(false)
    setActiveBottomNavKey('home')
  }, [])

  const handleOpenWizard = useCallback(() => {
    setError('')
    setIsGalleryOpen(false)
    setActiveBottomNavKey('booking')
    setIsBookingWizardOpen(true)
  }, [])

  const handleScrollToTop = useCallback(() => {
    setIsGalleryOpen(false)
    setIsBookingWizardOpen(false)
    setActiveBottomNavKey('home')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleCloseWizard = useCallback(() => {
    setIsBookingWizardOpen(false)
    setActiveBottomNavKey('home')
  }, [])

  const handleRecordingChoiceChange = useCallback((choice) => {
    setRecordingChoice(normalizeRecordingChoice(choice))
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
        setActiveBottomNavKey('home')
      } catch (nextError) {
        setError(nextError.message || t('encuentros.bookingError'))
      }
    },
    [createEncounterReservationRequest, modelSlug, pricing, t],
  )

  useEffect(() => {
    if (!hasGalleryImages && isGalleryOpen) {
      setIsGalleryOpen(false)
    }
  }, [hasGalleryImages, isGalleryOpen])

  useEffect(() => {
    let isCancelled = false

    if (!galleryPhotoIds.length) {
      setGalleryReactionCounts({})
      return undefined
    }

    fetchGalleryReactionCounts(galleryPhotoIds)
      .then((items) => {
        if (isCancelled) {
          return
        }

        const nextCounts = {}
        items.forEach((item) => {
          if (!item?.photoId) {
            return
          }

          nextCounts[item.photoId] = {
            likes: Number(item.likes) || 0,
            dislikes: Number(item.dislikes) || 0,
          }
        })

        setGalleryReactionCounts(nextCounts)
      })
      .catch(() => {
        if (!isCancelled) {
          setGalleryReactionCounts({})
        }
      })

    return () => {
      isCancelled = true
    }
  }, [galleryPhotoIds])

  const handleGalleryReaction = useCallback(
    async (photoId, reaction) => {
      const normalizedPhotoId = String(photoId || '').trim()
      const normalizedReaction = reaction === 'like' || reaction === 'dislike' ? reaction : ''

      if (!normalizedPhotoId) {
        return
      }

      const nextReaction = galleryReactionVotes[normalizedPhotoId] === normalizedReaction ? '' : normalizedReaction
      const previousReaction = galleryReactionVotes[normalizedPhotoId] || ''
      const previousCounts = galleryReactionCounts[normalizedPhotoId] || { likes: 0, dislikes: 0 }
      const visitorState = { ...galleryReactionVotes, [normalizedPhotoId]: nextReaction }

      const nextCounts = {
        ...galleryReactionCounts,
        [normalizedPhotoId]: {
          likes:
            previousCounts.likes +
            (nextReaction === 'like' ? 1 : 0) -
            (previousReaction === 'like' ? 1 : 0),
          dislikes:
            previousCounts.dislikes +
            (nextReaction === 'dislike' ? 1 : 0) -
            (previousReaction === 'dislike' ? 1 : 0),
        },
      }

      setGalleryReactionVotes(visitorState)
      setGalleryReactionCounts(nextCounts)
      writeGalleryReactionState(visitorState)

      try {
        const result = await saveGalleryReaction({
          photoId: normalizedPhotoId,
          reaction: nextReaction,
          visitorKey: galleryVisitorKey,
        })

        if (!result?.item) {
          return
        }

        setGalleryReactionCounts((current) => ({
          ...current,
          [normalizedPhotoId]: {
            likes: Number(result.item.likes) || 0,
            dislikes: Number(result.item.dislikes) || 0,
          },
        }))
      } catch {
        const rolledBackVotes = { ...galleryReactionVotes, [normalizedPhotoId]: previousReaction }
        setGalleryReactionVotes(rolledBackVotes)
        setGalleryReactionCounts({
          ...galleryReactionCounts,
          [normalizedPhotoId]: previousCounts,
        })
        writeGalleryReactionState(rolledBackVotes)
      }
    },
    [galleryReactionCounts, galleryReactionVotes, galleryVisitorKey],
  )

  if (modelLoading) {
    return (
      <main className="creator-home encuentros-page encuentros-page-loading">
        <AtmosphericBackdrop
          variant="premium"
          intensity="soft"
          glowPosition="center-right"
          grain={false}
          withVignette={false}
          className="encuentros-page-backdrop"
        />
        <div className="encuentros-screen-shell">
          <ScreenCard className="encuentros-screen-price-card" as="article">
            <p className="section-kicker">{t('encuentros.bookingPageEyebrow')}</p>
            <h1>{t('loading.general')}</h1>
            <p className="encuentros-screen-lead">{t('loading.subtitle')}</p>
          </ScreenCard>
        </div>
      </main>
    )
  }

  if (slug && modelError && !model) {
    return (
      <main className="creator-home encuentros-page encuentros-page-loading">
        <AtmosphericBackdrop
          variant="premium"
          intensity="soft"
          glowPosition="center-right"
          grain={false}
          withVignette={false}
          className="encuentros-page-backdrop"
        />
        <div className="encuentros-screen-shell">
          <ScreenCard className="encuentros-screen-price-card" as="article">
            <p className="section-kicker">{t('encuentros.bookingPageEyebrow')}</p>
            <h1>{t('encuentros.bookingError')}</h1>
            <p className="encuentros-screen-lead">{modelError}</p>
            <div className="encuentros-screen-actions">
              <Link className="encuentros-screen-action encuentros-screen-action-primary" to="/encuentros">
                <span>Volver al catalogo</span>
              </Link>
            </div>
          </ScreenCard>
        </div>
      </main>
    )
  }

  return (
    <main className="encuentros-page-modern encuentros-screen">
      <AtmosphericBackdrop
        variant="premium"
        intensity="soft"
        glowPosition="center-right"
        grain={false}
        withVignette={false}
        className="encuentros-page-backdrop"
      />

      <div className="encuentros-screen-shell">
        <section className="encuentros-screen-hero" aria-labelledby="encuentros-screen-title">
          <div className="encuentros-screen-topline">
            <span className="encuentros-screen-status-pill">
              <HiOutlineShieldCheck aria-hidden="true" />
              <span>{heroTopBar}</span>
            </span>
          </div>

          <div className="encuentros-screen-title-row">
            <h1 id="encuentros-screen-title">{pageContent.heroTitle || modelDisplayName || t('encuentros.bookingPageTitle')}</h1>
          </div>

          <p className="encuentros-screen-lead">{pageContent.heroDescription}</p>
          <div className="encuentros-screen-trust-row" aria-label={t('encuentros.bookingAvailability')}>
            {heroAvailableDates.map((day) => (
              <span className="encuentros-screen-trust-chip encuentros-screen-trust-chip-date" key={day.value}>
                <HiOutlineCalendar aria-hidden="true" />
                <span>{day.label}</span>
              </span>
            ))}
          </div>

        </section>

        <ScreenCard className="encuentros-screen-price-card" as="article">
          <div className="encuentros-screen-card-badge encuentros-screen-card-badge-price">
            <AiOutlineCalendar aria-hidden="true" />
          </div>

          <div className="encuentros-screen-price-copy">
            <div className="encuentros-screen-price-topline">
              <div className="encuentros-screen-price-kicker">
                <span>{pageContent.presencialTitle || t('encuentros.dashboardConfigPrice')}</span>
              </div>

              <div className="encuentros-screen-price-value-row">
                <strong className="encuentros-screen-price-value">
                  <PriceText value={pageContent.presencialPrice || presencialBasePrice || '150'} />
                </strong>
                <span className="encuentros-screen-price-unit">
                  {pageContent.presencialUnit || t('encuentros.dashboardConfigWindow')}
                </span>
              </div>
            </div>

            {pageContent.presencialDescription ? (
              <p className="encuentros-screen-presencial-copy">{pageContent.presencialDescription}</p>
            ) : null}

            {pageContent.presencialBenefitTitle || pageContent.presencialBenefitText ? (
              <div className="encuentros-screen-inline-discount">
                <span className="encuentros-screen-inline-discount-label">
                  {pageContent.presencialBenefitTitle || 'Suscriptores Loverfans'}
                </span>
                <span className="encuentros-screen-inline-discount-value">
                  {pageContent.presencialBenefitText || '20% OFF'}
                </span>
              </div>
            ) : null}

            {showRecordingDiscount ? (
              <div className="encuentros-screen-inline-discount">
                <span className="encuentros-screen-inline-discount-label">
                  Grabación
                </span>
                <span className="encuentros-screen-inline-discount-value">
                  {recordingDiscountPercentValue}
                </span>
              </div>
            ) : null}

            {presencialFeatures.length ? (
              <ul className="encuentros-screen-presencial-list encuentros-screen-presencial-list-compact" aria-label={t('admin.content.presencialFeatures')}>
                {presencialFeatures.map((item) => (
                  <li key={item}>
                    <AiOutlineCheckCircle aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </ScreenCard>

        {extraServices.length ? (
          <ScreenCard className="encuentros-screen-services-card" as="article">
            <div className="encuentros-screen-card-badge encuentros-screen-card-badge-services">
              <AiFillCrown aria-hidden="true" />
            </div>

            <div className="encuentros-screen-services-copy">
              <div className="encuentros-screen-services-topline">
                <div className="encuentros-screen-services-kicker">
                  <span>{pageContent.extraTitle || t('admin.content.extraList')}</span>
                </div>
              </div>

              <ul
                className="encuentros-screen-services-list"
                aria-label={pageContent.extraTitle || t('admin.content.extraList')}
              >
                {extraServices.map((item) => (
                  <li key={item}>
                    <AiOutlineCheckCircle aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {pageContent.extraFromLabel ? (
                <div className="encuentros-screen-services-footer">
                  <span>{pageContent.extraFromLabel}</span>
                  <strong>
                    <PriceText value={pageContent.extraPrice} className="encuentros-screen-services-price" />
                  </strong>
                </div>
              ) : null}
            </div>
          </ScreenCard>
        ) : null}

        <div className="encuentros-screen-actions" aria-label={t('encuentros.bookingWizardTitle')}>
          {hasGalleryImages ? (
            <button
              type="button"
              className="encuentros-screen-action encuentros-screen-action-secondary"
              onClick={openGallery}
            >
              <AiOutlinePicture aria-hidden="true" />
              <span>{t('encuentros.galleryOpen')}</span>
              <AiOutlineRight aria-hidden="true" />
            </button>
          ) : null}

          <button type="button" className="encuentros-screen-action encuentros-screen-action-primary" onClick={handleOpenWizard}>
            <AiOutlineCalendar aria-hidden="true" />
            <span>{t('encuentros.bookingPageTitle')}</span>
            <AiOutlineRight aria-hidden="true" />
          </button>
        </div>

        <EncuentrosBottomNav
          activeKey={activeBottomNavKey}
          hasGalleryImages={hasGalleryImages}
          onHome={handleScrollToTop}
          onOpenGallery={openGallery}
          onOpenWizard={handleOpenWizard}
          galleryLabel={t('encuentros.galleryOpen')}
          bookingLabel={t('encuentros.bookingPageTitle')}
        />
      </div>

      <EncuentrosGalleryModal
        open={isGalleryOpen}
        images={normalizedTopCarouselImages}
        title={booking.galleryTitle || pageContent.heroTitle || t('encuentros.galleryTitle')}
        subtitle={booking.gallerySubtitle || t('encuentros.gallerySubtitle')}
        exclusiveTitle={booking.galleryExclusiveTitle || t('encuentros.galleryExclusiveTitle')}
        exclusiveDescription={
          booking.galleryExclusiveDescription || t('encuentros.galleryExclusiveDescription')
        }
        reactionCounts={galleryReactionCounts}
        reactionVotes={galleryReactionVotes}
        onReact={handleGalleryReaction}
        onClose={closeGallery}
        onReserve={handleOpenWizard}
      />

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
