function stableStringify(value) {
  if (value === null || value === undefined) {
    return String(value)
  }

  if (typeof value !== 'object') {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`
  }

  const keys = Object.keys(value).sort()
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`
}

export function hashStableValue(value) {
  const input = stableStringify(value)
  let hash = 2166136261

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return (hash >>> 0).toString(36)
}

export function getLocaleDirection(locale = 'es') {
  return String(locale || 'es').slice(0, 2).toLowerCase() === 'en' ? 'en' : 'es'
}

function findSourceHash(value, seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) {
    return ''
  }

  seen.add(value)

  if (typeof value.sourceHash === 'string' && value.sourceHash.trim()) {
    return value.sourceHash.trim()
  }

  for (const entry of Object.values(value)) {
    const found = findSourceHash(entry, seen)
    if (found) {
      return found
    }
  }

  return ''
}

const IGNORED_KEY_EXACT = new Set([
  'id',
  'slug',
  'url',
  'href',
  'src',
  'path',
  'fileid',
  'drivefileid',
  'mediaurl',
  'mediadrivefileid',
  'coverimage',
  'socialimage',
  'image',
  'thumbnail',
  'posterimage',
  'purchaseurl',
  'previewsourceurl',
  'fullsourceurl',
  'previewvideourl',
  'fullvideourl',
  'priceamount',
  'currency',
  'duration',
  'durationminutes',
  'slotintervalminutes',
  'status',
  'accesslevel',
  'featuredslot',
  'bannerslot',
  'allowindexing',
  'publishedat',
  'updatedat',
  'scheduledat',
  'createdat',
  'mediaType'.toLowerCase(),
  'ispublished',
  'value',
  'type',
  'kind',
  'durationunit',
  'bookingstarttime',
  'bookingendtime',
])

const IGNORED_KEY_CONTAINS = ['url', 'slug', 'id', 'fileid', 'price', 'amount', 'currency', 'slot']

export const TRANSLATABLE_ARRAY_KEYS = new Set([
  'badges',
  'stats',
  'profileHighlights',
  'planItems',
  'importantItems',
  'extraItems',
  'rows',
  'tags',
  'paymentMethods',
])

export function shouldTranslateKey(key = '', value = '') {
  const normalizedKey = String(key || '').toLowerCase()
  const normalizedValue = String(value || '').trim()

  if (!normalizedValue) {
    return false
  }

  if (IGNORED_KEY_EXACT.has(normalizedKey)) {
    return false
  }

  if (IGNORED_KEY_CONTAINS.some((fragment) => normalizedKey.includes(fragment))) {
    return false
  }

  if (normalizedKey === 'contenthtml' || normalizedKey === 'html') {
    return true
  }

  return true
}

export function getTranslationState({ source, translated, meta, locale = 'en' } = {}) {
  const normalizedLocale = getLocaleDirection(locale)
  const localizedExists =
    translated !== undefined &&
    translated !== null &&
    (typeof translated !== 'string' || String(translated).trim() !== '')

  if (!localizedExists) {
    return 'missing'
  }

  const sourceHash = hashStableValue(source)
  const recordedHash =
    findSourceHash(meta?.[normalizedLocale]) ||
    (typeof meta?.sourceHash === 'string' ? meta.sourceHash : '')

  if (!recordedHash) {
    return 'pending'
  }

  return recordedHash === sourceHash ? 'synced' : 'stale'
}
