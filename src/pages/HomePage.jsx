import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AiOutlineSearch } from 'react-icons/ai'
import { Seo } from '../components/Seo'
import {
  ModelCTASection,
  LatestAnnouncementsSection,
  PrivateExperienceSection,
} from '../components/HomeSections'
import { HomeFooter } from '../components/HomeFooter'
import { fetchEncuentrosModels } from '../lib/supabase'
import {
  buildCatalogCanonicalPath,
  buildCatalogSearchParams,
  hasCatalogFilters,
  parseCatalogFilters,
} from '../utils/encuentrosCatalog'

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [models, setModels] = useState([])

  const filters = useMemo(() => parseCatalogFilters(searchParams), [searchParams])

  useEffect(() => {
    let cancelled = false

    fetchEncuentrosModels()
      .then((items) => {
        if (!cancelled) {
          setModels(Array.isArray(items) ? items : [])
        }
      })
      .catch(() => {
        if (!cancelled) {
          setModels([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const latestAnnouncements = useMemo(
    () =>
      (Array.isArray(models) ? models : [])
        .filter(
          (model) =>
            model &&
            model.slug &&
            model.status === 'published' &&
            (!model.publishedAt || new Date(model.publishedAt).getTime() <= Date.now()),
        )
        .slice()
        .sort((left, right) => {
          const leftTime = left.publishedAt ? new Date(left.publishedAt).getTime() : 0
          const rightTime = right.publishedAt ? new Date(right.publishedAt).getTime() : 0
          if (rightTime !== leftTime) {
            return rightTime - leftTime
          }

          const leftSort = Number.parseInt(left.sortOrder || '0', 10) || 0
          const rightSort = Number.parseInt(right.sortOrder || '0', 10) || 0
          if (rightSort !== leftSort) {
            return rightSort - leftSort
          }

          return rightTime - leftTime
        })
        .slice(0, 10),
    [models],
  )
  const isFiltered = hasCatalogFilters(filters)
  const quickChips = useMemo(
    () => [
      { label: 'Ciudad', to: '/encuentros/ciudad' },
      { label: 'Nacionalidad', to: '/encuentros/nacionalidad' },
      { label: 'Disponibilidad', to: '/encuentros?attendance=Disponible' },
      { label: 'Categoria', to: '/encuentros' },
      { label: 'Ver todo', to: '/encuentros' },
    ],
    [],
  )

  function updateFilters(patch = {}) {
    const next = buildCatalogSearchParams({ ...filters, ...patch }, searchParams)
    setSearchParams(next, { replace: true })
  }

  function handleSearchChange(event) {
    updateFilters({ query: event.target.value })
  }

  return (
    <main className="catalog-home-page">
      <Seo
        title="Kinkly | Directorio privado"
        description="Portada principal de Kinkly para explorar perfiles por ciudad, nacionalidad y contenido publicado."
        canonicalPath={buildCatalogCanonicalPath(filters, '/')}
        noindex={isFiltered}
      />

      <div className="catalog-home-shell">
        <header className="catalog-home-hero">
          <div className="catalog-home-hero-copy is-home-intro">
            <h1>Encuentra modelos por ciudad, nacionalidad y perfil público</h1>
            <p>
              Kinkly reúne fichas con URL propia, filtros locales y navegación preparada para crecer sin perder
              claridad ni velocidad.
            </p>

            <form className="catalog-home-search" onSubmit={(event) => event.preventDefault()} role="search">
              <label className="catalog-home-search-field">
                <AiOutlineSearch aria-hidden="true" />
                <input
                  type="search"
                  value={filters.query}
                  onChange={handleSearchChange}
                  placeholder="Buscar ciudad, nacionalidad o perfil"
                  aria-label="Buscar ciudad, nacionalidad o perfil"
                />
                <button type="submit" className="catalog-home-search-button">
                  Buscar
                </button>
              </label>
            </form>

            <div className="catalog-home-chip-row">
              {quickChips.map((chip) => (
                <Link key={chip.label} className="catalog-home-chip" to={chip.to}>
                  {chip.label}
                </Link>
              ))}
            </div>
          </div>
        </header>

        <LatestAnnouncementsSection posts={latestAnnouncements} />
        <PrivateExperienceSection />
        <ModelCTASection />
        <HomeFooter />
      </div>
    </main>
  )
}
