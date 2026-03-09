# Cognilabs CIMS Frontend

Frontend for the CIMS admin system built with React, TypeScript and Vite.

## What is included

- Auth flow with register, login, verify email, forgot password and reset password
- Session handling with `auth/me`, token refresh and permission-based routing
- CEO dashboard, users, permissions, messages and payments
- CRM dashboard, customer detail, customer create/edit and sales metrics
- Finance dashboard with balances, stats and paginated transaction list
- Update tracking dashboard with personal and company reporting blocks
- Reusable UI layer for tables, modal, dialog, toast and state blocks

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example`.

3. Start development:

```bash
npm run dev
```

## Environment variables

```env
VITE_APP_NAME=Cognilabs CIMS
VITE_API_BASE_URL=http://localhost:8000
VITE_APP_ENV=development
```

## Useful scripts

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Project structure

```text
src/
  app/
  features/
    auth/
    ceo/
    crm/
    finance/
    overview/
    updateTracking/
  shared/
  widgets/
```

## Route map

- `/overview`
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

## Handoff

See [HANDOFF.md](./HANDOFF.md) for module coverage and delivery notes.
