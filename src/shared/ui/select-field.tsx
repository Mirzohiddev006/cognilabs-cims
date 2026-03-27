import { useEffect, useRef, useState, type ReactNode } from 'react'
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
  children?: ReactNode
}

type MenuPosition = {
  top: number
  left: number
  width: number
}

function normalizeOptionValue(value?: string | null) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
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

  const normalizedValue = normalizeOptionValue(value)
  const selectedOption =
    options.find((option) => option.value === value) ??
    options.find((option) =>
      normalizeOptionValue(option.value) === normalizedValue ||
      normalizeOptionValue(option.label) === normalizedValue,
    )

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
          'flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--input-surface)] px-3.5 py-2 text-sm text-[var(--foreground)] sm:text-[15px]',
          'shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)] outline-none',
          'transition-[border-color,box-shadow,background-color,transform] duration-150',
          'hover:border-[var(--border-hover)] hover:bg-[var(--input-surface-hover)]',
          'focus-visible:border-[var(--border-focus)] focus-visible:bg-[var(--input-surface-hover)]',
          'focus-visible:ring-0 focus-visible:shadow-[inset_0_1px_2px_rgba(0,0,0,0.12),0_0_0_3px_rgba(59,130,246,0.12)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
      >
        <span className={cn('truncate text-left', selectedOption ? 'text-[var(--foreground)]' : 'text-[var(--muted)]')}>
          {selectedOption?.label ?? placeholder}
        </span>
        <svg
          viewBox="0 0 16 16"
          className={cn(
            'h-4 w-4 shrink-0 fill-current text-[var(--muted)] transition-transform duration-200',
            isOpen && 'rotate-180 text-[var(--foreground)]',
          )}
          aria-hidden="true"
        >
          <path d="M4.22 5.97a.75.75 0 0 1 1.06 0L8 8.69l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.03a.75.75 0 0 1 0-1.06Z" />
        </svg>
      </button>

      {isOpen && typeof document !== 'undefined'
        ? createPortal(
            <>
              <div className="fixed inset-0 z-[90]" onClick={() => setIsOpen(false)} aria-hidden="true" />
              <div
                className="fixed z-[100] max-h-72 overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-1.5 text-[var(--foreground)] shadow-[var(--shadow-xl)] backdrop-blur-xl"
                style={position}
                role="listbox"
              >
                {options.map((option) => {
                  const isSelected =
                    option.value === value ||
                    normalizeOptionValue(option.value) === normalizedValue ||
                    normalizeOptionValue(option.label) === normalizedValue

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
                        'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                        isSelected
                          ? 'border border-[var(--blue-border)] bg-[var(--blue-dim)] text-[var(--foreground)]'
                          : 'border border-transparent text-[var(--foreground)] hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]',
                      )}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span
                          className={cn(
                            'inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--muted)]/40',
                            isSelected && 'bg-[var(--blue-text)] shadow-[0_0_8px_var(--blue-glow)]',
                          )}
                        />
                        <span className="truncate">{option.label}</span>
                      </span>
                      {isSelected ? (
                        <svg
                          viewBox="0 0 16 16"
                          className="h-4 w-4 shrink-0 fill-current text-[var(--blue-text)]"
                          aria-hidden="true"
                        >
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
