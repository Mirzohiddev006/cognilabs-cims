import { RouterProvider } from 'react-router-dom'
import { ConfirmDialogProvider } from '../../shared/confirm/ConfirmDialogProvider'
import { ToastProvider } from '../../shared/toast/ToastProvider'
import { router } from '../router'

export function AppProviders() {
  return (
    <ToastProvider>
      <ConfirmDialogProvider>
        <RouterProvider router={router} />
      </ConfirmDialogProvider>
    </ToastProvider>
  )
}
