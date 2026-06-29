import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PublicNav } from '../components/PublicNav'
import { SiteFooter } from '../components/SiteFooter'
import { useAppState } from '../state/AppState'

export function CheckoutCancelPage() {
  const { siteContent } = useAppState()
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const product = searchParams.get('product')

  return (
    <main className="creator-home">
      <PublicNav />
      <section className="content-listing-page access-page">
        <div className="access-layout single-column">
          <article className="access-card access-card-copy">
            <p className="section-kicker">{t('checkout.cancel')}</p>
            <h1>{t('checkout.reviewTitle')}</h1>
            <p>{t('checkout.reviewDescription')}</p>
            {product ? <p className="admin-note">{t('checkout.resultProduct')}: {product}</p> : null}
            <div className="access-session-actions">
              <Link className="hero-primary-cta" to="/">
                {t('access.backHome')}
              </Link>
              <Link className="video-preview-link" to="/library">
                {t('checkout.goLibrary')}
              </Link>
            </div>
          </article>
        </div>
      </section>
      <SiteFooter content={siteContent} />
    </main>
  )
}
