import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AiFillX } from 'react-icons/ai'
import { BiLogoWhatsapp } from 'react-icons/bi'
import { FcGoogle } from 'react-icons/fc'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AppLoader } from '../components/AppLoader'
import { Seo } from '../components/Seo'
import { getWhatsappVerificationConfig, requestWhatsappVerificationCode } from '../lib/supabase'
import { useAppState } from '../state/AppState'

function normalizeAudience(value = '') {
  const normalized = String(value || '').trim().toLowerCase()

  if (normalized === 'model' || normalized === 'visitor') {
    return normalized
  }

  return 'client'
}

function getModelTarget() {
  return '/modelo/dashboard'
}

function normalizePhoneInput(value = '') {
  return String(value || '').replace(/[^\d]/g, '')
}

const audienceOptions = [
  {
    value: 'model',
    label: 'Modelo',
    description: 'Acceso para gestionar tu perfil privado y tu panel de modelo.',
  },
  {
    value: 'visitor',
    label: 'Visitante / cliente',
    description: 'Acceso para explorar, revisar tu cuenta y seguir como cliente.',
  },
]

export function AccessPage() {
  const {
    isBootstrapping,
    isSupabaseConfigured,
    session,
    loginMemberWithOAuth,
    loginMemberWithWhatsApp,
    setMemberAudience,
  } = useAppState()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const initialAudience = normalizeAudience(searchParams.get('audience'))

  const [selectedAudience, setSelectedAudience] = useState(initialAudience)
  const [selectedProvider, setSelectedProvider] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeOAuthProvider, setActiveOAuthProvider] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [whatsappVerificationEnabled, setWhatsappVerificationEnabled] = useState(null)
  const [whatsappPhone, setWhatsappPhone] = useState('')
  const [whatsappChallengeId, setWhatsappChallengeId] = useState('')
  const [whatsappCode, setWhatsappCode] = useState('')
  const [whatsappStatus, setWhatsappStatus] = useState('')
  const [whatsappError, setWhatsappError] = useState('')
  const [isSendingWhatsappCode, setIsSendingWhatsappCode] = useState(false)
  const [isVerifyingWhatsappCode, setIsVerifyingWhatsappCode] = useState(false)
  const normalizedWhatsappPhone = normalizePhoneInput(whatsappPhone)

  useEffect(() => {
    if (session?.audience === 'model' || session?.audience === 'visitor') {
      setSelectedAudience(session.audience)
      return
    }

    if (!session) {
      setSelectedAudience(initialAudience)
    }
  }, [initialAudience, session?.audience, session?.id])

  useEffect(() => {
    let isCancelled = false

    getWhatsappVerificationConfig()
      .then((config) => {
        if (!isCancelled) {
          setWhatsappVerificationEnabled(Boolean(config?.enabled))
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setWhatsappVerificationEnabled(false)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [])

  useEffect(() => {
    if (session) {
      setSelectedProvider('')
      setWhatsappPhone('')
      setWhatsappChallengeId('')
      setWhatsappCode('')
      setWhatsappStatus('')
      setWhatsappError('')
    }
  }, [session?.id])

  useEffect(() => {
    if (selectedProvider !== 'whatsapp') {
      setWhatsappPhone('')
      setWhatsappChallengeId('')
      setWhatsappCode('')
      setWhatsappStatus('')
      setWhatsappError('')
    }
  }, [selectedProvider])

  useEffect(() => {
    if (whatsappChallengeId) {
      setWhatsappChallengeId('')
      setWhatsappCode('')
      setWhatsappStatus('')
      setWhatsappError('')
    }
  }, [normalizedWhatsappPhone])

  useEffect(() => {
    if (session?.audience === 'model') {
      navigate(getModelTarget(), { replace: true })
    }
  }, [navigate, session?.audience, session?.id])

  function resolvePostAuthTarget(audience) {
    if (audience === 'model') {
      return getModelTarget()
    }

    return '/cliente/dashboard'
  }

  async function handleOAuthLogin(provider) {
    setError('')
    setNotice('')
    setIsSubmitting(true)
    setActiveOAuthProvider(provider)

    try {
      await loginMemberWithOAuth(provider, '/access')
    } catch (nextError) {
      setError(nextError.message || t('access.oauthError'))
    } finally {
      setIsSubmitting(false)
      setActiveOAuthProvider('')
    }
  }

  async function handleSendWhatsappCode() {
    const normalizedPhone = normalizePhoneInput(whatsappPhone)

    setWhatsappError('')
    setWhatsappStatus('')
    setError('')
    setNotice('')

    if (whatsappVerificationEnabled === false) {
      setWhatsappError('WhatsApp requires OpenWA configured on the server.')
      return
    }

    if (!normalizedPhone) {
      setWhatsappError('Enter a valid phone number with country code.')
      return
    }

    setIsSendingWhatsappCode(true)

    try {
      const result = await requestWhatsappVerificationCode({ phone: normalizedPhone })
      setWhatsappChallengeId(result.challengeId || '')
      setWhatsappCode('')
      setWhatsappStatus('We sent a code by WhatsApp. Check it and confirm it here.')
    } catch (nextError) {
      setWhatsappError(nextError.message || 'Could not send the WhatsApp code.')
    } finally {
      setIsSendingWhatsappCode(false)
    }
  }

  async function handleVerifyWhatsappCode() {
    if (!whatsappChallengeId) {
      setWhatsappError('Send a WhatsApp code first.')
      return
    }

    if (!whatsappCode.trim()) {
      setWhatsappError('Enter the code you received by WhatsApp.')
      return
    }

    setIsVerifyingWhatsappCode(true)
    setWhatsappError('')
    setWhatsappStatus('')
    setError('')
    setNotice('')

    try {
      await loginMemberWithWhatsApp({
        challengeId: whatsappChallengeId,
        code: whatsappCode.trim(),
      })
    } catch (nextError) {
      setWhatsappError(nextError.message || 'Could not validate the WhatsApp access.')
    } finally {
      setIsVerifyingWhatsappCode(false)
    }
  }

  async function handleAudienceChoice(audience) {
    const normalizedAudience = normalizeAudience(audience)
    setError('')
    setNotice('')
    setIsSubmitting(true)
    setSelectedAudience(normalizedAudience)

    try {
      await setMemberAudience(normalizedAudience)
      navigate(resolvePostAuthTarget(normalizedAudience), { replace: true })
    } catch (nextError) {
      setError(nextError.message || 'Could not save your access type.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isWhatsappReady = whatsappVerificationEnabled === true
  const isWhatsappLoading = whatsappVerificationEnabled === null

  if (isBootstrapping) {
    return <AppLoader title={t('loading.general')} subtitle={t('loading.subtitle')} />
  }

  return (
    <main className="access-auth-page">
      <Seo
        title="Acceso global | Kinkly"
        description="Acceso para clientes, modelos y publico dentro de una sola puerta de entrada."
        canonicalPath="/access"
        noindex
      />

      <section className="access-auth-shell">
        <div className="access-auth-card">
          <div className="access-auth-topline">
            <Link className="access-auth-home-link" to="/">
              Volver a la home
            </Link>
            <p className="access-auth-state">{session ? 'Sesion lista' : 'Acceso privado'}</p>
          </div>

          <div className="access-auth-copy">
            <p className="access-auth-eyebrow">{session ? 'Acceso activo' : t('access.eyebrow')}</p>
            <h1>{session ? 'Ahora elige tu panel' : t('access.title')}</h1>
            <p>
              {session
                ? 'Ya validaste tu cuenta. El siguiente paso es decidir si sigues como modelo o como visitante/cliente.'
                : 'Elige un proveedor para entrar o registrarte. Cuando termines, te preguntaremos si vas como modelo o como visitante/cliente.'}
            </p>
          </div>

          {session ? (
            <div className="access-audience-panel">
              <div className="access-role-grid access-auth-choice-grid" aria-label="Seleccion de panel">
                <button
                  type="button"
                  className={`access-role-card access-auth-choice-card ${
                    selectedAudience === 'model' ? 'is-highlighted is-selected' : ''
                  }`}
                  onClick={() => void handleAudienceChoice('model')}
                  disabled={isSubmitting}
                >
                  <span className="access-audience-kicker">Modelo</span>
                  <strong>Ir al panel de modelo</strong>
                  <p>Te llevamos al dashboard de modelo y desde ahi continuas con tu perfil privado.</p>
                </button>

                <button
                  type="button"
                  className={`access-role-card access-auth-choice-card ${
                    selectedAudience !== 'model' ? 'is-highlighted is-selected' : ''
                  }`}
                  onClick={() => void handleAudienceChoice('client')}
                  disabled={isSubmitting}
                >
                  <span className="access-audience-kicker">Cliente</span>
                  <strong>Ir a tu panel</strong>
                  <p>Accede al perfil privado para revisar tu cuenta, accesos y rutas de contenido.</p>
                </button>
              </div>

              <div className="access-auth-mini-actions">
                <button
                  type="button"
                  className="hero-secondary-cta"
                  onClick={() => void handleAudienceChoice('visitor')}
                  disabled={isSubmitting}
                >
                  Entrar como visitante
                </button>
                <button
                  type="button"
                  className="video-preview-link"
                  onClick={() => navigate('/')}
                >
                  Volver al inicio
                </button>
              </div>
            </div>
          ) : (
            <div className="access-auth-stack">
              <div className="access-auth-authbox">
                <div className="access-auth-copy access-auth-copy-compact">
                  <p className="access-auth-eyebrow">Metodos de acceso</p>
                  <p className="access-auth-helper">
                    No pedimos correo ni contrasena aqui. Solo elige tu proveedor y sigue el flujo.
                  </p>
                </div>

                <div className="access-auth-buttons" role="group" aria-label="Metodos de acceso">
                  <button
                    className="access-auth-button access-auth-button-google"
                    type="button"
                    onClick={() => void handleOAuthLogin('google')}
                    disabled={isSubmitting || !isSupabaseConfigured}
                  >
                    <span className="access-auth-button-icon" aria-hidden="true">
                      <FcGoogle />
                    </span>
                    <span>
                      {isSubmitting && activeOAuthProvider === 'google'
                        ? t('access.connecting')
                        : 'Continuar con Google'}
                    </span>
                  </button>

                  <button
                    className="access-auth-button access-auth-button-whatsapp"
                    type="button"
                    onClick={() => setSelectedProvider('whatsapp')}
                    disabled={isSubmitting || isWhatsappLoading || !isSupabaseConfigured}
                  >
                    <span className="access-auth-button-icon access-auth-button-icon-whatsapp" aria-hidden="true">
                      <BiLogoWhatsapp />
                    </span>
                    <span>Continuar con WhatsApp</span>
                  </button>

                  <button
                    className="access-auth-button access-auth-button-x"
                    type="button"
                    onClick={() => void handleOAuthLogin('twitter')}
                    disabled={isSubmitting || !isSupabaseConfigured}
                  >
                    <span className="access-auth-button-icon access-auth-button-icon-x" aria-hidden="true">
                      <AiFillX />
                    </span>
                    <span>
                      {isSubmitting && activeOAuthProvider === 'twitter'
                        ? t('access.connecting')
                        : 'Continuar con X'}
                    </span>
                  </button>
                </div>

                {selectedProvider === 'whatsapp' ? (
                  <div className="access-whatsapp-panel">
                    <div className="access-whatsapp-panel-copy">
                      <span className="access-audience-kicker">WhatsApp</span>
                      <strong>Confirma tu numero y entra sin correo ni contrasena</strong>
                      <p>
                        Te enviamos un codigo al numero indicado. Al validarlo, creamos tu acceso y te
                        pedimos luego el tipo de panel.
                      </p>
                    </div>

                    <div className="access-whatsapp-panel-fields">
                      <label className="access-auth-field">
                        <span>Telefono WhatsApp</span>
                        <input
                          type="tel"
                          autoComplete="tel"
                          inputMode="tel"
                          value={whatsappPhone}
                          onChange={(event) => setWhatsappPhone(event.target.value)}
                          placeholder="+51 999 999 999"
                        />
                      </label>

                      <div className="access-whatsapp-panel-actions">
                        <button
                          type="button"
                          className="hero-secondary-cta"
                          onClick={() => void handleSendWhatsappCode()}
                          disabled={isSendingWhatsappCode || !normalizedWhatsappPhone || !isWhatsappReady}
                        >
                          {isSendingWhatsappCode ? 'Enviando codigo...' : 'Enviar codigo'}
                        </button>

                        <label className="access-auth-field access-whatsapp-code-field">
                          <span>Codigo WhatsApp</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            value={whatsappCode}
                            onChange={(event) => setWhatsappCode(event.target.value)}
                            placeholder="123456"
                            disabled={!whatsappChallengeId}
                          />
                        </label>

                        <button
                          type="button"
                          className="hero-primary-cta"
                          onClick={() => void handleVerifyWhatsappCode()}
                          disabled={isVerifyingWhatsappCode || !whatsappChallengeId}
                        >
                          {isVerifyingWhatsappCode ? 'Validando...' : 'Validar y entrar'}
                        </button>
                      </div>

                      <p className="access-auth-note">
                        {isWhatsappLoading
                          ? 'Comprobando la configuracion de WhatsApp...'
                          : isWhatsappReady
                            ? 'WhatsApp queda bloqueado hasta validar el numero.'
                            : 'WhatsApp no esta configurado aun. Activa OpenWA para usar este metodo.'}
                      </p>

                      {whatsappStatus ? <p className="access-auth-success">{whatsappStatus}</p> : null}
                      {whatsappError ? <p className="access-auth-error">{whatsappError}</p> : null}
                    </div>
                  </div>
                ) : null}

                <p className="access-auth-note">
                  Primero autenticas la cuenta. Despues te preguntamos si vas como modelo o como cliente.
                </p>
              </div>
            </div>
          )}

          {error ? <p className="access-auth-error">{error}</p> : null}
          {notice ? <p className="access-auth-success">{notice}</p> : null}
          {!isSupabaseConfigured ? (
            <p className="access-auth-warning">
              Google, X y WhatsApp requieren Supabase; el acceso social queda deshabilitado mientras
              no haya configuracion.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  )
}
