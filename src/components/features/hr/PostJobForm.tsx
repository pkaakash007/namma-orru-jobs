import React, { useState } from 'react'
import { Briefcase, UploadCloud, Check } from 'lucide-react'
import { Card } from '../../ui/Card'
import { Input } from '../../ui/Input'
import { Button } from '../../ui/Button'
import { GoogleLocationSearchInput } from '../../ui/GoogleLocationSearchInput'
import { jobsService, uploadService } from '../../../services/api'
import { useToast } from '../../../context/ToastContext'
import { useLanguage } from '../../../context/LanguageContext'
import { useAuth } from '../../../context/AuthContext'
import { useAppDispatch } from '../../../store/hooks'
import { jobAdded } from '../../../store/jobsSlice'

interface PostJobFormProps {
  onSuccess: () => void
}

export const PostJobForm: React.FC<PostJobFormProps> = ({ onSuccess }) => {
  const dispatch = useAppDispatch()
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [location, setLocation] = useState('')
  const [workplaceType, setWorkplaceType] = useState('Remote')
  const [employmentType, setEmploymentType] = useState('Full-time')
  const [salaryRange, setSalaryRange] = useState('')
  const [description, setDescription] = useState('')
  const [companyLogo, setCompanyLogo] = useState('')
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { showToast } = useToast()
  const { t } = useLanguage()

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
          title,
          company_name: companyName,
          location,
          workplace_type: workplaceType as 'Remote' | 'Hybrid' | 'On-site',
          employment_type: employmentType as 'Full-time' | 'Part-time' | 'Contract' | 'Internship',
          salary_range: salaryRange,
          description,
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
    <Card className="mx-auto max-w-2xl p-6 sm:p-8 shadow-sm">
      <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#0B2545] text-white">
          <Briefcase className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#0F172A]">{t('hr_post_title')}</h2>
          <p className="text-xs text-[#64748B]">{t('hr_post_subtitle')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Input
          label={`${t('hr_job_title')} *`}
          required
          placeholder="e.g. Senior Frontend React Engineer"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label={`${t('hr_company_name')} *`}
            required
            placeholder="e.g. Zoho Corp / Freshworks"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
          <GoogleLocationSearchInput
            label={`${t('hr_location')} *`}
            required
            placeholder="e.g. Chennai, Coimbatore, Madurai"
            value={location}
            onChange={setLocation}
            inputClassName="rounded-md border-[#CDCBC7]"
          />
        </div>

        {/* Company Logo */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-[#475569]">
            Company Logo (PNG, JPG, WebP, SVG • Max 10MB)
          </label>
          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-gray-100 transition">
              <UploadCloud className="h-4 w-4 text-[#F97316]" />
              <span>{isUploadingLogo ? 'Uploading logo...' : 'Choose Logo File'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                disabled={isUploadingLogo}
              />
            </label>
            {companyLogo && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                <Check className="h-4 w-4" />
                <span>Uploaded</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#475569]">
              {t('hr_workplace_type')}
            </label>
            <select
              value={workplaceType}
              onChange={(e) => setWorkplaceType(e.target.value)}
              className="w-full rounded-md border border-[#CDCBC7] bg-white p-2 text-xs text-[#0F172A] focus:border-[#0B2545] focus:outline-none"
            >
              <option value="Remote">Remote</option>
              <option value="Hybrid">Hybrid</option>
              <option value="On-site">On-site</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[#475569]">
              {t('hr_employment_type')}
            </label>
            <select
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value)}
              className="w-full rounded-md border border-[#CDCBC7] bg-white p-2 text-xs text-[#0F172A] focus:border-[#0B2545] focus:outline-none"
            >
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Internship">Internship</option>
            </select>
          </div>

          <Input
            label={t('hr_salary_range')}
            placeholder="e.g. ₹10 - 16 LPA"
            value={salaryRange}
            onChange={(e) => setSalaryRange(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-[#475569]">
            {t('hr_description')} *
          </label>
          <textarea
            rows={4}
            required
            placeholder="Describe key responsibilities, qualifications, and benefits..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border border-[#CDCBC7] p-3 text-xs text-[#0F172A] placeholder-slate-400 focus:border-[#0B2545] focus:outline-none focus:ring-1 focus:ring-[#0B2545]"
          />
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            variant="orange"
            size="lg"
            isLoading={isSubmitting}
            className="w-full font-bold shadow-sm cursor-pointer"
          >
            {isSubmitting ? t('hr_publishing_btn') : t('hr_publish_btn')}
          </Button>
        </div>
      </form>
    </Card>
  )
}
