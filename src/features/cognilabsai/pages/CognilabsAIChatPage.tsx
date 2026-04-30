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
import { PageHeader } from '../../../shared/ui/page-header'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import {
  LoadingStateBlock,
  ErrorStateBlock,
  EmptyStateBlock,
} from '../../../shared/ui/state-block'
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
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide border',
        isInstagram
          ? 'border-pink-400/30 bg-pink-500/10 text-pink-400'
          : 'border-blue-400/30 bg-blue-500/10 text-blue-400',
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
    <span className="inline-flex items-center gap-1 rounded-full border border-yellow-400/30 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-medium text-yellow-400">
      <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
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
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full rounded-xl border px-3 py-3 text-left transition-all duration-150',
        isActive
          ? 'border-blue-500/30 bg-blue-600/10'
          : 'border-transparent hover:border-[var(--border)] hover:bg-[var(--accent-soft)]',
      )}
    >
      <div className="flex items-start gap-3">
        <AvatarOrInitials avatarUrl={conv.client_avatar_url} name={name} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className={cn('truncate text-sm font-semibold', isActive ? 'text-blue-300' : 'text-[var(--foreground)]')}>
              {name}
            </p>
            {conv.last_message_at ? (
              <span className="shrink-0 text-[10px] text-[var(--muted)]">
                {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            <ChannelBadge channel={conv.channel} chatMode={conv.chat_mode} />
            {conv.pause_reason ? <PauseReasonBadge reason={conv.pause_reason} /> : null}
            {conv.last_operator_name ? (
              <span className="text-[10px] text-[var(--muted)] truncate">
                {conv.last_operator_name}
              </span>
            ) : null}
          </div>
          {conv.last_message_preview ? (
            <p className="mt-1 truncate text-xs text-[var(--muted)]">{conv.last_message_preview}</p>
          ) : null}
        </div>
      </div>
    </button>
  )
}

function MessageBubble({ msg }: { msg: MessageItem }) {
  const isClient = msg.sender_type === 'client'
  const isAi = msg.sender_type === 'ai'
  const isSystem = msg.sender_type === 'system'

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <span className="rounded-full border border-[var(--border)] bg-[var(--muted-surface)] px-3 py-1 text-xs text-[var(--muted)]">
          {msg.text}
        </span>
      </div>
    )
  }

  return (
    <div className={cn('flex gap-2', isClient ? 'justify-start' : 'justify-end')}>
      <div
        className={cn(
          'max-w-[72%] rounded-2xl px-4 py-2.5 text-sm shadow-sm',
          isClient
            ? 'rounded-tl-sm border border-[var(--border)] bg-[var(--surface-elevated)]'
            : isAi
              ? 'rounded-tr-sm border border-purple-500/20 bg-purple-600/10 text-purple-100'
              : 'rounded-tr-sm border border-blue-500/20 bg-blue-600/10 text-blue-100',
        )}
      >
        {(isAi || msg.sender_type === 'operator') && (
          <p className={cn('mb-1 text-[10px] font-semibold uppercase tracking-wider', isAi ? 'text-purple-400' : 'text-blue-400')}>
            {isAi ? 'AI' : msg.operator_name_snapshot || 'Operator'}
          </p>
        )}
        <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p>
        <p className={cn('mt-1 text-[10px]', isClient ? 'text-[var(--muted)]' : 'text-current opacity-60')}>
          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
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
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold">New Telegram Chat</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-[var(--accent-soft)] text-[var(--muted)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <Input
          placeholder="Username, @username, t.me/link, or ID..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSelectedPeer(null)
          }}
          autoFocus
        />

        {isSearching ? (
          <p className="mt-3 text-sm text-[var(--muted)]">Searching...</p>
        ) : results.length > 0 ? (
          <div className="mt-3 max-h-52 space-y-1 overflow-y-auto">
            {results.map((item) => (
              <button
                key={item.peer}
                type="button"
                onClick={() => setSelectedPeer(item)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition-all',
                  selectedPeer?.peer === item.peer
                    ? 'border-blue-500/30 bg-blue-600/10'
                    : 'border-transparent hover:border-[var(--border)] hover:bg-[var(--accent-soft)]',
                )}
              >
                <AvatarOrInitials avatarUrl={item.avatar_url} name={item.full_name || item.username || item.peer} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.full_name || item.username || item.peer}</p>
                  {item.username ? <p className="truncate text-xs text-[var(--muted)]">@{item.username}</p> : null}
                </div>
                {item.existing_conversation_id ? (
                  <span className="ml-auto shrink-0 text-xs text-blue-400 font-medium">Open</span>
                ) : null}
              </button>
            ))}
          </div>
        ) : query.trim() && !isSearching ? (
          <p className="mt-3 text-sm text-[var(--muted)]">No results found.</p>
        ) : null}

        {selectedPeer && !selectedPeer.existing_conversation_id ? (
          <div className="mt-4">
            <p className="mb-2 text-xs text-[var(--muted)]">First message to {selectedPeer.full_name || selectedPeer.username}:</p>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={3}
              placeholder="Type your first message..."
              className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
        ) : null}

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isSending}>Cancel</Button>
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
            >
              {selectedPeer.existing_conversation_id ? 'Open Chat' : isSending ? 'Sending...' : 'Start Chat'}
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
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="CognilabsAI Chat"
        description="Instagram & Telegram conversations"
        actions={
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowNewTelegramModal(true)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1.5 h-4 w-4">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            New Telegram Chat
          </Button>
        }
      />

      <div className="flex min-h-0 flex-1 gap-0 overflow-hidden">
        {/* Left panel – conversation list */}
        <div
          className={cn(
            'flex w-full flex-col border-r border-[var(--border)] md:w-80 lg:w-96',
            showChat && isMobile ? 'hidden' : 'flex',
          )}
        >
          {/* Channel tabs */}
          <div className="flex shrink-0 gap-1 border-b border-[var(--border)] px-3 py-2">
            {(['all', 'instagram', 'telegram'] as ChannelTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all',
                  activeTab === tab
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20'
                    : 'text-[var(--muted)] hover:bg-[var(--accent-soft)] border border-transparent',
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="shrink-0 border-b border-[var(--border)] px-3 py-2">
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-2">
            {conversationsQuery.isLoading ? (
              <LoadingStateBlock eyebrow="Loading" title="Fetching conversations..." />
            ) : conversationsQuery.isError ? (
              <ErrorStateBlock
                eyebrow="Error"
                title="Failed to load"
                description={getApiErrorMessage(conversationsQuery.error)}
                actionLabel="Retry"
                onAction={() => void conversationsQuery.refetch()}
              />
            ) : filteredConversations.length === 0 ? (
              <EmptyStateBlock eyebrow="Empty" title="No conversations" description="No matching conversations found." />
            ) : (
              <div className="space-y-0.5">
                {filteredConversations.map((conv) => (
                  <ConversationListItem
                    key={conv.id}
                    conv={conv}
                    isActive={conv.id === selectedConversationId}
                    onSelect={() => handleSelectConversation(conv.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right panel – chat */}
        <div
          className={cn(
            'flex min-h-0 flex-1 flex-col',
            !showChat && isMobile ? 'hidden' : 'flex',
          )}
        >
          {!selectedConversation ? (
            <div className="flex flex-1 items-center justify-center text-[var(--muted)]">
              <div className="text-center">
                <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-4 h-12 w-12 text-[var(--muted)]">
                  <path d="M8 12h32v24H8z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 20h16M16 26h10" strokeLinecap="round" />
                </svg>
                <p className="text-sm font-medium">Select a conversation</p>
                <p className="mt-1 text-xs">Choose from the list to start chatting</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
                {isMobile ? (
                  <button
                    type="button"
                    onClick={() => setSelectedConversationId(null)}
                    className="mr-1 rounded-lg p-1.5 hover:bg-[var(--accent-soft)] text-[var(--muted)]"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                ) : null}
                <AvatarOrInitials avatarUrl={selectedConversation.client_avatar_url} name={getClientName(selectedConversation)} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{getClientName(selectedConversation)}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <ChannelBadge channel={selectedConversation.channel} chatMode={selectedConversation.chat_mode} />
                    {selectedConversation.pause_reason ? <PauseReasonBadge reason={selectedConversation.pause_reason} /> : null}
                  </div>
                </div>

                {supportsAi ? (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleRetryAi()}
                      title="Retry AI"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                        <path d="M1 4v6h6" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M3.51 15a9 9 0 1 0 .49-4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </Button>
                    <Button
                      size="sm"
                      variant={aiPaused ? 'secondary' : 'secondary'}
                      onClick={() => handleToggleAi(aiPaused ? 'resume' : 'pause')}
                      disabled={isTogglingAi}
                    >
                      {aiPaused ? 'Resume AI' : 'Pause AI'}
                    </Button>
                  </div>
                ) : null}
              </div>

              {/* Messages */}
              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {isLoadingMessages ? (
                  <LoadingStateBlock eyebrow="Loading" title="Fetching messages..." />
                ) : messages.length === 0 ? (
                  <EmptyStateBlock eyebrow="Empty" title="No messages" description="Start the conversation." />
                ) : (
                  messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Composer */}
              <div className="shrink-0 border-t border-[var(--border)] px-4 py-3">
                <div className="flex items-end gap-2">
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
                    placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
                    rows={1}
                    className="flex-1 resize-none rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 max-h-32 overflow-y-auto"
                    style={{ fieldSizing: 'content' } as React.CSSProperties}
                  />
                  <Button onClick={() => void handleSend()} disabled={isSending || !messageText.trim()}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Button>
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
