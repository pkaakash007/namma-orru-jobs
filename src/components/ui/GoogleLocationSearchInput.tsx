import React, { useState, useEffect, useRef, useCallback } from 'react'
import { MapPin, X, Loader2, Compass, Building2 } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import {
  searchGoogleLocations,
  type LocationSuggestion,
} from '../../services/googleLocationService'

interface GoogleLocationSearchInputProps {
  value: string
  onChange: (value: string) => void
  onSelect?: (value: string) => void
  placeholder?: string
  label?: string
  required?: boolean
  className?: string
  inputClassName?: string
  autoFocus?: boolean
  hideIcon?: boolean
}

export const GoogleLocationSearchInput: React.FC<GoogleLocationSearchInputProps> = ({
  value,
  onChange,
  onSelect,
  placeholder,
  label,
  required,
  className = '',
  inputClassName = '',
  autoFocus = false,
  hideIcon = false,
}) => {
  const { language } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState<number>(-1)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceTimerRef = useRef<any>(null)

  // Fetch suggestions with debouncing
  const loadSuggestions = useCallback(
    async (queryText: string) => {
      setIsLoading(true)
      try {
        const results = await searchGoogleLocations(queryText, language)
        setSuggestions(results)
        setSelectedIndex(-1)
      } catch (err) {
        setSuggestions([])
      } finally {
        setIsLoading(false)
      }
    },
    [language]
  )

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    if (!isOpen) return

    debounceTimerRef.current = setTimeout(() => {
      loadSuggestions(value)
    }, 150)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [value, isOpen, loadSuggestions])

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSelect = (item: LocationSuggestion) => {
    const selectedText =
      language !== 'en' && item.nameLocalized ? item.nameLocalized : item.value
    onChange(selectedText)
    if (onSelect) {
      onSelect(selectedText)
    }
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true)
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        e.preventDefault()
        handleSelect(suggestions[selectedIndex])
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const clearInput = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    if (onSelect) {
      onSelect('')
    }
    inputRef.current?.focus()
    setIsOpen(true)
  }

  const dropdownHeader =
    language === 'ta'
      ? 'கூகிள் இருப்பிட பரிந்துரைகள்'
      : language === 'hi'
      ? 'गूगल स्थान सुझाव'
      : 'Google Location Suggestions'

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {label && (
        <label className="mb-1 block text-xs font-semibold text-slate-700">
          {label}
        </label>
      )}

      <div className="relative">
        {!hideIcon && (
          <MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#F97316]" />
        )}

        <input
          ref={inputRef}
          type="text"
          value={value}
          required={required}
          autoFocus={autoFocus}
          placeholder={
            placeholder ||
            (language === 'ta'
              ? 'இருப்பிடத்தைத் தேடுக (எ.கா. சென்னை, கோயம்புத்தூர்)...'
              : language === 'hi'
              ? 'स्थान खोजें (उदा. चेन्नई, कोयंबटूर)...'
              : 'Search location (e.g. Chennai, Coimbatore)...')
          }
          onChange={(e) => {
            onChange(e.target.value)
            if (!isOpen) setIsOpen(true)
          }}
          onFocus={() => {
            setIsOpen(true)
            loadSuggestions(value)
          }}
          onKeyDown={handleKeyDown}
          className={`w-full rounded-xl border border-slate-200 bg-white py-2 pr-8 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#0B2545] focus:ring-1 focus:ring-[#0B2545] shadow-2xs ${
            hideIcon ? 'pl-3' : 'pl-9'
          } ${inputClassName}`}
        />

        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading && (
            <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
          )}
          {value && !isLoading && (
            <button
              type="button"
              onClick={clearInput}
              className="rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              title="Clear location"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Google API Location Dropdown Suggestion */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg ring-1 ring-black/5 divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50/80 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <Compass className="h-3 w-3 text-[#F97316]" />
              <span>{dropdownHeader}</span>
            </span>
            <span className="text-[9px] font-medium text-slate-400">
              Google Places API
            </span>
          </div>

          {suggestions.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-400">
              {isLoading ? (
                <div className="flex items-center justify-center gap-1.5 py-1">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#0B2545]" />
                  <span>
                    {language === 'ta'
                      ? 'இருப்பிடங்கள் தேடப்படுகின்றன...'
                      : language === 'hi'
                      ? 'स्थान खोज रहे हैं...'
                      : 'Searching locations...'}
                  </span>
                </div>
              ) : (
                <span>
                  {language === 'ta'
                    ? 'பொருத்தமான இருப்பிடங்கள் கிடைக்கவில்லை'
                    : language === 'hi'
                    ? 'कोई स्थान नहीं मिला'
                    : 'No matching locations found'}
                </span>
              )}
            </div>
          ) : (
            suggestions.map((item, index) => {
              const isSelected = index === selectedIndex
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-start gap-2.5 px-3 py-2 text-left cursor-pointer transition ${
                    isSelected ? 'bg-blue-50/80 text-[#0B2545]' : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                      item.type === 'tech_park'
                        ? 'bg-orange-50 text-[#EA580C]'
                        : item.type === 'district'
                        ? 'bg-blue-50 text-[#0B2545]'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.type === 'tech_park' ? (
                      <Building2 className="h-3.5 w-3.5" />
                    ) : (
                      <MapPin className="h-3.5 w-3.5" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-semibold text-slate-900 truncate">
                        {item.nameLocalized || item.name}
                      </p>
                      {item.type === 'tech_park' && (
                        <span className="shrink-0 rounded bg-orange-100/70 px-1.5 py-0.2 text-[9px] font-bold text-[#EA580C]">
                          {language === 'ta' ? 'டெக் பார்க்' : language === 'hi' ? 'टेक पार्क' : 'IT Hub'}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {item.subtitle}
                    </p>
                    {language !== 'en' && item.nameLocalized !== item.name && (
                      <p className="text-[10px] text-slate-400 truncate">
                        {item.name}
                      </p>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
