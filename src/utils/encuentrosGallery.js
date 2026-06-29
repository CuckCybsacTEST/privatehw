function slugifyGalleryValue(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getSlideSource(slide) {
  if (typeof slide === 'string') {
    return slide.trim()
  }

  if (!slide || typeof slide !== 'object') {
    return ''
  }

  return String(slide.src || slide.url || slide.image || '').trim()
}

export function normalizeEncounterGallerySlide(slide, index = 0) {
  const source = getSlideSource(slide)

  if (!source) {
    return null
  }

  const slideObject =
    slide && typeof slide === 'object' && !Array.isArray(slide) ? slide : {}
  const caption = String(slideObject.caption || slideObject.text || slideObject.label || slideObject.title || '').trim()
  const alt = String(slideObject.alt || slideObject.title || caption || `Galeria ${index + 1}`).trim()
  const stableKey = String(
    slideObject.id || slideObject.key || slideObject.slug || source || `gallery-${index + 1}`,
  ).trim()

  return {
    id: slugifyGalleryValue(stableKey) || `gallery-${index + 1}`,
    src: source,
    alt,
    caption,
  }
}

export function normalizeEncounterGallerySlides(slides = []) {
  return (Array.isArray(slides) ? slides : [])
    .map((slide, index) => normalizeEncounterGallerySlide(slide, index))
    .filter(Boolean)
}

