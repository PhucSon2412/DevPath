import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import enMessages from '../locales/en.json'

const LocaleContext = createContext(null)

const LOCALE_STORAGE_KEY = 'devpath_locale'
const SUPPORTED_LOCALES = ['en']

const MESSAGES = {
  en: enMessages,
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
  return 'en'
}

export function LocaleProvider({ children }) {
  const [locale, setLocale] = useState(getInitialLocale)

  useEffect(() => {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)
    document.documentElement.lang = 'en'
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

    const english = getByPath(MESSAGES.en, key)
    if (typeof english === 'string') return english

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
