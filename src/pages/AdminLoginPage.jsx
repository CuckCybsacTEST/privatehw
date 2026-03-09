import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAppState } from '../state/AppState'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const { isSupabaseConfigured, session, loginWithEmail, users } = useAppState()
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
          <p className="admin-eyebrow">Panel administrativo</p>
          <h1>Gestion interna del sitio</h1>
          <p>
            Desde aqui puedes actualizar imagenes, precios, enlaces y usuarios
            de trabajo.
          </p>
        </div>

        <form className="admin-form" onSubmit={handleSubmit}>
          <label className="admin-field">
            <span>Correo</span>
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
            <span>Clave</span>
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
            {isSubmitting ? 'Entrando...' : 'Entrar al panel'}
          </button>
        </form>

        <div className="admin-hint">
          {isSupabaseConfigured ? (
            <>
              <p>Supabase esta activo para autenticacion.</p>
              <p className="admin-note">
                Usa un usuario creado en Supabase Auth con rol `admin` en
                `public.profiles`.
              </p>
            </>
          ) : (
            <>
              <p>Demo admin local:</p>
              {adminUsers.map((user) => (
                <code key={user.id}>
                  {user.email} / {user.password}
                </code>
              ))}
            </>
          )}
          <p className="admin-note">
            Esta autenticacion es local para prototipado. Aun no reemplaza un
            backend seguro.
          </p>
        </div>
      </section>
    </main>
  )
}
