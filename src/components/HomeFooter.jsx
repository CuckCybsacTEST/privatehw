import { Link } from 'react-router-dom'

const legalLinks = [
  { label: 'Términos y condiciones', to: '/terminos' },
  { label: 'Política de privacidad', to: '/privacidad' },
  { label: 'Política de cookies', to: '/cookies' },
]

const supportLinks = [
  { label: 'Contáctanos', to: '/contacto' },
  { label: 'Centro de ayuda', to: '/ayuda' },
]

const securityLinks = [{ label: 'Cómo denunciar una estafa', to: '/denunciar-estafa' }]

function FooterColumn({ title, links }) {
  return (
    <nav className="home-footer-column" aria-label={title}>
      <h3>{title}</h3>
      <div className="home-footer-links">
        {links.map((link) => (
          <Link key={link.to} to={link.to}>
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}

export function HomeFooter() {
  return (
    <footer className="site-footer home-footer">
      <div className="home-footer-shell">
        <div className="home-footer-brand">
          <div className="home-footer-brandrow">
            <span className="home-footer-wordmark">Kinkly</span>
            <span className="home-footer-badge">+18</span>
          </div>
          <p className="home-footer-copy">
            Directorio privado de perfiles, filtros locales y acceso preparado para crecer con una navegación limpia.
          </p>
          <p className="home-footer-note">Acceso restringido a personas adultas. Sin blog en esta versión del footer.</p>
        </div>

        <div className="home-footer-columns">
          <FooterColumn title="Legal" links={legalLinks} />
          <FooterColumn title="Soporte" links={supportLinks} />
          <FooterColumn title="Seguridad" links={securityLinks} />
        </div>
      </div>
    </footer>
  )
}
