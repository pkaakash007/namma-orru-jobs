import React from 'react'
import { Search, Bookmark } from 'lucide-react'
import { Card } from '../../ui/Card'
import { WORKPLACE_TYPES } from '../../../constants'
import { useLanguage } from '../../../context/LanguageContext'
import { ALL_38_TN_DISTRICTS } from '../../../constants/clusters'
import { translateLocationSync } from '../../../services/googleAiTranslate'
import { GoogleLocationSearchInput } from '../../ui/GoogleLocationSearchInput'

interface JobSearchFiltersProps {
  searchQuery: string
  onSearchChange: (q: string) => void
  selectedType: string
  onTypeChange: (type: any) => void
  selectedDistrict?: string
  onDistrictChange?: (district: string) => void
  onViewSavedJobs?: () => void
  savedJobsCount?: number
}

const TOP_INDUSTRIAL_HUBS = [
  { id: 'coimbatore', name: 'Coimbatore', tag: 'Pumps/Foundry' },
  { id: 'tiruppur', name: 'Tiruppur', tag: 'Textile/Knitwear' },
  { id: 'erode', name: 'Erode', tag: 'Powerloom/Turmeric' },
  { id: 'salem', name: 'Salem', tag: 'Steel/Sago/Lorry' },
  { id: 'namakkal', name: 'Namakkal', tag: 'Poultry/Logistics' },
  { id: 'karur', name: 'Karur', tag: 'Home Textiles/Bus' },
  { id: 'chennai', name: 'Chennai', tag: 'Auto/Logistics' },
]

export const JobSearchFilters: React.FC<JobSearchFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedType,
  onTypeChange,
  selectedDistrict = '',
  onDistrictChange,
  onViewSavedJobs,
  savedJobsCount,
}) => {
  const { t, language } = useLanguage()

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'All':
        return t('filter_all')
      case 'Remote':
        return t('filter_remote')
      case 'Hybrid':
        return t('filter_hybrid')
      case 'On-site':
        return t('filter_onsite')
      default:
        return type
    }
  }

  return (
    <Card className="p-3.5 sm:p-4 shadow-xs space-y-3">
      {/* 1. Search Bar */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder={t('filter_search_placeholder')}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-xl border border-gray-300 bg-white py-2 pl-9 pr-4 text-xs text-[#0F172A] placeholder-slate-400 focus:border-[#0B2545] focus:outline-none focus:ring-1 focus:ring-[#0B2545]"
        />
      </div>

      {/* 2. Workplace Type Filter Pills & Quick Saved Jobs Action */}
      <div className="flex items-center justify-between gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
        <div className="flex items-center gap-1.5 shrink-0">
          {WORKPLACE_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => onTypeChange(type)}
              className={`rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedType === type
                  ? 'bg-[#0B2545] text-white shadow-xs'
                  : 'border border-gray-200 bg-white text-slate-600 hover:bg-gray-50'
              }`}
            >
              {getTypeLabel(type)}
            </button>
          ))}
        </div>

        {onViewSavedJobs && (
          <button
            type="button"
            onClick={onViewSavedJobs}
            className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50/70 hover:bg-blue-100 px-3 py-1 text-xs font-bold text-[#0B2545] transition cursor-pointer shrink-0 shadow-2xs"
            title="View your saved jobs"
          >
            <Bookmark className="h-3.5 w-3.5 fill-[#0B2545] text-[#0B2545]" />
            <span>{t('saved_jobs_title') || 'Saved Jobs'}</span>
            {typeof savedJobsCount === 'number' && savedJobsCount > 0 && (
              <span className="rounded-full bg-[#0B2545] px-1.5 py-0.2 text-[10px] font-bold text-white leading-none">
                {savedJobsCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* 3. Google API Location Search & District Hubs Bar */}
      <div className="pt-2.5 border-t border-slate-100 flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs">
          <div className="flex-1 min-w-[200px]">
            <GoogleLocationSearchInput
              value={selectedDistrict}
              onChange={(val) => onDistrictChange?.(val)}
              onSelect={(val) => onDistrictChange?.(val)}
              placeholder={
                language === 'ta'
                  ? 'கூகிள் இருப்பிடம் / மாவட்டம் தேடுக (எ.கா. சென்னை, OMR)...'
                  : language === 'hi'
                  ? 'गूगल स्थान / जिला खोजें (उदा. चेन्नई, OMR)...'
                  : 'Search location with Google (e.g. Chennai, OMR, Bangalore)...'
              }
            />
          </div>

          {/* Quick 38 Districts Select dropdown */}
          {onDistrictChange && (
            <select
              value={selectedDistrict}
              onChange={(e) => onDistrictChange(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-[#0B2545] shrink-0"
            >
              <option value="">
                {language === 'ta'
                  ? 'அனைத்து 38 மாவட்டங்கள்'
                  : language === 'hi'
                  ? 'सभी 38 जिले'
                  : 'All 38 Districts (TN)'}
              </option>
              {ALL_38_TN_DISTRICTS.map((d) => (
                <option key={d.id} value={d.nameEn.split('(')[0].trim()}>
                  {language === 'ta'
                    ? `${d.nameTa} (${d.nameEn})`
                    : language === 'hi'
                    ? `${d.nameHi} (${d.nameEn})`
                    : d.nameEn}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Quick Hub Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <button
            type="button"
            onClick={() => onDistrictChange?.('')}
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap transition cursor-pointer ${
              !selectedDistrict
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {language === 'ta' ? 'அனைத்து தமிழகம்' : language === 'hi' ? 'पूरा तमिलनाडु' : 'All TN'}
          </button>
          {TOP_INDUSTRIAL_HUBS.map((hub) => {
            const isSelected =
              selectedDistrict.toLowerCase() === hub.name.toLowerCase()
            return (
              <div key={hub.id} className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onDistrictChange?.(isSelected ? '' : hub.name)}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap transition cursor-pointer ${
                    isSelected
                      ? 'bg-[#F97316] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {translateLocationSync(hub.name, language)}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
