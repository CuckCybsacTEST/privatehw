import { FaTelegramPlane, FaWhatsapp } from 'react-icons/fa'
import { Link } from 'react-router-dom'
import { Carousel } from '../components/Carousel'
import { useAppState } from '../state/AppState'

export function EncuentrosPage() {
  const { siteContent } = useAppState()
  const { sectionVisibility } = siteContent

  return (
    <div className="encuentros-page">
      <div className="top-bar">
        <span className="top-bar-desktop">
          Solo para <span>{siteContent.topBarDesktopHighlight}</span>
        </span>
        <span className="top-bar-mobile">{siteContent.topBarMobile}</span>
      </div>

      {sectionVisibility.encuentrosHero ? (
        <header id="home" className="encuentros-page-header">
          <div className="hero">
            <h1>{siteContent.heroTitle}</h1>
            <p>{siteContent.heroDescription}</p>
            <p className="hero-subtitle">{siteContent.heroSubtitle}</p>
          </div>
        </header>
      ) : null}

      <div className="main-content">
        <div className="block left">
          {sectionVisibility.encuentrosTopCarousel ? (
            <Carousel
              id="carrusel-top"
              images={siteContent.topCarouselImages}
              intervalMs={5000}
            />
          ) : null}

          {sectionVisibility.encuentrosImportant ? (
            <div className="aviso-card" id="aviso-importante">
              <h3>{siteContent.importantTitle}</h3>
              <ul>
                {siteContent.importantItems.map((item, index) => (
                  <li key={`important-${index}`}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {sectionVisibility.encuentrosLoverfans ? (
            <div className="aviso-card loverfans" id="aviso-loverfans">
              <h3>{siteContent.fanCardTitle}</h3>
              <p>{siteContent.fanCardDescription}</p>
              <a
                href={siteContent.fanButtonUrl}
                className="contact-cta lovers"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>{siteContent.fanButtonLabel}</span>
              </a>
            </div>
          ) : null}

          {sectionVisibility.encuentrosSocial ? (
            <div className="social-section" id="social-section">
              <h4>{siteContent.socialTitle}</h4>
              <div className="social-icons">
                <a
                  href={siteContent.socialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Abrir canal de Telegram"
                >
                  <FaTelegramPlane className="social-icon telegram" />
                </a>
              </div>
              <p className="social-teaser">{siteContent.socialDescription}</p>
            </div>
          ) : null}
        </div>

        <div className="block right">
          {sectionVisibility.encuentrosPricing ? (
            <div className="price-card" id="price-presenciales">
              <h3>{siteContent.presencialTitle}</h3>
              <div className="price-main">
                {`S/${siteContent.presencialPrice}`}{' '}
                <span className="price-unit">{siteContent.presencialUnit}</span>
              </div>
              <p className="price-desc">{siteContent.presencialDescription}</p>
              <p className="price-benefit">
                <strong>{siteContent.presencialBenefitTitle}</strong>
                <br />
                {siteContent.presencialBenefitText}
              </p>
            </div>
          ) : null}

          {sectionVisibility.encuentrosPricing ? (
            <div className="grabacion-card" id="grabacion-card">
              <h3>{siteContent.recordTitle}</h3>
              <p>{siteContent.recordDescription}</p>
            </div>
          ) : null}

          {sectionVisibility.encuentrosPricing ? (
            <div className="price-card" id="price-adicionales">
              <h3>{siteContent.extraTitle}</h3>
              <div className="price-main">
                <span className="from">{siteContent.extraFromLabel}</span>
                {`S/${siteContent.extraPrice}`}
              </div>
              <div className="price-desc">
                <p>{siteContent.extraLead}</p>
                <ul className="extra-list">
                  {siteContent.extraItems.map((item, index) => (
                    <li key={`extra-${index}`}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}

          {sectionVisibility.encuentrosBottomCarousel ? (
            <Carousel
              id="carrusel-bottom"
              images={siteContent.bottomCarouselImages}
              intervalMs={6200}
            />
          ) : null}
        </div>
      </div>

      <footer>
        <div className="footer-content">
          <p>{siteContent.footerText}</p>
          <Link className="admin-link" to="/admin/login">
            Admin
          </Link>
        </div>
      </footer>

      <a
        href={siteContent.whatsappUrl}
        className="whatsapp-float"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Abrir contacto de WhatsApp"
      >
        <div className="whatsapp-pulse" />
        <div className="whatsapp-pulse-strong" />
        <FaWhatsapp />
      </a>
    </div>
  )
}
