import React, { useState } from 'react'
import {
  Briefcase,
  Check,
  Building2,
  Banknote,
  X,
  ArrowLeft,
  Image as ImageIcon,
} from 'lucide-react'
import { GoogleLocationSearchInput } from '../../ui/GoogleLocationSearchInput'
import { jobsService, uploadService } from '../../../services/api'
import { useToast } from '../../../context/ToastContext'
import { useLanguage } from '../../../context/LanguageContext'
import { useAuth } from '../../../context/AuthContext'
import { useAppDispatch } from '../../../store/hooks'
import { jobAdded } from '../../../store/jobsSlice'
import { HrVerificationPendingView } from './HrVerificationPendingView'

interface PostJobFormProps {
  onSuccess: () => void
  onCancel?: () => void
}

const WORKPLACE_OPTIONS = ['Remote', 'Hybrid', 'On-site'] as const
const EMPLOYMENT_OPTIONS = ['Full-time', 'Part-time', 'Contract', 'Internship'] as const

export const PostJobForm: React.FC<PostJobFormProps> = ({ onSuccess, onCancel }) => {
  const dispatch = useAppDispatch()
  const { user } = useAuth()
  const { showToast } = useToast()
  const { t, language } = useLanguage()

  const [title, setTitle] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [location, setLocation] = useState('')
  const [workplaceType, setWorkplaceType] = useState<string>('Remote')
  const [employmentType, setEmploymentType] = useState<string>('Full-time')
  const [salaryRange, setSalaryRange] = useState('')
  const [description, setDescription] = useState('')
  const [companyLogo, setCompanyLogo] = useState('')
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isHrUnverified =
    user?.role === 'manager' &&
    (user.status || '').toUpperCase() !== 'ACTIVE' &&
    user.status !== 'active'

  if (isHrUnverified) {
    return <HrVerificationPendingView onBackToFeed={onCancel || onSuccess} />
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size <= 0) {
      showToast('Selected logo file is empty (0 bytes)', 'error')
      return
    }

    const MAX_SIZE = 10 * 1024 * 1024 // 10MB
    if (file.size > MAX_SIZE) {
      showToast('Company logo size exceeds 10MB limit (maximum 10MB allowed)', 'error')
      return
    }

    const cleanFileName = file.name.toLowerCase()
    const lastDot = cleanFileName.lastIndexOf('.')
    const ext = lastDot !== -1 ? cleanFileName.slice(lastDot) : ''
    const validImgExts = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif']
    if (!validImgExts.includes(ext) && !file.type.startsWith('image/')) {
      showToast('Please upload a valid image file (PNG, JPG, WebP, or SVG)', 'error')
      return
    }

    setIsUploadingLogo(true)
    try {
      const data = await uploadService.uploadFile(file, 'jobs')
      setCompanyLogo(data.url)
      showToast('Company logo uploaded successfully!', 'success')
    } catch (err: any) {
      showToast(err.message || 'Logo upload failed', 'error')
    } finally {
      setIsUploadingLogo(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || title.trim().length < 3) {
      showToast('Please enter a valid job title (at least 3 characters)', 'error')
      return
    }
    if (!companyName.trim() || companyName.trim().length < 2) {
      showToast('Please enter a valid company name (at least 2 characters)', 'error')
      return
    }
    if (!location.trim()) {
      showToast('Please enter a job location or district', 'error')
      return
    }
    if (!description.trim() || description.trim().length < 10) {
      showToast('Please provide a job description (at least 10 characters)', 'error')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await jobsService.postJob({
        title: title.trim(),
        company_name: companyName.trim(),
        company_logo: companyLogo.trim() || undefined,
        location: location.trim(),
        workplace_type: workplaceType,
        employment_type: employmentType,
        salary_range: salaryRange.trim(),
        description: description.trim(),
      })

      showToast('Job opportunity published successfully!', 'success')

      dispatch(
        jobAdded({
          id: res.job_id || 'job_' + Date.now(),
          poster_id: user?.id || 'hr',
          poster_name: user?.full_name || 'HR Recruiter',
          poster_avatar: user?.avatar_url,
          title: title.trim(),
          company_name: companyName.trim(),
          company_logo: companyLogo.trim() || undefined,
          location: location.trim(),
          workplace_type: workplaceType as 'Remote' | 'Hybrid' | 'On-site',
          employment_type: employmentType as 'Full-time' | 'Part-time' | 'Contract' | 'Internship',
          salary_range: salaryRange.trim(),
          description: description.trim(),
          applicants_count: 0,
          created_at: new Date().toISOString(),
        })
      )
      onSuccess()
    } catch (err: any) {
      showToast(err.message || 'Failed to post job', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
        {/* iOS Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="p-1.5 -ml-1 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                title="Back to jobs"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0B2545] text-white shadow-2xs">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#0F172A] tracking-tight">
                {language === 'ta' ? 'புதிய வேலை வாய்ப்பைப் பகிர்க' : language === 'hi' ? 'नई नौकरी पोस्ट करें' : 'Post New Job Opening'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {language === 'ta'
                  ? 'தகுதியான விண்ணப்பதாரர்களை ஈர்க்க வேலை விவரங்களை உள்ளிடவும்'
                  : language === 'hi'
                  ? 'योग्य उम्मीदवारों को आकर्षित करने के लिए नौकरी का विवरण भरें'
                  : 'Reach qualified candidates and manage incoming applications'}
              </p>
            </div>
          </div>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer px-2 py-1 rounded-lg hover:bg-slate-100"
            >
              Cancel
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* 1. Job Title */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#0F172A]">
              {t('hr_job_title')} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Briefcase className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-[#0F172A] focus:border-[#0B2545] focus:ring-1 focus:ring-[#0B2545] focus:outline-none transition shadow-2xs"
              />
            </div>
          </div>

          {/* 2. Company Name & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#0F172A]">
                {t('hr_company_name')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-[#0F172A] focus:border-[#0B2545] focus:ring-1 focus:ring-[#0B2545] focus:outline-none transition shadow-2xs"
                />
              </div>
            </div>

            <div>
              <GoogleLocationSearchInput
                label={`${t('hr_location')} *`}
                required
                value={location}
                onChange={setLocation}
                inputClassName="rounded-xl border-slate-200 py-2.5 text-xs shadow-2xs"
              />
            </div>
          </div>

          {/* 3. Company Logo / Job Image Upload (Apple iOS clean style) */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#0F172A]">
              Company Logo / Job Image
            </label>
            {companyLogo ? (
              <div className="flex items-center gap-3.5 p-3 rounded-2xl border border-slate-200 bg-slate-50/70">
                <div className="h-14 w-14 rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xs flex items-center justify-center overflow-hidden shrink-0">
                  <img
                    src={companyLogo}
                    alt="Company Logo Preview"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold">
                    <Check className="h-4 w-4" />
                    <span>Image uploaded successfully</span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{companyLogo}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCompanyLogo('')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-white transition cursor-pointer"
                  title="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col sm:flex-row items-center gap-3 p-3.5 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-400 cursor-pointer transition">
                <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#0B2545] shadow-2xs shrink-0">
                  {isUploadingLogo ? (
                    <div className="h-4 w-4 rounded-full border-2 border-[#0B2545] border-t-transparent animate-spin" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-slate-500" />
                  )}
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <span className="text-xs font-semibold text-[#0B2545]">
                    {isUploadingLogo ? 'Uploading logo to cloud...' : 'Click to upload company logo or recruitment poster'}
                  </span>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    PNG, JPG, WebP, SVG • Maximum 10MB
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  disabled={isUploadingLogo}
                />
              </label>
            )}
          </div>

          {/* 4. Workplace Type (iOS Segmented Control) */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#0F172A]">
              {t('hr_workplace_type')}
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/60">
              {WORKPLACE_OPTIONS.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setWorkplaceType(type)}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    workplaceType === type
                      ? 'bg-white text-[#0B2545] font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Employment Type (iOS Segmented Control) */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#0F172A]">
              {t('hr_employment_type')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/60">
              {EMPLOYMENT_OPTIONS.map((emp) => (
                <button
                  key={emp}
                  type="button"
                  onClick={() => setEmploymentType(emp)}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    employmentType === emp
                      ? 'bg-white text-[#0B2545] font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {emp}
                </button>
              ))}
            </div>
          </div>

          {/* 6. Salary Range */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#0F172A]">
              {t('hr_salary_range')}
            </label>
            <div className="relative">
              <Banknote className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={salaryRange}
                onChange={(e) => setSalaryRange(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-[#0F172A] focus:border-[#0B2545] focus:ring-1 focus:ring-[#0B2545] focus:outline-none transition shadow-2xs"
              />
            </div>
          </div>

          {/* 7. Description */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#0F172A]">
              {t('hr_description')} <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={5}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3.5 bg-white border border-slate-200 rounded-xl text-xs text-[#0F172A] focus:border-[#0B2545] focus:ring-1 focus:ring-[#0B2545] focus:outline-none transition shadow-2xs leading-relaxed"
            />
          </div>

          {/* 8. Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:flex-1 py-3 px-6 rounded-xl bg-[#0B2545] hover:bg-[#081a31] text-white text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>{t('hr_publishing_btn')}</span>
                </>
              ) : (
                <span>{t('hr_publish_btn')}</span>
              )}
            </button>

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="w-full sm:w-auto py-3 px-6 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
