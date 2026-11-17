import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import AuthLayout from '../../components/auth/AuthLayout'
import PasswordInput from '../../components/auth/PasswordInput'
import { usePreferences } from '../../preferences/usePreferences'

export default function Signup(){
  const { signUp, signInWithGoogle } = useAuth()
  const { t } = usePreferences()
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

  async function handleGoogleSignIn() {
    setError('')
    setSubmitting(true)
    try {
      const result = await signInWithGoogle()
      if (!result?.redirecting) navigate('/', { replace: true })
    } catch (requestError) {
      const messages = {
        'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
        'auth/popup-blocked': 'Google sign-in could not open. Try again or allow pop-ups for this site.',
        'auth/unauthorized-domain': 'This site is not authorized for Google sign-in in Firebase.',
      }
      setError(messages[requestError.code] || requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      eyebrow={t('YOUR PEOPLE, YOUR PLACE')}
      title={t('Make room for more connection.')}
      description={t('Join Qavero to share your moments, find your people, and keep every conversation close.')}
      footer={<>{t('Already have an account?')} <Link to='/login'>{t('Sign in')}</Link></>}
    >
      <form className='auth-form' onSubmit={handleSubmit}>
        <div className='auth-field'>
          <label htmlFor='signup-name'>{t('Full name')}</label>
          <input
            className='auth-input'
            id='signup-name'
            name='name'
            type='text'
            required
            minLength={2}
            maxLength={80}
            placeholder={t('How should we call you?')}
            autoComplete='name'
          />
        </div>
        <div className='auth-field'>
          <label htmlFor='signup-email'>{t('Email address')}</label>
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
          label={t('Create a password')}
          autoComplete='new-password'
          minLength={8}
          maxLength={128}
          hint={t('Use at least 8 characters.')}
        />
        {error && <p className='auth-message auth-message--error' role='alert'>{error}</p>}
        <button type='submit' className='auth-submit' disabled={submitting}>
          {submitting ? t('Creating your account...') : t('Create account')}
          {!submitting && <span aria-hidden='true'>→</span>}
        </button>
        <button
          type='button'
          className='auth-submit auth-submit--secondary'
          disabled={submitting}
          onClick={handleGoogleSignIn}
        >
          {t('Continue with Google')}
        </button>
        <p className='auth-terms'>{t('By continuing, you agree to keep Qavero kind and welcoming.')}</p>
      </form>
    </AuthLayout>
  )
}
