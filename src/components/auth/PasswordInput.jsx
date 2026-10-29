import { useState } from 'react'

function EyeIcon({ visible }) {
  return visible ? (
    <svg viewBox='0 0 24 24' fill='none' aria-hidden='true'>
      <path d='M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8' />
      <path d='M9.9 5.2A10.7 10.7 0 0112 5c5.5 0 9 7 9 7a14.8 14.8 0 01-3 3.8M6.2 6.2C3.9 7.7 2 12 2 12s3.5 7 10 7a9.9 9.9 0 004.1-.9' />
    </svg>
  ) : (
    <svg viewBox='0 0 24 24' fill='none' aria-hidden='true'>
      <path d='M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z' />
      <circle cx='12' cy='12' r='3' />
    </svg>
  )
}

export default function PasswordInput({
  id,
  name,
  label,
  autoComplete,
  required = true,
  minLength,
  maxLength,
  hint,
}) {
  const [visible, setVisible] = useState(false)

  return (
    <div className='auth-field'>
      <label htmlFor={id}>{label}</label>
      <div className='auth-password-wrap'>
        <input
          className='auth-input'
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
          placeholder='Enter your password'
          autoComplete={autoComplete}
        />
        <button
          className='auth-password-toggle'
          type='button'
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          <EyeIcon visible={visible} />
        </button>
      </div>
      {hint && <span className='auth-field-hint'>{hint}</span>}
    </div>
  )
}
