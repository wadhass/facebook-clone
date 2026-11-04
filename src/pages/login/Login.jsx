import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import AuthLayout from '../../components/auth/AuthLayout'
import PasswordInput from '../../components/auth/PasswordInput'

export default function Login() {
  const { signIn, signInWithGoogle } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [needsVerification, setNeedsVerification] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setNeedsVerification(false)
    setSubmitting(true)
    const form = new FormData(event.currentTarget)

    try {
      await signIn({ email, password: form.get('password') })
      navigate('/', { replace: true })
    } catch (requestError) {
      setError(requestError.message)
      setNeedsVerification(
        requestError.status === 403 || requestError.code === 'auth/email-not-verified',
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogleSignIn() {
    setError('')
    setNeedsVerification(false)
    setSubmitting(true)

    try {
      await signInWithGoogle()
      navigate('/', { replace: true })
    } catch (requestError) {
      const messages = {
        'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
        'auth/popup-blocked': 'Allow pop-ups to sign in with Google, then try again.',
        'auth/unauthorized-domain': 'This site is not authorized for Google sign-in in Firebase.',
      }
      setError(messages[requestError.code] || requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  const statusMessage = location.state?.message || (
    searchParams.get('passwordReset') === 'complete'
      ? 'If you completed the reset, you can now sign in with your new password.'
      : ''
  )

  return (
    <AuthLayout
      eyebrow='WELCOME BACK'
      title='Good to see you again.'
      description='Sign in to catch up with the people and moments that make your day.'
      footer={<>New to Qavero? <Link to='/signup'>Create an account</Link></>}
    >
      <form className='auth-form' onSubmit={handleSubmit}>
        {statusMessage && (
          <p className='auth-message auth-message--success' role='status'>
            {statusMessage}
          </p>
        )}
        <div className='auth-field'>
          <label htmlFor='login-email'>Email address</label>
          <input
            className='auth-input'
            id='login-email'
            name='email'
            type='email'
            required
            placeholder='you@example.com'
            autoComplete='email'
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <PasswordInput
          id='login-password'
          name='password'
          label='Password'
          autoComplete='current-password'
        />
        <div className='auth-form-options'>
          <Link to='/reset-password' state={{ email }}>Forgot password?</Link>
        </div>
        {error && (
          <p className='auth-message auth-message--error' role='alert'>
            {error}{needsVerification && <> <Link to='/verify-email' state={{ email }}>Verify your email.</Link></>}
          </p>
        )}
        <button type='submit' className='auth-submit' disabled={submitting}>
          {submitting ? 'Signing in...' : 'Sign in'}
          {!submitting && <span aria-hidden='true'>→</span>}
        </button>
        <button
          type='button'
          className='auth-submit auth-submit--secondary'
          disabled={submitting}
          onClick={handleGoogleSignIn}
        >
          Continue with Google
        </button>
      </form>
    </AuthLayout>
  )
}
