import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../lib/cn'

export type ActionsMenuItem = {
  label: string
  onSelect: () => void
  tone?: 'default' | 'danger'
}

type ActionsMenuProps = {
  items: ActionsMenuItem[]
  label?: string
}

type MenuPosition = {
  top: number
  left: number
}

function getMenuPosition(trigger: HTMLButtonElement, itemCount: number): MenuPosition {
  const rect = trigger.getBoundingClientRect()
  const menuWidth = 196
  const menuHeight = itemCount * 44 + 16
  const left = Math.min(Math.max(8, rect.right - menuWidth), window.innerWidth - menuWidth - 8)
  const openAbove = rect.bottom + menuHeight + 8 > window.innerHeight && rect.top - menuHeight - 8 >= 8
  const top = openAbove
    ? Math.max(8, rect.top - menuHeight - 8)
    : Math.min(rect.bottom + 8, window.innerHeight - menuHeight - 8)

  return { top, left }
}

export function ActionsMenu({ items, label = 'Open actions' }: ActionsMenuProps) {
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<MenuPosition>({ top: 0, left: 0 })

  useEffect(() => {
    if (!isOpen || !triggerRef.current) {
      return
    }

    const updatePosition = () => {
      if (!triggerRef.current) {
        return
      }

      setPosition(getMenuPosition(triggerRef.current, items.length))
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, items.length])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--input-surface)] text-[var(--muted)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)] transition hover:border-[var(--border-hover)] hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/15 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4 fill-current" aria-hidden="true">
          <circle cx="3" cy="8" r="1.25" />
          <circle cx="8" cy="8" r="1.25" />
          <circle cx="13" cy="8" r="1.25" />
        </svg>
      </button>

      {isOpen && typeof document !== 'undefined'
        ? createPortal(
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} aria-hidden="true" />
              <div
                role="menu"
                className="fixed z-50 min-w-[196px] rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-1.5 text-[var(--foreground)] shadow-[var(--shadow-xl)] backdrop-blur-xl"
                style={position}
              >
                {items.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsOpen(false)
                      item.onSelect()
                    }}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 rounded-xl border border-transparent px-3 py-2 text-xs font-medium transition-colors',
                      item.tone === 'danger'
                        ? 'text-red-500 hover:border-red-500/15 hover:bg-red-500/10 hover:text-red-600'
                        : 'text-[var(--foreground)] hover:border-[var(--border-hover)] hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          'inline-block h-1.5 w-1.5 rounded-full bg-[var(--muted)]/40',
                          item.tone === 'danger'
                            ? 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.45)]'
                            : 'bg-blue-400/80 shadow-[0_0_8px_rgba(96,165,250,0.38)]',
                        )}
                      />
                      <span>{item.label}</span>
                    </span>
                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-[var(--muted)]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                ))}
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  )
}
