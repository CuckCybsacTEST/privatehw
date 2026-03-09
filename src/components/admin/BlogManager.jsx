import { useEffect, useMemo, useState } from 'react'
import { normalizeBlogPost } from '../../data/defaultBlogPosts'
import { useAppState } from '../../state/AppState'
import { RichTextEditor } from './RichTextEditor'

function emptyPost() {
  return normalizeBlogPost({
    id: `blog-post-${Date.now()}`,
    slug: `blog-post-${Date.now()}`,
    category: 'General',
    title: 'Nuevo post',
    excerpt: '',
    coverImage: '',
    status: 'draft',
    accessLevel: 'free',
    publishedAt: null,
    contentHtml: '<p></p>',
    mediaItems: [],
  })
}

function sortPosts(posts = []) {
  return [...posts].sort((a, b) => {
    const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0
    const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0
    return bTime - aTime
  })
}

export function BlogManager() {
  const { blogPosts, saveBlogPost, removeManagedBlogPost, uploadManagedMedia } = useAppState()
  const sortedPosts = useMemo(() => sortPosts(blogPosts), [blogPosts])
  const [selectedPostId, setSelectedPostId] = useState(sortedPosts[0]?.id || null)
  const [draft, setDraft] = useState(sortedPosts[0] || emptyPost())
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!sortedPosts.length) {
      const nextEmpty = emptyPost()
      setSelectedPostId(nextEmpty.id)
      setDraft(nextEmpty)
      return
    }

    const selected = sortedPosts.find((post) => post.id === selectedPostId) || sortedPosts[0]
    setSelectedPostId(selected.id)
    setDraft(selected)
  }, [selectedPostId, sortedPosts])

  function setDraftValue(key, value) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function updateMediaItem(index, patch) {
    setDraft((current) => ({
      ...current,
      mediaItems: current.mediaItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }))
  }

  function addMediaItem(type = 'link', url = '') {
    setDraft((current) => ({
      ...current,
      mediaItems: [
        ...current.mediaItems,
        { id: `media-${Date.now()}`, type, url, title: '', caption: '' },
      ],
    }))
  }

  function removeMediaItem(index) {
    setDraft((current) => ({
      ...current,
      mediaItems: current.mediaItems.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  async function handleUpload(event, mediaType) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const bucket = mediaType === 'image' ? 'blog-media' : mediaType === 'audio' ? 'blog-media' : 'blog-media'
    const folder = mediaType === 'image' ? 'images' : mediaType === 'audio' ? 'audio' : 'video'
    const uploaded = await uploadManagedMedia(file, bucket, `blog/${folder}`)

    if (uploaded?.publicUrl) {
      addMediaItem(mediaType, uploaded.publicUrl)
      setMessage('Media agregada al post.')
    }

    event.target.value = ''
  }

  async function handleCoverUpload(event) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const uploaded = await uploadManagedMedia(file, 'blog-media', 'blog/covers')
    if (uploaded?.publicUrl) {
      setDraftValue('coverImage', uploaded.publicUrl)
      setMessage('Portada actualizada.')
    }

    event.target.value = ''
  }

  async function handleSave() {
    const nextPost = {
      ...draft,
      slug: draft.slug.trim(),
      publishedAt:
        draft.status === 'published'
          ? draft.publishedAt || new Date().toISOString()
          : null,
    }

    const saved = await saveBlogPost(nextPost)
    setSelectedPostId(saved.id)
    setMessage('Post guardado correctamente.')
  }

  async function handleDelete() {
    if (!draft?.id) {
      return
    }

    await removeManagedBlogPost(draft.id)
    setMessage('Post eliminado.')
  }

  return (
    <section className="admin-editor-panel">
      <div className="admin-section-header">
        <div>
          <h3>CMS del blog</h3>
          <p className="admin-meta">
            Gestiona posts con texto enriquecido, media, enlaces externos y acceso gratis o por suscripcion.
          </p>
        </div>
        <button
          type="button"
          className="admin-secondary-button"
          onClick={() => {
            const nextPost = emptyPost()
            setSelectedPostId(nextPost.id)
            setDraft(nextPost)
          }}
        >
          Nuevo post
        </button>
      </div>

      <div className="admin-blog-layout">
        <aside className="admin-blog-sidebar">
          {sortedPosts.map((post) => (
            <button
              key={post.id}
              type="button"
              className={post.id === selectedPostId ? 'admin-blog-item active' : 'admin-blog-item'}
              onClick={() => setSelectedPostId(post.id)}
            >
              <strong>{post.title}</strong>
              <span>{post.status}</span>
            </button>
          ))}
        </aside>

        <div className="admin-blog-editor">
          <div className="admin-grid">
            <label className="admin-field">
              <span>Titulo</span>
              <input value={draft.title} onChange={(event) => setDraftValue('title', event.target.value)} />
            </label>
            <label className="admin-field">
              <span>Slug</span>
              <input value={draft.slug} onChange={(event) => setDraftValue('slug', event.target.value)} />
            </label>
            <label className="admin-field">
              <span>Categoria</span>
              <input value={draft.category} onChange={(event) => setDraftValue('category', event.target.value)} />
            </label>
            <label className="admin-field">
              <span>Estado</span>
              <select value={draft.status} onChange={(event) => setDraftValue('status', event.target.value)}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <label className="admin-field">
              <span>Acceso</span>
              <select value={draft.accessLevel} onChange={(event) => setDraftValue('accessLevel', event.target.value)}>
                <option value="free">Lectura gratuita</option>
                <option value="subscription">Requiere suscripcion</option>
              </select>
            </label>
            <label className="admin-field">
              <span>Imagen de portada</span>
              <input value={draft.coverImage} onChange={(event) => setDraftValue('coverImage', event.target.value)} />
            </label>
            <label className="admin-secondary-button">
              Subir portada
              <input type="file" accept="image/*" hidden onChange={handleCoverUpload} />
            </label>
            <label className="admin-field admin-field-full">
              <span>Extracto</span>
              <textarea rows={3} value={draft.excerpt} onChange={(event) => setDraftValue('excerpt', event.target.value)} />
            </label>
            <div className="admin-field admin-field-full">
              <span>Contenido enriquecido</span>
              <RichTextEditor value={draft.contentHtml} onChange={(value) => setDraftValue('contentHtml', value)} />
            </div>
          </div>

          <div className="admin-repeater">
            <div className="admin-section-header">
              <div>
                <h3>Media del post</h3>
                <p className="admin-meta">Sube imagenes, videos, audios o agrega enlaces externos como Google Drive.</p>
              </div>
              <div className="admin-actions-row">
                <label className="admin-secondary-button">
                  Subir imagen
                  <input type="file" accept="image/*" hidden onChange={(event) => handleUpload(event, 'image')} />
                </label>
                <label className="admin-secondary-button">
                  Subir video
                  <input type="file" accept="video/*" hidden onChange={(event) => handleUpload(event, 'video')} />
                </label>
                <label className="admin-secondary-button">
                  Subir audio
                  <input type="file" accept="audio/*" hidden onChange={(event) => handleUpload(event, 'audio')} />
                </label>
                <button type="button" className="admin-secondary-button" onClick={() => addMediaItem('link', '')}>
                  Agregar enlace externo
                </button>
              </div>
            </div>

            {draft.mediaItems.map((item, index) => (
              <div className="admin-array-card" key={item.id}>
                <label className="admin-field">
                  <span>Tipo</span>
                  <select value={item.type} onChange={(event) => updateMediaItem(index, { type: event.target.value })}>
                    <option value="image">Imagen</option>
                    <option value="video">Video</option>
                    <option value="audio">Audio</option>
                    <option value="link">Enlace externo</option>
                  </select>
                </label>
                <label className="admin-field">
                  <span>URL</span>
                  <input value={item.url} onChange={(event) => updateMediaItem(index, { url: event.target.value })} />
                </label>
                <label className="admin-field">
                  <span>Titulo</span>
                  <input value={item.title} onChange={(event) => updateMediaItem(index, { title: event.target.value })} />
                </label>
                <label className="admin-field">
                  <span>Caption</span>
                  <input value={item.caption} onChange={(event) => updateMediaItem(index, { caption: event.target.value })} />
                </label>
                <button type="button" className="admin-danger-button" onClick={() => removeMediaItem(index)}>
                  Eliminar media
                </button>
              </div>
            ))}
          </div>

          <div className="admin-actions-row">
            <button type="button" className="admin-primary-button" onClick={handleSave}>
              Guardar post
            </button>
            <button type="button" className="admin-danger-button" onClick={handleDelete}>
              Eliminar post
            </button>
            {message ? <p className="admin-success">{message}</p> : null}
          </div>
        </div>
      </div>
    </section>
  )
}
