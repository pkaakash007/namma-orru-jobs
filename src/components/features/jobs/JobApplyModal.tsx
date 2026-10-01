import React, { useState } from 'react'
import type { Job } from '../../../types'
import { Card } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { Input } from '../../ui/Input'
import { uploadService, jobsService } from '../../../services/api'
import { useToast } from '../../../context/ToastContext'
import { useAuth } from '../../../context/AuthContext'
import { useLanguage } from '../../../context/LanguageContext'
import { FileText, UploadCloud, X, Check, Building2, MapPin } from 'lucide-react'
import { parseResumeWithAi } from '../../../services/resumeParser'
import { useAppDispatch } from '../../../store/hooks'
import { jobApplied } from '../../../store/jobsSlice'
import {
  translateLocationSync,
  formatWorkplaceType,
  translateWithGoogleAi,
  translateJobTitleSync,
  translateCompanySync,
} from '../../../services/googleAiTranslate'
import { parseSkillsArray } from '../../../utils/skills'

interface JobApplyModalProps {
  job: Job
  onClose: () => void
  onSuccess: () => void
}

export const JobApplyModal: React.FC<JobApplyModalProps> = ({ job, onClose, onSuccess }) => {
  const dispatch = useAppDispatch()
  const { user, updateUserProfile } = useAuth()
  const { t, language } = useLanguage()
  const [translatedTitle, setTranslatedTitle] = useState<string | null>(null)
  const { showToast } = useToast()

  React.useEffect(() => {
    if (language !== 'en') {
      let isMounted = true
      translateWithGoogleAi(job.title, language).then((res) => {
        if (isMounted && res) setTranslatedTitle(res)
      })
      return () => {
        isMounted = false
      }
    }
  }, [job.title, language])

  const [candidateName, setCandidateName] = useState(user?.full_name || '')
  const [candidateEmail, setCandidateEmail] = useState(user?.email || '')
  const [candidatePhone, setCandidatePhone] = useState(user?.phone || '')
  const [resumeUrl, setResumeUrl] = useState(user?.resume_url || '')
  const [resumeFileName, setResumeFileName] = useState(
    user?.resume_url ? user.resume_url.split('/').pop() || 'Saved_Profile_Resume.pdf' : ''
  )
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; phone?: string; resume?: string }>({})

  // Track if current user has already applied for this specific job
  const [hasApplied, setHasApplied] = useState<boolean>(() => {
    try {
      const cached = sessionStorage.getItem('applied_job_ids')
      if (cached) {
        const ids: string[] = JSON.parse(cached)
        return ids.includes(job.id)
      }
    } catch {}
    return false
  })

  // Listen to application events in real-time
  React.useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ jobId: string }>
      if (custom.detail?.jobId === job.id) {
        setHasApplied(true)
      }
    }
    window.addEventListener('job_applied', handler)
    return () => window.removeEventListener('job_applied', handler)
  }, [job.id])

  if (user?.role === 'manager' || user?.role === 'admin') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-md">
        <Card className="w-full max-w-md p-6 text-center space-y-4 rounded-[22px] bg-[#F2F2F7]/95 backdrop-blur-2xl border-white/60 shadow-2xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-[#EA580C]">
            <Building2 className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">HR / Employer Account</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Applying to job openings is reserved for registered Job Seekers (Employees). As an HR recruiter, you can search and contact candidate talent directly from the Candidates Talent Directory.
          </p>
          <Button variant="orange" onClick={onClose} className="w-full font-bold cursor-pointer">
            Understood
          </Button>
        </Card>
      </div>
    )
  }

  const handleResumeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // File validation: Non-empty & Max 10MB
    if (file.size <= 0) {
      showToast('Selected file is empty (0 bytes)', 'error')
      setFieldErrors((prev) => ({ ...prev, resume: 'File is empty' }))
      return
    }

    const MAX_SIZE = 10 * 1024 * 1024 // 10MB
    if (file.size > MAX_SIZE) {
      showToast('Resume file size exceeds limit (maximum 10MB allowed)', 'error')
      setFieldErrors((prev) => ({ ...prev, resume: 'File size must be 10MB or less' }))
      return
    }

    const cleanFileName = file.name.toLowerCase()
    const lastDot = cleanFileName.lastIndexOf('.')
    const ext = lastDot !== -1 ? cleanFileName.slice(lastDot) : ''
    const validExts = ['.pdf', '.doc', '.docx', '.txt', '.rtf']
    if (!validExts.includes(ext) && file.type !== 'application/pdf') {
      showToast('Please upload a PDF, DOC, DOCX, TXT, or RTF document', 'error')
      setFieldErrors((prev) => ({ ...prev, resume: 'Invalid file format' }))
      return
    }

    setFieldErrors((prev) => ({ ...prev, resume: undefined }))
    setIsUploading(true)
    try {
      const data = await uploadService.uploadFile(file, 'resumes')
      setResumeUrl(data.url)
      setResumeFileName(file.name)
      showToast('Resume attached successfully!', 'success')

      // AI Resume Extraction & Candidate Database Sync against user ID
      if (user) {
        try {
          const parsed = await parseResumeWithAi(file, data.url)
          if (parsed.skills && parsed.skills.length > 0) {
            const existingSkills: string[] = parseSkillsArray(user.skills)
            const parsedSkillsClean: string[] = parseSkillsArray(parsed.skills)
            const combinedSkills = Array.from(new Set([...existingSkills, ...parsedSkillsClean]))

            const finalHeadline = user.headline || parsed.headline
            const finalPosition = user.position || parsed.position
            const finalLocation = user.location || parsed.location
            const finalBio = user.bio || parsed.bio
            const finalPhone = user.phone || parsed.phone || candidatePhone

            await updateUserProfile({
              skills: combinedSkills,
              headline: finalHeadline,
              position: finalPosition,
              location: finalLocation,
              bio: finalBio,
              phone: finalPhone,
              resume_url: data.url,
            })

            showToast(
              `Extracted ${parsed.skills.length} skills & updated your talent profile for HR recruiters!`,
              'success'
            )
          }
        } catch (parseErr) {
          console.warn('AI resume extraction in apply modal skipped:', parseErr)
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Resume upload failed', 'error')
      setFieldErrors((prev) => ({ ...prev, resume: err.message || 'Upload failed' }))
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (hasApplied) {
      showToast(
        language === 'ta'
          ? 'இந்த வேலைக்கு நீங்கள் ஏற்கனவே விண்ணப்பித்துவிட்டீர்கள்.'
          : language === 'hi'
          ? 'आप इस नौकरी के लिए पहले ही आवेदन कर चुके हैं।'
          : 'You have already applied for this job opening.',
        'error'
      )
      return
    }

    const errors: { name?: string; email?: string; phone?: string; resume?: string } = {}
    const trimmedName = candidateName.trim()
    if (!trimmedName || trimmedName.length < 2) {
      errors.name = 'Full name is required (minimum 2 characters)'
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const trimmedEmail = candidateEmail.trim()
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      errors.email = 'Valid email address is required'
    }

    if (candidatePhone.trim()) {
      const cleanDigits = candidatePhone.replace(/[\s\-()+]/g, '')
      if (cleanDigits.length < 8 || cleanDigits.length > 15) {
        errors.phone = 'Phone number must be between 8 and 15 digits'
      }
    }

    if (!resumeUrl) {
      errors.resume = 'Please upload your resume before submitting'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      const firstError = Object.values(errors)[0]
      if (firstError) showToast(firstError, 'error')
      return
    }

    setFieldErrors({})
    setIsSubmitting(true)
    try {
      await jobsService.applyJob(job.id, {
        candidate_name: trimmedName,
        candidate_email: trimmedEmail,
        candidate_phone: candidatePhone.trim(),
        resume_url: resumeUrl,
      })
      showToast(`Application successfully sent to ${job.company_name}!`, 'success')
      dispatch(jobApplied(job.id))

      // Cache applied job ID in sessionStorage + broadcast to all JobCard instances
      try {
        const cached = sessionStorage.getItem('applied_job_ids')
        const ids: string[] = cached ? JSON.parse(cached) : []
        if (!ids.includes(job.id)) ids.push(job.id)
        sessionStorage.setItem('applied_job_ids', JSON.stringify(ids))
      } catch {}
      window.dispatchEvent(new CustomEvent('job_applied', { detail: { jobId: job.id } }))

      onSuccess()
    } catch (err: any) {
      const isDuplicate =
        err?.status === 409 ||
        err?.code === 'DUPLICATE_APPLICATION' ||
        err?.message?.toLowerCase().includes('already')

      if (isDuplicate) {
        setHasApplied(true)
        try {
          const cached = sessionStorage.getItem('applied_job_ids')
          const ids: string[] = cached ? JSON.parse(cached) : []
          if (!ids.includes(job.id)) ids.push(job.id)
          sessionStorage.setItem('applied_job_ids', JSON.stringify(ids))
        } catch {}
        window.dispatchEvent(new CustomEvent('job_applied', { detail: { jobId: job.id } }))
        showToast(
          language === 'ta'
            ? 'இந்த வேலைக்கு நீங்கள் ஏற்கனவே விண்ணப்பித்துவிட்டீர்கள்.'
            : language === 'hi'
            ? 'आप इस नौकरी के लिए पहले ही आवेदन कर चुके हैं।'
            : 'You have already applied for this job opening.',
          'error'
        )
      } else {
        showToast(err.message || 'Failed to submit application', 'error')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-md">
      <Card className="relative w-full max-w-lg rounded-[22px] border-white/60 bg-[#F2F2F7]/95 backdrop-blur-2xl p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-500 hover:bg-gray-100 hover:text-slate-800 transition cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="border-b border-gray-100 pb-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#F97316]">
            {t('jobs_easy_apply')}
          </span>
          <h2 className="text-lg font-bold text-[#0B2545]">
            {translatedTitle || translateJobTitleSync(job.title, language) || job.title}
          </h2>
          <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1 font-semibold text-slate-800">
              <Building2 className="h-3.5 w-3.5 text-[#0B2545]" />
              {translateCompanySync(job.company_name, language)}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              {translateLocationSync(job.location, language)} • {formatWorkplaceType(job.workplace_type, language)}
            </span>
          </div>
        </div>

        {hasApplied && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-700">
            <Check className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" strokeWidth={2.4} />
            <div>
              <p className="font-semibold text-slate-900 text-xs">
                {language === 'ta'
                  ? 'விண்ணப்பம் சமர்ப்பிக்கப்பட்டது'
                  : language === 'hi'
                  ? 'आवेदन जमा हो गया'
                  : 'Application Already Submitted'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {language === 'ta'
                  ? 'இந்த வேலைக்கு உங்கள் விண்ணப்பம் ஏற்கெனவே சமர்ப்பிக்கப்பட்டது.'
                  : language === 'hi'
                  ? 'इस नौकरी के लिए आपका आवेदन पहले ही जमा हो चुका है।'
                  : 'You have already submitted an application for this job.'}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <Input
              label={`${t('apply_full_name')} *`}
              required
              value={candidateName}
              onChange={(e) => {
                setCandidateName(e.target.value)
                if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }))
              }}
            />
            {fieldErrors.name && (
              <p className="mt-1 text-[11px] font-semibold text-red-600">{fieldErrors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Input
                label={`${t('apply_email')} *`}
                type="email"
                required
                value={candidateEmail}
                onChange={(e) => {
                  setCandidateEmail(e.target.value)
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }))
                }}
              />
              {fieldErrors.email && (
                <p className="mt-1 text-[11px] font-semibold text-red-600">{fieldErrors.email}</p>
              )}
            </div>
            <div>
              <Input
                label={t('apply_phone')}
                value={candidatePhone}
                onChange={(e) => {
                  setCandidatePhone(e.target.value)
                  if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: undefined }))
                }}
              />
              {fieldErrors.phone && (
                <p className="mt-1 text-[11px] font-semibold text-red-600">{fieldErrors.phone}</p>
              )}
            </div>
          </div>

          {/* Resume Upload */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              {t('apply_resume_pdf')} *
            </label>
            <div className={`rounded-lg border-2 border-dashed p-4 text-center transition ${
              fieldErrors.resume
                ? 'border-red-400 bg-red-50/30'
                : 'border-gray-300 bg-[#F8FAFC] hover:border-[#0B2545]/40 hover:bg-[#F1F5F9]'
            }`}>
              {resumeUrl ? (
                <div className="flex items-center justify-between text-left">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                    <Check className="h-4 w-4" />
                    <FileText className="h-4 w-4 text-[#0B2545]" />
                    <span className="truncate max-w-[220px]">{resumeFileName}</span>
                  </div>
                  <label className="cursor-pointer text-xs font-bold text-[#F97316] underline hover:text-[#EA580C]">
                    {language === 'ta' ? 'மாற்று' : language === 'hi' ? 'बदलें' : 'Change'}
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,.rtf"
                      onChange={handleResumeFile}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </label>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 py-1">
                  <UploadCloud className="h-7 w-7 text-[#0B2545]" />
                  <span className="text-xs font-semibold text-slate-700">
                    {isUploading
                      ? language === 'ta'
                        ? 'ரெஸ்யூம் பதிவேற்றப்படுகிறது...'
                        : language === 'hi'
                        ? 'रिज्यूमे अपलोड हो रहा है...'
                        : 'Uploading resume...'
                      : language === 'ta'
                      ? 'சாதனத்திலிருந்து ரெஸ்யூமைப் பதிவேற்றவும்'
                      : language === 'hi'
                      ? 'डिवाइस से रिज्यूमे अपलोड करें'
                      : 'Upload resume from device'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {language === 'ta'
                      ? 'PDF, DOC, DOCX 10MB வரை (குறைந்தது > 0 bytes)'
                      : language === 'hi'
                      ? 'PDF, DOC, DOCX अधिकतम 10MB'
                      : 'PDF, DOC, DOCX up to 10MB'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.rtf"
                    onChange={handleResumeFile}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
              )}
            </div>
            {fieldErrors.resume && (
              <p className="mt-1 text-[11px] font-semibold text-red-600">{fieldErrors.resume}</p>
            )}
          </div>

          <div className="mt-6 flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              {hasApplied
                ? language === 'ta'
                  ? 'மூடு'
                  : language === 'hi'
                  ? 'बंद करें'
                  : 'Close'
                : language === 'ta'
                ? 'ரத்து செய்'
                : language === 'hi'
                ? 'रद्द करें'
                : 'Cancel'}
            </Button>
            {hasApplied ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200/60 select-none cursor-default"
              >
                <Check className="h-3.5 w-3.5 text-emerald-600" strokeWidth={2.4} />
                <span>{t('jobs_applied')}</span>
              </span>
            ) : (
              <Button
                type="submit"
                variant="orange"
                size="md"
                isLoading={isSubmitting}
                disabled={!resumeUrl || isUploading}
                className="font-bold shadow-none cursor-pointer"
              >
                {isSubmitting ? t('apply_submitting') : t('apply_submit')}
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  )
}
