import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { TelegramLoginWidget } from '../components/TelegramLoginWidget'
import { useAppState } from '../state/AppState'
import { AiFillX } from 'react-icons/ai'
import { BiLogoTelegram } from 'react-icons/bi'
import { FcGoogle } from 'react-icons/fc'
import { readClientEnv } from '../lib/runtimeEnv'

export function AccessPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/'
  const {
    isSupabaseConfigured,
    session,
    loginMemberWithOAuth,
    loginMemberWithTelegram,
  } = useAppState()
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeOAuthProvider, setActiveOAuthProvider] = useState('')
  const [telegramOpen, setTelegramOpen] = useState(false)
  const { t } = useTranslation()
  const telegramBotUsername = readClientEnv('VITE_TELEGRAM_BOT_USERNAME')
  const postAuthTarget = redirectTo && redirectTo !== '/access' ? redirectTo : '/'

  if (session) {
    return <Navigate to={postAuthTarget} replace />
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

  async function handleTelegramAuth(telegramUser) {
    setError('')
    setNotice('')
    setIsSubmitting(true)
    setActiveOAuthProvider('telegram')

    try {
      await loginMemberWithTelegram(telegramUser)
      setTelegramOpen(false)
      navigate('/', { replace: true })
    } catch (nextError) {
      setError(nextError.message || t('access.oauthError'))
    } finally {
      setIsSubmitting(false)
      setActiveOAuthProvider('')
    }
  }

  return (
    <main className="access-auth-page">
      <section className="access-auth-shell">
        <div className="access-auth-card">
          <div className="access-auth-topbar">
            <Link className="access-auth-home-link" to="/">
              {t('access.backHome')}
            </Link>
            <LanguageSwitcher className="access-auth-language" />
          </div>

          <div className="access-auth-brand" aria-hidden="true">
            <span className="access-auth-brand-mark">
              <AiFillX />
            </span>
          </div>

          <div className="access-auth-copy">
            <p className="access-auth-eyebrow">{t('access.eyebrow')}</p>
            <h1>{t('access.authTitle')}</h1>
            <p>{t('access.authSubtitle')}</p>
          </div>

          <div className="access-auth-buttons">
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

            <button
              className="access-auth-button access-auth-button-telegram"
              type="button"
              onClick={() => {
                setError('')
                setNotice('')
                setTelegramOpen((current) => !current)
              }}
              disabled={isSubmitting || !isSupabaseConfigured || !telegramBotUsername}
            >
              <span className="access-auth-button-icon access-auth-button-icon-telegram" aria-hidden="true">
                <BiLogoTelegram />
              </span>
              <span>
                {isSubmitting && activeOAuthProvider === 'telegram'
                  ? t('access.telegramConnecting')
                  : t('access.telegramLogin')}
              </span>
            </button>
          </div>

          {!isSupabaseConfigured ? (
            <p className="access-auth-note">{t('access.oauthUnavailable')}</p>
          ) : !telegramBotUsername ? (
            <p className="access-auth-note">{t('access.telegramUnavailable')}</p>
          ) : null}

          {telegramOpen && isSupabaseConfigured && telegramBotUsername ? (
            <div className="access-auth-telegram-panel">
              <p className="access-auth-note">{t('access.telegramLoginHint')}</p>
              <TelegramLoginWidget
                botUsername={telegramBotUsername}
                onAuth={handleTelegramAuth}
                onError={(nextError) => {
                  setError(nextError?.message || t('access.oauthError'))
                  setIsSubmitting(false)
                  setActiveOAuthProvider('')
                }}
              />
              <button
                className="access-auth-link"
                type="button"
                onClick={() => setTelegramOpen(false)}
              >
                {t('access.telegramClose')}
              </button>
            </div>
          ) : null}

          {error ? <p className="access-auth-error">{error}</p> : null}
          {notice ? <p className="access-auth-note">{notice}</p> : null}
        </div>
      </section>
    </main>
  )
}
