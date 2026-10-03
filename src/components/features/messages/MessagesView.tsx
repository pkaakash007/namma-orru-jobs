import React, { useState, useEffect, useRef } from 'react'
import {
  Send,
  Search,
  Check,
  CheckCheck,
  ShieldAlert,
  ArrowLeft,
  ExternalLink,
  RefreshCw,
  SquarePen,
} from 'lucide-react'
import type { Conversation, ChatMessage, User, Language } from '../../../types'
import { chatService } from '../../../services/api'
import { parseDateUTC } from '../../../utils/date'
import { useToast } from '../../../context/ToastContext'
import { DynamicTranslatedText } from '../../ui/DynamicTranslatedText'

interface MessagesViewProps {
  currentUser: User | null
  lang: Language
  initialRecipientId?: string | null
  onOpenProfile: (userId: string) => void
  onClearInitialRecipient?: () => void
  onUnreadMessagesCountChange?: (count: number) => void
  onExploreAction?: () => void
}

export const MessagesView: React.FC<MessagesViewProps> = ({
  currentUser,
  lang,
  initialRecipientId,
  onOpenProfile,
  onClearInitialRecipient,
  onUnreadMessagesCountChange,
  onExploreAction,
}) => {
  const { showToast } = useToast()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [searchFilter, setSearchFilter] = useState('')
  const [violationAlert, setViolationAlert] = useState<{
    reason: string
    deactivatedUntil?: string
  } | null>(null)

  const chatScrollRef = useRef<HTMLDivElement>(null)

  // Instagram-style time formatting (now, 5m, 2h, 1d, or date)
  const formatTimeSnippet = (dateStr: string) => {
    try {
      const date = parseDateUTC(dateStr)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / (1000 * 60))
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffMins < 1) return lang === 'ta' ? 'இப்போது' : lang === 'hi' ? 'अभी' : 'now'
      if (diffMins < 60) return `${diffMins}m`
      if (diffHours < 24) return `${diffHours}h`
      if (diffDays < 7) return `${diffDays}d`
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    } catch {
      return ''
    }
  }

  // Multilingual translations
  const t = {
    messaging: lang === 'ta' ? 'செய்திகள்' : lang === 'hi' ? 'संदेश' : 'Messages',
    searchConv: lang === 'ta' ? 'தேடுக...' : lang === 'hi' ? 'खोजें...' : 'Search',
    yourMessages: lang === 'ta' ? 'உங்கள் செய்திகள்' : lang === 'hi' ? 'आपके संदेश' : 'Your Messages',
    noConversationsDesc: lang === 'ta'
      ? 'வேலை வழங்குநர்கள், தேர்வாளர்கள் மற்றும் விண்ணப்பதாரர்களுடன் தனிப்பட்ட முறையில் தொடர்பு கொள்ளுங்கள்.'
      : lang === 'hi'
      ? 'नियोक्ताओं, भर्तीकर्ताओं और उम्मीदवारों के साथ सीधे और निजी तौर पर संवाद करें।'
      : 'Send private messages and connect directly with verified recruiters, employers, and candidates.',
    startConversation:
      currentUser?.role === 'manager' || currentUser?.role === 'admin'
        ? lang === 'ta'
          ? 'விண்ணப்பதாரர்களைத் தேடுங்கள்'
          : lang === 'hi'
          ? 'उम्मीदवार खोजें'
          : 'Find Candidates'
        : lang === 'ta'
        ? 'வேலைகளைப் பாருங்கள்'
        : lang === 'hi'
        ? 'नौकरियां देखें'
        : 'Explore Openings',
    noSearchResults: lang === 'ta' ? 'பொருத்தமான உரையாடல்கள் எதுவும் இல்லை' : lang === 'hi' ? 'कोई बातचीत नहीं मिली' : 'No conversations found',
    typeMessage: lang === 'ta' ? 'செய்தி...' : lang === 'hi' ? 'संदेश...' : 'Message...',
    send: lang === 'ta' ? 'அனுப்பு' : lang === 'hi' ? 'भेजें' : 'Send',
    viewProfile: lang === 'ta' ? 'சுயவிவரம்' : lang === 'hi' ? 'प्रोफ़ाइल' : 'Profile',
    violationTitle: lang === 'ta' ? 'உள்ளடக்கப் பாதுகாப்புக் கொள்கை மீறல்' : lang === 'hi' ? 'सामग्री सुरक्षा नीति उल्लंघन' : 'Content Safety Policy Violation',
    suspendedNotice: lang === 'ta' ? 'உங்கள் கணக்கு 24 மணிநேரத்திற்கு தற்காலிகமாக முடக்கப்பட்டுள்ளது' : lang === 'hi' ? 'आपका खाता 24 घंटे के लिए निलंबित कर दिया गया है' : 'Your account has been temporarily suspended for 24 hours due to non-professional content.',
  }

  // Select a conversation and immediately mark its messages as read
  const handleSelectConversation = async (conv: Conversation) => {
    setActiveConversation(conv)
    if ((conv.unread_count || 0) > 0) {
      await chatService.markConversationAsRead(conv.id)
      setConversations((prev) => {
        const next = prev.map((c) => (c.id === conv.id ? { ...c, unread_count: 0 } : c))
        const remainingUnread = next.reduce((sum, c) => sum + (c.unread_count || 0), 0)
        onUnreadMessagesCountChange?.(remainingUnread)
        return next
      })
      setActiveConversation((prev) => (prev ? { ...prev, unread_count: 0 } : null))
    }
  }

  // Load conversations list
  const loadConversations = async (autoSelectFirst = false) => {
    try {
      const res = await chatService.getConversations()
      setConversations(res.conversations)
      const totalUnread = res.conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0)
      onUnreadMessagesCountChange?.(totalUnread)

      if (autoSelectFirst && res.conversations.length > 0 && !activeConversation) {
        // Auto-select on desktop screens only
        if (window.innerWidth >= 768) {
          handleSelectConversation(res.conversations[0])
        }
      }
    } catch (err) {
      console.error('Error loading conversations:', err)
    } finally {
      setLoadingConversations(false)
    }
  }

  // Handle initialRecipientId if user clicked "Message" on someone's card
  useEffect(() => {
    const handleInitial = async () => {
      if (initialRecipientId) {
        try {
          const res = await chatService.createOrGetConversation(initialRecipientId)
          await loadConversations()
          const targetConv = conversations.find((c) => c.id === res.conversation.id) || {
            id: res.conversation.id,
            updated_at: new Date().toISOString(),
            participant: res.conversation.participant,
            unread_count: 0,
          }
          handleSelectConversation(targetConv)
          if (onClearInitialRecipient) onClearInitialRecipient()
        } catch (err: any) {
          console.error('Failed to open initial recipient conversation:', err)
        }
      }
    }
    handleInitial()
  }, [initialRecipientId])

  useEffect(() => {
    loadConversations(true)
    const interval = setInterval(() => {
      loadConversations(false)
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  // Load messages whenever activeConversation changes
  useEffect(() => {
    if (!activeConversation) return
    const fetchMessages = async () => {
      setLoadingMessages(true)
      try {
        const res = await chatService.getMessages(activeConversation.id)
        setMessages(res.messages)
      } catch (err) {
        console.error('Error fetching messages:', err)
      } finally {
        setLoadingMessages(false)
      }
    }

    fetchMessages()
    const msgInterval = setInterval(async () => {
      try {
        const res = await chatService.getMessages(activeConversation.id)
        setMessages(res.messages)
      } catch {}
    }, 60000)

    return () => clearInterval(msgInterval)
  }, [activeConversation?.id])

  // Auto-scroll to bottom of message list (strictly inside chat container, never scrolls the window)
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [messages])

  // Ensure window stays at top when opening or switching conversations
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [activeConversation?.id])

  // Send message with live moderation error handling
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    const content = inputText.trim()
    if (!content || !activeConversation || sending) return

    setSending(true)
    setViolationAlert(null)

    try {
      const res = await chatService.sendMessage(activeConversation.id, content)
      setInputText('')
      setMessages((prev) => [...prev, res.message])
      loadConversations(false)
    } catch (err: any) {
      console.error('Failed to send message:', err)
      if (
        err.message?.includes('CONTENT_MODERATION_VIOLATION') ||
        err.message?.includes('content safety') ||
        err.message?.includes('suspended')
      ) {
        setViolationAlert({
          reason: err.message,
          deactivatedUntil: err.deactivated_until,
        })
      } else {
        showToast(err.message || 'Failed to deliver message.', 'error')
      }
    } finally {
      setSending(false)
    }
  }

  const filteredConversations = conversations.filter((c) => {
    if (!searchFilter.trim()) return true
    const term = searchFilter.toLowerCase()
    return (
      c.participant.full_name.toLowerCase().includes(term) ||
      (c.participant.username || '').toLowerCase().includes(term)
    )
  })

  return (
    <div className="w-full">
      {/* Moderation Violation Alert Banner */}
      {violationAlert && (
        <div className="mb-3 mx-3 md:mx-0 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 shadow-xs animate-in fade-in">
          <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="flex-1 text-xs">
            <h4 className="font-bold text-amber-900 text-sm mb-0.5">
              {t.violationTitle}
            </h4>
            <p className="text-amber-800 font-medium mb-1">
              {violationAlert.reason}
            </p>
            <p className="text-amber-700">
              {t.suspendedNotice}
            </p>
          </div>
        </div>
      )}

      {/* Main Native Instagram-Style Direct Container */}
      <div className="w-full bg-white flex flex-col md:flex-row h-[calc(100dvh-124px)] md:h-[calc(100vh-84px)] md:rounded-2xl md:border md:border-slate-200/80 md:shadow-xs overflow-hidden">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Instagram Direct Messages Inbox List                         */}
        {/* ========================================================================= */}
        <div
          className={`w-full md:w-80 lg:w-[350px] shrink-0 md:border-r md:border-slate-100 flex flex-col bg-white overflow-hidden ${
            activeConversation ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Native Instagram Mobile Header */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                {currentUser?.username || currentUser?.full_name || t.messaging}
              </h1>
              {conversations.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold">
                  {conversations.length}
                </span>
              )}
            </div>

            {/* Compose / Explore Action Button */}
            {onExploreAction && (
              <button
                type="button"
                onClick={onExploreAction}
                className="p-1.5 -mr-1 rounded-full text-slate-800 hover:bg-slate-100 active:scale-95 transition cursor-pointer"
                title="New Message"
              >
                <SquarePen className="w-5 h-5 text-slate-800" strokeWidth={2} />
              </button>
            )}
          </div>

          {/* Instagram Search Bar */}
          <div className="px-4 py-2.5 bg-white shrink-0">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder={t.searchConv}
                className="w-full pl-10 pr-8 py-2 bg-[#EFEFEF] hover:bg-[#E8E8E8] focus:bg-white focus:ring-1 focus:ring-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 transition-all border-none outline-none"
              />
              {searchFilter && (
                <button
                  type="button"
                  onClick={() => setSearchFilter('')}
                  className="absolute right-3 w-4 h-4 rounded-full bg-slate-300 text-slate-600 flex items-center justify-center text-[10px] font-bold hover:bg-slate-400"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Conversations Scrollable List / Authentic Empty State */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50 min-h-0">
            {loadingConversations ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3.5 animate-pulse">
                    <div className="w-13 h-13 bg-slate-100 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-100 rounded w-2/5" />
                      <div className="h-3 bg-slate-50 rounded w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              searchFilter.trim() ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <p className="font-semibold text-slate-700 text-sm mb-1">{t.noSearchResults}</p>
                  <p className="text-slate-400">Try searching for a different name</p>
                </div>
              ) : (
                /* Authentic Instagram Native Direct Empty State */
                <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center animate-in fade-in duration-200">
                  <div className="w-24 h-24 rounded-full border-2 border-slate-900 flex items-center justify-center mb-5 bg-white shadow-2xs">
                    <Send className="w-10 h-10 text-slate-900 -rotate-12 translate-x-0.5" strokeWidth={1.8} />
                  </div>

                  <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-2">
                    {t.yourMessages}
                  </h2>

                  <p className="text-[13px] sm:text-sm text-slate-500 max-w-xs leading-relaxed mb-6 font-normal">
                    {t.noConversationsDesc}
                  </p>

                  {onExploreAction && (
                    <button
                      type="button"
                      onClick={onExploreAction}
                      className="px-6 py-2.5 rounded-xl bg-[#0095F6] hover:bg-[#1877F2] active:scale-95 text-white font-semibold text-sm transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                    >
                      <span>{t.startConversation}</span>
                    </button>
                  )}
                </div>
              )
            ) : (
              filteredConversations.map((conv) => {
                const isActive = activeConversation?.id === conv.id
                const isUnread = (conv.unread_count || 0) > 0
                return (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`w-full px-4 py-3 text-left flex items-center gap-3.5 transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#EFEFEF]/70 md:bg-slate-100/80'
                        : isUnread
                        ? 'bg-blue-50/30 hover:bg-slate-50'
                        : 'hover:bg-slate-50'
                    } active:bg-slate-100`}
                  >
                    {/* Instagram Avatar (52px with active status badge) */}
                    <div className="relative shrink-0">
                      {conv.participant.avatar_url ? (
                        <img
                          src={conv.participant.avatar_url}
                          alt={conv.participant.full_name}
                          className="w-13 h-13 rounded-full object-cover ring-1 ring-slate-200/80"
                        />
                      ) : (
                        <div className="w-13 h-13 rounded-full bg-gradient-to-br from-[#0B2545] to-[#1E3A8A] text-white font-bold text-base flex items-center justify-center shadow-2xs">
                          {conv.participant.full_name ? conv.participant.full_name.charAt(0).toUpperCase() : 'U'}
                        </div>
                      )}
                    </div>

                    {/* Conversation Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h2 className={`text-[14px] text-slate-900 truncate tracking-tight ${isUnread ? 'font-bold' : 'font-semibold'}`}>
                          {conv.participant.full_name}
                        </h2>
                      </div>

                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className={`text-[13px] truncate ${isUnread ? 'font-semibold text-slate-900' : 'text-slate-500 font-normal'}`}>
                          {conv.last_message ? (
                            <DynamicTranslatedText text={conv.last_message.content} as="span" />
                          ) : (
                            <span className="text-slate-400 italic">Tap to start conversation</span>
                          )}
                        </p>
                        {conv.last_message && (
                          <>
                            <span className="text-slate-300 text-xs">·</span>
                            <span className={`text-[12px] shrink-0 ${isUnread ? 'font-semibold text-slate-700' : 'text-slate-400'}`}>
                              {formatTimeSnippet(conv.last_message.created_at)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Unread Indicator: Instagram Iconic Blue Dot */}
                    {isUnread && (
                      <div className="flex items-center justify-center shrink-0 pl-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#0095F6] shadow-xs" title="Unread" />
                      </div>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Active Chat Thread or Desktop Empty State                   */}
        {/* ========================================================================= */}
        {activeConversation ? (
          <div className="flex-1 flex flex-col bg-white overflow-hidden min-h-0">
            {/* Native Instagram Chat Top Bar */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setActiveConversation(null)}
                  className="md:hidden p-1.5 -ml-1 rounded-full text-slate-800 hover:bg-slate-100 active:scale-95 transition cursor-pointer"
                  title="Back to inbox"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-900" />
                </button>

                <div className="relative shrink-0">
                  {activeConversation.participant.avatar_url ? (
                    <img
                      src={activeConversation.participant.avatar_url}
                      alt={activeConversation.participant.full_name}
                      className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-[#0B2545] text-white font-bold text-xs flex items-center justify-center">
                      {activeConversation.participant.full_name ? activeConversation.participant.full_name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-slate-900 leading-tight truncate">
                    {activeConversation.participant.full_name}
                  </h3>
                  {(activeConversation.participant.headline || activeConversation.participant.username) && (
                    <p className="text-[11px] text-slate-500 leading-tight truncate mt-0.5">
                      {activeConversation.participant.headline || `@${activeConversation.participant.username}`}
                    </p>
                  )}
                </div>
              </div>

              {/* View Profile Action */}
              <button
                type="button"
                onClick={() => onOpenProfile(activeConversation.participant.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 text-xs font-semibold text-slate-700 transition cursor-pointer shrink-0"
              >
                <span>{t.viewProfile}</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </button>
            </div>

            {/* Chat Thread Messages Area (Clean Instagram Bubble Styling) */}
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-[#FAFAFA] min-h-0">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <RefreshCw className="w-5 h-5 text-slate-400 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <div className="w-16 h-16 rounded-full border border-slate-200 bg-white flex items-center justify-center mb-3 shadow-2xs">
                    <Send className="w-7 h-7 text-slate-800 -rotate-12 translate-x-0.5" strokeWidth={1.8} />
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mb-1">
                    No messages yet
                  </h4>
                  <p className="text-xs text-slate-500 max-w-xs">
                    Send a message to connect with {activeConversation.participant.full_name}.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id === currentUser?.id
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[82%] sm:max-w-[70%] px-4 py-2.5 text-[14px] leading-relaxed shadow-2xs ${
                          isMe
                            ? 'bg-[#007AFF] text-white rounded-[20px] rounded-br-xs'
                            : 'bg-[#EFEFEF] text-slate-900 rounded-[20px] rounded-bl-xs'
                        }`}
                      >
                        <DynamicTranslatedText
                          text={msg.content}
                          as="span"
                          showOriginalToggle={!isMe}
                        />
                      </div>

                      <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 px-1.5">
                        <span>
                          {parseDateUTC(msg.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {isMe && (
                          <span>
                            {msg.read_at ? (
                              <CheckCheck className="w-3.5 h-3.5 text-[#007AFF]" />
                            ) : (
                              <Check className="w-3 h-3 text-slate-400" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Native Instagram Message Compose Pill Bar */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 bg-white border-t border-slate-100 flex items-center gap-2 shrink-0"
            >
              <div className="flex-1 flex items-center bg-[#EFEFEF] hover:bg-[#E8E8E8] focus-within:bg-white focus-within:ring-1 focus-within:ring-slate-300 rounded-full px-4 py-1.5 transition-all">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={t.typeMessage}
                  disabled={sending}
                  className="w-full bg-transparent border-0 outline-none text-sm text-slate-900 placeholder:text-slate-400 py-1"
                />
              </div>

              <button
                type="submit"
                disabled={!inputText.trim() || sending}
                className="px-3.5 py-2 text-sm font-bold text-[#0095F6] hover:text-[#1877F2] active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer shrink-0"
              >
                {sending ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-[#0095F6]" />
                ) : (
                  t.send
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Desktop Right Empty State */
          <div className="hidden md:flex flex-1 flex-col items-center justify-center p-8 text-center bg-white">
            <div className="w-24 h-24 rounded-full border-2 border-slate-900 flex items-center justify-center mb-4">
              <Send className="w-10 h-10 text-slate-900 -rotate-12 translate-x-0.5" strokeWidth={1.8} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-1.5">
              {t.yourMessages}
            </h3>
            <p className="text-sm text-slate-500 max-w-xs leading-relaxed mb-6 font-normal">
              {t.noConversationsDesc}
            </p>
            {onExploreAction && (
              <button
                type="button"
                onClick={onExploreAction}
                className="px-6 py-2.5 rounded-xl bg-[#0095F6] hover:bg-[#1877F2] active:scale-95 text-white font-semibold text-sm transition-all shadow-xs cursor-pointer"
              >
                {t.startConversation}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

