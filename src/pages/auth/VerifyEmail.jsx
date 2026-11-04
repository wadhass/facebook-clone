import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { auth } from '../../firebase/firebaseConfig'
import { useAuth } from '../../auth/useAuth'
import AuthLayout from '../../components/auth/AuthLayout'

export default function VerifyEmail() {
  const { state } = useLocation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { verifyEmail, resendVerificationEmail } = useAuth()
  const [email, setEmail] = useState(state?.email ?? auth.currentUser?.email ?? '')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)
  const handledActionCode = useRef('')
  const checkedVerification = useRef(false)
  const oobCode = searchParams.get('oobCode')
  const isFirebaseAction = searchParams.get('mode') === 'verifyEmail' && oobCode
  const firebaseVerificationPending = Boolean(auth.currentUser && !auth.currentUser.emailVerified)

  useEffect(() => {
    if (!isFirebaseAction || handledActionCode.current === oobCode) return
    handledActionCode.current = oobCode
    setSubmitting(true)

    verifyEmail({ oobCode })
      .then(() => {
        if (auth.currentUser?.emailVerified) {
          navigate('/', { replace: true })
        } else {
          navigate('/login', {
            replace: true,
            state: { message: 'Your email is verified. Sign in to continue.' },
          })
        }
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setSubmitting(false))
  }, [isFirebaseAction, navigate, oobCode, verifyEmail])

  useEffect(() => {
    if (isFirebaseAction || !auth.currentUser || checkedVerification.current) return
    checkedVerification.current = true
    verifyEmail()
      .then(() => navigate('/', { replace: true }))
      .catch((requestError) => {
        if (requestError.message === 'Your email is not verified yet.') {
          setMessage('Check your inbox and open the verification link. Then return here to continue.')
          return
        }
        setError(requestError.message)
      })
  }, [isFirebaseAction, navigate, verifyEmail])

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
      const result = await resendVerificationEmail(email)
      setMessage(result.message)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setResending(false)
    }
  }

  async function handleCheckVerification() {
    setError('')
    setMessage('')
    setSubmitting(true)
    try {
      await verifyEmail()
      navigate('/', { replace: true })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  const showLegacyCodeForm = !auth.currentUser && !isFirebaseAction

  return (
    <AuthLayout
      eyebrow='CHECK YOUR INBOX'
      title='Verify your email.'
      description={showLegacyCodeForm
        ? 'Enter the 6-digit code we sent you. The code expires after 10 minutes.'
        : 'Open the verification link we sent to your email to activate your account.'}
      footer={<>Already verified? <Link to='/login'>Sign in</Link></>}
    >
      <form className='auth-form' onSubmit={showLegacyCodeForm ? handleSubmit : (event) => event.preventDefault()}>
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
        {showLegacyCodeForm && (
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
        )}
        {error && <p className='auth-message auth-message--error' role='alert'>{error}</p>}
        {message && <p className='auth-message auth-message--success' role='status'>{message}</p>}
        {showLegacyCodeForm && (
          <button type='submit' className='auth-submit' disabled={submitting}>
            {submitting ? 'Verifying...' : 'Verify email'}
            {!submitting && <span aria-hidden='true'>→</span>}
          </button>
        )}
        {firebaseVerificationPending && (
          <button
            type='button'
            className='auth-submit'
            disabled={submitting}
            onClick={handleCheckVerification}
          >
            {submitting ? 'Checking...' : 'I’ve verified my email'}
          </button>
        )}
        {!isFirebaseAction && (
          <button
            type='button'
            className='auth-submit auth-submit--secondary'
            disabled={resending || !email || (!firebaseVerificationPending && !showLegacyCodeForm)}
            onClick={handleResend}
          >
            {resending ? 'Sending link...' : 'Resend verification email'}
          </button>
        )}
      </form>
    </AuthLayout>
  )
}
