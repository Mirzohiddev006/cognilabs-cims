/* eslint-disable react-hooks/purity */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useSearchParams } from 'react-router-dom'
import { cn } from '../../../shared/lib/cn'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { useToast } from '../../../shared/toast/useToast'
import { getApiErrorMessage } from '../../../shared/lib/api-error'
import { resolveMediaUrl } from '../../../shared/lib/media-url'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import {
  cognilabsaiService,
  type ConversationItem,
  type MessageItem,
  type TelegramSearchResult,
  type WsEvent,
} from '../../../shared/api/services/cognilabsai.service'

type ChannelTab = 'all' | 'instagram' | 'telegram'

function getClientName(conv: ConversationItem): string {
  return conv.client_full_name || conv.client_username || `#${conv.id}`
}

function AvatarOrInitials({
  avatarUrl,
  name,
  size = 'md',
}: {
  avatarUrl?: string | null
  name: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const [failed, setFailed] = useState(false)
  const resolved = avatarUrl ? cognilabsaiService.buildAvatarUrl(avatarUrl) ?? resolveMediaUrl(avatarUrl) : null

  const sizeClass = size === 'sm' ? 'h-9 w-9 text-sm' : size === 'lg' ? 'h-14 w-14 text-lg' : 'h-12 w-12 text-base'

  if (resolved && !failed) {
    return (
      <img
        src={resolved}
        alt={name}
        onError={() => setFailed(true)}
        className={cn(sizeClass, 'shrink-0 rounded-full object-cover')}
      />
    )
  }

  const initials = name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?'

  // Telegram often uses vibrant solid colors for generic avatars
  return (
    <div
      className={cn(
        sizeClass,
        'shrink-0 rounded-full bg-[linear-gradient(135deg,#3b82f6,#2563eb)] text-white font-semibold flex items-center justify-center select-none',
      )}
    >
      {initials}
    </div>
  )
}

function ChannelBadge({ channel, chatMode }: { channel: string; chatMode: string }) {
  const isInstagram = channel === 'instagram'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide transition-colors',
        isInstagram
          ? 'bg-pink-500/15 text-pink-400'
          : 'bg-[#3390ec]/15 text-[#3390ec]',
      )}
    >
      {chatMode === 'instagram_ai' ? 'AI' : 'OP'}
    </span>
  )
}

function PauseReasonBadge({ reason }: { reason: string | null }) {
  if (!reason) return null
  return (
    <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-500 uppercase tracking-tight">
      {reason}
    </span>
  )
}

function ConversationListItem({
  conv,
  isActive,
  onSelect,
}: {
  conv: ConversationItem
  isActive: boolean
  onSelect: () => void
}) {
  const name = getClientName(conv)
  const isOnline = conv.last_message_at && (Date.now() - new Date(conv.last_message_at).getTime() < 1000 * 60 * 5)
  
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group w-full rounded-xl px-2.5 py-2 text-left transition-colors duration-150 relative overflow-hidden flex items-center gap-3',
        isActive
          ? 'bg-[#3390ec] text-white'
          : 'hover:bg-[#202b36] text-[var(--foreground)]',
      )}
    >
      <div className="relative shrink-0">
        <AvatarOrInitials avatarUrl={conv.client_avatar_url} name={name} size="md" />
        {isOnline && (
          <div className={cn(
            "absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 bg-[#00ff00]",
            isActive ? "border-[#3390ec]" : "border-[#17212b] group-hover:border-[#202b36]"
          )} />
        )}
      </div>
      
      <div className="min-w-0 flex-1 py-0.5 border-b border-transparent">
        <div className="flex items-baseline justify-between gap-2">
          <p className={cn(
            'truncate text-[15px] font-medium leading-tight',
            isActive ? 'text-white' : 'text-white'
          )}>
            {name}
          </p>
          {conv.last_message_at ? (
            <span className={cn(
              'shrink-0 text-[12px]',
              isActive ? 'text-white/80' : 'text-[#7a8b9a]'
            )}>
              {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          ) : null}
        </div>
        
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            {conv.last_message_preview ? (
              <p className={cn(
                'truncate text-[14px] leading-snug',
                isActive ? 'text-white/90' : 'text-[#7a8b9a]'
              )}>
                {conv.last_message_preview}
              </p>
            ) : (
              <p className={cn(
                'italic text-[13px]',
                isActive ? 'text-white/60' : 'text-[#7a8b9a]'
              )}>No messages yet</p>
            )}
          </div>
          
          <div className="shrink-0 flex items-center gap-1.5">
            {!isActive && <ChannelBadge channel={conv.channel} chatMode={conv.chat_mode} />}
          </div>
        </div>
      </div>
    </button>
  )
}

function MessageBubble({ msg, showTail }: { msg: MessageItem; showTail?: boolean }) {
  const isClient = msg.sender_type === 'client'
  const isAi = msg.sender_type === 'ai'
  const isSystem = msg.sender_type === 'system'

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <span className="rounded-full bg-[#182533]/60 px-3 py-1 text-[13px] font-medium text-white/80 shadow-sm backdrop-blur-sm">
          {msg.text}
        </span>
      </div>
    )
  }

  return (
    <div className={cn(
      'flex w-full group relative mb-1.5', 
      isClient ? 'justify-start pl-2' : 'justify-end pr-2'
    )}>
      <div
        className={cn(
          'relative max-w-[85%] sm:max-w-[70%] px-3.5 py-1.5 text-[15px] shadow-sm',
          isClient
            ? 'bg-[#182533] text-white' // Telegram Dark Mode receiver bubble
            : 'bg-[#2b5278] text-white', // Telegram Dark Mode sender bubble
          // Telegram style border radius
          'rounded-2xl',
          showTail && isClient && 'rounded-bl-none',
          showTail && !isClient && 'rounded-br-none'
        )}
      >
        {/* The little tail triangle for Telegram look */}
        {showTail && (
          <svg
            viewBox="0 0 11 20"
            className={cn(
              "absolute bottom-0 w-[11px] h-[20px]",
              isClient ? "-left-[10px] text-[#182533]" : "-right-[10px] text-[#2b5278]"
            )}
            style={{ fill: "currentColor" }}
          >
            {isClient ? (
              <path d="M11 20H0C5 20 9 16 9 10V0Z" />
            ) : (
              <path d="M0 20H11C6 20 2 16 2 10V0Z" />
            )}
          </svg>
        )}

        {(isAi || msg.sender_type === 'operator') && (
          <p className={cn(
            'mb-0.5 text-[13px] font-medium', 
            isAi ? 'text-violet-400' : 'text-[#64b5f6]'
          )}>
            {isAi ? 'AI' : msg.operator_name_snapshot || 'Operator'}
          </p>
        )}
        
        <p className="whitespace-pre-wrap break-words leading-[1.45]">
          {msg.text}
          {/* Spacer to float time to the bottom right without overlapping text */}
          <span className="inline-block w-12" />
        </p>
        
        <div className="absolute bottom-1 right-2 flex items-center gap-1 opacity-70">
          <span className="text-[11px] font-medium pt-1">
            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {!isClient && (
            <svg viewBox="0 0 16 15" className={cn("h-[14px] w-[14px] fill-current", isAi ? "text-violet-300" : "text-[#40a7e3]")}>
              {/* Telegram double checkmark simplified */}
              <path d="M10.97 3.53a.75.75 0 0 1 1.06 0l3.5 3.5a.75.75 0 1 1-1.06 1.06L11.5 5.12l-2.97 2.97a.75.75 0 0 1-1.06-1.06l3.5-3.5zm-5 0a.75.75 0 0 1 1.06 0l3.5 3.5a.75.75 0 1 1-1.06 1.06L6.5 5.12 3.03 8.59a.75.75 0 0 1-1.06-1.06l4-4z" />
            </svg>
          )}
        </div>
      </div>
    </div>
  )
}

function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex justify-center my-3 sticky top-2 z-20">
      <span className="rounded-full bg-[#182533]/70 backdrop-blur-md px-3 py-1 text-[13px] font-medium text-white shadow-sm">
        {date}
      </span>
    </div>
  )
}

function TelegramSearchModal({
  onClose,
  onStartChat,
}: {
  onClose: () => void
  onStartChat: (conversationId: number) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TelegramSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedPeer, setSelectedPeer] = useState<TelegramSearchResult | null>(null)
  const [messageText, setMessageText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const { showToast } = useToast()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await cognilabsaiService.telegramSearchList(query.trim(), 10)
        setResults(res.items)
      } catch {
        setResults([])
      } finally {
        setIsSearching(false)
      }
    }, 400)
  }, [query])

  async function handleStart() {
    if (!selectedPeer || !messageText.trim()) return
    setIsSending(true)
    try {
      if (selectedPeer.existing_conversation_id) {
        onStartChat(selectedPeer.existing_conversation_id)
        return
      }
      await cognilabsaiService.telegramStart(selectedPeer.peer, messageText.trim(), selectedPeer.full_name ?? undefined)
      showToast({ title: 'Chat started', tone: 'success' })
      onClose()
    } catch (err) {
      showToast({ title: 'Failed', description: getApiErrorMessage(err), tone: 'error' })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-[#17212b] p-6 shadow-2xl animate-page-enter">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-medium text-white">New Telegram Chat</h3>
          <button type="button" onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-white/10 text-[#7a8b9a] transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="relative group">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#7a8b9a] group-focus-within:text-[#3390ec] transition-colors">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <Input
            placeholder="Username, @username, or link..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedPeer(null)
            }}
            className="h-12 pl-10 pr-4 bg-[#242f3d] border-transparent focus:border-[#3390ec] rounded-lg transition-all text-base text-white placeholder:text-[#7a8b9a]"
            autoFocus
          />
        </div>

        {isSearching ? (
          <div className="mt-6 flex flex-col items-center justify-center py-8">
             <div className="h-8 w-8 border-2 border-[#3390ec]/30 border-t-[#3390ec] rounded-full animate-spin" />
          </div>
        ) : results.length > 0 ? (
          <div className="mt-4 max-h-[320px] space-y-1 overflow-y-auto custom-scrollbar-visible pr-1">
            {results.map((item) => (
              <button
                key={item.peer}
                type="button"
                onClick={() => setSelectedPeer(item)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                  selectedPeer?.peer === item.peer
                    ? 'bg-[#3390ec] text-white'
                    : 'hover:bg-[#202b36] text-white',
                )}
              >
                <AvatarOrInitials avatarUrl={item.avatar_url} name={item.full_name || item.username || item.peer} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium">{item.full_name || item.username || item.peer}</p>
                  {item.username ? <p className={cn("truncate text-[13px]", selectedPeer?.peer === item.peer ? "text-white/80" : "text-[#7a8b9a]")}>@{item.username}</p> : null}
                </div>
              </button>
            ))}
          </div>
        ) : query.trim() && !isSearching ? (
          <div className="mt-6 flex flex-col items-center justify-center py-8 text-center text-[#7a8b9a]">
             <p className="text-[15px] font-medium">No results found</p>
          </div>
        ) : null}

        {selectedPeer && !selectedPeer.existing_conversation_id ? (
          <div className="mt-6 animate-page-enter">
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={3}
              placeholder="Type your first message..."
              className="w-full resize-none rounded-lg border border-transparent bg-[#242f3d] px-4 py-3 text-[15px] text-white focus:outline-none focus:ring-1 focus:ring-[#3390ec] transition-all placeholder:text-[#7a8b9a]"
            />
          </div>
        ) : null}

        <div className="mt-8 flex gap-3">
          <Button 
            variant="ghost" 
            onClick={onClose} 
            disabled={isSending}
            className="flex-1 h-11 rounded-lg font-medium text-[#3390ec] hover:bg-[#3390ec]/10"
          >
            Cancel
          </Button>
          {selectedPeer ? (
            <Button
              onClick={() => {
                if (selectedPeer.existing_conversation_id) {
                  onStartChat(selectedPeer.existing_conversation_id)
                } else {
                  void handleStart()
                }
              }}
              disabled={isSending || (!selectedPeer.existing_conversation_id && !messageText.trim())}
              className="flex-[2] h-11 rounded-lg font-medium bg-[#3390ec] text-white hover:bg-[#2b82d9]"
            >
              {selectedPeer.existing_conversation_id ? 'Open Chat' : isSending ? 'Starting...' : 'Start Chat'}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function CognilabsAIChatPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState<ChannelTab>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(
    () => {
      const id = searchParams.get('conversation_id')
      return id ? Number(id) : null
    },
  )
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isTogglingAi, setIsTogglingAi] = useState(false)
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [showNewTelegramModal, setShowNewTelegramModal] = useState(false)
  const [wsKey, setWsKey] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const conversationsQuery = useAsyncData(
    () => cognilabsaiService.listConversations(),
    [],
    {
      onSuccess: (data) => setConversations(data),
    },
  )

  useAsyncData(
    () => cognilabsaiService.getIntegrations(),
    [],
    {
      onSuccess: (data) => {
        if (data.websocket_api_key) setWsKey(data.websocket_api_key)
      },
    },
  )

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  )

  const filteredConversations = useMemo(() => {
    let list = conversations
    if (activeTab !== 'all') list = list.filter((c) => c.channel === activeTab)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (c) =>
          getClientName(c).toLowerCase().includes(q) ||
          c.client_username?.toLowerCase().includes(q) ||
          c.last_message_preview?.toLowerCase().includes(q),
      )
    }
    return list
  }, [conversations, activeTab, searchQuery])

  useEffect(() => {
    if (!selectedConversationId) return
    setIsLoadingMessages(true)
    cognilabsaiService
      .listMessages(selectedConversationId)
      .then(setMessages)
      .catch(() => setMessages([]))
      .finally(() => setIsLoadingMessages(false))
  }, [selectedConversationId])

  useEffect(() => {
    if (!selectedConversationId) return
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('conversation_id', String(selectedConversationId))
      return next
    }, { replace: true })
  }, [selectedConversationId, setSearchParams])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // WebSocket setup
  useEffect(() => {
    if (!wsKey) return

    let sock: WebSocket | null = null

    function connect() {
      sock = cognilabsaiService.createWebSocket(wsKey!)
      wsRef.current = sock

      sock.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string) as WsEvent
          if (data.type === 'message.created') {
            if (data.conversation_id === selectedConversationId) {
              setMessages((prev) => [...prev, data.message])
            }
            setConversations((prev) =>
              prev.map((c) =>
                c.id === data.conversation_id
                  ? {
                      ...c,
                      last_message_at: data.message.created_at,
                      last_message_preview: data.message.text,
                    }
                  : c,
              ),
            )
          } else if (data.type === 'conversation.updated') {
            setConversations((prev) =>
              prev.map((c) => (c.id === data.conversation_id ? data.conversation : c)),
            )
          }
        } catch {
          // ignore malformed events
        }
      }

      sock.onerror = () => {
        // reconnect silently
      }

      sock.onclose = () => {
        setTimeout(connect, 5000)
      }
    }

    connect()

    return () => {
      wsRef.current?.close()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsKey])

  const handleSelectConversation = useCallback((id: number) => {
    setSelectedConversationId(id)
    setMessages([])
    setMessageText('')
  }, [])

  async function handleSend() {
    if (!selectedConversationId || !messageText.trim() || isSending) return
    const text = messageText.trim()
    setMessageText('')
    setIsSending(true)
    const optimistic: MessageItem = {
      id: Date.now(),
      conversation_id: selectedConversationId,
      channel: selectedConversation?.channel ?? '',
      sender_type: 'operator',
      operator_user_id: null,
      operator_name_snapshot: null,
      client_external_id: null,
      instagram_message_id: null,
      telegram_message_id: null,
      text,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])
    try {
      await cognilabsaiService.sendMessage(selectedConversationId, text)
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      setMessageText(text)
      showToast({ title: 'Failed to send', description: getApiErrorMessage(err), tone: 'error' })
    } finally {
      setIsSending(false)
    }
  }

  async function handleToggleAi(action: 'pause' | 'resume') {
    if (!selectedConversationId || isTogglingAi) return
    setIsTogglingAi(true)
    try {
      const updated =
        action === 'pause'
          ? await cognilabsaiService.pause(selectedConversationId)
          : await cognilabsaiService.resume(selectedConversationId)
      setConversations((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
      showToast({ title: action === 'pause' ? 'AI paused' : 'AI resumed', tone: 'success' })
    } catch (err) {
      showToast({ title: 'Error', description: getApiErrorMessage(err), tone: 'error' })
    } finally {
      setIsTogglingAi(false)
    }
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const showChat = selectedConversationId !== null
  const supportsAi = selectedConversation?.supports_ai ?? false
  const aiPaused = selectedConversation?.pause_reason === 'operator'

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0e1621] text-white font-sans">
      <div className="flex min-h-0 flex-1 gap-0 overflow-hidden">
        {/* Left panel – conversation list (Telegram Sidebar) */}
        <div
          className={cn(
            'flex w-full flex-col border-r border-black/20 md:w-80 lg:w-[420px] bg-[#17212b]',
            showChat && isMobile ? 'hidden' : 'flex',
          )}
        >
          {/* Header/Search - Telegram Style */}
          <div className="shrink-0 px-4 py-3 flex gap-3 items-center">
            <button className="text-[#7a8b9a] hover:text-[#3390ec] transition-colors p-1">
              {/* Telegram Hamburger Menu Icon */}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round" />
              </svg>
            </button>
            <div className="relative flex-1 group">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7a8b9a] group-focus-within:text-[#3390ec] transition-colors">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <Input
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 pl-10 pr-4 text-[15px] bg-[#242f3d] border-transparent focus:border-transparent focus:bg-[#0e1621] rounded-full transition-all text-white placeholder:text-[#7a8b9a] outline-none"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar-visible mt-1">
            {conversationsQuery.isLoading ? (
              <div className="p-4 space-y-4">
                 {[1,2,3,4,5].map(i => (
                   <div key={i} className="flex gap-3 animate-pulse px-2">
                     <div className="h-12 w-12 rounded-full bg-[#242f3d]" />
                     <div className="flex-1 space-y-2 py-1">
                       <div className="h-3 w-1/3 bg-[#242f3d] rounded" />
                       <div className="h-3 w-3/4 bg-[#242f3d] rounded" />
                     </div>
                   </div>
                 ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-[#7a8b9a]">
                 <p className="text-[15px] font-medium">No conversations</p>
              </div>
            ) : (
              <div className="px-2 space-y-0.5">
                {filteredConversations.map((conv) => (
                  <ConversationListItem
                    key={conv.id}
                    conv={conv}
                    isActive={selectedConversationId === conv.id}
                    onSelect={() => handleSelectConversation(conv.id)}
                  />
                ))}
              </div>
            )}
          </div>
          
          {/* Floating Action Button (New Chat) */}
          <div className="absolute bottom-6 right-6 lg:left-[350px]">
            <button
               onClick={() => setShowNewTelegramModal(true)}
               className="h-14 w-14 flex items-center justify-center rounded-full bg-[#3390ec] hover:bg-[#2b82d9] text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
             >
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                 <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5l13.732-13.732z" strokeLinecap="round" strokeLinejoin="round" />
               </svg>
             </button>
          </div>
        </div>

        {/* Right panel – chat (Telegram Chat Area) */}
        <div
          className={cn(
            'flex min-h-0 flex-1 flex-col bg-[#0e1621] relative',
            !showChat && isMobile ? 'hidden' : 'flex',
          )}
        >
          {/* Telegram Background Pattern */}
          <div className="absolute inset-0 opacity-[0.06] pointer-events-none z-0 bg-repeat bg-[length:400px_400px]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='360' height='360' viewBox='0 0 360 360' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 10l20 20M30 10l-20 20' stroke='%23fff' stroke-width='1' fill='none'/%3E%3Ccircle cx='100' cy='100' r='10' stroke='%23fff' stroke-width='1' fill='none'/%3E%3Crect x='200' y='50' width='30' height='20' rx='5' stroke='%23fff' stroke-width='1' fill='none'/%3E%3Cpath d='M300 200l20-10-10 20z' stroke='%23fff' stroke-width='1' fill='none'/%3E%3C/svg%3E")` }} />

          {!selectedConversation ? (
            <div className="flex flex-1 items-center justify-center relative z-10">
               <div className="text-center px-4 py-1.5 rounded-full bg-[#182533]/80 backdrop-blur-sm">
                 <p className="text-[14px] font-medium text-white/80">Select a chat to start messaging</p>
               </div>
            </div>
          ) : (
            <>
              {/* Chat header (Telegram Desktop Style) */}
              <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-2 bg-[#17212b] z-30 shadow-sm border-b border-black/20">
                <div className="flex items-center gap-3 min-w-0 cursor-pointer hover:opacity-80 transition-opacity">
                  {isMobile ? (
                    <button
                      type="button"
                      onClick={() => setSelectedConversationId(null)}
                      className="mr-1 rounded-full p-2 hover:bg-[#202b36] text-[#7a8b9a]"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-6 w-6">
                        <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  ) : null}
                  <div className="relative shrink-0">
                    <AvatarOrInitials avatarUrl={selectedConversation.client_avatar_url} name={getClientName(selectedConversation)} size="sm" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[16px] font-medium leading-tight">{getClientName(selectedConversation)}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[13px] text-[#7a8b9a] font-normal">last seen recently</p>
                      {selectedConversation.pause_reason && (
                        <>
                          <span className="h-1 w-1 rounded-full bg-[#7a8b9a]" />
                          <PauseReasonBadge reason={selectedConversation.pause_reason} />
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[#7a8b9a]">
                  {supportsAi && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleAi(aiPaused ? 'resume' : 'pause')}
                      disabled={isTogglingAi}
                      className={cn(
                        "h-9 px-3 rounded-md text-[13px] font-medium transition-colors", 
                        aiPaused ? "text-[#00ff00] hover:bg-[#00ff00]/10" : "text-amber-500 hover:bg-amber-500/10"
                      )}
                    >
                      {aiPaused ? 'Resume AI' : 'Pause AI'}
                    </Button>
                  )}
                  {/* Telegram Header Action Icons */}
                  <button className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-[#202b36] transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>
                  </button>
                  <button className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-[#202b36] transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </button>
                  <button className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-[#202b36] transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                      <circle cx="12" cy="12" r="1" />
                      <circle cx="12" cy="5" r="1" />
                      <circle cx="12" cy="19" r="1" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="relative flex-1 overflow-hidden z-10">
                 <div className="h-full overflow-y-auto px-4 py-4 custom-scrollbar-visible flex flex-col scroll-smooth">
                  <div className="flex-1" />
                  {isLoadingMessages ? (
                    <div className="py-20 flex flex-col items-center justify-center">
                       <div className="h-8 w-8 border-2 border-[#3390ec]/30 border-t-[#3390ec] rounded-full animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="py-10 flex flex-col items-center justify-center text-center">
                       <div className="px-4 py-1.5 rounded-full bg-[#182533]/80 backdrop-blur-sm">
                         <p className="text-[14px] font-medium text-white/80">No messages here yet...</p>
                       </div>
                    </div>
                  ) : (
                    <div className="space-y-[2px]">
                      {messages.reduce((acc: React.ReactNode[], msg, idx) => {
                        const prevMsg = messages[idx - 1]
                        const msgDate = new Date(msg.created_at).toLocaleDateString([], { month: 'long', day: 'numeric' })
                        const prevMsgDate = prevMsg ? new Date(prevMsg.created_at).toLocaleDateString([], { month: 'long', day: 'numeric' }) : null
                        
                        if (msgDate !== prevMsgDate) {
                          acc.push(<DateSeparator key={`date-${msg.created_at}`} date={msgDate} />)
                        }
                        
                        // Show tail if it's the last message in a block from the same sender
                        const nextMsg = messages[idx + 1]
                        const showTail = !nextMsg || nextMsg.sender_type !== msg.sender_type || (new Date(nextMsg.created_at).toLocaleDateString([], { month: 'long', day: 'numeric' }) !== msgDate)
                        
                        acc.push(<MessageBubble key={msg.id} msg={msg} showTail={showTail} />)
                        return acc
                      }, [])}
                    </div>
                  )}
                  <div ref={messagesEndRef} className="h-2" />
                </div>
              </div>

              {/* Composer (Telegram Input Area) */}
              <div className="shrink-0 bg-[#17212b] px-4 py-3 z-30">
                <div className="max-w-[800px] mx-auto flex items-end gap-2">
                  <div className="flex-1 relative flex items-end bg-[#242f3d] rounded-xl px-2 py-1 shadow-sm">
                    {/* Attachment Icon */}
                    <button type="button" className="h-10 w-10 shrink-0 flex items-center justify-center text-[#7a8b9a] hover:text-[#3390ec] transition-colors rounded-full">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[22px] w-[22px] -rotate-45">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    
                    <textarea
                      ref={textareaRef}
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          void handleSend()
                        }
                      }}
                      placeholder="Write a message..."
                      rows={1}
                      className="flex-1 resize-none bg-transparent border-0 focus:ring-0 text-[15px] leading-[1.45] py-2.5 px-2 max-h-[400px] overflow-y-auto custom-scrollbar-visible placeholder:text-[#7a8b9a] text-white outline-none"
                      style={{ fieldSizing: 'content' } as React.CSSProperties}
                    />
                    
                    {/* Emoji Icon */}
                    <button type="button" className="h-10 w-10 shrink-0 flex items-center justify-center text-[#7a8b9a] hover:text-[#3390ec] transition-colors rounded-full">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[22px] w-[22px]">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Send / Microphone Button */}
                  <button 
                    onClick={() => void handleSend()} 
                    disabled={isSending || !messageText.trim()}
                    className={cn(
                      "h-[46px] w-[46px] rounded-full flex items-center justify-center shrink-0 transition-colors",
                      messageText.trim() 
                        ? "bg-[#3390ec] text-white hover:bg-[#2b82d9]" 
                        : "bg-[#242f3d] text-[#7a8b9a] hover:text-white"
                    )}
                  >
                    {messageText.trim() ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 ml-1">
                        <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="23" />
                        <line x1="8" y1="23" x2="16" y2="23" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {showNewTelegramModal ? (
        <TelegramSearchModal
          onClose={() => setShowNewTelegramModal(false)}
          onStartChat={(id) => {
            handleSelectConversation(id)
            setShowNewTelegramModal(false)
          }}
        />
      ) : null}
    </div>
  )
}