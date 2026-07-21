import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AiFillX } from 'react-icons/ai'
import { BiLogoWhatsapp } from 'react-icons/bi'
import { FcGoogle } from 'react-icons/fc'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AppLoader } from '../components/AppLoader'
import { Seo } from '../components/Seo'
import { getWhatsappVerificationConfig, requestWhatsappVerificationCode, verifyWhatsAppCode } from '../lib/supabase'
import { useAppState } from '../state/AppState'

function normalizeAudience(value = '') {
  const normalized = String(value || '').trim().toLowerCase()

  if (normalized === 'model' || normalized === 'visitor') {
    return normalized
  }

  return 'client'
}

function normalizePhoneInput(value = '') {
  return String(value || '').replace(/[^\d]/g, '')
}

function normalizeIdentifierInput(value = '') {
  return String(value || '').trim()
}

function resolveAudienceTarget(audience, redirectTarget = '') {
  if (redirectTarget) {
    return redirectTarget
  }

  return audience === 'model' ? '/modelo/dashboard' : '/cliente/dashboard'
}

function getAudienceFromRedirect(redirectTarget = '') {
  const normalizedTarget = String(redirectTarget || '').toLowerCase()

  if (normalizedTarget.includes('/modelo/')) {
    return 'model'
  }

  return 'client'
}

function getLockedAudienceFromRedirect(redirectTarget = '') {
  const normalizedTarget = String(redirectTarget || '').toLowerCase()

  if (
    normalizedTarget.startsWith('/registro-modelos') ||
    normalizedTarget.startsWith('/modelo/') ||
    normalizedTarget.startsWith('/model/')
  ) {
    return 'model'
  }

  if (
    normalizedTarget.startsWith('/cliente/') ||
    normalizedTarget.startsWith('/library') ||
    normalizedTarget.startsWith('/profile') ||
    normalizedTarget.startsWith('/free-content') ||
    normalizedTarget.startsWith('/checkout/') ||
    normalizedTarget.startsWith('/videos/') ||
    normalizedTarget.startsWith('/packs/') ||
    normalizedTarget.startsWith('/calzones/') ||
    normalizedTarget.startsWith('/blog/')
  ) {
    return 'client'
  }

  return ''
}

function buildFormDefaults() {
  return {
    loginIdentifier: '',
    loginPassword: '',
    registerDisplayName: '',
    registerUsername: '',
    registerEmail: '',
    registerPassword: '',
    whatsappPhone: '',
    whatsappCode: '',
    whatsappPasswordIdentifier: '',
    whatsappPassword: '',
  }
}

export function AccessPage() {
  const {
    isBootstrapping,
    isSupabaseConfigured,
    session,
    loginMemberWithOAuth,
    loginMemberWithWhatsApp,
    loginMemberWithEmail,
    signUpMemberWithEmail,
    setMemberAudience,
    updateMyProfile,
  } = useAppState()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const redirectTarget = useMemo(() => {
    const candidate = String(searchParams.get('redirect') || '').trim()
    return candidate.startsWith('/') ? candidate : ''
  }, [searchParams])
  const lockedAudience = useMemo(() => getLockedAudienceFromRedirect(redirectTarget), [redirectTarget])

  const initialAudience = useMemo(() => {
    if (lockedAudience) {
      return lockedAudience
    }

    const queryAudience = normalizeAudience(searchParams.get('audience'))
    if (queryAudience !== 'client') {
      return queryAudience
    }

    return getAudienceFromRedirect(redirectTarget)
  }, [lockedAudience, redirectTarget, searchParams])

  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login'

  const [selectedAudience, setSelectedAudience] = useState(initialAudience)
  const [accessMode, setAccessMode] = useState(initialMode)
  const [selectedMethod, setSelectedMethod] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [whatsappVerificationEnabled, setWhatsappVerificationEnabled] = useState(null)
  const [whatsappChallengeId, setWhatsappChallengeId] = useState('')
  const [whatsappStatus, setWhatsappStatus] = useState('')
  const [whatsappError, setWhatsappError] = useState('')
  const [whatsappVerifiedPhone, setWhatsappVerifiedPhone] = useState('')
  const [isSendingWhatsappCode, setIsSendingWhatsappCode] = useState(false)
  const [isVerifyingWhatsappCode, setIsVerifyingWhatsappCode] = useState(false)
  const [registerCompletionOpen, setRegisterCompletionOpen] = useState(false)
  const [registerCompletionError, setRegisterCompletionError] = useState('')
  const [formValues, setFormValues] = useState(() => buildFormDefaults())

  const normalizedWhatsappPhone = normalizePhoneInput(formValues.whatsappPhone)
  const normalizedLoginIdentifier = normalizeIdentifierInput(formValues.loginIdentifier)
  const normalizedLoginPassword = normalizeIdentifierInput(formValues.loginPassword)
  const normalizedRegisterEmail = normalizeIdentifierInput(formValues.registerEmail)
  const normalizedRegisterUsername = normalizeIdentifierInput(formValues.registerUsername)
  const normalizedRegisterPassword = normalizeIdentifierInput(formValues.registerPassword)
  const normalizedWhatsappPasswordIdentifier = normalizeIdentifierInput(
    formValues.whatsappPasswordIdentifier,
  )
  const normalizedWhatsappPassword = normalizeIdentifierInput(formValues.whatsappPassword)

  useEffect(() => {
    if (session?.audience === 'model' || session?.audience === 'visitor') {
      setSelectedAudience(session.audience)
      return
    }

    if (!session) {
      setSelectedAudience(initialAudience)
    }
  }, [initialAudience, lockedAudience, session?.audience, session?.id])

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
      setFormValues(buildFormDefaults())
      setWhatsappChallengeId('')
      setWhatsappStatus('')
      setWhatsappError('')
      setWhatsappVerifiedPhone('')
      setSelectedMethod('')
    }
  }, [session?.id])

  useEffect(() => {
    setFormValues(buildFormDefaults())
    setError('')
    setNotice('')
    setWhatsappChallengeId('')
    setWhatsappStatus('')
    setWhatsappError('')
    setWhatsappVerifiedPhone('')
    setSelectedMethod('')
    setRegisterCompletionOpen(false)
    setRegisterCompletionError('')
  }, [accessMode])

  useEffect(() => {
    setWhatsappChallengeId('')
    setWhatsappStatus('')
    setWhatsappError('')
    setFormValues((current) => ({
      ...current,
      whatsappCode: '',
    }))
    setWhatsappVerifiedPhone('')
  }, [normalizedWhatsappPhone])

  useEffect(() => {
    if (!selectedMethod) {
      return
    }

    setError('')
    setNotice('')
    setWhatsappError('')
    setWhatsappStatus('')
  }, [selectedMethod])

  useEffect(() => {
    if (!session) {
      return
    }

    if (accessMode === 'register' && registerCompletionOpen) {
      return
    }

    const isOauthReturn = searchParams.get('oauth') === '1'

    if (isOauthReturn) {
      const nextAudience = lockedAudience || normalizeAudience(searchParams.get('audience') || selectedAudience)
      const target = resolveAudienceTarget(nextAudience, redirectTarget)

      if (accessMode === 'register') {
        if (!registerCompletionOpen) {
          openRegisterCompletion(session.username || session.name || '')
        }

        return
      }

      void (async () => {
        if (session.audience !== nextAudience) {
          await setMemberAudience(nextAudience)
        }

        navigate(target, { replace: true })
      })()

      return
    }

    if (lockedAudience) {
      void (async () => {
        if (session.audience !== lockedAudience) {
          await setMemberAudience(lockedAudience)
        }

        navigate(resolveAudienceTarget(lockedAudience, redirectTarget), { replace: true })
      })()

      return
    }

    if (session.audience === 'model') {
      navigate(resolveAudienceTarget('model', redirectTarget), { replace: true })
    }
  }, [
    navigate,
    lockedAudience,
    redirectTarget,
    searchParams,
    selectedAudience,
    session,
    setMemberAudience,
    accessMode,
    registerCompletionOpen,
  ])

  function resetFlowMessages() {
    setError('')
    setNotice('')
    setWhatsappError('')
    setWhatsappStatus('')
  }

  function openRegisterCompletion(username = '') {
    setRegisterCompletionError('')
    setRegisterCompletionOpen(true)
    setFormValues((current) => ({
      ...current,
      registerUsername:
        normalizeIdentifierInput(username) ||
        normalizeIdentifierInput(current.registerUsername) ||
        normalizeIdentifierInput(session?.username || ''),
    }))
  }

  function updateFormField(field, value) {
    setFormValues((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function handleAudienceSelect(audience) {
    if (lockedAudience) {
      return
    }

    const normalized = normalizeAudience(audience)
    setSelectedAudience(normalized)
    resetFlowMessages()
  }

  function handleModeChange(mode) {
    setAccessMode(mode)
    setRegisterCompletionOpen(false)
    setRegisterCompletionError('')
  }

  async function finalizeAccess(nextAudience = selectedAudience) {
    const normalizedAudience = normalizeAudience(nextAudience)
    const target = resolveAudienceTarget(normalizedAudience, redirectTarget)

    if (session?.audience !== normalizedAudience) {
      await setMemberAudience(normalizedAudience)
    }

    navigate(target, { replace: true })
  }

  async function handleOAuthLogin(provider) {
    resetFlowMessages()
    setIsSubmitting(true)

    try {
      await loginMemberWithOAuth(provider, resolveAudienceTarget(selectedAudience, redirectTarget), {
        audience: selectedAudience,
      })
    } catch (nextError) {
      setError(nextError.message || 'No se pudo iniciar el acceso social.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRegisterCompletion(event) {
    event.preventDefault()
    resetFlowMessages()
    setRegisterCompletionError('')

    const normalizedUsername = normalizeIdentifierInput(formValues.registerUsername).toLowerCase()

    if (!normalizedUsername) {
      setRegisterCompletionError('Escribe un nombre de usuario para continuar.')
      return
    }

    setIsSubmitting(true)

    try {
      await updateMyProfile({
        name: normalizeIdentifierInput(formValues.registerDisplayName) || session?.name || normalizedUsername,
        username: normalizedUsername,
      })

      setRegisterCompletionOpen(false)
      setSelectedMethod('')
      await finalizeAccess(selectedAudience)
    } catch (nextError) {
      setRegisterCompletionError(nextError.message || 'No se pudo completar el perfil.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSubmitPasswordAccess(event) {
    event.preventDefault()
    resetFlowMessages()
    setIsSubmitting(true)

    try {
      if (accessMode === 'register') {
        if (!normalizedRegisterUsername || !normalizedRegisterEmail || !normalizedRegisterPassword) {
          throw new Error('Completa usuario, correo y contrasena para crear tu cuenta.')
        }

        const nextSession = await signUpMemberWithEmail({
          email: normalizedRegisterEmail,
          password: normalizedRegisterPassword,
          username: normalizedRegisterUsername,
          displayName: normalizeIdentifierInput(formValues.registerDisplayName) || normalizedRegisterUsername,
          audience: selectedAudience,
          phone: normalizedWhatsappPhone,
          whatsappVerified:
            Boolean(normalizedWhatsappPhone) && normalizedWhatsappPhone === whatsappVerifiedPhone,
        })

        if (nextSession?.requiresEmailConfirmation) {
          setNotice(
            'Revisa tu correo para confirmar la cuenta. Cuando entres, volveras con el panel que elegiste.',
          )
          return
        }

        await finalizeAccess(selectedAudience)
        return
      }

      if (!normalizedLoginIdentifier || !normalizedLoginPassword) {
        throw new Error('Completa usuario o correo y contrasena para entrar.')
      }

      await loginMemberWithEmail({
        identifier: normalizedLoginIdentifier,
        password: normalizedLoginPassword,
      })
      await finalizeAccess(selectedAudience)
    } catch (nextError) {
      setError(nextError.message || 'No se pudo completar el acceso.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSendWhatsappCode() {
    resetFlowMessages()

    if (whatsappVerificationEnabled === false) {
      setWhatsappError('WhatsApp requiere OpenWA configurado en el servidor.')
      return
    }

    if (!normalizedWhatsappPhone) {
      setWhatsappError('Escribe un telefono valido con codigo de pais.')
      return
    }

    setIsSendingWhatsappCode(true)

    try {
      const result = await requestWhatsappVerificationCode({
        phone: normalizedWhatsappPhone,
        purpose: accessMode === 'register' ? 'register' : 'login',
      })
      setWhatsappChallengeId(result.challengeId || '')
      updateFormField('whatsappCode', '')
      setWhatsappVerifiedPhone('')
      setWhatsappStatus(
        accessMode === 'register'
          ? 'Te enviamos un codigo por WhatsApp para verificar tu telefono.'
          : 'Te enviamos un codigo por WhatsApp. Ingresalo para entrar.',
      )
    } catch (nextError) {
      setWhatsappError(nextError.message || 'No se pudo enviar el codigo de WhatsApp.')
    } finally {
      setIsSendingWhatsappCode(false)
    }
  }

  async function handleVerifyWhatsappCode() {
    if (!whatsappChallengeId) {
      setWhatsappError('Primero envia un codigo de WhatsApp.')
      return
    }

    if (!normalizeIdentifierInput(formValues.whatsappCode)) {
      setWhatsappError('Escribe el codigo que recibiste por WhatsApp.')
      return
    }

    setIsVerifyingWhatsappCode(true)
    setWhatsappError('')
    setWhatsappStatus('')
    setError('')
    setNotice('')

    try {
      if (accessMode === 'register') {
        const result = await verifyWhatsAppCode({
          challengeId: whatsappChallengeId,
          code: normalizeIdentifierInput(formValues.whatsappCode),
          purpose: 'register',
        })

        setWhatsappVerifiedPhone(result.phone || normalizedWhatsappPhone)
        if (result.email && result.password) {
          await loginMemberWithEmail({
            identifier: result.email,
            password: result.password,
          })
        }

        openRegisterCompletion(result.displayName || '')
        setWhatsappStatus('Telefono verificado. Completa tu usuario para terminar el registro.')
        setSelectedMethod('')
        return
      }

      await loginMemberWithWhatsApp({
        challengeId: whatsappChallengeId,
        code: normalizeIdentifierInput(formValues.whatsappCode),
      })
      await finalizeAccess(selectedAudience)
    } catch (nextError) {
      setWhatsappError(nextError.message || 'No se pudo validar el acceso por WhatsApp.')
    } finally {
      setIsVerifyingWhatsappCode(false)
    }
  }

  const isWhatsappReady = whatsappVerificationEnabled === true
  const isWhatsappLoading = whatsappVerificationEnabled === null
  const activeRedirect = resolveAudienceTarget(selectedAudience, redirectTarget)
  const isAudienceLocked = Boolean(lockedAudience)

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
            <p className="access-auth-eyebrow">
              {session ? 'Acceso activo' : isAudienceLocked ? 'Acceso de modelo' : accessMode === 'register' ? 'Crear cuenta' : 'Entrar'}
            </p>
            <h1>
              {session
                ? 'Ahora elige tu panel'
                : isAudienceLocked
                  ? accessMode === 'register'
                    ? 'Crea tu acceso de modelo'
                    : 'Entra a tu acceso de modelo'
                  : accessMode === 'register'
                    ? 'Crea tu acceso y elige tu panel'
                    : 'Entra a tu cuenta y elige tu panel'}
            </h1>
            <p>
              {session
                ? 'Ya validaste tu cuenta. El siguiente paso es decidir si sigues como modelo o como cliente.'
                : isAudienceLocked
                  ? 'Este acceso va directo al flujo de modelo. Elige un metodo y seguimos sin pasos extra.'
                  : 'Primero eliges si vas como modelo o cliente. Despues seleccionas el metodo y completas tu acceso con usuario, correo, contrasena o WhatsApp.'}
            </p>
          </div>

          <div className="access-auth-stack">
            <div className="access-auth-authbox">
              {!isAudienceLocked ? (
                <div className="access-auth-section">
                  <div className="access-auth-section-copy">
                    <p className="access-auth-eyebrow">Tipo de cuenta</p>
                    <p className="access-auth-helper">
                      Este selector ya deja listo el destino antes de elegir el metodo.
                    </p>
                  </div>

                  <div className="access-auth-tabs" role="tablist" aria-label="Tipo de cuenta">
                    <button
                      type="button"
                      className={`access-auth-tab ${selectedAudience === 'model' ? 'is-active' : ''}`}
                      role="tab"
                      aria-selected={selectedAudience === 'model'}
                      onClick={() => handleAudienceSelect('model')}
                    >
                      Modelo
                    </button>
                    <button
                      type="button"
                      className={`access-auth-tab ${selectedAudience !== 'model' ? 'is-active' : ''}`}
                      role="tab"
                      aria-selected={selectedAudience !== 'model'}
                      onClick={() => handleAudienceSelect('client')}
                    >
                      Cliente
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="access-auth-section">
                <div className="access-auth-section-copy">
                  <p className="access-auth-eyebrow">Modo</p>
                  <p className="access-auth-helper">
                    Elige si vas a entrar con una cuenta existente o crear una nueva.
                  </p>
                </div>

                <div className="access-auth-tabs" role="tablist" aria-label="Modo de acceso">
                  <button
                    type="button"
                    className={`access-auth-tab ${accessMode === 'login' ? 'is-active' : ''}`}
                    role="tab"
                    aria-selected={accessMode === 'login'}
                    onClick={() => handleModeChange('login')}
                  >
                    Entrar
                  </button>
                  <button
                    type="button"
                    className={`access-auth-tab ${accessMode === 'register' ? 'is-active' : ''}`}
                    role="tab"
                    aria-selected={accessMode === 'register'}
                    onClick={() => handleModeChange('register')}
                  >
                    Registrar
                  </button>
                </div>
              </div>

              <div className="access-auth-section">
                <div className="access-auth-section-copy">
                  <p className="access-auth-eyebrow">
                    {accessMode === 'register' ? 'Crear acceso' : 'Entrar al acceso'}
                  </p>
                  <p className="access-auth-helper">
                    {accessMode === 'register'
                      ? 'Usa un metodo rapido o completa el formulario sin salir de la vista.'
                      : 'Usa un metodo rapido o entra con usuario y contrasena en la misma tarjeta.'}
                  </p>
                </div>

                <div className="access-auth-buttons" role="group" aria-label={accessMode === 'register' ? 'Metodos para registrar' : 'Metodos para entrar'}>
                  <button
                    className="access-auth-button access-auth-button-google"
                    type="button"
                    onClick={() => setSelectedMethod('google')}
                    disabled={isSubmitting || !isSupabaseConfigured}
                  >
                    <span className="access-auth-method-icon" aria-hidden="true">
                      <FcGoogle />
                    </span>
                    <span className="access-auth-button-copy">
                      <strong>{accessMode === 'register' ? 'Registrar con Google' : 'Entrar con Google'}</strong>
                    </span>
                  </button>

                  <button
                    className="access-auth-button access-auth-button-whatsapp"
                    type="button"
                    onClick={() => setSelectedMethod('whatsapp')}
                    disabled={isWhatsappLoading || !isSupabaseConfigured}
                  >
                    <span className="access-auth-method-icon access-auth-method-icon-whatsapp" aria-hidden="true">
                      <BiLogoWhatsapp />
                    </span>
                    <span className="access-auth-button-copy">
                      <strong>{accessMode === 'register' ? 'Registrar con WhatsApp' : 'Entrar con WhatsApp'}</strong>
                    </span>
                  </button>

                  <button
                    className="access-auth-button access-auth-button-x"
                    type="button"
                    onClick={() => setSelectedMethod('twitter')}
                    disabled={isSubmitting || !isSupabaseConfigured}
                  >
                    <span className="access-auth-method-icon access-auth-method-icon-x" aria-hidden="true">
                      <AiFillX />
                    </span>
                    <span className="access-auth-button-copy">
                      <strong>{accessMode === 'register' ? 'Registrar con X' : 'Entrar con X'}</strong>
                    </span>
                  </button>

                  <button
                    className="access-auth-button access-auth-button-password"
                    type="button"
                    onClick={() => setSelectedMethod('password')}
                  >
                    <span className="access-auth-method-icon access-auth-method-icon-password" aria-hidden="true">
                      Aa
                    </span>
                    <span className="access-auth-button-copy">
                      <strong>{accessMode === 'register' ? 'Formulario de registro' : 'Usuario y contrasena'}</strong>
                    </span>
                  </button>
                </div>

                <p className="access-auth-note">Toca un metodo para abrir su modal y continuar.</p>
              </div>

              {selectedMethod ? (
                <div
                  className="access-method-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="access-method-modal-title"
                  aria-describedby="access-method-modal-desc"
                  onClick={() => setSelectedMethod('')}
                >
                  <div
                    className="access-method-modal-card"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="access-method-modal-head">
                      <div className="access-method-modal-copy">
                        <p className="access-auth-eyebrow">
                          {selectedMethod === 'whatsapp'
                            ? accessMode === 'register'
                              ? 'Verificacion'
                              : 'WhatsApp'
                            : selectedMethod === 'password'
                              ? accessMode === 'register'
                                ? 'Registro'
                                : 'Acceso'
                              : 'Metodo social'}
                        </p>
                        <h2 id="access-method-modal-title">
                          {selectedMethod === 'google'
                            ? accessMode === 'register'
                              ? 'Registrar con Google'
                              : 'Entrar con Google'
                            : selectedMethod === 'twitter'
                              ? accessMode === 'register'
                                ? 'Registrar con X'
                                : 'Entrar con X'
                              : selectedMethod === 'whatsapp'
                                ? accessMode === 'register'
                                  ? 'Verificar telefono con WhatsApp'
                                  : 'Entrar con WhatsApp'
                                : accessMode === 'register'
                                  ? 'Crear acceso con usuario y contrasena'
                                  : 'Entrar con usuario y contrasena'}
                        </h2>
                        <p id="access-method-modal-desc">
                          {selectedMethod === 'google'
                            ? 'Usa tu cuenta de Google para continuar en una sola ventana.'
                            : selectedMethod === 'twitter'
                              ? 'Usa tu cuenta de X para continuar sin salir del flujo.'
                              : selectedMethod === 'whatsapp'
                                ? accessMode === 'register'
                                  ? 'Verificamos tu numero una sola vez antes de terminar el registro.'
                                  : 'Te enviamos un codigo para entrar a una cuenta ya existente.'
                                : accessMode === 'register'
                                  ? 'Completa tus datos y crea el acceso sin dejar la tarjeta.'
                                  : 'Escribe tus credenciales y entra desde esta misma ventana.'}
                        </p>
                      </div>

                      <button
                        type="button"
                        className="access-method-modal-close"
                        onClick={() => setSelectedMethod('')}
                        aria-label="Cerrar modal"
                      >
                        Cerrar
                      </button>
                    </div>

                    {selectedMethod === 'google' ? (
                      <div className="access-method-modal-body">
                        <button
                          type="button"
                          className="hero-primary-cta"
                          onClick={() => void handleOAuthLogin('google')}
                          disabled={isSubmitting || !isSupabaseConfigured}
                        >
                          {isSubmitting ? 'Abriendo Google...' : accessMode === 'register' ? 'Registrar con Google' : 'Entrar con Google'}
                        </button>
                      </div>
                    ) : null}

                    {selectedMethod === 'twitter' ? (
                      <div className="access-method-modal-body">
                        <button
                          type="button"
                          className="hero-primary-cta"
                          onClick={() => void handleOAuthLogin('twitter')}
                          disabled={isSubmitting || !isSupabaseConfigured}
                        >
                          {isSubmitting ? 'Abriendo X...' : accessMode === 'register' ? 'Registrar con X' : 'Entrar con X'}
                        </button>
                      </div>
                    ) : null}

                    {selectedMethod === 'whatsapp' ? (
                      <div className="access-method-modal-body access-whatsapp-panel">
                        <label className="access-auth-field">
                          <span>Telefono WhatsApp</span>
                          <input
                            type="tel"
                            autoComplete="tel"
                            inputMode="tel"
                            value={formValues.whatsappPhone}
                            onChange={(event) => updateFormField('whatsappPhone', event.target.value)}
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
                              value={formValues.whatsappCode}
                              onChange={(event) => updateFormField('whatsappCode', event.target.value)}
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
                          {isVerifyingWhatsappCode
                            ? 'Validando...'
                            : accessMode === 'register'
                              ? 'Verificar numero'
                              : 'Entrar con codigo'}
                        </button>
                      </div>

                      <p className="access-auth-note">
                        {isWhatsappLoading
                          ? 'Comprobando la configuracion de WhatsApp...'
                          : isWhatsappReady
                            ? accessMode === 'register'
                              ? 'WhatsApp esta listo para verificar tu numero antes de crear la cuenta.'
                              : 'WhatsApp esta listo para abrir tu sesion existente.'
                            : 'WhatsApp todavia no esta configurado. Activa OpenWA para usar este metodo.'}
                      </p>
                    </div>
                    ) : null}

                    {selectedMethod === 'password' ? (
                      <form className="access-method-modal-body access-credentials-panel" onSubmit={(event) => void handleSubmitPasswordAccess(event)}>
                        {accessMode === 'register' ? (
                          <>
                            <label className="access-auth-field">
                              <span>Nombre visible</span>
                              <input
                                type="text"
                                autoComplete="name"
                                value={formValues.registerDisplayName}
                                onChange={(event) => updateFormField('registerDisplayName', event.target.value)}
                                placeholder="Tu nombre publico"
                              />
                            </label>

                            <label className="access-auth-field">
                              <span>Usuario</span>
                              <input
                                type="text"
                                autoComplete="username"
                                value={formValues.registerUsername}
                                onChange={(event) => updateFormField('registerUsername', event.target.value)}
                                placeholder="tu_usuario"
                              />
                            </label>

                            <label className="access-auth-field">
                              <span>Correo</span>
                              <input
                                type="email"
                                autoComplete="email"
                                value={formValues.registerEmail}
                                onChange={(event) => updateFormField('registerEmail', event.target.value)}
                                placeholder="tu@email.com"
                              />
                            </label>

                            <label className="access-auth-field">
                              <span>Telefono WhatsApp opcional</span>
                              <input
                                type="tel"
                                autoComplete="tel"
                                inputMode="tel"
                                value={formValues.whatsappPhone}
                                onChange={(event) => updateFormField('whatsappPhone', event.target.value)}
                                placeholder="+51 999 999 999"
                              />
                            </label>

                            {normalizedWhatsappPhone && whatsappVerifiedPhone === normalizedWhatsappPhone ? (
                              <p className="access-auth-success">Numero verificado. Ya puedes terminar el registro.</p>
                            ) : null}
                          </>
                        ) : (
                          <label className="access-auth-field">
                            <span>Usuario, correo o telefono</span>
                            <input
                              type="text"
                              autoComplete="username"
                              value={formValues.loginIdentifier}
                              onChange={(event) => updateFormField('loginIdentifier', event.target.value)}
                              placeholder="tu_usuario, correo o telefono"
                            />
                          </label>
                        )}

                        <label className="access-auth-field">
                          <span>Contrasena</span>
                          <input
                            type="password"
                            autoComplete={accessMode === 'register' ? 'new-password' : 'current-password'}
                            value={accessMode === 'register' ? formValues.registerPassword : formValues.loginPassword}
                            onChange={(event) =>
                              updateFormField(
                                accessMode === 'register' ? 'registerPassword' : 'loginPassword',
                                event.target.value,
                              )
                            }
                            placeholder="Tu contrasena"
                          />
                        </label>

                        <button type="submit" className="hero-primary-cta" disabled={isSubmitting || !isSupabaseConfigured}>
                          {isSubmitting ? 'Procesando...' : accessMode === 'register' ? 'Crear cuenta' : 'Entrar'}
                        </button>

                        <p className="access-auth-note">
                          {accessMode === 'register'
                            ? 'Despues de crear la cuenta, te llevamos al panel elegido arriba.'
                            : 'Este acceso acepta usuario, correo y telefono porque ya tenemos perfiles con identificador propio.'}
                        </p>
                      </form>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {registerCompletionOpen ? (
                <div
                  className="access-method-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="access-register-completion-title"
                  aria-describedby="access-register-completion-desc"
                  onClick={() => setRegisterCompletionOpen(false)}
                >
                  <div
                    className="access-method-modal-card"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="access-method-modal-head">
                      <div className="access-method-modal-copy">
                        <p className="access-auth-eyebrow">Completar perfil</p>
                        <h2 id="access-register-completion-title">Elige tu nombre de usuario</h2>
                        <p id="access-register-completion-desc">
                          Ya validamos tu acceso. Solo falta guardar tu nombre de usuario para terminar el registro.
                        </p>
                      </div>

                      <button
                        type="button"
                        className="access-method-modal-close"
                        onClick={() => setRegisterCompletionOpen(false)}
                        aria-label="Cerrar modal"
                      >
                        Cerrar
                      </button>
                    </div>

                    <form className="access-method-modal-body access-credentials-panel" onSubmit={(event) => void handleRegisterCompletion(event)}>
                      <label className="access-auth-field">
                        <span>Usuario obligatorio</span>
                        <input
                          type="text"
                          autoComplete="username"
                          value={formValues.registerUsername}
                          onChange={(event) => updateFormField('registerUsername', event.target.value)}
                          placeholder="tu_usuario"
                        />
                      </label>

                      <p className="access-auth-note">
                        No te pedimos contraseña aquí. La contraseña solo aparece en el método de registro con clave.
                      </p>

                      <button type="submit" className="hero-primary-cta" disabled={isSubmitting || !isSupabaseConfigured}>
                        {isSubmitting ? 'Guardando...' : 'Guardar usuario y continuar'}
                      </button>

                      {registerCompletionError ? (
                        <p className="access-auth-error">{registerCompletionError}</p>
                      ) : null}
                    </form>
                  </div>
                </div>
              ) : null}

              <div className="access-auth-mini-actions">
                <button type="button" className="video-preview-link" onClick={() => navigate('/')}>
                  Volver al inicio
                </button>
              </div>
            </div>
          </div>

          {session && !isAudienceLocked ? (
            <div className="access-audience-panel">
              <div className="access-role-grid access-auth-choice-grid" aria-label="Seleccion de panel">
                <button
                  type="button"
                  className={`access-role-card access-auth-choice-card ${
                    selectedAudience === 'model' ? 'is-highlighted is-selected' : ''
                  }`}
                  onClick={() => void finalizeAccess('model')}
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
                  onClick={() => void finalizeAccess('client')}
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
                  onClick={() => void finalizeAccess('visitor')}
                  disabled={isSubmitting}
                >
                  Entrar como visitante
                </button>
                <button type="button" className="video-preview-link" onClick={() => navigate('/')}>
                  Volver al inicio
                </button>
              </div>
            </div>
          ) : null}

          {error ? <p className="access-auth-error">{error}</p> : null}
          {notice ? <p className="access-auth-success">{notice}</p> : null}
          {whatsappStatus ? <p className="access-auth-success">{whatsappStatus}</p> : null}
          {whatsappError ? <p className="access-auth-error">{whatsappError}</p> : null}
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

