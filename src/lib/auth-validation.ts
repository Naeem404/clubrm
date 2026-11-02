export type AuthMode = "login" | "signup"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const MIN_PASSWORD_LENGTH = 8

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim())
}

export function validateAuthInput(input: {
  mode: AuthMode
  email: string
  password: string
  fullName?: string
}): string | null {
  const email = input.email.trim()
  if (input.mode === "signup" && !input.fullName?.trim()) return "Please enter your full name."
  if (!email) return "Please enter your email address."
  if (!isValidEmail(email)) return "Please enter a valid email address."
  if (!input.password) return "Please enter your password."
  if (input.mode === "signup" && input.password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  }
  return null
}

/** Map Supabase auth errors to friendly messages that don't leak internals. */
export function friendlyAuthError(err: unknown, mode: AuthMode): string {
  const message = err instanceof Error ? err.message : typeof err === "string" ? err : ""
  const status = (err as { status?: number } | null)?.status
  if (/invalid login credentials/i.test(message)) return "Incorrect email or password."
  if (/email not confirmed/i.test(message)) return "Please confirm your email address before signing in."
  if (/already registered|already exists/i.test(message)) return "An account with this email already exists. Try signing in."
  if (status === 429 || /rate limit|too many/i.test(message)) return "Too many attempts. Please wait a moment and try again."
  if (/password/i.test(message) && mode === "signup") {
    return `That password isn't strong enough. Use at least ${MIN_PASSWORD_LENGTH} characters.`
  }
  if (/network|failed to fetch/i.test(message)) return "Network error. Check your connection and try again."
  return mode === "login" ? "Sign in failed. Please try again." : "Sign up failed. Please try again."
}
