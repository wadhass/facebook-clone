import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import AuthLayout from '../../components/auth/AuthLayout'
import PasswordInput from '../../components/auth/PasswordInput'

export default function Login() {
  const { signIn } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const form = new FormData(event.currentTarget)

    try {
      await signIn({ email: form.get('email'), password: form.get('password') })
      navigate('/')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      eyebrow='WELCOME BACK'
      title='Good to see you again.'
      description='Sign in to catch up with the people and moments that make your day.'
      footer={<>New to Qavero? <Link to='/signup'>Create an account</Link></>}
    >
      <form className='auth-form' onSubmit={handleSubmit}>
        {location.state?.message && (
          <p className='auth-message auth-message--success' role='status'>
            {location.state.message}
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
          />
        </div>
        <PasswordInput
          id='login-password'
          name='password'
          label='Password'
          autoComplete='current-password'
        />
        <div className='auth-form-options'>
          <Link to='/forgot-password'>Forgot password?</Link>
        </div>
        {error && <p className='auth-message auth-message--error' role='alert'>{error}</p>}
        <button type='submit' className='auth-submit' disabled={submitting}>
          {submitting ? 'Signing in...' : 'Sign in'}
          {!submitting && <span aria-hidden='true'>→</span>}
        </button>
      </form>
    </AuthLayout>
  )
}
