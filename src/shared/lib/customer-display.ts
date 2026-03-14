type CustomerIdentity = {
  id?: number | string | null
  full_name?: string | null
  name?: string | null
  surname?: string | null
  first_name?: string | null
  last_name?: string | null
  firstName?: string | null
  lastName?: string | null
  username?: string | null
  phone_number?: string | null
  phone?: string | null
  platform?: string | null
  platform_name?: string | null
  source_platform?: string | null
  social_platform?: string | null
  source?: string | null
  lead_source?: string | null
  channel?: string | null
  platforms?: Array<string | null> | null
} & Record<string, unknown>

function normalizeIdentityValue(value?: string | null) {
  if (!value) {
    return null
  }

  const normalized = value.trim()

  if (!normalized) {
    return null
  }

  if (['none', 'null', 'undefined', '-'].includes(normalized.toLowerCase())) {
    return null
  }

  return normalized
}

function toTitleCaseLabel(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function isPlaceholderName(value: string) {
  const normalized = value.trim().toLowerCase()

  return ['customer', 'client', 'lead', 'unknown'].includes(normalized) || /^customer\s*#?\d+$/i.test(normalized)
}

function getSafeIdentityValue(value?: string | null) {
  const normalized = normalizeIdentityValue(value)

  if (!normalized || isProbablyEncryptedValue(normalized)) {
    return null
  }

  return normalized
}

export function isProbablyEncryptedValue(value?: string | null) {
  const normalized = normalizeIdentityValue(value)

  if (!normalized) {
    return false
  }

  return /^gAAAAA[A-Za-z0-9_-]+$/.test(normalized) || (normalized.length > 48 && !normalized.includes(' '))
}

export function formatUsernameHandle(value?: string | null) {
  const normalized = normalizeIdentityValue(value)

  if (!normalized || isProbablyEncryptedValue(normalized)) {
    return null
  }

  return normalized.startsWith('@') ? normalized : `@${normalized}`
}

function getReadablePhone(value?: string | null) {
  return getSafeIdentityValue(value)
}

function getComposedName(customer: CustomerIdentity) {
  const firstName =
    getSafeIdentityValue(customer.name) ??
    getSafeIdentityValue(customer.first_name) ??
    getSafeIdentityValue(customer.firstName)
  const lastName =
    getSafeIdentityValue(customer.surname) ??
    getSafeIdentityValue(customer.last_name) ??
    getSafeIdentityValue(customer.lastName)

  const composedName = [firstName, lastName].filter(Boolean).join(' ').trim()
  return composedName || null
}

export function getCustomerPlatforms(customer: CustomerIdentity) {
  const directPlatforms = [
    customer.platform,
    customer.platform_name,
    customer.source_platform,
    customer.social_platform,
    customer.source,
    customer.lead_source,
    customer.channel,
  ]

  const arrayPlatforms = Array.isArray(customer.platforms) ? customer.platforms : []
  const allCandidates = [...directPlatforms, ...arrayPlatforms]

  return Array.from(
    new Set(
      allCandidates
        .map((value) => getSafeIdentityValue(value))
        .filter(Boolean)
        .map((value) => toTitleCaseLabel(String(value))),
    ),
  )
}

export function getCustomerDisplayPlatform(customer: CustomerIdentity) {
  return getCustomerPlatforms(customer).join(' / ') || null
}

export function getCustomerDisplayName(customer: CustomerIdentity, fallbackLabel = 'Customer') {
  const fullName = getSafeIdentityValue(customer.full_name)
  const composedName = getComposedName(customer)

  if (fullName && !isPlaceholderName(fullName)) {
    return fullName
  }

  if (composedName) {
    return composedName
  }

  if (fullName) {
    return fullName
  }

  return (
    formatUsernameHandle(customer.username) ??
    getReadablePhone(customer.phone_number) ??
    getReadablePhone(customer.phone) ??
    `${fallbackLabel} #${customer.id ?? '?'}`
  )
}

export function getCustomerDisplayMeta(customer: CustomerIdentity) {
  const parts = [getCustomerDisplayPlatform(customer)]
  const username = formatUsernameHandle(customer.username)
  const phone = getReadablePhone(customer.phone_number) ?? getReadablePhone(customer.phone)
  const displayName = getCustomerDisplayName(customer)

  if (username && username !== displayName) {
    parts.push(username)
  } else if (phone && phone !== displayName) {
    parts.push(phone)
  }

  return parts.filter(Boolean).join(' | ')
}
