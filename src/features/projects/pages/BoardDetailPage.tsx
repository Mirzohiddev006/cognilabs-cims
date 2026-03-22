import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import { StateBlock } from '../../../shared/ui/state-block'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { useToast } from '../../../shared/toast/useToast'
import { useConfirm } from '../../../shared/confirm/useConfirm'
import {
  projectsService,
  type ColumnRecord,
  type CardRecord,
} from '../../../shared/api/services/projects.service'
import { KanbanBoard } from '../components/KanbanBoard'
import { ColumnFormModal } from '../components/ColumnFormModal'
import { CardFormModal } from '../components/CardFormModal'
import { CardDetailModal } from '../components/CardDetailModal'
import { BoardFormModal } from '../components/BoardFormModal'
import { formatProjectDate } from '../lib/format'

type AddCardState = { columnId: number } | null
type EditCardState = { card: CardRecord } | null
type EditColumnState = { column: ColumnRecord } | null

export function BoardDetailPage() {
  const { boardId } = useParams<{ boardId: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { confirm } = useConfirm()

  const id = Number(boardId)

  const boardQuery = useAsyncData(
    () => projectsService.getBoard(id),
    [id],
    { enabled: !Number.isNaN(id) },
  )

  // Fetch ALL users for the assignee picker — not just board participants
  const usersQuery = useAsyncData(
    () => projectsService.getAllUsers(),
    [],
  )

  // Modals state
  const [isEditBoardOpen, setIsEditBoardOpen] = useState(false)
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false)
  const [editColumnState, setEditColumnState] = useState<EditColumnState>(null)
  const [addCardState, setAddCardState] = useState<AddCardState>(null)
  const [editCardState, setEditCardState] = useState<EditCardState>(null)
  const [detailCard, setDetailCard] = useState<CardRecord | null>(null)

  // Submission flags
  const [isBoardSubmitting, setIsBoardSubmitting] = useState(false)
  const [isColumnSubmitting, setIsColumnSubmitting] = useState(false)
  const [isCardSubmitting, setIsCardSubmitting] = useState(false)

  const board = boardQuery.data
  const allUsers = usersQuery.data ?? []

  // ─── Board actions ──────────────────────────────────────────────────────────

  async function handleUpdateBoard(values: { name: string; description?: string }) {
    if (!board) return
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
    if (!board) return
    const ok = await confirm({
      title: 'Archive board?',
      description: `"${board.name}" will be archived. All data is preserved.`,
      tone: 'danger',
    })
    if (!ok) return
    try {
      await projectsService.deleteBoard(board.id)
      showToast({ title: 'Board archived', tone: 'success' })
      navigate(`/projects/${board.project_id}`)
    } catch {
      showToast({ title: 'Failed to archive board', tone: 'error' })
    }
  }

  // ─── Column actions ─────────────────────────────────────────────────────────

  async function handleCreateColumn(values: { name: string; color: string }) {
    if (!board) return
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
    if (!editColumnState) return
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
    const ok = await confirm({
      title: 'Delete column?',
      description: 'All cards in this column will also be deleted.',
      tone: 'danger',
    })
    if (!ok) return
    try {
      await projectsService.deleteColumn(columnId)
      showToast({ title: 'Column deleted', tone: 'success' })
      await boardQuery.refetch()
    } catch {
      showToast({ title: 'Failed to delete column', tone: 'error' })
    }
  }

  // ─── Card actions ───────────────────────────────────────────────────────────

  async function handleCreateCard(fd: FormData) {
    if (!addCardState) return
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
    if (!editCardState) return
    setIsCardSubmitting(true)
    try {
      await projectsService.updateCard(editCardState.card.id, fd)
      showToast({ title: 'Card updated', tone: 'success' })
      setEditCardState(null)
      if (detailCard?.id === editCardState.card.id) setDetailCard(null)
      await boardQuery.refetch()
    } catch {
      showToast({ title: 'Failed to update card', tone: 'error' })
    } finally {
      setIsCardSubmitting(false)
    }
  }

  async function handleDeleteCard(cardId: number) {
    const ok = await confirm({
      title: 'Delete card?',
      description: 'This card will be permanently removed.',
      tone: 'danger',
    })
    if (!ok) return
    try {
      await projectsService.deleteCard(cardId)
      showToast({ title: 'Card deleted', tone: 'success' })
      if (detailCard?.id === cardId) setDetailCard(null)
      await boardQuery.refetch()
    } catch {
      showToast({ title: 'Failed to delete card', tone: 'error' })
    }
  }

  // ─── DnD callbacks ──────────────────────────────────────────────────────────

  async function handleMoveCard(cardId: number, columnId: number, order: number) {
    try {
      await projectsService.moveCard(cardId, columnId, order)
    } catch {
      showToast({ title: 'Failed to move card — changes reverted.', tone: 'error' })
      throw new Error('moveCard failed')
    }
  }

  async function handleMoveColumn(columnId: number, order: number) {
    try {
      await projectsService.moveColumn(columnId, order)
    } catch {
      showToast({ title: 'Failed to reorder column — changes reverted.', tone: 'error' })
      throw new Error('moveColumn failed')
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (boardQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-14 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)]" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
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
      {/*
        The board page breaks out of the standard page padding intentionally —
        it needs edge-to-edge horizontal scroll like a real kanban board.
        We use negative margins to cancel out the parent padding.
      */}
      <div
        className="flex flex-col"
        style={{ height: 'calc(100vh - 88px)', margin: '0 -1rem' }}
      >
        {/* ── Board header ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--shell-header-bg)] px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="flex flex-col gap-0.5 min-w-0">
            <Link
              to={`/projects/${board.project_id}`}
              className="inline-flex w-fit items-center gap-1 text-[10px] text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
            >
              <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M10 4L6 8l4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back to project
            </Link>

            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-sm font-semibold tracking-tight text-[var(--foreground)]">
                {board.name}
              </h1>
              {board.is_archived && (
                <Badge variant="secondary" size="sm" dot>Archived</Badge>
              )}
              {board.description && (
                <span className="hidden text-xs text-[var(--muted)] sm:block truncate max-w-xs">
                  {board.description}
                </span>
              )}
            </div>

            <p className="text-[10px] text-[var(--muted)]">
              {board.columns.length} columns · {board.columns.reduce((s, c) => s + c.cards.length, 0)} cards · Updated {formatProjectDate(board.updated_at)}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsAddColumnOpen(true)}
              leftIcon={
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M8 3v10M3 8h10" strokeLinecap="round" />
                </svg>
              }
            >
              Add column
            </Button>
            {!board.is_archived && (
              <Button variant="ghost" size="sm" onClick={() => setIsEditBoardOpen(true)}>
                Edit
              </Button>
            )}
            {!board.is_archived && (
              <Button variant="danger" size="sm" onClick={handleArchiveBoard}>
                Archive
              </Button>
            )}
          </div>
        </div>

        {/* ── Board canvas ──────────────────────────────────────────────────── */}
        {board.columns.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <StateBlock
              tone="empty"
              eyebrow="Empty board"
              title="No columns yet"
              description="Add your first column to start organizing cards."
              actionLabel="Add column"
              onAction={() => setIsAddColumnOpen(true)}
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
              onEditColumn={(col) => setEditColumnState({ column: col })}
              onDeleteColumn={handleDeleteColumn}
              onAddColumn={() => setIsAddColumnOpen(true)}
            />
          </div>
        )}
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────── */}
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

      <CardDetailModal
        card={detailCard}
        open={detailCard !== null}
        onClose={() => setDetailCard(null)}
        onEdit={() => {
          if (detailCard) {
            setEditCardState({ card: detailCard })
            setDetailCard(null)
          }
        }}
        onDelete={() => {
          if (detailCard) {
            setDetailCard(null)
            handleDeleteCard(detailCard.id)
          }
        }}
        boardName={board.name}
      />
    </>
  )
}
