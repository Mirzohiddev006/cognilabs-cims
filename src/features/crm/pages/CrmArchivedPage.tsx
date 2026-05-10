import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { crmService } from '../../../shared/api/services/crm.service'
import type { CustomerSummary } from '../../../shared/api/types'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { useConfirm } from '../../../shared/confirm/useConfirm'
import { getApiErrorMessage } from '../../../shared/lib/api-error'
import { formatShortDate } from '../../../shared/lib/format'
import { useToast } from '../../../shared/toast/useToast'
import { ActionsMenu } from '../../../shared/ui/actions-menu'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card'
import { DataTable } from '../../../shared/ui/data-table'
import { ErrorStateBlock, LoadingStateBlock, EmptyStateBlock } from '../../../shared/ui/state-block'

function getCustomerDisplayName(row: CustomerSummary): string {
  return (
    row.full_name ||
    row.display_name ||
    row.customer_name ||
    (row.first_name ? `${row.first_name} ${row.last_name ?? ''}`.trim() : null) ||
    row.username ||
    `#${row.id}`
  )
}

export function CrmArchivedPage() {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const { confirm } = useConfirm()
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  const archivedQuery = useAsyncData(() => crmService.archivedCustomers(), [])
  const customers = archivedQuery.data ?? []

  async function handleRestore(row: CustomerSummary) {
    const name = getCustomerDisplayName(row)
    const approved = await confirm({
      title: `Mijozni tiklash?`,
      description: `${name} arxivdan tiklanib, asosiy ro'yxatga qaytadi.`,
      confirmLabel: 'Tiklash',
    })
    if (!approved) return
    try {
      await crmService.restoreCustomer(row.id)
      await archivedQuery.refetch()
      setSelectedIds((prev) => prev.filter((id) => id !== row.id))
      showToast({ title: `${name} tiklandi`, tone: 'success' })
    } catch (error) {
      showToast({ title: 'Tiklashda xato', description: getApiErrorMessage(error), tone: 'error' })
    }
  }

  async function handleHardDelete(row: CustomerSummary) {
    const name = getCustomerDisplayName(row)
    const approved = await confirm({
      title: `Butunlay o'chirish?`,
      description: `${name} ma'lumotlari tizimdan butunlay o'chiriladi va tiklab bo'lmaydi.`,
      tone: 'danger',
      confirmLabel: `Butunlay o'chirish`,
    })
    if (!approved) return
    try {
      await crmService.hardDeleteCustomer(row.id)
      await archivedQuery.refetch()
      setSelectedIds((prev) => prev.filter((id) => id !== row.id))
      showToast({ title: `${name} o'chirildi`, tone: 'success' })
    } catch (error) {
      showToast({ title: "O'chirishda xato", description: getApiErrorMessage(error), tone: 'error' })
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return
    const approved = await confirm({
      title: `${selectedIds.length} ta mijozni butunlay o'chirish?`,
      description: `Tanlangan mijozlar tizimdan butunlay o'chiriladi va tiklab bo'lmaydi.`,
      tone: 'danger',
      confirmLabel: `Butunlay o'chirish`,
    })
    if (!approved) return
    setIsBulkDeleting(true)
    try {
      await crmService.bulkHardDelete(selectedIds)
      await archivedQuery.refetch()
      setSelectedIds([])
      showToast({ title: `${selectedIds.length} ta mijoz o'chirildi`, tone: 'success' })
    } catch (error) {
      showToast({ title: "O'chirishda xato", description: getApiErrorMessage(error), tone: 'error' })
    } finally {
      setIsBulkDeleting(false)
    }
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  function toggleAll() {
    setSelectedIds((prev) =>
      prev.length === customers.length ? [] : customers.map((c) => c.id),
    )
  }

  if (archivedQuery.isLoading && !archivedQuery.data) {
    return (
      <LoadingStateBlock
        eyebrow="CRM"
        title="Arxiv yuklanmoqda"
        description="Arxivlangan mijozlar ro'yxati yuklanmoqda..."
      />
    )
  }

  if (archivedQuery.isError && !archivedQuery.data) {
    return (
      <ErrorStateBlock
        eyebrow="CRM"
        title="Arxiv yuklanmadi"
        description="Arxivlangan mijozlar ro'yxatini yuklashda xato yuz berdi."
        actionLabel={t('common.retry')}
        onAction={() => void archivedQuery.refetch()}
      />
    )
  }

  return (
    <section className="space-y-4 page-enter">
      <Card variant="glass" noPadding className="overflow-hidden rounded-xl">
        <div className="px-6 py-5 sm:px-8 sm:py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--blue-text)]">CRM</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-[1.75rem]">
                Arxiv
              </h1>
              <p className="mt-1 text-[13px] text-[var(--muted-strong)]">
                Arxivlangan mijozlar. Tiklash yoki butunlay o'chirish mumkin.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void archivedQuery.refetch()}
                className="rounded-xl"
              >
                {t('common.refresh')}
              </Button>
              {selectedIds.length > 0 && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => void handleBulkDelete()}
                  loading={isBulkDeleting}
                  className="rounded-xl"
                >
                  {selectedIds.length} ta ni o'chirish
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card noPadding>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Arxivlangan mijozlar</CardTitle>
          <Badge variant="secondary">{customers.length} ta</Badge>
        </CardHeader>
        <CardContent>
          {customers.length === 0 ? (
            <EmptyStateBlock
              eyebrow="CRM"
              title="Arxiv bo'sh"
              description="Hozircha arxivlangan mijozlar yo'q."
            />
          ) : (
            <DataTable
              caption="Arxivlangan mijozlar"
              rows={customers}
              getRowKey={(row) => String(row.id)}
              columns={[
                {
                  key: 'select',
                  header: (
                    <input
                      type="checkbox"
                      checked={selectedIds.length === customers.length && customers.length > 0}
                      onChange={toggleAll}
                      className="h-4 w-4 rounded"
                    />
                  ),
                  width: '40px',
                  render: (row) => (
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(row.id)}
                      onChange={() => toggleSelect(row.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 rounded"
                    />
                  ),
                },
                {
                  key: 'name',
                  header: t('customers.table.name', 'Name'),
                  render: (row) => (
                    <span className="font-medium text-[var(--foreground)]">
                      {getCustomerDisplayName(row)}
                    </span>
                  ),
                },
                {
                  key: 'platform',
                  header: t('customers.table.platform', 'Platform'),
                  render: (row) => row.platform ?? '-',
                },
                {
                  key: 'phone',
                  header: t('customers.table.phone', 'Phone'),
                  render: (row) => row.phone_number ?? row.phone ?? '-',
                },
                {
                  key: 'status',
                  header: t('customers.table.status', 'Status'),
                  render: (row) => (
                    <Badge variant="secondary">{row.status}</Badge>
                  ),
                },
                {
                  key: 'created_at',
                  header: t('common.created', 'Created'),
                  render: (row) => formatShortDate(row.created_at),
                },
                {
                  key: 'actions',
                  header: t('customers.table.actions', 'Actions'),
                  render: (row) => (
                    <div onClick={(e) => e.stopPropagation()}>
                      <ActionsMenu
                        label={`Actions for ${getCustomerDisplayName(row)}`}
                        items={[
                          {
                            label: 'Tiklash',
                            onSelect: () => void handleRestore(row),
                          },
                          {
                            label: "Butunlay o'chirish",
                            onSelect: () => void handleHardDelete(row),
                            tone: 'danger',
                          },
                        ]}
                      />
                    </div>
                  ),
                },
              ]}
            />
          )}
        </CardContent>
      </Card>
    </section>
  )
}
