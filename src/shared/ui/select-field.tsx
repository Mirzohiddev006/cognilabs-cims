import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../lib/cn'

export type SelectFieldOption = {
  value: string
  label: string
}

type SelectFieldProps = {
  value: string
  options: SelectFieldOption[]
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

type MenuPosition = {
  top: number
  left: number
  width: number
}

function getMenuPosition(trigger: HTMLButtonElement, optionCount: number): MenuPosition {
  const rect = trigger.getBoundingClientRect()
  const menuHeight = Math.min(optionCount, 6) * 40 + 12
  const openAbove = rect.bottom + menuHeight + 8 > window.innerHeight && rect.top - menuHeight - 8 >= 8
  const top = openAbove
    ? Math.max(8, rect.top - menuHeight - 8)
    : Math.min(rect.bottom + 8, window.innerHeight - menuHeight - 8)

  return {
    top,
    left: Math.max(8, rect.left),
    width: rect.width,
  }
}

export function SelectField({
  value,
  options,
  onValueChange,
  placeholder = 'Select option',
  className,
  disabled = false,
}: SelectFieldProps) {
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<MenuPosition>({ top: 0, left: 0, width: 0 })

  const selectedOption = options.find((option) => option.value === value)

  useEffect(() => {
    if (!isOpen || !triggerRef.current) {
      return
    }

    const updatePosition = () => {
      if (!triggerRef.current) {
        return
      }

      setPosition(getMenuPosition(triggerRef.current, options.length))
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
  }, [isOpen, options.length])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => {
          if (!disabled) {
            setIsOpen((current) => !current)
          }
        }}
        className={cn(
          'flex min-h-9 w-full items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--input-surface)] px-3 py-1.5 text-xs text-[var(--foreground)] shadow-sm outline-none transition-[color,box-shadow,border-color] focus-visible:border-white/15 focus-visible:ring-2 focus-visible:ring-white/10 disabled:cursor-not-allowed disabled:opacity-60',
          className,
        )}
      >
        <span className={cn('truncate text-left', selectedOption ? 'text-[var(--foreground)]' : 'text-[var(--muted)]')}>
          {selectedOption?.label ?? placeholder}
        </span>
        <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 fill-current text-[var(--muted)]" aria-hidden="true">
          <path d="M4.22 5.97a.75.75 0 0 1 1.06 0L8 8.69l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.03a.75.75 0 0 1 0-1.06Z" />
        </svg>
      </button>

      {isOpen && typeof document !== 'undefined'
        ? createPortal(
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} aria-hidden="true" />
              <div
                className="fixed z-50 max-h-72 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--card)] p-1 shadow-2xl"
                style={position}
                role="listbox"
              >
                {options.map((option) => {
                  const isSelected = option.value === value

                  return (
                    <button
                      key={`${option.value}-${option.label}`}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        setIsOpen(false)
                        onValueChange(option.value)
                      }}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-1.5 text-xs transition',
                        isSelected
                          ? 'bg-[var(--accent-soft)] text-white'
                          : 'text-[var(--foreground)] hover:bg-[var(--accent-soft)] hover:text-white',
                      )}
                    >
                      <span className="truncate">{option.label}</span>
                      {isSelected ? (
                        <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 fill-current text-[#3b82f6]" aria-hidden="true">
                          <path d="M6.6 11.2 3.4 8a.75.75 0 1 0-1.06 1.06l3.73 3.73a.75.75 0 0 0 1.06 0l6.53-6.53A.75.75 0 1 0 12.64 5.2L6.6 11.2Z" />
                        </svg>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  )
}
