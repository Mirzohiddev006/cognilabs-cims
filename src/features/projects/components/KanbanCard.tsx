import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '../../../shared/lib/cn'
import type { CardRecord } from '../../../shared/api/services/projects.service'
import { Avatar } from './Avatar'
import { PRIORITY_CONFIG, formatProjectDate, isDueDateOverdue, isDueDateSoon } from '../lib/format'

type KanbanCardProps = {
  card: CardRecord
  onEdit: (card: CardRecord) => void
  onDelete: (cardId: number) => void
  onClick: (card: CardRecord) => void
  isOverlay?: boolean
}

export function KanbanCard({ card, onEdit, onDelete, onClick, isOverlay }: KanbanCardProps) {
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
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const priority = card.priority ? PRIORITY_CONFIG[card.priority] : null
  const overdue  = card.due_date ? isDueDateOverdue(card.due_date) : false
  const soon     = card.due_date ? isDueDateSoon(card.due_date) : false
  const images = Array.isArray(card.images) ? card.images : []

  /* Drag ghost */
  if (isDragging && !isOverlay) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="h-[64px] w-full rounded-lg border-2 border-dashed border-white/10 bg-white/4"
      />
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(card)}
      className={cn(
        'group relative flex flex-col gap-2.5 rounded-lg p-3 cursor-pointer select-none',
        /* card surface — same token the app uses for elevated surfaces */
        'bg-[var(--surface-elevated)] border border-[var(--border)]',
        'shadow-[0_1px_2px_rgba(0,0,0,0.20)]',
        'transition-all duration-150',
        'hover:border-[var(--border-hover)] hover:shadow-[0_3px_10px_rgba(0,0,0,0.30)] hover:-translate-y-px',
        isOverlay && 'rotate-2 shadow-[0_16px_40px_rgba(0,0,0,0.55)] opacity-95',
      )}
    >
      {/* Title — main body */}
      <p className="text-[13px] font-medium leading-[1.4] text-[var(--foreground)] line-clamp-3 pr-8">
        {card.title}
      </p>

      {/* Footer: priority + due date left · assignee right */}
      <div className="flex items-center justify-between gap-2 min-h-[20px]">
        {/* Left chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {priority && (
            <span
              className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold leading-none"
              style={{
                background: `${priority.color}22`,
                color: priority.color,
              }}
            >
              {priority.label}
            </span>
          )}

          {card.due_date && (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium leading-none',
                overdue
                  ? 'bg-red-500/15 text-red-400'
                  : soon
                    ? 'bg-amber-500/15 text-amber-400'
                    : 'bg-white/6 text-white/40',
              )}
            >
              {overdue && (
                <svg viewBox="0 0 16 16" className="h-2.5 w-2.5" fill="currentColor" aria-hidden="true">
                  <path d="M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2Zm.75 3.25a.75.75 0 0 0-1.5 0V8a.75.75 0 0 0 .22.53l2 2a.75.75 0 1 0 1.06-1.06L8.75 7.94V5.25Z" />
                </svg>
              )}
              {formatProjectDate(card.due_date)}
            </span>
          )}

          {images.length > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-white/6 px-1.5 py-0.5 text-[10px] text-white/35">
              <svg viewBox="0 0 16 16" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 10.5 8 5.5a3 3 0 0 1 4.24 4.24l-5 5A1.5 1.5 0 0 1 5.12 12.64l5-5a.5.5 0 0 0-.71-.71l-5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {images.length}
            </span>
          )}
        </div>

        {/* Assignee avatar */}
        {card.assignee && (
          <Avatar
            name={card.assignee.name}
            surname={card.assignee.surname}
            size="xs"
            title={`${card.assignee.name} ${card.assignee.surname}`}
            className="shrink-0"
          />
        )}
      </div>

      {/* Hover quick-action icons (top-right) */}
      <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-1">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEdit(card) }}
          className="flex h-5 w-5 items-center justify-center rounded bg-[var(--accent-soft)] text-[var(--muted)] transition hover:text-[var(--foreground)]"
          aria-label="Edit card"
        >
          <svg viewBox="0 0 16 16" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m9.5 2.5 1 1L4 10H3v-1l6.5-6.5Z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(card.id) }}
          className="flex h-5 w-5 items-center justify-center rounded bg-red-500/10 text-red-400/60 transition hover:bg-red-500/25 hover:text-red-300"
          aria-label="Delete card"
        >
          <svg viewBox="0 0 16 16" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 4h10M6 4V2h4v2M5 4v9h6V4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
