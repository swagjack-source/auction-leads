import * as Sentry from '@sentry/react'

/**
 * Initialise Sentry. Call this once at app startup (main.jsx) before
 * rendering anything. Safe to call when VITE_SENTRY_DSN is absent — it
 * becomes a no-op so local dev is unaffected.
 */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return   // No DSN → disabled (local dev, preview builds without the var)

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,          // 'production' | 'development'
    // Only send traces in production to keep the free-tier quota.
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 0,
    // Don't capture breadcrumbs for console.log — reduces noise.
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    // Ignore known benign errors that create noise.
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Network request failed',
      /^ChunkLoadError/,
    ],
  })
}

/**
 * Capture an exception with optional context.
 * Safe to call even when Sentry is not initialised.
 *
 * @param {unknown} error
 * @param {{ area?: string, [key: string]: unknown }} [context]
 */
export function captureError(error, context = {}) {
  const { area, ...extra } = context
  Sentry.withScope(scope => {
    if (area) scope.setTag('area', area)
    Object.entries(extra).forEach(([k, v]) => scope.setExtra(k, v))
    Sentry.captureException(error)
  })
}
