import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { apiRequest } from '../../api'
import AuthLayout from '../../components/auth/AuthLayout'
import PasswordInput from '../../components/auth/PasswordInput'

export default function ResetPassword() {
  const { token: routeToken } = useParams()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [email, setEmail] = useState(location.state?.email ?? '')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const token = routeToken ?? searchParams.get('token')

  async function handleRequestReset(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    setSubmitting(true)

    try {
      const result = await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      setMessage(result.message)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const form = new FormData(event.currentTarget)
    const password = form.get('password')

    if (password !== form.get('confirmPassword')) {
      setError('The passwords don’t match. Please check and try again.')
      setSubmitting(false)
      return
    }

    try {
      await apiRequest(`/auth/reset-password/${encodeURIComponent(token)}`, {
        method: 'POST',
        body: JSON.stringify({ password }),
      })
      navigate('/login', { replace: true, state: { message: 'Your password has been reset. Sign in with your new password.' } })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      eyebrow={token ? 'CHOOSE A NEW PASSWORD' : 'ACCOUNT RECOVERY'}
      title={token ? 'You’re back in control.' : 'Reset your password.'}
      description={token
        ? 'Choose a strong new password you haven’t used on Qavero before.'
        : 'Enter the email linked to your account and we’ll send you a secure reset link.'}
      footer={token
        ? <>Need a fresh link? <Link to='/reset-password'>Request another</Link></>
        : <>Remembered it? <Link to='/login'>Back to sign in</Link></>}
    >
      {token ? (
        <form className='auth-form' onSubmit={handleSubmit}>
          <PasswordInput
            id='reset-password'
            name='password'
            label='New password'
            autoComplete='new-password'
            minLength={8}
            maxLength={128}
            hint='Use at least 8 characters.'
          />
          <PasswordInput
            id='reset-confirm-password'
            name='confirmPassword'
            label='Confirm new password'
            autoComplete='new-password'
            minLength={8}
            maxLength={128}
          />
          {error && <p className='auth-message auth-message--error' role='alert'>{error}</p>}
          <button type='submit' className='auth-submit' disabled={submitting}>
            {submitting ? 'Updating password...' : 'Reset password'}
            {!submitting && <span aria-hidden='true'>→</span>}
          </button>
        </form>
      ) : (
        <form className='auth-form' onSubmit={handleRequestReset}>
          <div className='auth-field'>
            <label htmlFor='recovery-email'>Email address</label>
            <input
              className='auth-input'
              id='recovery-email'
              name='email'
              type='email'
              required
              placeholder='you@example.com'
              autoComplete='email'
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          {error && <p className='auth-message auth-message--error' role='alert'>{error}</p>}
          {message && <p className='auth-message auth-message--success' role='status'>{message}</p>}
          <button type='submit' className='auth-submit' disabled={submitting}>
            {submitting ? 'Sending link...' : 'Send reset link'}
            {!submitting && <span aria-hidden='true'>→</span>}
          </button>
        </form>
      )}
    </AuthLayout>
  )
}
