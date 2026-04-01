import { ArrowUpRight, Bot, Copy, Instagram, Send, Sparkles } from 'lucide-react'
import { useLocale } from '../../../app/hooks/useLocale'
import { useToast } from '../../../shared/toast/useToast'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { cn } from '../../../shared/lib/cn'

const teamLinks = [
  {
    titleKey: 'cims.instagram.title',
    eyebrowKey: 'cims.instagram.eyebrow',
    handle: '@cognilabs_uz',
    href: 'https://www.instagram.com/cognilabs_uz',
    noteKey: 'cims.instagram.note',
    categoryKey: 'cims.category.official',
    accent: 'blue',
    icon: Instagram,
  },
  {
    titleKey: 'cims.telegram.title',
    eyebrowKey: 'cims.telegram.eyebrow',
    handle: '@cognilabs_software',
    href: 'https://t.me/cognilabs_software',
    noteKey: 'cims.telegram.note',
    categoryKey: 'cims.category.channel',
    accent: 'violet',
    icon: Send,
  },
  {
    titleKey: 'cims.recall.title',
    eyebrowKey: 'cims.recall.eyebrow',
    handle: '@cognilabsrecallbot',
    href: 'https://t.me/cognilabsrecallbot',
    noteKey: 'cims.recall.note',
    categoryKey: 'cims.category.bot',
    accent: 'amber',
    icon: Bot,
  },
  {
    titleKey: 'cims.update.title',
    eyebrowKey: 'cims.update.eyebrow',
    handle: '@cognilabsupdatebot',
    href: 'https://t.me/cognilabsupdatebot',
    noteKey: 'cims.update.note',
    categoryKey: 'cims.category.bot',
    accent: 'emerald',
    icon: Sparkles,
  },
] as const

const accentClasses = {
  blue: {
    border: 'border-[var(--blue-border)] dark:border-blue-500/18',
    glow: 'shadow-[inset_0_0_0_1px_rgba(59,130,246,0.08),0_20px_45px_rgba(0,0,0,0.22),0_0_40px_rgba(59,130,246,0.08)]',
    badge: 'blue' as const,
    iconWrap: 'border-[var(--blue-border)] bg-[var(--blue-soft)] text-[var(--blue-text)] dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200',
    line: 'from-blue-500/40 via-cyan-400/20 to-transparent',
    label: 'text-[var(--blue-text)] dark:text-blue-200/90',
    title: 'text-[#2563eb] dark:text-blue-50',
    meta: 'text-[#3b82f6] dark:text-blue-200/88',
    body: 'text-[#3d5fa8] dark:text-blue-100/82',
    button: 'border-[var(--blue-border)] bg-[var(--blue-soft)] text-[var(--blue-text)] hover:border-blue-400/40 hover:bg-blue-500/14 dark:border-blue-400/25 dark:bg-blue-500/12 dark:text-blue-50 dark:hover:border-blue-300/35 dark:hover:bg-blue-500/18',
  },
  violet: {
    border: 'border-[var(--violet-border)] dark:border-violet-500/18',
    glow: 'shadow-[inset_0_0_0_1px_rgba(139,92,246,0.08),0_20px_45px_rgba(0,0,0,0.22),0_0_40px_rgba(139,92,246,0.08)]',
    badge: 'violet' as const,
    iconWrap: 'border-[var(--violet-border)] bg-[var(--violet-dim)] text-[var(--violet-text)] dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-100',
    line: 'from-violet-500/40 via-fuchsia-400/20 to-transparent',
    label: 'text-[var(--violet-text)] dark:text-violet-200/90',
    title: 'text-[#7c3aed] dark:text-violet-50',
    meta: 'text-[#8b5cf6] dark:text-violet-200/88',
    body: 'text-[#6f58b5] dark:text-violet-100/82',
    button: 'border-[var(--violet-border)] bg-[var(--violet-dim)] text-[var(--violet-text)] hover:border-violet-400/40 hover:bg-violet-500/14 dark:border-violet-400/25 dark:bg-violet-500/12 dark:text-violet-50 dark:hover:border-violet-300/35 dark:hover:bg-violet-500/18',
  },
  amber: {
    border: 'border-[var(--warning-border)] dark:border-amber-500/18',
    glow: 'shadow-[inset_0_0_0_1px_rgba(245,158,11,0.08),0_20px_45px_rgba(0,0,0,0.22),0_0_40px_rgba(245,158,11,0.08)]',
    badge: 'warning' as const,
    iconWrap: 'border-[var(--warning-border)] bg-[var(--warning-dim)] text-[var(--warning-text)] dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100',
    line: 'from-amber-500/40 via-orange-400/20 to-transparent',
    label: 'text-[var(--warning-text)] dark:text-amber-200/90',
    title: 'text-[#d97706] dark:text-amber-50',
    meta: 'text-[#f59e0b] dark:text-amber-200/88',
    body: 'text-[#9a6a16] dark:text-amber-100/82',
    button: 'border-[var(--warning-border)] bg-[var(--warning-dim)] text-[var(--warning-text)] hover:border-amber-400/40 hover:bg-amber-500/14 dark:border-amber-400/25 dark:bg-amber-500/12 dark:text-amber-50 dark:hover:border-amber-300/35 dark:hover:bg-amber-500/18',
  },
  emerald: {
    border: 'border-[var(--success-border)] dark:border-emerald-500/18',
    glow: 'shadow-[inset_0_0_0_1px_rgba(34,197,94,0.08),0_20px_45px_rgba(0,0,0,0.22),0_0_40px_rgba(34,197,94,0.08)]',
    badge: 'success' as const,
    iconWrap: 'border-[var(--success-border)] bg-[var(--success-dim)] text-[#32a852] dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-100',
    line: 'from-emerald-500/40 via-teal-400/20 to-transparent',
    label: 'text-[#32a852] dark:text-emerald-200/90',
    title: 'text-[#22863a] dark:text-emerald-50',
    meta: 'text-[#32a852] dark:text-emerald-200/88',
    body: 'text-[#3c7f4d] dark:text-emerald-100/82',
    button: 'border-[var(--success-border)] bg-[var(--success-dim)] text-[#32a852] hover:border-emerald-400/40 hover:bg-emerald-500/14 dark:border-emerald-400/25 dark:bg-emerald-500/12 dark:text-emerald-50 dark:hover:border-emerald-300/35 dark:hover:bg-emerald-500/18',
  },
} as const

export function CimsTeamPage() {
  const { t } = useLocale()
  const { showToast } = useToast()

  async function handleCopyLink(link: string, label: string) {
    try {
      await navigator.clipboard.writeText(link)
      showToast({
        title: t('cims.link_copied'),
        description: `${label} ${t('cims.link_copied_desc')}`,
        tone: 'success',
      })
    } catch {
      showToast({
        title: t('cims.copy_failed'),
        description: t('cims.copy_failed_desc'),
        tone: 'error',
      })
    }
  }

  return (
    <section className="space-y-6 page-enter">
      <div className="grid gap-4 xl:grid-cols-2">
        {teamLinks.map((link) => {
          const Icon = link.icon
          const accent = accentClasses[link.accent]
          const title = t(link.titleKey)
          const eyebrow = t(link.eyebrowKey)
          const note = t(link.noteKey)
          const category = t(link.categoryKey)

          return (
            <Card
              key={link.href}
              className={cn(
                'group relative overflow-hidden rounded-[28px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-6 transition-transform duration-200 hover:-translate-y-[2px]',
                accent.border,
                accent.glow,
              )}
            >
              <div className={cn('pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r', accent.line)} />

              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={cn('grid h-12 w-12 place-items-center rounded-[18px] border', accent.iconWrap)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className={cn('text-[10px] font-semibold uppercase tracking-[0.24em]', accent.label)}>{eyebrow}</p>
                    <h3 className={cn('mt-1 text-xl font-semibold tracking-tight', accent.title)}>{title}</h3>
                  </div>
                </div>

                <Badge variant={accent.badge}>{category}</Badge>
              </div>

              <div className="mt-6">
                <p className={cn('text-[11px] font-semibold uppercase tracking-[0.24em]', accent.meta)}>{t('cims.handle')}</p>
                <p className={cn('mt-2 break-all font-mono text-[15px]', accent.title)}>{link.handle}</p>
                <p className={cn('mt-4 text-sm leading-6', accent.body)}>{note}</p>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <a
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    'inline-flex min-h-11 items-center justify-center gap-2 rounded-[16px] border px-4 py-2.5 text-sm font-medium transition',
                    accent.button,
                  )}
                >
                  {t('cims.open_link')}
                  <ArrowUpRight className="h-4 w-4" />
                </a>

                <Button
                  variant="ghost"
                  size="lg"
                  className="justify-center rounded-[16px] border border-[var(--border)] bg-white text-[var(--foreground)] hover:border-[var(--blue-border)] hover:bg-[var(--surface-elevated)] dark:border-white/10 dark:bg-white/[0.03] dark:text-white/78 dark:hover:border-white/14 dark:hover:bg-white/[0.06] dark:hover:text-white"
                  leftIcon={<Copy className="h-4 w-4" />}
                  onClick={() => void handleCopyLink(link.href, title)}
                >
                  {t('cims.copy')}
                </Button>
              </div>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
