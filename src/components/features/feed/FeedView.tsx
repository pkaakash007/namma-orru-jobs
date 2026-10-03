import React, { useState, useRef } from 'react'
import type { Post } from '../../../types'
import type { PostComment } from '../../../services/api'
import { Avatar } from '../../ui/Avatar'
import { Button } from '../../ui/Button'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../context/ToastContext'
import { useLanguage } from '../../../context/LanguageContext'
import {
  Heart,
  Image as ImageIcon,
  Plus,
  X,
  Send,
  AlertCircle,
  MessageSquare,
  MessageCircle,
} from 'lucide-react'
import { uploadService, commentService } from '../../../services/api'

interface FeedViewProps {
  posts: Post[]
  onCreatePost: (
    contentOrData: string | { title?: string; topic?: string; content: string; media_urls?: string[] }
  ) => void
  onLikePost?: (postId: string) => void
  isLoading?: boolean
}

export const FeedView: React.FC<FeedViewProps> = ({
  posts,
  onCreatePost,
  onLikePost,
  isLoading,
}) => {
  const { user } = useAuth()
  const { showToast } = useToast()
  const { language } = useLanguage()

  // Thoughts feed is strictly reserved for Job Seekers / Employees
  if (user && user.role !== 'employee') {
    return null
  }

  // Create modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)

  // Media upload handler
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size <= 0) {
      showToast('Selected file is empty', 'error')
      return
    }

    const MAX_SIZE = 10 * 1024 * 1024 // 10MB
    if (file.size > MAX_SIZE) {
      showToast('Media file size exceeds limit (maximum 10MB allowed)', 'error')
      return
    }

    const cleanFileName = file.name.toLowerCase()
    const lastDot = cleanFileName.lastIndexOf('.')
    const ext = lastDot !== -1 ? cleanFileName.slice(lastDot) : ''
    const validExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']
    if (!validExts.includes(ext) && !file.type.startsWith('image/')) {
      showToast('Please upload an image file (PNG, JPG, WebP, GIF, SVG)', 'error')
      return
    }

    setIsUploadingMedia(true)
    try {
      const data = await uploadService.uploadFile(file, 'posts')
      setMediaUrl(data.url)
      showToast('Photo attached successfully!', 'success')
    } catch (err: any) {
      showToast(err.message || 'Media upload failed', 'error')
    } finally {
      setIsUploadingMedia(false)
    }
  }

  // Submit thought handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      showToast('Please sign in to post a thought', 'error')
      return
    }
    if (user.role === 'manager') {
      showToast('HR accounts cannot create thoughts. Thoughts are published by Job Seekers.', 'error')
      return
    }
    if (!content.trim() && !title.trim() && !mediaUrl) {
      showToast('Please enter some text or attach an image', 'error')
      return
    }

    onCreatePost({
      title: title.trim() || undefined,
      content: content.trim() || title.trim(),
      media_urls: mediaUrl ? [mediaUrl] : [],
    })

    // Reset and close
    setTitle('')
    setContent('')
    setMediaUrl(null)
    setIsModalOpen(false)
  }

  const [animatingLikedPostId, setAnimatingLikedPostId] = useState<string | null>(null)

  // Comment sheet state
  const [commentPostId, setCommentPostId] = useState<string | null>(null)
  const [comments, setComments] = useState<PostComment[]>([])
  const [commentInput, setCommentInput] = useState('')
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [isPostingComment, setIsPostingComment] = useState(false)
  const [localCommentCounts, setLocalCommentCounts] = useState<Record<string, number>>({})
  const commentInputRef = useRef<HTMLInputElement>(null)
  const commentListRef = useRef<HTMLDivElement>(null)

  const openComments = async (postId: string) => {
    setCommentPostId(postId)
    setComments([])
    setCommentInput('')
    setIsLoadingComments(true)
    try {
      const res = await commentService.getComments(postId)
      setComments(res.comments || [])
    } catch {
      // show empty state
    } finally {
      setIsLoadingComments(false)
      setTimeout(() => {
        commentInputRef.current?.focus()
        if (commentListRef.current) {
          commentListRef.current.scrollTop = commentListRef.current.scrollHeight
        }
      }, 100)
    }
  }

  const closeComments = () => {
    setCommentPostId(null)
    setComments([])
    setCommentInput('')
  }

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentPostId || !commentInput.trim()) return
    if (!user) {
      showToast('Please sign in to comment', 'error')
      return
    }
    setIsPostingComment(true)
    try {
      const res = await commentService.postComment(commentPostId, commentInput.trim())
      setComments((prev) => [...prev, res.comment])
      setLocalCommentCounts((prev) => ({
        ...prev,
        [commentPostId]: (prev[commentPostId] ?? 0) + 1,
      }))
      setCommentInput('')
      setTimeout(() => {
        if (commentListRef.current) {
          commentListRef.current.scrollTop = commentListRef.current.scrollHeight
        }
      }, 50)
    } catch (err: any) {
      showToast(err.message || 'Failed to post comment', 'error')
    } finally {
      setIsPostingComment(false)
    }
  }

  const formatCommentTime = (dateStr?: string) => {
    if (!dateStr) return 'now'
    try {
      const d = new Date(dateStr)
      const now = new Date()
      const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000)
      if (diffSec < 60) return 'now'
      const diffMin = Math.floor(diffSec / 60)
      if (diffMin < 60) return `${diffMin}m`
      const diffHour = Math.floor(diffMin / 60)
      if (diffHour < 24) return `${diffHour}h`
      return `${Math.floor(diffHour / 24)}d`
    } catch {
      return 'now'
    }
  }

  const triggerLikeAnimation = (postId: string) => {
    setAnimatingLikedPostId(postId)
    setTimeout(() => setAnimatingLikedPostId(null), 850)
  }

  // Instagram-style uppercase relative timestamp
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

  return (
    <div className="space-y-3.5">
      {/* Single Create Thought Action Bar (Sticky at top like Instagram/Facebook) */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-white/95 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            {language === 'ta' ? 'சமூகக் கருத்துகள்' : language === 'hi' ? 'सामुदायिक विचार' : 'Community Thoughts'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {language === 'ta'
              ? 'திட்டங்கள் மற்றும் சாதனைகளைப் பகிரவும்'
              : language === 'hi'
              ? 'प्रोजेक्ट और उपलब्धियां साझा करें'
              : 'Share your projects, achievements, and insights'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B2545] hover:bg-[#071A31] px-4 py-2.5 text-xs font-bold text-white transition active:scale-98 shadow-xs cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>{language === 'ta' ? 'கருத்தை உருவாக்கு' : language === 'hi' ? 'विचार बनाएं' : 'Create Thought'}</span>
        </button>
      </div>

      {/* 2. THOUGHTS FEED LIST (Instagram / Facebook Style: Only cards scroll) */}
      {isLoading ? (
        <div className="feed-scroll-container max-h-[calc(100dvh-235px)] sm:max-h-[calc(100dvh-215px)] space-y-4 pr-1">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-slate-200" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-32 rounded bg-slate-200" />
                  <div className="h-3 w-20 rounded bg-slate-200" />
                </div>
              </div>
              <div className="h-4 w-3/4 rounded bg-slate-200" />
              <div className="h-16 w-full rounded bg-slate-100" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center space-y-3 shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <MessageSquare className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            No thoughts published yet
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Be the first to share an update, project showcase, or career milestone with the community!
          </p>
        </div>
      ) : (
        <div className="feed-scroll-container max-h-[calc(100dvh-235px)] sm:max-h-[calc(100dvh-215px)] space-y-4 pr-1.5 -mr-1.5 scroll-smooth focus:outline-none pb-12 sm:pb-6">
          {posts.map((post) => {
            const isLiked = post.is_liked || post.liked_by_me || false
            const commentsCount =
              localCommentCounts[post.id] !== undefined
                ? (post.comments_count || 0) + localCommentCounts[post.id]
                : (post.comments_count || 0)
            return (
              <div
                key={post.id}
                id={`thought-${post.id}`}
                className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-xs hover:shadow-sm transition"
              >
                {/* 1. Instagram Top Bar Header */}
                <div className="px-3.5 sm:px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Story Gradient Ring */}
                    <div className="p-[2px] rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] shrink-0">
                      <div className="p-[1.5px] bg-white rounded-full">
                        <Avatar
                          src={post.author_avatar}
                          name={post.author_name}
                          size="sm"
                          className="w-8 h-8 rounded-full"
                        />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[13px] font-bold text-slate-900 leading-tight truncate hover:underline cursor-pointer">
                          {post.author_name}
                        </span>
                        {post.author_role && (
                          <span className="text-[11px] text-slate-400 font-medium">
                            • {post.author_role}
                          </span>
                        )}
                      </div>
                      {(post.author_location || post.author_headline) && (
                        <p className="text-[11px] text-slate-500 leading-tight truncate mt-0.5">
                          {post.author_location || post.author_headline}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Media Image: Instagram Full Bleed Edge-to-Edge */}
                {post.media_urls && post.media_urls.length > 0 && post.media_urls[0] ? (
                  <div
                    className="relative w-full bg-[#111] flex items-center justify-center overflow-hidden border-y border-slate-100 cursor-pointer select-none"
                    onDoubleClick={() => {
                      if (!isLiked && onLikePost) {
                        onLikePost(post.id)
                      }
                      triggerLikeAnimation(post.id)
                    }}
                  >
                    <img
                      src={post.media_urls[0]}
                      alt={post.title || 'Post photo'}
                      className="w-full max-h-[580px] object-cover sm:object-contain bg-slate-100"
                      loading="lazy"
                    />
                    {/* Double-click Heart Pop Animation */}
                    {animatingLikedPostId === post.id && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-in zoom-in-50 fade-in duration-200">
                        <Heart className="w-24 h-24 fill-white text-white drop-shadow-2xl animate-pulse" />
                      </div>
                    )}
                  </div>
                ) : null}

                {/* 3. Instagram Action Buttons Row */}
                <div className="px-3.5 sm:px-4 pt-3 pb-1 flex items-center gap-4">
                  {/* Heart (Like) Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!isLiked) triggerLikeAnimation(post.id)
                      onLikePost && onLikePost(post.id)
                    }}
                    className="text-slate-900 hover:text-slate-600 transition active:scale-125 focus:outline-none cursor-pointer"
                    title={isLiked ? 'Unlike' : 'Like'}
                  >
                    <Heart
                      className={`w-[24px] h-[24px] transition-colors ${
                        isLiked ? 'fill-[#FF3040] text-[#FF3040]' : 'text-slate-900 hover:text-slate-600'
                      }`}
                      strokeWidth={1.85}
                    />
                  </button>

                  {/* Comment Button — opens real comment sheet */}
                  <button
                    type="button"
                    onClick={() => openComments(post.id)}
                    className="text-slate-900 hover:text-slate-600 transition active:scale-95 focus:outline-none cursor-pointer"
                    title="Comment"
                  >
                    <MessageCircle className="w-[24px] h-[24px] -scale-x-100" strokeWidth={1.85} />
                  </button>
                </div>

                {/* 4. Likes Count */}
                <div className="px-3.5 sm:px-4 pt-0.5">
                  <p className="text-[13px] font-bold text-slate-900">
                    {(post.likes_count || 0) === 1
                      ? '1 like'
                      : `${(post.likes_count || 0).toLocaleString()} likes`}
                  </p>
                </div>

                {/* 5. Caption & Post Content */}
                <div className="px-3.5 sm:px-4 pt-1 pb-1 space-y-1">
                  {post.title && (
                    <h3 className="text-[14px] font-bold text-slate-900 leading-snug">
                      {post.title}
                    </h3>
                  )}
                  <p className="text-[13px] text-slate-900 leading-relaxed whitespace-pre-wrap">
                    <span className="font-bold text-slate-900 mr-1.5 hover:underline cursor-pointer">
                      {post.author_name}
                    </span>
                    {post.content}
                  </p>
                </div>

                {/* 7. View comments link */}
                {commentsCount > 0 && (
                  <div className="px-3.5 sm:px-4">
                    <button
                      type="button"
                      onClick={() => openComments(post.id)}
                      className="text-[12px] text-slate-400 hover:text-slate-600 cursor-pointer transition"
                    >
                      View all {commentsCount} {commentsCount === 1 ? 'comment' : 'comments'}
                    </button>
                  </div>
                )}

                {/* 8. Uppercase Relative Timestamp */}
                <div className="px-3.5 sm:px-4 pb-3.5 pt-1">
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
                    {formatInstagramTime(post.created_at)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* COMMENT SHEET — Instagram-style bottom sheet */}
      {commentPostId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" onClick={closeComments}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col"
            style={{ maxHeight: '85dvh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet handle (mobile only) */}
            <div className="flex items-center justify-center pt-2.5 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-slate-300" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h3 className="text-[15px] font-bold text-slate-900">Comments</h3>
              <button
                type="button"
                onClick={closeComments}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Comment List */}
            <div
              ref={commentListRef}
              className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-[120px]"
            >
              {isLoadingComments ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-2.5 animate-pulse">
                      <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-24 rounded bg-slate-200" />
                        <div className="h-3 w-full rounded bg-slate-100" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
                  <MessageCircle className="w-10 h-10 text-slate-200" strokeWidth={1.5} />
                  <p className="text-sm font-semibold text-slate-900">No comments yet.</p>
                  <p className="text-xs text-slate-400">Be the first to comment.</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-2.5">
                    <Avatar
                      src={comment.author_avatar}
                      name={comment.author_name}
                      size="xs"
                      className="w-8 h-8 rounded-full shrink-0 mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-slate-900 leading-relaxed">
                        <span className="font-bold mr-1.5">{comment.author_name}</span>
                        {comment.content}
                      </p>
                      <span className="text-[11px] text-slate-400 mt-0.5 block">
                        {formatCommentTime(comment.created_at)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comment Input */}
            <form
              onSubmit={handlePostComment}
              className="border-t border-slate-100 px-4 py-3 flex items-center gap-2.5 bg-white"
            >
              <Avatar
                src={user?.avatar_url}
                name={user?.full_name || 'You'}
                size="xs"
                className="w-8 h-8 rounded-full shrink-0"
              />
              <div className="flex-1 flex items-center bg-slate-100 rounded-full px-4 py-2">
                <input
                  ref={commentInputRef}
                  type="text"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 bg-transparent text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  maxLength={1000}
                  disabled={isPostingComment}
                />
              </div>
              <button
                type="submit"
                disabled={!commentInput.trim() || isPostingComment}
                className="text-[#0B2545] font-bold text-[13px] disabled:text-slate-300 hover:text-[#071A31] transition cursor-pointer disabled:cursor-default shrink-0"
              >
                {isPostingComment ? (
                  <div className="w-4 h-4 border-2 border-[#0B2545] border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Post'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CREATE THOUGHT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {language === 'ta' ? 'கருத்தைப் பகிர்க' : language === 'hi' ? 'विचार साझा करें' : 'Share a Thought'}
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false)
                  setMediaUrl(null)
                }}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* HR Role Restriction Guard */}
            {user?.role === 'manager' ? (
              <div className="py-6 text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">Recruiter Notice</h4>
                <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                  Under platform guidelines, thoughts are shared by candidates and job seekers. HR / Recruiter accounts can freely browse, search, and like thoughts in the community feed.
                </p>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl bg-[#0B2545] px-4 py-2 text-xs font-bold text-white hover:bg-[#071A31] transition"
                >
                  Got It
                </button>
              </div>
            ) : (
              /* Employee Thought Form */
              <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
                {/* Title Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Test Post, Built my first React project..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#0B2545] focus:outline-none"
                  />
                </div>

                {/* Content Textarea */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description / Content <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Share what you are working on, thoughts, learnings, or questions..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#0B2545] focus:outline-none"
                    required
                  />
                </div>

                {/* Attached Image Preview */}
                {mediaUrl && (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 p-1 max-w-sm">
                    <img src={mediaUrl} alt="Preview" className="h-36 w-full object-cover rounded-lg" />
                    <button
                      type="button"
                      onClick={() => setMediaUrl(null)}
                      className="absolute top-2.5 right-2.5 rounded-full bg-black/70 p-1 text-white hover:bg-black transition cursor-pointer"
                      title="Remove image"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Media Upload Trigger & Submit */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer">
                    <ImageIcon className="h-4 w-4 text-[#0B2545]" />
                    <span>{isUploadingMedia ? 'Uploading...' : 'Add Photo'}</span>
                    <input
                      type="file"
                      accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.svg"
                      onChange={handleMediaUpload}
                      disabled={isUploadingMedia}
                      className="hidden"
                    />
                  </label>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsModalOpen(false)
                        setMediaUrl(null)
                      }}
                    >
                      Cancel
                    </Button>
                    <button
                      type="submit"
                      disabled={isUploadingMedia || (!content.trim() && !title.trim())}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#0B2545] hover:bg-[#071A31] px-4 py-2 text-xs font-bold text-white transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Post Thought</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
