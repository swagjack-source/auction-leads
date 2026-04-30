import { describe, it, expect } from 'vitest'
import { validateEmail, validatePhone, validateRequired, firstError } from './validate'

// ── validateEmail ─────────────────────────────────────────────────────────────

describe('validateEmail', () => {
  it('returns null for an empty string (field is optional)', () => {
    expect(validateEmail('')).toBeNull()
    expect(validateEmail(null)).toBeNull()
    expect(validateEmail(undefined)).toBeNull()
  })

  it('returns null for a valid email', () => {
    expect(validateEmail('user@example.com')).toBeNull()
    expect(validateEmail('jack+tag@subdomain.co.uk')).toBeNull()
    expect(validateEmail('  user@example.com  ')).toBeNull() // trims whitespace
  })

  it('returns an error string for an email missing @', () => {
    expect(validateEmail('notanemail')).toMatch(/valid email/)
  })

  it('returns an error string for an email missing domain', () => {
    expect(validateEmail('user@')).toMatch(/valid email/)
  })

  it('returns an error string for an email missing local part', () => {
    expect(validateEmail('@example.com')).toMatch(/valid email/)
  })

  it('returns an error for emails over 254 characters', () => {
    const long = 'a'.repeat(249) + '@b.com' // 255 chars — clearly > 254
    expect(validateEmail(long)).toMatch(/too long/)
  })
})

// ── validatePhone ─────────────────────────────────────────────────────────────

describe('validatePhone', () => {
  it('returns null for an empty string (field is optional)', () => {
    expect(validatePhone('')).toBeNull()
    expect(validatePhone(null)).toBeNull()
    expect(validatePhone(undefined)).toBeNull()
  })

  it('returns null for a plain 10-digit number', () => {
    expect(validatePhone('3035550100')).toBeNull()
  })

  it('returns null for common US formats with exactly 10 digits', () => {
    expect(validatePhone('(303) 555-0100')).toBeNull()
    expect(validatePhone('303-555-0100')).toBeNull()
    expect(validatePhone('303 555 0100')).toBeNull()
  })

  it('returns an error for a too-short number', () => {
    expect(validatePhone('123')).toMatch(/10-digit/)
  })

  it('returns an error for letters in the number', () => {
    expect(validatePhone('call-me-maybe')).toMatch(/10-digit/)
  })

  it('returns an error for 11+ digits (e.g. with country code)', () => {
    expect(validatePhone('+1 303 555 0100')).toMatch(/10-digit/)
    expect(validatePhone('+13035550100')).toMatch(/10-digit/)
  })
})

// ── validateRequired ──────────────────────────────────────────────────────────

describe('validateRequired', () => {
  it('returns null for a non-empty string', () => {
    expect(validateRequired('hello')).toBeNull()
    expect(validateRequired('  hello  ')).toBeNull()
  })

  it('returns an error for an empty string', () => {
    expect(validateRequired('')).toMatch(/required/)
  })

  it('returns an error for whitespace-only strings', () => {
    expect(validateRequired('   ')).toMatch(/required/)
  })

  it('returns an error for null and undefined', () => {
    expect(validateRequired(null)).toMatch(/required/)
    expect(validateRequired(undefined)).toMatch(/required/)
  })

  it('uses the supplied field name in the error message', () => {
    expect(validateRequired('', 'Email')).toMatch(/Email/)
  })

  it('defaults the field name when not supplied', () => {
    const err = validateRequired('')
    expect(err).toBeTruthy()
  })

  it('returns an error when the value exceeds maxLength', () => {
    expect(validateRequired('a'.repeat(256), 'Name', { maxLength: 255 })).toMatch(/255/)
  })

  it('returns null when the value is exactly at maxLength', () => {
    expect(validateRequired('a'.repeat(255), 'Name', { maxLength: 255 })).toBeNull()
  })
})

// ── firstError ────────────────────────────────────────────────────────────────

describe('firstError', () => {
  it('returns null when all validators pass', () => {
    expect(firstError(null, null, null)).toBeNull()
  })

  it('returns the first non-null error', () => {
    expect(firstError(null, 'second error', 'third error')).toBe('second error')
  })

  it('returns the only error when there is one', () => {
    expect(firstError('only error')).toBe('only error')
  })

  it('skips leading nulls to find the first real error', () => {
    expect(firstError(null, null, 'last error')).toBe('last error')
  })
})

// ── Composition: real-world form scenario ────────────────────────────────────

describe('Invite form validation (composite)', () => {
  function validateInviteForm(email) {
    return firstError(validateEmail(email))
  }

  it('passes when email is blank (optional)', () => {
    expect(validateInviteForm('')).toBeNull()
  })

  it('passes with a valid email', () => {
    expect(validateInviteForm('teammate@example.com')).toBeNull()
  })

  it('fails with a malformed email', () => {
    expect(validateInviteForm('not-an-email')).toBeTruthy()
  })
})

describe('Contact form validation (composite)', () => {
  function validateContactForm({ name, email, phone }) {
    return firstError(
      validateRequired(name, 'Name'),
      validateEmail(email),
      validatePhone(phone),
    )
  }

  it('passes a fully valid form', () => {
    expect(validateContactForm({ name: 'Jane Smith', email: 'jane@example.com', phone: '3035550100' })).toBeNull()
  })

  it('passes when optional fields are empty', () => {
    expect(validateContactForm({ name: 'Jane Smith', email: '', phone: '' })).toBeNull()
  })

  it('fails when name is missing', () => {
    expect(validateContactForm({ name: '', email: 'jane@example.com', phone: '' })).toMatch(/Name/)
  })

  it('fails when email is present but malformed', () => {
    expect(validateContactForm({ name: 'Jane', email: 'bad-email', phone: '' })).toMatch(/valid email/)
  })

  it('fails when phone is present but malformed', () => {
    expect(validateContactForm({ name: 'Jane', email: '', phone: 'abc' })).toMatch(/10-digit/)
  })

  it('reports the first error only — name takes priority', () => {
    // Both name and email invalid; should report name error first
    const err = validateContactForm({ name: '', email: 'bad', phone: '' })
    expect(err).toMatch(/Name/)
    expect(err).not.toMatch(/email/)
  })
})
