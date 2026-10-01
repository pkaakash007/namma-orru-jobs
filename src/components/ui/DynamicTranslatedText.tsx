import React, { useState, useEffect } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import {
  translateWithGoogleAi,
  getCachedTranslation,
  isLanguageMatch,
  isNonTranslatable,
} from '../../services/googleAiTranslate'

export interface UseDynamicTextResult {
  translatedText: string
  originalText: string
  isTranslating: boolean
  isTranslated: boolean
}

/**
 * Hook to translate dynamic user data (posts, messages, candidate bios, etc.)
 * Provides instant 0ms cached lookups with asynchronous AI background refinement.
 */
export function useDynamicText(text: string | null | undefined): UseDynamicTextResult {
  const { language } = useLanguage()
  const rawText = text || ''

  const [translated, setTranslated] = useState<string>(() => {
    if (!rawText.trim() || isNonTranslatable(rawText) || isLanguageMatch(rawText, language)) {
      return rawText
    }
    const cached = getCachedTranslation(rawText, language)
    return cached && cached !== rawText ? cached : rawText
  })

  const [isTranslating, setIsTranslating] = useState<boolean>(false)

  useEffect(() => {
    if (!rawText.trim() || isNonTranslatable(rawText) || isLanguageMatch(rawText, language)) {
      setTranslated(rawText)
      setIsTranslating(false)
      return
    }

    // Check synchronous cache first
    const cached = getCachedTranslation(rawText, language)
    if (cached && cached !== rawText) {
      setTranslated(cached)
      setIsTranslating(false)
      return
    }

    let isMounted = true
    setIsTranslating(true)

    translateWithGoogleAi(rawText, language)
      .then((res) => {
        if (isMounted) {
          if (res) setTranslated(res)
          setIsTranslating(false)
        }
      })
      .catch(() => {
        if (isMounted) {
          setTranslated(rawText)
          setIsTranslating(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [rawText, language])

  const isTranslated = Boolean(
    rawText.trim() &&
    translated.trim() &&
    translated.trim() !== rawText.trim()
  )

  return {
    translatedText: translated,
    originalText: rawText,
    isTranslating,
    isTranslated,
  }
}

interface DynamicTranslatedTextProps {
  text: string | null | undefined
  className?: string
  as?: 'span' | 'p' | 'div' | 'h1' | 'h2' | 'h3' | 'h4'
  showOriginalToggle?: boolean
  fallback?: string
}

/**
 * Renders dynamically translated text across English, Tamil, and Hindi.
 * Automatically switches language in real-time when user alters language preference.
 */
export const DynamicTranslatedText: React.FC<DynamicTranslatedTextProps> = ({
  text,
  className,
  as: Component = 'span',
  showOriginalToggle = false,
  fallback = '',
}) => {
  const { language } = useLanguage()
  const { translatedText, originalText, isTranslated } = useDynamicText(text)
  const [showOriginal, setShowOriginal] = useState(false)

  // Reset toggle when language changes
  useEffect(() => {
    setShowOriginal(false)
  }, [language])

  const contentToDisplay = showOriginal ? originalText : translatedText || fallback

  if (!showOriginalToggle || !isTranslated) {
    return <Component className={className}>{contentToDisplay}</Component>
  }

  const originalToggleLabel = showOriginal
    ? language === 'ta'
      ? 'மொழிபெயர்ப்பைக் காட்டு'
      : language === 'hi'
      ? 'अनुवाद देखें'
      : 'Show translation'
    : language === 'ta'
    ? 'அசல் உரை'
    : language === 'hi'
    ? 'मूल पाठ'
    : 'See original'

  return (
    <Component className={className}>
      <span>{contentToDisplay}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setShowOriginal((prev) => !prev)
        }}
        className="ml-2 inline-flex items-center text-[10px] text-[#0A66C2] hover:text-[#004182] hover:underline font-normal cursor-pointer select-none align-baseline"
      >
        ({originalToggleLabel})
      </button>
    </Component>
  )
}
