import React, { useState } from 'react'
import type { Post } from '../../../types'
import { Card } from '../../ui/Card'
import { Badge } from '../../ui/Badge'
import { Avatar } from '../../ui/Avatar'
import { Button } from '../../ui/Button'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../context/ToastContext'
import { useLanguage } from '../../../context/LanguageContext'
import {
  ThumbsUp,
  Heart,
  MessageSquare,
  Repeat2,
  Send,
  Image,
  Video,
  Briefcase,
  Globe,
  MoreHorizontal,
  X,
  CheckCheck,
} from 'lucide-react'
import { uploadService, postReadService } from '../../../services/api'

interface FeedViewProps {
  posts: Post[]
  onCreatePost: (content: string) => void
  onLikePost?: (postId: string) => void
  isLoading?: boolean
}

export const FeedView: React.FC<FeedViewProps> = ({
  posts,
  onCreatePost,
  onLikePost,
  isLoading,
}) => {
  const [content, setContent] = useState('')
  const [isExpanding, setIsExpanding] = useState(false)
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)
  const { user } = useAuth()
  const { showToast } = useToast()
  const { t } = useLanguage()

  // Track read/unread status for posts
  const [readPostIds, setReadPostIds] = useState<Set<string>>(() =>
    postReadService.getReadPostIds(user?.id)
  )

  React.useEffect(() => {
    const handleReadPostsUpdate = () => {
      setReadPostIds(postReadService.getReadPostIds(user?.id))
    }
    window.addEventListener('namma_posts_read_updated', handleReadPostsUpdate)
    return () => window.removeEventListener('namma_posts_read_updated', handleReadPostsUpdate)
  }, [user?.id])

  const unreadPostsCount = posts.filter((p) => !readPostIds.has(p.id)).length

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size <= 0) {
      showToast('Selected file is empty (0 bytes)', 'error')
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
      showToast('Media attached successfully!', 'success')
      setIsExpanding(true)
    } catch (err: any) {
      showToast(err.message || 'Media upload failed', 'error')
    } finally {
      setIsUploadingMedia(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      showToast('Please sign in to publish a post to the network', 'error')
      return
    }
    if (!content.trim() && !mediaUrl) return
    const finalContent = mediaUrl ? `${content.trim()}\n\n![Image](${mediaUrl})` : content.trim()
    onCreatePost(finalContent)
    setContent('')
    setMediaUrl(null)
    setIsExpanding(false)
  }

  return (
    <div className="space-y-4">
      {/* LinkedIn "Start a Post" Card */}
      <Card className="p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Avatar src={user?.avatar_url} name={user?.full_name} size="md" />
          <button
            onClick={() => setIsExpanding(true)}
            className="w-full rounded-full border border-gray-300 bg-white px-4 py-2.5 text-left text-xs font-medium text-slate-500 transition hover:bg-gray-50 cursor-pointer"
          >
            {t('feed_create_placeholder')}
          </button>
        </div>

        {isExpanding && (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3 border-t border-gray-100 pt-3">
            <textarea
              rows={4}
              autoFocus
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-3 text-sm text-[#0F172A] focus:border-[#0B2545] focus:outline-none focus:ring-1 focus:ring-[#0B2545]"
            />
            {mediaUrl && (
              <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-slate-50 p-1 max-w-xs">
                <img src={mediaUrl} alt="Attached media" className="h-32 w-auto object-cover rounded" />
                <button
                  type="button"
                  onClick={() => setMediaUrl(null)}
                  className="absolute top-2 right-2 rounded-full bg-black/70 p-1 text-white hover:bg-black transition cursor-pointer"
                  title="Remove media"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Posting as <strong className="text-[#0B2545]">{user?.full_name}</strong>
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsExpanding(false)
                    setMediaUrl(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="orange"
                  size="sm"
                  disabled={isUploadingMedia || (!content.trim() && !mediaUrl)}
                  className="font-bold cursor-pointer"
                >
                  {isUploadingMedia ? 'Uploading...' : t('feed_post_button')}
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* Media Buttons Row */}
        <div className="mt-3 flex items-center justify-around border-t border-gray-100 pt-2 text-xs font-semibold text-slate-600">
          <label className="flex items-center gap-2 rounded-md px-3 py-2 transition hover:bg-gray-100 cursor-pointer">
            <Image className="h-4 w-4 text-blue-500" />
            <span>{isUploadingMedia ? 'Uploading...' : 'Media'}</span>
            <input
              type="file"
              accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.svg"
              onChange={handleMediaUpload}
              disabled={isUploadingMedia}
              className="hidden"
            />
          </label>
          <button
            onClick={() => setIsExpanding(true)}
            className="flex items-center gap-2 rounded-md px-3 py-2 transition hover:bg-gray-100 cursor-pointer"
          >
            <Video className="h-4 w-4 text-emerald-600" />
            <span>Video</span>
          </button>
          <button
            onClick={() => setIsExpanding(true)}
            className="flex items-center gap-2 rounded-md px-3 py-2 transition hover:bg-gray-100 cursor-pointer"
          >
            <Briefcase className="h-4 w-4 text-[#F97316]" />
            <span>Job</span>
          </button>
        </div>
      </Card>

      {/* Unread Posts Bar */}
      {unreadPostsCount > 0 && (
        <div className="flex items-center justify-between px-2 py-1 text-xs text-slate-500 font-medium bg-white rounded-lg border border-[#E0DFDC] p-3 shadow-2xs">
          <span className="font-semibold text-slate-700">
            {unreadPostsCount} unread network updates
          </span>
          <button
            type="button"
            onClick={() => postReadService.markAllPostsAsRead(posts.map((p) => p.id), user?.id)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#0B2545] hover:underline cursor-pointer"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            <span>Mark all as read</span>
          </button>
        </div>
      )}

      {/* Feed Posts */}
      {posts.map((post) => {
        const isPostRead = readPostIds.has(post.id)
        return (
          <Card
            key={post.id}
            onClick={() => postReadService.markPostAsRead(post.id, user?.id)}
            className="p-4 shadow-sm cursor-pointer relative transition hover:shadow-md"
          >
            {/* Post Author Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <Avatar src={post.author_avatar} name={post.author_name} size="md" />
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-[#0F172A] hover:underline cursor-pointer">
                      {post.author_name}
                    </h4>
                    {!isPostRead && (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-[#F97316] text-white uppercase tracking-wider shadow-2xs">
                        New
                      </span>
                    )}
                    <span className="text-xs text-slate-400">• 1st</span>
                    {post.author_role && post.author_role !== 'employee' && (
                      <Badge variant="role" role={post.author_role} />
                    )}
                  </div>
                  <p className="text-xs text-[#64748B]">{post.author_headline}</p>
                  <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                    <span>{post.created_at}</span>
                    <span>•</span>
                    <Globe className="h-3 w-3" />
                  </div>
                </div>
              </div>

            <button className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-gray-100 cursor-pointer">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>

          {/* Post Body */}
          <p className="mt-3 text-sm leading-relaxed text-[#1E293B] whitespace-pre-line">
            {post.content}
          </p>

          {/* Reactions Count Bar */}
          <div className="mt-4 flex items-center justify-between border-b border-gray-100 pb-2 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#0A66C2] text-white shadow-2xs">
                <ThumbsUp className="h-2.5 w-2.5 fill-white text-white" />
              </span>
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#DF704D] text-white shadow-2xs -ml-1">
                <Heart className="h-2.5 w-2.5 fill-white text-white" />
              </span>
              <span className="ml-1 font-medium">{post.likes_count}</span>
            </div>
            <span>{post.comments_count} comments</span>
          </div>

          {/* LinkedIn Action Bar (Like, Comment, Repost, Send) */}
          <div className="mt-1 flex items-center justify-around pt-1 text-xs font-semibold text-slate-600">
            <button
              onClick={() => (onLikePost ? onLikePost(post.id) : showToast('Liked post!'))}
              className="flex items-center gap-1.5 rounded-md px-4 py-2 hover:bg-gray-100 transition active:scale-95 cursor-pointer"
            >
              <ThumbsUp className="h-4 w-4 text-[#0B2545]" />
              <span>{t('feed_like')}</span>
            </button>
            <button
              onClick={() => showToast('Discussion thread open for verified network members')}
              className="flex items-center gap-1.5 rounded-md px-4 py-2 hover:bg-gray-100 transition cursor-pointer"
            >
              <MessageSquare className="h-4 w-4" />
              <span>{t('feed_comment')}</span>
            </button>
            <button
              onClick={() => showToast('Post saved to your activity!')}
              className="flex items-center gap-1.5 rounded-md px-4 py-2 hover:bg-gray-100 transition cursor-pointer"
            >
              <Repeat2 className="h-4 w-4" />
              <span>{t('feed_repost')}</span>
            </button>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href)
                showToast('Post link copied to clipboard!')
              }}
              className="flex items-center gap-1.5 rounded-md px-4 py-2 hover:bg-gray-100 transition cursor-pointer"
            >
              <Send className="h-4 w-4" />
              <span>{t('feed_send')}</span>
            </button>
          </div>
        </Card>
      )})}

      {isLoading && (
        <Card className="p-8 text-center border-[#E0DFDC] bg-white">
          <p className="text-xs text-slate-500 font-medium">
            Loading network updates...
          </p>
        </Card>
      )}

      {!isLoading && posts.length === 0 && (
        <Card className="p-8 text-center border-[#E0DFDC] bg-white">
          <p className="text-sm font-bold text-[#0B2545]">{t('feed_empty_title')}</p>
          <p className="mt-1 text-xs text-slate-500">{t('feed_empty_desc')}</p>
        </Card>
      )}
    </div>
  )
}
