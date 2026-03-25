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
import { CeoAiChatPage } from '../features/ceo/pages/CeoAiChatPage'
import { CimsTeamPage } from '../features/ceo/pages/CimsTeamPage'
import { CeoManagementPage } from '../features/ceo/pages/CeoManagementPage'
import { CeoTeamUpdatesPage } from '../features/ceo/pages/CeoTeamUpdatesPage'
import { CeoUsersPage } from '../features/ceo/pages/CeoUsersPage'
import { CeoWorkdayOverridesPage } from '../features/ceo/pages/CeoWorkdayOverridesPage'
import { CrmDashboardPage } from '../features/crm/pages/CrmDashboardPage'
import { CustomerDetailPage } from '../features/crm/pages/CustomerDetailPage'
import { FaultsMemberDetailPage } from '../features/faults/pages/FaultsMemberDetailPage'
import { FaultsPage } from '../features/faults/pages/FaultsPage'
import { MemberDashboardPage } from '../features/member/pages/MemberDashboardPage'
import { NotFoundPage } from '../features/errors/pages/NotFoundPage'
import { UpdateTrackingPage } from '../features/updateTracking/pages/UpdateTrackingPage'
import { ProjectsListPage } from '../features/projects/pages/ProjectsListPage'
import { ProjectDetailPage } from '../features/projects/pages/ProjectDetailPage'
import { BoardDetailPage } from '../features/projects/pages/BoardDetailPage'
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
                path: 'member/dashboard',
                element: (
                  <ProtectedRoute audience="member">
                    <MemberDashboardPage />
                  </ProtectedRoute>
                ),
              },
              {
                path: 'member',
                element: (
                  <ProtectedRoute audience="member">
                    <Navigate to="/member/dashboard" replace />
                  </ProtectedRoute>
                ),
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
                path: 'ceo/ai',
                element: (
                  <ProtectedRoute permissionKey="ceo">
                    <CeoAiChatPage />
                  </ProtectedRoute>
                ),
              },
              {
                path: 'cims-team',
                element: <CimsTeamPage />,
              },
              {
                path: 'ceo/cims-team',
                element: (
                  <Navigate to="/cims-team" replace />
                ),
              },
              {
                path: 'ceo/management',
                element: (
                  <ProtectedRoute permissionKey="ceo">
                    <CeoManagementPage />
                  </ProtectedRoute>
                ),
              },
              {
                path: 'ceo/team-updates',
                element: (
                  <ProtectedRoute permissionKey="ceo">
                    <CeoTeamUpdatesPage />
                  </ProtectedRoute>
                ),
              },
              {
                path: 'ceo/workday-overrides',
                element: (
                  <ProtectedRoute permissionKey="ceo">
                    <CeoWorkdayOverridesPage />
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
                path: 'faults',
                element: (
                  <ProtectedRoute permissionKey="ceo">
                    <FaultsPage />
                  </ProtectedRoute>
                ),
              },
              {
                path: 'faults/members/:memberId',
                element: (
                  <ProtectedRoute permissionKey="ceo">
                    <FaultsMemberDetailPage />
                  </ProtectedRoute>
                ),
              },
              {
                path: 'updates',
                element: (
                  <ProtectedRoute permissionKey="update_list" audience="member">
                    <UpdateTrackingPage />
                  </ProtectedRoute>
                ),
              },
              {
                path: 'projects',
                element: (
                  <ProtectedRoute permissionKey="projects">
                    <ProjectsListPage />
                  </ProtectedRoute>
                ),
              },
              {
                path: 'projects/:projectId',
                element: (
                  <ProtectedRoute permissionKey="projects">
                    <ProjectDetailPage />
                  </ProtectedRoute>
                ),
              },
              {
                path: 'boards/:boardId',
                element: (
                  <ProtectedRoute permissionKey="projects">
                    <BoardDetailPage />
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
