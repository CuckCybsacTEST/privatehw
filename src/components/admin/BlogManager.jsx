import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { parsePriceAmount } from '../../data/defaultCommerce'
import { normalizeBlogPost } from '../../data/defaultBlogPosts'
import { translateAdminContent } from '../../lib/supabase'
import { useAppState } from '../../state/AppState'
import { BlogTaxonomyManager } from './BlogTaxonomyManager'
import { RichTextEditor } from './RichTextEditor'
import { mergeLocalizedValue, resolveLocalizedRecord } from '../../utils/localizedContent'
import { getTranslationState } from '../../utils/translationSync'

function emptyPost(t) {
  return normalizeBlogPost({
    id: `blog-post-${Date.now()}`,
    slug: `blog-post-${Date.now()}`,
    category: t('admin.blog.generalCategory'),
    title: t('admin.blog.newPost'),
    excerpt: '',
    coverImage: '',
    status: 'draft',
    accessLevel: 'public',
    priceLabel: '',
    priceAmount: 0,
    currency: 'USD',
    publishedAt: null,
    scheduledAt: null,
    featuredSlot: 'none',
    featured: false,
    feedFeatured: false,
    bannerSlot: 'none',
    allowIndexing: true,
    seoTitle: t('admin.blog.newPost'),
    seoDescription: '',
    socialImage: '',
    readingTime: '4 min',
    tags: [],
    contentHtml: '<p></p>',
    mediaItems: [],
    localized: {},
    localizedMeta: {},
  })
}

function sortPosts(posts = []) {
  return [...posts].sort((a, b) => {
    const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0
    const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0
    return bTime - aTime
  })
}

function formatDateLabel(value, t, locale = 'es-PE') {
  if (!value) {
    return t('content.noDate')
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getStatusLabel(status, t) {
  if (status === 'published') return t('admin.blog.published')
  if (status === 'archived') return t('admin.blog.archived')
  return t('admin.blog.draft')
}

function getAccessLabel(accessLevel, t) {
  if (accessLevel === 'purchase') return t('admin.blog.purchase')
  if (accessLevel === 'subscription') return t('admin.blog.subscription')
  if (accessLevel === 'registered') return t('admin.blog.registered')
  return t('admin.blog.public')
}

function normalizePriceLabel(value = '') {
  const cleaned = String(value || '').trim()

  if (!cleaned) {
    return ''
  }

  if (/^[\$\u20ac£]/.test(cleaned)) {
    return cleaned
  }

  return `$${cleaned.replace(/[^\d.,]/g, '') || '0'}`
}

function getFeaturedSlotLabel(featuredSlot, t) {
  if (featuredSlot === 'primary') return t('admin.blog.featuredPrimary')
  if (featuredSlot === 'secondary') return t('admin.blog.featuredSecondary')
  return t('admin.blog.featuredNone')
}

function normalizeItem(value = '') {
  return String(value || '').trim()
}

function slugify(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

function uniqueValues(values = []) {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)))
}

function buildTaxonomyOptions(registry = {}, posts = []) {
  const categories = uniqueValues([
    ...(registry.categories || []),
    ...posts.map((post) => post.category),
  ])

  const tags = uniqueValues([
    ...(registry.tags || []),
    ...posts.flatMap((post) => post.tags || []),
  ])

  return { categories, tags }
}

function isEmptyHtml(value = '') {
  return String(value || '').replace(/\s+/g, '').toLowerCase() === '<p></p>'
}

function pruneLocalizedDraft(localized = {}) {
  const nextLocalized = {}

  for (const [locale, value] of Object.entries(localized || {})) {
    if (!value || typeof value !== 'object') {
      continue
    }

    const nextValue = {}

    for (const [key, entry] of Object.entries(value)) {
      const normalizedEntry = String(entry || '').trim()
      if (!normalizedEntry) {
        continue
      }

      if (key === 'contentHtml' && isEmptyHtml(normalizedEntry)) {
        continue
      }

      nextValue[key] = entry
    }

    if (Object.keys(nextValue).length) {
      nextLocalized[locale] = nextValue
    }
  }

  return nextLocalized
}

function BlogEditorCard({ title, description, children }) {
  return (
    <section className="admin-blog-panel">
      <div className="admin-section-header admin-blog-panel-header">
        <div>
          <h3>{title}</h3>
          {description ? <p className="admin-meta">{description}</p> : null}
        </div>
      </div>
      <div className="admin-grid">{children}</div>
    </section>
  )
}

export function BlogManager() {
  const { t, i18n } = useTranslation()
  const {
    blogPosts,
    saveBlogPost,
    removeManagedBlogPost,
    saveSiteContent,
    siteContent,
    uploadManagedMedia,
  } = useAppState()
  const sortedPosts = useMemo(() => sortPosts(blogPosts), [blogPosts])
  const [selectedPostId, setSelectedPostId] = useState(sortedPosts[0]?.id || null)
  const [draft, setDraft] = useState(sortedPosts[0] || emptyPost(t))
  const [message, setMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [accessFilter, setAccessFilter] = useState('all')
  const [isCreating, setIsCreating] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [translationMessage, setTranslationMessage] = useState('')
  const currentLocale = i18n.resolvedLanguage === 'en' ? 'en' : 'es'
  const taxonomyRegistry = siteContent.blogPage?.taxonomy || { categories: [], tags: [] }
  const taxonomyOptions = useMemo(
    () => buildTaxonomyOptions(taxonomyRegistry, sortedPosts),
    [sortedPosts, taxonomyRegistry],
  )

  useEffect(() => {
    if (isCreating) {
      return
    }

    if (!sortedPosts.length) {
      const nextEmpty = emptyPost(t)
      setSelectedPostId(null)
      setDraft(nextEmpty)
      setIsCreating(true)
      return
    }

    const selected = sortedPosts.find((post) => post.id === selectedPostId) || sortedPosts[0]
    setSelectedPostId(selected.id)
    setDraft(selected)
  }, [isCreating, selectedPostId, sortedPosts, t])

  const filteredPosts = useMemo(
    () =>
      sortedPosts.filter((post) => {
        const displayPost = resolveLocalizedRecord(post, currentLocale)
        const matchesSearch =
          !searchTerm.trim() ||
          [displayPost.title, post.slug, displayPost.category, ...(post.tags || [])]
            .filter(Boolean)
            .some((value) =>
              String(value).toLowerCase().includes(searchTerm.trim().toLowerCase()),
            )

        const matchesStatus = statusFilter === 'all' || post.status === statusFilter
        const matchesAccess = accessFilter === 'all' || post.accessLevel === accessFilter

        return matchesSearch && matchesStatus && matchesAccess
      }),
    [accessFilter, currentLocale, searchTerm, sortedPosts, statusFilter],
  )

  const postStats = useMemo(() => {
    return sortedPosts.reduce(
      (accumulator, post) => {
        accumulator.total += 1
        accumulator[post.status] += 1
        if (post.featuredSlot && post.featuredSlot !== 'none') accumulator.featured += 1
        if (post.feedFeatured) accumulator.feed += 1
        return accumulator
      },
      { total: 0, draft: 0, published: 0, archived: 0, featured: 0, feed: 0 },
    )
  }, [sortedPosts])

  function setDraftValue(key, value) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function getEditableValue(key, fallback = '') {
    if (currentLocale !== 'en') {
      return draft[key] ?? fallback
    }

    return draft.localized?.en?.[key] ?? draft[key] ?? fallback
  }

  function setLocalizedDraftValue(key, value) {
    if (currentLocale !== 'en') {
      setDraftValue(key, value)
      return
    }

    setDraft((current) => {
      const nextLocalized = { ...(current.localized || {}) }
      const nextEnglish = { ...(nextLocalized.en || {}) }
      const normalizedValue = String(value || '').trim()

      if (!normalizedValue || (key === 'contentHtml' && isEmptyHtml(normalizedValue))) {
        delete nextEnglish[key]
      } else {
        nextEnglish[key] = value
      }

      if (Object.keys(nextEnglish).length) {
        nextLocalized.en = nextEnglish
      } else {
        delete nextLocalized.en
      }

      return {
        ...current,
        localized: nextLocalized,
      }
    })
  }

  function setTags(value) {
    setDraft((current) => ({
      ...current,
      tags: value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    }))
  }

  function buildTranslationSource(post = draft, targetLocale = 'en') {
    const sourcePost = targetLocale === 'es' ? resolveLocalizedRecord(post, 'en') : post
    return {
      title: sourcePost.title || '',
      excerpt: sourcePost.excerpt || '',
      seoTitle: sourcePost.seoTitle || '',
      seoDescription: sourcePost.seoDescription || '',
      contentHtml: sourcePost.contentHtml || '<p></p>',
      category: sourcePost.category || '',
      tags: sourcePost.tags || [],
      mediaItems: (sourcePost.mediaItems || []).map((item) => ({
        title: item.title || '',
        caption: item.caption || '',
      })),
    }
  }

  async function translateDraft(mode = 'full', targetLocale = 'en') {
    setIsTranslating(true)
    setTranslationMessage('')

    try {
      const result = await translateAdminContent(buildTranslationSource(draft, targetLocale), {
        sourceLocale: targetLocale === 'es' ? 'en' : 'es',
        targetLocale,
        mode,
        scope: 'blogPost',
      })

      const translated = result.translated || {}

      setDraft((current) => {
        const currentLocalized = current.localized || {}
        const existingLocalized = currentLocalized[targetLocale] || {}
        const nextLocalizedValue =
          mode === 'missing' ? mergeLocalizedValue(translated, existingLocalized) : translated
        const nextLocalized = {
          ...currentLocalized,
          [targetLocale]: nextLocalizedValue,
        }

        return {
          ...current,
          localized: nextLocalized,
          localizedMeta: {
            ...(current.localizedMeta || {}),
            [targetLocale]: {
              ...(current.localizedMeta?.[targetLocale] || {}),
              blogPost: {
                sourceHash: result.sourceHash || '',
                translatedAt: result.translatedAt || new Date().toISOString(),
                provider: result.provider || '',
                mode,
              },
            },
          },
        }
      })

      setTranslationMessage(
        targetLocale === 'es'
          ? mode === 'missing'
            ? t('admin.blog.translationCompletedMissingEs')
            : t('admin.blog.translationCompletedEs')
          : mode === 'missing'
            ? t('admin.blog.translationCompletedMissing')
            : t('admin.blog.translationCompleted'),
      )
    } catch (error) {
      setTranslationMessage(error?.message || t('admin.blog.translationFailed'))
    } finally {
      setIsTranslating(false)
    }
  }

  async function updateTaxonomyRegistry(patch) {
    const nextTaxonomy = {
      categories: uniqueValues(taxonomyRegistry.categories || []),
      tags: uniqueValues(taxonomyRegistry.tags || []),
      ...patch,
    }

    await saveSiteContent({
      ...siteContent,
      blogPage: {
        ...siteContent.blogPage,
        taxonomy: nextTaxonomy,
      },
    })
  }

  function toggleDraftTag(tag) {
    setDraft((current) => {
      const currentTags = uniqueValues(current.tags || [])

      return {
        ...current,
        tags: currentTags.includes(tag)
          ? currentTags.filter((item) => item !== tag)
          : [...currentTags, tag],
      }
    })
  }

  function handleTitleChange(value) {
    if (currentLocale === 'en') {
      setLocalizedDraftValue('title', value)
      return
    }

    setDraft((current) => ({
      ...current,
      title: value,
      slug: current.slug.startsWith('blog-post-') ? slugify(value) || current.slug : current.slug,
    }))
  }

  function startNewPost() {
    setDraft(emptyPost())
    setSelectedPostId(null)
    setIsCreating(true)
    setMessage('')
  }

  function selectPost(postId) {
    setSelectedPostId(postId)
    setIsCreating(false)
    setMessage('')
  }

  function updateMediaItem(index, patch) {
    setDraft((current) => ({
      ...current,
      mediaItems: current.mediaItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }))
  }

  function addMediaItem(type = 'link', url = '') {
    setDraft((current) => ({
      ...current,
      mediaItems: [
        ...current.mediaItems,
        { id: `media-${Date.now()}`, type, url, title: '', caption: '' },
      ],
    }))
  }

  function removeMediaItem(index) {
    setDraft((current) => ({
      ...current,
      mediaItems: current.mediaItems.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  async function handleUpload(event, mediaType) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const folder = mediaType === 'image' ? 'images' : mediaType === 'audio' ? 'audio' : 'video'
    const uploaded = await uploadManagedMedia(file, 'blog-media', `blog/${folder}`)

    if (uploaded?.publicUrl) {
      addMediaItem(mediaType, uploaded.publicUrl)
        setMessage(t('admin.blog.mediaAdded'))
    }

    event.target.value = ''
  }

  async function handleCoverUpload(event) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const uploaded = await uploadManagedMedia(file, 'blog-media', 'blog/covers')
    if (uploaded?.publicUrl) {
      setDraftValue('coverImage', uploaded.publicUrl)
      setMessage(t('admin.blog.coverUpdated'))
    }

    event.target.value = ''
  }

  async function handleSocialImageUpload(event) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const uploaded = await uploadManagedMedia(file, 'blog-media', 'blog/social')
    if (uploaded?.publicUrl) {
      setDraftValue('socialImage', uploaded.publicUrl)
      setMessage(t('admin.blog.socialUpdated'))
    }

    event.target.value = ''
  }

  async function handleSave() {
    const nextCategory = normalizeItem(draft.category)
    const nextTags = uniqueValues(draft.tags || [])
    const nextAccessLevel =
      draft.accessLevel === 'subscription' ||
      draft.accessLevel === 'registered' ||
      draft.accessLevel === 'purchase'
        ? draft.accessLevel
        : 'public'
    const nextPriceLabel = normalizePriceLabel(draft.priceLabel)
    const nextPriceAmount = parsePriceAmount(nextPriceLabel)
    const nextTaxonomy = {
      categories: uniqueValues([...(taxonomyRegistry.categories || []), nextCategory]),
      tags: uniqueValues([...(taxonomyRegistry.tags || []), ...nextTags]),
    }

    if (
      nextCategory &&
      !uniqueValues(taxonomyRegistry.categories || []).includes(nextCategory)
    ) {
      await updateTaxonomyRegistry(nextTaxonomy)
    } else if (
      nextTags.some((tag) => !uniqueValues(taxonomyRegistry.tags || []).includes(tag))
    ) {
      await updateTaxonomyRegistry(nextTaxonomy)
    }

    const nextPost = {
      ...draft,
      slug: normalizeItem(draft.slug) || slugify(draft.title) || `blog-post-${Date.now()}`,
      category: nextCategory || t('admin.blog.generalCategory'),
      tags: nextTags,
      accessLevel: nextAccessLevel,
      priceLabel: nextAccessLevel === 'purchase' ? nextPriceLabel : nextPriceLabel || '',
      priceAmount: nextAccessLevel === 'purchase' ? nextPriceAmount : nextPriceAmount || 0,
      currency: 'USD',
      seoTitle: draft.seoTitle?.trim() || draft.title,
      seoDescription: draft.seoDescription?.trim() || draft.excerpt,
      publishedAt: draft.status === 'published' ? draft.publishedAt || new Date().toISOString() : null,
      featuredSlot: draft.featuredSlot || (draft.featured ? 'primary' : 'none'),
      featured: Boolean(draft.featuredSlot ? draft.featuredSlot !== 'none' : draft.featured),
      feedFeatured: Boolean(draft.feedFeatured),
      localized: pruneLocalizedDraft(draft.localized),
      localizedMeta: draft.localizedMeta || {},
    }

    const saved = await saveBlogPost(nextPost)
    setSelectedPostId(saved.id)
    setDraft(saved)
    setIsCreating(false)
    setMessage('Post guardado correctamente.')
  }

  async function handleDelete() {
    if (!draft?.id || isCreating) {
      startNewPost()
      return
    }

    await removeManagedBlogPost(draft.id)
    setMessage(t('admin.blog.deleted'))
  }

  const blogTranslationState = getTranslationState({
    source: buildTranslationSource(draft),
    translated: draft.localized?.en,
    meta: draft.localizedMeta,
    locale: 'en',
  })

  return (
    <section className="admin-editor-panel admin-blog-workspace">
      <div className="admin-section-header">
        <div>
          <h3>{t('admin.blog.postsTitle')}</h3>
          <p className="admin-meta">
            {t('admin.blog.postsDescription')}
          </p>
        </div>
        <div className="admin-actions-row">
          <button type="button" className="admin-secondary-button" onClick={startNewPost}>
            {t('admin.blog.newPost')}
          </button>
        </div>
      </div>

      <div className="admin-blog-savebar">
        <div>
          <p className="admin-blog-savebar-kicker">{t('admin.blog.quickEdit')}</p>
          <p className="admin-meta">{t('admin.blog.quickEditHint')}</p>
          <p className="admin-meta">
            {t('admin.blog.translationState')}: {t(`admin.blog.translationState${blogTranslationState[0].toUpperCase()}${blogTranslationState.slice(1)}`)}
          </p>
        </div>
        <div className="admin-actions-row">
          <button type="button" className="admin-secondary-button" onClick={startNewPost}>
            {t('admin.blog.newPost')}
          </button>
          <button
            type="button"
            className="admin-secondary-button"
            onClick={() => translateDraft('full', 'en')}
            disabled={isTranslating}
          >
            {isTranslating ? t('admin.blog.translating') : t('admin.blog.translateEn')}
          </button>
          <button
            type="button"
            className="admin-secondary-button"
            onClick={() => translateDraft('missing', 'en')}
            disabled={isTranslating}
          >
            {isTranslating ? t('admin.blog.translating') : t('admin.blog.translateMissingEn')}
          </button>
          {currentLocale === 'en' ? (
            <>
              <button
                type="button"
                className="admin-secondary-button"
                onClick={() => translateDraft('full', 'es')}
                disabled={isTranslating}
              >
                {isTranslating ? t('admin.blog.translating') : t('admin.blog.translateEs')}
              </button>
              <button
                type="button"
                className="admin-secondary-button"
                onClick={() => translateDraft('missing', 'es')}
                disabled={isTranslating}
              >
                {isTranslating ? t('admin.blog.translating') : t('admin.blog.translateMissingEs')}
              </button>
            </>
          ) : null}
          <button type="button" className="admin-primary-button" onClick={handleSave}>
            {t('admin.blog.savePost')}
          </button>
          <button type="button" className="admin-danger-button" onClick={handleDelete}>
            {isCreating ? t('admin.blog.discardDraft') : t('admin.blog.deletePost')}
          </button>
        </div>
      </div>
      {translationMessage ? <p className="admin-success">{translationMessage}</p> : null}

      <BlogTaxonomyManager value={taxonomyRegistry} onChange={updateTaxonomyRegistry} />

      <div className="admin-blog-layout">
        <aside className="admin-blog-sidebar">
          <div className="admin-blog-sidebar-top">
            <div className="admin-blog-stats">
              <article className="admin-blog-stat-card">
                <strong>{postStats.total}</strong>
                <span>{t('admin.blog.postsTitle')}</span>
              </article>
              <article className="admin-blog-stat-card">
                <strong>{postStats.published}</strong>
                <span>{t('admin.blog.published')}</span>
              </article>
              <article className="admin-blog-stat-card">
                <strong>{postStats.featured}</strong>
                <span>{t('admin.blog.hero')}</span>
              </article>
              <article className="admin-blog-stat-card">
                <strong>{postStats.feed}</strong>
                <span>{t('admin.blog.feed')}</span>
              </article>
            </div>

            <div className="admin-blog-filters">
              <label className="admin-field">
                <span>{t('admin.blog.search')}</span>
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={t('admin.blog.searchPlaceholder')}
                />
              </label>
              <label className="admin-field">
                <span>{t('admin.blog.status')}</span>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="all">{t('admin.blog.all')}</option>
                  <option value="draft">{t('admin.blog.draft')}</option>
                  <option value="published">{t('admin.blog.published')}</option>
                  <option value="archived">{t('admin.blog.archived')}</option>
                </select>
              </label>
              <label className="admin-field">
                <span>{t('admin.blog.access')}</span>
                  <select value={accessFilter} onChange={(event) => setAccessFilter(event.target.value)}>
                    <option value="all">{t('admin.blog.all')}</option>
                    <option value="public">{t('admin.blog.public')}</option>
                    <option value="registered">{t('admin.blog.registered')}</option>
                    <option value="purchase">{t('admin.blog.purchase')}</option>
                    <option value="subscription">{t('admin.blog.subscription')}</option>
                  </select>
                </label>
            </div>
          </div>

          <div className="admin-blog-list">
            <button
              type="button"
              className={isCreating ? 'admin-blog-item active is-creating' : 'admin-blog-item is-creating'}
              onClick={startNewPost}
            >
              <strong>{t('admin.blog.newPost')}</strong>
              <span>{t('admin.blog.newPostSubtitle')}</span>
            </button>

            {filteredPosts.length ? (
              filteredPosts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  className={post.id === selectedPostId && !isCreating ? 'admin-blog-item active' : 'admin-blog-item'}
                  onClick={() => selectPost(post.id)}
                >
                  <div className="admin-blog-item-topline">
                    <strong>{resolveLocalizedRecord(post, currentLocale).title}</strong>
                    <small>{formatDateLabel(post.publishedAt, t, i18n.resolvedLanguage === 'en' ? 'en-US' : 'es-PE')}</small>
                  </div>
                  <div className="admin-blog-item-meta">
                    <small>{post.category}</small>
                    <small>{getStatusLabel(post.status, t)}</small>
                    <small>{getAccessLabel(post.accessLevel, t)}</small>
                    {post.featuredSlot && post.featuredSlot !== 'none' ? (
                      <small>{getFeaturedSlotLabel(post.featuredSlot, t)}</small>
                    ) : null}
                    {post.feedFeatured ? <small>{t('admin.blog.feed')}</small> : null}
                  </div>
                </button>
              ))
            ) : (
              <div className="admin-hint">
                <p>{t('admin.blog.noMatch')}</p>
              </div>
            )}
          </div>
        </aside>

          <div className="admin-blog-editor-shell">
            <div className="admin-blog-editor-toolbar">
              <div>
                <p className="admin-eyebrow">{isCreating ? t('admin.blog.newPost') : t('admin.blog.activeEdit')}</p>
              <h3>{getEditableValue('title', t('admin.blog.newPost'))}</h3>
                <p className="admin-meta">
                  {isCreating
                    ? t('admin.blog.configureDraft')
                    : t('admin.blog.stateAccess', {
                      status: getStatusLabel(draft.status, t),
                      access: getAccessLabel(draft.accessLevel, t),
                    })}
              </p>
            </div>
          </div>

          <BlogEditorCard
            title={t('admin.blog.basicTitle')}
            description={t('admin.blog.basicDescription')}
          >
            <label className="admin-field">
              <span>{t('admin.blog.title')}</span>
              <input value={getEditableValue('title', '')} onChange={(event) => handleTitleChange(event.target.value)} />
            </label>
            <label className="admin-field admin-field-full">
              <span>{t('admin.blog.excerpt')}</span>
              <textarea
                rows={3}
                value={getEditableValue('excerpt', '')}
                onChange={(event) => setLocalizedDraftValue('excerpt', event.target.value)}
              />
            </label>
            <div className="admin-field admin-field-full">
              <span>{t('admin.blog.category')}</span>
              <div className="admin-chip-selector">
                {taxonomyOptions.categories.length ? (
                  taxonomyOptions.categories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      className={
                        normalizeItem(draft.category) === category
                          ? 'admin-chip-button is-active'
                          : 'admin-chip-button'
                      }
                      onClick={() => setDraftValue('category', category)}
                    >
                      <span>{category}</span>
                    </button>
                  ))
                ) : (
                  <p className="admin-meta">{t('admin.blog.registerCategories')}</p>
                )}
              </div>
            </div>
            <div className="admin-field admin-field-full">
              <span>{t('admin.blog.tags')}</span>
              <div className="admin-chip-selector">
                {taxonomyOptions.tags.length ? (
                  taxonomyOptions.tags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className={draft.tags?.includes(tag) ? 'admin-chip-button is-active' : 'admin-chip-button'}
                      onClick={() => toggleDraftTag(tag)}
                    >
                      <span>{tag}</span>
                    </button>
                  ))
                ) : (
                  <p className="admin-meta">{t('admin.blog.tagsHint')}</p>
                )}
              </div>
            </div>
          </BlogEditorCard>

          <BlogEditorCard
            title={t('admin.blog.publicationTitle')}
            description={t('admin.blog.publicationDescription')}
          >
            <label className="admin-field">
              <span>{t('admin.blog.status')}</span>
              <select value={draft.status} onChange={(event) => setDraftValue('status', event.target.value)}>
                <option value="draft">{t('admin.blog.draft')}</option>
                <option value="published">{t('admin.blog.published')}</option>
                <option value="archived">{t('admin.blog.archived')}</option>
              </select>
            </label>
              <label className="admin-field">
                <span>{t('admin.blog.access')}</span>
                <select value={draft.accessLevel} onChange={(event) => setDraftValue('accessLevel', event.target.value)}>
                  <option value="public">{t('admin.blog.public')}</option>
                  <option value="registered">{t('admin.blog.registered')}</option>
                  <option value="purchase">{t('admin.blog.purchase')}</option>
                  <option value="subscription">{t('admin.blog.subscription')}</option>
                </select>
              </label>
              <label className="admin-field">
                <span>{t('admin.blog.price')}</span>
                <input
                  value={draft.priceLabel || ''}
                  onChange={(event) => setDraftValue('priceLabel', event.target.value)}
                  placeholder={t('admin.blog.pricePlaceholder')}
                />
              </label>
              <label className="admin-field">
                <span>{t('admin.blog.bannerSlot')}</span>
              <select value={draft.bannerSlot} onChange={(event) => setDraftValue('bannerSlot', event.target.value)}>
                <option value="none">{t('admin.blog.noBanner')}</option>
                <option value="launch">{t('admin.blog.launch')}</option>
                <option value="community">{t('admin.blog.community')}</option>
                <option value="upgrade">{t('admin.blog.upgrade')}</option>
              </select>
            </label>
            <label className="admin-field">
              <span>{t('admin.blog.schedule')}</span>
              <input
                type="datetime-local"
                value={draft.scheduledAt ? draft.scheduledAt.slice(0, 16) : ''}
                onChange={(event) =>
                  setDraftValue(
                    'scheduledAt',
                    event.target.value ? new Date(event.target.value).toISOString() : null,
                  )
                }
              />
            </label>
            <label className="admin-field">
              <span>{t('admin.blog.featuredPlacement')}</span>
              <select
                value={draft.featuredSlot || (draft.featured ? 'primary' : 'none')}
                onChange={(event) => {
                  const nextSlot = event.target.value
                  setDraftValue('featuredSlot', nextSlot)
                  setDraftValue('featured', nextSlot !== 'none')
                }}
              >
                <option value="none">{t('admin.blog.featuredNone')}</option>
                <option value="primary">{t('admin.blog.featuredPrimary')}</option>
                <option value="secondary">{t('admin.blog.featuredSecondary')}</option>
              </select>
            </label>
            <label className="admin-field admin-field-checkbox">
              <span>{t('admin.blog.featureFeed')}</span>
              <input
                type="checkbox"
                checked={Boolean(draft.feedFeatured)}
                onChange={(event) => setDraftValue('feedFeatured', event.target.checked)}
              />
            </label>
          </BlogEditorCard>

          <BlogEditorCard
            title={t('admin.blog.mediaTitle')}
            description={t('admin.blog.mediaDescription')}
          >
            <label className="admin-field">
              <span>{t('admin.blog.coverImage')}</span>
              <input
                value={draft.coverImage}
                onChange={(event) => setDraftValue('coverImage', event.target.value)}
                placeholder={t('admin.blog.pasteDriveLink')}
              />
            </label>
            <label className="admin-field">
              <span>{t('admin.blog.socialImage')}</span>
              <input
                value={draft.socialImage}
                onChange={(event) => setDraftValue('socialImage', event.target.value)}
                placeholder={t('admin.blog.pasteDriveLink')}
              />
            </label>
            <label className="admin-secondary-button">
              {t('admin.blog.uploadCover')}
              <input type="file" accept="image/*" hidden onChange={handleCoverUpload} />
            </label>
            <label className="admin-secondary-button">
              {t('admin.blog.uploadSocial')}
              <input type="file" accept="image/*" hidden onChange={handleSocialImageUpload} />
            </label>
          </BlogEditorCard>

          <div className="admin-repeater admin-blog-panel">
            <div className="admin-section-header admin-blog-panel-header">
              <div>
                <h3>{t('admin.blog.postMedia')}</h3>
                <p className="admin-meta">
                  {t('admin.blog.postMediaDescription')}
                </p>
              </div>
              <div className="admin-actions-row">
                <label className="admin-secondary-button">
                  {t('admin.blog.uploadImage')}
                  <input type="file" accept="image/*" hidden onChange={(event) => handleUpload(event, 'image')} />
                </label>
                <label className="admin-secondary-button">
                  {t('admin.blog.uploadVideo')}
                  <input type="file" accept="video/*" hidden onChange={(event) => handleUpload(event, 'video')} />
                </label>
                <label className="admin-secondary-button">
                  {t('admin.blog.uploadAudio')}
                  <input type="file" accept="audio/*" hidden onChange={(event) => handleUpload(event, 'audio')} />
                </label>
                <button type="button" className="admin-secondary-button" onClick={() => addMediaItem('link', '')}>
                  {t('admin.blog.externalLink')}
                </button>
              </div>
            </div>

            {draft.mediaItems.length ? (
              draft.mediaItems.map((item, index) => (
                <div className="admin-array-card" key={item.id}>
                  <label className="admin-field">
                    <span>{t('admin.blog.type')}</span>
                    <select value={item.type} onChange={(event) => updateMediaItem(index, { type: event.target.value })}>
                      <option value="image">{t('admin.blog.image')}</option>
                      <option value="video">{t('admin.blog.video')}</option>
                      <option value="audio">{t('admin.blog.audio')}</option>
                      <option value="link">{t('admin.blog.externalLink')}</option>
                    </select>
                  </label>
                  <label className="admin-field">
                    <span>{t('admin.blog.mediaUrl')}</span>
                    <input
                      value={item.url}
                      onChange={(event) => updateMediaItem(index, { url: event.target.value })}
                      placeholder={t('admin.blog.pasteDriveLink')}
                    />
                  </label>
                  <label className="admin-field">
                    <span>{t('admin.blog.title')}</span>
                    <input value={item.title} onChange={(event) => updateMediaItem(index, { title: event.target.value })} />
                  </label>
                  <label className="admin-field">
                    <span>{t('admin.blog.caption')}</span>
                    <input value={item.caption} onChange={(event) => updateMediaItem(index, { caption: event.target.value })} />
                  </label>
                  <button type="button" className="admin-danger-button" onClick={() => removeMediaItem(index)}>
                    {t('admin.blog.removeMedia')}
                  </button>
                </div>
              ))
            ) : (
              <div className="admin-hint">
                <p>{t('admin.blog.noMedia')}</p>
              </div>
            )}
          </div>

          <BlogEditorCard
            title={t('admin.blog.seoSectionTitle')}
            description={t('admin.blog.seoDescription')}
          >
            <label className="admin-field">
              <span>{t('admin.blog.seoTitle')}</span>
              <input
                value={getEditableValue('seoTitle', '')}
                onChange={(event) => setLocalizedDraftValue('seoTitle', event.target.value)}
              />
            </label>
            <label className="admin-field admin-field-checkbox">
              <span>{t('admin.blog.allowIndexing')}</span>
              <input
                type="checkbox"
                checked={draft.allowIndexing !== false}
                onChange={(event) => setDraftValue('allowIndexing', event.target.checked)}
              />
            </label>
            <label className="admin-field admin-field-full">
              <span>{t('admin.blog.seoDescription')}</span>
              <textarea
                rows={3}
                value={getEditableValue('seoDescription', '')}
                onChange={(event) => setLocalizedDraftValue('seoDescription', event.target.value)}
              />
            </label>
          </BlogEditorCard>

          <BlogEditorCard
            title={t('admin.blog.contentSectionTitle')}
            description={t('admin.blog.contentDescription')}
          >
            <div className="admin-field admin-field-full">
              <span>{t('admin.blog.richContent')}</span>
              <RichTextEditor
                value={getEditableValue('contentHtml', '<p></p>')}
                onChange={(value) => setLocalizedDraftValue('contentHtml', value)}
              />
            </div>
          </BlogEditorCard>

          {message ? <p className="admin-success">{message}</p> : null}
        </div>
      </div>
    </section>
  )
}

