import { useEffect, useState } from 'react'

export function Carousel({ id, images, intervalMs }) {
  const [currentSlide, setCurrentSlide] = useState(0)

  useEffect(() => {
    if (!images.length) {
      return undefined
    }

    const timer = window.setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % images.length)
    }, intervalMs)

    return () => window.clearInterval(timer)
  }, [images.length, intervalMs])

  if (!images.length) {
    return <div className="carousel carousel-empty" id={id} />
  }

  return (
    <div className="carousel" id={id}>
      <div
        className="carousel-inner"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {images.map((src, index) => (
          <div className="carousel-item" key={`${id}-${index}`}>
            <img
              src={src}
              alt={`Teaser ${index + 1}`}
              loading={index === 0 ? 'eager' : 'lazy'}
              decoding="async"
              fetchPriority={index === 0 ? 'high' : 'low'}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
