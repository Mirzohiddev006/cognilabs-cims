import { request } from '../http'
import { getAccessToken } from '../../lib/session'
import { env } from '../../config/env'

export type ConversationItem = {
  id: number
  channel: string
  chat_mode: 'telegram_operator' | 'instagram_ai' | string
  supports_ai: boolean
  client_external_id: string
  client_username: string | null
  client_full_name: string | null
  client_avatar_url: string | null
  instagram_business_id: string | null
  ai_enabled: boolean
  pause_reason: string | null
  paused_until: string | null
  last_message_at: string | null
  last_message_preview: string | null
  last_operator_user_id: number | null
  last_operator_name: string | null
  is_imported: boolean
  created_at: string
  updated_at: string
}

export type MessageItem = {
  id: number
  conversation_id: number
  channel: string
  sender_type: 'client' | 'operator' | 'ai' | 'system'
  operator_user_id: number | null
  operator_name_snapshot: string | null
  client_external_id: string | null
  instagram_message_id: string | null
  telegram_message_id: string | null
  text: string
  created_at: string
}

export type TelegramSearchResult = {
  peer: string
  external_id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  existing_conversation_id: number | null
}

export type TelegramSearchListResponse = {
  query: string
  items: TelegramSearchResult[]
}

export type IntegrationConfig = {
  openai_api_key: string | null
  openai_model: string | null
  openai_base_url: string | null
  system_prompt: string | null
  instagram_access_token: string | null
  instagram_business_id: string | null
  instagram_verify_token: string | null
  telegram_api_id: string | null
  telegram_api_hash: string | null
  telegram_session: string | null
  websocket_api_key: string | null
  id?: number
  created_at?: string
  updated_at?: string
}

export type IntegrationConfigPayload = Omit<IntegrationConfig, 'id' | 'created_at' | 'updated_at'>

export type ImportConversationsResponse = {
  imported_files: number
  skipped_files: number
  created_conversations: number
  created_messages: number
  source_type: string
}

export type WsEvent =
  | { type: 'message.created'; conversation_id: number; message: MessageItem }
  | { type: 'conversation.updated'; conversation_id: number; conversation: ConversationItem }

export const cognilabsaiService = {
  listConversations(channel?: string) {
    return request<ConversationItem[]>({
      path: '/cognilabsai/chat/conversations',
      query: channel ? { channel } : undefined,
    })
  },

  getConversation(conversationId: number) {
    return request<ConversationItem>({
      path: `/cognilabsai/chat/conversations/${conversationId}`,
    })
  },

  listMessages(conversationId: number, limit = 200, offset = 0) {
    return request<MessageItem[]>({
      path: `/cognilabsai/chat/conversations/${conversationId}/messages`,
      query: { limit, offset },
    })
  },

  sendMessage(conversationId: number, text: string) {
    return request<string>({
      path: '/cognilabsai/chat/send-message',
      method: 'POST',
      body: { conversation_id: conversationId, text },
    })
  },

  pause(conversationId: number) {
    return request<ConversationItem>({
      path: '/cognilabsai/chat/pause',
      method: 'POST',
      body: { conversation_id: conversationId },
    })
  },

  resume(conversationId: number) {
    return request<ConversationItem>({
      path: '/cognilabsai/chat/resume',
      method: 'POST',
      body: { conversation_id: conversationId },
    })
  },

  pauseUntil(conversationId: number, pausedUntil: string) {
    return request<ConversationItem>({
      path: '/cognilabsai/chat/pause-until',
      method: 'POST',
      body: { conversation_id: conversationId, paused_until: pausedUntil },
    })
  },

  retryAi(conversationId: number) {
    return request<{ message: string }>({
      path: `/cognilabsai/chat/conversations/${conversationId}/retry-ai`,
      method: 'POST',
    })
  },

  telegramSearch(query: string) {
    return request<TelegramSearchResult>({
      path: '/cognilabsai/chat/telegram/search',
      query: { query },
    })
  },

  telegramSearchList(query: string, limit = 10) {
    return request<TelegramSearchListResponse>({
      path: '/cognilabsai/chat/telegram/search-list',
      query: { query, limit },
    })
  },

  telegramStart(peer: string, text: string, clientFullName?: string) {
    return request<string>({
      path: '/cognilabsai/chat/telegram/start',
      method: 'POST',
      body: { peer, text, client_full_name: clientFullName },
    })
  },

  getIntegrations() {
    return request<IntegrationConfig>({
      path: '/cognilabsai/integrations',
    })
  },

  updateIntegrations(payload: IntegrationConfigPayload) {
    return request<IntegrationConfig>({
      path: '/cognilabsai/integrations',
      method: 'PUT',
      body: payload,
    })
  },

  createWebSocket(wsKey: string, conversationId?: number): WebSocket {
    const baseUrl = env.apiBaseUrl.replace(/^http/, 'ws').replace(/\/$/, '')
    let url = `${baseUrl}/cognilabsai/ws/chat?api_key=${wsKey}`
    if (conversationId !== undefined) {
      url += `&conversation_id=${conversationId}`
    }
    return new WebSocket(url)
  },

  buildAvatarUrl(avatarPath: string | null) {
    if (!avatarPath) return null
    if (avatarPath.startsWith('http')) return avatarPath
    return `${env.apiBaseUrl.replace(/\/$/, '')}${avatarPath}`
  },
}

export function getWsKeyFromStorage(): string | null {
  const token = getAccessToken()
  if (!token) return null
  try {
    const stored = sessionStorage.getItem('cognilabsai:ws_key')
    return stored
  } catch {
    return null
  }
}

export function setWsKeyInStorage(key: string) {
  try {
    sessionStorage.setItem('cognilabsai:ws_key', key)
  } catch {
    // ignore
  }
}
