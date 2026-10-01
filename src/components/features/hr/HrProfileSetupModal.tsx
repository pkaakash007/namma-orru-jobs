import React, { useState } from 'react'
import { X, Building2, Briefcase, Phone, MapPin, FileText, User as UserIcon, Camera, Loader2 } from 'lucide-react'
import { hrService, uploadService } from '../../../services/api'
import { useToast } from '../../../context/ToastContext'
import { useAuth } from '../../../context/AuthContext'
import { GoogleLocationSearchInput } from '../../ui/GoogleLocationSearchInput'

interface HrProfileSetupModalProps {
  isEdit?: boolean
  onClose: () => void
  onSubmitted: () => void
}

export const HrProfileSetupModal: React.FC<HrProfileSetupModalProps> = ({
  isEdit = false,
  onClose,
  onSubmitted,
}) => {
  const { user, refreshUser } = useAuth()
  const { showToast } = useToast()

  const [fullName, setFullName] = useState(user?.full_name || '')
  const [company, setCompany] = useState(user?.company || '')
  const [position, setPosition] = useState(user?.position || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [location, setLocation] = useState(user?.location || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [headline, setHeadline] = useState(user?.headline || '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '')
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file', 'error')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be smaller than 5 MB', 'error')
      return
    }
    setIsUploadingAvatar(true)
    try {
      const uploaded = await uploadService.uploadFile(file, 'avatars')
      setAvatarUrl(uploaded.url)
    } catch {
      showToast('Failed to upload photo', 'error')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) { showToast('Full name is required', 'error'); return }
    if (!company.trim()) { showToast('Company name is required', 'error'); return }
    if (!position.trim()) { showToast('Designation is required', 'error'); return }

    setIsSaving(true)
    try {
      const res = await hrService.submitProfile({
        full_name: fullName.trim(),
        company: company.trim(),
        position: position.trim(),
        phone: phone.trim(),
        location: location.trim(),
        bio: bio.trim(),
        headline: headline.trim(),
        avatar_url: avatarUrl.trim(),
      })
      showToast(res.message || (isEdit ? 'Profile edit submitted for admin review.' : 'Profile submitted successfully!'), 'success')
      try { await refreshUser?.() } catch {}
      onSubmitted()
    } catch (err: any) {
      showToast(err.message || 'Failed to submit profile', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden"
        style={{ maxHeight: '90vh' }}
      >
        {/* iOS-style header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {isEdit ? 'Edit Profile' : 'Complete Your Profile'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 leading-snug">
              {isEdit
                ? 'Changes will be reviewed by admin before going live.'
                : 'Your details will be sent to the admin for approval.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 130px)' }}>
          <div className="px-5 py-4 space-y-4">
            {/* Avatar upload */}
            <div className="flex justify-center">
              <label className="relative cursor-pointer group">
                <div className="h-20 w-20 rounded-full bg-slate-100 border-2 border-slate-200 overflow-hidden flex items-center justify-center">
                  {isUploadingAvatar ? (
                    <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
                  ) : avatarUrl ? (
                    <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <UserIcon className="h-8 w-8 text-slate-300" />
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#0B2545] border-2 border-white shadow-sm">
                  <Camera className="h-3 w-3 text-white" />
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                  disabled={isUploadingAvatar}
                />
              </label>
            </div>

            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={100}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0B2545] focus:ring-2 focus:ring-[#0B2545]/10 transition"
              />
            </div>

            {/* Company */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                Company / Organisation <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                maxLength={150}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0B2545] focus:ring-2 focus:ring-[#0B2545]/10 transition"
              />
            </div>

            {/* Designation / Position */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                Designation / Role <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                maxLength={150}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0B2545] focus:ring-2 focus:ring-[#0B2545]/10 transition"
              />
            </div>

            {/* Headline */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <FileText className="h-3.5 w-3.5 text-slate-400" />
                Professional Headline
              </label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                maxLength={200}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0B2545] focus:ring-2 focus:ring-[#0B2545]/10 transition"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                Contact Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={20}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0B2545] focus:ring-2 focus:ring-[#0B2545]/10 transition"
              />
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                Location
              </label>
              <GoogleLocationSearchInput
                value={location}
                onChange={setLocation}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0B2545] focus:ring-2 focus:ring-[#0B2545]/10 transition"
              />
            </div>

            {/* Bio */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <FileText className="h-3.5 w-3.5 text-slate-400" />
                About
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={1000}
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0B2545] focus:ring-2 focus:ring-[#0B2545]/10 transition resize-none"
              />
            </div>

            {isEdit && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800 leading-relaxed">
                Your existing profile stays active until the admin reviews and approves these changes.
              </div>
            )}
          </div>

          {/* iOS-style action row */}
          <div className="flex items-center gap-3 px-5 pt-3 pb-5 border-t border-slate-100 bg-white sticky bottom-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 rounded-xl bg-[#0B2545] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0a1f3d] transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : isEdit ? 'Submit for Review' : 'Submit Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
