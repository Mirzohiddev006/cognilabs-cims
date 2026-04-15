import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from 'react'

interface State {
  hasError: boolean
  error: Error | null
}

interface Props extends PropsWithChildren {
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[AppErrorBoundary] Uncaught error:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-dim)]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-7 w-7 text-[var(--danger-text)]"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Nimadir noto&apos;g&apos;ri ketdi
            </h2>
            <p className="max-w-sm text-sm text-[var(--muted)]">
              {this.state.error?.message ?? 'Kutilmagan xato yuz berdi. Sahifani yangilang yoki qayta urinib ko\'ring.'}
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleReset}
            className="rounded-xl border border-[var(--border)] bg-[var(--accent-soft)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--accent-hover)]"
          >
            Qayta urinish
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
