import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HIDDEN_ROUTES } from './featureFlags'

// ── Mocks needed by Sidebar ──────────────────────────────────────────────────
const noop = () => chain
const chain = { select: noop, eq: noop, in: noop, gte: noop, then: (cb) => Promise.resolve({ count: null, data: [] }).then(cb), catch: () => chain }

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => chain,
    auth:  { signOut: vi.fn() },
  },
}))
vi.mock('../lib/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'test@example.com' }, organizationId: 'org-1' }),
}))
vi.mock('../lib/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}))

import Sidebar from '../components/Layout/Sidebar'

// ── HIDDEN_ROUTES set ────────────────────────────────────────────────────────

describe('HIDDEN_ROUTES', () => {
  const EXPECTED = [
    '/schedule', '/training', '/library', '/expenses',
    '/inventory', '/activity', '/templates', '/saved',
  ]

  it('contains exactly the 8 expected paths', () => {
    expect(HIDDEN_ROUTES.size).toBe(8)
    EXPECTED.forEach(path => expect(HIDDEN_ROUTES.has(path)).toBe(true))
  })

  it('does not hide any always-visible routes', () => {
    const ALWAYS_VISIBLE = ['/', '/pipeline', '/contacts', '/projects', '/calendar', '/bdr', '/team', '/partners', '/ctbids']
    ALWAYS_VISIBLE.forEach(path => expect(HIDDEN_ROUTES.has(path)).toBe(false))
  })
})

// ── Sidebar nav filtering ────────────────────────────────────────────────────

const HIDDEN_LABELS = [
  'Crew Schedule', 'Training', 'Library',
  'Expenses', 'Inventory', 'Activity',
  'Templates', 'Saved Views',
]

const VISIBLE_LABELS = [
  'Home', 'Pipeline', 'Contacts', 'Projects', 'Calendar', 'Partners',
]

describe('Sidebar', () => {
  function renderSidebar() {
    return render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    )
  }

  it('does not render nav items for hidden routes', () => {
    renderSidebar()
    HIDDEN_LABELS.forEach(label => {
      expect(screen.queryByText(label)).not.toBeInTheDocument()
    })
  })

  it('still renders nav items for visible routes', () => {
    renderSidebar()
    VISIBLE_LABELS.forEach(label => {
      expect(screen.getByText(label)).toBeInTheDocument()
    })
  })

  it('does not render the Quick links section header when all quick links are hidden', () => {
    renderSidebar()
    // Templates and Saved Views are both hidden, so the section label should be gone
    expect(screen.queryByText('Quick links')).not.toBeInTheDocument()
  })
})
