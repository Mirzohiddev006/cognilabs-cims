import { useState } from 'react'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { useToast } from '../../../shared/toast/useToast'
import { getApiErrorMessage } from '../../../shared/lib/api-error'
import { PageHeader } from '../../../shared/ui/page-header'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { LoadingStateBlock, ErrorStateBlock } from '../../../shared/ui/state-block'
import {
  cognilabsaiService,
  type IntegrationConfigPayload,
} from '../../../shared/api/services/cognilabsai.service'

type FieldConfig = {
  key: keyof IntegrationConfigPayload
  label: string
  placeholder?: string
  type?: 'text' | 'password' | 'textarea'
  hint?: string
}

const sections: Array<{ title: string; description: string; fields: FieldConfig[] }> = [
  {
    title: 'OpenAI Settings',
    description: 'Configure the AI model that powers Instagram conversations.',
    fields: [
      { key: 'openai_api_key', label: 'API Key', type: 'password', placeholder: 'sk-...' },
      { key: 'openai_model', label: 'Model', placeholder: 'gpt-4o', hint: 'e.g. gpt-4o, gpt-4-turbo' },
      { key: 'openai_base_url', label: 'Base URL', placeholder: 'https://api.openai.com/v1', hint: 'Leave blank for default OpenAI endpoint' },
      { key: 'system_prompt', label: 'System Prompt', type: 'textarea', placeholder: 'You are a helpful assistant...' },
    ],
  },
  {
    title: 'Instagram',
    description: 'Connect your Instagram Business account to receive and send messages.',
    fields: [
      { key: 'instagram_access_token', label: 'Access Token', type: 'password' },
      { key: 'instagram_business_id', label: 'Business ID' },
      { key: 'instagram_verify_token', label: 'Verify Token', type: 'password', hint: 'Used for webhook verification' },
    ],
  },
  {
    title: 'Telegram',
    description: 'Connect your Telegram account to send and receive messages as an operator.',
    fields: [
      { key: 'telegram_api_id', label: 'API ID' },
      { key: 'telegram_api_hash', label: 'API Hash', type: 'password' },
      { key: 'telegram_session', label: 'Session String', type: 'password', hint: 'Telethon session string for your account' },
    ],
  },
  {
    title: 'WebSocket',
    description: 'API key used by the frontend to connect to the real-time chat stream.',
    fields: [
      { key: 'websocket_api_key', label: 'WebSocket API Key', type: 'password' },
    ],
  },
]

const emptyForm: IntegrationConfigPayload = {
  openai_api_key: null,
  openai_model: null,
  openai_base_url: null,
  system_prompt: null,
  instagram_access_token: null,
  instagram_business_id: null,
  instagram_verify_token: null,
  telegram_api_id: null,
  telegram_api_hash: null,
  telegram_session: null,
  websocket_api_key: null,
}

function fieldValue(form: IntegrationConfigPayload, key: keyof IntegrationConfigPayload): string {
  return form[key] ?? ''
}

export function CognilabsAIIntegrationsPage() {
  const { showToast } = useToast()
  const [form, setForm] = useState<IntegrationConfigPayload>(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set())

  const query = useAsyncData(() => cognilabsaiService.getIntegrations(), [], {
    onSuccess: (data) => {
      setForm({
        openai_api_key: data.openai_api_key ?? null,
        openai_model: data.openai_model ?? null,
        openai_base_url: data.openai_base_url ?? null,
        system_prompt: data.system_prompt ?? null,
        instagram_access_token: data.instagram_access_token ?? null,
        instagram_business_id: data.instagram_business_id ?? null,
        instagram_verify_token: data.instagram_verify_token ?? null,
        telegram_api_id: data.telegram_api_id ?? null,
        telegram_api_hash: data.telegram_api_hash ?? null,
        telegram_session: data.telegram_session ?? null,
        websocket_api_key: data.websocket_api_key ?? null,
      })
    },
  })

  function updateField(key: keyof IntegrationConfigPayload, value: string) {
    setForm((prev) => ({ ...prev, [key]: value || null }))
  }

  function toggleReveal(key: string) {
    setRevealedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function handleSave() {
    setIsSaving(true)
    try {
      await cognilabsaiService.updateIntegrations(form)
      showToast({ title: 'Integrations saved', tone: 'success' })
    } catch (err) {
      showToast({ title: 'Save failed', description: getApiErrorMessage(err), tone: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  if (query.isLoading) return <LoadingStateBlock eyebrow="Loading" title="Fetching integration settings..." />
  if (query.isError) {
    return (
      <ErrorStateBlock
        eyebrow="Error"
        title="Failed to load integrations"
        description={getApiErrorMessage(query.error)}
        actionLabel="Retry"
        onAction={() => void query.refetch()}
      />
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="CognilabsAI Integrations"
        description="Configure AI, messaging channels, and WebSocket credentials."
        actions={
          <Button onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        }
      />

      <div className="space-y-6">
        {sections.map((section) => (
          <div
            key={section.title}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-6"
          >
            <div className="mb-5 border-b border-[var(--border)] pb-4">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">{section.title}</h2>
              <p className="mt-0.5 text-xs text-[var(--muted)]">{section.description}</p>
            </div>

            <div className="space-y-4">
              {section.fields.map((field) => {
                const value = fieldValue(form, field.key)
                const isSecret = field.type === 'password'
                const isRevealed = revealedKeys.has(field.key)

                return (
                  <div key={field.key}>
                    <label className="mb-1.5 block text-xs font-medium text-[var(--foreground)]">
                      {field.label}
                    </label>

                    {field.type === 'textarea' ? (
                      <textarea
                        value={value}
                        onChange={(e) => updateField(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        rows={5}
                        className="w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      />
                    ) : isSecret ? (
                      <div className="flex gap-2">
                        <Input
                          type={isRevealed ? 'text' : 'password'}
                          value={value}
                          onChange={(e) => updateField(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          className="flex-1 font-mono text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => toggleReveal(field.key)}
                          className="shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--muted)] hover:bg-[var(--accent-soft)] transition-colors"
                        >
                          {isRevealed ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    ) : (
                      <Input
                        value={value}
                        onChange={(e) => updateField(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="font-mono text-sm"
                      />
                    )}

                    {field.hint ? (
                      <p className="mt-1 text-xs text-[var(--muted)]">{field.hint}</p>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        <div className="flex justify-end pb-6">
          <Button onClick={() => void handleSave()} disabled={isSaving} size="lg">
            {isSaving ? 'Saving...' : 'Save All Changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}
