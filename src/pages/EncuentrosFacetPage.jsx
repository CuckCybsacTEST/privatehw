import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { AiOutlineSearch } from 'react-icons/ai'
import { HiOutlineShieldCheck } from 'react-icons/hi'
import { Seo } from '../components/Seo'
import { EncounterCatalogCard } from '../components/EncounterCatalogCard'
import { fetchEncuentrosModels } from '../lib/supabase'
import {
  buildCatalogCombinedFacetPath,
  buildCatalogFacetOptions,
  buildCatalogFacetPath,
  buildCatalogSearchParams,
  filterCatalogModels,
  getCatalogModelDetails,
  parseCatalogFilters,
  resolveCatalogFacetValue,
  slugifyCatalogValue,
} from '../utils/encuentrosCatalog'

function FacetLink({ label, to, active = false }) {
  return (
    <Link className={active ? 'catalog-home-filter-chip is-active' : 'catalog-home-filter-chip'} to={to}>
      {label}
    </Link>
  )
}

function SearchField({ value, onChange, placeholder }) {
  return (
    <label className="catalog-home-search-field">
      <AiOutlineSearch aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </label>
  )
}

function getFacetKey(facetType = 'city') {
  return facetType === 'nationality' ? 'nationality' : 'city'
}

function getFacetBasePath(facetType = 'city') {
  return facetType === 'nationality' ? '/encuentros/nacionalidad' : '/encuentros/ciudad'
}

function getFacetLabel(facetType = 'city') {
  return facetType === 'nationality' ? 'Nacionalidades' : 'Ciudades'
}

function getFacetSingularLabel(facetType = 'city') {
  return facetType === 'nationality' ? 'Nacionalidad' : 'Ciudad'
}

function buildFacetCombinationPath(primaryFacetType, primaryValue, secondaryValue) {
  const normalizedPrimaryFacetType = getFacetKey(primaryFacetType)

  if (normalizedPrimaryFacetType === 'city') {
    return buildCatalogCombinedFacetPath({ city: primaryValue, nationality: secondaryValue })
  }

  return buildCatalogCombinedFacetPath({ city: secondaryValue, nationality: primaryValue })
}

function buildFacetCounts(models = [], facetKey = 'city') {
  const counts = new Map()

  ;(Array.isArray(models) ? models : []).forEach((model) => {
    const details = getCatalogModelDetails(model)
    const value = facetKey === 'nationality' ? details.nationality : details.city

    if (!value) {
      return
    }

    counts.set(value, (counts.get(value) || 0) + 1)
  })

  return Array.from(counts.entries())
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1]
      }

      return left[0].localeCompare(right[0])
    })
    .map(([label, count]) => ({ label, count }))
}

export function EncuentrosFacetPage({ facetType = 'city', secondaryFacetType = '' }) {
  const { citySlug = '', nationalitySlug = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const primaryFacetType = getFacetKey(facetType)
  const secondaryFacetKey = secondaryFacetType ? getFacetKey(secondaryFacetType) : ''
  const primarySlug = primaryFacetType === 'city' ? citySlug : nationalitySlug
  const secondarySlug = secondaryFacetKey
    ? secondaryFacetKey === 'city'
      ? citySlug
      : nationalitySlug
    : ''
  const primaryFacetBasePath = getFacetBasePath(primaryFacetType)
  const primaryFacetValuesLabel = getFacetLabel(primaryFacetType)
  const secondaryFacetValuesLabel = secondaryFacetKey ? getFacetLabel(secondaryFacetKey) : ''
  const rawFilters = useMemo(() => parseCatalogFilters(searchParams), [searchParams])

  useEffect(() => {
    let cancelled = false

    setLoading(true)
    setError('')

    fetchEncuentrosModels()
      .then((items) => {
        if (!cancelled) {
          setModels(Array.isArray(items) ? items : [])
        }
      })
      .catch((nextError) => {
        if (!cancelled) {
          setModels([])
          setError(nextError?.message || 'No se pudieron cargar los modelos.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const visibleModels = useMemo(() => models.filter((model) => model && model.slug), [models])
  const facetOptions = useMemo(() => buildCatalogFacetOptions(visibleModels), [visibleModels])
  const primaryFacetValues = primaryFacetType === 'nationality' ? facetOptions.nationalities : facetOptions.cities
  const secondaryFacetValues = secondaryFacetKey
    ? secondaryFacetKey === 'nationality'
      ? facetOptions.nationalities
      : facetOptions.cities
    : []
  const resolvedPrimaryLabel = primarySlug ? resolveCatalogFacetValue(primaryFacetValues, primarySlug) : ''
  const resolvedSecondaryLabel = secondarySlug
    ? resolveCatalogFacetValue(secondaryFacetValues, secondarySlug)
    : ''
  const facetExists = Boolean(!primarySlug || resolvedPrimaryLabel) && Boolean(!secondarySlug || resolvedSecondaryLabel)
  const hasPrimaryFacet = Boolean(resolvedPrimaryLabel)
  const hasSecondaryFacet = Boolean(secondaryFacetKey && resolvedSecondaryLabel)
  const noindex = Boolean(
    rawFilters.query ||
      rawFilters.age ||
      rawFilters.relationshipStatus ||
      rawFilters.attendance ||
      !facetExists,
  )

  const canonicalPath = useMemo(() => {
    if (!facetExists) {
      return primaryFacetBasePath
    }

    if (hasPrimaryFacet && hasSecondaryFacet) {
      return buildFacetCombinationPath(primaryFacetType, resolvedPrimaryLabel, resolvedSecondaryLabel)
    }

    if (hasPrimaryFacet) {
      return buildCatalogFacetPath(primaryFacetType, resolvedPrimaryLabel)
    }

    return primaryFacetBasePath
  }, [
    facetExists,
    hasPrimaryFacet,
    hasSecondaryFacet,
    primaryFacetBasePath,
    primaryFacetType,
    resolvedPrimaryLabel,
    resolvedSecondaryLabel,
  ])

  const pageTitle = useMemo(() => {
    if (hasPrimaryFacet && hasSecondaryFacet) {
      return `Kinkly | ${resolvedPrimaryLabel} y ${resolvedSecondaryLabel}`
    }

    if (hasPrimaryFacet) {
      return `Kinkly | ${resolvedPrimaryLabel}`
    }

    return `Kinkly | ${primaryFacetValuesLabel}`
  }, [
    hasPrimaryFacet,
    hasSecondaryFacet,
    primaryFacetValuesLabel,
    resolvedPrimaryLabel,
    resolvedSecondaryLabel,
    secondaryFacetKey,
  ])

  const pageDescription = useMemo(() => {
    if (hasPrimaryFacet && hasSecondaryFacet) {
      return `Directorio de perfiles filtrado por ${resolvedPrimaryLabel} y ${resolvedSecondaryLabel}, con URLs limpias, enlazado interno y rutas listas para SEO local.`
    }

    if (hasPrimaryFacet) {
      return `Directorio de perfiles filtrado por ${resolvedPrimaryLabel}, con slugs propios, enlaces internos y navegacion lista para SEO local.`
    }

    return `Explora ${primaryFacetValuesLabel.toLowerCase()} disponibles y entra a cada landing para ver perfiles segmentados.`
  }, [hasPrimaryFacet, hasSecondaryFacet, primaryFacetValuesLabel, resolvedPrimaryLabel, resolvedSecondaryLabel])

  const facetScopeFilters = useMemo(
    () => ({
      ...rawFilters,
      ...(resolvedPrimaryLabel ? { [primaryFacetType]: resolvedPrimaryLabel } : {}),
      ...(hasSecondaryFacet
        ? {
            [secondaryFacetKey]: resolvedSecondaryLabel,
          }
        : {}),
    }),
    [hasSecondaryFacet, primaryFacetType, rawFilters, resolvedPrimaryLabel, resolvedSecondaryLabel, secondaryFacetKey],
  )

  const facetScopedModels = useMemo(() => {
    if (!facetExists) {
      return []
    }

    return filterCatalogModels(visibleModels, facetScopeFilters)
  }, [facetExists, facetScopeFilters, visibleModels])

  const filteredModels = facetScopedModels

  const secondarySuggestionFacetKey = primaryFacetType === 'city' ? 'nationality' : 'city'
  const combinationSourceModels = useMemo(() => {
    if (!resolvedPrimaryLabel) {
      return []
    }

    return filterCatalogModels(visibleModels, {
      ...rawFilters,
      [primaryFacetType]: resolvedPrimaryLabel,
    })
  }, [primaryFacetType, rawFilters, resolvedPrimaryLabel, visibleModels])
  const suggestionCounts = useMemo(
    () => buildFacetCounts(combinationSourceModels, secondarySuggestionFacetKey),
    [combinationSourceModels, secondarySuggestionFacetKey],
  )
  const suggestionLinks = useMemo(() => {
    if (!resolvedPrimaryLabel) {
      return []
    }

    return suggestionCounts.slice(0, 6).map(({ label, count }) => ({
      label,
      count,
      to: buildFacetCombinationPath(primaryFacetType, resolvedPrimaryLabel, label),
      active: hasSecondaryFacet && resolvedSecondaryLabel === label,
    }))
  }, [hasSecondaryFacet, primaryFacetType, resolvedPrimaryLabel, resolvedSecondaryLabel, suggestionCounts])

  function updateQuerySearch(value) {
    const next = buildCatalogSearchParams({ ...rawFilters, query: value }, searchParams)
    setSearchParams(next, { replace: true })
  }

  function clearSearch() {
    setSearchParams({}, { replace: true })
  }

  function buildPrimaryFacetHref(value) {
    if (hasSecondaryFacet) {
      return buildFacetCombinationPath(primaryFacetType, value, resolvedSecondaryLabel)
    }

    return buildCatalogFacetPath(primaryFacetType, value)
  }

  function buildSecondaryFacetHref(value) {
    if (!resolvedPrimaryLabel) {
      return buildCatalogFacetPath(secondarySuggestionFacetKey, value)
    }

    return buildFacetCombinationPath(primaryFacetType, resolvedPrimaryLabel, value)
  }

  const hasQuery = Boolean(rawFilters.query)
  const facetBadges = [
    hasPrimaryFacet
      ? { key: 'primary', label: `${getFacetSingularLabel(primaryFacetType)}: ${resolvedPrimaryLabel}` }
      : null,
    hasSecondaryFacet
      ? { key: 'secondary', label: `${getFacetSingularLabel(secondaryFacetKey)}: ${resolvedSecondaryLabel}` }
      : null,
    hasQuery ? { key: 'query', label: `Busqueda: ${rawFilters.query}` } : null,
  ].filter(Boolean)

  return (
    <main className="encuentros-catalog-page">
      <div className="encuentros-catalog-shell">
        <Seo title={pageTitle} description={pageDescription} canonicalPath={canonicalPath} noindex={noindex} />

        <header className="encuentros-catalog-header">
          <span className="encuentros-catalog-kicker">
            <HiOutlineShieldCheck aria-hidden="true" />
            <span>{primaryFacetValuesLabel}</span>
          </span>
          <h1>
            {hasPrimaryFacet
              ? hasSecondaryFacet
                ? `Modelos en ${resolvedPrimaryLabel} y ${resolvedSecondaryLabel}`
                : `Modelos en ${resolvedPrimaryLabel}`
              : primaryFacetValuesLabel}
          </h1>
          <p>
            {hasPrimaryFacet
              ? hasSecondaryFacet
                ? `La landing combina ${resolvedPrimaryLabel} y ${resolvedSecondaryLabel} para reforzar el cluster SEO y enlazar con perfiles reales.`
                : 'Cada landing segmenta el catalogo por ciudad o nacionalidad con una URL limpia y enlaces directos al perfil.'
              : 'Selecciona una ciudad o nacionalidad para abrir su landing y navegar por perfiles segmentados.'}
          </p>
        </header>

        <section className="catalog-home-section">
          <div className="catalog-home-filter-cluster">
            <div className="catalog-home-filter-block">
              <p className="catalog-home-filter-label">{primaryFacetValuesLabel}</p>
              <div className="catalog-home-chip-row">
                {primaryFacetValues.slice(0, 18).map((value) => (
                  <FacetLink
                    key={value}
                    label={value}
                    to={buildPrimaryFacetHref(value)}
                    active={resolvedPrimaryLabel === value}
                  />
                ))}
              </div>
            </div>

            {secondaryFacetKey ? (
              <div className="catalog-home-filter-block">
                <p className="catalog-home-filter-label">{secondaryFacetValuesLabel}</p>
                <div className="catalog-home-chip-row">
                  {secondaryFacetValues.slice(0, 18).map((value) => (
                    <FacetLink
                      key={value}
                      label={value}
                      to={buildSecondaryFacetHref(value)}
                      active={resolvedSecondaryLabel === value}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {suggestionLinks.length ? (
              <div className="catalog-home-filter-block">
                <p className="catalog-home-filter-label">Combinaciones destacadas</p>
                <div className="catalog-home-chip-row">
                  {suggestionLinks.map(({ label, count, to, active }) => (
                    <FacetLink
                      key={label}
                      label={`${label} (${count})`}
                      to={to}
                      active={active}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="catalog-home-section">
          <div className="section-heading">
            <p className="section-kicker">{hasPrimaryFacet ? 'Landing segmentada' : 'Hub de navegacion'}</p>
            <h2>
              {hasPrimaryFacet
                ? hasSecondaryFacet
                  ? `Perfiles disponibles en ${resolvedPrimaryLabel} y ${resolvedSecondaryLabel}`
                  : `Perfiles disponibles en ${resolvedPrimaryLabel}`
                : `Explora ${primaryFacetValuesLabel.toLowerCase()}`}
            </h2>
            <p>
              {hasPrimaryFacet
                ? hasSecondaryFacet
                  ? 'La landing combinada mantiene la URL limpia, enlaza a perfiles reales y sirve como nodo fuerte para el cluster local.'
                  : 'La landing hereda el catalogo real, mantiene la URL limpia y puede alimentar SEO local sin depender de parametros.'
                : 'Desde aqui puedes saltar a una ciudad o nacionalidad concreta para continuar el recorrido del usuario y del bot.'}
            </p>
          </div>

          <form className="catalog-home-search" onSubmit={(event) => event.preventDefault()} role="search">
            <SearchField
              value={rawFilters.query}
              onChange={(event) => updateQuerySearch(event.target.value)}
              placeholder="Buscar por nombre, ciudad, nacionalidad o categoria"
            />
            <div className="catalog-home-search-actions">
              <button type="button" className="hero-primary-cta" onClick={clearSearch}>
                Limpiar busqueda
              </button>
              <Link className="hero-secondary-cta" to="/encuentros">
                Ver todo el catalogo
              </Link>
            </div>
          </form>

          <div className="catalog-home-chip-row" aria-label="Estado del filtro">
            {facetBadges.map((badge) => (
              <span key={badge.key} className="catalog-home-filter-chip is-static">
                {badge.label}
              </span>
            ))}
          </div>
        </section>

        {loading ? (
          <section className="encuentros-catalog-state" aria-live="polite">
            <div className="encuentros-catalog-state-card is-loading">
              <div className="encuentros-catalog-skeleton-media" />
              <div className="encuentros-catalog-skeleton-copy">
                <div className="encuentros-catalog-skeleton-line is-title" />
                <div className="encuentros-catalog-skeleton-line" />
                <div className="encuentros-catalog-skeleton-line is-short" />
              </div>
            </div>
          </section>
        ) : error ? (
          <section className="encuentros-catalog-state" aria-live="polite">
            <article className="encuentros-catalog-state-card">
              <p className="encuentros-catalog-state-title">No se pudo cargar el catalogo.</p>
              <p className="encuentros-catalog-state-copy">{error}</p>
              <button type="button" className="encuentros-catalog-state-button" onClick={() => window.location.reload()}>
                Reintentar
              </button>
            </article>
          </section>
        ) : filteredModels.length ? (
          <section className="encuentros-catalog-grid" aria-label="Catalogo de modelos">
            {filteredModels.map((model) => (
              <EncounterCatalogCard key={model.slug} model={model} />
            ))}
          </section>
        ) : (
          <section className="encuentros-catalog-state" aria-live="polite">
            <article className="encuentros-catalog-state-card">
              <p className="encuentros-catalog-state-title">
                {visibleModels.length ? 'No hay coincidencias para ese filtro.' : 'Todavia no hay modelos publicados.'}
              </p>
              <p className="encuentros-catalog-state-copy">
                {visibleModels.length
                  ? 'Prueba con otra ciudad, otra nacionalidad o limpia la busqueda para volver al catalogo completo.'
                  : 'Cuando publiques modelos desde el panel, apareceran aqui como tarjetas compactas.'}
              </p>
              {visibleModels.length ? (
                <button type="button" className="encuentros-catalog-state-button" onClick={clearSearch}>
                  Ver todo el catalogo
                </button>
              ) : null}
            </article>
          </section>
        )}
      </div>
    </main>
  )
}
