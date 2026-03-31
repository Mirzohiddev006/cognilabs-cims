import type {
  MemberDeliveryBonusRecord,
  MemberMistakeRecord,
} from '../../../shared/api/types'
import { getIntlLocale, translateCurrentLiteral } from '../../../shared/i18n/translations'
import { cn } from '../../../shared/lib/cn'
import { ActionsMenu } from '../../../shared/ui/actions-menu'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { formatDetailDate } from '../lib/salaryEstimates'

const lt = translateCurrentLiteral
const tr = (key: string, uzFallback: string, ruFallback: string) => {
  const value = lt(key)

  if (value !== key) {
    return value
  }

  const locale = getIntlLocale()

  if (locale.startsWith('ru')) {
    return ruFallback
  }

  if (locale.startsWith('en')) {
    return key
  }

  return uzFallback
}

function renderProjectLabel(projectName?: string | null, projectId?: number | null) {
  if (projectName?.trim()) {
    return projectName
  }

  if (typeof projectId === 'number' && projectId > 0) {
    return `${lt('Project')} #${projectId}`
  }

  return lt('No project')
}

function renderReviewerLabel(reviewerName?: string | null, reviewerId?: number | null) {
  if (reviewerName?.trim()) {
    return reviewerName
  }

  if (typeof reviewerId === 'number' && reviewerId > 0) {
    return `${lt('Reviewer')} #${reviewerId}`
  }

  return lt('Reviewer not set')
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
    <Card className={cn('relative overflow-hidden rounded-[24px] border border-[var(--danger-border)] bg-white p-6 dark:border-rose-500/18 dark:bg-[var(--card)]', className)}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,var(--danger-text),rgba(185,28,28,0.34),transparent_72%)] dark:bg-[linear-gradient(90deg,rgba(254,205,211,0.88),rgba(251,113,133,0.34),transparent_72%)]" />
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--danger-text)] dark:text-rose-200/90">
            {tr('Mistake incidents', 'Xato holatlari', 'Sluchai oshibok')}
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--foreground)]">
            {tr('Recorded compensation mistakes', 'Qayd etilgan kompensatsiya xatolari', 'Zafiksirovannye oshibki kompensatsii')}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={items.length > 0 ? 'danger' : 'outline'}>
            {items.length} {lt('entries')}
          </Badge>
          {editable && onAdd ? (
            <Button variant="ghost" size="sm" onClick={onAdd} className="rounded-xl text-[var(--danger-text)] hover:text-rose-700 dark:text-rose-100/88 dark:hover:text-white">
              {tr('Add mistake', 'Xato qoshish', 'Dobavit oshibku')}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {items.length > 0 ? items.map((item) => (
          <div key={`mistake-${item.id}`} className="rounded-[18px] border border-[var(--danger-border)] bg-rose-50/78 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:border-rose-500/18 dark:bg-black/15 dark:shadow-none">
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
                  {item.reached_client ? <Badge variant="danger">{lt('Reached client')}</Badge> : <Badge variant="outline">{lt('Internal only')}</Badge>}
                  {item.unclear_task ? <Badge variant="warning">{lt('Unclear task')}</Badge> : null}
                </div>
              </div>

              {editable && onEdit && onDelete ? (
                <div onClick={(event) => event.stopPropagation()}>
                  <ActionsMenu
                    label={`${lt('Open mistake actions for')} ${item.title}`}
                    items={[
                      { label: lt('Edit mistake'), onSelect: () => onEdit(item) },
                      { label: lt('Delete mistake'), onSelect: () => onDelete(item), tone: 'danger' },
                    ]}
                  />
                </div>
              ) : null}
            </div>
          </div>
        )) : (
          <div className="rounded-[18px] border border-dashed border-[var(--danger-border)] bg-rose-50/65 px-4 py-5 text-sm text-[var(--muted-strong)] dark:border-rose-500/18 dark:bg-black/10">
            {tr('No mistake incidents were returned for the selected month.', 'Tanlangan oy uchun xato holatlari qaytmadi.', 'Za vybrannyi mesyats zapisi ob oshibkakh ne vernulis.')}
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
    <Card className={cn('relative overflow-hidden rounded-[24px] border border-[var(--success-border)] bg-white p-6 dark:border-emerald-500/18 dark:bg-[var(--card)]', className)}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,#32a852,rgba(50,168,82,0.34),transparent_72%)] dark:bg-[linear-gradient(90deg,rgba(209,250,229,0.9),rgba(52,211,153,0.34),transparent_72%)]" />
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#32a852] dark:text-emerald-200/90">
            {tr('Delivery bonuses', 'Topshirish bonuslari', 'Bonusy za sdachu')}
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--foreground)]">
            {tr('Recorded delivery bonus events', 'Qayd etilgan topshirish bonuslari', 'Zafiksirovannye sobytiya bonusov za sdachu')}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={items.length > 0 ? 'success' : 'outline'}>
            {items.length} {lt('entries')}
          </Badge>
          {editable && onAdd ? (
            <Button variant="ghost" size="sm" onClick={onAdd} className="rounded-xl text-[#32a852] hover:text-emerald-700 dark:text-emerald-100/88 dark:hover:text-white">
              {tr('Add delivery bonus', 'Topshirish bonusini qoshish', 'Dobavit bonus za sdachu')}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {items.length > 0 ? items.map((item) => (
          <div key={`delivery-bonus-${item.id}`} className="rounded-[18px] border border-[var(--success-border)] bg-emerald-50/78 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:border-emerald-500/18 dark:bg-black/15 dark:shadow-none">
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
                    label={`${lt('Open delivery bonus actions for')} ${item.title}`}
                    items={[
                      { label: lt('Edit delivery bonus'), onSelect: () => onEdit(item) },
                      { label: lt('Delete delivery bonus'), onSelect: () => onDelete(item), tone: 'danger' },
                    ]}
                  />
                </div>
              ) : null}
            </div>
          </div>
        )) : (
          <div className="rounded-[18px] border border-dashed border-[var(--success-border)] bg-emerald-50/65 px-4 py-5 text-sm text-[var(--muted-strong)] dark:border-emerald-500/18 dark:bg-black/10">
            {tr('No delivery bonus records were returned for the selected month.', 'Tanlangan oy uchun topshirish bonuslari qaytmadi.', 'Za vybrannyi mesyats zapisi o bonusakh za sdachu ne vernulis.')}
          </div>
        )}
      </div>
    </Card>
  )
}
