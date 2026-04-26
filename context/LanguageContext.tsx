'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { translateText, type Language } from '@/lib/i18n/translations'

type LanguageContextValue = {
  language: Language
  setLanguage: (language: Language) => void
  t: (text: string) => string
}

const languageStorageKey = 'hiresync-language'

const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  setLanguage: () => undefined,
  t: (text) => text,
})

function isSupportedLanguage(value: string | null): value is Language {
  return value === 'en' || value === 'sq'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem(languageStorageKey)
    if (!isSupportedLanguage(storedLanguage) || storedLanguage === 'en') return

    const frameId = window.requestAnimationFrame(() => {
      setLanguageState(storedLanguage)
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [])

  useEffect(() => {
    window.localStorage.setItem(languageStorageKey, language)
    document.documentElement.lang = language === 'sq' ? 'sq' : 'en'
    document.cookie = `${languageStorageKey}=${language}; path=/; max-age=31536000; samesite=lax`
  }, [language])

  const setLanguage = useCallback((nextLanguage: Language) => {
    setLanguageState(nextLanguage)
  }, [])

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t: (text) => translateText(text, language),
    }),
    [language, setLanguage]
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  return useContext(LanguageContext)
}
