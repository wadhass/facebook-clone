import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { apiRequest } from '../../api'
import AuthLayout from '../../components/auth/AuthLayout'

export default function VerifyEmail() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const { verifyEmail } = useAuth()
  const [email, setEmail] = useState(state?.email ?? '')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    setSubmitting(true)

    try {
      await verifyEmail({ email, code })
      navigate('/', { replace: true })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResend() {
    setError('')
    setMessage('')
    setResending(true)

    try {
      const result = await apiRequest('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      setMessage(result.message)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthLayout
      eyebrow='CHECK YOUR INBOX'
      title='Verify your email.'
      description='Enter the 6-digit code we sent you. The code expires after 10 minutes.'
      footer={<>Already verified? <Link to='/login'>Sign in</Link></>}
    >
      <form className='auth-form' onSubmit={handleSubmit}>
        <div className='auth-field'>
          <label htmlFor='verification-email'>Email address</label>
          <input
            className='auth-input'
            id='verification-email'
            name='email'
            type='email'
            required
            autoComplete='email'
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className='auth-field'>
          <label htmlFor='verification-code'>6-digit code</label>
          <input
            className='auth-input'
            id='verification-code'
            name='code'
            type='text'
            inputMode='numeric'
            pattern='[0-9]{6}'
            maxLength={6}
            required
            autoComplete='one-time-code'
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
          />
        </div>
        {error && <p className='auth-message auth-message--error' role='alert'>{error}</p>}
        {message && <p className='auth-message auth-message--success' role='status'>{message}</p>}
        <button type='submit' className='auth-submit' disabled={submitting}>
          {submitting ? 'Verifying...' : 'Verify email'}
          {!submitting && <span aria-hidden='true'>→</span>}
        </button>
        <button
          type='button'
          className='auth-submit'
          disabled={resending || !email}
          onClick={handleResend}
        >
          {resending ? 'Sending code...' : 'Resend verification code'}
        </button>
      </form>
    </AuthLayout>
  )
}
