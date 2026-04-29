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
      signUp: vi.fn(),
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

// Query helpers.
//
// - Email: label is plain "Email" — getByLabelText works fine.
// - Password: the <label htmlFor="password"> contains a nested "Forgot?" link,
//   making its accessible name "Password Forgot?" in sign-in mode. Use the id
//   directly to avoid brittle label-text matching.
// - Confirm password: plain label, accessible name is "Confirm Password".
// - Submit button: queried per-context since the exact text changes by mode
//   and a generic regex would also match the mode-switch button.
function emailInput()   { return screen.getByLabelText('Email') }
function pwInput()      { return document.getElementById('password') }
function confirmInput() { return document.getElementById('confirmPassword') }

// Returns the form submit button for the given mode text.
function signInBtn()      { return screen.getByRole('button', { name: /^sign in$/i }) }
function createAcctBtn()  { return screen.getByRole('button', { name: /^create account$/i }) }
function signingInBtn()   { return screen.getByRole('button', { name: /signing in/i }) }

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('Login — rendering', () => {
  it('renders the email and password fields in sign-in mode', () => {
    renderLogin()
    expect(emailInput()).toBeInTheDocument()
    expect(pwInput()).toBeInTheDocument()   // queried by id="password"
  })

  it('renders a "Sign in" submit button by default', () => {
    renderLogin()
    expect(signInBtn()).toBeInTheDocument()
  })

  it('does not show the confirm-password field in sign-in mode', () => {
    renderLogin()
    expect(screen.queryByLabelText('Confirm Password')).not.toBeInTheDocument()
  })
})

// ── Mode switching ────────────────────────────────────────────────────────────

describe('Login — mode switching', () => {
  it('shows the confirm-password field after clicking "Sign up"', async () => {
    renderLogin()
    await userEvent.click(screen.getByRole('button', { name: /^sign up$/i }))
    expect(confirmInput()).toBeInTheDocument()
  })

  it('shows a "Create account" submit button in sign-up mode', async () => {
    renderLogin()
    await userEvent.click(screen.getByRole('button', { name: /^sign up$/i }))
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('hides the confirm-password field when switching back to sign-in', async () => {
    renderLogin()
    await userEvent.click(screen.getByRole('button', { name: /^sign up$/i }))
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }))
    expect(screen.queryByLabelText('Confirm Password')).not.toBeInTheDocument()
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
    // Never resolves — keeps the component in loading state
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

// ── Sign-up flow ──────────────────────────────────────────────────────────────

describe('Login — sign up', () => {
  beforeEach(() => vi.clearAllMocks())

  async function goToSignUp() {
    renderLogin()
    await userEvent.click(screen.getByRole('button', { name: /^sign up$/i }))
  }

  it('shows an error when passwords do not match — without calling Supabase', async () => {
    const auth = await getAuth()
    await goToSignUp()

    await userEvent.type(emailInput(), 'new@example.com')
    await userEvent.type(pwInput(), 'password1')
    await userEvent.type(confirmInput(), 'different')
    await userEvent.click(createAcctBtn())

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    expect(auth.signUp).not.toHaveBeenCalled()
  })

  it('calls signUp with the correct credentials when passwords match', async () => {
    const auth = await getAuth()
    auth.signUp.mockResolvedValue({ error: null })

    await goToSignUp()

    await userEvent.type(emailInput(), 'new@example.com')
    await userEvent.type(pwInput(), 'password1')
    await userEvent.type(confirmInput(), 'password1')
    await userEvent.click(createAcctBtn())

    expect(auth.signUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'password1',
    })
  })

  it('shows a success message after successful account creation', async () => {
    const auth = await getAuth()
    auth.signUp.mockResolvedValue({ error: null })

    await goToSignUp()
    await userEvent.type(emailInput(), 'new@example.com')
    await userEvent.type(pwInput(), 'password1')
    await userEvent.type(confirmInput(), 'password1')
    await userEvent.click(createAcctBtn())

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument()
    })
  })

  it('shows a Supabase error when sign-up fails', async () => {
    const auth = await getAuth()
    auth.signUp.mockResolvedValue({ error: { message: 'Email already registered' } })

    await goToSignUp()
    await userEvent.type(emailInput(), 'taken@example.com')
    await userEvent.type(pwInput(), 'password1')
    await userEvent.type(confirmInput(), 'password1')
    await userEvent.click(createAcctBtn())

    await waitFor(() => {
      expect(screen.getByText(/Email already registered/)).toBeInTheDocument()
    })
  })
})

// ── Authenticated redirect ────────────────────────────────────────────────────

describe('Login — authenticated redirect', () => {
  it('does not render the form when a session already exists', async () => {
    const { useAuth } = await import('../lib/AuthContext')
    useAuth.mockReturnValue({ session: { user: { id: '123' } }, user: { id: '123' } })

    renderLogin()

    // Component renders <Navigate to="/" replace /> — the form should be absent
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
  })
})
