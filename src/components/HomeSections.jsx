import { Link } from 'react-router-dom'
import { AiOutlineCalendar, AiOutlinePicture, AiOutlineRight, AiOutlineUser } from 'react-icons/ai'
import { HiOutlineLocationMarker } from 'react-icons/hi'
import { EncounterCatalogCard } from './EncounterCatalogCard'
import { buildCatalogFacetPath } from '../utils/encuentrosCatalog'

function SectionHeader({ kicker, title, description, actionLabel, actionTo }) {
  return (
    <div className="section-heading">
      {kicker ? <p className="section-kicker">{kicker}</p> : null}
      <div className="section-heading-split">
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {actionTo && actionLabel ? (
          <Link className="home-section-link" to={actionTo}>
            <span>{actionLabel}</span>
            <AiOutlineRight aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </div>
  )
}

export function PopularCitiesSection({ cities = [] }) {
  const visibleCities = Array.isArray(cities) ? cities.slice(0, 8) : []

  return (
    <section className="catalog-home-section">
      <SectionHeader
        kicker="Ciudades populares"
        title="Entra por ciudad y encuentra perfiles ya segmentados"
        description="La portada prioriza nodos locales para que el usuario llegue rapido a la ciudad que le interesa."
        actionLabel="Ver todas las ciudades"
        actionTo="/encuentros/ciudad"
      />

      {visibleCities.length ? (
        <div className="catalog-home-city-grid" aria-label="Ciudades populares">
          {visibleCities.map((city) => (
            <Link key={city} className="catalog-home-city-card" to={buildCatalogFacetPath('city', city)}>
              <HiOutlineLocationMarker aria-hidden="true" />
              <strong>{city}</strong>
              <span>Abre la landing local con perfiles publicados y rutas limpias.</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="catalog-home-empty-state">
          <p className="catalog-home-empty-title">Todavia no hay ciudades publicadas.</p>
          <p className="catalog-home-empty-copy">
            Cuando existan modelos con ciudad asignada, esta seccion mostrara los accesos prioritarios.
          </p>
        </div>
      )}
    </section>
  )
}

export function LatestAnnouncementsSection({ posts = [] }) {
  const visiblePosts = Array.isArray(posts) ? posts.slice(0, 10) : []

  return (
    <section className="catalog-home-section">
      <p className="section-kicker catalog-home-latest-kicker">Ultimos anuncios</p>

      {visiblePosts.length ? (
        <>
          <div className="encuentros-catalog-grid catalog-home-latest-grid" aria-label="Ultimos anuncios">
            {visiblePosts.map((model) => (
              <EncounterCatalogCard key={model.slug} model={model} />
            ))}
          </div>
          <div className="catalog-home-latest-actions">
            <Link className="home-section-link" to="/encuentros">
              <span>Ver todos los anuncios</span>
              <AiOutlineRight aria-hidden="true" />
            </Link>
          </div>
        </>
      ) : (
        <div className="catalog-home-empty-state">
          <p className="catalog-home-empty-title">Aun no hay perfiles publicados.</p>
          <p className="catalog-home-empty-copy">Cuando existan modelos activas, apareceran aqui como acceso rapido.</p>
          <div className="catalog-home-empty-actions">
            <Link className="hero-primary-cta" to="/encuentros">
              Ver encuentros
            </Link>
            <Link className="hero-secondary-cta" to="/admin/login">
              Publicar perfil
            </Link>
          </div>
        </div>
      )}
    </section>
  )
}

export function PrivateExperienceSection() {
  const steps = [
    {
      number: '1',
      icon: AiOutlineUser,
      title: 'Explora perfiles verificados',
      description: 'Navega por ciudad, nacionalidad o categoría sin perder contexto.',
    },
    {
      number: '2',
      icon: AiOutlinePicture,
      title: 'Revisa fotos y detalles',
      description: 'Consulta galería, descripción, tarifas y disponibilidad.',
    },
    {
      number: '3',
      icon: AiOutlineCalendar,
      title: 'Elige tu favorita y reserva',
      description: 'Confirma tu encuentro de forma rápida y discreta.',
    },
  ]

  return (
    <section className="catalog-home-section catalog-home-latest-section">
      <div className="catalog-home-private-panel">
        <div className="catalog-home-private-copy">
          <p className="section-kicker">Explora, elige y reserva</p>
          <h2>Descubre perfiles, revisa fotos y reserva en minutos.</h2>
          <p>
            Explora modelos verificadas, revisa fotos, servicios y disponibilidad. Elige tu favorita y reserva tu
            encuentro desde la plataforma.
          </p>

          <div className="catalog-home-private-step-list">
            {steps.map((step) => {
              return (
                <article className="catalog-home-private-step-card" key={step.number}>
                  <span className="catalog-home-private-step-icon">
                    <span aria-hidden="true">{step.number}</span>
                  </span>
                  <div className="catalog-home-private-step-copy">
                    <strong>{step.title}</strong>
                    <p>{step.description}</p>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

export function ModelCTASection() {
  const features = [
    {
      icon: AiOutlineUser,
      title: 'Perfil listo',
      description: 'URL propia, galería y descripción cuidada.',
    },
    {
      icon: AiOutlinePicture,
      title: 'Servicios visibles',
      description: 'Muestra lo que ofreces con claridad.',
    },
    {
      icon: AiOutlineCalendar,
      title: 'Disponibilidad clara',
      description: 'Controla horarios, ciudades y estado online.',
    },
    {
      icon: AiOutlineRight,
      title: 'Solicitudes directas',
      description: 'Todo desde una experiencia simple y discreta.',
    },
  ]

  return (
    <section className="catalog-home-section catalog-home-model-section">
      <div className="catalog-home-model-panel">
        <div className="catalog-home-model-copy">
          <p className="section-kicker">¿Eres modelo?</p>
          <h2>Gestiona tu perfil y recibe reservas con una presencia premium.</h2>
          <p>
            Crea tu ficha profesional, sube fotos, organiza servicios y adicionales, gestiona tu disponibilidad y
            aparece en búsquedas por ciudad, nacionalidad y categoría.
          </p>
        </div>

        <div className="catalog-home-model-steps" aria-label="Beneficios para modelos">
          {features.map((feature) => {
            const Icon = feature.icon

            return (
              <article className="catalog-home-model-step" key={feature.title}>
                <div className="catalog-home-model-step-copy">
                  <span className="catalog-home-model-step-icon" aria-hidden="true">
                    <Icon aria-hidden="true" />
                  </span>
                  <strong>{feature.title}</strong>
                  <p>{feature.description}</p>
                </div>
              </article>
            )
          })}
        </div>

        <div className="catalog-home-model-actions">
          <Link className="hero-primary-cta catalog-home-public-cta-button is-announce" to="/registro-modelos">
            ¡ANUNCIA GRATIS!
          </Link>
          <Link className="hero-secondary-cta catalog-home-model-secondary-cta" to="/modelos">
            Ver la plataforma
          </Link>
        </div>
      </div>
    </section>
  )
}
