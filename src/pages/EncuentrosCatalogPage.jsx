import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { HiOutlineShieldCheck } from 'react-icons/hi'
import { Seo } from '../components/Seo'
import { EncounterCatalogCard } from '../components/EncounterCatalogCard'
import { fetchEncuentrosModels } from '../lib/supabase'
import {
  buildCatalogCanonicalPath,
  buildCatalogFacetOptions,
  buildCatalogFacetPath,
  filterCatalogModels,
  hasCatalogFilters,
  parseCatalogFilters,
  slugifyCatalogValue,
} from '../utils/encuentrosCatalog'

export function EncuentrosCatalogPage() {
  const { t } = useTranslation()
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo(() => parseCatalogFilters(searchParams), [searchParams])

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

  const pageTitle = t('nav.encuentros', 'Encuentros')
  const canonicalPath = buildCatalogCanonicalPath(filters, '/encuentros')
  const visibleModels = useMemo(() => models.filter((model) => model && model.slug), [models])
  const facetOptions = useMemo(() => buildCatalogFacetOptions(visibleModels), [visibleModels])
  const filteredModels = useMemo(
    () => filterCatalogModels(visibleModels, filters),
    [filters, visibleModels],
  )
  const isFiltered = hasCatalogFilters(filters)

  function updateFilters(patch = {}) {
    const next = new URLSearchParams(searchParams)

    Object.entries({
      q: patch.query ?? filters.query,
      city: patch.city ?? filters.city,
      nationality: patch.nationality ?? filters.nationality,
      age: patch.age ?? filters.age,
      relationshipStatus: patch.relationshipStatus ?? filters.relationshipStatus,
      attendance: patch.attendance ?? filters.attendance,
    }).forEach(([key, value]) => {
      if (String(value || '').trim()) {
        next.set(key, String(value).trim())
      } else {
        next.delete(key)
      }
    })

    setSearchParams(next, { replace: true })
  }

  function clearFilters() {
    setSearchParams({}, { replace: true })
  }

  function facetHref(type, value) {
    return buildCatalogFacetPath(type, value)
  }

  return (
    <main className="encuentros-catalog-page">
      <div className="encuentros-catalog-shell">
        <Seo
          title="Kinkly | Encuentros"
          description="Catalogo de perfiles con URLs publicas, tarjetas compactas y acceso directo al perfil."
          canonicalPath={canonicalPath}
          noindex={isFiltered}
        />

        <header className="encuentros-catalog-header">
          <span className="encuentros-catalog-kicker">
            <HiOutlineShieldCheck aria-hidden="true" />
            <span>{pageTitle}</span>
          </span>
          <h1>Modelos disponibles</h1>
          <p>
            Tarjetas compactas por modelo, con su propia URL publica y acceso directo al perfil.
          </p>
        </header>

        <section className="catalog-home-section">
          <div className="catalog-home-chip-row">
            {filters.city ? <span className="catalog-home-filter-chip is-static">Ciudad: {filters.city}</span> : null}
            {filters.nationality ? (
              <span className="catalog-home-filter-chip is-static">Nacionalidad: {filters.nationality}</span>
            ) : null}
            {filters.relationshipStatus ? (
              <span className="catalog-home-filter-chip is-static">Estado: {filters.relationshipStatus}</span>
            ) : null}
            {filters.attendance ? (
              <span className="catalog-home-filter-chip is-static">Presencia: {filters.attendance}</span>
            ) : null}
            {(filters.city || filters.nationality || filters.relationshipStatus || filters.attendance) ? (
              <button type="button" className="catalog-home-filter-chip" onClick={clearFilters}>
                Limpiar filtros
              </button>
            ) : null}
          </div>

          <div className="catalog-home-filter-cluster">
            <div className="catalog-home-filter-block">
              <p className="catalog-home-filter-label">Ciudades</p>
              <div className="catalog-home-chip-row">
                {facetOptions.cities.slice(0, 12).map((city) => (
                  <Link
                    key={city}
                    className={filters.city === city ? 'catalog-home-filter-chip is-active' : 'catalog-home-filter-chip'}
                    to={facetHref('city', city)}
                  >
                    {city}
                  </Link>
                ))}
              </div>
            </div>

            <div className="catalog-home-filter-block">
              <p className="catalog-home-filter-label">Nacionalidades</p>
              <div className="catalog-home-chip-row">
                {facetOptions.nationalities.slice(0, 12).map((nationality) => (
                  <Link
                    key={nationality}
                    className={
                      filters.nationality === nationality
                        ? 'catalog-home-filter-chip is-active'
                        : 'catalog-home-filter-chip'
                    }
                    to={facetHref('nationality', nationality)}
                  >
                    {nationality}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="catalog-home-filter-cluster">
            <div className="catalog-home-filter-block">
              <p className="catalog-home-filter-label">Busquedas rapidas</p>
              <div className="catalog-home-chip-row">
                {facetOptions.relationshipStatuses.slice(0, 8).map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={
                      filters.relationshipStatus === status
                        ? 'catalog-home-filter-chip is-active'
                        : 'catalog-home-filter-chip'
                    }
                    onClick={() => updateFilters({ relationshipStatus: filters.relationshipStatus === status ? '' : status })}
                    aria-pressed={filters.relationshipStatus === status}
                  >
                    {status}
                  </button>
                ))}
                {facetOptions.attendanceModes.slice(0, 6).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={filters.attendance === mode ? 'catalog-home-filter-chip is-active' : 'catalog-home-filter-chip'}
                    onClick={() => updateFilters({ attendance: filters.attendance === mode ? '' : mode })}
                    aria-pressed={filters.attendance === mode}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
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
                  ? 'Prueba con otra ciudad o nacionalidad, o limpia los filtros para volver al catalogo completo.'
                  : 'Cuando publiques modelos desde el panel, apareceran aqui como tarjetas compactas.'}
              </p>
              {visibleModels.length ? (
                <button type="button" className="encuentros-catalog-state-button" onClick={clearFilters}>
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
