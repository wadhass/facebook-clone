const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export function getMediaUrl(mediaUrl) {
  return new URL(mediaUrl, new URL(API_URL, window.location.origin)).href
}

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers)
  const token = localStorage.getItem('authToken')

  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers })
  if (response.status === 204) return null

  const responseText = await response.text()
  let data = {}
  if (responseText) {
    try {
      data = JSON.parse(responseText)
    } catch {
      throw new Error('The server returned an invalid response')
    }
  }
  if (!response.ok) {
    const error = new Error(data.message || 'The request could not be completed')
    error.status = response.status
    throw error
  }

  return data
}
