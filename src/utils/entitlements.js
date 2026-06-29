export function parseEntitlementDate(value) {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function isEntitlementActive(entitlement = {}, now = Date.now()) {
  if (entitlement.status !== 'active') {
    return false
  }

  if (!entitlement.expiresAt) {
    return true
  }

  const expiresAt = parseEntitlementDate(entitlement.expiresAt)
  return Boolean(expiresAt && expiresAt.getTime() >= now)
}

export function getActiveEntitlements(entitlements = [], now = Date.now()) {
  return entitlements.filter((entitlement) => isEntitlementActive(entitlement, now))
}

export function getActiveDigitalEntitlement(entitlements = [], now = Date.now()) {
  return getActiveEntitlements(entitlements, now).find(
    (entitlement) => String(entitlement.entitlementKey || '').startsWith('tier:'),
  ) || null
}

export function getLatestDigitalEntitlement(entitlements = []) {
  return (
    [...entitlements]
      .filter((entitlement) => String(entitlement.entitlementKey || '').startsWith('tier:'))
      .sort((a, b) => {
        const aDate = parseEntitlementDate(a.createdAt || a.expiresAt || 0)?.getTime() || 0
        const bDate = parseEntitlementDate(b.createdAt || b.expiresAt || 0)?.getTime() || 0
        return bDate - aDate
      })[0] || null
  )
}
