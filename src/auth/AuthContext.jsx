import { useEffect, useMemo, useState } from 'react'
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

  async function authenticate(endpoint, credentials) {
    const result = await apiRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
    localStorage.setItem('authToken', result.token)
    setUser(result.user)
    setAuthError('')
  }

  function signOut() {
    localStorage.removeItem('authToken')
    setUser(null)
    setAuthError('')
  }

  const value = useMemo(
    () => ({ user, loading, authError, signIn: (data) => authenticate('/auth/login', data),
      signUp: (data) => authenticate('/auth/signup', data), signOut }),
    [user, loading, authError],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
