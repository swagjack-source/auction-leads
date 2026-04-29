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
// Accepts: +1 (303) 555-0100 | 303-555-0100 | 3035550100 | +13035550100
const PHONE_RE = /^[+]?[\d\s\-().]{7,20}$/

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
 * Validates a phone number (loose — allows various formats).
 * @param {string} value
 * @returns {string|null} error message, or null if valid
 */
export function validatePhone(value) {
  if (!value || !value.trim()) return null          // Optional
  if (!PHONE_RE.test(value.trim())) return 'Enter a valid phone number'
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
