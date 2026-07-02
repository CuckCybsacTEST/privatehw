import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { parsePriceAmount } from '../../data/defaultCommerce'
import { defaultSiteContent, mergeSiteContent } from '../../data/defaultSiteContent'
import {
  deleteAdminEncuentrosModel,
  fetchAdminEncuentrosModels,
  saveAdminEncuentrosModel,
} from '../../lib/supabase'
import { useAppState } from '../../state/AppState'

function formatStatusLabel(status) {
  switch (status) {
    case 'published':
      return 'Publicado'
    case 'suspended':
      return 'Suspendido'
    default:
      return 'Borrador'
  }
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value))
}

function setByPath(source, path, value) {
  const next = deepClone(source)
  let cursor = next

  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index]

    if (cursor[key] === undefined || cursor[key] === null || typeof cursor[key] !== 'object') {
      cursor[key] = typeof path[index + 1] === 'number' ? [] : {}
    }

    cursor = cursor[key]
  }

  cursor[path[path.length - 1]] = value
  return next
}

function normalizeLines(text = '') {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function serializeSlides(slides = []) {
  return (Array.isArray(slides) ? slides : [])
    .map((slide) => String(slide?.src || slide?.image || slide || '').trim())
    .filter(Boolean)
    .join('\n')
}

function parseSlides(text = '') {
  return normalizeLines(text).map((src) => ({ src, caption: '' }))
}

function serializePaymentMethods(methods = []) {
  return (Array.isArray(methods) ? methods : [])
    .map((method) => `${String(method?.value || '').trim()} | ${String(method?.label || '').trim()}`)
    .filter((line) => line.trim() !== ' |')
    .join('\n')
}

function parsePaymentMethods(text = '') {
  return normalizeLines(text)
    .map((line) => {
      const [value, label] = line.split('|').map((part) => part.trim())
      return value ? { value, label: label || value } : null
    })
    .filter(Boolean)
}

function normalizeAvailabilityMode(value = '') {
  const mode = String(value || '').trim().toLowerCase()
  return mode === 'manual' || mode === 'custom' ? 'manual' : 'everyday'
}

function formatBookingModeLabel(mode = '') {
  return normalizeAvailabilityMode(mode) === 'manual' ? 'Fechas manuales' : 'Todos los dias'
}

function formatBookingSummary(booking = {}) {
  const mode = normalizeAvailabilityMode(booking.availabilityMode)
  const datesCount = Array.isArray(booking.availableDates) ? booking.availableDates.length : 0
  const dailyDays = Number.parseInt(booking.availableDays || '14', 10) || 14
  const priceLabel = booking.priceLabel || 'Sin precio'
  const advanceLabel = booking.advanceLabel || 'Sin adelanto'
  const discountValue = Number.parseFloat(String(booking.recordingDiscountPercent || '0').replace(',', '.')) || 0
  const discountLabel = discountValue > 0 ? `${discountValue}% grabacion` : 'Sin descuento'

  return [mode === 'manual' ? `${datesCount} fechas` : `Proximos ${dailyDays} dias`, priceLabel, advanceLabel, discountLabel]
}

function normalizeBookingForSave(booking = {}) {
  const availabilityMode = normalizeAvailabilityMode(booking.availabilityMode)
  const priceAmount = parsePriceAmount(booking.priceLabel || '')
  const fallbackPriceAmount = Number.parseInt(booking.priceAmount || '0', 10) || 0
  const advanceAmount = parsePriceAmount(booking.advanceLabel || '')
  const fallbackAdvanceAmount = Number.parseInt(booking.advanceAmount || '0', 10) || 0

  return {
    ...booking,
    availabilityMode,
    availableDays: Number.parseInt(booking.availableDays || '14', 10) || 14,
    availableDates: Array.isArray(booking.availableDates) ? booking.availableDates : [],
    priceAmount: Number.isFinite(priceAmount) && priceAmount > 0 ? priceAmount : fallbackPriceAmount,
    advanceAmount: Number.isFinite(advanceAmount) && advanceAmount > 0 ? advanceAmount : fallbackAdvanceAmount,
    recordingDiscountPercent:
      Number.parseFloat(String(booking.recordingDiscountPercent || '0').replace(',', '.')) || 0,
  }
}

function createDraftFromModel(model = null, fallbackContent = null) {
  const content = mergeSiteContent(model?.content || fallbackContent || defaultSiteContent)
  const slug = model?.slug || `modelo-${Date.now()}`

  return {
    existingSlug: model?.slug || '',
    slug,
    displayName: model?.displayName || '',
    status: model?.status || 'draft',
    sortOrder: String(model?.sortOrder ?? 0),
    content,
  }
}

function ModelCard({ model, onEdit, onDuplicate, onDelete, onToggleStatus, deletingSlug }) {
  const previewHref = `/encuentros/${encodeURIComponent(model.slug)}`
  const isPublished = model.status === 'published'
  const booking = model?.content?.encuentrosBooking || {}
  const bookingSummary = formatBookingSummary(booking)

  return (
    <article className="admin-user-card">
      <div className="admin-user-copy">
        <h3>{model.displayName || model.slug}</h3>
        <p className="admin-note">
          <strong>{model.slug}</strong> · {formatStatusLabel(model.status)} · orden {model.sortOrder ?? 0}
        </p>
        <p className="admin-note">
          URL publica: <Link to={previewHref}>{previewHref}</Link>
        </p>
        <div className="admin-user-metrics">
          <span>{formatBookingModeLabel(booking.availabilityMode)}</span>
          <span>{bookingSummary[0]}</span>
          <span>{bookingSummary[1]}</span>
          <span>{bookingSummary[2]}</span>
        </div>
        <p className="admin-note">{bookingSummary[3]}</p>
      </div>
      <div className="admin-actions-row">
        <button type="button" className="admin-secondary-button" onClick={() => onEdit(model)}>
          Editar
        </button>
        <button type="button" className="admin-secondary-button" onClick={() => onDuplicate(model)}>
          Clonar
        </button>
        <button
          type="button"
          className="admin-secondary-button"
          onClick={() => onToggleStatus(model, isPublished ? 'suspended' : 'published')}
        >
          {isPublished ? 'Suspender' : 'Publicar'}
        </button>
        <button
          type="button"
          className="admin-danger-button"
          onClick={() => onDelete(model)}
          disabled={deletingSlug === model.slug}
        >
          {deletingSlug === model.slug ? 'Eliminando...' : 'Eliminar'}
        </button>
      </div>
    </article>
  )
}

function SectionTitle({ eyebrow, title, description }) {
  return (
    <div className="admin-section-header">
      <div>
        <p className="admin-eyebrow">{eyebrow}</p>
        <h3>{title}</h3>
        {description ? <p className="admin-meta">{description}</p> : null}
      </div>
    </div>
  )
}

export function EncuentrosModelsManager() {
  const { session, siteContent } = useAppState()
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingSlug, setDeletingSlug] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [draft, setDraft] = useState(() => createDraftFromModel(null, mergeSiteContent(siteContent)))

  const content = draft.content || mergeSiteContent(defaultSiteContent)
  const booking = content.encuentrosBooking || {}
  const bookingAvailabilityMode = normalizeAvailabilityMode(booking.availabilityMode)
  const topSlidesText = useMemo(() => serializeSlides(content.topCarouselImages || []), [content.topCarouselImages])
  const bottomSlidesText = useMemo(() => serializeSlides(content.bottomCarouselImages || []), [content.bottomCarouselImages])
  const importantItemsText = useMemo(() => (content.importantItems || []).join('\n'), [content.importantItems])
  const presencialFeaturesText = useMemo(() => (content.presencialFeatures || []).join('\n'), [content.presencialFeatures])
  const extraItemsText = useMemo(() => (content.extraItems || []).join('\n'), [content.extraItems])
  const availableDatesText = useMemo(() => (booking.availableDates || []).join('\n'), [booking.availableDates])
  const paymentMethodsText = useMemo(() => serializePaymentMethods(booking.paymentMethods || []), [booking.paymentMethods])
  const counts = useMemo(
    () => ({
      top: Array.isArray(content.topCarouselImages) ? content.topCarouselImages.length : 0,
      bottom: Array.isArray(content.bottomCarouselImages) ? content.bottomCarouselImages.length : 0,
      services: Array.isArray(content.extraItems) ? content.extraItems.length : 0,
      dates: Array.isArray(booking.availableDates) ? booking.availableDates.length : 0,
    }),
    [booking.availableDates, content.bottomCarouselImages, content.extraItems, content.topCarouselImages],
  )

  async function refreshModels() {
    setLoading(true)
    setError('')

    try {
      const nextModels = await fetchAdminEncuentrosModels(session?.accessToken || '')
      setModels(Array.isArray(nextModels) ? nextModels : [])
    } catch (nextError) {
      setModels([])
      setError(nextError?.message || 'No se pudieron cargar los modelos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refreshModels()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken])

  function handleEdit(model) {
    setError('')
    setMessage('')
    setDraft(createDraftFromModel(model, mergeSiteContent(siteContent)))
  }

  function handleDuplicate(model) {
    setError('')
    setMessage('')
    const nextDraft = createDraftFromModel(model, mergeSiteContent(siteContent))
    nextDraft.existingSlug = ''
    nextDraft.slug = `${model.slug}-copia`
    nextDraft.displayName = `${model.displayName || model.slug} copia`
    setDraft(nextDraft)
  }

  function handleNew() {
    setError('')
    setMessage('')
    setDraft(createDraftFromModel(null, mergeSiteContent(siteContent)))
  }

  function updateDraft(path, value) {
    setDraft((current) => ({ ...current, content: setByPath(current.content, path, value) }))
  }

  function updateBooking(path, value) {
    updateDraft(['encuentrosBooking', ...path], value)
  }

  async function handleSave() {
    setError('')
    setMessage('')
    setSaving(true)

    try {
      const nextContent = mergeSiteContent({
        ...draft.content,
        encuentrosBooking: normalizeBookingForSave(draft.content?.encuentrosBooking || {}),
      })

      const savedModel = await saveAdminEncuentrosModel(
        {
          existingSlug: draft.existingSlug,
          slug: draft.slug,
          displayName: draft.displayName,
          status: draft.status,
          sortOrder: Number.parseInt(draft.sortOrder || '0', 10) || 0,
          content: nextContent,
        },
        session?.accessToken || '',
      )

      setDraft(createDraftFromModel(savedModel, mergeSiteContent(siteContent)))
      setMessage('Modelo guardado con exito.')
      await refreshModels()
    } catch (nextError) {
      setError(nextError?.message || 'No se pudo guardar el modelo.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleStatus(model, nextStatus) {
    setError('')
    setMessage('')

    try {
      const nextContent = mergeSiteContent({
        ...model.content,
        encuentrosBooking: normalizeBookingForSave(model.content?.encuentrosBooking || {}),
      })

      const savedModel = await saveAdminEncuentrosModel(
        {
          existingSlug: model.slug,
          slug: model.slug,
          displayName: model.displayName,
          status: nextStatus,
          sortOrder: model.sortOrder || 0,
          content: nextContent,
        },
        session?.accessToken || '',
      )

      setMessage(`Modelo ${formatStatusLabel(savedModel.status).toLowerCase()}.`)
      await refreshModels()
    } catch (nextError) {
      setError(nextError?.message || 'No se pudo cambiar el estado.')
    }
  }

  async function handleDelete(model) {
    const confirmed = window.confirm(
      `Eliminar "${model.displayName || model.slug}" borrara tambien su historial de reservas. Esta accion no se puede deshacer.`,
    )

    if (!confirmed) {
      return
    }

    setDeletingSlug(model.slug)
    setError('')
    setMessage('')

    try {
      await deleteAdminEncuentrosModel(model.slug, session?.accessToken || '')
      setMessage('Modelo eliminado y reservas asociadas borradas.')
      if (draft.existingSlug === model.slug) {
        setDraft(createDraftFromModel(null, mergeSiteContent(siteContent)))
      }
      await refreshModels()
    } catch (nextError) {
      setError(nextError?.message || 'No se pudo eliminar el modelo.')
    } finally {
      setDeletingSlug('')
    }
  }

  return (
    <section className="admin-panel-section">
      <SectionTitle
        eyebrow="Modelos de encuentros"
        title="Gestion publica, suspension y borrado"
        description="Cada modelo publica su propia URL, su propio modal y su propia configuracion."
      />

      <div className="admin-actions-row">
        <button type="button" className="admin-secondary-button" onClick={handleNew}>
          Nuevo modelo
        </button>
        <button type="button" className="admin-secondary-button" onClick={refreshModels}>
          Refrescar
        </button>
      </div>

      {error ? <p className="admin-error">{error}</p> : null}
      {message ? <p className="admin-success">{message}</p> : null}

      <div className="admin-users-layout">
        <div className="admin-users-list">
          {loading ? (
            <article className="admin-hint">
              <p>Cargando modelos...</p>
            </article>
          ) : models.length ? (
            models.map((model) => (
              <ModelCard
                key={model.id || model.slug}
                model={model}
                deletingSlug={deletingSlug}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onToggleStatus={handleToggleStatus}
              />
            ))
          ) : (
            <article className="admin-hint">
              <p>No hay modelos creados todavia.</p>
            </article>
          )}
        </div>

        <form
          className="admin-form admin-form-card"
          onSubmit={(event) => {
            event.preventDefault()
            void handleSave()
          }}
        >
          <SectionTitle
            eyebrow="Editor"
            title={draft.existingSlug ? 'Editar modelo' : 'Nuevo modelo'}
            description="Ajusta ficha, reserva, galeria y servicios sin tocar JSON."
          />

          <div className="admin-actions-row">
            <label className="admin-field">
              <span>Slug publico</span>
              <input
                value={draft.slug}
                onChange={(event) => setDraft((current) => ({ ...current, slug: event.target.value }))}
                placeholder="modelo-publico"
              />
            </label>

            <label className="admin-field">
              <span>Nombre visible</span>
              <input
                value={draft.displayName}
                onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))}
                placeholder="Modelo principal"
              />
            </label>
          </div>

          <div className="admin-actions-row">
            <label className="admin-field">
              <span>Estado</span>
              <select
                value={draft.status}
                onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}
              >
                <option value="draft">Borrador</option>
                <option value="published">Publicado</option>
                <option value="suspended">Suspendido</option>
              </select>
            </label>

            <label className="admin-field">
              <span>Orden</span>
              <input
                type="number"
                value={draft.sortOrder}
                onChange={(event) => setDraft((current) => ({ ...current, sortOrder: event.target.value }))}
              />
            </label>
          </div>

          <article className="admin-hint">
            <p>
              URL publica: <Link to={`/encuentros/${encodeURIComponent(draft.slug)}`}>/encuentros/{draft.slug}</Link>
            </p>
            <p>
              {counts.top} fotos arriba, {counts.bottom} fotos abajo, {counts.services} extras, {counts.dates} fechas.
            </p>
          </article>

          <SectionTitle
            eyebrow="Reserva por modelo"
            title="Fechas, precio y adelanto"
            description="Cada modelo maneja su propia agenda, su precio y su descuento por grabacion."
          />
          <div className="admin-grid">
            <label className="admin-field">
              <span>Disponibilidad</span>
              <select
                value={bookingAvailabilityMode}
                onChange={(event) => updateBooking(['availabilityMode'], event.target.value)}
              >
                <option value="everyday">Todos los dias</option>
                <option value="manual">Fechas manuales</option>
              </select>
            </label>
            <label className="admin-field">
              <span>Proximos dias</span>
              <input
                type="number"
                min="1"
                value={String(booking.availableDays || 14)}
                onChange={(event) =>
                  updateBooking(['availableDays'], Number.parseInt(event.target.value || '0', 10) || 14)
                }
                disabled={bookingAvailabilityMode === 'manual'}
              />
            </label>
            <label className="admin-field">
              <span>Horario inicio</span>
              <input
                value={booking.bookingStartTime || ''}
                onChange={(event) => updateBooking(['bookingStartTime'], event.target.value)}
              />
            </label>
            <label className="admin-field">
              <span>Horario fin</span>
              <input
                value={booking.bookingEndTime || ''}
                onChange={(event) => updateBooking(['bookingEndTime'], event.target.value)}
              />
            </label>
            <label className="admin-field">
              <span>Intervalo minutos</span>
              <input
                type="number"
                value={String(booking.slotIntervalMinutes || 60)}
                onChange={(event) =>
                  updateBooking(['slotIntervalMinutes'], Number.parseInt(event.target.value || '0', 10) || 60)
                }
              />
            </label>
            <label className="admin-field">
              <span>Precio presencial</span>
              <input
                value={content.presencialPrice || ''}
                onChange={(event) => updateDraft(['presencialPrice'], event.target.value)}
              />
            </label>
            <label className="admin-field">
              <span>Unidad presencial</span>
              <input
                value={content.presencialUnit || ''}
                onChange={(event) => updateDraft(['presencialUnit'], event.target.value)}
              />
            </label>
            <label className="admin-field">
              <span>Precio reserva</span>
              <input
                value={booking.priceLabel || ''}
                onChange={(event) => updateBooking(['priceLabel'], event.target.value)}
              />
            </label>
            <label className="admin-field">
              <span>Precio base</span>
              <input
                type="number"
                value={String(booking.priceAmount || 0)}
                onChange={(event) =>
                  updateBooking(['priceAmount'], Number.parseInt(event.target.value || '0', 10) || 0)
                }
              />
            </label>
            <label className="admin-field">
              <span>Adelanto</span>
              <input
                value={booking.advanceLabel || ''}
                onChange={(event) => updateBooking(['advanceLabel'], event.target.value)}
              />
            </label>
            <label className="admin-field">
              <span>Adelanto base</span>
              <input
                type="number"
                value={String(booking.advanceAmount || 0)}
                onChange={(event) =>
                  updateBooking(['advanceAmount'], Number.parseInt(event.target.value || '0', 10) || 0)
                }
              />
            </label>
            <label className="admin-field">
              <span>Descuento grabacion %</span>
              <input
                type="number"
                value={String(booking.recordingDiscountPercent || 0)}
                onChange={(event) =>
                  updateBooking(
                    ['recordingDiscountPercent'],
                    Math.min(Math.max(Number.parseInt(event.target.value || '0', 10) || 0, 0), 100),
                  )
                }
              />
            </label>
            <label className="admin-field admin-field-full">
              <span>Fechas disponibles</span>
              <textarea
                rows={4}
                value={availableDatesText}
                onChange={(event) => updateBooking(['availableDates'], normalizeLines(event.target.value))}
                disabled={bookingAvailabilityMode === 'everyday'}
                placeholder={
                  bookingAvailabilityMode === 'manual'
                    ? '2026-07-05\n2026-07-06\n2026-07-07'
                    : 'Se usa el modo diario'
                }
              />
            </label>
            <label className="admin-field">
              <span>Etiqueta descuento</span>
              <input
                value={booking.recordingDiscountLabel || ''}
                onChange={(event) => updateBooking(['recordingDiscountLabel'], event.target.value)}
              />
            </label>
            <label className="admin-field">
              <span>Titulo grabacion</span>
              <input
                value={booking.recordingPromptTitle || ''}
                onChange={(event) => updateBooking(['recordingPromptTitle'], event.target.value)}
              />
            </label>
            <label className="admin-field admin-field-full">
              <span>Descripcion grabacion</span>
              <textarea
                rows={3}
                value={booking.recordingPromptDescription || ''}
                onChange={(event) => updateBooking(['recordingPromptDescription'], event.target.value)}
              />
            </label>
            <label className="admin-field">
              <span>Grabacion SI</span>
              <input
                value={booking.recordingYesLabel || ''}
                onChange={(event) => updateBooking(['recordingYesLabel'], event.target.value)}
              />
            </label>
            <label className="admin-field">
              <span>Grabacion NO</span>
              <input
                value={booking.recordingNoLabel || ''}
                onChange={(event) => updateBooking(['recordingNoLabel'], event.target.value)}
              />
            </label>
            <label className="admin-field">
              <span>Titulo reserva</span>
              <input
                value={booking.title || ''}
                onChange={(event) => updateBooking(['title'], event.target.value)}
              />
            </label>
            <label className="admin-field admin-field-full">
              <span>Descripcion reserva</span>
              <textarea
                rows={4}
                value={booking.description || ''}
                onChange={(event) => updateBooking(['description'], event.target.value)}
              />
            </label>
            <label className="admin-field">
              <span>Titulo galeria</span>
              <input
                value={booking.galleryTitle || ''}
                onChange={(event) => updateBooking(['galleryTitle'], event.target.value)}
              />
            </label>
            <label className="admin-field">
              <span>Subtitulo galeria</span>
              <input
                value={booking.gallerySubtitle || ''}
                onChange={(event) => updateBooking(['gallerySubtitle'], event.target.value)}
              />
            </label>
            <label className="admin-field">
              <span>Titulo exclusivo</span>
              <input
                value={booking.galleryExclusiveTitle || ''}
                onChange={(event) => updateBooking(['galleryExclusiveTitle'], event.target.value)}
              />
            </label>
            <label className="admin-field admin-field-full">
              <span>Descripcion exclusivo</span>
              <textarea
                rows={3}
                value={booking.galleryExclusiveDescription || ''}
                onChange={(event) => updateBooking(['galleryExclusiveDescription'], event.target.value)}
              />
            </label>
            <label className="admin-field admin-field-full">
              <span>Hint exclusivo</span>
              <textarea
                rows={3}
                value={booking.galleryExclusiveHint || ''}
                onChange={(event) => updateBooking(['galleryExclusiveHint'], event.target.value)}
              />
            </label>
            <label className="admin-field admin-field-full">
              <span>Payment methods</span>
              <textarea
                rows={4}
                value={paymentMethodsText}
                onChange={(event) => updateBooking(['paymentMethods'], parsePaymentMethods(event.target.value))}
              />
            </label>
          </div>

          <SectionTitle eyebrow="Ficha" title="Hero y encabezado" />
          <div className="admin-grid">
            <label className="admin-field">
              <span>Top bar desktop</span>
              <input
                value={content.topBarDesktopHighlight || ''}
                onChange={(event) => updateDraft(['topBarDesktopHighlight'], event.target.value)}
              />
            </label>
            <label className="admin-field">
              <span>Top bar mobile</span>
              <input
                value={content.topBarMobile || ''}
                onChange={(event) => updateDraft(['topBarMobile'], event.target.value)}
              />
            </label>
            <label className="admin-field">
              <span>Titulo hero</span>
              <input
                value={content.heroTitle || ''}
                onChange={(event) => updateDraft(['heroTitle'], event.target.value)}
              />
            </label>
            <label className="admin-field">
              <span>Subtitulo hero</span>
              <input
                value={content.heroSubtitle || ''}
                onChange={(event) => updateDraft(['heroSubtitle'], event.target.value)}
              />
            </label>
            <label className="admin-field admin-field-full">
              <span>Descripcion hero</span>
              <textarea
                rows={4}
                value={content.heroDescription || ''}
                onChange={(event) => updateDraft(['heroDescription'], event.target.value)}
              />
            </label>
          </div>

          <SectionTitle eyebrow="Galeria" title="Carousels" />
          <div className="admin-grid">
            <label className="admin-field admin-field-full">
              <span>Fotos hero arriba</span>
              <textarea
                rows={5}
                value={topSlidesText}
                onChange={(event) => updateDraft(['topCarouselImages'], parseSlides(event.target.value))}
              />
            </label>
            <label className="admin-field admin-field-full">
              <span>Fotos hero abajo</span>
              <textarea
                rows={5}
                value={bottomSlidesText}
                onChange={(event) => updateDraft(['bottomCarouselImages'], parseSlides(event.target.value))}
              />
            </label>
          </div>

          <SectionTitle eyebrow="Servicios" title="Extras y contacto" />
          <div className="admin-grid">
            <label className="admin-field">
              <span>Titulo extras</span>
              <input
                value={content.extraTitle || ''}
                onChange={(event) => updateDraft(['extraTitle'], event.target.value)}
              />
            </label>
            <label className="admin-field">
              <span>Lead extras</span>
              <input
                value={content.extraLead || ''}
                onChange={(event) => updateDraft(['extraLead'], event.target.value)}
              />
            </label>
            <label className="admin-field">
              <span>Desde label</span>
              <input
                value={content.extraFromLabel || ''}
                onChange={(event) => updateDraft(['extraFromLabel'], event.target.value)}
              />
            </label>
            <label className="admin-field">
              <span>Precio extra</span>
              <input
                value={content.extraPrice || ''}
                onChange={(event) => updateDraft(['extraPrice'], event.target.value)}
              />
            </label>
            <label className="admin-field admin-field-full">
              <span>Lista de extras</span>
              <textarea
                rows={4}
                value={extraItemsText}
                onChange={(event) => updateDraft(['extraItems'], normalizeLines(event.target.value))}
              />
            </label>
            <label className="admin-field admin-field-full">
              <span>Features presenciales</span>
              <textarea
                rows={4}
                value={presencialFeaturesText}
                onChange={(event) => updateDraft(['presencialFeatures'], normalizeLines(event.target.value))}
              />
            </label>
            <label className="admin-field admin-field-full">
              <span>Items importantes</span>
              <textarea
                rows={5}
                value={importantItemsText}
                onChange={(event) => updateDraft(['importantItems'], normalizeLines(event.target.value))}
              />
            </label>
            <label className="admin-field">
              <span>Fan card description</span>
              <textarea
                rows={4}
                value={content.fanCardDescription || ''}
                onChange={(event) => updateDraft(['fanCardDescription'], event.target.value)}
              />
            </label>
            <label className="admin-field">
              <span>Telegram title</span>
              <input
                value={content.socialTitle || ''}
                onChange={(event) => updateDraft(['socialTitle'], event.target.value)}
              />
            </label>
            <label className="admin-field">
              <span>Telegram URL</span>
              <input
                value={content.socialUrl || ''}
                onChange={(event) => updateDraft(['socialUrl'], event.target.value)}
              />
            </label>
            <label className="admin-field">
              <span>WhatsApp URL</span>
              <input
                value={content.whatsappUrl || ''}
                onChange={(event) => updateDraft(['whatsappUrl'], event.target.value)}
              />
            </label>
            <label className="admin-field admin-field-full">
              <span>Footer</span>
              <textarea
                rows={3}
                value={content.footerText || ''}
                onChange={(event) => updateDraft(['footerText'], event.target.value)}
              />
            </label>
          </div>

          <div className="admin-hint">
            <p>
              Esta vista deja el modelo listo para publicar, suspender, editar o borrar sin tocar JSON manual.
            </p>
          </div>

          <div className="admin-actions-row">
            <button type="button" className="admin-secondary-button" onClick={handleNew}>
              Limpiar
            </button>
            <button type="submit" className="admin-primary-button" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar modelo'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
