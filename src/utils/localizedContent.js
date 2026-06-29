function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function getItemIdentity(item) {
  if (!isPlainObject(item)) {
    return ''
  }

  const rawId = String(item.id || '').trim()
  if (rawId) {
    return `id:${rawId.toLowerCase()}`
  }

  const rawSlug = String(item.slug || '').trim()
  if (rawSlug) {
    return `slug:${rawSlug.toLowerCase()}`
  }

  return ''
}

export function getLocaleKey(locale = 'es') {
  return String(locale || 'es').slice(0, 2).toLowerCase() === 'en' ? 'en' : 'es'
}

export function resolveLocalizedValue(baseValue, localizedValue, locale = 'es') {
  const localeKey = getLocaleKey(locale)

  if (isPlainObject(baseValue) && isPlainObject(localizedValue?.[localeKey])) {
    return mergeLocalizedValue(baseValue, localizedValue[localeKey])
  }

  return mergeLocalizedValue(baseValue, localizedValue)
}

export function mergeLocalizedValue(baseValue, localizedValue) {
  if (localizedValue === undefined || localizedValue === null) {
    return baseValue
  }

  if (Array.isArray(localizedValue)) {
    const baseIsComplexArray =
      Array.isArray(baseValue) &&
      baseValue.some((item) => isPlainObject(item) || Array.isArray(item))
    const localizedIsComplexArray = localizedValue.some(
      (item) => isPlainObject(item) || Array.isArray(item),
    )

    if (!baseIsComplexArray && !localizedIsComplexArray) {
      return localizedValue
    }

    const baseArray = Array.isArray(baseValue) ? baseValue : []
    const localizedArray = localizedValue
    const baseHasIdentity = baseArray.some((item) => Boolean(getItemIdentity(item)))
    const localizedHasIdentity = localizedArray.some((item) => Boolean(getItemIdentity(item)))

    if (baseHasIdentity || localizedHasIdentity) {
      const localizedByIdentity = new Map()
      const localizedByIndex = new Map()

      localizedArray.forEach((item, index) => {
        const identity = getItemIdentity(item)
        if (identity) {
          localizedByIdentity.set(identity, item)
        }
        localizedByIndex.set(index, item)
      })

      const usedLocalizedItems = new Set()
      const mergedByIdentity = baseArray.map((baseItem, index) => {
        const identity = getItemIdentity(baseItem)
        const localizedItem =
          (identity && localizedByIdentity.get(identity)) || localizedByIndex.get(index)

        if (localizedItem !== undefined && localizedItem !== null) {
          usedLocalizedItems.add(localizedItem)
        }

        return mergeLocalizedValue(baseItem, localizedItem)
      })

      const customOnlyItems = localizedArray.filter((item) => !usedLocalizedItems.has(item))

      return [...mergedByIdentity, ...customOnlyItems].filter(
        (item) => item !== undefined && item !== null,
      )
    }

    const fallbackBaseArray = Array.isArray(baseValue) ? baseValue : []
    const maxLength = Math.max(fallbackBaseArray.length, localizedValue.length)

    return Array.from({ length: maxLength }, (_, index) =>
      mergeLocalizedValue(fallbackBaseArray[index], localizedValue[index]),
    ).filter((item) => item !== undefined && item !== null)
  }

  if (isPlainObject(baseValue) && isPlainObject(localizedValue)) {
    const merged = { ...baseValue }

    for (const [key, value] of Object.entries(localizedValue)) {
      merged[key] = mergeLocalizedValue(baseValue[key], value)
    }

    return merged
  }

  return localizedValue
}

export function resolveLocalizedSection(content, sectionKey, locale = 'es') {
  const localeKey = getLocaleKey(locale)
  const baseSection = content?.[sectionKey] || {}
  const localizedSection = content?.localized?.[localeKey]?.[sectionKey]

  if (
    localeKey === 'en' &&
    (sectionKey === 'videoCollections' || sectionKey === 'videoLibrary') &&
    Array.isArray(localizedSection?.items)
  ) {
    return mergeLocalizedValue(
      {
        ...baseSection,
        items: [],
      },
      localizedSection,
    )
  }

  return mergeLocalizedValue(baseSection, localizedSection)
}

export function resolveLocalizedRecord(record, locale = 'es') {
  const localeKey = getLocaleKey(locale)
  const localizedRecord = record?.localized?.[localeKey]

  if (!localizedRecord) {
    return record
  }

  const mergedRecord = mergeLocalizedValue(record, localizedRecord)

  for (const sectionKey of ['videoLibrary', 'videoCollections']) {
    const localizedSection = localizedRecord?.[sectionKey]

    if (Array.isArray(localizedSection?.items)) {
      mergedRecord[sectionKey] = mergeLocalizedValue(
        {
          ...(record?.[sectionKey] || {}),
          items: [],
        },
        localizedSection,
      )
    }
  }

  return mergedRecord
}
