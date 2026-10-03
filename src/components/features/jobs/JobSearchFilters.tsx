import React, { useState } from 'react'
import { Search, Bookmark, MapPin, X, ChevronDown } from 'lucide-react'
import { useLanguage } from '../../../context/LanguageContext'
import { ALL_38_TN_DISTRICTS } from '../../../constants/clusters'
import { translateLocationSync } from '../../../services/googleAiTranslate'
import { GoogleLocationSearchInput } from '../../ui/GoogleLocationSearchInput'

interface JobSearchFiltersProps {
  searchQuery: string
  onSearchChange: (q: string) => void
  selectedType?: string
  onTypeChange?: (type: any) => void
  selectedDistrict?: string
  onDistrictChange?: (district: string) => void
  onViewSavedJobs?: () => void
  savedJobsCount?: number
}

const TOP_INDUSTRIAL_HUBS = [
  { id: 'all', name: 'All TN' },
  { id: 'chennai', name: 'Chennai' },
  { id: 'coimbatore', name: 'Coimbatore' },
  { id: 'tiruppur', name: 'Tiruppur' },
  { id: 'salem', name: 'Salem' },
  { id: 'erode', name: 'Erode' },
  { id: 'madurai', name: 'Madurai' },
  { id: 'trichy', name: 'Tiruchirappalli' },
]

export const JobSearchFilters: React.FC<JobSearchFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedDistrict = '',
  onDistrictChange,
  onViewSavedJobs,
}) => {
  const { t, language } = useLanguage()
  const [isLocationOpen, setIsLocationOpen] = useState(false)

  const isLocationFiltered = Boolean(selectedDistrict && selectedDistrict.trim().length > 0)

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-3 sm:p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-2.5">
      {/* 1. Apple iOS Search Bar */}
      <div className="relative flex items-center w-full">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder={t('filter_search_placeholder') || 'Search by role, company, or keyword...'}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-10 rounded-xl bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-[#0B2545]/40 pl-10 pr-9 text-[13px] text-slate-900 placeholder:text-slate-400 outline-none transition font-normal focus:ring-2 focus:ring-[#0B2545]/10"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center rounded-full bg-slate-300 text-slate-600 hover:bg-slate-400 transition cursor-pointer"
            title="Clear search"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        )}
      </div>

      {/* 2. iOS Filter Action Row: Location Chip + Saved Jobs (No overflow, fits any screen) */}

      {/* 3. iOS Filter Action Row: Location Chip + Saved Jobs (No overflow, fits any screen) */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        {/* Left: Location Filter Trigger */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <button
            type="button"
            onClick={() => setIsLocationOpen((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition cursor-pointer max-w-full ${
              isLocationFiltered
                ? 'bg-[#0B2545] text-white shadow-xs font-semibold'
                : isLocationOpen
                ? 'bg-slate-200 text-slate-800'
                : 'border border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50'
            }`}
            title="Filter by location"
          >
            <MapPin className={`h-3 w-3 shrink-0 ${isLocationFiltered ? 'text-[#F97316]' : 'text-slate-500'}`} />
            <span className="truncate">
              {isLocationFiltered
                ? translateLocationSync(selectedDistrict, language)
                : language === 'ta'
                ? 'இருப்பிடம்'
                : 'Location'}
            </span>
            <ChevronDown
              className={`h-3 w-3 shrink-0 transition-transform duration-200 ${
                isLocationOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isLocationFiltered && (
            <button
              type="button"
              onClick={() => onDistrictChange?.('')}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition cursor-pointer shrink-0"
              title="Reset location"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Right: Saved Jobs Action (Clean, No count badge, never overflows) */}
        {onViewSavedJobs && (
          <button
            type="button"
            onClick={onViewSavedJobs}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white hover:bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 transition cursor-pointer shrink-0 active:scale-95"
            title="View your saved jobs"
          >
            <Bookmark className="h-3.5 w-3.5 fill-slate-600 text-slate-600" />
            <span>{t('saved_jobs_title') || 'Saved Jobs'}</span>
          </button>
        )}
      </div>

      {/* 4. iOS Location Popover/Drawer (Smooth slide-in, unified single location search) */}
      {isLocationOpen && (
        <div className="pt-2.5 border-t border-slate-100 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="font-semibold text-slate-900">
              {language === 'ta' ? 'இருப்பிடத்தைத் தேர்ந்தெடுக்கவும்' : 'Select Location'}
            </span>
            <button
              type="button"
              onClick={() => setIsLocationOpen(false)}
              className="text-xs text-[#0B2545] font-semibold hover:underline cursor-pointer"
            >
              {language === 'ta' ? 'முடிந்தது' : 'Done'}
            </button>
          </div>

          {/* Unified Location Autocomplete */}
          <GoogleLocationSearchInput
            value={selectedDistrict}
            onChange={(val) => onDistrictChange?.(val)}
            onSelect={(val) => {
              onDistrictChange?.(val)
              setIsLocationOpen(false)
            }}
            placeholder={
              language === 'ta'
                ? 'நகரம் / மாவட்டம் தேடுக (எ.கா. சென்னை, கோவை)...'
                : 'Search city or district (e.g. Chennai, Coimbatore)...'
            }
          />

          {/* iOS Quick Hub Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {TOP_INDUSTRIAL_HUBS.map((hub) => {
              const isAll = hub.id === 'all'
              const isSelected = isAll
                ? !selectedDistrict
                : selectedDistrict.toLowerCase() === hub.name.toLowerCase()
              return (
                <button
                  key={hub.id}
                  type="button"
                  onClick={() => {
                    onDistrictChange?.(isAll ? '' : hub.name)
                    setIsLocationOpen(false)
                  }}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap transition cursor-pointer ${
                    isSelected
                      ? 'bg-[#0B2545] text-white shadow-xs font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {isAll
                    ? language === 'ta'
                      ? 'அனைத்து தமிழகம்'
                      : 'All TN'
                    : translateLocationSync(hub.name, language)}
                </button>
              )
            })}
          </div>

          {/* 38 Districts iOS Select */}
          {onDistrictChange && (
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <span className="text-[11px] text-slate-400">
                {language === 'ta' ? 'அல்லது மாவட்டத்தைத் தேர்ந்தெடுக்கவும்:' : 'Or choose district:'}
              </span>
              <select
                value={selectedDistrict}
                onChange={(e) => {
                  onDistrictChange(e.target.value)
                  if (e.target.value) setIsLocationOpen(false)
                }}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 outline-none cursor-pointer focus:border-[#0B2545]"
              >
                <option value="">
                  {language === 'ta' ? 'அனைத்து 38 மாவட்டங்கள்' : 'All 38 Districts (TN)'}
                </option>
                {ALL_38_TN_DISTRICTS.map((d) => (
                  <option key={d.id} value={d.nameEn.split('(')[0].trim()}>
                    {language === 'ta'
                      ? `${d.nameTa} (${d.nameEn})`
                      : d.nameEn}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
