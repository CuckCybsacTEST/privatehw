import { Link } from 'react-router-dom'

export function PublicNav() {
  return (
    <header className="public-nav">
      <Link className="public-brand" to="/">
        <span className="public-brand-mark">SM</span>
        <span className="public-brand-copy">
          <strong>Sindy Mireya</strong>
          <small>Creator Studio</small>
        </span>
      </Link>

      <nav className="public-nav-links" aria-label="Navegacion principal">
        <a href="#collections">Media</a>
        <a href="#videos">Videos</a>
        <a href="#membership">Acceso</a>
        <a href="#blog">Blog</a>
        <Link to="/encuentros">Encuentros</Link>
        <Link className="public-admin-link" to="/admin/login">
          Admin
        </Link>
      </nav>
    </header>
  )
}
