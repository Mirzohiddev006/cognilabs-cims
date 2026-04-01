import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getIntlLocale, translateCurrentLiteral } from '../../../shared/i18n/translations'
import type {
  MemberDeliveryBonusPayload,
  MemberDeliveryBonusRecord,
  MemberMistakePayload,
  MemberMistakeRecord,
} from '../../../shared/api/types'
import { membersService } from '../../../shared/api/services/members.service'
import { projectsService } from '../../../shared/api/services/projects.service'
import { updateTrackingService } from '../../../shared/api/services/updateTracking.service'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { getApiErrorMessage } from '../../../shared/lib/api-error'
import { useToast } from '../../../shared/toast/useToast'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { Dialog } from '../../../shared/ui/dialog'
import { Input } from '../../../shared/ui/input'
import { SelectField } from '../../../shared/ui/select-field'
import { ErrorStateBlock, LoadingStateBlock } from '../../../shared/ui/state-block'
import { Textarea } from '../../../shared/ui/textarea'
import { useAuth } from '../../auth/hooks/useAuth'
import { CompensationPolicyPanel } from '../components/CompensationPolicyPanel'
import {
  DeliveryBonusSection,
  MistakeIncidentSection,
} from '../components/CompensationRecordPanels'
import { MemberMonthlyUpdateCalendarBoard } from '../components/MemberMonthlyUpdateCalendar'
import { DetailStatTile, RefreshIcon } from '../components/SalaryEstimatePrimitives'
import {
  buildEmployeeSalaryDetail,
  buildEmployeeReports,
  buildReportFromUser,
  createVirtualUser,
  defaultMonth,
  defaultYear,
  findFirstRecord,
  formatAmount,
  formatCount,
  formatDetailDate,
  formatPercent,
  getCompensationPolicyCategoryOptions,
  getCompensationPolicyDeliveryBonusOptions,
  getCompensationPolicySeverityOptions,
  getEstimateRecordForMember,
  getMonthOptions,
  getMonthName,
  getSuccessMessage,
  isRecord,
  normalizeEstimateEntry,
  parseMaybeJson,
  resolveRecordDisplayName,
} from '../lib/salaryEstimates'

type FaultsMemberDetailPageMode = 'salary-detail' | 'member-updates'

type FaultsMemberDetailPageProps = {
  memberIdOverride?: number
  mode?: FaultsMemberDetailPageMode
}

type MistakeFormState = {
  reviewerId: string
  projectId: string
  category: string
  severity: string
  title: string
  description: string
  incidentDate: string
  reachedClient: boolean
  unclearTask: boolean
}

type DeliveryBonusFormState = {
  projectId: string
  bonusType: string
  title: string
  description: string
  awardDate: string
}

type CompensationDeleteTarget =
  | {
      kind: 'mistake'
      record: MemberMistakeRecord
    }
  | {
      kind: 'delivery-bonus'
      record: MemberDeliveryBonusRecord
    }

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function parsePeriodNumber(value: string | null, fallback: number, min: number, max: number) {
  if (!value?.trim()) {
    return fallback
  }

  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return clampNumber(parsed, min, max)
}

function getTodayDateInput() {
  return new Date().toISOString().slice(0, 10)
}

function normalizeDateInput(value?: string | null) {
  if (!value) {
    return getTodayDateInput()
  }

  const normalized = value.slice(0, 10)

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return getTodayDateInput()
  }

  return parsed.toISOString().slice(0, 10)
}

function createMistakeFormState(defaultReviewerId = '', defaultCategory = 'AI Integration', defaultSeverity = 'Minor'): MistakeFormState {
  return {
    reviewerId: defaultReviewerId,
    projectId: '0',
    category: defaultCategory,
    severity: defaultSeverity,
    title: '',
    description: '',
    incidentDate: getTodayDateInput(),
    reachedClient: false,
    unclearTask: false,
  }
}

function createDeliveryBonusFormState(defaultBonusType = 'early_delivery'): DeliveryBonusFormState {
  return {
    projectId: '0',
    bonusType: defaultBonusType,
    title: '',
    description: '',
    awardDate: getTodayDateInput(),
  }
}

function parsePositiveId(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function findHistoryEmployeeRecord(payload: unknown, memberId: number) {
  const parsed = parseMaybeJson(payload)

  if (!isRecord(parsed) || !Array.isArray(parsed.employees)) {
    return null
  }

  return parsed.employees.find((item) => (
    isRecord(item) &&
    Number(item.user_id ?? item.id ?? item.employee_id ?? item.member_id) === memberId
  )) ?? null
}

function findHistoryPeriodRecord(historyEmployeeRecord: Record<string, unknown> | null, year: number, month: number) {
  if (!historyEmployeeRecord || !Array.isArray(historyEmployeeRecord.periods)) {
    return null
  }

  return historyEmployeeRecord.periods.find((item) => (
    isRecord(item) &&
    Number(item.year) === year &&
    Number(item.month) === month
  )) ?? null
}

function resolveMemberDisplayName(...sources: Array<unknown>) {
  for (const source of sources) {
    const parsed = parseMaybeJson(source)
    const candidateRecords: Record<string, unknown>[] = []

    if (Array.isArray(parsed)) {
      const firstRecord = parsed.find(isRecord)

      if (firstRecord) {
        candidateRecords.push(firstRecord)
      }
    } else if (isRecord(parsed)) {
      candidateRecords.push(parsed)

      for (const key of ['user', 'employee', 'member', 'user_data', 'member_data', 'summary', 'statistics', 'salary_update', 'monthly_stats']) {
        const nestedRecord = findFirstRecord(parsed, [key])

        if (nestedRecord) {
          candidateRecords.push(nestedRecord)
        }
      }

      for (const key of ['employees', 'members', 'items', 'results', 'rows', 'updates', 'data']) {
        const collection = parsed[key]

        if (!Array.isArray(collection)) {
          continue
        }

        const firstRecord = collection.find(isRecord)

        if (firstRecord) {
          candidateRecords.push(firstRecord)
        }
      }
    }

    const resolvedName = resolveRecordDisplayName(...candidateRecords)

    if (resolvedName) {
      return resolvedName
    }
  }

  return null
}

export function FaultsMemberDetailPage({
  memberIdOverride,
  mode = 'salary-detail',
}: FaultsMemberDetailPageProps = {}) {
  const monthOptions = useMemo(() => getMonthOptions(), [])
  const navigate = useNavigate()
  const params = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user: currentUser } = useAuth()
  const { showToast } = useToast()
  const [mistakeDraft, setMistakeDraft] = useState<MistakeFormState>(() => createMistakeFormState())
  const [deliveryBonusDraft, setDeliveryBonusDraft] = useState<DeliveryBonusFormState>(() => createDeliveryBonusFormState())
  const [editingMistake, setEditingMistake] = useState<MemberMistakeRecord | null>(null)
  const [editingDeliveryBonus, setEditingDeliveryBonus] = useState<MemberDeliveryBonusRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CompensationDeleteTarget | null>(null)
  const [isMistakeDialogOpen, setIsMistakeDialogOpen] = useState(false)
  const [isDeliveryBonusDialogOpen, setIsDeliveryBonusDialogOpen] = useState(false)
  const [isMistakeSubmitting, setIsMistakeSubmitting] = useState(false)
  const [isDeliveryBonusSubmitting, setIsDeliveryBonusSubmitting] = useState(false)
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false)
  const lt = translateCurrentLiteral
  const locale = getIntlLocale()
  const tr = (key: string, uzFallback: string, ruFallback: string) => {
    const value = lt(key)

    if (value !== key) {
      return value
    }

    if (locale.startsWith('ru')) {
      return ruFallback
    }

    if (locale.startsWith('en')) {
      return key
    }

    return uzFallback
  }

  const isMemberUpdatesMode = mode === 'member-updates'
  const memberId = memberIdOverride ?? Number(params.memberId)
  const year = parsePeriodNumber(searchParams.get('year'), defaultYear, 2020, 2035)
  const month = parsePeriodNumber(searchParams.get('month'), defaultMonth, 1, 12)
  const pageEyebrow = isMemberUpdatesMode ? lt('Updates / My Detail') : lt('CEO / Salary / Detail')
  const loadingTitle = isMemberUpdatesMode ? lt('Loading your update detail') : lt('Loading member salary detail')
  const loadingDescription = isMemberUpdatesMode
    ? lt('Retrieving your monthly update context, estimate snapshot and activity details.')
    : lt('Retrieving member estimate, penalties, bonuses, and monthly update context.')
  const errorActionLabel = isMemberUpdatesMode ? lt('Back to dashboard') : lt('Back to salary estimates')
  const backTarget = isMemberUpdatesMode ? '/member/dashboard' : `/faults?year=${year}&month=${month}`
  const topHeaderEyebrow = isMemberUpdatesMode ? lt('My Update Detail') : lt('CEO Salary Detail')
  const showCompensationActions = !isMemberUpdatesMode

  const reviewerOptionsQuery = useAsyncData(
    () => updateTrackingService.workdayOverrideMemberOptions(),
    [],
    { enabled: showCompensationActions },
  )
  const projectsQuery = useAsyncData(
    () => projectsService.listProjects(),
    [],
    { enabled: showCompensationActions },
  )
  const allUsersQuery = useAsyncData(
    () => projectsService.getAllUsers(),
    [],
    { enabled: showCompensationActions },
  )
  const reviewerOptions = (allUsersQuery.data?.length
    ? allUsersQuery.data.map((user) => ({
        value: String(user.id),
        label: `${user.name} ${user.surname}`.trim() || user.email || `${lt('Reviewer')} #${user.id}`,
      }))
    : (reviewerOptionsQuery.data ?? []).map((member) => ({
        value: String(member.id),
        label: member.full_name || `${member.name} ${member.surname}`.trim() || `${lt('Reviewer')} #${member.id}`,
      })))
  const projectOptions = [
    { value: '0', label: lt('No project') },
    ...((projectsQuery.data?.projects ?? []).map((project) => ({
      value: String(project.id),
      label: project.project_name,
    }))),
  ]
  const defaultReviewerId =
    reviewerOptions.find((option) => Number(option.value) === currentUser?.id)?.value ??
    reviewerOptions[0]?.value ??
    ''

  const detailQuery = useAsyncData(
    async () => {
      const [estimateResult, policyResult, mistakesResult, deliveryBonusesResult, updatesResult, calendarResult, historyResult] = await Promise.allSettled([
        membersService.salaryEstimates({ year, month, employeeIds: [memberId] }),
        membersService.compensationPolicy({ employeeIds: [memberId] }),
        membersService.listMistakes({ year, month, employeeId: memberId }),
        membersService.listDeliveryBonuses({ year, month, employeeId: memberId }),
        membersService.updatesStatistics({ year, month, employeeIds: [memberId] }),
        updateTrackingService.employeeMonthlyUpdates(year, month, memberId),
        membersService.updatesAll({ year, month, employeeIds: [memberId] }),
      ])

      const estimatePayload = estimateResult.status === 'fulfilled' ? estimateResult.value : null
      const policyPayload = policyResult.status === 'fulfilled' ? policyResult.value : null
      const mistakesPayload = mistakesResult.status === 'fulfilled' ? mistakesResult.value : null
      const deliveryBonusesPayload = deliveryBonusesResult.status === 'fulfilled' ? deliveryBonusesResult.value : null
      const updatesPayload = updatesResult.status === 'fulfilled' ? updatesResult.value : null
      const calendarPayload = calendarResult.status === 'fulfilled' ? calendarResult.value : null
      const historyPayload = historyResult.status === 'fulfilled' ? historyResult.value : null
      const historyEmployeeRecord = findHistoryEmployeeRecord(historyPayload, memberId)
      const historyPeriodRecord = findHistoryPeriodRecord(historyEmployeeRecord, year, month)
      const effectiveEstimatePayload = estimatePayload ?? historyPeriodRecord ?? historyEmployeeRecord
      const estimateRecord = getEstimateRecordForMember(effectiveEstimatePayload, memberId)
      const snapshot = estimateRecord ? normalizeEstimateEntry(estimateRecord) : null
      const historyReport = historyPayload
        ? buildEmployeeReports([], historyPayload, { includeFallbackUsers: false }).find((entry) => entry.id === memberId) ?? null
        : null
      const historyReportBaseSalary = historyReport?.baseSalary
      const resolvedUserName =
        resolveMemberDisplayName(
          estimatePayload,
          effectiveEstimatePayload,
          historyPeriodRecord,
          historyEmployeeRecord,
          updatesPayload,
          calendarPayload,
        ) ??
        historyReport?.fullName ??
        `Member #${memberId}`
      const resolvedSnapshot = snapshot
        ? {
            ...snapshot,
            userId: snapshot.userId ?? memberId,
            userName: snapshot.userName?.trim() || resolvedUserName,
          }
        : null
      const apiUser = resolvedSnapshot
        ? {
            ...createVirtualUser(resolvedSnapshot),
            id: resolvedSnapshot.userId ?? memberId,
          }
        : historyEmployeeRecord || historyReport || resolvedUserName
          ? {
              ...createVirtualUser({
                userId: memberId,
                userName: resolvedUserName,
                roleLabel: historyReport?.roleLabel ?? lt('Member'),
                baseSalary:
                  typeof historyEmployeeRecord?.default_salary === 'number'
                    ? historyEmployeeRecord.default_salary
                    : typeof historyReportBaseSalary === 'number' && Number.isFinite(historyReportBaseSalary)
                      ? historyReportBaseSalary
                      : undefined,
              }),
              id: memberId,
            }
          : null
      const fallbackReport =
        resolvedSnapshot && apiUser
          ? buildReportFromUser(apiUser, resolvedSnapshot)
          : historyReport ?? (apiUser ? buildReportFromUser(apiUser) : null)

      if (!fallbackReport) {
        throw new Error('Could not resolve this member from the Employees API salary estimate response.')
      }

      return buildEmployeeSalaryDetail({
        report: fallbackReport,
        user: apiUser,
        estimatePayload: effectiveEstimatePayload,
        policyPayload,
        mistakesPayload,
        deliveryBonusesPayload,
        updatesPayload,
        calendarPayload,
        estimateError: estimateResult.status === 'rejected' ? getApiErrorMessage(estimateResult.reason) : null,
        policyError: policyResult.status === 'rejected' ? getApiErrorMessage(policyResult.reason) : null,
        mistakesError: mistakesResult.status === 'rejected' ? getApiErrorMessage(mistakesResult.reason) : null,
        deliveryBonusesError: deliveryBonusesResult.status === 'rejected' ? getApiErrorMessage(deliveryBonusesResult.reason) : null,
        updatesError: updatesResult.status === 'rejected' ? getApiErrorMessage(updatesResult.reason) : null,
        calendarError: calendarResult.status === 'rejected' ? getApiErrorMessage(calendarResult.reason) : null,
        year,
        month,
      })
    },
    [memberId, year, month],
    {
      enabled: Number.isFinite(memberId) && memberId > 0,
    },
  )

  const detail = detailQuery.data
  const compensationPolicy = detail?.compensationPolicy ?? null
  const mistakeCategoryOptions = getCompensationPolicyCategoryOptions(compensationPolicy)
  const severityOptions = getCompensationPolicySeverityOptions(compensationPolicy)
  const deliveryBonusTypeOptions = getCompensationPolicyDeliveryBonusOptions(compensationPolicy)
  const defaultCategory = mistakeCategoryOptions[0]?.value ?? 'AI Integration'
  const defaultSeverity = severityOptions[0]?.value ?? 'Minor'
  const defaultDeliveryBonusType = deliveryBonusTypeOptions[0]?.value ?? 'early_delivery'

  function updatePeriod(next: { year?: number; month?: number }) {
    const nextYear = next.year ?? year
    const nextMonth = next.month ?? month
    setSearchParams({
      year: String(nextYear),
      month: String(nextMonth),
    }, { replace: true })
  }

  function handleCalendarMonthShift(delta: number) {
    const shifted = new Date(year, month - 1 + delta, 1)
    updatePeriod({
      year: shifted.getFullYear(),
      month: shifted.getMonth() + 1,
    })
  }

  function handleCalendarTodayJump() {
    updatePeriod({
      year: defaultYear,
      month: defaultMonth,
    })
  }

  async function handleRefresh() {
    try {
      await Promise.all([
        detailQuery.refetch(),
        showCompensationActions ? allUsersQuery.refetch() : Promise.resolve(undefined),
      ])
      showToast({
        title: lt('Member detail refreshed'),
        description: `${detail?.report.fullName ?? lt('Member')} ${lt('synced for')} ${getMonthName(month)} ${year}.`,
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: lt('Member detail refresh failed'),
        description: getApiErrorMessage(error),
        tone: 'error',
      })
    }
  }

  function openMistakeDialog(record?: MemberMistakeRecord) {
    setEditingMistake(record ?? null)
    setMistakeDraft(
      record
        ? {
            reviewerId: String(record.reviewer_id ?? defaultReviewerId),
            projectId: String(record.project_id ?? 0),
            category: record.category,
            severity: record.severity,
            title: record.title,
            description: record.description ?? '',
            incidentDate: normalizeDateInput(record.incident_date ?? record.created_at),
            reachedClient: record.reached_client,
            unclearTask: record.unclear_task,
          }
        : createMistakeFormState(defaultReviewerId, defaultCategory, defaultSeverity),
    )
    setIsMistakeDialogOpen(true)
  }

  function openDeliveryBonusDialog(record?: MemberDeliveryBonusRecord) {
    setEditingDeliveryBonus(record ?? null)
    setDeliveryBonusDraft(
      record
        ? {
            projectId: String(record.project_id ?? 0),
            bonusType: record.bonus_type,
            title: record.title,
            description: record.description ?? '',
            awardDate: normalizeDateInput(record.award_date ?? record.created_at),
          }
        : createDeliveryBonusFormState(defaultDeliveryBonusType),
    )
    setIsDeliveryBonusDialogOpen(true)
  }

  function closeMistakeDialog() {
    setIsMistakeDialogOpen(false)
    setEditingMistake(null)
    setMistakeDraft(createMistakeFormState(defaultReviewerId, defaultCategory, defaultSeverity))
  }

  function closeDeliveryBonusDialog() {
    setIsDeliveryBonusDialogOpen(false)
    setEditingDeliveryBonus(null)
    setDeliveryBonusDraft(createDeliveryBonusFormState(defaultDeliveryBonusType))
  }

  function buildMistakePayload(): MemberMistakePayload | null {
    if (!detail) {
      return null
    }

    const reviewerId = parsePositiveId(mistakeDraft.reviewerId)

    if (!reviewerId) {
      showToast({
        title: lt('Reviewer is required'),
        description: lt('Select a valid reviewer before saving this mistake incident.'),
        tone: 'error',
      })
      return null
    }

    if (!mistakeDraft.title.trim() || !mistakeDraft.category.trim() || !mistakeDraft.severity.trim()) {
      showToast({
        title: lt('Mistake details incomplete'),
        description: lt('Title, category, and severity are required.'),
        tone: 'error',
      })
      return null
    }

    return {
      employee_id: detail.report.id,
      reviewer_id: reviewerId,
      project_id: parsePositiveId(mistakeDraft.projectId) ?? 0,
      category: mistakeDraft.category.trim(),
      severity: mistakeDraft.severity.trim(),
      title: mistakeDraft.title.trim(),
      description: mistakeDraft.description.trim() || undefined,
      incident_date: mistakeDraft.incidentDate,
      reached_client: mistakeDraft.reachedClient,
      unclear_task: mistakeDraft.unclearTask,
    }
  }

  function buildDeliveryBonusPayload(): MemberDeliveryBonusPayload | null {
    if (!detail) {
      return null
    }

    if (!deliveryBonusDraft.title.trim() || !deliveryBonusDraft.bonusType.trim()) {
      showToast({
        title: lt('Delivery bonus details incomplete'),
        description: lt('Title and bonus type are required.'),
        tone: 'error',
      })
      return null
    }

    return {
      employee_id: detail.report.id,
      bonus_type: deliveryBonusDraft.bonusType.trim(),
      title: deliveryBonusDraft.title.trim(),
      description: deliveryBonusDraft.description.trim() || undefined,
      award_date: deliveryBonusDraft.awardDate,
      project_id: parsePositiveId(deliveryBonusDraft.projectId) ?? 0,
    }
  }

  async function handleSubmitMistake() {
    const payload = buildMistakePayload()

    if (!payload || !detail) {
      return
    }

    setIsMistakeSubmitting(true)

    try {
      const response = editingMistake
        ? await membersService.updateMistake(editingMistake.id, payload)
        : await membersService.createMistake(payload)

      await detailQuery.refetch()
      closeMistakeDialog()
      showToast({
        title: editingMistake ? lt('Mistake updated') : lt('Mistake added'),
        description: getSuccessMessage(response, `${detail.report.fullName} ${lt('updated.')}`),
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: editingMistake ? lt('Mistake not updated') : lt('Mistake not added'),
        description: getApiErrorMessage(error),
        tone: 'error',
      })
    } finally {
      setIsMistakeSubmitting(false)
    }
  }

  async function handleSubmitDeliveryBonus() {
    const payload = buildDeliveryBonusPayload()

    if (!payload || !detail) {
      return
    }

    setIsDeliveryBonusSubmitting(true)

    try {
      const response = editingDeliveryBonus
        ? await membersService.updateDeliveryBonus(editingDeliveryBonus.id, payload)
        : await membersService.createDeliveryBonus(payload)

      await detailQuery.refetch()
      closeDeliveryBonusDialog()
      showToast({
        title: editingDeliveryBonus ? lt('Delivery bonus updated') : lt('Delivery bonus added'),
        description: getSuccessMessage(response, `${detail.report.fullName} ${lt('updated.')}`),
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: editingDeliveryBonus ? lt('Delivery bonus not updated') : lt('Delivery bonus not added'),
        description: getApiErrorMessage(error),
        tone: 'error',
      })
    } finally {
      setIsDeliveryBonusSubmitting(false)
    }
  }

  async function handleDeleteCompensationRecord() {
    if (!deleteTarget) {
      return
    }

    setIsDeleteSubmitting(true)

    try {
      const response =
        deleteTarget.kind === 'mistake'
          ? await membersService.deleteMistake(deleteTarget.record.id)
          : await membersService.deleteDeliveryBonus(deleteTarget.record.id)

      await detailQuery.refetch()
      showToast({
        title: deleteTarget.kind === 'mistake' ? lt('Mistake deleted') : lt('Delivery bonus deleted'),
        description: getSuccessMessage(response, `${deleteTarget.record.title} ${lt('removed.')}`),
        tone: 'success',
      })
      setDeleteTarget(null)
    } catch (error) {
      showToast({
        title: deleteTarget.kind === 'mistake' ? lt('Mistake not deleted') : lt('Delivery bonus not deleted'),
        description: getApiErrorMessage(error),
        tone: 'error',
      })
    } finally {
      setIsDeleteSubmitting(false)
    }
  }

  if (!Number.isFinite(memberId) || memberId <= 0) {
    return (
      <ErrorStateBlock
        eyebrow={pageEyebrow}
        title={lt('Invalid member ID')}
        description={lt('The member identifier in the route is invalid.')}
        actionLabel={errorActionLabel}
        onAction={() => navigate(backTarget)}
      />
    )
  }

  if (detailQuery.isLoading && !detail) {
    return (
      <LoadingStateBlock
        eyebrow={pageEyebrow}
        title={loadingTitle}
        description={loadingDescription}
      />
    )
  }

  if (detailQuery.isError || !detail) {
    return (
      <ErrorStateBlock
        eyebrow={pageEyebrow}
        title={lt('Member detail unavailable')}
        description={lt('Could not build a salary detail page for this member.')}
        actionLabel={errorActionLabel}
        onAction={() => navigate(backTarget)}
      />
    )
  }

  const updatesSummary = detail.updatesSummary
  const updatesCompletion =
    Number.isFinite(updatesSummary?.updatePercentage)
      ? updatesSummary!.updatePercentage
      : updatesSummary?.completionPercentage

  return (
    <section className="space-y-6 page-enter">
      {!isMemberUpdatesMode ? (
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(backTarget)}
            className="min-h-8 rounded-xl border border-[var(--border)] bg-white px-3 text-[11px] text-[var(--foreground)] hover:border-[var(--border-hover)] hover:bg-[var(--card-hover)] dark:border-white/8 dark:bg-white/[0.03] dark:text-white/78 dark:hover:border-white/12 dark:hover:bg-white/[0.05] dark:hover:text-white"
          >
            <svg viewBox="0 0 16 16" className="mr-1.5 h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 3.5 5.5 8 10 12.5" />
            </svg>
            {errorActionLabel}
          </Button>
        </div>
      ) : null}

      <Card variant="glass" noPadding className="overflow-hidden rounded-[28px] border-[var(--blue-border)]">
        <div className="relative overflow-hidden px-6 py-6 sm:px-8 sm:py-7">
          <div className="page-header-decor pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_38%),radial-gradient(circle_at_right,rgba(34,211,238,0.12),transparent_26%)]" />

          <div className="relative z-10 flex flex-col gap-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.02em] text-[var(--blue-text)]">
                  {topHeaderEyebrow}
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
                  {detail.report.fullName}
                </h1>
                <p className="mt-2 text-sm text-[var(--muted-strong)]">
                  {detail.report.roleLabel}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge variant="blue">{lt('Employee API detail')}</Badge>
                  <Badge variant={detail.report.hasPenalty ? 'danger' : 'outline'}>
                    {detail.report.hasPenalty ? lt('Penalty applied') : lt('No penalties')}
                  </Badge>
                  <Badge variant={detail.report.hasBonus ? 'blue' : 'outline'}>
                    {detail.report.hasBonus ? lt('Bonus applied') : lt('No bonuses')}
                  </Badge>
                  <Badge variant="outline">{detail.report.label}</Badge>
                </div>

                {detail.estimateError ? (
                  <p className="mt-4 text-xs leading-5 text-amber-300">
                    {lt('Estimate API unavailable')}: {detail.estimateError}
                  </p>
                ) : null}
                {detail.policyError ? (
                  <p className="mt-2 text-xs leading-5 text-amber-300">
                    {lt('Compensation policy unavailable')}: {detail.policyError}
                  </p>
                ) : null}
                {detail.mistakesError ? (
                  <p className="mt-2 text-xs leading-5 text-amber-300">
                    {lt('Mistake incidents unavailable')}: {detail.mistakesError}
                  </p>
                ) : null}
                {detail.deliveryBonusesError ? (
                  <p className="mt-2 text-xs leading-5 text-amber-300">
                    {lt('Delivery bonuses unavailable')}: {detail.deliveryBonusesError}
                  </p>
                ) : null}
                {detail.updatesError ? (
                  <p className="mt-2 text-xs leading-5 text-amber-300">
                    {lt('Update statistics unavailable')}: {detail.updatesError}
                  </p>
                ) : null}
                {detail.calendarError ? (
                  <p className="mt-2 text-xs leading-5 text-amber-300">
                    {lt('Daily update calendar unavailable')}: {detail.calendarError}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                {showCompensationActions ? (
                  <Button variant="ghost" size="sm" onClick={() => openMistakeDialog()} className="rounded-xl">
                    {tr('Add mistake', 'Xato qoshish', 'Dobavit oshibku')}
                  </Button>
                ) : null}
                {showCompensationActions ? (
                  <Button variant="success" size="sm" onClick={() => openDeliveryBonusDialog()} className="rounded-xl">
                    {tr('Add delivery bonus', 'Topshirish bonusini qoshish', 'Dobavit bonus za sdachu')}
                  </Button>
                ) : null}
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<RefreshIcon />}
                  onClick={() => void handleRefresh()}
                  loading={detailQuery.isLoading}
                  className="rounded-xl"
                >
                  {lt('Refresh details')}
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[var(--foreground)]">{lt('Year')}</label>
                <Input
                  type="number"
                  min="2020"
                  max="2035"
                  value={year}
                  onChange={(event) => updatePeriod({ year: clampNumber(Number(event.target.value) || defaultYear, 2020, 2035) })}
                  className="rounded-xl border-[var(--border)] bg-white dark:border-white/10 dark:bg-white/[0.03]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[var(--foreground)]">{lt('Month')}</label>
                <SelectField
                  value={String(month)}
                  options={monthOptions}
                  onValueChange={(value) => updatePeriod({ month: clampNumber(Number(value), 1, 12) })}
                  className="rounded-xl border-[var(--border)] bg-white dark:border-white/10 dark:bg-white/[0.03]"
                />
              </div>

              <div className="grid gap-3 md:self-end md:justify-items-end">
                <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                  {getMonthName(month)} {year}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <DetailStatTile label={lt('Final salary')} value={formatAmount(detail.report.finalSalary)} />
        <DetailStatTile label={lt('Estimated salary')} value={formatAmount(detail.report.estimatedSalary)} />
        <DetailStatTile label={lt('Deduction')} value={formatAmount(detail.report.deductionAmount)} tone="danger" />
        <DetailStatTile label={lt('Bonus amount')} value={formatAmount(detail.report.bonusAmount)} tone="blue" />
        <DetailStatTile label={lt('Bonus %')} value={formatPercent(detail.report.totalBonusPercent)} tone="blue" />
        <DetailStatTile
          label={lt('Productivity')}
          value={Number.isFinite(detail.report.productivityPercentage)
            ? `${formatCount(detail.report.updateDays)}/${formatCount(detail.report.workingDays)} / ${formatPercent(detail.report.productivityPercentage)}`
            : '-'}
          tone={detail.report.qualifiesProductivityBonus ? 'success' : 'default'}
        />
      </div>

      <Card className="rounded-[24px] border-white/10 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
              {lt('Compensation flow')}
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--foreground)]">
              {tr('How the final salary is built', 'Yakuniy maosh qanday shakllanadi', 'Kak formiruetsya itogovaya zarplata')}
            </h2>
          </div>
          <Badge variant={(detail.report.penaltyPercentage ?? 0) > 0 ? 'danger' : 'outline'} className="text-[#FF0000]">
            {formatPercent(detail.report.penaltyPercentage)} {tr('deduction impact', 'ayirma ta\'siri', 'влияние удержания')}
          </Badge>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DetailStatTile label={lt('Base salary')} value={formatAmount(detail.report.baseSalary)} />
          <DetailStatTile label={tr('After deduction', 'Ayirmadan keyin', 'После удержания')} value={formatAmount(detail.report.afterPenalty)} />
          <DetailStatTile label={lt('Mistakes')} value={formatCount(detail.report.mistakesCount)} tone="danger" />
          <DetailStatTile label={tr('Delivery bonuses', 'Topshirish bonuslari', 'Bonusy za sdachu')} value={formatCount(detail.report.deliveryBonusCount)} tone="blue" />
        </div>

        <div className="mt-5 rounded-[18px] border border-[var(--border)] bg-white px-4 py-4 dark:border-white/8 dark:bg-black/15">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-[var(--foreground)]">{formatAmount(detail.report.baseSalary)}</span>
            <span className="text-[var(--muted)]">-</span>
            <span className="font-semibold text-rose-400">{formatAmount(detail.report.deductionAmount)}</span>
            <span className="text-[var(--muted)]">+</span>
            <span className="font-semibold text-[var(--blue-text)]">{formatAmount(detail.report.bonusAmount)}</span>
            <span className="text-[var(--muted)]">=</span>
            <span className="text-base font-semibold tracking-tight text-[var(--foreground)]">
              {formatAmount(detail.report.finalSalary)}
            </span>
          </div>
          <p className="mt-3 text-xs text-[var(--muted-strong)]">
            {detail.report.qualifiesProductivityBonus
              ? lt('Productivity bonus qualified for this period.')
              : lt('Productivity bonus did not qualify for this period.')}
          </p>
          <div className="mt-4 h-2 rounded-full bg-[var(--surface-elevated)] dark:bg-white/8">
            <div
              className="h-full rounded-full bg-rose-500 transition-[width] duration-300"
              style={{ width: `${Math.min(100, Math.max(0, Number.isFinite(detail.report.penaltyPercentage) ? detail.report.penaltyPercentage : 0))}%` }}
            />
          </div>
        </div>
      </Card>

      <Card className="rounded-[24px] border-white/10 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
              {lt('Monthly execution')}
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--foreground)]">
              {lt('Salary context and update performance')}
            </h2>
          </div>
          <Badge
            variant={updatesSummary ? 'blue' : 'outline'}
          >
            {updatesSummary
              ? `${formatPercent(updatesSummary.completionPercentage)} ${lt('completion')}`
              : lt('No update stats')}
          </Badge>
        </div>

        {updatesSummary ? (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <DetailStatTile label={lt('Logged updates')} value={formatCount(updatesSummary.submittedCount)} />
              <DetailStatTile label={lt('Missing days')} value={formatCount(updatesSummary.missingCount)} tone="danger" />
              <DetailStatTile label={lt('Total updates')} value={formatCount(updatesSummary.totalUpdates)} />
              <DetailStatTile
                label={lt('Update percentage')}
                value={formatPercent(updatesCompletion)}
                tone={updatesSummary ? 'blue' : 'default'}
              />
            </div>

            <div className="mt-4 grid gap-3 xl:grid-cols-3">
              <div className="rounded-[18px] border border-[var(--border)] bg-white px-4 py-3 dark:border-white/8 dark:bg-black/15">
                <p className="text-xs text-[var(--muted-strong)]">{tr('Last update', 'Oxirgi yangilanish', 'Poslednee obnovlenie')}</p>
                <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                  {updatesSummary!.lastUpdateDate ? formatDetailDate(updatesSummary!.lastUpdateDate) : tr('Not provided', 'Kiritilmagan', 'Ne ukazano')}
                </p>
              </div>
              <div className="rounded-[18px] border border-[var(--border)] bg-white px-4 py-3 dark:border-white/8 dark:bg-black/15">
                <p className="text-xs text-[var(--muted-strong)]">{tr('Next payment date', 'Keyingi tolov sanasi', 'Data sleduyushchei oplaty')}</p>
                <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                  {updatesSummary!.nextPaymentDate ? formatDetailDate(updatesSummary!.nextPaymentDate) : tr('Not provided', 'Kiritilmagan', 'Ne ukazano')}
                </p>
              </div>
              <div className="rounded-[18px] border border-[var(--border)] bg-white px-4 py-3 dark:border-white/8 dark:bg-black/15">
                <p className="text-xs text-[var(--muted-strong)]">{tr('Salary amount in update record', 'Yangilanish yozuvidagi maosh summasi', 'Summa zarplaty v zapisi ob obnovlenii')}</p>
                <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                  {typeof updatesSummary!.salaryAmount === 'number'
                    ? formatAmount(updatesSummary!.salaryAmount)
                    : tr('Not returned', 'Qaytmadi', 'Ne vernulos')}
                </p>
              </div>
            </div>

            {updatesSummary!.note ? (
              <div className="mt-4 rounded-[18px] border border-[var(--border)] bg-white px-4 py-4 dark:border-white/8 dark:bg-black/15">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  {lt('Manager note')}
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--foreground)]">
                  {updatesSummary!.note}
                </p>
              </div>
            ) : null}

            {detail.updateCalendar ? (
              <MemberMonthlyUpdateCalendarBoard
                calendar={detail.updateCalendar}
                className="mt-5"
                onMonthShift={handleCalendarMonthShift}
                onJumpToToday={handleCalendarTodayJump}
              />
            ) : detail.calendarError ? (
              <div className="mt-4 rounded-[18px] border border-dashed border-amber-300 bg-amber-50/85 px-4 py-5 text-sm font-medium text-amber-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] dark:border-amber-500/30 dark:bg-amber-500/8 dark:text-amber-100/80 dark:shadow-none">
                {lt('Monthly calendar could not be loaded from the CEO employee updates endpoint.')}
              </div>
            ) : null}
          </>
        ) : (
          <>
            <div className="mt-4 rounded-[18px] border border-dashed border-[var(--border)] bg-white px-4 py-5 text-sm text-[var(--muted-strong)] dark:border-white/10 dark:bg-black/10">
              {lt('No monthly update statistics were returned for this member.')}
            </div>

            {detail.updateCalendar ? (
              <MemberMonthlyUpdateCalendarBoard
                calendar={detail.updateCalendar}
                className="mt-5"
                onMonthShift={handleCalendarMonthShift}
                onJumpToToday={handleCalendarTodayJump}
              />
            ) : detail.calendarError ? (
              <div className="mt-4 rounded-[18px] border border-dashed border-amber-300 bg-amber-50/85 px-4 py-5 text-sm font-medium text-amber-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] dark:border-amber-500/30 dark:bg-amber-500/8 dark:text-amber-100/80 dark:shadow-none">
                {lt('Monthly calendar could not be loaded from the CEO employee updates endpoint.')}
              </div>
            ) : null}
          </>
        )}
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="relative overflow-hidden rounded-[24px] border border-[var(--danger-border)] bg-white p-6 dark:border-rose-500/18 dark:bg-[var(--card)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,#dc2626,rgba(220,38,38,0.72),transparent_78%)] dark:bg-[linear-gradient(90deg,rgba(254,205,211,0.94),rgba(251,113,133,0.44),transparent_78%)]" />
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[12px] font-extrabold uppercase tracking-[0.24em] text-[#FF0000]">
                {tr('Deduction history', 'Ayirma tarixi', 'История удержаний')}
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--foreground)]">
                {tr('Deduction records for this month', 'Bu oy uchun ayirma yozuvlari', 'Записи удержаний за этот месяц')}
              </h2>
            </div>
            <Badge variant={detail.penalties.length > 0 ? 'danger' : 'outline'}>
              {detail.penalties.length} {lt('entries')}
            </Badge>
          </div>

          <div className="mt-4 space-y-3">
            {detail.penalties.length > 0 ? detail.penalties.map((item) => (
              <div key={item.id} className="rounded-[18px] border border-[var(--danger-border)] bg-rose-100/90 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] dark:border-rose-500/18 dark:bg-black/15 dark:shadow-none">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--foreground)]">{item.title}</p>
                    {item.description ? (
                      <p className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">
                        {item.description}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {item.percentage ? <Badge variant="outline">{formatPercent(item.percentage)}</Badge> : null}
                      {item.createdAt ? <Badge variant="outline">{formatDetailDate(item.createdAt)}</Badge> : null}
                    </div>
                  </div>
                  <p className="text-base font-semibold tracking-tight text-[#b91c1c] dark:text-rose-400">
                    {formatAmount(item.amount)}
                  </p>
                </div>
              </div>
            )) : (
              <div className="rounded-[18px] border border-dashed border-[var(--danger-border)] bg-rose-100/75 px-4 py-5 text-sm text-[var(--muted-strong)] dark:border-rose-500/18 dark:bg-black/10">
                {tr('No deduction line-items were returned for this member in the selected month.', 'Tanlangan oy uchun bu xodim bo‘yicha ayirma yozuvlari qaytmadi.', 'За выбранный месяц для этого сотрудника не вернулись записи удержаний.')}
              </div>
            )}
          </div>
        </Card>

        <Card className="relative overflow-hidden rounded-[24px] border border-[var(--success-border)] bg-white p-6 dark:border-emerald-500/18 dark:bg-[var(--card)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,#16a34a,rgba(22,163,74,0.72),transparent_78%)] dark:bg-[linear-gradient(90deg,rgba(209,250,229,0.94),rgba(52,211,153,0.44),transparent_78%)]" />
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[12px] font-extrabold uppercase tracking-[0.24em] text-[#48A111]">
                {tr('Bonus ledger', 'Bonuslar reyestri', 'Reestr bonusov')}
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--foreground)]">
                {tr('Bonuses for this month', 'Bu oy uchun bonuslar', 'Бонусы за этот месяц')}
              </h2>
            </div>
            <Badge variant={detail.bonuses.length > 0 ? 'success' : 'outline'}>
              {detail.bonuses.length} {lt('entries')}
            </Badge>
          </div>

          <div className="mt-4 space-y-3">
            {detail.bonuses.length > 0 ? detail.bonuses.map((item) => (
              <div key={item.id} className="rounded-[18px] border border-[var(--success-border)] bg-emerald-100/90 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] dark:border-emerald-500/18 dark:bg-black/15 dark:shadow-none">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#48A111]">{item.title}</p>
                    {item.description ? (
                      <p className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">
                        {item.description}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {item.createdAt ? <Badge variant="outline">{formatDetailDate(item.createdAt)}</Badge> : null}
                    </div>
                  </div>
                  <p className="text-base font-semibold tracking-tight text-[#166534] dark:text-emerald-400">
                    {formatAmount(item.amount)}
                  </p>
                </div>
              </div>
            )) : (
              <div className="rounded-[18px] border border-dashed border-[var(--success-border)] bg-emerald-100/75 px-4 py-5 text-sm text-[var(--muted-strong)] dark:border-emerald-500/18 dark:bg-black/10">
                {lt('No bonus line-items were returned for this member in the selected month.')}
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <MistakeIncidentSection
          items={detail.mistakes}
          editable={showCompensationActions}
          onAdd={showCompensationActions ? () => openMistakeDialog() : undefined}
          onEdit={showCompensationActions ? (item) => openMistakeDialog(item) : undefined}
          onDelete={showCompensationActions ? (item) => setDeleteTarget({ kind: 'mistake', record: item }) : undefined}
        />
        <DeliveryBonusSection
          items={detail.deliveryBonuses}
          editable={showCompensationActions}
          onAdd={showCompensationActions ? () => openDeliveryBonusDialog() : undefined}
          onEdit={showCompensationActions ? (item) => openDeliveryBonusDialog(item) : undefined}
          onDelete={showCompensationActions ? (item) => setDeleteTarget({ kind: 'delivery-bonus', record: item }) : undefined}
        />
      </div>

      <CompensationPolicyPanel policy={detail.compensationPolicy} />

      {showCompensationActions ? (
        <Dialog
          open={isMistakeDialogOpen}
          onClose={closeMistakeDialog}
          title={`${editingMistake ? lt('Edit') : lt('Add')} ${lt('mistake for')} ${detail.report.fullName}`}
          description={`${getMonthName(month)} ${year} ${lt('compensation mistake incident.')}`}
          footer={
            <>
              <Button variant="secondary" onClick={closeMistakeDialog} disabled={isMistakeSubmitting}>
                {lt('Cancel')}
              </Button>
              <Button variant="danger" onClick={() => void handleSubmitMistake()} loading={isMistakeSubmitting}>
                {editingMistake ? lt('Update mistake') : lt('Save mistake')}
              </Button>
            </>
          }
        >
          <div className="grid gap-4">
            <div className="rounded-[18px] border border-[var(--border)] bg-white px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-xs text-[var(--muted-strong)]">{lt('Employee')}</p>
              <p className="mt-2 text-base font-semibold text-[var(--foreground)] dark:text-white">{detail.report.fullName}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[var(--foreground)] dark:text-white">{lt('Reviewer')}</label>
                {reviewerOptions.length > 0 ? (
                  <SelectField
                    value={mistakeDraft.reviewerId}
                    options={reviewerOptions}
                    onValueChange={(value) => setMistakeDraft((current) => ({ ...current, reviewerId: value }))}
                    className="rounded-xl"
                  />
                ) : (
                  <Input
                    type="number"
                    min="1"
                    value={mistakeDraft.reviewerId}
                    onChange={(event) => setMistakeDraft((current) => ({ ...current, reviewerId: event.target.value }))}
                    placeholder={lt('Reviewer ID')}
                  />
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[var(--foreground)] dark:text-white">{lt('Project')}</label>
                {projectOptions.length > 1 ? (
                  <SelectField
                    value={mistakeDraft.projectId}
                    options={projectOptions}
                    onValueChange={(value) => setMistakeDraft((current) => ({ ...current, projectId: value }))}
                    className="rounded-xl"
                  />
                ) : (
                  <Input
                    type="number"
                    min="0"
                    value={mistakeDraft.projectId}
                    onChange={(event) => setMistakeDraft((current) => ({ ...current, projectId: event.target.value }))}
                    placeholder={lt('0 for no project')}
                  />
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[var(--foreground)] dark:text-white">{lt('Category')}</label>
                {mistakeCategoryOptions.length > 0 ? (
                  <SelectField
                    value={mistakeDraft.category}
                    options={mistakeCategoryOptions}
                    onValueChange={(value) => setMistakeDraft((current) => ({ ...current, category: value }))}
                    className="rounded-xl"
                  />
                ) : (
                  <Input
                    value={mistakeDraft.category}
                    onChange={(event) => setMistakeDraft((current) => ({ ...current, category: event.target.value }))}
                    placeholder={lt('AI Integration')}
                  />
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[var(--foreground)] dark:text-white">{lt('Severity')}</label>
                {severityOptions.length > 0 ? (
                  <SelectField
                    value={mistakeDraft.severity}
                    options={severityOptions}
                    onValueChange={(value) => setMistakeDraft((current) => ({ ...current, severity: value }))}
                    className="rounded-xl"
                  />
                ) : (
                  <Input
                    value={mistakeDraft.severity}
                    onChange={(event) => setMistakeDraft((current) => ({ ...current, severity: event.target.value }))}
                    placeholder={lt('Minor')}
                  />
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_180px]">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[var(--foreground)] dark:text-white">{lt('Title')}</label>
                <Input
                  value={mistakeDraft.title}
                  onChange={(event) => setMistakeDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder={lt('Short mistake title')}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[var(--foreground)] dark:text-white">{lt('Incident date')}</label>
                <Input
                  type="date"
                  value={mistakeDraft.incidentDate}
                  onChange={(event) => setMistakeDraft((current) => ({ ...current, incidentDate: event.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[var(--foreground)] dark:text-white">{lt('Description')}</label>
              <Textarea
                value={mistakeDraft.description}
                onChange={(event) => setMistakeDraft((current) => ({ ...current, description: event.target.value }))}
                placeholder={lt('Describe what happened')}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-[18px] border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--foreground)] dark:border-white/10 dark:bg-white/[0.03] dark:text-white/84">
                <input
                  type="checkbox"
                  checked={mistakeDraft.reachedClient}
                  onChange={(event) => setMistakeDraft((current) => ({ ...current, reachedClient: event.target.checked }))}
                  className="h-4 w-4 rounded border border-[var(--border)] bg-[var(--input-surface)] accent-blue-500 dark:border-white/15 dark:bg-transparent"
                />
                {lt('Reached client')}
              </label>

              <label className="flex items-center gap-3 rounded-[18px] border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--foreground)] dark:border-white/10 dark:bg-white/[0.03] dark:text-white/84">
                <input
                  type="checkbox"
                  checked={mistakeDraft.unclearTask}
                  onChange={(event) => setMistakeDraft((current) => ({ ...current, unclearTask: event.target.checked }))}
                  className="h-4 w-4 rounded border border-[var(--border)] bg-[var(--input-surface)] accent-blue-500 dark:border-white/15 dark:bg-transparent"
                />
                {lt('Unclear task')}
              </label>
            </div>
          </div>
        </Dialog>
      ) : null}

      {showCompensationActions ? (
        <Dialog
          open={isDeliveryBonusDialogOpen}
          onClose={closeDeliveryBonusDialog}
          title={`${editingDeliveryBonus ? lt('Edit') : lt('Add')} ${lt('delivery bonus for')} ${detail.report.fullName}`}
          description={`${getMonthName(month)} ${year} ${lt('delivery bonus record.')}`}
          footer={
            <>
              <Button variant="secondary" onClick={closeDeliveryBonusDialog} disabled={isDeliveryBonusSubmitting}>
                {lt('Cancel')}
              </Button>
              <Button variant="success" onClick={() => void handleSubmitDeliveryBonus()} loading={isDeliveryBonusSubmitting}>
                {editingDeliveryBonus ? lt('Update delivery bonus') : lt('Save delivery bonus')}
              </Button>
            </>
          }
        >
          <div className="grid gap-4">
            <div className="rounded-[18px] border border-[var(--border)] bg-white px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-xs text-[var(--muted-strong)]">{lt('Employee')}</p>
              <p className="mt-2 text-base font-semibold text-[var(--foreground)] dark:text-white">{detail.report.fullName}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[var(--foreground)] dark:text-white">{lt('Bonus type')}</label>
                {deliveryBonusTypeOptions.length > 0 ? (
                  <SelectField
                    value={deliveryBonusDraft.bonusType}
                    options={deliveryBonusTypeOptions}
                    onValueChange={(value) => setDeliveryBonusDraft((current) => ({ ...current, bonusType: value }))}
                    className="rounded-xl"
                  />
                ) : (
                  <Input
                    value={deliveryBonusDraft.bonusType}
                    onChange={(event) => setDeliveryBonusDraft((current) => ({ ...current, bonusType: event.target.value }))}
                    placeholder={lt('early_delivery')}
                  />
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[var(--foreground)] dark:text-white">{lt('Award date')}</label>
                <Input
                  type="date"
                  value={deliveryBonusDraft.awardDate}
                  onChange={(event) => setDeliveryBonusDraft((current) => ({ ...current, awardDate: event.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[var(--foreground)] dark:text-white">{lt('Title')}</label>
              <Input
                value={deliveryBonusDraft.title}
                onChange={(event) => setDeliveryBonusDraft((current) => ({ ...current, title: event.target.value }))}
                placeholder={lt('Short bonus title')}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[var(--foreground)] dark:text-white">{lt('Project')}</label>
              {projectOptions.length > 1 ? (
                <SelectField
                  value={deliveryBonusDraft.projectId}
                  options={projectOptions}
                  onValueChange={(value) => setDeliveryBonusDraft((current) => ({ ...current, projectId: value }))}
                  className="rounded-xl"
                />
              ) : (
                <Input
                  type="number"
                  min="0"
                  value={deliveryBonusDraft.projectId}
                  onChange={(event) => setDeliveryBonusDraft((current) => ({ ...current, projectId: event.target.value }))}
                  placeholder={lt('0 for no project')}
                />
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[var(--foreground)] dark:text-white">{lt('Description')}</label>
              <Textarea
                value={deliveryBonusDraft.description}
                onChange={(event) => setDeliveryBonusDraft((current) => ({ ...current, description: event.target.value }))}
                placeholder={lt('Describe why this delivery bonus was awarded')}
              />
            </div>
          </div>
        </Dialog>
      ) : null}

      {showCompensationActions ? (
        <Dialog
          open={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          title={deleteTarget?.kind === 'mistake' ? lt('Delete mistake incident') : lt('Delete delivery bonus')}
          description={deleteTarget ? `${lt('This will remove')} "${deleteTarget.record.title}" ${lt('from the selected month.')}` : undefined}
          tone="danger"
          footer={
            <>
              <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={isDeleteSubmitting}>
                {lt('Cancel')}
              </Button>
              <Button variant="danger" onClick={() => void handleDeleteCompensationRecord()} loading={isDeleteSubmitting}>
                {lt('Delete record')}
              </Button>
            </>
          }
        >
          <div className="rounded-[18px] border border-red-500/20 bg-red-50 px-4 py-4 text-sm text-[var(--muted-strong)] dark:bg-red-500/8 dark:text-white/84">
            <p className="font-semibold text-[var(--foreground)] dark:text-white">{deleteTarget?.record.title}</p>
            <p className="mt-2 text-sm text-[var(--muted-strong)] dark:text-white/72">
              {deleteTarget?.kind === 'mistake'
                ? lt('The mistake incident entry will be permanently removed from this employee history.')
                : lt('The delivery bonus record will be permanently removed from this employee history.')}
            </p>
          </div>
        </Dialog>
      ) : null}
    </section>
  )
}
