import React, { useState, useEffect } from 'react'
import {
  ArrowLeft,
  MapPin,
  UserPlus,
  UserCheck,
  MessageSquare,
  Calendar,
  Building,
  CheckCircle2,
} from 'lucide-react'
import type { PublicProfile, Language } from '../../../types'
import { socialService } from '../../../services/api'

interface PublicUserProfileViewProps {
  userId: string
  lang: Language
  onBack: () => void
  onOpenChat: (recipientId: string) => void
}

export const PublicUserProfileView: React.FC<PublicUserProfileViewProps> = ({
  userId,
  lang,
  onBack,
  onOpenChat,
}) => {
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Translations
  const t = {
    back: lang === 'ta' ? 'பின்செல்க' : lang === 'hi' ? 'वापस' : 'Back to Network',
    follow: lang === 'ta' ? 'பின்தொடர்' : lang === 'hi' ? 'फॉलो करें' : 'Follow',
    following: lang === 'ta' ? 'பின்தொடர்கிறீர்கள்' : lang === 'hi' ? 'फॉलोइंग' : 'Following',
    message: lang === 'ta' ? 'செய்தி அனுப்புக' : lang === 'hi' ? 'संदेश भेजें' : 'Send Message',
    followers: lang === 'ta' ? 'பின்தொடர்பவர்கள்' : lang === 'hi' ? 'फॉलोअर्स' : 'Followers',
    followingCount: lang === 'ta' ? 'பின்தொடர்பவை' : lang === 'hi' ? 'फॉलो कर रहे हैं' : 'Following',
    about: lang === 'ta' ? 'சுயவிவரக் குறிப்பு' : lang === 'hi' ? 'के बारे में' : 'About',
    skills: lang === 'ta' ? 'திறன்கள்' : lang === 'hi' ? 'कौशल' : 'Skills & Endorsements',
    notFound: lang === 'ta' ? 'பயனர் சுயவிவரம் கிடைக்கவில்லை' : lang === 'hi' ? 'प्रोफ़ाइल नहीं मिली' : 'User profile could not be found.',
  }

  const fetchProfile = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await socialService.getUserProfile(userId)
      if (res?.profile) {
        setProfile(res.profile)
      } else {
        setError(t.notFound)
      }
    } catch {
      setError(t.notFound)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [userId])

  const handleFollowToggle = async () => {
    if (!profile || actionLoading) return
    setActionLoading(true)
    const isCurrentlyFollowing = profile.is_following

    // Optimistic update
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            is_following: !isCurrentlyFollowing,
            followers_count: Math.max(0, prev.followers_count + (isCurrentlyFollowing ? -1 : 1)),
          }
        : null
    )

    try {
      if (isCurrentlyFollowing) {
        await socialService.unfollowUser(profile.id)
      } else {
        await socialService.followUser(profile.id)
      }
    } catch (err) {
      console.error('Failed to toggle follow:', err)
      // Revert on error
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              is_following: isCurrentlyFollowing,
              followers_count: Math.max(0, prev.followers_count + (isCurrentlyFollowing ? 1 : -1)),
            }
          : null
      )
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="w-full space-y-4 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-lg w-28" />
        <div className="bg-white rounded-xl p-8 border border-[#E0DFDC] space-y-6">
          <div className="h-44 bg-slate-200 rounded-lg -mx-8 -mt-8 mb-12" />
          <div className="w-24 h-24 bg-slate-200 rounded-full mx-auto -mt-16 border-4 border-white" />
          <div className="h-6 bg-slate-200 rounded w-1/3 mx-auto" />
          <div className="h-4 bg-slate-100 rounded w-1/4 mx-auto" />
          <div className="h-20 bg-slate-50 rounded-xl" />
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="w-full space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#0B2545] transition px-2.5 py-1.5 rounded-lg hover:bg-white cursor-pointer border border-transparent hover:border-gray-200"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t.back}</span>
        </button>

        <div className="rounded-xl border border-[#E0DFDC] bg-white p-8 text-center shadow-xs">
          <p className="text-xs text-slate-500 mb-4">{error || t.notFound}</p>
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2 bg-[#0B2545] text-white rounded-full font-bold text-xs shadow-xs hover:bg-[#071A31] transition cursor-pointer"
          >
            {t.back}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-4 animate-in fade-in duration-150">
      {/* Top Back Navigation */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#0B2545] transition px-2.5 py-1.5 rounded-lg hover:bg-white cursor-pointer border border-transparent hover:border-gray-200"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>{t.back}</span>
      </button>

      {/* Main Profile Page Container */}
      <div className="bg-white rounded-xl border border-[#E0DFDC] shadow-xs overflow-hidden">
        {/* Cover Banner */}
        <div className="h-44 sm:h-52 bg-gradient-to-r from-[#0B2545] via-[#133E70] to-[#0B2545] relative overflow-hidden">
          {profile.banner_url ? (
            <img
              src={profile.banner_url}
              alt="Profile Cover"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#F97316_1px,transparent_1px)] [background-size:12px_12px]" />
          )}
        </div>

        {/* Profile Identity Info Row */}
        <div className="px-6 sm:px-8 pb-8 pt-0 relative">
          {/* Avatar & Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-16 sm:-mt-20 mb-5 gap-4">
            <div className="relative inline-block">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="w-28 h-28 sm:w-36 sm:h-36 rounded-full object-cover border-4 border-white shadow-md bg-white"
                />
              ) : (
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-[#0B2545] text-white font-extrabold text-4xl flex items-center justify-center border-4 border-white shadow-md">
                  {profile.full_name.charAt(0)}
                </div>
              )}
              <span className="absolute bottom-1.5 right-1.5 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-2xs" />
            </div>

            {/* Follow & Message CTA buttons */}
            {!profile.is_self && (
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleFollowToggle}
                  disabled={actionLoading}
                  className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                    profile.is_following
                      ? 'border border-gray-300 bg-slate-100 text-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                      : 'border border-[#0B2545] bg-[#0B2545] hover:bg-[#071A31] text-white'
                  }`}
                >
                  {profile.is_following ? (
                    <>
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{t.following}</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{t.follow}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onOpenChat(profile.id)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border border-[#0B2545] text-[#0B2545] hover:bg-[#0B2545]/10 transition cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{t.message}</span>
                </button>
              </div>
            )}
          </div>

          {/* Name & Handle */}
          <div className="mb-3">
            <div className="flex items-center gap-1.5 mb-0.5">
              <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
                {profile.full_name}
              </h1>
              <CheckCircle2 className="w-4 h-4 text-[#0B2545] fill-blue-50 shrink-0" />
            </div>
            <p className="text-xs font-medium text-[#0B2545]">
              @{profile.username}
            </p>
          </div>

          {/* Headline */}
          {profile.headline && (
            <p className="text-sm text-slate-600 font-medium mb-3 max-w-2xl leading-relaxed">
              {profile.headline}
            </p>
          )}

          {/* Details Row (Location, Company, Joined) */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mb-5">
            {profile.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#F97316]" />
                <span>{profile.location}</span>
              </div>
            )}
            {profile.company && (
              <div className="flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>{profile.company}</span>
              </div>
            )}
            {profile.created_at && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* Followers & Following Stats Badges */}
          <div className="flex items-center gap-6 py-3 border-y border-gray-100 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-[#0F172A]">
                {profile.followers_count}
              </span>
              <span className="text-slate-500">
                {t.followers}
              </span>
            </div>

            <div className="w-px h-4 bg-gray-200" />

            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-[#0F172A]">
                {profile.following_count}
              </span>
              <span className="text-slate-500">
                {t.followingCount}
              </span>
            </div>
          </div>

          {/* Bio Section */}
          {profile.bio && (
            <div className="mt-5">
              <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-2">
                {t.about}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-gray-100">
                {profile.bio}
              </p>
            </div>
          )}

          {/* Skills Section */}
          {profile.skills && profile.skills.length > 0 && (
            <div className="mt-5">
              <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-2">
                {t.skills}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-slate-100 text-[#0B2545] rounded-full text-xs font-semibold border border-gray-200"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
