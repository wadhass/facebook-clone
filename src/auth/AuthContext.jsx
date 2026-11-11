import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  applyActionCode,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth'
import { apiRequest } from '../api'
import { auth, googleProvider } from '../firebase/firebaseConfig'
import AuthContext from './context'

function verificationSettings() {
  return {
    url: `${window.location.origin}/verify-email`,
    handleCodeInApp: true,
  }
}

function passwordResetSettings() {
  return {
    url: `${window.location.origin}/login?passwordReset=complete`,
    handleCodeInApp: false,
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [authError, setAuthError] = useState('')
  const [loading, setLoading] = useState(true)
  const syncRequests = useRef(new Map())

  const saveSession = useCallback((result) => {
    localStorage.setItem('authToken', result.token)
    setUser(result.user)
    setAuthError('')
  }, [])

  const syncFirebaseUser = useCallback((firebaseUser) => {
    const pending = syncRequests.current.get(firebaseUser.uid)
    if (pending) return pending

    const request = apiRequest('/auth/firebase/session', { method: 'POST' })
      .then((result) => {
        localStorage.removeItem('authToken')
        setUser(result.user)
        setAuthError('')
        return result
      })
      .finally(() => syncRequests.current.delete(firebaseUser.uid))

    syncRequests.current.set(firebaseUser.uid, request)
    return request
  }, [])

  useEffect(() => {
    let active = true
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        localStorage.removeItem('authToken')
        if (!firebaseUser.emailVerified) {
          if (active) {
            setUser(null)
            setLoading(false)
          }
          return
        }

        try {
          const result = await syncFirebaseUser(firebaseUser)
          if (active && auth.currentUser?.uid === firebaseUser.uid) setUser(result.user)
        } catch (error) {
          if (active) setAuthError(error.message)
        } finally {
          if (active) setLoading(false)
        }
        return
      }

      const token = localStorage.getItem('authToken')
      if (!token) {
        if (active) {
          setUser(null)
          setAuthError('')
          setLoading(false)
        }
        return
      }

      try {
        const result = await apiRequest('/auth/me')
        if (active && !auth.currentUser) setUser(result.user)
      } catch (error) {
        if (error.status === 401) {
          localStorage.removeItem('authToken')
          if (active) setUser(null)
        } else if (active) {
          setAuthError(error.message)
        }
      } finally {
        if (active) setLoading(false)
      }
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [syncFirebaseUser])

  const authenticateLegacy = useCallback(async (endpoint, credentials) => {
    const result = await apiRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
    saveSession(result)
    return result
  }, [saveSession])

  const signUp = useCallback(async ({ name, email, password }) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(credential.user, { displayName: name.trim() })
    await sendEmailVerification(credential.user, verificationSettings())
    return { email: credential.user.email }
  }, [])

  const signIn = useCallback(async ({ email, password }) => {
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password)
      if (!credential.user.emailVerified) {
        const error = new Error('Please verify your email address before signing in.')
        error.code = 'auth/email-not-verified'
        throw error
      }
      return await syncFirebaseUser(credential.user)
    } catch (error) {
      if (error.code === 'auth/email-not-verified') throw error
      if (!['auth/user-not-found', 'auth/invalid-credential', 'auth/wrong-password'].includes(error.code)) {
        throw error
      }
      return authenticateLegacy('/auth/login', { email, password })
    }
  }, [authenticateLegacy, syncFirebaseUser])

  const signInWithGoogle = useCallback(async () => {
    try {
      const credential = await signInWithPopup(auth, googleProvider)
      return syncFirebaseUser(credential.user)
    } catch (error) {
      if (error.code !== 'auth/popup-blocked') throw error
      await signInWithRedirect(auth, googleProvider)
      return { redirecting: true }
    }
  }, [syncFirebaseUser])

  const verifyEmail = useCallback(async ({ email, code, oobCode } = {}) => {
    if (oobCode) {
      await applyActionCode(auth, oobCode)
      if (auth.currentUser) {
        await reload(auth.currentUser)
        if (auth.currentUser.emailVerified) return syncFirebaseUser(auth.currentUser)
      }
      return { emailVerified: true }
    }

    if (code) {
      const result = await apiRequest('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email, code }),
      })
      saveSession(result)
      return result
    }

    if (!auth.currentUser) throw new Error('Open the verification link or sign in to continue.')
    await reload(auth.currentUser)
    if (!auth.currentUser.emailVerified) throw new Error('Your email is not verified yet.')
    return syncFirebaseUser(auth.currentUser)
  }, [saveSession, syncFirebaseUser])

  const resendVerificationEmail = useCallback(async (email) => {
    const currentUser = auth.currentUser
    if (currentUser && (!email || currentUser.email?.toLowerCase() === email.toLowerCase())) {
      await sendEmailVerification(currentUser, verificationSettings())
      return { message: 'A verification link has been sent to your email address.' }
    }
    return apiRequest('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  }, [])

  const requestPasswordReset = useCallback(async (email) => {
    try {
      await sendPasswordResetEmail(auth, email, passwordResetSettings())
    } catch (error) {
      if (error.code !== 'auth/user-not-found') throw error
      await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
    }
    return { message: 'If an account exists for that email, a password reset email is on its way.' }
  }, [])

  const resetPassword = useCallback(async ({ oobCode, password, token }) => {
    if (oobCode) {
      await confirmPasswordReset(auth, oobCode, password)
      return { message: 'Your password has been reset. You can now sign in.' }
    }

    return apiRequest(`/auth/reset-password/${encodeURIComponent(token)}`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    })
  }, [])

  const updateAvatar = useCallback(async (file) => {
    const body = new FormData()
    body.append('avatar', file)
    const result = await apiRequest('/users/me/avatar', { method: 'PATCH', body })
    setUser((currentUser) => currentUser ? { ...currentUser, avatar: result.user.avatar } : currentUser)
    return result.user
  }, [])

  const signOut = useCallback(async () => {
    localStorage.removeItem('authToken')
    if (auth.currentUser) await firebaseSignOut(auth)
    setUser(null)
    setAuthError('')
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      authError,
      signIn,
      signInWithGoogle,
      signUp,
      verifyEmail,
      resendVerificationEmail,
      requestPasswordReset,
      resetPassword,
      updateAvatar,
      signOut,
    }),
    [
      user,
      loading,
      authError,
      signIn,
      signInWithGoogle,
      signUp,
      verifyEmail,
      resendVerificationEmail,
      requestPasswordReset,
      resetPassword,
      updateAvatar,
      signOut,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
