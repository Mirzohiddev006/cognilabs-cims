import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { CimsAiWorkspace } from '../../features/ceo/components/CimsAiWorkspace'
import { cn } from '../../shared/lib/cn'

export function CimsAiLauncher() {
  const location = useLocation()
  const { hasPermission, isAuthenticated } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  const canUseAi = isAuthenticated && hasPermission('ceo')
  const isAiPage = location.pathname === '/ceo/ai'

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node | null

      if (
        target &&
        !cardRef.current?.contains(target) &&
        !buttonRef.current?.contains(target)
      ) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  if (!canUseAi || isAiPage) {
    return null
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close CIMS AI backdrop"
        onClick={() => setIsOpen(false)}
        className={cn(
          'fixed inset-0 z-[64] transition-all duration-200',
          isOpen
            ? 'pointer-events-auto bg-[radial-gradient(circle_at_right,rgba(59,130,246,0.12),transparent_30%),rgba(3,6,14,0.42)] opacity-100 backdrop-blur-[10px]'
            : 'pointer-events-none opacity-0 backdrop-blur-0',
        )}
      />

      <div
        ref={cardRef}
        className={cn(
          'fixed bottom-24 right-4 z-[65] w-[min(calc(100vw-2rem),500px)] transition-all duration-200 sm:right-6',
          isOpen
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-3 opacity-0',
        )}
      >
        <div className="overflow-hidden rounded-[32px] border border-[var(--border)] bg-[linear-gradient(180deg,var(--surface-elevated),var(--surface))] shadow-[var(--shadow-xl)] backdrop-blur-2xl">
          <div className="h-[min(84vh,780px)]">
            <CimsAiWorkspace mode="dialog" />
          </div>
        </div>
      </div>

      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="fixed bottom-6 right-4 z-[66] grid h-14 w-14 place-items-center rounded-[20px] border border-blue-400/22 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.28),rgba(15,23,42,0.98))] text-white shadow-[0_18px_60px_rgba(37,99,235,0.24)] transition hover:scale-[1.02] hover:border-blue-300/35 hover:shadow-[0_24px_70px_rgba(37,99,235,0.34)] sm:right-6"
        aria-label={isOpen ? 'Close CIMS AI launcher' : 'Open CIMS AI launcher'}
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M12 4v5" strokeLinecap="round" />
          <path d="M12 15v5" strokeLinecap="round" />
          <path d="M4 12h5" strokeLinecap="round" />
          <path d="M15 12h5" strokeLinecap="round" />
          <circle cx="12" cy="12" r="3.25" />
        </svg>
      </button>
    </>
  )
}
