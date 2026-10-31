import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import AuthLayout from '../../components/auth/AuthLayout'
import PasswordInput from '../../components/auth/PasswordInput'

export default function Signup(){
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const form = new FormData(event.currentTarget)

    try {
      const result = await signUp({
        name: form.get('name'),
        email: form.get('email'),
        password: form.get('password'),
      })
      navigate('/verify-email', { state: { email: result.email } })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      eyebrow='YOUR PEOPLE, YOUR PLACE'
      title='Make room for more connection.'
      description='Join Qavero to share your moments, find your people, and keep every conversation close.'
      footer={<>Already have an account? <Link to='/login'>Sign in</Link></>}
    >
      <form className='auth-form' onSubmit={handleSubmit}>
        <div className='auth-field'>
          <label htmlFor='signup-name'>Full name</label>
          <input
            className='auth-input'
            id='signup-name'
            name='name'
            type='text'
            required
            minLength={2}
            maxLength={80}
            placeholder='How should we call you?'
            autoComplete='name'
          />
        </div>
        <div className='auth-field'>
          <label htmlFor='signup-email'>Email address</label>
          <input
            className='auth-input'
            id='signup-email'
            name='email'
            type='email'
            required
            placeholder='you@example.com'
            autoComplete='email'
          />
        </div>
        <PasswordInput
          id='signup-password'
          name='password'
          label='Create a password'
          autoComplete='new-password'
          minLength={8}
          maxLength={128}
          hint='Use at least 8 characters.'
        />
        {error && <p className='auth-message auth-message--error' role='alert'>{error}</p>}
        <button type='submit' className='auth-submit' disabled={submitting}>
          {submitting ? 'Creating your account...' : 'Create account'}
          {!submitting && <span aria-hidden='true'>→</span>}
        </button>
        <p className='auth-terms'>By continuing, you agree to keep Qavero kind and welcoming.</p>
      </form>
    </AuthLayout>
  )
}
