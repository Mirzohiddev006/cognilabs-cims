import { RouterProvider } from 'react-router-dom'
import { ConfirmDialogProvider } from '../../shared/confirm/ConfirmDialogProvider'
import { ToastProvider } from '../../shared/toast/ToastProvider'
import { router } from '../router'
import { ThemeProvider } from './ThemeProvider'

export function AppProviders() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ConfirmDialogProvider>
          <RouterProvider router={router} />
        </ConfirmDialogProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
