import type {
  MemberDeliveryBonusRecord,
  MemberMistakeRecord,
} from '../../../shared/api/types'
import { cn } from '../../../shared/lib/cn'
import { ActionsMenu } from '../../../shared/ui/actions-menu'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { formatDetailDate } from '../lib/salaryEstimates'

function renderProjectLabel(projectName?: string | null, projectId?: number | null) {
  if (projectName?.trim()) {
    return projectName
  }

  if (typeof projectId === 'number' && projectId > 0) {
    return `Project #${projectId}`
  }

  return 'No project'
}

function renderReviewerLabel(reviewerName?: string | null, reviewerId?: number | null) {
  if (reviewerName?.trim()) {
    return reviewerName
  }

  if (typeof reviewerId === 'number' && reviewerId > 0) {
    return `Reviewer #${reviewerId}`
  }

  return 'Reviewer not set'
}

type MistakeIncidentSectionProps = {
  items: MemberMistakeRecord[]
  editable?: boolean
  onAdd?: () => void
  onEdit?: (item: MemberMistakeRecord) => void
  onDelete?: (item: MemberMistakeRecord) => void
  className?: string
}

export function MistakeIncidentSection({
  items,
  editable = false,
  onAdd,
  onEdit,
  onDelete,
  className,
}: MistakeIncidentSectionProps) {
  return (
    <Card className={cn('rounded-[24px] border-rose-500/18 bg-[var(--card)] p-6', className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-rose-500 dark:text-rose-200/70">
            Mistake incidents
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--foreground)]">
            Recorded compensation mistakes
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={items.length > 0 ? 'danger' : 'outline'}>
            {items.length} entries
          </Badge>
          {editable && onAdd ? (
            <Button variant="ghost" size="sm" onClick={onAdd} className="rounded-xl text-rose-600 hover:text-rose-700 dark:text-rose-100/88 dark:hover:text-white">
              Add mistake
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {items.length > 0 ? items.map((item) => (
          <div key={`mistake-${item.id}`} className="rounded-[18px] border border-rose-500/18 bg-white/70 px-4 py-4 dark:bg-black/15">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-[var(--foreground)]">{item.title}</p>
                  <Badge variant="outline">{item.category}</Badge>
                  <Badge variant="danger">{item.severity}</Badge>
                </div>
                {item.description ? (
                  <p className="mt-2 text-xs leading-5 text-[var(--muted-strong)]">
                    {item.description}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{formatDetailDate(item.incident_date ?? item.created_at)}</Badge>
                  <Badge variant="outline">{renderProjectLabel(item.project_name, item.project_id)}</Badge>
                  <Badge variant="outline">{renderReviewerLabel(item.reviewer_name, item.reviewer_id)}</Badge>
                  {item.reached_client ? <Badge variant="danger">Reached client</Badge> : <Badge variant="outline">Internal only</Badge>}
                  {item.unclear_task ? <Badge variant="warning">Unclear task</Badge> : null}
                </div>
              </div>

              {editable && onEdit && onDelete ? (
                <div onClick={(event) => event.stopPropagation()}>
                  <ActionsMenu
                    label={`Open mistake actions for ${item.title}`}
                    items={[
                      { label: 'Edit mistake', onSelect: () => onEdit(item) },
                      { label: 'Delete mistake', onSelect: () => onDelete(item), tone: 'danger' },
                    ]}
                  />
                </div>
              ) : null}
            </div>
          </div>
        )) : (
          <div className="rounded-[18px] border border-dashed border-rose-500/18 bg-rose-500/5 px-4 py-5 text-sm text-[var(--muted-strong)] dark:bg-black/10">
            No mistake incidents were returned for the selected month.
          </div>
        )}
      </div>
    </Card>
  )
}

type DeliveryBonusSectionProps = {
  items: MemberDeliveryBonusRecord[]
  editable?: boolean
  onAdd?: () => void
  onEdit?: (item: MemberDeliveryBonusRecord) => void
  onDelete?: (item: MemberDeliveryBonusRecord) => void
  className?: string
}

export function DeliveryBonusSection({
  items,
  editable = false,
  onAdd,
  onEdit,
  onDelete,
  className,
}: DeliveryBonusSectionProps) {
  return (
    <Card className={cn('rounded-[24px] border-emerald-500/18 bg-[var(--card)] p-6', className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-600 dark:text-emerald-200/70">
            Delivery bonuses
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--foreground)]">
            Recorded delivery bonus events
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={items.length > 0 ? 'success' : 'outline'}>
            {items.length} entries
          </Badge>
          {editable && onAdd ? (
            <Button variant="ghost" size="sm" onClick={onAdd} className="rounded-xl text-emerald-600 hover:text-emerald-700 dark:text-emerald-100/88 dark:hover:text-white">
              Add delivery bonus
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {items.length > 0 ? items.map((item) => (
          <div key={`delivery-bonus-${item.id}`} className="rounded-[18px] border border-emerald-500/18 bg-white/70 px-4 py-4 dark:bg-black/15">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-[var(--foreground)]">{item.title}</p>
                  <Badge variant="success">{item.bonus_type}</Badge>
                </div>
                {item.description ? (
                  <p className="mt-2 text-xs leading-5 text-[var(--muted-strong)]">
                    {item.description}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{formatDetailDate(item.award_date ?? item.created_at)}</Badge>
                  <Badge variant="outline">{renderProjectLabel(item.project_name, item.project_id)}</Badge>
                </div>
              </div>

              {editable && onEdit && onDelete ? (
                <div onClick={(event) => event.stopPropagation()}>
                  <ActionsMenu
                    label={`Open delivery bonus actions for ${item.title}`}
                    items={[
                      { label: 'Edit delivery bonus', onSelect: () => onEdit(item) },
                      { label: 'Delete delivery bonus', onSelect: () => onDelete(item), tone: 'danger' },
                    ]}
                  />
                </div>
              ) : null}
            </div>
          </div>
        )) : (
          <div className="rounded-[18px] border border-dashed border-emerald-500/18 bg-emerald-500/5 px-4 py-5 text-sm text-[var(--muted-strong)] dark:bg-black/10">
            No delivery bonus records were returned for the selected month.
          </div>
        )}
      </div>
    </Card>
  )
}
