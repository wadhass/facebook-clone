import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../../api'
import AuthLayout from '../../components/auth/AuthLayout'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
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

  return (
    <AuthLayout
      eyebrow='ACCOUNT RECOVERY'
      title='Forgot your password?'
      description='No worries. Enter the email linked to your account and we’ll send you a secure reset link.'
      footer={<>Remembered it? <Link to='/login'>Back to sign in</Link></>}
    >
      <form className='auth-form' onSubmit={handleSubmit}>
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
    </AuthLayout>
  )
}
