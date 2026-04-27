import type {
  MemberDeliveryBonusRecord,
  MemberMistakeRecord,
} from '../../../shared/api/types'
import { getIntlLocale, translateCurrentLiteral } from '../../../shared/i18n/translations'
import { ActionsMenu } from '../../../shared/ui/actions-menu'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import { CardSection } from '../../../shared/ui/card'
import { DataTable } from '../../../shared/ui/data-table'
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
        <DataTable
          zebra
          className="rounded-none border-x-0 border-b-0"
          caption={tr('Mistake incidents table', 'Xatolar jadvali', 'Tablitsa oshibok')}
          rows={items}
          getRowKey={(row) => `mistake-${row.id}`}
          columns={[
            {
              key: 'title',
              header: tr('Title', 'Nomi', 'Nazvanie'),
              render: (row) => <span className="font-semibold text-[var(--foreground)]">{row.title}</span>,
            },
            {
              key: 'category',
              header: tr('Category', 'Kategoriya', 'Kategoriya'),
              render: (row) => row.category,
            },
            {
              key: 'severity',
              header: tr('Severity', 'Daraja', 'Stepen'),
              render: (row) => <span className="font-semibold text-[var(--danger-text)]">{row.severity}</span>,
            },
            {
              key: 'date',
              header: tr('Date', 'Sana', 'Data'),
              render: (row) => formatDetailDate(row.incident_date ?? row.created_at),
            },
            {
              key: 'project',
              header: tr('Project', 'Loyiha', 'Proekt'),
              render: (row) => renderProjectLabel(row.project_name, row.project_id),
            },
            {
              key: 'reviewer',
              header: tr('Reviewer', "Ko'rib chiquvchi", 'Proveryayushchiy'),
              render: (row) => renderReviewerLabel(row.reviewer_name, row.reviewer_id),
            },
            {
              key: 'flags',
              header: tr('Flags', 'Belgilar', 'Flagi'),
              render: (row) => (
                <div className="flex flex-wrap gap-1.5">
                  {row.reached_client ? <Badge variant="danger">{lt('Reached client')}</Badge> : <Badge variant="outline">{lt('Internal only')}</Badge>}
                  {row.unclear_task ? <Badge variant="warning">{lt('Unclear task')}</Badge> : null}
                </div>
              ),
            },
            {
              key: 'actions',
              header: tr('Actions', 'Amallar', 'Deystviya'),
              render: (row) => editable && onEdit && onDelete ? (
                <div onClick={(event) => event.stopPropagation()} className="shrink-0">
                  <ActionsMenu
                    label={`${lt('Open mistake actions for')} ${row.title}`}
                    items={[
                      { label: lt('Edit mistake'), onSelect: () => onEdit(row) },
                      { label: lt('Delete mistake'), onSelect: () => onDelete(row), tone: 'danger' },
                    ]}
                  />
                </div>
              ) : '-',
            },
          ]}
        />
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
        <DataTable
          zebra
          className="rounded-none border-x-0 border-b-0"
          caption={tr('Delivery bonus table', 'Topshirish bonuslari jadvali', 'Tablitsa bonusov za sdachu')}
          rows={items}
          getRowKey={(row) => `delivery-bonus-${row.id}`}
          columns={[
            {
              key: 'title',
              header: tr('Title', 'Nomi', 'Nazvanie'),
              render: (row) => <span className="font-semibold text-[var(--success-text)]">{row.title}</span>,
            },
            {
              key: 'type',
              header: tr('Type', 'Turi', 'Tip'),
              render: (row) => row.bonus_type,
            },
            {
              key: 'date',
              header: tr('Date', 'Sana', 'Data'),
              render: (row) => formatDetailDate(row.award_date ?? row.created_at),
            },
            {
              key: 'project',
              header: tr('Project', 'Loyiha', 'Proekt'),
              render: (row) => renderProjectLabel(row.project_name, row.project_id),
            },
            {
              key: 'description',
              header: tr('Description', 'Tavsif', 'Opisanie'),
              render: (row) => row.description || '-',
            },
            {
              key: 'actions',
              header: tr('Actions', 'Amallar', 'Deystviya'),
              render: (row) => editable && onEdit && onDelete ? (
                <div onClick={(event) => event.stopPropagation()} className="shrink-0">
                  <ActionsMenu
                    label={`${lt('Open delivery bonus actions for')} ${row.title}`}
                    items={[
                      { label: lt('Edit delivery bonus'), onSelect: () => onEdit(row) },
                      { label: lt('Delete delivery bonus'), onSelect: () => onDelete(row), tone: 'danger' },
                    ]}
                  />
                </div>
              ) : '-',
            },
          ]}
        />
      ) : (
        <p className="text-sm text-[var(--muted-strong)]">
          {tr('No delivery bonus records were returned for the selected month.', 'Tanlangan oy uchun topshirish bonuslari qaytmadi.', 'Za vybrannyi mesyats zapisi o bonusakh za sdachu ne vernulis.')}
        </p>
      )}
    </CardSection>
  )
}
