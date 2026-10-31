import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { apiRequest } from '../../api'
import AuthLayout from '../../components/auth/AuthLayout'
import PasswordInput from '../../components/auth/PasswordInput'

export default function ResetPassword() {
  const { token: routeToken } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const token = routeToken ?? searchParams.get('token')

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
      eyebrow='CHOOSE A NEW PASSWORD'
      title='You’re back in control.'
      description='Choose a strong new password you haven’t used on Qavero before.'
      footer={<>Need a fresh link? <Link to='/forgot-password'>Request another</Link></>}
    >
      {!token ? (
        <p className='auth-message auth-message--error' role='alert'>
          This reset link is missing or incomplete. <Link to='/forgot-password'>Request a new one</Link>.
        </p>
      ) : (
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
      )}
    </AuthLayout>
  )
}
