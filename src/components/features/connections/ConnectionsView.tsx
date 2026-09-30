import React, { useState, useEffect, useMemo } from 'react'
import {
  Users,
  Search,
  MapPin,
  UserPlus,
  UserCheck,
  MessageSquare,
  RefreshCw,
  X,
  Building2,
} from 'lucide-react'
import type { User, Language } from '../../../types'
import { socialService } from '../../../services/api'
import { Button } from '../../ui/Button'

interface ConnectionsViewProps {
  currentUser: User | null
  lang: Language
  onOpenProfile: (userId: string) => void
  onOpenChat: (recipientId: string) => void
}

type TabMode = 'discover' | 'following' | 'followers'

export const ConnectionsView: React.FC<ConnectionsViewProps> = ({
  currentUser,
  lang,
  onOpenProfile,
  onOpenChat,
}) => {
  const [activeTab, setActiveTab] = useState<TabMode>('discover')
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [locationQuery, setLocationQuery] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [actionInProgress, setActionInProgress] = useState<Record<string, boolean>>({})
  const [dismissedUserIds, setDismissedUserIds] = useState<string[]>([])

  // Multilingual translations
  const t = {
    networkOverview: lang === 'ta' ? 'நெட்வொர்க் மேலோட்டம்' : lang === 'hi' ? 'नेटवर्क अवलोकन' : 'Network overview',
    invitesSent: lang === 'ta' ? 'அனுப்பப்பட்ட அழைப்புகள்' : lang === 'hi' ? 'भेजे गए आमंत्रण' : 'Invites sent',
    connections: lang === 'ta' ? 'இணைப்புகள்' : lang === 'hi' ? 'कनेक्शन' : 'Connections',
    following: lang === 'ta' ? 'பின்தொடர்பவை' : lang === 'hi' ? 'फॉलो कर रहे हैं' : 'Following',
    followers: lang === 'ta' ? 'பின்தொடர்பவர்கள்' : lang === 'hi' ? 'फॉलोअर्स' : 'Followers',
    showMore: lang === 'ta' ? 'மேலும் காட்டு' : lang === 'hi' ? 'और दिखाएं' : 'Show more',
    showLess: lang === 'ta' ? 'குறைவாகக் காட்டு' : lang === 'hi' ? 'कम दिखाएं' : 'Show less',
    groups: lang === 'ta' ? 'குழுக்கள்' : lang === 'hi' ? 'समूह' : 'Groups',
    pages: lang === 'ta' ? 'பக்கங்கள்' : lang === 'hi' ? 'पेज' : 'Pages',
    newsletters: lang === 'ta' ? 'செய்திமடல்கள்' : lang === 'hi' ? 'न्यूज़लेटर' : 'Newsletters',
    hashtags: lang === 'ta' ? 'ஹேஷ்டேக்குகள்' : lang === 'hi' ? 'हैशटैग' : 'Hashtags',
    peopleYouMayKnow:
      lang === 'ta'
        ? 'நீங்கள் அறிந்திருக்கக்கூடிய நபர்கள்'
        : lang === 'hi'
        ? 'लोग जिन्हें आप जान सकते हैं'
        : 'People you may know based on your profile',
    discover: lang === 'ta' ? 'புதிய நபர்களைக் கண்டறியுங்கள்' : lang === 'hi' ? 'लोगों को खोजें' : 'Discover People',
    searchPlaceholder:
      lang === 'ta' ? 'பெயர், பதவி அல்லது திறன் கொண்டு தேடுக...' : lang === 'hi' ? 'नाम, पद, या कौशल से खोजें...' : 'Search by name, headline, skills...',
    locationPlaceholder:
      lang === 'ta' ? 'இருப்பிடம் (எ.கா: சென்னை)...' : lang === 'hi' ? 'स्थान (उदा: चेन्नई)...' : 'Location filter (e.g. Chennai)...',
    connect: lang === 'ta' ? 'இணைக்கவும்' : lang === 'hi' ? 'कनेक्ट करें' : 'Connect',
    followingBtn: lang === 'ta' ? 'பின்தொடர்கிறீர்கள்' : lang === 'hi' ? 'फॉलोइंग' : 'Following',
    follow: lang === 'ta' ? 'பின்தொடர்' : lang === 'hi' ? 'फॉलो करें' : 'Follow',
    message: lang === 'ta' ? 'செய்தி' : lang === 'hi' ? 'संदेश' : 'Message',
    loadMore: lang === 'ta' ? 'மேலும் ஏற்றுக' : lang === 'hi' ? 'और देखें' : 'Load More',
    noUsers: lang === 'ta' ? 'பயனர்கள் எவரும் காணப்படவில்லை' : lang === 'hi' ? 'कोई उपयोगकर्ता नहीं मिला' : 'No users found in this section.',
    mutualConnection: lang === 'ta' ? 'பொதுவான தொடர்பு' : lang === 'hi' ? 'म्यूचुअल कनेक्शन' : 'mutual connection',
    openToWork: 'OPEN TO WORK',
  }

  const loadData = async (resetPage = false) => {
    setLoading(true)
    const targetPage = resetPage ? 1 : page
    try {
      if (activeTab === 'discover') {
        const res = await socialService.discoverUsers({
          search: searchQuery,
          location: locationQuery,
          page: targetPage,
          limit: 16,
        })
        if (resetPage) {
          setUsers(res.users)
        } else {
          setUsers((prev) => [...prev, ...res.users])
        }
        setHasMore(res.pagination.has_more)
        if (resetPage) setPage(1)
      } else if (activeTab === 'followers') {
        if (!currentUser?.id) return
        const res = await socialService.getFollowers(currentUser.id, { page: targetPage, limit: 16 })
        setUsers(res.followers)
        setHasMore(false)
      } else if (activeTab === 'following') {
        if (!currentUser?.id) return
        const res = await socialService.getFollowing(currentUser.id, { page: targetPage, limit: 16 })
        setUsers(res.following)
        setHasMore(false)
      }
    } catch (err) {
      console.error('Failed to load connection users:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData(true)
  }, [activeTab, searchQuery, locationQuery])

  const handleFollowToggle = async (targetUser: User, e: React.MouseEvent) => {
    e.stopPropagation()
    const targetId = targetUser.id
    if (actionInProgress[targetId]) return

    setActionInProgress((prev) => ({ ...prev, [targetId]: true }))
    const isCurrentlyFollowing = Boolean(targetUser.is_following)

    // Instant Optimistic UI Update
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === targetId) {
          const newFollowing = !isCurrentlyFollowing
          const countDiff = newFollowing ? 1 : -1
          return {
            ...u,
            is_following: newFollowing,
            followers_count: Math.max(0, (u.followers_count || 0) + countDiff),
          }
        }
        return u
      })
    )

    try {
      if (isCurrentlyFollowing) {
        await socialService.unfollowUser(targetId)
      } else {
        await socialService.followUser(targetId)
      }
    } catch (err) {
      console.error('Follow toggle error, reverting:', err)
      // Revert on failure
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === targetId) {
            return {
              ...u,
              is_following: isCurrentlyFollowing,
              followers_count: Math.max(0, (u.followers_count || 0) + (isCurrentlyFollowing ? 1 : -1)),
            }
          }
          return u
        })
      )
    } finally {
      setActionInProgress((prev) => ({ ...prev, [targetId]: false }))
    }
  }

  const handleDismissUser = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDismissedUserIds((prev) => [...prev, userId])
  }

  const visibleUsers = useMemo(() => {
    return users.filter((u) => !dismissedUserIds.includes(u.id))
  }, [users, dismissedUserIds])

  const followingCount = users.filter((u) => u.is_following).length

  // Subtle gradient headers for each card
  const bannerGradients = [
    'from-[#0B2545] to-[#1E3A8A]',
    'from-[#1E293B] to-[#0B2545]',
    'from-[#0F172A] to-[#1E40AF]',
    'from-[#0B2545] via-[#133E70] to-[#0B2545]',
    'from-[#1E3A8A] to-[#0D9488]',
    'from-[#0B2545] via-[#2563EB] to-[#1E293B]',
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* LEFT SIDEBAR: Exact LinkedIn Layout, Application Color Palette             */}
      {/* ========================================================================= */}
      <aside className="lg:col-span-3 space-y-4">
        {/* 1. Network Overview Card */}
        <div className="rounded-xl border border-[#E0DFDC] bg-white shadow-xs overflow-hidden">
          <div className="p-3.5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#0F172A]">{t.networkOverview}</h2>
          </div>

          {/* Quick tab switcher inside network overview */}
          <div className="p-2 space-y-0.5 text-xs">
            <button
              onClick={() => setActiveTab('discover')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-semibold transition cursor-pointer ${
                activeTab === 'discover'
                  ? 'bg-[#0B2545]/10 text-[#0B2545] font-bold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className={`h-4 w-4 ${activeTab === 'discover' ? 'text-[#0B2545]' : 'text-slate-400'}`} />
                <span>{t.discover}</span>
              </div>
              <span className="font-bold text-slate-500">{users.length}</span>
            </button>

            <button
              onClick={() => setActiveTab('following')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-semibold transition cursor-pointer ${
                activeTab === 'following'
                  ? 'bg-[#0B2545]/10 text-[#0B2545] font-bold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <UserCheck className={`h-4 w-4 ${activeTab === 'following' ? 'text-[#0B2545]' : 'text-slate-400'}`} />
                <span>{t.following}</span>
              </div>
              <span className="font-bold text-[#0B2545] bg-blue-50 px-1.5 py-0.5 rounded text-[11px]">
                {followingCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('followers')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-semibold transition cursor-pointer ${
                activeTab === 'followers'
                  ? 'bg-[#0B2545]/10 text-[#0B2545] font-bold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className={`h-4 w-4 ${activeTab === 'followers' ? 'text-[#0B2545]' : 'text-slate-400'}`} />
                <span>{t.followers}</span>
              </div>
              <span className="font-bold text-slate-500">
                {currentUser?.followers_count || 0}
              </span>
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* RIGHT MAIN AREA: LinkedIn-style 4-Card Grid with Brand Color Theme        */}
      {/* ========================================================================= */}
      <section className="lg:col-span-9 space-y-4">
        {/* Header Bar with Search & Location Filter */}
        <div className="rounded-xl border border-[#E0DFDC] bg-white p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-base sm:text-lg font-bold text-[#0F172A]">
              {activeTab === 'discover'
                ? t.peopleYouMayKnow
                : activeTab === 'following'
                ? t.following
                : t.followers}
            </h1>
          </div>

          {/* Search Inputs Row */}
          {activeTab === 'discover' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-gray-100">
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50/70 border border-gray-200 rounded-xl text-xs text-[#0F172A] placeholder-slate-400 focus:bg-white focus:border-[#0B2545] focus:outline-none transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="relative">
                <MapPin className="h-3.5 w-3.5 text-[#F97316] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  placeholder={t.locationPlaceholder}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50/70 border border-gray-200 rounded-xl text-xs text-[#0F172A] placeholder-slate-400 focus:bg-white focus:border-[#0B2545] focus:outline-none transition"
                />
                {locationQuery && (
                  <button
                    onClick={() => setLocationQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 4-Column Card Grid (Matching Image 2 Reference) */}
        {loading && visibleUsers.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="border border-[#E0DFDC] bg-white rounded-xl overflow-hidden shadow-xs animate-pulse p-4 text-center space-y-3"
              >
                <div className="h-16 bg-slate-200 -mx-4 -mt-4 mb-8" />
                <div className="w-18 h-18 rounded-full bg-slate-200 mx-auto -mt-12 border-2 border-white" />
                <div className="h-3.5 bg-slate-200 rounded w-3/4 mx-auto" />
                <div className="h-2.5 bg-slate-100 rounded w-1/2 mx-auto" />
                <div className="h-7 bg-slate-200 rounded-full w-full mt-4" />
              </div>
            ))}
          </div>
        ) : visibleUsers.length === 0 ? (
          <div className="border border-[#E0DFDC] bg-white rounded-xl p-10 text-center shadow-xs">
            <div className="h-14 w-14 rounded-full bg-blue-50 text-[#0B2545] flex items-center justify-center mx-auto mb-3">
              <Users className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-[#0F172A]">{t.noUsers}</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {activeTab === 'discover'
                ? 'Try adjusting your search query or location filter to find people.'
                : 'Follow colleagues and business owners to build your connections list.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {visibleUsers.map((targetUser, index) => {
              const isFollowing = Boolean(targetUser.is_following)
              const bgGradient = bannerGradients[index % bannerGradients.length]
              const isOpenToWork = Boolean(
                targetUser.role === 'employee' ||
                targetUser.headline?.toLowerCase().includes('open to work') ||
                (targetUser as any).is_open_to_work
              )

              return (
                <div
                  key={targetUser.id}
                  onClick={() => onOpenProfile(targetUser.id)}
                  className="border border-[#E0DFDC] bg-white rounded-xl shadow-xs overflow-hidden flex flex-col justify-between hover:shadow-md transition duration-200 relative text-center group cursor-pointer"
                >
                  {/* Dismiss (X) Button in Top-Right Corner (Exact LinkedIn Style) */}
                  <button
                    type="button"
                    onClick={(e) => handleDismissUser(targetUser.id, e)}
                    className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/50 hover:bg-black/75 text-white flex items-center justify-center transition cursor-pointer z-10"
                    title="Dismiss suggestion"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>

                  <div>
                    {/* Top Cover Banner */}
                    <div className={`h-16 w-full bg-gradient-to-r ${bgGradient} relative overflow-hidden`}>
                      <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#FFFFFF_1px,transparent_1px)] [background-size:8px_8px]" />
                    </div>

                    {/* Centered Avatar Overlapping the Banner */}
                    <div className="-mt-10 flex justify-center relative px-2">
                      <div className="relative">
                        {targetUser.avatar_url ? (
                          <img
                            src={targetUser.avatar_url}
                            alt={targetUser.full_name}
                            className={`h-18 w-18 sm:h-20 sm:w-20 rounded-full border-[3px] object-cover shadow-sm bg-white ${
                              isOpenToWork ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-white'
                            }`}
                          />
                        ) : (
                          <div
                            className={`h-18 w-18 sm:h-20 sm:w-20 rounded-full border-[3px] bg-[#0B2545] text-white flex items-center justify-center font-bold text-lg sm:text-xl shadow-sm ${
                              isOpenToWork ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-white'
                            }`}
                          >
                            {targetUser.full_name ? targetUser.full_name.charAt(0).toUpperCase() : 'U'}
                          </div>
                        )}

                        {/* Open to Work Badge or Active Online Status */}
                        {isOpenToWork ? (
                          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-tight shadow-xs whitespace-nowrap">
                            #OpenToWork
                          </span>
                        ) : (
                          <span className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-2xs" />
                        )}
                      </div>
                    </div>

                    {/* Profile Information */}
                    <div className="pt-2 px-3 pb-2 text-center">
                      {/* Name */}
                      <div className="flex items-center justify-center gap-1">
                        <h3 className="text-xs sm:text-[14px] font-bold text-[#0F172A] hover:underline truncate max-w-[160px]">
                          {targetUser.full_name}
                        </h3>
                      </div>

                      {/* Headline / Designation */}
                      {(targetUser.headline || targetUser.position) && (
                        <p className="text-[11px] sm:text-xs text-slate-500 line-clamp-2 mt-0.5 min-h-[32px] leading-snug">
                          {targetUser.headline ||
                            (targetUser.position
                              ? `${targetUser.position}${targetUser.company ? ` at ${targetUser.company}` : ''}`
                              : '')}
                        </p>
                      )}

                      {/* Dynamic user location or company from database */}
                      {(targetUser.location || targetUser.company) ? (
                        <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-slate-500 truncate min-h-[20px]">
                          {targetUser.location ? (
                            <>
                              <MapPin className="h-3 w-3 text-[#F97316] shrink-0" />
                              <span className="truncate">{targetUser.location}</span>
                            </>
                          ) : (
                            <>
                              <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                              <span className="truncate">{targetUser.company}</span>
                            </>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Bottom Action Area: "+ Connect" Pill Button & Chat Message Icon */}
                  <div
                    className="p-3 pt-1 border-t border-gray-100 flex items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={(e) => handleFollowToggle(targetUser, e)}
                      disabled={actionInProgress[targetUser.id]}
                      className={`flex-1 py-1.5 px-3 rounded-full text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-1 active:scale-95 ${
                        isFollowing
                          ? 'border border-gray-300 bg-slate-100 text-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                          : 'border border-[#0B2545] text-[#0B2545] hover:bg-[#0B2545] hover:text-white'
                      }`}
                    >
                      {isFollowing ? (
                        <>
                          <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                          <span>{t.followingBtn}</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-3.5 w-3.5" />
                          <span>+ {t.connect}</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onOpenChat(targetUser.id)
                      }}
                      className="p-1.5 rounded-full border border-gray-200 bg-slate-50 text-slate-600 hover:text-[#0B2545] hover:bg-slate-100 transition cursor-pointer shrink-0"
                      title={t.message}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Load More Pagination */}
        {hasMore && activeTab === 'discover' && (
          <div className="text-center pt-4">
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                setPage((p) => p + 1)
                loadData(false)
              }}
              disabled={loading}
              className="rounded-full px-6 font-bold text-xs border-[#0B2545] text-[#0B2545] hover:bg-[#0B2545]/10"
            >
              {loading ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
              <span>{t.loadMore}</span>
            </Button>
          </div>
        )}
      </section>
    </div>
  )
}
