export function PhysicalMerchSection({ content }) {
  const merch = content.physicalMerch

  return (
    <section className="physical-merch-section" id="merch">
      <div className="physical-merch-shell">
        <div className="section-heading">
          <p className="section-kicker">{merch.kicker}</p>
          <h2>{merch.title}</h2>
          <p>{merch.description}</p>
        </div>

        <div className="physical-merch-list">
          {merch.items.slice(0, 3).map((item) => (
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
                <a
                  className="video-buy-link"
                  href={item.purchaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Solicitar compra
                </a>
              </div>
            </article>
          ))}
        </div>

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
