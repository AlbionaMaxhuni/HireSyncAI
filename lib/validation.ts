export function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

export function isValidEmail(value: string) {
  const normalized = normalizeEmail(value)

  if (!normalized || normalized.length > 254) return false

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
}
