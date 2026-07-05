import { Link, useLocation } from 'react-router-dom'
import { AiFillCrown, AiOutlineLink, AiOutlinePlayCircle, AiOutlineStar } from 'react-icons/ai'
import { BiLogoFacebook, BiLogoInstagram, BiLogoTelegram, BiLogoWhatsapp } from 'react-icons/bi'
import { FaXTwitter } from 'react-icons/fa6'
import { SiOnlyfans, SiTiktok } from 'react-icons/si'
import { useTranslation } from 'react-i18next'
import { getSocialNetworkActionLabel, getSocialNetworkKey, getSocialNetworkOption } from '../utils/socialNetworks'
import { useAppState } from '../state/AppState'

function getSocialLinkIconComponent(networkKey = '') {
  switch (networkKey) {
    case 'telegram':
      return BiLogoTelegram
    case 'whatsapp':
      return BiLogoWhatsapp
    case 'instagram':
      return BiLogoInstagram
    case 'facebook':
      return BiLogoFacebook
    case 'tiktok':
      return SiTiktok
    case 'x':
      return FaXTwitter
    case 'onlyfans':
      return SiOnlyfans
    case 'fansly':
      return AiOutlineStar
    case 'manyvids':
      return AiOutlinePlayCircle
    case 'loverfans':
      return AiFillCrown
    default:
      return AiOutlineLink
  }
}

function normalizeSocialLink(link = {}) {
  const network = getSocialNetworkKey(link)
  const resolvedOption = getSocialNetworkOption(network)
  const label = String(link?.label || resolvedOption.label || link?.network || '').trim()

  return {
    network,
    label,
    url: String(link?.url || link?.href || '').trim(),
    active: link?.active !== false,
  }
}

export function EncounterSocialLinksSection({
  title,
  description,
  links = [],
  className = '',
  showTitle = true,
}) {
  const { t } = useTranslation()
  const { session } = useAppState()
  const location = useLocation()
  const normalizedLinks = (Array.isArray(links) ? links : [])
    .map(normalizeSocialLink)
    .filter((link) => link.active !== false && link.url && link.network !== 'telegram' && link.network !== 'whatsapp')
  const isLocked = !session?.accessToken
  const unlockHref = `/access?redirect=${encodeURIComponent(`${location.pathname}${location.search || ''}`)}`

  if (!normalizedLinks.length) {
    return null
  }

  return (
    <section
      className={['encuentros-social-links-section', className].filter(Boolean).join(' ')}
      aria-label={title || t('encuentros.socialNetworks', 'Redes sociales')}
    >
      {showTitle ? (
        <div className="encuentros-social-links-head">
          <p className="encuentros-social-links-kicker">
            {title || t('encuentros.socialNetworks', 'Redes sociales')}
          </p>
          {description ? <p className="encuentros-social-links-description">{description}</p> : null}
        </div>
      ) : null}

      <div className="encuentros-social-links-grid" role="list" aria-label={title || t('encuentros.socialNetworks', 'Redes sociales')}>
        {normalizedLinks.map((link, index) => {
          const networkKey = link.network
          const Icon = getSocialLinkIconComponent(networkKey)
          const isClickable = !isLocked
          const CardTag = isClickable ? 'a' : Link

          return (
            <CardTag
              key={`${networkKey}-${link.url}-${index}`}
              className={`encuentros-social-link-card is-${networkKey}${isLocked ? ' is-locked' : ''}`}
              role="listitem"
              {...(isClickable
                ? {
                    href: link.url,
                    target: '_blank',
                    rel: 'noreferrer',
                  }
                : {
                    to: unlockHref,
                  })}
            >
              <span className="encuentros-social-link-card-top">
                <span className="encuentros-social-link-card-icon" aria-hidden="true">
                  <Icon aria-hidden="true" />
                </span>
              </span>

              <span className="encuentros-social-link-card-copy">
                <strong>{link.label || getSocialNetworkOption(networkKey).label}</strong>
                <span>{isLocked ? t('content.locked', 'Bloqueado') : getSocialNetworkActionLabel(networkKey)}</span>
              </span>
            </CardTag>
          )
        })}
      </div>
    </section>
  )
}
