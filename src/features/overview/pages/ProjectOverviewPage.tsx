import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useConfirm } from '../../../shared/confirm/useConfirm'
import { navigationItems } from '../../../shared/config/navigation'
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue'
import { useDisclosure } from '../../../shared/hooks/useDisclosure'
import { formatCompactNumber, formatCurrency } from '../../../shared/lib/format'
import { useToast } from '../../../shared/toast/useToast'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { DataTable } from '../../../shared/ui/data-table'
import { Input } from '../../../shared/ui/input'
import { Modal } from '../../../shared/ui/modal'
import { SectionTitle } from '../../../shared/ui/section-title'
import { EmptyStateBlock, ErrorStateBlock, LoadingStateBlock } from '../../../shared/ui/state-block'
import { apiModules } from '../support/apiModules'

const dayOneChecklist = [
  'React + Vite + TypeScript loyiha asosi',
  'Tailwind va global design tokens',
  'Feature-based folder structure',
  'Router va asosiy layout skeleti',
  'API service layer va env config',
  'Reusable UI komponentlar bazasi',
]

const progressRows = [
  { id: 'd1', day: '1-kun', module: 'Setup', status: 'Done', owner: 'Frontend core', items: 6 },
  { id: 'd2', day: '2-kun', module: 'Auth flow', status: 'Done', owner: 'Auth module', items: 6 },
  { id: 'd3', day: '3-kun', module: 'Session + permissions', status: 'Done', owner: 'App access', items: 6 },
  { id: 'd4', day: '4-kun', module: 'App shell + reusable UI', status: 'Done', owner: 'UI system', items: 6 },
  { id: 'd5', day: '5-kun', module: 'CEO users + permissions', status: 'Done', owner: 'CEO module', items: 6 },
  { id: 'd6', day: '6-kun', module: 'CEO dashboard + messages + payments', status: 'Done', owner: 'CEO module', items: 6 },
  { id: 'd7', day: '7-kun', module: 'CRM customers + sales', status: 'Done', owner: 'Sales module', items: 6 },
  { id: 'd8', day: '8-kun', module: 'Update tracking + release polish', status: 'Done', owner: 'Release layer', items: 6 },
]

export function ProjectOverviewPage() {
  const { isOpen, open, close } = useDisclosure()
  const { showToast } = useToast()
  const { confirm } = useConfirm()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 250)

  const filteredRows = useMemo(() => {
    if (!debouncedSearch.trim()) {
      return progressRows
    }

    const normalizedSearch = debouncedSearch.trim().toLowerCase()

    return progressRows.filter((row) =>
      [row.day, row.module, row.status, row.owner].some((value) =>
        value.toLowerCase().includes(normalizedSearch),
      ),
    )
  }, [debouncedSearch])

  async function handleConfirmPreview() {
    const approved = await confirm({
      title: 'Demo actionni tasdiqlaysizmi?',
      description: "Bu confirm dialog reusable provider orqali butun app bo'ylab ishlaydi.",
      confirmLabel: 'Ha, tasdiqlash',
      cancelLabel: 'Bekor',
    })

    showToast({
      title: approved ? 'Confirm accepted' : 'Confirm cancelled',
      description: approved
        ? "Confirm dialog provider ishlayotganini ko'rsatdi."
        : "User cancel holati ham to'g'ri ushlanmoqda.",
      tone: approved ? 'success' : 'info',
    })
  }

  return (
    <section className="space-y-8">
      <div className="glass-panel overflow-hidden rounded-[32px] border border-[var(--border)]">
        <div className="grid gap-6 px-6 py-8 md:grid-cols-[1.3fr_0.7fr] md:px-8 lg:px-10">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.32em] text-[var(--accent)]">Day 1-8 complete</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-[var(--foreground)] md:text-5xl">
              Cognilabs CIMS frontend uchun 8 kunlik roadmap bo'yicha asosiy modullar yakunlandi.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted-strong)]">
              Loyiha arxitekturasi modul bo'yicha bo'lindi va auth, session, shell, CEO, CRM, finance hamda
              update tracking oqimlari real API endpointlari bilan ishlaydigan holatga keltirildi.
            </p>
          </div>

          <Card className="self-start p-5">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-[var(--muted)]">Current stack</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {['React 19', 'TypeScript', 'Vite 7', 'Tailwind 4', 'React Router 7', 'Typed fetch client'].map(
                (item) => (
                  <span
                    key={item}
                    className="rounded-full bg-[var(--accent-soft)] px-3 py-1.5 text-sm font-medium text-[var(--accent-strong)]"
                  >
                    {item}
                  </span>
                ),
              )}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-[var(--muted-strong)]">
              <div className="rounded-2xl border border-[var(--border)] bg-white/60 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Delivered</p>
                <p className="mt-2 text-xl font-semibold text-[var(--foreground)]">{formatCompactNumber(48)}</p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-white/60 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Budgeted</p>
                <p className="mt-2 text-xl font-semibold text-[var(--foreground)]">{formatCurrency(3200000)}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-6">
          <SectionTitle
            eyebrow="Checklist"
            title="1-kun deliverable"
            description="Quyidagi barcha bandlar codebase ichida foundation sifatida tayyor turibdi."
          />
          <div className="mt-6 grid gap-3">
            {dayOneChecklist.map((item, index) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-white/60 px-4 py-3"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--accent)] text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <span className="text-sm text-[var(--muted-strong)]">{item}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <SectionTitle
            eyebrow="Navigation"
            title="Module entry points"
            description="Asosiy biznes modullarining route va dashboard sahifalari real endpointlar bilan ulandi."
          />
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {navigationItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-[24px] border border-[var(--border)] bg-white/70 p-4 transition-transform duration-200 hover:-translate-y-0.5"
              >
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--accent)]">{item.group}</p>
                <p className="mt-3 text-lg font-semibold text-[var(--foreground)]">{item.label}</p>
                <p className="mt-2 text-sm text-[var(--muted-strong)]">{item.description}</p>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <SectionTitle
          eyebrow="API map"
          title="Backend domainlar bo'yicha ajratildi"
          description="Service layer backend domainlariga mos ajratildi va barcha 8 kunlik modullar API bilan ulandi."
        />
        <div className="mt-6 grid gap-4 lg:grid-cols-5">
          {apiModules.map((module) => (
            <div key={module.name} className="rounded-[24px] border border-[var(--border)] bg-white/65 p-4">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--accent)]">{module.name}</p>
              <p className="mt-3 text-sm leading-6 text-[var(--muted-strong)]">{module.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {module.endpoints.map((endpoint) => (
                  <span
                    key={endpoint}
                    className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)]"
                  >
                    {endpoint}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <SectionTitle
          eyebrow="UI system"
          title="Reusable component preview"
          description="Table, modal, toast, confirm dialog va state blocklar shu page'da jonli ishlatilmoqda."
        />
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={open}>Open modal preview</Button>
          <Button
            variant="secondary"
            onClick={() =>
              showToast({
                title: 'Toast ishladi',
                description: "Global toast provider app bo'ylab tayyor holatda ulandi.",
                tone: 'success',
              })
            }
          >
            Show toast
          </Button>
          <Button variant="ghost" onClick={handleConfirmPreview}>
            Ask confirm
          </Button>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Module, status yoki owner bo'yicha qidirish"
            />
            <DataTable
              caption="Roadmap progress preview"
              rows={filteredRows}
              getRowKey={(row) => row.id}
              columns={[
                { key: 'day', header: 'Day', render: (row) => row.day },
                { key: 'module', header: 'Module', render: (row) => row.module },
                { key: 'status', header: 'Status', render: (row) => row.status },
                { key: 'owner', header: 'Owner', render: (row) => row.owner },
                {
                  key: 'items',
                  header: 'Items',
                  align: 'right',
                  render: (row) => formatCompactNumber(row.items),
                },
              ]}
              emptyState={
                <EmptyStateBlock
                  eyebrow="No rows"
                  title="Mos natija topilmadi"
                  description="Debounced qidiruv reusable hook orqali ishlayapti. Boshqa kalit so'z bilan qayta sinab ko'ring."
                />
              }
            />
          </div>

          <div className="grid gap-4">
            <LoadingStateBlock
              eyebrow="Loading"
              title="Skeletonsiz ham aniq loading block"
              description="Dashboard, table yoki detail sahifalarda initial fetch holati uchun ishlatish mumkin."
            />
            <EmptyStateBlock
              eyebrow="Empty"
              title="Bo'sh ma'lumot holati"
              description="Listlar bo'sh bo'lsa foydalanuvchiga keyingi qadamni ko'rsatish uchun tayyor blok."
            />
            <ErrorStateBlock
              eyebrow="Error"
              title="Xatolik bloki"
              description="Retry action yoki support yo'nalishini ko'rsatish uchun umumiy error state."
              actionLabel="Demo toast"
              onAction={() =>
                showToast({
                  title: 'Retry preview',
                  description: 'Error state action trigger muvaffaqiyatli ishladi.',
                  tone: 'info',
                })
              }
            />
          </div>
        </div>
      </Card>

      <Modal
        open={isOpen}
        onClose={close}
        title="Reusable modal preview"
        description="Bu modal day 4 ichida yaratilgan generic dialog komponentidan foydalanadi."
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              Close
            </Button>
            <Button
              onClick={() => {
                close()
                showToast({
                  title: 'Modal action executed',
                  description: "Modal footer action ishladi va toast bilan bog'landi.",
                  tone: 'success',
                })
              }}
            >
              Save preview
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <div className="rounded-[24px] border border-[var(--border)] bg-white/70 p-4">
            <p className="text-sm font-medium text-[var(--foreground)]">Dialog uses</p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-strong)]">
              Create/edit modal, confirm dialog, detail preview va form wrapper sifatida ishlatish mumkin.
            </p>
          </div>
          <div className="rounded-[24px] border border-[var(--border)] bg-white/70 p-4">
            <p className="text-sm font-medium text-[var(--foreground)]">Responsive behavior</p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-strong)]">
              Overlay, escape close va footer slot default tarzda tayyorlangan.
            </p>
          </div>
        </div>
      </Modal>
    </section>
  )
}
