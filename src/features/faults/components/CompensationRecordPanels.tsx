import type {
  MemberDeliveryBonusRecord,
  MemberMistakeRecord,
} from '../../../shared/api/types'
import { getIntlLocale, translateCurrentLiteral } from '../../../shared/i18n/translations'
import { ActionsMenu } from '../../../shared/ui/actions-menu'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import { CardSection } from '../../../shared/ui/card'
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
    <CardSection
      className={className}
      title={tr('Recorded compensation mistakes', 'Qayd etilgan kompensatsiya xatolari', 'Zafiksirovannye oshibki kompensatsii')}
      headerAction={
        <>
          <Badge variant={items.length > 0 ? 'danger' : 'outline'}>
            {items.length} {lt('entries')}
          </Badge>
          {editable && onAdd ? (
            <Button variant="ghost" size="sm" onClick={onAdd} className="rounded-xl text-[var(--danger-text)]">
              {tr('Add mistake', 'Xato qoshish', 'Dobavit oshibku')}
            </Button>
          ) : null}
        </>
      }
    >
      {items.length > 0 ? (
        <ul className="divide-y divide-[var(--border)]">
          {items.map((item) => (
            <li key={`mistake-${item.id}`} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
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
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{formatDetailDate(item.incident_date ?? item.created_at)}</Badge>
                  <Badge variant="outline">{renderProjectLabel(item.project_name, item.project_id)}</Badge>
                  <Badge variant="outline">{renderReviewerLabel(item.reviewer_name, item.reviewer_id)}</Badge>
                  {item.reached_client ? <Badge variant="danger">{lt('Reached client')}</Badge> : <Badge variant="outline">{lt('Internal only')}</Badge>}
                  {item.unclear_task ? <Badge variant="warning">{lt('Unclear task')}</Badge> : null}
                </div>
              </div>

              {editable && onEdit && onDelete ? (
                <div onClick={(event) => event.stopPropagation()} className="shrink-0">
                  <ActionsMenu
                    label={`${lt('Open mistake actions for')} ${item.title}`}
                    items={[
                      { label: lt('Edit mistake'), onSelect: () => onEdit(item) },
                      { label: lt('Delete mistake'), onSelect: () => onDelete(item), tone: 'danger' },
                    ]}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--muted-strong)]">
          {tr('No mistake incidents were returned for the selected month.', 'Tanlangan oy uchun xato holatlari qaytmadi.', 'Za vybrannyi mesyats zapisi ob oshibkakh ne vernulis.')}
        </p>
      )}
    </CardSection>
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
    <CardSection
      className={className}
      title={tr('Recorded delivery bonus events', 'Qayd etilgan topshirish bonuslari', 'Zafiksirovannye sobytiya bonusov za sdachu')}
      headerAction={
        <>
          <Badge variant={items.length > 0 ? 'success' : 'outline'}>
            {items.length} {lt('entries')}
          </Badge>
          {editable && onAdd ? (
            <Button variant="ghost" size="sm" onClick={onAdd} className="rounded-xl font-semibold text-[var(--success-text)]">
              {tr('Add delivery bonus', 'Topshirish bonusini qoshish', 'Dobavit bonus za sdachu')}
            </Button>
          ) : null}
        </>
      }
    >
      {items.length > 0 ? (
        <ul className="divide-y divide-[var(--border)]">
          {items.map((item) => (
            <li key={`delivery-bonus-${item.id}`} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-[var(--success-text)]">{item.title}</p>
                  <Badge variant="success">{item.bonus_type}</Badge>
                </div>
                {item.description ? (
                  <p className="mt-2 text-xs leading-5 text-[var(--muted-strong)]">
                    {item.description}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{formatDetailDate(item.award_date ?? item.created_at)}</Badge>
                  <Badge variant="outline">{renderProjectLabel(item.project_name, item.project_id)}</Badge>
                </div>
              </div>

              {editable && onEdit && onDelete ? (
                <div onClick={(event) => event.stopPropagation()} className="shrink-0">
                  <ActionsMenu
                    label={`${lt('Open delivery bonus actions for')} ${item.title}`}
                    items={[
                      { label: lt('Edit delivery bonus'), onSelect: () => onEdit(item) },
                      { label: lt('Delete delivery bonus'), onSelect: () => onDelete(item), tone: 'danger' },
                    ]}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--muted-strong)]">
          {tr('No delivery bonus records were returned for the selected month.', 'Tanlangan oy uchun topshirish bonuslari qaytmadi.', 'Za vybrannyi mesyats zapisi o bonusakh za sdachu ne vernulis.')}
        </p>
      )}
    </CardSection>
  )
}
