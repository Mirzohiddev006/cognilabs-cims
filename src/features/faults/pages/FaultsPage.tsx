import { Badge } from '../../../shared/ui/badge'
import { Card } from '../../../shared/ui/card'
import { PageHeader } from '../../../shared/ui/page-header'
import { SectionTitle } from '../../../shared/ui/section-title'

export function FaultsPage() {
  return (
    <section className="space-y-6">
      <PageHeader
        title="Faults"
        actions={
          <Badge variant="warning" dot pulse>
            Soon
          </Badge>
        }
        meta={[
          {
            label: 'API Status',
            value: 'Pending',
            hint: 'Repo ichida faults endpoint yoki service topilmadi.',
            tone: 'warning',
          },
          {
            label: 'Page Status',
            value: 'Shell Ready',
            hint: 'API kelgach list, filters va details shu sahifaga ulanadi.',
            tone: 'blue',
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-6">
          <SectionTitle
            eyebrow="Faults"
            title="Integration status"
            description="Hozircha frontend shell tayyor, lekin faults ma'lumoti uchun ulanadigan endpoint topilmadi."
          />
          <div className="mt-6 rounded-[24px] border border-amber-500/20 bg-amber-500/8 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-200/80">Current state</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-white">Soon</p>
            <p className="mt-3 text-sm leading-6 text-(--muted)">
              Faults API yuborilgandan keyin bu yerga incident list, severity, created time va status bloklari ulanadi.
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <SectionTitle
            eyebrow="Next step"
            title="What is waiting"
            description="API contract tayyor bo'lsa, shu page to'liq ishlaydigan faults dashboardga aylantiriladi."
          />
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              ['List', 'Fault rows va summary cards'],
              ['Filters', 'Status, severity, date'],
              ['Details', 'Fault content va timeline'],
            ].map(([label, text]) => (
              <div
                key={label}
                className="rounded-[20px] border border-white/10 bg-[var(--surface)] px-4 py-4"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-300/75">{label}</p>
                <p className="mt-3 text-sm leading-6 text-(--muted)">{text}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  )
}
