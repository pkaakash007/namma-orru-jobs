import React, { useState, useEffect } from 'react'
import type { Job } from '../../../types'
import { Card } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { Building2, MapPin, Clock, Bookmark, Users, Languages, Check, FileText, Maximize2, X } from 'lucide-react'
import { useLanguage } from '../../../context/LanguageContext'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../context/ToastContext'
import { savedJobService } from '../../../services/api'
import {
  translateWithGoogleAi,
  translateLocationSync,
  translateLocation,
  translateJobTitleSync,
  translateCompanySync,
  translatePosterName,
  formatSalary,
  getCachedTranslation,
} from '../../../services/googleAiTranslate'
import { parseDateUTC } from '../../../utils/date'

interface JobCardProps {
  job: Job
  onApply: (job: Job) => void
  onMatchCandidates?: (job: Job) => void
  onViewApplications?: (job: Job) => void
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  onApply,
  onMatchCandidates,
  onViewApplications,
}) => {
  const { t, language } = useLanguage()
  const { user, hasRole } = useAuth()
  const { showToast } = useToast()
  const isHR = hasRole(['admin', 'manager'])

  const [isSaved, setIsSaved] = useState<boolean>(() => savedJobService.isSavedSync(job.id))
  const [isSaving, setIsSaving] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)

  // Applied state — check sessionStorage cache populated after apply or on load
  const [isApplied, setIsApplied] = useState<boolean>(() => {
    try {
      const cached = sessionStorage.getItem('applied_job_ids')
      if (cached) {
        const ids: string[] = JSON.parse(cached)
        return ids.includes(job.id)
      }
    } catch {}
    return false
  })

  // Sync saved state when other components dispatch saved_jobs_updated
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ jobId: string; saved: boolean }>
      if (custom.detail?.jobId === job.id) {
        setIsSaved(Boolean(custom.detail.saved))
      }
    }
    window.addEventListener('saved_jobs_updated', handler)
    return () => window.removeEventListener('saved_jobs_updated', handler)
  }, [job.id])

  // Listen for job_applied event to update button immediately after submission
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ jobId: string }>
      if (custom.detail?.jobId === job.id) {
        setIsApplied(true)
      }
    }
    window.addEventListener('job_applied', handler)
    return () => window.removeEventListener('job_applied', handler)
  }, [job.id])

  const [translatedTitle, setTranslatedTitle] = useState<string | null>(() =>
    translateJobTitleSync(job.title, language)
  )
  const [translatedDesc, setTranslatedDesc] = useState<string | null>(() =>
    getCachedTranslation(job.description, language)
  )
  const [translatedLocation, setTranslatedLocation] = useState<string | null>(() =>
    translateLocationSync(job.location, language)
  )
  const [showOriginal, setShowOriginal] = useState(false)

  // Automatically translate job title, description & location with Google AI when language switches
  useEffect(() => {
    setShowOriginal(false)

    // Immediate synchronous dictionary lookup for 0ms instantaneous display
    setTranslatedTitle(translateJobTitleSync(job.title, language))
    setTranslatedLocation(translateLocationSync(job.location, language))
    const cachedDesc = getCachedTranslation(job.description, language)
    if (cachedDesc && cachedDesc !== job.description) {
      setTranslatedDesc(cachedDesc)
    }

    let isMounted = true
    translateWithGoogleAi(job.title, language).then((res) => {
      if (isMounted && res) setTranslatedTitle(res)
    })
    translateWithGoogleAi(job.description, language).then((res) => {
      if (isMounted && res) setTranslatedDesc(res)
    })
    translateLocation(job.location, language).then((res) => {
      if (isMounted && res) setTranslatedLocation(res)
    })

    return () => {
      isMounted = false
    }
  }, [job.title, job.description, job.location, language])

  const getWorkplaceLabel = (type: string) => {
    const lower = (type || '').toLowerCase()
    if (lower.includes('remote')) return t('filter_remote')
    if (lower.includes('hybrid')) return t('filter_hybrid')
    if (lower.includes('site') || lower.includes('on')) return t('filter_onsite')
    return type
  }

  const getEmploymentTypeLabel = (type: string) => {
    const lower = (type || '').toLowerCase()
    if (lower.includes('full')) return t('job_fulltime')
    if (lower.includes('part')) return t('job_parttime')
    if (lower.includes('contract')) return t('job_contract')
    if (lower.includes('intern')) return t('job_internship')
    return type
  }

  const displayTitle =
    !showOriginal && translatedTitle
      ? translatedTitle
      : language !== 'en' && !showOriginal
      ? translateJobTitleSync(job.title, language) || job.title
      : job.title
  const displayDesc = !showOriginal && translatedDesc ? translatedDesc : job.description
  const displayLocation =
    !showOriginal && (translatedLocation || translateLocationSync(job.location, language))
      ? (translatedLocation || translateLocationSync(job.location, language))
      : job.location
  const displayCompany =
    !showOriginal && language !== 'en'
      ? translateCompanySync(job.company_name, language)
      : job.company_name
  const displayPoster = translatePosterName(job.poster_name, language)
  const displaySalary = formatSalary(job.salary_range, language)


  const handleToggleSave = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isSaving) return

    if (!user) {
      showToast(
        language === 'ta'
          ? 'வேலையைச் சேமிக்க உள்நுழையவும்'
          : language === 'hi'
          ? 'नौकरी सहेजने के लिए कृपया साइन इन करें'
          : 'Please sign in to save jobs',
        'info'
      )
      window.history.pushState({}, '', '/login')
      window.dispatchEvent(new PopStateEvent('popstate'))
      return
    }

    const nextState = !isSaved
    setIsSaved(nextState)
    setIsSaving(true)

    try {
      const res = await savedJobService.toggleSaveJob(job.id)
      setIsSaved(res)
      if (res) {
        showToast(
          t('saved_jobs_toast_saved') ||
            (language === 'ta'
              ? 'வேலை புக்மார்க்குகளில் சேமிக்கப்பட்டது'
              : language === 'hi'
              ? 'नौकरी आपके बुकमार्क में सहेजी गई'
              : 'Job saved to your bookmarks'),
          'success'
        )
      } else {
        showToast(
          t('saved_jobs_toast_unsaved') ||
            (language === 'ta'
              ? 'புக்மார்க்குகளிலிருந்து வேலை அகற்றப்பட்டது'
              : language === 'hi'
              ? 'बुकमार्क से नौकरी हटा दी गई'
              : 'Job removed from bookmarks'),
          'info'
        )
      }
    } catch {
      setIsSaved(!nextState)
      showToast(
        language === 'ta'
          ? 'புக்மார்க் புதுப்பிப்பில் பிழை'
          : language === 'hi'
          ? 'बुकमार्क अपडेट करने में त्रुटि'
          : 'Failed to update bookmark',
        'error'
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="flex flex-col justify-between p-5 transition hover:shadow-md cursor-pointer relative">
      <div className="flex items-start gap-3.5">
        {/* Company Avatar / Logo */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-[#F8FAFC] text-[#0B2545] overflow-hidden">
          {job.company_logo ? (
            <img
              src={job.company_logo}
              alt={job.company_name}
              className="h-full w-full object-contain p-1"
            />
          ) : (
            <Building2 className="h-6 w-6 text-[#0B2545]" />
          )}
        </div>

        {/* Job Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-[#0B2545] hover:underline cursor-pointer">
                  {displayTitle}
                </h3>
              </div>
              <p className="text-sm font-medium text-[#1E293B]">{displayCompany}</p>
            </div>
            <button
              type="button"
              onClick={handleToggleSave}
              disabled={isSaving}
              title={
                isSaved
                  ? language === 'ta'
                    ? 'சேமித்ததை அகற்று'
                    : language === 'hi'
                    ? 'सहेजे गए से हटाएं'
                    : 'Remove from Saved'
                  : language === 'ta'
                  ? 'வேலையை சேமிக்கவும்'
                  : language === 'hi'
                  ? 'नौकरी सहेजें'
                  : 'Save Job'
              }
              className={`p-1.5 rounded-full transition-all cursor-pointer shrink-0 ${
                isSaved
                  ? 'bg-blue-50 text-[#0B2545] hover:bg-blue-100 ring-1 ring-[#0B2545]/20 shadow-2xs'
                  : 'text-[#64748B] hover:text-[#0B2545] hover:bg-slate-100'
              }`}
              aria-label="Bookmark Job"
            >
              <Bookmark
                className={`h-4 w-4 transition-all duration-200 ${
                  isSaved
                    ? 'fill-[#0B2545] text-[#0B2545] scale-110'
                    : 'text-[#64748B] hover:scale-105'
                }`}
              />
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#64748B]">
            <div className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-[#F97316]" />
              <span>{displayLocation}</span>
            </div>
            <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-700 whitespace-nowrap shrink-0">
              {getWorkplaceLabel(job.workplace_type)}
            </span>
            <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-700 whitespace-nowrap shrink-0">
              {getEmploymentTypeLabel(job.employment_type)}
            </span>
            {displaySalary && (
              <span className="font-bold text-emerald-700">{displaySalary}</span>
            )}
          </div>

          {/* Job Description with Google AI Translation */}
          <div className="mt-3">
            <p className="text-xs text-[#334155] line-clamp-2 leading-relaxed">
              {displayDesc}
            </p>

            {language !== 'en' && (translatedDesc || translatedTitle) && (
              <div className="mt-1.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowOriginal(!showOriginal)}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-[#0B2545] cursor-pointer"
                >
                  <Languages className="h-3 w-3" />
                  <span>
                    {showOriginal ? t('app_ai_translate_btn') : t('app_original_lang')}
                  </span>
                </button>
                {!showOriginal && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                    {t('app_ai_translated_tag')}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Job Flyer / Announcement Poster (Image Post) */}
          {job.image_url && (
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200/90 bg-slate-50/80 shadow-2xs group/poster">
              <div
                className="relative max-h-80 w-full overflow-hidden flex items-center justify-center bg-slate-900/5 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowImageModal(true)
                }}
              >
                <img
                  src={job.image_url}
                  alt={displayTitle || 'Hiring Flyer'}
                  className="max-h-72 w-full object-contain hover:scale-[1.01] transition-transform duration-200"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover/poster:bg-black/10 transition-colors flex items-end justify-end p-2.5 pointer-events-none">
                  <span className="rounded-lg bg-black/60 backdrop-blur-md px-2 py-1 text-[10px] font-semibold text-white shadow-xs flex items-center gap-1 opacity-90 group-hover/poster:opacity-100 transition-opacity">
                    <Maximize2 className="h-3 w-3" />
                    <span>View Flyer</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="mt-3 flex items-center gap-2 text-[11px] text-[#94A3B8]">
            <Clock className="h-3 w-3" />
            <span>
              {t('jobs_posted')} {parseDateUTC(job.created_at).toLocaleDateString()}
            </span>
            <span>•</span>
            <span>
              {t('jobs_by')} {displayPoster}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 pt-3">
        {isHR ? (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewApplications?.(job)}
              className={`rounded-full shadow-none font-bold cursor-pointer flex items-center gap-1.5 transition ${
                job.applicants_count > 0
                  ? 'border-[#F97316] text-[#F97316] bg-orange-50/80 hover:bg-orange-100'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <FileText className="h-3.5 w-3.5 text-[#F97316]" />
              <span>
                {language === 'ta'
                  ? `விண்ணப்பங்கள் (${job.applicants_count || 0})`
                  : language === 'hi'
                  ? `आवेदन (${job.applicants_count || 0})`
                  : `Applications (${job.applicants_count || 0})`}
              </span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => onMatchCandidates?.(job)}
              className="rounded-full shadow-none font-bold cursor-pointer border-[#0B2545] text-[#0B2545] hover:bg-slate-50 flex items-center gap-1.5"
            >
              <Users className="h-3.5 w-3.5 text-[#F97316]" />
              <span>{t('cs_find_candidates')}</span>
            </Button>
          </>
        ) : isApplied ? (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200/60 select-none cursor-default"
          >
            <Check className="h-3.5 w-3.5 text-emerald-600" strokeWidth={2.4} />
            <span>{t('jobs_applied')}</span>
          </span>
        ) : (
            <Button
              size="sm"
              variant="orange"
              onClick={() => onApply(job)}
              className="rounded-full shadow-none font-bold cursor-pointer"
            >
              {t('jobs_easy_apply')}
            </Button>
        )}
      </div>

      {/* Full-Screen Poster Modal / Lightbox */}
      {showImageModal && job.image_url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6 backdrop-blur-md animate-in fade-in duration-200"
          onClick={(e) => {
            e.stopPropagation()
            setShowImageModal(false)
          }}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / close bar */}
            <div className="w-full flex items-center justify-between pb-3 text-white">
              <div className="min-w-0 pr-4">
                <h3 className="font-bold text-sm sm:text-base text-white truncate">{displayTitle}</h3>
                <p className="text-xs text-white/70 truncate">{displayCompany} · {displayLocation}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="rounded-full bg-white/20 hover:bg-white/30 text-white p-2 transition cursor-pointer shrink-0"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Image display */}
            <div className="relative overflow-hidden rounded-2xl bg-black/40 border border-white/10 shadow-2xl flex items-center justify-center max-h-[80vh] w-full">
              <img
                src={job.image_url}
                alt={displayTitle || 'Hiring Flyer Full View'}
                className="max-h-[78vh] w-auto max-w-full object-contain select-none"
              />
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
