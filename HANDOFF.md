# Cognilabs CIMS Frontend Handoff

## Stack

- React 19
- TypeScript
- Vite
- React Router
- Tailwind CSS v4 utilities
- Custom typed fetch service layer

## Environment

Create `.env` from `.env.example`.

Required variables:

- `VITE_APP_NAME`
- `VITE_API_BASE_URL`
- `VITE_APP_ENV`

## Main routes

- `/auth/login`
- `/auth/register`
- `/auth/verify-email`
- `/auth/forgot-password`
- `/auth/reset-password`
- `/ceo/dashboard`
- `/ceo/users`
- `/crm`
- `/crm/customers/:customerId`
- `/finance`
- `/updates`

## Implemented modules

- Auth:
  - login
  - register
  - verify email
  - forgot password
  - reset password
  - `auth/me`
  - refresh token
  - logout
  - logout all
- Route/session layer:
  - protected routes
  - guest routes
  - permission-based sidebar
  - API redirect handling
- CEO:
  - dashboard
  - today metrics
  - users list
  - create/edit/delete user
  - active toggle
  - permissions detail/update/add/remove
  - messages list/send/delete
  - payments list/create/edit/toggle/delete
- CRM:
  - dashboard list
  - search and filters
  - sales stats
  - conversion rate
  - dynamic statuses
  - create/edit customer
  - delete and bulk delete
  - customer detail page
- Finance:
  - dashboard balances
  - advanced stats
  - paginated finance list
  - exchange rate sync trigger
- Update tracking:
  - my stats
  - company stats
  - profile preview
  - monthly report preview
  - daily calendar preview
  - trends preview
  - recent updates preview
  - missing updates preview

## Shared frontend system

- App shell with responsive sidebar/header
- Data table
- Modal
- Dialog
- Toast provider
- Confirm provider
- Loading, empty and error state blocks
- Shared async hooks

## Commands

```bash
npm install
npm run dev
npm run lint
npx tsc --noEmit
npm run build
```

## Notes

- Update tracking endpoints return mixed raw payloads, so the page renders them in preview blocks using safe serialization.
- Finance create/edit/transfer/topup forms are not exposed in the current route set, but the service layer is already present.
- Permission keys from `auth/me` drive route access and sidebar visibility.
