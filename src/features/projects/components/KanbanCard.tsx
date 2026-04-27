import type { KeyboardEvent as ReactKeyboardEvent, ReactNode, SyntheticEvent } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { translateCurrentLiteral } from '../../../shared/i18n/translations'
import { cn } from '../../../shared/lib/cn'
import { Badge } from '../../../shared/ui/badge'
import { ActionsMenu } from '../../../shared/ui/actions-menu'
import type { CardRecord } from '../../../shared/api/services/projects.service'
import { Avatar } from './Avatar'
import { formatProjectDate, getPriorityConfig, isDueDateOverdue, isDueDateSoon } from '../lib/format'

type KanbanCardProps = {
  card: CardRecord
  onEdit: (card: CardRecord) => void
  onDelete: (cardId: number) => void
  onClick: (card: CardRecord) => void
  isOverlay?: boolean
  readOnly?: boolean
}

type MetaChipTone = 'neutral' | 'warning' | 'danger'

function MetaChip({
  icon,
  tone = 'neutral',
  children,
  className,
}: {
  icon?: ReactNode
  tone?: MetaChipTone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex min-h-6 items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium leading-none',
        tone === 'danger' && 'border-[var(--danger-border)] bg-[var(--danger-dim)] text-[var(--danger-text)]',
        tone === 'warning' && 'border-[var(--warning-border)] bg-[var(--warning-dim)] text-[var(--warning-text)]',
        tone === 'neutral' && 'border-[var(--border)] bg-[var(--accent-soft)] text-[var(--muted-strong)]',
        className,
      )}
    >
      {icon ? <span className="shrink-0">{icon}</span> : null}
      <span className="truncate">{children}</span>
    </span>
  )
}

export function KanbanCard({ card, onEdit, onDelete, onClick, isOverlay, readOnly = false }: KanbanCardProps) {
  const lt = translateCurrentLiteral
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `card-${card.id}`,
    data: { type: 'card', card },
    disabled: readOnly,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const priorityConfig = getPriorityConfig()
  const priority = card.priority ? priorityConfig[card.priority] : null
  const overdue = card.due_date ? isDueDateOverdue(card.due_date) : false
  const soon = card.due_date ? isDueDateSoon(card.due_date) : false
  const images = Array.isArray(card.images)
    ? card.images
    : Array.isArray(card.files)
      ? card.files
      : []
  const assigneeName = card.assignee
    ? [card.assignee.name, card.assignee.surname].filter(Boolean).join(' ').trim()
    : ''
  const dueTone: MetaChipTone = overdue ? 'danger' : soon ? 'warning' : 'neutral'

  function stopCardAction(event: SyntheticEvent) {
    event.stopPropagation()
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClick(card)
    }
  }

  if (isDragging && !isOverlay) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="min-h-[112px] w-full rounded-xl border border-dashed border-[var(--border-hover)] bg-[var(--accent-soft)]/70 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]"
      />
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(!readOnly ? attributes : {})}
      {...(!readOnly ? listeners : {})}
      onClick={() => onClick(card)}
      onKeyDown={handleKeyDown}
      tabIndex={readOnly ? 0 : attributes.tabIndex}
      className={cn(
        'group relative flex cursor-pointer select-none flex-col gap-3 overflow-hidden rounded-xl border p-3.5',
        'bg-[linear-gradient(180deg,var(--surface-elevated),var(--surface))] border-[var(--border)] text-[var(--foreground)]',
        'shadow-[var(--shadow-sm)] transition-[transform,border-color,box-shadow,background-color,opacity] duration-150',
        'hover:-translate-y-px hover:border-[var(--border-hover)] hover:shadow-[var(--shadow-md)]',
        'active:translate-y-0 active:scale-[0.995]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]',
        isOverlay && 'rotate-[1.5deg] border-[var(--border-hover)] shadow-[var(--shadow-lg)] opacity-95',
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_72%)] opacity-70" />

      <div className="relative z-10 flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          {priority ? (
            <Badge
              variant={priority.badgeVariant}
              size="sm"
              dot
              className="max-w-full rounded-md px-2 py-1 text-[10px] font-semibold tracking-[0.01em]"
            >
              {priority.label}
            </Badge>
          ) : (
            <span className="inline-flex h-5 items-center rounded-md border border-transparent px-1.5 text-[10px] font-medium text-[var(--muted)]">
              {lt('Task')}
            </span>
          )}
        </div>

        {!readOnly ? (
          <div
            className="relative z-20 shrink-0 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
            onClick={stopCardAction}
            onPointerDown={stopCardAction}
            onMouseDown={stopCardAction}
          >
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)]/92 p-0.5 shadow-[var(--shadow-sm)] backdrop-blur-md">
              <ActionsMenu
                label={lt('Card actions')}
                items={[
                  { label: lt('Edit card'), onSelect: () => onEdit(card) },
                  { label: lt('Delete card'), onSelect: () => onDelete(card.id), tone: 'danger' },
                ]}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="relative z-10 space-y-2">
        <p className="text-[14px] font-semibold leading-[1.45] tracking-[-0.01em] text-[var(--foreground)] line-clamp-3">
          {card.title}
        </p>

        {card.description ? (
          <p className="line-clamp-2 text-[12px] leading-5 text-[var(--muted)]">
            {card.description}
          </p>
        ) : null}
      </div>

      <div className="relative z-10 flex items-end justify-between gap-3 border-t border-[var(--border)]/80 pt-2.5">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {card.due_date ? (
            <MetaChip
              tone={dueTone}
              icon={(
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                  <path d="M4.5 2.75v2.5M11.5 2.75v2.5M3 5.25h10M4.75 8h2.5M4.75 10.75h5.5" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="3" y="3.75" width="10" height="9.25" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            >
              {formatProjectDate(card.due_date)}
            </MetaChip>
          ) : null}

          {images.length > 0 ? (
            <MetaChip
              icon={(
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                  <path d="M3 10.5 8 5.5a3 3 0 0 1 4.24 4.24l-5 5A1.5 1.5 0 0 1 5.12 12.64l5-5a.5.5 0 0 0-.71-.71l-5 5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            >
              {images.length}
            </MetaChip>
          ) : null}
        </div>

        {card.assignee ? (
          <div
            className="inline-flex max-w-[46%] shrink-0 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-1.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
            title={assigneeName}
          >
            <Avatar
              name={card.assignee.name}
              surname={card.assignee.surname}
              imageUrl={card.assignee.profile_image}
              size="xs"
              title={assigneeName}
              className="shrink-0"
            />
            <span className="truncate text-[11px] font-medium text-[var(--muted-strong)]">
              {assigneeName}
            </span>
          </div>
        ) : (
          <MetaChip
            className="max-w-[46%] shrink-0 rounded-full px-2.5"
            icon={(
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <path d="M8 8a2.25 2.25 0 1 0 0-4.5A2.25 2.25 0 0 0 8 8Zm-4.5 4.75a4.5 4.5 0 0 1 9 0" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          >
            {lt('Unassigned')}
          </MetaChip>
        )}
      </div>
    </div>
  )
}
