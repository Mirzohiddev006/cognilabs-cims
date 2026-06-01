export type RecallTimeTone = 'past' | 'active' | 'future'

export function getRecallTimeTone(value?: string | null, now = new Date()): RecallTimeTone | null {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const recallDay = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())

  if (nowDay < recallDay) {
    return 'past'
  }

  if (nowDay > recallDay) {
    return 'future'
  }

  return 'active'
}

export function getRecallTimeToneClasses(tone: RecallTimeTone) {
  switch (tone) {
    case 'past':
      return 'border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300'
    case 'active':
      return 'border-yellow-500/25 bg-yellow-500/12 text-yellow-700 dark:text-yellow-300'
    case 'future':
      return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
  }
}
