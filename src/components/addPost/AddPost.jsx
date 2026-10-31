import './addPost.css'

import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { apiRequest, getMediaUrl } from '../../api'

const MAX_MEDIA_SIZE = 50 * 1024 * 1024

export default function AddPost () {
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [media, setMedia] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => () => {
    if (media) URL.revokeObjectURL(media.previewUrl)
  }, [media])

  function handleMediaChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    setError('')
    if (!file) return

    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setError('Choose an image or video file')
      return
    }
    if (file.size > MAX_MEDIA_SIZE) {
      setError('Media files must be 50 MB or smaller')
      return
    }

    setMedia({ file, previewUrl: URL.createObjectURL(file) })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (!text.trim() && !media) {
      setError('Write something or add a photo or video')
      return
    }
    setSubmitting(true)

    try {
      const body = media
        ? (() => {
            const formData = new FormData()
            formData.append('text', text)
            formData.append('media', media.file)
            return formData
          })()
        : JSON.stringify({ text })
      await apiRequest('/posts', {
        method: 'POST',
        body,
      })
      setText('')
      setMedia(null)
      window.dispatchEvent(new Event('posts:updated'))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
   <form className='postForm' onSubmit={handleSubmit}>
    <div className='user form-top'>
        {user?.avatar && <img src={getMediaUrl(user.avatar)} alt="" />}
        <input
          type="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder='What is on your mind?'
          maxLength={5000}
        />
        <button type='submit' className='btn btn-primary' disabled={submitting || (!text.trim() && !media)}>
          {submitting ? 'Posting...' : 'Post'}
        </button>
    </div>
    {media && (
      <div className='post-media-preview'>
        {media.file.type.startsWith('video/')
          ? <video src={media.previewUrl} controls />
          : <img src={media.previewUrl} alt='Selected post attachment' />}
        <button type='button' className='btn btn-red' onClick={() => setMedia(null)}>
          Remove attachment
        </button>
      </div>
    )}
    <label className='post-media-picker'>
      <span>Add a photo or video</span>
      <input type='file' accept='image/*,video/*' onChange={handleMediaChange} />
    </label>
    {error && <p role='alert'>{error}</p>}
   </form>
  )
}
