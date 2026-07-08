import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
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
import { HiOutlineShieldCheck, HiOutlineSparkles } from 'react-icons/hi'
import { Seo } from '../components/Seo'
import { submitEncounterModelRequest } from '../lib/supabase'
import { useAppState } from '../state/AppState'

const MAX_VERIFICATION_PHOTO_BYTES = 8 * 1024 * 1024

const INITIAL_FORM = {
  displayName: '',
  email: '',
  city: '',
  nationality: '',
  phone: '',
  telegram: '',
  verificationPhotoUrl: '',
  bio: '',
  notes: '',
}

const highlights = [
  {
    title: 'Alta rapida',
    description: 'Enviamos tus datos basicos y centralizamos la revision desde el panel de modelos.',
  },
  {
    title: 'Estado visible',
    description: 'La solicitud queda en revision para que el equipo pueda aprobar, observar o suspender.',
  },
  {
    title: 'Canal directo',
    description: 'Si ya usas Telegram o WhatsApp, dejalo listo para acelerar el contacto interno.',
  },
]

const steps = [
  'Completa tu ficha con nombre, correo y ciudad principal.',
  'Sube tu foto de verificacion para validar el registro.',
  'El equipo revisa tu solicitud desde /admin/dashboard y define el siguiente paso.',
]

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

export function OpeningPage() {
  const { session, uploadManagedMedia } = useAppState()
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
      await submitEncounterModelRequest(form, session?.accessToken || '')
      setSuccess('Tu solicitud quedo en revision. Te contactaremos cuando el panel la procese.')
      setForm({
        ...INITIAL_FORM,
        displayName: session?.name || '',
        email: session?.email || '',
      })
      setPhotoPreviewUrl('')
      setPhotoStatus('')
    } catch (nextError) {
      setError(nextError.message || 'No se pudo enviar la solicitud.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="opening-page opening-models-page">
      <Seo
        title="Kinkly | Registro de modelos"
        description="Landing temporal para captar modelos, centralizar solicitudes y activar la revision desde el panel de modelos."
        canonicalPath="/registro-modelos"
      />

      <section className="opening-hero opening-models-hero">
        <div className="opening-hero-copy opening-models-copy">
          <span className="opening-hero-kicker">
            <HiOutlineShieldCheck aria-hidden="true" />
            <span>PLATAFORMA EN APERTURA</span>
          </span>

          <h1>
            Publica tu perfil y entra <em>en revision</em> desde hoy
          </h1>

          <p className="opening-hero-lead">
            Centralizamos el registro de modelos para que el equipo valide cada solicitud, active el anuncio cuando
            corresponda y mantenga el control operativo en un solo panel.
          </p>

          <div className="opening-hero-actions opening-models-actions">
            <a className="hero-primary-cta opening-hero-primary" href="#registro-modelo">
              <AiOutlineArrowRight aria-hidden="true" />
              <span>Empezar ahora</span>
            </a>
            <Link className="hero-secondary-cta opening-hero-secondary" to="/admin/login">
              Ir al panel
            </Link>
          </div>

          <div className="opening-models-highlights">
            {highlights.map((item) => (
              <article key={item.title} className="opening-models-highlight-card">
                <span className="opening-models-highlight-icon" aria-hidden="true">
                  <HiOutlineSparkles />
                </span>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="opening-model-form-shell" id="registro-modelo">
          <div className="opening-model-form-copy">
            <span className="opening-hero-kicker">
              <AiOutlineUser aria-hidden="true" />
              <span>Solicitud de modelo</span>
            </span>
            <h2>Cuenta lo basico y deja tu foto de verificacion lista para revision.</h2>
            <p>
              Este formulario crea una solicitud interna con estado pendiente. El equipo la revisa desde el panel de
              modelos y decide si la aprueba, la observa o la suspende.
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
        </div>
      </section>

      <section className="opening-model-steps" aria-label="Proceso de alta">
        {steps.map((step, index) => (
          <article key={step} className="opening-model-step-card">
            <span>{String(index + 1).padStart(2, '0')}</span>
            <p>{step}</p>
          </article>
        ))}
      </section>
    </main>
  )
}
