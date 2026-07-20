import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AiOutlineArrowRight,
  AiOutlineCheckCircle,
  AiOutlineClockCircle,
  AiOutlineDelete,
  AiOutlineMail,
  AiOutlineMessage,
  AiOutlinePhone,
  AiOutlinePicture,
  AiOutlineUser,
} from 'react-icons/ai'
import { Navigate, useNavigate } from 'react-router-dom'
import { HiOutlineShieldCheck } from 'react-icons/hi'
import { Seo } from '../components/Seo'
import { submitEncounterModelRequest } from '../lib/supabase'
import { useAppState } from '../state/AppState'
import {
  ENCUENTROS_BODY_TYPE_OPTIONS,
  ENCUENTROS_HAIR_COLOR_OPTIONS,
  ENCUENTROS_HAIR_TYPE_OPTIONS,
} from '../utils/encuentrosPhysicalTraits'

const MAX_VERIFICATION_PHOTO_BYTES = 8 * 1024 * 1024

const INITIAL_FORM = {
  displayName: '',
  email: '',
  city: '',
  nationality: '',
  hairColor: '',
  bodyType: '',
  hairType: '',
  phone: '',
  telegram: '',
  verificationPhotoUrl: '',
  bio: '',
  notes: '',
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'))
    reader.readAsDataURL(file)
  })
}

function Field({ label, icon: Icon, ...props }) {
  return (
    <label className="opening-model-field">
      <span className="opening-model-label">
        {Icon ? <Icon aria-hidden="true" /> : null}
        <strong>{label}</strong>
      </span>
      <input {...props} />
    </label>
  )
}

function TextareaField({ label, icon: Icon, ...props }) {
  return (
    <label className="opening-model-field opening-model-field-full">
      <span className="opening-model-label">
        {Icon ? <Icon aria-hidden="true" /> : null}
        <strong>{label}</strong>
      </span>
      <textarea {...props} />
    </label>
  )
}

function SelectField({ label, icon: Icon, children, ...props }) {
  return (
    <label className="opening-model-field">
      <span className="opening-model-label">
        {Icon ? <Icon aria-hidden="true" /> : null}
        <strong>{label}</strong>
      </span>
      <select {...props}>{children}</select>
    </label>
  )
}

function VerificationPhotoField({
  previewUrl,
  isUploading,
  statusMessage,
  onPickFile,
  onClear,
}) {
  const fileInputRef = useRef(null)

  return (
    <div className="opening-model-photo-field opening-model-field-full">
      <div className="opening-model-photo-copy">
        <span className="opening-model-label">
          <AiOutlinePicture aria-hidden="true" />
          <strong>Foto de verificacion</strong>
        </span>
        <p>
          Sube una foto clara de tu documento o selfie de verificacion. Quedara asociada a tu solicitud para que
          el panel pueda validarla.
        </p>
        <div className="opening-model-photo-actions">
          <button
            type="button"
            className="hero-secondary-cta opening-model-photo-button"
            onClick={() => fileInputRef.current?.click?.()}
            disabled={isUploading}
          >
            {isUploading ? 'Preparando foto...' : 'Subir foto'}
          </button>
          {previewUrl ? (
            <button
              type="button"
              className="hero-secondary-cta opening-model-photo-button is-ghost"
              onClick={onClear}
              disabled={isUploading}
            >
              <AiOutlineDelete aria-hidden="true" />
              <span>Quitar</span>
            </button>
          ) : null}
        </div>
        {statusMessage ? <p className="opening-model-photo-status">{statusMessage}</p> : null}
      </div>

      <div className="opening-model-photo-preview" aria-live="polite">
        {previewUrl ? (
          <img src={previewUrl} alt="Vista previa de la foto de verificacion" />
        ) : (
          <div className="opening-model-photo-placeholder">
            <AiOutlinePicture aria-hidden="true" />
            <span>Sin foto cargada</span>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={onPickFile}
      />
    </div>
  )
}

export function ModelRequestPage() {
  const { session, isBootstrapping, uploadManagedMedia } = useAppState()
  const navigate = useNavigate()
  const [form, setForm] = useState(() => ({
    ...INITIAL_FORM,
    displayName: session?.name || '',
    email: session?.email || '',
  }))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPhotoUploading, setIsPhotoUploading] = useState(false)
  const [photoStatus, setPhotoStatus] = useState('')
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    setForm((current) => ({
      ...current,
      displayName: current.displayName || session?.name || '',
      email: current.email || session?.email || '',
    }))
  }, [session?.email, session?.name])

  if (!isBootstrapping && !session) {
    return <Navigate to="/access?redirect=/registro-modelos" replace />
  }

  const submitLabel = useMemo(
    () => (isSubmitting ? 'Enviando solicitud...' : 'Enviar solicitud de modelo'),
    [isSubmitting],
  )

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function resetPhotoState() {
    setForm((current) => ({ ...current, verificationPhotoUrl: '' }))
    setPhotoPreviewUrl('')
    setPhotoStatus('')
  }

  async function handlePhotoChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      setError('Selecciona una imagen valida.')
      return
    }

    if (file.size > MAX_VERIFICATION_PHOTO_BYTES) {
      setError('La foto de verificacion supera el limite permitido.')
      return
    }

    setError('')
    setSuccess('')
    setIsPhotoUploading(true)
    setPhotoStatus('Preparando foto de verificacion...')

    try {
      const previewUrl = await readFileAsDataUrl(file)
      setPhotoPreviewUrl(previewUrl)

      if (uploadManagedMedia) {
        try {
          const uploaded = await uploadManagedMedia(file, 'site-images', 'encuentros/model-requests')

          if (uploaded?.publicUrl) {
            setForm((current) => ({ ...current, verificationPhotoUrl: uploaded.publicUrl }))
            setPhotoPreviewUrl(uploaded.publicUrl)
            setPhotoStatus('Foto cargada y lista para enviar.')
            return
          }
        } catch (uploadError) {
          setPhotoStatus('No pudimos subirla al storage. Usaremos la copia local de esta solicitud.')
          setForm((current) => ({ ...current, verificationPhotoUrl: previewUrl }))
          return
        }
      }

      setForm((current) => ({ ...current, verificationPhotoUrl: previewUrl }))
      setPhotoStatus('Foto lista para enviar.')
    } catch (nextError) {
      setError(nextError?.message || 'No se pudo preparar la foto.')
      setPhotoPreviewUrl('')
      setForm((current) => ({ ...current, verificationPhotoUrl: '' }))
    } finally {
      setIsPhotoUploading(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!form.verificationPhotoUrl) {
      setError('Debes subir una foto de verificacion antes de enviar.')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await submitEncounterModelRequest(form, session?.accessToken || '')
      setSuccess('Tu solicitud quedo en revision. Te contactaremos cuando el panel la procese.')
      setForm({
        ...INITIAL_FORM,
        displayName: session?.name || '',
        email: session?.email || '',
      })
      setPhotoPreviewUrl('')
      setPhotoStatus('')

      if (result?.model?.slug) {
        navigate('/modelo/dashboard', { replace: true })
      }
    } catch (nextError) {
      setError(nextError.message || 'No se pudo enviar la solicitud.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="opening-page opening-models-page">
      <Seo
        title="Kinkly | Solicitud de modelo"
        description="Formulario privado para enviar una solicitud de modelo mientras afinamos el lanzamiento."
        canonicalPath="/registro-modelos"
        noindex
      />

      <section className="opening-model-form-shell opening-model-request-shell">
        <div className="opening-model-form-copy">
          <span className="opening-hero-kicker">
            <HiOutlineShieldCheck aria-hidden="true" />
            <span>Solicitud de modelo</span>
          </span>
          <h1>Cuenta lo basico y deja tu foto de verificacion lista para revision.</h1>
          <p>
            Este formulario crea una solicitud interna con estado pendiente. Lo usamos mientras afinamos el
            lanzamiento y revisamos cada modelo antes de abrir el catalogo completo.
          </p>
        </div>

        <form className="opening-model-form" onSubmit={handleSubmit}>
          <Field
            label="Nombre de modelo"
            icon={AiOutlineUser}
            name="displayName"
            value={form.displayName}
            onChange={handleChange}
            placeholder="Tu nombre profesional"
            autoComplete="name"
            required
          />
          <Field
            label="Correo"
            icon={AiOutlineMail}
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="correo@dominio.com"
            autoComplete="email"
            required
          />
          <Field
            label="Ciudad"
            icon={AiOutlineMessage}
            name="city"
            value={form.city}
            onChange={handleChange}
            placeholder="Lima, Arequipa, Cusco..."
            required
          />
          <Field
            label="Nacionalidad"
            icon={AiOutlineCheckCircle}
            name="nationality"
            value={form.nationality}
            onChange={handleChange}
            placeholder="Peruana, colombiana..."
            required
          />
          <SelectField
            label="Color de cabello"
            icon={AiOutlineUser}
            name="hairColor"
            value={form.hairColor}
            onChange={handleChange}
            required
          >
            <option value="">Selecciona color</option>
            {ENCUENTROS_HAIR_COLOR_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Tipo de cuerpo"
            icon={AiOutlineUser}
            name="bodyType"
            value={form.bodyType}
            onChange={handleChange}
            required
          >
            <option value="">Selecciona tipo</option>
            {ENCUENTROS_BODY_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Tipo de cabello"
            icon={AiOutlineUser}
            name="hairType"
            value={form.hairType}
            onChange={handleChange}
            required
          >
            <option value="">Selecciona tipo</option>
            {ENCUENTROS_HAIR_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </SelectField>
          <Field
            label="WhatsApp o telefono"
            icon={AiOutlinePhone}
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="+51..."
            autoComplete="tel"
          />
          <Field
            label="Telegram"
            icon={AiOutlineMessage}
            name="telegram"
            value={form.telegram}
            onChange={handleChange}
            placeholder="@usuario o enlace"
          />
          <TextareaField
            label="Presentacion breve"
            icon={AiOutlineClockCircle}
            name="bio"
            value={form.bio}
            onChange={handleChange}
            placeholder="Cuentanos en una linea que ofreces y como prefieres que te contacten."
            rows={4}
            maxLength={320}
            required
          />
          <TextareaField
            label="Notas para revision"
            icon={AiOutlineMessage}
            name="notes"
            value={form.notes}
            onChange={handleChange}
            placeholder="Disponibilidad, zonas, objetivos o cualquier detalle util."
            rows={3}
          />

          <VerificationPhotoField
            previewUrl={photoPreviewUrl}
            isUploading={isPhotoUploading}
            statusMessage={photoStatus}
            onPickFile={handlePhotoChange}
            onClear={resetPhotoState}
          />

          {error ? <p className="opening-model-feedback is-error">{error}</p> : null}
          {success ? <p className="opening-model-feedback is-success">{success}</p> : null}

          <button className="hero-primary-cta opening-model-submit" type="submit" disabled={isSubmitting || isPhotoUploading}>
            <AiOutlineArrowRight aria-hidden="true" />
            <span>{submitLabel}</span>
          </button>

          <p className="opening-model-footnote">
            Al enviar, la solicitud queda registrada como pendiente y visible solo para el equipo interno.
          </p>
        </form>
      </section>
    </main>
  )
}
