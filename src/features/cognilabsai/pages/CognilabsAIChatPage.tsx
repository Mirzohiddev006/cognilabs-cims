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

function ChannelBadge({ channel, chatMode }: { channel: string; chatMode: string }) {
  const isInstagram = channel === 'instagram'
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
        isInstagram
          ? 'bg-pink-500/10 text-pink-400 border border-pink-500/20'
          : 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      )}
    >
      {chatMode === 'instagram_ai' ? 'AI' : 'OP'}
    </span>
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
  const isOnline = conv.last_message_at && (Date.now() - new Date(conv.last_message_at).getTime() < 1000 * 60 * 5)
  
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group w-full rounded-xl px-3 py-3 text-left transition-all duration-200 relative flex items-center gap-3 border border-transparent',
        isActive
          ? 'bg-white/[0.04] border-white/[0.08] shadow-sm'
          : 'hover:bg-white/[0.02]',
      )}
    >
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-r-full" />
      )}
      
      <div className="relative shrink-0 ml-1">
        <AvatarOrInitials avatarUrl={conv.client_avatar_url} name={name} size="md" />
        {isOnline && (
          <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-[2.5px] border-[#0d0d0f] bg-emerald-500" />
        )}
      </div>
      
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className={cn(
            'truncate text-[14px] font-medium transition-colors',
            isActive ? 'text-zinc-100' : 'text-zinc-300 group-hover:text-zinc-200'
          )}>
            {name}
          </p>
          {conv.last_message_at ? (
            <span className="shrink-0 text-[11px] font-medium text-zinc-500">
              {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          ) : null}
        </div>
        
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            {conv.last_message_preview ? (
              <p className="truncate text-[13px] text-zinc-500 font-normal">
                {conv.last_message_preview}
              </p>
            ) : (
              <p className="italic text-[12px] text-zinc-600">Xabarlar yo'q</p>
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

function MessageBubble({ msg, isNextSameSender }: { msg: MessageItem; isNextSameSender: boolean }) {
  const isClient = msg.sender_type === 'client'
  const isAi = msg.sender_type === 'ai'
  const isSystem = msg.sender_type === 'system'

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <span className="rounded-full bg-white/5 border border-white/10 px-4 py-1.5 text-[12px] font-medium text-zinc-400">
          {msg.text}
        </span>
      </div>
    )
  }

  return (
    <div className={cn(
      'flex w-full group relative mb-2', 
      isClient ? 'justify-start' : 'justify-end',
      isNextSameSender ? 'mb-1' : 'mb-4'
    )}>
      <div
        className={cn(
          'relative max-w-[80%] sm:max-w-[65%] px-4 py-2.5 text-[14px] leading-relaxed shadow-sm',
          isClient
            ? 'bg-[#1a1a1f] text-zinc-200 border border-white/5 rounded-2xl rounded-bl-sm'
            : 'bg-blue-600 text-white rounded-2xl rounded-br-sm'
        )}
      >
        {(isAi || msg.sender_type === 'operator') && (
          <p className={cn(
            'mb-1 text-[12px] font-semibold tracking-wide', 
            isAi ? 'text-blue-200' : 'text-blue-200'
          )}>
            {isAi ? 'AI Assistant' : msg.operator_name_snapshot || 'Operator'}
          </p>
        )}
        
        <p className="whitespace-pre-wrap break-words">{msg.text}</p>
        
        <div className="flex items-center justify-end gap-1.5 mt-1.5 opacity-60">
          <span className="text-[10px] font-medium">
            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {!isClient && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </div>
    </div>
  )
}

// Xato keltirib chiqargan DateSeparator komponenti qo'shildi
function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex justify-center my-4 sticky top-2 z-20">
      <span className="rounded-full bg-[#121214]/80 border border-white/10 px-4 py-1.5 text-[12px] font-medium text-zinc-400 shadow-sm backdrop-blur-md">
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
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-[#121214] border border-white/10 p-6 shadow-2xl animate-page-enter">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-medium text-white">Yangi Telegram Chat</h3>
          <button type="button" onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-zinc-400 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="relative group">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-blue-500 transition-colors">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <Input
            placeholder="Username, @username yoki link..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedPeer(null)
            }}
            className="h-11 pl-10 pr-4 bg-white/5 border-white/10 focus:border-blue-500 focus:bg-white/[0.08] rounded-xl transition-all text-[14px] text-white placeholder:text-zinc-600"
            autoFocus
          />
        </div>

        {isSearching ? (
          <div className="mt-6 flex flex-col items-center justify-center py-8">
             <div className="h-6 w-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : results.length > 0 ? (
          <div className="mt-4 max-h-[300px] space-y-1 overflow-y-auto custom-scrollbar-visible pr-1">
            {results.map((item) => (
              <button
                key={item.peer}
                type="button"
                onClick={() => setSelectedPeer(item)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors border',
                  selectedPeer?.peer === item.peer
                    ? 'bg-blue-600/10 border-blue-500/30 text-white'
                    : 'bg-transparent border-transparent hover:bg-white/5 text-zinc-300',
                )}
              >
                <AvatarOrInitials avatarUrl={item.avatar_url} name={item.full_name || item.username || item.peer} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium">{item.full_name || item.username || item.peer}</p>
                  {item.username ? <p className="truncate text-[12px] text-zinc-500">@{item.username}</p> : null}
                </div>
              </button>
            ))}
          </div>
        ) : query.trim() && !isSearching ? (
          <div className="mt-6 flex flex-col items-center justify-center py-8 text-center text-zinc-500">
             <p className="text-[14px] font-medium">Natija topilmadi</p>
          </div>
        ) : null}

        {selectedPeer && !selectedPeer.existing_conversation_id ? (
          <div className="mt-6 animate-page-enter">
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={3}
              placeholder="Birinchi xabarni yozing..."
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[14px] text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-zinc-600"
            />
          </div>
        ) : null}

        <div className="mt-8 flex gap-3">
          <Button 
            variant="ghost" 
            onClick={onClose} 
            disabled={isSending}
            className="flex-1 h-10 rounded-xl font-medium text-zinc-300 hover:text-white hover:bg-white/5"
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
              className="flex-[2] h-10 rounded-xl font-medium bg-blue-600 hover:bg-blue-700 text-white"
            >
              {selectedPeer.existing_conversation_id ? 'Chatni ochish' : isSending ? 'Yuborilmoqda...' : 'Boshlash'}
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

  const [activeTab] = useState<ChannelTab>('all')
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
      showToast({ title: action === 'pause' ? 'AI to\'xtatildi' : 'AI faollashdi', tone: 'success' })
    } catch (err) {
      showToast({ title: 'Xatolik', description: getApiErrorMessage(err), tone: 'error' })
    } finally {
      setIsTogglingAi(false)
    }
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const showChat = selectedConversationId !== null
  const supportsAi = selectedConversation?.supports_ai ?? false
  const aiPaused = selectedConversation?.pause_reason === 'operator'

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#09090b] text-zinc-200 font-sans p-2 lg:p-4 gap-4">
      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden w-full max-w-[1400px] mx-auto">
        
        {/* Chap panel – Chatlar ro'yxati */}
        <div
          className={cn(
            'flex w-full flex-col md:w-80 lg:w-[380px] bg-[#121214] border border-white/5 rounded-2xl overflow-hidden shadow-sm',
            showChat && isMobile ? 'hidden' : 'flex',
          )}
        >
          {/* Sarlavha / Qidiruv */}
          <div className="shrink-0 px-4 py-4 border-b border-white/5 bg-[#121214]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-semibold text-white tracking-tight">Xabarlar</h2>
              <button
                onClick={() => setShowNewTelegramModal(true)}
                className="h-8 w-8 flex items-center justify-center rounded-lg bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white transition-colors"
                title="Yangi chat"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <div className="relative group">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-blue-500 transition-colors">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <Input
                placeholder="Qidiruv..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 pl-9 pr-4 text-[13px] bg-[#1a1a1f] border-transparent focus:border-blue-500/50 rounded-xl transition-all text-zinc-200 placeholder:text-zinc-600 outline-none"
              />
            </div>
          </div>

          {/* Chatlar Ro'yxati */}
          <div className="flex-1 overflow-y-auto custom-scrollbar-visible p-2">
            {conversationsQuery.isLoading ? (
              <div className="space-y-2">
                 {[1,2,3,4,5].map(i => (
                   <div key={i} className="flex gap-3 animate-pulse px-3 py-2 rounded-xl bg-white/[0.02]">
                     <div className="h-11 w-11 rounded-full bg-white/5" />
                     <div className="flex-1 space-y-2 py-1.5">
                       <div className="h-2.5 w-1/3 bg-white/5 rounded" />
                       <div className="h-2.5 w-3/4 bg-white/5 rounded" />
                     </div>
                   </div>
                 ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-10 w-10 mb-3 opacity-50">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round"/>
                 </svg>
                 <p className="text-[13px] font-medium">Chatlar topilmadi</p>
              </div>
            ) : (
              <div className="space-y-1">
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

        {/* O'ng panel – Asosiy chat zonasi */}
        <div
          className={cn(
            'flex min-h-0 flex-1 flex-col bg-[#121214] border border-white/5 rounded-2xl overflow-hidden shadow-sm relative',
            !showChat && isMobile ? 'hidden' : 'flex',
          )}
        >
          {!selectedConversation ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-8 w-8 text-zinc-500">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" strokeLinecap="round" strokeLinejoin="round"/>
                 </svg>
              </div>
              <h3 className="text-lg font-medium text-white mb-1">Xabarlar paneli</h3>
              <p className="text-[14px] text-zinc-500 max-w-sm">Mijozlar bilan yozishishni boshlash uchun chap tomondagi ro'yxatdan chatni tanlang.</p>
            </div>
          ) : (
            <>
              {/* Chat sarlavhasi (Header) */}
              <div className="flex shrink-0 items-center justify-between gap-3 px-6 py-3 bg-[#121214] z-30 border-b border-white/5">
                <div className="flex items-center gap-4 min-w-0">
                  {isMobile ? (
                    <button
                      type="button"
                      onClick={() => setSelectedConversationId(null)}
                      className="mr-1 rounded-lg p-2 hover:bg-white/5 text-zinc-400"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5">
                        <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  ) : null}
                  <div className="relative shrink-0">
                    <AvatarOrInitials avatarUrl={selectedConversation.client_avatar_url} name={getClientName(selectedConversation)} size="sm" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-[15px] font-semibold text-zinc-100">{getClientName(selectedConversation)}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[12px] text-zinc-500 font-medium tracking-wide">
                        {selectedConversation.channel === 'telegram' ? 'Telegram foydalanuvchi' : 'Instagram foydalanuvchi'}
                      </p>
                      {selectedConversation.pause_reason && (
                        <>
                          <span className="h-1 w-1 rounded-full bg-zinc-600" />
                          <PauseReasonBadge reason={selectedConversation.pause_reason} />
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
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
                      {aiPaused ? 'AI-ni yoqish' : 'AI-ni to\'xtatish'}
                    </Button>
                  )}
                  <button className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-zinc-400 transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <circle cx="12" cy="12" r="1" />
                      <circle cx="12" cy="5" r="1" />
                      <circle cx="12" cy="19" r="1" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Xabarlar oynasi */}
              <div className="relative flex-1 overflow-hidden z-10 bg-[#0c0c0e]">
                 <div className="h-full overflow-y-auto px-6 py-6 custom-scrollbar-visible flex flex-col scroll-smooth">
                  <div className="flex-1" />
                  {isLoadingMessages ? (
                    <div className="py-20 flex flex-col items-center justify-center">
                       <div className="h-6 w-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="py-10 flex flex-col items-center justify-center text-center">
                       <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                         <p className="text-[13px] font-medium text-zinc-400">Bu yerda xabarlar ko'rsatiladi</p>
                       </div>
                    </div>
                  ) : (
                    <div className="space-y-0">
                      {messages.reduce((acc: React.ReactNode[], msg, idx) => {
                        const prevMsg = messages[idx - 1]
                        const nextMsg = messages[idx + 1]
                        
                        const msgDate = new Date(msg.created_at).toLocaleDateString([], { month: 'long', day: 'numeric' })
                        const prevMsgDate = prevMsg ? new Date(prevMsg.created_at).toLocaleDateString([], { month: 'long', day: 'numeric' }) : null
                        
                        if (msgDate !== prevMsgDate) {
                          acc.push(<DateSeparator key={`date-${msg.created_at}`} date={msgDate} />)
                        }
                        
                        const isNextSameSender = nextMsg && nextMsg.sender_type === msg.sender_type && (new Date(nextMsg.created_at).toLocaleDateString([], { month: 'long', day: 'numeric' }) === msgDate);
                        
                        acc.push(<MessageBubble key={msg.id} msg={msg} isNextSameSender={!!isNextSameSender} />)
                        return acc
                      }, [])}
                    </div>
                  )}
                  <div ref={messagesEndRef} className="h-4" />
                </div>
              </div>

              {/* Xabar yozish qismi */}
              <div className="shrink-0 bg-[#121214] p-4 z-30 border-t border-white/5">
                <div className="max-w-[900px] mx-auto relative flex items-end gap-3 bg-[#1a1a1f] rounded-2xl px-3 py-2 border border-white/10 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/50 transition-all shadow-sm">
                  
                  <button type="button" className="h-9 w-9 shrink-0 flex items-center justify-center text-zinc-500 hover:text-zinc-200 transition-colors rounded-lg hover:bg-white/5 mb-0.5">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[20px] w-[20px]">
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
                    placeholder="Xabar yozing..."
                    rows={1}
                    className="flex-1 resize-none bg-transparent border-0 focus:ring-0 text-[14px] leading-relaxed py-2 max-h-[300px] overflow-y-auto custom-scrollbar-visible placeholder:text-zinc-600 text-zinc-100 outline-none"
                    style={{ fieldSizing: 'content' } as React.CSSProperties}
                  />
                  
                  <button 
                    onClick={() => void handleSend()} 
                    disabled={isSending || !messageText.trim()}
                    className={cn(
                      "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 mb-0.5",
                      messageText.trim() 
                        ? "bg-blue-600 text-white hover:bg-blue-500 shadow-md shadow-blue-900/20" 
                        : "bg-white/5 text-zinc-500 cursor-not-allowed"
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