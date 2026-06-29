import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { useAppState } from '../state/AppState'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const { isSupabaseConfigured, session, loginWithEmail, users } = useAppState()
  const { t } = useTranslation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const adminUsers = useMemo(
    () => users.filter((user) => user.role === 'admin' && user.status === 'active'),
    [users],
  )

  if (session?.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />
  }

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const nextSession = await loginWithEmail(form)

      if (nextSession?.role !== 'admin') {
        setError('Tu usuario no tiene permisos de admin.')
        return
      }

      navigate('/admin/dashboard')
    } catch (nextError) {
      setError(nextError.message || 'No se pudo iniciar sesion.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="admin-shell">
      <section className="admin-auth-card">
        <div className="admin-auth-copy">
          <p className="admin-eyebrow">{t('auth.eyebrow')}</p>
          <h1>{t('auth.title')}</h1>
          <p>{t('auth.description')}</p>
          <LanguageSwitcher className="admin-auth-language" />
        </div>

        <form className="admin-form" onSubmit={handleSubmit}>
          <label className="admin-field">
            <span>{t('auth.email')}</span>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="admin@example.com"
              required
            />
          </label>

          <label className="admin-field">
            <span>{t('auth.password')}</span>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="admin123"
              required
            />
          </label>

          {error ? <p className="admin-error">{error}</p> : null}

          <button className="admin-primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('auth.signingIn') : t('auth.signIn')}
          </button>
        </form>

        <div className="admin-hint">
          {isSupabaseConfigured ? (
            <>
              <p>{t('auth.supabaseActive')}</p>
              <p className="admin-note">{t('auth.useAdminUser')}</p>
            </>
          ) : (
            <>
              <p>{t('auth.localDemo')}</p>
              {adminUsers.map((user) => (
                <code key={user.id}>
                  {user.email}
                </code>
              ))}
            </>
          )}
          <p className="admin-note">
            {t('auth.localPrototyping')}
          </p>
        </div>
      </section>
    </main>
  )
}
