import { useEffect, useMemo, useState } from 'react'
import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BlogManager } from '../components/admin/BlogManager'
import { EncuentrosModelsManager } from '../components/admin/EncuentrosModelsManager'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { defaultSiteContent, mergeSiteContent } from '../data/defaultSiteContent'
import { translateAdminContent } from '../lib/supabase'
import { useAppState } from '../state/AppState'
import { optimizeImageFile } from '../utils/imageOptimization'
import { getLocaleKey, mergeLocalizedValue, resolveLocalizedRecord } from '../utils/localizedContent'
import { getTranslationState, hashStableValue } from '../utils/translationSync'
import { parsePriceAmount } from '../data/defaultCommerce'
import {
  buildMediaFullUrl,
  buildMediaPreviewUrl,
  buildMediaPublicUrl,
  buildVideoFullUrl,
  buildVideoPreviewUrl,
  extractGoogleDriveFileId,
  isInternalMediaUrl,
} from '../utils/videoMedia.js'
import { getActiveDigitalEntitlement } from '../utils/entitlements'
import { normalizeCurrencyLabel } from '../utils/encuentrosBooking'

function deepClone(value) {
  return JSON.parse(JSON.stringify(value))
}

function getByPath(source, path) {
  return path.reduce((current, key) => current?.[key], source)
}

function updateByPath(source, path, value) {
  const next = deepClone(source)
  let pointer = next

  for (let index = 0; index < path.length - 1; index += 1) {
    pointer = pointer[path[index]]
  }

  pointer[path[path.length - 1]] = value
  return next
}

function setByPath(source, path, value) {
  const next = deepClone(source)
  let pointer = next

  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index]
    const nextKey = path[index + 1]

    if (pointer[key] === undefined || pointer[key] === null) {
      pointer[key] = typeof nextKey === 'number' ? [] : {}
    }

    pointer = pointer[key]
  }

  pointer[path[path.length - 1]] = value
  return next
}

function appendByPath(source, path, value) {
  const next = deepClone(source)
  const list = getByPath(next, path)
  list.push(value)
  return next
}

function removeByPath(source, path, indexToRemove) {
  const next = deepClone(source)
  const list = getByPath(next, path)
  list.splice(indexToRemove, 1)
  return next
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
    reader.readAsDataURL(file)
  })
}

function generateStableItemId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function slugifyText(value = '', fallback = 'pack') {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || fallback
}

function uniqueValues(values = []) {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)))
}

function normalizeVideoTags(values = []) {
  return uniqueValues(values).slice(0, 5)
}

function normalizeChipValue(value = '') {
  return String(value || '').trim()
}

function normalizePackAssets(assets = []) {
  return (assets || []).map((asset, index) => ({
    id: asset.id || generateStableItemId('pack-asset'),
    title: asset.title || `Asset ${index + 1}`,
    mediaType: asset.mediaType === 'video' ? 'video' : 'image',
    image: asset.image || '',
    mediaDriveFileId: asset.mediaDriveFileId || extractGoogleDriveFileId(asset.mediaUrl || ''),
    mediaUrl: asset.mediaUrl || '',
  }))
}

function formatDateLabel(value) {
  if (!value) {
    return 'Sin fecha'
  }

  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function toDatetimeLocalValue(date = new Date()) {
  const nextDate = new Date(date)
  const offsetMs = nextDate.getTimezoneOffset() * 60000
  return new Date(nextDate.getTime() - offsetMs).toISOString().slice(0, 16)
}

function getActiveDigitalSubscription(user = {}) {
  return getActiveDigitalEntitlement(user.entitlements || [])
}

function getLatestDigitalSubscription(user = {}) {
  return (
    (user.entitlements || [])
      .filter((entry) => String(entry.entitlementKey || '').startsWith('tier:'))
      .sort((a, b) => {
        const aDate = new Date(a.createdAt || a.expiresAt || 0).getTime()
        const bDate = new Date(b.createdAt || b.expiresAt || 0).getTime()
        return bDate - aDate
      })[0] || null
  )
}

function buildSubscriptionDraftForUser(user = {}, subscriptionProducts = []) {
  const activeSubscription = getActiveDigitalSubscription(user) || getLatestDigitalSubscription(user)
  const selectedPlan =
    subscriptionProducts.find((plan) => plan.slug === activeSubscription?.productSlug) ||
    subscriptionProducts.find((plan) => plan.accessScope === activeSubscription?.entitlementKey) ||
    subscriptionProducts[0] ||
    null

  return {
    planSlug: activeSubscription?.productSlug || selectedPlan?.slug || '',
    startAt: toDatetimeLocalValue(
      activeSubscription?.createdAt
        ? new Date(activeSubscription.createdAt)
        : activeSubscription?.expiresAt
          ? new Date(activeSubscription.expiresAt)
          : new Date(),
    ),
    durationValue: String(
      selectedPlan?.metadata?.durationValue || selectedPlan?.metadata?.durationMonths || 1,
    ),
    durationUnit: selectedPlan?.metadata?.durationUnit || 'months',
  }
}

function formatAuditEventLabel(eventType) {
  switch (eventType) {
    case 'managed_user_created':
      return 'admin.users.auditUserCreated'
    case 'managed_subscription_granted':
      return 'admin.users.auditSubscriptionGranted'
    case 'managed_subscription_revoked':
      return 'admin.users.auditSubscriptionRevoked'
    default:
      return 'admin.users.auditEvent'
  }
}

function isEncounterReservationOrder(order = {}) {
  const metadata = order.metadata || {}

  return (
    metadata.checkoutType === 'reservation' ||
    metadata.productType === 'reservation' ||
    Boolean(metadata.reservationRequestId)
  )
}

function SectionPanel({ title, description, children }) {
  return (
    <section className="admin-editor-panel">
      <div className="admin-section-header">
        <div>
          <h3>{title}</h3>
          {description ? <p className="admin-meta">{description}</p> : null}
        </div>
      </div>
      <div className="admin-grid">{children}</div>
    </section>
  )
}

function Field({ label, value, onChange, type = 'text', className = '' }) {
  return (
    <label className={`admin-field${className ? ` ${className}` : ''}`}>
      <span>{label}</span>
      <input type={type} value={value || ''} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function TextareaField({ label, value, onChange, rows = 4, className = '' }) {
  return (
    <label className={`admin-field${className ? ` ${className}` : ''}`}>
      <span>{label}</span>
      <textarea rows={rows} value={value || ''} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function ArrayTextareaField({ label, values, onChange, rows = 5, className = '' }) {
  const [textValue, setTextValue] = useState((values || []).join('\n'))

  useEffect(() => {
    setTextValue((values || []).join('\n'))
  }, [values])

  function commitValue(nextValue) {
    onChange(
      nextValue
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean),
    )
  }

  return (
    <label className={`admin-field${className ? ` ${className}` : ''}`}>
      <span>{label}</span>
      <textarea
        rows={rows}
        value={textValue}
        onChange={(event) => setTextValue(event.target.value)}
        onBlur={(event) => commitValue(event.target.value)}
      />
    </label>
  )
}

function ChipListField({ label, description, items, onChange, placeholder }) {
  const { t } = useTranslation()
  const normalizedItems = useMemo(() => uniqueValues(items || []), [items])
  const [draft, setDraft] = useState('')
  const [editingItem, setEditingItem] = useState('')

  useEffect(() => {
    if (editingItem && !normalizedItems.includes(editingItem)) {
      setEditingItem('')
      setDraft('')
    }
  }, [editingItem, normalizedItems])

  function startEdit(item) {
    setEditingItem(item)
    setDraft(item)
  }

  function removeItem(item) {
    onChange(normalizedItems.filter((currentItem) => currentItem !== item))
    if (editingItem === item) {
      setEditingItem('')
      setDraft('')
    }
  }

  function commitValue() {
    const nextValue = normalizeChipValue(draft)

    if (!nextValue) {
      return
    }

    const nextItems = editingItem
      ? normalizedItems.map((item) => (item === editingItem ? nextValue : item))
      : uniqueValues([...normalizedItems, nextValue])

    onChange(nextItems)
    setEditingItem('')
    setDraft('')
  }

  return (
    <div className="admin-field admin-field-full">
      <span>{label}</span>
      {description ? <p className="admin-meta">{description}</p> : null}
      <div className="admin-chip-row">
        {normalizedItems.length ? (
          normalizedItems.map((item) => (
            <div className="admin-chip-item" key={item}>
              <button type="button" className="admin-chip-button" onClick={() => startEdit(item)}>
                <span>{item}</span>
              </button>
              <button
                type="button"
                className="admin-chip-remove"
                onClick={() => removeItem(item)}
                aria-label={`${t('admin.content.remove')} ${item}`}
              >
                ×
              </button>
            </div>
          ))
        ) : (
          <p className="admin-meta">{t('admin.blog.noItems')}</p>
        )}
      </div>
      <div className="admin-chip-editor">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={placeholder}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commitValue()
            }
          }}
        />
        <button type="button" className="admin-secondary-button" onClick={commitValue}>
          {editingItem ? t('admin.content.chipUpdate') : t('admin.content.chipAdd')}
        </button>
      </div>
      <p className="admin-chip-helper">
        {editingItem ? t('admin.content.chipEditHint') : t('admin.content.chipHint')}
      </p>
    </div>
  )
}

function normalizeDateInput(value = '') {
  const text = String(value || '').trim().slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : ''
}

function createFutureDate(offsetDays = 0) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + offsetDays)
  return date.toISOString().slice(0, 10)
}

function DateRepeaterField({ label, values, onChange, hint, emptyText, addLabel, removeLabel }) {
  const normalizedValues = Array.isArray(values) ? values.map(normalizeDateInput).filter(Boolean) : []

  function updateDate(index, nextValue) {
    onChange(
      normalizedValues.map((item, itemIndex) => (itemIndex === index ? normalizeDateInput(nextValue) : item)).filter(Boolean),
    )
  }

  function addDate() {
    onChange([...normalizedValues, createFutureDate(normalizedValues.length + 1)])
  }

  function removeDate(index) {
    onChange(normalizedValues.filter((_, itemIndex) => itemIndex !== index))
  }

  return (
    <div className="admin-field admin-field-full">
      <span>{label}</span>
      {hint ? <p className="admin-meta">{hint}</p> : null}
      <div className="admin-date-repeater">
        {normalizedValues.length ? (
          normalizedValues.map((dateValue, index) => (
            <div className="admin-date-row" key={`${dateValue}-${index}`}>
              <label className="admin-field admin-field-inline">
                <span>{`${label} ${index + 1}`}</span>
                <input type="date" value={dateValue} onChange={(event) => updateDate(index, event.target.value)} />
              </label>
              <button type="button" className="admin-danger-button admin-danger-button-inline" onClick={() => removeDate(index)}>
                {removeLabel}
              </button>
            </div>
          ))
        ) : (
          <p className="admin-meta">{emptyText}</p>
        )}
      </div>
      <button type="button" className="admin-secondary-button admin-secondary-button-inline" onClick={addDate}>
        {addLabel}
      </button>
    </div>
  )
}

function getVideoAccessModeLabel(accessMode) {
  if (accessMode === 'public') return 'Público'
  if (accessMode === 'registered') return 'Registrados'
  if (accessMode === 'subscription') return 'Suscripción'
  return 'Compra individual'
}

function MediaField({
  accept,
  bucket,
  fieldKey,
  folder,
  label,
  note,
  onClear,
  onUpload,
  progress,
  value,
  viewHref,
  variant = 'default',
}) {
  const { t } = useTranslation()

  return (
    <div className={`admin-upload-card${variant === 'compact' ? ' is-compact' : ''}`}>
      <div>
        <span className="admin-upload-title">{label}</span>
        {note ? <p>{note}</p> : null}
        {value ? (
          <div className="admin-upload-actions">
            {viewHref !== null ? (
              <a className="admin-media-link" href={viewHref || value} target="_blank" rel="noopener noreferrer">
                {t('admin.content.viewCurrentMedia')}
              </a>
            ) : null}
            {onClear ? (
              <button className="admin-danger-button admin-danger-button-inline" type="button" onClick={onClear}>
                {t('admin.content.removeMedia')}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <input
        type="file"
        accept={accept}
          onChange={async (event) => {
            const file = event.target.files?.[0]
            if (!file) {
              return
            }

            await onUpload(file, bucket, folder, label)
            event.target.value = ''
          }}
        />
        {progress?.active && progress.fieldKey === fieldKey ? (
          <div className="admin-upload-progress admin-upload-progress-inline">
            <div className="admin-upload-progress-copy">
              <strong>{progress.label}</strong>
              <span>{progress.value}%</span>
            </div>
            <div className="admin-upload-progress-bar" aria-hidden="true">
              <span style={{ width: `${progress.value}%` }} />
            </div>
          </div>
        ) : null}
    </div>
  )
}

function normalizeCarouselSlide(slide = '') {
  if (typeof slide === 'string') {
    const src = slide.trim()
    return src ? { src, caption: '' } : null
  }

  if (!slide || typeof slide !== 'object') {
    return null
  }

  const src = String(slide.src || slide.image || slide.url || slide.value || '').trim()
  const caption = String(slide.caption || slide.text || slide.label || slide.title || '').trim()

  return src ? { src, caption } : null
}

function CarouselSlidesEditor({
  bucket,
  fieldKeyBase,
  folder,
  label,
  note,
  onChange,
  onUploadFile,
  slides,
  uploadProgress,
  uploadTitle,
}) {
  const { t } = useTranslation()
  const normalizedSlides = (Array.isArray(slides) ? slides : []).map(normalizeCarouselSlide).filter(Boolean)

  function commitSlides(nextSlides) {
    onChange(nextSlides.map(normalizeCarouselSlide).filter(Boolean))
  }

  function updateSlide(index, patch) {
    const nextSlides = normalizedSlides.map((slide, slideIndex) =>
      slideIndex === index ? { ...slide, ...patch } : slide,
    )
    commitSlides(nextSlides)
  }

  async function addUploadedSlide(file, uploadBucket, uploadFolder, mediaLabel, fieldKey) {
    const uploadedUrl = await onUploadFile(file, uploadBucket, uploadFolder, mediaLabel, fieldKey)
    if (!uploadedUrl) {
      return
    }

    commitSlides([...normalizedSlides, { src: uploadedUrl, caption: '' }])
  }

  return (
    <div className="admin-repeater admin-carousel-editor">
      <div className="admin-section-header">
        <div>
          <h3>{label}</h3>
          {note ? <p className="admin-meta">{note}</p> : null}
        </div>
      </div>

      <div className="admin-carousel-editor-list">
        {normalizedSlides.map((slide, index) => {
          const slideFieldKey = `${fieldKeyBase}.${index}.src`

          return (
            <div className="admin-array-card admin-carousel-slide-card" key={slideFieldKey}>
              <div className="admin-section-header">
                <div>
                  <p className="admin-video-item-kicker">{t('admin.content.videoItem', { index: String(index + 1).padStart(2, '0') })}</p>
                  <h4>{slide.caption || t('admin.content.untitledVideo')}</h4>
                </div>
                <button
                  type="button"
                  className="admin-danger-button"
                  onClick={() => commitSlides(normalizedSlides.filter((_, slideIndex) => slideIndex !== index))}
                >
                  {t('admin.content.remove')}
                </button>
              </div>

              <div className="admin-carousel-slide-grid">
                <MediaField
                  variant="compact"
                  fieldKey={slideFieldKey}
                  label={uploadTitle}
                  accept="image/*"
                  bucket={bucket}
                  folder={folder}
                  progress={uploadProgress}
                  value={slide.src}
                  onClear={() => updateSlide(index, { src: '' })}
                  onUpload={(file, uploadBucket, uploadFolder, mediaLabel) =>
                    addUploadedSlide(file, uploadBucket, uploadFolder, mediaLabel, slideFieldKey)
                  }
                />
                <TextareaField
                  className="admin-field-full"
                  label="Texto visible en la foto"
                  rows={3}
                  value={slide.caption}
                  onChange={(value) => updateSlide(index, { caption: value })}
                />
              </div>
            </div>
          )
        })}
      </div>

      <MediaField
        variant="compact"
        fieldKey={`${fieldKeyBase}.new`}
        label={`Agregar ${label.toLowerCase()}`}
        note="Sube una nueva imagen para sumarla al carrusel."
        accept="image/*"
        bucket={bucket}
        folder={folder}
        progress={uploadProgress}
        value=""
        onUpload={(file, uploadBucket, uploadFolder, mediaLabel) =>
          addUploadedSlide(file, uploadBucket, uploadFolder, mediaLabel, `${fieldKeyBase}.new`)
        }
      />
    </div>
  )
}

function VideoLibraryItemEditor({
  item,
  index,
  blogTags = [],
  setDraft,
  setDraftValue,
  uploadFileToPath,
  uploadProgress,
  onRemove,
}) {
  const { t } = useTranslation()
  const previewValue =
    item.previewSourceUrl ||
    item.previewDriveFileId ||
    (!isInternalMediaUrl(item.previewVideoUrl) ? item.previewVideoUrl : '')
  const fullValue =
    item.fullSourceUrl ||
    item.fullDriveFileId ||
    (!isInternalMediaUrl(item.fullVideoUrl) ? item.fullVideoUrl : '')
  const selectedTags = normalizeVideoTags(item.tags || (item.tag ? [item.tag] : []))
  const tagOptions = uniqueValues([...(blogTags || []), ...selectedTags])

  function toggleTag(tag) {
    setDraft((current) => {
      const currentItem = current.videoLibrary.items[index] || {}
      const currentTags = normalizeVideoTags(currentItem.tags || (currentItem.tag ? [currentItem.tag] : []))
      const nextTags = currentTags.includes(tag)
        ? currentTags.filter((itemTag) => itemTag !== tag)
        : currentTags.length >= 5
          ? currentTags
          : [...currentTags, tag]

      return updateByPath(current, ['videoLibrary', 'items', index], {
        ...currentItem,
        ...item,
        tags: nextTags,
        tag: nextTags[0] || '',
      })
    })
  }

  return (
    <div className="admin-array-card admin-video-item-card">
      <div className="admin-video-item-header">
        <div>
          <p className="admin-video-item-kicker">{t('admin.content.videoItem', { index: String(index + 1).padStart(2, '0') })}</p>
          <h4>{item.title || item.slug || t('admin.content.untitledVideo')}</h4>
          <p className="admin-meta">
            {item.slug || t('admin.content.noSlug')} · {item.duration || '00:00'} · {selectedTags.length ? selectedTags.join(' · ') : t('admin.content.noTag')}
          </p>
        </div>
        <button type="button" className="admin-danger-button" onClick={onRemove}>
          {t('admin.content.remove')}
        </button>
      </div>

      <div className="admin-video-item-layout">
        <div className="admin-video-item-section">
          <Field label={t('admin.content.slug')} value={item.slug} onChange={(value) => setDraftValue(['videoLibrary', 'items', index, 'slug'], value)} />
          <Field label={t('admin.content.title')} value={item.title} onChange={(value) => setDraftValue(['videoLibrary', 'items', index, 'title'], value)} />
          <TextareaField
            className="admin-field-full"
            label={t('admin.content.description')}
            rows={4}
            value={item.description}
            onChange={(value) => setDraftValue(['videoLibrary', 'items', index, 'description'], value)}
          /> 

          <div className="admin-video-meta-grid">
            <div className="admin-field admin-field-full">
              <span>{t('admin.content.tag')}</span>
              <div className="admin-chip-selector">
                {tagOptions.length ? (
                  tagOptions.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className={selectedTags.includes(tag) ? 'admin-chip-button is-active' : 'admin-chip-button'}
                      onClick={() => toggleTag(tag)}
                      aria-pressed={selectedTags.includes(tag)}
                    >
                      <span>{tag}</span>
                    </button>
                  ))
                ) : (
                  <p className="admin-meta">{t('admin.blog.tagsHint')}</p>
                )}
              </div>
              <p className="admin-meta admin-chip-helper">Máximo 5 tags, sincronizados con Blog &gt; Publicaciones.</p>
            </div>
            <Field label={t('admin.content.duration')} value={item.duration} onChange={(value) => setDraftValue(['videoLibrary', 'items', index, 'duration'], value)} />
            <Field label={t('admin.content.price')} value={item.priceLabel} onChange={(value) => setDraftValue(['videoLibrary', 'items', index, 'priceLabel'], value)} />
            <label className="admin-field">
              <span>Modo de acceso</span>
              <select
                value={item.accessMode || 'purchase'}
                onChange={(event) => {
                  const nextMode = event.target.value
                  setDraftValue(['videoLibrary', 'items', index, 'accessMode'], nextMode)
                  setDraftValue(['videoLibrary', 'items', index, 'accessLabel'], getVideoAccessModeLabel(nextMode))
                }}
              >
                <option value="public">Público</option>
                <option value="registered">Registrados</option>
                <option value="subscription">Suscripción</option>
                <option value="purchase">Compra individual</option>
              </select>
            </label>
          </div>

          <Field className="admin-field-full" label={t('admin.content.accessText')} value={item.accessLabel} onChange={(value) => setDraftValue(['videoLibrary', 'items', index, 'accessLabel'], value)} />
          <Field className="admin-field-full" label={t('admin.content.previewLabel')} value={item.previewLabel} onChange={(value) => setDraftValue(['videoLibrary', 'items', index, 'previewLabel'], value)} />
          <Field className="admin-field-full" label={t('admin.content.purchaseUrl')} value={item.purchaseUrl} onChange={(value) => setDraftValue(['videoLibrary', 'items', index, 'purchaseUrl'], value)} />
        </div>

        <div className="admin-video-item-section">
          <MediaField
            variant="compact"
            fieldKey={`videoLibrary.items.${index}.posterImage`}
            label={t('admin.content.poster')}
            note={t('admin.content.posterNote')}
            accept="image/*"
            bucket="site-images"
            folder="video-posters"
            progress={uploadProgress}
            value={item.posterImage}
            onClear={() => setDraftValue(['videoLibrary', 'items', index, 'posterImage'], '')}
            onUpload={(file, bucket, folder, mediaLabel) =>
              uploadFileToPath(
                file,
                ['videoLibrary', 'items', index, 'posterImage'],
                bucket,
                folder,
                mediaLabel,
                `videoLibrary.items.${index}.posterImage`,
              )
            }
          />

          <div className="admin-video-media-stack">
            <Field
              className="admin-field-full"
              label={t('admin.content.previewDriveLink')}
              value={item.previewSourceUrl || item.previewDriveFileId || ''}
              onChange={(value) => {
                setDraftValue(['videoLibrary', 'items', index, 'previewSourceUrl'], value)
                setDraftValue(['videoLibrary', 'items', index, 'previewVideoUrl'], value)
              }}
            />
            <Field
              className="admin-field-full"
              label={t('admin.content.fullDriveLink')}
              value={item.fullSourceUrl || item.fullDriveFileId || ''}
              onChange={(value) => {
                setDraftValue(['videoLibrary', 'items', index, 'fullSourceUrl'], value)
                setDraftValue(['videoLibrary', 'items', index, 'fullVideoUrl'], value)
              }}
            />
            <p className="admin-meta">
              {t('admin.content.driveLinkHint')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function PackAssetEditor({
  asset,
  index,
  itemIndex,
  setDraftValue,
  uploadFileToPath,
  uploadProgress,
  onRemove,
}) {
  const { t } = useTranslation()
  const isVideo = asset.mediaType === 'video'

  return (
    <div className="admin-array-card admin-pack-asset-card">
      <div className="admin-video-item-header">
        <div>
          <p className="admin-video-item-kicker">{t('admin.content.packAsset', { index: String(index + 1).padStart(2, '0') })}</p>
          <h4>{asset.title || t('admin.content.newAsset')}</h4>
        </div>
        <button type="button" className="admin-danger-button" onClick={onRemove}>
          {t('admin.content.remove')}
        </button>
      </div>

      <div className="admin-video-meta-grid">
        <Field
          label={t('admin.content.title')}
          value={asset.title}
          onChange={(value) => setDraftValue(['videoCollections', 'items', itemIndex, 'assets', index, 'title'], value)}
        />
        <label className="admin-field">
          <span>{t('admin.content.mediaType')}</span>
          <select
            value={asset.mediaType || 'image'}
            onChange={(event) =>
              setDraftValue(['videoCollections', 'items', itemIndex, 'assets', index, 'mediaType'], event.target.value)
            }
          >
            <option value="image">{t('admin.content.image')}</option>
            <option value="video">{t('admin.content.video')}</option>
          </select>
        </label>
      </div>

      {isVideo ? (
        <div className="admin-video-media-stack">
          <Field
            className="admin-field-full"
            label={t('admin.content.packVideoLink')}
            value={asset.mediaUrl}
            onChange={(value) =>
              setDraftValue(['videoCollections', 'items', itemIndex, 'assets', index, 'mediaUrl'], value)
            }
          />
          <p className="admin-meta">{t('admin.content.packVideoLinkHint')}</p>
        </div>
      ) : (
        <div className="admin-video-media-stack">
          <MediaField
            variant="compact"
            fieldKey={`videoCollections.items.${itemIndex}.assets.${index}.image`}
            label={t('admin.content.uploadImage')}
            note={t('admin.content.packImageNote')}
            accept="image/*"
            bucket="site-images"
            folder="pack-assets"
            progress={uploadProgress}
            value={asset.image}
            onClear={() =>
              setDraftValue(['videoCollections', 'items', itemIndex, 'assets', index, 'image'], '')
            }
            onUpload={(file, bucket, folder, mediaLabel) =>
              uploadFileToPath(
                file,
                ['videoCollections', 'items', itemIndex, 'assets', index, 'image'],
                bucket,
                folder,
                mediaLabel,
                `videoCollections.items.${itemIndex}.assets.${index}.image`,
              )
            }
          />
        </div>
      )}
    </div>
  )
}

function PackToolbar({ title, description, addLabel, onAdd, saveLabel, savingLabel, onSave, isSaving }) {
  return (
    <div className="admin-video-savebar admin-pack-savebar">
      <div>
        <p className="admin-video-savebar-kicker">{title}</p>
        <p className="admin-meta">{description}</p>
      </div>
      <div className="admin-actions-row">
        <button type="button" className="admin-secondary-button" onClick={onAdd}>
          {addLabel}
        </button>
        <button type="button" className="admin-primary-button" onClick={onSave} disabled={isSaving}>
          {isSaving ? savingLabel : saveLabel}
        </button>
      </div>
    </div>
  )
}

function ensureVideoLibraryUiIds(content) {
  const next = deepClone(content)

  next.videoLibrary.items = (next.videoLibrary.items || []).map((item) => ({
    ...item,
    uiId: item.uiId || generateStableItemId('video'),
  }))

  return next
}

function ensurePackUiIds(content) {
  const next = deepClone(content)

  next.videoCollections.items = (next.videoCollections.items || []).map((item) => ({
    ...item,
    uiId: item.uiId || generateStableItemId('pack'),
    assets: (Array.isArray(item.assets) ? item.assets : []).map((asset, index) => ({
      ...asset,
      id: asset.id || generateStableItemId(`pack-asset-${index}`),
    })),
  }))

  return next
}

function hasSeedEnglishCatalogTitles(sourceItems = [], localizedItems = []) {
  const sourceByIdentity = new Map(
    (Array.isArray(sourceItems) ? sourceItems : []).map((item) => [
      String(item?.id || item?.slug || '').trim().toLowerCase(),
      item,
    ]),
  )
  const seedTitlePatterns = [
    /^Premium Video\s+\d+$/i,
    /^Signature Video Pack$/i,
    /^Weekend Drop Collection$/i,
    /^Archive Edit Pack$/i,
    /^Seasonal Collection$/i,
    /^Curated Selection Pack$/i,
  ]

  return (Array.isArray(localizedItems) ? localizedItems : []).some((item) => {
    const title = String(item?.title || '').trim()

    if (!title) {
      return false
    }

    if (seedTitlePatterns.some((pattern) => pattern.test(title))) {
      return true
    }

    const identity = String(item?.id || item?.slug || '').trim().toLowerCase()
    if (!identity) {
      return false
    }

    const sourceItem = sourceByIdentity.get(identity)
    if (!sourceItem) {
      return false
    }

    return title === String(sourceItem.title || '').trim()
  })
}

function ContentEditor() {
  const {
    isSupabaseConfigured,
    saveSiteContent,
    siteContent,
    uploadManagedMedia,
    uploadManagedVideoMedia,
    uploadManagedMediaFromUrl,
  } = useAppState()
  const { t, i18n } = useTranslation()
  const [draftState, setDraft] = useState(() =>
    ensurePackUiIds(ensureVideoLibraryUiIds(mergeSiteContent(siteContent))),
  )
  const [message, setMessage] = useState('')
  const [uploadMessage, setUploadMessage] = useState('')
  const [uploadProgress, setUploadProgress] = useState({ active: false, fieldKey: '', label: '', value: 0 })
  const [isSaving, setIsSaving] = useState(false)
  const [isMigratingAssets, setIsMigratingAssets] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [translationMessage, setTranslationMessage] = useState('')
  const [activeSection, setActiveSection] = useState('creator')
  const [activeCreatorSection, setActiveCreatorSection] = useState('creator')
  const [activeBlogSection, setActiveBlogSection] = useState('landing')
  const [activeEncuentrosSection, setActiveEncuentrosSection] = useState('overview')
  const [activeGlobalSection, setActiveGlobalSection] = useState('links')
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0)
  const [selectedPackIndex, setSelectedPackIndex] = useState(0)
  const [selectedPhysicalIndex, setSelectedPhysicalIndex] = useState(0)
  const autoRepairCatalogRef = useRef('')
  const draftStateRef = useRef(draftState)
  const localeKey = getLocaleKey(i18n.resolvedLanguage)
  const draft = resolveLocalizedRecord(draftState, localeKey)
  const blogTaxonomyTags = uniqueValues(siteContent.blogPage?.taxonomy?.tags || [])

  useEffect(() => {
    setDraft(ensurePackUiIds(ensureVideoLibraryUiIds(mergeSiteContent(siteContent))))
  }, [siteContent])

  useEffect(() => {
    draftStateRef.current = draftState
  }, [draftState])

  useEffect(() => {
    if (activeSection !== 'creator' || activeCreatorSection !== 'blog') {
      setActiveBlogSection('landing')
    }
  }, [activeSection, activeCreatorSection])

  useEffect(() => {
    if (activeSection !== 'creator') {
      setActiveCreatorSection('creator')
    }
  }, [activeSection])

  useEffect(() => {
    setTranslationMessage('')
  }, [activeSection, activeBlogSection, activeCreatorSection])

  useEffect(() => {
    if (activeSection !== 'creator' || activeCreatorSection !== 'videos') {
      return
    }

    setSelectedVideoIndex((current) => {
      const maxIndex = Math.max((draft.videoLibrary.items || []).length - 1, 0)
      return Math.min(current, maxIndex)
    })
  }, [activeSection, activeCreatorSection, draft.videoLibrary.items.length])

  useEffect(() => {
    if (activeSection !== 'creator' || activeCreatorSection !== 'packs') {
      return
    }

    setSelectedPackIndex((current) => {
      const maxIndex = Math.max((draft.videoCollections.items || []).length - 1, 0)
      return Math.min(current, maxIndex)
    })
  }, [activeSection, activeCreatorSection, draft.videoCollections.items.length])

  useEffect(() => {
    if (activeSection !== 'creator' || activeCreatorSection !== 'physical') {
      return
    }

    setSelectedPhysicalIndex((current) => {
      const maxIndex = Math.max((draft.physicalMerch.items || []).length - 1, 0)
      return Math.min(current, maxIndex)
    })
  }, [activeSection, activeCreatorSection, draft.physicalMerch.items.length])

  function setDraftValue(path, value) {
    const targetPath = localeKey === 'en' ? ['localized', 'en', ...path] : path
    setDraft((current) => setByPath(current, targetPath, value))
  }

  async function persistDraftValue(path, value, successMessage) {
    const targetPath = localeKey === 'en' ? ['localized', 'en', ...path] : path
    const nextDraftSnapshot = setByPath(draftStateRef.current, targetPath, value)
    draftStateRef.current = nextDraftSnapshot
    setDraft(nextDraftSnapshot)
    setIsSaving(true)

    try {
      await saveSiteContent(nextDraftSnapshot)
      setMessage(successMessage)
    } catch (error) {
      setMessage(error?.message || 'No se pudo guardar este cambio.')
    } finally {
      setIsSaving(false)
    }
  }

  function addVideoItem() {
    const nextIndex = draft.videoLibrary.items.length
    addListItem(['videoLibrary', 'items'], {
      uiId: generateStableItemId('video'),
      slug: `video-${Date.now()}`,
      title: t('admin.content.newVideo'),
      description: t('admin.content.description'),
      tags: blogTaxonomyTags[0] ? [blogTaxonomyTags[0]] : [],
      tag: blogTaxonomyTags[0] || '',
      duration: '00:00',
      priceLabel: '$0',
      accessMode: 'purchase',
      accessLabel: getVideoAccessModeLabel('purchase'),
      previewLabel: t('admin.content.previewLabel'),
      posterImage: '',
      previewSourceUrl: '',
      fullSourceUrl: '',
      previewDriveFileId: '',
      fullDriveFileId: '',
      previewVideoUrl: '',
      fullVideoUrl: '',
      purchaseUrl: '',
    })
    setSelectedVideoIndex(nextIndex)
  }

  function addPackItem() {
    const nextIndex = draft.videoCollections.items.length
    addListItem(['videoCollections', 'items'], {
      uiId: generateStableItemId('pack'),
      slug: slugifyText(t('admin.content.newPack'), `pack-${Date.now()}`),
      title: t('admin.content.newPack'),
      description: t('admin.content.packDescriptionPlaceholder'),
      itemCount: t('admin.content.zeroVideos'),
      priceLabel: '$0',
      accessLabel: t('admin.content.accessText'),
      highlights: [t('admin.content.newHighlight')],
      coverImage: '',
      assets: [],
    })
    setSelectedPackIndex(nextIndex)
  }

  function addPhysicalItem() {
    const nextIndex = draft.physicalMerch.items.length
    addListItem(['physicalMerch', 'items'], {
      slug: `physical-item-${Date.now()}`,
      title: t('admin.content.newItem'),
      subtitle: t('admin.content.subtitle'),
      priceLabel: '$0',
      stockLabel: t('admin.content.stockUnit'),
      image: '',
      purchaseUrl: '',
    })
    setSelectedPhysicalIndex(nextIndex)
  }

  function getTranslationConfig(targetLocale = 'en') {
    const isTargetSpanish = targetLocale === 'es'
    const sourceContent = isTargetSpanish
      ? draft
      : resolveLocalizedRecord(draftState, 'es')
    const localizedRoot = isTargetSpanish ? ['localized', 'es'] : ['localized', 'en']
    const metaRoot = isTargetSpanish ? ['localizedMeta', 'es'] : ['localizedMeta', 'en']

    if (activeSection === 'creator' && activeCreatorSection === 'creator') {
      return {
        scopeKey: 'creatorHome',
        source: sourceContent.creatorHome,
        localizedPath: [...localizedRoot, 'creatorHome'],
        metaPath: [...metaRoot, 'creatorHome'],
      }
    }

    if (activeSection === 'creator' && activeCreatorSection === 'access') {
      return {
        scopeKey: 'accessTotal',
        source: sourceContent.accessTotal,
        localizedPath: [...localizedRoot, 'accessTotal'],
        metaPath: [...metaRoot, 'accessTotal'],
      }
    }

    if (activeSection === 'creator' && activeCreatorSection === 'spotlight') {
      return {
        scopeKey: 'mediaSpotlight',
        source: sourceContent.mediaSpotlight,
        localizedPath: [...localizedRoot, 'mediaSpotlight'],
        metaPath: [...metaRoot, 'mediaSpotlight'],
      }
    }

    if (activeSection === 'creator' && activeCreatorSection === 'videos') {
      return {
        scopeKey: 'videoLibrary',
        source: sourceContent.videoLibrary,
        localizedPath: [...localizedRoot, 'videoLibrary'],
        metaPath: [...metaRoot, 'videoLibrary'],
      }
    }

    if (activeSection === 'creator' && activeCreatorSection === 'packs') {
      return {
        scopeKey: 'videoCollections',
        source: sourceContent.videoCollections,
        localizedPath: [...localizedRoot, 'videoCollections'],
        metaPath: [...metaRoot, 'videoCollections'],
      }
    }

    if (activeSection === 'creator' && activeCreatorSection === 'physical') {
      return {
        scopeKey: 'physicalMerch',
        source: sourceContent.physicalMerch,
        localizedPath: [...localizedRoot, 'physicalMerch'],
        metaPath: [...metaRoot, 'physicalMerch'],
      }
    }

    if (activeSection === 'creator' && activeCreatorSection === 'free') {
      return {
        scopeKey: 'freeContent',
        source: sourceContent.freeContent,
        localizedPath: [...localizedRoot, 'freeContent'],
        metaPath: [...metaRoot, 'freeContent'],
      }
    }

    if (activeSection === 'creator' && activeCreatorSection === 'membership') {
      return {
        scopeKey: 'membership',
        source: sourceContent.membership,
        localizedPath: [...localizedRoot, 'membership'],
        metaPath: [...metaRoot, 'membership'],
      }
    }

    if (activeSection === 'creator' && activeCreatorSection === 'blog' && activeBlogSection === 'landing') {
      return {
        scopeKey: 'blogLanding',
        source: {
          blogSection: sourceContent.blogSection,
          blogPage: sourceContent.blogPage,
        },
        localizedPath: localizedRoot,
        metaPath: [...metaRoot, 'blogLanding'],
      }
    }

    if (activeSection === 'encuentros') {
      return {
        scopeKey: 'encuentros',
        source: {
          topBarDesktopHighlight: sourceContent.topBarDesktopHighlight,
          topBarMobile: sourceContent.topBarMobile,
          heroTitle: sourceContent.heroTitle,
          heroDescription: sourceContent.heroDescription,
          heroSubtitle: sourceContent.heroSubtitle,
          presencialDescription: sourceContent.presencialDescription,
          presencialFeatures: sourceContent.presencialFeatures,
          encuentrosPresencialFeatureOptions: sourceContent.encuentrosPresencialFeatureOptions,
          presencialBenefitTitle: sourceContent.presencialBenefitTitle,
          presencialBenefitText: sourceContent.presencialBenefitText,
          fanCardDescription: sourceContent.fanCardDescription,
          presencialPrice: sourceContent.presencialPrice,
          importantItems: sourceContent.importantItems,
          extraTitle: sourceContent.extraTitle,
          extraLead: sourceContent.extraLead,
          extraFromLabel: sourceContent.extraFromLabel,
          extraPrice: sourceContent.extraPrice,
          extraItems: sourceContent.extraItems,
          encuentrosExtraOptions: sourceContent.encuentrosExtraOptions,
          encuentrosBooking: {
            ...sourceContent.encuentrosBooking,
            description: sourceContent.encuentrosBooking?.description || '',
            galleryTitle: sourceContent.encuentrosBooking?.galleryTitle || '',
            gallerySubtitle: sourceContent.encuentrosBooking?.gallerySubtitle || '',
            galleryExclusiveTitle: sourceContent.encuentrosBooking?.galleryExclusiveTitle || '',
            galleryExclusiveDescription: sourceContent.encuentrosBooking?.galleryExclusiveDescription || '',
            galleryExclusiveHint: sourceContent.encuentrosBooking?.galleryExclusiveHint || '',
            priceLabel: sourceContent.encuentrosBooking?.priceLabel || '',
            priceAmount: sourceContent.encuentrosBooking?.priceAmount || 500,
            advanceLabel: sourceContent.encuentrosBooking?.advanceLabel || '',
            advanceAmount: sourceContent.encuentrosBooking?.advanceAmount || 1000,
            recordingDiscountLabel: sourceContent.encuentrosBooking?.recordingDiscountLabel || '',
            recordingPromptTitle: sourceContent.encuentrosBooking?.recordingPromptTitle || '',
            recordingPromptDescription: sourceContent.encuentrosBooking?.recordingPromptDescription || '',
            recordingYesLabel: sourceContent.encuentrosBooking?.recordingYesLabel || '',
            recordingNoLabel: sourceContent.encuentrosBooking?.recordingNoLabel || '',
            paymentMethods: sourceContent.encuentrosBooking?.paymentMethods || [],
          },
        },
        localizedPath: localizedRoot,
        metaPath: [...metaRoot, 'encuentros'],
      }
    }

    if (activeSection === 'global') {
      return {
        scopeKey: 'global',
        source: {
          whatsappUrl: sourceContent.whatsappUrl,
          fanButtonUrl: sourceContent.fanButtonUrl,
          socialUrl: sourceContent.socialUrl,
          footerText: sourceContent.footerText,
          siteFooter: sourceContent.siteFooter,
        },
        localizedPath: localizedRoot,
        metaPath: [...metaRoot, 'global'],
      }
    }

    return null
  }

  function pickTranslationSubset(source, translated) {
    if (Array.isArray(source)) {
      return Array.isArray(translated) ? translated : []
    }

    if (source && typeof source === 'object') {
      const next = {}
      for (const key of Object.keys(source)) {
        next[key] = pickTranslationSubset(source[key], translated?.[key])
      }
      return next
    }

    return translated
  }

  async function translateActiveSection(mode = 'full', { persist = false, targetLocale = 'en' } = {}) {
    const config = getTranslationConfig(targetLocale)

    if (!config) {
      setTranslationMessage(t('admin.content.translationUnavailable'))
      return
    }

    setIsTranslating(true)
    setTranslationMessage('')

    try {
      const result = await translateAdminContent(config.source, {
        sourceLocale: targetLocale === 'es' ? 'en' : 'es',
        targetLocale,
        mode,
        scope: config.scopeKey,
      })

      const translated = result.translated || {}
      const currentEnglish = getByPath(draftState, config.localizedPath) || {}
      const nextEnglish = mode === 'missing' ? mergeLocalizedValue(translated, currentEnglish) : translated
      let nextDraftSnapshot = setByPath(draftState, config.localizedPath, nextEnglish)

      if (config.metaPath) {
        nextDraftSnapshot = setByPath(nextDraftSnapshot, config.metaPath, {
          sourceHash: result.sourceHash || hashStableValue(config.source),
          translatedAt: result.translatedAt || new Date().toISOString(),
          provider: result.provider || '',
          mode,
        })
      }

      setDraft(nextDraftSnapshot)

      if (persist && nextDraftSnapshot) {
        await saveSiteContent(nextDraftSnapshot)
      }

      setTranslationMessage(
        targetLocale === 'es'
          ? mode === 'missing'
            ? t('admin.content.translationMissingReadyEs')
            : t('admin.content.translationReadyEs')
          : mode === 'missing'
            ? t('admin.content.translationMissingReady')
            : t('admin.content.translationReady'),
      )
    } catch (error) {
      setTranslationMessage(error?.message || t('admin.content.translationFailed'))
    } finally {
      setIsTranslating(false)
    }
  }

  function clearEnglishSectionDraft() {
    const config = getTranslationConfig('en')

    if (!config) {
      return
    }

    setDraft((current) => {
      let next = current

      if (config.scopeKey === 'videoLibrary') {
        next = setByPath(next, ['localized', 'en', 'videoLibrary'], {})
        next = setByPath(next, ['localizedMeta', 'en', 'videoLibrary'], {})
      } else if (config.scopeKey === 'videoCollections') {
        next = setByPath(next, ['localized', 'en', 'videoCollections'], {})
        next = setByPath(next, ['localizedMeta', 'en', 'videoCollections'], {})
      } else if (config.scopeKey === 'blogLanding' || config.scopeKey === 'encuentros' || config.scopeKey === 'global') {
        next = setByPath(next, ['localized', 'en'], {})
        next = setByPath(next, ['localizedMeta', 'en'], {})
      } else {
        next = setByPath(next, config.localizedPath, {})
        next = setByPath(next, config.metaPath, {})
      }

      return next
    })
  }

  async function rebuildEnglishFromSpanish() {
    clearEnglishSectionDraft()
    await translateActiveSection('full', { persist: true })
  }

  function clearSpanishSectionDraft() {
    const config = getTranslationConfig('es')

    if (!config) {
      return
    }

    setDraft((current) => {
      let next = current

      if (config.scopeKey === 'videoLibrary') {
        next = setByPath(next, ['localized', 'es', 'videoLibrary'], {})
        next = setByPath(next, ['localizedMeta', 'es', 'videoLibrary'], {})
      } else if (config.scopeKey === 'videoCollections') {
        next = setByPath(next, ['localized', 'es', 'videoCollections'], {})
        next = setByPath(next, ['localizedMeta', 'es', 'videoCollections'], {})
      } else if (config.scopeKey === 'blogLanding' || config.scopeKey === 'encuentros' || config.scopeKey === 'global') {
        next = setByPath(next, ['localized', 'es'], {})
        next = setByPath(next, ['localizedMeta', 'es'], {})
      } else {
        next = setByPath(next, config.localizedPath, {})
        next = setByPath(next, config.metaPath, {})
      }

      return next
    })
  }

  async function rebuildSpanishFromEnglish() {
    clearSpanishSectionDraft()
    await translateActiveSection('full', { persist: true, targetLocale: 'es' })
  }

  function addListItem(path, value) {
    const targetPath = localeKey === 'en' ? ['localized', 'en', ...path] : path
    setDraft((current) => {
      const next = deepClone(current)
      const list = getByPath(next, targetPath) || []
      const nextList = Array.isArray(list) ? [...list, value] : [value]
      return setByPath(next, targetPath, nextList)
    })
  }

  function removeListItem(path, index) {
    const targetPath = localeKey === 'en' ? ['localized', 'en', ...path] : path
    setDraft((current) => {
      const next = deepClone(current)
      const list = Array.isArray(getByPath(next, targetPath)) ? [...getByPath(next, targetPath)] : []
      list.splice(index, 1)
      return setByPath(next, targetPath, list)
    })
  }

  const MAX_STANDARD_IMAGE_BYTES = 15 * 1024 * 1024
  const MAX_PREVIEW_VIDEO_BYTES = 80 * 1024 * 1024
  const MAX_FULL_VIDEO_BYTES = 200 * 1024 * 1024

  function getUploadLimitForLabel(label = '') {
    const normalizedLabel = label.toLowerCase()

    if (normalizedLabel.includes('video completo') || normalizedLabel.includes('full video')) {
      return {
        maxBytes: MAX_FULL_VIDEO_BYTES,
        humanLabel: '200 MB',
      }
    }

    if (normalizedLabel.includes('preview')) {
      return {
        maxBytes: MAX_PREVIEW_VIDEO_BYTES,
        humanLabel: '80 MB',
      }
    }

    return {
      maxBytes: MAX_STANDARD_IMAGE_BYTES,
      humanLabel: '15 MB',
    }
  }

  async function uploadFile(file, bucket, folder, label = 'Media', fieldKey = '') {
    setUploadProgress({ active: true, fieldKey, label, value: 0 })
    const useResumableUpload = label.toLowerCase().includes('video completo') || label.toLowerCase().includes('full video')

      if (file.type.startsWith('image/')) {
        const optimizedDataUrl = await optimizeImageFile(file)

        if (isSupabaseConfigured) {
          const optimizedBlob = await fetch(optimizedDataUrl).then((response) => response.blob())
          const uploadFile = new File([optimizedBlob], `${file.name}.jpg`, { type: 'image/jpeg' })
          setUploadProgress({ active: true, fieldKey, label, value: 18 })
          const uploadedAsset = await uploadManagedMedia(uploadFile, bucket, folder, (progress) =>
            setUploadProgress({ active: true, fieldKey, label, value: Math.max(18, progress) }),
          )
          setUploadProgress({ active: true, fieldKey, label, value: 100 })
          return uploadedAsset?.publicUrl || ''
        }

      setUploadProgress({ active: true, fieldKey, label, value: 100 })
        return optimizedDataUrl
      }

      if (isSupabaseConfigured) {
        const uploadedAsset = await uploadManagedMedia(
          file,
          bucket,
          folder,
          (progress) => setUploadProgress({ active: true, fieldKey, label, value: progress }),
          { resumable: useResumableUpload },
        )
        setUploadProgress({ active: true, fieldKey, label, value: 100 })
        return uploadedAsset?.publicUrl || ''
      }

      setUploadProgress({ active: true, fieldKey, label, value: 100 })
      return readFileAsDataUrl(file)
    }

  async function uploadMediaToDrive(file, { slug, group = 'videos', variant = 'preview', fieldKey = '' }) {
    const labelMap = {
      preview: t('admin.content.previewVideoLabel'),
      full: t('admin.content.fullVideoLabel'),
      public: t('admin.content.publicMediaLabel'),
    }
    const label = labelMap[variant] || t('admin.content.publicMediaLabel')
    setUploadProgress({ active: true, fieldKey, label, value: 0 })

    try {
      const uploadedAsset = await uploadManagedVideoMedia(
        file,
        slug,
        variant,
        (progress) => setUploadProgress({ active: true, fieldKey, label, value: progress }),
      )

      if (!uploadedAsset) {
        throw new Error(t('admin.content.uploadVideoError'))
      }

      const route =
        variant === 'public'
          ? buildMediaPublicUrl(group, slug)
          : variant === 'full'
            ? buildMediaFullUrl(group, slug)
            : buildMediaPreviewUrl(group, slug)

      setUploadProgress({ active: true, fieldKey, label, value: 100 })

      if (uploadedAsset?.provider === 'google-drive') {
        setUploadMessage(t('admin.content.uploadedToDrive', { label }))
        return {
          provider: 'google-drive',
          fileId: uploadedAsset.id,
          url: route,
        }
      }

      setUploadMessage(t('admin.content.uploadedFallback', { label }))
      return {
        provider: 'supabase',
        url: uploadedAsset?.publicUrl || '',
      }
    } catch (error) {
      setUploadMessage(error?.message || t('admin.content.uploadFailed', { label }))
      throw error
    } finally {
      window.setTimeout(() => {
        setUploadProgress({ active: false, fieldKey: '', label: '', value: 0 })
      }, 700)
    }
  }

  async function handleUploadToPath(file, path, bucket, folder, label, fieldKey) {
    const { humanLabel, maxBytes } = getUploadLimitForLabel(label)

    if (file.size > maxBytes) {
      setUploadProgress({ active: false, fieldKey: '', label: '', value: 0 })
      setUploadMessage(t('admin.content.uploadLimitExceeded', { label, humanLabel }))
      return
    }

    setUploadMessage(t('admin.content.uploading', { label }))

    try {
      const uploadedUrl = await uploadFile(file, bucket, folder, label, fieldKey)
      setDraftValue(path, uploadedUrl)
      setUploadMessage(t('admin.content.uploadReady', { label }))
    } catch (error) {
      setUploadMessage(error?.message || t('admin.content.uploadFailed', { label }))
    } finally {
      window.setTimeout(() => {
        setUploadProgress({ active: false, fieldKey: '', label: '', value: 0 })
      }, 700)
    }
  }

  async function handleSave(event) {
    event?.preventDefault?.()
    setIsSaving(true)

    try {
      const { heroImage: _legacyHeroImage, ...normalizedAccessTotal } = draft.accessTotal || {}
      const normalizedVideoItems = (draft.videoLibrary.items || []).map((item) => {
        const safeSlug = String(item.slug || '').trim()
        const previewSourceUrl =
          item.previewSourceUrl || (!isInternalMediaUrl(item.previewVideoUrl) ? item.previewVideoUrl : '')
        const fullSourceUrl = item.fullSourceUrl || (!isInternalMediaUrl(item.fullVideoUrl) ? item.fullVideoUrl : '')
        const previewDriveFileId = extractGoogleDriveFileId(item.previewDriveFileId || previewSourceUrl || '')
        const fullDriveFileId = extractGoogleDriveFileId(item.fullDriveFileId || fullSourceUrl || '')
        const nextTags = normalizeVideoTags(item.tags || (item.tag ? [item.tag] : []))
        const accessMode = ['public', 'registered', 'subscription', 'purchase'].includes(item.accessMode)
          ? item.accessMode
          : 'purchase'

        return {
          ...item,
          accessMode,
          tags: nextTags,
          tag: nextTags[0] || '',
          accessLabel: item.accessLabel || getVideoAccessModeLabel(accessMode),
          previewDriveFileId,
          fullDriveFileId,
          previewSourceUrl,
          fullSourceUrl,
          previewVideoUrl: previewDriveFileId && safeSlug ? buildVideoPreviewUrl(safeSlug) : previewSourceUrl,
          fullVideoUrl: fullDriveFileId && safeSlug ? buildVideoFullUrl(safeSlug) : fullSourceUrl,
        }
      })

      const encountersBooking = draft.encuentrosBooking || {}
      const bookingPriceAmount =
        parsePriceAmount(encountersBooking.priceLabel) ||
        Number.parseInt(encountersBooking.priceAmount || '500', 10) ||
        500
      const bookingAdvanceAmount =
        parsePriceAmount(encountersBooking.advanceLabel) ||
        Number.parseInt(encountersBooking.advanceAmount || '1000', 10) ||
        1000
      const normalizedEncounterBooking = {
        ...encountersBooking,
        priceAmount: bookingPriceAmount,
        priceLabel: normalizeCurrencyLabel(encountersBooking.priceLabel, bookingPriceAmount),
        advanceAmount: bookingAdvanceAmount,
        advanceLabel: normalizeCurrencyLabel(encountersBooking.advanceLabel, bookingAdvanceAmount),
        currency: 'PEN',
        presencialBenefitTitle: encountersBooking.presencialBenefitTitle || '',
        presencialBenefitText: encountersBooking.presencialBenefitText || '',
        galleryTitle: encountersBooking.galleryTitle || '',
        gallerySubtitle: encountersBooking.gallerySubtitle || '',
        galleryExclusiveTitle: encountersBooking.galleryExclusiveTitle || '',
        galleryExclusiveDescription: encountersBooking.galleryExclusiveDescription || '',
        galleryExclusiveHint: encountersBooking.galleryExclusiveHint || '',
        recordingDiscountPercent:
          Number.parseFloat(String(encountersBooking.recordingDiscountPercent || '0').replace(',', '.')) || 0,
        recordingDiscountLabel:
          encountersBooking.recordingDiscountLabel || t('admin.content.bookingRecordingDiscountLabel'),
        recordingPromptTitle:
          encountersBooking.recordingPromptTitle || t('admin.content.bookingRecordingTitle'),
        recordingPromptDescription:
          encountersBooking.recordingPromptDescription || t('admin.content.bookingRecordingDescription'),
        recordingYesLabel:
          encountersBooking.recordingYesLabel || t('admin.content.bookingRecordingYesLabel'),
        recordingNoLabel:
          encountersBooking.recordingNoLabel || t('admin.content.bookingRecordingNoLabel'),
      }

      const normalizedCollectionItems = (draft.videoCollections.items || []).map((item, index) => {
        const nextSlug = item.slug || slugifyText(item.title, `pack-${index + 1}`)
        const assets = normalizePackAssets(item.assets)
        const derivedCoverImage =
          item.coverImage ||
          assets.find((asset) => asset.mediaType === 'image' && asset.image)?.image ||
          ''

        return {
          ...item,
          slug: nextSlug,
          assets,
          coverImage: derivedCoverImage,
        }
      })

      const normalizedFreeContentItems = (draft.freeContent.items || []).map((item) => {
        const mediaDriveFileId = extractGoogleDriveFileId(item.mediaDriveFileId || item.mediaUrl || '')
        const normalizedMediaDriveFileId = item.mediaType === 'video' ? mediaDriveFileId : ''

        return {
          ...item,
          mediaDriveFileId: normalizedMediaDriveFileId,
          mediaUrl:
            item.mediaType === 'video' && normalizedMediaDriveFileId
              ? buildMediaPublicUrl('free-content', item.slug)
              : item.mediaUrl || '',
        }
      })

      await saveSiteContent({
        ...draftState,
        accessTotal: normalizedAccessTotal,
        encuentrosBooking: normalizedEncounterBooking,
        videoLibrary: {
          ...draft.videoLibrary,
          items: normalizedVideoItems,
        },
        videoCollections: {
          ...draft.videoCollections,
          items: normalizedCollectionItems,
        },
        freeContent: {
          ...draft.freeContent,
          items: normalizedFreeContentItems,
        },
      })
      setMessage(isSupabaseConfigured ? 'Cambios guardados en Supabase.' : 'Cambios guardados en este navegador.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleReset() {
    const nextContent = mergeSiteContent(defaultSiteContent)
    await saveSiteContent(nextContent)
    setDraft(nextContent)
      setMessage(t('admin.content.reset'))
  }
  async function migrateImageList(imageList, targetField) {
    const migratedSlides = []

    for (const imageItem of imageList) {
      const slide = normalizeCarouselSlide(imageItem)

      if (!slide?.src) {
        continue
      }

      if (/^https?:\/\//i.test(slide.src)) {
        migratedSlides.push(slide)
        continue
      }

      const uploadedAsset = await uploadManagedMediaFromUrl(slide.src, 'site-images', targetField)
      migratedSlides.push({
        src: uploadedAsset.publicUrl,
        caption: slide.caption || '',
      })
    }

    return migratedSlides
  }

  async function handleMigrateBundledImages() {
    setIsMigratingAssets(true)
    setUploadMessage(t('admin.content.migratingImages'))

    try {
      const migratedTop = await migrateImageList(draft.topCarouselImages, 'topCarouselImages')
      const migratedBottom = await migrateImageList(draft.bottomCarouselImages, 'bottomCarouselImages')

      const nextDraft = {
        ...draft,
        topCarouselImages: migratedTop,
        bottomCarouselImages: migratedBottom,
      }

      setDraft(nextDraft)
      await saveSiteContent(nextDraft)
      setUploadMessage(t('admin.content.migratedImages'))
    } finally {
      setIsMigratingAssets(false)
    }
  }

  const sectionButtons = [
    ['creator', 'Sindy cretor'],
    ['models', 'Modelos'],
    ['encuentros', t('admin.content.encuentros')],
    ['global', t('admin.content.global')],
  ]

  const creatorSubtabs = [
    ['creator', t('admin.content.creator')],
    ['access', t('admin.content.accessTotal')],
    ['spotlight', t('admin.content.spotlight')],
    ['videos', t('admin.content.videos')],
    ['packs', t('admin.content.packsTab')],
    ['physical', t('admin.content.physicalTitle')],
    ['free', t('admin.content.freeContent')],
    ['membership', t('admin.content.membership')],
    ['blog', t('admin.content.blog')],
  ]

  const encuentrosSubtabs = [
    ['overview', t('admin.content.encuentrosOverviewTab')],
    ['chips', t('admin.content.encuentrosChipsTab')],
    ['booking', t('admin.content.encuentrosBookingTab')],
    ['media', t('admin.content.encuentrosMediaTab')],
  ]

  const globalSubtabs = [
    ['links', t('admin.content.globalLinksTab')],
    ['footer', t('admin.content.globalFooterTab')],
    ['visibility', t('admin.content.globalVisibilityTab')],
  ]

  const activeTranslationConfig = getTranslationConfig()
  const activeTranslationState = activeTranslationConfig
    ? getTranslationState({
        source: activeTranslationConfig.source,
        translated:
          activeTranslationConfig.scopeKey === 'blogLanding' ||
          activeTranslationConfig.scopeKey === 'encuentros' ||
          activeTranslationConfig.scopeKey === 'global'
            ? pickTranslationSubset(activeTranslationConfig.source, getByPath(draftState, ['localized', 'en']) || {})
            : getByPath(draftState, activeTranslationConfig.localizedPath),
        meta: getByPath(draftState, activeTranslationConfig.metaPath),
        locale: 'en',
    })
    : 'missing'

  const activeTranslationSourceHash = activeTranslationConfig
    ? hashStableValue(activeTranslationConfig.source)
    : ''
  const needsCatalogRepair =
    localeKey === 'en' &&
    (activeTranslationConfig?.scopeKey === 'videoLibrary' ||
      activeTranslationConfig?.scopeKey === 'videoCollections') &&
    hasSeedEnglishCatalogTitles(
      activeTranslationConfig?.source?.items || [],
      getByPath(draftState, ['localized', 'en', activeTranslationConfig.scopeKey, 'items']) || [],
    )

  useEffect(() => {
    if (localeKey !== 'en') {
      return
    }

    if (!activeTranslationConfig) {
      return
    }

    if (
      activeTranslationConfig.scopeKey !== 'videoLibrary' &&
      activeTranslationConfig.scopeKey !== 'videoCollections'
    ) {
      return
    }

    if (!needsCatalogRepair) {
      return
    }

    const repairKey = `${activeTranslationConfig.scopeKey}:${activeTranslationSourceHash}:${needsCatalogRepair ? 'repair' : 'ok'}`

    if (autoRepairCatalogRef.current === repairKey) {
      return
    }

    autoRepairCatalogRef.current = repairKey
    clearEnglishSectionDraft()
    void translateActiveSection('full', { persist: true })
  }, [
    localeKey,
    activeTranslationConfig,
    activeTranslationSourceHash,
    activeTranslationState,
    needsCatalogRepair,
  ])

  return (
    <section className="admin-panel-section">
      <div className="admin-section-header">
        <div>
          <p className="admin-eyebrow">{t('admin.content.eyebrow')}</p>
          <h2>{t('admin.content.title')}</h2>
          <p className="admin-meta">{t('admin.content.description')}</p>
        </div>
        <div className="admin-actions-row">
          <button type="button" className="admin-secondary-button" onClick={handleReset}>
            Restablecer base
          </button>
          {isSupabaseConfigured ? (
            <button type="button" className="admin-secondary-button" onClick={handleMigrateBundledImages} disabled={isMigratingAssets}>
            {isMigratingAssets ? t('admin.content.migratingImages') : t('admin.content.migrateLocalImages')}
            </button>
          ) : null}
        </div>
      </div>

      <div className="admin-subtabs">
        {sectionButtons.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={activeSection === key ? 'admin-tab active' : 'admin-tab'}
            onClick={() => setActiveSection(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <form className="admin-grid" onSubmit={handleSave}>
        <div className="admin-video-savebar admin-content-savebar">
        <div>
          <p className="admin-video-savebar-kicker">{t('admin.content.quickEdit')}</p>
          <p className="admin-meta">{t('admin.content.quickEditHint')}</p>
          {activeTranslationConfig ? (
            <p className="admin-meta">
              {t('admin.content.translationState')}: {t(`admin.content.translationState${activeTranslationState[0].toUpperCase()}${activeTranslationState.slice(1)}`)}
            </p>
          ) : null}
        </div>
        <div className="admin-actions-row">
          {activeTranslationConfig ? (
            <>
              <button
                type="button"
                className="admin-secondary-button"
                onClick={() => translateActiveSection('full')}
                disabled={isTranslating}
              >
                {isTranslating ? t('admin.content.translating') : t('admin.content.translateEn')}
              </button>
              <button
                type="button"
                className="admin-secondary-button"
                onClick={() => translateActiveSection('missing')}
                disabled={isTranslating}
              >
                {isTranslating ? t('admin.content.translating') : t('admin.content.translateMissingEn')}
              </button>
              {activeTranslationConfig.scopeKey === 'videoLibrary' ||
              activeTranslationConfig.scopeKey === 'videoCollections' ? (
                <button
                  type="button"
                  className="admin-secondary-button"
                  onClick={rebuildEnglishFromSpanish}
                  disabled={isTranslating}
                >
                  {t('admin.content.rebuildEnFromEs')}
                </button>
              ) : null}
              {localeKey === 'en' ? (
                <>
                  <button
                    type="button"
                    className="admin-secondary-button"
                    onClick={() => translateActiveSection('full', { persist: true, targetLocale: 'es' })}
                    disabled={isTranslating}
                  >
                    {isTranslating ? t('admin.content.translating') : t('admin.content.translateEs')}
                  </button>
                  <button
                    type="button"
                    className="admin-secondary-button"
                    onClick={() => translateActiveSection('missing', { persist: true, targetLocale: 'es' })}
                    disabled={isTranslating}
                  >
                    {isTranslating ? t('admin.content.translating') : t('admin.content.translateMissingEs')}
                  </button>
                  {activeTranslationConfig.scopeKey === 'videoLibrary' ||
                  activeTranslationConfig.scopeKey === 'videoCollections' ? (
                    <button
                      type="button"
                      className="admin-secondary-button"
                      onClick={rebuildSpanishFromEnglish}
                      disabled={isTranslating}
                    >
                      {t('admin.content.rebuildEsFromEn')}
                    </button>
                  ) : null}
                </>
              ) : null}
            </>
          ) : null}
          <button className="admin-primary-button" type="submit" disabled={isSaving}>
            {isSaving ? t('admin.content.saving') : t('admin.content.saveChanges')}
          </button>
        </div>
      </div>
      {translationMessage ? <p className="admin-success">{translationMessage}</p> : null}

      {activeSection === 'creator' ? (
        <div className="admin-blog-subtabs admin-creator-subtabs">
          {creatorSubtabs.map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={activeCreatorSection === key ? 'admin-tab active' : 'admin-tab'}
              onClick={() => setActiveCreatorSection(key)}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

        {activeSection === 'creator' && activeCreatorSection === 'creator' ? (
          <SectionPanel title={t('admin.content.heroTitle')} description={t('admin.content.heroDescription')}>
            <div className="admin-creator-layout">
              <div className="admin-creator-main">
                <Field label={t('admin.content.kicker')} value={draft.creatorHome.kicker} onChange={(value) => setDraftValue(['creatorHome', 'kicker'], value)} />
                <Field label={t('admin.content.titleField')} value={draft.creatorHome.title} onChange={(value) => setDraftValue(['creatorHome', 'title'], value)} />
                <TextareaField label={t('admin.content.descriptionField')} rows={5} value={draft.creatorHome.description} onChange={(value) => setDraftValue(['creatorHome', 'description'], value)} />
                <ArrayTextareaField label={t('admin.content.badges')} rows={5} values={draft.creatorHome.badges} onChange={(value) => setDraftValue(['creatorHome', 'badges'], value)} />
              </div>
              <div className="admin-creator-side">
                <Field label={t('admin.content.primaryCta')} value={draft.creatorHome.primaryCtaLabel} onChange={(value) => setDraftValue(['creatorHome', 'primaryCtaLabel'], value)} />
                <Field label={t('admin.content.primaryCtaUrl')} value={draft.creatorHome.primaryCtaUrl} onChange={(value) => setDraftValue(['creatorHome', 'primaryCtaUrl'], value)} />
                <Field label={t('admin.content.secondaryCta')} value={draft.creatorHome.secondaryCtaLabel} onChange={(value) => setDraftValue(['creatorHome', 'secondaryCtaLabel'], value)} />
                <div className="admin-repeater">
                  <div className="admin-section-header">
                    <div>
                      <h3>{t('admin.content.statsTitle')}</h3>
                      <p className="admin-meta">{t('admin.content.statsDescription')}</p>
                    </div>
                    <button type="button" className="admin-secondary-button" onClick={() => addListItem(['creatorHome', 'stats'], { value: '0', label: t('admin.content.newStat') })}>
                      {t('admin.content.addStat')}
                    </button>
                  </div>
                  {draft.creatorHome.stats.map((stat, index) => (
                    <div className="admin-array-card" key={`stat-${index}`}>
                      <Field label={t('admin.content.value')} value={stat.value} onChange={(value) => setDraftValue(['creatorHome', 'stats', index, 'value'], value)} />
                      <Field label={t('admin.content.label')} value={stat.label} onChange={(value) => setDraftValue(['creatorHome', 'stats', index, 'label'], value)} />
                      <button type="button" className="admin-danger-button" onClick={() => removeListItem(['creatorHome', 'stats'], index)}>
                        {t('admin.content.remove')}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SectionPanel>
        ) : null}

        {activeSection === 'creator' && activeCreatorSection === 'access' ? (
          <SectionPanel title={t('admin.content.accessTitle')} description={t('admin.content.accessDescription')}>
            <div className="admin-access-layout">
              <div className="admin-access-main">
                <Field label={t('admin.content.eyebrow')} value={draft.accessTotal.eyebrow} onChange={(value) => setDraftValue(['accessTotal', 'eyebrow'], value)} />
                <Field label={t('admin.content.tableTitle')} value={draft.accessTotal.title} onChange={(value) => setDraftValue(['accessTotal', 'title'], value)} />
                <Field label={t('admin.content.ctaLabel')} value={draft.accessTotal.ctaLabel} onChange={(value) => setDraftValue(['accessTotal', 'ctaLabel'], value)} />
                <Field label={t('admin.content.ctaUrl')} value={draft.accessTotal.ctaUrl} onChange={(value) => setDraftValue(['accessTotal', 'ctaUrl'], value)} />
                <div className="admin-repeater">
                  <div className="admin-section-header">
                    <div>
                      <h3>{t('admin.content.rowsTitle')}</h3>
                      <p className="admin-meta">{t('admin.content.rowsDescription')}</p>
                    </div>
                    <button
                      type="button"
                      className="admin-secondary-button"
                      onClick={() =>
                        addListItem(['accessTotal', 'rows'], {
                          label: t('admin.content.newRow'),
                          value: t('admin.content.included'),
                        })
                      }
                    >
                      {t('admin.content.addRow')}
                    </button>
                  </div>
                  {draft.accessTotal.rows.map((row, index) => (
                    <div className="admin-array-card" key={`subscription-row-${index}`}>
                      <div className="admin-video-meta-grid">
                        <Field label={t('admin.content.concept')} value={row.label} onChange={(value) => setDraftValue(['accessTotal', 'rows', index, 'label'], value)} />
                        <Field label={t('admin.content.value')} value={row.value} onChange={(value) => setDraftValue(['accessTotal', 'rows', index, 'value'], value)} />
                      </div>
                      <button
                        type="button"
                        className="admin-danger-button"
                        onClick={() => removeListItem(['accessTotal', 'rows'], index)}
                      >
                        {t('admin.content.remove')}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="admin-access-side">
                <div className="admin-repeater">
                  <div className="admin-section-header">
                    <div>
                      <h3>{t('admin.content.dynamicTiersTitle')}</h3>
                      <p className="admin-meta">{t('admin.content.dynamicTiersDescription')}</p>
                    </div>
                    <button
                      type="button"
                      className="admin-secondary-button"
                      onClick={() =>
                        addListItem(['accessTotal', 'tiers'], {
                          slug: `tier-${Date.now()}`,
                          label: t('admin.content.newTier'),
                          period: t('admin.content.oneMonth'),
                          durationValue: '1',
                          durationUnit: 'months',
                          price: '$0',
                          discountPercent: '0',
                          discountLabel: t('admin.content.activeOffer'),
                          promoNote: '',
                          grants: ['video'],
                        })
                      }
                    >
                      {t('admin.content.addTier')}
                    </button>
                  </div>
                  {draft.accessTotal.tiers.map((tier, index) => (
                    <div className="admin-array-card" key={`subscription-tier-${index}`}>
                      <div className="admin-video-meta-grid">
                        <Field label={t('admin.content.slug')} value={tier.slug} onChange={(value) => setDraftValue(['accessTotal', 'tiers', index, 'slug'], value)} />
                        <Field label={t('admin.content.visibleLabel')} value={tier.label} onChange={(value) => setDraftValue(['accessTotal', 'tiers', index, 'label'], value)} />
                        <Field label={t('admin.content.visiblePeriod')} value={tier.period} onChange={(value) => setDraftValue(['accessTotal', 'tiers', index, 'period'], value)} />
                        <Field label={t('admin.content.duration')} value={tier.durationValue || tier.durationMonths} onChange={(value) => setDraftValue(['accessTotal', 'tiers', index, 'durationValue'], value)} />
                      </div>
                      <div className="admin-video-meta-grid">
                        <label className="admin-field">
                          <span>{t('admin.content.unit')}</span>
                          <select value={tier.durationUnit || 'months'} onChange={(event) => setDraftValue(['accessTotal', 'tiers', index, 'durationUnit'], event.target.value)}>
                            <option value="days">{t('admin.content.days')}</option>
                            <option value="months">{t('admin.content.months')}</option>
                          </select>
                        </label>
                        <Field label={t('admin.content.basePrice')} value={tier.price} onChange={(value) => setDraftValue(['accessTotal', 'tiers', index, 'price'], value)} />
                        <Field label={t('admin.content.discountPercent')} value={tier.discountPercent} onChange={(value) => setDraftValue(['accessTotal', 'tiers', index, 'discountPercent'], value)} />
                        <Field label={t('admin.content.discountLabel')} value={tier.discountLabel} onChange={(value) => setDraftValue(['accessTotal', 'tiers', index, 'discountLabel'], value)} />
                      </div>
                      <TextareaField label={t('admin.content.promoNote')} rows={3} value={tier.promoNote} onChange={(value) => setDraftValue(['accessTotal', 'tiers', index, 'promoNote'], value)} />
                      <ArrayTextareaField label={t('admin.content.grants')} rows={3} values={tier.grants || []} onChange={(value) => setDraftValue(['accessTotal', 'tiers', index, 'grants'], value)} />
                      <button
                        type="button"
                        className="admin-danger-button"
                        onClick={() => removeListItem(['accessTotal', 'tiers'], index)}
                      >
                        {t('admin.content.removeTier')}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SectionPanel>
        ) : null}

        {activeSection === 'creator' && activeCreatorSection === 'spotlight' ? (
          <SectionPanel title={t('admin.content.spotlightTitle')} description={t('admin.content.spotlightDescription')}>
            <Field label={t('admin.content.title')} value={draft.mediaSpotlight.title} onChange={(value) => setDraftValue(['mediaSpotlight', 'title'], value)} />
            <TextareaField label={t('admin.content.description')} rows={4} value={draft.mediaSpotlight.description} onChange={(value) => setDraftValue(['mediaSpotlight', 'description'], value)} />
            <Field label={t('admin.content.featuredLabel')} value={draft.mediaSpotlight.featuredLabel} onChange={(value) => setDraftValue(['mediaSpotlight', 'featuredLabel'], value)} />
            <Field label={t('admin.content.featuredTitle')} value={draft.mediaSpotlight.featuredTitle} onChange={(value) => setDraftValue(['mediaSpotlight', 'featuredTitle'], value)} />
            <TextareaField label={t('admin.content.featuredDescription')} rows={4} value={draft.mediaSpotlight.featuredDescription} onChange={(value) => setDraftValue(['mediaSpotlight', 'featuredDescription'], value)} />
            <MediaField fieldKey="mediaSpotlight.featuredImage" label={t('admin.content.featuredImage')} note={t('admin.content.spotlightImageNote')} accept="image/*" bucket="site-images" folder="spotlight" progress={uploadProgress} value={draft.mediaSpotlight.featuredImage} onClear={() => setDraftValue(['mediaSpotlight', 'featuredImage'], '')} onUpload={(file, bucket, folder, mediaLabel) => handleUploadToPath(file, ['mediaSpotlight', 'featuredImage'], bucket, folder, mediaLabel, 'mediaSpotlight.featuredImage')} />
            <div className="admin-repeater">
              <div className="admin-section-header">
                <div><h3>{t('admin.content.miniGallery')}</h3><p className="admin-meta">{t('admin.content.spotlightCardsDescription')}</p></div>
                <button type="button" className="admin-secondary-button" onClick={() => addListItem(['mediaSpotlight', 'gallery'], { image: '', title: t('admin.content.newCard'), description: t('admin.content.description') })}>{t('admin.content.addCard')}</button>
              </div>
              {draft.mediaSpotlight.gallery.map((item, index) => (
                <div className="admin-array-card" key={`gallery-${index}`}>
                  <Field label={t('admin.content.title')} value={item.title} onChange={(value) => setDraftValue(['mediaSpotlight', 'gallery', index, 'title'], value)} />
                  <TextareaField label={t('admin.content.description')} rows={3} value={item.description} onChange={(value) => setDraftValue(['mediaSpotlight', 'gallery', index, 'description'], value)} />
                  <Field label={t('admin.content.imageUrl')} value={item.image} onChange={(value) => setDraftValue(['mediaSpotlight', 'gallery', index, 'image'], value)} />
                  <MediaField fieldKey={`mediaSpotlight.gallery.${index}.image`} label={t('admin.content.uploadImage')} accept="image/*" bucket="site-images" folder="spotlight-gallery" progress={uploadProgress} value={item.image} onClear={() => setDraftValue(['mediaSpotlight', 'gallery', index, 'image'], '')} onUpload={(file, bucket, folder, mediaLabel) => handleUploadToPath(file, ['mediaSpotlight', 'gallery', index, 'image'], bucket, folder, mediaLabel, `mediaSpotlight.gallery.${index}.image`)} />
                  <button type="button" className="admin-danger-button" onClick={() => removeListItem(['mediaSpotlight', 'gallery'], index)}>{t('admin.content.remove')}</button>
                </div>
              ))}
            </div>
          </SectionPanel>
        ) : null}
        {activeSection === 'creator' && activeCreatorSection === 'videos' ? (
          <SectionPanel title={t('admin.content.videosTitle')} description={t('admin.content.videosDescription')}>
            <Field label={t('admin.content.sectionTitle')} value={draft.videoLibrary.title} onChange={(value) => setDraftValue(['videoLibrary', 'title'], value)} />
            <TextareaField
              label={t('admin.content.sectionDescription')}
              rows={4}
              value={draft.videoLibrary.description}
              onChange={(value) => setDraftValue(['videoLibrary', 'description'], value)}
            />
            <div className="admin-video-toolbar">
              <Field label={t('admin.content.viewMoreCta')} value={draft.videoLibrary.browseLabel} onChange={(value) => setDraftValue(['videoLibrary', 'browseLabel'], value)} />
              <Field label={t('admin.content.viewMoreHref')} value={draft.videoLibrary.browseHref} onChange={(value) => setDraftValue(['videoLibrary', 'browseHref'], value)} />
            </div>
            <div className="admin-video-savebar">
              <div>
                <p className="admin-video-savebar-kicker">{t('admin.content.quickEdit')}</p>
                <p className="admin-meta">{t('admin.content.quickEditHint')}</p>
              </div>
              <div className="admin-actions-row">
                <button
                  type="button"
                  className="admin-secondary-button"
                  onClick={() =>
                    addListItem(['videoLibrary', 'items'], {
                      uiId: generateStableItemId('video'),
                      slug: `video-${Date.now()}`,
                      title: t('admin.content.newVideo'),
                      description: t('admin.content.description'),
                      tags: blogTaxonomyTags[0] ? [blogTaxonomyTags[0]] : [],
                      tag: blogTaxonomyTags[0] || '',
                      duration: '00:00',
                      priceLabel: '$0',
                      accessMode: 'purchase',
                      accessLabel: getVideoAccessModeLabel('purchase'),
                      previewLabel: t('admin.content.previewLabel'),
                      posterImage: '',
                      previewSourceUrl: '',
                      fullSourceUrl: '',
                      previewDriveFileId: '',
                      fullDriveFileId: '',
                      previewVideoUrl: '',
                      fullVideoUrl: '',
                      purchaseUrl: '',
                    })
                  }
                >
                  {t('admin.content.addVideo')}
                </button>
                <button type="button" className="admin-primary-button" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? t('admin.content.saving') : t('admin.content.saveVideos')}
                </button>
              </div>
            </div>
            <div className="admin-workspace">
              <aside className="admin-workspace-sidebar">
                <div className="admin-section-header">
                  <div>
                    <h3>{t('admin.content.videoCatalog')}</h3>
                    <p className="admin-meta">{t('admin.content.videoCatalogDescription')}</p>
                  </div>
                </div>
                <p className="admin-meta admin-upload-count">
                  {t('admin.content.videosCount', { count: draft.videoLibrary.items.length })}
                </p>
                <div className="admin-workspace-list">
                  {draft.videoLibrary.items.map((item, index) => {
                    const isSelected = index === selectedVideoIndex
                    const title = item.title || item.slug || t('admin.content.untitledVideo')
                    const meta = [
                      item.slug || t('admin.content.noSlug'),
                      item.duration || '00:00',
                      item.accessLabel || getVideoAccessModeLabel(item.accessMode || 'purchase'),
                    ].join(' · ')

                    return (
                      <button
                        key={item.uiId || `video-${index}`}
                        type="button"
                        className={isSelected ? 'admin-workspace-item active' : 'admin-workspace-item'}
                        onClick={() => setSelectedVideoIndex(index)}
                      >
                        <strong>{title}</strong>
                        <span>{meta}</span>
                      </button>
                    )
                  })}
                </div>
              </aside>

              <div className="admin-workspace-detail">
                <div className="admin-workspace-detail-top">
                  <div>
                    <p className="admin-video-savebar-kicker">{t('admin.content.quickEdit')}</p>
                    <p className="admin-meta">{t('admin.content.quickEditHint')}</p>
                  </div>
                </div>

                {draft.videoLibrary.items[selectedVideoIndex] ? (
                  <VideoLibraryItemEditor
                    key={draft.videoLibrary.items[selectedVideoIndex].uiId || `video-${selectedVideoIndex}`}
                    item={draft.videoLibrary.items[selectedVideoIndex]}
                    index={selectedVideoIndex}
                    blogTags={blogTaxonomyTags}
                    setDraft={setDraft}
                    setDraftValue={setDraftValue}
                    uploadFileToPath={handleUploadToPath}
                    uploadProgress={uploadProgress}
                    onRemove={() => removeListItem(['videoLibrary', 'items'], selectedVideoIndex)}
                  />
                ) : (
                  <div className="admin-hint">
                    <p>{t('admin.content.noVisibleArticles')}</p>
                  </div>
                )}
              </div>
            </div>
          </SectionPanel>
        ) : null}

        {activeSection === 'creator' && activeCreatorSection === 'packs' ? (
          <>
            <SectionPanel title={t('admin.content.collectionsTitle')} description={t('admin.content.collectionsDescription')}>
              <Field label={t('admin.content.sectionTitle')} value={draft.videoCollections.title} onChange={(value) => setDraftValue(['videoCollections', 'title'], value)} />
              <TextareaField label={t('admin.content.sectionDescription')} rows={4} value={draft.videoCollections.description} onChange={(value) => setDraftValue(['videoCollections', 'description'], value)} />
              <Field label={t('admin.content.viewMoreCta')} value={draft.videoCollections.browseLabel} onChange={(value) => setDraftValue(['videoCollections', 'browseLabel'], value)} />
              <Field label={t('admin.content.viewMoreHref')} value={draft.videoCollections.browseHref} onChange={(value) => setDraftValue(['videoCollections', 'browseHref'], value)} />
            </SectionPanel>

            <PackToolbar
              title={t('admin.content.packsCatalog')}
              description={t('admin.content.packsCatalogDescription')}
              addLabel={t('admin.content.addPack')}
              onAdd={() =>
                addListItem(['videoCollections', 'items'], {
                  uiId: generateStableItemId('pack'),
                  slug: slugifyText(t('admin.content.newPack'), `pack-${Date.now()}`),
                  title: t('admin.content.newPack'),
                  description: t('admin.content.packDescriptionPlaceholder'),
                  itemCount: t('admin.content.zeroVideos'),
                  priceLabel: '$0',
                  accessLabel: t('admin.content.accessText'),
                  highlights: [t('admin.content.newHighlight')],
                  coverImage: '',
                  assets: [],
                })
              }
              saveLabel={t('admin.content.saveChanges')}
              savingLabel={t('admin.content.saving')}
              onSave={handleSave}
              isSaving={isSaving}
            />

            <div className="admin-workspace">
              <aside className="admin-workspace-sidebar">
                <div className="admin-section-header">
                  <div>
                    <h3>{t('admin.content.packsCatalog')}</h3>
                    <p className="admin-meta">{t('admin.content.packsCatalogDescription')}</p>
                  </div>
                </div>
                <div className="admin-workspace-list">
                  {draft.videoCollections.items.map((item, index) => {
                    const isSelected = index === selectedPackIndex
                    const title = item.title || item.slug || t('admin.content.newPack')
                    const meta = [
                      item.itemCount || t('admin.content.zeroVideos'),
                      item.priceLabel || '$0',
                      item.accessLabel || t('admin.content.accessText'),
                    ].join(' · ')

                    return (
                      <button
                        key={item.uiId || `pack-${index}`}
                        type="button"
                        className={isSelected ? 'admin-workspace-item active' : 'admin-workspace-item'}
                        onClick={() => setSelectedPackIndex(index)}
                      >
                        <strong>{title}</strong>
                        <span>{meta}</span>
                      </button>
                    )
                  })}
                </div>
              </aside>

              <div className="admin-workspace-detail">
                {draft.videoCollections.items[selectedPackIndex] ? (
                  <div className="admin-array-card admin-pack-card">
                    <div className="admin-video-item-header">
                      <div>
                        <p className="admin-video-item-kicker">
                          {t('admin.content.packItem', { index: String(selectedPackIndex + 1).padStart(2, '0') })}
                        </p>
                        <h4>
                          {draft.videoCollections.items[selectedPackIndex].title ||
                            draft.videoCollections.items[selectedPackIndex].slug ||
                            t('admin.content.newPack')}
                        </h4>
                        <p className="admin-meta">
                          {draft.videoCollections.items[selectedPackIndex].itemCount || t('admin.content.zeroVideos')} ·{' '}
                          {draft.videoCollections.items[selectedPackIndex].priceLabel || '$0'}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="admin-danger-button"
                        onClick={() => removeListItem(['videoCollections', 'items'], selectedPackIndex)}
                      >
                        {t('admin.content.remove')}
                      </button>
                    </div>

                    <div className="admin-pack-item-layout">
                      <div className="admin-pack-item-section">
                        <Field
                          label={t('admin.content.title')}
                          value={draft.videoCollections.items[selectedPackIndex].title}
                          onChange={(value) =>
                            setDraftValue(['videoCollections', 'items', selectedPackIndex, 'title'], value)
                          }
                        />
                        <TextareaField
                          label={t('admin.content.description')}
                          rows={3}
                          value={draft.videoCollections.items[selectedPackIndex].description}
                          onChange={(value) =>
                            setDraftValue(['videoCollections', 'items', selectedPackIndex, 'description'], value)
                          }
                        />
                        <div className="admin-video-meta-grid">
                          <Field
                            label={t('admin.content.quantity')}
                            value={draft.videoCollections.items[selectedPackIndex].itemCount}
                            onChange={(value) =>
                              setDraftValue(['videoCollections', 'items', selectedPackIndex, 'itemCount'], value)
                            }
                          />
                          <Field
                            label={t('admin.content.price')}
                            value={draft.videoCollections.items[selectedPackIndex].priceLabel}
                            onChange={(value) =>
                              setDraftValue(['videoCollections', 'items', selectedPackIndex, 'priceLabel'], value)
                            }
                          />
                          <Field
                            label={t('admin.content.accessText')}
                            value={draft.videoCollections.items[selectedPackIndex].accessLabel}
                            onChange={(value) =>
                              setDraftValue(['videoCollections', 'items', selectedPackIndex, 'accessLabel'], value)
                            }
                          />
                        </div>
                        <ArrayTextareaField
                          label={t('admin.content.highlights')}
                          rows={4}
                          values={draft.videoCollections.items[selectedPackIndex].highlights}
                          onChange={(value) =>
                            setDraftValue(['videoCollections', 'items', selectedPackIndex, 'highlights'], value)
                          }
                        />
                      </div>

                      <div className="admin-pack-item-section">
                        <MediaField
                          fieldKey={`videoCollections.items.${selectedPackIndex}.coverImage`}
                          label={t('admin.content.coverImage')}
                          accept="image/*"
                          bucket="site-images"
                          folder="video-collections"
                          progress={uploadProgress}
                          value={draft.videoCollections.items[selectedPackIndex].coverImage}
                          onClear={() => setDraftValue(['videoCollections', 'items', selectedPackIndex, 'coverImage'], '')}
                          onUpload={(file, bucket, folder, mediaLabel) =>
                            handleUploadToPath(
                              file,
                              ['videoCollections', 'items', selectedPackIndex, 'coverImage'],
                              bucket,
                              folder,
                              mediaLabel,
                              `videoCollections.items.${selectedPackIndex}.coverImage`,
                            )
                          }
                        />

                        <div className="admin-repeater admin-pack-assets-repeater">
                          <div className="admin-section-header">
                            <div>
                              <h4>{t('admin.content.packAssetsTitle')}</h4>
                              <p className="admin-meta">{t('admin.content.packAssetsDescription')}</p>
                            </div>
                            <div className="admin-actions-row">
                              <button
                                type="button"
                                className="admin-secondary-button"
                                onClick={() =>
                                  addListItem(['videoCollections', 'items', selectedPackIndex, 'assets'], {
                                    id: generateStableItemId('pack-asset'),
                                    title: t('admin.content.newAsset'),
                                    mediaType: 'image',
                                    image: '',
                                    mediaDriveFileId: '',
                                    mediaUrl: '',
                                  })
                                }
                              >
                                {`${t('admin.content.addAsset')} ${t('admin.content.image').toLowerCase()}`}
                              </button>
                              <button
                                type="button"
                                className="admin-secondary-button"
                                onClick={() =>
                                  addListItem(['videoCollections', 'items', selectedPackIndex, 'assets'], {
                                    id: generateStableItemId('pack-asset'),
                                    title: t('admin.content.newAsset'),
                                    mediaType: 'video',
                                    image: '',
                                    mediaDriveFileId: '',
                                    mediaUrl: '',
                                  })
                                }
                              >
                                {`${t('admin.content.addAsset')} ${t('admin.content.video').toLowerCase()}`}
                              </button>
                            </div>
                          </div>
                          {(draft.videoCollections.items[selectedPackIndex].assets || []).map((asset, assetIndex) => (
                            <PackAssetEditor
                              key={asset.id || `${draft.videoCollections.items[selectedPackIndex].uiId || `pack-${selectedPackIndex}`}-asset-${assetIndex}`}
                              asset={asset}
                              index={assetIndex}
                              itemIndex={selectedPackIndex}
                              setDraftValue={setDraftValue}
                              uploadFileToPath={handleUploadToPath}
                              uploadProgress={uploadProgress}
                              onRemove={() =>
                                removeListItem(['videoCollections', 'items', selectedPackIndex, 'assets'], assetIndex)
                              }
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="admin-hint">
                    <p>{t('admin.content.noVisibleArticles')}</p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}

        {activeSection === 'creator' && activeCreatorSection === 'physical' ? (
          <>
            <SectionPanel title={t('admin.content.physicalTitle')} description={t('admin.content.physicalDescription')}>
              <Field label={t('admin.content.kicker')} value={draft.physicalMerch.kicker} onChange={(value) => setDraftValue(['physicalMerch', 'kicker'], value)} />
              <Field label={t('admin.content.title')} value={draft.physicalMerch.title} onChange={(value) => setDraftValue(['physicalMerch', 'title'], value)} />
              <TextareaField label={t('admin.content.description')} rows={4} value={draft.physicalMerch.description} onChange={(value) => setDraftValue(['physicalMerch', 'description'], value)} />
              <Field label={t('admin.content.primaryCta')} value={draft.physicalMerch.primaryLabel} onChange={(value) => setDraftValue(['physicalMerch', 'primaryLabel'], value)} />
              <Field label={t('admin.content.primaryCtaUrl')} value={draft.physicalMerch.primaryUrl} onChange={(value) => setDraftValue(['physicalMerch', 'primaryUrl'], value)} />
              <Field label={t('admin.content.note')} value={draft.physicalMerch.note} onChange={(value) => setDraftValue(['physicalMerch', 'note'], value)} />
            </SectionPanel>

            <PackToolbar
              title={t('admin.content.physicalItems')}
              description={t('admin.content.physicalItemsDescription')}
              addLabel={t('admin.content.addItem')}
              onAdd={addPhysicalItem}
              saveLabel={t('admin.content.saveChanges')}
              savingLabel={t('admin.content.saving')}
              onSave={handleSave}
              isSaving={isSaving}
            />

            <div className="admin-workspace">
              <aside className="admin-workspace-sidebar">
                <div className="admin-section-header">
                  <div>
                    <h3>{t('admin.content.physicalItems')}</h3>
                    <p className="admin-meta">{t('admin.content.physicalItemsDescription')}</p>
                  </div>
                </div>
                <div className="admin-workspace-list">
                  {draft.physicalMerch.items.map((item, index) => {
                    const isSelected = index === selectedPhysicalIndex
                    const title = item.title || t('admin.content.newItem')
                    const meta = [item.priceLabel || '$0', item.stockLabel || t('admin.content.stockUnit')].join(' · ')

                    return (
                      <button
                        key={`physical-item-${index}`}
                        type="button"
                        className={isSelected ? 'admin-workspace-item active' : 'admin-workspace-item'}
                        onClick={() => setSelectedPhysicalIndex(index)}
                      >
                        <strong>{title}</strong>
                        <span>{meta}</span>
                      </button>
                    )
                  })}
                </div>
              </aside>

              <div className="admin-workspace-detail">
                {draft.physicalMerch.items[selectedPhysicalIndex] ? (
                  <div className="admin-array-card admin-physical-card">
                    <div className="admin-video-item-header">
                      <div>
                        <p className="admin-video-item-kicker">
                          {t('admin.content.physicalItem', { index: String(selectedPhysicalIndex + 1).padStart(2, '0') })}
                        </p>
                        <h4>{draft.physicalMerch.items[selectedPhysicalIndex].title || t('admin.content.newItem')}</h4>
                        <p className="admin-meta">
                          {draft.physicalMerch.items[selectedPhysicalIndex].priceLabel || '$0'} ·{' '}
                          {draft.physicalMerch.items[selectedPhysicalIndex].stockLabel || t('admin.content.stockUnit')}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="admin-danger-button"
                        onClick={() => removeListItem(['physicalMerch', 'items'], selectedPhysicalIndex)}
                      >
                        {t('admin.content.remove')}
                      </button>
                    </div>

                    <div className="admin-physical-item-layout">
                      <div className="admin-physical-item-section">
                        <Field
                          label={t('admin.content.slug')}
                          value={draft.physicalMerch.items[selectedPhysicalIndex].slug}
                          onChange={(value) => setDraftValue(['physicalMerch', 'items', selectedPhysicalIndex, 'slug'], value)}
                        />
                        <Field
                          label={t('admin.content.title')}
                          value={draft.physicalMerch.items[selectedPhysicalIndex].title}
                          onChange={(value) => setDraftValue(['physicalMerch', 'items', selectedPhysicalIndex, 'title'], value)}
                        />
                        <Field
                          label={t('admin.content.subtitle')}
                          value={draft.physicalMerch.items[selectedPhysicalIndex].subtitle}
                          onChange={(value) => setDraftValue(['physicalMerch', 'items', selectedPhysicalIndex, 'subtitle'], value)}
                        />
                        <div className="admin-video-meta-grid">
                          <Field
                            label={t('admin.content.price')}
                            value={draft.physicalMerch.items[selectedPhysicalIndex].priceLabel}
                            onChange={(value) => setDraftValue(['physicalMerch', 'items', selectedPhysicalIndex, 'priceLabel'], value)}
                          />
                          <Field
                            label={t('admin.content.stock')}
                            value={draft.physicalMerch.items[selectedPhysicalIndex].stockLabel}
                            onChange={(value) => setDraftValue(['physicalMerch', 'items', selectedPhysicalIndex, 'stockLabel'], value)}
                          />
                        </div>
                        <Field
                          label={t('admin.content.purchaseUrl')}
                          value={draft.physicalMerch.items[selectedPhysicalIndex].purchaseUrl}
                          onChange={(value) => setDraftValue(['physicalMerch', 'items', selectedPhysicalIndex, 'purchaseUrl'], value)}
                        />
                      </div>

                      <div className="admin-physical-item-section">
                        <Field
                          label={t('admin.content.imageUrl')}
                          value={draft.physicalMerch.items[selectedPhysicalIndex].image}
                          onChange={(value) => setDraftValue(['physicalMerch', 'items', selectedPhysicalIndex, 'image'], value)}
                        />
                        <MediaField
                          fieldKey={`physicalMerch.items.${selectedPhysicalIndex}.image`}
                          label={t('admin.content.uploadImage')}
                          accept="image/*"
                          bucket="site-images"
                          folder="physical-merch"
                          progress={uploadProgress}
                          value={draft.physicalMerch.items[selectedPhysicalIndex].image}
                          onClear={() => setDraftValue(['physicalMerch', 'items', selectedPhysicalIndex, 'image'], '')}
                          onUpload={(file, bucket, folder, mediaLabel) =>
                            handleUploadToPath(
                              file,
                              ['physicalMerch', 'items', selectedPhysicalIndex, 'image'],
                              bucket,
                              folder,
                              mediaLabel,
                              `physicalMerch.items.${selectedPhysicalIndex}.image`,
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="admin-hint">
                    <p>{t('admin.content.noVisibleArticles')}</p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}

        {activeSection === 'creator' && activeCreatorSection === 'membership' ? (
          <SectionPanel title={t('admin.content.membershipTitle')} description={t('admin.content.membershipDescription')}>
            <Field label={t('admin.content.title')} value={draft.membership.title} onChange={(value) => setDraftValue(['membership', 'title'], value)} />
            <TextareaField label={t('admin.content.description')} rows={4} value={draft.membership.description} onChange={(value) => setDraftValue(['membership', 'description'], value)} />
            <Field label={t('admin.content.planLabel')} value={draft.membership.planLabel} onChange={(value) => setDraftValue(['membership', 'planLabel'], value)} />
            <Field label={t('admin.content.planTitle')} value={draft.membership.planTitle} onChange={(value) => setDraftValue(['membership', 'planTitle'], value)} />
            <TextareaField label={t('admin.content.planDescription')} rows={4} value={draft.membership.planDescription} onChange={(value) => setDraftValue(['membership', 'planDescription'], value)} />
            <ArrayTextareaField label={t('admin.content.planItems')} rows={5} values={draft.membership.planItems} onChange={(value) => setDraftValue(['membership', 'planItems'], value)} />
            <Field label={t('admin.content.planUrl')} value={draft.membership.planUrl} onChange={(value) => setDraftValue(['membership', 'planUrl'], value)} />
            <Field label={t('admin.content.planCta')} value={draft.membership.planCta} onChange={(value) => setDraftValue(['membership', 'planCta'], value)} />
            <div className="admin-repeater">
              <div className="admin-section-header">
                <div><h3>{t('admin.content.sideCards')}</h3></div>
                <button type="button" className="admin-secondary-button" onClick={() => addListItem(['membership', 'sideCards'], { label: t('admin.content.newBlock'), title: t('admin.content.newTitle'), description: t('admin.content.description') })}>{t('admin.content.addCard')}</button>
              </div>
              {draft.membership.sideCards.map((card, index) => (
                <div className="admin-array-card" key={`membership-card-${index}`}>
                  <Field label={t('admin.content.label')} value={card.label} onChange={(value) => setDraftValue(['membership', 'sideCards', index, 'label'], value)} />
                  <Field label={t('admin.content.title')} value={card.title} onChange={(value) => setDraftValue(['membership', 'sideCards', index, 'title'], value)} />
                  <TextareaField label={t('admin.content.description')} rows={3} value={card.description} onChange={(value) => setDraftValue(['membership', 'sideCards', index, 'description'], value)} />
                  <button type="button" className="admin-danger-button" onClick={() => removeListItem(['membership', 'sideCards'], index)}>{t('admin.content.remove')}</button>
                </div>
              ))}
            </div>
          </SectionPanel>
        ) : null}
        {activeSection === 'creator' && activeCreatorSection === 'free' ? (
          <SectionPanel title={t('admin.content.freeTitle')} description={t('admin.content.freeDescription')}>
            <Field label={t('admin.content.kicker')} value={draft.freeContent.kicker} onChange={(value) => setDraftValue(['freeContent', 'kicker'], value)} />
            <Field label={t('admin.content.title')} value={draft.freeContent.title} onChange={(value) => setDraftValue(['freeContent', 'title'], value)} />
            <TextareaField label={t('admin.content.description')} rows={4} value={draft.freeContent.description} onChange={(value) => setDraftValue(['freeContent', 'description'], value)} />
            <TextareaField label={t('admin.content.accessNote')} rows={3} value={draft.freeContent.accessNote} onChange={(value) => setDraftValue(['freeContent', 'accessNote'], value)} />
            <div className="admin-repeater">
              <div className="admin-section-header">
                <div>
                  <h3>{t('admin.content.freeItems')}</h3>
                  <p className="admin-meta">{t('admin.content.freeItemsDescription')}</p>
                </div>
                <button
                  type="button"
                  className="admin-secondary-button"
                  onClick={() =>
                    addListItem(['freeContent', 'items'], {
                      slug: `free-media-${Date.now()}`,
                      title: t('admin.content.mediaAssetPlaceholder'),
                      description: t('admin.content.freeItemDescriptionPlaceholder'),
                      category: t('admin.content.image'),
                      mediaType: 'image',
                      image: '',
                      thumbnail: '',
                      mediaDriveFileId: '',
                      mediaUrl: '',
                      isPublished: true,
                    })
                  }
                >
                  {t('admin.content.addItem')}
                </button>
              </div>
              {draft.freeContent.items.map((item, index) => (
                <div className="admin-array-card" key={`free-item-${index}`}>
                  <Field label={t('admin.content.slug')} value={item.slug} onChange={(value) => setDraftValue(['freeContent', 'items', index, 'slug'], value)} />
                  <Field label={t('admin.content.title')} value={item.title} onChange={(value) => setDraftValue(['freeContent', 'items', index, 'title'], value)} />
                  <TextareaField label={t('admin.content.description')} rows={3} value={item.description} onChange={(value) => setDraftValue(['freeContent', 'items', index, 'description'], value)} />
                  <Field label={t('admin.content.category')} value={item.category} onChange={(value) => setDraftValue(['freeContent', 'items', index, 'category'], value)} />
                  <label className="admin-field">
                    <span>{t('admin.content.mediaType')}</span>
                    <select value={item.mediaType || 'image'} onChange={(event) => setDraftValue(['freeContent', 'items', index, 'mediaType'], event.target.value)}>
                      <option value="image">{t('admin.content.image')}</option>
                      <option value="video">{t('admin.content.video')}</option>
                    </select>
                  </label>
                  <Field label={t('admin.content.imageUrl')} value={item.image} onChange={(value) => setDraftValue(['freeContent', 'items', index, 'image'], value)} />
                  <Field label={t('admin.content.thumbnailUrl')} value={item.thumbnail} onChange={(value) => setDraftValue(['freeContent', 'items', index, 'thumbnail'], value)} />
                  <Field label={t('admin.content.mediaUrl')} value={item.mediaUrl} onChange={(value) => setDraftValue(['freeContent', 'items', index, 'mediaUrl'], value)} />
                  <MediaField fieldKey={`freeContent.items.${index}.thumbnail`} label={t('admin.content.uploadImageThumbnail')} accept="image/*" bucket="site-images" folder="free-content" progress={uploadProgress} value={item.thumbnail || item.image} onClear={() => { setDraftValue(['freeContent', 'items', index, 'thumbnail'], ''); setDraftValue(['freeContent', 'items', index, 'image'], '') }} onUpload={(file, bucket, folder, mediaLabel) => handleUploadToPath(file, ['freeContent', 'items', index, 'thumbnail'], bucket, folder, mediaLabel, `freeContent.items.${index}.thumbnail`)} />
                  <MediaField fieldKey={`freeContent.items.${index}.mediaDriveFileId`} label={t('admin.content.uploadVideo')} accept="video/*" bucket="site-videos" folder="free-content" progress={uploadProgress} value={item.mediaDriveFileId || item.mediaUrl} viewHref={item.mediaUrl || null} onClear={() => {
                    setDraft((current) => {
                      let next = updateByPath(current, ['freeContent', 'items', index, 'mediaDriveFileId'], '')
                      next = updateByPath(next, ['freeContent', 'items', index, 'mediaUrl'], '')
                      return next
                    })
                  }} onUpload={async (file) => {
                    try {
                      const uploaded = await uploadMediaToDrive(file, {
                        slug: item.slug,
                        group: 'free-content',
                        variant: 'public',
                        fieldKey: `freeContent.items.${index}.mediaDriveFileId`,
                      })
                      setDraft((current) => {
                        let next = updateByPath(current, ['freeContent', 'items', index, 'mediaDriveFileId'], uploaded.fileId || '')
                        next = updateByPath(next, ['freeContent', 'items', index, 'mediaUrl'], uploaded.url || '')
                        return next
                      })
                    } catch {
                      // El mensaje ya se prepara en el helper de subida.
                    }
                  }} />
                  <label className="admin-toggle-row">
                    <span>{t('admin.content.published')}</span>
                    <input type="checkbox" checked={item.isPublished !== false} onChange={(event) => setDraftValue(['freeContent', 'items', index, 'isPublished'], event.target.checked)} />
                  </label>
                  <button type="button" className="admin-danger-button" onClick={() => removeListItem(['freeContent', 'items'], index)}>{t('admin.content.remove')}</button>
                </div>
              ))}
            </div>
          </SectionPanel>
        ) : null}
        {activeSection === 'creator' && activeCreatorSection === 'blog' ? (
          <>
            <div className="admin-blog-subtabs">
              <button
                type="button"
                className={activeBlogSection === 'landing' ? 'admin-tab active' : 'admin-tab'}
                onClick={() => setActiveBlogSection('landing')}
              >
                {t('admin.blog.landing')}
              </button>
              <button
                type="button"
                className={activeBlogSection === 'posts' ? 'admin-tab active' : 'admin-tab'}
                onClick={() => setActiveBlogSection('posts')}
              >
                {t('admin.blog.posts')}
              </button>
            </div>

            {activeBlogSection === 'landing' ? (
              <>
                <SectionPanel title={t('admin.content.blogTeaserTitle')} description={t('admin.content.blogTeaserDescription')}>
                  <Field label={t('admin.content.title')} value={draft.blogSection.title} onChange={(value) => setDraftValue(['blogSection', 'title'], value)} />
                  <TextareaField label={t('admin.content.description')} rows={4} value={draft.blogSection.description} onChange={(value) => setDraftValue(['blogSection', 'description'], value)} />
                </SectionPanel>
                <SectionPanel title={t('admin.content.blogLandingTitle')} description={t('admin.content.blogLandingDescription')}>
                  <Field label={t('admin.content.heroKicker')} value={draft.blogPage.heroKicker} onChange={(value) => setDraftValue(['blogPage', 'heroKicker'], value)} />
                  <Field label={t('admin.content.heroTitle')} value={draft.blogPage.heroTitle} onChange={(value) => setDraftValue(['blogPage', 'heroTitle'], value)} />
                  <TextareaField label={t('admin.content.heroDescription')} rows={4} value={draft.blogPage.heroDescription} onChange={(value) => setDraftValue(['blogPage', 'heroDescription'], value)} />
                  <Field label={t('admin.content.featuredText')} value={draft.blogPage.featuredLabel} onChange={(value) => setDraftValue(['blogPage', 'featuredLabel'], value)} />
                  <Field label={t('admin.content.categoriesLabel')} value={draft.blogPage.categoriesLabel} onChange={(value) => setDraftValue(['blogPage', 'categoriesLabel'], value)} />
                  <Field label={t('admin.content.totalPostsLabel')} value={draft.blogPage.totalPostsLabel} onChange={(value) => setDraftValue(['blogPage', 'totalPostsLabel'], value)} />

                  <Field label={t('admin.content.primaryBannerKicker')} value={draft.blogPage.bannerPrimary.kicker} onChange={(value) => setDraftValue(['blogPage', 'bannerPrimary', 'kicker'], value)} />
                  <Field label={t('admin.content.primaryBannerSlot')} value={draft.blogPage.bannerPrimary.slot} onChange={(value) => setDraftValue(['blogPage', 'bannerPrimary', 'slot'], value)} />
                  <Field label={t('admin.content.primaryBannerTitle')} value={draft.blogPage.bannerPrimary.title} onChange={(value) => setDraftValue(['blogPage', 'bannerPrimary', 'title'], value)} />
                  <TextareaField label={t('admin.content.primaryBannerDescription')} rows={3} value={draft.blogPage.bannerPrimary.description} onChange={(value) => setDraftValue(['blogPage', 'bannerPrimary', 'description'], value)} />
                  <Field label={t('admin.content.primaryBannerCta')} value={draft.blogPage.bannerPrimary.ctaLabel} onChange={(value) => setDraftValue(['blogPage', 'bannerPrimary', 'ctaLabel'], value)} />
                  <Field label={t('admin.content.primaryBannerUrl')} value={draft.blogPage.bannerPrimary.ctaUrl} onChange={(value) => setDraftValue(['blogPage', 'bannerPrimary', 'ctaUrl'], value)} />

                  <Field label={t('admin.content.secondaryBannerKicker')} value={draft.blogPage.bannerSecondary.kicker} onChange={(value) => setDraftValue(['blogPage', 'bannerSecondary', 'kicker'], value)} />
                  <Field label={t('admin.content.secondaryBannerSlot')} value={draft.blogPage.bannerSecondary.slot} onChange={(value) => setDraftValue(['blogPage', 'bannerSecondary', 'slot'], value)} />
                  <Field label={t('admin.content.secondaryBannerTitle')} value={draft.blogPage.bannerSecondary.title} onChange={(value) => setDraftValue(['blogPage', 'bannerSecondary', 'title'], value)} />
                  <TextareaField label={t('admin.content.secondaryBannerDescription')} rows={3} value={draft.blogPage.bannerSecondary.description} onChange={(value) => setDraftValue(['blogPage', 'bannerSecondary', 'description'], value)} />
                  <Field label={t('admin.content.secondaryBannerCta')} value={draft.blogPage.bannerSecondary.ctaLabel} onChange={(value) => setDraftValue(['blogPage', 'bannerSecondary', 'ctaLabel'], value)} />
                  <Field label={t('admin.content.secondaryBannerUrl')} value={draft.blogPage.bannerSecondary.ctaUrl} onChange={(value) => setDraftValue(['blogPage', 'bannerSecondary', 'ctaUrl'], value)} />

                  <Field label={t('admin.content.sidebarAKicker')} value={draft.blogPage.sidebarCardA.kicker} onChange={(value) => setDraftValue(['blogPage', 'sidebarCardA', 'kicker'], value)} />
                  <Field label={t('admin.content.sidebarATitle')} value={draft.blogPage.sidebarCardA.title} onChange={(value) => setDraftValue(['blogPage', 'sidebarCardA', 'title'], value)} />
                  <TextareaField label={t('admin.content.sidebarADescription')} rows={3} value={draft.blogPage.sidebarCardA.description} onChange={(value) => setDraftValue(['blogPage', 'sidebarCardA', 'description'], value)} />
                  <Field label={t('admin.content.sidebarBKicker')} value={draft.blogPage.sidebarCardB.kicker} onChange={(value) => setDraftValue(['blogPage', 'sidebarCardB', 'kicker'], value)} />
                  <Field label={t('admin.content.sidebarBTitle')} value={draft.blogPage.sidebarCardB.title} onChange={(value) => setDraftValue(['blogPage', 'sidebarCardB', 'title'], value)} />
                  <TextareaField label={t('admin.content.sidebarBDescription')} rows={3} value={draft.blogPage.sidebarCardB.description} onChange={(value) => setDraftValue(['blogPage', 'sidebarCardB', 'description'], value)} />

                  <Field label={t('admin.content.registeredCtaTitle')} value={draft.blogPage.ctaRegistered.title} onChange={(value) => setDraftValue(['blogPage', 'ctaRegistered', 'title'], value)} />
                  <TextareaField label={t('admin.content.registeredCtaDescription')} rows={3} value={draft.blogPage.ctaRegistered.description} onChange={(value) => setDraftValue(['blogPage', 'ctaRegistered', 'description'], value)} />
                  <Field label={t('admin.content.registeredCtaButton')} value={draft.blogPage.ctaRegistered.ctaLabel} onChange={(value) => setDraftValue(['blogPage', 'ctaRegistered', 'ctaLabel'], value)} />
                  <Field label={t('admin.content.registeredCtaUrl')} value={draft.blogPage.ctaRegistered.ctaUrl} onChange={(value) => setDraftValue(['blogPage', 'ctaRegistered', 'ctaUrl'], value)} />
                  <Field label={t('admin.content.subscriptionCtaTitle')} value={draft.blogPage.ctaSubscription.title} onChange={(value) => setDraftValue(['blogPage', 'ctaSubscription', 'title'], value)} />
                  <TextareaField label={t('admin.content.subscriptionCtaDescription')} rows={3} value={draft.blogPage.ctaSubscription.description} onChange={(value) => setDraftValue(['blogPage', 'ctaSubscription', 'description'], value)} />
                  <Field label={t('admin.content.subscriptionCtaButton')} value={draft.blogPage.ctaSubscription.ctaLabel} onChange={(value) => setDraftValue(['blogPage', 'ctaSubscription', 'ctaLabel'], value)} />
                  <Field label={t('admin.content.subscriptionCtaUrl')} value={draft.blogPage.ctaSubscription.ctaUrl} onChange={(value) => setDraftValue(['blogPage', 'ctaSubscription', 'ctaUrl'], value)} />
                </SectionPanel>
              </>
            ) : null}

            {activeBlogSection === 'posts' ? <BlogManager /> : null}
          </>
        ) : null}

        {activeSection === 'models' ? <EncuentrosModelsManager /> : null}

        {activeSection === 'encuentros' ? (
          <SectionPanel title={t('admin.content.encuentrosTitle')} description={t('admin.content.encuentrosDescription')}>
            <div className="admin-hint">
              <p>
                La gestion principal de modelos ya vive en <strong>Modelos</strong>. Aqui queda la base global y el fallback historico.
              </p>
            </div>
            <div className="admin-blog-subtabs">
              {encuentrosSubtabs.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={activeEncuentrosSection === key ? 'admin-tab active' : 'admin-tab'}
                  onClick={() => setActiveEncuentrosSection(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            {activeEncuentrosSection === 'overview' ? (
              <div className="admin-encuentros-layout">
                <div className="admin-encuentros-main">
                  <Field label={t('admin.content.topBarDesktop')} value={draft.topBarDesktopHighlight} onChange={(value) => setDraftValue(['topBarDesktopHighlight'], value)} />
                  <Field label={t('admin.content.topBarMobile')} value={draft.topBarMobile} onChange={(value) => setDraftValue(['topBarMobile'], value)} />
                  <Field label={t('admin.content.heroTitle')} value={draft.heroTitle} onChange={(value) => setDraftValue(['heroTitle'], value)} />
                  <TextareaField label={t('admin.content.heroDescription')} rows={4} value={draft.heroDescription} onChange={(value) => setDraftValue(['heroDescription'], value)} />
                  <Field label={t('admin.content.heroSubtitle')} value={draft.heroSubtitle} onChange={(value) => setDraftValue(['heroSubtitle'], value)} />
                </div>
              <div className="admin-encuentros-side">
                  <Field label={t('admin.content.presencialPrice')} value={draft.presencialPrice} onChange={(value) => setDraftValue(['presencialPrice'], value)} />
                  <TextareaField label={t('admin.content.presencialDescription')} rows={4} value={draft.presencialDescription} onChange={(value) => setDraftValue(['presencialDescription'], value)} />
                  <Field
                    label={t('admin.content.presencialBenefitTitle')}
                    value={draft.presencialBenefitTitle || ''}
                    onChange={(value) => setDraftValue(['presencialBenefitTitle'], value)}
                  />
                  <Field
                    label={t('admin.content.presencialBenefitText')}
                    value={draft.presencialBenefitText || ''}
                    onChange={(value) => setDraftValue(['presencialBenefitText'], value)}
                  />
                  <ArrayTextareaField
                    label={t('admin.content.presencialFeatures')}
                    rows={4}
                    values={draft.presencialFeatures}
                    onChange={(value) => setDraftValue(['presencialFeatures'], value)}
                  />
                  <Field label={t('admin.content.extraTitle')} value={draft.extraTitle} onChange={(value) => setDraftValue(['extraTitle'], value)} />
                  <TextareaField label={t('admin.content.extraLead')} rows={3} value={draft.extraLead} onChange={(value) => setDraftValue(['extraLead'], value)} />
                  <Field label={t('admin.content.extraFromLabel')} value={draft.extraFromLabel} onChange={(value) => setDraftValue(['extraFromLabel'], value)} />
                  <Field label={t('admin.content.extraPrice')} value={draft.extraPrice} onChange={(value) => setDraftValue(['extraPrice'], value)} />
                  <ArrayTextareaField label={t('admin.content.extraList')} rows={4} values={draft.extraItems} onChange={(value) => setDraftValue(['extraItems'], value)} />
                  <Field label={t('admin.content.fanCardDescription')} value={draft.fanCardDescription} onChange={(value) => setDraftValue(['fanCardDescription'], value)} />
                </div>
              </div>
            ) : null}

            {activeEncuentrosSection === 'chips' ? (
              <div className="admin-encuentros-layout">
                <div className="admin-encuentros-main">
                  <div className="admin-hint">
                    <p>{t('admin.content.encuentrosChipsDescription')}</p>
                  </div>
                  <ChipListField
                    label={t('admin.content.encuentrosExtraOptionsLabel')}
                    description={t('admin.content.encuentrosChipsDescription')}
                    items={draft.encuentrosExtraOptions}
                    onChange={(value) =>
                      void persistDraftValue(
                        ['encuentrosExtraOptions'],
                        value,
                        'Extras disponibles guardados.',
                      )
                    }
                    placeholder={t('admin.content.chipInputPlaceholder')}
                  />
                  <p className="admin-meta">Se guarda automaticamente al agregar, editar o eliminar un chip.</p>
                </div>
                <div className="admin-encuentros-side">
                  <ChipListField
                    label={t('admin.content.encuentrosPresencialFeatureOptionsLabel')}
                    description={t('admin.content.encuentrosChipsDescription')}
                    items={draft.encuentrosPresencialFeatureOptions}
                    onChange={(value) =>
                      void persistDraftValue(
                        ['encuentrosPresencialFeatureOptions'],
                        value,
                        'Features presenciales guardadas.',
                      )
                    }
                    placeholder={t('admin.content.chipInputPlaceholder')}
                  />
                  <p className="admin-meta">Se guarda automaticamente al agregar, editar o eliminar un chip.</p>
                </div>
              </div>
            ) : null}

            {activeEncuentrosSection === 'booking' ? (
              <div className="admin-encuentros-layout">
                <div className="admin-encuentros-main">
                  <div className="admin-hint">
                    <p>
                      Este bloque queda como respaldo global. La agenda, el precio, el adelanto y la
                      grabacion se configuran por modelo en la pestaña Modelos.
                    </p>
                  </div>
                  <DateRepeaterField
                    label={t('admin.content.bookingDates')}
                    hint={t('admin.content.bookingDatesHint')}
                    emptyText={t('admin.content.bookingDatesEmpty')}
                    addLabel={t('admin.content.addBookingDate')}
                    removeLabel={t('admin.content.remove')}
                    values={draft.encuentrosBooking?.availableDates || []}
                    onChange={(value) => setDraftValue(['encuentrosBooking', 'availableDates'], value)}
                  />
                  <Field
                    label={t('admin.content.bookingStartTime')}
                    value={draft.encuentrosBooking?.bookingStartTime || '15:00'}
                    onChange={(value) => setDraftValue(['encuentrosBooking', 'bookingStartTime'], value)}
                  />
                  <Field
                    label={t('admin.content.bookingEndTime')}
                    value={draft.encuentrosBooking?.bookingEndTime || '18:00'}
                    onChange={(value) => setDraftValue(['encuentrosBooking', 'bookingEndTime'], value)}
                  />
                  <Field
                    label={t('admin.content.bookingInterval')}
                    type="number"
                    value={String(draft.encuentrosBooking?.slotIntervalMinutes || 60)}
                    onChange={(value) =>
                      setDraftValue(
                        ['encuentrosBooking', 'slotIntervalMinutes'],
                        Number.parseInt(value || '0', 10) || 60,
                      )
                    }
                  />
                  <TextareaField
                    label={t('admin.content.bookingDescription')}
                    rows={4}
                    value={draft.encuentrosBooking?.description || ''}
                    onChange={(value) => setDraftValue(['encuentrosBooking', 'description'], value)}
                  />
                  <Field
                    label={t('admin.content.bookingGalleryTitle')}
                    value={draft.encuentrosBooking?.galleryTitle || ''}
                    onChange={(value) => setDraftValue(['encuentrosBooking', 'galleryTitle'], value)}
                  />
                  <Field
                    label={t('admin.content.bookingGallerySubtitle')}
                    value={draft.encuentrosBooking?.gallerySubtitle || ''}
                    onChange={(value) => setDraftValue(['encuentrosBooking', 'gallerySubtitle'], value)}
                  />
                </div>
                <div className="admin-encuentros-side">
                  <Field
                    label={t('admin.content.bookingPriceLabel')}
                    value={draft.encuentrosBooking?.priceLabel || 'S/5.00'}
                    onChange={(value) => setDraftValue(['encuentrosBooking', 'priceLabel'], value)}
                  />
                  <Field
                    label={t('admin.content.bookingAdvanceLabel')}
                    value={draft.encuentrosBooking?.advanceLabel || 'S/10.00'}
                    onChange={(value) => setDraftValue(['encuentrosBooking', 'advanceLabel'], value)}
                  />
                  <Field
                    label={t('admin.content.bookingRecordingDiscount')}
                    type="number"
                    value={String(draft.encuentrosBooking?.recordingDiscountPercent || 20)}
                    onChange={(value) =>
                      setDraftValue(
                        ['encuentrosBooking', 'recordingDiscountPercent'],
                        Math.min(Math.max(Number.parseInt(value || '0', 10) || 0, 0), 100),
                      )
                    }
                  />
                  <Field
                    label={t('admin.content.bookingRecordingDiscountLabel')}
                    value={draft.encuentrosBooking?.recordingDiscountLabel || ''}
                    onChange={(value) => setDraftValue(['encuentrosBooking', 'recordingDiscountLabel'], value)}
                  />
                  <Field
                    label={t('admin.content.bookingRecordingTitle')}
                    value={draft.encuentrosBooking?.recordingPromptTitle || ''}
                    onChange={(value) => setDraftValue(['encuentrosBooking', 'recordingPromptTitle'], value)}
                  />
                  <TextareaField
                    label={t('admin.content.bookingRecordingDescription')}
                    rows={3}
                    value={draft.encuentrosBooking?.recordingPromptDescription || ''}
                    onChange={(value) => setDraftValue(['encuentrosBooking', 'recordingPromptDescription'], value)}
                  />
                  <Field
                    label={t('admin.content.bookingRecordingYesLabel')}
                    value={draft.encuentrosBooking?.recordingYesLabel || ''}
                    onChange={(value) => setDraftValue(['encuentrosBooking', 'recordingYesLabel'], value)}
                  />
                  <Field
                    label={t('admin.content.bookingRecordingNoLabel')}
                    value={draft.encuentrosBooking?.recordingNoLabel || ''}
                    onChange={(value) => setDraftValue(['encuentrosBooking', 'recordingNoLabel'], value)}
                  />
                  <Field
                    label={t('admin.content.bookingGalleryExclusiveTitle')}
                    value={draft.encuentrosBooking?.galleryExclusiveTitle || ''}
                    onChange={(value) => setDraftValue(['encuentrosBooking', 'galleryExclusiveTitle'], value)}
                  />
                  <TextareaField
                    label={t('admin.content.bookingGalleryExclusiveDescription')}
                    rows={3}
                    value={draft.encuentrosBooking?.galleryExclusiveDescription || ''}
                    onChange={(value) => setDraftValue(['encuentrosBooking', 'galleryExclusiveDescription'], value)}
                  />
                  <Field
                    label={t('admin.content.bookingGalleryExclusiveHint')}
                    value={draft.encuentrosBooking?.galleryExclusiveHint || ''}
                    onChange={(value) => setDraftValue(['encuentrosBooking', 'galleryExclusiveHint'], value)}
                  />
                  <ArrayTextareaField label={t('admin.content.importantList')} rows={4} values={draft.importantItems} onChange={(value) => setDraftValue(['importantItems'], value)} />
                  <ArrayTextareaField
                    label={t('admin.content.bookingMethods')}
                    rows={4}
                    values={(draft.encuentrosBooking?.paymentMethods || []).map((method) => `${method.value} | ${method.label}`)}
                    onChange={(value) =>
                      setDraftValue(
                        ['encuentrosBooking', 'paymentMethods'],
                        value
                          .map((line) => {
                            const [methodValue, methodLabel] = String(line).split('|').map((part) => part.trim())
                            if (!methodValue) {
                              return null
                            }
                            return {
                              value: methodValue,
                              label: methodLabel || methodValue,
                            }
                          })
                          .filter(Boolean),
                      )
                    }
                  />
                </div>
              </div>
            ) : null}

            {activeEncuentrosSection === 'media' ? (
              <div className="admin-encuentros-layout">
                <div className="admin-encuentros-main">
                  <CarouselSlidesEditor
                    bucket="site-images"
                    fieldKeyBase="topCarouselImages"
                    folder="encuentros-top"
                    label={t('admin.content.topCarousel')}
                    note={t('admin.content.topCarouselNote')}
                    onChange={(value) => setDraftValue(['topCarouselImages'], value)}
                    onUploadFile={uploadFile}
                    slides={draft.topCarouselImages}
                    uploadProgress={uploadProgress}
                    uploadTitle={t('admin.content.uploadImage')}
                  />
                </div>
                <div className="admin-encuentros-side">
                  <CarouselSlidesEditor
                    bucket="site-images"
                    fieldKeyBase="bottomCarouselImages"
                    folder="encuentros-bottom"
                    label={t('admin.content.bottomCarousel')}
                    onChange={(value) => setDraftValue(['bottomCarouselImages'], value)}
                    onUploadFile={uploadFile}
                    slides={draft.bottomCarouselImages}
                    uploadProgress={uploadProgress}
                    uploadTitle={t('admin.content.uploadImage')}
                  />
                </div>
              </div>
            ) : null}

          </SectionPanel>
        ) : null}

        {activeSection === 'global' ? (
          <SectionPanel title={t('admin.content.globalTitle')} description={t('admin.content.globalDescription')}>
            <div className="admin-blog-subtabs">
              {globalSubtabs.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={activeGlobalSection === key ? 'admin-tab active' : 'admin-tab'}
                  onClick={() => setActiveGlobalSection(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            {activeGlobalSection === 'links' ? (
              <div className="admin-global-layout">
                <div className="admin-global-main">
                  <Field label={t('admin.content.whatsappUrl')} value={draft.whatsappUrl} onChange={(value) => setDraftValue(['whatsappUrl'], value)} />
                  <Field label={t('admin.content.fanUrl')} value={draft.fanButtonUrl} onChange={(value) => setDraftValue(['fanButtonUrl'], value)} />
                  <Field label={t('admin.content.telegramUrl')} value={draft.socialUrl} onChange={(value) => setDraftValue(['socialUrl'], value)} />
                </div>
                <div className="admin-global-side">
                  <div className="admin-hint">
                    <p>{t('admin.content.globalLinksHint')}</p>
                  </div>
                </div>
              </div>
            ) : null}

            {activeGlobalSection === 'footer' ? (
              <div className="admin-global-layout">
                <div className="admin-global-main">
                  <TextareaField label={t('admin.content.footerEncounters')} rows={3} value={draft.footerText} onChange={(value) => setDraftValue(['footerText'], value)} />
                  <Field label={t('admin.content.footerHomeTitle')} value={draft.siteFooter.title} onChange={(value) => setDraftValue(['siteFooter', 'title'], value)} />
                </div>
                <div className="admin-global-side">
                  <TextareaField label={t('admin.content.footerHomeDescription')} rows={4} value={draft.siteFooter.description} onChange={(value) => setDraftValue(['siteFooter', 'description'], value)} />
                </div>
              </div>
            ) : null}

            {activeGlobalSection === 'visibility' ? (
              <div className="admin-global-layout">
                <div className="admin-global-main">
                  <div className="admin-repeater">
                    <div className="admin-section-header">
                      <div>
                        <h3>{t('admin.content.sectionsVisibility')}</h3>
                        <p className="admin-meta">{t('admin.content.sectionsVisibilityDescription')}</p>
                      </div>
                    </div>
                    <div className="admin-visibility-grid">
                      {[
                        ['creatorHero', t('admin.content.sectionCreator')],
                        ['accessTotal', t('admin.content.sectionAccess')],
                        ['mediaSpotlight', t('admin.content.sectionSpotlight')],
                        ['videoLibrary', t('admin.content.sectionVideos')],
                        ['videoCollections', t('admin.content.sectionCollections')],
                        ['physicalMerch', t('admin.content.sectionPhysical')],
                        ['membership', t('admin.content.sectionMembership')],
                        ['blogTeaser', t('admin.content.sectionBlogTeaser')],
                        ['siteFooter', t('admin.content.sectionFooter')],
                        ['encuentrosHero', t('admin.content.sectionEncuentrosHero')],
                        ['encuentrosTopCarousel', t('admin.content.sectionEncuentrosTop')],
                        ['encuentrosBottomCarousel', t('admin.content.sectionEncuentrosBottom')],
                        ['encuentrosImportant', t('admin.content.sectionEncuentrosImportant')],
                        ['encuentrosPricing', t('admin.content.sectionEncuentrosPricing')],
                        ['encuentrosLoverfans', t('admin.content.sectionEncuentrosLoverfans')],
                        ['encuentrosSocial', t('admin.content.sectionEncuentrosSocial')],
                      ].map(([key, label]) => (
                        <label className="admin-toggle-row" key={key}>
                          <span>{label}</span>
                          <input
                            type="checkbox"
                            checked={Boolean(draft.sectionVisibility?.[key])}
                            onChange={(event) =>
                              setDraftValue(['sectionVisibility', key], event.target.checked)
                            }
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="admin-global-side">
                  <div className="admin-hint">
                    <p>{t('admin.content.globalVisibilityHint')}</p>
                  </div>
                </div>
              </div>
            ) : null}
          </SectionPanel>
        ) : null}

          <div className="admin-submit-row admin-submit-row-inline">
            {message ? <p className="admin-success">{message}</p> : null}
            {uploadMessage ? <p className="admin-success">{uploadMessage}</p> : null}
          </div>
        </form>
      </section>
  )
}

function UsersEditor() {
  const {
    customerAdminData,
    formatPriceFromAmount,
    isSupabaseConfigured,
    createManagedUser,
    updateManagedSubscription,
    refreshUsers,
    updateManagedUser,
    adminAuditEvents,
    subscriptionProducts,
    users,
  } = useAppState()
  const { t } = useTranslation()
  const [form, setForm] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    role: 'public',
    status: 'active',
    subscriptionPlanSlug: '',
    subscriptionStartAt: toDatetimeLocalValue(),
    subscriptionDurationValue: '',
    subscriptionDurationUnit: 'months',
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasInitializedSubscriptionDraft, setHasInitializedSubscriptionDraft] = useState(false)
  const activeAdmins = useMemo(() => users.filter((user) => user.role === 'admin' && user.status === 'active'), [users])
  const [searchTerm, setSearchTerm] = useState('')
  const [roleDrafts, setRoleDrafts] = useState({})
  const [subscriptionDrafts, setSubscriptionDrafts] = useState({})
  const [subscriptionMessage, setSubscriptionMessage] = useState('')
  const [subscriptionError, setSubscriptionError] = useState('')
  const [subscriptionSavingUserId, setSubscriptionSavingUserId] = useState('')

  useEffect(() => {
    if (hasInitializedSubscriptionDraft || !subscriptionProducts.length) {
      return
    }

    const defaultPlan = subscriptionProducts[0]

    if (!defaultPlan) {
      return
    }

    setForm((current) => ({
      ...current,
      subscriptionPlanSlug: current.subscriptionPlanSlug || defaultPlan.slug,
      subscriptionDurationValue:
        current.subscriptionDurationValue ||
        String(defaultPlan.metadata?.durationValue || defaultPlan.metadata?.durationMonths || 1),
      subscriptionDurationUnit:
        current.subscriptionDurationUnit || defaultPlan.metadata?.durationUnit || 'months',
    }))
    setHasInitializedSubscriptionDraft(true)
  }, [hasInitializedSubscriptionDraft, subscriptionProducts])

  useEffect(() => {
    setRoleDrafts(Object.fromEntries(users.map((user) => [user.id, user.role || 'public'])))
  }, [users])

  useEffect(() => {
    setSubscriptionDrafts((currentDrafts) => {
      const nextDrafts = { ...currentDrafts }
      let hasChanges = false

      for (const user of users) {
        if (!nextDrafts[user.id]) {
          nextDrafts[user.id] = buildSubscriptionDraftForUser(user, subscriptionProducts)
          hasChanges = true
        }
      }

      for (const userId of Object.keys(nextDrafts)) {
        if (!users.some((user) => user.id === userId)) {
          delete nextDrafts[userId]
          hasChanges = true
        }
      }

      return hasChanges ? nextDrafts : currentDrafts
    })
  }, [subscriptionProducts, users])

  function isLastActiveAdmin(user) {
    return user.role === 'admin' && user.status === 'active' && activeAdmins.length <= 1
  }

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function handleSubscriptionPlanChange(event) {
    const nextPlanSlug = event.target.value
    const nextPlan = subscriptionProducts.find((product) => product.slug === nextPlanSlug) || null

    setForm((current) => ({
      ...current,
      subscriptionPlanSlug: nextPlanSlug,
      subscriptionDurationValue: nextPlan
        ? String(nextPlan.metadata?.durationValue || nextPlan.metadata?.durationMonths || 1)
        : current.subscriptionDurationValue,
      subscriptionDurationUnit: nextPlan
        ? nextPlan.metadata?.durationUnit || 'months'
        : current.subscriptionDurationUnit,
    }))
  }

  async function handleAddUser(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    setIsSubmitting(true)

    try {
      await createManagedUser(form)
      setMessage(t('admin.users.created'))
      setForm({
        name: '',
        email: '',
        username: '',
        password: '',
        role: 'public',
        status: 'active',
        subscriptionPlanSlug: subscriptionProducts[0]?.slug || '',
        subscriptionStartAt: toDatetimeLocalValue(),
        subscriptionDurationValue: String(
          subscriptionProducts[0]?.metadata?.durationValue ||
            subscriptionProducts[0]?.metadata?.durationMonths ||
            1,
        ),
        subscriptionDurationUnit: subscriptionProducts[0]?.metadata?.durationUnit || 'months',
      })
    } catch (nextError) {
      setError(nextError.message || t('admin.users.createError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleToggleStatus(user) {
    try {
      await updateManagedUser(user.id, { status: user.status === 'active' ? 'disabled' : 'active' })
      setError('')
    } catch (nextError) {
      setError(nextError.message || 'No se pudo actualizar el usuario.')
    }
  }

  async function handleRoleSave(user) {
    try {
      await updateManagedUser(user.id, { role: roleDrafts[user.id] || user.role })
      setError('')
    } catch (nextError) {
      setError(nextError.message || 'No se pudo actualizar el usuario.')
    }
  }

  function updateSubscriptionDraft(userId, key, value) {
    setSubscriptionDrafts((currentDrafts) => ({
      ...currentDrafts,
      [userId]: {
        ...(currentDrafts[userId] || {}),
        [key]: value,
      },
    }))
  }

  async function handleSubscriptionGrant(user) {
    const draft =
      subscriptionDrafts[user.id] || buildSubscriptionDraftForUser(user, subscriptionProducts)

    setSubscriptionError('')
    setSubscriptionMessage('')
    setSubscriptionSavingUserId(user.id)

    try {
      await updateManagedSubscription(user.id, {
        action: 'grant',
        planSlug: draft.planSlug,
        startAt: draft.startAt,
        durationValue: draft.durationValue,
        durationUnit: draft.durationUnit,
      })
      setSubscriptionMessage(t('admin.users.subscriptionUpdated'))
    } catch (nextError) {
      setSubscriptionError(nextError.message || t('admin.users.subscriptionError'))
    } finally {
      setSubscriptionSavingUserId('')
    }
  }

  async function handleSubscriptionRevoke(user) {
    setSubscriptionError('')
    setSubscriptionMessage('')
    setSubscriptionSavingUserId(user.id)

    try {
      await updateManagedSubscription(user.id, { action: 'revoke' })
      setSubscriptionMessage(t('admin.users.subscriptionRevoked'))
    } catch (nextError) {
      setSubscriptionError(nextError.message || t('admin.users.subscriptionError'))
    } finally {
      setSubscriptionSavingUserId('')
    }
  }

  const visibleCustomers = useMemo(() => {
    const source = isSupabaseConfigured ? customerAdminData : users
    const needle = searchTerm.trim().toLowerCase()

    if (!needle) {
      return source
    }

    return source.filter((user) =>
      [user.name, user.email, user.role, user.status]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(needle)),
    )
  }, [customerAdminData, isSupabaseConfigured, searchTerm, users])

  return (
    <section className="admin-panel-section">
      <div className="admin-section-header">
        <div><p className="admin-eyebrow">{t('admin.users.eyebrow')}</p><h2>{t('admin.users.title')}</h2></div>
        <p className="admin-meta">{t('admin.users.summary', { total: users.length, admins: activeAdmins.length })}</p>
      </div>
      {subscriptionError ? <p className="admin-error">{subscriptionError}</p> : null}
      {subscriptionMessage ? <p className="admin-success">{subscriptionMessage}</p> : null}
      <div className="admin-users-layout">
        <form className="admin-form admin-form-card" onSubmit={handleAddUser}>
          <label className="admin-field">
            <span>{t('admin.users.name')}</span>
            <input name="name" value={form.name} onChange={handleChange} required />
          </label>
          <label className="admin-field">
            <span>Usuario</span>
            <input
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="sindy-mireya"
            />
          </label>
          <label className="admin-field">
            <span>{t('admin.users.email')}</span>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Opcional para modelos"
            />
          </label>
          <label className="admin-field">
            <span>{t('admin.users.password')}</span>
            <input type="password" name="password" value={form.password} onChange={handleChange} required />
          </label>
          <label className="admin-field">
            <span>{t('admin.users.role')}</span>
            <select name="role" value={form.role} onChange={handleChange}>
              <option value="public">{t('admin.users.public')}</option>
              <option value="admin">{t('admin.users.admin')}</option>
            </select>
          </label>
          <label className="admin-field">
            <span>{t('admin.users.status')}</span>
            <select name="status" value={form.status} onChange={handleChange}>
              <option value="active">{t('admin.users.active')}</option>
              <option value="disabled">{t('admin.users.disabled')}</option>
            </select>
          </label>
          <div className="admin-hint">
            <p>{t('admin.users.subscriptionHint')}</p>
          </div>
          <label className="admin-field">
            <span>{t('admin.users.subscriptionPlan')}</span>
            <select
              name="subscriptionPlanSlug"
              value={form.subscriptionPlanSlug}
              onChange={handleSubscriptionPlanChange}
              disabled={!subscriptionProducts.length}
            >
              <option value="">{t('admin.users.noSubscription')}</option>
              {subscriptionProducts.map((plan) => (
                <option key={plan.slug} value={plan.slug}>
                  {plan.title} - {plan.priceLabel}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>{t('admin.users.subscriptionStart')}</span>
            <input
              type="datetime-local"
              name="subscriptionStartAt"
              value={form.subscriptionStartAt}
              onChange={handleChange}
            />
          </label>
          <label className="admin-field">
            <span>{t('admin.users.subscriptionDurationValue')}</span>
            <input
              type="number"
              min="1"
              name="subscriptionDurationValue"
              value={form.subscriptionDurationValue}
              onChange={handleChange}
            />
          </label>
          <label className="admin-field">
            <span>{t('admin.users.subscriptionDurationUnit')}</span>
            <select
              name="subscriptionDurationUnit"
              value={form.subscriptionDurationUnit}
              onChange={handleChange}
            >
              <option value="days">{t('admin.content.days')}</option>
              <option value="months">{t('admin.content.months')}</option>
            </select>
          </label>
          {error ? <p className="admin-error">{error}</p> : null}
          {message ? <p className="admin-success">{message}</p> : null}
          <button className="admin-primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('admin.users.creating') : t('admin.users.createAndGrant')}
          </button>
          {isSupabaseConfigured ? (
            <div className="admin-hint">
              <p>{t('admin.users.supabaseHint')}</p>
              <p className="admin-note">{t('admin.users.supabaseNote')}</p>
              <button type="button" className="admin-secondary-button" onClick={refreshUsers}>
                {t('admin.users.refresh')}
              </button>
            </div>
          ) : null}
        </form>
        <div className="admin-users-list">
          <label className="admin-field">
            <span>{t('admin.users.search')}</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={t('admin.users.searchPlaceholder')}
            />
          </label>
          {visibleCustomers.map((user) => (
            <article className="admin-user-card" key={user.id}>
              <div className="admin-user-copy">
                <h3>{user.name}</h3>
                <p>{user.email}</p>
                <p>{t('admin.users.roleState', { role: user.role, status: user.status })}</p>
                {isSupabaseConfigured ? (
                  <>
                    <div className="admin-user-metrics">
                      <span>{t('admin.users.orders', { count: user.orderCount || 0 })}</span>
                      <span>{t('admin.users.paid', { count: user.paidOrderCount || 0 })}</span>
                      <span>{t('admin.users.totalSpent', { amount: formatPriceFromAmount(user.totalSpentAmount || 0, 'USD') })}</span>
                    </div>
                    <p className="admin-note">
                      {t('admin.users.stripeCustomer', { id: user.stripeCustomerId || t('admin.users.unassigned') })} · {t('admin.users.createdAt', { date: formatDateLabel(user.createdAt) })}
                    </p>
                    <p className="admin-note">
                      {t('admin.users.latestOrder', { date: formatDateLabel(user.latestOrderAt) })}
                    </p>
                    {(() => {
                      const activeSubscription = getActiveDigitalSubscription(user)

                      return (
                        <p className="admin-note">
                          {activeSubscription
                            ? t('admin.users.subscriptionUntil', {
                                date: formatDateLabel(activeSubscription.expiresAt),
                              })
                            : t('admin.users.noSubscriptionActive')}
                        </p>
                      )
                    })()}
                    <div className="admin-entitlement-chips">
                      {(user.entitlements || []).length ? (
                        user.entitlements
                          .filter((entry) => entry.status === 'active')
                          .slice(0, 6)
                          .map((entry) => (
                            <span className="admin-chip" key={entry.id}>
                              {entry.entitlementKey}
                              {entry.grantSource === 'admin' ? ' · admin' : ''}
                            </span>
                          ))
                      ) : (
                        <span className="admin-chip muted">{t('admin.users.noAccess')}</span>
                      )}
                    </div>
                    <div className="admin-subscription-card">
                      <div className="admin-subscription-head">
                        <strong>{t('admin.users.subscriptionControls')}</strong>
                        <span className="admin-note">
                          {getActiveDigitalSubscription(user)
                            ? t('admin.users.subscriptionActive')
                            : t('admin.users.subscriptionInactive')}
                        </span>
                      </div>
                      <div className="admin-subscription-grid">
                        <label className="admin-field">
                          <span>{t('admin.users.subscriptionPlan')}</span>
                          <select
                            value={
                              subscriptionDrafts[user.id]?.planSlug ||
                              buildSubscriptionDraftForUser(user, subscriptionProducts).planSlug
                            }
                            onChange={(event) =>
                              updateSubscriptionDraft(user.id, 'planSlug', event.target.value)
                            }
                            disabled={!subscriptionProducts.length}
                          >
                            <option value="">{t('admin.users.noSubscription')}</option>
                            {subscriptionProducts.map((plan) => (
                              <option key={plan.slug} value={plan.slug}>
                                {plan.title} - {plan.priceLabel}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="admin-field">
                          <span>{t('admin.users.subscriptionStart')}</span>
                          <input
                            type="datetime-local"
                            value={
                              subscriptionDrafts[user.id]?.startAt ||
                              buildSubscriptionDraftForUser(user, subscriptionProducts).startAt
                            }
                            onChange={(event) =>
                              updateSubscriptionDraft(user.id, 'startAt', event.target.value)
                            }
                          />
                        </label>
                        <label className="admin-field">
                          <span>{t('admin.users.subscriptionDurationValue')}</span>
                          <input
                            type="number"
                            min="1"
                            value={
                              subscriptionDrafts[user.id]?.durationValue ||
                              buildSubscriptionDraftForUser(user, subscriptionProducts).durationValue
                            }
                            onChange={(event) =>
                              updateSubscriptionDraft(user.id, 'durationValue', event.target.value)
                            }
                          />
                        </label>
                        <label className="admin-field">
                          <span>{t('admin.users.subscriptionDurationUnit')}</span>
                          <select
                            value={
                              subscriptionDrafts[user.id]?.durationUnit ||
                              buildSubscriptionDraftForUser(user, subscriptionProducts).durationUnit
                            }
                            onChange={(event) =>
                              updateSubscriptionDraft(user.id, 'durationUnit', event.target.value)
                            }
                          >
                            <option value="days">{t('admin.content.days')}</option>
                            <option value="months">{t('admin.content.months')}</option>
                          </select>
                        </label>
                      </div>
                      <div className="admin-actions-row">
                        <button
                          type="button"
                          className="admin-secondary-button"
                          onClick={() => handleSubscriptionGrant(user)}
                          disabled={
                            subscriptionSavingUserId === user.id ||
                            !(
                              subscriptionDrafts[user.id]?.planSlug ||
                              buildSubscriptionDraftForUser(user, subscriptionProducts).planSlug
                            )
                          }
                        >
                          {subscriptionSavingUserId === user.id
                            ? t('admin.users.savingSubscription')
                            : t('admin.users.saveSubscription')}
                        </button>
                        <button
                          type="button"
                          className="admin-danger-button"
                          onClick={() => handleSubscriptionRevoke(user)}
                          disabled={subscriptionSavingUserId === user.id}
                        >
                          {t('admin.users.revokeSubscription')}
                        </button>
                      </div>
                    </div>
                    {(user.orders || []).length ? (
                      <div className="admin-user-orders">
                        {user.orders.slice(0, 3).map((order) => (
                          <div className="admin-user-order" key={order.id}>
                            <div>
                              <strong>{order.providerOrderId || order.id}</strong>
                              <span>{formatDateLabel(order.createdAt)}</span>
                            </div>
                            <div>
                              <strong>{formatPriceFromAmount(order.totalAmount, order.currency)}</strong>
                              <span>{order.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
              <div className="admin-actions-row">
                <select className="admin-inline-select" value={roleDrafts[user.id] || user.role} onChange={(event) => setRoleDrafts((current) => ({ ...current, [user.id]: event.target.value }))} disabled={isLastActiveAdmin(user)}><option value="public">{t('admin.users.public')}</option><option value="admin">{t('admin.users.admin')}</option></select>
                <button type="button" className="admin-secondary-button" onClick={() => handleRoleSave(user)} disabled={isLastActiveAdmin(user)}>{t('admin.users.saveRole')}</button>
                <button type="button" className="admin-secondary-button" onClick={() => handleToggleStatus(user)} disabled={isLastActiveAdmin(user)}>{user.status === 'active' ? t('admin.users.deactivate') : t('admin.users.activate')}</button>
                {isSupabaseConfigured ? null : <button type="button" className="admin-danger-button" onClick={() => updateManagedUser(user.id, { _delete: true })} disabled={isLastActiveAdmin(user)}>{t('admin.users.delete')}</button>}
              </div>
            </article>
          ))}
        </div>
        <aside className="admin-audit-panel">
          <div className="admin-section-header">
            <div>
              <p className="admin-eyebrow">{t('admin.users.auditEyebrow')}</p>
              <h3>{t('admin.users.auditTitle')}</h3>
              <p className="admin-meta">{t('admin.users.auditDescription')}</p>
            </div>
          </div>
          <div className="admin-audit-list">
            {adminAuditEvents.length ? (
              adminAuditEvents.slice(0, 10).map((event) => (
                <article className="admin-audit-item" key={event.id}>
                  <div className="admin-audit-copy">
                    <strong>{t(formatAuditEventLabel(event.eventType))}</strong>
                    <span>
                      {event.actorName || t('admin.users.auditUnknownActor')}
                      {event.targetUserName
                        ? ` · ${t('admin.users.auditTarget')}: ${event.targetUserName}`
                        : ''}
                    </span>
                  </div>
                  <div className="admin-audit-meta">
                    <span>{formatDateLabel(event.createdAt)}</span>
                    <span>{event.entityType}</span>
                  </div>
                </article>
              ))
            ) : (
              <article className="admin-hint">
                <p>{t('admin.users.auditEmpty')}</p>
              </article>
            )}
          </div>
        </aside>
      </div>
    </section>
  )
}

function PhysicalOrdersEditor() {
  const { physicalOrders, updatePhysicalOrder } = useAppState()
  const { t } = useTranslation()

  return (
    <section className="admin-panel-section">
      <div className="admin-section-header">
        <div>
          <p className="admin-eyebrow">{t('admin.physical.eyebrow')}</p>
          <h2>{t('admin.physical.title')}</h2>
          <p className="admin-meta">{t('admin.physical.description')}</p>
        </div>
      </div>
      <div className="admin-users-list">
        {physicalOrders.length ? (
          physicalOrders.map((order) => (
            <article className="admin-user-card" key={order.id}>
              <div className="admin-user-copy">
                <h3>{order.productTitle}</h3>
                <p>{order.userEmail}</p>
                <p>
                  {t('admin.physical.destination')} <strong>{order.recipientName}</strong> · {order.city}, {order.country}
                </p>
                <p className="admin-note">
                  {order.addressLine1}
                  {order.addressLine2 ? ` · ${order.addressLine2}` : ''}
                  {order.reference ? ` · Ref: ${order.reference}` : ''}
                </p>
                <div className="admin-user-metrics">
                  <span>{t('admin.physical.payment')} <strong>{order.status}</strong></span>
                  <span>{t('admin.physical.shipping')} <strong>{order.shippingStatus}</strong></span>
                  <span>{t('admin.physical.price')} <strong>{order.priceLabel}</strong></span>
                </div>
                <div className="admin-actions-row">
                  <label className="admin-field">
                    <span>{t('admin.physical.carrier')}</span>
                    <select
                      value={order.carrier || 'manual_review'}
                      onChange={(event) => updatePhysicalOrder(order.id, { carrier: event.target.value })}
                    >
                      <option value="manual_review">{t('admin.physical.manualReview')}</option>
                      <option value="olva">Olva</option>
                      <option value="shalom">Shalom</option>
                      <option value="dhl">DHL</option>
                      <option value="fedex">FedEx</option>
                      <option value="other">{t('admin.physical.other')}</option>
                    </select>
                  </label>
                  <label className="admin-field">
                    <span>{t('admin.physical.tracking')}</span>
                    <input
                      value={order.trackingNumber || ''}
                      onChange={(event) => updatePhysicalOrder(order.id, { trackingNumber: event.target.value })}
                    />
                  </label>
                  <label className="admin-field">
                    <span>{t('admin.physical.shippingState')}</span>
                    <select
                      value={order.shippingStatus || 'awaiting_payment'}
                      onChange={(event) => updatePhysicalOrder(order.id, { shippingStatus: event.target.value })}
                    >
                      <option value="awaiting_payment">{t('admin.physical.awaitingPayment')}</option>
                      <option value="processing">{t('admin.physical.processing')}</option>
                      <option value="shipped">{t('admin.physical.shipped')}</option>
                      <option value="delivered">{t('admin.physical.delivered')}</option>
                      <option value="cancelled">{t('admin.physical.cancelled')}</option>
                    </select>
                  </label>
                </div>
              </div>
            </article>
          ))
        ) : (
          <article className="admin-hint">
            <p>{t('admin.physical.noOrders')}</p>
          </article>
        )}
      </div>
    </section>
  )
}

function ReservationOrdersEditor() {
  const { orders, formatPriceFromAmount } = useAppState()
  const { t } = useTranslation()
  const reservationOrders = useMemo(
    () => orders.filter((order) => isEncounterReservationOrder(order)),
    [orders],
  )

  return (
    <section className="admin-panel-section">
      <div className="admin-section-header">
        <div>
          <p className="admin-eyebrow">{t('admin.encounters.eyebrow')}</p>
          <h2>{t('admin.encounters.title')}</h2>
          <p className="admin-meta">{t('admin.encounters.description')}</p>
        </div>
      </div>
      <div className="admin-users-list">
        {reservationOrders.length ? (
          reservationOrders.map((order) => {
            const metadata = order.metadata || {}
            const reservationDate = metadata.reservationDate || ''
            const reservationTime = metadata.reservationTime || ''
            const guestName = metadata.reservationGuestName || metadata.reservationName || t('encuentros.noGuestName')
            const paymentMethod = metadata.paymentMethod || 'PLIN / YAPE'
            const advanceLabel =
              formatPriceFromAmount(order.totalAmount || metadata.reservationAdvanceAmount || 0, order.currency || 'PEN')
            const remainingLabel =
              metadata.reservationRemainingLabel ||
              formatPriceFromAmount(
                metadata.reservationRemainingAmount ??
                  Math.max(0, (metadata.reservationTotalAmount || 0) - (metadata.reservationAdvanceAmount || 0)),
                order.currency || 'PEN',
              )

            return (
              <article className="admin-user-card" key={order.id}>
                <div className="admin-user-copy">
                  <h3>{guestName}</h3>
                  <p>{reservationDate || t('encuentros.noDateSelected')} · {reservationTime || t('encuentros.noTimeSelected')}</p>
                  <p className="admin-note">
                    Modelo <strong>{metadata.modelName || metadata.modelSlug || 'Modelo sin nombre'}</strong>
                    {metadata.modelSlug ? ` · /encuentros/${metadata.modelSlug}` : ''}
                  </p>
                  <p className="admin-note">
                    {t('admin.encounters.manualPayment')} <strong>{paymentMethod}</strong>
                    {' · '}
                    {t('admin.encounters.advance')} <strong>{advanceLabel}</strong>
                  </p>
                  <div className="admin-user-metrics">
                    <span>{t('admin.encounters.total')} <strong>{remainingLabel}</strong></span>
                    <span>{t('encuentros.bookingWizardStepRecording')} <strong>{metadata.reservationRecordingChoice || t('encuentros.recordingNo')}</strong></span>
                    <span>{t('encuentros.bookingWizardGuestName')} <strong>{guestName}</strong></span>
                    <span>{t('admin.encounters.status')} <strong>{order.status}</strong></span>
                  </div>
                  <p className="admin-note">
                    {t('admin.encounters.createdAt')} <strong>{formatDateLabel(order.createdAt)}</strong>
                  </p>
                </div>
              </article>
            )
          })
        ) : (
          <article className="admin-hint">
            <p>{t('admin.encounters.empty')}</p>
          </article>
        )}
      </div>
    </section>
  )
}

export function AdminDashboardPage() {
  const navigate = useNavigate()
  const { logout, session } = useAppState()
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('content')

  async function handleLogout() {
    await logout()
    navigate('/admin/login')
  }

  return (
    <main className="admin-shell">
      <section className="admin-dashboard">
        <header className="admin-topbar">
          <div>
            <p className="admin-eyebrow">{t('admin.dashboardTitle')}</p>
            <h1>{t('admin.dashboardTitle')}</h1>
            <p>{t('admin.activeSession', { name: session?.name || '' })}</p>
          </div>
          <LanguageSwitcher className="admin-topbar-language" />
          <div className="admin-actions-row">
            <button type="button" className="admin-secondary-button" onClick={() => navigate('/')}>
              {t('admin.viewSite')}
            </button>
            <button type="button" className="admin-danger-button" onClick={handleLogout}>
              {t('admin.logout')}
            </button>
          </div>
        </header>
        <div className="admin-tabs">
          <button type="button" className={activeTab === 'content' ? 'admin-tab active' : 'admin-tab'} onClick={() => setActiveTab('content')}>{t('admin.tabs.content')}</button>
          <button type="button" className={activeTab === 'users' ? 'admin-tab active' : 'admin-tab'} onClick={() => setActiveTab('users')}>{t('admin.tabs.users')}</button>
          <button type="button" className={activeTab === 'encounters' ? 'admin-tab active' : 'admin-tab'} onClick={() => setActiveTab('encounters')}>{t('admin.tabs.encounters')}</button>
          <button type="button" className={activeTab === 'physical' ? 'admin-tab active' : 'admin-tab'} onClick={() => setActiveTab('physical')}>{t('admin.tabs.physical')}</button>
        </div>
        {activeTab === 'content' ? <ContentEditor /> : null}
        {activeTab === 'users' ? <UsersEditor /> : null}
        {activeTab === 'encounters' ? <ReservationOrdersEditor /> : null}
        {activeTab === 'physical' ? <PhysicalOrdersEditor /> : null}
      </section>
    </main>
  )
}

