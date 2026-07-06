import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PublicNav } from '../components/PublicNav'
import { RelatedVideosSection } from '../components/RelatedVideosSection'
import { Seo } from '../components/Seo'
import { SiteFooter } from '../components/SiteFooter'
import { useAppState } from '../state/AppState'
import { buildVideoAccessActions } from '../utils/videoAccess'
import { resolveLocalizedRecord } from '../utils/localizedContent'

function getVideoAccessNote(video, access, t) {
  if (access.accessMode === 'public') {
    return t('content.freeVideo')
  }

  if (access.accessMode === 'registered') {
    return t('content.registeredOnly')
  }

  if (access.accessMode === 'subscription') {
    return t('checkout.checkoutTypeSubscription')
  }

  return t('checkout.checkoutTypePurchase')
}

function getVideoTags(video = {}) {
  return Array.from(
    new Set(
      (Array.isArray(video.tags) ? video.tags : video.tag ? [video.tag] : [])
        .map((value) => String(value || '').trim())
        .filter(Boolean),
    ),
  ).slice(0, 5)
}

export function VideoDetailPage() {
  const navigate = useNavigate()
  const { slug } = useParams()
  const { getContentAccess, session, siteContent, subscriptionProduct } = useAppState()
  const { t, i18n } = useTranslation()
  const localizedSiteContent = resolveLocalizedRecord(siteContent, i18n.resolvedLanguage)
  const video =
    localizedSiteContent.videoLibrary.items.find((item) => item.slug === slug) ||
    localizedSiteContent.videoLibrary.items.find((item) => String(item.slug || '').trim()) ||
    null

  if (!video) {
    return (
      <main className="creator-home">
        <PublicNav />
        <article className="content-detail-page">
          <Link className="content-back-link" to="/videos">
            {t('videoDetail.backHome')}
          </Link>
          <div className="content-gated-card">
            <h1>{t('content.noVisibleArticles')}</h1>
            <p>{t('content.publishHint')}</p>
            <Link className="hero-primary-cta" to="/videos">
              {t('videoDetail.backHome')}
            </Link>
          </div>
        </article>
        <SiteFooter content={siteContent} />
      </main>
    )
  }
  const videoSlug = String(video.slug || '').trim()
  const access = videoSlug
    ? getContentAccess(`video:${videoSlug}`)
    : {
        unlocked: false,
        includedBySubscription: false,
        requiresPurchase: true,
        accessMode: 'purchase',
        content: video,
      }
  const [error, setError] = useState('')
  const [resolvedFullVideoUrl, setResolvedFullVideoUrl] = useState('')
  const isPublicPreviewLocked = !session?.accessToken
  const hasResolvedFullVideo = access.unlocked && Boolean(resolvedFullVideoUrl)
  const accessNote = getVideoAccessNote(video, access, t)
  const tagList = getVideoTags(video)
  const actions = buildVideoAccessActions({
    access,
    session,
    subscriptionProduct,
    videoSlug,
    siteContent: localizedSiteContent,
    t,
  })
  const showMonetizationActions = !access.unlocked && access.accessMode !== 'public'
  const previewVideoUrl = videoSlug
    ? video.previewVideoUrl || video.previewSourceUrl || video.previewUrl || ''
    : ''
  const fullVideoUrl = videoSlug ? video.fullVideoUrl || video.fullSourceUrl || '' : ''
  const playerSrc =
    hasResolvedFullVideo && resolvedFullVideoUrl
      ? resolvedFullVideoUrl
      : previewVideoUrl

  useEffect(() => {
    let isActive = true
    let objectUrl = ''

    async function resolveFullVideoUrl() {
      setResolvedFullVideoUrl('')

      if (!access.unlocked || !fullVideoUrl) {
        return
      }

      if (!fullVideoUrl.startsWith('/api/media/videos/')) {
        setResolvedFullVideoUrl(fullVideoUrl)
        return
      }

      if (!session?.accessToken) {
        setError(t('videoDetail.needSignIn'))
        return
      }

      try {
        const response = await fetch(fullVideoUrl, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        })

        if (!response.ok) {
          throw new Error(t('videoDetail.prepareError'))
        }

        if (isActive) {
          const blob = await response.blob()
          objectUrl = URL.createObjectURL(blob)
          setResolvedFullVideoUrl(objectUrl)
          setError('')
        }
      } catch (nextError) {
        if (isActive) {
          setError(nextError.message || t('videoDetail.prepareError'))
        }
      }
    }

    resolveFullVideoUrl()

    return () => {
      isActive = false
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [access.unlocked, fullVideoUrl, session?.accessToken, videoSlug])

  return (
    <main className="creator-home">
      <Seo
        title={`${video.title} | Kinkly`}
        description={video.description || video.previewLabel || video.accessLabel || ''}
        canonicalPath={`/videos/${video.slug}`}
        noindex={access.accessMode !== 'public'}
      />
      <PublicNav />
      <article className="content-detail-page">
        <Link className="content-back-link" to="/">
          {t('videoDetail.backHome')}
        </Link>
        <div className="video-detail-layout">
          <div className="video-detail-player">
            {playerSrc ? (
              <div className={`video-detail-player-stage${isPublicPreviewLocked ? ' is-public-preview' : ''}`}>
                <video src={playerSrc} controls preload="metadata" muted={!hasResolvedFullVideo} />
                {isPublicPreviewLocked ? (
                  <div className="video-preview-overlay">
                    <div className="video-preview-overlay-copy">
                      <span>{t('content.registeredOnly')}</span>
                      <strong>{t('access.login')}</strong>
                    </div>
                    <Link
                      className="hero-primary-cta video-preview-overlay-cta"
                      to={`/access?redirect=${encodeURIComponent(`/videos/${videoSlug}`)}`}
                    >
                      {t('access.login')}
                    </Link>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="video-detail-player-fallback">
                <p className="section-kicker">{video.previewLabel || t('content.preview')}</p>
                <h2>{video.title}</h2>
                <p>{t('videoDetail.previewFallback')}</p>
              </div>
            )}
          </div>

          <div className="video-detail-copy">
            <div className="video-detail-tags">
              {tagList.length ? tagList.map((tag) => <span key={tag}>{tag}</span>) : null}
            </div>
            <h1>{video.title}</h1>
            {showMonetizationActions ? (
              <div className="video-card-access">
                <strong>{video.priceLabel}</strong>
                <small>{accessNote}</small>
              </div>
            ) : null}
            {showMonetizationActions ? (
              <div className="video-detail-actions">
                {actions.map((action) =>
                  action.variant === 'secondary' ? (
                    <button
                      key={action.key}
                      className="hero-secondary-cta"
                      type="button"
                      onClick={() => navigate(action.href)}
                    >
                      {action.label}
                    </button>
                  ) : (
                    <button
                      key={action.key}
                      className="hero-primary-cta"
                      type="button"
                      onClick={() => navigate(action.href)}
                    >
                      {action.label}
                    </button>
                  ),
                )}
              </div>
            ) : null}
            {error ? <p className="admin-error">{error}</p> : null}
          </div>
        </div>

        <RelatedVideosSection
          currentVideo={video}
          items={localizedSiteContent.videoLibrary.items}
          browseHref={localizedSiteContent.videoLibrary.browseHref}
          browseLabel={localizedSiteContent.videoLibrary.browseLabel}
        />
      </article>
      <SiteFooter content={siteContent} />
    </main>
  )
}
