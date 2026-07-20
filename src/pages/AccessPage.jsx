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
  } = useAppState()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const redirectTarget = useMemo(() => {
    const candidate = String(searchParams.get('redirect') || '').trim()
    return candidate.startsWith('/') ? candidate : ''
  }, [searchParams])

  const initialAudience = useMemo(() => {
    const queryAudience = normalizeAudience(searchParams.get('audience'))
    if (queryAudience !== 'client') {
      return queryAudience
    }

    return getAudienceFromRedirect(redirectTarget)
  }, [redirectTarget, searchParams])

  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login'

  const [selectedAudience, setSelectedAudience] = useState(initialAudience)
  const [accessMode, setAccessMode] = useState(initialMode)
  const [selectedMethod, setSelectedMethod] = useState('')
  const [whatsappMode, setWhatsappMode] = useState('verification')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [whatsappVerificationEnabled, setWhatsappVerificationEnabled] = useState(null)
  const [whatsappChallengeId, setWhatsappChallengeId] = useState('')
  const [whatsappStatus, setWhatsappStatus] = useState('')
  const [whatsappError, setWhatsappError] = useState('')
  const [isSendingWhatsappCode, setIsSendingWhatsappCode] = useState(false)
  const [isVerifyingWhatsappCode, setIsVerifyingWhatsappCode] = useState(false)
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
      setSelectedMethod('')
      setWhatsappMode('verification')
      setFormValues(buildFormDefaults())
      setWhatsappChallengeId('')
      setWhatsappStatus('')
      setWhatsappError('')
    }
  }, [session?.id])

  useEffect(() => {
    setSelectedMethod('')
    setWhatsappMode('verification')
    setFormValues(buildFormDefaults())
    setError('')
    setNotice('')
    setWhatsappChallengeId('')
    setWhatsappStatus('')
    setWhatsappError('')
  }, [accessMode])

  useEffect(() => {
    setWhatsappChallengeId('')
    setWhatsappStatus('')
    setWhatsappError('')
    setFormValues((current) => ({
      ...current,
      whatsappCode: '',
    }))
  }, [normalizedWhatsappPhone])

  useEffect(() => {
    if (!session) {
      return
    }

    const isOauthReturn = searchParams.get('oauth') === '1'

    if (isOauthReturn) {
      const nextAudience = normalizeAudience(searchParams.get('audience') || selectedAudience)
      const target = resolveAudienceTarget(nextAudience, redirectTarget)

      void (async () => {
        if (session.audience !== nextAudience) {
          await setMemberAudience(nextAudience)
        }

        navigate(target, { replace: true })
      })()

      return
    }

    if (session.audience === 'model') {
      navigate(resolveAudienceTarget('model', redirectTarget), { replace: true })
    }
  }, [
    navigate,
    redirectTarget,
    searchParams,
    selectedAudience,
    session,
    setMemberAudience,
  ])

  function resetFlowMessages() {
    setError('')
    setNotice('')
    setWhatsappError('')
    setWhatsappStatus('')
  }

  function updateFormField(field, value) {
    setFormValues((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function handleAudienceSelect(audience) {
    const normalized = normalizeAudience(audience)
    setSelectedAudience(normalized)
    resetFlowMessages()
  }

  function handleModeChange(mode) {
    setAccessMode(mode)
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
          whatsappVerified: false,
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
      const result = await requestWhatsappVerificationCode({ phone: normalizedWhatsappPhone })
      setWhatsappChallengeId(result.challengeId || '')
      updateFormField('whatsappCode', '')
      setWhatsappStatus('Te enviamos un codigo por WhatsApp. Ingresalo para validar el acceso.')
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

  async function handleWhatsappPasswordLogin(event) {
    event.preventDefault()
    resetFlowMessages()
    setIsSubmitting(true)

    try {
      if (!normalizedWhatsappPasswordIdentifier || !normalizedWhatsappPassword) {
        throw new Error('Completa telefono, usuario o correo y contrasena.')
      }

      if (accessMode === 'register') {
        const identifierSeed = normalizedWhatsappPasswordIdentifier
        const looksLikeEmail = identifierSeed.includes('@')
        const looksLikePhone = /^\d+$/.test(normalizePhoneInput(identifierSeed))
        const derivedPhone = looksLikePhone ? normalizePhoneInput(identifierSeed) : normalizedWhatsappPhone
        const derivedEmail = looksLikeEmail
          ? identifierSeed
          : derivedPhone
            ? `whatsapp_${derivedPhone}@whatsapp.local`
            : `whatsapp_${identifierSeed.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'user'}@whatsapp.local`

        await signUpMemberWithEmail({
          email: derivedEmail,
          password: normalizedWhatsappPassword,
          username: looksLikeEmail ? identifierSeed.split('@')[0] : identifierSeed,
          displayName: normalizeIdentifierInput(formValues.registerDisplayName) || identifierSeed,
          audience: selectedAudience,
          phone: derivedPhone,
          whatsappVerified: false,
        })
      } else {
        await loginMemberWithEmail({
          identifier: normalizedWhatsappPasswordIdentifier,
          password: normalizedWhatsappPassword,
        })
      }

      await finalizeAccess(selectedAudience)
    } catch (nextError) {
      setWhatsappError(nextError.message || 'No se pudo entrar con WhatsApp y contrasena.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isWhatsappReady = whatsappVerificationEnabled === true
  const isWhatsappLoading = whatsappVerificationEnabled === null
  const activeRedirect = resolveAudienceTarget(selectedAudience, redirectTarget)

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
              {session ? 'Acceso activo' : accessMode === 'register' ? 'Crear cuenta' : 'Entrar'}
            </p>
            <h1>
              {session
                ? 'Ahora elige tu panel'
                : accessMode === 'register'
                  ? 'Crea tu acceso y elige tu panel'
                  : 'Entra a tu cuenta y elige tu panel'}
            </h1>
            <p>
              {session
                ? 'Ya validaste tu cuenta. El siguiente paso es decidir si sigues como modelo o como cliente.'
                : 'Primero eliges si vas como modelo o cliente. Despues seleccionas el metodo y completas tu acceso con usuario, correo, contrasena o WhatsApp.'}
            </p>
          </div>

          <div className="access-auth-stack">
            <div className="access-auth-authbox">
              <div className="access-auth-section">
                <div className="access-auth-section-copy">
                  <p className="access-auth-eyebrow">Tipo de cuenta</p>
                  <p className="access-auth-helper">
                    Este selector va primero para que el siguiente paso ya sepa a que panel te vamos a llevar.
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

              <div className="access-auth-section">
                <div className="access-auth-section-copy">
                  <p className="access-auth-eyebrow">Modo</p>
                  <p className="access-auth-helper">
                    Decide si vas a entrar con una cuenta existente o si vas a crear una nueva.
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
                  <p className="access-auth-eyebrow">Metodo de acceso</p>
                  <p className="access-auth-helper">
                    {accessMode === 'register'
                      ? 'Elige como quieres crear la cuenta.'
                      : 'Elige como quieres entrar a tu cuenta.'}
                  </p>
                </div>

                <div className="access-auth-method-grid" role="group" aria-label="Metodos de acceso">
                  <button
                    className="access-auth-method-card access-auth-method-card-google"
                    type="button"
                    onClick={() => void handleOAuthLogin('google')}
                    disabled={isSubmitting || !isSupabaseConfigured}
                  >
                    <span className="access-auth-method-icon" aria-hidden="true">
                      <FcGoogle />
                    </span>
                    <strong>{accessMode === 'register' ? 'Continuar con Google' : 'Entrar con Google'}</strong>
                    <p>Accede con tu cuenta de Google y sigue con el panel que elegiste.</p>
                  </button>

                  <button
                    className="access-auth-method-card access-auth-method-card-whatsapp"
                    type="button"
                    onClick={() => setSelectedMethod('whatsapp')}
                    disabled={isSubmitting || isWhatsappLoading || !isSupabaseConfigured}
                  >
                    <span className="access-auth-method-icon access-auth-method-icon-whatsapp" aria-hidden="true">
                      <BiLogoWhatsapp />
                    </span>
                    <strong>WhatsApp</strong>
                    <p>Verificacion por codigo o acceso con contrasena usando tu telefono.</p>
                  </button>

                  <button
                    className="access-auth-method-card access-auth-method-card-x"
                    type="button"
                    onClick={() => void handleOAuthLogin('twitter')}
                    disabled={isSubmitting || !isSupabaseConfigured}
                  >
                    <span className="access-auth-method-icon access-auth-method-icon-x" aria-hidden="true">
                      <AiFillX />
                    </span>
                    <strong>{accessMode === 'register' ? 'Continuar con X' : 'Entrar con X'}</strong>
                    <p>Usa tu cuenta social y despues afinamos el panel correcto.</p>
                  </button>

                  <button
                    className="access-auth-method-card access-auth-method-card-password"
                    type="button"
                    onClick={() => setSelectedMethod('password')}
                  >
                    <span className="access-auth-method-icon access-auth-method-icon-password" aria-hidden="true">
                      Aa
                    </span>
                    <strong>Usuario y contrasena</strong>
                    <p>{accessMode === 'register' ? 'Crea tu cuenta con tus propias credenciales.' : 'Entra con tu usuario, correo o telefono y tu contrasena.'}</p>
                  </button>
                </div>

                {selectedMethod === 'whatsapp' ? (
                  <div className="access-whatsapp-panel" aria-label="Acceso por WhatsApp">
                    <div className="access-auth-tabs access-auth-tabs-compact" role="tablist" aria-label="Modo WhatsApp">
                      <button
                        type="button"
                        className={`access-auth-tab ${whatsappMode === 'verification' ? 'is-active' : ''}`}
                        role="tab"
                        aria-selected={whatsappMode === 'verification'}
                        onClick={() => setWhatsappMode('verification')}
                      >
                        Verificacion
                      </button>
                      <button
                        type="button"
                        className={`access-auth-tab ${whatsappMode === 'password' ? 'is-active' : ''}`}
                        role="tab"
                        aria-selected={whatsappMode === 'password'}
                        onClick={() => setWhatsappMode('password')}
                      >
                        Contrasena
                      </button>
                    </div>

                    {whatsappMode === 'verification' ? (
                      <div className="access-whatsapp-panel-fields">
                        <div className="access-whatsapp-panel-copy">
                          <span className="access-audience-kicker">WhatsApp</span>
                          <strong>Valida tu telefono con un codigo</strong>
                          <p>
                            Te enviamos un codigo por WhatsApp. Cuando lo ingreses, tu acceso queda listo y
                            luego te llevamos al panel que elegiste.
                          </p>
                        </div>

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
                            {isVerifyingWhatsappCode ? 'Validando...' : 'Validar y entrar'}
                          </button>
                        </div>

                        <p className="access-auth-note">
                          {isWhatsappLoading
                            ? 'Comprobando la configuracion de WhatsApp...'
                            : isWhatsappReady
                              ? 'WhatsApp esta listo para verificacion.'
                              : 'WhatsApp todavia no esta configurado. Activa OpenWA para usar este metodo.'}
                        </p>
                      </div>
                    ) : (
                      <form className="access-whatsapp-panel-fields" onSubmit={(event) => void handleWhatsappPasswordLogin(event)}>
                        <div className="access-whatsapp-panel-copy">
                          <span className="access-audience-kicker">WhatsApp</span>
                          <strong>Entra con tu telefono y contrasena</strong>
                          <p>
                            Este modo usa tu telefono, usuario o correo y tu propia contrasena. Si prefieres,
                            puedes volver a verificacion en la pestaña anterior.
                          </p>
                        </div>

                        <label className="access-auth-field">
                          <span>Telefono, usuario o correo</span>
                          <input
                            type="text"
                            autoComplete="username"
                            value={formValues.whatsappPasswordIdentifier}
                            onChange={(event) =>
                              updateFormField('whatsappPasswordIdentifier', event.target.value)
                            }
                            placeholder="maria, maria@email.com o 51999111222"
                          />
                        </label>

                        <label className="access-auth-field">
                          <span>Contrasena</span>
                          <input
                            type="password"
                            autoComplete="current-password"
                            value={formValues.whatsappPassword}
                            onChange={(event) => updateFormField('whatsappPassword', event.target.value)}
                            placeholder="Tu contrasena"
                          />
                        </label>

                        <button type="submit" className="hero-primary-cta" disabled={isSubmitting || !isSupabaseConfigured}>
                          {isSubmitting ? 'Entrando...' : accessMode === 'register' ? 'Crear acceso' : 'Entrar'}
                        </button>
                      </form>
                    )}
                  </div>
                ) : null}

                {selectedMethod === 'password' ? (
                  <form className="access-credentials-panel" onSubmit={(event) => void handleSubmitPasswordAccess(event)}>
                    <div className="access-whatsapp-panel-copy">
                      <span className="access-audience-kicker">
                        {accessMode === 'register' ? 'Registro' : 'Acceso'}
                      </span>
                      <strong>
                        {accessMode === 'register'
                          ? 'Crea tu cuenta con usuario y contrasena'
                          : 'Entra con tu usuario, correo o telefono'}
                      </strong>
                      <p>
                        {accessMode === 'register'
                          ? 'Tu cuenta quedara lista para el panel que elegiste arriba.'
                          : 'Usa el identificador que ya guardaste en tu perfil.'}
                      </p>
                    </div>

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
                        value={
                          accessMode === 'register'
                            ? formValues.registerPassword
                            : formValues.loginPassword
                        }
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

                <p className="access-auth-note">
                  {selectedMethod
                    ? `El destino final ahora apunta a ${activeRedirect}.`
                    : 'Selecciona un metodo para continuar.'}
                </p>
              </div>

              <div className="access-auth-mini-actions">
                <button
                  type="button"
                  className="hero-secondary-cta"
                  onClick={() => setSelectedMethod('')}
                >
                  Limpiar metodo
                </button>
                <button type="button" className="video-preview-link" onClick={() => navigate('/')}>
                  Volver al inicio
                </button>
              </div>
            </div>
          </div>

          {session ? (
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
