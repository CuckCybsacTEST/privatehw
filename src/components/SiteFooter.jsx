import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppState } from '../state/AppState'
import { LanguageSwitcher } from './LanguageSwitcher'
import { resolveLocalizedSection } from '../utils/localizedContent'
import { withBasePath } from '../utils/routes'

export function SiteFooter({ content, basePath = '' }) {
  const { session } = useAppState()
  const { t, i18n } = useTranslation()
  const siteFooter = resolveLocalizedSection(content, 'siteFooter', i18n.resolvedLanguage)
  const legalLinks = Array.isArray(siteFooter.legalLinks) ? siteFooter.legalLinks : []

  return (
    <footer className="site-footer">
      <div className="site-footer-grid">
        <div>
          <p className="section-kicker">{content?.creatorHome?.kicker || t('nav.home')}</p>
          <h2>{siteFooter.title}</h2>
          <p>{siteFooter.description}</p>
          {siteFooter.note ? <p className="site-footer-note">{siteFooter.note}</p> : null}
        </div>

        <div className="site-footer-links">
          <a href={content.fanButtonUrl} target="_blank" rel="noopener noreferrer">
            {t('footer.membership')}
          </a>
          <a href={content.socialUrl} target="_blank" rel="noopener noreferrer">
            {t('footer.telegram')}
          </a>
          <Link to={session ? withBasePath(basePath, '/library') : withBasePath(basePath, '/access')}>
            {session ? t('nav.library') : t('footer.access')}
          </Link>
        </div>
        <div className="site-footer-meta">
          <div className="site-footer-language">
            <span>{t('language.label')}</span>
            <LanguageSwitcher className="site-footer-language-switcher" />
          </div>
          <div className="site-footer-legal-note">
            <span className="site-footer-legal-badge">+18</span>
            <p>{t('footer.adultNotice')}</p>
          </div>
          {legalLinks.length ? (
            <nav className="site-footer-legal-links" aria-label="Enlaces legales">
              {legalLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target={link.external ? '_blank' : undefined}
                  rel={link.external ? 'noopener noreferrer' : undefined}
                >
                  {link.label}
                </a>
              ))}
            </nav>
          ) : null}
        </div>
      </div>
    </footer>
  )
}
