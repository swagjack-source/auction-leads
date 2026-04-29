import { captureError } from './sentry.js'

const isDev = import.meta.env.DEV

const logger = {
  /**
   * Log an error. Always console.error in dev; also ships to Sentry in prod.
   *
   * @param {string} message   - Human-readable description of where this failed
   * @param {unknown} [error]  - The raw error object
   * @param {Record<string, unknown>} [context] - Extra key/value pairs for Sentry
   */
  error(message, error, context = {}) {
    console.error(`[error] ${message}`, error)
    if (!isDev && error) {
      captureError(error instanceof Error ? error : new Error(String(error)), {
        area: message,
        ...context,
      })
    }
  },

  warn(message, ...args) {
    if (isDev) console.warn(`[warn] ${message}`, ...args)
  },

  info(message, ...args) {
    if (isDev) console.info(`[info] ${message}`, ...args)
  },
}

export default logger
