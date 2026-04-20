const isDev = import.meta.env.DEV

const logger = {
  error(message, ...args) {
    // Always log errors — in production, route to a monitoring service here (e.g. Sentry)
    console.error(`[error] ${message}`, ...args)
  },
  warn(message, ...args) {
    if (isDev) console.warn(`[warn] ${message}`, ...args)
  },
  info(message, ...args) {
    if (isDev) console.info(`[info] ${message}`, ...args)
  },
}

export default logger
