import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { resolveLocalizedSection } from '../utils/localizedContent'
import { useViewportState } from '../hooks/useViewportState'

export function PhysicalMerchSection({ content }) {
  const { i18n, t } = useTranslation()
  const merch = resolveLocalizedSection(content, 'physicalMerch', i18n.resolvedLanguage)
  const { mode: merchViewportMode, isMobile } = useViewportState()
  const merchItems = useMemo(() => merch.items || [], [merch.items])
  const validMerchItems = useMemo(
    () => merchItems.filter((item) => Boolean(item.slug) && Boolean(item.image)),
    [merchItems],
  )
  const merchSignature = useMemo(() => merchItems.map((item) => item.slug).join('|'), [merchItems])
  const visibleMerchOrderRef = useRef([])
  const visibleMerchSignatureRef = useRef('')
  const [visibleItemSlugs, setVisibleItemSlugs] = useState([])

  const visibleCount = isMobile ? 2 : 3

  const visibleItems = useMemo(() => {
    if (!validMerchItems.length) {
      return []
    }

    const merchBySlug = new Map(validMerchItems.map((item) => [item.slug, item]))

    if (!visibleItemSlugs.length) {
      return visibleMerchOrderRef.current
        .slice(0, visibleCount)
        .map((slug) => merchBySlug.get(slug))
        .filter(Boolean)
    }

    return visibleItemSlugs.map((slug) => merchBySlug.get(slug)).filter(Boolean)
  }, [validMerchItems, visibleCount, visibleItemSlugs])

  useEffect(() => {
    if (visibleMerchSignatureRef.current !== merchSignature) {
      visibleMerchSignatureRef.current = merchSignature
      visibleMerchOrderRef.current = validMerchItems.map((item) => item.slug)
    }
  }, [merchSignature, validMerchItems])

  useEffect(() => {
    if (!validMerchItems.length) {
      setVisibleItemSlugs((current) => (current.length ? [] : current))
      return
    }

    const nextSlugs = visibleMerchOrderRef.current.length
      ? visibleMerchOrderRef.current.slice(0, visibleCount)
      : validMerchItems.slice(0, visibleCount).map((item) => item.slug)

    setVisibleItemSlugs((current) => {
      if (current.length === nextSlugs.length && current.every((slug, index) => slug === nextSlugs[index])) {
        return current
      }

      return nextSlugs
    })
  }, [merchSignature, validMerchItems, visibleCount])

  useEffect(() => {
    if (validMerchItems.length <= visibleCount) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setVisibleItemSlugs((currentSlugs) => {
        const currentSlugSet = new Set(currentSlugs)
        const availableItems = validMerchItems.filter((item) => !currentSlugSet.has(item.slug))
        const sourceItems = availableItems.length >= visibleCount ? availableItems : validMerchItems
        const shuffledItems = [...sourceItems]

        for (let index = shuffledItems.length - 1; index > 0; index -= 1) {
          const swapIndex = Math.floor(Math.random() * (index + 1))
          ;[shuffledItems[index], shuffledItems[swapIndex]] = [
            shuffledItems[swapIndex],
            shuffledItems[index],
          ]
        }

        return shuffledItems.slice(0, visibleCount).map((item) => item.slug)
      })
    }, 3400)

    return () => window.clearInterval(intervalId)
  }, [isMobile, validMerchItems, visibleCount])

  return (
    <section className={`physical-merch-section is-merch-${merchViewportMode}`} id="merch">
      <div className={`physical-merch-shell is-merch-${merchViewportMode}`}>
        <div className="section-heading physical-merch-heading">
          <p className="section-kicker">{merch.kicker}</p>
          <h2>{merch.title}</h2>
          <p className="physical-merch-lede">{merch.description}</p>
          <p className="physical-merch-note">
            Presentacion discreta, empaque premium y un flujo de compra sereno.
          </p>
        </div>

        <div className="physical-merch-list">
          {visibleItems.map((item) => (
            <article className="physical-merch-card" key={item.slug}>
              <img src={item.image} alt={item.title} loading="lazy" decoding="async" />
              <div className="physical-merch-copy">
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.subtitle}</p>
                </div>
                <div className="physical-merch-meta">
                  <strong>{item.priceLabel}</strong>
                  <span>{item.stockLabel}</span>
                </div>
                <Link className="video-buy-link" to={`/calzones/${item.slug}`}>
                  {t('content.buyNow')}
                </Link>
              </div>
            </article>
          ))}
        </div>
        <div className="physical-merch-footer">
          <p>{merch.note}</p>
          <Link className="section-more-link section-more-link-collections" to="/calzones">
            {merch.primaryLabel}
          </Link>
        </div>
      </div>
    </section>
  )
}
