import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { parsePriceAmount } from '../../data/defaultCommerce'
import { defaultSiteContent, mergeSiteContent } from '../../data/defaultSiteContent'
import {
  deleteAdminEncuentrosModel,
  fetchAdminEncuentrosModels,
  fetchAdminEncuentrosModelRequests,
  saveAdminEncuentrosModel,
  updateAdminEncuentrosModelRequest,
} from '../../lib/supabase'
import {
  SOCIAL_NETWORK_OPTIONS,
  buildWhatsAppChatUrl,
  extractWhatsAppPhoneFromUrl,
  getSocialNetworkOption,
  normalizeSocialNetworkValue,
} from '../../utils/socialNetworks'
import {
  ENCUENTROS_BODY_TYPE_OPTIONS,
  ENCUENTROS_HAIR_COLOR_OPTIONS,
  ENCUENTROS_HAIR_TYPE_OPTIONS,
} from '../../utils/encuentrosPhysicalTraits'
import { useAppState } from '../../state/AppState'

const AGE_OPTIONS = Array.from({ length: 53 }, (_, index) => String(index + 18))
const NATIONALITY_OPTIONS = [
  'Peruana',
  'Colombiana',
  'Argentina',
  'Chilena',
  'Boliviana',
  'Ecuatoriana',
  'Venezolana',
  'Mexicana',
  'Brasilena',
  'Otra',
]
const PERU_CITY_OPTIONS = [
  'Arequipa',
  'Ayacucho',
  'Cajamarca',
  'Callao',
  'Cerro de Pasco',
  'Chachapoyas',
  'Chiclayo',
  'Cusco',
  'Huancayo',
  'Huanuco',
  'Huaraz',
  'Ica',
  'Iquitos',
  'Lima',
  'Moyobamba',
  'Moquegua',
  'Piura',
  'Pucallpa',
  'Puno',
  'Sullana',
  'Tacna',
  'Tarapoto',
  'Trujillo',
  'Tumbes',
]
const PRESENCIAL_UNIT_OPTIONS = ['hora', 'noche', 'sesion']
const ATTENDANCE_MODE_OPTIONS = ['Hoteles', 'A domicilio', 'Cuarto propio', 'Auto']
const TIME_OPTIONS = Array.from({ length: 24 }, (_, index) => {
  const hours = String(index).padStart(2, '0')
  return [`${hours}:00`, `${hours}:30`]
}).flat()
const INTERVAL_OPTIONS = [15, 30, 45, 60, 90, 120]
const EXTRA_OPTIONS_PLACEHOLDER = ['Extra 1', 'Extra 2', 'Extra 3', 'Extra 4', 'Extra 5']
const PRESENCIAL_FEATURE_OPTIONS_PLACEHOLDER = [
  'Feature presencial 1',
  'Feature presencial 2',
  'Feature presencial 3',
  'Feature presencial 4',
]
const RELATIONSHIP_STATUS_OPTIONS = ['Soltera', 'Casada', 'Con novio', 'Con esposo', 'Divorciada', 'Otra']
const BODY_HAIR_OPTIONS = ['Sin vello', 'Vello suave', 'Vello visible', 'Vello abundante']
const MAX_VOICE_AUDIO_BYTES = 10 * 1024 * 1024
const MAX_AVATAR_BYTES = 8 * 1024 * 1024
const BLANK_MODEL_DEFAULTS = {
  heroTitle: '',
  heroSubtitle: '',
  topBarDesktopHighlight: '',
  topBarMobile: '',
  fanCardDescription: '',
  importantItems: [],
  extraLead: '',
  extraFromLabel: 'desde',
  socialTitle: '',
  socialUrl: '',
  profileAvatarUrl: '',
  profileHeightCm: '',
  profileBodyHair: '',
  profileHairColor: '',
  profileBodyType: '',
  profileHairType: '',
  profileAttendanceModes: [],
  whatsappPhone: '',
  whatsappUrl: '',
}

function formatFileSize(bytes = 0) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 MB'
  }

  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 1024 * 1024 ? 1 : 2)} MB`
}

function normalizeBooleanValue(value) {
  return value === true || value === 'true' || value === '1' || value === 1 || value === 'yes'
}

function getSelectableAge(value = '') {
  const age = String(value || '').trim()
  return age && AGE_OPTIONS.includes(age) ? age : ''
}

function getPeruCityOptions() {
  return PERU_CITY_OPTIONS
}

function formatHeightLabel(value = '') {
  const height = Number.parseInt(String(value || '').replace(/[^\d]/g, ''), 10)

  if (!Number.isFinite(height) || height <= 0) {
    return ''
  }

  return `${(height / 100).toFixed(2)} m`
}

function VoiceAudioField({
  value,
  onUrlChange,
  uploadManagedMedia,
  onNotice,
  onError,
}) {
  const fileInputRef = useRef(null)
  const streamRef = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const [isRecording, setIsRecording] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(
    () => () => {
      recorderRef.current?.stop?.()
      streamRef.current?.getTracks?.().forEach((track) => track.stop())
    },
    [],
  )

  async function uploadAudioFile(file) {
    if (!file) return

    if (!file.type.startsWith('audio/')) {
      onError('Selecciona un archivo de audio valido.')
      return
    }

    if (file.size > MAX_VOICE_AUDIO_BYTES) {
      onError(`El audio supera el limite de ${formatFileSize(MAX_VOICE_AUDIO_BYTES)}.`)
      return
    }

    if (!uploadManagedMedia) {
      onError('No hay soporte de subida disponible en esta sesion.')
      return
    }

    setIsUploading(true)
    setStatus('Subiendo audio...')

    try {
      const uploaded = await uploadManagedMedia(file, 'site-images', 'encuentros/voice')

      if (!uploaded?.publicUrl) {
        throw new Error('No se pudo obtener la URL publica del audio.')
      }

      onUrlChange(uploaded.publicUrl)
      onNotice('Audio actualizado con exito.')
      setStatus('Audio cargado.')
    } catch (error) {
      onError(error?.message || 'No se pudo subir el audio.')
      setStatus('')
    } finally {
      setIsUploading(false)
    }
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    await uploadAudioFile(file)
  }

  async function startRecording() {
    if (!navigator?.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      onError('Este navegador no permite grabar audio.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      streamRef.current = stream
      recorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        const file = new File([blob], `encuentros-voice-${Date.now()}.webm`, {
          type: blob.type || 'audio/webm',
        })

        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        recorderRef.current = null
        setIsRecording(false)

        await uploadAudioFile(file)
      }

      recorder.start()
      setIsRecording(true)
      setStatus('Grabando audio...')
      onNotice('Grabacion iniciada.')
    } catch (error) {
      onError(error?.message || 'No se pudo iniciar la grabacion.')
      setIsRecording(false)
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
      setStatus('Procesando grabacion...')
    }
  }

  return (
    <div className="admin-field admin-field-full">
      <div className="admin-actions-row">
        <button type="button" className="admin-secondary-button" onClick={() => fileInputRef.current?.click?.()} disabled={isUploading || isRecording}>
          Subir audio
        </button>
        <button
          type="button"
          className="admin-secondary-button"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isUploading}
        >
          {isRecording ? 'Detener grabacion' : 'Grabar audio'}
        </button>
        <input ref={fileInputRef} type="file" accept="audio/*" hidden onChange={handleFileChange} />
      </div>
      <p className="admin-meta">Limite maximo: {formatFileSize(MAX_VOICE_AUDIO_BYTES)}.</p>
      {value ? <audio controls preload="none" src={value} className="encuentros-admin-audio-preview" /> : null}
      {status ? <p className="admin-meta">{status}</p> : null}
    </div>
  )
}

function ProfileAvatarField({
  value,
  uploadManagedMedia,
  onUrlChange,
  onNotice,
  onError,
}) {
  const fileInputRef = useRef(null)
  const [isUploading, setIsUploading] = useState(false)
  const [status, setStatus] = useState('')

  async function uploadAvatarFile(file) {
    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      onError('Selecciona una imagen valida.')
      return
    }

    if (file.size > MAX_AVATAR_BYTES) {
      onError(`La foto supera el limite de ${formatFileSize(MAX_AVATAR_BYTES)}.`)
      return
    }

    if (!uploadManagedMedia) {
      onError('No hay soporte de subida disponible en esta sesion.')
      return
    }

    setIsUploading(true)
    setStatus('Subiendo foto de perfil...')

    try {
      const uploaded = await uploadManagedMedia(file, 'site-images', 'encuentros/avatar')

      if (!uploaded?.publicUrl) {
        throw new Error('No se pudo obtener la URL publica de la foto.')
      }

      onUrlChange(uploaded.publicUrl)
      onNotice('Foto de perfil actualizada con exito.')
      setStatus('Foto cargada.')
    } catch (error) {
      onError(error?.message || 'No se pudo subir la foto.')
      setStatus('')
    } finally {
      setIsUploading(false)
    }
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    await uploadAvatarFile(file)
  }

  return (
    <div className="admin-field admin-field-full">
      <span>Foto de perfil</span>
      <p className="admin-meta">Se muestra centrada y recortada al medio en la UI publica.</p>
      <div className="admin-avatar-upload-shell">
        <div className="admin-avatar-preview-frame">
          {value ? (
            <img src={value} alt="Vista previa foto de perfil" className="admin-avatar-preview-image" />
          ) : (
            <div className="admin-avatar-preview-placeholder">Sin foto</div>
          )}
        </div>
        <div className="admin-actions-row">
          <button
            type="button"
            className="admin-secondary-button"
            onClick={() => fileInputRef.current?.click?.()}
            disabled={isUploading}
          >
            {isUploading ? 'Subiendo...' : 'Subir foto'}
          </button>
          {value ? (
            <button type="button" className="admin-secondary-button" onClick={() => onUrlChange('')} disabled={isUploading}>
              Quitar
            </button>
          ) : null}
        </div>
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
      {status ? <p className="admin-meta">{status}</p> : null}
    </div>
  )
}

function formatStatusLabel(status) {
  switch (status) {
    case 'published':
      return 'Publicado'
    case 'suspended':
      return 'Suspendido'
    default:
      return 'En revisión'
  }
}

function formatRequestStatusLabel(status) {
  switch (String(status || '').trim()) {
    case 'approved':
      return 'Aprobada'
    case 'rejected':
      return 'Rechazada'
    case 'suspended':
      return 'Suspendida'
    case 'observed':
      return 'Observada'
    default:
      return 'Pendiente'
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

function normalizeGallerySlides(slides = []) {
  return (Array.isArray(slides) ? slides : [])
    .map((slide) => {
      const src = String(slide?.src || slide?.image || slide?.url || slide || '').trim()
      const caption = String(slide?.caption || '').trim()

      return src ? { src, caption } : null
    })
    .filter(Boolean)
}

function getModelGallerySlides(content = {}) {
  const topSlides = normalizeGallerySlides(content.topCarouselImages || [])

  if (topSlides.length) {
    return topSlides
  }

  return normalizeGallerySlides(content.bottomCarouselImages || [])
}

function normalizeStringList(values = []) {
  return Array.from(new Set((Array.isArray(values) ? values : []).map((value) => String(value || '').trim()).filter(Boolean)))
}

function serializeSocialLinks(links = []) {
  return (Array.isArray(links) ? links : [])
    .map((link) => `${String(link?.network || '').trim()} | ${String(link?.url || '').trim()}`)
    .filter((line) => line.trim() !== ' |')
    .join('\n')
}

function parseSocialLinks(text = '') {
  return normalizeLines(text)
    .map((line) => {
      const [network, url] = line.split('|').map((part) => part.trim())
      return network && url ? { network, label: network, url } : null
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

function formatBookingSummary(booking = {}, recordsEncounters = false) {
  const mode = normalizeAvailabilityMode(booking.availabilityMode)
  const datesCount = Array.isArray(booking.availableDates) ? booking.availableDates.length : 0
  const dailyDays = Number.parseInt(booking.availableDays || '14', 10) || 14
  const advanceLabel = booking.advanceLabel || 'Sin adelanto'
  const discountValue = Number.parseFloat(String(booking.recordingDiscountPercent || '0').replace(',', '.')) || 0
  const membershipEnabled = Boolean(booking.membershipDiscountEnabled)
  const membershipDiscountValue =
    Number.parseFloat(String(booking.membershipDiscountPercent || '0').replace(',', '.')) || 0
  const membershipNetwork = getSocialNetworkOption(booking.membershipDiscountNetwork || '').label

  const discountLabel =
    recordsEncounters && discountValue > 0 ? `${discountValue}% grabacion` : 'Sin grabacion'
  const membershipLabel =
    membershipEnabled && membershipDiscountValue > 0
      ? `${membershipDiscountValue}% ${membershipNetwork}`
      : 'Sin membresia'

  return [
    mode === 'manual' ? `${datesCount} fechas` : `Proximos ${dailyDays} dias`,
    advanceLabel,
    discountLabel,
    membershipLabel,
  ]
}

function normalizeBookingForSave(booking = {}, { recordsEncounters = false } = {}) {
  const availabilityMode = normalizeAvailabilityMode(booking.availabilityMode)
  const priceAmount = parsePriceAmount(booking.priceLabel || '')
  const fallbackPriceAmount = Number.parseInt(booking.priceAmount || '0', 10) || 0
  const advanceAmount = parsePriceAmount(booking.advanceLabel || '')
  const fallbackAdvanceAmount = Number.parseInt(booking.advanceAmount || '0', 10) || 0
  const recordingDiscountPercent =
    recordsEncounters
      ? Number.parseFloat(String(booking.recordingDiscountPercent || '0').replace(',', '.')) || 0
      : 0
  const membershipDiscountEnabled = Boolean(booking.membershipDiscountEnabled)
  const membershipDiscountPercent =
    membershipDiscountEnabled
      ? Number.parseFloat(String(booking.membershipDiscountPercent || '0').replace(',', '.')) || 0
      : 0

  return {
    ...booking,
    availabilityMode,
    availableDays: Number.parseInt(booking.availableDays || '14', 10) || 14,
    availableDates: Array.isArray(booking.availableDates) ? booking.availableDates : [],
    priceAmount: Number.isFinite(priceAmount) && priceAmount > 0 ? priceAmount : fallbackPriceAmount,
    advanceAmount: Number.isFinite(advanceAmount) && advanceAmount > 0 ? advanceAmount : fallbackAdvanceAmount,
    recordingDiscountPercent,
    membershipDiscountEnabled,
    membershipDiscountNetwork: membershipDiscountEnabled
      ? normalizeSocialNetworkValue(booking.membershipDiscountNetwork || '')
      : '',
    membershipDiscountPercent,
    membershipDiscountLabel: membershipDiscountEnabled
      ? String(booking.membershipDiscountLabel || '').trim()
      : '',
  }
}

function createDraftFromModel(model = null, fallbackContent = null) {
  const content = mergeSiteContent(model?.content || fallbackContent || defaultSiteContent)
  const slug = model?.slug || ''
  const nextContent = !model
    ? {
        ...content,
        ...BLANK_MODEL_DEFAULTS,
      }
    : {
        ...content,
        encuentrosExtraOptions:
          fallbackContent?.encuentrosExtraOptions || content.encuentrosExtraOptions || EXTRA_OPTIONS_PLACEHOLDER,
        encuentrosPresencialFeatureOptions:
          fallbackContent?.encuentrosPresencialFeatureOptions ||
          content.encuentrosPresencialFeatureOptions ||
          PRESENCIAL_FEATURE_OPTIONS_PLACEHOLDER,
        whatsappPhone:
          content.whatsappPhone ||
          extractWhatsAppPhoneFromUrl(content.whatsappUrl || '') ||
          '',
      }

  return {
    existingSlug: model?.slug || '',
    slug,
    displayName: model?.displayName || '',
    status: model?.status || 'draft',
    sortOrder: String(model?.sortOrder ?? 0),
    content: nextContent,
  }
}

function ModelCard({ model, onEdit, onDuplicate, onDelete, onToggleStatus, deletingSlug }) {
  const previewHref = `/encuentros/${encodeURIComponent(model.slug)}`
  const isPublished = model.status === 'published'
  const requestSource = String(model?.content?.requestSource || '').trim()
  const requestContactName = String(model?.content?.requestContactName || model?.content?.contactName || '').trim()
  const requestEmail = String(model?.content?.requestEmail || model?.content?.contactEmail || '').trim()
  const requestCity = String(model?.content?.requestCity || model?.content?.profileCity || '').trim()
  const recordsEncounters = normalizeBooleanValue(model?.content?.recordsEncounters)
  const relationshipStatus = String(model?.content?.profileRelationshipStatus || '').trim()
  const heightCm = String(model?.content?.profileHeightCm || '').trim()
  const bodyHair = String(model?.content?.profileBodyHair || '').trim()
  const hairColor = String(model?.content?.profileHairColor || '').trim()
  const bodyType = String(model?.content?.profileBodyType || '').trim()
  const hairType = String(model?.content?.profileHairType || '').trim()
  const booking = model?.content?.encuentrosBooking || {}
  const bookingSummary = formatBookingSummary(booking, recordsEncounters)

  return (
    <article className="admin-user-card">
      <div className="admin-user-copy">
        <h3>{model.displayName || model.slug}</h3>
        <p className="admin-note">
          <strong>{model.slug}</strong> · {formatStatusLabel(model.status)}
        </p>
        {requestSource === 'self-register' ? (
          <p className="admin-note">
            Solicitud recibida
            {requestContactName ? ` · ${requestContactName}` : ''}
            {requestEmail ? ` · ${requestEmail}` : ''}
            {requestCity ? ` · ${requestCity}` : ''}
            {hairColor ? ` · ${hairColor}` : ''}
            {bodyType ? ` · ${bodyType}` : ''}
            {hairType ? ` · ${hairType}` : ''}
          </p>
        ) : null}
        <p className="admin-note">
          URL publica: <Link to={previewHref}>{previewHref}</Link>
        </p>
        <div className="admin-user-metrics">
          <span>{formatBookingModeLabel(booking.availabilityMode)}</span>
          <span>{recordsEncounters ? 'Graba' : 'No graba'}</span>
          <span>{relationshipStatus || 'Sin estado'}</span>
          <span>{heightCm ? formatHeightLabel(heightCm) || `${heightCm} cm` : 'Sin dato'}</span>
          <span>{hairColor || 'Color sin dato'}</span>
          <span>{bodyType || 'Tipo sin dato'}</span>
          <span>{hairType || 'Cabello sin dato'}</span>
          <span>{bodyHair || 'Sin dato'}</span>
          <span>{bookingSummary[0]}</span>
          <span>{bookingSummary[1]}</span>
        </div>
        <p className="admin-note">{bookingSummary[2]} · {bookingSummary[3]}</p>
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

function RequestCard({ request, linkedModel, onAction, busyId }) {
  const isBusy = busyId === request.id
  const previewUrl = String(request.verificationPhotoUrl || '').trim()
  const subtitle = [
    request.email,
    request.city,
    request.nationality,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' · ')

  return (
    <article className="admin-request-card">
      <div className="admin-request-photo">
        {previewUrl ? (
          <img src={previewUrl} alt={`Foto de verificacion de ${request.displayName || request.email || 'solicitud'}`} />
        ) : (
          <div className="admin-request-photo-placeholder">Sin foto</div>
        )}
      </div>

      <div className="admin-request-copy">
        <div className="admin-request-header">
          <div>
            <h3>{request.displayName || request.email || request.id}</h3>
            <p className="admin-note">
              <strong>{formatRequestStatusLabel(request.status)}</strong>
              {subtitle ? ` · ${subtitle}` : ''}
            </p>
          </div>
          <span className={`admin-request-badge is-${String(request.status || 'pending')}`}>
            {formatRequestStatusLabel(request.status)}
          </span>
        </div>

        <p className="admin-note">
          Telegram: {request.telegram || 'No indicado'} · Tel: {request.phone || 'No indicado'}
        </p>
        <p className="admin-note">
          Cabello: {request.hairColor || 'No indicado'} · Cuerpo: {request.bodyType || 'No indicado'} · Tipo: {request.hairType || 'No indicado'}
        </p>
        <p className="admin-note">{request.bio || 'Sin presentacion.'}</p>
        {request.notes ? <p className="admin-note">Notas: {request.notes}</p> : null}
        <p className="admin-note">
          Revisado: {request.reviewedAt ? new Date(request.reviewedAt).toLocaleString() : 'Pendiente'}
        </p>
        {linkedModel ? (
          <p className="admin-note">
            Modelo vinculado: <Link to={`/encuentros/${encodeURIComponent(linkedModel.slug)}`}>{linkedModel.slug}</Link>
          </p>
        ) : null}

        <div className="admin-actions-row">
          <button
            type="button"
            className="admin-secondary-button"
            onClick={() => onAction(request, 'approved')}
            disabled={isBusy}
          >
            {isBusy ? 'Procesando...' : 'Aprobar'}
          </button>
          <button
            type="button"
            className="admin-secondary-button"
            onClick={() => onAction(request, 'observed')}
            disabled={isBusy}
          >
            Observar
          </button>
          <button
            type="button"
            className="admin-secondary-button"
            onClick={() => onAction(request, 'suspended')}
            disabled={isBusy}
          >
            Suspender
          </button>
          <button
            type="button"
            className="admin-danger-button"
            onClick={() => onAction(request, 'rejected')}
            disabled={isBusy}
          >
            Rechazar
          </button>
        </div>
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
  const { session, siteContent, uploadManagedMedia } = useAppState()
  const [models, setModels] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [requestsLoading, setRequestsLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingSlug, setDeletingSlug] = useState('')
  const [requestActionId, setRequestActionId] = useState('')
  const [activeModelsTab, setActiveModelsTab] = useState('models')
  const [requestStatusFilter, setRequestStatusFilter] = useState('all')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [galleryUploading, setGalleryUploading] = useState(false)
  const [draft, setDraft] = useState(() => createDraftFromModel(null, mergeSiteContent(siteContent)))

  const content = draft.content || mergeSiteContent(defaultSiteContent)
  const booking = content.encuentrosBooking || {}
  const bookingAvailabilityMode = normalizeAvailabilityMode(booking.availabilityMode)
  const availableDates = Array.isArray(booking.availableDates) ? booking.availableDates : []
  const socialLinks = Array.isArray(content.socialLinks) ? content.socialLinks : []
  const selectedCity = String(content.profileCity || '').trim()
  const selectedNationality = String(content.profileNationality || '').trim()
  const selectedAttendanceModes = useMemo(
    () => normalizeStringList(content.profileAttendanceModes || []),
    [content.profileAttendanceModes],
  )
  const gallerySlides = useMemo(
    () => getModelGallerySlides(content),
    [content.bottomCarouselImages, content.topCarouselImages],
  )
  const requestCounts = useMemo(
    () =>
      requests.reduce(
        (accumulator, request) => {
          const status = String(request?.status || 'pending')
          accumulator.all += 1
          if (status in accumulator) {
            accumulator[status] += 1
          }
          return accumulator
        },
        {
          all: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          suspended: 0,
          observed: 0,
        },
      ),
    [requests],
  )
  const requestModelMap = useMemo(
    () => new Map(models.map((model) => [String(model.id || '').trim(), model])),
    [models],
  )
  const filteredRequests = useMemo(
    () =>
      requestStatusFilter === 'all'
        ? requests
        : requests.filter((request) => String(request?.status || 'pending') === requestStatusFilter),
    [requestStatusFilter, requests],
  )
  const selectedPresencialFeatures = useMemo(
    () => normalizeStringList(content.presencialFeatures || []),
    [content.presencialFeatures],
  )
  const selectedExtraItems = useMemo(
    () => normalizeStringList(content.extraItems || []),
    [content.extraItems],
  )
  const globalExtraOptions = useMemo(
    () => normalizeStringList(siteContent.encuentrosExtraOptions || EXTRA_OPTIONS_PLACEHOLDER),
    [siteContent.encuentrosExtraOptions],
  )
  const globalPresencialFeatureOptions = useMemo(
    () =>
      normalizeStringList(
        siteContent.encuentrosPresencialFeatureOptions || PRESENCIAL_FEATURE_OPTIONS_PLACEHOLDER,
      ),
    [siteContent.encuentrosPresencialFeatureOptions],
  )
  const extraOptions = useMemo(
    () =>
      normalizeStringList([
        ...globalExtraOptions,
        ...selectedExtraItems,
      ]),
    [globalExtraOptions, selectedExtraItems],
  )
  const presencialFeatureOptions = useMemo(
    () =>
      normalizeStringList([
        ...globalPresencialFeatureOptions,
        ...selectedPresencialFeatures,
      ]),
    [globalPresencialFeatureOptions, selectedPresencialFeatures],
  )
  const counts = useMemo(
    () => ({
      photos: gallerySlides.length,
      services: selectedExtraItems.length,
      dates: Array.isArray(booking.availableDates) ? booking.availableDates.length : 0,
      socials: socialLinks.length,
    }),
    [booking.availableDates, gallerySlides.length, selectedExtraItems.length, socialLinks.length],
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

  async function refreshRequests() {
    setRequestsLoading(true)
    setError('')

    try {
      const nextRequests = await fetchAdminEncuentrosModelRequests(session?.accessToken || '')
      setRequests(Array.isArray(nextRequests) ? nextRequests : [])
    } catch (nextError) {
      setRequests([])
      setError(nextError?.message || 'No se pudieron cargar las solicitudes.')
    } finally {
      setRequestsLoading(false)
    }
  }

  useEffect(() => {
    void Promise.all([refreshModels(), refreshRequests()])
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

  function toggleContentListItem(field, value) {
    const normalizedValue = String(value || '').trim()

    if (!normalizedValue) {
      return
    }

    setDraft((current) => {
      const currentList = normalizeStringList(current.content?.[field] || [])
      const nextList = currentList.includes(normalizedValue)
        ? currentList.filter((item) => item !== normalizedValue)
        : [...currentList, normalizedValue]

      return {
        ...current,
        content: setByPath(current.content, [field], nextList),
      }
    })
  }

  function setGallerySlides(nextSlides) {
    const normalizedSlides = normalizeGallerySlides(nextSlides)

    setDraft((current) => ({
      ...current,
      content: setByPath(
        setByPath(current.content, ['topCarouselImages'], normalizedSlides),
        ['bottomCarouselImages'],
        normalizedSlides,
      ),
    }))
  }

  function appendGallerySlides(nextSlides) {
    setDraft((current) => {
      const currentSlides = getModelGallerySlides(current.content)
      const normalizedSlides = normalizeGallerySlides([...currentSlides, ...nextSlides])

      return {
        ...current,
        content: setByPath(
          setByPath(current.content, ['topCarouselImages'], normalizedSlides),
          ['bottomCarouselImages'],
          normalizedSlides,
        ),
      }
    })
  }

  async function handleGalleryFiles(event) {
    const files = Array.from(event.target.files || [])
    event.target.value = ''

    if (!files.length) {
      return
    }

    if (!uploadManagedMedia) {
      setError('No hay soporte para subir fotos en esta sesion.')
      return
    }

    setError('')
    setMessage('Subiendo fotos...')
    setGalleryUploading(true)

    try {
      const uploadedSlides = []

      for (const file of files) {
        const uploaded = await uploadManagedMedia(file, 'site-images', 'encuentros-top')

        if (uploaded?.publicUrl) {
          uploadedSlides.push({ src: uploaded.publicUrl, caption: '' })
        }
      }

      if (!uploadedSlides.length) {
        throw new Error('No se pudo subir ninguna foto.')
      }

      appendGallerySlides(uploadedSlides)
      setMessage(uploadedSlides.length === 1 ? 'Foto cargada.' : `${uploadedSlides.length} fotos cargadas.`)
    } catch (uploadError) {
      setError(uploadError?.message || 'No se pudo subir la foto.')
    } finally {
      setGalleryUploading(false)
    }
  }

  function handleNationalityChange(value) {
    setDraft((current) => {
      return {
        ...current,
        content: setByPath(current.content, ['profileNationality'], value),
      }
    })
  }

  function updateSocialLink(index, patch) {
    setDraft((current) => ({
      ...current,
      content: setByPath(current.content, ['socialLinks', index], {
        ...(Array.isArray(current.content?.socialLinks) ? current.content.socialLinks[index] || {} : {}),
        ...patch,
      }),
    }))
  }

  function addSocialLink() {
    setDraft((current) => ({
      ...current,
      content: setByPath(current.content, ['socialLinks'], [
        ...(Array.isArray(current.content?.socialLinks) ? current.content.socialLinks : []),
        { network: '', label: '', url: '', active: true },
      ]),
    }))
  }

  function removeSocialLink(index) {
    setDraft((current) => ({
      ...current,
      content: setByPath(
        current.content,
        ['socialLinks'],
        (Array.isArray(current.content?.socialLinks) ? current.content.socialLinks : []).filter(
          (_, itemIndex) => itemIndex !== index,
        ),
      ),
    }))
  }

  function updateAvailableDate(index, value) {
    updateBooking(['availableDates', index], value)
  }

  function addAvailableDate() {
    setDraft((current) => ({
      ...current,
      content: setByPath(current.content, ['encuentrosBooking', 'availableDates'], [
        ...(Array.isArray(current.content?.encuentrosBooking?.availableDates)
          ? current.content.encuentrosBooking.availableDates
          : []),
        '',
      ]),
    }))
  }

  function removeAvailableDate(index) {
    setDraft((current) => ({
      ...current,
      content: setByPath(
        current.content,
        ['encuentrosBooking', 'availableDates'],
        (Array.isArray(current.content?.encuentrosBooking?.availableDates)
          ? current.content.encuentrosBooking.availableDates
          : []
        ).filter((_, itemIndex) => itemIndex !== index),
      ),
    }))
  }

  async function handleSave() {
    setError('')
    setMessage('')
    setSaving(true)

    try {
      const nextGallerySlides = gallerySlides
      const nextRecordsEncounters = normalizeBooleanValue(draft.content?.recordsEncounters)
      const whatsappPhone = String(draft.content?.whatsappPhone || '').trim()
      const whatsappUrl = whatsappPhone
        ? buildWhatsAppChatUrl(whatsappPhone, draft.displayName || draft.slug || 'la modelo')
        : String(draft.content?.whatsappUrl || '').trim()
      const nextContent = mergeSiteContent({
        ...draft.content,
        encuentrosExtraOptions: globalExtraOptions,
        encuentrosPresencialFeatureOptions: globalPresencialFeatureOptions,
        extraFromLabel: 'desde',
        topCarouselImages: nextGallerySlides,
        bottomCarouselImages: nextGallerySlides,
        whatsappPhone,
        whatsappUrl,
        encuentrosBooking: normalizeBookingForSave(draft.content?.encuentrosBooking || {}, {
          recordsEncounters: nextRecordsEncounters,
        }),
        recordsEncounters: nextRecordsEncounters,
        recordingEnabled: nextRecordsEncounters,
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
      const nextRecordsEncounters = normalizeBooleanValue(model.content?.recordsEncounters)
      const nextContent = mergeSiteContent({
        ...model.content,
        encuentrosBooking: normalizeBookingForSave(model.content?.encuentrosBooking || {}, {
          recordsEncounters: nextRecordsEncounters,
        }),
        recordsEncounters: nextRecordsEncounters,
        recordingEnabled: nextRecordsEncounters,
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

  async function handleRequestAction(request, nextStatus) {
    setError('')
    setMessage('')
    setRequestActionId(request.id)

    try {
      const nextRequest = await updateAdminEncuentrosModelRequest(
        request.id,
        {
          status: nextStatus,
          createModel: nextStatus === 'approved',
        },
        session?.accessToken || '',
      )

      setMessage(
        `Solicitud ${request.displayName || request.email || request.id} marcada como ${formatRequestStatusLabel(
          nextRequest?.status || nextStatus,
        ).toLowerCase()}.`,
      )
      await Promise.all([refreshRequests(), refreshModels()])
      if (nextStatus === 'approved') {
        setActiveModelsTab('models')
      }
    } catch (nextError) {
      setError(nextError?.message || 'No se pudo actualizar la solicitud.')
    } finally {
      setRequestActionId('')
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

      <div className="admin-tabs admin-subtabs">
        <button
          type="button"
          className={activeModelsTab === 'models' ? 'admin-tab active' : 'admin-tab'}
          onClick={() => setActiveModelsTab('models')}
        >
          Modelos ({models.length})
        </button>
        <button
          type="button"
          className={activeModelsTab === 'requests' ? 'admin-tab active' : 'admin-tab'}
          onClick={() => setActiveModelsTab('requests')}
        >
          Solicitudes ({requestCounts.all})
        </button>
      </div>

      {activeModelsTab === 'requests' ? (
        <div className="admin-request-workspace">
          <div className="admin-tabs admin-request-filters">
            {[
              ['all', 'Todas', requestCounts.all],
              ['pending', 'Pendientes', requestCounts.pending],
              ['approved', 'Aprobadas', requestCounts.approved],
              ['observed', 'Observadas', requestCounts.observed],
              ['suspended', 'Suspendidas', requestCounts.suspended],
              ['rejected', 'Rechazadas', requestCounts.rejected],
            ].map(([key, label, count]) => (
              <button
                key={String(key)}
                type="button"
                className={requestStatusFilter === key ? 'admin-tab active' : 'admin-tab'}
                onClick={() => setRequestStatusFilter(String(key))}
              >
                {label} ({count})
              </button>
            ))}
          </div>

          <article className="admin-hint">
            <p>
              {requestCounts.pending} solicitud{requestCounts.pending === 1 ? '' : 'es'} siguen pendientes de
              revision.
            </p>
            <p>
              Desde aqui puedes aprobar una solicitud para crear su ficha, marcarla como observada, suspenderla o
              rechazarla.
            </p>
          </article>

          {requestsLoading ? (
            <article className="admin-hint">
              <p>Cargando solicitudes...</p>
            </article>
          ) : filteredRequests.length ? (
            <div className="admin-request-list">
              {filteredRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  linkedModel={requestModelMap.get(String(request.modelId || '').trim()) || null}
                  onAction={handleRequestAction}
                  busyId={requestActionId}
                />
              ))}
            </div>
          ) : (
            <article className="admin-hint">
              <p>No hay solicitudes en este estado.</p>
            </article>
          )}
        </div>
      ) : null}

      {error ? <p className="admin-error">{error}</p> : null}
      {message ? <p className="admin-success">{message}</p> : null}

      {activeModelsTab === 'models' ? (
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

        <div className="admin-form admin-form-card">
          <SectionTitle
            eyebrow="Editor"
            title={draft.existingSlug ? 'Editar modelo' : 'Nuevo modelo'}
            description="Ajusta ficha, reserva, galeria y servicios sin tocar JSON."
          />

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
          </div>

          <article className="admin-hint">
            <p>
              URL publica: <Link to={`/encuentros/${encodeURIComponent(draft.slug)}`}>/encuentros/{draft.slug}</Link>
            </p>
            <p>
              {counts.photos} fotos, {counts.services} extras, {counts.dates} fechas, {counts.socials} redes.
            </p>
          </article>

          <SectionTitle
            eyebrow="Perfil"
            title="Datos publicos"
            description="Edad, ubicacion, redes y audio corto se mueven por modelo."
          />
          <div className="admin-grid">
            <label className="admin-field">
              <span>Nombre de modelo</span>
              <input
                value={draft.displayName}
                onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))}
                placeholder="Modelo principal"
              />
            </label>
            <label className="admin-field">
              <span>Edad</span>
              <select
                value={getSelectableAge(content.profileAge || '')}
                onChange={(event) => updateDraft(['profileAge'], event.target.value)}
              >
                <option value="">Selecciona edad</option>
                {AGE_OPTIONS.map((age) => (
                  <option key={age} value={age}>
                    {age}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>Estatura (cm)</span>
              <input
                type="number"
                min="130"
                max="220"
                step="1"
                value={String(content.profileHeightCm || '')}
                onChange={(event) => updateDraft(['profileHeightCm'], event.target.value)}
                placeholder="168"
              />
            </label>
            <label className="admin-field">
              <span>Vello corporal</span>
              <select
                value={content.profileBodyHair || ''}
                onChange={(event) => updateDraft(['profileBodyHair'], event.target.value)}
              >
                <option value="">Selecciona opcion</option>
                {BODY_HAIR_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>Ciudad</span>
              <select
                value={content.profileCity || ''}
                onChange={(event) => updateDraft(['profileCity'], event.target.value)}
              >
                <option value="">Selecciona ciudad</option>
                {selectedCity && !getPeruCityOptions().includes(selectedCity) ? (
                  <option value={selectedCity}>{selectedCity}</option>
                ) : null}
                {getPeruCityOptions().map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>Nacionalidad</span>
              <select
                value={content.profileNationality || ''}
                onChange={(event) => handleNationalityChange(event.target.value)}
              >
                <option value="">Selecciona nacionalidad</option>
                {selectedNationality && !NATIONALITY_OPTIONS.includes(selectedNationality) ? (
                  <option value={selectedNationality}>{selectedNationality}</option>
                ) : null}
                {NATIONALITY_OPTIONS.map((nationality) => (
                  <option key={nationality} value={nationality}>
                    {nationality}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>Estado sentimental</span>
              <select
                value={content.profileRelationshipStatus || ''}
                onChange={(event) => updateDraft(['profileRelationshipStatus'], event.target.value)}
              >
                <option value="">Selecciona estado</option>
                {RELATIONSHIP_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>Color de cabello</span>
              <select
                value={content.profileHairColor || ''}
                onChange={(event) => updateDraft(['profileHairColor'], event.target.value)}
              >
                <option value="">Selecciona color</option>
                {ENCUENTROS_HAIR_COLOR_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>Tipo de cuerpo</span>
              <select
                value={content.profileBodyType || ''}
                onChange={(event) => updateDraft(['profileBodyType'], event.target.value)}
              >
                <option value="">Selecciona tipo</option>
                {ENCUENTROS_BODY_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>Tipo de cabello</span>
              <select
                value={content.profileHairType || ''}
                onChange={(event) => updateDraft(['profileHairType'], event.target.value)}
              >
                <option value="">Selecciona tipo</option>
                {ENCUENTROS_HAIR_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <div className="admin-field admin-field-full">
              <span>Donde atiende</span>
              <p className="admin-meta">Selecciona uno o varios lugares. Se mostrara en los chips publicos del perfil y la galeria.</p>
              <div className="admin-chip-selector">
                {ATTENDANCE_MODE_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={
                      selectedAttendanceModes.includes(option) ? 'admin-chip-button is-active' : 'admin-chip-button'
                    }
                    onClick={() => toggleContentListItem('profileAttendanceModes', option)}
                    aria-pressed={selectedAttendanceModes.includes(option)}
                  >
                    <span>{option}</span>
                  </button>
                ))}
              </div>
              {selectedAttendanceModes.length ? (
                <p className="admin-chip-helper">
                  Seleccionados: {selectedAttendanceModes.join(', ')}
                </p>
              ) : (
                <p className="admin-chip-helper">Aun no hay lugares de atencion seleccionados.</p>
              )}
            </div>
            <ProfileAvatarField
              value={content.profileAvatarUrl || ''}
              uploadManagedMedia={uploadManagedMedia}
              onUrlChange={(value) => updateDraft(['profileAvatarUrl'], value)}
              onNotice={setMessage}
              onError={setError}
            />
            <label className="admin-field admin-field-full">
              <VoiceAudioField
                value={content.profileVoiceAudioUrl || ''}
                uploadManagedMedia={uploadManagedMedia}
                onUrlChange={(value) => updateDraft(['profileVoiceAudioUrl'], value)}
                onNotice={setMessage}
                onError={setError}
              />
            </label>
          </div>

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
              <select
                value={booking.bookingStartTime || ''}
                onChange={(event) => updateBooking(['bookingStartTime'], event.target.value)}
              >
                <option value="">Selecciona hora</option>
                {TIME_OPTIONS.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>Horario fin</span>
              <select
                value={booking.bookingEndTime || ''}
                onChange={(event) => updateBooking(['bookingEndTime'], event.target.value)}
              >
                <option value="">Selecciona hora</option>
                {TIME_OPTIONS.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>Intervalo minutos</span>
              <select
                value={String(booking.slotIntervalMinutes || 60)}
                onChange={(event) =>
                  updateBooking(['slotIntervalMinutes'], Number.parseInt(event.target.value || '0', 10) || 60)
                }
              >
                {INTERVAL_OPTIONS.map((interval) => (
                  <option key={interval} value={interval}>
                    {interval} minutos
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>Unidad presencial</span>
              <select
                value={content.presencialUnit || ''}
                onChange={(event) => updateDraft(['presencialUnit'], event.target.value)}
              >
                <option value="">Selecciona unidad</option>
                {PRESENCIAL_UNIT_OPTIONS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>Graba encuentros</span>
              <select
                value={normalizeBooleanValue(content.recordsEncounters) ? 'yes' : 'no'}
                onChange={(event) => updateDraft(['recordsEncounters'], event.target.value === 'yes')}
              >
                <option value="yes">Si</option>
                <option value="no">No</option>
              </select>
            </label>
            {normalizeBooleanValue(content.recordsEncounters) ? (
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
            ) : null}
            <label className="admin-field">
              <span>Precio presencial</span>
              <input
                value={content.presencialPrice || ''}
                onChange={(event) => updateDraft(['presencialPrice'], event.target.value)}
              />
            </label>
            <label className="admin-field">
              <span>Adelanto</span>
              <input
                value={booking.advanceLabel || ''}
                onChange={(event) => updateBooking(['advanceLabel'], event.target.value)}
              />
            </label>
            <label className="admin-field admin-field-full">
              <span>Descuento por membresia</span>
              <select
                value={booking.membershipDiscountEnabled ? 'yes' : 'no'}
                onChange={(event) => updateBooking(['membershipDiscountEnabled'], event.target.value === 'yes')}
              >
                <option value="yes">Si</option>
                <option value="no">No</option>
              </select>
            </label>
            {booking.membershipDiscountEnabled ? (
              <>
                <label className="admin-field">
                  <span>Red de membresia</span>
                  <select
                    value={booking.membershipDiscountNetwork ? normalizeSocialNetworkValue(booking.membershipDiscountNetwork) : ''}
                    onChange={(event) =>
                      updateBooking(['membershipDiscountNetwork'], normalizeSocialNetworkValue(event.target.value || ''))
                    }
                  >
                    <option value="">Selecciona red</option>
                    {SOCIAL_NETWORK_OPTIONS.filter((option) => option.value !== 'telegram' && option.value !== 'whatsapp').map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-field">
                  <span>Descuento membresia %</span>
                  <input
                    type="number"
                    value={String(booking.membershipDiscountPercent || 0)}
                    onChange={(event) =>
                      updateBooking(
                        ['membershipDiscountPercent'],
                        Math.min(Math.max(Number.parseInt(event.target.value || '0', 10) || 0, 0), 100),
                      )
                    }
                  />
                </label>
                <label className="admin-field admin-field-full">
                  <span>Etiqueta membresia</span>
                  <input
                    value={booking.membershipDiscountLabel || ''}
                    onChange={(event) => updateBooking(['membershipDiscountLabel'], event.target.value)}
                    placeholder="Suscriptores OnlyFans"
                  />
                </label>
              </>
            ) : null}
            <div className="admin-field admin-field-full">
              <span>Fechas disponibles</span>
              <p className="admin-meta">
                {bookingAvailabilityMode === 'manual'
                  ? 'Selecciona cada fecha manualmente.'
                  : 'En modo diario se generan dias proximos automaticamente.'}
              </p>
              {bookingAvailabilityMode === 'manual' ? (
                availableDates.length ? (
                  availableDates.map((value, index) => (
                    <div className="admin-array-card" key={`available-date-${index}`}>
                      <label className="admin-field">
                        <span>Fecha</span>
                        <input
                          type="date"
                          value={value || ''}
                          onChange={(event) => updateAvailableDate(index, event.target.value)}
                        />
                      </label>
                      <button type="button" className="admin-danger-button" onClick={() => removeAvailableDate(index)}>
                        Eliminar
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="admin-hint">
                    <p>No hay fechas manuales cargadas.</p>
                  </div>
                )
              ) : null}
              <div className="admin-actions-row">
                <button
                  type="button"
                  className="admin-secondary-button"
                  onClick={addAvailableDate}
                  disabled={bookingAvailabilityMode !== 'manual'}
                >
                  Agregar fecha
                </button>
              </div>
            </div>
          </div>

          <SectionTitle eyebrow="Ficha" title="Descripcion publica" />
          <div className="admin-grid">
            <label className="admin-field admin-field-full">
              <span>Descripcion hero</span>
              <textarea
                rows={4}
                value={content.heroDescription || ''}
                onChange={(event) => updateDraft(['heroDescription'], event.target.value)}
              />
            </label>
          </div>

          <SectionTitle
            eyebrow="Galeria"
            title="Fotos del modelo"
            description="Un solo carrusel alimenta el perfil y el catalogo. Solo se aceptan archivos cargados desde el equipo."
          />
          <div className="admin-grid">
            <div className="admin-field admin-field-full">
              <span>Subir fotos</span>
              <p className="admin-meta">Se guarda en un solo carrusel. Lo que subas aqui tambien alimenta el catalogo.</p>
              <label className="admin-secondary-button">
                {galleryUploading ? 'Subiendo...' : 'Elegir fotos'}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={handleGalleryFiles}
                  disabled={galleryUploading}
                />
              </label>
            </div>
            <div className="admin-field admin-field-full">
              <span>Miniaturas</span>
              {gallerySlides.length ? (
                <div className="admin-gallery-preview-grid">
                  {gallerySlides.map((slide, index) => (
                    <figure className="admin-gallery-preview-item" key={`${slide.src}-${index}`}>
                      <img src={slide.src} alt={slide.caption || `Foto ${index + 1}`} />
                    </figure>
                  ))}
                </div>
              ) : (
                <div className="admin-hint">
                  <p>Aun no hay fotos cargadas.</p>
                </div>
              )}
            </div>
          </div>

          <SectionTitle eyebrow="Servicios" title="Extras y contacto" />
          <div className="admin-grid">
            <div className="admin-field admin-field-full">
              <span>Servicios Adicionales</span>
              <p className="admin-meta">Este titulo es fijo en la interfaz publica.</p>
            </div>
            <label className="admin-field">
              <span>Precio extra</span>
              <input
                value={content.extraPrice || ''}
                onChange={(event) => updateDraft(['extraPrice'], event.target.value)}
              />
            </label>
            <div className="admin-field admin-field-full">
              <span>Extras seleccionables</span>
              <p className="admin-meta">Selecciona los extras disponibles para este modelo. Placeholder temporal para probar.</p>
              <div className="admin-chip-selector">
                {extraOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={selectedExtraItems.includes(option) ? 'admin-chip-button is-active' : 'admin-chip-button'}
                    onClick={() => toggleContentListItem('extraItems', option)}
                    aria-pressed={selectedExtraItems.includes(option)}
                  >
                    <span>{option}</span>
                  </button>
                ))}
              </div>
              {selectedExtraItems.length ? (
                <p className="admin-chip-helper">Seleccionados: {selectedExtraItems.join(', ')}</p>
              ) : (
                <p className="admin-chip-helper">Aun no hay extras seleccionados.</p>
              )}
            </div>
            <div className="admin-field admin-field-full">
              <span>Features presenciales</span>
              <p className="admin-meta">Selecciona las features que aplica este modelo. Placeholder temporal para probar.</p>
              <div className="admin-chip-selector">
                {presencialFeatureOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={
                      selectedPresencialFeatures.includes(option) ? 'admin-chip-button is-active' : 'admin-chip-button'
                    }
                    onClick={() => toggleContentListItem('presencialFeatures', option)}
                    aria-pressed={selectedPresencialFeatures.includes(option)}
                  >
                    <span>{option}</span>
                  </button>
                ))}
              </div>
              {selectedPresencialFeatures.length ? (
                <p className="admin-chip-helper">
                  Seleccionadas: {selectedPresencialFeatures.join(', ')}
                </p>
              ) : (
                <p className="admin-chip-helper">Aun no hay features seleccionadas.</p>
              )}
            </div>
            <div className="admin-field admin-field-full">
              <span>Redes del modelo</span>
              <p className="admin-meta">Agrega cada red por separado. El sistema usa la red para elegir el icono en frontend.</p>
              {socialLinks.length ? (
                socialLinks.map((link, index) => (
                  <div className="admin-array-card" key={`social-link-${index}`}>
                    <label className="admin-field">
                      <span>Red</span>
                      <select
                        value={link.network ? normalizeSocialNetworkValue(link.network) : ''}
                        onChange={(event) => {
                          const rawNetwork = String(event.target.value || '').trim()
                          const nextNetwork = rawNetwork ? normalizeSocialNetworkValue(rawNetwork) : ''
                          const currentLabel = String(link.label || '').trim()
                          const previousLabel = getSocialNetworkOption(link.network || '').label
                          const nextLabel = getSocialNetworkOption(nextNetwork).label
                          const shouldSyncLabel =
                            !currentLabel ||
                            currentLabel === previousLabel ||
                            currentLabel === String(link.network || '').trim()

                          updateSocialLink(index, {
                            network: nextNetwork,
                            label: shouldSyncLabel ? nextLabel : currentLabel,
                          })
                        }}
                      >
                        <option value="">Selecciona red</option>
                        {SOCIAL_NETWORK_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="admin-field">
                      <span>Etiqueta</span>
                      <input
                        value={link.label || ''}
                        onChange={(event) => updateSocialLink(index, { label: event.target.value })}
                        placeholder="LoverFans, Instagram..."
                      />
                    </label>
                    <label className="admin-field">
                      <span>URL</span>
                      <input
                        value={link.url || ''}
                        onChange={(event) => updateSocialLink(index, { url: event.target.value })}
                        placeholder="https://..."
                      />
                    </label>
                    <label className="admin-field admin-field-checkbox">
                      <span>Activa</span>
                      <input
                        type="checkbox"
                        checked={link.active !== false}
                        onChange={(event) => updateSocialLink(index, { active: event.target.checked })}
                      />
                    </label>
                    <button type="button" className="admin-danger-button" onClick={() => removeSocialLink(index)}>
                      Eliminar
                    </button>
                  </div>
                ))
              ) : (
                <div className="admin-hint">
                  <p>Aun no hay redes agregadas.</p>
                </div>
              )}
              <div className="admin-actions-row">
                <button type="button" className="admin-secondary-button" onClick={addSocialLink}>
                  Agregar red
                </button>
              </div>
            </div>
            <label className="admin-field">
              <span>Telegram URL</span>
              <input
                value={content.socialUrl || ''}
                onChange={(event) => updateDraft(['socialUrl'], event.target.value)}
              />
            </label>
            <label className="admin-field">
              <span>WhatsApp numero</span>
              <input
                value={content.whatsappPhone || ''}
                onChange={(event) => updateDraft(['whatsappPhone'], event.target.value)}
                placeholder="51999999999"
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
            <button type="button" className="admin-primary-button" onClick={() => void handleSave()} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar modelo'}
            </button>
          </div>
        </div>
      </div>
      ) : null}
    </section>
  )
}


