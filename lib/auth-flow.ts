export type AuthIntent = 'default' | 'apply' | 'workspace' | 'invite'

export const PASSWORD_MIN_LENGTH = 8

function hasLetter(value: string) {
  return /[A-Za-z]/.test(value)
}

function hasNumber(value: string) {
  return /\d/.test(value)
}

export function getSafeNextPath(requestedPath: string | null | undefined, fallback = '/auth/complete') {
  const nextPath = requestedPath?.trim()

  if (!nextPath) return fallback
  if (!nextPath.startsWith('/')) return fallback
  if (nextPath.startsWith('//')) return fallback

  return nextPath
}

export function getAuthIntent(nextPath: string): AuthIntent {
  if (nextPath.includes('/auth/complete?invite=')) return 'invite'
  if (nextPath.startsWith('/admin')) return 'workspace'
  if (nextPath.includes('/jobs/') && nextPath.includes('apply=1')) return 'apply'
  return 'default'
}

export function getPasswordChecklist(password: string) {
  return {
    minLength: password.length >= PASSWORD_MIN_LENGTH,
    letter: hasLetter(password),
    number: hasNumber(password),
  }
}

export function getPasswordValidationMessage(password: string, confirmPassword?: string) {
  const checklist = getPasswordChecklist(password)

  if (!checklist.minLength) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`
  }

  if (!checklist.letter) {
    return 'Password must include at least one letter.'
  }

  if (!checklist.number) {
    return 'Password must include at least one number.'
  }

  if (confirmPassword !== undefined && password !== confirmPassword) {
    return "Passwords don't match."
  }

  return null
}
