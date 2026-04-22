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
  const menuHeight = Math.min(optionCount, 6) * 36 + 16
  const openAbove = rect.bottom + menuHeight + 8 > window.innerHeight && rect.top - menuHeight - 8 >= 8
  const top = openAbove
    ? Math.max(8, rect.top - menuHeight - 8)
    : Math.min(rect.bottom + 4, window.innerHeight - menuHeight - 8)

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
    if (!isOpen || !triggerRef.current) return

    const updatePosition = () => {
      if (!triggerRef.current) return
      setPosition(getMenuPosition(triggerRef.current, options.length))
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
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
        onClick={() => { if (!disabled) setIsOpen((c) => !c) }}
        className={cn(
          'flex min-h-[34px] w-full items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--border-solid)] bg-[var(--input-surface)] px-3 py-1.5',
          'text-[14px] text-[var(--foreground)] outline-none',
          'transition-[border-color] duration-100',
          'hover:border-[var(--border-hover)]',
          'focus-visible:border-[var(--border-focus)] focus-visible:ring-1 focus-visible:ring-[var(--border-focus)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
      >
        <span className={cn('truncate text-left', !selectedOption && 'text-[var(--caption)]')}>
          {selectedOption?.label ?? placeholder}
        </span>
        <svg
          viewBox="0 0 16 16"
          className={cn(
            'h-3.5 w-3.5 shrink-0 fill-current text-[var(--caption)] transition-transform duration-150',
            isOpen && 'rotate-180',
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
                className="fixed z-[100] max-h-60 overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--border-solid)] bg-[var(--surface-elevated)] p-1 shadow-[var(--shadow-lg)]"
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
                        'flex w-full items-center justify-between gap-2 rounded-[var(--radius-md)] px-3 py-2 text-[13px] font-medium transition-colors',
                        isSelected
                          ? 'bg-[var(--accent-soft)] text-[var(--foreground)]'
                          : 'text-[var(--foreground)] hover:bg-[var(--accent-soft)]',
                      )}
                    >
                      <span className="truncate">{option.label}</span>
                      {isSelected ? (
                        <svg
                          viewBox="0 0 16 16"
                          className="h-3.5 w-3.5 shrink-0 fill-current text-[var(--foreground)]"
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
