import type { CardPriority } from '../../../shared/api/services/projects.service'

function parseProjectDate(value?: string | null): Date | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()

  if (!normalized) {
    return null
  }

  const parsed = new Date(normalized)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/** Format ISO date string to short human-readable form */
export function formatProjectDate(date?: string | null): string {
  const parsed = parseProjectDate(date)

  if (!parsed) {
    return 'Unknown date'
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed)
}

/** Get relative time label (e.g. "2 days ago") */
export function formatRelativeDate(date?: string | null): string {
  const parsed = parseProjectDate(date)

  if (!parsed) {
    return ''
  }

  const now = Date.now()
  const then = parsed.getTime()
  const diffMs = now - then
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'Upcoming'
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
  return `${Math.floor(diffDays / 365)}y ago`
}

/** Check if a due date is overdue */
export function isDueDateOverdue(dueDate?: string | null): boolean {
  const parsed = parseProjectDate(dueDate)
  return parsed ? parsed.getTime() < Date.now() : false
}

/** Check if a due date is due soon (within 2 days) */
export function isDueDateSoon(dueDate?: string | null): boolean {
  const parsed = parseProjectDate(dueDate)

  if (!parsed) {
    return false
  }

  const diff = parsed.getTime() - Date.now()
  return diff > 0 && diff < 2 * 24 * 60 * 60 * 1000
}

/** Priority display config */
export const PRIORITY_CONFIG: Record<
  CardPriority,
  { label: string; color: string; badgeVariant: 'danger' | 'warning' | 'blue' | 'secondary' }
> = {
  urgent: { label: 'Urgent', color: '#f87171', badgeVariant: 'danger' },
  high:   { label: 'High',   color: '#fb923c', badgeVariant: 'warning' },
  medium: { label: 'Medium', color: '#60a5fa', badgeVariant: 'blue' },
  low:    { label: 'Low',    color: '#71717a', badgeVariant: 'secondary' },
}

/** Column preset colours */
export const COLUMN_COLORS: { label: string; value: string }[] = [
  { label: 'Blue',    value: '#3b82f6' },
  { label: 'Violet',  value: '#8b5cf6' },
  { label: 'Green',   value: '#22c55e' },
  { label: 'Amber',   value: '#f59e0b' },
  { label: 'Red',     value: '#ef4444' },
  { label: 'Pink',    value: '#ec4899' },
  { label: 'Cyan',    value: '#06b6d4' },
  { label: 'Slate',   value: '#64748b' },
]

/** Get initials from name + surname */
export function getInitials(name?: string | null, surname?: string | null): string {
  const firstName = typeof name === 'string' ? name.trim() : ''
  const lastName = typeof surname === 'string' ? surname.trim() : ''
  const first = firstName.charAt(0).toUpperCase()
  const last = lastName.charAt(0).toUpperCase()

  if (first || last) {
    return `${first}${last}`
  }

  return '?'
}

/** Deterministic hue from string (for avatar colors) */
export function stringToHue(str?: string | null): number {
  const value = typeof str === 'string' ? str : ''

  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % 360
}

/** Snooze date presets */
export function getSnoozePresets(): { label: string; date: Date }[] {
  const now = new Date()

  const laterToday = new Date(now)
  laterToday.setHours(now.getHours() + 3, 0, 0, 0)

  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(9, 0, 0, 0)

  const nextWeek = new Date(now)
  nextWeek.setDate(nextWeek.getDate() + 7)
  nextWeek.setHours(9, 0, 0, 0)

  return [
    { label: 'Later today', date: laterToday },
    { label: 'Tomorrow',    date: tomorrow },
    { label: 'Next week',   date: nextWeek },
  ]
}
