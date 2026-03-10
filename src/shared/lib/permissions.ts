import type { CurrentUser } from '../api/types'
import { navigationItems } from '../config/navigation'

export function hasPermission(user: CurrentUser | null, permissionKey?: string) {
  if (!permissionKey) {
    return true
  }

  if (!user) {
    return false
  }

  if (user.role === 'CEO') {
    return true
  }

  return Boolean(user.permissions[permissionKey])
}

export function getAccessibleNavigation(user: CurrentUser | null, options?: { sidebarOnly?: boolean }) {
  const sidebarOnly = options?.sidebarOnly ?? false

  return navigationItems.filter((item) => {
    if (sidebarOnly && item.sidebar === false) {
      return false
    }

    return hasPermission(user, item.permissionKey)
  })
}

export function getDefaultDashboardPath(user: CurrentUser | null) {
  const candidate = navigationItems.find(
    (item) => item.defaultRedirect && hasPermission(user, item.permissionKey),
  )

  return candidate?.to ?? '/crm'
}

export function isKnownProtectedPath(pathname: string) {
  return navigationItems.some((item) => item.to === pathname)
}
