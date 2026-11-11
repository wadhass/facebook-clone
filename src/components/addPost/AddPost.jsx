import './addPost.css'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { apiRequest, getMediaUrl } from '../../api'

const MAX_MEDIA_SIZE = 50 * 1024 * 1024

export default function AddPost () {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [text, setText] = useState('')
  const [media, setMedia] = useState(null)
  const [isReel, setIsReel] = useState(() => searchParams.get('create') === 'reel')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => () => {
    if (media) URL.revokeObjectURL(media.previewUrl)
  }, [media])

  useEffect(() => {
    setIsReel(searchParams.get('create') === 'reel')
  }, [searchParams])

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
    if (isReel && !file.type.startsWith('video/')) {
      setError('A reel must be a video')
      return
    }

    setMedia({ file, previewUrl: URL.createObjectURL(file) })
  }

  function handleReelChange(event) {
    const enabled = event.target.checked
    setIsReel(enabled)
    if (enabled && media && !media.file.type.startsWith('video/')) {
      setMedia(null)
      setError('Choose a video to create a reel')
    } else {
      setError('')
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (isReel && (!media || !media.file.type.startsWith('video/'))) {
      setError('Choose a video to create a reel')
      return
    }
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
            formData.append('isReel', String(isReel))
            formData.append('media', media.file)
            return formData
          })()
        : JSON.stringify({ text, isReel })
      await apiRequest('/posts', {
        method: 'POST',
        body,
      })
      setText('')
      setMedia(null)
      setIsReel(false)
      if (searchParams.has('create')) {
        setSearchParams((currentParams) => {
          const nextParams = new URLSearchParams(currentParams)
          nextParams.delete('create')
          return nextParams
        }, { replace: true })
      }
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
          placeholder={isReel ? 'Add a caption to your reel…' : 'What is on your mind?'}
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
      <span>{isReel ? 'Choose a reel video' : 'Choose a photo or video from your device'}</span>
      <input type='file' accept={isReel ? 'video/*' : 'image/*,video/*'} onChange={handleMediaChange} />
    </label>
    <label className='post-reel-option'>
      <input type='checkbox' checked={isReel} onChange={handleReelChange} />
      <span>Share this video as a Reel</span>
    </label>
    {error && <p role='alert'>{error}</p>}
   </form>
  )
}
