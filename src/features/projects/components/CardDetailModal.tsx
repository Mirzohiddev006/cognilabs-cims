import { createPortal } from 'react-dom'
import { useEffect } from 'react'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import type { CardRecord } from '../../../shared/api/services/projects.service'
import { Avatar } from './Avatar'
import { PRIORITY_CONFIG, formatProjectDate, isDueDateOverdue, isDueDateSoon, getSnoozePresets } from '../lib/format'
import { cn } from '../../../shared/lib/cn'

type CardDetailModalProps = {
  card: CardRecord | null
  open: boolean
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  boardName?: string
  projectName?: string
}

function SnoozeMenu({ disabled }: { disabled?: boolean }) {
  const presets = getSnoozePresets()
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)] mb-1">
        Snooze until
      </p>
      {presets.map((p) => (
        <button
          key={p.label}
          disabled={disabled}
          title="Coming soon — backend not yet connected"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-[var(--muted-strong)] transition hover:bg-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="8" cy="8" r="6" />
            <path d="M8 5v3l2 2" strokeLinecap="round" />
          </svg>
          {p.label}
        </button>
      ))}
      <button
        disabled={disabled}
        title="Coming soon — backend not yet connected"
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-[var(--muted-strong)] transition hover:bg-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="2" y="2" width="12" height="12" rx="2" />
          <path d="M5 8h6M8 5v6" strokeLinecap="round" />
        </svg>
        Pick a date
      </button>
      <Badge variant="secondary" size="sm" className="self-start mt-1">
        Coming soon
      </Badge>
    </div>
  )
}

export function CardDetailModal({
  card,
  open,
  onClose,
  onEdit,
  onDelete,
  boardName,
  projectName,
}: CardDetailModalProps) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open || !card) return null

  const priority = card.priority ? PRIORITY_CONFIG[card.priority] : null
  const overdue = card.due_date ? isDueDateOverdue(card.due_date) : false
  const soon = card.due_date ? isDueDateSoon(card.due_date) : false
  const images = Array.isArray(card.images) ? card.images : []

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-start justify-end sm:items-center sm:justify-center p-3 sm:p-6">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
        aria-label="Close"
      />

      {/* Drawer / modal */}
      <div className="relative z-10 flex h-full max-h-[calc(100vh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface-elevated)] shadow-[var(--shadow-xl)] sm:max-h-[calc(100vh-3rem)]">

        {/* Gradient accent */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_72%)]" />

        {/* Header */}
        <div className="relative z-10 flex items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
          <div className="flex-1 min-w-0">
            {/* Breadcrumb context */}
            {(projectName || boardName) && (
              <p className="mb-2 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-300/70">
                {projectName && <span>{projectName}</span>}
                {projectName && boardName && (
                  <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {boardName && <span>{boardName}</span>}
              </p>
            )}
            <h2 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">{card.title}</h2>

            {/* Priority + due date row */}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {priority && (
                <Badge variant={priority.badgeVariant} size="sm" dot>
                  {priority.label}
                </Badge>
              )}
              {card.due_date && (
                <Badge
                  variant={overdue ? 'danger' : soon ? 'warning' : 'secondary'}
                  size="sm"
                  dot={overdue || soon}
                >
                  Due {formatProjectDate(card.due_date)}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button variant="secondary" size="sm" onClick={onEdit}>
              Edit
            </Button>
            <Button variant="danger" size="sm" onClick={onDelete}>
              Delete
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--input-surface)] text-[var(--muted-strong)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="relative z-10 flex-1 overflow-y-auto">
          <div className="grid gap-0 sm:grid-cols-[1fr_220px]">
            {/* Main column */}
            <div className="flex flex-col gap-5 border-b sm:border-b-0 sm:border-r border-[var(--border)] p-6">
              {/* Description */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)] mb-2">
                  Description
                </p>
                {card.description ? (
                  <p className="text-sm leading-6 text-[var(--foreground)] whitespace-pre-wrap">
                    {card.description}
                  </p>
                ) : (
                  <p className="text-sm text-[var(--muted)] italic">No description</p>
                )}
              </div>

              {/* Attachments */}
              {images.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)] mb-2">
                    Attachments ({images.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {images.map((img) => (
                      <a
                        key={img.id}
                        href={img.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative h-20 w-20 overflow-hidden rounded-xl border border-[var(--border)] transition hover:border-blue-500/30"
                      >
                        <img
                          src={img.url}
                          alt={img.filename}
                          className="h-full w-full object-cover transition group-hover:scale-105"
                        />
                        <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/60 to-transparent p-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <span className="text-[9px] text-white truncate w-full text-center">
                            {img.filename}
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar metadata */}
            <div className="flex flex-col gap-5 p-6">
              {/* Assignee */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)] mb-2">
                  Assignee
                </p>
                {card.assignee ? (
                  <div className="flex items-center gap-2">
                    <Avatar name={card.assignee.name} surname={card.assignee.surname} size="sm" />
                    <div>
                      <p className="text-xs font-medium text-[var(--foreground)]">
                        {card.assignee.name} {card.assignee.surname}
                      </p>
                      {card.assignee.job_title && (
                        <p className="text-[10px] text-[var(--muted)]">{card.assignee.job_title}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--muted)]">Unassigned</p>
                )}
              </div>

              {/* Created by */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)] mb-2">
                  Created by
                </p>
                <div className="flex items-center gap-2">
                  <Avatar name={card.created_by.name} surname={card.created_by.surname} size="sm" />
                  <p className="text-xs font-medium text-[var(--foreground)]">
                    {card.created_by.name} {card.created_by.surname}
                  </p>
                </div>
              </div>

              {/* Dates */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)] mb-2">
                  Dates
                </p>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--muted)]">Created</span>
                    <span className="text-[var(--foreground)]">{formatProjectDate(card.created_at)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--muted)]">Updated</span>
                    <span className="text-[var(--foreground)]">{formatProjectDate(card.updated_at)}</span>
                  </div>
                  {card.due_date && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--muted)]">Due</span>
                      <span className={cn(
                        overdue ? 'text-[var(--danger-text)]' : soon ? 'text-[var(--warning-text)]' : 'text-[var(--foreground)]'
                      )}>
                        {formatProjectDate(card.due_date)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Snooze */}
              <div className="border-t border-[var(--border)] pt-4">
                <SnoozeMenu disabled />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
