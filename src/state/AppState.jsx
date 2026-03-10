import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { defaultSiteContent, mergeSiteContent } from '../data/defaultSiteContent'
import { defaultUsers } from '../data/defaultUsers'
import {
  buildDefaultProducts,
  defaultEntitlements,
  mergeProducts,
  normalizeEntitlements,
} from '../data/defaultCommerce'
import {
  deleteBlogPost,
  fetchBlogPosts,
  fetchCurrentEntitlements,
  fetchCurrentOrders,
  fetchProducts,
  fetchSiteContent,
  getCustomerAdminSnapshot,
  getCurrentSession,
  getProfiles,
  isSupabaseConfigured,
  listenToAuthChanges,
  signInWithPassword,
  signUpWithPassword,
  signOut,
  updateProfile,
  upsertBlogPost,
  upsertProducts,
  upsertSiteContent,
  uploadMediaAsset,
  uploadMediaAssetFromUrl,
} from '../lib/supabase'
import { defaultBlogPosts, mergeBlogPosts } from '../data/defaultBlogPosts'
import {
  readStorageValue,
  removeStorageValue,
  writeStorageValue,
} from '../utils/storage'

const SITE_CONTENT_KEY = 'privatehw.site-content.v2'
const BLOG_POSTS_KEY = 'privatehw.blog-posts.v1'
const PRODUCTS_KEY = 'privatehw.products.v1'
const ENTITLEMENTS_KEY = 'privatehw.entitlements.v1'
const ORDERS_KEY = 'privatehw.orders.v1'
const USERS_KEY = 'privatehw.users.v1'
const CUSTOMER_ADMIN_KEY = 'privatehw.customer-admin.v1'
const SESSION_KEY = 'privatehw.session.v1'

const AppStateContext = createContext(null)

export function AppProvider({ children }) {
  const [siteContent, setSiteContent] = useState(() =>
    mergeSiteContent(readStorageValue(SITE_CONTENT_KEY, defaultSiteContent)),
  )
  const [users, setUsers] = useState(() => readStorageValue(USERS_KEY, defaultUsers))
  const [customerAdminData, setCustomerAdminData] = useState(() =>
    readStorageValue(CUSTOMER_ADMIN_KEY, []),
  )
  const [blogPosts, setBlogPosts] = useState(() =>
    mergeBlogPosts(defaultBlogPosts, readStorageValue(BLOG_POSTS_KEY, defaultBlogPosts)),
  )
  const [products, setProducts] = useState(() =>
    mergeProducts(
      buildDefaultProducts(defaultSiteContent),
      readStorageValue(PRODUCTS_KEY, buildDefaultProducts(defaultSiteContent)),
    ),
  )
  const [entitlements, setEntitlements] = useState(() =>
    normalizeEntitlements(readStorageValue(ENTITLEMENTS_KEY, defaultEntitlements)),
  )
  const [orders, setOrders] = useState(() => readStorageValue(ORDERS_KEY, []))
  const [session, setSession] = useState(() =>
    isSupabaseConfigured ? null : readStorageValue(SESSION_KEY, null),
  )
  const [isBootstrapping, setIsBootstrapping] = useState(true)

  async function safeFetchProducts(content) {
    if (!isSupabaseConfigured) {
      return mergeProducts(buildDefaultProducts(content), products)
    }

    try {
      return await fetchProducts(content)
    } catch {
      return mergeProducts(buildDefaultProducts(content), products)
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
          fetchSiteContent(),
          fetchBlogPosts(),
          getCurrentSession(),
        ])

        if (!isMounted) {
          return
        }

        setSiteContent(remoteContent)
        setBlogPosts(mergeBlogPosts(defaultBlogPosts, remotePosts))
        setSession(remoteSession)

        const remoteProducts = await safeFetchProducts(remoteContent)

        if (isMounted) {
          setProducts(remoteProducts)
        }

        if (remoteSession) {
          const [remoteEntitlements, remoteOrders] = await Promise.all([
            safeFetchEntitlements(),
            safeFetchOrders(),
          ])

          if (isMounted) {
            setEntitlements(remoteEntitlements)
            setOrders(remoteOrders)
          }
        } else if (isMounted) {
          setEntitlements(defaultEntitlements)
          setOrders([])
        }

        if (remoteSession?.role === 'admin') {
          const [remoteUsers, adminSnapshot] = await Promise.all([
            getProfiles(),
            getCustomerAdminSnapshot(),
          ])

          if (isMounted) {
            setUsers(remoteUsers)
            setCustomerAdminData(adminSnapshot)
          }
        }
      } catch {
        if (isMounted) {
          setSession(null)
          setUsers(defaultUsers)
          setBlogPosts(defaultBlogPosts)
          setProducts(buildDefaultProducts(defaultSiteContent))
          setEntitlements(defaultEntitlements)
          setOrders([])
          setCustomerAdminData([])
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

    const subscription = listenToAuthChanges(async (nextSession) => {
      setSession(nextSession)

      if (nextSession) {
        const [remoteEntitlements, remoteOrders] = await Promise.all([
          safeFetchEntitlements(),
          safeFetchOrders(),
        ])
        setEntitlements(remoteEntitlements)
        setOrders(remoteOrders)
      } else {
        setEntitlements(defaultEntitlements)
        setOrders([])
      }

      if (nextSession?.role === 'admin') {
        const [remoteUsers, adminSnapshot] = await Promise.all([
          getProfiles(),
          getCustomerAdminSnapshot(),
        ])
        setUsers(remoteUsers)
        setCustomerAdminData(adminSnapshot)
        return
      }

      setUsers(defaultUsers)
      setCustomerAdminData([])
    })

    return () => subscription.unsubscribe()
  }, [])

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

    const nextSession = await signInWithPassword({ ...form, requireAdmin: true })
    setSession(nextSession)
    const [nextEntitlements, nextOrders] = await Promise.all([
      safeFetchEntitlements(),
      safeFetchOrders(),
    ])
    setEntitlements(nextEntitlements)
    setOrders(nextOrders)

    return nextSession
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

    const nextSession = await signInWithPassword(form)
    setSession(nextSession)
    const [nextEntitlements, nextOrders] = await Promise.all([
      safeFetchEntitlements(),
      safeFetchOrders(),
    ])
    setEntitlements(nextEntitlements)
    setOrders(nextOrders)

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
    const [nextEntitlements, nextOrders] = await Promise.all([
      safeFetchEntitlements(),
      safeFetchOrders(),
    ])
    setEntitlements(nextEntitlements)
    setOrders(nextOrders)

    return { session: nextSession, requiresEmailConfirmation: false }
  }

  async function createCheckoutSession(productSlug) {
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
      body: JSON.stringify({ productSlug }),
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

  async function refreshCommerceData() {
    const [nextProducts, nextEntitlements, nextOrders] = await Promise.all([
      safeFetchProducts(siteContent),
      safeFetchEntitlements(),
      safeFetchOrders(),
    ])

    setProducts(nextProducts)
    setEntitlements(nextEntitlements)
    setOrders(nextOrders)

    return {
      products: nextProducts,
      entitlements: nextEntitlements,
      orders: nextOrders,
    }
  }

  async function logout() {
    if (isSupabaseConfigured) {
      await signOut()
    }

    setSession(null)
    setUsers(defaultUsers)
    setEntitlements(defaultEntitlements)
    setOrders([])
    setCustomerAdminData([])
  }

  async function saveSiteContent(nextContent) {
    const normalizedContent = mergeSiteContent(nextContent)
    setSiteContent(normalizedContent)
    const nextProducts = mergeProducts(buildDefaultProducts(normalizedContent), products)
    setProducts(nextProducts)

    if (isSupabaseConfigured && session?.role === 'admin') {
      await upsertSiteContent(normalizedContent, session.id)

      try {
        await upsertProducts(nextProducts)
      } catch {
        // Product sync can lag behind until the commerce schema is applied in Supabase.
      }
    }
  }

  async function refreshUsers() {
    if (!isSupabaseConfigured || session?.role !== 'admin') {
      return
    }

    const [remoteUsers, adminSnapshot] = await Promise.all([
      getProfiles(),
      getCustomerAdminSnapshot(),
    ])
    setUsers(remoteUsers)
    setCustomerAdminData(adminSnapshot)
  }

  async function saveBlogPost(nextPost) {
    const normalizedPost = mergeBlogPosts([], [nextPost])[0]

    if (!isSupabaseConfigured || session?.role !== 'admin') {
      setBlogPosts((currentPosts) => mergeBlogPosts(currentPosts, [normalizedPost]))
      return normalizedPost
    }

    const savedPost = await upsertBlogPost(normalizedPost)
    setBlogPosts((currentPosts) => mergeBlogPosts(currentPosts, [savedPost]))
    return savedPost
  }

  async function removeManagedBlogPost(postId) {
    if (!isSupabaseConfigured || session?.role !== 'admin') {
      setBlogPosts((currentPosts) => currentPosts.filter((post) => post.id !== postId))
      return
    }

    await deleteBlogPost(postId)
    setBlogPosts((currentPosts) => currentPosts.filter((post) => post.id !== postId))
  }

  async function updateManagedUser(userId, patch) {
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

  async function uploadManagedMedia(file, bucket, folder = 'home') {
    if (!isSupabaseConfigured || session?.role !== 'admin') {
      return null
    }

    return uploadMediaAsset(file, bucket, folder)
  }

  async function uploadManagedMediaFromUrl(sourceUrl, bucket, folder = 'home') {
    if (!isSupabaseConfigured || session?.role !== 'admin') {
      return null
    }

    return uploadMediaAssetFromUrl(sourceUrl, bucket, folder)
  }

  function hasEntitlement(entitlementKey) {
    if (session?.role === 'admin') {
      return true
    }

    return entitlements.some((entitlement) => {
      if (entitlement.status !== 'active') {
        return false
      }

      if (entitlement.expiresAt && new Date(entitlement.expiresAt).getTime() < Date.now()) {
        return false
      }

      return entitlement.entitlementKey === entitlementKey
    })
  }

  function getProductByScope(scope) {
    return products.find((product) => product.accessScope === scope) || null
  }

  function getProductBySlug(productSlug) {
    return products.find((product) => product.slug === productSlug) || null
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

    if (product.productType === 'pack') {
      return `/library?focus=${encodeURIComponent(product.slug)}`
    }

    return `/library?focus=${encodeURIComponent(product.slug)}`
  }

  function getContentAccess(scope) {
    const product = getProductByScope(scope)
    const hasAllDigital = hasEntitlement('all_digital')
    const hasDirectAccess = hasEntitlement(scope)
    const unlocked = hasAllDigital || hasDirectAccess

    return {
      product,
      unlocked,
      includedBySubscription: !unlocked ? false : hasAllDigital && scope !== 'all_digital',
      requiresPurchase: !unlocked && scope !== 'all_digital',
    }
  }

  const allowedSubscriptionSlugs = new Set(
    (siteContent.creatorHome.subscriptionTable.plans || []).map(
      (plan) => `membership-${plan.slug}`,
    ),
  )
  const subscriptionProducts = (siteContent.creatorHome.subscriptionTable.plans || [])
    .map((plan) =>
      products.find(
        (product) =>
          product.slug === `membership-${plan.slug}` &&
          product.productType === 'subscription' &&
          product.accessScope === 'all_digital',
      ) || null,
    )
    .filter(Boolean)
    .filter((product) => allowedSubscriptionSlugs.has(product.slug))
  const subscriptionProduct = subscriptionProducts[0] || null

  function formatPriceFromAmount(amount = 0, currency = 'PEN') {
    return new Intl.NumberFormat('es-PE', {
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
      hasEntitlement,
      getContentAccess,
      getProductBySlug,
      getProductDestination,
      subscriptionProducts,
      subscriptionProduct,
      formatPriceFromAmount,
      refreshCommerceData,
      users,
      customerAdminData,
      setUsers,
      loginWithEmail,
      loginMemberWithEmail,
      signUpMemberWithEmail,
      createCheckoutSession,
      logout,
      refreshUsers,
      updateManagedUser,
      uploadManagedMedia,
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
      users,
      customerAdminData,
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
