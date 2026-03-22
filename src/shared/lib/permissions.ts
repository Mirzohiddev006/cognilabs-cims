import type { CurrentUser } from '../api/types'
import { navigationItems, type NavigationAudience, type NavigationItem } from '../config/navigation'

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

export function hasAudienceAccess(user: CurrentUser | null, audience?: NavigationAudience) {
  if (!audience) {
    return true
  }

  if (!user) {
    return false
  }

  if (audience === 'member') {
    return user.role !== 'CEO' && user.role !== 'Customer'
  }

  return true
}

export function canAccessNavigationItem(user: CurrentUser | null, item: Pick<NavigationItem, 'permissionKey' | 'audience'>) {
  return hasAudienceAccess(user, item.audience) && hasPermission(user, item.permissionKey)
}

export function getAccessibleNavigation(user: CurrentUser | null, options?: { sidebarOnly?: boolean }) {
  const sidebarOnly = options?.sidebarOnly ?? false

  return navigationItems.filter((item) => {
    if (sidebarOnly && item.sidebar === false) {
      return false
    }

    return canAccessNavigationItem(user, item)
  })
}

export function getDefaultDashboardPath(user: CurrentUser | null) {
  const candidate = navigationItems.find(
    (item) => item.defaultRedirect && canAccessNavigationItem(user, item),
  )

  return candidate?.to ?? '/crm'
}

export function isKnownProtectedPath(pathname: string) {
  return navigationItems.some((item) => item.to === pathname)
}
