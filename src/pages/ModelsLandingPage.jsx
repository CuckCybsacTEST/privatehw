import { Link } from 'react-router-dom'
import { AiOutlineRight } from 'react-icons/ai'
import { HiOutlineShieldCheck } from 'react-icons/hi'
import { Seo } from '../components/Seo'

const configurables = [
  {
    title: 'Perfil y presentación',
    description: 'Nombre, edad, nacionalidad, fotos, bio breve y mensaje de bienvenida.',
  },
  {
    title: 'Precio y disponibilidad',
    description: 'Tarifas, horarios, zonas de atención y estados visibles para el cliente.',
  },
  {
    title: 'Audio y media',
    description: 'Clip de voz, galería de imágenes y recursos multimedia para reforzar la ficha.',
  },
  {
    title: 'Enlaces externos',
    description: 'Integración de enlaces a plataformas de suscripción y redes sociales.',
  },
  {
    title: 'Contacto directo',
    description: 'WhatsApp, Telegram u otras vías de contacto que la modelo decida mostrar.',
  },
  {
    title: 'Promociones',
    description: 'Descuentos configurables para audiencias, campañas o ventanas de activación.',
  },
]

const steps = [
  {
    number: '01',
    title: 'Crea tu perfil',
    description: 'Registra tu ficha y completa la información principal que quieres mostrar.',
  },
  {
    number: '02',
    title: 'Configura tu propuesta',
    description: 'Ajusta precios, zonas, enlaces, audio y promociones desde un solo panel.',
  },
  {
    number: '03',
    title: 'Publica y recibe tráfico',
    description: 'Tu perfil queda accesible con URL propia y listo para captar visitas de calidad.',
  },
]

function FeatureCard({ title, description }) {
  return (
    <article className="models-landing-feature-card">
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  )
}

function SectionHeader({ kicker, title, description }) {
  return (
    <div className="section-heading models-landing-heading">
      {kicker ? <p className="section-kicker">{kicker}</p> : null}
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  )
}

export function ModelsLandingPage() {
  return (
    <main className="creator-home models-landing-page">
      <Seo
        title="Kinkly | Para modelos"
        description="Landing para modelos con alta de perfil, precios, disponibilidad, enlaces externos, audio, promociones y comisión transparente."
        canonicalPath="/modelos"
      />

      <div className="models-landing-shell">
        <section className="models-landing-hero">
          <div className="models-landing-hero-copy">
            <span className="catalog-home-kicker">
              <HiOutlineShieldCheck aria-hidden="true" />
              <span>Panel para perfiles profesionales</span>
            </span>
            <h1>Una plataforma para publicar tu perfil y controlar tu presencia digital</h1>
            <p>
              Kinkly centraliza el alta de perfiles, la configuración de precios, la visibilidad por ciudad y las
              herramientas para dirigir tráfico hacia tus canales preferidos.
            </p>

            <div className="models-landing-hero-actions">
              <Link className="hero-primary-cta" to="/admin/login">
                Crear perfil
              </Link>
              <Link className="hero-secondary-cta" to="/encuentros">
                Ver el catálogo
              </Link>
            </div>

            <div className="models-landing-hero-highlights">
              <article>
                <strong>10%</strong>
                <span>Comisión estándar por encuentro confirmado.</span>
              </article>
              <article>
                <strong>Audio</strong>
                <span>Presentación breve para reforzar la conexión.</span>
              </article>
              <article>
                <strong>Links</strong>
                <span>Redes, plataformas externas y contacto directo configurables.</span>
              </article>
            </div>
          </div>

          <div className="models-landing-hero-panel">
            <p className="section-kicker">Qué puedes activar</p>
            <ul className="models-landing-checklist">
              <li>Perfil editable con datos visibles y controlados.</li>
              <li>Precio, cobertura, horarios y estado de disponibilidad.</li>
              <li>Promociones configurables para audiencias y campañas.</li>
              <li>Integración de enlaces externos y redes sociales.</li>
              <li>Contacto por WhatsApp o Telegram si decides mostrarlo.</li>
            </ul>
          </div>
        </section>

        <section className="models-landing-section">
          <SectionHeader
            kicker="Configuración"
            title="Todo lo que una ficha necesita para funcionar bien"
            description="La idea es que cada perfil pueda publicarse con su propia identidad, sin perder consistencia ni control."
          />

          <div className="models-landing-feature-grid">
            {configurables.map((item) => (
              <FeatureCard key={item.title} title={item.title} description={item.description} />
            ))}
          </div>
        </section>

        <section className="models-landing-section models-landing-split">
          <div className="models-landing-copy-panel">
            <SectionHeader
              kicker="Promociones"
              title="Descuentos y campañas configurables"
              description="La ficha puede mostrar promociones especiales para comunidades, campañas de suscripción o ventanas temporales."
            />
            <p className="models-landing-body">
              Puedes definir un porcentaje de descuento y decidir cuándo mostrarlo. Así el perfil puede impulsar
              campañas puntuales sin perder control sobre su posicionamiento principal.
            </p>
          </div>

          <div className="models-landing-info-panel">
            <p className="section-kicker">Incluye</p>
            <ul>
              <li>Promociones para audiencias de suscripción.</li>
              <li>Descuentos temporales o por segmento.</li>
              <li>Mensajes visibles en la ficha pública.</li>
              <li>CTA directos hacia contacto o reserva.</li>
            </ul>
          </div>
        </section>

        <section className="models-landing-section">
          <SectionHeader
            kicker="Proceso"
            title="Un flujo corto para publicar y empezar a recibir visitas"
            description="La experiencia se mantiene simple: menos pasos, menos fricción y más claridad para la conversión."
          />

          <div className="models-landing-steps-grid">
            {steps.map((step) => (
              <article key={step.number} className="models-landing-step-card">
                <span className="models-landing-step-number">{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="models-landing-section">
          <div className="catalog-home-model-cta">
            <div className="catalog-home-model-cta-copy">
              <p className="section-kicker">Comisión y gestión</p>
              <h2>Transparencia operativa desde el primer día.</h2>
              <p>
                La plataforma aplica una comisión estándar del 10% por cada encuentro confirmado y centraliza la
                gestión para que puedas concentrarte en tu perfil y en tus clientes.
              </p>
            </div>

            <div className="catalog-home-model-cta-actions">
              <Link className="hero-primary-cta" to="/admin/login">
                Crear mi perfil
              </Link>
              <Link className="hero-secondary-cta" to="/encuentros">
                Ver catálogo
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
