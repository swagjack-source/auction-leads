// Feature flags — routes listed here are hidden from nav and redirect to /
// when accessed directly. Code and route definitions are kept intact.
// Remove a path from this set when the feature is ready to ship.

export const HIDDEN_ROUTES = new Set([
  '/schedule',
  '/training',
  '/library',
  '/expenses',
  '/inventory',
  '/activity',
  '/templates',
  '/saved',
])
