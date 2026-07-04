const SOCIAL_NETWORK_ALIASES = new Map([
  ['ig', 'instagram'],
  ['insta', 'instagram'],
  ['instagram', 'instagram'],
  ['only fans', 'onlyfans'],
  ['onlyfans', 'onlyfans'],
  ['fans ly', 'fansly'],
  ['fansly', 'fansly'],
  ['many vids', 'manyvids'],
  ['manyvids', 'manyvids'],
  ['loverfans', 'loverfans'],
  ['lover fans', 'loverfans'],
  ['telegram', 'telegram'],
  ['t.me', 'telegram'],
  ['whatsapp', 'whatsapp'],
  ['wa.me', 'whatsapp'],
  ['facebook', 'facebook'],
  ['fb', 'facebook'],
  ['tiktok', 'tiktok'],
  ['twitter', 'x'],
  ['x', 'x'],
])

export const SOCIAL_NETWORK_OPTIONS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'onlyfans', label: 'OnlyFans' },
  { value: 'fansly', label: 'Fansly' },
  { value: 'manyvids', label: 'ManyVids' },
  { value: 'loverfans', label: 'LoverFans' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'x', label: 'X' },
  { value: 'link', label: 'Link' },
]

const SOCIAL_NETWORK_MAP = new Map(SOCIAL_NETWORK_OPTIONS.map((item) => [item.value, item]))

function normalizeSocialNetworkText(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export function normalizeSocialNetworkValue(value = '') {
  const normalizedValue = normalizeSocialNetworkText(value)

  if (SOCIAL_NETWORK_ALIASES.has(normalizedValue)) {
    return SOCIAL_NETWORK_ALIASES.get(normalizedValue)
  }

  if (normalizedValue.includes('instagram') || normalizedValue === 'ig') {
    return 'instagram'
  }

  if (normalizedValue.includes('onlyfans')) {
    return 'onlyfans'
  }

  if (normalizedValue.includes('fansly')) {
    return 'fansly'
  }

  if (normalizedValue.includes('manyvids')) {
    return 'manyvids'
  }

  if (normalizedValue.includes('loverfans')) {
    return 'loverfans'
  }

  if (normalizedValue.includes('telegram') || normalizedValue.includes('t.me')) {
    return 'telegram'
  }

  if (normalizedValue.includes('whatsapp') || normalizedValue.includes('wa.me')) {
    return 'whatsapp'
  }

  if (normalizedValue.includes('facebook') || normalizedValue.includes('fb.com')) {
    return 'facebook'
  }

  if (normalizedValue.includes('tiktok')) {
    return 'tiktok'
  }

  if (normalizedValue.includes('twitter') || normalizedValue === 'x') {
    return 'x'
  }

  return normalizedValue || 'link'
}

export function getSocialNetworkKey(link = {}) {
  const parts = [link?.network, link?.label, link?.url].filter(Boolean).join(' ')
  return normalizeSocialNetworkValue(parts)
}

export function getSocialNetworkOption(value = '') {
  return SOCIAL_NETWORK_MAP.get(normalizeSocialNetworkValue(value)) || SOCIAL_NETWORK_MAP.get('link')
}

export function getSocialNetworkActionLabel(value = '') {
  const key = normalizeSocialNetworkValue(value)

  if (key === 'loverfans') {
    return 'Ver contenido'
  }

  if (key === 'onlyfans' || key === 'fansly' || key === 'manyvids') {
    return 'Acceder'
  }

  if (key === 'telegram') {
    return 'Abrir canal'
  }

  if (key === 'whatsapp') {
    return 'Abrir chat'
  }

  return 'Abrir perfil'
}

export function buildWhatsAppChatUrl(phone = '', modelName = '') {
  const digits = String(phone || '').replace(/[^\d]/g, '')

  if (!digits) {
    return ''
  }

  const messageName = String(modelName || '').trim() || 'la modelo'
  const message = `Hola ${messageName} quiero conocerte...`
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

export function extractWhatsAppPhoneFromUrl(value = '') {
  const raw = String(value || '').trim()

  if (!raw) {
    return ''
  }

  const match = raw.match(/wa\.me\/(\d+)/i)
  return match?.[1] || ''
}
