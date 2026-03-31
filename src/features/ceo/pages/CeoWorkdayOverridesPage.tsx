import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  updateTrackingService,
  type WorkdayOverrideDayType,
  type WorkdayOverrideMemberOption,
  type WorkdayOverrideRecord,
} from '../../../shared/api/services/updateTracking.service'
import { useConfirm } from '../../../shared/confirm/useConfirm'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { getIntlLocale, translateCurrentLiteral } from '../../../shared/i18n/translations'
import { getApiErrorMessage } from '../../../shared/lib/api-error'
import { cn } from '../../../shared/lib/cn'
import { formatShortDate } from '../../../shared/lib/format'
import { useToast } from '../../../shared/toast/useToast'
import { ActionsMenu } from '../../../shared/ui/actions-menu'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { Dialog } from '../../../shared/ui/dialog'
import { Input } from '../../../shared/ui/input'
import { MemberAvatar as SharedMemberAvatar } from '../../../shared/ui/member-avatar'
import { SelectField } from '../../../shared/ui/select-field'
import { SectionTitle } from '../../../shared/ui/section-title'
import { ErrorStateBlock, LoadingStateBlock } from '../../../shared/ui/state-block'
import { Textarea } from '../../../shared/ui/textarea'

const now = new Date()

const DAY_TYPE_OPTIONS = [
  { value: 'holiday', label: 'Holiday' },
  { value: 'short_day', label: 'Short Day' },
] as const
const lt = translateCurrentLiteral

type OverrideFormState = {
  specialDate: string
  dayType: WorkdayOverrideDayType
  title: string
  note: string
  appliesToAll: boolean
  memberIds: number[]
  workdayHours: string
  updateRequired: boolean
}

function getMonthName(month: number): string {
  return new Intl.DateTimeFormat(getIntlLocale(), { month: 'long' }).format(new Date(2024, month - 1))
}

function formatDateInput(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateTime(value: string) {
  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(getIntlLocale(), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed)
}

function normalizeDayType(value: string | null | undefined): WorkdayOverrideDayType {
  const normalized = value?.trim().toLowerCase().replace(/\s+/g, '_')
  return normalized === 'short_day' ? 'short_day' : 'holiday'
}

function getOverrideTypeLabel(dayType: string | null | undefined) {
  return normalizeDayType(dayType) === 'short_day' ? lt('Short Day') : lt('Holiday')
}

function getTypeBadgeVariant(dayType: string | null | undefined) {
  return normalizeDayType(dayType) === 'short_day' ? 'blue' : 'warning'
}

function getOverrideTargetLabel(item: WorkdayOverrideRecord) {
  if (item.target_type === 'all') {
    return lt('All members')
  }

  return item.member_name?.trim() || (item.member_id ? `${lt('Member')} #${item.member_id}` : lt('Specific member'))
}

function createDefaultFormState(month: number, year: number): OverrideFormState {
  return {
    specialDate: formatDateInput(new Date(year, month - 1, 1)),
    dayType: 'holiday',
    title: '',
    note: '',
    appliesToAll: true,
    memberIds: [],
    workdayHours: '',
    updateRequired: false,
  }
}

function createFormStateFromOverride(item: WorkdayOverrideRecord): OverrideFormState {
  return {
    specialDate: item.special_date,
    dayType: normalizeDayType(item.day_type),
    title: item.title ?? '',
    note: item.note ?? '',
    appliesToAll: item.target_type === 'all',
    memberIds: item.member_id ? [item.member_id] : [],
    workdayHours: item.workday_hours ?? '',
    updateRequired: item.update_required,
  }
}

function SummaryCard({
  label,
  value,
  hint,
  accent = 'default',
}: {
  label: string
  value: string | number
  hint?: string
  accent?: 'default' | 'warning' | 'blue' | 'success'
}) {
  const accentClassName = {
    default: 'border-[var(--border)] bg-white dark:border-white/8 dark:bg-white/[0.03]',
    warning: 'border-amber-500/18 bg-amber-50 dark:bg-amber-500/[0.06]',
    blue: 'border-blue-500/18 bg-blue-50 dark:bg-blue-500/[0.06]',
    success: 'border-emerald-500/18 bg-emerald-50 dark:bg-emerald-500/[0.06]',
  } as const

  return (
    <div className={cn('rounded-[22px] border px-5 py-4', accentClassName[accent])}>
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-(--muted)">{label}</p>
      <p className="mt-3 text-[1.75rem] font-semibold tracking-tight text-[var(--foreground)] dark:text-white">{value}</p>
      {hint ? <p className="mt-2 text-xs text-[var(--muted-strong)]">{hint}</p> : null}
    </div>
  )
}

function MemberAvatar({ member }: { member: WorkdayOverrideMemberOption }) {
  return (
    <SharedMemberAvatar
      name={member.name}
      surname={member.surname}
      imageUrl={member.profile_image}
      size="sm"
      className="shadow-md"
      title={member.full_name || `${member.name} ${member.surname}`}
    />
  )
}

function MemberPicker({
  members,
  selectedIds,
  onChange,
  multiple = true,
}: {
  members: WorkdayOverrideMemberOption[]
  selectedIds: number[]
  onChange: (ids: number[]) => void
  multiple?: boolean
}) {
  const [search, setSearch] = useState('')

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) {
      return members
    }

    return members.filter((member) =>
      [member.full_name, member.name, member.surname, member.role, member.telegram_id]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    )
  }, [members, search])

  const selectedMembers = useMemo(
    () => members.filter((member) => selectedIds.includes(member.id)),
    [members, selectedIds],
  )

  function toggle(memberId: number) {
    if (selectedIds.includes(memberId)) {
      onChange(selectedIds.filter((id) => id !== memberId))
      return
    }

    onChange(multiple ? [...selectedIds, memberId] : [memberId])
  }

  return (
    <div className="space-y-3">
      {selectedMembers.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedMembers.map((member) => (
            <button
              key={`chip-${member.id}`}
              type="button"
              onClick={() => toggle(member.id)}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-2.5 py-1 text-[11px] text-[var(--foreground)] transition hover:border-[var(--border-hover)] hover:bg-[var(--card-hover)] dark:border-white/10 dark:bg-white/[0.05] dark:text-white/78 dark:hover:border-white/15 dark:hover:bg-white/[0.08]"
            >
              <MemberAvatar member={member} />
              <span>{member.full_name || `${member.name} ${member.surname}`}</span>
            </button>
          ))}
        </div>
      ) : null}

        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={multiple ? lt('Search members to include') : lt('Search member')}
        />

      <div className="max-h-56 overflow-y-auto rounded-[18px] border border-[var(--border)] bg-white dark:border-white/10 dark:bg-black/20">
        {filteredMembers.length > 0 ? filteredMembers.map((member) => {
          const selected = selectedIds.includes(member.id)

          return (
            <button
              key={member.id}
              type="button"
              onClick={() => toggle(member.id)}
              className={cn(
                'flex w-full items-center gap-3 border-b border-white/6 px-3 py-2.5 text-left transition last:border-b-0',
                selected ? 'bg-blue-50 dark:bg-blue-500/10' : 'hover:bg-[var(--card-hover)] dark:hover:bg-white/[0.04]',
              )}
            >
              <MemberAvatar member={member} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--foreground)] dark:text-white">
                  {member.full_name || `${member.name} ${member.surname}`}
                </p>
                <p className="truncate text-[11px] text-[var(--muted)]">
                  {member.role || lt('Member')}
                  {member.telegram_id ? ` | @${member.telegram_id}` : ''}
                </p>
              </div>
              {selected ? <Badge variant="blue" size="sm">{lt('Selected')}</Badge> : null}
            </button>
          )
        }) : (
          <div className="px-4 py-8 text-center text-sm text-[var(--muted)]">
            {lt('No members matched this search.')}
          </div>
        )}
      </div>
    </div>
  )
}

export function CeoWorkdayOverridesPage() {
  const { t } = useTranslation()
  const locale = getIntlLocale()
  const tx = (key: string, fallback: string, params?: Record<string, string | number>) => (
    t(key, {
      defaultValue: fallback,
      ...params,
    })
  )
  const { showToast } = useToast()
  const { confirm } = useConfirm()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingOverride, setEditingOverride] = useState<WorkdayOverrideRecord | null>(null)
  const [formState, setFormState] = useState<OverrideFormState>(() => createDefaultFormState(now.getMonth() + 1, now.getFullYear()))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const monthOptions = useMemo(
    () => Array.from({ length: 12 }, (_, index) => ({
      value: String(index + 1),
      label: getMonthName(index + 1),
    })),
    [locale],
  )

  const overridesQuery = useAsyncData(
    () => updateTrackingService.workdayOverrides({ month, year }),
    [month, year],
  )
  const memberOptionsQuery = useAsyncData(
    () => updateTrackingService.workdayOverrideMemberOptions(),
    [],
  )

  const overrides = useMemo(
    () => [...(overridesQuery.data ?? [])].sort((left, right) => {
      return right.special_date.localeCompare(left.special_date) || left.title.localeCompare(right.title)
    }),
    [overridesQuery.data],
  )

  const holidayCount = overrides.filter((item) => normalizeDayType(item.day_type) === 'holiday').length
  const shortDayCount = overrides.filter((item) => normalizeDayType(item.day_type) === 'short_day').length
  const allMemberCount = overrides.filter((item) => item.target_type === 'all').length
  const specificMemberCount = overrides.length - allMemberCount

  function setForm(patch: Partial<OverrideFormState>) {
    setFormState((current) => ({ ...current, ...patch }))
  }

  function openCreateDialog() {
    setEditingOverride(null)
    setFormState(createDefaultFormState(month, year))
    setIsCreateDialogOpen(true)
  }

  function openEditDialog(item: WorkdayOverrideRecord) {
    setEditingOverride(item)
    setFormState(createFormStateFromOverride(item))
    setIsCreateDialogOpen(false)
  }

  function closeDialog() {
    setEditingOverride(null)
    setIsCreateDialogOpen(false)
    setFormState(createDefaultFormState(month, year))
  }

  function handleDayTypeChange(value: string) {
    const dayType = normalizeDayType(value)

    setFormState((current) => ({
      ...current,
      dayType,
      workdayHours: dayType === 'short_day' ? (current.workdayHours || '5') : '',
      updateRequired: dayType === 'holiday' ? false : current.updateRequired,
    }))
  }

  async function handleRefresh() {
    try {
      await Promise.all([overridesQuery.refetch(), memberOptionsQuery.refetch()])
      showToast({
        title: lt('Workday overrides refreshed'),
        description: `${lt('Overrides for')} ${getMonthName(month)} ${year} ${lt('reloaded')}.`,
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: lt('Refresh failed'),
        description: getApiErrorMessage(error),
        tone: 'error',
      })
    }
  }

  async function handleDelete(item: WorkdayOverrideRecord) {
    const approved = await confirm({
      title: lt('Delete workday override?'),
      description: `${item.title} ${lt('on')} ${formatShortDate(item.special_date)} ${lt('will be permanently removed.')}`,
      tone: 'danger',
      confirmLabel: lt('Delete override'),
    })

    if (!approved) {
      return
    }

    try {
      await updateTrackingService.deleteWorkdayOverride(item.id)
      await overridesQuery.refetch()
      showToast({
        title: lt('Override deleted'),
        description: `${item.title} ${lt('removed successfully.')}`,
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Delete failed',
        description: getApiErrorMessage(error),
        tone: 'error',
      })
    }
  }

  async function handleSubmit() {
    const title = formState.title.trim()
    const note = formState.note.trim()
    const selectedMemberId = formState.memberIds[0]

    if (!formState.specialDate) {
      showToast({ title: lt('Date required'), description: lt('Select the holiday or short day date.'), tone: 'error' })
      return
    }

    if (!title) {
      showToast({ title: lt('Title required'), description: lt('Enter a short title for this override.'), tone: 'error' })
      return
    }

    if (!formState.appliesToAll && formState.memberIds.length === 0) {
      showToast({ title: lt('Member required'), description: lt('Choose at least one member for this override.'), tone: 'error' })
      return
    }

    if (editingOverride && !formState.appliesToAll && !selectedMemberId) {
      showToast({ title: lt('Member required'), description: lt('Select one member when editing a specific override.'), tone: 'error' })
      return
    }

    const parsedWorkdayHours = Number(formState.workdayHours)
    const workdayHours = formState.dayType === 'short_day' && Number.isFinite(parsedWorkdayHours)
      ? parsedWorkdayHours
      : undefined

    if (formState.dayType === 'short_day' && (workdayHours === undefined || workdayHours <= 0)) {
      showToast({ title: lt('Hours required'), description: lt('Enter a valid workday hour count for a short day.'), tone: 'error' })
      return
    }

    setIsSubmitting(true)

    try {
      if (editingOverride) {
        await updateTrackingService.updateWorkdayOverride(editingOverride.id, {
          special_date: formState.specialDate,
          day_type: formState.dayType,
          title,
          note: note || undefined,
          applies_to_all: formState.appliesToAll,
          member_id: formState.appliesToAll ? null : selectedMemberId,
          workday_hours: workdayHours,
          update_required: formState.updateRequired,
        })

        showToast({
          title: lt('Override updated'),
          description: `${title} ${lt('was updated successfully.')}`,
          tone: 'success',
        })
      } else {
        const response = await updateTrackingService.createWorkdayOverride({
          special_date: formState.specialDate,
          day_type: formState.dayType,
          title,
          note: note || undefined,
          applies_to_all: formState.appliesToAll,
          member_ids: formState.appliesToAll ? undefined : formState.memberIds,
          workday_hours: workdayHours,
          update_required: formState.updateRequired,
        })

        showToast({
          title: lt('Override created'),
          description: response.message || `${title} ${lt('was created successfully.')}`,
          tone: 'success',
        })
      }

      await overridesQuery.refetch()
      closeDialog()
    } catch (error) {
      showToast({
        title: editingOverride ? lt('Update failed') : lt('Create failed'),
        description: getApiErrorMessage(error),
        tone: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (overridesQuery.isLoading && !overridesQuery.data) {
    return (
      <LoadingStateBlock
        eyebrow={tx('ceo.workday.header.eyebrow', 'CEO Workspace')}
        title={tx('ceo.workday.states.loading_title', 'Loading workday overrides')}
        description={tx('ceo.workday.states.loading_description', 'Fetching holiday and short-day settings for the selected period.')}
      />
    )
  }

  if (overridesQuery.isError && !overridesQuery.data) {
    return (
      <ErrorStateBlock
        eyebrow={tx('ceo.workday.header.eyebrow', 'CEO Workspace')}
        title={tx('ceo.workday.states.error_title', 'Overrides unavailable')}
        description={tx('ceo.workday.states.error_description', 'Could not load holiday and short-day overrides.')}
        actionLabel={t('common.retry')}
        onAction={() => void overridesQuery.refetch()}
      />
    )
  }

  const memberOptions = memberOptionsQuery.data ?? []
  const activeDialogTitle = editingOverride
    ? tx('ceo.workday.dialog.edit_title', 'Edit Workday Override')
    : tx('ceo.workday.dialog.create_title', 'Create Workday Override')
  const activeDialogDescription = editingOverride
    ? tx('ceo.workday.dialog.edit_description', 'Update the selected holiday or short-day entry.')
    : tx('ceo.workday.dialog.create_description', 'Create a holiday or short working day for all members or selected members.')

  return (
    <section className="space-y-6 page-enter">
      <Card variant="glass" noPadding className="overflow-hidden rounded-[28px] border-[var(--border)]">
        <div className="relative overflow-hidden px-6 py-6 sm:px-8 sm:py-7">
          <div className="page-header-decor pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_70%)]" />
          <div className="page-header-decor pointer-events-none absolute -right-10 top-4 h-32 w-32 rounded-full bg-amber-400/8 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--blue-text)]">
                {tx('ceo.workday.header.eyebrow', 'CEO Workspace')}
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-[1.75rem]">
                {tx('ceo.workday.header.title', 'Workday Overrides')}
              </h1>
              <p className="mt-1.5 text-[13px] text-(--muted-strong)">
                {tx('ceo.workday.header.description', 'Configure holidays and short working days that affect update expectations.')}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-(--muted)">{tx('common.year', 'Year')}</label>
                <Input
                  type="number"
                  min="2020"
                  max="2035"
                  value={year}
                  onChange={(event) => setYear(Number(event.target.value) || now.getFullYear())}
                  className="min-h-0 h-6 w-18 border-transparent bg-transparent px-2.5 text-sm text-[var(--foreground)]"
                />
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-(--muted)">{tx('common.month', 'Month')}</label>
                <SelectField
                  value={String(month)}
                  options={monthOptions}
                  onValueChange={(value) => setMonth(Number(value))}
                  className="min-h-0 h-9 min-w-28 border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--foreground)]"
                />
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => void handleRefresh()}
                className="min-h-9 rounded-xl"
              >
                {t('common.refresh')}
              </Button>
              <Button
                variant="success"
                size="sm"
                onClick={openCreateDialog}
                className="min-h-9 rounded-xl"
              >
                {tx('ceo.workday.actions.create', 'Create Override')}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label={tx('ceo.workday.summary.in_period', 'Overrides in period')}
          value={overrides.length}
          hint={`${getMonthName(month)} ${year}`}
        />
        <SummaryCard
          label={tx('ceo.workday.summary.holidays', 'Holiday entries')}
          value={holidayCount}
          hint={tx('ceo.workday.summary.holidays_hint', 'Full day off or no update expected.')}
          accent="warning"
        />
        <SummaryCard
          label={tx('ceo.workday.summary.short_days', 'Short day entries')}
          value={shortDayCount}
          hint={tx('ceo.workday.summary.short_days_hint', 'Reduced working hours or shortened day.')}
          accent="blue"
        />
        <SummaryCard
          label={tx('ceo.workday.summary.targeting', 'Targeting')}
          value={tx('ceo.workday.summary.targeting_value', '{{all}} all / {{specific}} specific', {
            all: allMemberCount,
            specific: specificMemberCount,
          })}
          hint={tx('ceo.workday.summary.targeting_hint', 'How many overrides apply to all members versus selected members.')}
          accent="success"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.85fr)]">
        <Card variant="glass" className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <SectionTitle
              title={tx('ceo.workday.list.title', 'Overrides for {{month}} {{year}}', { month: getMonthName(month), year })}
              description={tx('ceo.workday.list.description', 'Each entry changes how update tracking treats a specific date.')}
            />
            <Badge variant="blue">{tx('ceo.workday.list.items', '{{count}} items', { count: overrides.length })}</Badge>
          </div>

          {overrides.length > 0 ? (
            <div className="space-y-3">
              {overrides.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold tracking-tight text-[var(--foreground)]">
                          {item.title}
                        </h3>
                        <Badge variant={getTypeBadgeVariant(item.day_type)}>
                          {getOverrideTypeLabel(item.day_type)}
                        </Badge>
                        <Badge variant={item.target_type === 'all' ? 'secondary' : 'outline'}>
                          {getOverrideTargetLabel(item)}
                        </Badge>
                        <Badge variant={item.update_required ? 'success' : 'warning'}>
                          {item.update_required ? lt('Update required') : lt('No update required')}
                        </Badge>
                        {item.workday_hours ? (
                          <Badge variant="blue">{item.workday_hours}h</Badge>
                        ) : null}
                      </div>

                      <p className="mt-2 text-sm text-[var(--muted-strong)]">
                        {formatShortDate(item.special_date)}
                      </p>

                      {item.note?.trim() ? (
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--foreground)]/80">
                          {item.note}
                        </p>
                      ) : (
                        <p className="mt-3 text-sm text-[var(--muted)]">
                          {tx('ceo.workday.list.no_note', 'No note provided for this override.')}
                        </p>
                      )}
                    </div>

                    <ActionsMenu
                      label={`${tx('ceo.workday.actions.actions_for', 'Actions for')} ${item.title}`}
                      items={[
                        { label: tx('ceo.workday.actions.edit', 'Edit Override'), onSelect: () => openEditDialog(item) },
                        { label: tx('ceo.workday.actions.delete', 'Delete Override'), onSelect: () => void handleDelete(item), tone: 'danger' },
                      ]}
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-[var(--muted)]">
                    <span>{tx('common.created', 'Created')}: {formatDateTime(item.created_at)}</span>
                    <span className="opacity-35">|</span>
                    <span>{tx('common.updated', 'Updated')}: {formatDateTime(item.updated_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[22px] border border-dashed border-[var(--border)] bg-[var(--surface-elevated)] px-5 py-8 text-center">
              <p className="text-base font-semibold text-[var(--foreground)]">
                {tx('ceo.workday.empty.title', 'No overrides yet for {{month}} {{year}}', { month: getMonthName(month), year })}
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {tx('ceo.workday.empty.description', 'Create a holiday or short-day rule so calendars stop treating those dates as missing workdays.')}
              </p>
              <Button variant="success" size="sm" className="mt-5 rounded-xl" onClick={openCreateDialog}>
                {tx('ceo.workday.empty.action', 'Create First Override')}
              </Button>
            </div>
          )}
        </Card>

        <Card variant="glass" className="p-5">
          <div className="space-y-4">
            <SectionTitle
              title={tx('ceo.workday.guide.title', 'How It Works')}
              description={tx('ceo.workday.guide.description', 'Use these rules to control whether updates are expected on a date.')}
            />

            <div className="rounded-[20px] border border-amber-500/18 bg-amber-500/[0.06] px-4 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200/70">{lt('Holiday')}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--foreground)]/80">
                {tx('ceo.workday.guide.holiday_description', 'Mark a date as a holiday when no update should be expected. Calendars should treat it as an off day instead of a missing day.')}
              </p>
            </div>

            <div className="rounded-[20px] border border-blue-500/18 bg-blue-500/[0.06] px-4 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-blue-200/72">{lt('Short Day')}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--foreground)]/80">
                {tx('ceo.workday.guide.short_day_description', 'Use a short day when working hours change. You can still require updates or turn them off for that shortened date.')}
              </p>
            </div>

            <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--muted)]">{tx('ceo.workday.guide.member_targeting_title', 'Member Targeting')}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--foreground)]/78">
                {tx('ceo.workday.guide.member_targeting_description', 'Choose all members for company-wide holidays, or select one or more members when the override is specific to a subset of the team.')}
              </p>
            </div>

            {memberOptionsQuery.isError ? (
              <div className="rounded-[18px] border border-amber-500/25 bg-amber-50 px-4 py-4 text-sm text-amber-700 dark:bg-amber-500/8 dark:text-amber-100/80">
                {tx('ceo.workday.guide.member_options_error', 'Member options could not be loaded. You can still review existing overrides, but creating member-specific entries may fail until this list reloads.')}
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <Dialog
        open={isCreateDialogOpen || editingOverride !== null}
        onClose={closeDialog}
        title={activeDialogTitle}
        description={activeDialogDescription}
        size="xl"
        footer={(
          <>
            <Button variant="secondary" onClick={closeDialog} disabled={isSubmitting}>
              {t('common.cancel')}
            </Button>
            <Button
              variant={editingOverride ? 'secondary' : 'success'}
              onClick={() => void handleSubmit()}
              loading={isSubmitting}
            >
              {editingOverride ? t('common.save_changes') : tx('ceo.workday.dialog.create_action', 'Create Override')}
            </Button>
          </>
        )}
      >
        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[var(--foreground)]">{tx('common.date', 'Date')}</label>
                <Input
                  type="date"
                  value={formState.specialDate}
                  onChange={(event) => setForm({ specialDate: event.target.value })}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-[var(--foreground)]">{tx('common.type', 'Type')}</label>
                <SelectField
                  value={String(formState.dayType)}
                  options={DAY_TYPE_OPTIONS.map((option) => ({ ...option, label: lt(option.label) }))}
                  onValueChange={handleDayTypeChange}
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[var(--foreground)]">{tx('common.title', 'Title')}</label>
              <Input
                value={formState.title}
                onChange={(event) => setForm({ title: event.target.value })}
                placeholder={formState.dayType === 'holiday'
                  ? tx('ceo.workday.form.holiday_title_placeholder', 'Holiday title example')
                  : tx('ceo.workday.form.short_day_title_placeholder', 'Short day title example')}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[var(--foreground)]">{tx('common.note', 'Note')}</label>
              <Textarea
                value={formState.note}
                onChange={(event) => setForm({ note: event.target.value })}
                placeholder={tx('ceo.workday.form.note_placeholder', 'Optional note shown in calendars and focus panels.')}
              />
            </div>

            {formState.dayType === 'short_day' ? (
              <div>
                <label className="mb-2 block text-sm font-semibold text-[var(--foreground)]">{tx('ceo.workday.form.workday_hours', 'Workday hours')}</label>
                <Input
                  type="number"
                  min="1"
                  max="24"
                  value={formState.workdayHours}
                  onChange={(event) => setForm({ workdayHours: event.target.value })}
                  placeholder="5"
                />
              </div>
            ) : null}

            <div>
              <p className="mb-2 text-sm font-semibold text-[var(--foreground)]">{tx('ceo.workday.form.update_rule', 'Update rule')}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setForm({ updateRequired: false })}
                  className={cn(
                    'rounded-[18px] border px-4 py-3 text-left transition',
                    !formState.updateRequired
                      ? 'border-amber-400/35 bg-amber-500/[0.10] text-white'
                      : 'border-white/8 bg-white/[0.03] text-white/72 hover:border-white/12 hover:bg-white/[0.05]',
                  )}
                >
                  <p className="text-sm font-semibold">{tx('ceo.workday.form.no_update_required', 'No update required')}</p>
                  <p className="mt-1 text-xs text-[var(--muted-strong)]">{tx('ceo.workday.form.no_update_required_hint', 'Use this for holidays or shortened days with no reporting.')}</p>
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ updateRequired: true })}
                  className={cn(
                    'rounded-[18px] border px-4 py-3 text-left transition',
                    formState.updateRequired
                      ? 'border-emerald-400/35 bg-emerald-500/[0.10] text-white'
                      : 'border-white/8 bg-white/[0.03] text-white/72 hover:border-white/12 hover:bg-white/[0.05]',
                  )}
                >
                  <p className="text-sm font-semibold">{tx('ceo.workday.form.update_required', 'Update still required')}</p>
                  <p className="mt-1 text-xs text-[var(--muted-strong)]">{tx('ceo.workday.form.update_required_hint', 'Use this when the day is shortened but reporting should still happen.')}</p>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-semibold text-[var(--foreground)]">{tx('ceo.workday.form.target_scope', 'Target scope')}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setForm({ appliesToAll: true, memberIds: [] })}
                  className={cn(
                    'rounded-[18px] border px-4 py-3 text-left transition',
                    formState.appliesToAll
                      ? 'border-blue-400/35 bg-blue-500/[0.10] text-white'
                      : 'border-white/8 bg-white/[0.03] text-white/72 hover:border-white/12 hover:bg-white/[0.05]',
                  )}
                >
                  <p className="text-sm font-semibold">{tx('ceo.workday.form.all_members', 'All members')}</p>
                  <p className="mt-1 text-xs text-[var(--muted-strong)]">{tx('ceo.workday.form.all_members_hint', 'Company-wide holiday or short day.')}</p>
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ appliesToAll: false })}
                  className={cn(
                    'rounded-[18px] border px-4 py-3 text-left transition',
                    !formState.appliesToAll
                      ? 'border-violet-400/35 bg-violet-500/[0.10] text-white'
                      : 'border-white/8 bg-white/[0.03] text-white/72 hover:border-white/12 hover:bg-white/[0.05]',
                  )}
                >
                  <p className="text-sm font-semibold">{tx('ceo.workday.form.selected_members', 'Selected members')}</p>
                  <p className="mt-1 text-xs text-[var(--muted-strong)]">{tx('ceo.workday.form.selected_members_hint', 'Apply only to specific employees.')}</p>
                </button>
              </div>
            </div>

            {!formState.appliesToAll ? (
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="text-sm font-semibold text-[var(--foreground)]">
                    {editingOverride ? tx('common.member', 'Member') : tx('common.members', 'Members')}
                  </label>
                  <Badge variant="secondary">
                    {tx('ceo.workday.form.selected_count', '{{count}} selected', { count: formState.memberIds.length })}
                  </Badge>
                </div>

                {memberOptionsQuery.isLoading && memberOptions.length === 0 ? (
                  <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-6 text-sm text-[var(--muted)]">
                    {tx('ceo.workday.form.loading_members', 'Loading member options...')}
                  </div>
                ) : (
                  <MemberPicker
                    members={memberOptions}
                    selectedIds={formState.memberIds}
                    onChange={(memberIds) => setForm({ memberIds })}
                    multiple={!editingOverride}
                  />
                )}
              </div>
            ) : (
              <div className="rounded-[18px] border border-dashed border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-5 text-sm text-[var(--muted-strong)]">
                {tx('ceo.workday.form.applies_to_all', 'This override will apply to every member in the company.')}
              </div>
            )}

            <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--muted)]">{tx('common.preview', 'Preview')}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant={getTypeBadgeVariant(formState.dayType)}>
                  {getOverrideTypeLabel(formState.dayType)}
                </Badge>
                <Badge variant={formState.appliesToAll ? 'secondary' : 'outline'}>
                  {formState.appliesToAll
                    ? tx('ceo.workday.form.all_members', 'All members')
                    : `${formState.memberIds.length} ${tx(formState.memberIds.length === 1 ? 'ceo.workday.form.selected_member' : 'ceo.workday.form.selected_members_count', formState.memberIds.length === 1 ? 'selected member' : 'selected members')}`}
                </Badge>
                <Badge variant={formState.updateRequired ? 'success' : 'warning'}>
                  {formState.updateRequired
                    ? tx('ceo.workday.form.update_required_badge', 'Update required')
                    : tx('ceo.workday.form.no_update_required', 'No update required')}
                </Badge>
                {formState.dayType === 'short_day' && formState.workdayHours ? (
                  <Badge variant="blue">{formState.workdayHours}h</Badge>
                ) : null}
              </div>
              <p className="mt-3 text-sm text-[var(--foreground)]/80">
                {formState.title.trim() || tx('ceo.workday.form.preview_title_placeholder', 'Override title will appear here.')}
              </p>
              <p className="mt-2 text-xs text-[var(--muted)]">
                {formState.specialDate ? formatShortDate(formState.specialDate) : tx('ceo.workday.form.no_date', 'No date selected')}
              </p>
            </div>
          </div>
        </div>
      </Dialog>
    </section>
  )
}
