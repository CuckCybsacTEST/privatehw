import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AiOutlineFlag, AiOutlinePicture, AiOutlineRight, AiOutlineUser } from 'react-icons/ai'
import { HiOutlineLocationMarker, HiOutlineShieldCheck } from 'react-icons/hi'
import { fetchEncuentrosModels } from '../lib/supabase'

function normalizeMediaUrl(src = '') {
  const value = String(src || '').trim()

  if (!value) {
    return ''
  }

  if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:') || value.startsWith('/')) {
    return value
  }

  return `/${value.replace(/^\/+/, '')}`
}

function collectModelImages(content = {}) {
  const pools = [
    content.profileGalleryImages,
    content.galleryImages,
    content.topCarouselImages,
    content.bottomCarouselImages,
  ]

  const images = []

  pools.forEach((pool) => {
    if (!Array.isArray(pool)) {
      return
    }

    pool.forEach((item) => {
      const src = normalizeMediaUrl(
        typeof item === 'string' ? item : item?.src || item?.image || item?.url || '',
      )

      if (src) {
        images.push(src)
      }
    })
  })

  return Array.from(new Set(images))
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

function getTopBadgeLabel(content = {}) {
  const raw =
    content.profileTopBadge ??
    content.topBadge ??
    content.badgeTop ??
    content.isTop ??
    content.featured ??
    ''

  if (typeof raw === 'string' && raw.trim()) {
    return raw.trim()
  }

  return raw ? 'Top' : ''
}

function ProfileMetaLine({ icon: Icon, label }) {
  if (!label) {
    return null
  }

  return (
    <div className="encuentros-catalog-card-meta-row">
      <Icon aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

function CatalogCard({ model }) {
  const content = model?.content || {}
  const booking = content.encuentrosBooking || {}
  const title = String(model?.displayName || content.heroTitle || model?.slug || 'Modelo').trim()
  const description =
    getFirstTextValue(content, [
      'profileDescription',
      'heroDescription',
      'presencialDescription',
      'extraLead',
    ]) ||
    getFirstTextValue(booking, ['description']) ||
    'Perfil disponible en el catalogo.'
  const age = getFirstTextValue(content, ['profileAge', 'age', 'edad'])
  const location = getFirstTextValue(content, ['profileLocation', 'location', 'ubicacion'])
  const nationality = getFirstTextValue(content, ['profileNationality', 'nationality', 'pais'])
  const images = useMemo(() => collectModelImages(content), [content])
  const photoCount = images.length
  const coverImage = images[0] || normalizeMediaUrl(content.profileCoverImage || content.coverImage || '')
  const topBadge = getTopBadgeLabel(content)
  const profileHref = `/encuentros/${encodeURIComponent(model?.slug || '')}`

  return (
    <article className="encuentros-catalog-card">
      <Link className="encuentros-catalog-card-media" to={profileHref} aria-label={`Abrir perfil de ${title}`}>
        {coverImage ? (
          <img src={coverImage} alt={title} loading="lazy" />
        ) : (
          <div className="encuentros-catalog-card-empty">
            <AiOutlinePicture aria-hidden="true" />
          </div>
        )}

        {photoCount ? (
          <span className="encuentros-catalog-card-photo-badge">
            <AiOutlinePicture aria-hidden="true" />
            <span>{photoCount}</span>
          </span>
        ) : null}
      </Link>

      <div className="encuentros-catalog-card-body">
        {topBadge ? (
          <span className="encuentros-catalog-card-top-badge">
            <HiOutlineShieldCheck aria-hidden="true" />
            <span>{topBadge}</span>
          </span>
        ) : null}

        <div className="encuentros-catalog-card-copy">
          <h2 className="encuentros-catalog-card-title">
            <Link to={profileHref}>{title}</Link>
          </h2>
          <p className="encuentros-catalog-card-description">{description}</p>
        </div>

        <div className="encuentros-catalog-card-facts" aria-label={`Datos de ${title}`}>
          <ProfileMetaLine icon={AiOutlineUser} label={age} />
          <ProfileMetaLine icon={HiOutlineLocationMarker} label={location} />
          <ProfileMetaLine icon={AiOutlineFlag} label={nationality} />
        </div>

        <div className="encuentros-catalog-card-actions">
          <Link className="encuentros-catalog-card-button" to={profileHref}>
            <span>Ver perfil</span>
            <AiOutlineRight aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  )
}

export function EncuentrosCatalogPage() {
  const { t } = useTranslation()
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
  const visibleModels = useMemo(
    () => models.filter((model) => model && model.slug),
    [models],
  )

  return (
    <main className="encuentros-catalog-page">
      <div className="encuentros-catalog-shell">
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
        ) : visibleModels.length ? (
          <section className="encuentros-catalog-grid" aria-label="Catalogo de modelos">
            {visibleModels.map((model) => (
              <CatalogCard key={model.slug} model={model} />
            ))}
          </section>
        ) : (
          <section className="encuentros-catalog-state" aria-live="polite">
            <article className="encuentros-catalog-state-card">
              <p className="encuentros-catalog-state-title">Todavia no hay modelos publicados.</p>
              <p className="encuentros-catalog-state-copy">
                Cuando publiques modelos desde el panel, apareceran aqui como tarjetas compactas.
              </p>
            </article>
          </section>
        )}
      </div>
    </main>
  )
}
