import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  AiOutlineCalendar,
  AiOutlineCloudUpload,
  AiOutlineLink,
  AiOutlinePicture,
  AiOutlinePlus,
  AiOutlineSound,
} from 'react-icons/ai'
import { HiOutlineShieldCheck } from 'react-icons/hi'
import { AppLoader } from '../components/AppLoader'
import { Seo } from '../components/Seo'
import { defaultSiteContent, mergeSiteContent } from '../data/defaultSiteContent'
import { fetchMyEncounterModel, saveMyEncounterModel } from '../lib/supabase'
import { useAppState } from '../state/AppState'
import {
  ENCUENTROS_BODY_TYPE_OPTIONS,
  ENCUENTROS_HAIR_COLOR_OPTIONS,
  ENCUENTROS_HAIR_TYPE_OPTIONS,
} from '../utils/encuentrosPhysicalTraits'
import {
  SOCIAL_NETWORK_OPTIONS,
  extractWhatsAppPhoneFromUrl,
  getSocialNetworkOption,
  normalizeSocialNetworkValue,
} from '../utils/socialNetworks'

const MAX_GALLERY_FILES = 24
const MAX_AUDIO_BYTES = 10 * 1024 * 1024
const MAX_IMAGE_BYTES = 8 * 1024 * 1024

const TABS = [
  { id: 'perfil', label: 'Perfil' },
  { id: 'fotos', label: 'Fotos' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'servicios', label: 'Servicios' },
  { id: 'contacto', label: 'Contacto' },
]

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

function normalizeList(values = []) {
  return Array.from(new Set((Array.isArray(values) ? values : []).map((value) => String(value || '').trim()).filter(Boolean)))
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

function collectGalleryImages(content = {}) {
  const pools = [content.topCarouselImages, content.bottomCarouselImages, content.profileGalleryImages]
  const images = []

  pools.forEach((pool) => {
    if (!Array.isArray(pool)) {
      return
    }

    pool.forEach((item) => {
      const src = String(typeof item === 'string' ? item : item?.src || item?.image || item?.url || '').trim()

      if (src) {
        images.push(src)
      }
    })
  })

  return Array.from(new Set(images))
}

function mergeGalleryContent(content = {}, nextImages = []) {
  const normalized = normalizeGallerySlides(nextImages)
  return setByPath(setByPath(content, ['topCarouselImages'], normalized), ['bottomCarouselImages'], normalized)
}

function formatBytes(bytes = 0) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 MB'
  }

  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 1024 * 1024 ? 1 : 2)} MB`
}

function getTabSummary(content = {}) {
  const booking = content.encuentrosBooking || {}
  return {
    photos: collectGalleryImages(content).length,
    dates: Array.isArray(booking.availableDates) ? booking.availableDates.length : 0,
    extras: normalizeList(content.extraItems || []).length,
    socials: Array.isArray(content.socialLinks) ? content.socialLinks.filter((item) => item?.url).length : 0,
  }
}

function ModelField({ label, children, helper }) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      {children}
      {helper ? <p className="admin-meta">{helper}</p> : null}
    </label>
  )
}

function PreviewGrid({ images = [], onRemove }) {
  if (!images.length) {
    return (
      <div className="admin-hint">
        <p>Aun no hay fotos cargadas.</p>
      </div>
    )
  }

  return (
    <div className="admin-gallery-preview-grid">
      {images.map((src, index) => (
        <figure className="admin-gallery-preview-item" key={`${src}-${index}`}>
          <img src={src} alt={`Foto ${index + 1}`} />
          {onRemove ? (
            <button
              type="button"
              className="admin-danger-button"
              onClick={() => onRemove(index)}
            >
              Quitar
            </button>
          ) : null}
        </figure>
      ))}
    </div>
  )
}

export function ModelDashboardPage() {
  const { session, isBootstrapping, uploadManagedMedia } = useAppState()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [activeTab, setActiveTab] = useState('perfil')
  const [model, setModel] = useState(null)
  const [ownership, setOwnership] = useState(null)
  const [draft, setDraft] = useState(() => mergeSiteContent(defaultSiteContent))
  const [displayName, setDisplayName] = useState('')
  const [pendingAudioStatus, setPendingAudioStatus] = useState('')
  const galleryFileInputRef = useRef(null)
  const avatarFileInputRef = useRef(null)
  const audioFileInputRef = useRef(null)

  const content = mergeSiteContent(draft)
  const booking = content.encuentrosBooking || {}
  const galleryImages = collectGalleryImages(content)
  const summary = useMemo(() => getTabSummary(content), [content])
  const publicHref = model?.slug ? `/encuentros/${encodeURIComponent(model.slug)}` : '/encuentros'
  const bookingHref = model?.slug ? `/encuentros/${encodeURIComponent(model.slug)}/citas` : '/encuentros'
  const whatsappValue = String(content.whatsappPhone || extractWhatsAppPhoneFromUrl(content.whatsappUrl || '') || '').trim()
  const telegramValue = String(content.socialUrl || '').trim()
  const subscriptionLinks = Array.isArray(content.socialLinks) ? content.socialLinks : []
  const availableDates = Array.isArray(booking.availableDates) ? booking.availableDates : []
  const extraItems = normalizeList(content.extraItems || [])
  const presencialFeatures = normalizeList(content.presencialFeatures || [])
  const requestStatus = String(content.requestStatus || model?.status || 'pending').trim()
  const requestStatusLabel =
    requestStatus === 'published'
      ? 'Aprobada'
      : requestStatus === 'draft' || requestStatus === 'pending'
        ? 'Pendiente'
        : requestStatus === 'suspended'
          ? 'Suspendida'
          : requestStatus === 'rejected'
            ? 'Rechazada'
            : requestStatus === 'observed'
              ? 'Observada'
              : requestStatus

  useEffect(() => {
    if (!session?.accessToken) {
      setLoading(false)
      setModel(null)
      setOwnership(null)
      setDisplayName('')
      setDraft(mergeSiteContent(defaultSiteContent))
      setError('Tu sesion no incluye credenciales de API. Vuelve a iniciar sesion para abrir el panel de modelo.')
      return
    }

    let isMounted = true

    async function loadModel() {
      setLoading(true)
      setError('')

      try {
        const response = await fetchMyEncounterModel(session.accessToken)

        if (!isMounted) {
          return
        }

        setModel(response.model || null)
        setOwnership(response.ownership || null)
        setDisplayName(response.model?.displayName || '')
        setDraft(mergeSiteContent(response.model?.content || defaultSiteContent))
      } catch (nextError) {
        if (!isMounted) {
          return
        }

        setModel(null)
        setOwnership(null)
        setDisplayName('')
        setDraft(mergeSiteContent(defaultSiteContent))
        setError(nextError?.message || 'No se pudo cargar tu panel de modelo.')
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadModel()

    return () => {
      isMounted = false
    }
  }, [session?.accessToken])

  function updateDraft(path, value) {
    setDraft((current) => setByPath(current, path, value))
  }

  function updateBooking(path, value) {
    updateDraft(['encuentrosBooking', ...path], value)
  }

  function syncGallery(nextImages) {
    setDraft((current) => mergeGalleryContent(current, nextImages))
  }

  function updateSocialLink(index, patch) {
    setDraft((current) => {
      const list = Array.isArray(current.socialLinks) ? current.socialLinks : []
      const nextList = [...list]
      nextList[index] = {
        ...(nextList[index] || {}),
        ...patch,
      }
      return setByPath(current, ['socialLinks'], nextList)
    })
  }

  function addSocialLink() {
    setDraft((current) => {
      const list = Array.isArray(current.socialLinks) ? current.socialLinks : []
      return setByPath(current, ['socialLinks'], [
        ...list,
        { network: 'onlyfans', label: 'OnlyFans', url: '', active: true },
      ])
    })
  }

  function removeSocialLink(index) {
    setDraft((current) => {
      const list = Array.isArray(current.socialLinks) ? current.socialLinks : []
      return setByPath(
        current,
        ['socialLinks'],
        list.filter((_, currentIndex) => currentIndex !== index),
      )
    })
  }

  function addAvailableDate() {
    setDraft((current) => updateBooking(['availableDates'], [...availableDates, '']))
  }

  function updateAvailableDate(index, value) {
    const next = [...availableDates]
    next[index] = value
    updateBooking(['availableDates'], next)
  }

  function removeAvailableDate(index) {
    updateBooking(
      ['availableDates'],
      availableDates.filter((_, currentIndex) => currentIndex !== index),
    )
  }

  function toggleListItem(field, value) {
    const normalized = String(value || '').trim()
    if (!normalized) {
      return
    }

    setDraft((current) => {
      const currentList = normalizeList(current[field] || [])
      const nextList = currentList.includes(normalized)
        ? currentList.filter((item) => item !== normalized)
        : [...currentList, normalized]

      return setByPath(current, [field], nextList)
    })
  }

  async function uploadGalleryFiles(files = []) {
    if (!uploadManagedMedia || !files.length) {
      return
    }

    const nextImages = []

    for (const file of files.slice(0, MAX_GALLERY_FILES)) {
      if (!file?.type?.startsWith('image/')) {
        continue
      }

      if (file.size > MAX_IMAGE_BYTES) {
        setError(`Una foto supera el limite de ${formatBytes(MAX_IMAGE_BYTES)}.`)
        continue
      }

      const uploaded = await uploadManagedMedia(file, 'site-images', 'encuentros/model-portal/gallery')
      if (uploaded?.publicUrl) {
        nextImages.push(uploaded.publicUrl)
      }
    }

    if (nextImages.length) {
      setDraft((current) => mergeGalleryContent(current, [...galleryImages, ...nextImages]))
    }
  }

  async function handleGalleryUpload(event) {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    setError('')
    await uploadGalleryFiles(files)
  }

  async function handleAvatarUpload(event) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file || !uploadManagedMedia) {
      return
    }

    if (!file.type.startsWith('image/')) {
      setError('Selecciona una imagen valida.')
      return
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setError(`La foto supera el limite de ${formatBytes(MAX_IMAGE_BYTES)}.`)
      return
    }

    setError('')
    const uploaded = await uploadManagedMedia(file, 'site-images', 'encuentros/model-portal/avatar')
    if (uploaded?.publicUrl) {
      updateDraft(['profileAvatarUrl'], uploaded.publicUrl)
      setNotice('Foto de perfil actualizada.')
    }
  }

  async function handleVoiceUpload(event) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file || !uploadManagedMedia) {
      return
    }

    if (!file.type.startsWith('audio/')) {
      setError('Selecciona un audio valido.')
      return
    }

    if (file.size > MAX_AUDIO_BYTES) {
      setError(`El audio supera el limite de ${formatBytes(MAX_AUDIO_BYTES)}.`)
      return
    }

    setError('')
    setPendingAudioStatus('Subiendo audio...')
    const uploaded = await uploadManagedMedia(file, 'site-images', 'encuentros/model-portal/voice')
    if (uploaded?.publicUrl) {
      updateDraft(['profileVoiceAudioUrl'], uploaded.publicUrl)
      setPendingAudioStatus('Audio actualizado.')
      setNotice('Audio de voz actualizado.')
    }
  }

  async function handleSave() {
    if (!session?.accessToken || !model) {
      return
    }

    setSaving(true)
    setError('')
    setNotice('')

    try {
      const nextContent = mergeSiteContent({
        ...draft,
        socialUrl: telegramValue,
        whatsappPhone: whatsappValue,
        socialLinks: subscriptionLinks,
      })

      const nextModel = await saveMyEncounterModel(
        {
          displayName: displayName || model.displayName || model.slug,
          content: nextContent,
        },
        session.accessToken,
      )

      setModel(nextModel)
      setDraft(mergeSiteContent(nextModel?.content || nextContent))
      setDisplayName(nextModel?.displayName || displayName)
      setNotice('Cambios guardados con exito.')
    } catch (nextError) {
      setError(nextError?.message || 'No se pudo guardar el panel de modelo.')
    } finally {
      setSaving(false)
    }
  }

  if (!session && !isBootstrapping) {
    return <Navigate to="/access?redirect=/modelo/dashboard&audience=model" replace />
  }

  if (isBootstrapping || loading) {
    return <AppLoader title="Cargando panel de modelo" subtitle="Preparamos tu espacio privado." />
  }

  if (!model) {
    return (
      <main className="creator-home model-dashboard-page">
        <Seo
          title="Kinkly | Panel de modelo"
          description="Panel privado para gestionar el perfil de una modelo verificada."
          canonicalPath="/modelo/dashboard"
          noindex
        />
        <section className="models-landing-section model-dashboard-empty">
          <div className="section-heading">
            <p className="section-kicker">Panel de modelo</p>
            <h1>Todavia no tienes un perfil vinculado.</h1>
            <p>
              Cuando el equipo apruebe tu solicitud y te asigne un perfil, aqui podras editar fotos, fechas, redes y
              servicios sin pasar por el panel de admin.
            </p>
          </div>

          <div className="models-landing-hero-actions">
            <Link className="hero-primary-cta" to="/registro-modelos">
              Ir al registro
            </Link>
            <Link className="hero-secondary-cta" to="/profile">
              Ver mi cuenta
            </Link>
          </div>

          {ownership ? (
            <p className="admin-note">Tu cuenta ya tiene ownership, pero el perfil publico aun no esta listo.</p>
          ) : null}
        </section>
      </main>
    )
  }

  return (
    <main className="creator-home model-dashboard-page">
      <Seo
        title={`${model.displayName || model.slug} | Panel de modelo`}
        description="Panel privado para editar fotos, agenda, servicios y enlaces de suscripcion."
        canonicalPath="/modelo/dashboard"
        noindex
      />

      <section className="models-landing-section model-dashboard-shell">
        <div className="section-heading model-dashboard-header">
          <div>
            <p className="section-kicker">Modelo verificada</p>
            <h1>{displayName || model.displayName || model.slug}</h1>
            <p>
              Gestiona tu perfil publico, tus fotos, fechas, servicios, redes de suscripcion y canales directos desde
              un solo espacio.
            </p>
          </div>

          <div className="model-dashboard-quickfacts">
            <span><HiOutlineShieldCheck aria-hidden="true" /> {requestStatusLabel}</span>
            <span><AiOutlinePicture aria-hidden="true" /> {summary.photos} fotos</span>
            <span><AiOutlineCalendar aria-hidden="true" /> {summary.dates} fechas</span>
            <span><AiOutlineLink aria-hidden="true" /> {summary.socials} links</span>
            <span><HiOutlineShieldCheck aria-hidden="true" /> {ownership?.permissionScope || 'owner'}</span>
          </div>
        </div>

        <div className="model-dashboard-toolbar">
          <Link className="hero-secondary-cta" to={publicHref}>
            Ver perfil publico
          </Link>
          <Link className="hero-secondary-cta" to={bookingHref}>
            Ver reservas
          </Link>
          <button className="hero-primary-cta" type="button" onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>

        <div className="access-tabs model-dashboard-tabs" role="tablist" aria-label="Secciones del panel de modelo">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? 'is-active' : ''}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error ? <p className="admin-error">{error}</p> : null}
        {notice ? <p className="admin-success">{notice}</p> : null}

        {activeTab === 'perfil' ? (
          <div className="admin-grid model-dashboard-grid">
            <ModelField label="Nombre publico" helper="Este nombre aparece en la ficha visible al publico.">
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            </ModelField>
            <ModelField label="Slug publico" helper="La URL publica la mantiene el equipo para evitar roturas.">
              <input value={model.slug} readOnly />
            </ModelField>
            <ModelField label="Ciudad">
              <input
                value={content.profileCity || ''}
                onChange={(event) => updateDraft(['profileCity'], event.target.value)}
              />
            </ModelField>
            <ModelField label="Nacionalidad">
              <input
                value={content.profileNationality || ''}
                onChange={(event) => updateDraft(['profileNationality'], event.target.value)}
              />
            </ModelField>
            <ModelField label="Edad">
              <input
                value={content.profileAge || ''}
                onChange={(event) => updateDraft(['profileAge'], event.target.value)}
              />
            </ModelField>
            <ModelField label="Estado relacional">
              <input
                value={content.profileRelationshipStatus || ''}
                onChange={(event) => updateDraft(['profileRelationshipStatus'], event.target.value)}
              />
            </ModelField>
            <ModelField label="Color de cabello" helper="Mantiene la ficha publica mas completa y consistente.">
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
            </ModelField>
            <ModelField label="Tipo de cuerpo">
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
            </ModelField>
            <ModelField label="Tipo de cabello">
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
            </ModelField>
            <ModelField label="Vello corporal">
              <input
                value={content.profileBodyHair || ''}
                onChange={(event) => updateDraft(['profileBodyHair'], event.target.value)}
              />
            </ModelField>
            <ModelField label="Mensaje de bienvenida" helper="Breve presentacion para la portada publica.">
              <textarea
                rows={4}
                value={content.heroDescription || ''}
                onChange={(event) => updateDraft(['heroDescription'], event.target.value)}
              />
            </ModelField>
            <div className="admin-field admin-field-full">
              <span>Avatar de perfil</span>
              <div className="admin-avatar-upload-shell">
                <div className="admin-avatar-preview-frame">
                  {content.profileAvatarUrl ? (
                    <img src={content.profileAvatarUrl} alt="Avatar de perfil" className="admin-avatar-preview-image" />
                  ) : (
                    <div className="admin-avatar-preview-placeholder">Sin foto</div>
                  )}
                </div>
                <div className="admin-actions-row">
                  <button type="button" className="admin-secondary-button" onClick={() => avatarFileInputRef.current?.click?.()}>
                    Subir foto
                  </button>
                  {content.profileAvatarUrl ? (
                    <button
                      type="button"
                      className="admin-secondary-button"
                      onClick={() => updateDraft(['profileAvatarUrl'], '')}
                    >
                      Quitar
                    </button>
                  ) : null}
                </div>
              </div>
              <input ref={avatarFileInputRef} type="file" accept="image/*" hidden onChange={handleAvatarUpload} />
            </div>
          </div>
        ) : null}

        {activeTab === 'fotos' ? (
          <div className="admin-grid model-dashboard-grid">
            <div className="admin-field admin-field-full">
              <span>Fotos del perfil</span>
              <p className="admin-meta">Estas fotos alimentan la portada publica y el catalogo.</p>
              <div className="admin-actions-row">
                <button type="button" className="admin-secondary-button" onClick={() => galleryFileInputRef.current?.click?.()}>
                  <AiOutlineCloudUpload aria-hidden="true" />
                  <span>Agregar fotos</span>
                </button>
                  <button type="button" className="admin-secondary-button" onClick={() => syncGallery([])}>
                  Limpiar fotos
                </button>
              </div>
              <input
                ref={galleryFileInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={handleGalleryUpload}
              />
            </div>
            <div className="admin-field admin-field-full">
              <span>Galeria actual</span>
              <PreviewGrid
                images={galleryImages}
                  onRemove={(index) => {
                  const next = galleryImages.filter((_, currentIndex) => currentIndex !== index)
                  syncGallery(next)
                }}
              />
            </div>
          </div>
        ) : null}

        {activeTab === 'agenda' ? (
          <div className="admin-grid model-dashboard-grid">
            <ModelField label="Modo de disponibilidad">
              <select
                value={booking.availabilityMode || 'everyday'}
                onChange={(event) => updateBooking(['availabilityMode'], event.target.value)}
              >
                <option value="everyday">Todos los dias</option>
                <option value="manual">Fechas manuales</option>
              </select>
            </ModelField>
            <ModelField label="Precio presencial">
              <input
                value={booking.priceLabel || ''}
                onChange={(event) => updateBooking(['priceLabel'], event.target.value)}
              />
            </ModelField>
            <ModelField label="Adelanto">
              <input
                value={booking.advanceLabel || ''}
                onChange={(event) => updateBooking(['advanceLabel'], event.target.value)}
              />
            </ModelField>
            <ModelField label="Descripcion de reserva" helper="Texto breve visible en la portada.">
              <textarea
                rows={4}
                value={booking.description || ''}
                onChange={(event) => updateBooking(['description'], event.target.value)}
              />
            </ModelField>
            <div className="admin-field admin-field-full">
              <span>Fechas disponibles</span>
              <div className="admin-actions-row">
                <button type="button" className="admin-secondary-button" onClick={addAvailableDate}>
                  <AiOutlinePlus aria-hidden="true" />
                  <span>Agregar fecha</span>
                </button>
              </div>
              {availableDates.length ? (
                availableDates.map((value, index) => (
                  <div className="admin-array-card" key={`model-date-${index}`}>
                    <label className="admin-field">
                      <span>Fecha</span>
                      <input type="date" value={value || ''} onChange={(event) => updateAvailableDate(index, event.target.value)} />
                    </label>
                    <button type="button" className="admin-danger-button" onClick={() => removeAvailableDate(index)}>
                      Eliminar
                    </button>
                  </div>
                ))
              ) : (
                <div className="admin-hint">
                  <p>No hay fechas cargadas.</p>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {activeTab === 'servicios' ? (
          <div className="admin-grid model-dashboard-grid">
            <div className="admin-field admin-field-full">
              <span>Servicios adicionales</span>
              <p className="admin-meta">Escribe uno por linea o separa por coma.</p>
              <textarea
                rows={4}
                value={extraItems.join('\n')}
                onChange={(event) => updateDraft(['extraItems'], event.target.value.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean))}
              />
            </div>
            <div className="admin-field admin-field-full">
              <span>Features presenciales</span>
              <p className="admin-meta">Lista breve de rasgos que quieres mostrar en la ficha.</p>
              <textarea
                rows={4}
                value={presencialFeatures.join('\n')}
                onChange={(event) =>
                  updateDraft(
                    ['presencialFeatures'],
                    event.target.value.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean),
                  )
                }
              />
            </div>
            <ModelField label="Etiqueta de servicios">
              <input
                value={content.extraFromLabel || ''}
                onChange={(event) => updateDraft(['extraFromLabel'], event.target.value)}
              />
            </ModelField>
            <ModelField label="Texto de hero">
              <textarea
                rows={4}
                value={content.presencialDescription || ''}
                onChange={(event) => updateDraft(['presencialDescription'], event.target.value)}
              />
            </ModelField>
          </div>
        ) : null}

        {activeTab === 'contacto' ? (
          <div className="admin-grid model-dashboard-grid">
            <ModelField label="Telegram">
              <input
                value={telegramValue}
                onChange={(event) => updateDraft(['socialUrl'], event.target.value)}
                placeholder="https://t.me/tu_canal"
              />
            </ModelField>
            <ModelField label="WhatsApp">
              <input
                value={whatsappValue}
                onChange={(event) => updateDraft(['whatsappPhone'], event.target.value)}
                placeholder="51999999999"
              />
            </ModelField>
            <div className="admin-field admin-field-full">
              <span>Mensaje de voz</span>
              <p className="admin-meta">La voz se reproduce en tu ficha publica y refuerza la conversion.</p>
              <div className="admin-actions-row">
                <button type="button" className="admin-secondary-button" onClick={() => audioFileInputRef.current?.click?.()}>
                  <AiOutlineSound aria-hidden="true" />
                  <span>Subir audio</span>
                </button>
                {content.profileVoiceAudioUrl ? (
                  <button
                    type="button"
                    className="admin-secondary-button"
                    onClick={() => updateDraft(['profileVoiceAudioUrl'], '')}
                  >
                    Quitar audio
                  </button>
                ) : null}
              </div>
              <input ref={audioFileInputRef} type="file" accept="audio/*" hidden onChange={handleVoiceUpload} />
              {content.profileVoiceAudioUrl ? (
                <audio controls preload="none" src={content.profileVoiceAudioUrl} className="encuentros-admin-audio-preview" />
              ) : null}
              {pendingAudioStatus ? <p className="admin-meta">{pendingAudioStatus}</p> : null}
            </div>
            <div className="admin-field admin-field-full">
              <span>Redes de suscripcion y canales</span>
              <p className="admin-meta">OnlyFans, Fansly, LoverFans, ManyVids y cualquier red que quieras destacar.</p>
              {subscriptionLinks.length ? (
                subscriptionLinks.map((link, index) => (
                  <div className="admin-array-card" key={`model-social-${index}`}>
                    <label className="admin-field">
                      <span>Red</span>
                      <select
                        value={link.network ? normalizeSocialNetworkValue(link.network) : ''}
                        onChange={(event) => {
                          const nextNetwork = normalizeSocialNetworkValue(event.target.value || '')
                          const currentLabel = String(link.label || '').trim()
                          const nextLabel = getSocialNetworkOption(nextNetwork).label
                          updateSocialLink(index, {
                            network: nextNetwork,
                            label: currentLabel || nextLabel,
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
                        placeholder="OnlyFans"
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
                  <p>No hay redes de suscripcion cargadas.</p>
                </div>
              )}

              <div className="admin-actions-row">
                <button type="button" className="admin-secondary-button" onClick={addSocialLink}>
                  <AiOutlinePlus aria-hidden="true" />
                  <span>Agregar red</span>
                </button>
              </div>
            </div>
            <div className="admin-field admin-field-full">
              <span>Vista previa publica</span>
              <div className="admin-hint">
                <p>
                  Telegram se mostrara como canal directo. WhatsApp se usara para chat privado y las redes externas se
                  mostraran como bloque de suscripcion.
                </p>
              </div>
              <div className="encuentros-screen-profile-metadata">
                <span className="encuentros-screen-profile-chip">Telegram {telegramValue ? 'listo' : 'pendiente'}</span>
                <span className="encuentros-screen-profile-chip">WhatsApp {whatsappValue ? 'listo' : 'pendiente'}</span>
                <span className="encuentros-screen-profile-chip">Voz {content.profileVoiceAudioUrl ? 'lista' : 'pendiente'}</span>
              </div>
            </div>
          </div>
        ) : null}

        <div className="model-dashboard-footer">
          <div className="admin-hint">
            <p>
              Tu cuenta solo puede editar el perfil que el sistema te asigno. Si necesitas otro perfil, el equipo de
              revision debe vincularlo desde admin.
            </p>
          </div>

          <div className="admin-actions-row">
            <button type="button" className="admin-secondary-button" onClick={() => void handleSave()} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <Link className="hero-secondary-cta" to="/profile">
              Ir a mi cuenta
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
