import React, { useState, useEffect, useMemo } from 'react'
import {
  Briefcase,
  Phone,
  FileText,
  UploadCloud,
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
  GraduationCap,
  MessageSquare,
  MessageCircle,
  Heart,
  Send,
  Image as ImageIcon,
} from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../context/ToastContext'
import { useLanguage } from '../../../context/LanguageContext'
import { Badge } from '../../ui/Badge'
import { uploadService, socialService, feedService, commentService, type PostComment } from '../../../services/api'
import type { SupportedLanguage } from '../../../utils/i18n'
import type { Post } from '../../../types'
import { Avatar } from '../../ui/Avatar'
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
  const [dob, setDob] = useState(user?.date_of_birth || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [location, setLocation] = useState(user?.location || '')
  const [userState, setUserState] = useState(user?.state || '')
  const [pincode, setPincode] = useState(user?.pincode || '')
  const [company, setCompany] = useState(user?.company || '')
  const [position, setPosition] = useState(user?.position || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [skillsList, setSkillsList] = useState<string[]>(() => parseSkillsArray(user?.skills))
  const [skillInput, setSkillInput] = useState('')
  const [resumeUrl, setResumeUrl] = useState(user?.resume_url || '')
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>(language)

  // Keep selected language strictly synchronized with the actual application language
  useEffect(() => {
    setSelectedLang(language)
  }, [language])

  // Experience Status (Fresher vs Experienced)
  const [experienceLevel, setExperienceLevel] = useState<'fresher' | 'experienced'>(() => {
    if (user?.company || (user?.experience_years && user.experience_years > 0) || user?.position) {
      return 'experienced'
    }
    if (user?.experience_level === 'fresher' || user?.experience_level === 'experienced') {
      return user.experience_level
    }
    return 'fresher'
  })

  // Only displayed for first time user form fill; thereafter no need
  const isFirstTimeUser = useMemo(() => {
    if (!user) return false
    if (user.experience_level === 'fresher' || user.experience_level === 'experienced') {
      return false
    }
    const hasFilledProfile = Boolean(
      (user.company && user.company.trim()) ||
      (user.position && user.position.trim()) ||
      (user.resume_url && user.resume_url.trim()) ||
      (user.headline && user.headline.trim()) ||
      (user.bio && user.bio.trim()) ||
      (user.location && user.location.trim()) ||
      (user.state && user.state.trim()) ||
      (user.pincode && user.pincode.trim()) ||
      (user.education_degree && user.education_degree.trim()) ||
      (user.experience_years !== undefined && user.experience_years !== null && Number(user.experience_years) > 0) ||
      (user.skills && user.skills.length > 0)
    )
    return !hasFilledProfile
  }, [user])
  const [experienceYears, setExperienceYears] = useState<string>(
    user?.experience_years !== undefined ? String(user.experience_years) : ''
  )
  const [educationDegree, setEducationDegree] = useState(user?.education_degree || '')
  const [educationCollege, setEducationCollege] = useState(user?.education_college || '')
  const [educationYear, setEducationYear] = useState(user?.education_year || '')

  const [resumeMeta, setResumeMeta] = useState<ResumeMeta | null>(() => {
    try {
      if (user?.id) {
        const raw = localStorage.getItem(`namma_resume_meta_${user.id}`)
        if (raw) return JSON.parse(raw)
      }
    } catch {}
    return null
  })
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [uploadFileName, setUploadFileName] = useState<string>('')
  const [uploadFileSize, setUploadFileSize] = useState<string>('')

  const [isUploadingResume, setIsUploadingResume] = useState(false)
  const [isUploadingBanner, setIsUploadingBanner] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Track whether user made any changes to profile
  const hasChanges = useMemo(() => {
    if (!user) return false

    if ((fullName || '').trim() !== (user.full_name || '').trim()) return true
    if ((headline || '').trim() !== (user.headline || '').trim()) return true
    if ((avatarUrl || '') !== (user.avatar_url || '')) return true
    if ((bannerUrl || '') !== (user.banner_url || '')) return true
    if ((dob || '') !== (user.date_of_birth || '')) return true
    if ((phone || '').trim() !== (user.phone || '').trim()) return true
    if ((location || '').trim() !== (user.location || '').trim()) return true
    if ((userState || '').trim() !== (user.state || '').trim()) return true
    if ((pincode || '').trim() !== (user.pincode || '').trim()) return true
    if ((bio || '').trim() !== (user.bio || '').trim()) return true
    if ((resumeUrl || '') !== (user.resume_url || '')) return true
    if (selectedLang !== ((user.language as SupportedLanguage) || 'en')) return true

    // Experience Status Changes
    const initialExpLevel =
      user.experience_level === 'fresher' || user.experience_level === 'experienced'
        ? user.experience_level
        : (user.company || (user.experience_years && user.experience_years > 0) || user.position ? 'experienced' : 'fresher')

    if (experienceLevel !== initialExpLevel) return true

    if (experienceLevel === 'experienced') {
      if ((company || '').trim() !== (user.company || '').trim()) return true
      if ((position || '').trim() !== (user.position || '').trim()) return true
      if ((experienceYears || '') !== (user.experience_years !== undefined ? String(user.experience_years) : '')) return true
    }

    // Education background changes
    if ((educationDegree || '').trim() !== (user.education_degree || '').trim()) return true
    if ((educationCollege || '').trim() !== (user.education_college || '').trim()) return true
    if ((educationYear || '').trim() !== (user.education_year || '').trim()) return true

    const initialSkills = parseSkillsArray(user.skills).map((s) => s.trim().toLowerCase()).sort()
    const currentSkills = skillsList.map((s) => s.trim().toLowerCase()).sort()
    if (initialSkills.length !== currentSkills.length) return true
    for (let i = 0; i < initialSkills.length; i++) {
      if (initialSkills[i] !== currentSkills[i]) return true
    }

    return false
  }, [
    user,
    fullName,
    headline,
    avatarUrl,
    bannerUrl,
    dob,
    phone,
    location,
    company,
    position,
    bio,
    resumeUrl,
    skillsList,
    selectedLang,
    language,
    experienceLevel,
    experienceYears,
    educationDegree,
    educationCollege,
    educationYear,
  ])

  // Keep form in sync if user changes
  useEffect(() => {
    if (user) {
      if (!fullName) setFullName(user.full_name || '')
      if (!headline) setHeadline(user.headline || '')
      if (!isUploadingAvatar && user.avatar_url !== undefined) setAvatarUrl(user.avatar_url || '')
      if (!isUploadingBanner && user.banner_url !== undefined) setBannerUrl(user.banner_url || '')
      if (!dob && user.date_of_birth) setDob(user.date_of_birth)
      if (!phone && user.phone) setPhone(user.phone)
      if (!location && user.location) setLocation(user.location)
      if (user.state !== undefined) setUserState(user.state || '')
      if (user.pincode !== undefined) setPincode(user.pincode || '')
      if (!company && user.company) setCompany(user.company)
      if (!position && user.position) setPosition(user.position)
      if (!bio && user.bio) setBio(user.bio)
      if (!resumeUrl && user.resume_url) setResumeUrl(user.resume_url)
      if (user.skills && skillsList.length === 0) {
        setSkillsList(parseSkillsArray(user.skills))
      }
      if (user.company || (user.experience_years && user.experience_years > 0) || user.position) {
        setExperienceLevel('experienced')
      } else if (user.experience_level === 'fresher' || user.experience_level === 'experienced') {
        setExperienceLevel(user.experience_level)
      }
      if (user.experience_years !== undefined) setExperienceYears(String(user.experience_years))
      if (user.education_degree) setEducationDegree(user.education_degree)
      if (user.education_college) setEducationCollege(user.education_college)
    }
  }, [user])

  // Instagram Profile View: Tabs ('thoughts' | 'edit')
  const [activeProfileTab, setActiveProfileTab] = useState<'thoughts' | 'edit'>('thoughts')
  const [followersCount, setFollowersCount] = useState<number>(user?.followers_count || 0)
  const [followingCount, setFollowingCount] = useState<number>(user?.following_count || 0)
  const [thoughtsList, setThoughtsList] = useState<Post[]>([])
  const [loadingThoughts, setLoadingThoughts] = useState(false)

  // Comments Drawer / Modal State
  const [commentPostId, setCommentPostId] = useState<string | null>(null)
  const [comments, setComments] = useState<PostComment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [commentInput, setCommentInput] = useState('')
  const [isPostingComment, setIsPostingComment] = useState(false)

  // Create Thought Modal State
  const [isCreateThoughtModalOpen, setIsCreateThoughtModalOpen] = useState(false)
  const [thoughtTitle, setThoughtTitle] = useState('')
  const [thoughtContent, setThoughtContent] = useState('')
  const [thoughtMediaUrl, setThoughtMediaUrl] = useState<string | null>(null)
  const [isUploadingThoughtMedia, setIsUploadingThoughtMedia] = useState(false)
  const [isSubmittingThought, setIsSubmittingThought] = useState(false)

  // Fetch dynamic follower/following and user thoughts from backend API
  const fetchUserSocialData = async () => {
    if (!user?.id) return
    try {
      setLoadingThoughts(true)
      const res = await socialService.getUserProfile(user.id)
      if (res?.profile) {
        setFollowersCount(res.profile.followers_count ?? 0)
        setFollowingCount(res.profile.following_count ?? 0)
        setThoughtsList(res.profile.thoughts || res.profile.posts || [])
      }
    } catch (err) {
      console.error('Failed to load profile social details:', err)
    } finally {
      setLoadingThoughts(false)
    }
  }

  useEffect(() => {
    fetchUserSocialData()
  }, [user?.id])

  const handleLikePost = async (postId: string) => {
    try {
      const res = await feedService.likePost(postId)
      setThoughtsList((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                is_liked: res.liked !== undefined ? res.liked : !p.is_liked,
                likes_count: res.likes_count ?? (p.is_liked ? Math.max(0, p.likes_count - 1) : p.likes_count + 1),
              }
            : p
        )
      )
    } catch {
      showToast('Failed to update like status', 'error')
    }
  }

  const handleCreateThought = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!thoughtContent.trim() && !thoughtTitle.trim()) {
      showToast('Please add some content for your thought', 'error')
      return
    }
    setIsSubmittingThought(true)
    try {
      await feedService.createPost(
        thoughtContent.trim(),
        thoughtMediaUrl ? [thoughtMediaUrl] : [],
        thoughtTitle.trim() || undefined
      )
      showToast('Thought posted successfully!', 'success')
      setThoughtTitle('')
      setThoughtContent('')
      setThoughtMediaUrl(null)
      setIsCreateThoughtModalOpen(false)
      setActiveProfileTab('thoughts')
      fetchUserSocialData()
    } catch (err: any) {
      showToast(err.message || 'Failed to post thought', 'error')
    } finally {
      setIsSubmittingThought(false)
    }
  }

  const handleThoughtMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      showToast('Photo must be smaller than 10MB', 'error')
      return
    }
    setIsUploadingThoughtMedia(true)
    try {
      const data = await uploadService.uploadFile(file, 'posts')
      setThoughtMediaUrl(data.url)
      showToast('Photo attached successfully!', 'success')
    } catch (err: any) {
      showToast(err.message || 'Failed to upload photo', 'error')
    } finally {
      setIsUploadingThoughtMedia(false)
    }
  }

  const handleOpenComments = async (postId: string) => {
    setCommentPostId(postId)
    setLoadingComments(true)
    try {
      const res = await commentService.getComments(postId)
      setComments(res.comments || [])
    } catch {
      setComments([])
    } finally {
      setLoadingComments(false)
    }
  }

  const handlePostComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!commentPostId || !commentInput.trim() || isPostingComment) return
    setIsPostingComment(true)
    try {
      const res = await commentService.postComment(commentPostId, commentInput.trim())
      setComments((prev) => [...prev, res.comment])
      setCommentInput('')
      setThoughtsList((prev) =>
        prev.map((t) =>
          t.id === commentPostId
            ? { ...t, comments_count: (t.comments_count || 0) + 1 }
            : t
        )
      )
    } catch (err: any) {
      showToast(err.message || 'Failed to post comment', 'error')
    } finally {
      setIsPostingComment(false)
    }
  }

  const formatInstagramTime = (dateStr?: string) => {
    if (!dateStr) return 'JUST NOW'
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return 'JUST NOW'
      const now = new Date()
      const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000)
      if (diffSec < 60) return 'JUST NOW'
      const diffMin = Math.floor(diffSec / 60)
      if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? 'MINUTE' : 'MINUTES'} AGO`
      const diffHour = Math.floor(diffMin / 60)
      if (diffHour < 24) return `${diffHour} ${diffHour === 1 ? 'HOUR' : 'HOURS'} AGO`
      const diffDay = Math.floor(diffHour / 24)
      if (diffDay < 7) return `${diffDay} ${diffDay === 1 ? 'DAY' : 'DAYS'} AGO`
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
    } catch {
      return 'RECENTLY'
    }
  }

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

  const handleDobChange = (newDob: string) => {
    setDob(newDob)
  }

  // Handle Resume Upload with Smooth Human Progress UX
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

    const sizeFormatted =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.max(1, Math.round(file.size / 1024))} KB`
    const extFormatted = file.name.split('.').pop()?.toUpperCase() || 'PDF'

    setUploadFileName(file.name)
    setUploadFileSize(sizeFormatted)
    setIsUploadingResume(true)
    setUploadProgress(15)

    // Smooth fluid progress timer
    let currentProgress = 15
    const progressTimer = setInterval(() => {
      currentProgress = Math.min(88, currentProgress + Math.floor(Math.random() * 12) + 8)
      setUploadProgress(currentProgress)
    }, 200)

    try {
      // Upload to Cloudflare R2
      const uploaded = await uploadService.uploadFile(file, 'resumes')
      clearInterval(progressTimer)
      setUploadProgress(100)

      setResumeUrl(uploaded.url)

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

      // Persist resume directly to profile
      await updateUserProfile({
        resume_url: uploaded.url,
      })

      showToast(
        language === 'ta'
          ? 'தன்விவரக் குறிப்பு வெற்றிகரமாக பதிவேற்றப்பட்டது'
          : language === 'hi'
          ? 'बायோडाटा सफलतापूर्वक अपलोड किया गया'
          : 'Resume uploaded successfully',
        'success'
      )
    } catch (err: any) {
      clearInterval(progressTimer)
      showToast(err.message || 'Failed to upload resume', 'error')
    } finally {
      setTimeout(() => {
        setIsUploadingResume(false)
        setUploadProgress(0)
        setUploadFileName('')
        setUploadFileSize('')
      }, 400)
      e.target.value = ''
    }
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

    const isFresher = experienceLevel === 'fresher'

    if (!isFresher && experienceYears.trim()) {
      const numExp = parseFloat(experienceYears)
      if (isNaN(numExp) || numExp < 0 || numExp > 60) {
        showToast('Please enter a valid total experience in years (0 - 60)', 'error')
        return
      }
    }

    const derivedAge = dob ? (new Date().getFullYear() - new Date(dob).getFullYear()) : undefined

    setIsSaving(true)
    try {
      await updateUserProfile({
        full_name: fullName.trim(),
        headline: headline.trim(),
        age: derivedAge,
        date_of_birth: dob || undefined,
        phone: phone.trim() || undefined,
        location: location.trim() || undefined,
        state: userState.trim() || undefined,
        pincode: pincode.trim() || undefined,
        experience_level: experienceLevel,
        company: isFresher ? '' : (company.trim() || undefined),
        position: isFresher ? '' : (position.trim() || undefined),
        experience_years: isFresher ? 0 : (experienceYears ? parseInt(experienceYears, 10) : 0),
        education_degree: educationDegree.trim() || undefined,
        education_college: educationCollege.trim() || undefined,
        education_year: educationYear.trim() || undefined,
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
        {(hasChanges || isSaving) && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving || isUploadingResume}
              className="flex items-center gap-1.5 rounded-xl bg-[#0B2545] hover:bg-[#071A31] px-5 py-2 text-xs font-bold text-white transition shadow-xs disabled:opacity-50 cursor-pointer animate-in fade-in zoom-in-95 duration-150"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>{isSaving ? t('profile_saving_changes') : t('profile_save_changes')}</span>
            </button>
          </div>
        )}
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
              {headline ||
                (experienceLevel === 'fresher'
                  ? 'Fresher Candidate'
                  : position
                  ? `${position}${company ? ` at ${company}` : ''}`
                  : 'Professional Job Seeker')}
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

            {/* Instagram Profile Stats Row: Thoughts, Followers, Following */}
            <div className="flex items-center gap-6 pt-4 pb-1 text-xs sm:text-sm">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[#0F172A]">{thoughtsList.length}</span>
                <span className="text-slate-600">Thoughts</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[#0F172A]">{followersCount}</span>
                <span className="text-slate-600">Followers</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[#0F172A]">{followingCount}</span>
                <span className="text-slate-600">Following</span>
              </div>
            </div>

            {/* Share Thoughts Action Button */}
            <div className="pt-3">
              <button
                type="button"
                onClick={() => setIsCreateThoughtModalOpen(true)}
                className="inline-flex items-center gap-2 bg-[#0B2545] hover:bg-[#071A31] text-white px-5 py-2.5 rounded-full text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Share Thoughts</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs: My Thoughts vs Edit Profile & Resume */}
      <div className="flex items-center border-b border-slate-200 bg-white rounded-xl px-2 shadow-xs">
        <button
          type="button"
          onClick={() => setActiveProfileTab('thoughts')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-semibold text-xs sm:text-sm transition cursor-pointer ${
            activeProfileTab === 'thoughts'
              ? 'border-[#0B2545] text-[#0B2545] font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>My Thoughts ({thoughtsList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveProfileTab('edit')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-semibold text-xs sm:text-sm transition cursor-pointer ${
            activeProfileTab === 'edit'
              ? 'border-[#0B2545] text-[#0B2545] font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Edit Profile & Resume</span>
        </button>
      </div>

      {activeProfileTab === 'thoughts' ? (
        <div className="space-y-4">
          {loadingThoughts ? (
            <div className="space-y-4">
              <div className="h-40 bg-white rounded-2xl border border-slate-200 animate-pulse" />
              <div className="h-40 bg-white rounded-2xl border border-slate-200 animate-pulse" />
            </div>
          ) : thoughtsList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#0B2545]">
                <MessageSquare className="h-6 w-6" />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h3 className="text-base font-bold text-slate-900">No Thoughts Shared Yet</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Share your projects, technical learnings, achievements, and experiences with the community.
                </p>
              </div>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreateThoughtModalOpen(true)}
                  className="inline-flex items-center gap-1.5 bg-[#0B2545] hover:bg-[#071A31] text-white px-5 py-2.5 rounded-full text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Share Your Thoughts</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {thoughtsList.map((thought) => {
                const isLiked = Boolean(thought.is_liked)
                const commentsCount = thought.comments_count || 0
                return (
                  <article
                    key={thought.id}
                    className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs hover:border-slate-300 transition"
                  >
                    {/* Header: Author + Timestamp */}
                    <div className="flex items-center justify-between p-4 pb-3">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={avatarUrl || user?.avatar_url}
                          name={fullName || user?.full_name || 'User'}
                          className="w-9 h-9 text-xs"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900 leading-tight">
                            {fullName || user?.full_name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {formatInstagramTime(thought.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="px-4 pb-3 space-y-2">
                      {thought.title && (
                        <h4 className="text-sm font-bold text-slate-900">
                          {thought.title}
                        </h4>
                      )}
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {thought.content}
                      </p>
                    </div>

                    {/* Media Image */}
                    {thought.media_urls && thought.media_urls.length > 0 && (
                      <div className="px-4 pb-3">
                        <img
                          src={thought.media_urls[0]}
                          alt="Thought media"
                          className="w-full max-h-96 object-cover rounded-xl border border-slate-100"
                        />
                      </div>
                    )}

                    {/* Action Bar (Like, Comment, Share) */}
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => handleLikePost(thought.id)}
                          className={`flex items-center gap-1.5 text-xs font-semibold transition active:scale-95 cursor-pointer ${
                            isLiked ? 'text-red-600' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-600 text-red-600' : ''}`} />
                          <span>{thought.likes_count || 0}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenComments(thought.id)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition active:scale-95 cursor-pointer"
                        >
                          <MessageCircle className="w-4 h-4 -scale-x-100" />
                          <span>{commentsCount}</span>
                        </button>
                      </div>

                      {commentsCount > 0 && (
                        <button
                          type="button"
                          onClick={() => handleOpenComments(thought.id)}
                          className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer transition font-medium"
                        >
                          View all {commentsCount} {commentsCount === 1 ? 'comment' : 'comments'}
                        </button>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        /* Main Profile Content Form */
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

        {/* Experience Status Selection (Only displayed for first-time user form fill; simple selection, no other text) */}
        {isFirstTimeUser && (
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-800 tracking-wide uppercase">
              {t('profile_experience_status')}
            </span>

            {/* Apple iOS-Style Segmented Pill Toggle - Simple Selection, No Other Text */}
            <div className="inline-flex items-center p-1 rounded-xl bg-slate-100/90 border border-slate-200/70 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setExperienceLevel('fresher')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer ${
                  experienceLevel === 'fresher'
                    ? 'bg-white text-[#0B2545] shadow-xs border border-black/5 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/40'
                }`}
              >
                <GraduationCap className="h-4 w-4 text-[#0B2545]" />
                <span>{t('profile_fresher_title')}</span>
              </button>
              <button
                type="button"
                onClick={() => setExperienceLevel('experienced')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer ${
                  experienceLevel === 'experienced'
                    ? 'bg-white text-[#0B2545] shadow-xs border border-black/5 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/40'
                }`}
              >
                <Briefcase className="h-4 w-4 text-[#0B2545]" />
                <span>{t('profile_experienced_title')}</span>
              </button>
            </div>
          </div>
        )}

        {/* Section 2: Personal Details */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center text-[#0B2545]">
              <FileText className="h-4 w-4" />
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
                placeholder={
                  experienceLevel === 'fresher'
                    ? 'e.g. Aspiring Frontend Developer | 2024 Graduate'
                    : t('profile_headline_placeholder')
                }
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
            <div className="sm:col-span-2">
              <GoogleLocationSearchInput
                label={t('profile_location')}
                value={location}
                onChange={setLocation}
                inputClassName="rounded-xl border-slate-200 py-2.5 text-xs shadow-2xs"
              />
            </div>

            {/* State */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('profile_state')}
              </label>
              <input
                type="text"
                value={userState}
                onChange={(e) => setUserState(e.target.value)}
                placeholder={t('profile_state_placeholder')}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#0B2545] focus:outline-none focus:ring-1 focus:ring-[#0B2545] shadow-2xs"
              />
            </div>

            {/* Pincode */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('profile_pincode')}
              </label>
              <input
                type="text"
                maxLength={10}
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder={t('profile_pincode_placeholder')}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#0B2545] focus:outline-none focus:ring-1 focus:ring-[#0B2545] shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Educational Background */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center text-[#0B2545]">
              <GraduationCap className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                {t('profile_education_details')}
              </h3>
              <p className="text-[11px] text-slate-500">
                Your degrees, certifications, and educational credentials
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Qualification / Degree */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('profile_education_degree')}
              </label>
              <input
                type="text"
                value={educationDegree}
                onChange={(e) => setEducationDegree(e.target.value)}
                placeholder={t('profile_education_degree_placeholder')}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#0B2545] focus:outline-none focus:ring-1 focus:ring-[#0B2545] shadow-2xs"
              />
            </div>

            {/* College / University */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('profile_education_college')}
              </label>
              <input
                type="text"
                value={educationCollege}
                onChange={(e) => setEducationCollege(e.target.value)}
                placeholder={t('profile_education_college_placeholder')}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#0B2545] focus:outline-none focus:ring-1 focus:ring-[#0B2545] shadow-2xs"
              />
            </div>

            {/* Year of Passing */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('profile_education_year')}
              </label>
              <input
                type="text"
                value={educationYear}
                onChange={(e) => setEducationYear(e.target.value)}
                placeholder={t('profile_education_year_placeholder')}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#0B2545] focus:outline-none focus:ring-1 focus:ring-[#0B2545] shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Optional addition for existing fresher profile to add experience */}
        {!isFirstTimeUser && experienceLevel === 'fresher' && (
          <div className="flex justify-end pr-1">
            <button
              type="button"
              onClick={() => setExperienceLevel('experienced')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B2545] hover:underline cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Work Experience</span>
            </button>
          </div>
        )}

        {/* Section 4: Work Experience (ONLY SHOWN FOR EXPERIENCED, COMPLETELY HIDDEN FOR FRESHER) */}
        {experienceLevel === 'experienced' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center text-[#0B2545]">
                  <Briefcase className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Professional Experience
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Your current or previous company and years of industry experience
                  </p>
                </div>
              </div>

              {!isFirstTimeUser && (
                <button
                  type="button"
                  onClick={() => {
                    setExperienceLevel('fresher')
                    setCompany('')
                    setPosition('')
                    setExperienceYears('')
                  }}
                  className="text-[11px] font-medium text-slate-400 hover:text-rose-600 transition cursor-pointer"
                >
                  Clear & Switch to Fresher
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Current / Previous Company */}
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
                    placeholder={t('profile_company_placeholder')}
                    className="w-full rounded-xl border border-slate-200 pl-9 pr-3.5 py-2.5 text-xs text-slate-900 focus:border-[#0B2545] focus:outline-none focus:ring-1 focus:ring-[#0B2545] shadow-2xs"
                  />
                </div>
              </div>

              {/* Current Position / Designation */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('profile_position')}
                </label>
                <input
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder={t('profile_position_placeholder')}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#0B2545] focus:outline-none focus:ring-1 focus:ring-[#0B2545] shadow-2xs"
                />
              </div>

              {/* Total Experience Years */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('profile_experience_years')}
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  step="1"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  placeholder={t('profile_experience_years_placeholder')}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#0B2545] focus:outline-none focus:ring-1 focus:ring-[#0B2545] shadow-2xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 5: Skills & About */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-5">
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
              {experienceLevel === 'fresher' ? 'Career Objective & Academic Highlights' : t('profile_bio')}
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={
                experienceLevel === 'fresher'
                  ? 'Briefly describe your career aspirations, academic achievements, projects, and key interests...'
                  : t('profile_bio_placeholder')
              }
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

          {/* Clean Human Upload State (Apple iOS Aesthetic) */}
          {isUploadingResume ? (
            <div className="rounded-2xl border border-blue-200/80 bg-blue-50/40 p-5 sm:p-6 space-y-3.5 animate-in fade-in duration-150">
              <div className="flex items-center gap-3.5">
                <div className="relative h-12 w-12 rounded-xl bg-white border border-blue-200 text-[#0B2545] flex items-center justify-center shrink-0 shadow-2xs">
                  <FileText className="h-6 w-6 text-[#0B2545]" />
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-2xs">
                    <Loader2 className="h-2.5 w-2.5 animate-spin text-[#0B2545]" />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                      {uploadFileName || 'Uploading resume...'}
                    </p>
                    <span className="text-xs font-bold text-[#0B2545] shrink-0">
                      {uploadProgress}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                    {uploadFileSize && <span>{uploadFileSize}</span>}
                    {uploadFileSize && <span className="text-slate-300">•</span>}
                    <span className="text-slate-600 font-medium">
                      {uploadProgress >= 100
                        ? (language === 'ta' ? 'சேமிக்கப்படுகிறது...' : language === 'hi' ? 'सहेजा जा रहा है...' : 'Finishing upload...')
                        : (language === 'ta' ? 'பாதுகாப்பாகப் பதிவேற்றப்படுகிறது...' : language === 'hi' ? 'अपलोड हो रहा है...' : 'Uploading document...')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Smooth Progress Bar */}
              <div className="w-full bg-blue-100/70 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#0B2545] h-1.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.max(8, uploadProgress)}%` }}
                />
              </div>
            </div>
          ) : resumeUrl ? (() => {
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
                    <UploadCloud className="h-3.5 w-3.5" />
                    <span>Replace</span>
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
                  {t('profile_upload_resume')}
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
      )}

      {/* Create Thought Modal */}
      {isCreateThoughtModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <Avatar
                  src={avatarUrl || user?.avatar_url}
                  name={fullName || user?.full_name || 'User'}
                  className="w-8 h-8 text-xs"
                />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Share a Thought</h3>
                  <p className="text-[11px] text-slate-400">Post to the community feed</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateThoughtModalOpen(false)}
                className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateThought} className="p-5 space-y-4">
              {/* Title (Optional) */}
              <div>
                <input
                  type="text"
                  value={thoughtTitle}
                  onChange={(e) => setThoughtTitle(e.target.value)}
                  placeholder="Title (optional)"
                  maxLength={120}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                />
              </div>

              {/* Content Textarea */}
              <div>
                <textarea
                  value={thoughtContent}
                  onChange={(e) => setThoughtContent(e.target.value)}
                  placeholder="What's on your mind? Share your tech insights, projects, or questions..."
                  rows={4}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545] resize-none leading-relaxed"
                />
              </div>

              {/* Photo Preview if attached */}
              {thoughtMediaUrl && (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 max-h-48 group">
                  <img
                    src={thoughtMediaUrl}
                    alt="Attached preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setThoughtMediaUrl(null)}
                    className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Footer: Attach Image + Submit */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer transition">
                  {isUploadingThoughtMedia ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#0B2545]" />
                  ) : (
                    <ImageIcon className="w-4 h-4 text-emerald-600" />
                  )}
                  <span>{isUploadingThoughtMedia ? 'Uploading...' : 'Add Photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleThoughtMediaUpload}
                    disabled={isUploadingThoughtMedia}
                    className="hidden"
                  />
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateThoughtModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={(!thoughtContent.trim() && !thoughtTitle.trim()) || isSubmittingThought}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#0B2545] hover:bg-[#071A31] text-xs font-bold text-white transition shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingThought ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>{isSubmittingThought ? 'Posting...' : 'Post Thought'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Instagram-Style Comments Modal / Sheet */}
      {commentPostId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl max-h-[85vh] sm:max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="w-6" />
              <h3 className="text-sm font-bold text-slate-900">Comments</h3>
              <button
                type="button"
                onClick={() => setCommentPostId(null)}
                className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 divide-y divide-slate-100">
              {loadingComments ? (
                <div className="flex items-center justify-center py-12 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <div className="py-12 text-center space-y-1">
                  <p className="text-sm font-semibold text-slate-800">No comments yet</p>
                  <p className="text-xs text-slate-400">Be the first to comment on this thought.</p>
                </div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="pt-3 first:pt-0 flex items-start gap-3">
                    <Avatar src={c.author_avatar} name={c.author_name} className="w-8 h-8 text-xs shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-bold text-slate-900">{c.author_name}</span>
                        <span className="text-[10px] text-slate-400">{formatInstagramTime(c.created_at)}</span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed mt-0.5 whitespace-pre-wrap">{c.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Post Comment Input */}
            <form onSubmit={handlePostComment} className="p-3 border-t border-slate-100 bg-slate-50/60 flex items-center gap-2">
              <Avatar
                src={avatarUrl || user?.avatar_url}
                name={fullName || user?.full_name || 'User'}
                className="w-8 h-8 text-xs shrink-0"
              />
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 px-3.5 py-2 text-xs rounded-full border border-slate-200 bg-white focus:outline-none focus:border-[#0B2545]"
              />
              <button
                type="submit"
                disabled={!commentInput.trim() || isPostingComment}
                className="px-4 py-2 rounded-full bg-[#0B2545] hover:bg-[#071A31] text-xs font-bold text-white transition disabled:opacity-40 cursor-pointer shrink-0"
              >
                {isPostingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Post'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

