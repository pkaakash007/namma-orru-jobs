import React, { useState, useEffect, useCallback } from 'react'
import type { User } from '../../../types'
import { useToast } from '../../../context/ToastContext'
import { useLanguage } from '../../../context/LanguageContext'
import { Card } from '../../ui/Card'
import { Avatar } from '../../ui/Avatar'
import { SKILL_CATEGORIES, extractSkillsFromJobDescription, type SkillCategory } from '../../../services/resumeParser'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import { searchCandidatesCached } from '../../../store/candidatesSlice'
import { translateLocationSync } from '../../../services/googleAiTranslate'
import { GoogleLocationSearchInput } from '../../ui/GoogleLocationSearchInput'
import { parseSkillsArray } from '../../../utils/skills'
import {
  Search,
  MapPin,
  FileText,
  ExternalLink,
  Mail,
  RefreshCw,
  CheckCircle2,
  Briefcase,
  SlidersHorizontal,
  Building2,
  MessageSquare,
  Flame,
} from 'lucide-react'

const CATEGORY_TRANSLATIONS: Record<string, { ta: string; hi: string }> = {
  it_software: {
    ta: 'தகவல் தொழில்நுட்பம் & மென்பொருள்',
    hi: 'सूचना प्रौद्योगिकी एवं सॉफ्टवेयर',
  },
  finance_accounting: {
    ta: 'நிதி & கணக்கியல்',
    hi: 'वित्त एवं लेखा',
  },
  sales_marketing: {
    ta: 'விற்பனை & சந்தைப்படுத்தல்',
    hi: 'बिक्री एवं विपणन',
  },
  engineering_manufacturing: {
    ta: 'பொறியியல் & உற்பத்தி',
    hi: 'इंजीनियरिंग एवं विनिर्माण',
  },
  design_media: {
    ta: 'படைப்பாற்றல் & வடிவமைப்பு',
    hi: 'रचनात्मक एवं डिज़ाइन',
  },
  healthcare_pharma: {
    ta: 'மருத்துவம் & மருந்தியல்',
    hi: 'स्वास्थ्य सेवा एवं फार्मा',
  },
}

interface CandidateSearchViewProps {
  initialQuery?: string
  initialJd?: string
  onSelectCandidate?: (candidate: User) => void
  onOpenProfile?: (candidateId: string) => void
}

type SearchMode = 'skills' | 'jd'

export const CandidateSearchView: React.FC<CandidateSearchViewProps> = ({
  initialQuery = '',
  initialJd = '',
  onOpenProfile,
}) => {
  const { showToast } = useToast()
  const { t, language } = useLanguage()
  const dispatch = useAppDispatch()
  const { currentResults: candidates, isLoading } = useAppSelector((state) => state.candidates)
  const employeeCandidates = candidates.filter((cand) => !cand.role || cand.role === 'employee')
  const [searchMode, setSearchMode] = useState<SearchMode>(initialJd ? 'jd' : 'skills')

  // Search parameters
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [jdText, setJdText] = useState(initialJd)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedTag, setSelectedTag] = useState<string>('All')
  const [locationFilter, setLocationFilter] = useState('')
  const [withResumeOnly, setWithResumeOnly] = useState(false)
  const [detectedJdSkills, setDetectedJdSkills] = useState<string[]>([])
  const [selectedCandidate, setSelectedCandidate] = useState<User | null>(null)

  const activeCategoryObj: SkillCategory | undefined = SKILL_CATEGORIES.find(
    (c) => c.id === selectedCategory
  )

  const loadCandidates = useCallback(
    async (
      overrideParams?: {
        q?: string
        skill?: string
        location?: string
        category?: string
        jd?: string
        withResume?: boolean
      },
      forceRefresh: boolean = false
    ) => {
      try {
        const q = overrideParams?.q !== undefined ? overrideParams.q : searchQuery
        const skill = overrideParams?.skill !== undefined ? overrideParams.skill : selectedTag
        const loc = overrideParams?.location !== undefined ? overrideParams.location : locationFilter
        const cat = overrideParams?.category !== undefined ? overrideParams.category : selectedCategory
        const jd = overrideParams?.jd !== undefined ? overrideParams.jd : jdText
        const resumeOnly = overrideParams?.withResume !== undefined ? overrideParams.withResume : withResumeOnly

        // If in JD mode, extract JD skills for client highlighting
        if (searchMode === 'jd' && jd.trim().length > 0) {
          const extracted = extractSkillsFromJobDescription(jd)
          setDetectedJdSkills(extracted)
        } else {
          setDetectedJdSkills([])
        }

        const resultAction = await dispatch(
          searchCandidatesCached({
            params: {
              q: searchMode === 'skills' ? q.trim() || undefined : undefined,
              skill: skill !== 'All' ? skill : undefined,
              location: loc.trim() || undefined,
              category: cat !== 'all' ? cat : undefined,
              jd: searchMode === 'jd' ? jd.trim() || undefined : undefined,
              with_resume: resumeOnly,
            },
            forceRefresh,
          })
        ).unwrap()

        if (resultAction.jdExtractedSkills && resultAction.jdExtractedSkills.length > 0) {
          setDetectedJdSkills(resultAction.jdExtractedSkills)
        }
      } catch (err: any) {
        showToast(err.message || err || 'Failed to search candidate talent', 'error')
      }
    },
    [searchQuery, selectedTag, locationFilter, selectedCategory, jdText, withResumeOnly, searchMode, showToast, dispatch]
  )

  useEffect(() => {
    loadCandidates()
  }, [])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loadCandidates()
  }

  const handleCategorySelect = (catId: string) => {
    setSelectedCategory(catId)
    setSelectedTag('All')
    loadCandidates({ category: catId, skill: 'All' })
  }

  const handleTagClick = (tag: string) => {
    setSelectedTag(tag)
    loadCandidates({ skill: tag })
  }



  const handleResetFilters = () => {
    setSearchQuery('')
    setJdText('')
    setSelectedCategory('all')
    setSelectedTag('All')
    setLocationFilter('')
    setWithResumeOnly(false)
    setDetectedJdSkills([])
    loadCandidates({
      q: '',
      skill: 'All',
      location: '',
      category: 'all',
      jd: '',
      withResume: false,
    })
  }

  const handleInviteCandidate = (cand: User) => {
    const contactInfo = cand.email || cand.phone ? ` (${cand.email || cand.phone})` : ''
    showToast(
      language === 'ta'
        ? `நேர்காணல் அழைப்பு ${cand.full_name}${contactInfo} க்கு அனுப்பப்பட்டது!`
        : language === 'hi'
        ? `${cand.full_name}${contactInfo} को साक्षात्कार आमंत्रण भेजा गया!`
        : `Interview invitation sent to ${cand.full_name}${contactInfo}!`,
      'success'
    )
  }

  const getWhatsAppLink = (cand: User) => {
    if (!cand.phone) return '#'
    const cleanPhone = cand.phone.replace(/[^0-9]/g, '')
    const target = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`
    const candSkillsClean = parseSkillsArray(cand.skills).slice(0, 3).join(', ')
    const text = encodeURIComponent(
      `Hello ${cand.full_name},\n\nI reviewed your profile and skills (${candSkillsClean}) on NAMMA OORU JOBS. We have an exciting career opening matching your profile. Would you be open for a quick discussion?`
    )
    return `https://wa.me/${target}?text=${text}`
  }

  return (
    <div className="space-y-5">
      {/* 1. Header & Mode Switcher */}
      <Card className="p-5 sm:p-6 bg-white border-[#E0DFDC] shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-[#0B2545]" />
              <h2 className="text-lg font-black text-[#0B2545] tracking-tight">
                {t('cs_title')}
              </h2>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              {t('cs_subtitle')}
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <button
              type="button"
              onClick={() => loadCandidates(undefined, true)}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-xs font-semibold text-[#0B2545] hover:bg-gray-100 transition cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{t('cs_refresh')}</span>
            </button>
          </div>
        </div>

        {/* Search Mode Selector (Skills vs Job Description) */}
        <div className="mt-4 flex rounded-xl bg-slate-100 p-1 max-w-md">
          <button
            type="button"
            onClick={() => {
              setSearchMode('skills')
              loadCandidates({ jd: '' })
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
              searchMode === 'skills'
                ? 'bg-white text-[#0B2545] shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Search className="h-3.5 w-3.5 text-[#F97316]" />
            <span>{t('cs_mode_skills')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSearchMode('jd')
              if (jdText) loadCandidates({ jd: jdText })
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
              searchMode === 'jd'
                ? 'bg-[#0B2545] text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Briefcase className="h-3.5 w-3.5 text-[#F97316]" />
            <span>{t('cs_mode_jd')}</span>
          </button>
        </div>

        {/* MODE 1: Search by Skill & Keywords */}
        {searchMode === 'skills' ? (
          <form onSubmit={handleSearchSubmit} className="mt-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={t('cs_search_skills_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-[#CDCBC7] bg-white pl-10 pr-4 py-2.5 text-xs sm:text-sm text-[#0F172A] placeholder-[#94A3B8] focus:border-[#0B2545] focus:outline-none focus:ring-1 focus:ring-[#0B2545] shadow-xs"
                />
              </div>

              <div className="relative sm:w-64">
                <GoogleLocationSearchInput
                  placeholder={t('cs_location_placeholder')}
                  value={locationFilter}
                  onChange={setLocationFilter}
                  onSelect={(val) => {
                    setLocationFilter(val)
                    loadCandidates({ location: val })
                  }}
                  inputClassName="rounded-xl border-[#CDCBC7] py-2.5 text-xs text-[#0F172A] shadow-xs"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="rounded-xl bg-[#0B2545] hover:bg-[#071A31] text-white font-bold px-6 py-2.5 text-xs sm:text-sm transition shrink-0 cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
              >
                <Search className="h-4 w-4" />
                <span>{t('cs_find_candidates')}</span>
              </button>
            </div>
          </form>
        ) : (
          /* MODE 2: Match by Job Description */
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-bold text-[#0B2545] mb-1.5 flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-[#F97316]" />
                <span>{t('cs_jd_prompt')}</span>
              </label>
              <textarea
                rows={3}
                placeholder={t('cs_jd_placeholder')}
                value={jdText}
                onChange={(e) => {
                  setJdText(e.target.value)
                  const extracted = extractSkillsFromJobDescription(e.target.value)
                  setDetectedJdSkills(extracted)
                }}
                className="w-full rounded-xl border border-[#CDCBC7] bg-white p-3 text-xs sm:text-sm text-[#0F172A] placeholder-slate-400 focus:border-[#0B2545] focus:outline-none focus:ring-1 focus:ring-[#0B2545] shadow-xs"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              {detectedJdSkills.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 text-[11px]">
                  <span className="font-bold text-[#0B2545]">
                    {language === 'ta' ? 'கண்டறியப்பட்ட திறன்கள்' : language === 'hi' ? 'पहचाने गए कौशल' : 'Detected Skills'} ({detectedJdSkills.length}):
                  </span>
                  {detectedJdSkills.map((sk) => (
                    <span key={sk} className="px-1.5 py-0.5 rounded bg-orange-100 text-[#EA580C] font-semibold text-[10px]">
                      {sk}
                    </span>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => loadCandidates({ jd: jdText })}
                disabled={isLoading || !jdText.trim()}
                className="ml-auto rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white font-bold px-6 py-2 text-xs transition shrink-0 cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
              >
                <Search className="h-4 w-4" />
                <span>{t('cs_match_btn')}</span>
              </button>
            </div>
          </div>
        )}

        {/* 2. Category-Based Skill Profiles Bar */}
        <div className="mt-5 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <SlidersHorizontal className="h-3 w-3 text-[#0B2545]" />
              {t('cs_categories_label')}
            </span>
            <button
              type="button"
              onClick={() => setWithResumeOnly(!withResumeOnly)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
                withResumeOnly
                  ? 'bg-[#0B2545] text-white shadow-xs'
                  : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileText className="h-3 w-3" />
              <span>{t('cs_with_resume_only')}</span>
            </button>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1.5 pb-2">
            <button
              type="button"
              onClick={() => handleCategorySelect('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === 'all'
                  ? 'bg-[#0B2545] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>{t('filter_all')}</span>
            </button>

            {SKILL_CATEGORIES.map((cat) => {
              const localizedName =
                CATEGORY_TRANSLATIONS[cat.id]?.[language as 'ta' | 'hi'] || cat.name
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategorySelect(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center ${
                    selectedCategory === cat.id
                      ? 'bg-[#0B2545] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>{localizedName}</span>
                </button>
              )
            })}
          </div>

          {/* Category Skill Chips */}
          {activeCategoryObj && (
            <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-[#0B2545]">
                  {activeCategoryObj.name} Skill Profiles:
                </span>
                <span className="text-slate-500 text-[10px]">{activeCategoryObj.description}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleTagClick('All')}
                  className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                    selectedTag === 'All'
                      ? 'bg-[#0B2545] text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  All {activeCategoryObj.name}
                </button>
                {activeCategoryObj.skills.slice(0, 16).map((sk) => (
                  <button
                    key={sk}
                    type="button"
                    onClick={() => handleTagClick(sk)}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                      selectedTag === sk
                        ? 'bg-[#F97316] text-white font-bold'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {sk}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* 3. Results Header */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-semibold text-slate-600">
          {language === 'ta'
            ? `பொருத்தமான ${employeeCandidates.length} விண்ணப்பதாரர்கள் காட்டப்படுகிறார்கள்`
            : language === 'hi'
            ? `${employeeCandidates.length} उपयुक्त उम्मीदवार प्रोफ़ाइल प्रदर्शित`
            : `Showing ${employeeCandidates.length} matching candidate profiles`}
        </p>

        {(searchQuery || selectedCategory !== 'all' || selectedTag !== 'All' || locationFilter || jdText || withResumeOnly) && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs font-semibold text-[#F97316] hover:underline cursor-pointer"
          >
            {language === 'ta' ? 'வடிப்பான்களை நீக்கு' : language === 'hi' ? 'फ़िल्टर साफ़ करें' : 'Reset Filters'}
          </button>
        )}
      </div>

      {/* 4. Candidates Grid / Results */}
      {isLoading ? (
        <div className="p-12 text-center bg-white rounded-xl border border-[#E0DFDC]">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#0B2545] border-t-transparent mx-auto" />
          <p className="text-xs font-semibold text-slate-500 mt-3">
            {language === 'ta'
              ? 'விண்ணப்பதாரர் தரவுத்தளத்தில் தேடப்படுகிறது...'
              : language === 'hi'
              ? 'उम्मीदवार डेटाबेस में खोज जारी है...'
              : 'Searching candidate database & scoring profiles...'}
          </p>
        </div>
      ) : employeeCandidates.length === 0 ? (
        <Card className="p-10 text-center bg-white border-[#E0DFDC] space-y-3">
          <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-[#0B2545]">{t('cs_no_results')}</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            {t('cs_no_results_sub')}
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="rounded-full bg-[#0B2545] px-5 py-2 text-xs font-bold text-white hover:bg-[#071A31] transition cursor-pointer"
          >
            {language === 'ta' ? 'அனைத்து வடிப்பான்களையும் மீட்டமை' : language === 'hi' ? 'सभी फ़िल्टर रीसेट करें' : 'Reset All Filters'}
          </button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {employeeCandidates.map((cand) => {
            const candidateSkills: string[] = parseSkillsArray(cand.skills)

            const matchScore = cand.match_score
            const matchedSkillsList = cand.matched_skills || []

            const activeSkillTerm = (selectedTag !== 'All' ? selectedTag : searchQuery).toLowerCase()

            return (
              <Card
                key={cand.id}
                className="p-5 bg-white border-[#E0DFDC] hover:border-[#0B2545]/40 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Candidate Header */}
                  <div className="flex items-start gap-3.5">
                    <Avatar src={cand.avatar_url} name={cand.full_name} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-sm font-bold text-[#0F172A] truncate">
                          {cand.full_name}
                        </h3>
                        {matchScore !== undefined && matchScore > 0 && (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              matchScore >= 70
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                : matchScore >= 40
                                ? 'bg-orange-50 text-[#EA580C] border-orange-300'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            <Flame className="h-3 w-3" />
                            {matchScore}% {t('cs_match_score')}
                          </span>
                        )}
                      </div>

                      {(cand.headline || cand.position) && (
                        <p className="text-xs font-semibold text-[#0B2545] mt-0.5 line-clamp-1">
                          {cand.headline || cand.position}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 flex-wrap">
                        {cand.company && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[120px]">{cand.company}</span>
                          </span>
                        )}
                        {cand.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-[#F97316] shrink-0" />
                            <span>{translateLocationSync(cand.location, language)}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bio */}
                  {cand.bio && (
                    <p className="text-xs text-slate-600 mt-3 line-clamp-2 leading-relaxed">
                      {cand.bio}
                    </p>
                  )}

                  {/* Skills Section */}
                  <div className="mt-3.5 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {t('cs_extracted_skills')}
                      </p>
                      {matchedSkillsList.length > 0 && (
                        <span className="text-[10px] font-bold text-emerald-700">
                          {matchedSkillsList.length} {language === 'ta' ? 'திறன்கள் பொருந்தின' : language === 'hi' ? 'कौशल मेल खाए' : 'skills matched'}
                        </span>
                      )}
                    </div>

                    {candidateSkills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {candidateSkills.map((sk) => {
                          const isJdMatch = matchedSkillsList.some(
                            (m) => m.toLowerCase() === sk.toLowerCase()
                          )
                          const isSearchMatch =
                            activeSkillTerm && sk.toLowerCase().includes(activeSkillTerm)
                          const isHighlighted = isJdMatch || isSearchMatch

                          return (
                            <span
                              key={sk}
                              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition ${
                                isHighlighted
                                  ? 'bg-[#F97316] text-white shadow-xs font-bold ring-2 ring-[#F97316]/30'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {isHighlighted && '✓ '}
                              {sk}
                            </span>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">
                        {language === 'ta' ? 'திறன்கள் குறிப்பிடப்படவில்லை' : language === 'hi' ? 'कोई कौशल सूचीबद्ध नहीं' : 'No skills listed yet'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Candidate Action Footer */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap text-xs">
                  {/* Left: View Profile & Resume */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenProfile) {
                          onOpenProfile(cand.id)
                        } else {
                          setSelectedCandidate(cand)
                        }
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-bold text-[#0B2545] hover:bg-gray-50 transition cursor-pointer"
                    >
                      <span>{language === 'ta' ? 'சுயவிவரம் காண்க' : language === 'hi' ? 'प्रोफ़ाइल देखें' : 'View Profile'}</span>
                    </button>

                    {cand.resume_url && (
                      <a
                        href={cand.resume_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-xs font-bold text-[#0B2545] hover:bg-[#0B2545] hover:text-white transition cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5 text-[#F97316]" />
                        <span>{t('cs_view_resume')}</span>
                        <ExternalLink className="h-3 w-3 opacity-60" />
                      </a>
                    )}
                  </div>

                  {/* Right: Direct Contact */}
                  <div className="flex items-center gap-1.5 ml-auto">
                    {cand.phone && (
                      <a
                        href={getWhatsAppLink(cand)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition cursor-pointer"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    )}

                    {cand.email && (
                      <a
                        href={`mailto:${cand.email}?subject=Career%20Opportunity%20via%20Namma%20Ooru%20Jobs`}
                        className="p-1.5 rounded-lg border border-gray-200 bg-white text-slate-600 hover:text-[#0B2545] hover:border-[#0B2545] transition cursor-pointer"
                        title={`Email ${cand.email}`}
                      >
                        <Mail className="h-3.5 w-3.5" />
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => handleInviteCandidate(cand)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#0B2545] text-white hover:bg-[#071A31] font-bold text-xs transition cursor-pointer"
                    >
                      {language === 'ta' ? 'அழைப்பு விடுக்க' : language === 'hi' ? 'आमंत्रित करें' : 'Invite'}
                    </button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* 5. Complete Candidate Profile Detail Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Avatar src={selectedCandidate.avatar_url} name={selectedCandidate.full_name} size="lg" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-[#0F172A]">
                      {selectedCandidate.full_name}
                    </h3>
                  </div>
                  <p className="text-xs font-semibold text-[#0B2545]">
                    {selectedCandidate.headline || selectedCandidate.position}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                    Candidate ID: {selectedCandidate.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Key Candidate Metadata */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  {language === 'ta' ? 'இருப்பிடம்' : language === 'hi' ? 'स्थान' : 'Location'}
                </span>
                <p className="font-semibold text-slate-700 flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3.5 w-3.5 text-[#F97316]" />
                  {selectedCandidate.location
                    ? translateLocationSync(selectedCandidate.location, language)
                    : (language === 'ta' ? 'குறிப்பிடப்படவில்லை' : language === 'hi' ? 'उल्लेखित नहीं' : 'Not specified')}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  {language === 'ta' ? 'நிறுவனம்' : language === 'hi' ? 'कंपनी' : 'Company'}
                </span>
                <p className="font-semibold text-slate-700 mt-0.5">
                  {selectedCandidate.company || (language === 'ta' ? 'குறிப்பிடப்படவில்லை' : language === 'hi' ? 'उल्लेखित नहीं' : 'Not specified')}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  {t('profile_phone')}
                </span>
                <p className="font-semibold text-slate-700 mt-0.5">
                  {selectedCandidate.phone || (language === 'ta' ? 'குறிப்பிடப்படவில்லை' : language === 'hi' ? 'उल्लेखित नहीं' : 'Not specified')}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  {t('apply_email')}
                </span>
                <p className="font-semibold text-slate-700 truncate mt-0.5">
                  {selectedCandidate.email}
                </p>
              </div>
            </div>

            {/* Bio Summary */}
            {selectedCandidate.bio && (
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  {t('cs_about')}
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed bg-white p-3.5 rounded-xl border border-gray-100">
                  {selectedCandidate.bio}
                </p>
              </div>
            )}

            {/* Extracted Skills */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                {t('cs_extracted_skills')}
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {parseSkillsArray(selectedCandidate.skills).map((sk) => (
                  <span
                    key={sk}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#0B2545]/5 text-[#0B2545] border border-[#0B2545]/10"
                  >
                    {sk}
                  </span>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
              {selectedCandidate.resume_url ? (
                <a
                  href={selectedCandidate.resume_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#0B2545] text-xs font-bold transition cursor-pointer"
                >
                  <FileText className="h-4 w-4 text-[#F97316]" />
                  <span>{t('cs_view_resume')}</span>
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </a>
              ) : (
                <span className="text-xs text-slate-400">
                  {language === 'ta' ? 'தன்விவரக் குறிப்பு ஆவணம் இல்லை' : language === 'hi' ? 'कोई बायोडाटा दस्तावेज़ नहीं' : 'No resume document'}
                </span>
              )}

              <div className="flex items-center gap-2">
                {onOpenProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      const id = selectedCandidate.id
                      setSelectedCandidate(null)
                      onOpenProfile(id)
                    }}
                    className="px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-[#0B2545] text-xs font-bold transition cursor-pointer"
                  >
                    {language === 'ta' ? 'முழு விவரம்' : language === 'hi' ? 'पूरी प्रोफ़ाइल' : 'Full Profile'}
                  </button>
                )}
                {selectedCandidate.phone && (
                  <a
                    href={getWhatsAppLink(selectedCandidate)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>WhatsApp</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => {
                    handleInviteCandidate(selectedCandidate)
                    setSelectedCandidate(null)
                  }}
                  className="px-4 py-2 rounded-xl bg-[#0B2545] hover:bg-[#071A31] text-white text-xs font-bold transition cursor-pointer"
                >
                  {language === 'ta' ? 'நேர்காணலுக்கு அழைக்க' : language === 'hi' ? 'साक्षात्कार हेतु आमंत्रित करें' : 'Invite to Interview'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
