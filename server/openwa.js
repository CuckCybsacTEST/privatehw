const openwaBaseUrl = String(process.env.OPENWA_BASE_URL || '').trim().replace(/\/+$/, '')
const openwaApiKey = String(process.env.OPENWA_API_KEY || '').trim()
const openwaSessionId = String(process.env.OPENWA_SESSION_ID || '').trim()

export function isOpenWaConfigured() {
  return Boolean(openwaBaseUrl && openwaApiKey && openwaSessionId)
}

export function normalizeWhatsAppPhone(phone = '') {
  return String(phone || '').replace(/[^\d]/g, '')
}

function buildOpenWaUrl(path = '') {
  const normalizedPath = String(path || '').replace(/^\/+/, '')
  return `${openwaBaseUrl}/api/${normalizedPath}`
}

async function openWaJson(path, options = {}) {
  if (!isOpenWaConfigured()) {
    const error = new Error('OpenWA no esta configurado.')
    error.code = 'OPENWA_NOT_CONFIGURED'
    throw error
  }

  const controller = new AbortController()
  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 15000
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(buildOpenWaUrl(path), {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': openwaApiKey,
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    })

    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      const error = new Error(payload?.error || payload?.message || 'OpenWA no pudo completar la solicitud.')
      error.code = payload?.code || 'OPENWA_REQUEST_FAILED'
      error.status = response.status
      throw error
    }

    return payload
  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeoutError = new Error('OpenWA tardo demasiado en responder.')
      timeoutError.code = 'OPENWA_TIMEOUT'
      throw timeoutError
    }

    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function checkOpenWaPhone(phone = '') {
  const normalizedPhone = normalizeWhatsAppPhone(phone)

  if (!normalizedPhone) {
    const error = new Error('Debes indicar un telefono valido.')
    error.code = 'BAD_REQUEST'
    throw error
  }

  return openWaJson(`sessions/${encodeURIComponent(openwaSessionId)}/contacts/check/${encodeURIComponent(normalizedPhone)}`)
}

export async function sendOpenWaText(phone = '', text = '') {
  const normalizedPhone = normalizeWhatsAppPhone(phone)

  if (!normalizedPhone) {
    const error = new Error('Debes indicar un telefono valido.')
    error.code = 'BAD_REQUEST'
    throw error
  }

  if (!String(text || '').trim()) {
    const error = new Error('El mensaje de verificacion esta vacio.')
    error.code = 'BAD_REQUEST'
    throw error
  }

  return openWaJson(`sessions/${encodeURIComponent(openwaSessionId)}/messages/send-text`, {
    method: 'POST',
    body: {
      chatId: `${normalizedPhone}@c.us`,
      text,
    },
  })
}
