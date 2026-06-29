import { useState } from 'react'

function buildPrivateContactMessage(form) {
  const parts = [
    'Hola, quisiera recibir informacion privada.',
    form.name ? `Nombre: ${form.name}` : '',
    form.contact ? `Contacto preferido: ${form.contact}` : '',
    form.message ? `Mensaje: ${form.message}` : '',
  ].filter(Boolean)

  return parts.join('\n')
}

function openPrivateContactChannel(targetUrl, message) {
  if (!targetUrl) {
    return false
  }

  try {
    const url = new URL(targetUrl)

    if (url.hostname.includes('wa.me') || url.hostname.includes('whatsapp.com')) {
      url.searchParams.set('text', message)
    }

    window.open(url.toString(), '_blank', 'noopener,noreferrer')
    return true
  } catch {
    window.location.assign(targetUrl)
    return true
  }
}

export function PrivateContactSection({ content }) {
  const [form, setForm] = useState({
    name: '',
    contact: '',
    message: '',
  })
  const [statusMessage, setStatusMessage] = useState('')

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()

    const message = buildPrivateContactMessage(form)
    const opened = openPrivateContactChannel(content?.whatsappUrl || '', message)

    setStatusMessage(
      opened
        ? 'Canal privado abierto en una nueva pestana.'
        : 'No hay un canal de contacto configurado todavia.',
    )
  }

  return (
    <section className="private-contact-section" id="private-contact">
      <div className="section-heading section-heading-split">
        <div>
          <p className="section-kicker">Contacto privado</p>
          <h2>Formulario de contacto privado</h2>
          <p>
            Un acceso breve y discreto para coordinar consultas de forma reservada desde mobile o
            desktop.
          </p>
        </div>
      </div>

      <div className="private-contact-layout">
        <article className="private-contact-card">
          <span className="private-contact-label">Canal reservado</span>
          <h3>Escribe tu consulta y continuamos en privado</h3>
          <p>
            Este formulario no publica informacion. Se mantiene dentro de la experiencia privada
            del sitio.
          </p>
          <ul className="private-contact-points">
            <li>Respuesta directa</li>
            <li>Flujo discreto</li>
            <li>Acceso limitado a adultos verificados</li>
          </ul>
        </article>

        <form className="private-contact-form" onSubmit={handleSubmit}>
          <label>
            <span>Nombre o alias</span>
            <input
              name="name"
              autoComplete="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Tu nombre o alias"
            />
          </label>

          <label>
            <span>Contacto preferido</span>
            <input
              name="contact"
              autoComplete="email"
              value={form.contact}
              onChange={handleChange}
              placeholder="Correo o usuario"
            />
          </label>

          <label>
            <span>Mensaje</span>
            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              placeholder="Cuentanos brevemente lo que necesitas"
            />
          </label>

          <button className="hero-primary-cta private-contact-submit" type="submit">
            Enviar consulta privada
          </button>

          <p className="private-contact-status" aria-live="polite">
            {statusMessage || 'Tu mensaje se canaliza fuera de la vista publica.'}
          </p>
        </form>
      </div>
    </section>
  )
}
