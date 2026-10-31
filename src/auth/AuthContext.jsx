import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../api'
import AuthContext from './context'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [authError, setAuthError] = useState('')
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('authToken')))

  useEffect(() => {
    if (!localStorage.getItem('authToken')) return

    apiRequest('/auth/me')
      .then(({ user: currentUser }) => setUser(currentUser))
      .catch((error) => {
        if (error.status === 401) {
          localStorage.removeItem('authToken')
          setUser(null)
          return
        }
        setAuthError(error.message)
      })
      .finally(() => setLoading(false))
  }, [])

  const saveSession = useCallback((result) => {
    localStorage.setItem('authToken', result.token)
    setUser(result.user)
    setAuthError('')
  }, [])

  const authenticate = useCallback(async (endpoint, credentials) => {
    const result = await apiRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
    saveSession(result)
    return result
  }, [saveSession])

  const signUp = useCallback(async (data) => {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }, [])

  const verifyEmail = useCallback(async (data) => {
    const result = await apiRequest('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    saveSession(result)
  }, [saveSession])

  const updateAvatar = useCallback(async (file) => {
    const body = new FormData()
    body.append('avatar', file)
    const result = await apiRequest('/users/me/avatar', { method: 'PATCH', body })
    setUser((currentUser) => currentUser ? { ...currentUser, avatar: result.user.avatar } : currentUser)
    return result.user
  }, [])

  const signOut = useCallback(() => {
    localStorage.removeItem('authToken')
    setUser(null)
    setAuthError('')
  }, [])

  const signIn = useCallback((data) => authenticate('/auth/login', data), [authenticate])

  const value = useMemo(
    () => ({ user, loading, authError, signIn, signUp, verifyEmail, updateAvatar, signOut }),
    [user, loading, authError, signIn, signUp, verifyEmail, updateAvatar, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
