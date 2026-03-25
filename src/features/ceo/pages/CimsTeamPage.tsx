import { ArrowUpRight, Bot, Copy, Instagram, Send, Sparkles } from 'lucide-react'
import { useToast } from '../../../shared/toast/useToast'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { cn } from '../../../shared/lib/cn'

const teamLinks = [
  {
    title: 'Instagram',
    eyebrow: 'Social presence',
    handle: '@cognilabs_uz',
    href: 'https://www.instagram.com/cognilabs_uz',
    note: 'Public-facing brand page for visibility, trust, and first-touch discovery.',
    category: 'Official',
    accent: 'blue',
    icon: Instagram,
  },
  {
    title: 'Telegram Channel',
    eyebrow: 'Community line',
    handle: '@cognilabs_software',
    href: 'https://t.me/cognilabs_software',
    note: 'Primary Telegram touchpoint for updates, fast reach, and lightweight company communication.',
    category: 'Channel',
    accent: 'violet',
    icon: Send,
  },
  {
    title: 'Recall Bot',
    eyebrow: 'Automation',
    handle: '@cognilabsrecallbot',
    href: 'https://t.me/cognilabsrecallbot',
    note: 'Bot surface for reminder and recall workflows. Normalized from the malformed URL you sent.',
    category: 'Bot',
    accent: 'amber',
    icon: Bot,
  },
  {
    title: 'Update Bot',
    eyebrow: 'Operations',
    handle: '@cognilabsupdatebot',
    href: 'https://t.me/cognilabsupdatebot',
    note: 'Dedicated update-tracking entry point for daily operational usage.',
    category: 'Bot',
    accent: 'emerald',
    icon: Sparkles,
  },
] as const

const accentClasses = {
  blue: {
    border: 'border-blue-500/18',
    glow: 'shadow-[inset_0_0_0_1px_rgba(59,130,246,0.08),0_20px_45px_rgba(0,0,0,0.22),0_0_40px_rgba(59,130,246,0.08)]',
    badge: 'blue' as const,
    iconWrap: 'border-blue-400/20 bg-blue-500/10 text-blue-200',
    line: 'from-blue-500/40 via-cyan-400/20 to-transparent',
    label: 'text-blue-200/82',
    button: 'border-blue-400/25 bg-blue-500/12 text-blue-50 hover:border-blue-300/35 hover:bg-blue-500/18',
  },
  violet: {
    border: 'border-violet-500/18',
    glow: 'shadow-[inset_0_0_0_1px_rgba(139,92,246,0.08),0_20px_45px_rgba(0,0,0,0.22),0_0_40px_rgba(139,92,246,0.08)]',
    badge: 'violet' as const,
    iconWrap: 'border-violet-400/20 bg-violet-500/10 text-violet-100',
    line: 'from-violet-500/40 via-fuchsia-400/20 to-transparent',
    label: 'text-violet-200/82',
    button: 'border-violet-400/25 bg-violet-500/12 text-violet-50 hover:border-violet-300/35 hover:bg-violet-500/18',
  },
  amber: {
    border: 'border-amber-500/18',
    glow: 'shadow-[inset_0_0_0_1px_rgba(245,158,11,0.08),0_20px_45px_rgba(0,0,0,0.22),0_0_40px_rgba(245,158,11,0.08)]',
    badge: 'warning' as const,
    iconWrap: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
    line: 'from-amber-500/40 via-orange-400/20 to-transparent',
    label: 'text-amber-200/82',
    button: 'border-amber-400/25 bg-amber-500/12 text-amber-50 hover:border-amber-300/35 hover:bg-amber-500/18',
  },
  emerald: {
    border: 'border-emerald-500/18',
    glow: 'shadow-[inset_0_0_0_1px_rgba(34,197,94,0.08),0_20px_45px_rgba(0,0,0,0.22),0_0_40px_rgba(34,197,94,0.08)]',
    badge: 'success' as const,
    iconWrap: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
    line: 'from-emerald-500/40 via-teal-400/20 to-transparent',
    label: 'text-emerald-200/82',
    button: 'border-emerald-400/25 bg-emerald-500/12 text-emerald-50 hover:border-emerald-300/35 hover:bg-emerald-500/18',
  },
} as const

export function CimsTeamPage() {
  const { showToast } = useToast()

  async function handleCopyLink(link: string, label: string) {
    try {
      await navigator.clipboard.writeText(link)
      showToast({
        title: 'Link copied',
        description: `${label} link copied to clipboard.`,
        tone: 'success',
      })
    } catch {
      showToast({
        title: 'Copy failed',
        description: 'Clipboard access is not available in this browser.',
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
                    <p className={cn('text-[10px] font-semibold uppercase tracking-[0.24em]', accent.label)}>{link.eyebrow}</p>
                    <h3 className="mt-1 text-xl font-semibold tracking-tight text-white">{link.title}</h3>
                  </div>
                </div>

                <Badge variant={accent.badge}>{link.category}</Badge>
              </div>

              <div className="mt-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/42">Handle</p>
                <p className="mt-2 break-all font-mono text-[15px] text-white/92">{link.handle}</p>
                <p className="mt-4 text-sm leading-6 text-[var(--muted-strong)]">{link.note}</p>
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
                  Open link
                  <ArrowUpRight className="h-4 w-4" />
                </a>

                <Button
                  variant="ghost"
                  size="lg"
                  className="justify-center rounded-[16px] border border-white/10 bg-white/[0.03] text-white/78 hover:border-white/14 hover:bg-white/[0.06] hover:text-white"
                  leftIcon={<Copy className="h-4 w-4" />}
                  onClick={() => void handleCopyLink(link.href, link.title)}
                >
                  Copy
                </Button>
              </div>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
