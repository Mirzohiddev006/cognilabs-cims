import { useMemo, useState } from 'react'
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

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: getMonthName(index + 1),
}))

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
  return normalizeDayType(dayType) === 'short_day' ? 'Short Day' : 'Holiday'
}

function getTypeBadgeVariant(dayType: string | null | undefined) {
  return normalizeDayType(dayType) === 'short_day' ? 'blue' : 'warning'
}

function getOverrideTargetLabel(item: WorkdayOverrideRecord) {
  if (item.target_type === 'all') {
    return 'All members'
  }

  return item.member_name?.trim() || (item.member_id ? `Member #${item.member_id}` : 'Specific member')
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
  const localizedLabel = translateCurrentLiteral(label)
  const localizedHint = hint ? translateCurrentLiteral(hint) : null

  const accentClassName = {
    default: 'border-white/8 bg-white/[0.03]',
    warning: 'border-amber-500/18 bg-amber-500/[0.06]',
    blue: 'border-blue-500/18 bg-blue-500/[0.06]',
    success: 'border-emerald-500/18 bg-emerald-500/[0.06]',
  } as const

  return (
    <div className={cn('rounded-[22px] border px-5 py-4', accentClassName[accent])}>
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-(--muted)">{localizedLabel}</p>
      <p className="mt-3 text-[1.75rem] font-semibold tracking-tight text-white">{value}</p>
      {localizedHint ? <p className="mt-2 text-xs text-[var(--muted-strong)]">{localizedHint}</p> : null}
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
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] text-white/78 transition hover:border-white/15 hover:bg-white/[0.08]"
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
        placeholder={multiple ? 'Search members to include' : 'Search member'}
      />

      <div className="max-h-56 overflow-y-auto rounded-[18px] border border-white/10 bg-black/20">
        {filteredMembers.length > 0 ? filteredMembers.map((member) => {
          const selected = selectedIds.includes(member.id)

          return (
            <button
              key={member.id}
              type="button"
              onClick={() => toggle(member.id)}
              className={cn(
                'flex w-full items-center gap-3 border-b border-white/6 px-3 py-2.5 text-left transition last:border-b-0',
                selected ? 'bg-blue-500/10' : 'hover:bg-white/[0.04]',
              )}
            >
              <MemberAvatar member={member} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {member.full_name || `${member.name} ${member.surname}`}
                </p>
                <p className="truncate text-[11px] text-[var(--muted)]">
                  {member.role || 'Member'}
                  {member.telegram_id ? ` | @${member.telegram_id}` : ''}
                </p>
              </div>
              {selected ? <Badge variant="blue" size="sm">Selected</Badge> : null}
            </button>
          )
        }) : (
          <div className="px-4 py-8 text-center text-sm text-[var(--muted)]">
            No members matched this search.
          </div>
        )}
      </div>
    </div>
  )
}

export function CeoWorkdayOverridesPage() {
  const { showToast } = useToast()
  const { confirm } = useConfirm()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingOverride, setEditingOverride] = useState<WorkdayOverrideRecord | null>(null)
  const [formState, setFormState] = useState<OverrideFormState>(() => createDefaultFormState(now.getMonth() + 1, now.getFullYear()))
  const [isSubmitting, setIsSubmitting] = useState(false)

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
        title: 'Workday overrides refreshed',
        description: `Overrides for ${getMonthName(month)} ${year} reloaded.`,
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Refresh failed',
        description: getApiErrorMessage(error),
        tone: 'error',
      })
    }
  }

  async function handleDelete(item: WorkdayOverrideRecord) {
    const approved = await confirm({
      title: 'Delete workday override?',
      description: `${item.title} on ${formatShortDate(item.special_date)} will be permanently removed.`,
      tone: 'danger',
      confirmLabel: 'Delete override',
    })

    if (!approved) {
      return
    }

    try {
      await updateTrackingService.deleteWorkdayOverride(item.id)
      await overridesQuery.refetch()
      showToast({
        title: 'Override deleted',
        description: `${item.title} removed successfully.`,
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
      showToast({ title: 'Date required', description: 'Select the holiday or short day date.', tone: 'error' })
      return
    }

    if (!title) {
      showToast({ title: 'Title required', description: 'Enter a short title for this override.', tone: 'error' })
      return
    }

    if (!formState.appliesToAll && formState.memberIds.length === 0) {
      showToast({ title: 'Member required', description: 'Choose at least one member for this override.', tone: 'error' })
      return
    }

    if (editingOverride && !formState.appliesToAll && !selectedMemberId) {
      showToast({ title: 'Member required', description: 'Select one member when editing a specific override.', tone: 'error' })
      return
    }

    const parsedWorkdayHours = Number(formState.workdayHours)
    const workdayHours = formState.dayType === 'short_day' && Number.isFinite(parsedWorkdayHours)
      ? parsedWorkdayHours
      : undefined

    if (formState.dayType === 'short_day' && (workdayHours === undefined || workdayHours <= 0)) {
      showToast({ title: 'Hours required', description: 'Enter a valid workday hour count for a short day.', tone: 'error' })
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
          title: 'Override updated',
          description: `${title} was updated successfully.`,
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
          title: 'Override created',
          description: response.message || `${title} was created successfully.`,
          tone: 'success',
        })
      }

      await overridesQuery.refetch()
      closeDialog()
    } catch (error) {
      showToast({
        title: editingOverride ? 'Update failed' : 'Create failed',
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
        eyebrow="CEO / Workday Overrides"
        title="Loading workday overrides"
        description="Fetching holiday and short-day settings for the selected period."
      />
    )
  }

  if (overridesQuery.isError && !overridesQuery.data) {
    return (
      <ErrorStateBlock
        eyebrow="CEO / Workday Overrides"
        title="Overrides unavailable"
        description="Could not load holiday and short-day overrides."
        actionLabel="Retry"
        onAction={() => void overridesQuery.refetch()}
      />
    )
  }

  const memberOptions = memberOptionsQuery.data ?? []
  const activeDialogTitle = editingOverride ? 'Edit workday override' : 'Create workday override'
  const activeDialogDescription = editingOverride
    ? 'Update the selected holiday or short-day entry.'
    : 'Create a holiday or short working day for all members or selected members.'

  return (
    <section className="space-y-6 page-enter">
      <Card variant="glass" noPadding className="overflow-hidden rounded-[28px] border-white/8">
        <div className="relative overflow-hidden px-6 py-6 sm:px-8 sm:py-7">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_70%)]" />
          <div className="pointer-events-none absolute -right-10 top-4 h-32 w-32 rounded-full bg-amber-400/8 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-blue-400/80">
                CEO Dashboard
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-[1.75rem]">
                Workday Overrides
              </h1>
              <p className="mt-1.5 text-[13px] text-(--muted)">
                Configure holidays and short working days that affect update expectations.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/4 px-3 py-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-(--muted)">Year</label>
                <Input
                  type="number"
                  min="2020"
                  max="2035"
                  value={year}
                  onChange={(event) => setYear(Number(event.target.value) || now.getFullYear())}
                  className="min-h-0 h-6 w-18 border-white/10 bg-transparent px-2.5 text-sm text-white"
                />
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/4 px-3 py-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-(--muted)">Month</label>
                <SelectField
                  value={String(month)}
                  options={MONTH_OPTIONS}
                  onValueChange={(value) => setMonth(Number(value))}
                  className="min-h-0 h-9 min-w-28 border-white/10 bg-(--surface) text-sm text-white hover:border-white/15 hover:bg-white/6 focus-visible:border-white/20 focus-visible:bg-white/6 focus-visible:shadow-[inset_0_1px_2px_rgba(0,0,0,0.12),0_0_0_3px_rgba(255,255,255,0.06)]"
                />
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => void handleRefresh()}
                className="min-h-9 rounded-xl"
              >
                Refresh
              </Button>
              <Button
                variant="success"
                size="sm"
                onClick={openCreateDialog}
                className="min-h-9 rounded-xl"
              >
                New override
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Overrides in period"
          value={overrides.length}
          hint={`${getMonthName(month)} ${year}`}
        />
        <SummaryCard
          label="Holiday entries"
          value={holidayCount}
          hint="Full day off or no update expected."
          accent="warning"
        />
        <SummaryCard
          label="Short day entries"
          value={shortDayCount}
          hint="Reduced working hours or shortened day."
          accent="blue"
        />
        <SummaryCard
          label="Targeting"
          value={`${allMemberCount} all / ${specificMemberCount} specific`}
          hint="How many overrides apply to all members vs selected members."
          accent="success"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.85fr)]">
        <Card variant="glass" className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <SectionTitle
              title={`Overrides for ${getMonthName(month)} ${year}`}
              description="Each entry changes how update tracking treats a specific date."
            />
            <Badge variant="blue">{overrides.length} items</Badge>
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
                        <h3 className="text-base font-semibold tracking-tight text-white">
                          {item.title}
                        </h3>
                        <Badge variant={getTypeBadgeVariant(item.day_type)}>
                          {getOverrideTypeLabel(item.day_type)}
                        </Badge>
                        <Badge variant={item.target_type === 'all' ? 'secondary' : 'outline'}>
                          {getOverrideTargetLabel(item)}
                        </Badge>
                        <Badge variant={item.update_required ? 'success' : 'warning'}>
                          {item.update_required ? 'Update required' : 'No update required'}
                        </Badge>
                        {item.workday_hours ? (
                          <Badge variant="blue">{item.workday_hours}h</Badge>
                        ) : null}
                      </div>

                      <p className="mt-2 text-sm text-[var(--muted-strong)]">
                        {formatShortDate(item.special_date)}
                      </p>

                      {item.note?.trim() ? (
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/78">
                          {item.note}
                        </p>
                      ) : (
                        <p className="mt-3 text-sm text-[var(--muted)]">
                          No note provided for this override.
                        </p>
                      )}
                    </div>

                    <ActionsMenu
                      label={`Actions for ${item.title}`}
                      items={[
                        { label: 'Edit override', onSelect: () => openEditDialog(item) },
                        { label: 'Delete override', onSelect: () => void handleDelete(item), tone: 'danger' },
                      ]}
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-[var(--muted)]">
                    <span>Created: {formatDateTime(item.created_at)}</span>
                    <span className="opacity-35">|</span>
                    <span>Updated: {formatDateTime(item.updated_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[22px] border border-dashed border-white/10 bg-black/10 px-5 py-8 text-center">
              <p className="text-base font-semibold text-white">
                No overrides yet for {getMonthName(month)} {year}
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Create a holiday or short-day rule so calendars stop treating those dates as missing workdays.
              </p>
              <Button variant="success" size="sm" className="mt-5 rounded-xl" onClick={openCreateDialog}>
                Create first override
              </Button>
            </div>
          )}
        </Card>

        <Card variant="glass" className="p-5">
          <div className="space-y-4">
            <SectionTitle
              title="How It Works"
              description="Use these rules to control whether updates are expected on a date."
            />

            <div className="rounded-[20px] border border-amber-500/18 bg-amber-500/[0.06] px-4 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200/70">Holiday</p>
              <p className="mt-2 text-sm leading-6 text-white/78">
                Mark a date as a holiday when no update should be expected. Calendars should treat it as an off day instead of a missing day.
              </p>
            </div>

            <div className="rounded-[20px] border border-blue-500/18 bg-blue-500/[0.06] px-4 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-blue-200/72">Short Day</p>
              <p className="mt-2 text-sm leading-6 text-white/78">
                Use a short day when working hours change. You can still require updates or turn them off for that shortened date.
              </p>
            </div>

            <div className="rounded-[20px] border border-white/8 bg-black/12 px-4 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/42">Member Targeting</p>
              <p className="mt-2 text-sm leading-6 text-white/72">
                Choose “all members” for company-wide holidays, or select one or more members when the override is specific to a subset of the team.
              </p>
            </div>

            {memberOptionsQuery.isError ? (
              <div className="rounded-[18px] border border-amber-500/25 bg-amber-500/8 px-4 py-4 text-sm text-amber-100/80">
                Member options could not be loaded. You can still review existing overrides, but creating member-specific entries may fail until this list reloads.
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
              Cancel
            </Button>
            <Button
              variant={editingOverride ? 'secondary' : 'success'}
              onClick={() => void handleSubmit()}
              loading={isSubmitting}
            >
              {editingOverride ? 'Save changes' : 'Create override'}
            </Button>
          </>
        )}
      >
        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-white">Date</label>
                <Input
                  type="date"
                  value={formState.specialDate}
                  onChange={(event) => setForm({ specialDate: event.target.value })}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-white">Type</label>
                <SelectField
                  value={String(formState.dayType)}
                  options={[...DAY_TYPE_OPTIONS]}
                  onValueChange={handleDayTypeChange}
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white">Title</label>
              <Input
                value={formState.title}
                onChange={(event) => setForm({ title: event.target.value })}
                placeholder={formState.dayType === 'holiday' ? 'Hayit uchun' : 'Ramazon short day'}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white">Note</label>
              <Textarea
                value={formState.note}
                onChange={(event) => setForm({ note: event.target.value })}
                placeholder="Optional note shown in calendars and focus panels."
              />
            </div>

            {formState.dayType === 'short_day' ? (
              <div>
                <label className="mb-2 block text-sm font-semibold text-white">Workday hours</label>
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
              <p className="mb-2 text-sm font-semibold text-white">Update rule</p>
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
                  <p className="text-sm font-semibold">No update required</p>
                  <p className="mt-1 text-xs text-[var(--muted-strong)]">Use this for holidays or shortened days with no reporting.</p>
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
                  <p className="text-sm font-semibold">Update still required</p>
                  <p className="mt-1 text-xs text-[var(--muted-strong)]">Use this when the day is shortened but reporting should still happen.</p>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-semibold text-white">Target scope</p>
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
                  <p className="text-sm font-semibold">All members</p>
                  <p className="mt-1 text-xs text-[var(--muted-strong)]">Company-wide holiday or short day.</p>
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
                  <p className="text-sm font-semibold">Selected members</p>
                  <p className="mt-1 text-xs text-[var(--muted-strong)]">Apply only to specific employees.</p>
                </button>
              </div>
            </div>

            {!formState.appliesToAll ? (
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="text-sm font-semibold text-white">
                    {editingOverride ? 'Member' : 'Members'}
                  </label>
                  <Badge variant="secondary">
                    {formState.memberIds.length} selected
                  </Badge>
                </div>

                {memberOptionsQuery.isLoading && memberOptions.length === 0 ? (
                  <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-6 text-sm text-[var(--muted)]">
                    Loading member options...
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
              <div className="rounded-[18px] border border-dashed border-white/10 bg-black/10 px-4 py-5 text-sm text-[var(--muted-strong)]">
                This override will apply to every member in the company.
              </div>
            )}

            <div className="rounded-[20px] border border-white/8 bg-black/12 px-4 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/42">Preview</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant={getTypeBadgeVariant(formState.dayType)}>
                  {getOverrideTypeLabel(formState.dayType)}
                </Badge>
                <Badge variant={formState.appliesToAll ? 'secondary' : 'outline'}>
                  {formState.appliesToAll
                    ? 'All members'
                    : `${formState.memberIds.length} selected member${formState.memberIds.length === 1 ? '' : 's'}`}
                </Badge>
                <Badge variant={formState.updateRequired ? 'success' : 'warning'}>
                  {formState.updateRequired ? 'Update required' : 'No update required'}
                </Badge>
                {formState.dayType === 'short_day' && formState.workdayHours ? (
                  <Badge variant="blue">{formState.workdayHours}h</Badge>
                ) : null}
              </div>
              <p className="mt-3 text-sm text-white/78">
                {formState.title.trim() || 'Override title will appear here.'}
              </p>
              <p className="mt-2 text-xs text-[var(--muted)]">
                {formState.specialDate ? formatShortDate(formState.specialDate) : 'No date selected'}
              </p>
            </div>
          </div>
        </div>
      </Dialog>
    </section>
  )
}
