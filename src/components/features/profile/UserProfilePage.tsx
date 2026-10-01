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
  Edit,
  Clock,
  CheckCircle2,
} from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../context/ToastContext'
import { useLanguage } from '../../../context/LanguageContext'
import { Badge } from '../../ui/Badge'
import { uploadService } from '../../../services/api'
import { parseResumeWithAi, extractTextFromPdf, isResumeDocument } from '../../../services/resumeParser'
import type { SupportedLanguage } from '../../../utils/i18n'
import { GoogleLocationSearchInput } from '../../ui/GoogleLocationSearchInput'
import { parseSkillsArray, cleanSkillString } from '../../../utils/skills'
import { DynamicTranslatedText } from '../../ui/DynamicTranslatedText'
import { translateLocationSync } from '../../../services/googleAiTranslate'

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

interface ResumeMeta {
  fileName: string
  fileSize: string
  fileType: string
  uploadedAt: string
}

export interface UserProfilePageProps {
  onBack?: () => void
  onRequestEdit?: () => void
  className?: string
  showHeaderBack?: boolean
}

export const UserProfilePage: React.FC<UserProfilePageProps> = ({
  onBack,
  onRequestEdit,
  className = '',
  showHeaderBack = true,
}) => {
  const { user, role, updateUserProfile } = useAuth()
  const { showToast, showConfirm } = useToast()
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

  const [resumeMeta, setResumeMeta] = useState<ResumeMeta | null>(() => {
    try {
      if (user?.id) {
        const raw = localStorage.getItem(`namma_resume_meta_${user.id}`)
        if (raw) return JSON.parse(raw)
      }
    } catch {}
    return null
  })
  const [extractedSkillsFeedback, setExtractedSkillsFeedback] = useState<string[]>([])
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [uploadFileName, setUploadFileName] = useState<string>('')
  const [uploadStepText, setUploadStepText] = useState<string>('')

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

  // Interactive Resume Review State (Requirement 17: User Review is Required)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [reviewData, setReviewData] = useState<{
    fullName: string
    headline: string
    position: string
    company: string
    location: string
    bio: string
    phone: string
    skills: string[]
    languages: string[]
    resumeUrl: string
    resumeMeta: ResumeMeta
  } | null>(null)
  const [reviewSkillInput, setReviewSkillInput] = useState('')

  // Handle Resume Upload & AI Content Extraction with User Review
  const handleResumeFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const lowerName = file.name.toLowerCase()
    const validExtensions = ['.pdf', '.docx', '.doc']
    const hasValidExt = validExtensions.some((ext) => lowerName.endsWith(ext))

    if (!hasValidExt && file.type !== 'application/pdf') {
      showToast('Please upload a PDF or Word (DOCX/DOC) document', 'error')
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

    setUploadFileName(file.name)
    setIsUploadingResume(true)
    setIsExtractingAi(true)
    setUploadProgress(20)
    setUploadStepText('Validating document content...')

    try {
      // 1. Technical & Content Classification Validation (Requirements 12, 13, 14)
      const rawText = await extractTextFromPdf(file)
      const classification = isResumeDocument(rawText, file.name)
      if (!classification.isValid) {
        showToast(classification.reason || 'Please upload a valid CV or resume.', 'error')
        setIsUploadingResume(false)
        setIsExtractingAi(false)
        setUploadProgress(0)
        return
      }

      setUploadProgress(45)
      setUploadStepText(
        language === 'ta'
          ? 'கிளவுட் சேமிப்பகத்தில் ஆவணம் பதிவேற்றப்படுகிறது...'
          : language === 'hi'
          ? 'क्लाउड स्टोरेज में दस्तावेज़ अपलोड किया जा रहा है...'
          : 'Uploading document to secure cloud storage...'
      )

      // 2. Upload to Cloudflare R2
      const uploaded = await uploadService.uploadFile(file, 'resumes')
      setResumeUrl(uploaded.url)

      setUploadProgress(70)
      setUploadStepText(
        language === 'ta'
          ? 'திறன்கள் மற்றும் அனுபவங்களை பகுப்பாய்வு செய்கிறது...'
          : language === 'hi'
          ? 'कौशल और अनुभव का विश्लेषण किया जा रहा है...'
          : 'Extracting skills, credentials & experience...'
      )

      // 3. Store resume metadata
      const sizeFormatted =
        file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.max(1, Math.round(file.size / 1024))} KB`
      const extFormatted = file.name.split('.').pop()?.toUpperCase() || 'PDF'
      const meta: ResumeMeta = {
        fileName: file.name,
        fileSize: sizeFormatted,
        fileType: `${extFormatted} Document`,
        uploadedAt: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      }
      setResumeMeta(meta)
      if (user?.id) {
        try {
          localStorage.setItem(`namma_resume_meta_${user.id}`, JSON.stringify(meta))
        } catch {}
      }

      // 4. AI Resume Intelligence Extraction
      const parsedData = await parseResumeWithAi(file, uploaded.url)
      setUploadProgress(100)

      // 5. User Review Flow (Requirement 17: User Review is Required before saving)
      const extractedSkills = parseSkillsArray(parsedData.skills)
      setReviewData({
        fullName: parsedData.fullName || fullName,
        headline: parsedData.headline || headline || `${extractedSkills.slice(0, 3).join(' / ')} Specialist`,
        position: parsedData.position || position || parsedData.currentJobTitle || 'Specialist',
        company: parsedData.company || company || '',
        location: parsedData.location || location || 'Chennai, Tamil Nadu',
        bio: parsedData.bio || bio || parsedData.professionalSummary || '',
        phone: parsedData.phone || phone || '',
        skills: extractedSkills,
        languages: parsedData.languages || ['English', 'Tamil'],
        resumeUrl: uploaded.url,
        resumeMeta: meta,
      })
      setReviewModalOpen(true)
    } catch (err: any) {
      showToast(err.message || 'Failed to upload/analyze resume', 'error')
    } finally {
      setIsUploadingResume(false)
      setIsExtractingAi(false)
      setTimeout(() => {
        setUploadProgress(0)
        setUploadFileName('')
        setUploadStepText('')
      }, 500)
    }
  }

  // Confirm Reviewed Resume Information and Apply to Profile (Requirement 17)
  const handleConfirmReview = async () => {
    if (!reviewData) return
    setIsSaving(true)
    try {
      setFullName(reviewData.fullName)
      setHeadline(reviewData.headline)
      setPosition(reviewData.position)
      setCompany(reviewData.company)
      setLocation(reviewData.location)
      setBio(reviewData.bio)
      if (reviewData.phone) setPhone(reviewData.phone)
      setSkillsList(reviewData.skills)
      setResumeUrl(reviewData.resumeUrl)
      setResumeMeta(reviewData.resumeMeta)
      setExtractedSkillsFeedback(reviewData.skills)

      await updateUserProfile({
        full_name: reviewData.fullName || undefined,
        skills: reviewData.skills,
        headline: reviewData.headline,
        position: reviewData.position,
        company: reviewData.company,
        location: reviewData.location,
        bio: reviewData.bio,
        phone: reviewData.phone || undefined,
        resume_url: reviewData.resumeUrl,
      })

      showToast(
        language === 'ta'
          ? 'தன்விவரக் குறிப்பு விவரங்கள் உறுதி செய்யப்பட்டு சேமிக்கப்பட்டன!'
          : language === 'hi'
          ? 'बायोडाटा विवरण की पुष्टि की गई और सहेजा गया!'
          : 'Resume details reviewed and applied to your profile!',
        'success'
      )
      setReviewModalOpen(false)
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile from resume', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemoveReviewSkill = (index: number) => {
    if (!reviewData) return
    setReviewData({
      ...reviewData,
      skills: reviewData.skills.filter((_, idx) => idx !== index),
    })
  }

  const handleAddReviewSkill = () => {
    if (!reviewData || !reviewSkillInput.trim()) return
    const cleaned = cleanSkillString(reviewSkillInput.trim())
    if (cleaned && !reviewData.skills.some((s) => s.toLowerCase() === cleaned.toLowerCase())) {
      setReviewData({
        ...reviewData,
        skills: [...reviewData.skills, cleaned],
      })
    }
    setReviewSkillInput('')
  }

  const handleRemoveResume = () => {
    const confirmTitle =
      language === 'ta'
        ? 'தன்விவரக் குறிப்பை அகற்றவா?'
        : language === 'hi'
        ? 'बायोडाटा हटाएं?'
        : 'Remove Resume?'
    const confirmMessage =
      language === 'ta'
        ? 'உங்கள் தன்விவரக் குறிப்பை அகற்ற விரும்புகிறீர்களா?'
        : language === 'hi'
        ? 'क्या आप अपना बायोडाटा हटाना चाहते हैं?'
        : 'Are you sure you want to remove this resume from your profile?'

    showConfirm({
      title: confirmTitle,
      message: confirmMessage,
      confirmText: language === 'ta' ? 'அகற்று' : language === 'hi' ? 'हटाएं' : 'Remove',
      cancelText: language === 'ta' ? 'ரத்து' : language === 'hi' ? 'रद्द करें' : 'Cancel',
      isDestructive: true,
      onConfirm: async () => {
        const prevResume = resumeUrl
        setResumeUrl('')
        setExtractedSkillsFeedback([])
        setResumeMeta(null)
        if (user?.id) {
          try {
            localStorage.removeItem(`namma_resume_meta_${user.id}`)
          } catch {}
        }

        try {
          await updateUserProfile({ resume_url: '' })
          showToast(
            language === 'ta'
              ? 'தன்விவரக் குறிப்பு அகற்றப்பட்டது'
              : language === 'hi'
              ? 'बायोडाटा हटा दिया गया'
              : 'Resume removed successfully',
            'info',
            language === 'ta' ? 'அகற்றப்பட்டது' : language === 'hi' ? 'हटा दिया गया' : 'Resume Removed'
          )
        } catch (err: any) {
          setResumeUrl(prevResume)
          showToast(err.message || 'Failed to remove resume', 'error')
        }
      },
    })
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

  const handleRemoveCover = () => {
    showConfirm({
      title:
        language === 'ta'
          ? 'அட்டைப்படத்தை அகற்றவா?'
          : language === 'hi'
          ? 'कवर फोटो हटाएं?'
          : 'Remove Cover Photo?',
      message:
        language === 'ta'
          ? 'உங்கள் அட்டைப்படத்தை அகற்ற விரும்புகிறீர்களா?'
          : language === 'hi'
          ? 'क्या आप कवर फोटो हटाना चाहते हैं?'
          : 'Are you sure you want to remove your cover photo?',
      confirmText: language === 'ta' ? 'அகற்று' : language === 'hi' ? 'हटाएं' : 'Remove',
      cancelText: language === 'ta' ? 'ரத்து' : language === 'hi' ? 'रद्द करें' : 'Cancel',
      isDestructive: true,
      onConfirm: async () => {
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
            'info',
            language === 'ta' ? 'அகற்றப்பட்டது' : language === 'hi' ? 'हटा दिया गया' : 'Cover Photo Removed'
          )
        } catch (err: any) {
          setBannerUrl(prevBanner)
          showToast(err.message || 'Failed to remove cover photo', 'error')
        }
      },
    })
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
  // ─────────────────────────────────────────────────────────────────────────────
  // HR / Recruiter — read-only profile card with approval-gated edit workflow
  // ─────────────────────────────────────────────────────────────────────────────
  if (role === 'manager' && user) {
    const isApproved = (user.status || '').toUpperCase() === 'ACTIVE'
    const hasPending = !!user.pending_profile
    let pendingData: any = null
    try { if (hasPending && user.pending_profile) pendingData = JSON.parse(user.pending_profile) } catch {}

    return (
      <div className={`space-y-5 pb-12 ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {showHeaderBack && onBack && (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center justify-center h-9 w-9 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-[#0B2545] hover:border-slate-300 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div>
              <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">Recruiter Profile</h1>
              <p className="text-xs text-slate-500 mt-0.5">Your professional information visible to the platform</p>
            </div>
          </div>
          {!hasPending && (
            <button
              type="button"
              onClick={onRequestEdit}
              className="flex items-center gap-1.5 rounded-xl bg-[#0B2545] px-4 py-2 text-xs font-bold text-white hover:bg-[#071A31] transition shadow-xs cursor-pointer"
            >
              <Edit className="h-3.5 w-3.5" />
              <span>Edit Profile</span>
            </button>
          )}
        </div>

        {/* Pending Edit Notice */}
        {hasPending && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 flex items-start gap-3">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <Clock className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900">Profile update pending admin review</p>
              <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                Your profile edit has been submitted and is awaiting admin approval. Your existing profile remains active until changes are approved.
              </p>
              {pendingData && (
                <div className="mt-2 text-xs text-amber-800 space-y-0.5">
                  {pendingData.company && <p><span className="font-medium">Company:</span> {pendingData.company}</p>}
                  {pendingData.position && <p><span className="font-medium">Designation:</span> {pendingData.position}</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Approval Status */}
        {isApproved && !hasPending && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <p className="text-xs font-semibold text-emerald-800">Profile verified and approved by admin</p>
          </div>
        )}

        {/* Cover Banner */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="h-36 sm:h-44 bg-gradient-to-r from-[#0B2545] via-[#163866] to-[#0B2545] relative overflow-hidden">
            {bannerUrl ? (
              <img src={bannerUrl} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#F97316_1px,transparent_1px)] [background-size:12px_12px]" />
            )}
            {/* cover edit button */}
            <div className="absolute top-3 right-3">
              <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 hover:bg-black/50 backdrop-blur-sm border border-white/20 text-white text-xs font-medium cursor-pointer transition">
                {isUploadingBanner ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                <span>{isUploadingBanner ? 'Uploading...' : 'Edit'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleCoverFileSelect} disabled={isUploadingBanner} />
              </label>
            </div>
          </div>

          <div className="px-5 pb-5">
            <div className="flex items-end justify-between -mt-10 sm:-mt-12 mb-3">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full border-4 border-white bg-slate-100 overflow-hidden shadow-sm">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={user.full_name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-[#0B2545] text-white text-2xl font-bold uppercase">
                      {user.full_name?.charAt(0) || 'H'}
                    </div>
                  )}
                </div>
                <label className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-[#0B2545] border-2 border-white cursor-pointer shadow-sm hover:bg-[#071A31] transition active:scale-95" title="Upload avatar">
                  {isUploadingAvatar ? <Loader2 className="h-3 w-3 text-white animate-spin" /> : <Camera className="h-3 w-3 text-white" />}
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarFileSelect} disabled={isUploadingAvatar} />
                </label>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{user.full_name}</h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200/60 uppercase tracking-wide">HR Recruiter</span>
              </div>
              <DynamicTranslatedText
                text={user.headline || (user.position ? `${user.position}${user.company ? ` at ${user.company}` : ''}` : 'HR Recruiter')}
                as="p"
                className="text-xs sm:text-sm text-slate-600 font-medium"
              />
              <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-500">
                {user.email && <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-slate-400" />{user.email}</span>}
                {user.phone && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-slate-400" />{user.phone}</span>}
                {user.location && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-[#F97316]" />{translateLocationSync(user.location, language)}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Company & Role Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center text-[#0B2545]">
              <Building2 className="h-4 w-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Company & Role</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Company / Organisation</p>
              <p className="text-sm font-semibold text-slate-900">{user.company || <span className="text-slate-400 font-normal italic">Not provided</span>}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Designation</p>
              <p className="text-sm font-semibold text-slate-900">{user.position || <span className="text-slate-400 font-normal italic">Not provided</span>}</p>
            </div>
            {user.location && (
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Location</p>
                <p className="text-sm font-semibold text-slate-900">{user.location}</p>
              </div>
            )}
            {user.phone && (
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Contact</p>
                <p className="text-sm font-semibold text-slate-900">{user.phone}</p>
              </div>
            )}
          </div>
          {user.bio && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">About</p>
              <DynamicTranslatedText
                text={user.bio}
                as="p"
                className="text-xs text-slate-700 leading-relaxed"
                showOriginalToggle
              />
            </div>
          )}
        </div>

        {/* Language Preference */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-orange-50 border border-orange-200/60 flex items-center justify-center text-[#F97316] shrink-0">
                <Languages className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">{t('profile_language_pref')}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">{t('profile_language_desc')}</p>
              </div>
            </div>
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
                    <span className="text-[10px] opacity-70 ml-1 font-normal">({item.label})</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Edit CTA bottom */}
        {!hasPending && (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={onRequestEdit}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shadow-xs cursor-pointer"
            >
              <Edit className="h-4 w-4 text-slate-500" />
              Request Profile Edit
            </button>
          </div>
        )}
      </div>
    )
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
          <div className="flex items-end justify-between -mt-16 sm:-mt-20 mb-4">
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
                className="absolute bottom-1 right-1 h-8 w-8 rounded-full bg-white border border-gray-200 text-[#0B2545] flex items-center justify-center shadow-sm hover:bg-slate-50 cursor-pointer transition active:scale-95"
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

            {resumeUrl && (
              <a
                href={resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 transition shadow-2xs shrink-0 cursor-pointer mb-1"
              >
                <FileText className="h-3.5 w-3.5 text-[#0B2545]" />
                <span>{t('profile_view_resume')}</span>
                <ExternalLink className="h-3 w-3 text-slate-400" />
              </a>
            )}
          </div>

          {/* Identity Info */}
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {fullName || user?.full_name}
              </h1>
              {role && role !== 'employee' && <Badge variant="role" role={role} />}
            </div>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              {headline || 'Professional Job Seeker'}
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-500">
              {user?.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <span>{user.email}</span>
                </span>
              )}
              {phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span>{phone}</span>
                </span>
              )}
              {location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-[#F97316]" />
                  <span>{location}</span>
                </span>
              )}
            </div>
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
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#0B2545] focus:outline-none focus:ring-1 focus:ring-[#0B2545] shadow-2xs"
              />
            </div>

            {/* Headline */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('profile_headline')}
              </label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#0B2545] focus:outline-none focus:ring-1 focus:ring-[#0B2545] shadow-2xs"
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
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#0B2545] focus:outline-none focus:ring-1 focus:ring-[#0B2545] shadow-2xs"
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
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 pl-9 pr-3.5 py-2.5 text-xs text-slate-900 focus:border-[#0B2545] focus:outline-none focus:ring-1 focus:ring-[#0B2545] shadow-2xs"
                />
              </div>
            </div>

            {/* Location (with Google API suggestions) */}
            <div>
              <GoogleLocationSearchInput
                label={t('profile_location')}
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
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 pl-9 pr-3.5 py-2.5 text-xs text-slate-900 focus:border-[#0B2545] focus:outline-none focus:ring-1 focus:ring-[#0B2545] shadow-2xs"
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
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#0B2545] focus:outline-none focus:ring-1 focus:ring-[#0B2545] shadow-2xs"
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
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault()
                        handleAddSkill(skillInput)
                      }
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-[#0B2545] focus:outline-none focus:ring-1 focus:ring-[#0B2545] shadow-2xs"
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
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#0B2545] focus:outline-none focus:ring-1 focus:ring-[#0B2545] shadow-2xs leading-relaxed"
            />
          </div>
        </div>

        {/* Section 3: Resume Document (Simple Human iOS Design) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-[#0B2545]/10 text-[#0B2545] flex items-center justify-center">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  {t('profile_resume_heading')}
                </h3>
                <p className="text-[11px] text-slate-500">{t('profile_resume_desc')}</p>
              </div>
            </div>
          </div>

          {/* Active Uploading / Analyzing Progress Card */}
          {(isUploadingResume || isExtractingAi) && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Loader2 className="h-4 w-4 animate-spin text-[#0B2545] shrink-0" />
                  <span className="font-semibold text-slate-800 truncate">
                    {uploadFileName || 'Processing document...'}
                  </span>
                </div>
                <span className="font-semibold text-slate-600">{uploadProgress}%</span>
              </div>
              {/* Progress Bar */}
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#0B2545] h-1.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                {uploadStepText || 'Processing resume document...'}
              </p>
            </div>
          )}

          {/* Post-Upload Extraction Reaction Feedback */}
          {extractedSkillsFeedback.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 sm:p-4 space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                    <Check className="h-3.5 w-3.5 text-slate-600" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      Resume Analyzed & Verified
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {extractedSkillsFeedback.length} skills identified and linked to your candidate profile
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setExtractedSkillsFeedback([])}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition"
                  title="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {extractedSkillsFeedback.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200 text-[11px] font-medium"
                  >
                    <Check className="h-3 w-3 text-slate-400" />
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Active Attached Resume Card */}
          {resumeUrl ? (() => {
            const displayFileName = resumeMeta?.fileName || cleanResumeFileName(resumeUrl)
            const displayExt = displayFileName.split('.').pop()?.toUpperCase() || 'PDF'
            const displaySize = resumeMeta?.fileSize || 'Document'
            const displayDate = resumeMeta?.uploadedAt
              ? `Uploaded ${resumeMeta.uploadedAt}`
              : 'Active on your profile'

            return (
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition duration-200">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Document Format Icon */}
                  <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 text-slate-600 flex flex-col items-center justify-center shrink-0 shadow-2xs">
                    <FileText className="h-4 w-4 text-slate-600" />
                    <span className="text-[8px] font-bold uppercase text-slate-500">
                      {displayExt}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {displayFileName}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                      <span>{displaySize}</span>
                      <span className="text-slate-300">•</span>
                      <span>{displayDate}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-600 font-medium">Attached to profile</span>
                    </div>
                  </div>
                </div>

                {/* Actions: View, Replace, Remove */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <a
                    href={resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition cursor-pointer"
                    title="View resume document in new tab"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                    <span>{t('profile_view_resume')}</span>
                  </a>

                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B2545] hover:bg-[#133966] text-xs font-medium text-white transition cursor-pointer">
                    {isUploadingResume ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UploadCloud className="h-3.5 w-3.5" />
                    )}
                    <span>{isUploadingResume ? 'Updating...' : 'Replace'}</span>
                    <input
                      type="file"
                      accept=".pdf,.docx,.doc,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      disabled={isUploadingResume}
                      onChange={handleResumeFileSelect}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleRemoveResume}
                    className="p-1.5 rounded-lg border border-slate-200 hover:border-slate-300 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                    title="Remove resume from profile"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })() : (
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
                  accept=".pdf,.docx,.doc,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  disabled={isUploadingResume}
                  onChange={handleResumeFileSelect}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>

      </form>

      {/* Requirement 17: Interactive User Review Modal for Detected Resume Information */}
      {reviewModalOpen && reviewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-[#F2F2F7]/95 backdrop-blur-2xl rounded-[22px] border border-white/60 shadow-xl max-w-lg w-full p-5 sm:p-6 space-y-4 text-left my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-[#0B2545]/10 text-[#0B2545] flex items-center justify-center">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                    Review Extracted Profile Information
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Review and adjust detected details before applying to your profile
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Fields to Review & Edit */}
            <div className="space-y-3 text-xs max-h-[60vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={reviewData.fullName}
                  onChange={(e) => setReviewData({ ...reviewData, fullName: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-[#0B2545] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Current Job Title / Role
                </label>
                <input
                  type="text"
                  value={reviewData.position}
                  onChange={(e) => setReviewData({ ...reviewData, position: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-[#0B2545] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Professional Headline
                </label>
                <input
                  type="text"
                  value={reviewData.headline}
                  onChange={(e) => setReviewData({ ...reviewData, headline: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-[#0B2545] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Company / Employer
                  </label>
                  <input
                    type="text"
                    value={reviewData.company}
                    onChange={(e) => setReviewData({ ...reviewData, company: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-[#0B2545] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={reviewData.location}
                    onChange={(e) => setReviewData({ ...reviewData, location: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-[#0B2545] focus:outline-none"
                  />
                </div>
              </div>

              {/* Skills Review */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Detected Skills ({reviewData.skills.length})
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200 min-h-[44px]">
                  {reviewData.skills.map((skill, idx) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white text-slate-800 border border-slate-200 text-[11px] font-medium shadow-2xs"
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveReviewSkill(idx)}
                        className="text-slate-400 hover:text-rose-600 transition cursor-pointer"
                        title="Remove skill"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={reviewSkillInput}
                    onChange={(e) => setReviewSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddReviewSkill()
                      }
                    }}
                    className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900 focus:border-[#0B2545] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddReviewSkill}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Professional Summary
                </label>
                <textarea
                  rows={3}
                  value={reviewData.bio}
                  onChange={(e) => setReviewData({ ...reviewData, bio: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#0B2545] focus:outline-none leading-relaxed"
                />
              </div>
            </div>

            {/* Actions: Cancel vs Confirm & Apply */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReview}
                className="px-4 py-2 rounded-xl bg-[#0B2545] hover:bg-[#133966] text-xs font-semibold text-white transition shadow-2xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Confirm & Apply to Profile</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
