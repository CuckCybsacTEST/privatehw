import { useTranslation } from 'react-i18next'

export function LanguageSwitcher({ className = '' }) {
  const { i18n, t } = useTranslation()
  const currentLanguage =
    i18n.resolvedLanguage?.slice(0, 2) ||
    i18n.language?.slice(0, 2) ||
    'es'

  function handleChange(event) {
    i18n.changeLanguage(event.target.value)
  }

  return (
    <label className={`language-switcher${className ? ` ${className}` : ''}`}>
      <select
        value={currentLanguage === 'en' ? 'en' : 'es'}
        onChange={handleChange}
        aria-label={t('language.label')}
      >
        <option value="es">ES</option>
        <option value="en">EN</option>
      </select>
    </label>
  )
}
