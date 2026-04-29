import { useMemo } from 'react'
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { translateCurrentLiteral } from '../../../shared/i18n/translations'
import { cn } from '../../../shared/lib/cn'
import { ActionsMenu } from '../../../shared/ui/actions-menu'
import type { ColumnRecord, CardRecord } from '../../../shared/api/services/projects.service'
import { KanbanCard } from './KanbanCard'

type KanbanColumnProps = {
  column: ColumnRecord
  onAddCard: (columnId: number) => void
  onEditColumn: (column: ColumnRecord) => void
  onDeleteColumn: (columnId: number) => void
  onEditCard: (card: CardRecord) => void
  onDeleteCard: (cardId: number) => void
  onClickCard: (card: CardRecord) => void
  isOverlay?: boolean
  readOnly?: boolean
}

export function KanbanColumn({
  column,
  onAddCard,
  onEditColumn,
  onDeleteColumn,
  onEditCard,
  onDeleteCard,
  onClickCard,
  isOverlay,
  readOnly = false,
}: KanbanColumnProps) {
  const lt = translateCurrentLiteral
  const cardIds = useMemo(() => column.cards.map((c) => `card-${c.id}`), [column.cards])

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `col-${column.id}`,
    data: { type: 'column', column },
    disabled: readOnly,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex h-full w-[272px] shrink-0 flex-col rounded-xl',
        'bg-[rgba(255,255,255,0.06)] backdrop-blur-sm',
        'border border-white/[0.08]',
        'shadow-[0_2px_12px_rgba(0,0,0,0.25)]',
        isDragging && !isOverlay && 'opacity-30 scale-[0.98]',
        isOverlay && 'rotate-[1.5deg] opacity-95 shadow-[0_20px_48px_rgba(0,0,0,0.5)]',
      )}
    >
      {/* Color accent bar */}
      {column.color && (
        <div
          className="h-0.5 w-full rounded-t-xl"
          style={{ background: column.color }}
        />
      )}

      {/* Column header — drag handle */}
      <div
        className={cn(
          'flex items-center justify-between gap-2 px-3 py-2.5',
          readOnly ? 'select-none' : 'cursor-grab active:cursor-grabbing select-none',
        )}
        {...(!readOnly ? attributes : {})}
        {...(!readOnly ? listeners : {})}
      >
        <div className="flex items-center gap-2 min-w-0">
          {column.color && (
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: column.color }}
            />
          )}
          <h3 className="truncate text-xs font-semibold text-white/90 tracking-wide">
            {column.name}
          </h3>
          <span className="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[11px] font-bold text-white/50 leading-none">
            {column.cards.length}
          </span>
        </div>

        {!readOnly ? (
          <div onClick={(e) => e.stopPropagation()}>
            <ActionsMenu
              label={lt('Column actions')}
              items={[
                { label: lt('Edit column'), onSelect: () => onEditColumn(column) },
                { label: lt('Delete column'), tone: 'danger', onSelect: () => onDeleteColumn(column.id) },
              ]}
            />
          </div>
        ) : null}
      </div>

      {/* Cards scroll area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-1">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2 py-0.5">
            {column.cards.length === 0 ? (
              <button
                type="button"
                onClick={() => onAddCard(column.id)}
                className="flex min-h-[84px] w-full items-center justify-center rounded-xl border border-dashed border-white/12 bg-white/[0.03] px-3 py-5 text-center transition hover:border-white/25 hover:bg-white/[0.06]"
              >
                <span className="inline-flex items-center gap-2 text-xs font-medium text-white/55">
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M8 3v10M3 8h10" strokeLinecap="round" />
                  </svg>
                  {lt('Add a card')}
                </span>
              </button>
            ) : (
              column.cards.map((card) => (
                <KanbanCard
                  key={card.id}
                  card={card}
                  onEdit={onEditCard}
                  onDelete={onDeleteCard}
                  onClick={onClickCard}
                  readOnly={readOnly}
                />
              ))
            )}
          </div>
        </SortableContext>
      </div>

      {/* Add card button */}
      {!readOnly ? (
        <div className="px-2 pb-2 pt-1">
          <button
            type="button"
            onClick={() => onAddCard(column.id)}
            className="flex w-full items-center gap-2 rounded-xl border border-transparent bg-white/[0.04] px-3 py-2.5 text-xs font-medium text-white/55 transition hover:border-white/12 hover:bg-white/[0.08] hover:text-white/90"
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M8 3v10M3 8h10" strokeLinecap="round" />
            </svg>
            {lt('Add a card')}
          </button>
        </div>
      ) : null}
    </div>
  )
}
