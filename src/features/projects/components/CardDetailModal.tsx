import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import type { CardRecord } from '../../../shared/api/services/projects.service'
import { Avatar } from './Avatar'
import { formatProjectDate, getPriorityConfig, getSnoozePresets, isDueDateOverdue, isDueDateSoon } from '../lib/format'
import { cn } from '../../../shared/lib/cn'
import { resolveMediaUrl } from '../../../shared/lib/media-url'

type CardDetailModalProps = {
  card: CardRecord | null
  open: boolean
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  boardName?: string
  projectName?: string
  canManage?: boolean
}

function getCardImageUrl(image: { url?: string | null; url_path?: string | null }) {
  const value = image.url ?? image.url_path ?? ''
  return resolveMediaUrl(value) ?? value
}

function SnoozeMenu({ disabled }: { disabled?: boolean }) {
  const presets = getSnoozePresets()
  return (
    <div className="flex flex-col gap-1">
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
        Snooze until
      </p>
      {presets.map((p) => (
        <button
          key={p.label}
          disabled={disabled}
          title="Coming soon — backend not yet connected"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--muted-strong)] transition hover:bg-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-40"
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
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--muted-strong)] transition hover:bg-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-40"
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
  canManage = true,
}: CardDetailModalProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

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

  useEffect(() => {
    setSelectedImageIndex(0)
  }, [card?.id, open])

  if (!open || !card) return null

  const priorityConfig = getPriorityConfig()
  const priority = card.priority ? priorityConfig[card.priority] : null
  const overdue = card.due_date ? isDueDateOverdue(card.due_date) : false
  const soon = card.due_date ? isDueDateSoon(card.due_date) : false
  const images = Array.isArray(card.images)
    ? card.images
    : Array.isArray(card.files)
      ? card.files
      : []
  const selectedImage = images[selectedImageIndex] ?? images[0] ?? null

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
      <div className="relative z-10 flex h-full max-h-[calc(100vh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface-elevated)] shadow-[var(--shadow-xl)] sm:max-h-[calc(100vh-3rem)]">

        {/* Gradient accent */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_72%)]" />

        {/* Header */}
        <div className="relative z-10 flex items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
          <div className="flex-1 min-w-0">
            {/* Breadcrumb context */}
            {(projectName || boardName) && (
              <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-300/70">
                {projectName && <span>{projectName}</span>}
                {projectName && boardName && (
                  <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {boardName && <span>{boardName}</span>}
              </p>
            )}
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">{card.title}</h2>

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
            {canManage ? (
              <Button variant="secondary" size="sm" onClick={onEdit}>
                Edit
              </Button>
            ) : null}
            {canManage ? (
              <Button variant="danger" size="sm" onClick={onDelete}>
                Delete
              </Button>
            ) : null}
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
          <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_260px]">
            {/* Main column */}
            <div className="flex flex-col gap-5 border-b border-[var(--border)] p-6 xl:border-b-0 xl:border-r">
              {selectedImage ? (
                <div className="overflow-hidden rounded-[24px] border border-[var(--border)] bg-black/20">
                  <a
                    href={getCardImageUrl(selectedImage)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative block"
                  >
                    <img
                      src={getCardImageUrl(selectedImage)}
                      alt={selectedImage.filename}
                      className="h-[320px] w-full object-cover transition duration-300 group-hover:scale-[1.015] sm:h-[420px]"
                    />
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4">
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-white">{selectedImage.filename}</p>
                        <p className="mt-1 text-sm text-white/70">Open full size</p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] font-medium text-white/80">
                        {selectedImageIndex + 1} / {images.length}
                      </span>
                    </div>
                  </a>
                </div>
              ) : null}

              {/* Description */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  Description
                </p>
                {card.description ? (
                  <p className="text-base leading-7 text-[var(--foreground)] whitespace-pre-wrap">
                    {card.description}
                  </p>
                ) : (
                  <p className="text-base text-[var(--muted)] italic">No description</p>
                )}
              </div>

              {/* Attachments */}
              {images.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                    Attachments ({images.length})
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {images.map((img, index) => (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => setSelectedImageIndex(index)}
                        className={cn(
                          'group relative overflow-hidden rounded-2xl border transition hover:border-blue-500/30',
                          index === selectedImageIndex ? 'border-blue-400/40 ring-1 ring-blue-400/30' : 'border-[var(--border)]',
                        )}
                      >
                        <img
                          src={getCardImageUrl(img)}
                          alt={img.filename}
                          className="h-28 w-full object-cover transition group-hover:scale-105"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-left">
                          <span className="block truncate text-xs text-white">
                            {img.filename}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar metadata */}
            <div className="flex flex-col gap-5 p-6">
              {/* Assignee */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  Assignee
                </p>
                {card.assignee ? (
                  <div className="flex items-center gap-2">
                    <Avatar name={card.assignee.name} surname={card.assignee.surname} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        {card.assignee.name} {card.assignee.surname}
                      </p>
                      {card.assignee.job_title && (
                        <p className="text-xs text-[var(--muted)]">{card.assignee.job_title}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--muted)]">Unassigned</p>
                )}
              </div>

              {/* Created by */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  Created by
                </p>
                <div className="flex items-center gap-2">
                  <Avatar name={card.created_by.name} surname={card.created_by.surname} size="sm" />
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {card.created_by.name} {card.created_by.surname}
                  </p>
                </div>
              </div>

              {/* Dates */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  Dates
                </p>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--muted)]">Created</span>
                    <span className="text-[var(--foreground)]">{formatProjectDate(card.created_at)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--muted)]">Updated</span>
                    <span className="text-[var(--foreground)]">{formatProjectDate(card.updated_at)}</span>
                  </div>
                  {card.due_date && (
                    <div className="flex items-center justify-between text-sm">
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
