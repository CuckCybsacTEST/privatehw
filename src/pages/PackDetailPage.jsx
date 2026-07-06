import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CollectionCard } from '../components/CollectionCard'
import { PublicNav } from '../components/PublicNav'
import { Seo } from '../components/Seo'
import { SiteFooter } from '../components/SiteFooter'
import { useAppState } from '../state/AppState'
import { resolveLocalizedSection } from '../utils/localizedContent'

function getPackAssets(pack = {}) {
  return Array.isArray(pack.assets) ? pack.assets : []
}

function getPackPhotos(pack = {}) {
  return getPackAssets(pack).filter((asset) => asset.mediaType !== 'video' && asset.image)
}

function getPackGalleryClassName(photoCount = 0) {
  if (photoCount <= 1) {
    return 'pack-detail-gallery is-single'
  }

  if (photoCount === 2) {
    return 'pack-detail-gallery is-duo'
  }

  if (photoCount === 3) {
    return 'pack-detail-gallery is-trio'
  }

  return 'pack-detail-gallery is-mosaic'
}

function pickRandomRelatedPacks(items = [], currentSlug, limit = 4) {
  const related = items.filter((item) => item.slug !== currentSlug)
  const pool = [...related]

  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const currentValue = pool[index]
    pool[index] = pool[swapIndex]
    pool[swapIndex] = currentValue
  }

  return pool.slice(0, limit)
}

export function PackDetailPage() {
  const { slug } = useParams()
  const { getContentAccess, siteContent } = useAppState()
  const { i18n, t } = useTranslation()
  const videoCollections = resolveLocalizedSection(siteContent, 'videoCollections', i18n.resolvedLanguage)
  const pack = videoCollections.items.find((item) => item.slug === slug) || null
  const [relatedPacks] = useState(() => pickRandomRelatedPacks(videoCollections.items, slug))
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(-1)
  const [screenshotShieldActive, setScreenshotShieldActive] = useState(false)

  if (!pack) {
    return (
      <main className="creator-home">
        <PublicNav />
        <article className="content-detail-page pack-detail-page">
          <Link className="content-back-link" to="/packs">
            {t('content.backPacks')}
          </Link>
          <div className="content-gated-card">
            <h1>{t('content.noVisibleArticles')}</h1>
            <p>{t('content.publishHint')}</p>
            <Link className="hero-primary-cta" to="/packs">
              {t('content.premiumCatalog')}
            </Link>
          </div>
        </article>
        <SiteFooter content={siteContent} />
      </main>
    )
  }

  const access = getContentAccess(`pack:${pack.slug}`)
  const photoAssets = useMemo(() => (access.unlocked ? getPackPhotos(pack) : []), [access.unlocked, pack])

  useEffect(() => {
    setSelectedPhotoIndex(-1)
    setScreenshotShieldActive(false)
  }, [pack.slug])

  useEffect(() => {
    if (selectedPhotoIndex < 0) {
      return undefined
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setSelectedPhotoIndex(-1)
        setScreenshotShieldActive(false)
        return
      }

      if (event.key === 'PrintScreen') {
        setScreenshotShieldActive(true)
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState !== 'visible') {
        setScreenshotShieldActive(true)
      }
    }

    function handleWindowBlur() {
      setScreenshotShieldActive(true)
    }

    function handleBlockContextMenu(event) {
      event.preventDefault()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('blur', handleWindowBlur)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    document.addEventListener('contextmenu', handleBlockContextMenu)
    document.addEventListener('copy', handleBlockContextMenu)
    document.addEventListener('cut', handleBlockContextMenu)
    document.addEventListener('dragstart', handleBlockContextMenu)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('blur', handleWindowBlur)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('contextmenu', handleBlockContextMenu)
      document.removeEventListener('copy', handleBlockContextMenu)
      document.removeEventListener('cut', handleBlockContextMenu)
      document.removeEventListener('dragstart', handleBlockContextMenu)
      document.body.style.overflow = previousOverflow
    }
  }, [selectedPhotoIndex])

  function openPhoto(index) {
    setSelectedPhotoIndex(index)
    setScreenshotShieldActive(false)
  }

  function closePhoto() {
    setSelectedPhotoIndex(-1)
    setScreenshotShieldActive(false)
  }

  function handleBlockImageEvent(event) {
    event.preventDefault()
  }

  return (
    <main className="creator-home">
      <Seo
        title={`${pack.title} | Kinkly`}
        description={pack.description}
        canonicalPath={`/packs/${pack.slug}`}
        noindex={!access.unlocked}
      />
      <PublicNav />
      <article className="content-detail-page pack-detail-page">
        <Link className="content-back-link" to="/packs">
          {t('content.backPacks')}
        </Link>

        <section className="pack-detail-copy">
          <p className="section-kicker">{t('content.curatedPack')}</p>
          <h1>{pack.title}</h1>
          <p>{pack.description}</p>
        </section>

        <section className="pack-detail-assets">
          {access.unlocked && photoAssets.length ? (
            <div
              className={getPackGalleryClassName(photoAssets.length)}
              aria-label={pack.title}
            >
              {photoAssets.map((asset, index) => {
                const isFeatureTile =
                  photoAssets.length === 1 ||
                  (photoAssets.length === 3 && index === 0) ||
                  (photoAssets.length >= 4 && index === 0)

                return (
                  <button
                    key={asset.id || `${pack.slug}-photo-${index}`}
                    type="button"
                    className={isFeatureTile ? 'pack-gallery-photo is-featured' : 'pack-gallery-photo'}
                    onClick={() => openPhoto(index)}
                    onContextMenu={handleBlockImageEvent}
                    onDragStart={handleBlockImageEvent}
                    draggable={false}
                    aria-label={t('content.expandImage')}
                  >
                    <img
                      src={asset.image}
                      alt={asset.alt || pack.title}
                      loading={index === 0 ? 'eager' : 'lazy'}
                      decoding="async"
                      draggable="false"
                      onContextMenu={handleBlockImageEvent}
                    />
                    <span className="pack-gallery-photo-badge">{t('content.expandImage')}</span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="content-gated-card pack-detail-gated">
              <h3>{t('content.packLockedNote')}</h3>
              <p>{t('content.packUnlockedNote')}</p>
            </div>
          )}
        </section>

        {relatedPacks.length ? (
          <section className="pack-related-section">
            <div className="section-heading">
              <p className="section-kicker">{t('content.related')}</p>
              <h2>{t('content.relatedPacks')}</h2>
              <p>{t('content.relatedPacksDescription')}</p>
            </div>
            <div className="video-collections-grid">
              {relatedPacks.map((collection) => (
                <CollectionCard collection={collection} key={collection.slug} />
              ))}
            </div>
          </section>
        ) : null}
      </article>

      {selectedPhotoIndex >= 0 && photoAssets[selectedPhotoIndex] ? (
        <div className="pack-gallery-lightbox" role="dialog" aria-modal="true" onClick={closePhoto}>
          <button
            type="button"
            className="pack-gallery-lightbox-close"
            onClick={closePhoto}
            aria-label={t('content.close')}
          >
            ×
          </button>
          <figure
            className="pack-gallery-lightbox-frame"
            onClick={(event) => event.stopPropagation()}
            onContextMenu={handleBlockImageEvent}
          >
            <img
              src={photoAssets[selectedPhotoIndex].image}
              alt={photoAssets[selectedPhotoIndex].alt || pack.title}
              draggable={false}
              onContextMenu={handleBlockImageEvent}
            />
          </figure>
          {screenshotShieldActive ? (
            <div className="pack-gallery-shield" onClick={closePhoto}>
              <div className="pack-gallery-shield-copy">
                <strong>{t('content.packLockedNote')}</strong>
                <span>{t('content.close')}</span>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <SiteFooter content={siteContent} />
    </main>
  )
}
