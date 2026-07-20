import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AiFillX } from 'react-icons/ai'
import { FcGoogle } from 'react-icons/fc'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AppLoader } from '../components/AppLoader'
import { Seo } from '../components/Seo'
import {
  getWhatsappVerificationConfig,
  requestWhatsappVerificationCode,
  verifyWhatsappVerificationCode,
} from '../lib/supabase'
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
    loginMemberWithEmail,
    signUpMemberWithEmail,
    setMemberAudience,
  } = useAppState()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const initialAudience = normalizeAudience(searchParams.get('audience'))

  const [mode, setMode] = useState('login')
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [registerForm, setRegisterForm] = useState({
    email: '',
    username: '',
    phone: '',
    password: '',
  })
  const [selectedAudience, setSelectedAudience] = useState(initialAudience)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeOAuthProvider, setActiveOAuthProvider] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [whatsappVerificationEnabled, setWhatsappVerificationEnabled] = useState(null)
  const [whatsappChallengeId, setWhatsappChallengeId] = useState('')
  const [whatsappCode, setWhatsappCode] = useState('')
  const [whatsappVerifiedPhone, setWhatsappVerifiedPhone] = useState('')
  const [whatsappStatus, setWhatsappStatus] = useState('')
  const [whatsappError, setWhatsappError] = useState('')
  const [isSendingWhatsappCode, setIsSendingWhatsappCode] = useState(false)
  const [isVerifyingWhatsappCode, setIsVerifyingWhatsappCode] = useState(false)

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
    const normalizedPhone = normalizePhoneInput(registerForm.phone)

    if (whatsappVerifiedPhone && whatsappVerifiedPhone !== normalizedPhone) {
      setWhatsappChallengeId('')
      setWhatsappCode('')
      setWhatsappVerifiedPhone('')
      setWhatsappStatus('')
      setWhatsappError('')
    }
  }, [registerForm.phone, whatsappVerifiedPhone])

  useEffect(() => {
    if (mode !== 'register' || selectedAudience !== 'model') {
      setWhatsappChallengeId('')
      setWhatsappCode('')
      setWhatsappVerifiedPhone('')
      setWhatsappStatus('')
      setWhatsappError('')
    }
  }, [mode, selectedAudience])

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

  async function handleEmailSubmit(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    setIsSubmitting(true)

    try {
      if (mode === 'register') {
        const normalizedPhone = normalizePhoneInput(registerForm.phone)
        const requiresWhatsappVerification = selectedAudience === 'model' && whatsappVerificationEnabled

        if (requiresWhatsappVerification && whatsappVerifiedPhone !== normalizedPhone) {
          throw new Error('Verifica tu numero por WhatsApp antes de crear la cuenta de modelo.')
        }

        const result = await signUpMemberWithEmail({
          email: registerForm.email.trim(),
          password: registerForm.password,
          username: registerForm.username.trim(),
          displayName: registerForm.username.trim(),
          audience: selectedAudience,
          phone: registerForm.phone.trim(),
          whatsappVerified: requiresWhatsappVerification,
        })

        if (result?.requiresEmailConfirmation) {
          setNotice(
            'La cuenta quedo creada. Revisa tu correo para confirmar el acceso antes de elegir tu panel.',
          )
          return
        }
      } else {
        await loginMemberWithEmail({
          email: loginForm.email.trim(),
          password: loginForm.password,
        })
      }

      setNotice('Cuenta autenticada. Ahora elige el panel que quieres abrir.')
    } catch (nextError) {
      setError(nextError.message || (mode === 'register' ? t('access.registerError') : t('access.loginError')))
    } finally {
      setIsSubmitting(false)
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
      setError(nextError.message || 'No se pudo guardar tu tipo de acceso.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSendWhatsappCode() {
    const normalizedPhone = normalizePhoneInput(registerForm.phone)

    setWhatsappError('')
    setWhatsappStatus('')

    if (!normalizedPhone) {
      setWhatsappError('Escribe un telefono valido con codigo de pais.')
      return
    }

    setIsSendingWhatsappCode(true)

    try {
      const result = await requestWhatsappVerificationCode({ phone: normalizedPhone })
      setWhatsappChallengeId(result.challengeId || '')
      setWhatsappCode('')
      setWhatsappVerifiedPhone('')
      setWhatsappStatus('Te enviamos un codigo por WhatsApp. Revisalo y pegate el codigo aqui.')
    } catch (nextError) {
      setWhatsappError(nextError.message || 'No se pudo enviar el codigo por WhatsApp.')
    } finally {
      setIsSendingWhatsappCode(false)
    }
  }

  async function handleVerifyWhatsappCode() {
    if (!whatsappChallengeId) {
      setWhatsappError('Primero envia un codigo por WhatsApp.')
      return
    }

    if (!whatsappCode.trim()) {
      setWhatsappError('Escribe el codigo que recibiste por WhatsApp.')
      return
    }

    setIsVerifyingWhatsappCode(true)
    setWhatsappError('')
    setWhatsappStatus('')

    try {
      const result = await verifyWhatsappVerificationCode({
        challengeId: whatsappChallengeId,
        code: whatsappCode.trim(),
      })

      const verifiedPhone = normalizePhoneInput(result.phone || registerForm.phone)
      setWhatsappVerifiedPhone(verifiedPhone)
      setWhatsappStatus('Telefono verificado por WhatsApp. Ya puedes continuar con el alta.')
    } catch (nextError) {
      setWhatsappError(nextError.message || 'No se pudo validar el codigo de WhatsApp.')
    } finally {
      setIsVerifyingWhatsappCode(false)
    }
  }

  const normalizedRegisterPhone = normalizePhoneInput(registerForm.phone)
  const isWhatsappVerificationLoading =
    mode === 'register' && selectedAudience === 'model' && whatsappVerificationEnabled === null
  const requiresWhatsappVerification =
    mode === 'register' && selectedAudience === 'model' && whatsappVerificationEnabled === true
  const isWhatsappVerified =
    Boolean(whatsappVerifiedPhone) && whatsappVerifiedPhone === normalizedRegisterPhone

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
            <p className="access-auth-state">
              {session ? 'Sesion lista' : 'Acceso privado'}
            </p>
          </div>

          <div className="access-auth-copy">
            <p className="access-auth-eyebrow">{session ? 'Acceso activo' : t('access.eyebrow')}</p>
            <h1>
              {session ? 'Ahora elige tu panel' : t('access.title')}
            </h1>
            <p>
              {session
                ? 'Ya validaste tu cuenta. El siguiente paso es decidir si sigues como modelo o como visitante/cliente.'
                : 'Primero entra por Google, X o correo. Luego eliges si vas como modelo o como cliente/visitante.'}
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
                  <p>Te llevamos al dashboard de modelo y desde ahi continúas con tu perfil privado.</p>
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
                  disabled={isSubmitting}
                >
                  Volver al inicio
                </button>
              </div>
            </div>
          ) : (
            <div className="access-auth-stack">
              <div className="access-auth-authbox">
                <div className="access-auth-tabs" role="tablist" aria-label="Tipo de acceso">
                  <button
                    type="button"
                    className={mode === 'login' ? 'is-active' : ''}
                    onClick={() => {
                      setMode('login')
                      setError('')
                      setNotice('')
                    }}
                  >
                    Entrar
                  </button>
                  <button
                    type="button"
                    className={mode === 'register' ? 'is-active' : ''}
                    onClick={() => {
                      setMode('register')
                      setError('')
                      setNotice('')
                    }}
                  >
                    Registrarme
                  </button>
                </div>

                <form className="access-auth-form" onSubmit={handleEmailSubmit}>
                  <div className="access-auth-fields">
                    {mode === 'register' ? (
                      <fieldset className="access-audience-fieldset">
                        <legend>¿Como quieres registrarte?</legend>
                        <div className="access-audience-selector" role="radiogroup" aria-label="Tipo de acceso">
                          {audienceOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              className={`access-role-card access-auth-audience-option ${
                                selectedAudience === option.value ? 'is-highlighted is-selected' : ''
                              }`}
                              onClick={() => setSelectedAudience(option.value)}
                              disabled={isSubmitting}
                              aria-pressed={selectedAudience === option.value}
                            >
                              <span className="access-audience-kicker">{option.label}</span>
                              <strong>{option.label}</strong>
                              <p>{option.description}</p>
                            </button>
                          ))}
                        </div>
                      </fieldset>
                    ) : null}

                    <label className="access-auth-field">
                      <span>Correo</span>
                      <input
                        type="email"
                        autoComplete="email"
                        value={mode === 'login' ? loginForm.email : registerForm.email}
                        onChange={(event) =>
                          mode === 'login'
                            ? setLoginForm((current) => ({ ...current, email: event.target.value }))
                            : setRegisterForm((current) => ({ ...current, email: event.target.value }))
                        }
                        placeholder="tu@correo.com"
                        required
                      />
                    </label>

                    {mode === 'register' ? (
                      <label className="access-auth-field">
                        <span>Nombre de usuario</span>
                        <input
                          type="text"
                          autoComplete="username"
                          value={registerForm.username}
                          onChange={(event) =>
                            setRegisterForm((current) => ({ ...current, username: event.target.value }))
                          }
                          placeholder="tu_usuario"
                          required
                        />
                      </label>
                    ) : null}

                    {mode === 'register' ? (
                      <label className="access-auth-field">
                        <span>Telefono WhatsApp</span>
                        <input
                          type="tel"
                          autoComplete="tel"
                          value={registerForm.phone}
                          onChange={(event) =>
                            setRegisterForm((current) => ({ ...current, phone: event.target.value }))
                          }
                          placeholder="+51 999 999 999"
                          required={selectedAudience === 'model'}
                        />
                      </label>
                    ) : null}

                    {requiresWhatsappVerification ? (
                      <div className="access-whatsapp-verification">
                        <div className="access-whatsapp-verification-copy">
                          <span className="access-audience-kicker">Verificacion por WhatsApp</span>
                          <strong>Confirma tu numero antes de crear la cuenta de modelo</strong>
                          <p>
                            Enviaremos un codigo al numero indicado. Cuando lo confirmes, quedara listo
                            para el alta en Supabase.
                          </p>
                        </div>

                        <div className="access-whatsapp-verification-actions">
                          <button
                            type="button"
                            className="hero-secondary-cta"
                            onClick={() => void handleSendWhatsappCode()}
                            disabled={isSendingWhatsappCode || !normalizedRegisterPhone}
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
                            className="hero-secondary-cta"
                            onClick={() => void handleVerifyWhatsappCode()}
                            disabled={isVerifyingWhatsappCode || !whatsappChallengeId}
                          >
                            {isVerifyingWhatsappCode ? 'Verificando...' : 'Verificar codigo'}
                          </button>
                        </div>

                        <p className="access-auth-note">
                          {whatsappVerificationEnabled === null
                            ? 'Comprobando la configuracion de WhatsApp...'
                            : whatsappVerificationEnabled
                              ? isWhatsappVerified
                                ? 'Numero verificado por WhatsApp.'
                                : 'El alta de modelo queda bloqueada hasta validar este numero.'
                              : 'OpenWA no esta configurado aun. El alta seguira funcionando, pero sin verificacion por WhatsApp.'}
                        </p>

                        {whatsappStatus ? <p className="access-auth-success">{whatsappStatus}</p> : null}
                        {whatsappError ? <p className="access-auth-error">{whatsappError}</p> : null}
                      </div>
                    ) : null}

                    <label className="access-auth-field">
                      <span>Contrasena</span>
                      <input
                        type="password"
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        value={mode === 'login' ? loginForm.password : registerForm.password}
                        onChange={(event) =>
                          mode === 'login'
                            ? setLoginForm((current) => ({ ...current, password: event.target.value }))
                            : setRegisterForm((current) => ({ ...current, password: event.target.value }))
                        }
                        placeholder="********"
                        required
                      />
                    </label>
                  </div>

                  <button
                    className="hero-primary-cta access-auth-submit"
                    type="submit"
                    disabled={
                      isSubmitting ||
                      isWhatsappVerificationLoading ||
                      (requiresWhatsappVerification && !isWhatsappVerified)
                    }
                  >
                    {mode === 'login'
                      ? isSubmitting
                        ? 'Entrando...'
                        : 'Entrar'
                      : isSubmitting
                        ? 'Creando...'
                        : 'Crear cuenta'}
                  </button>

                  <p className="access-auth-note">
                    {mode === 'login'
                      ? 'Accede con tu correo. Si ya tienes cuenta, luego eliges tu panel.'
                      : 'Elige primero si te registras como modelo o como visitante/cliente y luego completa tus datos.'}
                  </p>
                </form>
              </div>

              <div className="access-oauth-block">
                <div className="access-oauth-actions">
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
              Google y X requieren Supabase; el acceso por correo sigue activo en modo local.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  )
}
