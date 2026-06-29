import {
  TRANSLATABLE_ARRAY_KEYS,
  hashStableValue,
  shouldTranslateKey,
} from '../src/utils/translationSync.js'

const translationEndpoints = [
  process.env.TRANSLATION_API_URL || '',
  'https://translate.argosopentech.com/translate',
  'https://libretranslate.de/translate',
].filter(Boolean)

const translationCache = new Map()

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function shouldTranslateStringValue(key, value) {
  const normalizedKey = String(key || '').toLowerCase()
  const normalizedValue = String(value || '').trim()

  if (!normalizedValue) {
    return false
  }

  if (normalizedKey === 'localized' || normalizedKey === 'localizedmeta') {
    return false
  }

  if (
    normalizedValue.startsWith('http://') ||
    normalizedValue.startsWith('https://') ||
    normalizedValue.startsWith('mailto:') ||
    normalizedValue.startsWith('/') ||
    normalizedValue.startsWith('#')
  ) {
    return false
  }

  if (/^[\d\s.,:/+-]+$/.test(normalizedValue)) {
    return false
  }

  return shouldTranslateKey(normalizedKey, normalizedValue)
}

async function requestTranslation(text, { sourceLocale = 'es', targetLocale = 'en', html = false } = {}) {
  const cacheKey = `${sourceLocale}:${targetLocale}:${html ? 'html' : 'text'}:${text}`

  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)
  }

  const promise = (async () => {
    for (const endpoint of translationEndpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            q: text,
            source: sourceLocale,
            target: targetLocale,
            format: html ? 'html' : 'text',
            api_key: process.env.TRANSLATION_API_KEY || undefined,
          }),
        })

        if (!response.ok) {
          continue
        }

        const payload = await response.json().catch(() => ({}))
        const translatedText =
          payload.translatedText ||
          payload.translated_text ||
          payload?.data?.translatedText ||
          payload?.translation ||
          ''

        if (translatedText) {
          return String(translatedText)
        }
      } catch {
        // Try the next endpoint.
      }
    }

    try {
      const googleUrl = new URL('https://translate.googleapis.com/translate_a/single')
      googleUrl.searchParams.set('client', 'gtx')
      googleUrl.searchParams.set('sl', sourceLocale)
      googleUrl.searchParams.set('tl', targetLocale)
      googleUrl.searchParams.set('dt', 't')
      googleUrl.searchParams.set('format', html ? 'html' : 'text')
      googleUrl.searchParams.set('q', text)

      const response = await fetch(googleUrl.toString())

      if (response.ok) {
        const payload = await response.json()
        const translatedText = Array.isArray(payload?.[0])
          ? payload[0].map((item) => item?.[0] || '').join('')
          : ''

        if (translatedText) {
          return translatedText
        }
      }
    } catch {
      // Continue to the final error below.
    }

    throw new Error('No se pudo contactar el servicio de traduccion.')
  })()

  translationCache.set(cacheKey, promise)

  try {
    return await promise
  } finally {
    translationCache.delete(cacheKey)
  }
}

async function translateValue(value, context = {}) {
  const {
    key = '',
    parentKey = '',
    sourceLocale = 'es',
    targetLocale = 'en',
    arrayKeys = TRANSLATABLE_ARRAY_KEYS,
  } = context

  if (Array.isArray(value)) {
    const normalizedParentKey = String(key || parentKey || '').toLowerCase()
    const shouldTranslateArray =
      arrayKeys.has(normalizedParentKey) || arrayKeys.has(String(parentKey || '').toLowerCase())

    if (shouldTranslateArray && value.every((item) => typeof item === 'string')) {
      const translatedItems = await Promise.all(
        value.map((item) =>
          requestTranslation(String(item || ''), {
            sourceLocale,
            targetLocale,
            html: false,
          }),
        ),
      )

      return translatedItems
    }

    return Promise.all(
      value.map((item) =>
        translateValue(item, {
          key: '',
          parentKey: normalizedParentKey,
          sourceLocale,
          targetLocale,
          arrayKeys,
        }),
      ),
    )
  }

  if (isPlainObject(value)) {
    const next = {}

    for (const [entryKey, entryValue] of Object.entries(value)) {
      if (entryKey === 'localized' || entryKey === 'localizedMeta') {
        next[entryKey] = entryValue
        continue
      }

      next[entryKey] = await translateValue(entryValue, {
        key: entryKey,
        parentKey: key || parentKey,
        sourceLocale,
        targetLocale,
        arrayKeys,
      })
    }

    return next
  }

  if (typeof value === 'string' && shouldTranslateStringValue(key, value)) {
    return requestTranslation(value, {
      sourceLocale,
      targetLocale,
      html: String(key).toLowerCase() === 'contenthtml' || String(key).toLowerCase() === 'html',
    })
  }

  return value
}

export async function translateContentPayload(payload = {}, options = {}) {
  const sourceLocale = options.sourceLocale || 'es'
  const targetLocale = options.targetLocale || 'en'
  const translatedPayload = await translateValue(payload, {
    key: '',
    parentKey: '',
    sourceLocale,
    targetLocale,
  })

  return {
    translated: translatedPayload,
    sourceHash: hashStableValue(payload),
    translatedAt: new Date().toISOString(),
    provider: translationEndpoints[0] || 'fallback',
    sourceLocale,
    targetLocale,
  }
}
