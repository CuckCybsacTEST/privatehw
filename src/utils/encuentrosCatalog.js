function normalizeText(value = '') {
  return String(value || '').trim()
}

function normalizeKey(value = '') {
  return normalizeText(value).toLowerCase()
}

export function slugifyCatalogValue(value = '') {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function collectUniqueValues(items = []) {
  return Array.from(new Set((Array.isArray(items) ? items : []).map(normalizeText).filter(Boolean)))
}

function getFirstTextValue(source = {}, keys = []) {
  for (const key of keys) {
    const value = source?.[key]

    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }

    if (Number.isFinite(value) && value !== 0) {
      return String(value)
    }
  }

  return ''
}

function getArrayValue(source = {}, keys = []) {
  for (const key of keys) {
    const value = source?.[key]

    if (Array.isArray(value) && value.length) {
      return value.map(normalizeText).filter(Boolean)
    }
  }

  return []
}

export function getCatalogModelDetails(model = {}) {
  const content = model?.content || {}
  const booking = content.encuentrosBooking || {}
  const title = normalizeText(model?.displayName || content.heroTitle || model?.slug || 'Modelo')
  const description =
    getFirstTextValue(content, [
      'profileDescription',
      'heroDescription',
      'presencialDescription',
      'extraLead',
    ]) ||
    getFirstTextValue(booking, ['description']) ||
    'Perfil disponible en el catalogo.'
  const city = getFirstTextValue(content, ['profileCity', 'profileLocation', 'location', 'ubicacion'])
  const nationality = getFirstTextValue(content, ['profileNationality', 'nationality', 'pais'])
  const age = getFirstTextValue(content, ['profileAge', 'age', 'edad'])
  const relationshipStatus = getFirstTextValue(content, ['profileRelationshipStatus', 'relationshipStatus'])
  const attendanceModes = getArrayValue(content, ['profileAttendanceModes'])
  const tags = collectUniqueValues([
    ...getArrayValue(content, ['profileTags', 'tags']),
    ...getArrayValue(booking, ['tags']),
  ])

  return {
    title,
    description,
    city,
    nationality,
    age,
    relationshipStatus,
    attendanceModes,
    tags,
  }
}

export function buildCatalogFacetOptions(models = []) {
  const list = Array.isArray(models) ? models : []
  const cities = []
  const nationalities = []
  const relationshipStatuses = []
  const attendanceModes = []
  const ages = []
  const tags = []

  list.forEach((model) => {
    const details = getCatalogModelDetails(model)

    if (details.city) {
      cities.push(details.city)
    }

    if (details.nationality) {
      nationalities.push(details.nationality)
    }

    if (details.relationshipStatus) {
      relationshipStatuses.push(details.relationshipStatus)
    }

    if (details.age) {
      ages.push(details.age)
    }

    if (details.attendanceModes.length) {
      attendanceModes.push(...details.attendanceModes)
    }

    if (details.tags.length) {
      tags.push(...details.tags)
    }
  })

  return {
    cities: collectUniqueValues(cities),
    nationalities: collectUniqueValues(nationalities),
    relationshipStatuses: collectUniqueValues(relationshipStatuses),
    attendanceModes: collectUniqueValues(attendanceModes),
    ages: collectUniqueValues(ages),
    tags: collectUniqueValues(tags),
  }
}

function splitFilterValue(value = '') {
  return normalizeText(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function matchesFilterValue(candidate, expected = '') {
  if (!expected) {
    return true
  }

  const candidateValue = normalizeKey(candidate)
  return splitFilterValue(expected).some((item) => candidateValue === normalizeKey(item))
}

function matchesSearchTerm(details, query = '') {
  const term = normalizeKey(query)

  if (!term) {
    return true
  }

  const haystack = [
    details.title,
    details.description,
    details.city,
    details.nationality,
    details.age,
    details.relationshipStatus,
    details.attendanceModes.join(' '),
    details.tags.join(' '),
    details.slug,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(term)
}

function matchesAttendance(details, expected = '') {
  if (!expected) {
    return true
  }

  const expectedValues = splitFilterValue(expected).map(normalizeKey)
  const candidateValues = details.attendanceModes.map(normalizeKey)

  return expectedValues.some((value) => candidateValues.includes(value))
}

export function filterCatalogModels(models = [], filters = {}) {
  const list = Array.isArray(models) ? models : []
  const query = normalizeText(filters.query)
  const city = normalizeText(filters.city)
  const nationality = normalizeText(filters.nationality)
  const age = normalizeText(filters.age)
  const relationshipStatus = normalizeText(filters.relationshipStatus)
  const attendance = normalizeText(filters.attendance)

  return list.filter((model) => {
    if (!model || !model.slug) {
      return false
    }

    const details = getCatalogModelDetails(model)
    details.slug = model.slug

    return (
      matchesSearchTerm(details, query) &&
      matchesFilterValue(details.city, city) &&
      matchesFilterValue(details.nationality, nationality) &&
      matchesFilterValue(details.age, age) &&
      matchesFilterValue(details.relationshipStatus, relationshipStatus) &&
      matchesAttendance(details, attendance)
    )
  })
}

export function parseCatalogFilters(searchParams = new URLSearchParams()) {
  const params = searchParams instanceof URLSearchParams ? searchParams : new URLSearchParams(searchParams)

  return {
    query: params.get('q') || '',
    city: params.get('city') || '',
    nationality: params.get('nationality') || '',
    age: params.get('age') || '',
    relationshipStatus: params.get('relationshipStatus') || '',
    attendance: params.get('attendance') || '',
  }
}

export function hasCatalogFilters(filters = {}) {
  return Boolean(
    normalizeText(filters.query) ||
      normalizeText(filters.city) ||
      normalizeText(filters.nationality) ||
      normalizeText(filters.age) ||
      normalizeText(filters.relationshipStatus) ||
      normalizeText(filters.attendance),
  )
}

export function buildCatalogFacetPath(facetType = 'city', facetValue = '') {
  const normalizedFacetType = facetType === 'nationality' ? 'nationalidad' : 'ciudad'
  const slug = slugifyCatalogValue(facetValue)

  if (!slug) {
    return `/encuentros/${normalizedFacetType}`
  }

  return `/encuentros/${normalizedFacetType}/${slug}`
}

export function buildCatalogCombinedFacetPath({ city = '', nationality = '' } = {}) {
  const citySlug = slugifyCatalogValue(city)
  const nationalitySlug = slugifyCatalogValue(nationality)

  if (!citySlug && !nationalitySlug) {
    return '/encuentros/ciudad'
  }

  if (citySlug && nationalitySlug) {
    return `/encuentros/ciudad/${citySlug}/nacionalidad/${nationalitySlug}`
  }

  if (citySlug) {
    return buildCatalogFacetPath('city', city)
  }

  return buildCatalogFacetPath('nationality', nationality)
}

export function resolveCatalogFacetValue(values = [], facetSlug = '') {
  const normalizedSlug = slugifyCatalogValue(facetSlug)

  if (!normalizedSlug) {
    return ''
  }

  return (Array.isArray(values) ? values : []).find((value) => slugifyCatalogValue(value) === normalizedSlug) || ''
}

export function buildCatalogCanonicalPath(filters = {}, fallbackPath = '/encuentros') {
  const city = normalizeText(filters.city)
  const nationality = normalizeText(filters.nationality)
  const hasOnlyCityAndNationality =
    Boolean(city) &&
    Boolean(nationality) &&
    !normalizeText(filters.query) &&
    !normalizeText(filters.age) &&
    !normalizeText(filters.relationshipStatus) &&
    !normalizeText(filters.attendance)
  const hasOnlyCity =
    Boolean(city) &&
    !normalizeText(filters.query) &&
    !normalizeText(filters.age) &&
    !normalizeText(filters.relationshipStatus) &&
    !normalizeText(filters.attendance) &&
    !nationality
  const hasOnlyNationality =
    Boolean(nationality) &&
    !normalizeText(filters.query) &&
    !normalizeText(filters.age) &&
    !normalizeText(filters.relationshipStatus) &&
    !normalizeText(filters.attendance) &&
    !city

  if (hasOnlyCityAndNationality) {
    return buildCatalogCombinedFacetPath({ city, nationality })
  }

  if (hasOnlyCity) {
    return buildCatalogFacetPath('city', city)
  }

  if (hasOnlyNationality) {
    return buildCatalogFacetPath('nationality', nationality)
  }

  return fallbackPath
}

export function buildCatalogSearchParams(filters = {}, currentSearch = '') {
  const params = currentSearch instanceof URLSearchParams ? new URLSearchParams(currentSearch) : new URLSearchParams(currentSearch || '')
  const nextFilters = {
    q: filters.query,
    city: filters.city,
    nationality: filters.nationality,
    age: filters.age,
    relationshipStatus: filters.relationshipStatus,
    attendance: filters.attendance,
  }

  Object.entries(nextFilters).forEach(([key, value]) => {
    if (normalizeText(value)) {
      params.set(key, normalizeText(value))
    } else {
      params.delete(key)
    }
  })

  return params
}
