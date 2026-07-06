import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  AiOutlineCalendar,
  AiOutlineCheckCircle,
  AiFillCrown,
  AiFillFire,
  AiOutlinePicture,
  AiOutlinePauseCircle,
  AiOutlineSound,
  AiOutlineRight,
  AiOutlineUser,
} from 'react-icons/ai'
import { BiLogoTelegram, BiLogoWhatsapp } from 'react-icons/bi'
import {
  HiOutlineCalendar,
  HiOutlineShieldCheck,
} from 'react-icons/hi'
import { AtmosphericBackdrop } from '../components/AtmosphericBackdrop'
import { EncounterSocialLinksSection } from '../components/EncounterSocialLinksSection'
import { EncuentrosBookingWizardModal } from '../components/EncuentrosBookingWizardModal'
import { EncuentrosGalleryModal } from '../components/EncuentrosGalleryModal'
import { Seo } from '../components/Seo'
import { EncounterCatalogCard } from '../components/EncounterCatalogCard'
import { fetchEncuentrosBookingPricing, fetchEncuentrosModel, fetchEncuentrosModels } from '../lib/supabase'
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
import {
  getSocialNetworkKey,
  getSocialNetworkOption,
  normalizeSocialNetworkValue,
  buildWhatsAppChatUrl,
} from '../utils/socialNetworks'
import { buildCatalogCombinedFacetPath, buildCatalogFacetPath, getCatalogModelDetails } from '../utils/encuentrosCatalog'

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

function getProfileTextValue(source = {}, keys = []) {
  for (const key of keys) {
    const value = source?.[key]

    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }

    if (Number.isFinite(value) && value !== 0) {
      return String(value)
    }
  }

  return ''
}

function uniqueSocialLinks(links = []) {
  const seen = new Set()
  return (Array.isArray(links) ? links : []).filter((link) => {
    const network = String(link?.network || '').trim().toLowerCase()
    const url = String(link?.url || '').trim()
    const key = `${network}|${url}`
    if (!key || seen.has(key) || !url || link?.active === false) {
      return false
    }
    seen.add(key)
    return true
  })
}

function isContactChannelLink(link = {}) {
  const key = getSocialNetworkKey(link)
  return key === 'telegram' || key === 'whatsapp'
}

function getContactChannelIcon(link = {}) {
  const key = getSocialNetworkKey(link)

  if (key === 'whatsapp') {
    return BiLogoWhatsapp
  }

  return BiLogoTelegram
}

function buildEncounterContactChannels(pageContent = {}, socialLinks = [], t, modelDisplayName = '') {
  const whatsappPhone = getProfileTextValue(pageContent, ['whatsappPhone', 'contactPhone'])
  const whatsappUrl =
    buildWhatsAppChatUrl(whatsappPhone, modelDisplayName) ||
    getProfileTextValue(pageContent, ['whatsappUrl'])

  const primaryLinks = [
    pageContent.socialUrl
      ? {
          network: 'telegram',
          label: pageContent.socialTitle || t('footer.telegram'),
          url: pageContent.socialUrl,
          active: true,
        }
      : null,
    whatsappUrl
      ? {
          network: 'whatsapp',
          label: 'WhatsApp',
          url: whatsappUrl,
          active: true,
        }
      : null,
  ].filter(Boolean)

  return uniqueSocialLinks(
    [...primaryLinks, ...socialLinks.filter(isContactChannelLink)]
      .map((link) => ({
        ...link,
        active: link?.active !== false,
      }))
      .filter((link) => link?.url),
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

function getInitialsFromName(name = '') {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function normalizeProfileAttendanceModes(values = []) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [values])
        .flatMap((value) => String(value || '').split(/\r?\n|,/))
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  )
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
  const { session } = useAppState()
  const location = useLocation()
  const authHref = session?.accessToken
    ? `/profile?source=encuentros&model=${encodeURIComponent(location.pathname)}`
    : `/access?redirect=${encodeURIComponent(`${location.pathname}${location.search || ''}`)}`
  const authLabel = session?.accessToken ? 'Perfil' : 'Acceder'
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
          <AiFillFire aria-hidden="true" />
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

        <Link
          to={authHref}
          className="encuentros-screen-bottom-nav-item encuentros-screen-bottom-nav-item-auth"
          aria-label={authLabel}
          title={authLabel}
        >
          <AiOutlineUser aria-hidden="true" />
          <span>{authLabel}</span>
        </Link>
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
  const { siteContent, createEncounterReservationRequest, session } = useAppState()
  const location = useLocation()
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
  const [isDatesModalOpen, setIsDatesModalOpen] = useState(false)
  const [allModels, setAllModels] = useState([])
  const pageContent = model?.content || siteContent
  const booking = pageContent.encuentrosBooking || {}
  const modelSlug = model?.slug || slug || ''
  const modelDisplayName = model?.displayName || booking.galleryTitle || t('encuentros.bookingPageTitle')
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
  const extraServices = Array.isArray(pageContent.extraItems) ? pageContent.extraItems.filter(Boolean) : []
  const presencialFeatures = Array.isArray(pageContent.presencialFeatures)
    ? pageContent.presencialFeatures.filter(Boolean).slice(0, 6)
    : []
  const profileAge = getProfileTextValue(pageContent, ['profileAge', 'age'])
  const profileCity = getProfileTextValue(pageContent, ['profileCity', 'profileLocation', 'city', 'location'])
  const profileNationality = getProfileTextValue(pageContent, [
    'profileNationality',
    'nationality',
    'country',
  ])
  const profileRelationshipStatus = getProfileTextValue(pageContent, [
    'profileRelationshipStatus',
    'relationshipStatus',
    'maritalStatus',
  ])
  const profileTopBadge = getProfileTextValue(pageContent, [
    'profileTopBadge',
    'topBadge',
    'badgeTop',
  ])
  const profileAttendanceModes = useMemo(
    () =>
      normalizeProfileAttendanceModes(
        pageContent.profileAttendanceModes ?? pageContent.attendanceModes ?? [],
      ),
    [pageContent.attendanceModes, pageContent.profileAttendanceModes],
  )
  const profileVoiceAudioUrl = getProfileTextValue(pageContent, [
    'profileVoiceAudioUrl',
    'voiceAudioUrl',
  ])
  const profileVoiceAudioLabel = getProfileTextValue(pageContent, [
    'profileVoiceAudioLabel',
    'voiceAudioLabel',
  ])
  const profileAvatarUrl = getProfileTextValue(pageContent, [
    'profileAvatarUrl',
    'avatarUrl',
    'profilePhotoUrl',
  ])
  const pageSeoDescription =
    getProfileTextValue(pageContent, [
      'profileDescription',
      'heroDescription',
      'presencialDescription',
      'extraLead',
    ]) ||
    booking.description ||
    t('encuentros.bookingPageIntro')
  const profileAvatarInitials = getInitialsFromName(modelDisplayName || profileTopBadge || 'M')
  const recordsEncounters = Boolean(
    pageContent.recordsEncounters ?? pageContent.recordingEnabled ?? false,
  )
  const legacyMembershipDiscount = Boolean(pageContent.presencialBenefitText || pageContent.presencialBenefitTitle)
  const membershipDiscountEnabled = Boolean(
    booking.membershipDiscountEnabled ?? legacyMembershipDiscount,
  )
  const membershipDiscountPercent =
    Number.parseFloat(String(booking.membershipDiscountPercent || '0').replace(',', '.')) || 0
  const membershipDiscountNetworkKey = normalizeSocialNetworkValue(
    booking.membershipDiscountNetwork ||
      (pageContent.presencialBenefitTitle || '').replace(/^suscriptores\s+/i, '') ||
      '',
  )
  const membershipDiscountNetworkLabel = getSocialNetworkOption(membershipDiscountNetworkKey).label
  const membershipDiscountLabel =
    booking.membershipDiscountLabel ||
    pageContent.presencialBenefitTitle ||
    `Suscriptores ${membershipDiscountNetworkLabel}`
  const showMembershipDiscount =
    membershipDiscountEnabled && membershipDiscountNetworkKey && membershipDiscountPercent > 0
  const socialLinks = useMemo(
    () =>
      uniqueSocialLinks(
        (Array.isArray(pageContent.socialLinks) ? pageContent.socialLinks : []).map((link) => ({
          ...link,
          network: normalizeSocialNetworkValue(link?.network || link?.label || ''),
          label: String(link?.label || link?.network || '').trim(),
          url: String(link?.url || link?.href || '').trim(),
          active: link?.active !== false,
        })),
      ),
    [pageContent.socialLinks],
  )
  const contactChannels = useMemo(
    () => buildEncounterContactChannels(pageContent, socialLinks, t, modelDisplayName),
    [modelDisplayName, pageContent, socialLinks, t],
  )
  const heroAvailableDates = useMemo(
    () =>
      bookingDays.map((day) => ({
        value: day.value,
        label: formatShortDateLabel(day.value, dateLocale),
      })),
    [bookingDays, dateLocale],
  )
  const hasGalleryImages = topCarouselImages.length > 0
  const showRecordingDiscount = recordsEncounters && recordingDiscountPercent > 0 && recordingPrice > 0
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
  const profileSummary = useMemo(
    () =>
      [
        profileAge ? { key: 'age', label: `${profileAge} años` } : null,
        profileCity
          ? {
              key: 'city',
              label: profileCity,
              href: buildCatalogFacetPath('city', profileCity),
            }
          : null,
        profileNationality
          ? {
              key: 'nationality',
              label: profileNationality,
              href: buildCatalogFacetPath('nationality', profileNationality),
            }
          : null,
        profileCity && profileNationality
          ? {
              key: 'city-nationality',
              label: `${profileCity} / ${profileNationality}`,
              href: buildCatalogCombinedFacetPath({ city: profileCity, nationality: profileNationality }),
            }
          : null,
        profileRelationshipStatus
          ? { key: 'relationship', label: profileRelationshipStatus, tone: 'relationship' }
          : null,
        ...profileAttendanceModes.map((item) => ({
          key: `attendance-${item}`,
          label: item,
          tone: 'attendance',
        })),
      ].filter(Boolean),
    [profileAge, profileAttendanceModes, profileCity, profileNationality, profileRelationshipStatus],
  )
  const relatedModels = useMemo(() => {
    const currentSlug = String(modelSlug || '').trim()
    const currentCity = String(profileCity || '').trim().toLowerCase()
    const currentNationality = String(profileNationality || '').trim().toLowerCase()

    return (Array.isArray(allModels) ? allModels : [])
      .filter((candidate) => candidate && candidate.slug && candidate.slug !== currentSlug)
      .map((candidate) => ({
        ...candidate,
        details: getCatalogModelDetails(candidate),
      }))
      .filter((candidate) => {
        const candidateCity = String(candidate.details.city || '').trim().toLowerCase()
        const candidateNationality = String(candidate.details.nationality || '').trim().toLowerCase()

        if (currentCity && candidateCity === currentCity) {
          return true
        }

        if (currentNationality && candidateNationality === currentNationality) {
          return true
        }

        return false
      })
      .slice(0, 3)
  }, [allModels, modelSlug, profileCity, profileNationality])
  const [galleryReactionCounts, setGalleryReactionCounts] = useState({})
  const [galleryReactionVotes, setGalleryReactionVotes] = useState(() => readGalleryReactionState())
  const galleryVisitorKey = useMemo(() => getOrCreateGalleryVisitorKey(), [])
  const requestedTab = useMemo(() => new URLSearchParams(location.search).get('tab') || '', [location.search])
  const profileVoiceAudioRef = useRef(null)
  const [isProfileVoicePlaying, setIsProfileVoicePlaying] = useState(false)
  const unlockHref = `/access?redirect=${encodeURIComponent(`${location.pathname}${location.search || ''}`)}`
  const isLoggedIn = Boolean(session?.accessToken)

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

    fetchEncuentrosModels()
      .then((items) => {
        if (!isCancelled) {
          setAllModels(Array.isArray(items) ? items : [])
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setAllModels([])
        }
      })

    return () => {
      isCancelled = true
    }
  }, [])

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
    const audio = profileVoiceAudioRef.current

    if (!audio) {
      return undefined
    }

    const handlePlay = () => setIsProfileVoicePlaying(true)
    const handlePause = () => setIsProfileVoicePlaying(false)
    const handleEnded = () => setIsProfileVoicePlaying(false)

    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [profileVoiceAudioUrl])

  useEffect(() => {
    setIsProfileVoicePlaying(false)
    const audio = profileVoiceAudioRef.current
    if (audio) {
      audio.pause()
      audio.currentTime = 0
    }
  }, [profileVoiceAudioUrl])

  const handleToggleProfileVoice = useCallback(() => {
    const audio = profileVoiceAudioRef.current

    if (!audio) {
      return
    }

    if (audio.paused) {
      const playPromise = audio.play()
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          setIsProfileVoicePlaying(false)
        })
      }
      return
    }

    audio.pause()
  }, [])

  const handleOpenDatesModal = useCallback(() => {
    if (heroAvailableDates.length > 5) {
      setIsDatesModalOpen(true)
    }
  }, [heroAvailableDates.length])

  const handleCloseDatesModal = useCallback(() => {
    setIsDatesModalOpen(false)
  }, [])

  const openGallery = useCallback(() => {
    if (!hasGalleryImages) {
      return
    }

    setIsBookingWizardOpen(false)
    setActiveBottomNavKey('gallery')
    setIsGalleryOpen(true)
  }, [hasGalleryImages])

  useEffect(() => {
    if (requestedTab !== 'gallery' || !hasGalleryImages) {
      return
    }

    setActiveBottomNavKey('gallery')
    setIsGalleryOpen(true)
  }, [hasGalleryImages, requestedTab])

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
        <Seo
          title="Kinkly | Encuentros"
          description={pageSeoDescription}
          canonicalPath="/encuentros"
          noindex
        />
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
        <Seo
          title="Kinkly | Encuentros"
          description={pageSeoDescription}
          canonicalPath={`/encuentros/${slug}`}
          noindex
        />
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
      <Seo
        title={`${modelDisplayName} | Kinkly | Encuentros`}
        description={pageSeoDescription}
        canonicalPath={`/encuentros/${modelSlug}`}
      />
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
              <span>Modelo Verificada</span>
            </span>
          </div>

          <div className="encuentros-screen-title-row">
            <span className="encuentros-screen-avatar" aria-hidden="true">
              {profileAvatarUrl ? (
                <img src={profileAvatarUrl} alt="" className="encuentros-screen-avatar-image" />
              ) : (
                <span className="encuentros-screen-avatar-fallback">{profileAvatarInitials || 'M'}</span>
              )}
            </span>

            <h1 id="encuentros-screen-title">{modelDisplayName}</h1>

            {profileVoiceAudioUrl ? (
              <button
                type="button"
                className={
                  isProfileVoicePlaying
                    ? 'encuentros-screen-contact-icon-link encuentros-screen-contact-icon-link-voice is-playing'
                    : 'encuentros-screen-contact-icon-link encuentros-screen-contact-icon-link-voice'
                }
                onClick={handleToggleProfileVoice}
                aria-pressed={isProfileVoicePlaying}
                aria-label={isProfileVoicePlaying ? 'Pausar voz de la modelo' : 'Reproducir voz de la modelo'}
                title={isProfileVoicePlaying ? 'Pausar voz' : 'Escuchar voz'}
              >
                <span className="encuentros-screen-contact-icon" aria-hidden="true">
                  {isProfileVoicePlaying ? <AiOutlinePauseCircle aria-hidden="true" /> : <AiOutlineSound aria-hidden="true" />}
                </span>
              </button>
            ) : null}
            {contactChannels.length ? (
              <div
                className="encuentros-screen-title-actions"
                aria-label={t('encuentros.contactChannels', 'Canales de contacto')}
              >
                {contactChannels.map((link) => {
                  const Icon = getContactChannelIcon(link)
                  const channelIsLocked = !isLoggedIn
                  const ChannelTag = channelIsLocked ? Link : 'a'

                  return (
                    <ChannelTag
                      key={`${link.network}-${link.url}`}
                      className={`encuentros-screen-contact-icon-link is-${getSocialNetworkKey(link)}${channelIsLocked ? ' is-locked' : ''}`}
                      {...(channelIsLocked
                        ? { to: unlockHref }
                        : {
                            href: link.url,
                            target: '_blank',
                            rel: 'noreferrer',
                          })}
                      aria-label={link.label || link.network}
                      title={link.label || link.network}
                    >
                      <span className="encuentros-screen-contact-icon" aria-hidden="true">
                        <Icon aria-hidden="true" />
                      </span>
                    </ChannelTag>
                  )
                })}
              </div>
            ) : null}
          </div>

          {profileSummary.length ? (
            <div className="encuentros-screen-profile-metadata" aria-label={t('encuentros.profileSummary', 'Perfil')}>
              {profileSummary.map((item) => (
                item.href ? (
                  <Link
                    key={item.key}
                    className={
                      item.tone === 'relationship'
                        ? 'encuentros-screen-profile-chip is-relationship'
                        : item.tone === 'attendance'
                          ? 'encuentros-screen-profile-chip is-attendance'
                          : 'encuentros-screen-profile-chip'
                    }
                    to={item.href}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className={
                      item.tone === 'relationship'
                        ? 'encuentros-screen-profile-chip is-relationship'
                        : item.tone === 'attendance'
                          ? 'encuentros-screen-profile-chip is-attendance'
                          : 'encuentros-screen-profile-chip'
                    }
                    key={item.key}
                  >
                    {item.label}
                  </span>
                )
              ))}
            </div>
          ) : null}

          <p className="encuentros-screen-lead">{pageContent.heroDescription}</p>
          <div className="encuentros-screen-trust-row-shell">
            <div className="encuentros-screen-trust-row" aria-label={t('encuentros.bookingAvailability')}>
              {heroAvailableDates.slice(0, 3).map((day) => (
                <span className="encuentros-screen-trust-chip encuentros-screen-trust-chip-date" key={day.value}>
                  <HiOutlineCalendar aria-hidden="true" />
                  <span>{day.label}</span>
                </span>
              ))}
            </div>

            {heroAvailableDates.length ? (
              <button
                type="button"
                className="encuentros-screen-dates-chip"
                onClick={handleOpenDatesModal}
              >
                Ver todas las fechas
              </button>
            ) : null}
          </div>
          {profileVoiceAudioUrl ? (
            <audio
              ref={profileVoiceAudioRef}
              className="encuentros-screen-voice-audio"
              preload="metadata"
              src={profileVoiceAudioUrl}
            />
          ) : null}

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

            {showMembershipDiscount ? (
              <div className="encuentros-screen-inline-discount">
                <span className="encuentros-screen-inline-discount-label">
                  {membershipDiscountLabel}
                </span>
                <span className="encuentros-screen-inline-discount-value">
                  {Number.isInteger(membershipDiscountPercent)
                    ? `${membershipDiscountPercent.toFixed(0)}% OFF`
                    : `${membershipDiscountPercent.toFixed(1)}% OFF`}
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
                  <span>Servicios Adicionales</span>
                </div>
              </div>

              <ul
                className="encuentros-screen-services-list"
                aria-label="Servicios Adicionales"
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

        <EncounterSocialLinksSection
          title={t('encuentros.socialNetworks', 'Redes sociales')}
          description={''}
          links={socialLinks}
          className="encuentros-screen-social-section"
          showTitle={false}
        />

        {relatedModels.length ? (
          <section className="encuentros-screen-related-section" aria-labelledby="encuentros-related-title">
            <div className="section-heading">
              <p className="section-kicker">Relacionadas</p>
              <h2 id="encuentros-related-title">
                {profileCity ? `Otras modelos en ${profileCity}` : 'Otras modelos similares'}
              </h2>
              <p>
                {profileCity
                  ? `Perfiles del mismo entorno para reforzar el cluster de ciudad y continuar la navegacion.`
                  : 'Perfiles cercanos por nacionalidad para expandir la navegacion interna.'}
              </p>
            </div>

            <div className="encuentros-catalog-grid encuentros-screen-related-grid">
              {relatedModels.map((candidate) => (
                <EncounterCatalogCard key={candidate.slug} model={candidate} />
              ))}
            </div>
          </section>
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
        title={booking.galleryTitle || modelDisplayName || t('encuentros.galleryTitle')}
        topBadge={profileTopBadge || 'Modelo Verificada'}
        profileChips={profileSummary}
        socialLinks={socialLinks}
        reactionCounts={galleryReactionCounts}
        reactionVotes={galleryReactionVotes}
        onReact={handleGalleryReaction}
        onClose={closeGallery}
        onReserve={handleOpenWizard}
      />

      {isDatesModalOpen && heroAvailableDates.length ? (
        <div className="encuentros-screen-dates-modal" role="dialog" aria-modal="true" aria-label={t('encuentros.bookingAvailability')}>
          <button
            type="button"
            className="encuentros-screen-dates-modal-backdrop"
            aria-label="Cerrar fechas"
            onClick={handleCloseDatesModal}
          />
          <article className="encuentros-screen-dates-modal-card">
            <header className="encuentros-screen-dates-modal-head">
              <div className="encuentros-screen-dates-modal-copy">
                <p className="encuentros-screen-dates-modal-eyebrow">{t('encuentros.bookingAvailability')}</p>
                <h2>Fechas disponibles</h2>
              </div>
              <button
                type="button"
                className="encuentros-screen-dates-modal-close"
                onClick={handleCloseDatesModal}
              >
                Cerrar
              </button>
            </header>
            <div className="encuentros-screen-dates-modal-grid">
              {heroAvailableDates.map((day) => (
                <span className="encuentros-screen-trust-chip encuentros-screen-trust-chip-date" key={day.value}>
                  <HiOutlineCalendar aria-hidden="true" />
                  <span>{day.label}</span>
                </span>
              ))}
            </div>
          </article>
        </div>
      ) : null}

      <EncuentrosBookingWizardModal
          open={isBookingWizardOpen}
          booking={booking}
          modelProfile={{
            displayName: modelDisplayName,
            age: profileAge,
            city: profileCity,
            nationality: profileNationality,
            topBadge: profileTopBadge,
            voiceAudioUrl: profileVoiceAudioUrl,
            voiceAudioLabel: profileVoiceAudioLabel,
          }}
          isAuthenticated={Boolean(session?.accessToken)}
          currentUserName={session?.name || session?.email || ''}
          canRecordEncounters={recordsEncounters}
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
