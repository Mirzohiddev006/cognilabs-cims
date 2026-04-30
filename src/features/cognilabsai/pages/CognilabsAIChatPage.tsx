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

  const sizeClass = size === 'sm' ? 'h-8 w-8 text-xs' : size === 'lg' ? 'h-12 w-12 text-sm' : 'h-10 w-10 text-xs'

  if (resolved && !failed) {
    return (
      <img
        src={resolved}
        alt={name}
        onError={() => setFailed(true)}
        className={cn(sizeClass, 'shrink-0 rounded-full object-cover border border-[var(--border)]')}
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
        'shrink-0 rounded-full border border-[var(--border)] bg-[linear-gradient(135deg,#3b82f6,#2563eb)] text-white font-semibold grid place-items-center select-none',
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
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border transition-colors',
        isInstagram
          ? 'border-pink-500/30 bg-pink-500/10 text-pink-500'
          : 'border-[#3390ec]/30 bg-[#3390ec]/10 text-[#3390ec]',
      )}
    >
      {isInstagram ? (
        <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 fill-current" aria-hidden>
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 fill-current" aria-hidden>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.382.713 4.6 1.938 6.458L.083 23.745a.5.5 0 0 0 .632.632l5.287-1.855A11.946 11.946 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm5.894 16.419c-.246.694-1.452 1.329-2.01 1.412-.51.074-1.157.106-1.866-.116-.43-.135-.982-.315-1.685-.617-2.965-1.273-4.9-4.256-5.048-4.454-.147-.2-1.21-1.608-1.21-3.068 0-1.46.768-2.175 1.04-2.472.27-.297.59-.372.787-.372s.394.004.566.01c.18.009.424-.07.664.505.246.59.836 2.042.908 2.19.073.147.122.32.024.516-.098.196-.147.317-.294.49-.147.172-.309.384-.44.515-.147.147-.3.308-.13.605.172.297.764 1.26 1.64 2.04 1.127 1.003 2.077 1.314 2.374 1.46.297.147.47.123.64-.074.172-.196.736-.86 1.03-.117.295.246 1.09.516 1.29.73.25.254.3.4.3.8 0 .392.147 1.032-.146 1.73z" />
        </svg>
      )}
      {chatMode === 'instagram_ai' ? 'AI' : 'OP'}
    </span>
  )
}

function PauseReasonBadge({ reason }: { reason: string | null }) {
  if (!reason) return null
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-500 uppercase tracking-tight">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
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
        'group w-full rounded-xl px-3 py-2.5 text-left transition-all duration-150 relative overflow-hidden',
        isActive
          ? 'bg-[#3390ec] text-white shadow-md'
          : 'hover:bg-[var(--accent-soft)]',
      )}
    >
      <div className="flex items-center gap-3 relative z-10">
        <div className="relative shrink-0">
          <AvatarOrInitials avatarUrl={conv.client_avatar_url} name={name} size="md" />
          {isOnline && (
            <div className={cn(
              "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 bg-green-500 shadow-sm",
              isActive ? "border-[#3390ec]" : "border-[var(--background)]"
            )} />
          )}
        </div>
        
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className={cn(
              'truncate text-[15px] font-bold leading-tight',
              isActive ? 'text-white' : 'text-[var(--foreground)]'
            )}>
              {name}
            </p>
            {conv.last_message_at ? (
              <span className={cn(
                'shrink-0 text-[11px] font-medium',
                isActive ? 'text-white/80' : 'text-[var(--muted)]'
              )}>
                {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            ) : null}
          </div>
          
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              {conv.last_message_preview ? (
                <p className={cn(
                  'truncate text-[13.5px] leading-snug',
                  isActive ? 'text-white/90' : 'text-[var(--muted-strong)]'
                )}>
                  {conv.last_message_preview}
                </p>
              ) : (
                <p className={cn(
                  'italic text-[12px]',
                  isActive ? 'text-white/60' : 'text-[var(--muted)]'
                )}>No messages yet</p>
              )}
            </div>
            
            <div className="shrink-0 flex items-center gap-1.5">
              {!isActive && <ChannelBadge channel={conv.channel} chatMode={conv.chat_mode} />}
            </div>
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
      <div className="flex justify-center my-3">
        <span className="rounded-full bg-black/20 backdrop-blur-md px-4 py-1 text-[11px] font-bold text-white shadow-sm border border-white/10 uppercase tracking-widest ring-1 ring-black/5">
          {msg.text}
        </span>
      </div>
    )
  }

  return (
    <div className={cn(
      'flex w-full group relative mb-0.5 animate-page-enter', 
      isClient ? 'justify-start' : 'justify-end'
    )}>
      <div
        className={cn(
          'relative max-w-[85%] sm:max-w-[72%] px-3.5 py-2 text-[14.5px] shadow-[0_1px_1.5px_rgba(0,0,0,0.12)] transition-transform active:scale-[0.99]',
          isClient
            ? 'rounded-[18px] rounded-tl-sm border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground)]'
            : isAi
              ? 'rounded-[18px] rounded-tr-sm border border-violet-500/20 bg-violet-500/10 text-violet-100'
              : 'rounded-[18px] rounded-tr-sm bg-[#effdde] dark:bg-[#2b5278] text-slate-900 dark:text-white border border-transparent shadow-sm',
          !showTail && (isClient ? 'rounded-tl-[18px]' : 'rounded-tr-[18px]')
        )}
      >
        {(isAi || msg.sender_type === 'operator') && (
          <p className={cn(
            'mb-0.5 text-[11px] font-bold uppercase tracking-wider', 
            isAi ? 'text-violet-400' : 'text-blue-600 dark:text-[#64b5f6]'
          )}>
            {isAi ? 'AI' : msg.operator_name_snapshot || 'Operator'}
          </p>
        )}
        
        <p className="whitespace-pre-wrap break-words leading-[1.45] selection:bg-blue-500/30">
          {msg.text}
        </p>
        
        <div className="mt-1 flex items-center justify-end gap-1.5 opacity-60">
          <span className="text-[10px] font-bold uppercase tracking-tight">
            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {!isClient && (
            <svg viewBox="0 0 24 24" className={cn("h-3.5 w-3.5 fill-current", isAi ? "text-violet-400" : "text-[#40a7e3]")}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-5-5 1.41-1.41L11 14.17l7.59-7.59L20 8l-9 9z" />
            </svg>
          )}
        </div>
        
        {showTail && (
          <div className={cn(
            'absolute top-0 w-3 h-3 overflow-hidden',
            isClient ? '-left-2' : '-right-2'
          )}>
            <div className={cn(
              'absolute w-3 h-3 rotate-45',
              isClient 
                ? '-top-1.5 left-1.5 bg-[var(--surface-elevated)] border-l border-t border-[var(--border)]' 
                : '-top-1.5 -left-1.5 bg-[#effdde] dark:bg-[#2b5278]'
            )} />
          </div>
        )}
      </div>
    </div>
  )
}


function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex justify-center my-6 sticky top-2 z-20">
      <span className="rounded-full bg-black/30 backdrop-blur-lg px-4 py-1.5 text-[11px] font-bold text-white shadow-lg border border-white/10 uppercase tracking-widest ring-1 ring-black/10">
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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-[28px] border border-[var(--border)] bg-[var(--surface-elevated)] p-6 shadow-2xl animate-page-enter">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold tracking-tight">New Telegram Chat</h3>
          <button type="button" onClick={onClose} className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-[var(--accent-soft)] text-[var(--muted)] transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="relative group">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="absolute left-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[var(--muted)] group-focus-within:text-[var(--blue-text)] transition-colors">
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
            className="h-12 pl-10 pr-4 bg-[var(--background)] border-[var(--border)] focus:border-[var(--blue-border)] rounded-2xl transition-all text-base"
            autoFocus
          />
        </div>

        {isSearching ? (
          <div className="mt-6 flex flex-col items-center justify-center py-8">
             <div className="h-8 w-8 border-3 border-[var(--blue-text)]/30 border-t-[var(--blue-text)] rounded-full animate-spin" />
             <p className="mt-3 text-sm font-medium text-[var(--muted)]">Searching Telegram...</p>
          </div>
        ) : results.length > 0 ? (
          <div className="mt-4 max-h-[320px] space-y-1 overflow-y-auto custom-scrollbar-visible pr-1">
            {results.map((item) => (
              <button
                key={item.peer}
                type="button"
                onClick={() => setSelectedPeer(item)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all active:scale-[0.98]',
                  selectedPeer?.peer === item.peer
                    ? 'border-[var(--blue-border)] bg-[var(--blue-dim)]'
                    : 'border-transparent hover:bg-[var(--accent-soft)]',
                )}
              >
                <AvatarOrInitials avatarUrl={item.avatar_url} name={item.full_name || item.username || item.peer} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold">{item.full_name || item.username || item.peer}</p>
                  {item.username ? <p className="truncate text-xs font-medium text-[var(--blue-text)]">@{item.username}</p> : null}
                </div>
                {item.existing_conversation_id ? (
                  <span className="shrink-0 rounded-full bg-[var(--blue-text)] px-3 py-1 text-[10px] font-bold text-white uppercase tracking-wider">Open</span>
                ) : (
                  <span className="shrink-0 text-[var(--muted)]">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5">
                      <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : query.trim() && !isSearching ? (
          <div className="mt-6 flex flex-col items-center justify-center py-8 text-center">
             <div className="h-12 w-12 rounded-full bg-[var(--accent-soft)] flex items-center justify-center mb-3">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6 text-[var(--muted)]">
                 <circle cx="11" cy="11" r="8" />
                 <path d="m21 21-4.3-4.3" />
               </svg>
             </div>
             <p className="text-sm font-bold">No results found</p>
             <p className="text-xs text-[var(--muted)] mt-1">Try a different username or ID</p>
          </div>
        ) : null}

        {selectedPeer && !selectedPeer.existing_conversation_id ? (
          <div className="mt-6 animate-page-enter">
            <p className="mb-2 text-xs font-bold text-[var(--muted)] uppercase tracking-widest">First message to {selectedPeer.full_name || selectedPeer.username}:</p>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={3}
              placeholder="Type your first message..."
              className="w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-[14.5px] focus:outline-none focus:ring-2 focus:ring-[var(--blue-text)]/30 transition-all placeholder:text-[var(--muted)]/60"
            />
          </div>
        ) : null}

        <div className="mt-8 flex gap-3">
          <Button 
            variant="secondary" 
            onClick={onClose} 
            disabled={isSending}
            className="flex-1 h-12 rounded-2xl font-bold"
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
              className="flex-[2] h-12 rounded-2xl font-bold bg-[var(--blue-text)] text-white shadow-lg shadow-[var(--blue-glow)]"
            >
              {selectedPeer.existing_conversation_id ? 'Open Conversation' : isSending ? 'Starting...' : 'Start Chatting'}
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

  async function handleRetryAi() {
    if (!selectedConversationId) return
    try {
      await cognilabsaiService.retryAi(selectedConversationId)
      showToast({ title: 'AI retry triggered', tone: 'success' })
    } catch (err) {
      showToast({ title: 'Error', description: getApiErrorMessage(err), tone: 'error' })
    }
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const showChat = selectedConversationId !== null
  const supportsAi = selectedConversation?.supports_ai ?? false
  const aiPaused = selectedConversation?.pause_reason === 'operator'

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0e1621] text-white">
      <div className="flex min-h-0 flex-1 gap-0 overflow-hidden">
        {/* Left panel – conversation list */}
        <div
          className={cn(
            'flex w-full flex-col border-r border-zinc-800 md:w-80 lg:w-[380px] bg-[#17212b]',
            showChat && isMobile ? 'hidden' : 'flex',
          )}
        >
          {/* Header/Search */}
          <div className="shrink-0 px-4 py-3 space-y-3">
            <div className="flex items-center justify-between">
               <h1 className="text-xl font-bold tracking-tight">Chats</h1>
               <button
                 onClick={() => setShowNewTelegramModal(true)}
                 className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-zinc-700/50 text-[#3390ec] transition-colors"
               >
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5.5 w-5.5">
                   <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                 </svg>
               </button>
            </div>
            <div className="relative group">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-[#3390ec] transition-colors">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 pl-10 pr-4 text-sm bg-[#242f3d] border-transparent focus:border-[#3390ec] rounded-[20px] transition-all text-white placeholder:text-zinc-500"
              />
            </div>
          </div>

          {/* Channel tabs */}
          <div className="flex shrink-0 gap-1 px-4 pb-2 border-b border-zinc-800/50">
            {(['all', 'instagram', 'telegram'] as ChannelTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'flex-1 rounded-lg px-2 py-1.5 text-[12px] font-bold capitalize transition-all relative',
                  activeTab === tab
                    ? 'text-[#3390ec]'
                    : 'text-zinc-400 hover:text-zinc-200',
                )}
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-1 right-1 h-0.5 bg-[#3390ec] rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar-visible">
            {conversationsQuery.isLoading ? (
              <div className="p-4 space-y-4">
                 {[1,2,3,4,5].map(i => (
                   <div key={i} className="flex gap-3 animate-pulse">
                     <div className="h-12 w-12 rounded-full bg-zinc-800" />
                     <div className="flex-1 space-y-2 py-1">
                       <div className="h-3 w-1/3 bg-zinc-800 rounded" />
                       <div className="h-3 w-3/4 bg-zinc-800 rounded" />
                     </div>
                   </div>
                 ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-12 w-12 mb-2 opacity-20">
                   <path d="M8 12h8m-8 4h6m2 5H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2z" />
                 </svg>
                 <p className="text-sm font-medium">No conversations</p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <ConversationListItem
                  key={conv.id}
                  conv={conv}
                  isActive={selectedConversationId === conv.id}
                  onSelect={() => handleSelectConversation(conv.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right panel – chat */}
        <div
          className={cn(
            'flex min-h-0 flex-1 flex-col bg-[#0e1621]',
            !showChat && isMobile ? 'hidden' : 'flex',
          )}
        >
          {!selectedConversation ? (
            <div className="flex flex-1 items-center justify-center relative">
               {/* Telegram Background Pattern */}
               <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0 bg-repeat bg-[length:400px_400px]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='360' height='360' viewBox='0 0 360 360' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 10l20 20M30 10l-20 20' stroke='%23fff' stroke-width='1' fill='none'/%3E%3Ccircle cx='100' cy='100' r='10' stroke='%23fff' stroke-width='1' fill='none'/%3E%3Crect x='200' y='50' width='30' height='20' rx='5' stroke='%23fff' stroke-width='1' fill='none'/%3E%3Cpath d='M300 200l20-10-10 20z' stroke='%23fff' stroke-width='1' fill='none'/%3E%3C/svg%3E")` }} />
               <div className="text-center relative z-10 px-6 py-4 rounded-full bg-black/20 backdrop-blur-md border border-white/5">
                 <p className="text-sm font-medium text-zinc-400">Select a chat to start messaging</p>
               </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800/50 px-4 py-2 bg-[#17212b]/95 backdrop-blur-md z-30">
                <div className="flex items-center gap-3 min-w-0">
                  {isMobile ? (
                    <button
                      type="button"
                      onClick={() => setSelectedConversationId(null)}
                      className="mr-1 rounded-full p-2 hover:bg-zinc-800 text-zinc-400"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5">
                        <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  ) : null}
                  <div className="relative shrink-0">
                    <AvatarOrInitials avatarUrl={selectedConversation.client_avatar_url} name={getClientName(selectedConversation)} size="sm" />
                    <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#17212b] bg-green-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[15.5px] font-bold leading-tight">{getClientName(selectedConversation)}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-[12px] text-[#3390ec] font-medium">online</p>
                      {selectedConversation.pause_reason && (
                        <>
                          <span className="h-1 w-1 rounded-full bg-zinc-600" />
                          <PauseReasonBadge reason={selectedConversation.pause_reason} />
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {supportsAi && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleAi(aiPaused ? 'resume' : 'pause')}
                      disabled={isTogglingAi}
                      className={cn(
                        "h-9 px-3 rounded-full text-[11px] font-bold uppercase tracking-wider transition-colors", 
                        aiPaused ? "text-green-400 hover:bg-green-400/10" : "text-amber-400 hover:bg-amber-400/10"
                      )}
                    >
                      {aiPaused ? 'Resume AI' : 'Pause AI'}
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-10 w-10 rounded-full p-0 text-zinc-400 hover:bg-zinc-800">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-6 w-6">
                      <circle cx="12" cy="12" r="1" />
                      <circle cx="12" cy="5" r="1" />
                      <circle cx="12" cy="19" r="1" />
                    </svg>
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div className="relative flex-1 overflow-hidden">
                 {/* Telegram Background Pattern */}
                 <div className="absolute inset-0 opacity-[0.04] pointer-events-none z-0 bg-repeat bg-[length:400px_400px]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='360' height='360' viewBox='0 0 360 360' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 10l20 20M30 10l-20 20' stroke='%23fff' stroke-width='1' fill='none'/%3E%3Ccircle cx='100' cy='100' r='10' stroke='%23fff' stroke-width='1' fill='none'/%3E%3Crect x='200' y='50' width='30' height='20' rx='5' stroke='%23fff' stroke-width='1' fill='none'/%3E%3Cpath d='M300 200l20-10-10 20z' stroke='%23fff' stroke-width='1' fill='none'/%3E%3C/svg%3E")` }} />

                 <div className="h-full overflow-y-auto px-4 py-4 custom-scrollbar-visible relative z-10 flex flex-col scroll-smooth">
                  <div className="flex-1" />
                  {isLoadingMessages ? (
                    <div className="py-20 flex flex-col items-center justify-center">
                       <div className="h-8 w-8 border-3 border-[#3390ec]/30 border-t-[#3390ec] rounded-full animate-spin" />
                       <p className="mt-4 text-sm font-medium text-zinc-400">Loading messages...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center">
                       <div className="h-16 w-16 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4">
                         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-8 w-8 text-zinc-500">
                           <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                         </svg>
                       </div>
                       <p className="text-base font-bold text-zinc-300">No messages yet</p>
                       <p className="text-sm text-zinc-500 mt-1">Send a message to start the conversation</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {messages.reduce((acc: React.ReactNode[], msg, idx) => {
                        const prevMsg = messages[idx - 1]
                        const msgDate = new Date(msg.created_at).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
                        const prevMsgDate = prevMsg ? new Date(prevMsg.created_at).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }) : null
                        
                        if (msgDate !== prevMsgDate) {
                          acc.push(<DateSeparator key={`date-${msg.created_at}`} date={msgDate} />)
                        }
                        
                        const showTail = !prevMsg || prevMsg.sender_type !== msg.sender_type || (msgDate !== prevMsgDate)
                        
                        acc.push(<MessageBubble key={msg.id} msg={msg} showTail={showTail} />)
                        return acc
                      }, [])}
                    </div>
                  )}
                  <div ref={messagesEndRef} className="h-2" />
                </div>
              </div>

              {/* Composer */}
              <div className="shrink-0 bg-[#17212b] px-4 py-3 border-t border-zinc-800/50">
                <div className="max-w-[800px] mx-auto flex items-end gap-2">
                  <div className="flex-1 relative flex items-end bg-[#242f3d] rounded-[24px] border border-transparent focus-within:border-[#3390ec]/30 transition-all px-2 py-1 shadow-lg">
                    <button type="button" className="h-10 w-10 shrink-0 flex items-center justify-center text-zinc-500 hover:text-[#3390ec] transition-colors rounded-full">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5.5 w-5.5">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
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
                      className="flex-1 resize-none bg-transparent border-0 focus:ring-0 text-[15px] leading-[1.45] py-2.5 px-2 max-h-[400px] overflow-y-auto custom-scrollbar-visible placeholder:text-zinc-500 text-white"
                      style={{ fieldSizing: 'content' } as React.CSSProperties}
                    />
                    
                    <button type="button" className="h-10 w-10 shrink-0 flex items-center justify-center text-zinc-500 hover:text-yellow-500 transition-colors rounded-full">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-6 w-6">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                  
                  <button 
                    onClick={() => void handleSend()} 
                    disabled={isSending || !messageText.trim()}
                    className={cn(
                      "h-11 w-11 rounded-full flex items-center justify-center shrink-0 shadow-lg transition-all active:scale-90",
                      messageText.trim() 
                        ? "bg-[#3390ec] text-white hover:bg-[#2b82d9]" 
                        : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                    )}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={cn("h-5.5 w-5.5 transition-transform", messageText.trim() ? "translate-x-0.5" : "")}>
                      <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
                <p className="mt-2 text-center text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                   CognilabsAI • {selectedConversation.channel} • {selectedConversation.chat_mode}
                </p>
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
