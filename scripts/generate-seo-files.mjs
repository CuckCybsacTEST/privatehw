import 'dotenv/config'
import { mkdir, writeFile } from 'node:fs/promises'
import { defaultBlogPosts } from '../src/data/defaultBlogPosts.js'
import { defaultSiteContent } from '../src/data/defaultSiteContent.js'
import {
  buildCatalogCombinedFacetPath,
  buildCatalogFacetPath,
  getCatalogModelDetails,
  slugifyCatalogValue,
} from '../src/utils/encuentrosCatalog.js'

const baseUrl = String(
  process.env.APP_URL ||
    process.env.SITE_URL ||
    process.env.PUBLIC_URL ||
    'https://privatehw-production.up.railway.app',
)
  .trim()
  .replace(/\/+$/, '')

const publicDir = new URL('../public/', import.meta.url)
const today = new Date().toISOString().slice(0, 10)

function escapeXml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function normalizePath(pathname = '') {
  const value = String(pathname || '').trim()
  if (!value) {
    return '/'
  }

  return value.startsWith('/') ? value : `/${value}`
}

function buildUrlEntry(pathname, { lastmod = today, changefreq = 'weekly', priority = '0.5' } = {}) {
  const loc = `${baseUrl}${normalizePath(pathname)}`
  return {
    loc,
    lastmod,
    changefreq,
    priority,
  }
}

function dedupeEntries(entries = []) {
  const seen = new Set()
  return entries.filter((entry) => {
    if (!entry?.loc || seen.has(entry.loc)) {
      return false
    }

    seen.add(entry.loc)
    return true
  })
}

async function loadEncounterModels() {
  const candidateUrls = Array.from(
    new Set([
      `${baseUrl}/api/encuentros/models`,
      'http://localhost:4242/api/encuentros/models',
      'http://127.0.0.1:4242/api/encuentros/models',
    ]),
  )

  for (const apiUrl of candidateUrls) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 3000)
      const response = await fetch(apiUrl, { signal: controller.signal })
      clearTimeout(timeout)

      if (!response.ok) {
        continue
      }

      const payload = await response.json()
      if (Array.isArray(payload?.models)) {
        return payload.models
      }
    } catch {
      continue
    }
  }

  return []
}

function buildEncounterFacetEntries(models = []) {
  const cities = new Map()
  const nationalities = new Map()
  const combinations = new Map()

  ;(Array.isArray(models) ? models : []).forEach((model) => {
    const details = getCatalogModelDetails(model)
    const city = String(details.city || '').trim()
    const nationality = String(details.nationality || '').trim()

    if (city) {
      cities.set(city, (cities.get(city) || 0) + 1)
    }

    if (nationality) {
      nationalities.set(nationality, (nationalities.get(nationality) || 0) + 1)
    }

    if (city && nationality) {
      const key = `${slugifyCatalogValue(city)}|${slugifyCatalogValue(nationality)}`
      combinations.set(key, { city, nationality })
    }
  })

  const cityEntries = Array.from(cities.keys()).map((city) =>
    buildUrlEntry(buildCatalogFacetPath('city', city), {
      lastmod: today,
      changefreq: 'weekly',
      priority: '0.7',
    }),
  )

  const nationalityEntries = Array.from(nationalities.keys()).map((nationality) =>
    buildUrlEntry(buildCatalogFacetPath('nationality', nationality), {
      lastmod: today,
      changefreq: 'weekly',
      priority: '0.7',
    }),
  )

  const combinationEntries = Array.from(combinations.values()).map(({ city, nationality }) =>
    buildUrlEntry(buildCatalogCombinedFacetPath({ city, nationality }), {
      lastmod: today,
      changefreq: 'weekly',
      priority: '0.6',
    }),
  )

  return [...cityEntries, ...nationalityEntries, ...combinationEntries]
}

async function buildSitemapEntries() {
  const blogPosts = Array.isArray(defaultBlogPosts) ? defaultBlogPosts : []
  const videoItems = Array.isArray(defaultSiteContent.videoLibrary?.items)
    ? defaultSiteContent.videoLibrary.items
    : []
  const collectionItems = Array.isArray(defaultSiteContent.videoCollections?.items)
    ? defaultSiteContent.videoCollections.items
    : []
  const merchItems = Array.isArray(defaultSiteContent.physicalMerch?.items)
    ? defaultSiteContent.physicalMerch.items
    : []
  const blogLastMod = blogPosts.reduce((latest, post) => {
    const candidate = post?.publishedAt ? new Date(post.publishedAt) : null
    return candidate && !Number.isNaN(candidate.getTime()) && candidate > latest ? candidate : latest
  }, new Date(0))
  const videoLastMod = today
  const collectionLastMod = today
  const merchLastMod = today

  const entries = [
    buildUrlEntry('/', { lastmod: today, changefreq: 'daily', priority: '1.0' }),
    buildUrlEntry('/blog', { lastmod: blogLastMod.getTime() ? blogLastMod.toISOString().slice(0, 10) : today, changefreq: 'daily', priority: '0.9' }),
    buildUrlEntry('/videos', { lastmod: videoLastMod, changefreq: 'daily', priority: '0.9' }),
    buildUrlEntry('/packs', { lastmod: collectionLastMod, changefreq: 'weekly', priority: '0.8' }),
    buildUrlEntry('/calzones', { lastmod: merchLastMod, changefreq: 'weekly', priority: '0.8' }),
    buildUrlEntry('/modelos', { lastmod: today, changefreq: 'weekly', priority: '0.8' }),
    buildUrlEntry('/muy-pronto', { lastmod: today, changefreq: 'weekly', priority: '0.6' }),
    buildUrlEntry('/terminos', { lastmod: today, changefreq: 'monthly', priority: '0.3' }),
    buildUrlEntry('/privacidad', { lastmod: today, changefreq: 'monthly', priority: '0.3' }),
    buildUrlEntry('/cookies', { lastmod: today, changefreq: 'monthly', priority: '0.3' }),
    buildUrlEntry('/contacto', { lastmod: today, changefreq: 'monthly', priority: '0.4' }),
    buildUrlEntry('/ayuda', { lastmod: today, changefreq: 'monthly', priority: '0.4' }),
    buildUrlEntry('/denunciar-estafa', { lastmod: today, changefreq: 'monthly', priority: '0.4' }),
    buildUrlEntry('/encuentros', { lastmod: today, changefreq: 'daily', priority: '0.9' }),
    buildUrlEntry('/encuentros/ciudad', { lastmod: today, changefreq: 'weekly', priority: '0.8' }),
    buildUrlEntry('/encuentros/nacionalidad', { lastmod: today, changefreq: 'weekly', priority: '0.8' }),
  ]

  const encounterModels = await loadEncounterModels()
  entries.push(...buildEncounterFacetEntries(encounterModels))

  blogPosts
    .filter(
      (post) =>
        post &&
        post.slug &&
        post.status === 'published' &&
        post.accessLevel === 'public' &&
        post.allowIndexing !== false,
    )
    .forEach((post) => {
      entries.push(
        buildUrlEntry(`/blog/${post.slug}`, {
          lastmod: post.publishedAt ? new Date(post.publishedAt).toISOString().slice(0, 10) : blogLastMod.toISOString().slice(0, 10) || today,
          changefreq: 'weekly',
          priority: '0.7',
        }),
      )
    })

  videoItems
    .filter((item) => item && item.slug)
    .forEach((item) => {
      entries.push(buildUrlEntry(`/videos/${item.slug}`, { lastmod: videoLastMod, changefreq: 'weekly', priority: '0.7' }))
    })

  collectionItems
    .filter((item) => item && item.slug)
    .forEach((item) => {
      entries.push(buildUrlEntry(`/packs/${item.slug}`, { lastmod: collectionLastMod, changefreq: 'weekly', priority: '0.6' }))
    })

  merchItems
    .filter((item) => item && item.slug)
    .forEach((item) => {
      entries.push(buildUrlEntry(`/calzones/${item.slug}`, { lastmod: merchLastMod, changefreq: 'weekly', priority: '0.6' }))
    })

  return dedupeEntries(entries)
}

function buildSitemapXml(entries = []) {
  const lines = entries.map(
    (entry) => `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>\n    <lastmod>${escapeXml(entry.lastmod)}</lastmod>\n    <changefreq>${escapeXml(entry.changefreq)}</changefreq>\n    <priority>${escapeXml(entry.priority)}</priority>\n  </url>`,
  )

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${lines.join('\n')}\n</urlset>\n`
}

function buildRobotsTxt() {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin/',
    'Disallow: /access',
    'Disallow: /checkout/',
    'Disallow: /library',
    'Disallow: /profile',
    'Disallow: /free-content',
    '# Kinkly catalog filters are handled with canonical + noindex. City and nationality landings stay crawlable.',
    `Sitemap: ${baseUrl}/sitemap.xml`,
    '',
  ].join('\n')
}

async function main() {
  await mkdir(publicDir, { recursive: true })

  const sitemap = buildSitemapXml(await buildSitemapEntries())
  const robots = buildRobotsTxt()

  await Promise.all([
    writeFile(new URL('sitemap.xml', publicDir), sitemap, 'utf8'),
    writeFile(new URL('robots.txt', publicDir), robots, 'utf8'),
  ])

  process.stdout.write(`Kinkly SEO files generated for ${baseUrl}\n`)
}

main().catch((error) => {
  process.stderr.write(`${error?.stack || error?.message || String(error)}\n`)
  process.exitCode = 1
})
