export function CollectionCard({ collection }) {
  return (
    <article className="video-collection-card" key={collection.slug}>
      <div className="video-collection-visual">
        <img
          src={collection.coverImage}
          alt={collection.title}
          loading="lazy"
          decoding="async"
        />
        <div className="video-collection-chip">{collection.category}</div>
      </div>
      <div className="video-collection-copy">
        <div className="video-collection-meta">
          <span>{collection.itemCount}</span>
          <strong>{collection.priceLabel}</strong>
        </div>

        <h3>{collection.title}</h3>
        <p>{collection.description}</p>

        <ul className="video-collection-tags">
          {collection.highlights.slice(0, 2).map((highlight) => (
            <li key={highlight}>{highlight}</li>
          ))}
        </ul>

        <p className="video-collection-access">{collection.accessLabel}</p>

        <div className="video-collection-actions">
          <a
            className="video-buy-link"
            href={collection.purchaseUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Comprar pack
          </a>
          <a
            className="video-preview-link"
            href={collection.previewUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Ver preview
          </a>
        </div>
      </div>
    </article>
  )
}
