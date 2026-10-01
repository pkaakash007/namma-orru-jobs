import React, { useState, useEffect, useRef } from 'react'
import {
  MessageSquare,
  Send,
  Search,
  Check,
  CheckCheck,
  ShieldAlert,
  ArrowLeft,
  ExternalLink,
  RefreshCw,
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
}

export const MessagesView: React.FC<MessagesViewProps> = ({
  currentUser,
  lang,
  initialRecipientId,
  onOpenProfile,
  onClearInitialRecipient,
  onUnreadMessagesCountChange,
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

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Multilingual translations
  const t = {
    messaging: lang === 'ta' ? 'செய்திப்பரிமாற்றம்' : lang === 'hi' ? 'संदेश' : 'Messaging',
    searchConv: lang === 'ta' ? 'செய்திகளைத் தேடுக...' : lang === 'hi' ? 'बातचीत खोजें...' : 'Search messages...',
    noConversations: lang === 'ta' ? 'உரையாடல்கள் எதுவும் இல்லை' : lang === 'hi' ? 'कोई बातचीत नहीं' : 'No conversations yet',
    selectChat: lang === 'ta' ? 'உரையாடலைத் தேர்வு செய்யவும்' : lang === 'hi' ? 'बातचीत चुनें' : 'Select a conversation',
    selectChatDesc: lang === 'ta' ? 'உரையாடலைத் தொடங்க இடதுபுறத்தில் உள்ள ஒரு தொடர்பைத் தேர்ந்தெடுக்கவும்.' : lang === 'hi' ? 'बातचीत शुरू करने के लिए बाईं ओर से किसी संपर्क को चुनें।' : 'Choose a conversation from the left to view messages and reply.',
    typeMessage: lang === 'ta' ? 'செய்தியைத் தட்டச்சு செய்க...' : lang === 'hi' ? 'संदेश लिखें...' : 'Write a message...',
    send: lang === 'ta' ? 'அனுப்புக' : lang === 'hi' ? 'भेजें' : 'Send',
    viewProfile: lang === 'ta' ? 'சுயவிவரம்' : lang === 'hi' ? 'प्रोफ़ाइल' : 'View Profile',
    violationTitle: lang === 'ta' ? 'உள்ளடக்கப் பாதுகாப்புக் கொள்கை மீறல்' : lang === 'hi' ? 'सामग्री सुरक्षा नीति उल्लंघन' : 'Content Safety Policy Violation',
    suspendedNotice: lang === 'ta' ? 'உங்கள் கணக்கு 24 மணிநேரத்திற்கு தற்காலிகமாக முடக்கப்பட்டுள்ளது' : lang === 'hi' ? 'आपका खाता 24 घंटे के लिए निलंबित कर दिया गया है' : 'Your account has been temporarily suspended for 24 hours due to non-professional content.',
    online: lang === 'ta' ? 'செயலில் உள்ளார்' : lang === 'hi' ? 'ऑनलाइन' : 'Active now',
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
        handleSelectConversation(res.conversations[0])
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
    // 1-minute interval while user is on Messages tab
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
    // 1-minute interval for messages in active conversation
    const msgInterval = setInterval(async () => {
      try {
        const res = await chatService.getMessages(activeConversation.id)
        setMessages(res.messages)
      } catch {}
    }, 60000)

    return () => clearInterval(msgInterval)
  }, [activeConversation?.id])

  // Auto-scroll to bottom of message list
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
    <div className="w-full space-y-4">
      {/* Moderation Violation Alert Banner */}
      {violationAlert && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3.5 shadow-xs animate-in fade-in">
          <div className="w-9 h-9 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
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

      {/* Main Clean Human Page Container (Full Page Height, Integrated Light Surface) */}
      <div className="rounded-xl border border-[#E0DFDC] bg-white shadow-xs overflow-hidden flex flex-col md:flex-row h-[calc(100vh-140px)] min-h-[620px] max-h-[820px]">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Clean Conversation List (Light Theme, Human iOS/LinkedIn)    */}
        {/* ========================================================================= */}
        <div
          className={`w-full md:w-80 lg:w-[340px] shrink-0 border-r border-[#E0DFDC] flex flex-col bg-white ${
            activeConversation ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header Bar */}
          <div className="p-3.5 border-b border-[#E0DFDC] bg-white space-y-2.5">
            <div className="flex items-center justify-between">
              <h1 className="text-base font-bold text-[#0F172A] tracking-tight">
                {t.messaging}
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                {conversations.length}
              </span>
            </div>

            {/* Human Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-[#EDF3F8] border border-transparent rounded-lg text-xs text-[#0F172A] focus:bg-white focus:border-[#0B2545] focus:outline-none transition"
              />
              {searchFilter && (
                <button
                  type="button"
                  onClick={() => setSearchFilter('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Conversations Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {loadingConversations ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-11 h-11 bg-slate-200 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 bg-slate-200 rounded w-1/2" />
                      <div className="h-2.5 bg-slate-100 rounded w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <p className="font-bold text-slate-700">
                  {t.noConversations}
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isActive = activeConversation?.id === conv.id
                const isUnread = (conv.unread_count || 0) > 0
                return (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`w-full p-3.5 text-left flex items-start gap-3 transition-colors cursor-pointer border-l-4 ${
                      isActive
                        ? 'bg-[#EDF3F8] border-[#0B2545]'
                        : isUnread
                        ? 'bg-blue-50/40 border-transparent hover:bg-slate-50'
                        : 'border-transparent hover:bg-slate-50'
                    }`}
                  >
                    {/* Contact Avatar */}
                    <div className="relative shrink-0">
                      {conv.participant.avatar_url ? (
                        <img
                          src={conv.participant.avatar_url}
                          alt={conv.participant.full_name}
                          className="w-11 h-11 rounded-full object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-[#0B2545] text-white font-bold text-sm flex items-center justify-center">
                          {conv.participant.full_name ? conv.participant.full_name.charAt(0).toUpperCase() : 'U'}
                        </div>
                      )}
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                    </div>

                    {/* Contact Details & Last Message Snippet */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5 truncate">
                          <h2 className={`text-xs sm:text-sm text-[#0F172A] truncate ${isUnread ? 'font-black' : 'font-bold'}`}>
                            {conv.participant.full_name}
                          </h2>
                          {isUnread && (
                            <span className="h-2 w-2 rounded-full bg-[#F97316] shrink-0" title="Unread" />
                          )}
                        </div>
                        {conv.last_message && (
                          <span className={`text-[10px] shrink-0 ml-1 ${isUnread ? 'font-bold text-[#0B2545]' : 'text-slate-400'}`}>
                            {parseDateUTC(conv.last_message.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>

                      <p className={`text-xs truncate leading-snug ${isUnread ? 'font-bold text-[#0F172A]' : 'text-slate-500'}`}>
                        {conv.last_message ? (
                          <DynamicTranslatedText text={conv.last_message.content} as="span" />
                        ) : (
                          'Tap to start conversation'
                        )}
                      </p>
                    </div>

                    {isUnread && (
                      <span className="px-1.5 py-0.5 rounded-full bg-[#0B2545] text-white text-[10px] font-black flex items-center justify-center shrink-0 shadow-2xs">
                        {conv.unread_count}
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Active Chat Thread & Composition (Clean Human Interface)    */}
        {/* ========================================================================= */}
        {activeConversation ? (
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
            {/* Chat Header Bar */}
            <div className="px-4 py-3 border-b border-[#E0DFDC] flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveConversation(null)}
                  className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
                  title="Back to conversations"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <div className="relative shrink-0">
                  {activeConversation.participant.avatar_url ? (
                    <img
                      src={activeConversation.participant.avatar_url}
                      alt={activeConversation.participant.full_name}
                      className="w-10 h-10 rounded-full object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#0B2545] text-white font-bold text-sm flex items-center justify-center">
                      {activeConversation.participant.full_name ? activeConversation.participant.full_name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                </div>

                <div>
                  <h3 className="font-bold text-sm text-[#0F172A] leading-tight">
                    {activeConversation.participant.full_name}
                  </h3>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    @{activeConversation.participant.username || 'member'} •{' '}
                    <span className="text-emerald-600 font-semibold">{t.online}</span>
                  </p>
                </div>
              </div>

              {/* View Profile Action */}
              <button
                type="button"
                onClick={() => onOpenProfile(activeConversation.participant.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer"
              >
                <span>{t.viewProfile}</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </button>
            </div>

            {/* Chat Thread Messages Area (Clean White / Off-white human chat) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-[#F9FAFB]">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <RefreshCw className="w-5 h-5 text-[#0B2545] animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 text-xs">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-[#0B2545] flex items-center justify-center mb-2.5">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <p className="font-bold text-slate-700 text-sm">
                    No messages in this chat yet
                  </p>
                  <p className="text-slate-500 mt-0.5">Send a friendly greeting to connect!</p>
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
                        className={`max-w-[85%] sm:max-w-[70%] px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                          isMe
                            ? 'bg-[#0B2545] text-white rounded-2xl rounded-tr-xs'
                            : 'bg-white text-[#0F172A] border border-[#E2E8F0] rounded-2xl rounded-tl-xs'
                        }`}
                      >
                        <DynamicTranslatedText
                          text={msg.content}
                          as="span"
                          showOriginalToggle={!isMe}
                        />
                      </div>

                      <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 px-1">
                        <span>
                          {parseDateUTC(msg.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {isMe && (
                          <span>
                            {msg.read_at ? (
                              <CheckCheck className="w-3.5 h-3.5 text-[#0B2545]" />
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
              <div ref={messagesEndRef} />
            </div>

            {/* Message Compose Form (Human & Simple) */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 sm:p-3.5 border-t border-[#E0DFDC] bg-white flex items-center gap-2 shrink-0"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={sending}
                className="flex-1 px-4 py-2.5 bg-[#F3F2EF] border border-transparent rounded-xl text-xs sm:text-sm text-[#0F172A] focus:bg-white focus:border-[#0B2545] focus:outline-none transition"
              />

              <button
                type="submit"
                disabled={!inputText.trim() || sending}
                className="px-4 sm:px-5 py-2.5 bg-[#0B2545] hover:bg-[#071A31] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs sm:text-sm transition flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0 shadow-2xs"
              >
                {sending ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>{t.send}</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 flex-col items-center justify-center p-8 text-center text-slate-400 bg-[#F9FAFB]">
            <div className="w-14 h-14 rounded-full bg-blue-50 text-[#0B2545] flex items-center justify-center mb-3">
              <MessageSquare className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-[#0F172A] mb-1">
              {t.selectChat}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm">
              {t.selectChatDesc}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
