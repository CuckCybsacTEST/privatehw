import { useEffect } from 'react'

function normalizePath(pathname = '/') {
  const value = String(pathname || '/').trim()

  if (!value) {
    return '/'
  }

  return value.startsWith('/') ? value : `/${value}`
}

function getCanonicalUrl(canonicalPath = '/') {
  const path = normalizePath(canonicalPath)

  if (typeof window === 'undefined') {
    return path
  }

  return new URL(path, window.location.origin).toString()
}

function ensureMetaTag(selector, attributes) {
  let element = document.head.querySelector(selector)

  if (!element) {
    element = document.createElement('meta')
    document.head.appendChild(element)
  }

  Object.entries(attributes).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      element.removeAttribute(key)
      return
    }

    element.setAttribute(key, String(value))
  })

  return element
}

function ensureCanonicalLink(href) {
  let element = document.head.querySelector('link[rel="canonical"]')

  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', 'canonical')
    document.head.appendChild(element)
  }

  element.setAttribute('href', href)
  return element
}

export function Seo({
  title,
  description,
  canonicalPath = '/',
  noindex = false,
  robots = '',
  siteName = 'Kinkly',
}) {
  useEffect(() => {
    const previousTitle = document.title
    const previousCanonical = document.head.querySelector('link[rel="canonical"]')
    const previousDescription = document.head.querySelector('meta[name="description"]')
    const previousRobots = document.head.querySelector('meta[name="robots"]')
    const previousOgTitle = document.head.querySelector('meta[property="og:title"]')
    const previousOgDescription = document.head.querySelector('meta[property="og:description"]')
    const previousOgSiteName = document.head.querySelector('meta[property="og:site_name"]')
    const previousTwitterTitle = document.head.querySelector('meta[name="twitter:title"]')
    const previousTwitterDescription = document.head.querySelector('meta[name="twitter:description"]')
    const previousTwitterCard = document.head.querySelector('meta[name="twitter:card"]')

    if (title) {
      document.title = title
    }

    const canonicalUrl = getCanonicalUrl(canonicalPath)
    const metaDescription = String(description || '').trim()
    const robotsValue = noindex ? 'noindex, nofollow' : robots || 'index, follow'

    const descriptionTag = ensureMetaTag('meta[name="description"]', {
      name: 'description',
      content: metaDescription,
    })

    const robotsTag = ensureMetaTag('meta[name="robots"]', {
      name: 'robots',
      content: robotsValue,
    })

    const ogTitleTag = ensureMetaTag('meta[property="og:title"]', {
      property: 'og:title',
      content: title || '',
    })

    const ogDescriptionTag = ensureMetaTag('meta[property="og:description"]', {
      property: 'og:description',
      content: metaDescription,
    })

    const ogSiteNameTag = ensureMetaTag('meta[property="og:site_name"]', {
      property: 'og:site_name',
      content: siteName || '',
    })

    const twitterTitleTag = ensureMetaTag('meta[name="twitter:title"]', {
      name: 'twitter:title',
      content: title || '',
    })

    const twitterDescriptionTag = ensureMetaTag('meta[name="twitter:description"]', {
      name: 'twitter:description',
      content: metaDescription,
    })

    const twitterCardTag = ensureMetaTag('meta[name="twitter:card"]', {
      name: 'twitter:card',
      content: 'summary_large_image',
    })

    const canonicalTag = ensureCanonicalLink(canonicalUrl)

    return () => {
      document.title = previousTitle

      if (previousCanonical) {
        canonicalTag.replaceWith(previousCanonical)
      } else {
        canonicalTag.remove()
      }

      if (previousDescription) {
        descriptionTag.replaceWith(previousDescription)
      } else {
        descriptionTag.remove()
      }

      if (previousRobots) {
        robotsTag.replaceWith(previousRobots)
      } else {
        robotsTag.remove()
      }

      if (previousOgTitle) {
        ogTitleTag.replaceWith(previousOgTitle)
      } else {
        ogTitleTag.remove()
      }

      if (previousOgDescription) {
        ogDescriptionTag.replaceWith(previousOgDescription)
      } else {
        ogDescriptionTag.remove()
      }

      if (previousOgSiteName) {
        ogSiteNameTag.replaceWith(previousOgSiteName)
      } else {
        ogSiteNameTag.remove()
      }

      if (previousTwitterTitle) {
        twitterTitleTag.replaceWith(previousTwitterTitle)
      } else {
        twitterTitleTag.remove()
      }

      if (previousTwitterDescription) {
        twitterDescriptionTag.replaceWith(previousTwitterDescription)
      } else {
        twitterDescriptionTag.remove()
      }

      if (previousTwitterCard) {
        twitterCardTag.replaceWith(previousTwitterCard)
      } else {
        twitterCardTag.remove()
      }
    }
  }, [title, description, canonicalPath, noindex, robots, siteName])

  return null
}
