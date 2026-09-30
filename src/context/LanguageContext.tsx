import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  type SupportedLanguage,
  type TranslationKey,
  translations,
  SUPPORTED_LANGUAGES,
  type LanguageOption,
} from '../utils/i18n'
import { translateWithGoogleAi } from '../services/googleAiTranslate'

interface LanguageContextType {
  language: SupportedLanguage
  setLanguage: (lang: SupportedLanguage) => void
  t: (key: TranslationKey) => string
  languages: LanguageOption[]
  translateDynamic: (text: string, forceLang?: SupportedLanguage) => Promise<string>
  isAiTranslating: boolean
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const STORAGE_KEY = 'namma_preferred_language'

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as SupportedLanguage | null
      if (saved && (saved === 'en' || saved === 'ta' || saved === 'hi')) {
        return saved
      }
    } catch {}
    return 'en'
  })

  const [isAiTranslating, setIsAiTranslating] = useState(false)

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguageState(lang)
    try {
      localStorage.setItem(STORAGE_KEY, lang)
      // Update HTML lang attribute for accessibility
      document.documentElement.lang = lang
    } catch {}
  }, [])

  useEffect(() => {
    try {
      document.documentElement.lang = language
    } catch {}
  }, [language])

  const t = useCallback(
    (key: TranslationKey): string => {
      const langDict = translations[language]
      if (langDict && key in langDict) {
        return (langDict as any)[key]
      }
      // Fallback to English
      return (translations.en as any)[key] || (key as string)
    },
    [language]
  )

  const translateDynamic = useCallback(
    async (text: string, forceLang?: SupportedLanguage): Promise<string> => {
      const target = forceLang || language
      if (!text || !text.trim() || target === 'en') {
        return text
      }
      setIsAiTranslating(true)
      try {
        return await translateWithGoogleAi(text, target)
      } finally {
        setIsAiTranslating(false)
      }
    },
    [language]
  )

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        languages: SUPPORTED_LANGUAGES,
        translateDynamic,
        isAiTranslating,
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
