/**
 * Lightweight in-memory rate limiter for Netlify Functions.
 *
 * This is a "warm-instance" limiter: state persists within a single Lambda
 * container and resets when the container cold-starts or scales out. For a
 * low-traffic internal app this is sufficient burst protection. If you need
 * coordination across concurrent instances, swap the `store` Map for an
 * Upstash Redis client.
 *
 * Usage:
 *   const { allowed, headers } = checkRateLimit(ip, { max: 5, windowMs: 60_000 })
 *   if (!allowed) {
 *     return { statusCode: 429, headers, body: JSON.stringify({ error: 'Too many requests' }) }
 *   }
 */

// ip/key → { count: number, resetAt: number (epoch ms) }
const store = new Map()

/**
 * @param {string} key        - Usually the caller IP address
 * @param {{ max?: number, windowMs?: number }} opts
 * @returns {{ allowed: boolean, headers: Record<string, string> }}
 */
function checkRateLimit(key, { max = 10, windowMs = 60_000 } = {}) {
  const now = Date.now()
  let entry = store.get(key)

  // Expired or new — start a fresh window
  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs }
    store.set(key, entry)
    return { allowed: true, headers: makeHeaders(max, max - 1, entry.resetAt) }
  }

  entry.count++

  if (entry.count > max) {
    return { allowed: false, headers: makeHeaders(max, 0, entry.resetAt) }
  }

  return { allowed: true, headers: makeHeaders(max, max - entry.count, entry.resetAt) }
}

function makeHeaders(limit, remaining, resetAtMs) {
  return {
    'X-RateLimit-Limit':     String(limit),
    'X-RateLimit-Remaining': String(Math.max(0, remaining)),
    'X-RateLimit-Reset':     String(Math.ceil(resetAtMs / 1000)), // Unix seconds
  }
}

/**
 * Extract the real caller IP from Netlify's forwarded headers.
 * Falls back to a fixed string so rate limiting still works in local dev.
 *
 * @param {import('@netlify/functions').HandlerEvent} event
 * @returns {string}
 */
function getCallerIp(event) {
  return (
    (event.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    event.headers['client-ip'] ||
    'unknown'
  )
}

/**
 * Check whether the request's Origin header is in the allowed list.
 * Returns null if allowed, or an error response object if blocked.
 *
 * @param {import('@netlify/functions').HandlerEvent} event
 * @param {string[]} allowedOrigins  e.g. ['https://homebase-crm.netlify.app']
 * @returns {{ statusCode: number, body: string } | null}
 */
function checkOrigin(event, allowedOrigins) {
  // Netlify dev / local testing — always allow
  if (process.env.NODE_ENV === 'development') return null

  const origin = event.headers['origin'] || ''

  // Some clients (server-to-server, curl) omit Origin entirely.
  // We only block when Origin is explicitly present and not in our list.
  if (origin && !allowedOrigins.some(o => origin === o || origin.endsWith(o))) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Forbidden' }),
    }
  }

  return null
}

module.exports = { checkRateLimit, getCallerIp, checkOrigin }
