import React, { useState, useEffect } from 'react'
import type { Job } from '../../../types'
import type { SupportedLanguage } from '../../../utils/i18n'
import {
  translateWithGoogleAi,
  translateLocationSync,
  translateLocation,
  translateJobTitleSync,
  translateCompanySync,
  formatSalary,
  formatWorkplaceType,
} from '../../../services/googleAiTranslate'

interface TrendingJobRowProps {
  job: Job
  language: SupportedLanguage
  onClick: () => void
}

export const TrendingJobRow: React.FC<TrendingJobRowProps> = ({ job, language, onClick }) => {
  const [translatedTitle, setTranslatedTitle] = useState<string>(() =>
    language !== 'en' ? translateJobTitleSync(job.title, language) : job.title
  )
  const [translatedLocation, setTranslatedLocation] = useState<string>(() =>
    translateLocationSync(job.location, language)
  )

  useEffect(() => {
    if (language === 'en') {
      setTranslatedTitle(job.title)
      setTranslatedLocation(job.location)
      return
    }

    // 1. Immediate synchronous dictionary lookup for 0ms render
    setTranslatedTitle(translateJobTitleSync(job.title, language))
    setTranslatedLocation(translateLocationSync(job.location, language))

    // 2. Google AI Title & Location translation refinement
    let isMounted = true
    translateWithGoogleAi(job.title, language).then((res) => {
      if (isMounted && res) setTranslatedTitle(res)
    })
    translateLocation(job.location, language).then((res) => {
      if (isMounted && res) setTranslatedLocation(res)
    })

    return () => {
      isMounted = false
    }
  }, [job.title, job.location, language])

  const displayTitle = translatedTitle || translateJobTitleSync(job.title, language) || job.title
  const displayLocation = translatedLocation || translateLocationSync(job.location, language)
  const displayCompany = translateCompanySync(job.company_name, language)
  const displayWorkplace = formatWorkplaceType(job.workplace_type, language)
  const displaySalary = formatSalary(job.salary_range, language)

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer py-2.5 first:pt-1 last:pb-0 transition"
    >
      <p className="text-xs font-medium text-slate-900 group-hover:text-[#0B2545] group-hover:underline line-clamp-1 leading-snug">
        {displayTitle}
      </p>
      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
        {displayCompany} · {displayLocation}
      </p>
      <p className="text-[10px] text-slate-400 mt-0.5">
        {displayWorkplace}
        {displaySalary ? ` · ${displaySalary}` : ''}
      </p>
    </div>
  )
}
