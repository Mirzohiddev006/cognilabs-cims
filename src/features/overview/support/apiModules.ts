export const apiModules = [
  {
    name: 'Auth',
    summary: 'Register, login, verify email, forgot/reset password, me, refresh, logout.',
    endpoints: ['/auth/register', '/auth/login', '/auth/me'],
  },
  {
    name: 'CEO',
    summary: 'Dashboard, user CRUD, permissions, messages va payments modullari.',
    endpoints: ['/ceo/dashboard', '/ceo/users', '/ceo/payments'],
  },
  {
    name: 'CRM',
    summary: 'Customers dashboard, detail, CRUD, filters, statuses va sales statistikalar.',
    endpoints: ['/crm/dashboard', '/crm/customers', '/sales/stats'],
  },
  {
    name: 'Finance',
    summary: 'Finance dashboard, list, exchange rate, advanced stats va transferlar.',
    endpoints: ['/finance/dashboard', '/finance/exchange-rate', '/finance/advanced/stats'],
  },
  {
    name: 'Updates',
    summary: 'Personal update stats, company stats, recent va missing updates.',
    endpoints: ['/update-tracking/stats/me', '/update-tracking/recent', '/update-tracking/company-stats'],
  },
] as const
