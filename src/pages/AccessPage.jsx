import { useMemo, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { useAppState } from '../state/AppState'
import { AiFillX } from 'react-icons/ai'
import { FcGoogle } from 'react-icons/fc'

export function AccessPage() {
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/'
  const {
    isSupabaseConfigured,
    session,
    loginMemberWithEmail,
    loginMemberWithOAuth,
    signUpMemberWithEmail,
  } = useAppState()
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('login')
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [registerForm, setRegisterForm] = useState({ displayName: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeOAuthProvider, setActiveOAuthProvider] = useState('')
  const postAuthTarget = redirectTo && redirectTo !== '/access' ? redirectTo : '/'

  const authTitle = useMemo(
    () => (activeTab === 'login' ? t('access.authTitle') : t('access.register')),
    [activeTab, t],
  )

  if (session) {
    return <Navigate to={postAuthTarget} replace />
  }

  function handleLoginChange(event) {
    const { name, value } = event.target
    setLoginForm((current) => ({ ...current, [name]: value }))
  }

  function handleRegisterChange(event) {
    const { name, value } = event.target
    setRegisterForm((current) => ({ ...current, [name]: value }))
  }

  function handleTabChange(nextTab) {
    setActiveTab(nextTab)
    setError('')
    setNotice('')
  }

  async function handleOAuthLogin(provider) {
    setError('')
    setNotice('')
    setIsSubmitting(true)
    setActiveOAuthProvider(provider)

    try {
      await loginMemberWithOAuth(provider, redirectTo || '/')
    } catch (nextError) {
      setError(nextError.message || t('access.oauthError'))
    } finally {
      setIsSubmitting(false)
      setActiveOAuthProvider('')
    }
  }

  async function handleLoginSubmit(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    setIsSubmitting(true)

    try {
      await loginMemberWithEmail(loginForm)
    } catch (nextError) {
      setError(nextError.message || t('access.loginError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRegisterSubmit(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    setIsSubmitting(true)

    try {
      const result = await signUpMemberWithEmail(registerForm)

      if (result?.requiresEmailConfirmation) {
        setNotice(t('access.emailConfirmation'))
        setActiveTab('login')
      }
    } catch (nextError) {
      setError(nextError.message || t('access.registerError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="access-auth-page">
      <section className="access-auth-shell">
        <div className="access-auth-card">
          <div className="access-auth-topbar">
            <Link className="access-auth-home-link" to={postAuthTarget}>
              {t('access.backHome')}
            </Link>
            <LanguageSwitcher className="access-auth-language" />
          </div>

          <div className="access-auth-brand" aria-hidden="true">
            <span className="access-auth-brand-mark">
              <AiFillX />
            </span>
          </div>

          <div className="access-oauth-block">
            <div className="access-oauth-actions">
              <button
                className="access-auth-button access-auth-button-google"
                type="button"
                onClick={() => handleOAuthLogin('google')}
                disabled={isSubmitting || !isSupabaseConfigured}
              >
                <span className="access-auth-button-icon" aria-hidden="true">
                  <FcGoogle />
                </span>
                <span>
                  {isSubmitting && activeOAuthProvider === 'google'
                    ? t('access.connecting')
                    : t('access.googleLogin')}
                </span>
              </button>

              <button
                className="access-auth-button access-auth-button-x"
                type="button"
                onClick={() => handleOAuthLogin('twitter')}
                disabled={isSubmitting || !isSupabaseConfigured}
              >
                <span className="access-auth-button-icon access-auth-button-icon-x" aria-hidden="true">
                  <AiFillX />
                </span>
                <span>
                  {isSubmitting && activeOAuthProvider === 'twitter'
                    ? t('access.connecting')
                    : t('access.xLogin')}
                </span>
              </button>
            </div>
          </div>

          <div className="access-auth-divider" aria-hidden="true">
            <span>{t('access.oauthDivider')}</span>
          </div>

          <div className="access-tabs" role="tablist" aria-label={t('access.ariaLabel')}>
            <button
              type="button"
              className={activeTab === 'login' ? 'is-active' : ''}
              onClick={() => handleTabChange('login')}
            >
              {t('access.login')}
            </button>
            <button
              type="button"
              className={activeTab === 'register' ? 'is-active' : ''}
              onClick={() => handleTabChange('register')}
            >
              {t('access.register')}
            </button>
          </div>

          <div className="access-card access-card-form">
            <div className="access-card-copy">
              <strong>{authTitle}</strong>
              <span>{t('access.authSubtitle')}</span>
            </div>

            {activeTab === 'login' ? (
              <form className="admin-form access-form" onSubmit={handleLoginSubmit}>
                <label className="admin-field">
                  <span>{t('access.email')}</span>
                  <input
                    type="email"
                    name="email"
                    value={loginForm.email}
                    onChange={handleLoginChange}
                    autoComplete="email"
                    placeholder="cliente@email.com"
                    required
                  />
                </label>

                <label className="admin-field">
                  <span>{t('access.password')}</span>
                  <input
                    type="password"
                    name="password"
                    value={loginForm.password}
                    onChange={handleLoginChange}
                    autoComplete="current-password"
                    placeholder="********"
                    required
                  />
                </label>

                <button className="hero-primary-cta" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? t('access.loggingIn') : t('access.loginSubmit')}
                </button>
              </form>
            ) : (
              <form className="admin-form access-form" onSubmit={handleRegisterSubmit}>
                <label className="admin-field">
                  <span>{t('access.displayName')}</span>
                  <input
                    type="text"
                    name="displayName"
                    value={registerForm.displayName}
                    onChange={handleRegisterChange}
                    autoComplete="nickname"
                    placeholder="Tu nombre"
                    maxLength={80}
                    required
                  />
                </label>

                <label className="admin-field">
                  <span>{t('access.email')}</span>
                  <input
                    type="email"
                    name="email"
                    value={registerForm.email}
                    onChange={handleRegisterChange}
                    autoComplete="email"
                    placeholder="cliente@email.com"
                    required
                  />
                </label>

                <label className="admin-field">
                  <span>{t('access.password')}</span>
                  <input
                    type="password"
                    name="password"
                    value={registerForm.password}
                    onChange={handleRegisterChange}
                    autoComplete="new-password"
                    placeholder="Minimo 6 caracteres"
                    minLength={6}
                    required
                  />
                </label>

                <button className="hero-primary-cta" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? t('access.creating') : t('access.registerSubmit')}
                </button>
              </form>
            )}
          </div>

          {!isSupabaseConfigured ? (
            <p className="access-auth-note">{t('access.oauthUnavailable')}</p>
          ) : null}

          {error ? <p className="access-auth-error">{error}</p> : null}
          {notice ? <p className="access-auth-note">{notice}</p> : null}
        </div>
      </section>
    </main>
  )
}
