import { Link } from 'react-router-dom'
import { useAppState } from '../state/AppState'

export function SiteFooter({ content }) {
  const { session } = useAppState()

  return (
    <footer className="site-footer">
      <div className="site-footer-grid">
        <div>
          <p className="section-kicker">Sindy Mireya</p>
          <h2>{content.siteFooter.title}</h2>
          <p>{content.siteFooter.description}</p>
        </div>

        <div className="site-footer-links">
          <a href={content.fanButtonUrl} target="_blank" rel="noopener noreferrer">
            Membership
          </a>
          <a href={content.socialUrl} target="_blank" rel="noopener noreferrer">
            Telegram
          </a>
          <Link to={session ? '/library' : '/access'}>
            {session ? 'Mi biblioteca' : 'Acceso cliente'}
          </Link>
          <Link to="/encuentros">Encuentros</Link>
          <Link to="/admin/login">Admin</Link>
        </div>
      </div>
    </footer>
  )
}
