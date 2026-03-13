type CustomerIdentity = {
  id?: number | string | null
  full_name?: string | null
  username?: string | null
  phone_number?: string | null
  platform?: string | null
}

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
  const normalized = normalizeIdentityValue(value)

  if (!normalized || isProbablyEncryptedValue(normalized)) {
    return null
  }

  return normalized
}

export function getCustomerDisplayName(customer: CustomerIdentity, fallbackLabel = 'Customer') {
  const fullName = normalizeIdentityValue(customer.full_name)

  if (fullName && !isProbablyEncryptedValue(fullName)) {
    return fullName
  }

  return formatUsernameHandle(customer.username) ?? getReadablePhone(customer.phone_number) ?? `${fallbackLabel} #${customer.id ?? '?'}`
}

export function getCustomerDisplayMeta(customer: CustomerIdentity) {
  const parts = [normalizeIdentityValue(customer.platform)]
  const username = formatUsernameHandle(customer.username)
  const phone = getReadablePhone(customer.phone_number)
  const displayName = getCustomerDisplayName(customer)

  if (username && username !== displayName) {
    parts.push(username)
  } else if (phone && phone !== displayName) {
    parts.push(phone)
  }

  return parts.filter(Boolean).join(' | ')
}
