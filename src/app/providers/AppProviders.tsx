import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { ConfirmDialogProvider } from '../../shared/confirm/ConfirmDialogProvider'
import { ToastProvider } from '../../shared/toast/ToastProvider'
import { router } from '../router'
import { AppErrorBoundary } from './AppErrorBoundary'
import { LocaleProvider } from './LocaleProvider'
import { QueryProvider } from './QueryProvider'
import { ThemeProvider } from './ThemeProvider'

export function AppProviders() {
  return (
    <AppErrorBoundary>
      <QueryProvider>
        <LocaleProvider>
          <ThemeProvider>
            <ToastProvider>
              <ConfirmDialogProvider>
                <RouterProvider router={router} />
                {/* react-hot-toast portal — for new-pattern toasts */}
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 3600,
                    style: {
                      borderRadius: '12px',
                      fontSize: '13px',
                    },
                  }}
                />
              </ConfirmDialogProvider>
            </ToastProvider>
          </ThemeProvider>
        </LocaleProvider>
      </QueryProvider>
    </AppErrorBoundary>
  )
}
