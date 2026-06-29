const DEFAULT_BOOKING_PRICE_AMOUNT = 500

function parseDisplayedMoneyAmount(value, fallbackAmount = DEFAULT_BOOKING_PRICE_AMOUNT) {
  const text = String(value || '').trim()

  if (!text) {
    return fallbackAmount
  }

  const numeric = Number.parseFloat(text.replace(/[^\d.,-]/g, '').replace(',', '.'))

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallbackAmount
  }

  return Math.round(numeric * 100)
}

export function normalizeDateValue(value = '') {
  const text = String(value || '').trim().slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : ''
}

export function buildFutureBookingDays(totalDays = 14) {
  return Array.from({ length: totalDays }, (_, index) => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() + index)

    return {
      value: date.toISOString().slice(0, 10),
      date,
    }
  })
}

export function buildBookingDays(booking = {}) {
  const configuredDates = Array.isArray(booking.availableDates)
    ? booking.availableDates.map(normalizeDateValue).filter(Boolean)
    : []

  if (configuredDates.length > 0) {
    return configuredDates
      .sort((left, right) => left.localeCompare(right))
      .map((value) => ({
        value,
        date: new Date(`${value}T00:00:00`),
      }))
  }

  return buildFutureBookingDays(Number.parseInt(booking.availableDays || '14', 10) || 14)
}

export function parseTimeToMinutes(value = '') {
  const [hours, minutes] = String(value).split(':').map((part) => Number.parseInt(part, 10))

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null
  }

  return hours * 60 + minutes
}

export function formatMinutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function buildBookingTimes(booking = {}) {
  const start = parseTimeToMinutes(booking.bookingStartTime || '')
  const end = parseTimeToMinutes(booking.bookingEndTime || '')
  const interval = Number.parseInt(booking.slotIntervalMinutes || '0', 10)

  if (Number.isFinite(start) && Number.isFinite(end) && Number.isFinite(interval) && interval > 0 && end >= start) {
    const slots = []
    for (let current = start; current <= end; current += interval) {
      slots.push(formatMinutesToTime(current))
    }
    return slots
  }

  return Array.isArray(booking.timeSlots) && booking.timeSlots.length > 0
    ? booking.timeSlots
    : ['15:00', '16:00', '17:00', '18:00']
}

export function normalizeRecordingChoice(value = '') {
  const choice = String(value || '').trim().toLowerCase()
  return choice === 'recording' || choice === 'yes' || choice === '1' ? 'recording' : 'standard'
}

function clampPercent(value = 0) {
  const numeric = Number.parseFloat(String(value || '0').replace(',', '.'))

  if (!Number.isFinite(numeric)) {
    return 0
  }

  return Math.min(Math.max(numeric, 0), 100)
}

function parseMoneyAmount(value, fallbackAmount = DEFAULT_BOOKING_PRICE_AMOUNT) {
  const numeric = Number.parseInt(String(value || '').replace(/[^\d]/g, ''), 10)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallbackAmount
}

export function normalizeCurrencyLabel(label = '', amount = DEFAULT_BOOKING_PRICE_AMOUNT) {
  const text = String(label || '').trim()

  if (!text) {
    return `S/${((amount || 0) / 100).toFixed(2)}`
  }

  if (text.startsWith('S/')) {
    return text
  }

  if (text.startsWith('$')) {
    return `S/${text.slice(1).trim()}`
  }

  return `S/${text}`
}

function formatCurrencyAmount(amount = 0, currency = 'PEN', locale = 'es-PE') {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format((amount || 0) / 100)
  } catch {
    const prefix = currency === 'PEN' ? 'S/' : '$'
    return `${prefix}${((amount || 0) / 100).toFixed(2)}`
  }
}

function resolveEncounterPricingSource(source = {}) {
  if (source && typeof source === 'object' && source.encuentrosBooking) {
    return {
      siteContent: source,
      booking: source.encuentrosBooking || {},
    }
  }

  return {
    siteContent: null,
    booking: source || {},
  }
}

function resolveEncounterBaseAmount(siteContent, booking) {
  const displayedPrice = siteContent?.presencialPrice || booking?.presencialPrice || ''
  const displayedAmount = parseDisplayedMoneyAmount(displayedPrice, 0)

  if (displayedAmount > 0) {
    return displayedAmount
  }

  if (Number.isFinite(booking?.priceAmount) && booking.priceAmount > 0) {
    return booking.priceAmount
  }

  const fallbackAmount = parseMoneyAmount(booking?.priceLabel, DEFAULT_BOOKING_PRICE_AMOUNT)
  return fallbackAmount
}

function resolveEncounterAdvanceAmount(siteContent, booking, totalAmount) {
  const advanceSource =
    booking?.advanceAmount ??
    booking?.advanceLabel ??
    siteContent?.encuentrosBooking?.advanceAmount ??
    siteContent?.encuentrosBooking?.advanceLabel ??
    1000
  const parsedAdvanceAmount =
    Number.isFinite(advanceSource) && advanceSource > 0
      ? advanceSource
      : parseMoneyAmount(advanceSource, 1000)

  if (parsedAdvanceAmount <= 0) {
    return Math.min(1000, totalAmount || 1000)
  }

  const safeTotalAmount = Number.isFinite(totalAmount) && totalAmount > 0 ? totalAmount : parsedAdvanceAmount
  return Math.min(parsedAdvanceAmount, safeTotalAmount)
}

export function buildEncuentrosBookingPricing(source = {}, recordingChoice = 'standard', locale = 'es-PE') {
  const { siteContent, booking } = resolveEncounterPricingSource(source)
  const currency = 'PEN'
  const baseAmount = resolveEncounterBaseAmount(siteContent, booking)
  const baseLabel = formatCurrencyAmount(baseAmount, currency, locale)
  const discountPercent = clampPercent(
    booking.recordingDiscountPercent ?? siteContent?.encuentrosBooking?.recordingDiscountPercent ?? 0,
  )
  const normalizedChoice = normalizeRecordingChoice(recordingChoice)
  const discountAmount =
    normalizedChoice === 'recording' ? Math.round((baseAmount * discountPercent) / 100) : 0
  const effectiveAmount = Math.max(0, baseAmount - discountAmount)
  const effectiveLabel = formatCurrencyAmount(effectiveAmount, currency, locale)
  const originalLabel = formatCurrencyAmount(baseAmount, currency, locale)
  const advanceAmount = resolveEncounterAdvanceAmount(siteContent, booking, effectiveAmount)
  const advanceLabel = formatCurrencyAmount(advanceAmount, currency, locale)
  const chargeAmount = Math.min(advanceAmount, effectiveAmount)
  const chargeLabel = formatCurrencyAmount(chargeAmount, currency, locale)
  const remainingAmount = Math.max(0, effectiveAmount - advanceAmount)
  const remainingLabel = formatCurrencyAmount(remainingAmount, currency, locale)

  return {
    baseAmount,
    baseLabel,
    currency,
    advanceAmount,
    advanceLabel,
    discountAmount,
    discountPercent,
    chargeAmount,
    chargeLabel,
    effectiveAmount,
    effectiveLabel,
    hasRecordingDiscount: discountPercent > 0,
    remainingAmount,
    remainingLabel,
    originalLabel,
    recordingChoice: normalizedChoice,
  }
}

export function getRecordingPricingSummary(pricing, booking = {}, t) {
  if (!pricing?.hasRecordingDiscount) {
    return t('encuentros.recordingNoDiscount')
  }

  const discountLabel =
    booking.recordingDiscountLabel || t('encuentros.recordingDiscountLabel', { percent: pricing.discountPercent })

  return t('encuentros.recordingWithDiscount', {
    label: discountLabel,
    percent: pricing.discountPercent,
    amount: pricing.effectiveLabel,
  })
}
