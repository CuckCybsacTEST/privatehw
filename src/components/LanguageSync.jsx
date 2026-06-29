import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export function LanguageSync() {
  const { i18n } = useTranslation()

  useEffect(() => {
    const language = i18n.resolvedLanguage || i18n.language || 'es'
    document.documentElement.lang = language.slice(0, 2)
  }, [i18n.language, i18n.resolvedLanguage])

  return null
}
