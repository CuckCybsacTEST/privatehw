import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '../state/AppState'

export function PhysicalMerchSection({ content }) {
  const navigate = useNavigate()
  const { products, session } = useAppState()
  const merch = content.physicalMerch
  const [error, setError] = useState('')
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 900 : false,
  )
  const [visibleItems, setVisibleItems] = useState(() => merch.items.slice(0, 2))

  const merchItems = useMemo(() => merch.items || [], [merch.items])

  useEffect(() => {
    function handleViewportChange() {
      setIsMobile(window.innerWidth <= 900)
    }

    handleViewportChange()
    window.addEventListener('resize', handleViewportChange)

    return () => window.removeEventListener('resize', handleViewportChange)
  }, [])

  useEffect(() => {
    if (!merchItems.length) {
      setVisibleItems([])
      return
    }

    setVisibleItems(merchItems.slice(0, isMobile ? 2 : 3))
  }, [isMobile, merchItems])

  useEffect(() => {
    const visibleCount = isMobile ? 2 : 3

    if (merchItems.length <= visibleCount) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setVisibleItems((currentItems) => {
        const currentSlugs = new Set(currentItems.map((item) => item.slug))
        const availableItems = merchItems.filter((item) => !currentSlugs.has(item.slug))
        const sourceItems = availableItems.length >= visibleCount ? availableItems : merchItems
        const shuffledItems = [...sourceItems]

        for (let index = shuffledItems.length - 1; index > 0; index -= 1) {
          const swapIndex = Math.floor(Math.random() * (index + 1))
          ;[shuffledItems[index], shuffledItems[swapIndex]] = [
            shuffledItems[swapIndex],
            shuffledItems[index],
          ]
        }

        return shuffledItems.slice(0, visibleCount)
      })
    }, 3400)

    return () => window.clearInterval(intervalId)
  }, [isMobile, merchItems])

  async function handlePurchase(item) {
    const product = products.find((entry) => entry.accessScope === `physical:${item.slug}`)

    if (!product) {
      window.open(item.purchaseUrl, '_blank', 'noopener,noreferrer')
      return
    }

    setError('')

    if (!session || !session.accessToken) {
      navigate(`/access?redirect=/checkout/start/${product.slug}`)
      return
    }

    navigate(`/checkout/start/${product.slug}`)
  }

  return (
    <section className="physical-merch-section" id="merch">
      <div className="physical-merch-shell">
        <div className="section-heading">
          <p className="section-kicker">{merch.kicker}</p>
          <h2>{merch.title}</h2>
          <p>{merch.description}</p>
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
                <button
                  className="video-buy-link"
                  type="button"
                  onClick={() => handlePurchase(item)}
                >
                  Solicitar compra
                </button>
              </div>
            </article>
          ))}
        </div>
        {error ? <p className="admin-error">{error}</p> : null}

        <div className="physical-merch-footer">
          <p>{merch.note}</p>
          <a
            className="section-more-link"
            href={merch.primaryUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {merch.primaryLabel}
          </a>
        </div>
      </div>
    </section>
  )
}
