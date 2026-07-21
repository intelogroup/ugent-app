import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const push = jest.fn()
const refresh = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}))

const signUp = jest.fn()
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { signUp } }),
}))

import SignupPage from '@/app/auth/signup/page'

function fillAndSubmit(email: string, password: string) {
  fireEvent.change(document.querySelector('input[type="email"]')!, { target: { value: email } })
  fireEvent.change(document.querySelector('input[type="password"]')!, { target: { value: password } })
  fireEvent.click(screen.getByRole('button', { name: /create account/i }))
}

describe('SignupPage', () => {
  afterEach(() => jest.clearAllMocks())

  it('signs up and shows confirmation message on success', async () => {
    signUp.mockResolvedValue({ error: null })
    render(<SignupPage />)

    fillAndSubmit('jim@example.com', 'secret123')

    await waitFor(() => {
      expect(signUp).toHaveBeenCalledWith({
        email: 'jim@example.com',
        password: 'secret123',
        options: { emailRedirectTo: `${location.origin}/auth/callback` },
      })
    })
    expect(await screen.findByText(/check your email/i)).toBeInTheDocument()
  })

  it('shows error message and no confirmation message on failure', async () => {
    signUp.mockResolvedValue({ error: { message: 'User already registered' } })
    render(<SignupPage />)

    fillAndSubmit('jim@example.com', 'secret123')

    expect(await screen.findByText('User already registered')).toBeInTheDocument()
    expect(screen.queryByText(/check your email/i)).not.toBeInTheDocument()
  })
})
