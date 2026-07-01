import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { defaultSiteContent, mergeSiteContent } from '../data/defaultSiteContent'
import { defaultUsers } from '../data/defaultUsers'
import {
  buildDefaultProducts,
  defaultEntitlements,
  isDerivedProductType,
  isPersistentProductType,
  normalizeEntitlements,
  normalizeSubscriptionTiers,
} from '../data/defaultCommerce'
import {
  deleteBlogPost,
  fetchBlogPosts,
  createManualEncuentrosReservation as createManualEncuentrosReservationRequest,
  fetchEncuentrosModels,
  fetchCurrentEntitlements,
  fetchCurrentOrders,
  fetchProducts,
  fetchSiteContent,
  getAdminAuditEvents,
  getCustomerAdminSnapshot,
  getCurrentSession,
  getProfiles,
  isSupabaseConfigured,
  createManagedUser as createManagedUserRequest,
  updateManagedSubscription as updateManagedSubscriptionRequest,
  listenToAuthChanges,
  translateAdminContent,
  signInWithPassword,
  signInWithOAuth,
  signInWithTelegram,
  signUpWithPassword,
  signOut,
  updateProfile,
  upsertBlogPost,
  upsertProducts,
  upsertSiteContent,
  uploadMediaAsset,
  uploadMediaAssetFromUrl,
} from '../lib/supabase'
import { uploadGoogleDriveVideoAsset } from '../lib/googleDrive.js'
import { defaultBlogPosts, mergeBlogPosts } from '../data/defaultBlogPosts'
import { isEntitlementActive } from '../utils/entitlements'
import { getTranslationState } from '../utils/translationSync'
import { hashStableValue } from '../utils/translationSync'
import {
  readStorageValue,
  removeStorageValue,
  writeStorageValue,
} from '../utils/storage'
import { normalizeRecordingChoice } from '../utils/encuentrosBooking'
import {
  DEFAULT_ENCUENTROS_MODEL_SLUG,
  resolveEncounterFallbackSlug,
} from '../utils/encuentrosModels'

const SITE_CONTENT_KEY = 'privatehw.site-content.v2'
const BLOG_POSTS_KEY = 'privatehw.blog-posts.v1'
const PRODUCTS_KEY = 'privatehw.products.v1'
const ENTITLEMENTS_KEY = 'privatehw.entitlements.v1'
const ORDERS_KEY = 'privatehw.orders.v1'
const PHYSICAL_ORDERS_KEY = 'privatehw.physical-orders.v1'
const USERS_KEY = 'privatehw.users.v1'
const CUSTOMER_ADMIN_KEY = 'privatehw.customer-admin.v1'
const SESSION_KEY = 'privatehw.session.v1'

const globalAppState = globalThis
const AppStateContext =
  globalAppState.__privatehwAppStateContext ||
  (globalAppState.__privatehwAppStateContext = createContext(null))

function withTimeout(promise, timeoutMs = 10000, timeoutMessage = 'La operacion tardo demasiado.') {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    }),
  ])
}

function normalizeFeaturedSlot(value, fallbackFeatured = false) {
  if (value === 'primary' || value === 'secondary') {
    return value
  }

  return fallbackFeatured ? 'primary' : 'none'
}

function parseDateOrNull(value) {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function getFallbackUsersState() {
  return defaultUsers
}

function isLikelySupabaseAuthConnectivityError(error) {
  const message = String(error?.message || '').toLowerCase()
  const code = String(error?.cause?.code || error?.code || '').toUpperCase()

  return (
    message.includes('fetch failed') ||
    message.includes('failed to fetch') ||
    message.includes('getaddrinfo') ||
    message.includes('network') ||
    message.includes('tardo demasiado') ||
    ['ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT'].includes(code)
  )
}

function getActiveAdminCount(nextUsers = [], excludeUserId = '') {
  return nextUsers.filter(
    (user) =>
      user.id !== excludeUserId &&
      user.role === 'admin' &&
      user.status === 'active',
  ).length
}

function wouldRemoveAdminAccess(currentUser = {}, patch = {}) {
  const nextRole = patch.role ?? currentUser.role
  const nextStatus = patch.status ?? currentUser.status
  const isDeletion = Boolean(patch._delete)

  return (
    currentUser.role === 'admin' &&
    currentUser.status === 'active' &&
    (isDeletion || nextRole !== 'admin' || nextStatus !== 'active')
  )
}

function addDuration(baseDate, durationUnit, durationValue) {
  const nextDate = new Date(baseDate)

  if (durationUnit === 'days') {
    nextDate.setDate(nextDate.getDate() + durationValue)
    return nextDate
  }

  nextDate.setMonth(nextDate.getMonth() + durationValue)
  return nextDate
}

function buildOrderDateMap(nextOrders = []) {
  return new Map(
    nextOrders.map((order) => [order.id, parseDateOrNull(order.createdAt)]),
  )
}

function buildManualReservationOrder({
  guestName = '',
  recordingChoice = 'standard',
  selectedDate = '',
  selectedTime = '',
  pricing = {},
  modelSlug = '',
  session = null,
}) {
  const normalizedModelSlug = String(modelSlug || '').trim() || DEFAULT_ENCUENTROS_MODEL_SLUG
  const reservationRequestId = `reservation-${normalizedModelSlug}-${selectedDate}-${selectedTime.replace(':', '')}-${Date.now()}`
  const createdAt = new Date().toISOString()
  const advanceAmount = Number.isFinite(pricing.advanceAmount) ? pricing.advanceAmount : 0
  const effectiveAmount = Number.isFinite(pricing.effectiveAmount) ? pricing.effectiveAmount : 0
  const baseAmount = Number.isFinite(pricing.baseAmount) ? pricing.baseAmount : 0
  const remainingAmount = Number.isFinite(pricing.remainingAmount)
    ? pricing.remainingAmount
    : Math.max(0, effectiveAmount - advanceAmount)
  const normalizedGuestName = String(guestName || '').trim()

  return {
    id: `manual-order-${Date.now()}`,
    providerOrderId: `manual-${reservationRequestId}`,
    status: 'pending',
    totalAmount: advanceAmount,
    currency: pricing.currency || 'PEN',
    createdAt,
    metadata: {
      checkoutType: 'reservation',
      productType: 'reservation',
      productSlug: `reservation-${normalizedModelSlug}`,
      modelSlug: normalizedModelSlug,
      reservationRequestId,
      reservationGuestName: normalizedGuestName,
      reservationName: normalizedGuestName,
      reservationDate: selectedDate,
      reservationTime: selectedTime,
      reservationRecordingChoice: recordingChoice,
      reservationAdvanceAmount: advanceAmount,
      reservationTotalAmount: effectiveAmount,
      reservationRemainingAmount: remainingAmount,
      reservationBasePriceAmount: baseAmount,
      reservationAdvanceLabel: pricing.advanceLabel || '',
      reservationTotalLabel: pricing.effectiveLabel || '',
      reservationRemainingLabel: pricing.remainingLabel || '',
      paymentMethod: 'PLIN / YAPE',
      paymentNumber: '+51931756041',
      paymentHolder: 'Silvia ****',
      reservationChannel: 'manual',
      reservationStatus: 'pending_manual_payment',
      userId: session?.id || null,
      userEmail: session?.email || null,
    },
    items: [
      {
        id: `manual-order-item-${Date.now()}`,
        productSlug: `reservation-${normalizedModelSlug}`,
        quantity: 1,
        unitAmount: advanceAmount,
        totalAmount: advanceAmount,
        metadata: {
          reservationRequestId,
          modelSlug: normalizedModelSlug,
          reservationGuestName: normalizedGuestName,
          reservationDate: selectedDate,
          reservationTime: selectedTime,
        },
      },
    ],
  }
}

function isSubscriptionEntitlementKey(value = '') {
  return String(value || '').startsWith('tier:')
}

function buildSubscriptionGrantSet(nextEntitlements = [], nextProducts = []) {
  const productsBySlug = new Map(nextProducts.map((product) => [product.slug, product]))
  const grants = new Set()

  nextEntitlements.forEach((entitlement) => {
    if (!isSubscriptionEntitlementKey(entitlement.entitlementKey) || !isEntitlementActive(entitlement)) {
      return
    }

    const product = productsBySlug.get(entitlement.productSlug) || null
    const productGrants = Array.isArray(product?.metadata?.grants) && product.metadata.grants.length
      ? product.metadata.grants
      : []

    productGrants.forEach((grant) => {
      const normalizedGrant = String(grant || '').trim()
      if (normalizedGrant) {
        grants.add(normalizedGrant)
      }
    })
  })

  return grants
}

function enrichSubscriptionEntitlements(nextEntitlements = [], nextOrders = [], nextProducts = []) {
  const productsBySlug = new Map(nextProducts.map((product) => [product.slug, product]))
  const orderCreatedAtById = buildOrderDateMap(nextOrders)

  return nextEntitlements.map((entitlement) => {
    if (!isSubscriptionEntitlementKey(entitlement.entitlementKey)) {
      return entitlement
    }

    const product = productsBySlug.get(entitlement.productSlug) || null

    if (!product) {
      return entitlement
    }

    const durationValue = Number.parseInt(
      product.metadata?.durationValue || product.metadata?.durationMonths || '0',
      10,
    )
    const safeDurationValue = Number.isFinite(durationValue) && durationValue > 0 ? durationValue : 1
    const durationUnit = product.metadata?.durationUnit === 'days' ? 'days' : 'months'
    const baseDate =
      orderCreatedAtById.get(entitlement.sourceOrderId) ||
      parseDateOrNull(entitlement.createdAt) ||
      parseDateOrNull(entitlement.expiresAt) ||
      new Date()

    const storedExpiry = parseDateOrNull(entitlement.expiresAt)
    const computedExpiry = addDuration(baseDate, durationUnit, safeDurationValue)
    const effectiveExpiry =
      storedExpiry && storedExpiry.getTime() > computedExpiry.getTime()
        ? storedExpiry
        : computedExpiry

    return {
      ...entitlement,
      expiresAt: effectiveExpiry.toISOString(),
      createdAt: entitlement.createdAt || baseDate.toISOString(),
    }
  })
}

function mergeGeneratedProducts(generatedProducts = [], existingProducts = []) {
  const savedBySlug = new Map(existingProducts.map((product) => [product.slug, product]))

  const syncedGeneratedProducts = generatedProducts.map((generatedProduct) => {
    const savedProduct = savedBySlug.get(generatedProduct.slug)

    if (!savedProduct && isDerivedProductType(generatedProduct.productType)) {
      return null
    }

    if (!savedProduct) {
      return generatedProduct
    }

    return {
      ...savedProduct,
      ...generatedProduct,
      id: savedProduct.id || generatedProduct.id,
      active:
        typeof savedProduct.active === 'boolean'
          ? savedProduct.active
          : generatedProduct.active,
      stripePriceId: savedProduct.stripePriceId || generatedProduct.stripePriceId,
    }
  })
  .filter(Boolean)

  const generatedSlugs = new Set(generatedProducts.map((product) => product.slug))
  const customProducts = existingProducts.filter(
    (product) =>
      !generatedSlugs.has(product.slug) &&
      !['membership-', 'video-', 'pack-', 'physical-', 'blog-', 'reservation-'].some((prefix) =>
        String(product.slug || '').startsWith(prefix),
      ),
  )

  return [...syncedGeneratedProducts, ...customProducts]
}

function buildBlogTranslationSource(post = {}) {
  return {
    title: post.title || '',
    excerpt: post.excerpt || '',
    seoTitle: post.seoTitle || '',
    seoDescription: post.seoDescription || '',
    contentHtml: post.contentHtml || '<p></p>',
    category: post.category || '',
    tags: post.tags || [],
    mediaItems: (post.mediaItems || []).map((item) => ({
      title: item.title || '',
      caption: item.caption || '',
    })),
  }
}

function applyTranslatedBlogPost(post, translatedResult, targetLocale = 'en', mode = 'full') {
  const translated = translatedResult?.translated || {}
  const currentLocalized = post.localized || {}
  const nextLocalized = {
    ...currentLocalized,
    [targetLocale]: mode === 'missing'
      ? {
          ...translated,
          ...(currentLocalized[targetLocale] || {}),
        }
      : translated,
  }

  return {
    ...post,
    localized: nextLocalized,
    localizedMeta: {
      ...(post.localizedMeta || {}),
      [targetLocale]: {
        ...(post.localizedMeta?.[targetLocale] || {}),
        blogPost: {
          sourceHash: translatedResult?.sourceHash || hashStableValue(buildBlogTranslationSource(post)),
          translatedAt: translatedResult?.translatedAt || new Date().toISOString(),
          provider: translatedResult?.provider || '',
          mode,
        },
      },
    },
  }
}

export function AppProvider({ children }) {
  const initialSiteContent = isSupabaseConfigured
    ? mergeSiteContent(defaultSiteContent)
    : mergeSiteContent(readStorageValue(SITE_CONTENT_KEY, defaultSiteContent))
  const initialBlogPosts = isSupabaseConfigured
    ? mergeBlogPosts(defaultBlogPosts, [])
    : mergeBlogPosts(defaultBlogPosts, readStorageValue(BLOG_POSTS_KEY, defaultBlogPosts))
  const [siteContent, setSiteContent] = useState(() => initialSiteContent)
  const [users, setUsers] = useState(() =>
    isSupabaseConfigured ? [] : readStorageValue(USERS_KEY, defaultUsers),
  )
  const [customerAdminData, setCustomerAdminData] = useState(() =>
    readStorageValue(CUSTOMER_ADMIN_KEY, []),
  )
  const [adminAuditEvents, setAdminAuditEvents] = useState(() =>
    readStorageValue('privatehw.admin-audit-events.v1', []),
  )
  const [blogPosts, setBlogPosts] = useState(() => initialBlogPosts)
  const [products, setProducts] = useState(() => {
    const generatedProducts = buildDefaultProducts(initialSiteContent, initialBlogPosts)
    if (isSupabaseConfigured) {
      return generatedProducts
    }

    const savedProducts = readStorageValue(PRODUCTS_KEY, generatedProducts)
    return mergeGeneratedProducts(generatedProducts, savedProducts)
  })
  const [entitlements, setEntitlements] = useState(() =>
    normalizeEntitlements(readStorageValue(ENTITLEMENTS_KEY, defaultEntitlements)),
  )
  const [orders, setOrders] = useState(() => readStorageValue(ORDERS_KEY, []))
  const [physicalOrders, setPhysicalOrders] = useState(() =>
    readStorageValue(PHYSICAL_ORDERS_KEY, []),
  )
  const [session, setSession] = useState(() =>
    isSupabaseConfigured ? null : readStorageValue(SESSION_KEY, null),
  )
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const blogLocaleRepairRef = useRef({ signature: '', running: false })

  useEffect(() => {
    setSiteContent((current) => {
      const normalized = mergeSiteContent(current)

      if (hashStableValue(normalized) === hashStableValue(current)) {
        return current
      }

      return normalized
    })
  }, [siteContent])

  async function safeFetchProducts(content, nextBlogPosts = blogPosts) {
    if (!isSupabaseConfigured) {
      const generatedProducts = buildDefaultProducts(content, nextBlogPosts)
      return mergeGeneratedProducts(generatedProducts, products)
    }

    try {
      return await fetchProducts(content, nextBlogPosts)
    } catch {
      const generatedProducts = buildDefaultProducts(content, nextBlogPosts)
      return mergeGeneratedProducts(generatedProducts, products)
    }
  }

  async function safeFetchEntitlements() {
    if (!isSupabaseConfigured) {
      return entitlements
    }

    try {
      return await fetchCurrentEntitlements()
    } catch {
      return defaultEntitlements
    }
  }

  async function safeFetchOrders() {
    if (!isSupabaseConfigured) {
      return orders
    }

    try {
      return await fetchCurrentOrders()
    } catch {
      return []
    }
  }

  function hydrateSessionSideData(nextSession) {
    queueMicrotask(async () => {
      try {
        const [nextEntitlements, nextOrders] = await Promise.all([
          withTimeout(
            safeFetchEntitlements(),
            8000,
            'La carga de accesos excedio el tiempo esperado.',
          ),
          withTimeout(
            safeFetchOrders(),
            8000,
            'La carga de ordenes excedio el tiempo esperado.',
          ),
        ])

        setEntitlements(enrichSubscriptionEntitlements(nextEntitlements, nextOrders, products))
        setOrders(nextOrders)
      } catch {
        setEntitlements(defaultEntitlements)
        setOrders([])
      }

      if (nextSession?.role === 'admin') {
        loadAdminData(nextSession)
      }
    })
  }

  async function loadAdminData(nextSession = session) {
    if (!isSupabaseConfigured) {
      return
    }

    if (nextSession?.role !== 'admin') {
      return
    }

    try {
      const [remoteUsers, adminSnapshot] = await Promise.all([
        withTimeout(getProfiles(), 8000, 'La carga de perfiles admin excedio el tiempo esperado.'),
        withTimeout(
          getCustomerAdminSnapshot(),
          8000,
          'La carga del resumen comercial excedio el tiempo esperado.',
        ),
      ])

      setUsers(remoteUsers)
      setCustomerAdminData(adminSnapshot)
    } catch {
      setUsers(getFallbackUsersState())
      setCustomerAdminData([])
    }

    try {
      const auditEvents = await withTimeout(
        getAdminAuditEvents(nextSession?.accessToken || ''),
        8000,
        'La carga de la auditoria excedio el tiempo esperado.',
      )

      setAdminAuditEvents(auditEvents)
    } catch {
      setAdminAuditEvents([])
    }
  }

  async function repairPublishedBlogTranslations(nextPosts = blogPosts) {
    if (!isSupabaseConfigured || session?.role !== 'admin') {
      return nextPosts
    }

    const translatedPosts = await Promise.all(
      nextPosts.map(async (post) => {
        if (post.status !== 'published') {
          return post
        }

        const source = buildBlogTranslationSource(post)
        const translationState = getTranslationState({
          source,
          translated: post.localized?.en,
          meta: post.localizedMeta,
          locale: 'en',
        })

        if (translationState === 'synced') {
          return post
        }

        try {
          const translatedResult = await translateAdminContent(source, {
            sourceLocale: 'es',
            targetLocale: 'en',
            mode: 'full',
            scope: 'blogPost',
          })

          return applyTranslatedBlogPost(post, translatedResult, 'en', 'full')
        } catch {
          return post
        }
      }),
    )

    const changedPosts = translatedPosts.filter(
      (post, index) => hashStableValue(post) !== hashStableValue(nextPosts[index]),
    )

    if (!changedPosts.length) {
      return nextPosts
    }

    setBlogPosts(translatedPosts)
    writeStorageValue(BLOG_POSTS_KEY, translatedPosts)

    const nextGeneratedProducts = buildDefaultProducts(siteContent, translatedPosts)
    const nextMergedProducts = mergeGeneratedProducts(nextGeneratedProducts, products)
    setProducts(nextMergedProducts)

    try {
      await Promise.all(changedPosts.map((post) => upsertBlogPost(post)))
    } catch {
      // Keep the local repair even if the remote sync is temporarily unavailable.
    }

    try {
      await upsertProducts(
        nextMergedProducts.filter((product) => isPersistentProductType(product.productType)),
      )
    } catch {
      // Product regeneration can lag behind until the commerce schema is fully aligned.
    }

    return translatedPosts
  }

  useEffect(() => {
    writeStorageValue(SITE_CONTENT_KEY, siteContent)
  }, [siteContent])

  useEffect(() => {
    writeStorageValue(USERS_KEY, users)
  }, [users])

  useEffect(() => {
    writeStorageValue(CUSTOMER_ADMIN_KEY, customerAdminData)
  }, [customerAdminData])

  useEffect(() => {
    writeStorageValue('privatehw.admin-audit-events.v1', adminAuditEvents)
  }, [adminAuditEvents])

  useEffect(() => {
    writeStorageValue(BLOG_POSTS_KEY, blogPosts)
  }, [blogPosts])

  useEffect(() => {
    writeStorageValue(PRODUCTS_KEY, products)
  }, [products])

  useEffect(() => {
    writeStorageValue(ENTITLEMENTS_KEY, entitlements)
  }, [entitlements])

  useEffect(() => {
    writeStorageValue(ORDERS_KEY, orders)
  }, [orders])

  useEffect(() => {
    writeStorageValue(PHYSICAL_ORDERS_KEY, physicalOrders)
  }, [physicalOrders])

  useEffect(() => {
    if (isSupabaseConfigured) {
      removeStorageValue(SESSION_KEY)
      return
    }

    if (session) {
      writeStorageValue(SESSION_KEY, session)
      return
    }

    removeStorageValue(SESSION_KEY)
  }, [session])

  useEffect(() => {
    let isMounted = true

    async function bootstrapFromSupabase() {
      if (!isSupabaseConfigured) {
        setIsBootstrapping(false)
        return
      }

      try {
        const [remoteContent, remotePosts, remoteSession] = await Promise.all([
          withTimeout(fetchSiteContent(), 8000, 'La carga de site_content excedio el tiempo esperado.'),
          withTimeout(fetchBlogPosts(), 8000, 'La carga del blog excedio el tiempo esperado.'),
          withTimeout(getCurrentSession(), 8000, 'La carga de sesion excedio el tiempo esperado.'),
        ])

        if (!isMounted) {
          return
        }

        const nextBlogPosts = mergeBlogPosts(defaultBlogPosts, remotePosts)
        const nextSiteContent = mergeSiteContent(remoteContent)

        setSiteContent(nextSiteContent)
        setBlogPosts(nextBlogPosts)
        setSession(remoteSession)

        const remoteProducts = await safeFetchProducts(nextSiteContent, nextBlogPosts)

        if (isMounted) {
          setProducts(remoteProducts)
        }

        if (remoteSession) {
          const [remoteEntitlements, remoteOrders] = await Promise.all([
            safeFetchEntitlements(),
            safeFetchOrders(),
          ])

          if (isMounted) {
            setEntitlements(
              enrichSubscriptionEntitlements(remoteEntitlements, remoteOrders, remoteProducts),
            )
            setOrders(remoteOrders)
          }
        } else if (isMounted) {
          setEntitlements(defaultEntitlements)
          setOrders([])
        }

        if (remoteSession?.role === 'admin') {
          queueMicrotask(() => {
            loadAdminData(remoteSession)
          })
        }
      } catch {
        if (isMounted) {
          const fallbackSiteContent = mergeSiteContent(
            readStorageValue(SITE_CONTENT_KEY, defaultSiteContent),
          )
          const fallbackBlogPosts = mergeBlogPosts(
            defaultBlogPosts,
            readStorageValue(BLOG_POSTS_KEY, defaultBlogPosts),
          )
          setSession(null)
          setUsers(getFallbackUsersState())
          setBlogPosts(fallbackBlogPosts)
          setProducts(buildDefaultProducts(fallbackSiteContent, fallbackBlogPosts))
          setEntitlements(defaultEntitlements)
          setOrders([])
          setCustomerAdminData([])
          setSiteContent(fallbackSiteContent)
        }
      } finally {
        if (isMounted) {
          setIsBootstrapping(false)
        }
      }
    }

    bootstrapFromSupabase()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return undefined
    }

    const subscription = listenToAuthChanges((nextSession) => {
      setSession(nextSession)

      if (nextSession) {
        hydrateSessionSideData(nextSession)
        return
      }

      setEntitlements(defaultEntitlements)
      setOrders([])
      setUsers(getFallbackUsersState())
      setCustomerAdminData([])
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (
      isBootstrapping ||
      !isSupabaseConfigured ||
      session?.role !== 'admin' ||
      !blogPosts.length
    ) {
      return undefined
    }

    const repairCandidates = blogPosts.filter((post) => {
      if (post.status !== 'published') {
        return false
      }

      const translationState = getTranslationState({
        source: buildBlogTranslationSource(post),
        translated: post.localized?.en,
        meta: post.localizedMeta,
        locale: 'en',
      })

      return translationState !== 'synced'
    })

    if (!repairCandidates.length) {
      return undefined
    }

    const repairSignature = repairCandidates
      .map((post) => `${post.id}:${hashStableValue(buildBlogTranslationSource(post))}`)
      .join('|')

    if (blogLocaleRepairRef.current.running || blogLocaleRepairRef.current.signature === repairSignature) {
      return undefined
    }

    blogLocaleRepairRef.current.signature = repairSignature
    blogLocaleRepairRef.current.running = true

    let cancelled = false

    queueMicrotask(async () => {
      try {
        if (cancelled) {
          return
        }

        await repairPublishedBlogTranslations(blogPosts)
      } finally {
        blogLocaleRepairRef.current.running = false
      }
    })

    return () => {
      cancelled = true
    }
  }, [blogPosts, isBootstrapping, session?.role])

  async function loginWithEmail(form) {
    if (!isSupabaseConfigured) {
      const matchedUser = users.find(
        (user) =>
          user.email.toLowerCase() === form.email.toLowerCase() &&
          user.password === form.password &&
          user.role === 'admin' &&
          user.status === 'active',
      )

      if (!matchedUser) {
        throw new Error('Credenciales invalidas para el panel admin.')
      }

      const nextSession = {
        id: matchedUser.id,
        name: matchedUser.name,
        email: matchedUser.email,
        role: matchedUser.role,
      }

      setSession(nextSession)
      return nextSession
    }

    try {
      const nextSession = await withTimeout(
        signInWithPassword({ ...form, requireAdmin: true }),
        10000,
        'El login admin tardo demasiado. Revisa tu conexion o intenta otra vez.',
      )
      setSession(nextSession)
      hydrateSessionSideData(nextSession)

      return nextSession
    } catch (error) {
      const canFallbackToDemo =
        isLikelySupabaseAuthConnectivityError(error) ||
        String(error?.message || '').includes('public.profiles')

      if (!canFallbackToDemo) {
        throw error
      }

      const matchedUser = defaultUsers.find(
        (user) =>
          user.email.toLowerCase() === form.email.toLowerCase() &&
          user.password === form.password &&
          user.role === 'admin' &&
          user.status === 'active',
      )

      if (!matchedUser) {
        throw error
      }

      const nextSession = {
        id: matchedUser.id,
        name: matchedUser.name,
        email: matchedUser.email,
        role: matchedUser.role,
        accessToken: '',
      }

      setSession(nextSession)
      return nextSession
    }
  }

  async function loginMemberWithEmail(form) {
    if (!isSupabaseConfigured) {
      const matchedUser = users.find(
        (user) =>
          user.email.toLowerCase() === form.email.toLowerCase() &&
          user.password === form.password &&
          user.status === 'active',
      )

      if (!matchedUser) {
        throw new Error('Credenciales invalidas para acceder al contenido.')
      }

      const nextSession = {
        id: matchedUser.id,
        name: matchedUser.name,
        email: matchedUser.email,
        role: matchedUser.role,
        accessToken: '',
      }

      setSession(nextSession)
      return nextSession
    }

    const nextSession = await withTimeout(
      signInWithPassword(form),
      10000,
      'El login tardo demasiado. Revisa tu conexion o intenta otra vez.',
    )
    setSession(nextSession)
    hydrateSessionSideData(nextSession)

    return nextSession
  }

  async function signUpMemberWithEmail(form) {
    if (!isSupabaseConfigured) {
      const alreadyExists = users.some(
        (user) => user.email.toLowerCase() === form.email.toLowerCase(),
      )

      if (alreadyExists) {
        throw new Error('Este correo ya existe en el entorno local.')
      }

      const nextUser = {
        id: `local-user-${Date.now()}`,
        name: form.displayName || form.email.split('@')[0],
        email: form.email,
        password: form.password,
        role: 'public',
        status: 'active',
      }

      setUsers((currentUsers) => [...currentUsers, nextUser])

      const nextSession = {
        id: nextUser.id,
        name: nextUser.name,
        email: nextUser.email,
        role: nextUser.role,
        accessToken: '',
      }

      setSession(nextSession)
      return { session: nextSession, requiresEmailConfirmation: false }
    }

    const nextSession = await signUpWithPassword(form)

    if (!nextSession?.accessToken) {
      return { session: null, requiresEmailConfirmation: true }
    }

    setSession(nextSession)
    hydrateSessionSideData(nextSession)

    return { session: nextSession, requiresEmailConfirmation: false }
  }

  async function loginMemberWithOAuth(provider, redirectTo = '/') {
    if (!isSupabaseConfigured) {
      throw new Error('El acceso social requiere Supabase configurado.')
    }

    const callbackUrl = new URL('/access', window.location.origin)
    callbackUrl.searchParams.set('redirect', redirectTo || '/')
    callbackUrl.searchParams.set('oauth', '1')

    await signInWithOAuth(provider, callbackUrl.toString())

    return null
  }

  async function loginMemberWithTelegram(telegramUser) {
    if (!isSupabaseConfigured) {
      throw new Error('Telegram requiere Supabase configurado.')
    }

    const nextSession = await withTimeout(
      signInWithTelegram(telegramUser),
      15000,
      'Telegram tardo demasiado en validar el acceso. Revisa tu conexion o intenta otra vez.',
    )

    setSession(nextSession)
    hydrateSessionSideData(nextSession)

    return nextSession
  }

  async function createManagedUser(form) {
    if (!isSupabaseConfigured) {
      const alreadyExists = users.some(
        (user) => user.email.toLowerCase() === String(form.email || '').toLowerCase(),
      )

      if (alreadyExists) {
        throw new Error('Este correo ya existe en el entorno local.')
      }

      const nextUser = {
        id: `local-user-${Date.now()}`,
        name: form.name || form.email.split('@')[0],
        email: form.email,
        password: form.password,
        role: form.role || 'public',
        status: form.status || 'active',
      }

      setUsers((currentUsers) => [...currentUsers, nextUser])

      if (form.subscriptionPlanSlug) {
        const selectedProduct = subscriptionProducts.find(
          (product) => product.slug === form.subscriptionPlanSlug,
        )

        if (selectedProduct) {
          const startAt = form.subscriptionStartAt ? new Date(form.subscriptionStartAt) : new Date()
          const parsedDurationValue = Number.parseInt(
            form.subscriptionDurationValue || selectedProduct.metadata?.durationValue || '1',
            10,
          )
          const durationValue =
            Number.isFinite(parsedDurationValue) && parsedDurationValue > 0 ? parsedDurationValue : 1
          const durationUnit =
            form.subscriptionDurationUnit === 'days'
              ? 'days'
              : selectedProduct.metadata?.durationUnit === 'days'
                ? 'days'
                : 'months'
          const expiresAt = addDuration(
            Number.isNaN(startAt.getTime()) ? new Date() : startAt,
            durationUnit,
            durationValue,
          ).toISOString()

          setEntitlements((currentEntitlements) =>
            normalizeEntitlements([
              ...currentEntitlements,
              {
                id: `entitlement-${Date.now()}`,
                userId: nextUser.id,
                productSlug: selectedProduct.slug,
                entitlementKey: selectedProduct.accessScope || '',
                status: 'active',
                expiresAt,
                createdAt: new Date().toISOString(),
                sourceOrderId: '',
                grantSource: 'admin',
                grantedBy: session?.id || '',
              },
            ]),
          )
        }
      }

      return {
        ok: true,
        profile: {
          id: nextUser.id,
          display_name: nextUser.name,
          email: nextUser.email,
          role: nextUser.role,
          status: nextUser.status,
        },
      }
    }

    const result = await createManagedUserRequest(
      {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        status: form.status,
        subscriptionPlanSlug: form.subscriptionPlanSlug || '',
        subscriptionStartAt: form.subscriptionStartAt || '',
        subscriptionDurationValue: form.subscriptionDurationValue || '',
        subscriptionDurationUnit: form.subscriptionDurationUnit || 'months',
      },
      session?.accessToken || '',
    )

    await refreshUsers()
    return result
  }

  async function updateManagedSubscription(userId, form) {
    const action = form.action === 'revoke' ? 'revoke' : 'grant'

    if (!isSupabaseConfigured) {
      const targetUser = users.find((user) => user.id === userId)
      if (!targetUser) {
        throw new Error('El usuario no existe en el entorno local.')
      }

      if (action === 'revoke') {
        setEntitlements((currentEntitlements) =>
          normalizeEntitlements(
            currentEntitlements.map((entitlement) => {
              if (
                entitlement.userId !== userId ||
                !isSubscriptionEntitlementKey(entitlement.entitlementKey)
              ) {
                return entitlement
              }

              return {
                ...entitlement,
                status: 'revoked',
                expiresAt: new Date().toISOString(),
                grantSource: 'admin',
                grantedBy: session?.id || '',
              }
            }),
          ),
        )

        return { ok: true, entitlement: null }
      }

      const selectedProduct = subscriptionProducts.find(
        (product) => product.slug === form.planSlug,
      )

      if (!selectedProduct) {
        throw new Error('El plan de suscripcion no existe en el entorno local.')
      }

      const startAt = parseDateOrNull(form.startAt) || new Date()
      const parsedDurationValue = Number.parseInt(
        form.durationValue || selectedProduct.metadata?.durationValue || selectedProduct.metadata?.durationMonths || '1',
        10,
      )
      const durationValue =
        Number.isFinite(parsedDurationValue) && parsedDurationValue > 0 ? parsedDurationValue : 1
      const durationUnit =
        form.durationUnit === 'days'
          ? 'days'
          : selectedProduct.metadata?.durationUnit === 'days'
            ? 'days'
            : 'months'
      const expiresAt = addDuration(startAt, durationUnit, durationValue).toISOString()
      const updatedEntitlement = {
        id: `entitlement-${Date.now()}`,
        userId,
        productSlug: selectedProduct.slug,
        entitlementKey: selectedProduct.accessScope || '',
        status: 'active',
        expiresAt,
        createdAt: new Date().toISOString(),
        sourceOrderId: '',
        grantSource: 'admin',
        grantedBy: session?.id || '',
      }

      setEntitlements((currentEntitlements) => {
        let matchedCurrentTier = false

        const nextEntitlements = currentEntitlements.map((entitlement) => {
          if (entitlement.userId !== userId || !isSubscriptionEntitlementKey(entitlement.entitlementKey)) {
            return entitlement
          }

          if (entitlement.entitlementKey === updatedEntitlement.entitlementKey) {
            matchedCurrentTier = true
            return { ...entitlement, ...updatedEntitlement }
          }

          return {
            ...entitlement,
            status: 'revoked',
            expiresAt: new Date().toISOString(),
            grantSource: 'admin',
            grantedBy: session?.id || '',
          }
        })

        if (matchedCurrentTier) {
          return normalizeEntitlements(nextEntitlements)
        }

        return normalizeEntitlements([...nextEntitlements, updatedEntitlement])
      })

      return { ok: true, entitlement: updatedEntitlement }
    }

    const result = await updateManagedSubscriptionRequest(
      userId,
      {
        action,
        planSlug: form.planSlug || '',
        startAt: form.startAt || '',
        durationValue: form.durationValue || '',
        durationUnit: form.durationUnit || 'months',
      },
      session?.accessToken || '',
    )

    await refreshUsers()
    return result
  }

  async function createCheckoutSession(productSlug, context = {}) {
    if (!session) {
      const authError = new Error('Necesitas iniciar sesion para continuar con la compra.')
      authError.code = 'AUTH_REQUIRED'
      throw authError
    }

    const response = await fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: session.accessToken ? `Bearer ${session.accessToken}` : '',
      },
      body: JSON.stringify({ productSlug, context }),
    })

    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      const requestError = new Error(
        payload.error || 'No se pudo iniciar el checkout en este momento.',
      )

      requestError.code = payload.code || 'CHECKOUT_ERROR'
      throw requestError
    }

    if (!payload.url) {
      throw new Error('Stripe no devolvio una URL valida para el checkout.')
    }

    window.location.assign(payload.url)
  }

  async function createEncounterReservationRequest(payload = {}) {
    const resolvedModelSlug = String(payload.modelSlug || '').trim() || (await resolveEncounterFallbackSlug(fetchEncuentrosModels))
    const nextOrder = buildManualReservationOrder({
      guestName: payload.guestName || '',
      recordingChoice: normalizeRecordingChoice(payload.recordingChoice || 'standard'),
      selectedDate: payload.selectedDate || '',
      selectedTime: payload.selectedTime || '',
      pricing: payload.pricing || {},
      modelSlug: resolvedModelSlug,
      session,
    })

    try {
      const serverOrder = await createManualEncuentrosReservationRequest(
        {
          guestName: payload.guestName || '',
          recordingChoice: normalizeRecordingChoice(payload.recordingChoice || 'standard'),
          selectedDate: payload.selectedDate || '',
          selectedTime: payload.selectedTime || '',
          pricing: payload.pricing || {},
          modelSlug: resolvedModelSlug,
        },
        session?.accessToken || '',
      )

      const normalizedServerOrder = serverOrder || nextOrder

      setOrders((currentOrders) => [
        normalizedServerOrder,
        ...currentOrders.filter(
          (order) =>
            order.providerOrderId !== normalizedServerOrder.providerOrderId &&
            order.id !== normalizedServerOrder.id,
        ),
      ])

      return normalizedServerOrder
    } catch {
      setOrders((currentOrders) => [
        nextOrder,
        ...currentOrders.filter(
          (order) => order.providerOrderId !== nextOrder.providerOrderId && order.id !== nextOrder.id,
        ),
      ])

      return nextOrder
    }
  }

  async function refreshCommerceData() {
    const [nextProducts, nextEntitlements, nextOrders] = await Promise.all([
      safeFetchProducts(siteContent, blogPosts),
      safeFetchEntitlements(),
      safeFetchOrders(),
    ])

    setProducts(nextProducts)
    const enrichedEntitlements = enrichSubscriptionEntitlements(
      nextEntitlements,
      nextOrders,
      nextProducts,
    )
    setEntitlements(enrichedEntitlements)
    setOrders(nextOrders)

    return {
      products: nextProducts,
      entitlements: enrichedEntitlements,
      orders: nextOrders,
    }
  }

  async function logout() {
    if (isSupabaseConfigured) {
      await signOut()
    }

    setSession(null)
    setUsers(getFallbackUsersState())
    setEntitlements(defaultEntitlements)
    setOrders([])
    setCustomerAdminData([])
    setAdminAuditEvents([])
  }

  async function saveSiteContent(nextContent) {
    const normalizedContent = mergeSiteContent(nextContent)
    setSiteContent(normalizedContent)
    const nextProducts = buildDefaultProducts(normalizedContent, blogPosts)
    setProducts((currentProducts) => mergeGeneratedProducts(nextProducts, currentProducts))

    if (isSupabaseConfigured && session?.role === 'admin') {
      await upsertSiteContent(normalizedContent, session.id)

      try {
        await upsertProducts(
          mergeGeneratedProducts(nextProducts, products).filter((product) =>
            isPersistentProductType(product.productType),
          ),
        )
      } catch {
        // Product sync can lag behind until the commerce schema is applied in Supabase.
      }
    }
  }

  async function refreshUsers() {
    if (!isSupabaseConfigured || session?.role !== 'admin') {
      return
    }

    await loadAdminData()
  }

  async function saveBlogPost(nextPost) {
    const normalizedPost = mergeBlogPosts([], [
      {
        ...nextPost,
        featuredSlot: normalizeFeaturedSlot(nextPost.featuredSlot, nextPost.featured),
      },
    ])[0]
    const optimisticPost = {
      ...normalizedPost,
      updatedAt: new Date().toISOString(),
    }
    const normalizedSlot = normalizedPost.featuredSlot
    const clearFeaturedSlot = (post) =>
      normalizedSlot !== 'none' && post.slug !== normalizedPost.slug && post.featuredSlot === normalizedSlot
        ? { ...post, featuredSlot: 'none', featured: false }
        : post

    const persistBlogPosts = (candidatePost) => {
      setBlogPosts((currentPosts) => {
        const nextPosts = mergeBlogPosts(currentPosts.map(clearFeaturedSlot), [candidatePost])
        const nextGeneratedProducts = buildDefaultProducts(siteContent, nextPosts)
        setProducts((currentProducts) => mergeGeneratedProducts(nextGeneratedProducts, currentProducts))
        writeStorageValue(BLOG_POSTS_KEY, nextPosts)
        return nextPosts
      })
    }

    if (!isSupabaseConfigured || session?.role !== 'admin') {
      persistBlogPosts(optimisticPost)
      return optimisticPost
    }

    persistBlogPosts(optimisticPost)

    const savedPost = await upsertBlogPost(optimisticPost)
    const hydratedSavedPost = {
      ...optimisticPost,
      ...savedPost,
      priceLabel: savedPost.priceLabel || normalizedPost.priceLabel || '',
      priceAmount: Number.isFinite(savedPost.priceAmount)
        ? savedPost.priceAmount
        : optimisticPost.priceAmount || 0,
      currency: savedPost.currency || normalizedPost.currency || 'USD',
      updatedAt: savedPost.updatedAt || savedPost.updated_at || optimisticPost.updatedAt,
    }
    persistBlogPosts(hydratedSavedPost)

    try {
      const nextGeneratedProducts = buildDefaultProducts(
        siteContent,
        mergeBlogPosts(blogPosts.map(clearFeaturedSlot), [hydratedSavedPost]),
      )
      await upsertProducts(
        mergeGeneratedProducts(nextGeneratedProducts, products).filter((product) =>
          isPersistentProductType(product.productType),
        ),
      )
    } catch {
      // Blog product sync can lag behind until the commerce schema is applied in Supabase.
    }

    return hydratedSavedPost
  }

  async function removeManagedBlogPost(postId) {
    if (!isSupabaseConfigured || session?.role !== 'admin') {
      setBlogPosts((currentPosts) => {
        const nextPosts = currentPosts.filter((post) => post.id !== postId)
        const nextGeneratedProducts = buildDefaultProducts(siteContent, nextPosts)
        setProducts((currentProducts) => mergeGeneratedProducts(nextGeneratedProducts, currentProducts))
        writeStorageValue(BLOG_POSTS_KEY, nextPosts)
        return nextPosts
      })
      return
    }

    await deleteBlogPost(postId)
    setBlogPosts((currentPosts) => {
      const nextPosts = currentPosts.filter((post) => post.id !== postId)
      const nextGeneratedProducts = buildDefaultProducts(siteContent, nextPosts)
      setProducts((currentProducts) => mergeGeneratedProducts(nextGeneratedProducts, currentProducts))
      writeStorageValue(BLOG_POSTS_KEY, nextPosts)
      return nextPosts
    })

    try {
      const nextPosts = blogPosts.filter((post) => post.id !== postId)
      const nextGeneratedProducts = buildDefaultProducts(siteContent, nextPosts)
      await upsertProducts(
        mergeGeneratedProducts(nextGeneratedProducts, products).filter((product) =>
          isPersistentProductType(product.productType),
        ),
      )
    } catch {
      // Blog product sync can lag behind until the commerce schema is applied in Supabase.
    }
  }

  async function updateManagedUser(userId, patch) {
    const currentUser = users.find((user) => user.id === userId) || null

    if (currentUser && wouldRemoveAdminAccess(currentUser, patch)) {
      const remainingAdmins = getActiveAdminCount(users, userId)

      if (remainingAdmins === 0) {
        throw new Error('Debes conservar al menos un administrador activo.')
      }
    }

    if (!isSupabaseConfigured || session?.role !== 'admin') {
      if (patch?._delete) {
        setUsers((currentUsers) => currentUsers.filter((user) => user.id !== userId))
        return
      }

      setUsers((currentUsers) =>
        currentUsers.some((user) => user.id === userId)
          ? currentUsers.map((user) =>
              user.id === userId ? { ...user, ...patch } : user,
            )
          : [...currentUsers, { id: userId, ...patch }],
      )
      return
    }

    const updatedUser = await updateProfile(userId, patch)
    setUsers((currentUsers) =>
      currentUsers.map((user) => (user.id === userId ? updatedUser : user)),
    )
    await refreshUsers()
  }

  async function uploadManagedMedia(file, bucket, folder = 'home', onProgress, options = {}) {
    if (!isSupabaseConfigured || session?.role !== 'admin') {
      return null
    }

    return uploadMediaAsset(file, bucket, folder, onProgress, options)
  }

  async function uploadManagedVideoMedia(file, slug, variant, onProgress) {
    if (!isSupabaseConfigured || session?.role !== 'admin') {
      return null
    }

    if (!session.accessToken) {
      throw new Error('No hay sesion activa para subir videos a Drive.')
    }

    return {
      provider: 'google-drive',
      ...(await uploadGoogleDriveVideoAsset({
        file,
        slug,
        variant,
        accessToken: session.accessToken,
        onProgress,
      })),
    }
  }

  async function uploadManagedMediaFromUrl(
    sourceUrl,
    bucket,
    folder = 'home',
    onProgress,
    options = {},
  ) {
    if (!isSupabaseConfigured || session?.role !== 'admin') {
      return null
    }

    return uploadMediaAssetFromUrl(sourceUrl, bucket, folder, onProgress, options)
  }

  function createPhysicalOrderRequest(payload) {
    const nextOrder = {
      id: `physical-order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId: session?.id || '',
      userName: session?.name || payload.recipientName || 'Cliente',
      userEmail: session?.email || payload.email || '',
      status: 'pending_payment',
      shippingStatus: 'awaiting_payment',
      carrier: payload.carrier || 'manual_review',
      trackingNumber: '',
      productSlug: payload.productSlug,
      productTitle: payload.productTitle,
      productImage: payload.productImage || '',
      priceLabel: payload.priceLabel || '',
      quantity: payload.quantity || 1,
      recipientName: payload.recipientName || '',
      phone: payload.phone || '',
      country: payload.country || '',
      region: payload.region || '',
      city: payload.city || '',
      postalCode: payload.postalCode || '',
      addressLine1: payload.addressLine1 || '',
      addressLine2: payload.addressLine2 || '',
      reference: payload.reference || '',
      shippingMethod: payload.shippingMethod || 'manual_quote',
      deliveryNotes: payload.deliveryNotes || '',
      adminNotes: '',
      checkoutSessionId: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      paidAt: null,
      deliveredAt: null,
    }

    setPhysicalOrders((currentOrders) => [nextOrder, ...currentOrders])
    return nextOrder
  }

  function markPhysicalOrderPaid(orderId, checkoutSessionId = '') {
    let updatedOrder = null

    setPhysicalOrders((currentOrders) =>
      currentOrders.map((order) => {
        if (order.id !== orderId) {
          return order
        }

        updatedOrder = {
          ...order,
          status: 'paid',
          shippingStatus:
            order.shippingStatus === 'awaiting_payment' ? 'processing' : order.shippingStatus,
          checkoutSessionId: checkoutSessionId || order.checkoutSessionId,
          paidAt: order.paidAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        return updatedOrder
      }),
    )

    return updatedOrder
  }

  function updatePhysicalOrder(orderId, patch) {
    setPhysicalOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              ...patch,
              deliveredAt:
                patch.shippingStatus === 'delivered' && !order.deliveredAt
                  ? new Date().toISOString()
                  : patch.deliveredAt ?? order.deliveredAt,
              updatedAt: new Date().toISOString(),
            }
          : order,
      ),
    )
  }

  function getPhysicalOrdersForUser(userId = session?.id) {
    if (!userId) {
      return []
    }

    return physicalOrders.filter((order) => order.userId === userId)
  }

  function hasEntitlement(entitlementKey) {
    if (session?.role === 'admin') {
      return true
    }

    return effectiveEntitlements.some(
      (entitlement) =>
        entitlement.entitlementKey === entitlementKey && isEntitlementActive(entitlement),
    )
  }

  function hasSubscriptionGrant(grant) {
    if (session?.role === 'admin') {
      return true
    }

    return subscriptionGrantSet.has(String(grant || '').trim())
  }

  function getProductByScope(scope) {
    return products.find((product) => product.accessScope === scope) || null
  }

  function getProductBySlug(productSlug) {
    return products.find((product) => product.slug === productSlug) || null
  }

  function getVideoItemByScope(scope) {
    if (!scope || !scope.startsWith('video:')) {
      return null
    }

    const slug = scope.replace('video:', '')
    return siteContent.videoLibrary.items.find((item) => item.slug === slug) || null
  }

  function getBlogPostByScope(scope) {
    if (!scope || !scope.startsWith('blog:')) {
      return null
    }

    const slug = scope.replace('blog:', '')
    return blogPosts.find((post) => post.slug === slug) || null
  }

  function getProductDestination(productSlug) {
    if (!productSlug) {
      return '/library'
    }

    const product = getProductBySlug(productSlug)

    if (!product) {
      return '/library'
    }

    if (product.productType === 'subscription') {
      return '/library'
    }

    if (product.productType === 'video') {
      const slug = product.accessScope.replace('video:', '')
      return `/videos/${slug}`
    }

    if (product.productType === 'blog') {
      const slug = product.metadata?.contentSlug || product.accessScope.replace('blog:', '')
      return `/blog/${slug}`
    }

    if (product.productType === 'pack') {
      return `/library?focus=${encodeURIComponent(product.slug)}`
    }

    if (product.productType === 'physical') {
      return '/library?focus=physical-orders'
    }

    if (product.productType === 'reservation') {
      return '/library?focus=reservations'
    }

    return `/library?focus=${encodeURIComponent(product.slug)}`
  }

  function getContentAccess(scope) {
    const videoItem = getVideoItemByScope(scope)
    const blogPost = getBlogPostByScope(scope)
    const product = getProductByScope(scope)
    const requiredGrant =
      product?.metadata?.requiredGrant ||
      (videoItem ? 'video' : blogPost ? 'blog' : product?.productType === 'pack' ? 'pack' : null)
    const hasSubscriptionGrant = requiredGrant ? subscriptionGrantSet.has(requiredGrant) : false
    const hasDirectAccess = hasEntitlement(scope)

    if (videoItem) {
      const accessMode = videoItem.accessMode || 'purchase'
      const videoProduct = accessMode === 'purchase' ? product : accessMode === 'subscription' ? subscriptionProduct : null
      const unlocked =
        accessMode === 'public' ||
        (accessMode === 'registered' && Boolean(session)) ||
        (accessMode === 'subscription' && hasSubscriptionGrant) ||
        (accessMode === 'purchase' && (hasSubscriptionGrant || hasDirectAccess))

      return {
        product: videoProduct,
        unlocked,
        includedBySubscription:
          accessMode === 'subscription'
            ? hasSubscriptionGrant
            : accessMode === 'purchase'
              ? hasSubscriptionGrant && !hasDirectAccess
              : false,
        requiresPurchase: accessMode === 'purchase' && !unlocked,
        accessMode,
        content: videoItem,
      }
    }

    if (blogPost) {
      const accessMode = blogPost.accessLevel || 'public'
      const unlocked =
        accessMode === 'public' ||
        (accessMode === 'registered' && Boolean(session)) ||
        (accessMode === 'subscription' && hasSubscriptionGrant) ||
        (accessMode === 'purchase' && (hasSubscriptionGrant || hasDirectAccess))

      return {
        product,
        unlocked,
        includedBySubscription:
          accessMode === 'subscription'
            ? hasSubscriptionGrant
            : accessMode === 'purchase'
              ? hasSubscriptionGrant && !hasDirectAccess
              : false,
        requiresPurchase: accessMode === 'purchase' && !unlocked,
        accessMode,
        content: blogPost,
      }
    }

    const unlocked = hasSubscriptionGrant || hasDirectAccess

    return {
      product,
      unlocked,
      includedBySubscription: !unlocked ? false : hasSubscriptionGrant,
      requiresPurchase: !unlocked,
      accessMode: 'purchase',
    }
  }

  const effectiveEntitlements = useMemo(
    () => enrichSubscriptionEntitlements(entitlements, orders, products),
    [entitlements, orders, products],
  )
  const subscriptionTiers = useMemo(
    () => normalizeSubscriptionTiers(siteContent.accessTotal || {}),
    [siteContent.accessTotal],
  )
  const subscriptionProducts = useMemo(
    () =>
      subscriptionTiers
        .map((tier) => {
          const product =
            products.find(
              (item) =>
                item.slug === `membership-${tier.slug}` &&
                item.productType === 'subscription' &&
                item.accessScope === `tier:${tier.slug}`,
            ) ||
            products.find(
              (item) =>
                item.productType === 'subscription' &&
                item.accessScope === `tier:${tier.slug}`,
            ) ||
            null

          if (product) {
            return product
          }

          return {
            slug: `membership-${tier.slug}`,
            title: `${siteContent.accessTotal?.title || 'Acceso total'} · ${tier.label}`,
            productType: 'subscription',
            checkoutMode: 'subscription',
            accessScope: `tier:${tier.slug}`,
            priceAmount: tier.discountedPriceAmount,
            currency: 'USD',
            priceLabel: tier.discountedPriceLabel || '$0',
            active: true,
            stripePriceId: '',
            metadata: {
              durationValue: tier.durationValue,
              durationUnit: tier.durationUnit,
              durationMonths: tier.durationMonths,
              durationDays: tier.durationDays,
              planLabel: tier.label,
              planPeriod: tier.period,
              promoNote: tier.promoNote,
              originalPriceAmount: tier.originalPriceAmount,
              originalPriceLabel: tier.originalPriceLabel,
              discountedPriceAmount: tier.discountedPriceAmount,
              discountedPriceLabel: tier.discountedPriceLabel,
              discountPercent: tier.discountPercent,
              hasDiscount: tier.hasDiscount,
              savingsAmount: tier.savingsAmount,
              savingsLabel: tier.savingsLabel,
              discountLabel: tier.discountLabel,
              grants: tier.grants,
              rank: tier.rank,
              requiredGrant: tier.grants[0] || 'video',
            },
          }
        })
        .filter(Boolean),
    [products, siteContent.accessTotal, subscriptionTiers],
  )
  const subscriptionGrantSet = useMemo(
    () => buildSubscriptionGrantSet(effectiveEntitlements, products),
    [effectiveEntitlements, products],
  )
  const subscriptionProduct = subscriptionProducts[0] || null

  function formatPriceFromAmount(amount = 0, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format((amount || 0) / 100)
  }

  const value = useMemo(
    () => ({
      isBootstrapping,
      isSupabaseConfigured,
      session,
      setSession,
      siteContent,
      saveSiteContent,
      blogPosts,
      saveBlogPost,
      removeManagedBlogPost,
      products,
      entitlements,
      orders,
      physicalOrders,
      hasEntitlement,
      hasSubscriptionGrant,
      getContentAccess,
      getProductByScope,
      getProductBySlug,
      getProductDestination,
      subscriptionProducts,
      subscriptionProduct,
      formatPriceFromAmount,
      refreshCommerceData,
      createPhysicalOrderRequest,
      createEncounterReservationRequest,
      markPhysicalOrderPaid,
      updatePhysicalOrder,
      getPhysicalOrdersForUser,
      users,
      customerAdminData,
      adminAuditEvents,
      setUsers,
      loginWithEmail,
      loginMemberWithEmail,
      loginMemberWithOAuth,
      loginMemberWithTelegram,
      signUpMemberWithEmail,
      createManagedUser,
      createCheckoutSession,
      logout,
      refreshUsers,
      updateManagedUser,
      updateManagedSubscription,
      uploadManagedMedia,
      uploadManagedVideoMedia,
      uploadManagedMediaFromUrl,
    }),
    [
      isBootstrapping,
      session,
      siteContent,
      blogPosts,
      products,
      entitlements,
      orders,
      physicalOrders,
      createEncounterReservationRequest,
      users,
      customerAdminData,
      adminAuditEvents,
      subscriptionGrantSet,
      updateManagedSubscription,
    ],
  )

  return (
    <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
  )
}

export function useAppState() {
  const context = useContext(AppStateContext)

  if (!context) {
    throw new Error('useAppState must be used inside AppProvider')
  }

  return context
}
