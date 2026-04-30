// Default project checklists keyed by job type.
// Each item is { label: string, done: boolean }. Used by:
//   • ProjectDrawer "Generate Tasks" button
//   • ConvertToActiveModal when starting a project
//   • LeadDrawer's checklist section as a fallback

const FALLBACK = [
  'Initial walkthrough complete',
  'Scope of work confirmed with client',
  'Crew scheduled',
  'Materials & dumpster ordered',
  'Day-1 setup',
  'Mid-project client check-in',
  'Final walkthrough',
  'Invoice sent',
  'Payment received',
]

const TEMPLATES = {
  'Clean Out': [
    'Initial walkthrough & photos',
    'Confirm scope with client',
    'Order dumpster',
    'Schedule donation pickup',
    'Sort: keep / donate / haul',
    'Heavy items removed',
    'Final sweep',
    'Final walkthrough with client',
    'Invoice sent',
    'Payment received',
  ],
  'Auction': [
    'Inventory items photographed',
    'Catalog drafted',
    'Lots staged for pickup',
    'Auction listing live',
    'Auction closes',
    'Buyer pickup scheduled',
    'Items released to buyers',
    'Settlement to client',
    'Invoice sent',
    'Payment received',
  ],
  'Both': [
    'Initial walkthrough & photos',
    'Confirm scope with client',
    'Sort: auction / donate / haul',
    'Auction items inventoried & staged',
    'Auction listing live',
    'Dumpster ordered',
    'Cleanout crew scheduled',
    'Final walkthrough',
    'Settlement to client',
    'Invoice sent',
  ],
  'Move': [
    'Walkthrough & inventory',
    'Pack list confirmed',
    'Boxes & supplies ordered',
    'Crew scheduled',
    'Pack day',
    'Move day',
    'Unpack at destination',
    'Final walkthrough',
    'Invoice sent',
  ],
  'Sorting/Organizing': [
    'Initial consult',
    'Plan rooms & priorities',
    'Sort sessions scheduled',
    'Storage plan reviewed',
    'Donation pickup',
    'Final walkthrough',
    'Invoice sent',
  ],
  'In-person Estate Sale': [
    'Initial walkthrough & inventory',
    'Pricing & staging plan',
    'Marketing assets posted',
    'Sale day setup',
    'Sale day',
    'Post-sale cleanout',
    'Settlement to client',
    'Invoice sent',
  ],
}

/**
 * Return a fresh checklist (all items unchecked) for the given job type.
 * Falls back to a generic 9-step list when the type is unknown.
 *
 * @param {string} jobType
 * @returns {Array<{label: string, done: boolean}>}
 */
export function getChecklistForType(jobType) {
  const template = TEMPLATES[jobType] || FALLBACK
  return template.map(label => ({ label, done: false }))
}

/**
 * Convenience: count completion of a checklist array.
 * @param {Array<{done: boolean}>} checklist
 * @returns {{ done: number, total: number, pct: number }}
 */
export function checklistProgress(checklist) {
  if (!Array.isArray(checklist) || checklist.length === 0) {
    return { done: 0, total: 0, pct: 0 }
  }
  const done = checklist.filter(item => item?.done).length
  return { done, total: checklist.length, pct: Math.round((done / checklist.length) * 100) }
}
