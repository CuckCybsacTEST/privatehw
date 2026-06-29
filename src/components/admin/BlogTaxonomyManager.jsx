import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

function normalizeItem(value) {
  return String(value || '').trim()
}

function uniqueList(values = []) {
  return Array.from(new Set(values.map(normalizeItem).filter(Boolean)))
}

function TaxonomyGroup({ label, description, items, onAdd, onRemove, inputLabel, t }) {
  const [draft, setDraft] = useState('')

  function handleAdd() {
    const nextValue = normalizeItem(draft)

    if (!nextValue) {
      return
    }

    onAdd(nextValue)
    setDraft('')
  }

  return (
    <div className="admin-blog-taxonomy-group">
      <div className="admin-blog-taxonomy-group-top">
        <div>
          <h4>{label}</h4>
          {description ? <p className="admin-meta">{description}</p> : null}
        </div>
      </div>

      <div className="admin-chip-row">
        {items.length ? (
          items.map((item) => (
            <button
              type="button"
              className="admin-chip-button"
              key={item}
              onClick={() => onRemove(item)}
              title={t('admin.blog.remove')}
            >
              <span>{item}</span>
              <small>×</small>
            </button>
          ))
        ) : (
          <p className="admin-meta">{t('admin.blog.noItems')}</p>
        )}
      </div>

      <div className="admin-chip-editor">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={inputLabel}
        />
        <button type="button" className="admin-secondary-button" onClick={handleAdd}>
          {t('admin.blog.add')}
        </button>
      </div>
    </div>
  )
}

export function BlogTaxonomyManager({ value, onChange }) {
  const { t } = useTranslation()
  const taxonomy = useMemo(
    () => ({
      categories: uniqueList(value?.categories || []),
      tags: uniqueList(value?.tags || []),
    }),
    [value],
  )

  function updateTaxonomy(patch) {
    onChange({
      categories: taxonomy.categories,
      tags: taxonomy.tags,
      ...patch,
    })
  }

  return (
    <section className="admin-blog-panel">
      <div className="admin-section-header admin-blog-panel-header">
        <div>
          <h3>{t('admin.blog.taxonomyTitle')}</h3>
          <p className="admin-meta">{t('admin.blog.taxonomyDescription')}</p>
        </div>
      </div>

      <div className="admin-blog-taxonomy-grid">
        <TaxonomyGroup
          t={t}
          label={t('admin.blog.categories')}
          description={t('admin.blog.categoriesDescription')}
          items={taxonomy.categories}
          inputLabel={t('admin.blog.newCategory')}
          onAdd={(nextValue) =>
            updateTaxonomy({ categories: uniqueList([...taxonomy.categories, nextValue]) })
          }
          onRemove={(nextValue) =>
            updateTaxonomy({ categories: taxonomy.categories.filter((item) => item !== nextValue) })
          }
        />

        <TaxonomyGroup
          t={t}
          label={t('admin.blog.tags')}
          description={t('admin.blog.tagsDescription')}
          items={taxonomy.tags}
          inputLabel={t('admin.blog.newTag')}
          onAdd={(nextValue) => updateTaxonomy({ tags: uniqueList([...taxonomy.tags, nextValue]) })}
          onRemove={(nextValue) => updateTaxonomy({ tags: taxonomy.tags.filter((item) => item !== nextValue) })}
        />
      </div>
    </section>
  )
}
