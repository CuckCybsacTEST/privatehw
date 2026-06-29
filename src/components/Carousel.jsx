import { useEffect, useState } from 'react'

function normalizeSlide(slide) {
  if (typeof slide === 'string') {
    return { src: slide, caption: '' }
  }

  return {
    src: slide?.src || slide?.image || slide?.url || '',
    caption: slide?.caption || slide?.text || slide?.label || slide?.title || '',
  }
}

export function Carousel({ id, images, intervalMs }) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const slides = (Array.isArray(images) ? images : []).map(normalizeSlide).filter((slide) => slide.src)

  useEffect(() => {
    if (!slides.length) {
      return undefined
    }

    const timer = window.setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, intervalMs)

    return () => window.clearInterval(timer)
  }, [slides.length, intervalMs])

  useEffect(() => {
    if (currentSlide >= slides.length) {
      setCurrentSlide(0)
    }
  }, [currentSlide, slides.length])

  if (!slides.length) {
    return <div className="carousel carousel-empty" id={id} />
  }

  return (
    <div className="carousel" id={id}>
      <div
        className="carousel-inner"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {slides.map((slide, index) => (
          <div className="carousel-item" key={`${id}-${index}`}>
            <img
              src={slide.src}
              alt={`Teaser ${index + 1}`}
              loading={index === 0 ? 'eager' : 'lazy'}
              decoding="async"
              fetchPriority={index === 0 ? 'high' : 'low'}
            />
          </div>
        ))}
      </div>
      {slides[currentSlide]?.caption ? (
        <div className="carousel-caption" aria-hidden="true">
          <p>{slides[currentSlide].caption}</p>
        </div>
      ) : null}
    </div>
  )
}
