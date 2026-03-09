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
  deleteBlogPost,
  fetchBlogPosts,
  fetchSiteContent,
  getCurrentSession,
  getProfiles,
  isSupabaseConfigured,
  listenToAuthChanges,
  signInWithPassword,
  signOut,
  updateProfile,
  upsertBlogPost,
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
const USERS_KEY = 'privatehw.users.v1'
const SESSION_KEY = 'privatehw.session.v1'

const AppStateContext = createContext(null)

export function AppProvider({ children }) {
  const [siteContent, setSiteContent] = useState(() =>
    mergeSiteContent(readStorageValue(SITE_CONTENT_KEY, defaultSiteContent)),
  )
  const [users, setUsers] = useState(() => readStorageValue(USERS_KEY, defaultUsers))
  const [blogPosts, setBlogPosts] = useState(() =>
    mergeBlogPosts(defaultBlogPosts, readStorageValue(BLOG_POSTS_KEY, defaultBlogPosts)),
  )
  const [session, setSession] = useState(() =>
    isSupabaseConfigured ? null : readStorageValue(SESSION_KEY, null),
  )
  const [isBootstrapping, setIsBootstrapping] = useState(true)

  useEffect(() => {
    writeStorageValue(SITE_CONTENT_KEY, siteContent)
  }, [siteContent])

  useEffect(() => {
    writeStorageValue(USERS_KEY, users)
  }, [users])

  useEffect(() => {
    writeStorageValue(BLOG_POSTS_KEY, blogPosts)
  }, [blogPosts])

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

        if (remoteSession?.role === 'admin') {
          const remoteUsers = await getProfiles()

          if (isMounted) {
            setUsers(remoteUsers)
          }
        }
      } catch {
        if (isMounted) {
          setSession(null)
          setUsers(defaultUsers)
          setBlogPosts(defaultBlogPosts)
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

      if (nextSession?.role === 'admin') {
        const remoteUsers = await getProfiles()
        setUsers(remoteUsers)
        return
      }

      setUsers(defaultUsers)
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

    const nextSession = await signInWithPassword(form)
    setSession(nextSession)

    return nextSession
  }

  async function logout() {
    if (isSupabaseConfigured) {
      await signOut()
    }

    setSession(null)
    setUsers(defaultUsers)
  }

  async function saveSiteContent(nextContent) {
    const normalizedContent = mergeSiteContent(nextContent)
    setSiteContent(normalizedContent)

    if (isSupabaseConfigured && session?.role === 'admin') {
      await upsertSiteContent(normalizedContent, session.id)
    }
  }

  async function refreshUsers() {
    if (!isSupabaseConfigured || session?.role !== 'admin') {
      return
    }

    const remoteUsers = await getProfiles()
    setUsers(remoteUsers)
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
      users,
      setUsers,
      loginWithEmail,
      logout,
      refreshUsers,
      updateManagedUser,
      uploadManagedMedia,
      uploadManagedMediaFromUrl,
    }),
    [isBootstrapping, session, siteContent, blogPosts, users],
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
