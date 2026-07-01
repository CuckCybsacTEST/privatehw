export const DEFAULT_ENCUENTROS_MODEL_SLUG = 'sindy-mireya'

export function getEncounterFallbackSlug(models = [], fallbackSlug = DEFAULT_ENCUENTROS_MODEL_SLUG) {
  const list = Array.isArray(models) ? models : []
  const publishedModel = list.find((model) => model && model.status === 'published' && model.slug)

  return String(publishedModel?.slug || list[0]?.slug || fallbackSlug || '').trim()
}

export async function resolveEncounterFallbackSlug(loadModelsFn, fallbackSlug = DEFAULT_ENCUENTROS_MODEL_SLUG) {
  if (typeof loadModelsFn !== 'function') {
    return String(fallbackSlug || '').trim()
  }

  const models = await loadModelsFn()
  return getEncounterFallbackSlug(models, fallbackSlug)
}
