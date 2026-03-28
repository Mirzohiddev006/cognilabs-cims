import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
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
  getMonthName,
  getSuccessMessage,
  isRecord,
  monthOptions,
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

  const isMemberUpdatesMode = mode === 'member-updates'
  const memberId = memberIdOverride ?? Number(params.memberId)
  const year = parsePeriodNumber(searchParams.get('year'), defaultYear, 2020, 2035)
  const month = parsePeriodNumber(searchParams.get('month'), defaultMonth, 1, 12)
  const pageEyebrow = isMemberUpdatesMode ? 'Updates / My Detail' : 'CEO / Salary / Detail'
  const loadingTitle = isMemberUpdatesMode ? 'Loading your update detail' : 'Loading member salary detail'
  const loadingDescription = isMemberUpdatesMode
    ? 'Retrieving your monthly update context, estimate snapshot and activity details.'
    : 'Retrieving member estimate, penalties, bonuses, and monthly update context.'
  const errorActionLabel = isMemberUpdatesMode ? 'Back to dashboard' : 'Back to salary estimates'
  const backTarget = isMemberUpdatesMode ? '/member/dashboard' : `/faults?year=${year}&month=${month}`
  const topHeaderEyebrow = isMemberUpdatesMode ? 'My Update Detail' : 'CEO Salary Detail'
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
        label: `${user.name} ${user.surname}`.trim() || user.email || `Reviewer #${user.id}`,
      }))
    : (reviewerOptionsQuery.data ?? []).map((member) => ({
        value: String(member.id),
        label: member.full_name || `${member.name} ${member.surname}`.trim() || `Reviewer #${member.id}`,
      })))
  const projectOptions = [
    { value: '0', label: 'No project' },
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
                roleLabel: historyReport?.roleLabel ?? 'Member',
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
        title: 'Member detail refreshed',
        description: `${detail?.report.fullName ?? 'Member'} synced for ${getMonthName(month)} ${year}.`,
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Member detail refresh failed',
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
        title: 'Reviewer is required',
        description: 'Select a valid reviewer before saving this mistake incident.',
        tone: 'error',
      })
      return null
    }

    if (!mistakeDraft.title.trim() || !mistakeDraft.category.trim() || !mistakeDraft.severity.trim()) {
      showToast({
        title: 'Mistake details incomplete',
        description: 'Title, category, and severity are required.',
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
        title: 'Delivery bonus details incomplete',
        description: 'Title and bonus type are required.',
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
        title: editingMistake ? 'Mistake updated' : 'Mistake added',
        description: getSuccessMessage(response, `${detail.report.fullName} updated.`),
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: editingMistake ? 'Mistake not updated' : 'Mistake not added',
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
        title: editingDeliveryBonus ? 'Delivery bonus updated' : 'Delivery bonus added',
        description: getSuccessMessage(response, `${detail.report.fullName} updated.`),
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: editingDeliveryBonus ? 'Delivery bonus not updated' : 'Delivery bonus not added',
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
        title: deleteTarget.kind === 'mistake' ? 'Mistake deleted' : 'Delivery bonus deleted',
        description: getSuccessMessage(response, `${deleteTarget.record.title} removed.`),
        tone: 'success',
      })
      setDeleteTarget(null)
    } catch (error) {
      showToast({
        title: deleteTarget.kind === 'mistake' ? 'Mistake not deleted' : 'Delivery bonus not deleted',
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
        title="Invalid member ID"
        description="The member identifier in the route is invalid."
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
        title="Member detail unavailable"
        description="Could not build a salary detail page for this member."
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
            className="min-h-8 rounded-xl border border-white/8 bg-white/[0.03] px-3 text-[11px] text-white/78 hover:border-white/12 hover:bg-white/[0.05] hover:text-white"
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
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_38%),radial-gradient(circle_at_right,rgba(34,211,238,0.12),transparent_26%)]" />

          <div className="relative z-10 flex flex-col gap-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.02em] text-[var(--blue-text)]">
                  {topHeaderEyebrow}
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                  {detail.report.fullName}
                </h1>
                <p className="mt-2 text-sm text-[var(--muted-strong)]">
                  {detail.report.roleLabel}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge variant="blue">Employee API detail</Badge>
                  <Badge variant={detail.report.hasPenalty ? 'danger' : 'outline'}>
                    {detail.report.hasPenalty ? 'Penalty applied' : 'No penalties'}
                  </Badge>
                  <Badge variant={detail.report.hasBonus ? 'blue' : 'outline'}>
                    {detail.report.hasBonus ? 'Bonus applied' : 'No bonuses'}
                  </Badge>
                  <Badge variant="outline">{detail.report.label}</Badge>
                </div>

                {detail.estimateError ? (
                  <p className="mt-4 text-xs leading-5 text-amber-300">
                    Estimate API unavailable: {detail.estimateError}
                  </p>
                ) : null}
                {detail.policyError ? (
                  <p className="mt-2 text-xs leading-5 text-amber-300">
                    Compensation policy unavailable: {detail.policyError}
                  </p>
                ) : null}
                {detail.mistakesError ? (
                  <p className="mt-2 text-xs leading-5 text-amber-300">
                    Mistake incidents unavailable: {detail.mistakesError}
                  </p>
                ) : null}
                {detail.deliveryBonusesError ? (
                  <p className="mt-2 text-xs leading-5 text-amber-300">
                    Delivery bonuses unavailable: {detail.deliveryBonusesError}
                  </p>
                ) : null}
                {detail.updatesError ? (
                  <p className="mt-2 text-xs leading-5 text-amber-300">
                    Update statistics unavailable: {detail.updatesError}
                  </p>
                ) : null}
                {detail.calendarError ? (
                  <p className="mt-2 text-xs leading-5 text-amber-300">
                    Daily update calendar unavailable: {detail.calendarError}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                {showCompensationActions ? (
                  <Button variant="ghost" size="sm" onClick={() => openMistakeDialog()} className="rounded-xl">
                    Add mistake
                  </Button>
                ) : null}
                {showCompensationActions ? (
                  <Button variant="success" size="sm" onClick={() => openDeliveryBonusDialog()} className="rounded-xl">
                    Add delivery bonus
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
                  Refresh details
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
              <div>
                <label className="mb-2 block text-sm font-semibold text-white">Year</label>
                <Input
                  type="number"
                  min="2020"
                  max="2035"
                  value={year}
                  onChange={(event) => updatePeriod({ year: clampNumber(Number(event.target.value) || defaultYear, 2020, 2035) })}
                  className="rounded-xl border-white/10 bg-white/[0.03]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-white">Month</label>
                <SelectField
                  value={String(month)}
                  options={monthOptions}
                  onValueChange={(value) => updatePeriod({ month: clampNumber(Number(value), 1, 12) })}
                  className="rounded-xl border-white/10 bg-white/[0.03]"
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
        <DetailStatTile label="Final salary" value={formatAmount(detail.report.finalSalary)} />
        <DetailStatTile label="Estimated salary" value={formatAmount(detail.report.estimatedSalary)} />
        <DetailStatTile label="Deduction" value={formatAmount(detail.report.deductionAmount)} tone="danger" />
        <DetailStatTile label="Bonus amount" value={formatAmount(detail.report.bonusAmount)} tone="blue" />
        <DetailStatTile label="Bonus %" value={formatPercent(detail.report.totalBonusPercent)} tone="blue" />
        <DetailStatTile
          label="Productivity"
          value={Number.isFinite(detail.report.productivityPercentage)
            ? `${formatCount(detail.report.updateDays)}/${formatCount(detail.report.workingDays)} / ${formatPercent(detail.report.productivityPercentage)}`
            : '-'}
          tone={detail.report.qualifiesProductivityBonus ? 'success' : 'default'}
        />
      </div>

      <CompensationPolicyPanel policy={detail.compensationPolicy} />

      <Card className="rounded-[24px] border-white/10 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
              Compensation flow
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
              How the final salary is built
            </h2>
          </div>
          <Badge variant={(detail.report.penaltyPercentage ?? 0) > 0 ? 'danger' : 'outline'}>
            {formatPercent(detail.report.penaltyPercentage)} penalty impact
          </Badge>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <DetailStatTile label="Base salary" value={formatAmount(detail.report.baseSalary)} />
          <DetailStatTile label="After penalty" value={formatAmount(detail.report.afterPenalty)} />
          <DetailStatTile label="Penalty points" value={formatCount(detail.report.penaltyPoints)} tone="danger" />
          <DetailStatTile label="Bonus entries" value={formatCount(detail.report.bonusEntries)} tone="blue" />
          <DetailStatTile label="Mistakes" value={formatCount(detail.report.mistakesCount)} tone="danger" />
          <DetailStatTile label="Delivery bonuses" value={formatCount(detail.report.deliveryBonusCount)} tone="blue" />
        </div>

        <div className="mt-5 rounded-[18px] border border-white/8 bg-black/15 px-4 py-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-white/72">{formatAmount(detail.report.baseSalary)}</span>
            <span className="text-white/25">-</span>
            <span className="font-semibold text-rose-400">{formatAmount(detail.report.deductionAmount)}</span>
            <span className="text-white/25">+</span>
            <span className="font-semibold text-[var(--blue-text)]">{formatAmount(detail.report.bonusAmount)}</span>
            <span className="text-white/25">=</span>
            <span className="text-base font-semibold tracking-tight text-white">
              {formatAmount(detail.report.finalSalary)}
            </span>
          </div>
          <p className="mt-3 text-xs text-white/56">
            {detail.report.qualifiesProductivityBonus
              ? 'Productivity bonus qualified for this period.'
              : 'Productivity bonus did not qualify for this period.'}
          </p>
          <div className="mt-4 h-2 rounded-full bg-white/8">
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
              Monthly execution
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
              Salary context and update performance
            </h2>
          </div>
          <Badge
            variant={updatesSummary ? 'blue' : 'outline'}
          >
            {updatesSummary
              ? `${formatPercent(updatesSummary.completionPercentage)} completion`
              : 'No update stats'}
          </Badge>
        </div>

        {updatesSummary ? (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <DetailStatTile label="Logged updates" value={formatCount(updatesSummary.submittedCount)} />
              <DetailStatTile label="Missing days" value={formatCount(updatesSummary.missingCount)} tone="danger" />
              <DetailStatTile label="Total updates" value={formatCount(updatesSummary.totalUpdates)} />
              <DetailStatTile
                label="Update percentage"
                value={formatPercent(updatesCompletion)}
                tone={updatesSummary ? 'blue' : 'default'}
              />
            </div>

            <div className="mt-4 grid gap-3 xl:grid-cols-3">
              <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3">
                <p className="text-xs text-[var(--muted-strong)]">Last update</p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {formatDetailDate(updatesSummary!.lastUpdateDate)}
                </p>
              </div>
              <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3">
                <p className="text-xs text-[var(--muted-strong)]">Next payment date</p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {formatDetailDate(updatesSummary!.nextPaymentDate)}
                </p>
              </div>
              <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3">
                <p className="text-xs text-[var(--muted-strong)]">Salary amount in update record</p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {typeof updatesSummary!.salaryAmount === 'number'
                    ? formatAmount(updatesSummary!.salaryAmount)
                    : 'Not returned'}
                </p>
              </div>
            </div>

            {updatesSummary!.note ? (
              <div className="mt-4 rounded-[18px] border border-white/8 bg-black/15 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Manager note
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/80">
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
              <div className="mt-4 rounded-[18px] border border-dashed border-amber-500/30 bg-amber-500/8 px-4 py-5 text-sm text-amber-100/80">
                Monthly calendar could not be loaded from the CEO employee updates endpoint.
              </div>
            ) : null}
          </>
        ) : (
          <>
            <div className="mt-4 rounded-[18px] border border-dashed border-white/10 bg-black/10 px-4 py-5 text-sm text-[var(--muted-strong)]">
              No monthly update statistics were returned for this member.
            </div>

            {detail.updateCalendar ? (
              <MemberMonthlyUpdateCalendarBoard
                calendar={detail.updateCalendar}
                className="mt-5"
                onMonthShift={handleCalendarMonthShift}
                onJumpToToday={handleCalendarTodayJump}
              />
            ) : detail.calendarError ? (
              <div className="mt-4 rounded-[18px] border border-dashed border-amber-500/30 bg-amber-500/8 px-4 py-5 text-sm text-amber-100/80">
                Monthly calendar could not be loaded from the CEO employee updates endpoint.
              </div>
            ) : null}
          </>
        )}
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-[24px] border-rose-500/18 bg-[linear-gradient(180deg,rgba(56,16,22,0.30),rgba(18,12,15,0.92))] p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-rose-200/70">
                Penalty ledger
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
                Penalty entries for this month
              </h2>
            </div>
            <Badge variant={detail.penalties.length > 0 ? 'danger' : 'outline'}>
              {detail.penalties.length} entries
            </Badge>
          </div>

          <div className="mt-4 space-y-3">
            {detail.penalties.length > 0 ? detail.penalties.map((item) => (
              <div key={item.id} className="rounded-[18px] border border-rose-500/18 bg-black/15 px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    {item.description ? (
                      <p className="mt-1 text-xs leading-5 text-rose-100/72">
                        {item.description}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {item.points ? <Badge variant="danger">{item.points} points</Badge> : null}
                      {item.percentage ? <Badge variant="outline">{formatPercent(item.percentage)}</Badge> : null}
                      {item.createdAt ? <Badge variant="outline">{formatDetailDate(item.createdAt)}</Badge> : null}
                    </div>
                  </div>
                  <p className="text-base font-semibold tracking-tight text-rose-400">
                    {formatAmount(item.amount)}
                  </p>
                </div>
              </div>
            )) : (
              <div className="rounded-[18px] border border-dashed border-rose-500/18 bg-black/10 px-4 py-5 text-sm text-rose-100/72">
                No penalty line-items were returned for this member in the selected month.
              </div>
            )}
          </div>
        </Card>

        <Card className="rounded-[24px] border-emerald-500/18 bg-[linear-gradient(180deg,rgba(10,52,37,0.30),rgba(7,18,14,0.92))] p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-200/70">
                Bonus ledger
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
                Bonus entries for this month
              </h2>
            </div>
            <Badge variant={detail.bonuses.length > 0 ? 'success' : 'outline'}>
              {detail.bonuses.length} entries
            </Badge>
          </div>

          <div className="mt-4 space-y-3">
            {detail.bonuses.length > 0 ? detail.bonuses.map((item) => (
              <div key={item.id} className="rounded-[18px] border border-emerald-500/18 bg-black/15 px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    {item.description ? (
                      <p className="mt-1 text-xs leading-5 text-emerald-100/72">
                        {item.description}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {item.createdAt ? <Badge variant="outline">{formatDetailDate(item.createdAt)}</Badge> : null}
                    </div>
                  </div>
                  <p className="text-base font-semibold tracking-tight text-emerald-400">
                    {formatAmount(item.amount)}
                  </p>
                </div>
              </div>
            )) : (
              <div className="rounded-[18px] border border-dashed border-emerald-500/18 bg-black/10 px-4 py-5 text-sm text-emerald-100/72">
                No bonus line-items were returned for this member in the selected month.
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

      {showCompensationActions ? (
        <Dialog
          open={isMistakeDialogOpen}
          onClose={closeMistakeDialog}
          title={`${editingMistake ? 'Edit' : 'Add'} mistake for ${detail.report.fullName}`}
          description={`${getMonthName(month)} ${year} compensation mistake incident.`}
          footer={
            <>
              <Button variant="secondary" onClick={closeMistakeDialog} disabled={isMistakeSubmitting}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => void handleSubmitMistake()} loading={isMistakeSubmitting}>
                {editingMistake ? 'Update mistake' : 'Save mistake'}
              </Button>
            </>
          }
        >
          <div className="grid gap-4">
            <div className="rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-xs text-[var(--muted-strong)]">Employee</p>
              <p className="mt-2 text-base font-semibold text-white">{detail.report.fullName}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-white">Reviewer</label>
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
                    placeholder="Reviewer ID"
                  />
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-white">Project</label>
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
                    placeholder="0 for no project"
                  />
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-white">Category</label>
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
                    placeholder="AI Integration"
                  />
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-white">Severity</label>
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
                    placeholder="Minor"
                  />
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_180px]">
              <div>
                <label className="mb-2 block text-sm font-semibold text-white">Title</label>
                <Input
                  value={mistakeDraft.title}
                  onChange={(event) => setMistakeDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Short mistake title"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-white">Incident date</label>
                <Input
                  type="date"
                  value={mistakeDraft.incidentDate}
                  onChange={(event) => setMistakeDraft((current) => ({ ...current, incidentDate: event.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white">Description</label>
              <Textarea
                value={mistakeDraft.description}
                onChange={(event) => setMistakeDraft((current) => ({ ...current, description: event.target.value }))}
                placeholder="Describe what happened"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/84">
                <input
                  type="checkbox"
                  checked={mistakeDraft.reachedClient}
                  onChange={(event) => setMistakeDraft((current) => ({ ...current, reachedClient: event.target.checked }))}
                  className="h-4 w-4 rounded border-white/15 bg-transparent"
                />
                Reached client
              </label>

              <label className="flex items-center gap-3 rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/84">
                <input
                  type="checkbox"
                  checked={mistakeDraft.unclearTask}
                  onChange={(event) => setMistakeDraft((current) => ({ ...current, unclearTask: event.target.checked }))}
                  className="h-4 w-4 rounded border-white/15 bg-transparent"
                />
                Unclear task
              </label>
            </div>
          </div>
        </Dialog>
      ) : null}

      {showCompensationActions ? (
        <Dialog
          open={isDeliveryBonusDialogOpen}
          onClose={closeDeliveryBonusDialog}
          title={`${editingDeliveryBonus ? 'Edit' : 'Add'} delivery bonus for ${detail.report.fullName}`}
          description={`${getMonthName(month)} ${year} delivery bonus record.`}
          footer={
            <>
              <Button variant="secondary" onClick={closeDeliveryBonusDialog} disabled={isDeliveryBonusSubmitting}>
                Cancel
              </Button>
              <Button variant="success" onClick={() => void handleSubmitDeliveryBonus()} loading={isDeliveryBonusSubmitting}>
                {editingDeliveryBonus ? 'Update delivery bonus' : 'Save delivery bonus'}
              </Button>
            </>
          }
        >
          <div className="grid gap-4">
            <div className="rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-xs text-[var(--muted-strong)]">Employee</p>
              <p className="mt-2 text-base font-semibold text-white">{detail.report.fullName}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-white">Bonus type</label>
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
                    placeholder="early_delivery"
                  />
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-white">Award date</label>
                <Input
                  type="date"
                  value={deliveryBonusDraft.awardDate}
                  onChange={(event) => setDeliveryBonusDraft((current) => ({ ...current, awardDate: event.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white">Title</label>
              <Input
                value={deliveryBonusDraft.title}
                onChange={(event) => setDeliveryBonusDraft((current) => ({ ...current, title: event.target.value }))}
                placeholder="Short bonus title"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white">Project</label>
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
                  placeholder="0 for no project"
                />
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white">Description</label>
              <Textarea
                value={deliveryBonusDraft.description}
                onChange={(event) => setDeliveryBonusDraft((current) => ({ ...current, description: event.target.value }))}
                placeholder="Describe why this delivery bonus was awarded"
              />
            </div>
          </div>
        </Dialog>
      ) : null}

      {showCompensationActions ? (
        <Dialog
          open={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          title={deleteTarget?.kind === 'mistake' ? 'Delete mistake incident' : 'Delete delivery bonus'}
          description={deleteTarget ? `This will remove "${deleteTarget.record.title}" from the selected month.` : undefined}
          tone="danger"
          footer={
            <>
              <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={isDeleteSubmitting}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => void handleDeleteCompensationRecord()} loading={isDeleteSubmitting}>
                Delete record
              </Button>
            </>
          }
        >
          <div className="rounded-[18px] border border-red-500/16 bg-red-500/8 px-4 py-4 text-sm text-white/84">
            <p className="font-semibold text-white">{deleteTarget?.record.title}</p>
            <p className="mt-2 text-sm text-white/72">
              {deleteTarget?.kind === 'mistake'
                ? 'The mistake incident entry will be permanently removed from this employee history.'
                : 'The delivery bonus record will be permanently removed from this employee history.'}
            </p>
          </div>
        </Dialog>
      ) : null}
    </section>
  )
}
