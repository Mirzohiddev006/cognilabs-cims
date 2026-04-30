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

function formatConvTime(isoString: string | null): string {
  if (!isoString) return ''
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' })
  }
  return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' })
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

  const sizeClass = size === 'sm' ? 'h-9 w-9 text-[13px]' : size === 'lg' ? 'h-14 w-14 text-lg' : 'h-11 w-11 text-[15px]'

  if (resolved && !failed) {
    return (
      <img
        src={resolved}
        alt={name}
        onError={() => setFailed(true)}
        className={cn(sizeClass, 'shrink-0 rounded-full object-cover ring-1 ring-white/10')}
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

  return (
    <div
      className={cn(
        sizeClass,
        'shrink-0 rounded-full bg-[#1e293b] text-blue-400 font-medium flex items-center justify-center select-none ring-1 ring-white/5',
      )}
    >
      {initials}
    </div>
  )
}

function ChannelIcon({ channel }: { channel: string }) {
  if (channel === 'instagram') {
    return (
      <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.932z"/>
    </svg>
  )
}

function PauseReasonBadge({ reason }: { reason: string | null }) {
  if (!reason) return null
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
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
  const timeLabel = formatConvTime(conv.last_message_at)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group w-full rounded-xl px-3 py-2.5 text-left transition-all duration-150 relative flex items-center gap-3 border border-transparent',
        isActive
          ? 'bg-white/[0.06] border-white/[0.1] shadow-sm'
          : 'hover:bg-white/[0.03]',
      )}
    >
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-7 bg-blue-500 rounded-r-full" />
      )}

      <div className="relative shrink-0 ml-1">
        <AvatarOrInitials avatarUrl={conv.client_avatar_url} name={name} size="md" />
        <div className={cn(
          'absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-[#0d0d0f] flex items-center justify-center',
          conv.channel === 'instagram' ? 'bg-pink-500' : 'bg-[#2AABEE]'
        )}>
          <ChannelIcon channel={conv.channel} />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-1.5">
          <p className={cn(
            'truncate text-[13.5px] font-semibold leading-snug',
            isActive ? 'text-zinc-100' : 'text-zinc-200 group-hover:text-zinc-100'
          )}>
            {name}
          </p>
          {timeLabel && (
            <span className={cn(
              'shrink-0 text-[11px] font-medium',
              isActive ? 'text-zinc-400' : 'text-zinc-500'
            )}>
              {timeLabel}
            </span>
          )}
        </div>

        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className={cn(
            'truncate text-[12px] leading-snug',
            isActive ? 'text-zinc-400' : 'text-zinc-500'
          )}>
            {conv.last_message_preview || <span className="italic text-zinc-600">Xabar yo'q</span>}
          </p>
          {conv.pause_reason && !isActive && (
            <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-amber-400" />
          )}
        </div>
      </div>
    </button>
  )
}

function MessageBubble({ msg, isNextSameSender }: { msg: MessageItem; isNextSameSender: boolean }) {
  const isClient = msg.sender_type === 'client'
  const isAi = msg.sender_type === 'ai'
  const isSystem = msg.sender_type === 'system'

  if (isSystem) {
    return (
      <div className="flex justify-center my-3">
        <span className="rounded-full bg-white/5 border border-white/10 px-4 py-1.5 text-[11px] font-medium text-zinc-400">
          {msg.text}
        </span>
      </div>
    )
  }

  const timeStr = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className={cn(
      'flex w-full group relative',
      isClient ? 'justify-start' : 'justify-end',
      isNextSameSender ? 'mb-0.5' : 'mb-3'
    )}>
      <div
        className={cn(
          'relative max-w-[75%] sm:max-w-[62%] px-3.5 py-2 text-[13.5px] leading-relaxed shadow-sm',
          isClient
            ? 'bg-[#1c1c22] text-zinc-200 border border-white/[0.07] rounded-2xl rounded-bl-sm'
            : 'bg-blue-600 text-white rounded-2xl rounded-br-sm',
          isNextSameSender && (isClient ? 'rounded-bl-sm' : 'rounded-br-sm')
        )}
      >
        {(isAi || msg.sender_type === 'operator') && (
          <p className="mb-0.5 text-[10.5px] font-bold tracking-wide uppercase opacity-70">
            {isAi ? 'AI' : msg.operator_name_snapshot || 'Operator'}
          </p>
        )}

        <p className="whitespace-pre-wrap break-words">{msg.text}</p>

        <div className={cn(
          'flex items-center gap-1 mt-1 opacity-55',
          isClient ? 'justify-start' : 'justify-end'
        )}>
          <span className="text-[10px] font-medium">{timeStr}</span>
          {!isClient && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-2.5 w-2.5">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </div>
    </div>
  )
}

function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex justify-center my-4 sticky top-2 z-20">
      <span className="rounded-full bg-[#121214]/90 border border-white/10 px-4 py-1 text-[11px] font-semibold text-zinc-400 shadow-sm backdrop-blur-md">
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
      showToast({ title: 'Chat boshlandi', tone: 'success' })
      onClose()
    } catch (err) {
      showToast({ title: 'Xatolik', description: getApiErrorMessage(err), tone: 'error' })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[420px] rounded-2xl bg-[#111115] border border-white/[0.09] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/[0.07]">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-[#2AABEE]/10 border border-[#2AABEE]/20 flex items-center justify-center text-[#2AABEE]">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.932z"/>
              </svg>
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-white">Yangi Telegram Chat</h3>
              <p className="text-[11px] text-zinc-500">Username, @handle yoki link qidiring</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-4">
          <div className="relative">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <Input
              placeholder="dev949, @username, t.me/link..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSelectedPeer(null)
              }}
              className="h-10 pl-10 pr-4 bg-white/[0.04] border-white/[0.08] focus:border-[#2AABEE]/50 rounded-xl text-[13.5px] text-white placeholder:text-zinc-600"
              autoFocus
            />
          </div>
        </div>

        {/* Results */}
        <div className="px-2 pb-2">
          {isSearching ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="h-5 w-5 border-2 border-[#2AABEE]/30 border-t-[#2AABEE] rounded-full animate-spin" />
              <p className="mt-2 text-[12px] text-zinc-500">Qidirilmoqda...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="max-h-[260px] space-y-0.5 overflow-y-auto custom-scrollbar-visible">
              {results.map((item) => (
                <button
                  key={item.peer}
                  type="button"
                  onClick={() => setSelectedPeer(item)}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all',
                    selectedPeer?.peer === item.peer
                      ? 'bg-[#2AABEE]/10 border border-[#2AABEE]/25'
                      : 'border border-transparent hover:bg-white/[0.04]',
                  )}
                >
                  <AvatarOrInitials avatarUrl={item.avatar_url} name={item.full_name || item.username || item.peer} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold text-zinc-100">{item.full_name || item.username || item.peer}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.username && (
                        <p className="truncate text-[12px] text-zinc-500">@{item.username}</p>
                      )}
                      {item.existing_conversation_id && (
                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-1.5 py-0.5">
                          Mavjud chat
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedPeer?.peer === item.peer && (
                    <div className="shrink-0 h-4 w-4 rounded-full bg-[#2AABEE] flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-2.5 w-2.5 text-white">
                        <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : query.trim() && !isSearching ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center mb-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5 text-zinc-600">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                </svg>
              </div>
              <p className="text-[13px] font-medium text-zinc-400">Natija topilmadi</p>
              <p className="text-[11px] text-zinc-600 mt-0.5">Boshqa username yoki link kiriting</p>
            </div>
          ) : !query.trim() ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <p className="text-[12px] text-zinc-600">Username yoki Telegram link kiriting</p>
            </div>
          ) : null}
        </div>

        {/* Message input (new chat) */}
        {selectedPeer && !selectedPeer.existing_conversation_id ? (
          <div className="px-5 pb-4">
            <div className="relative rounded-xl border border-white/[0.09] bg-white/[0.04] focus-within:border-[#2AABEE]/40 transition-colors">
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={3}
                placeholder="Birinchi xabarni yozing..."
                className="w-full resize-none rounded-xl bg-transparent px-4 py-3 text-[13.5px] text-white focus:outline-none placeholder:text-zinc-600"
              />
            </div>
          </div>
        ) : null}

        {/* Actions */}
        <div className="flex gap-2 px-5 pb-5">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isSending}
            className="flex-1 h-10 rounded-xl font-medium text-zinc-400 hover:text-white hover:bg-white/5 text-[13px]"
          >
            Bekor qilish
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
              className="flex-[2] h-10 rounded-xl font-semibold bg-[#2AABEE] hover:bg-[#229ED9] text-white text-[13px]"
            >
              {selectedPeer.existing_conversation_id
                ? 'Chatni ochish'
                : isSending
                  ? 'Yuborilmoqda...'
                  : 'Boshlash'}
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
  const messagesContainerRef = useRef<HTMLDivElement>(null)
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
    const container = messagesContainerRef.current
    if (!container) return
    container.scrollTop = container.scrollHeight
  }, [messages])

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
          // ignore
        }
      }

      sock.onerror = () => {}
      sock.onclose = () => {
        setTimeout(connect, 5000)
      }
    }

    connect()

    return () => {
      wsRef.current?.close()
    }
  }, [wsKey, selectedConversationId])

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
      showToast({ title: 'Xatolik', description: getApiErrorMessage(err), tone: 'error' })
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
      showToast({ title: action === 'pause' ? "AI to'xtatildi" : 'AI faollashdi', tone: 'success' })
    } catch (err) {
      showToast({ title: 'Xatolik', description: getApiErrorMessage(err), tone: 'error' })
    } finally {
      setIsTogglingAi(false)
    }
  }

  async function handleRetryAi() {
    if (!selectedConversationId || isTogglingAi) return
    setIsTogglingAi(true)
    try {
      await cognilabsaiService.retryAi(selectedConversationId)
      showToast({ title: 'AI qayta ishga tushdi', tone: 'success' })
    } catch (err) {
      showToast({ title: 'Xatolik', description: getApiErrorMessage(err), tone: 'error' })
    } finally {
      setIsTogglingAi(false)
    }
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const showChat = selectedConversationId !== null
  const supportsAi = selectedConversation?.supports_ai ?? false
  const aiPaused = selectedConversation?.chat_mode !== 'instagram_ai' || Boolean(selectedConversation?.pause_reason)

  const tabItems: Array<{ key: ChannelTab; label: string }> = [
    { key: 'all', label: 'Barchasi' },
    { key: 'instagram', label: 'Instagram' },
    { key: 'telegram', label: 'Telegram' },
  ]

  return (
    <div
      className="flex min-h-0 flex-col bg-[#09090b] text-zinc-200 font-sans -mx-4 -mt-4 -mb-6 sm:-mx-6 lg:-mx-8"
      style={{ height: 'calc(100vh - 74px)' }}
    >
      <div className="flex min-h-0 flex-1 overflow-hidden w-full">

        {/* Chap panel – Chatlar ro'yxati */}
        <div
          className={cn(
            'flex w-full flex-col md:w-[340px] lg:w-[400px] xl:w-[440px] bg-[#111115] border-r border-white/[0.06] overflow-hidden shrink-0',
            showChat && isMobile ? 'hidden' : 'flex',
          )}
        >
          {/* Header */}
          <div className="shrink-0 px-4 pt-4 pb-3 border-b border-white/[0.06]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[15px] font-bold text-white tracking-tight">Xabarlar</h2>
              <button
                onClick={() => setShowNewTelegramModal(true)}
                className="h-8 w-8 flex items-center justify-center rounded-xl bg-[#2AABEE]/10 text-[#2AABEE] hover:bg-[#2AABEE] hover:text-white transition-colors border border-[#2AABEE]/20"
                title="Yangi Telegram chat"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-1 mb-3">
              {tabItems.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'flex-1 py-1.5 rounded-lg text-[12px] font-semibold transition-all',
                    activeTab === tab.key
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <Input
                placeholder="Qidiruv..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-8 pr-3 text-[13px] bg-white/[0.04] border-white/[0.07] focus:border-blue-500/40 rounded-xl text-zinc-300 placeholder:text-zinc-600"
              />
            </div>
          </div>

          {/* Chat ro'yxati */}
          <div className="flex-1 overflow-y-auto custom-scrollbar-visible p-2">
            {conversationsQuery.isLoading ? (
              <div className="space-y-1">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="flex gap-3 animate-pulse px-3 py-2.5 rounded-xl">
                    <div className="h-11 w-11 rounded-full bg-white/[0.05] shrink-0" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-2.5 w-2/5 bg-white/[0.05] rounded" />
                      <div className="h-2.5 w-3/4 bg-white/[0.05] rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-10 w-10 mb-3 opacity-40">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p className="text-[13px] font-medium">Chatlar topilmadi</p>
              </div>
            ) : (
              <div className="space-y-0.5">
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
        </div>

        {/* O'ng panel – Chat */}
        <div
          className={cn(
            'flex min-h-0 flex-1 flex-col bg-[#0d0d10] overflow-hidden relative',
            !showChat && isMobile ? 'hidden' : 'flex',
          )}
        >
          {!selectedConversation ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center px-6">
              <div className="h-16 w-16 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mb-4">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-8 w-8 text-zinc-600">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="text-[15px] font-semibold text-zinc-300 mb-1">Chat tanlang</h3>
              <p className="text-[13px] text-zinc-600 max-w-xs">Chap tomondagi ro'yxatdan suhbatni tanlang</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="flex shrink-0 items-center justify-between gap-3 px-5 py-3 bg-[#111115]/80 backdrop-blur-xl z-30 border-b border-white/[0.06]">
                <div className="flex items-center gap-3 min-w-0">
                  {isMobile ? (
                    <button
                      type="button"
                      onClick={() => setSelectedConversationId(null)}
                      className="rounded-lg p-1.5 hover:bg-white/5 text-zinc-400"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5">
                        <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  ) : null}
                  <div className="relative shrink-0">
                    <AvatarOrInitials avatarUrl={selectedConversation.client_avatar_url} name={getClientName(selectedConversation)} size="sm" />
                    <div className={cn(
                      'absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-[#111115] flex items-center justify-center',
                      selectedConversation.channel === 'instagram' ? 'bg-pink-500' : 'bg-[#2AABEE]'
                    )}>
                      <ChannelIcon channel={selectedConversation.channel} />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-[14px] font-bold text-zinc-100">{getClientName(selectedConversation)}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[11px] text-zinc-500 font-medium">
                        {selectedConversation.channel === 'telegram' ? 'Telegram' : 'Instagram'}
                      </span>
                      {selectedConversation.pause_reason && (
                        <>
                          <span className="h-1 w-1 rounded-full bg-zinc-700 shrink-0" />
                          <PauseReasonBadge reason={selectedConversation.pause_reason} />
                        </>
                      )}
                      {selectedConversation.last_operator_name && (
                        <>
                          <span className="h-1 w-1 rounded-full bg-zinc-700 shrink-0" />
                          <span className="text-[11px] text-zinc-500">{selectedConversation.last_operator_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {supportsAi && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleAi(aiPaused ? 'resume' : 'pause')}
                      disabled={isTogglingAi}
                      className={cn(
                        "h-8 px-3 rounded-lg text-[12px] font-semibold transition-colors border",
                        aiPaused
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500 hover:text-white"
                          : "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500 hover:text-white"
                      )}
                    >
                      {isTogglingAi ? '...' : aiPaused ? 'AI yoqish' : "AI to'xtatish"}
                    </Button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 custom-scrollbar-visible"
              >
                <div className="flex flex-col min-h-full">
                  <div className="flex-1" />
                  {isLoadingMessages ? (
                    <div className="py-20 flex flex-col items-center justify-center">
                      <div className="h-5 w-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="py-10 flex flex-col items-center justify-center text-center">
                      <div className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.07]">
                        <p className="text-[13px] font-medium text-zinc-500">Xabarlar ko'rsatiladi</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {messages.reduce((acc: React.ReactNode[], msg, idx) => {
                        const prevMsg = messages[idx - 1]
                        const nextMsg = messages[idx + 1]
                        const msgDate = new Date(msg.created_at).toLocaleDateString([], { month: 'long', day: 'numeric' })
                        const prevMsgDate = prevMsg ? new Date(prevMsg.created_at).toLocaleDateString([], { month: 'long', day: 'numeric' }) : null

                        if (msgDate !== prevMsgDate) {
                          acc.push(<DateSeparator key={`date-${msg.created_at}`} date={msgDate} />)
                        }

                        const isNextSameSender = Boolean(
                          nextMsg &&
                          nextMsg.sender_type === msg.sender_type &&
                          new Date(nextMsg.created_at).toLocaleDateString([], { month: 'long', day: 'numeric' }) === msgDate
                        )

                        acc.push(<MessageBubble key={msg.id} msg={msg} isNextSameSender={isNextSameSender} />)
                        return acc
                      }, [])}
                    </div>
                  )}
                </div>
              </div>

              {/* AI Controls bar (Instagram only) */}
              {supportsAi && (
                <div className="shrink-0 flex items-center gap-2 px-4 py-2 bg-[#111115]/60 border-t border-white/[0.05]">
                  <span className="text-[11px] text-zinc-600 font-medium uppercase tracking-wider">AI:</span>
                  <button
                    type="button"
                    onClick={() => handleToggleAi(aiPaused ? 'resume' : 'pause')}
                    disabled={isTogglingAi}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold border transition-colors',
                      aiPaused
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                    )}
                  >
                    {aiPaused ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3">
                        <path d="M5 3l14 9-14 9V3z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3">
                        <path d="M10 4H6v16h4V4zM18 4h-4v16h4V4z" strokeLinecap="round" />
                      </svg>
                    )}
                    {aiPaused ? 'AI yoqish' : "AI to'xtatish"}
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleRetryAi()}
                    disabled={isTogglingAi}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold border border-blue-500/20 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3">
                      <path d="M1 4v6h6M23 20v-6h-6" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Qayta urinish
                  </button>
                </div>
              )}

              {/* Composer */}
              <div className="shrink-0 bg-[#111115] px-4 py-3 z-30 border-t border-white/[0.06]">
                <div className="flex items-end gap-2.5 bg-white/[0.04] rounded-2xl px-3 py-2 border border-white/[0.08] focus-within:border-blue-500/40 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
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
                    placeholder="Xabar yozing..."
                    rows={1}
                    className="flex-1 resize-none bg-transparent border-0 focus:ring-0 text-[13.5px] leading-relaxed py-1.5 max-h-[200px] overflow-y-auto custom-scrollbar-none placeholder:text-zinc-600 text-zinc-100 outline-none"
                    style={{ fieldSizing: 'content' } as React.CSSProperties}
                  />
                  <button
                    onClick={() => void handleSend()}
                    disabled={isSending || !messageText.trim()}
                    className={cn(
                      "h-8 w-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 mb-0.5",
                      messageText.trim()
                        ? "bg-blue-600 text-white hover:bg-blue-500 shadow-sm"
                        : "bg-white/5 text-zinc-600 cursor-not-allowed"
                    )}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn("h-4 w-4", messageText.trim() && "ml-0.5")}>
                      {messageText.trim() ? (
                        <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
                      ) : (
                        <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                      )}
                    </svg>
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
