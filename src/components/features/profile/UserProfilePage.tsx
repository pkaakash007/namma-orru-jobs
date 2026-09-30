import React, { useState, useEffect } from 'react'
import {
  Briefcase,
  Phone,
  FileText,
  UploadCloud,
  Check,
  Languages,
  ExternalLink,
  ArrowLeft,
  Building2,
  Loader2,
  Mail,
  MapPin,
  Save,
  Camera,
  Trash2,
  X,
  Plus,
} from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../context/ToastContext'
import { useLanguage } from '../../../context/LanguageContext'
import { Badge } from '../../ui/Badge'
import { uploadService } from '../../../services/api'
import { parseResumeWithAi } from '../../../services/resumeParser'
import type { SupportedLanguage } from '../../../utils/i18n'
import { GoogleLocationSearchInput } from '../../ui/GoogleLocationSearchInput'
import { parseSkillsArray, cleanSkillString } from '../../../utils/skills'

const SUGGESTED_SKILLS = [
  'React',
  'TypeScript',
  'JavaScript',
  'Node.js',
  'Python',
  'SQL',
  'Cloudflare D1',
  'Workers',
  'Hono',
  'Sales',
  'Accounting',
  'Tally',
  'Digital Marketing',
  'Graphic Design',
  'Customer Support',
  'Management',
]

function cleanResumeFileName(url?: string): string {
  if (!url) return 'Resume.pdf'
  const raw = url.split('/').pop() || 'Resume.pdf'
  const cleaned = raw.replace(/^\d+_[a-f0-9]+_/, '').replace(/^resumes_/, '')
  try {
    return decodeURIComponent(cleaned) || 'Resume.pdf'
  } catch {
    return cleaned || 'Resume.pdf'
  }
}

export interface UserProfilePageProps {
  onBack?: () => void
  className?: string
  showHeaderBack?: boolean
}

export const UserProfilePage: React.FC<UserProfilePageProps> = ({
  onBack,
  className = '',
  showHeaderBack = true,
}) => {
  const { user, role, updateUserProfile } = useAuth()
  const { showToast } = useToast()
  const { language, setLanguage, t, languages } = useLanguage()

  // Form State initialized from user record
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [headline, setHeadline] = useState(user?.headline || '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '')
  const [bannerUrl, setBannerUrl] = useState(user?.banner_url || '')
  const [age, setAge] = useState<string>(user?.age ? String(user?.age) : '')
  const [dob, setDob] = useState(user?.date_of_birth || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [location, setLocation] = useState(user?.location || '')
  const [company, setCompany] = useState(user?.company || '')
  const [position, setPosition] = useState(user?.position || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [skillsList, setSkillsList] = useState<string[]>(() => parseSkillsArray(user?.skills))
  const [skillInput, setSkillInput] = useState('')
  const [resumeUrl, setResumeUrl] = useState(user?.resume_url || '')
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>(
    (user?.language as SupportedLanguage) || language
  )

  const [isUploadingResume, setIsUploadingResume] = useState(false)
  const [isUploadingBanner, setIsUploadingBanner] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isExtractingAi, setIsExtractingAi] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Keep form in sync if user changes
  useEffect(() => {
    if (user) {
      if (!fullName) setFullName(user.full_name || '')
      if (!headline) setHeadline(user.headline || '')
      if (!isUploadingAvatar && user.avatar_url !== undefined) setAvatarUrl(user.avatar_url || '')
      if (!isUploadingBanner && user.banner_url !== undefined) setBannerUrl(user.banner_url || '')
      if (!age && user.age) setAge(String(user.age))
      if (!dob && user.date_of_birth) setDob(user.date_of_birth)
      if (!phone && user.phone) setPhone(user.phone)
      if (!location && user.location) setLocation(user.location)
      if (!company && user.company) setCompany(user.company)
      if (!position && user.position) setPosition(user.position)
      if (!bio && user.bio) setBio(user.bio)
      if (!resumeUrl && user.resume_url) setResumeUrl(user.resume_url)
      if (user.skills && skillsList.length === 0) {
        setSkillsList(parseSkillsArray(user.skills))
      }
    }
  }, [user, isUploadingAvatar, isUploadingBanner])

  const handleAddSkill = (skillText: string) => {
    if (!skillText) return
    const parsed = parseSkillsArray(skillText)
    if (parsed.length > 0) {
      const newSkills = parsed.filter(
        (p) => !skillsList.some((s) => s.toLowerCase() === p.toLowerCase())
      )
      if (newSkills.length > 0) {
        setSkillsList([...skillsList, ...newSkills])
      }
      setSkillInput('')
      return
    }

    const cleaned = cleanSkillString(skillText)
    if (cleaned && !skillsList.some((s) => s.toLowerCase() === cleaned.toLowerCase())) {
      setSkillsList([...skillsList, cleaned])
    }
    setSkillInput('')
  }

  const handleRemoveSkill = (indexToRemove: number) => {
    setSkillsList(skillsList.filter((_, idx) => idx !== indexToRemove))
  }

  // Auto-calculate age when DOB changes
  const handleDobChange = (newDob: string) => {
    setDob(newDob)
    if (newDob) {
      const birthYear = new Date(newDob).getFullYear()
      const currentYear = new Date().getFullYear()
      const calculatedAge = currentYear - birthYear
      if (calculatedAge > 0 && calculatedAge < 120) {
        setAge(String(calculatedAge))
      }
    }
  }

  // Handle Resume Upload & AI Content Extraction
  const handleResumeFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const lowerName = file.name.toLowerCase()
    const validExtensions = ['.pdf', '.docx', '.doc', '.txt']
    const hasValidExt = validExtensions.some((ext) => lowerName.endsWith(ext))

    if (!hasValidExt && file.type !== 'application/pdf') {
      showToast('Please upload a PDF, Word (DOCX/DOC), or TXT document', 'error')
      return
    }

    if (file.size <= 0) {
      showToast('Selected file is empty (0 bytes). Please choose a valid document.', 'error')
      return
    }

    const MAX_RESUME_SIZE = 10 * 1024 * 1024 // 10MB
    if (file.size > MAX_RESUME_SIZE) {
      showToast('Resume file size cannot exceed 10MB (maximum 10MB allowed)', 'error')
      return
    }

    setIsUploadingResume(true)
    setIsExtractingAi(true)
    try {
      const uploaded = await uploadService.uploadFile(file, 'resumes')
      setResumeUrl(uploaded.url)
      showToast('Resume uploaded securely to Cloudflare R2', 'success')

      // AI Resume Intelligence Extraction
      const parsedData = await parseResumeWithAi(file, uploaded.url)

      // Merge skills
      const newExtracted = parseSkillsArray(parsedData.skills)
      const combinedSkills = Array.from(new Set([...skillsList, ...newExtracted]))

      // Populate user details form fields from extracted content
      if (parsedData.fullName && (!fullName || fullName.trim() === '')) {
        setFullName(parsedData.fullName)
      }
      if (parsedData.headline) setHeadline(parsedData.headline)
      if (parsedData.position) setPosition(parsedData.position)
      if (parsedData.company) setCompany(parsedData.company)
      if (parsedData.location) setLocation(parsedData.location)
      if (parsedData.bio) setBio(parsedData.bio)
      if (parsedData.phone && (!phone || phone.trim() === '')) setPhone(parsedData.phone)
      setSkillsList(combinedSkills)

      // Store all extracted content directly onto users table in Cloudflare D1
      const finalName =
        parsedData.fullName && (!fullName || fullName.trim() === '')
          ? parsedData.fullName
          : fullName
      const finalHeadline = parsedData.headline || headline || undefined
      const finalPosition = parsedData.position || position || undefined
      const finalCompany = parsedData.company || company || undefined
      const finalLocation = parsedData.location || location || undefined
      const finalBio = parsedData.bio || bio || undefined
      const finalPhone =
        parsedData.phone && (!phone || phone.trim() === '') ? parsedData.phone : phone || undefined

      await updateUserProfile({
        full_name: finalName || undefined,
        skills: combinedSkills,
        headline: finalHeadline,
        position: finalPosition,
        company: finalCompany,
        location: finalLocation,
        bio: finalBio,
        phone: finalPhone,
        resume_url: uploaded.url,
      })


      showToast(
        language === 'ta'
          ? 'தன்விவரக் குறிப்பு விவரங்கள் வெற்றிகரமாக புதுப்பிக்கப்பட்டன'
          : language === 'hi'
          ? 'बायोडाटा विवरण सफलतापूर्वक अपडेट किए गए'
          : 'Resume uploaded and profile details updated',
        'success'
      )
    } catch (err: any) {
      showToast(err.message || 'Failed to upload/analyze resume', 'error')
    } finally {
      setIsUploadingResume(false)
      setIsExtractingAi(false)
    }
  }

  // Handle Cover Photo Upload with Instant Optimistic Preview
  const handleCoverFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size <= 0) {
      showToast('Selected file is empty (0 bytes)', 'error')
      return
    }

    const MAX_SIZE = 10 * 1024 * 1024 // 10MB
    if (file.size > MAX_SIZE) {
      showToast('Cover photo size exceeds 10MB limit', 'error')
      return
    }

    const cleanFileName = file.name.toLowerCase()
    const lastDot = cleanFileName.lastIndexOf('.')
    const ext = lastDot !== -1 ? cleanFileName.slice(lastDot) : ''
    const validExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']
    if (!validExts.includes(ext) && !file.type.startsWith('image/')) {
      showToast('Please upload an image file (JPG, PNG, WebP, GIF, SVG)', 'error')
      return
    }

    // Instant local preview in 0ms
    const prevBanner = bannerUrl
    const objectUrl = URL.createObjectURL(file)
    setBannerUrl(objectUrl)
    setIsUploadingBanner(true)

    try {
      const data = await uploadService.uploadFile(file, 'avatars')
      setBannerUrl(data.url)
      await updateUserProfile({ banner_url: data.url })
      showToast(
        language === 'ta'
          ? 'அட்டைப்படம் வெற்றிகரமாக மாற்றப்பட்டது!'
          : language === 'hi'
          ? 'कवर फोटो सफलतापूर्वक अपडेट किया गया!'
          : 'Cover photo updated successfully!',
        'success'
      )
    } catch (err: any) {
      setBannerUrl(prevBanner)
      showToast(err.message || 'Failed to upload cover photo', 'error')
    } finally {
      setIsUploadingBanner(false)
      setTimeout(() => {
        try {
          URL.revokeObjectURL(objectUrl)
        } catch {}
      }, 5000)
      e.target.value = ''
    }
  }

  const handleRemoveCover = async () => {
    const prevBanner = bannerUrl
    setBannerUrl('')
    try {
      await updateUserProfile({ banner_url: '' })
      showToast(
        language === 'ta'
          ? 'அட்டைப்படம் அகற்றப்பட்டது'
          : language === 'hi'
          ? 'कवर फोटो हटा दिया गया'
          : 'Cover photo removed',
        'info'
      )
    } catch (err: any) {
      setBannerUrl(prevBanner)
      showToast(err.message || 'Failed to remove cover photo', 'error')
    }
  }

  // Handle Avatar Photo Upload with Instant Optimistic Preview
  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size <= 0) {
      showToast('Selected file is empty (0 bytes)', 'error')
      return
    }

    const MAX_SIZE = 10 * 1024 * 1024 // 10MB
    if (file.size > MAX_SIZE) {
      showToast('Profile photo size exceeds 10MB limit', 'error')
      return
    }

    const cleanFileName = file.name.toLowerCase()
    const lastDot = cleanFileName.lastIndexOf('.')
    const ext = lastDot !== -1 ? cleanFileName.slice(lastDot) : ''
    const validExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']
    if (!validExts.includes(ext) && !file.type.startsWith('image/')) {
      showToast('Please upload an image file (JPG, PNG, WebP, GIF, SVG)', 'error')
      return
    }

    // Instant local preview in 0ms
    const prevAvatar = avatarUrl
    const objectUrl = URL.createObjectURL(file)
    setAvatarUrl(objectUrl)
    setIsUploadingAvatar(true)

    try {
      const data = await uploadService.uploadFile(file, 'avatars')
      setAvatarUrl(data.url)
      await updateUserProfile({ avatar_url: data.url })
      showToast(
        language === 'ta'
          ? 'சுயவிவரப் படம் புதுப்பிக்கப்பட்டது!'
          : language === 'hi'
          ? 'प्रोफ़ाइल फोटो अपडेट की गई!'
          : 'Profile photo updated successfully!',
        'success'
      )
    } catch (err: any) {
      setAvatarUrl(prevAvatar)
      showToast(err.message || 'Failed to upload profile photo', 'error')
    } finally {
      setIsUploadingAvatar(false)
      setTimeout(() => {
        try {
          URL.revokeObjectURL(objectUrl)
        } catch {}
      }, 5000)
      e.target.value = ''
    }
  }

  // Handle language switch
  const handleLanguageSelect = (langCode: SupportedLanguage) => {
    setSelectedLang(langCode)
    setLanguage(langCode)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim() || fullName.trim().length < 2) {
      showToast('Full Name is required (minimum 2 characters)', 'error')
      return
    }

    if (phone.trim()) {
      const cleanPhone = phone.replace(/[\s\-()+]/g, '')
      if (cleanPhone.length < 8 || cleanPhone.length > 15) {
        showToast('Please enter a valid phone number (8-15 digits)', 'error')
        return
      }
    }

    if (age) {
      const numAge = parseInt(age, 10)
      if (isNaN(numAge) || numAge < 16 || numAge > 100) {
        showToast('Please enter a valid age between 16 and 100', 'error')
        return
      }
    }

    setIsSaving(true)
    try {
      await updateUserProfile({
        full_name: fullName.trim(),
        headline: headline.trim(),
        age: age ? parseInt(age, 10) : undefined,
        date_of_birth: dob || undefined,
        phone: phone.trim() || undefined,
        location: location.trim() || undefined,
        company: company.trim() || undefined,
        position: position.trim() || undefined,
        bio: bio.trim() || undefined,
        skills: skillsList,
        resume_url: resumeUrl || undefined,
        banner_url: bannerUrl || undefined,
        avatar_url: avatarUrl || undefined,
        language: selectedLang,
      })

      showToast(t('profile_saved_success'), 'success')
    } catch (err: any) {
      showToast(err.message || 'Failed to save changes', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className={`space-y-6 pb-12 ${className}`}>
      {/* Top Breadcrumb & Page Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {showHeaderBack && onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center justify-center h-9 w-9 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-[#0B2545] hover:border-slate-300 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
              {t('profile_title')}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">{t('profile_subtitle')}</p>
          </div>
        </div>

        {/* Quick Save Header Button */}
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
            >
              {language === 'ta' ? 'திரும்பு' : language === 'hi' ? 'वापस' : 'Back to Jobs'}
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || isUploadingResume}
            className="flex items-center gap-1.5 rounded-xl bg-[#0B2545] hover:bg-[#071A31] px-5 py-2 text-xs font-bold text-white transition shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span>{isSaving ? t('profile_saving_changes') : t('profile_save_changes')}</span>
          </button>
        </div>
      </div>

      {/* Main Profile Hero Card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Cover Accent Banner */}
        <div className="h-44 sm:h-52 md:h-60 bg-gradient-to-r from-[#0B2545] via-[#163866] to-[#0B2545] relative overflow-hidden group">
          {bannerUrl ? (
            <img
              key={bannerUrl}
              src={bannerUrl}
              alt="Profile Cover Banner"
              className="w-full h-full object-cover transition-all duration-300"
            />
          ) : (
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#F97316_1px,transparent_1px)] [background-size:12px_12px]" />
          )}

          {/* iOS-Style Frosted Cover Control */}
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex items-center p-0.5 rounded-full bg-black/40 hover:bg-black/50 backdrop-blur-md border border-white/20 shadow-xs z-10 transition">
            <label
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full hover:bg-white/15 text-white text-xs font-medium cursor-pointer transition active:scale-95"
              title="Change cover photo"
            >
              {isUploadingBanner ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
              ) : (
                <Camera className="h-3.5 w-3.5 text-white" />
              )}
              <span>{isUploadingBanner ? 'Uploading...' : 'Edit'}</span>
              <input
                type="file"
                accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.svg"
                onChange={handleCoverFileSelect}
                disabled={isUploadingBanner}
                className="hidden"
              />
            </label>

            {bannerUrl && (
              <>
                <div className="h-3.5 w-px bg-white/25 mx-0.5" />
                <button
                  type="button"
                  onClick={handleRemoveCover}
                  className="h-6 w-6 rounded-full hover:bg-white/15 text-white/80 hover:text-white flex items-center justify-center transition cursor-pointer active:scale-95"
                  title="Remove cover photo"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Profile Info Row with Overlapping Avatar */}
        <div className="px-5 sm:px-8 pb-6 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between -mt-16 sm:-mt-20 mb-4 gap-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-left">
              {/* Avatar with Camera Overlay */}
              <div className="relative group shrink-0">
                {avatarUrl ? (
                  <img
                    key={avatarUrl}
                    src={avatarUrl}
                    alt={fullName || 'User'}
                    className="w-28 h-28 sm:w-36 sm:h-36 rounded-full object-cover border-4 border-white shadow-md bg-white transition-all duration-300"
                  />
                ) : (
                  <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-[#0B2545] text-white font-extrabold text-3xl sm:text-4xl flex items-center justify-center border-4 border-white shadow-md">
                    {(fullName || user?.full_name || 'U').charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Edit Avatar Camera Button */}
                <label
                  className="absolute bottom-1 right-1 h-8 w-8 rounded-full bg-white border border-gray-200 text-[#0B2545] flex items-center justify-center shadow-sm hover:bg-slate-50 cursor-pointer transition"
                  title="Upload profile photo"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                  <input
                    type="file"
                    accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.svg"
                    onChange={handleAvatarFileSelect}
                    disabled={isUploadingAvatar}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Identity Info */}
              <div className="pt-2 sm:pt-0">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                    {fullName || user?.full_name}
                  </h2>
                  <Badge variant="role" role={role} />
                  {resumeUrl && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                      <Check className="h-3 w-3" /> CV Attached
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">
                  {headline || 'Professional Job Seeker'}
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-1.5 text-xs text-slate-500">
                  {user?.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3 text-slate-400" />
                      <span>{user.email}</span>
                    </span>
                  )}
                  {phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3 text-slate-400" />
                      <span>{phone}</span>
                    </span>
                  )}
                  {location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-[#F97316]" />
                      <span>{location}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {resumeUrl && (
              <a
                href={resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 transition shadow-2xs shrink-0 cursor-pointer"
              >
                <FileText className="h-3.5 w-3.5 text-[#0B2545]" />
                <span>{t('profile_view_resume')}</span>
                <ExternalLink className="h-3 w-3 text-slate-400" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Main Profile Content Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Application Language Preference (iOS-style Segmented Control) */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-orange-50 border border-orange-200/60 flex items-center justify-center text-[#F97316] shrink-0">
                <Languages className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                    {t('profile_language_pref')}
                  </h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                    {languages.find((l) => l.code === selectedLang)?.nativeName}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">{t('profile_language_desc')}</p>
              </div>
            </div>

            {/* iOS Segmented Control */}
            <div className="inline-flex items-center p-1 rounded-xl bg-slate-100/90 border border-slate-200/70 shrink-0 self-start sm:self-auto w-full sm:w-auto">
              {languages.map((item) => {
                const isActive = selectedLang === item.code
                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => handleLanguageSelect(item.code)}
                    className={`flex-1 sm:flex-initial px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer text-center ${
                      isActive
                        ? 'bg-white text-[#0B2545] shadow-xs border border-black/5 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/40'
                    }`}
                  >
                    <span>{item.nativeName}</span>
                    <span className="text-[10px] opacity-70 ml-1 font-normal">
                      ({item.label})
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Section 2: Personal & Professional Details */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center text-[#0B2545]">
              <Briefcase className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                {t('profile_personal_details')}
              </h3>
              <p className="text-[11px] text-slate-500">
                Core identity information presented to HR recruiters across Tamil Nadu
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('profile_full_name')} *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Kavin Selvam"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-[#0B2545] focus:outline-none focus:ring-1 focus:ring-[#0B2545] shadow-2xs"
              />
            </div>

            {/* Headline */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('profile_headline')}
              </label>
              <input
                type="text"
                placeholder={t('profile_headline_placeholder')}
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-[#0B2545] focus:outline-none focus:ring-1 focus:ring-[#0B2545] shadow-2xs"
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('profile_dob')}
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => handleDobChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#0B2545] focus:outline-none focus:ring-1 focus:ring-[#0B2545] shadow-2xs"
                />
              </div>
            </div>

            {/* Age */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('profile_current_age')}
              </label>
              <input
                type="number"
                min="16"
                max="100"
                placeholder={t('profile_age_placeholder')}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-[#0B2545] focus:outline-none focus:ring-1 focus:ring-[#0B2545] shadow-2xs"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('profile_phone')}
              </label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="tel"
                  placeholder={t('profile_phone_placeholder')}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 pl-9 pr-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-[#0B2545] focus:outline-none focus:ring-1 focus:ring-[#0B2545] shadow-2xs"
                />
              </div>
            </div>

            {/* Location (with Google API suggestions) */}
            <div>
              <GoogleLocationSearchInput
                label={t('profile_location')}
                placeholder={t('profile_location_placeholder')}
                value={location}
                onChange={setLocation}
                inputClassName="rounded-xl border-slate-200 py-2.5 text-xs shadow-2xs"
              />
            </div>

            {/* Current Company */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('profile_company')}
              </label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={t('profile_company_placeholder')}
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 pl-9 pr-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-[#0B2545] focus:outline-none focus:ring-1 focus:ring-[#0B2545] shadow-2xs"
                />
              </div>
            </div>

            {/* Current Position */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('profile_position')}
              </label>
              <input
                type="text"
                placeholder={t('profile_position_placeholder')}
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-[#0B2545] focus:outline-none focus:ring-1 focus:ring-[#0B2545] shadow-2xs"
              />
            </div>
          </div>

          {/* Key Skills - Apple iOS Options Style */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">
                {t('profile_skills')}
              </label>
              <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {skillsList.length} {skillsList.length === 1 ? 'skill' : 'skills'}
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-3.5 sm:p-4 space-y-3">
              {/* Active Selected Skills (iOS Option Pills) */}
              {skillsList.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {skillsList.map((skill: string, index: number) => (
                    <span
                      key={`${skill}-${index}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200/90 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs group hover:border-slate-300 transition"
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(index)}
                        className="flex items-center justify-center h-4 w-4 rounded-full bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600 hover:!bg-red-500 hover:!text-white transition cursor-pointer"
                        title="Remove"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-1">
                  No skills added yet. Add from suggestions below or type your own.
                </p>
              )}

              {/* iOS Style Add Skill Input */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Type a skill and press Enter (e.g. React, UI/UX)..."
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault()
                        handleAddSkill(skillInput)
                      }
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-[#0B2545] focus:outline-none focus:ring-1 focus:ring-[#0B2545] shadow-2xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleAddSkill(skillInput)}
                  disabled={!skillInput.trim()}
                  className="inline-flex items-center gap-1 rounded-xl bg-[#0B2545] px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-[#133966] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add</span>
                </button>
              </div>

              {/* iOS Suggested Options Pills */}
              {SUGGESTED_SKILLS.filter(
                (s) => !skillsList.some((ex) => ex.toLowerCase() === s.toLowerCase())
              ).length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Suggested options:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTED_SKILLS.filter(
                      (s) => !skillsList.some((ex) => ex.toLowerCase() === s.toLowerCase())
                    ).map((suggested) => (
                      <button
                        key={suggested}
                        type="button"
                        onClick={() => handleAddSkill(suggested)}
                        className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 bg-white/90 hover:bg-blue-50/80 hover:border-blue-400 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:text-[#0B2545] transition cursor-pointer active:scale-95"
                      >
                        <Plus className="h-3 w-3 text-slate-400" />
                        <span>{suggested}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bio / Summary */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('profile_bio')}
            </label>
            <textarea
              rows={3}
              placeholder={t('profile_bio_placeholder')}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-[#0B2545] focus:outline-none focus:ring-1 focus:ring-[#0B2545] shadow-2xs leading-relaxed"
            />
          </div>
        </div>

        {/* Section 3: Resume Document (Simple Human iOS Design) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-slate-100 text-[#0B2545] flex items-center justify-center">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                  {t('profile_resume_heading')}
                </h3>
                <p className="text-[11px] text-slate-500">{t('profile_resume_desc')}</p>
              </div>
            </div>
            {resumeUrl && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/80">
                <Check className="h-3 w-3" /> Ready
              </span>
            )}
          </div>

          {/* Active Attached Resume Card (iOS Files Style) */}
          {resumeUrl ? (
            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 text-[#0B2545] flex items-center justify-center shrink-0 shadow-2xs">
                  <FileText className="h-5 w-5 text-red-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {cleanResumeFileName(resumeUrl)}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Attached to your application profile
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition cursor-pointer"
                >
                  <span>{t('profile_view_resume')}</span>
                  <ExternalLink className="h-3 w-3 text-slate-400" />
                </a>

                <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0B2545] hover:bg-[#133966] text-xs font-semibold text-white shadow-2xs transition cursor-pointer">
                  {isUploadingResume ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UploadCloud className="h-3.5 w-3.5" />
                  )}
                  <span>{isUploadingResume ? 'Updating...' : 'Replace'}</span>
                  <input
                    type="file"
                    accept="application/pdf,.pdf,.docx,.doc,.txt,text/plain"
                    disabled={isUploadingResume}
                    onChange={handleResumeFileSelect}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          ) : (
            /* Upload Dropzone when no resume attached */
            <div>
              <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 p-6 hover:border-[#0B2545] hover:bg-slate-50/50 transition cursor-pointer group">
                <div className="h-10 w-10 rounded-full bg-slate-100 group-hover:bg-blue-50 flex items-center justify-center text-slate-500 group-hover:text-[#0B2545] transition mb-2">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-[#0B2545] group-hover:underline">
                  {isUploadingResume ? t('profile_uploading_resume') : t('profile_upload_resume')}
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5">
                  PDF or Word document (up to 10MB)
                </span>
                <input
                  type="file"
                  accept="application/pdf,.pdf,.docx,.doc,.txt,text/plain"
                  disabled={isUploadingResume}
                  onChange={handleResumeFileSelect}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* Loading state while uploading / parsing */}
          {isExtractingAi && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin text-[#0B2545] shrink-0" />
              <span>
                {language === 'ta'
                  ? 'தன்விவரக் குறிப்பு பகுப்பாய்வு செய்யப்படுகிறது...'
                  : language === 'hi'
                  ? 'बायोडाटा का विश्लेषण किया जा रहा है...'
                  : 'Analyzing resume and updating profile details...'}
              </span>
            </div>
          )}
        </div>

      </form>
    </div>
  )
}
