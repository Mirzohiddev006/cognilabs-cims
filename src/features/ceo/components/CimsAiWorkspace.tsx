import { useEffect, useRef, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { useCimsAi } from '../context/CimsAiContext'
import {
  cimsAiLoadingStages,
  cimsAiQuickPrompts,
  type CimsAiLoadingStage,
  type CimsAiChatMessage,
} from '../lib/cimsAi'
import { cn } from '../../../shared/lib/cn'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { Textarea } from '../../../shared/ui/textarea'

type CimsAiWorkspaceProps = {
  mode: 'page' | 'dialog'
}

function formatMessageTime(createdAt: number) {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(createdAt))
}

function ConversationBubble({ message }: { message: CimsAiChatMessage }) {
  return (
    <article
      className={cn(
        'group flex w-full gap-3',
        message.role === 'user' ? 'justify-end' : 'justify-start',
      )}
    >
      {message.role === 'assistant' ? (
        <div className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-2xl border border-blue-500/25 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.22),rgba(15,23,42,0.92))] text-[11px] font-semibold text-white shadow-[0_10px_35px_rgba(37,99,235,0.16)]">
          AI
        </div>
      ) : null}

      <div
        className={cn(
          'max-w-[min(100%,780px)] rounded-[28px] border px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]',
          message.role === 'user'
            ? 'border-[var(--blue-border)] bg-[linear-gradient(180deg,var(--blue-soft),var(--blue-dim))] text-[var(--foreground)]'
            : 'border-[var(--border)] bg-[linear-gradient(180deg,var(--surface-elevated),var(--surface))] text-[var(--foreground)]',
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
            {message.role === 'user' ? 'You' : 'CIMS AI'}
          </p>
          <span className="text-[10px] text-[var(--muted)]">{formatMessageTime(message.createdAt)}</span>
        </div>
        <div className="mt-3 whitespace-pre-wrap break-words text-[14px] leading-7">
          {message.content}
        </div>
      </div>

      {message.role === 'user' ? (
        <div className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-2xl border border-[var(--border)] bg-[var(--muted-surface)] text-[11px] font-semibold text-[var(--foreground)]">
          You
        </div>
      ) : null}
    </article>
  )
}

function LoadingBubble({ stage }: { stage: CimsAiLoadingStage }) {
  const currentStage = cimsAiLoadingStages.find((item) => item.key === stage) ?? cimsAiLoadingStages[0]

  return (
    <article className="group flex w-full justify-start gap-3">
      <div className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-2xl border border-blue-500/25 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.22),rgba(15,23,42,0.92))] text-[11px] font-semibold text-white shadow-[0_10px_35px_rgba(37,99,235,0.16)]">
        AI
      </div>

      <div className="max-w-[min(100%,780px)] rounded-[28px] border border-[var(--border)] bg-[linear-gradient(180deg,var(--surface-elevated),var(--surface))] px-5 py-4 text-[var(--foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
            CIMS AI
          </p>
          <span className="text-[10px] text-[var(--blue-text)]">Thinking</span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-blue-300 [animation-delay:0ms]" />
            <span className="h-2 w-2 animate-pulse rounded-full bg-blue-300/80 [animation-delay:180ms]" />
            <span className="h-2 w-2 animate-pulse rounded-full bg-blue-300/60 [animation-delay:360ms]" />
            <span className="h-2 w-2 animate-pulse rounded-full bg-blue-300/40 [animation-delay:540ms]" />
          </div>
          <p className="text-sm leading-6 text-[var(--muted)]">{currentStage.label}</p>
        </div>
      </div>
    </article>
  )
}

function EmptyConversation({
  mode,
  onPrompt,
}: {
  mode: 'page' | 'dialog'
  onPrompt: (prompt: string) => void
}) {
  return (
    <div className={cn(
      'flex h-full flex-col justify-center',
      mode === 'page' ? 'px-8 py-10 lg:px-10' : 'px-1 py-1',
    )}>
      <div className="mx-auto max-w-3xl text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-[20px] border border-blue-500/20 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.24),rgba(15,23,42,0.92))] text-white shadow-[0_18px_60px_rgba(37,99,235,0.18)]">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M12 4v5" strokeLinecap="round" />
            <path d="M12 15v5" strokeLinecap="round" />
            <path d="M4 12h5" strokeLinecap="round" />
            <path d="M15 12h5" strokeLinecap="round" />
            <circle cx="12" cy="12" r="3.25" />
          </svg>
        </div>
        <h2 className="mt-5 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Ask CIMS AI from anywhere
        </h2>
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
          Use it for team updates, CRM signals, payment priorities, and fast executive summaries.
        </p>
      </div>

      <div className={cn(
        'mx-auto mt-8 grid w-full max-w-4xl gap-3',
        mode === 'page' ? 'md:grid-cols-2' : 'grid-cols-1',
      )}>
        {cimsAiQuickPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onPrompt(prompt)}
            className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-4 text-left text-sm leading-6 text-[var(--foreground)] transition hover:border-[var(--border-hover)] hover:bg-[var(--accent-soft)]"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  )
}

function Composer({
  mode,
}: {
  mode: 'page' | 'dialog'
}) {
  const { draft, setDraft, submitQuestion, isSubmitting } = useCimsAi()

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      void submitQuestion()
    }
  }

  return (
    <div className={cn(
      'border-t border-[var(--border)] bg-[linear-gradient(180deg,var(--surface-elevated),var(--surface))]',
      mode === 'page' ? 'px-6 pb-6 pt-5 lg:px-8' : 'px-4 pb-4 pt-4',
    )}>
      <div className="rounded-[26px] border border-[var(--border)] bg-[linear-gradient(180deg,var(--surface-elevated),var(--surface))] p-3 shadow-[var(--shadow-xl)]">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={mode === 'page' ? 5 : 4}
          placeholder="Write a question for CIMS AI. Ctrl/Cmd + Enter to send."
          className="min-h-0 resize-none border-0 bg-transparent px-2 py-2 text-sm leading-7 shadow-none hover:bg-transparent focus:bg-transparent focus:shadow-none"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-2 pb-1">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--muted)]">
            <span>Frontend chat history</span>
            <span className="h-1 w-1 rounded-full bg-[var(--border)]" />
            <span>Shared across pages</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setDraft('')}
              disabled={!draft.trim() || isSubmitting}
            >
              Reset
            </Button>
            <Button onClick={() => void submitQuestion()} loading={isSubmitting}>
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function CimsAiWorkspace({ mode }: CimsAiWorkspaceProps) {
  const { history, clearConversation, fillPrompt, isSubmitting, loadingStage } = useCimsAi()
  const streamRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const element = streamRef.current

    if (!element) {
      return
    }

    element.scrollTop = element.scrollHeight
  }, [history])

  if (mode === 'dialog') {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--blue-text)]">CIMS AI</p>
            <h2 className="mt-1 text-base font-semibold tracking-tight text-[var(--foreground)]">Quick assistant</h2>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/ceo/ai">Open page</Link>
          </Button>
        </div>

        <div ref={streamRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {history.length > 0 ? (
            <div className="space-y-4">
              {history.map((message) => (
                <ConversationBubble key={message.id} message={message} />
              ))}
              {isSubmitting ? <LoadingBubble stage={loadingStage} /> : null}
            </div>
          ) : (
            <div className="space-y-4">
              <EmptyConversation mode={mode} onPrompt={fillPrompt} />
              {isSubmitting ? <LoadingBubble stage={loadingStage} /> : null}
            </div>
          )}
        </div>

        <Composer mode={mode} />
      </div>
    )
  }

  return (
    <section className="grid min-h-[calc(100vh-9rem)] gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
        <div className="px-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--blue-text)]">CIMS AI</p>
          <h1 className="mt-3 text-[2.35rem] font-semibold tracking-[-0.04em] text-[var(--foreground)]">
            Executive copilot for live operations
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-7 text-[var(--muted)]">
            Ask about updates, CRM movement, workload pressure, and management decisions without leaving your current workflow.
          </p>
        </div>

        <Card variant="glass" className="overflow-hidden rounded-[30px] p-0">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--blue-text)]">Prompt library</p>
            <p className="mt-2 text-sm text-[var(--muted)]">Fast starts for CEO-level questions.</p>
          </div>
          <div className="grid gap-3 px-5 py-5">
            {cimsAiQuickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => fillPrompt(prompt)}
                className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 text-left text-sm leading-6 text-[var(--foreground)] transition hover:border-[var(--border-hover)] hover:bg-[var(--accent-soft)]"
              >
                {prompt}
              </button>
            ))}
          </div>
        </Card>

      </aside>

      <div className="relative flex min-h-[78vh] min-w-0 flex-col overflow-hidden rounded-[34px] border border-[var(--border)] bg-[linear-gradient(180deg,var(--surface-elevated),var(--surface))] shadow-[var(--shadow-xl)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_72%)]" />

        <div className="relative flex items-center justify-between gap-4 border-b border-[var(--border)] px-6 py-5 lg:px-8">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--blue-text)]">Shared conversation</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--foreground)]">Chat with CIMS AI</h2>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{history.length} turns</Badge>
            <Button variant="secondary" onClick={clearConversation} disabled={history.length === 0}>
              Clear chat
            </Button>
          </div>
        </div>

        <div ref={streamRef} className="relative min-h-0 flex-1 overflow-y-auto px-6 py-6 lg:px-8">
          {history.length > 0 ? (
            <div className="space-y-5">
              {history.map((message) => (
                <ConversationBubble key={message.id} message={message} />
              ))}
              {isSubmitting ? <LoadingBubble stage={loadingStage} /> : null}
            </div>
          ) : (
            <div className="space-y-5">
              <EmptyConversation mode={mode} onPrompt={fillPrompt} />
              {isSubmitting ? <LoadingBubble stage={loadingStage} /> : null}
            </div>
          )}
        </div>

        <Composer mode={mode} />
      </div>
    </section>
  )
}
