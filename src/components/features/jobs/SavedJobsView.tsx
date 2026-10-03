import React, { useState, useEffect, useMemo, useCallback } from 'react'
import type { Job } from '../../../types'
import { JobCard } from './JobCard'
import { savedJobService } from '../../../services/api'
import { useLanguage } from '../../../context/LanguageContext'
import { useAuth } from '../../../context/AuthContext'
import { Card } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { Bookmark, Search, ArrowLeft, Briefcase } from 'lucide-react'

interface SavedJobsViewProps {
  onApply: (job: Job) => void
  onMatchCandidates?: (job: Job) => void
  onViewApplications?: (job: Job) => void
  onBack?: () => void
  onBrowseJobs?: () => void
}

export const SavedJobsView: React.FC<SavedJobsViewProps> = ({
  onApply,
  onMatchCandidates,
  onViewApplications,
  onBack,
  onBrowseJobs,
}) => {
  const { t, language } = useLanguage()
  const { user } = useAuth()
  const isHR = user?.role === 'manager' || user?.role === 'admin'
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const loadSavedJobs = useCallback(async () => {
    if (isHR) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await savedJobService.getSavedJobs()
      setJobs(data)
    } catch (err) {
      console.error('Failed to load saved jobs:', err)
    } finally {
      setLoading(false)
    }
  }, [isHR])

  useEffect(() => {
    if (isHR) {
      setLoading(false)
      return
    }
    loadSavedJobs()

    // Listen for cross-component bookmark updates
    const handleSavedUpdate = (e: Event) => {
      const custom = e as CustomEvent<{ jobId: string; saved: boolean }>
      if (custom.detail) {
        if (!custom.detail.saved) {
          // Remove from local list immediately
          setJobs((prev) => prev.filter((j) => j.id !== custom.detail.jobId))
        } else {
          // Refresh list to pull full job data
          loadSavedJobs()
        }
      }
    }

    window.addEventListener('saved_jobs_updated', handleSavedUpdate)
    return () => window.removeEventListener('saved_jobs_updated', handleSavedUpdate)
  }, [loadSavedJobs])

  const filteredJobs = useMemo(() => {
    if (!searchQuery.trim()) return jobs
    const q = searchQuery.toLowerCase().trim()
    return jobs.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        j.company_name.toLowerCase().includes(q) ||
        j.location.toLowerCase().includes(q) ||
        (j.workplace_type && j.workplace_type.toLowerCase().includes(q))
    )
  }, [jobs, searchQuery])

  if (isHR) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-lg mx-auto shadow-xs">
          <div className="h-12 w-12 rounded-full bg-blue-50 text-[#0B2545] flex items-center justify-center mx-auto mb-4">
            <Bookmark className="h-6 w-6 text-[#0B2545]" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">
            {language === 'ta' ? 'புக்மார்க் வேலைகள்' : language === 'hi' ? 'सहेजी गई नौकरियां' : 'Saved Jobs & Bookmarks'}
          </h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            {language === 'ta'
              ? 'வேலைகளைச் சேமிப்பது வேலை தேடுபவர்களுக்கு மட்டுமே. மனிதவளக் கணக்காக, உங்கள் வேலைப் பட்டியல்களை நேரடியாக நிர்வகிக்கலாம் அல்லது விண்ணப்பதாரர்களைத் தேடலாம்.'
              : language === 'hi'
              ? 'नौकरियों को बुकमार्क करना केवल नौकरी चाहने वालों के लिए उपलब्ध है। भर्तीकर्ता के रूप में, आप अपनी नौकरियों का प्रबंधन कर सकते हैं या उम्मीदवारों की खोज कर सकते हैं।'
              : 'Bookmarking and saving jobs is designed exclusively for Job Seekers (Employees). As an HR recruiter, you can manage your posted job openings or search verified candidates.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {onBrowseJobs && (
              <Button variant="primary" onClick={onBrowseJobs}>
                {language === 'ta' ? 'அனைத்து வேலைகள்' : language === 'hi' ? 'सभी नौकरियां देखें' : 'View All Jobs'}
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Header Bar */}
      <Card className="p-4 sm:p-5 shadow-xs border-[#E0DFDC]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-2 -ml-1 text-slate-500 hover:text-[#0B2545] hover:bg-slate-100 rounded-full transition cursor-pointer"
                title="Go back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0B2545]/10 text-[#0B2545]">
              <Bookmark className="h-6 w-6 fill-[#0B2545] text-[#0B2545]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-[#0B2545] tracking-tight">
                  {t('saved_jobs_title') || 'Saved Jobs'}
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('saved_jobs_subtitle') || 'Jobs you have bookmarked for later.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {(onBrowseJobs || onBack) && (
              <Button
                variant="outline"
                size="sm"
                onClick={onBrowseJobs || onBack}
                className="rounded-full text-xs font-bold border-[#0B2545] text-[#0B2545] hover:bg-[#0B2545]/5"
              >
                <Briefcase className="h-3.5 w-3.5 mr-1 text-[#F97316]" />
                <span>{t('saved_jobs_browse_btn') || 'Browse All Jobs'}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Filter within Saved Jobs */}
        {jobs.length > 0 && (
          <div className="mt-4 pt-3.5 border-t border-gray-100 flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('saved_jobs_search_placeholder') || 'Search within saved jobs...'}
                className="w-full rounded-xl border border-gray-200 bg-slate-50/70 py-1.5 pl-8 pr-3 text-xs text-[#0F172A] placeholder-slate-400 focus:border-[#0B2545] focus:bg-white focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  ×
                </button>
              )}
            </div>
            <div className="text-xs text-slate-500 shrink-0 font-medium hidden sm:block">
              {filteredJobs.length} of {jobs.length} shown
            </div>
          </div>
        )}
      </Card>

      {/* Content Area */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-5 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-lg bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 bg-slate-200 rounded" />
                  <div className="h-3 w-1/4 bg-slate-100 rounded" />
                  <div className="h-3 w-1/2 bg-slate-100 rounded" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : filteredJobs.length > 0 ? (
        <div className="space-y-3">
          {filteredJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onApply={onApply}
              onMatchCandidates={onMatchCandidates}
              onViewApplications={onViewApplications}
            />
          ))}
        </div>
      ) : jobs.length > 0 && searchQuery ? (
        /* Empty Search Results */
        <Card className="p-8 text-center bg-white shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 mb-3">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {language === 'ta' ? 'பொருத்தமான வேலைகள் இல்லை' : language === 'hi' ? 'कोई मेल खाती नौकरी नहीं मिली' : 'No matching saved jobs'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {language === 'ta'
              ? `"${searchQuery}" என்ற தேடலுக்கு எந்த சேமிக்கப்பட்ட வேலையும் பொருந்தவில்லை.`
              : language === 'hi'
              ? `"${searchQuery}" से मेल खाने वाली कोई सहेजी गई नौकरी नहीं मिली।`
              : `No saved jobs match "${searchQuery}". Try a different keyword.`}
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="mt-3 text-xs font-bold text-[#F97316] hover:underline cursor-pointer"
          >
            {t('jobs_clear_search') || 'Clear search'}
          </button>
        </Card>
      ) : (
        /* Zero Saved Jobs State */
        <Card className="p-10 text-center bg-white shadow-xs border-[#E0DFDC]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-4">
            <Bookmark className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-[#0F172A]">
            {t('saved_jobs_empty_title') || 'No saved jobs yet'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
            {t('saved_jobs_empty_desc') ||
              'Tap the bookmark icon on any job card to save it here for quick access and applying later.'}
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            {(onBrowseJobs || onBack) && (
              <Button
                variant="orange"
                onClick={onBrowseJobs || onBack}
                className="rounded-full px-6 py-2 text-xs font-bold shadow-xs flex items-center gap-2"
              >
                <Briefcase className="h-4 w-4" />
                <span>{t('saved_jobs_browse_btn') || 'Browse All Jobs'}</span>
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
