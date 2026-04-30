/**
 * Shared input validators.
 *
 * Each validator returns `null` when the value is valid, or a human-readable
 * error string when it isn't. This makes them easy to compose:
 *
 *   const err = validateEmail(form.email)
 *   if (err) { setError(err); return }
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Validates an email address.
 * @param {string} value
 * @returns {string|null} error message, or null if valid
 */
export function validateEmail(value) {
  if (!value || !value.trim()) return null          // Optional — only validate if provided
  if (!EMAIL_RE.test(value.trim())) return 'Enter a valid email address'
  if (value.length > 254) return 'Email address is too long'
  return null
}

/**
 * Strip all non-digit characters from a phone string.
 * @param {string} value
 * @returns {string}
 */
export function phoneDigits(value) {
  return String(value || '').replace(/\D/g, '')
}

/**
 * Format a phone string as (XXX) XXX-XXXX as the user types.
 * Returns the raw input if fewer than 4 digits.
 * @param {string} value
 * @returns {string}
 */
export function formatPhone(value) {
  const digits = phoneDigits(value).slice(0, 10)
  if (digits.length <= 3)  return digits
  if (digits.length <= 6)  return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

/**
 * Validates a phone number — must be exactly 10 digits when provided.
 * Returns null when empty (phone is optional on most forms).
 * @param {string} value
 * @returns {string|null} error message, or null if valid
 */
export function validatePhone(value) {
  if (!value || !value.trim()) return null          // Optional
  const digits = phoneDigits(value)
  if (digits.length !== 10) return 'Enter a 10-digit phone number'
  return null
}

/**
 * Validates a required text field.
 * @param {string} value
 * @param {string} [fieldName='This field']
 * @param {{ maxLength?: number }} [opts]
 * @returns {string|null}
 */
export function validateRequired(value, fieldName = 'This field', { maxLength = 255 } = {}) {
  if (!value || !value.trim()) return `${fieldName} is required`
  if (value.trim().length > maxLength) return `${fieldName} must be ${maxLength} characters or fewer`
  return null
}

/**
 * Run multiple validators and return the first error found, or null.
 * @param {...(string|null)} errors
 * @returns {string|null}
 */
export function firstError(...errors) {
  return errors.find(e => e !== null) ?? null
}
