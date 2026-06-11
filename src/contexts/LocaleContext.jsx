import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import viMessages from '../locales/vi.json'

const LocaleContext = createContext(null)

const LOCALE_STORAGE_KEY = 'devpath_locale'
const SUPPORTED_LOCALES = ['vi']

const MESSAGES = {
  vi: viMessages,
}

function getByPath(source, path) {
  return path.split('.').reduce((value, segment) => {
    if (!value || typeof value !== 'object') return undefined
    return value[segment]
  }, source)
}

function getInitialLocale() {
  const saved = localStorage.getItem(LOCALE_STORAGE_KEY)
  if (SUPPORTED_LOCALES.includes(saved)) {
    return saved
  }
  return 'vi'
}

export function LocaleProvider({ children }) {
  const [locale, setLocale] = useState(getInitialLocale)

  useEffect(() => {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)
    document.documentElement.lang = 'vi'
  }, [locale])

  const setLanguage = (nextLocale) => {
    if (!SUPPORTED_LOCALES.includes(nextLocale)) {
      return
    }
    setLocale(nextLocale)
  }

  const t = (key, fallback) => {
    const localized = getByPath(MESSAGES[locale], key)
    if (typeof localized === 'string') return localized

    const vietnamese = getByPath(MESSAGES.vi, key)
    if (typeof vietnamese === 'string') return vietnamese

    return fallback || key
  }

  const value = useMemo(() => ({
    locale,
    language: locale,
    setLanguage,
    t,
  }), [locale])

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider')
  }
  return context
}

export default LocaleContext
