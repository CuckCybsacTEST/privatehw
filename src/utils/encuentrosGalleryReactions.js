import { readStorageValue, writeStorageValue } from './storage'

const GALLERY_VISITOR_KEY_STORAGE = 'privatehw.encuentros.gallery.visitor-key.v1'
const GALLERY_REACTION_STORAGE = 'privatehw.encuentros.gallery.reactions.v1'

function getRandomVisitorKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `visitor-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
}

export function getOrCreateGalleryVisitorKey() {
  if (typeof window === 'undefined') {
    return 'server'
  }

  try {
    const existingKey = window.localStorage.getItem(GALLERY_VISITOR_KEY_STORAGE)
    if (existingKey) {
      return existingKey
    }

    const nextKey = getRandomVisitorKey()
    window.localStorage.setItem(GALLERY_VISITOR_KEY_STORAGE, nextKey)
    return nextKey
  } catch {
    return getRandomVisitorKey()
  }
}

export function readGalleryReactionState() {
  return readStorageValue(GALLERY_REACTION_STORAGE, {})
}

export function writeGalleryReactionState(nextState) {
  try {
    writeStorageValue(GALLERY_REACTION_STORAGE, nextState)
  } catch {
    // Best effort only. The backend remains the source of truth for counts.
  }
}

export async function fetchGalleryReactionCounts(photoIds = []) {
  const filteredPhotoIds = Array.from(new Set((Array.isArray(photoIds) ? photoIds : []).filter(Boolean)))

  if (!filteredPhotoIds.length) {
    return []
  }

  const response = await fetch(
    `/api/encuentros/gallery/reactions?photoIds=${encodeURIComponent(filteredPhotoIds.join(','))}`,
  )
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.error || 'No se pudieron cargar las reacciones de la galeria.')
  }

  return Array.isArray(payload.items) ? payload.items : []
}

export async function saveGalleryReaction({ photoId, reaction, visitorKey }) {
  const response = await fetch('/api/encuentros/gallery/reactions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      photoId,
      reaction,
      visitorKey,
    }),
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.error || 'No se pudo guardar la reaccion.')
  }

  return payload
}
