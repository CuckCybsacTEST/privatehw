import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AiOutlineCalendar, AiOutlinePicture, AiOutlineRight } from 'react-icons/ai'
import { HiOutlineShieldCheck } from 'react-icons/hi'
import { AtmosphericBackdrop } from '../components/AtmosphericBackdrop'
import { fetchEncuentrosModels } from '../lib/supabase'

function CatalogPrice({ value }) {
  const text = String(value || '').trim()
  return text ? <strong className="encuentros-catalog-price">{text}</strong> : null
}

function countGalleryImages(content = {}) {
  return Array.isArray(content.topCarouselImages) ? content.topCarouselImages.length : 0
}

function countServices(content = {}) {
  return Array.isArray(content.extraItems) ? content.extraItems.filter(Boolean).length : 0
}

export function EncuentrosCatalogPage() {
  const { t } = useTranslation()
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    fetchEncuentrosModels()
      .then((items) => {
        if (!cancelled) {
          setModels(Array.isArray(items) ? items : [])
        }
      })
      .catch((nextError) => {
        if (!cancelled) {
          setError(nextError?.message || t('encuentros.bookingError'))
          setModels([])
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
  }, [t])

  return (
    <main className="creator-home encuentros-catalog-page encuentros-screen">
      <AtmosphericBackdrop
        variant="premium"
        intensity="soft"
        glowPosition="center-right"
        grain={false}
        withVignette={false}
        className="encuentros-page-backdrop"
      />

      <div className="encuentros-screen-shell encuentros-catalog-shell">
        <section className="encuentros-screen-hero" aria-labelledby="encuentros-screen-title">
          <div className="encuentros-screen-topline">
            <span className="encuentros-screen-status-pill">
              <HiOutlineShieldCheck aria-hidden="true" />
              <span>{t('encuentros.bookingPageEyebrow')}</span>
            </span>
          </div>

          <div className="encuentros-screen-title-row">
            <h1 id="encuentros-screen-title">{t('encuentros.bookingPageTitle')}</h1>
          </div>

          <p className="encuentros-screen-lead">{t('encuentros.bookingPageIntro')}</p>
        </section>

        {loading ? (
          <div className="encuentros-catalog-state">
            <p>{t('loading.general')}</p>
          </div>
        ) : null}

        {error ? (
          <div className="encuentros-catalog-state is-error">
            <p>{error}</p>
          </div>
        ) : null}

        <section className="encuentros-catalog-grid" aria-label={t('encuentros.bookingPageTitle')}>
          {models.map((model) => {
            const content = model.content || {}
            const booking = content.encuentrosBooking || {}
            const previewImage = Array.isArray(content.topCarouselImages)
              ? content.topCarouselImages[0]?.src || content.topCarouselImages[0]?.image || ''
              : ''

            return (
              <article className="encuentros-catalog-card" key={model.slug}>
                <Link className="encuentros-catalog-card-cover" to={`/encuentros/${encodeURIComponent(model.slug)}`}>
                  {previewImage ? (
                    <img src={previewImage} alt={model.displayName || booking.galleryTitle || t('encuentros.galleryTitle')} />
                  ) : (
                    <div className="encuentros-catalog-card-empty">
                      <AiOutlinePicture aria-hidden="true" />
                    </div>
                  )}
                </Link>

                <div className="encuentros-catalog-card-body">
                  <div className="encuentros-catalog-card-head">
                    <span className="encuentros-catalog-card-badge">
                      <AiOutlineCalendar aria-hidden="true" />
                      <span>{model.status}</span>
                    </span>
                    <h2>{model.displayName || booking.galleryTitle || t('encuentros.bookingPageTitle')}</h2>
                    <p>{content.heroDescription || booking.description || t('encuentros.bookingPageIntro')}</p>
                  </div>

                  <div className="encuentros-catalog-card-meta" aria-label={model.displayName || booking.galleryTitle || ''}>
                    <span>
                      <strong>{countGalleryImages(content)}</strong>
                      <small>{t('encuentros.galleryTitle')}</small>
                    </span>
                    <span>
                      <strong>{countServices(content)}</strong>
                      <small>{t('admin.content.extraList')}</small>
                    </span>
                    <span>
                      <CatalogPrice value={content.presencialPrice || booking.priceLabel} />
                      <small>{content.presencialUnit || t('encuentros.dashboardConfigWindow')}</small>
                    </span>
                  </div>

                  <div className="encuentros-catalog-card-actions">
                    <Link className="hero-secondary-cta" to={`/encuentros/${encodeURIComponent(model.slug)}`}>
                      Ver perfil
                    </Link>
                    <Link className="hero-primary-cta" to={`/encuentros/${encodeURIComponent(model.slug)}`}>
                      Reservar
                      <AiOutlineRight aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </article>
            )
          })}
        </section>
      </div>
    </main>
  )
}
