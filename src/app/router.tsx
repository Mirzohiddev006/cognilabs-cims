import { Navigate, createBrowserRouter } from 'react-router-dom'
import { AuthLayout } from './layouts/AuthLayout'
import { RootLayout } from './layouts/RootLayout'
import { GuestRoute } from '../features/auth/components/GuestRoute'
import { ProtectedRoute } from '../features/auth/components/ProtectedRoute'
import { DashboardRedirectPage } from '../features/auth/pages/DashboardRedirectPage'
import { ForgotPasswordPage } from '../features/auth/pages/ForgotPasswordPage'
import { LoginPage } from '../features/auth/pages/LoginPage'
import { ResetPasswordPage } from '../features/auth/pages/ResetPasswordPage'
import { VerifyEmailPage } from '../features/auth/pages/VerifyEmailPage'
import { CeoDashboardPage } from '../features/ceo/pages/CeoDashboardPage'
import { CeoUsersPage } from '../features/ceo/pages/CeoUsersPage'
import { CrmDashboardPage } from '../features/crm/pages/CrmDashboardPage'
import { CustomerDetailPage } from '../features/crm/pages/CustomerDetailPage'
import { NotFoundPage } from '../features/errors/pages/NotFoundPage'
import { UpdateTrackingPage } from '../features/updateTracking/pages/UpdateTrackingPage'
import { RouterAuthBoundary } from './providers/RouterAuthBoundary'

export const router = createBrowserRouter([
  {
    element: <RouterAuthBoundary />,
    children: [
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: '/',
            element: <RootLayout />,
            children: [
              {
                index: true,
                element: <DashboardRedirectPage />,
              },
              {
                path: 'dashboard-redirect',
                element: <DashboardRedirectPage />,
              },
              {
                path: 'ceo/dashboard',
                element: (
                  <ProtectedRoute permissionKey="ceo">
                    <CeoDashboardPage />
                  </ProtectedRoute>
                ),
              },
              {
                path: 'ceo',
                element: (
                  <ProtectedRoute permissionKey="ceo">
                    <Navigate to="/ceo/dashboard" replace />
                  </ProtectedRoute>
                ),
              },
              {
                path: 'ceo/users',
                element: (
                  <ProtectedRoute permissionKey="ceo">
                    <CeoUsersPage />
                  </ProtectedRoute>
                ),
              },
              {
                path: 'crm',
                element: (
                  <ProtectedRoute permissionKey="crm">
                    <CrmDashboardPage />
                  </ProtectedRoute>
                ),
              },
              {
                path: 'crm/customers/:customerId',
                element: (
                  <ProtectedRoute permissionKey="crm">
                    <CustomerDetailPage />
                  </ProtectedRoute>
                ),
              },
              {
                path: 'updates',
                element: (
                  <ProtectedRoute permissionKey="update_list">
                    <UpdateTrackingPage />
                  </ProtectedRoute>
                ),
              },
            ],
          },
        ],
      },
      {
        path: '/auth',
        element: <GuestRoute />,
        children: [
          {
            element: <AuthLayout />,
            children: [
              {
                index: true,
                element: <Navigate to="login" replace />,
              },
              {
                path: 'login',
                element: <LoginPage />,
              },
              {
                path: 'register',
                element: <Navigate to="/auth/login" replace />,
              },
              {
                path: 'verify-email',
                element: <VerifyEmailPage />,
              },
              {
                path: 'forgot-password',
                element: <ForgotPasswordPage />,
              },
              {
                path: 'reset-password',
                element: <ResetPasswordPage />,
              },
            ],
          },
        ],
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
])
