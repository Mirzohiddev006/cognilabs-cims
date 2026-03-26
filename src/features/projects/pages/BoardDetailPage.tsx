import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import { StateBlock } from '../../../shared/ui/state-block'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { useToast } from '../../../shared/toast/useToast'
import { useConfirm } from '../../../shared/confirm/useConfirm'
import {
  projectsService,
  type BoardDetail,
  type CardRecord,
  type ColumnRecord,
} from '../../../shared/api/services/projects.service'
import { useAuth } from '../../auth/hooks/useAuth'
import { BoardFormModal } from '../components/BoardFormModal'
import { CardDetailModal } from '../components/CardDetailModal'
import { CardFormModal } from '../components/CardFormModal'
import { ColumnFormModal } from '../components/ColumnFormModal'
import { KanbanBoard } from '../components/KanbanBoard'
import { formatProjectDate } from '../lib/format'

type AddCardState = { columnId: number } | null
type EditCardState = { card: CardRecord } | null
type EditColumnState = { column: ColumnRecord } | null

function moveCardInBoard(board: BoardDetail, cardId: number, columnId: number, order: number): BoardDetail {
  const sourceColumnIndex = board.columns.findIndex((column) => column.cards.some((card) => card.id === cardId))
  const targetColumnIndex = board.columns.findIndex((column) => column.id === columnId)

  if (sourceColumnIndex === -1 || targetColumnIndex === -1) {
    return board
  }

  const sourceColumn = board.columns[sourceColumnIndex]
  const sourceCardIndex = sourceColumn.cards.findIndex((card) => card.id === cardId)

  if (sourceCardIndex === -1) {
    return board
  }

  const movedCard = sourceColumn.cards[sourceCardIndex]
  const nextColumns = board.columns.map((column) => ({
    ...column,
    cards: [...column.cards],
  }))

  nextColumns[sourceColumnIndex].cards.splice(sourceCardIndex, 1)

  const targetCards = nextColumns[targetColumnIndex].cards
  const nextOrder = Math.max(0, Math.min(order, targetCards.length))
  targetCards.splice(nextOrder, 0, {
    ...movedCard,
    column_id: columnId,
    order: nextOrder,
  })

  return {
    ...board,
    columns: nextColumns.map((column) => ({
      ...column,
      cards: column.cards.map((card, index) => ({
        ...card,
        column_id: column.id,
        order: index,
      })),
    })),
  }
}

function moveColumnInBoard(board: BoardDetail, columnId: number, order: number): BoardDetail {
  const sourceIndex = board.columns.findIndex((column) => column.id === columnId)

  if (sourceIndex === -1) {
    return board
  }

  const targetIndex = Math.max(0, Math.min(order, board.columns.length - 1))

  if (sourceIndex === targetIndex) {
    return board
  }

  const nextColumns = [...board.columns]
  const [movedColumn] = nextColumns.splice(sourceIndex, 1)
  nextColumns.splice(targetIndex, 0, movedColumn)

  return {
    ...board,
    columns: nextColumns.map((column, index) => ({
      ...column,
      order: index,
    })),
  }
}

function parseProjectId(rawValue: string | null) {
  if (!rawValue) {
    return null
  }

  const parsed = Number(rawValue)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function BoardDetailPage() {
  const { boardId } = useParams<{ boardId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { confirm } = useConfirm()
  const { user, hasPermission } = useAuth()

  const id = Number(boardId)
  const canManageProjects = hasPermission('projects')
  const openProjectId = useMemo(() => parseProjectId(searchParams.get('project')), [searchParams])

  const boardQuery = useAsyncData(
    async () => {
      if (!user) {
        throw new Error('User session is unavailable')
      }

      return canManageProjects
        ? projectsService.getBoard(id)
        : projectsService.getUserOpenBoardDetail(id, user.id, openProjectId)
    },
    [id, canManageProjects, openProjectId, user?.id],
    { enabled: !Number.isNaN(id) && Boolean(user) },
  )

  const usersQuery = useAsyncData(
    () => projectsService.getAllUsers(),
    [],
    { enabled: canManageProjects },
  )

  const [isEditBoardOpen, setIsEditBoardOpen] = useState(false)
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false)
  const [editColumnState, setEditColumnState] = useState<EditColumnState>(null)
  const [addCardState, setAddCardState] = useState<AddCardState>(null)
  const [editCardState, setEditCardState] = useState<EditCardState>(null)
  const [detailCard, setDetailCard] = useState<CardRecord | null>(null)

  const [isBoardSubmitting, setIsBoardSubmitting] = useState(false)
  const [isColumnSubmitting, setIsColumnSubmitting] = useState(false)
  const [isCardSubmitting, setIsCardSubmitting] = useState(false)

  const board = boardQuery.data
  const allUsers = canManageProjects ? usersQuery.data ?? [] : []

  async function handleUpdateBoard(values: { name: string; description?: string }) {
    if (!canManageProjects || !board) {
      return
    }

    setIsBoardSubmitting(true)
    try {
      await projectsService.updateBoard(board.id, values)
      showToast({ title: 'Board updated', tone: 'success' })
      setIsEditBoardOpen(false)
      await boardQuery.refetch()
    } catch {
      showToast({ title: 'Failed to update board', tone: 'error' })
    } finally {
      setIsBoardSubmitting(false)
    }
  }

  async function handleArchiveBoard() {
    if (!canManageProjects || !board) {
      return
    }

    const ok = await confirm({
      title: 'Archive board?',
      description: `"${board.name}" will be archived. All data is preserved.`,
      tone: 'danger',
    })

    if (!ok) {
      return
    }

    try {
      await projectsService.deleteBoard(board.id)
      showToast({ title: 'Board archived', tone: 'success' })
      navigate(`/projects/${board.project_id}`)
    } catch {
      showToast({ title: 'Failed to archive board', tone: 'error' })
    }
  }

  async function handleCreateColumn(values: { name: string; color: string }) {
    if (!canManageProjects || !board) {
      return
    }

    setIsColumnSubmitting(true)
    try {
      await projectsService.createColumn(board.id, values)
      showToast({ title: 'Column added', tone: 'success' })
      setIsAddColumnOpen(false)
      await boardQuery.refetch()
    } catch {
      showToast({ title: 'Failed to create column', tone: 'error' })
    } finally {
      setIsColumnSubmitting(false)
    }
  }

  async function handleUpdateColumn(values: { name: string; color: string }) {
    if (!canManageProjects || !editColumnState) {
      return
    }

    setIsColumnSubmitting(true)
    try {
      await projectsService.updateColumn(editColumnState.column.id, values)
      showToast({ title: 'Column updated', tone: 'success' })
      setEditColumnState(null)
      await boardQuery.refetch()
    } catch {
      showToast({ title: 'Failed to update column', tone: 'error' })
    } finally {
      setIsColumnSubmitting(false)
    }
  }

  async function handleDeleteColumn(columnId: number) {
    if (!canManageProjects) {
      return
    }

    const ok = await confirm({
      title: 'Delete column?',
      description: 'All cards in this column will also be deleted.',
      tone: 'danger',
    })

    if (!ok) {
      return
    }

    try {
      await projectsService.deleteColumn(columnId)
      showToast({ title: 'Column deleted', tone: 'success' })
      await boardQuery.refetch()
    } catch {
      showToast({ title: 'Failed to delete column', tone: 'error' })
    }
  }

  async function handleCreateCard(fd: FormData) {
    if (!canManageProjects || !addCardState) {
      return
    }

    setIsCardSubmitting(true)
    try {
      await projectsService.createCard(addCardState.columnId, fd)
      showToast({ title: 'Card created', tone: 'success' })
      setAddCardState(null)
      await boardQuery.refetch()
    } catch {
      showToast({ title: 'Failed to create card', tone: 'error' })
    } finally {
      setIsCardSubmitting(false)
    }
  }

  async function handleUpdateCard(fd: FormData) {
    if (!canManageProjects || !editCardState) {
      return
    }

    setIsCardSubmitting(true)
    try {
      await projectsService.updateCard(editCardState.card.id, fd)
      showToast({ title: 'Card updated', tone: 'success' })
      setEditCardState(null)
      if (detailCard?.id === editCardState.card.id) {
        setDetailCard(null)
      }
      await boardQuery.refetch()
    } catch {
      showToast({ title: 'Failed to update card', tone: 'error' })
    } finally {
      setIsCardSubmitting(false)
    }
  }

  async function handleDeleteCard(cardId: number) {
    if (!canManageProjects) {
      return
    }

    const ok = await confirm({
      title: 'Delete card?',
      description: 'This card will be permanently removed.',
      tone: 'danger',
    })

    if (!ok) {
      return
    }

    try {
      await projectsService.deleteCard(cardId)
      showToast({ title: 'Card deleted', tone: 'success' })
      if (detailCard?.id === cardId) {
        setDetailCard(null)
      }
      await boardQuery.refetch()
    } catch {
      showToast({ title: 'Failed to delete card', tone: 'error' })
    }
  }

  async function handleMoveCard(cardId: number, columnId: number, order: number) {
    if (!canManageProjects) {
      return
    }

    try {
      await projectsService.moveCard(cardId, columnId, order)
      boardQuery.setData((current) => (current ? moveCardInBoard(current, cardId, columnId, order) : current))
    } catch {
      showToast({ title: 'Failed to move card, changes reverted.', tone: 'error' })
      await boardQuery.refetch()
      throw new Error('moveCard failed')
    }
  }

  async function handleMoveColumn(columnId: number, order: number) {
    if (!canManageProjects) {
      return
    }

    try {
      await projectsService.moveColumn(columnId, order)
      boardQuery.setData((current) => (current ? moveColumnInBoard(current, columnId, order) : current))
    } catch {
      showToast({ title: 'Failed to reorder column, changes reverted.', tone: 'error' })
      await boardQuery.refetch()
      throw new Error('moveColumn failed')
    }
  }

  if (boardQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-14 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)]" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-[calc(100vh-200px)] w-72 shrink-0 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)]"
            />
          ))}
        </div>
      </div>
    )
  }

  if (boardQuery.isError || !board) {
    return (
      <StateBlock
        tone="error"
        eyebrow="Error"
        title="Failed to load board"
        description="The board could not be found or an error occurred."
        actionLabel="Go back"
        onAction={() => navigate(-1)}
      />
    )
  }

  return (
    <>
      <div className="flex flex-col md:-mx-6 lg:-mx-8" style={{ height: 'calc(100dvh - 88px)' }}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--shell-header-bg)] px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="min-w-0 flex flex-col gap-0.5">
            <Link
              to={`/projects/${board.project_id}`}
              className="inline-flex w-fit items-center gap-1 text-[10px] text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
            >
              <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M10 4L6 8l4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back to project
            </Link>

            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-sm font-semibold tracking-tight text-[var(--foreground)]">
                {board.name}
              </h1>
              {board.is_archived ? (
                <Badge variant="secondary" size="sm" dot>
                  Archived
                </Badge>
              ) : null}
              {board.description ? (
                <span className="hidden max-w-xs truncate text-xs text-[var(--muted)] sm:block">
                  {board.description}
                </span>
              ) : null}
            </div>

            <p className="text-[10px] text-[var(--muted)]">
              {board.columns.length} columns · {board.columns.reduce((sum, column) => sum + column.cards.length, 0)} cards · Updated {formatProjectDate(board.updated_at)}
            </p>
          </div>

          {canManageProjects ? (
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsAddColumnOpen(true)}
                leftIcon={(
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M8 3v10M3 8h10" strokeLinecap="round" />
                  </svg>
                )}
              >
                Add column
              </Button>
              {!board.is_archived ? (
                <Button variant="ghost" size="sm" onClick={() => setIsEditBoardOpen(true)}>
                  Edit
                </Button>
              ) : null}
              {!board.is_archived ? (
                <Button variant="danger" size="sm" onClick={handleArchiveBoard}>
                  Archive
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        {board.columns.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <StateBlock
              tone="empty"
              eyebrow="Empty board"
              title="No columns yet"
              description={
                canManageProjects
                  ? 'Add your first column to start organizing cards.'
                  : 'This board has no visible columns yet.'
              }
              actionLabel={canManageProjects ? 'Add column' : undefined}
              onAction={canManageProjects ? () => setIsAddColumnOpen(true) : undefined}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <KanbanBoard
              columns={board.columns}
              members={allUsers}
              onMoveCard={handleMoveCard}
              onMoveColumn={handleMoveColumn}
              onAddCard={(columnId) => setAddCardState({ columnId })}
              onEditCard={(card) => setEditCardState({ card })}
              onDeleteCard={handleDeleteCard}
              onClickCard={(card) => setDetailCard(card)}
              onEditColumn={(column) => setEditColumnState({ column })}
              onDeleteColumn={handleDeleteColumn}
              onAddColumn={() => setIsAddColumnOpen(true)}
              readOnly={!canManageProjects}
            />
          </div>
        )}
      </div>

      {canManageProjects ? (
        <>
          <BoardFormModal
            open={isEditBoardOpen}
            onClose={() => setIsEditBoardOpen(false)}
            onSubmit={handleUpdateBoard}
            initial={board}
            title="Edit board"
            submitLabel="Save changes"
            isSubmitting={isBoardSubmitting}
          />

          <ColumnFormModal
            open={isAddColumnOpen}
            onClose={() => setIsAddColumnOpen(false)}
            onSubmit={handleCreateColumn}
            title="Add column"
            submitLabel="Add column"
            isSubmitting={isColumnSubmitting}
          />

          <ColumnFormModal
            open={editColumnState !== null}
            onClose={() => setEditColumnState(null)}
            onSubmit={handleUpdateColumn}
            initial={editColumnState?.column ?? null}
            title="Edit column"
            submitLabel="Save changes"
            isSubmitting={isColumnSubmitting}
          />

          <CardFormModal
            open={addCardState !== null}
            onClose={() => setAddCardState(null)}
            onSubmit={handleCreateCard}
            members={allUsers}
            title="Create card"
            submitLabel="Create card"
            isSubmitting={isCardSubmitting}
          />

          <CardFormModal
            open={editCardState !== null}
            onClose={() => setEditCardState(null)}
            onSubmit={handleUpdateCard}
            initial={editCardState?.card ?? null}
            members={allUsers}
            title="Edit card"
            submitLabel="Save changes"
            isSubmitting={isCardSubmitting}
          />
        </>
      ) : null}

      <CardDetailModal
        card={detailCard}
        open={detailCard !== null}
        onClose={() => setDetailCard(null)}
        onEdit={() => {
          if (detailCard && canManageProjects) {
            setEditCardState({ card: detailCard })
            setDetailCard(null)
          }
        }}
        onDelete={() => {
          if (detailCard && canManageProjects) {
            setDetailCard(null)
            void handleDeleteCard(detailCard.id)
          }
        }}
        boardName={board.name}
        canManage={canManageProjects}
      />
    </>
  )
}
