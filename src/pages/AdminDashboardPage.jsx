import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BlogManager } from '../components/admin/BlogManager'
import { defaultSiteContent, mergeSiteContent } from '../data/defaultSiteContent'
import { useAppState } from '../state/AppState'
import { optimizeImageFile } from '../utils/imageOptimization'

function deepClone(value) {
  return JSON.parse(JSON.stringify(value))
}

function getByPath(source, path) {
  return path.reduce((current, key) => current?.[key], source)
}

function updateByPath(source, path, value) {
  const next = deepClone(source)
  let pointer = next

  for (let index = 0; index < path.length - 1; index += 1) {
    pointer = pointer[path[index]]
  }

  pointer[path[path.length - 1]] = value
  return next
}

function appendByPath(source, path, value) {
  const next = deepClone(source)
  const list = getByPath(next, path)
  list.push(value)
  return next
}

function removeByPath(source, path, indexToRemove) {
  const next = deepClone(source)
  const list = getByPath(next, path)
  list.splice(indexToRemove, 1)
  return next
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
    reader.readAsDataURL(file)
  })
}

function generateUserId() {
  return `user-${Math.random().toString(36).slice(2, 10)}`
}

function formatDateLabel(value) {
  if (!value) {
    return 'Sin fecha'
  }

  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function SectionPanel({ title, description, children }) {
  return (
    <section className="admin-editor-panel">
      <div className="admin-section-header">
        <div>
          <h3>{title}</h3>
          {description ? <p className="admin-meta">{description}</p> : null}
        </div>
      </div>
      <div className="admin-grid">{children}</div>
    </section>
  )
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <input type={type} value={value || ''} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function TextareaField({ label, value, onChange, rows = 4 }) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <textarea rows={rows} value={value || ''} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function ArrayTextareaField({ label, values, onChange, rows = 5 }) {
  const [textValue, setTextValue] = useState((values || []).join('\n'))

  useEffect(() => {
    setTextValue((values || []).join('\n'))
  }, [values])

  function commitValue(nextValue) {
    onChange(
      nextValue
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean),
    )
  }

  return (
    <label className="admin-field">
      <span>{label}</span>
      <textarea
        rows={rows}
        value={textValue}
        onChange={(event) => setTextValue(event.target.value)}
        onBlur={(event) => commitValue(event.target.value)}
      />
    </label>
  )
}

function MediaField({ accept, bucket, folder, label, note, onUpload, value }) {
  return (
    <div className="admin-upload-card">
      <div>
        <span className="admin-upload-title">{label}</span>
        {note ? <p>{note}</p> : null}
        {value ? (
          <a className="admin-media-link" href={value} target="_blank" rel="noopener noreferrer">
            Ver media actual
          </a>
        ) : null}
      </div>
      <input
        type="file"
        accept={accept}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (!file) {
            return
          }
          onUpload(file, bucket, folder)
          event.target.value = ''
        }}
      />
    </div>
  )
}

function ContentEditor() {
  const {
    isSupabaseConfigured,
    saveSiteContent,
    siteContent,
    uploadManagedMedia,
    uploadManagedMediaFromUrl,
  } = useAppState()
  const [draft, setDraft] = useState(() => mergeSiteContent(siteContent))
  const [message, setMessage] = useState('')
  const [uploadMessage, setUploadMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isMigratingAssets, setIsMigratingAssets] = useState(false)
  const [activeSection, setActiveSection] = useState('creator')

  useEffect(() => {
    setDraft(mergeSiteContent(siteContent))
  }, [siteContent])

  function setDraftValue(path, value) {
    setDraft((current) => updateByPath(current, path, value))
  }

  function addListItem(path, value) {
    setDraft((current) => appendByPath(current, path, value))
  }

  function removeListItem(path, index) {
    setDraft((current) => removeByPath(current, path, index))
  }

  async function uploadFile(file, bucket, folder) {
    if (file.type.startsWith('image/')) {
      const optimizedDataUrl = await optimizeImageFile(file)

      if (isSupabaseConfigured) {
        const optimizedBlob = await fetch(optimizedDataUrl).then((response) => response.blob())
        const uploadFile = new File([optimizedBlob], `${file.name}.jpg`, { type: 'image/jpeg' })
        const uploadedAsset = await uploadManagedMedia(uploadFile, bucket, folder)
        return uploadedAsset?.publicUrl || ''
      }

      return optimizedDataUrl
    }

    if (isSupabaseConfigured) {
      const uploadedAsset = await uploadManagedMedia(file, bucket, folder)
      return uploadedAsset?.publicUrl || ''
    }

    return readFileAsDataUrl(file)
  }

  async function handleUploadToPath(file, path, bucket, folder) {
    setUploadMessage('Subiendo media...')
    const uploadedUrl = await uploadFile(file, bucket, folder)
    setDraftValue(path, uploadedUrl)
    setUploadMessage('Media cargada y lista para guardar.')
  }

  async function handleSave(event) {
    event.preventDefault()
    setIsSaving(true)

    try {
      await saveSiteContent(draft)
      setMessage(isSupabaseConfigured ? 'Cambios guardados en Supabase.' : 'Cambios guardados en este navegador.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleReset() {
    const nextContent = mergeSiteContent(defaultSiteContent)
    await saveSiteContent(nextContent)
    setDraft(nextContent)
    setMessage('Contenido restablecido a los valores base.')
  }
  async function migrateImageList(imageList, targetField) {
    const migratedUrls = []

    for (const imageUrl of imageList) {
      if (/^https?:\/\//i.test(imageUrl)) {
        migratedUrls.push(imageUrl)
        continue
      }

      const uploadedAsset = await uploadManagedMediaFromUrl(imageUrl, 'site-images', targetField)
      migratedUrls.push(uploadedAsset.publicUrl)
    }

    return migratedUrls
  }

  async function handleMigrateBundledImages() {
    setIsMigratingAssets(true)
    setUploadMessage('Migrando imagenes locales a Supabase...')

    try {
      const migratedTop = await migrateImageList(draft.topCarouselImages, 'topCarouselImages')
      const migratedBottom = await migrateImageList(draft.bottomCarouselImages, 'bottomCarouselImages')
      const migratedHeroImage = /^https?:\/\//i.test(draft.accessTotal.heroImage)
        ? draft.accessTotal.heroImage
        : (await uploadManagedMediaFromUrl(draft.accessTotal.heroImage, 'site-images', 'accessTotal')).publicUrl

      const nextDraft = {
        ...draft,
        topCarouselImages: migratedTop,
        bottomCarouselImages: migratedBottom,
        accessTotal: {
          ...draft.accessTotal,
          heroImage: migratedHeroImage,
        },
      }

      setDraft(nextDraft)
      await saveSiteContent(nextDraft)
      setUploadMessage('Imagenes locales migradas a Supabase correctamente.')
    } finally {
      setIsMigratingAssets(false)
    }
  }

  const sectionButtons = [
    ['creator', 'Creator'],
    ['access', 'Acceso total'],
    ['spotlight', 'Spotlight'],
    ['videos', 'Videos'],
    ['collections', 'Packs'],
    ['free', 'Contenido Gratis'],
    ['membership', 'Membership'],
    ['blog', 'Blog'],
    ['encuentros', 'Encuentros'],
    ['global', 'Global'],
  ]

  return (
    <section className="admin-panel-section">
      <div className="admin-section-header">
        <div>
          <p className="admin-eyebrow">Contenido</p>
          <h2>Control total de la home</h2>
          <p className="admin-meta">
            Edita hero, media, videos, packs, membership, blog y /encuentros desde un mismo panel.
          </p>
        </div>
        <div className="admin-actions-row">
          <button type="button" className="admin-secondary-button" onClick={handleReset}>
            Restablecer base
          </button>
          {isSupabaseConfigured ? (
            <button type="button" className="admin-secondary-button" onClick={handleMigrateBundledImages} disabled={isMigratingAssets}>
              {isMigratingAssets ? 'Migrando imagenes...' : 'Migrar imagenes locales'}
            </button>
          ) : null}
        </div>
      </div>

      <div className="admin-subtabs">
        {sectionButtons.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={activeSection === key ? 'admin-tab active' : 'admin-tab'}
            onClick={() => setActiveSection(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <form className="admin-grid" onSubmit={handleSave}>
        {activeSection === 'creator' ? (
          <SectionPanel title="Hero principal" description="Gestiona la portada principal de la nueva home.">
            <Field label="Kicker" value={draft.creatorHome.kicker} onChange={(value) => setDraftValue(['creatorHome', 'kicker'], value)} />
            <Field label="Titulo" value={draft.creatorHome.title} onChange={(value) => setDraftValue(['creatorHome', 'title'], value)} />
            <TextareaField label="Descripcion" rows={5} value={draft.creatorHome.description} onChange={(value) => setDraftValue(['creatorHome', 'description'], value)} />
            <ArrayTextareaField label="Badges (una por linea)" rows={5} values={draft.creatorHome.badges} onChange={(value) => setDraftValue(['creatorHome', 'badges'], value)} />
            <Field label="CTA principal" value={draft.creatorHome.primaryCtaLabel} onChange={(value) => setDraftValue(['creatorHome', 'primaryCtaLabel'], value)} />
            <Field label="URL CTA principal" value={draft.creatorHome.primaryCtaUrl} onChange={(value) => setDraftValue(['creatorHome', 'primaryCtaUrl'], value)} />
            <Field label="CTA secundario" value={draft.creatorHome.secondaryCtaLabel} onChange={(value) => setDraftValue(['creatorHome', 'secondaryCtaLabel'], value)} />
            <div className="admin-repeater">
              <div className="admin-section-header">
                <div>
                  <h3>Stats</h3>
                  <p className="admin-meta">Tarjetas cortas del hero.</p>
                </div>
                <button type="button" className="admin-secondary-button" onClick={() => addListItem(['creatorHome', 'stats'], { value: '0', label: 'Nuevo stat' })}>
                  Agregar stat
                </button>
              </div>
              {draft.creatorHome.stats.map((stat, index) => (
                <div className="admin-array-card" key={`stat-${index}`}>
                  <Field label="Valor" value={stat.value} onChange={(value) => setDraftValue(['creatorHome', 'stats', index, 'value'], value)} />
                  <Field label="Label" value={stat.label} onChange={(value) => setDraftValue(['creatorHome', 'stats', index, 'label'], value)} />
                  <button type="button" className="admin-danger-button" onClick={() => removeListItem(['creatorHome', 'stats'], index)}>
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          </SectionPanel>
        ) : null}

        {activeSection === 'access' ? (
          <SectionPanel title="Acceso total" description="Gestiona la tabla de precios y el bloque visual del acceso total como componente independiente.">
            <Field label="Eyebrow" value={draft.accessTotal.eyebrow} onChange={(value) => setDraftValue(['accessTotal', 'eyebrow'], value)} />
            <Field label="Titulo tabla" value={draft.accessTotal.title} onChange={(value) => setDraftValue(['accessTotal', 'title'], value)} />
            <TextareaField label="Descripcion tabla" rows={4} value={draft.accessTotal.description} onChange={(value) => setDraftValue(['accessTotal', 'description'], value)} />
            <Field label="Texto acceso" value={draft.accessTotal.accessLabel} onChange={(value) => setDraftValue(['accessTotal', 'accessLabel'], value)} />
            <Field label="CTA tabla" value={draft.accessTotal.ctaLabel} onChange={(value) => setDraftValue(['accessTotal', 'ctaLabel'], value)} />
            <Field label="URL CTA tabla" value={draft.accessTotal.ctaUrl} onChange={(value) => setDraftValue(['accessTotal', 'ctaUrl'], value)} />
            <MediaField label="Imagen acceso total" note="Visual principal del bloque independiente de acceso total." accept="image/*" bucket="site-images" folder="access-total" value={draft.accessTotal.heroImage} onUpload={(file, bucket, folder) => handleUploadToPath(file, ['accessTotal', 'heroImage'], bucket, folder)} />
            <div className="admin-repeater">
              <div className="admin-section-header">
                <div>
                  <h3>Planes dinamicos</h3>
                  <p className="admin-meta">Cada plan controla precio, descuento y cuanto tiempo se suma al acceso total.</p>
                </div>
                <button
                  type="button"
                  className="admin-secondary-button"
                  onClick={() =>
                    addListItem(['accessTotal', 'plans'], {
                      slug: `plan-${Date.now()}`,
                      label: 'Nuevo plan',
                      period: '1 mes',
                      durationValue: '1',
                      durationUnit: 'months',
                      price: 'S/0',
                      discountPercent: '0',
                      discountLabel: 'Oferta activa',
                      promoNote: '',
                    })
                  }
                >
                  Agregar plan
                </button>
              </div>
              {draft.accessTotal.plans.map((plan, index) => (
                <div className="admin-array-card" key={plan.slug || `subscription-plan-${index}`}>
                  <Field label="Slug" value={plan.slug} onChange={(value) => setDraftValue(['accessTotal', 'plans', index, 'slug'], value)} />
                  <Field label="Label visible" value={plan.label} onChange={(value) => setDraftValue(['accessTotal', 'plans', index, 'label'], value)} />
                  <Field label="Periodo visible" value={plan.period} onChange={(value) => setDraftValue(['accessTotal', 'plans', index, 'period'], value)} />
                  <Field label="Duracion" value={plan.durationValue || plan.durationMonths} onChange={(value) => setDraftValue(['accessTotal', 'plans', index, 'durationValue'], value)} />
                  <label className="admin-field">
                    <span>Unidad</span>
                    <select value={plan.durationUnit || 'months'} onChange={(event) => setDraftValue(['accessTotal', 'plans', index, 'durationUnit'], event.target.value)}>
                      <option value="days">Dias</option>
                      <option value="months">Meses</option>
                    </select>
                  </label>
                  <Field label="Precio base" value={plan.price} onChange={(value) => setDraftValue(['accessTotal', 'plans', index, 'price'], value)} />
                  <Field label="Descuento (%)" value={plan.discountPercent} onChange={(value) => setDraftValue(['accessTotal', 'plans', index, 'discountPercent'], value)} />
                  <Field label="Label descuento" value={plan.discountLabel} onChange={(value) => setDraftValue(['accessTotal', 'plans', index, 'discountLabel'], value)} />
                  <TextareaField label="Nota promo" rows={3} value={plan.promoNote} onChange={(value) => setDraftValue(['accessTotal', 'plans', index, 'promoNote'], value)} />
                  <button
                    type="button"
                    className="admin-danger-button"
                    onClick={() => removeListItem(['accessTotal', 'plans'], index)}
                  >
                    Eliminar plan
                  </button>
                </div>
              ))}
            </div>
            <div className="admin-repeater">
              <div className="admin-section-header">
                <div>
                  <h3>Filas de la tabla</h3>
                  <p className="admin-meta">Cada fila muestra una capacidad o acceso desbloqueado.</p>
                </div>
                <button
                  type="button"
                  className="admin-secondary-button"
                  onClick={() =>
                    addListItem(['accessTotal', 'rows'], {
                      label: 'Nueva fila',
                      value: 'Incluido',
                    })
                  }
                >
                  Agregar fila
                </button>
              </div>
              {draft.accessTotal.rows.map((row, index) => (
                <div className="admin-array-card" key={`subscription-row-${index}`}>
                  <Field label="Concepto" value={row.label} onChange={(value) => setDraftValue(['accessTotal', 'rows', index, 'label'], value)} />
                  <Field label="Valor" value={row.value} onChange={(value) => setDraftValue(['accessTotal', 'rows', index, 'value'], value)} />
                  <button
                    type="button"
                    className="admin-danger-button"
                    onClick={() => removeListItem(['accessTotal', 'rows'], index)}
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          </SectionPanel>
        ) : null}

        {activeSection === 'spotlight' ? (
          <SectionPanel title="Media spotlight" description="Galeria editorial y bloque visual destacado.">
            <Field label="Titulo" value={draft.mediaSpotlight.title} onChange={(value) => setDraftValue(['mediaSpotlight', 'title'], value)} />
            <TextareaField label="Descripcion" rows={4} value={draft.mediaSpotlight.description} onChange={(value) => setDraftValue(['mediaSpotlight', 'description'], value)} />
            <Field label="Label destacado" value={draft.mediaSpotlight.featuredLabel} onChange={(value) => setDraftValue(['mediaSpotlight', 'featuredLabel'], value)} />
            <Field label="Titulo destacado" value={draft.mediaSpotlight.featuredTitle} onChange={(value) => setDraftValue(['mediaSpotlight', 'featuredTitle'], value)} />
            <TextareaField label="Descripcion destacada" rows={4} value={draft.mediaSpotlight.featuredDescription} onChange={(value) => setDraftValue(['mediaSpotlight', 'featuredDescription'], value)} />
            <MediaField label="Imagen destacada" note="Imagen grande del spotlight." accept="image/*" bucket="site-images" folder="spotlight" value={draft.mediaSpotlight.featuredImage} onUpload={(file, bucket, folder) => handleUploadToPath(file, ['mediaSpotlight', 'featuredImage'], bucket, folder)} />
            <div className="admin-repeater">
              <div className="admin-section-header">
                <div><h3>Mini galeria</h3><p className="admin-meta">Cards secundarias del spotlight.</p></div>
                <button type="button" className="admin-secondary-button" onClick={() => addListItem(['mediaSpotlight', 'gallery'], { image: '', title: 'Nueva card', description: 'Descripcion' })}>Agregar card</button>
              </div>
              {draft.mediaSpotlight.gallery.map((item, index) => (
                <div className="admin-array-card" key={`gallery-${index}`}>
                  <Field label="Titulo" value={item.title} onChange={(value) => setDraftValue(['mediaSpotlight', 'gallery', index, 'title'], value)} />
                  <TextareaField label="Descripcion" rows={3} value={item.description} onChange={(value) => setDraftValue(['mediaSpotlight', 'gallery', index, 'description'], value)} />
                  <Field label="URL imagen" value={item.image} onChange={(value) => setDraftValue(['mediaSpotlight', 'gallery', index, 'image'], value)} />
                  <MediaField label="Subir imagen" accept="image/*" bucket="site-images" folder="spotlight-gallery" value={item.image} onUpload={(file, bucket, folder) => handleUploadToPath(file, ['mediaSpotlight', 'gallery', index, 'image'], bucket, folder)} />
                  <button type="button" className="admin-danger-button" onClick={() => removeListItem(['mediaSpotlight', 'gallery'], index)}>Eliminar</button>
                </div>
              ))}
            </div>
          </SectionPanel>
        ) : null}
        {activeSection === 'videos' ? (
          <SectionPanel title="Videos individuales" description="Controla cards, previews y video completo.">
            <Field label="Titulo de seccion" value={draft.videoLibrary.title} onChange={(value) => setDraftValue(['videoLibrary', 'title'], value)} />
            <TextareaField label="Descripcion de seccion" rows={4} value={draft.videoLibrary.description} onChange={(value) => setDraftValue(['videoLibrary', 'description'], value)} />
            <Field label="CTA ver mas" value={draft.videoLibrary.browseLabel} onChange={(value) => setDraftValue(['videoLibrary', 'browseLabel'], value)} />
            <Field label="Ruta CTA ver mas" value={draft.videoLibrary.browseHref} onChange={(value) => setDraftValue(['videoLibrary', 'browseHref'], value)} />
            <div className="admin-repeater">
              <div className="admin-section-header">
                <div>
                  <h3>Catalogo de videos</h3>
                  <p className="admin-meta">Cada item puede tener poster, preview y video completo. Puedes agregar tantos videos como necesites.</p>
                </div>
                <button type="button" className="admin-secondary-button" onClick={() => addListItem(['videoLibrary', 'items'], { slug: `video-${Date.now()}`, title: 'Nuevo video', description: 'Descripcion', tag: 'Nuevo', duration: '00:00', priceLabel: 'S/0', accessLabel: 'Acceso', previewLabel: 'Preview', posterImage: '', previewVideoUrl: '', fullVideoUrl: '', purchaseUrl: '' })}>
                  Agregar video
                </button>
              </div>
              <p className="admin-meta">{draft.videoLibrary.items.length} video(s) cargados actualmente.</p>
              {draft.videoLibrary.items.map((item, index) => (
                <div className="admin-array-card" key={item.slug || `video-${index}`}>
                  <Field label="Slug" value={item.slug} onChange={(value) => setDraftValue(['videoLibrary', 'items', index, 'slug'], value)} />
                  <Field label="Titulo" value={item.title} onChange={(value) => setDraftValue(['videoLibrary', 'items', index, 'title'], value)} />
                  <TextareaField label="Descripcion" rows={3} value={item.description} onChange={(value) => setDraftValue(['videoLibrary', 'items', index, 'description'], value)} />
                  <Field label="Tag" value={item.tag} onChange={(value) => setDraftValue(['videoLibrary', 'items', index, 'tag'], value)} />
                  <Field label="Duracion" value={item.duration} onChange={(value) => setDraftValue(['videoLibrary', 'items', index, 'duration'], value)} />
                  <Field label="Precio" value={item.priceLabel} onChange={(value) => setDraftValue(['videoLibrary', 'items', index, 'priceLabel'], value)} />
                  <Field label="Texto acceso" value={item.accessLabel} onChange={(value) => setDraftValue(['videoLibrary', 'items', index, 'accessLabel'], value)} />
                  <Field label="URL compra" value={item.purchaseUrl} onChange={(value) => setDraftValue(['videoLibrary', 'items', index, 'purchaseUrl'], value)} />
                  <MediaField label="Poster" accept="image/*" bucket="site-images" folder="video-posters" value={item.posterImage} onUpload={(file, bucket, folder) => handleUploadToPath(file, ['videoLibrary', 'items', index, 'posterImage'], bucket, folder)} />
                  <MediaField label="Preview video" accept="video/*" bucket="site-videos" folder="video-previews" value={item.previewVideoUrl} onUpload={(file, bucket, folder) => handleUploadToPath(file, ['videoLibrary', 'items', index, 'previewVideoUrl'], bucket, folder)} />
                  <MediaField label="Video completo" accept="video/*" bucket="site-videos" folder="video-full" value={item.fullVideoUrl} onUpload={(file, bucket, folder) => handleUploadToPath(file, ['videoLibrary', 'items', index, 'fullVideoUrl'], bucket, folder)} />
                  <button type="button" className="admin-danger-button" onClick={() => removeListItem(['videoLibrary', 'items'], index)}>Eliminar</button>
                </div>
              ))}
            </div>
          </SectionPanel>
        ) : null}

        {activeSection === 'collections' ? (
          <>
            <SectionPanel title="Packs y colecciones" description="Gestion total de bundles de videos por categoria.">
              <Field label="Titulo de seccion" value={draft.videoCollections.title} onChange={(value) => setDraftValue(['videoCollections', 'title'], value)} />
              <TextareaField label="Descripcion de seccion" rows={4} value={draft.videoCollections.description} onChange={(value) => setDraftValue(['videoCollections', 'description'], value)} />
              <Field label="CTA ver mas" value={draft.videoCollections.browseLabel} onChange={(value) => setDraftValue(['videoCollections', 'browseLabel'], value)} />
              <Field label="Ruta CTA ver mas" value={draft.videoCollections.browseHref} onChange={(value) => setDraftValue(['videoCollections', 'browseHref'], value)} />
              <div className="admin-repeater">
                <div className="admin-section-header">
                  <div>
                    <h3>Packs</h3>
                    <p className="admin-meta">Cada pack puede venderse por separado.</p>
                  </div>
                  <button type="button" className="admin-secondary-button" onClick={() => addListItem(['videoCollections', 'items'], { slug: `pack-${Date.now()}`, category: 'Nueva categoria', title: 'Nuevo pack', description: 'Descripcion del pack', itemCount: '0 videos', priceLabel: 'S/0', accessLabel: 'Acceso', highlights: ['Nuevo highlight'], coverImage: '', previewUrl: '', purchaseUrl: '' })}>
                    Agregar pack
                  </button>
                </div>
                {draft.videoCollections.items.map((item, index) => (
                  <div className="admin-array-card" key={item.slug || `pack-${index}`}>
                    <Field label="Slug" value={item.slug} onChange={(value) => setDraftValue(['videoCollections', 'items', index, 'slug'], value)} />
                    <Field label="Categoria" value={item.category} onChange={(value) => setDraftValue(['videoCollections', 'items', index, 'category'], value)} />
                    <Field label="Titulo" value={item.title} onChange={(value) => setDraftValue(['videoCollections', 'items', index, 'title'], value)} />
                    <TextareaField label="Descripcion" rows={3} value={item.description} onChange={(value) => setDraftValue(['videoCollections', 'items', index, 'description'], value)} />
                    <Field label="Cantidad" value={item.itemCount} onChange={(value) => setDraftValue(['videoCollections', 'items', index, 'itemCount'], value)} />
                    <Field label="Precio" value={item.priceLabel} onChange={(value) => setDraftValue(['videoCollections', 'items', index, 'priceLabel'], value)} />
                    <Field label="Texto acceso" value={item.accessLabel} onChange={(value) => setDraftValue(['videoCollections', 'items', index, 'accessLabel'], value)} />
                    <ArrayTextareaField label="Highlights" rows={4} values={item.highlights} onChange={(value) => setDraftValue(['videoCollections', 'items', index, 'highlights'], value)} />
                    <Field label="URL preview" value={item.previewUrl} onChange={(value) => setDraftValue(['videoCollections', 'items', index, 'previewUrl'], value)} />
                    <Field label="URL compra" value={item.purchaseUrl} onChange={(value) => setDraftValue(['videoCollections', 'items', index, 'purchaseUrl'], value)} />
                    <MediaField label="Cover image" accept="image/*" bucket="site-images" folder="video-collections" value={item.coverImage} onUpload={(file, bucket, folder) => handleUploadToPath(file, ['videoCollections', 'items', index, 'coverImage'], bucket, folder)} />
                    <MediaField label="Preview del pack" accept="video/*" bucket="site-videos" folder="collection-previews" value={item.previewUrl} onUpload={(file, bucket, folder) => handleUploadToPath(file, ['videoCollections', 'items', index, 'previewUrl'], bucket, folder)} />
                    <button type="button" className="admin-danger-button" onClick={() => removeListItem(['videoCollections', 'items'], index)}>Eliminar</button>
                  </div>
                ))}
              </div>
            </SectionPanel>
            <SectionPanel title="Productos fisicos" description="Controla el bloque comercial que acompana a packs y categorias.">
              <Field label="Kicker" value={draft.physicalMerch.kicker} onChange={(value) => setDraftValue(['physicalMerch', 'kicker'], value)} />
              <Field label="Titulo" value={draft.physicalMerch.title} onChange={(value) => setDraftValue(['physicalMerch', 'title'], value)} />
              <TextareaField label="Descripcion" rows={4} value={draft.physicalMerch.description} onChange={(value) => setDraftValue(['physicalMerch', 'description'], value)} />
              <Field label="CTA principal" value={draft.physicalMerch.primaryLabel} onChange={(value) => setDraftValue(['physicalMerch', 'primaryLabel'], value)} />
              <Field label="URL CTA principal" value={draft.physicalMerch.primaryUrl} onChange={(value) => setDraftValue(['physicalMerch', 'primaryUrl'], value)} />
              <Field label="Nota inferior" value={draft.physicalMerch.note} onChange={(value) => setDraftValue(['physicalMerch', 'note'], value)} />
              <div className="admin-repeater">
                <div className="admin-section-header">
                  <div>
                    <h3>Items fisicos</h3>
                    <p className="admin-meta">Productos visibles en la columna comercial de la home.</p>
                  </div>
                  <button type="button" className="admin-secondary-button" onClick={() => addListItem(['physicalMerch', 'items'], { slug: `physical-item-${Date.now()}`, title: 'Nuevo item', subtitle: 'Subtitulo', priceLabel: 'S/0', stockLabel: '1 unidad', image: '', purchaseUrl: '' })}>
                    Agregar item
                  </button>
                </div>
                {draft.physicalMerch.items.map((item, index) => (
                  <div className="admin-array-card" key={item.slug || `physical-item-${index}`}>
                    <Field label="Slug" value={item.slug} onChange={(value) => setDraftValue(['physicalMerch', 'items', index, 'slug'], value)} />
                    <Field label="Titulo" value={item.title} onChange={(value) => setDraftValue(['physicalMerch', 'items', index, 'title'], value)} />
                    <Field label="Subtitulo" value={item.subtitle} onChange={(value) => setDraftValue(['physicalMerch', 'items', index, 'subtitle'], value)} />
                    <Field label="Precio" value={item.priceLabel} onChange={(value) => setDraftValue(['physicalMerch', 'items', index, 'priceLabel'], value)} />
                    <Field label="Stock" value={item.stockLabel} onChange={(value) => setDraftValue(['physicalMerch', 'items', index, 'stockLabel'], value)} />
                    <Field label="URL compra" value={item.purchaseUrl} onChange={(value) => setDraftValue(['physicalMerch', 'items', index, 'purchaseUrl'], value)} />
                    <Field label="URL imagen" value={item.image} onChange={(value) => setDraftValue(['physicalMerch', 'items', index, 'image'], value)} />
                    <MediaField label="Subir imagen" accept="image/*" bucket="site-images" folder="physical-merch" value={item.image} onUpload={(file, bucket, folder) => handleUploadToPath(file, ['physicalMerch', 'items', index, 'image'], bucket, folder)} />
                    <button type="button" className="admin-danger-button" onClick={() => removeListItem(['physicalMerch', 'items'], index)}>Eliminar</button>
                  </div>
                ))}
              </div>
            </SectionPanel>
          </>
        ) : null}

        {activeSection === 'membership' ? (
          <SectionPanel title="Membership" description="Controla beneficios, plan principal y cards secundarias.">
            <Field label="Titulo" value={draft.membership.title} onChange={(value) => setDraftValue(['membership', 'title'], value)} />
            <TextareaField label="Descripcion" rows={4} value={draft.membership.description} onChange={(value) => setDraftValue(['membership', 'description'], value)} />
            <Field label="Label plan" value={draft.membership.planLabel} onChange={(value) => setDraftValue(['membership', 'planLabel'], value)} />
            <Field label="Titulo plan" value={draft.membership.planTitle} onChange={(value) => setDraftValue(['membership', 'planTitle'], value)} />
            <TextareaField label="Descripcion plan" rows={4} value={draft.membership.planDescription} onChange={(value) => setDraftValue(['membership', 'planDescription'], value)} />
            <ArrayTextareaField label="Items del plan" rows={5} values={draft.membership.planItems} onChange={(value) => setDraftValue(['membership', 'planItems'], value)} />
            <Field label="URL plan" value={draft.membership.planUrl} onChange={(value) => setDraftValue(['membership', 'planUrl'], value)} />
            <Field label="CTA plan" value={draft.membership.planCta} onChange={(value) => setDraftValue(['membership', 'planCta'], value)} />
            <div className="admin-repeater">
              <div className="admin-section-header">
                <div><h3>Cards secundarias</h3></div>
                <button type="button" className="admin-secondary-button" onClick={() => addListItem(['membership', 'sideCards'], { label: 'Nuevo bloque', title: 'Nuevo titulo', description: 'Descripcion' })}>Agregar card</button>
              </div>
              {draft.membership.sideCards.map((card, index) => (
                <div className="admin-array-card" key={`membership-card-${index}`}>
                  <Field label="Label" value={card.label} onChange={(value) => setDraftValue(['membership', 'sideCards', index, 'label'], value)} />
                  <Field label="Titulo" value={card.title} onChange={(value) => setDraftValue(['membership', 'sideCards', index, 'title'], value)} />
                  <TextareaField label="Descripcion" rows={3} value={card.description} onChange={(value) => setDraftValue(['membership', 'sideCards', index, 'description'], value)} />
                  <button type="button" className="admin-danger-button" onClick={() => removeListItem(['membership', 'sideCards'], index)}>Eliminar</button>
                </div>
              ))}
            </div>
          </SectionPanel>
        ) : null}
        {activeSection === 'free' ? (
          <SectionPanel title="Contenido Gratis" description="Gestiona la galeria gratuita para usuarios registrados con fotos, videos y placeholders editables.">
            <Field label="Kicker" value={draft.freeContent.kicker} onChange={(value) => setDraftValue(['freeContent', 'kicker'], value)} />
            <Field label="Titulo" value={draft.freeContent.title} onChange={(value) => setDraftValue(['freeContent', 'title'], value)} />
            <TextareaField label="Descripcion" rows={4} value={draft.freeContent.description} onChange={(value) => setDraftValue(['freeContent', 'description'], value)} />
            <TextareaField label="Nota de acceso" rows={3} value={draft.freeContent.accessNote} onChange={(value) => setDraftValue(['freeContent', 'accessNote'], value)} />
            <div className="admin-repeater">
              <div className="admin-section-header">
                <div>
                  <h3>Items gratis</h3>
                  <p className="admin-meta">Sube fotos o videos, define tipo de media y publica solo lo que quieras mostrar.</p>
                </div>
                <button
                  type="button"
                  className="admin-secondary-button"
                  onClick={() =>
                    addListItem(['freeContent', 'items'], {
                      slug: `free-media-${Date.now()}`,
                      title: 'Media Asset Placeholder',
                      description: 'Descripcion neutral del contenido gratis.',
                      category: 'Foto',
                      mediaType: 'image',
                      image: '',
                      thumbnail: '',
                      mediaUrl: '',
                      isPublished: true,
                    })
                  }
                >
                  Agregar item
                </button>
              </div>
              {draft.freeContent.items.map((item, index) => (
                <div className="admin-array-card" key={item.slug || `free-item-${index}`}>
                  <Field label="Slug" value={item.slug} onChange={(value) => setDraftValue(['freeContent', 'items', index, 'slug'], value)} />
                  <Field label="Titulo" value={item.title} onChange={(value) => setDraftValue(['freeContent', 'items', index, 'title'], value)} />
                  <TextareaField label="Descripcion" rows={3} value={item.description} onChange={(value) => setDraftValue(['freeContent', 'items', index, 'description'], value)} />
                  <Field label="Categoria" value={item.category} onChange={(value) => setDraftValue(['freeContent', 'items', index, 'category'], value)} />
                  <label className="admin-field">
                    <span>Tipo de media</span>
                    <select value={item.mediaType || 'image'} onChange={(event) => setDraftValue(['freeContent', 'items', index, 'mediaType'], event.target.value)}>
                      <option value="image">Foto</option>
                      <option value="video">Video</option>
                    </select>
                  </label>
                  <Field label="URL imagen" value={item.image} onChange={(value) => setDraftValue(['freeContent', 'items', index, 'image'], value)} />
                  <Field label="URL thumbnail" value={item.thumbnail} onChange={(value) => setDraftValue(['freeContent', 'items', index, 'thumbnail'], value)} />
                  <Field label="URL media" value={item.mediaUrl} onChange={(value) => setDraftValue(['freeContent', 'items', index, 'mediaUrl'], value)} />
                  <MediaField label="Subir imagen / thumbnail" accept="image/*" bucket="site-images" folder="free-content" value={item.thumbnail || item.image} onUpload={(file, bucket, folder) => handleUploadToPath(file, ['freeContent', 'items', index, 'thumbnail'], bucket, folder)} />
                  <MediaField label="Subir video" accept="video/*" bucket="site-videos" folder="free-content" value={item.mediaUrl} onUpload={(file, bucket, folder) => handleUploadToPath(file, ['freeContent', 'items', index, 'mediaUrl'], bucket, folder)} />
                  <label className="admin-toggle-row">
                    <span>Publicado</span>
                    <input type="checkbox" checked={item.isPublished !== false} onChange={(event) => setDraftValue(['freeContent', 'items', index, 'isPublished'], event.target.checked)} />
                  </label>
                  <button type="button" className="admin-danger-button" onClick={() => removeListItem(['freeContent', 'items'], index)}>Eliminar</button>
                </div>
              ))}
            </div>
          </SectionPanel>
        ) : null}
        {activeSection === 'blog' ? (
          <>
            <SectionPanel title="Blog teaser" description="Gestiona el bloque teaser del blog en la home.">
              <Field label="Titulo" value={draft.blogSection.title} onChange={(value) => setDraftValue(['blogSection', 'title'], value)} />
              <TextareaField label="Descripcion" rows={4} value={draft.blogSection.description} onChange={(value) => setDraftValue(['blogSection', 'description'], value)} />
            </SectionPanel>
            <BlogManager />
          </>
        ) : null}

        {activeSection === 'encuentros' ? (
          <SectionPanel title="Landing /encuentros" description="Gestiona la landing separada de encuentros.">
            <Field label="Top bar desktop highlight" value={draft.topBarDesktopHighlight} onChange={(value) => setDraftValue(['topBarDesktopHighlight'], value)} />
            <Field label="Top bar mobile" value={draft.topBarMobile} onChange={(value) => setDraftValue(['topBarMobile'], value)} />
            <Field label="Hero title" value={draft.heroTitle} onChange={(value) => setDraftValue(['heroTitle'], value)} />
            <TextareaField label="Hero description" rows={4} value={draft.heroDescription} onChange={(value) => setDraftValue(['heroDescription'], value)} />
            <Field label="Hero subtitle" value={draft.heroSubtitle} onChange={(value) => setDraftValue(['heroSubtitle'], value)} />
            <Field label="Precio presencial" value={draft.presencialPrice} onChange={(value) => setDraftValue(['presencialPrice'], value)} />
            <TextareaField label="Descripcion presencial" rows={4} value={draft.presencialDescription} onChange={(value) => setDraftValue(['presencialDescription'], value)} />
            <ArrayTextareaField label="Lista aviso importante" rows={6} values={draft.importantItems} onChange={(value) => setDraftValue(['importantItems'], value)} />
            <ArrayTextareaField label="Lista servicios adicionales" rows={5} values={draft.extraItems} onChange={(value) => setDraftValue(['extraItems'], value)} />
            <Field label="Descripcion Loverfans" value={draft.fanCardDescription} onChange={(value) => setDraftValue(['fanCardDescription'], value)} />
            <MediaField label="Carrusel superior" note="Sube una imagen por vez; luego puedes seguir ajustando URLs abajo." accept="image/*" bucket="site-images" folder="encuentros-top" value={draft.topCarouselImages[0]} onUpload={async (file, bucket, folder) => { const uploaded = await uploadFile(file, bucket, folder); setDraftValue(['topCarouselImages'], [...draft.topCarouselImages, uploaded]); setUploadMessage('Imagen agregada al carrusel superior.') }} />
            <MediaField label="Carrusel inferior" accept="image/*" bucket="site-images" folder="encuentros-bottom" value={draft.bottomCarouselImages[0]} onUpload={async (file, bucket, folder) => { const uploaded = await uploadFile(file, bucket, folder); setDraftValue(['bottomCarouselImages'], [...draft.bottomCarouselImages, uploaded]); setUploadMessage('Imagen agregada al carrusel inferior.') }} />
            <ArrayTextareaField label="URLs carrusel superior" rows={6} values={draft.topCarouselImages} onChange={(value) => setDraftValue(['topCarouselImages'], value)} />
            <ArrayTextareaField label="URLs carrusel inferior" rows={6} values={draft.bottomCarouselImages} onChange={(value) => setDraftValue(['bottomCarouselImages'], value)} />
          </SectionPanel>
        ) : null}

        {activeSection === 'global' ? (
          <SectionPanel title="Enlaces y footer" description="Configura URLs globales y textos transversales.">
            <Field label="URL WhatsApp" value={draft.whatsappUrl} onChange={(value) => setDraftValue(['whatsappUrl'], value)} />
            <Field label="URL Loverfans" value={draft.fanButtonUrl} onChange={(value) => setDraftValue(['fanButtonUrl'], value)} />
            <Field label="URL Telegram" value={draft.socialUrl} onChange={(value) => setDraftValue(['socialUrl'], value)} />
            <TextareaField label="Footer encuentros" rows={3} value={draft.footerText} onChange={(value) => setDraftValue(['footerText'], value)} />
            <Field label="Footer home title" value={draft.siteFooter.title} onChange={(value) => setDraftValue(['siteFooter', 'title'], value)} />
            <TextareaField label="Footer home description" rows={4} value={draft.siteFooter.description} onChange={(value) => setDraftValue(['siteFooter', 'description'], value)} />
            <div className="admin-repeater">
              <div className="admin-section-header">
                <div>
                  <h3>Visibilidad de secciones</h3>
                  <p className="admin-meta">Activa o desactiva bloques de la UI sin tocar codigo.</p>
                </div>
              </div>
              {[
                ['creatorHero', 'Home: Hero principal'],
                ['accessTotal', 'Home: Acceso total'],
                ['mediaSpotlight', 'Home: Media spotlight'],
                ['videoLibrary', 'Home: Videos individuales'],
                ['videoCollections', 'Home: Packs y colecciones'],
                ['physicalMerch', 'Home: Productos fisicos'],
                ['membership', 'Home: Membership'],
                ['blogTeaser', 'Home: Blog teaser'],
                ['siteFooter', 'Home: Footer'],
                ['encuentrosHero', '/encuentros: Hero'],
                ['encuentrosTopCarousel', '/encuentros: Carrusel superior'],
                ['encuentrosBottomCarousel', '/encuentros: Carrusel inferior'],
                ['encuentrosImportant', '/encuentros: Aviso importante'],
                ['encuentrosPricing', '/encuentros: Precios y servicios'],
                ['encuentrosLoverfans', '/encuentros: Bloque Loverfans'],
                ['encuentrosSocial', '/encuentros: Social'],
              ].map(([key, label]) => (
                <label className="admin-toggle-row" key={key}>
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(draft.sectionVisibility?.[key])}
                    onChange={(event) =>
                      setDraftValue(['sectionVisibility', key], event.target.checked)
                    }
                  />
                </label>
              ))}
            </div>
          </SectionPanel>
        ) : null}

        <div className="admin-submit-row">
          <button className="admin-primary-button" type="submit">{isSaving ? 'Guardando...' : 'Guardar cambios'}</button>
          {message ? <p className="admin-success">{message}</p> : null}
          {uploadMessage ? <p className="admin-success">{uploadMessage}</p> : null}
        </div>
      </form>
    </section>
  )
}

function UsersEditor() {
  const {
    customerAdminData,
    formatPriceFromAmount,
    isSupabaseConfigured,
    refreshUsers,
    updateManagedUser,
    users,
  } = useAppState()
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'public', status: 'active' })
  const activeAdmins = useMemo(() => users.filter((user) => user.role === 'admin' && user.status === 'active'), [users])
  const [searchTerm, setSearchTerm] = useState('')
  const [roleDrafts, setRoleDrafts] = useState({})

  useEffect(() => {
    setRoleDrafts(Object.fromEntries(users.map((user) => [user.id, user.role || 'public'])))
  }, [users])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleAddUser(event) {
    event.preventDefault()
    if (isSupabaseConfigured) return
    updateManagedUser(generateUserId(), form)
    setForm({ name: '', email: '', password: '', role: 'public', status: 'active' })
  }

  async function handleToggleStatus(user) {
    await updateManagedUser(user.id, { status: user.status === 'active' ? 'disabled' : 'active' })
  }

  async function handleRoleSave(user) {
    await updateManagedUser(user.id, { role: roleDrafts[user.id] || user.role })
  }

  const visibleCustomers = useMemo(() => {
    const source = isSupabaseConfigured ? customerAdminData : users
    const needle = searchTerm.trim().toLowerCase()

    if (!needle) {
      return source
    }

    return source.filter((user) =>
      [user.name, user.email, user.role, user.status]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(needle)),
    )
  }, [customerAdminData, isSupabaseConfigured, searchTerm, users])

  return (
    <section className="admin-panel-section">
      <div className="admin-section-header">
        <div><p className="admin-eyebrow">Usuarios</p><h2>Gestion de accesos</h2></div>
        <p className="admin-meta">{users.length} usuario(s) registrados, {activeAdmins.length} admin(s) activos</p>
      </div>
      <div className="admin-users-layout">
        <form className="admin-form admin-form-card" onSubmit={handleAddUser}>
          <label className="admin-field"><span>Nombre</span><input name="name" value={form.name} onChange={handleChange} required /></label>
          <label className="admin-field"><span>Correo</span><input type="email" name="email" value={form.email} onChange={handleChange} required /></label>
          <label className="admin-field"><span>Clave</span><input name="password" value={form.password} onChange={handleChange} required /></label>
          <label className="admin-field"><span>Rol</span><select name="role" value={form.role} onChange={handleChange}><option value="public">Publico</option><option value="admin">Admin</option></select></label>
          {isSupabaseConfigured ? <div className="admin-hint"><p>Con Supabase activo, crea usuarios en Authentication / Users.</p><p className="admin-note">Luego puedes volver aqui para cambiar rol o estado del perfil.</p><button type="button" className="admin-secondary-button" onClick={refreshUsers}>Recargar usuarios</button></div> : <button className="admin-primary-button" type="submit">Crear usuario</button>}
        </form>
        <div className="admin-users-list">
          <label className="admin-field">
            <span>Buscar cliente</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Correo, nombre, rol o estado"
            />
          </label>
          {visibleCustomers.map((user) => (
            <article className="admin-user-card" key={user.id}>
              <div className="admin-user-copy">
                <h3>{user.name}</h3>
                <p>{user.email}</p>
                <p>Rol: <strong>{user.role}</strong> · Estado: <strong>{user.status}</strong></p>
                {isSupabaseConfigured ? (
                  <>
                    <div className="admin-user-metrics">
                      <span>Ordenes: <strong>{user.orderCount || 0}</strong></span>
                      <span>Pagadas: <strong>{user.paidOrderCount || 0}</strong></span>
                      <span>Gasto total: <strong>{formatPriceFromAmount(user.totalSpentAmount || 0, 'PEN')}</strong></span>
                    </div>
                    <p className="admin-note">
                      Stripe customer: {user.stripeCustomerId || 'No asignado'} · Alta: {formatDateLabel(user.createdAt)}
                    </p>
                    <p className="admin-note">
                      Ultima orden: {formatDateLabel(user.latestOrderAt)}
                    </p>
                    <div className="admin-entitlement-chips">
                      {(user.entitlements || []).length ? (
                        user.entitlements
                          .filter((entry) => entry.status === 'active')
                          .slice(0, 6)
                          .map((entry) => (
                            <span className="admin-chip" key={entry.id}>
                              {entry.entitlementKey}
                            </span>
                          ))
                      ) : (
                        <span className="admin-chip muted">Sin accesos activos</span>
                      )}
                    </div>
                    {(user.orders || []).length ? (
                      <div className="admin-user-orders">
                        {user.orders.slice(0, 3).map((order) => (
                          <div className="admin-user-order" key={order.id}>
                            <div>
                              <strong>{order.providerOrderId || order.id}</strong>
                              <span>{formatDateLabel(order.createdAt)}</span>
                            </div>
                            <div>
                              <strong>{formatPriceFromAmount(order.totalAmount, order.currency)}</strong>
                              <span>{order.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
              <div className="admin-actions-row">
                <select className="admin-inline-select" value={roleDrafts[user.id] || user.role} onChange={(event) => setRoleDrafts((current) => ({ ...current, [user.id]: event.target.value }))}><option value="public">Publico</option><option value="admin">Admin</option></select>
                <button type="button" className="admin-secondary-button" onClick={() => handleRoleSave(user)}>Guardar rol</button>
                <button type="button" className="admin-secondary-button" onClick={() => handleToggleStatus(user)}>{user.status === 'active' ? 'Desactivar' : 'Activar'}</button>
                {isSupabaseConfigured ? null : <button type="button" className="admin-danger-button" onClick={() => updateManagedUser(user.id, { _delete: true })}>Eliminar</button>}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function PhysicalOrdersEditor() {
  const { physicalOrders, updatePhysicalOrder } = useAppState()

  return (
    <section className="admin-panel-section">
      <div className="admin-section-header">
        <div>
          <p className="admin-eyebrow">Pedidos fisicos</p>
          <h2>Gestion de envios manuales</h2>
          <p className="admin-meta">
            Revisa destino, carrier, tracking y estado de fulfillment de cada pedido.
          </p>
        </div>
      </div>
      <div className="admin-users-list">
        {physicalOrders.length ? (
          physicalOrders.map((order) => (
            <article className="admin-user-card" key={order.id}>
              <div className="admin-user-copy">
                <h3>{order.productTitle}</h3>
                <p>{order.userEmail}</p>
                <p>
                  Destino: <strong>{order.recipientName}</strong> · {order.city}, {order.country}
                </p>
                <p className="admin-note">
                  {order.addressLine1}
                  {order.addressLine2 ? ` · ${order.addressLine2}` : ''}
                  {order.reference ? ` · Ref: ${order.reference}` : ''}
                </p>
                <div className="admin-user-metrics">
                  <span>Pago: <strong>{order.status}</strong></span>
                  <span>Envio: <strong>{order.shippingStatus}</strong></span>
                  <span>Precio: <strong>{order.priceLabel}</strong></span>
                </div>
                <div className="admin-actions-row">
                  <label className="admin-field">
                    <span>Carrier</span>
                    <select
                      value={order.carrier || 'manual_review'}
                      onChange={(event) => updatePhysicalOrder(order.id, { carrier: event.target.value })}
                    >
                      <option value="manual_review">Revision manual</option>
                      <option value="olva">Olva</option>
                      <option value="shalom">Shalom</option>
                      <option value="dhl">DHL</option>
                      <option value="fedex">FedEx</option>
                      <option value="other">Otro</option>
                    </select>
                  </label>
                  <label className="admin-field">
                    <span>Tracking</span>
                    <input
                      value={order.trackingNumber || ''}
                      onChange={(event) => updatePhysicalOrder(order.id, { trackingNumber: event.target.value })}
                    />
                  </label>
                  <label className="admin-field">
                    <span>Estado de envio</span>
                    <select
                      value={order.shippingStatus || 'awaiting_payment'}
                      onChange={(event) => updatePhysicalOrder(order.id, { shippingStatus: event.target.value })}
                    >
                      <option value="awaiting_payment">Pendiente de pago</option>
                      <option value="processing">Preparando</option>
                      <option value="shipped">Enviado</option>
                      <option value="delivered">Entregado</option>
                      <option value="cancelled">Cancelado</option>
                    </select>
                  </label>
                </div>
              </div>
            </article>
          ))
        ) : (
          <article className="admin-hint">
            <p>Todavia no hay pedidos fisicos registrados.</p>
          </article>
        )}
      </div>
    </section>
  )
}

export function AdminDashboardPage() {
  const navigate = useNavigate()
  const { logout, session } = useAppState()
  const [activeTab, setActiveTab] = useState('content')

  async function handleLogout() {
    await logout()
    navigate('/admin/login')
  }

  return (
    <main className="admin-shell">
      <section className="admin-dashboard">
        <header className="admin-topbar">
          <div><p className="admin-eyebrow">Admin</p><h1>Panel de control</h1><p>Sesion activa: {session?.name}</p></div>
          <div className="admin-actions-row">
            <button type="button" className="admin-secondary-button" onClick={() => navigate('/')}>Ver sitio</button>
            <button type="button" className="admin-danger-button" onClick={handleLogout}>Cerrar sesion</button>
          </div>
        </header>
        <div className="admin-tabs">
          <button type="button" className={activeTab === 'content' ? 'admin-tab active' : 'admin-tab'} onClick={() => setActiveTab('content')}>Contenido</button>
          <button type="button" className={activeTab === 'users' ? 'admin-tab active' : 'admin-tab'} onClick={() => setActiveTab('users')}>Usuarios</button>
          <button type="button" className={activeTab === 'physical' ? 'admin-tab active' : 'admin-tab'} onClick={() => setActiveTab('physical')}>Pedidos fisicos</button>
        </div>
        {activeTab === 'content' ? <ContentEditor /> : null}
        {activeTab === 'users' ? <UsersEditor /> : null}
        {activeTab === 'physical' ? <PhysicalOrdersEditor /> : null}
      </section>
    </main>
  )
}

