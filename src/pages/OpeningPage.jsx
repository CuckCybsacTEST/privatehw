import { Link } from 'react-router-dom'
import { BiLogoTelegram } from 'react-icons/bi'
import { AiOutlineArrowRight } from 'react-icons/ai'
import { Seo } from '../components/Seo'
import { useAppState } from '../state/AppState'

export function OpeningPage() {
  const { siteContent } = useAppState()
  const telegramUrl = String(siteContent?.socialUrl || 'https://t.me/Kinkly').trim() || 'https://t.me/Kinkly'

  return (
    <main className="opening-page opening-models-page opening-pronto-page">
      <Seo
        title="Kinkly | Muy pronto"
        description="Landing temporal para avisar el lanzamiento y dirigir clientes a Telegram mientras la solicitud de modelo vive en su propia pagina."
        canonicalPath="/muy-pronto"
      />

      <section className="opening-hero opening-models-hero">
        <div className="opening-hero-copy opening-models-copy opening-pronto-copy">
          <h1>
            <span>Estamos afinando la</span>
            <em>apertura para salir</em>
            <span>con el catalogo listo</span>
          </h1>

          <p className="opening-hero-lead">
            No abrimos la experiencia completa hasta tener el catalogo preparado. Mientras tanto, el cliente puede
            recibir novedades por Telegram y la modelo puede continuar desde su formulario aparte.
          </p>

          <div className="opening-hero-actions opening-models-actions opening-pronto-actions">
            <a
              className="hero-primary-cta opening-hero-primary opening-pronto-primary"
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <BiLogoTelegram aria-hidden="true" />
              <span>Recibir novedades</span>
            </a>
            <Link className="hero-secondary-cta opening-hero-secondary opening-pronto-secondary" to="/registro-modelos">
              <AiOutlineArrowRight aria-hidden="true" />
              <span>Publicar anuncio</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
