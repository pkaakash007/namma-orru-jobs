import React, { useState, useEffect } from 'react'
import type { Job } from '../../../types'
import { Card } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { Building2, MapPin, Clock, Bookmark, Users, Languages } from 'lucide-react'
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
} from '../../../services/googleAiTranslate'
import { parseDateUTC } from '../../../utils/date'

interface JobCardProps {
  job: Job
  onApply: (job: Job) => void
  onMatchCandidates?: (job: Job) => void
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  onApply,
  onMatchCandidates,
}) => {
  const { t, language } = useLanguage()
  const { user, hasRole } = useAuth()
  const { showToast } = useToast()
  const isHR = hasRole(['admin', 'manager'])

  const [isSaved, setIsSaved] = useState<boolean>(() => savedJobService.isSavedSync(job.id))
  const [isSaving, setIsSaving] = useState(false)

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

  const [translatedTitle, setTranslatedTitle] = useState<string | null>(() =>
    language !== 'en' ? translateJobTitleSync(job.title, language) : null
  )
  const [translatedDesc, setTranslatedDesc] = useState<string | null>(null)
  const [translatedLocation, setTranslatedLocation] = useState<string | null>(() =>
    translateLocationSync(job.location, language)
  )
  const [showOriginal, setShowOriginal] = useState(false)

  // Automatically translate job title, description & location with Google AI when language switches
  useEffect(() => {
    if (language === 'en') {
      setTranslatedTitle(null)
      setTranslatedDesc(null)
      setTranslatedLocation(null)
      setShowOriginal(false)
      return
    }

    // Immediate synchronous dictionary lookup for 0ms instantaneous display
    setTranslatedTitle(translateJobTitleSync(job.title, language))
    setTranslatedLocation(translateLocationSync(job.location, language))

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

      <div className="mt-4 flex items-center justify-end border-t border-gray-100 pt-3">
        {isHR ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onMatchCandidates?.(job)}
            className="rounded-full shadow-none font-bold cursor-pointer border-[#0B2545] text-[#0B2545] hover:bg-slate-50 flex items-center gap-1.5"
          >
            <Users className="h-3.5 w-3.5 text-[#F97316]" />
            <span>{t('cs_find_candidates')}</span>
          </Button>
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
    </Card>
  )
}
