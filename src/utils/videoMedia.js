export function extractGoogleDriveFileId(value = '') {
  const input = String(value).trim()

  if (!input) {
    return ''
  }

  if (
    !input.includes('://') &&
    /^[A-Za-z0-9_-]{20,}$/.test(input) &&
    !input.includes('/') &&
    !input.includes('?')
  ) {
    return input
  }

  try {
    const url = new URL(input)

    if (url.hostname.includes('drive.google.com')) {
      const pathMatch = url.pathname.match(/\/d\/([A-Za-z0-9_-]+)/)
      if (pathMatch?.[1]) {
        return pathMatch[1]
      }

      const sharedId = url.searchParams.get('id')
      if (sharedId) {
        return sharedId
      }
    }

    const alternateId = url.searchParams.get('id')
    if (alternateId) {
      return alternateId
    }
  } catch {
    return ''
  }

  return ''
}

export function isInternalMediaUrl(value = '') {
  const input = String(value || '').trim()
  return Boolean(input && input.startsWith('/api/media/'))
}

export function buildMediaPreviewUrl(group, slug) {
  return `/api/media/${encodeURIComponent(group)}/${encodeURIComponent(slug)}/preview`
}

export function buildMediaFullUrl(group, slug) {
  return `/api/media/${encodeURIComponent(group)}/${encodeURIComponent(slug)}/full`
}

export function buildMediaPublicUrl(group, slug) {
  return `/api/media/${encodeURIComponent(group)}/${encodeURIComponent(slug)}`
}

export function buildVideoPreviewUrl(slug) {
  return buildMediaPreviewUrl('videos', slug)
}

export function buildVideoFullUrl(slug) {
  return buildMediaFullUrl('videos', slug)
}
