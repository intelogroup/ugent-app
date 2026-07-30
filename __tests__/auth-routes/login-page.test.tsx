import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const push = jest.fn()
const refresh = jest.fn()
let searchParams = new URLSearchParams()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
  useSearchParams: () => searchParams,
}))

const signInWithPassword = jest.fn()
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { signInWithPassword } }),
}))

import LoginPage from '@/app/auth/login/page'

describe('LoginPage', () => {
  afterEach(() => {
    jest.clearAllMocks()
    searchParams = new URLSearchParams()
  })

  it('shows an unverified-email message when redirected with that error', () => {
    searchParams = new URLSearchParams('error=email_unverified')
    render(<LoginPage />)

    expect(screen.getByText(/confirm your email/i)).toBeInTheDocument()
  })

  it('signs in and redirects to dashboard on success', async () => {
    signInWithPassword.mockResolvedValue({ error: null })
    render(<LoginPage />)

    fireEvent.change(document.querySelector('input[type="email"]')!, { target: { value: 'jim@example.com' } })
    fireEvent.change(document.querySelector('input[type="password"]')!, { target: { value: 'secret123' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: 'jim@example.com',
        password: 'secret123',
      })
    })
    expect(push).toHaveBeenCalledWith('/curriculum')
    expect(refresh).toHaveBeenCalled()
  })

  it('shows error message and does not redirect on failure', async () => {
    signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } })
    render(<LoginPage />)

    fireEvent.change(document.querySelector('input[type="email"]')!, { target: { value: 'jim@example.com' } })
    fireEvent.change(document.querySelector('input[type="password"]')!, { target: { value: 'wrongpass' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText('Incorrect email or password.')).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })
})
