import { useEffect, useState } from 'react'
import { getAuthToken } from '../../api'

export default function MessageImage({ mediaUrl, alt, className }) {
  const [imageUrl, setImageUrl] = useState('')
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let cancelled = false
    let objectUrl = ''
    setImageUrl('')
    setStatus('loading')

    async function loadImage() {
      try {
        const token = await getAuthToken()
        if (!token) throw new Error('Sign in to view this image')

        const response = await fetch(mediaUrl, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!response.ok) throw new Error('Image could not be loaded')
        const image = await response.blob()
        if (!image.type.startsWith('image/')) throw new Error('The attachment is not an image')

        objectUrl = URL.createObjectURL(image)
        if (cancelled) {
          URL.revokeObjectURL(objectUrl)
        } else {
          setImageUrl(objectUrl)
          setStatus('loaded')
        }
      } catch {
        if (!cancelled) setStatus('failed')
      }
    }

    loadImage()
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [mediaUrl])

  if (status === 'failed') {
    return <span className={`${className}-state`} role='status'>Image unavailable</span>
  }
  if (status === 'loading') {
    return <span className={`${className}-state`} role='status'>Loading image...</span>
  }
  return <img className={className} src={imageUrl} alt={alt} />
}
