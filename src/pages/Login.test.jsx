import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Login from './Login'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
    },
  },
}))

vi.mock('../lib/AuthContext', () => ({
  useAuth: vi.fn(() => ({ session: null, user: null, organizationId: null })),
}))

vi.mock('../lib/ThemeContext', () => ({
  useTheme: vi.fn(() => ({ theme: 'light', toggle: vi.fn() })),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  )
}

async function getAuth() {
  const { supabase } = await import('../lib/supabase')
  return supabase.auth
}

function emailInput() { return screen.getByLabelText('Email') }
function pwInput()    { return document.getElementById('password') }
function signInBtn()  { return screen.getByRole('button', { name: /^sign in$/i }) }
function signingInBtn() { return screen.getByRole('button', { name: /signing in/i }) }

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('Login — rendering', () => {
  it('renders the email and password fields', () => {
    renderLogin()
    expect(emailInput()).toBeInTheDocument()
    expect(pwInput()).toBeInTheDocument()
  })

  it('renders a "Sign in" submit button', () => {
    renderLogin()
    expect(signInBtn()).toBeInTheDocument()
  })

  it('does not show a confirm-password field', () => {
    renderLogin()
    expect(screen.queryByLabelText('Confirm Password')).not.toBeInTheDocument()
  })

  it('shows an invite-link note instead of a sign-up tab', () => {
    renderLogin()
    expect(screen.getByText(/invite link/i)).toBeInTheDocument()
  })
})

// ── Sign-in flow ──────────────────────────────────────────────────────────────

describe('Login — sign in', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls signInWithPassword with the entered credentials', async () => {
    const auth = await getAuth()
    auth.signInWithPassword.mockResolvedValue({ error: null })

    renderLogin()
    await userEvent.type(emailInput(), 'jack@example.com')
    await userEvent.type(pwInput(), 'hunter2')
    await userEvent.click(signInBtn())

    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'jack@example.com',
      password: 'hunter2',
    })
  })

  it('shows an error message when Supabase returns an auth error', async () => {
    const auth = await getAuth()
    auth.signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } })

    renderLogin()
    await userEvent.type(emailInput(), 'jack@example.com')
    await userEvent.type(pwInput(), 'wrongpassword')
    await userEvent.click(signInBtn())

    await waitFor(() => {
      expect(screen.getByText(/Invalid login credentials/)).toBeInTheDocument()
    })
  })

  it('disables the button and shows loading text while the request is in flight', async () => {
    const auth = await getAuth()
    auth.signInWithPassword.mockReturnValue(new Promise(() => {}))

    renderLogin()
    await userEvent.type(emailInput(), 'jack@example.com')
    await userEvent.type(pwInput(), 'hunter2')
    await userEvent.click(signInBtn())

    await waitFor(() => {
      expect(signingInBtn()).toBeDisabled()
    })
  })
})

// ── Authenticated redirect ────────────────────────────────────────────────────

describe('Login — authenticated redirect', () => {
  it('does not render the form when a session already exists', async () => {
    const { useAuth } = await import('../lib/AuthContext')
    useAuth.mockReturnValue({ session: { user: { id: '123' } }, user: { id: '123' } })

    renderLogin()
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
  })
})
