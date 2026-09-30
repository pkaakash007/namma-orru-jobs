import React, { useState } from 'react'
import {
  Search,
  Building2,
  ChevronDown,
  ChevronRight,
  Home,
  Monitor,
  Users2,
  TrendingUp,
  BarChart3,
  Settings,
  GraduationCap,
  X,
  Languages,
  Check,
  ArrowRight,
  Smartphone,
  Briefcase,
  UserCheck,
  Users,
} from 'lucide-react'
import { useLanguage } from '../../../context/LanguageContext'
import { useAuth } from '../../../context/AuthContext'
import { GoogleLocationSearchInput } from '../../ui/GoogleLocationSearchInput'
import type { SupportedLanguage } from '../../../utils/i18n'
import type { Job } from '../../../types'
import { ALL_38_TN_DISTRICTS } from '../../../constants/clusters'
import {
  translateLocationSync,
  formatWorkplaceType,
  translateJobTitleSync,
  translateCompanySync,
} from '../../../services/googleAiTranslate'

interface PublicHomePageProps {
  onNavigateToLogin: () => void
  onExploreJobs: (query?: string, city?: string) => void
  onPostJob: () => void
  totalJobsCount?: number
  featuredJobs?: Job[]
}

export const PublicHomePage: React.FC<PublicHomePageProps> = ({
  onNavigateToLogin,
  onExploreJobs,
  onPostJob,
  totalJobsCount = 50,
  featuredJobs = [],
}) => {
  const { user, selectedRole, setSelectedRole } = useAuth()
  const { language, setLanguage, languages, t } = useLanguage()
  const [showLangMenu, setShowLangMenu] = useState(false)
  const [showExpMenu, setShowExpMenu] = useState(false)
  const [showEmployerMenu, setShowEmployerMenu] = useState(false)
  const [showAppBanner, setShowAppBanner] = useState(true)

  const [skillsQuery, setSkillsQuery] = useState('')
  const [selectedExperience, setSelectedExperience] = useState('')
  const [locationQuery, setLocationQuery] = useState('')

  const currentLanguageOption = languages.find((l) => l.code === language) || languages[0]

  const experienceOptions = [
    'Fresher (less than 1 year)',
    '1 - 2 years',
    '3 - 5 years',
    '5 - 8 years',
    '8+ years',
  ]

  const quickCities = [
    { label: 'All Tamil Nadu', value: '' },
    { label: 'Chennai', value: 'Chennai' },
    { label: 'Coimbatore', value: 'Coimbatore' },
    { label: 'Madurai', value: 'Madurai' },
    { label: 'Trichy', value: 'Trichy' },
    { label: 'Remote', value: 'Remote' },
  ]

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onExploreJobs(skillsQuery.trim(), locationQuery.trim())
  }

  // Curated sectors — counts computed dynamically from live DB jobs
  const curatedSectors = [
    { title: 'Software & IT',    query: 'Software',      keywords: ['software', 'it', 'developer', 'engineer', 'react', 'node', 'java', 'python', 'fullstack'], icon: <Monitor className="h-5 w-5 text-[#0B2545]" />, bg: 'bg-blue-50/80' },
    { title: 'Remote Work',      query: 'Remote',        keywords: ['remote', 'work from home', 'wfh', 'hybrid'],                                              icon: <Home className="h-5 w-5 text-[#0B2545]" />,    bg: 'bg-emerald-50/80' },
    { title: 'MNC & Corporate',  query: 'MNC',           keywords: ['mnc', 'corporate', 'global', 'multinational'],                                            icon: <Building2 className="h-5 w-5 text-[#0B2545]" />, bg: 'bg-indigo-50/80' },
    { title: 'Sales & Growth',   query: 'Sales',         keywords: ['sales', 'business development', 'bde', 'growth', 'marketing'],                           icon: <TrendingUp className="h-5 w-5 text-[#0B2545]" />, bg: 'bg-orange-50/80' },
    { title: 'HR & Recruiting',  query: 'HR',            keywords: ['hr', 'human resource', 'recruiter', 'talent'],                                            icon: <Users2 className="h-5 w-5 text-[#0B2545]" />,    bg: 'bg-purple-50/80' },
    { title: 'Data & Analytics', query: 'Data Analytics',keywords: ['data', 'analytics', 'bi', 'tableau', 'sql', 'analyst'],                                   icon: <BarChart3 className="h-5 w-5 text-[#0B2545]" />,  bg: 'bg-cyan-50/80' },
    { title: 'Engineering',      query: 'Engineering',   keywords: ['mechanical', 'civil', 'electrical', 'engineer', 'manufacturing', 'production'],           icon: <Settings className="h-5 w-5 text-[#0B2545]" />,   bg: 'bg-amber-50/80' },
    { title: 'Fresher Roles',    query: 'Fresher',       keywords: ['fresher', 'trainee', 'intern', 'entry level', 'graduate'],                                icon: <GraduationCap className="h-5 w-5 text-[#0B2545]" />, bg: 'bg-teal-50/80' },
  ]

  // Compute dynamic sector counts from real DB jobs
  const getSectorCount = (keywords: string[]): number => {
    if (featuredJobs.length === 0) return 0
    return featuredJobs.filter((j) => {
      const hay = `${j.title} ${j.description || ''} ${j.workplace_type || ''}`.toLowerCase()
      return keywords.some((kw) => hay.includes(kw))
    }).length
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans selection:bg-[#0B2545] selection:text-white">
      {/* 1. Refined Responsive Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 h-[58px] sm:h-[64px] px-3.5 sm:px-8 shadow-2xs">
        <div className="max-w-6xl mx-auto h-full flex items-center justify-between">
          {/* Left: Brand Logo & Desktop Nav */}
          <div className="flex items-center gap-6 lg:gap-8 shrink-0">
            <div
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="flex items-center gap-2 cursor-pointer transition hover:opacity-90 shrink-0"
              title="Home"
            >
              <img
                src="/logo.png"
                onError={(e) => {
                  e.currentTarget.src = '/logo-icon.png'
                }}
                alt="NAMMA OORU JOBS"
                className="h-8 sm:h-9 w-auto object-contain"
              />
              <span className="text-xs sm:text-sm font-black tracking-tight text-[#0B2545] whitespace-nowrap">
                NAMMA OORU <span className="text-[#F97316]">JOBS</span>
              </span>
            </div>

            {/* Desktop Navigation items */}
            <nav className="hidden md:flex items-center gap-5 text-xs sm:text-sm font-medium text-slate-600">
              <button
                onClick={() => onExploreJobs()}
                className="hover:text-[#0B2545] transition cursor-pointer"
              >
                Jobs
              </button>
              <button
                onClick={() => onExploreJobs('', 'Chennai')}
                className="hover:text-[#0B2545] transition cursor-pointer"
              >
                Companies
              </button>
              <button
                onClick={() => onExploreJobs('Remote')}
                className="hover:text-[#0B2545] transition cursor-pointer"
              >
                Services
              </button>
            </nav>
          </div>

          {/* Right: Language Selector & Primary Action */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Minimalist Language Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center gap-1 sm:gap-1.5 rounded-full border border-slate-200 bg-slate-50/80 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                title="Change Language"
              >
                <Languages className="h-3.5 w-3.5 text-[#0B2545]" />
                <span className="hidden sm:inline">{currentLanguageOption.nativeName}</span>
                <span className="sm:hidden uppercase">{currentLanguageOption.code}</span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {showLangMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowLangMenu(false)} />
                  <div className="absolute right-0 mt-2 w-40 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-50 text-xs">
                    {languages.map((l) => (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => {
                          setLanguage(l.code as SupportedLanguage)
                          setShowLangMenu(false)
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition cursor-pointer ${
                          language === l.code
                            ? 'bg-[#0B2545]/10 text-[#0B2545] font-bold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{l.nativeName}</span>
                        {language === l.code && <Check className="h-3.5 w-3.5 text-[#0B2545]" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Primary Action Button */}
            {user ? (
              <button
                onClick={() => onExploreJobs()}
                className="rounded-full bg-[#0B2545] hover:bg-[#0B2545]/90 px-3.5 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white transition cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <span>Browse Jobs</span>
                <span>→</span>
              </button>
            ) : (
              <button
                onClick={onNavigateToLogin}
                className="rounded-full bg-[#0B2545] hover:bg-[#0B2545]/90 px-3.5 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white transition cursor-pointer shadow-xs whitespace-nowrap"
              >
                <span className="hidden sm:inline">Login / Register</span>
                <span className="sm:hidden">Sign In</span>
              </button>
            )}

            {/* Desktop Employers dropdown */}
            <div className="relative hidden lg:block">
              <button
                type="button"
                onClick={() => setShowEmployerMenu(!showEmployerMenu)}
                className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-[#0B2545] pl-2 cursor-pointer"
              >
                <span>For employers</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {showEmployerMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowEmployerMenu(false)} />
                  <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-lg z-50 text-xs">
                    <button
                      onClick={() => {
                        setShowEmployerMenu(false)
                        setSelectedRole('manager')
                        onPostJob()
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg font-semibold text-slate-800 hover:bg-slate-50 hover:text-[#0B2545] cursor-pointer"
                    >
                      Post a Job (HR)
                    </button>
                    <button
                      onClick={() => {
                        setShowEmployerMenu(false)
                        setSelectedRole('manager')
                        onNavigateToLogin()
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg font-semibold text-slate-800 hover:bg-slate-50 hover:text-[#0B2545] cursor-pointer"
                    >
                      Employer / HR Login
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10 space-y-8 sm:space-y-12">
        {/* 2. Hero Section: Clean Editorial Style */}
        <section className="text-center pt-2 sm:pt-4">
          {/* Dual Role Selector: Job Seeker vs HR Recruiter */}
          <div className="flex justify-center mb-3">
            <div className="inline-flex p-1 rounded-full bg-white border border-slate-200/90 shadow-xs">
              <button
                type="button"
                onClick={() => setSelectedRole('employee')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                  selectedRole === 'employee'
                    ? 'bg-[#0B2545] text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#0B2545]'
                }`}
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Job Seeker</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole('manager')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                  selectedRole === 'manager'
                    ? 'bg-[#F97316] text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#0B2545]'
                }`}
              >
                <Briefcase className="h-3.5 w-3.5" />
                <span>Employer / HR</span>
              </button>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200/60 text-[#EA580C] text-[11px] font-bold tracking-wide">
            <Briefcase className="h-3.5 w-3.5 text-[#EA580C]" />
            <span>
              {selectedRole === 'manager'
                ? 'Employer & HR Recruitment Suite'
                : 'Tamil Nadu\'s #1 Career Network'}
            </span>
          </div>

          <h1 className="mt-3 text-2xl sm:text-5xl font-black text-[#0B2545] tracking-tight leading-tight">
            {selectedRole === 'manager'
              ? 'Hire Top Verified Talent in Tamil Nadu'
              : 'Find your dream job now'}
          </h1>
          <p className="mt-2 text-xs sm:text-base text-slate-500 font-medium max-w-xl mx-auto leading-relaxed">
            {selectedRole === 'manager'
              ? 'Post job openings, search candidate resumes by AI-extracted skills, and connect directly with hiring managers.'
              : `${totalJobsCount}+ verified openings across Chennai, Coimbatore & all districts`}
          </p>

          {/* 3. Search Capsule (High-End Responsive Architecture) */}
          <div className="mt-6 sm:mt-8 max-w-3xl mx-auto">
            {/* Desktop Unified Search Form */}
            <form
              onSubmit={handleSearchSubmit}
              className="hidden md:flex bg-white rounded-full border border-slate-200/90 shadow-md p-1.5 items-center transition focus-within:border-[#0B2545] focus-within:ring-2 focus-within:ring-[#0B2545]/10"
            >
              {/* Segment 1: Skills / Titles */}
              <div className="flex-1 flex items-center gap-2.5 px-4">
                <Search className="h-4 w-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Enter skills / designations / companies"
                  value={skillsQuery}
                  onChange={(e) => setSkillsQuery(e.target.value)}
                  className="w-full text-xs sm:text-sm bg-transparent border-none outline-none text-[#0F172A] placeholder:text-slate-400"
                />
              </div>

              <div className="h-5 w-px bg-slate-200" />

              {/* Segment 2: Experience Dropdown */}
              <div className="relative w-48 px-3">
                <button
                  type="button"
                  onClick={() => setShowExpMenu(!showExpMenu)}
                  className="w-full flex items-center justify-between text-xs text-left text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  <span className={`truncate ${selectedExperience ? 'text-[#0B2545] font-semibold' : ''}`}>
                    {selectedExperience || 'Experience'}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                </button>

                {showExpMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowExpMenu(false)} />
                    <div className="absolute left-0 mt-3 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-50 text-left">
                      {experienceOptions.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            setSelectedExperience(opt)
                            setShowExpMenu(false)
                          }}
                          className="w-full px-3 py-2 rounded-lg text-xs font-medium text-slate-800 hover:bg-slate-50 transition cursor-pointer text-left"
                        >
                          {opt}
                        </button>
                      ))}
                      {selectedExperience && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedExperience('')
                            setShowExpMenu(false)
                          }}
                          className="w-full px-3 py-1.5 text-xs text-[#F97316] font-semibold hover:underline text-left border-t border-slate-100 mt-1"
                        >
                          Clear experience
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="h-5 w-px bg-slate-200" />

              {/* Segment 3: Location */}
              <div className="w-56 px-2">
                <GoogleLocationSearchInput
                  value={locationQuery}
                  onChange={setLocationQuery}
                  placeholder={
                    language === 'ta'
                      ? 'இருப்பிடம் (எ.கா. சென்னை)'
                      : language === 'hi'
                      ? 'स्थान (उदा. चेन्नई)'
                      : 'Location (City...)'
                  }
                  inputClassName="border-none shadow-none text-xs sm:text-sm bg-transparent py-1 pl-8 text-[#0F172A] focus:ring-0 focus:border-none"
                />
              </div>

              {/* Action Button */}
              <button
                type="submit"
                className="rounded-full bg-[#F97316] hover:bg-[#ea580c] text-white font-bold px-7 py-2.5 text-sm transition shrink-0 cursor-pointer shadow-xs active:scale-95"
              >
                {language === 'ta' ? 'தேடுக' : language === 'hi' ? 'खोजें' : 'Search'}
              </button>
            </form>

            {/* Mobile Streamlined Search Capsule */}
            <form
              onSubmit={handleSearchSubmit}
              className="md:hidden bg-white rounded-2xl border border-slate-200 shadow-md p-3 space-y-2.5 text-left text-xs transition focus-within:border-[#0B2545]"
            >
              {/* Row 1: Search Query */}
              <div className="flex items-center gap-2.5 px-2 py-1 bg-slate-50 rounded-xl border border-slate-100">
                <Search className="h-4 w-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder={
                    language === 'ta'
                      ? 'வேலை தலைப்பு, திறன், அல்லது நிறுவனம்'
                      : language === 'hi'
                      ? 'पद, कौशल, या कंपनी'
                      : 'Job title, skill, or company'
                  }
                  value={skillsQuery}
                  onChange={(e) => setSkillsQuery(e.target.value)}
                  className="w-full text-xs bg-transparent border-none outline-none text-slate-900 placeholder:text-slate-400"
                />
              </div>

              {/* Row 2: Location & Search Button */}
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-50 rounded-xl border border-slate-100 px-1 py-0.5">
                  <GoogleLocationSearchInput
                    value={locationQuery}
                    onChange={setLocationQuery}
                    placeholder={
                      language === 'ta'
                        ? 'இருப்பிடம் (சென்னை...)'
                        : language === 'hi'
                        ? 'स्थान (चेन्नई...)'
                        : 'Location (City...)'
                    }
                    inputClassName="border-none shadow-none text-xs bg-transparent py-1 pl-8 text-slate-900 focus:ring-0 focus:border-none"
                  />
                </div>

                <button
                  type="submit"
                  className="rounded-xl bg-[#F97316] hover:bg-[#ea580c] text-white font-bold px-5 py-2.5 text-xs transition shrink-0 cursor-pointer shadow-xs flex items-center gap-1 active:scale-95"
                >
                  <span>{language === 'ta' ? 'தேடுக' : language === 'hi' ? 'खोजें' : 'Search'}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>

            {/* Quick Filter City Pills (Mobile & Desktop) */}
            <div className="mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 mr-1 hidden sm:inline">
                Hubs:
              </span>
              {quickCities.map((city) => (
                <button
                  key={city.label}
                  type="button"
                  onClick={() => {
                    setLocationQuery(city.value)
                    onExploreJobs('', city.value)
                  }}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:border-[#0B2545] hover:text-[#0B2545] transition cursor-pointer whitespace-nowrap shadow-2xs shrink-0 active:scale-95"
                >
                  {city.label}
                </button>
              ))}
            </div>

            {/* HR Recruiter Human iOS Action Card */}
            {selectedRole === 'manager' && (
              <div className="mt-5 p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 max-w-xl mx-auto text-center shadow-xs">
                <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                  <Briefcase className="h-4 w-4" />
                </div>
                <h4 className="text-sm font-semibold text-slate-900 mb-1">
                  {t('hr_suite_card_title')}
                </h4>
                <p className="text-xs text-slate-500 mb-3.5 max-w-md mx-auto leading-relaxed">
                  {t('hr_suite_card_desc')}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('manager')
                      onPostJob()
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B2545] hover:bg-[#0B2545]/90 text-white text-xs font-semibold transition cursor-pointer active:scale-95"
                  >
                    <Briefcase className="h-3.5 w-3.5" />
                    <span>{t('hr_suite_post_btn')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('manager')
                      onNavigateToLogin()
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer active:scale-95"
                  >
                    <Users className="h-3.5 w-3.5" />
                    <span>{t('hr_suite_login_btn')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 4. Curated Sectors Grid */}
        <section className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              Popular Sectors
            </h2>
            <button
              onClick={() => onExploreJobs()}
              className="text-xs font-semibold text-[#0B2545] hover:text-[#F97316] transition cursor-pointer flex items-center gap-1"
            >
              <span>Explore all</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
            {curatedSectors.map((sector) => {
              const count = getSectorCount(sector.keywords)
              return (
                <div
                  key={sector.title}
                  onClick={() => onExploreJobs(sector.query)}
                  className="group p-3 sm:p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs hover:border-[#0B2545] hover:shadow-xs transition cursor-pointer active:scale-[0.98] flex items-center gap-3"
                >
                  <div className={`h-10 w-10 rounded-xl ${sector.bg} flex items-center justify-center shrink-0 transition group-hover:scale-105`}>
                    {sector.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-xs sm:text-sm text-slate-900 truncate group-hover:text-[#0B2545] transition">
                      {sector.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                      {count > 0 ? `${count} open role${count !== 1 ? 's' : ''}` : 'Explore jobs'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>


        {/* 5. Featured Live Roles (Real Value on Home) */}
        {featuredJobs.length > 0 && (
          <section className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  Featured Openings
                </h2>
                <p className="text-xs text-slate-400">
                  Verified roles hiring actively across Tamil Nadu
                </p>
              </div>
              <button
                onClick={() => onExploreJobs()}
                className="text-xs font-semibold text-[#0B2545] hover:text-[#F97316] transition cursor-pointer"
              >
                View all ({totalJobsCount}) →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {featuredJobs.map((j) => (
                <div
                  key={j.id}
                  onClick={() => onExploreJobs(j.title)}
                  className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs hover:border-[#0B2545] hover:shadow-xs transition cursor-pointer active:scale-[0.99] flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                      {j.company_name?.charAt(0).toUpperCase() || 'J'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-xs text-slate-900 line-clamp-1 hover:text-[#0B2545]">
                        {translateJobTitleSync(j.title, language) || j.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {translateCompanySync(j.company_name, language)} · {translateLocationSync(j.location, language)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                    <span className="text-slate-500 font-medium">
                      {formatWorkplaceType(j.workplace_type, language)}
                    </span>
                    <span className="font-bold text-[#F97316] hover:underline flex items-center gap-1">
                      {language === 'ta'
                        ? 'விண்ணப்பி →'
                        : language === 'hi'
                        ? 'आवेदन करें →'
                        : 'Apply →'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 6. Native Android App Highlight Card */}
        <section className="rounded-2xl border border-slate-200/90 bg-gradient-to-r from-[#0B2545] to-[#123966] text-white p-5 sm:p-7 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-lg">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-white/90 text-[10px] font-bold uppercase tracking-wider">
                <Smartphone className="h-3 w-3 text-[#F97316]" />
                <span>Native Android App</span>
              </div>
              <h3 className="text-base sm:text-xl font-bold tracking-tight">
                Namma Ooru Jobs on your phone
              </h3>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                Get real-time WhatsApp & push notifications, 1-tap fast apply, and localized Tamil Nadu updates.
              </p>
            </div>

            <button
              onClick={() => {
                window.history.pushState({}, '', '/apk')
                window.dispatchEvent(new PopStateEvent('popstate'))
              }}
              className="rounded-xl bg-[#F97316] hover:bg-[#ea580c] px-5 py-2.5 text-xs sm:text-sm font-bold text-white transition cursor-pointer shadow-xs shrink-0 self-start sm:self-center flex items-center gap-2 active:scale-95"
            >
              <span>Download Free APK (v1.0.0)</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        {/* 7. For Employers Callout Strip */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">
              Hiring talent in Tamil Nadu?
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {totalJobsCount > 0
                ? `${totalJobsCount}+ verified openings live now — post a job and connect with local talent.`
                : 'Post a job and connect with verified professionals and freshers across Tamil Nadu.'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onPostJob}
              className="rounded-lg bg-[#0B2545] hover:bg-[#0B2545]/90 text-white font-semibold text-xs px-4 py-2 transition cursor-pointer"
            >
              Post a Job Free
            </button>
            <button
              onClick={onNavigateToLogin}
              className="rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs px-4 py-2 transition cursor-pointer"
            >
              Recruiter Login
            </button>
          </div>
        </section>
      </main>

      {/* 8. Desktop Floating Download Badge */}
      {showAppBanner && (
        <div className="fixed bottom-5 left-5 z-40 hidden lg:flex items-center">
          <div className="relative flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-200 shadow-xl hover:shadow-2xl transition-all">
            <div
              onClick={() => {
                window.history.pushState({}, '', '/apk')
                window.dispatchEvent(new PopStateEvent('popstate'))
              }}
              className="flex items-center gap-3 pr-6 cursor-pointer group"
            >
              <div className="h-11 w-11 rounded-xl bg-slate-900 flex items-center justify-center shadow-xs group-hover:scale-105 transition shrink-0">
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3.6 1.8L13.8 12 3.6 22.2C3.2 21.6 3 20.8 3 19.8V4.2C3 3.2 3.2 2.4 3.6 1.8Z"
                    fill="#00C3FF"
                  />
                  <path
                    d="M17.6 8.2L13.8 12L17.6 15.8L21.8 13.4C22.6 12.9 22.6 12.1 21.8 11.6L17.6 8.2Z"
                    fill="#FFD600"
                  />
                  <path
                    d="M3.6 22.2L13.8 12L17.6 15.8L5.8 22.5C4.9 23 4.1 22.8 3.6 22.2Z"
                    fill="#00E676"
                  />
                  <path
                    d="M3.6 1.8C4.1 1.2 4.9 1 5.8 1.5L17.6 8.2L13.8 12L3.6 1.8Z"
                    fill="#FF3333"
                  />
                </svg>
              </div>

              <div className="text-left select-none">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                  GET IT ON
                </p>
                <p className="text-xs font-black text-[#0B2545] tracking-tight group-hover:text-[#F97316] transition leading-tight mt-0.5">
                  Google Play
                </p>
                <p className="text-[10px] text-slate-500 font-medium">
                  Free Android App
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowAppBanner(false)}
              className="absolute top-2 right-2 text-slate-400 hover:text-slate-700 transition p-1 cursor-pointer"
              aria-label="Close download card"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* 9. Minimalist Human Footer */}
      <footer className="mt-auto bg-white border-t border-slate-200/80 py-8 px-4 sm:px-8 text-xs text-slate-500">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Tamil Nadu 38 Districts */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {language === 'ta'
                ? 'தமிழ்நாடு மாவட்டங்கள் வாரியாக வேலைகள்:'
                : language === 'hi'
                ? 'तमिलनाडु जिले वार नौकरियां:'
                : 'Tamil Nadu Jobs by District:'}
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-slate-500">
              {ALL_38_TN_DISTRICTS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => onExploreJobs('', d.nameEn)}
                  className="hover:text-[#0B2545] hover:underline cursor-pointer"
                >
                  {language === 'ta' ? d.nameTa : language === 'hi' ? d.nameHi : d.nameEn}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#0B2545]">
                NAMMA OORU <span className="text-[#F97316]">JOBS</span>
              </span>
              <span>•</span>
              <span>All rights reserved © 2026</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
              <a href="#" className="hover:text-[#0B2545] transition">About Us</a>
              <a href="#" className="hover:text-[#0B2545] transition">Careers</a>
              <a href="#" className="hover:text-[#0B2545] transition">Employer Hub</a>
              <a href="#" className="hover:text-[#0B2545] transition">Privacy Policy</a>
              <a href="#" className="hover:text-[#0B2545] transition">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
