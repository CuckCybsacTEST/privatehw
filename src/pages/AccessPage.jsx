import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PublicNav } from '../components/PublicNav'
import { SiteFooter } from '../components/SiteFooter'
import { useAppState } from '../state/AppState'

export function AccessPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/'
  const {
    session,
    siteContent,
    loginMemberWithEmail,
    logout,
    signUpMemberWithEmail,
    subscriptionProducts,
  } = useAppState()
  const [mode, setMode] = useState('login')
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [registerForm, setRegisterForm] = useState({
    displayName: '',
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const highlightedPlan = subscriptionProducts[0] || null

  function handleLoginChange(event) {
    const { name, value } = event.target
    setLoginForm((current) => ({ ...current, [name]: value }))
  }

  function handleRegisterChange(event) {
    const { name, value } = event.target
    setRegisterForm((current) => ({ ...current, [name]: value }))
  }

  async function handleLoginSubmit(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    setIsSubmitting(true)

    try {
      await loginMemberWithEmail(loginForm)
      navigate(redirectTo, { replace: true })
    } catch (nextError) {
      setError(nextError.message || 'No se pudo iniciar sesion.')
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

      if (result.requiresEmailConfirmation) {
        setNotice(
          'La cuenta fue creada. Revisa tu correo para confirmar el acceso antes de comprar.',
        )
        setMode('login')
        return
      }

      navigate(redirectTo, { replace: true })
    } catch (nextError) {
      setError(nextError.message || 'No se pudo crear la cuenta.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="creator-home">
      <PublicNav />
      <section className="content-listing-page access-page">
        <Link className="content-back-link" to="/">
          Volver a la home
        </Link>

        <div className="access-layout">
          <article className="access-card access-card-copy">
            <p className="section-kicker">Acceso del cliente</p>
            <h1>Entrar o crear cuenta para desbloquear contenido</h1>
            <p>
              Usa tu cuenta para gestionar compras, revisar accesos activos y desbloquear
              videos, packs y publicaciones premium.
            </p>

            {highlightedPlan ? (
              <div className="access-plan-highlight">
                <strong>{highlightedPlan.priceLabel}</strong>
                <span>
                  Acceso total desde {highlightedPlan.metadata?.planPeriod || 'tu plan activo'} para
                  desbloquear todo el contenido digital.
                </span>
              </div>
            ) : null}

            {session ? (
              <div className="access-session-card">
                <p>Sesion activa como</p>
                <strong>{session.email}</strong>
                <span>
                  {session.role === 'admin'
                    ? 'Administrador con acceso total.'
                    : 'Cliente autenticado listo para comprar.'}
                </span>
                <div className="access-session-actions">
                  <button
                    className="hero-primary-cta"
                    type="button"
                    onClick={() => navigate('/library')}
                  >
                    Ir a mi biblioteca
                  </button>
                  <button className="video-preview-link" type="button" onClick={logout}>
                    Cerrar sesion
                  </button>
                </div>
              </div>
            ) : null}
          </article>

          <article className="access-card access-card-form">
            <div className="access-tabs" role="tablist" aria-label="Acceso del cliente">
              <button
                className={mode === 'login' ? 'is-active' : ''}
                type="button"
                onClick={() => setMode('login')}
              >
                Iniciar sesion
              </button>
              <button
                className={mode === 'register' ? 'is-active' : ''}
                type="button"
                onClick={() => setMode('register')}
              >
                Crear cuenta
              </button>
            </div>

            {mode === 'login' ? (
              <form className="access-form" onSubmit={handleLoginSubmit}>
                <label className="admin-field">
                  <span>Correo</span>
                  <input
                    type="email"
                    name="email"
                    value={loginForm.email}
                    onChange={handleLoginChange}
                    required
                  />
                </label>
                <label className="admin-field">
                  <span>Clave</span>
                  <input
                    type="password"
                    name="password"
                    value={loginForm.password}
                    onChange={handleLoginChange}
                    required
                  />
                </label>
                {error ? <p className="admin-error">{error}</p> : null}
                {notice ? <p className="admin-note">{notice}</p> : null}
                <button className="admin-primary-button" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Entrando...' : 'Ingresar'}
                </button>
              </form>
            ) : (
              <form className="access-form" onSubmit={handleRegisterSubmit}>
                <label className="admin-field">
                  <span>Nombre visible</span>
                  <input
                    type="text"
                    name="displayName"
                    value={registerForm.displayName}
                    onChange={handleRegisterChange}
                    required
                  />
                </label>
                <label className="admin-field">
                  <span>Correo</span>
                  <input
                    type="email"
                    name="email"
                    value={registerForm.email}
                    onChange={handleRegisterChange}
                    required
                  />
                </label>
                <label className="admin-field">
                  <span>Clave</span>
                  <input
                    type="password"
                    name="password"
                    value={registerForm.password}
                    onChange={handleRegisterChange}
                    minLength={8}
                    required
                  />
                </label>
                {error ? <p className="admin-error">{error}</p> : null}
                {notice ? <p className="admin-note">{notice}</p> : null}
                <button className="admin-primary-button" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creando...' : 'Crear cuenta'}
                </button>
              </form>
            )}
          </article>
        </div>
      </section>
      <SiteFooter content={siteContent} />
    </main>
  )
}
