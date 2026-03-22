export type NavigationAudience = 'member'

export type NavigationItem = {
  to: string
  label: string
  description: string
  group: string
  sidebar: boolean
  permissionKey?: string
  defaultRedirect: boolean
  audience?: NavigationAudience
}

export const navigationItems: readonly NavigationItem[] = [
  {
    to: '/auth/login',
    label: 'Auth',
    description: 'Login, register va recovery flow tayyor.',
    group: 'Access',
    sidebar: false,
    permissionKey: undefined,
    defaultRedirect: false,
  },
  {
    to: '/member/dashboard',
    label: 'Member Dashboard',
    description: 'Self dashboard with weekly update progress and salary snapshot.',
    group: 'Member',
    sidebar: true,
    permissionKey: undefined,
    defaultRedirect: true,
    audience: 'member',
  },
  {
    to: '/ceo/dashboard',
    label: 'CEO Dashboard',
    description: 'CEO statistik kartalari va daily metrics.',
    group: 'CEO',
    permissionKey: 'ceo',
    sidebar: true,
    defaultRedirect: true,
  },
  {
    to: '/ceo/users',
    label: 'Users & Permissions',
    description: 'User management va permission overview.',
    group: 'CEO',
    permissionKey: 'ceo',
    sidebar: true,
    defaultRedirect: false,
  },
  {
    to: '/ceo/team-updates',
    label: 'Team Monthly Updates',
    description: 'Monitor employee update activity by month.',
    group: 'CEO',
    permissionKey: 'ceo',
    sidebar: true,
    defaultRedirect: false,
  },
  {
    to: '/ceo/workday-overrides',
    label: 'Workday Overrides',
    description: 'Create holidays and short working days for update tracking.',
    group: 'CEO',
    permissionKey: 'ceo',
    sidebar: true,
    defaultRedirect: false,
  },
  {
    to: '/crm',
    label: 'CRM',
    description: 'Customers, filters, statuses va sales stats.',
    group: 'Sales',
    permissionKey: 'crm',
    sidebar: true,
    defaultRedirect: true,
  },
  {
    to: '/faults',
    label: 'Salary Estimates',
    description: 'Employee salary estimates, penalties and bonuses by month.',
    group: 'CEO',
    permissionKey: 'ceo',
    sidebar: true,
    defaultRedirect: false,
  },
  {
    to: '/updates',
    label: 'Updates',
    description: 'Update tracking, recent, missing va company stats.',
    group: 'People',
    permissionKey: 'update_list',
    sidebar: true,
    defaultRedirect: true,
  },
  {
    to: '/projects',
    label: 'Projects',
    description: 'Manage projects, boards, and kanban workflows.',
    group: 'Work',
    permissionKey: 'projects',
    sidebar: true,
    defaultRedirect: false,
  },
]
