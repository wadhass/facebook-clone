import { useEffect, useState } from 'react'
import { getAuthToken } from '../../api'
import './message.css'

export default function MessageAttachment({
  mediaUrl,
  type,
  fileName,
  alt,
  className,
  lowData = false,
}) {
  const [attachment, setAttachment] = useState({ url: '', status: 'loading' })

  useEffect(() => {
    let cancelled = false
    let objectUrl = ''
    setAttachment({ url: '', status: 'loading' })

    async function loadAttachment() {
      try {
        const token = await getAuthToken()
        if (!token) throw new Error('Sign in to view this attachment')

        const response = await fetch(mediaUrl, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!response.ok) throw new Error('Attachment could not be loaded')

        objectUrl = URL.createObjectURL(await response.blob())
        if (cancelled) {
          URL.revokeObjectURL(objectUrl)
        } else {
          setAttachment({ url: objectUrl, status: 'loaded' })
        }
      } catch {
        if (!cancelled) setAttachment({ url: '', status: 'failed' })
      }
    }

    loadAttachment()
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [mediaUrl])

  if (attachment.status === 'failed') {
    return <span className={`${className}-state`} role='status'>Attachment unavailable</span>
  }
  if (attachment.status === 'loading') {
    return <span className={`${className}-state`} role='status'>Loading attachment...</span>
  }

  const downloadLink = (
    <a
      className='message-attachment-download'
      href={attachment.url}
      download={fileName || 'attachment'}
      aria-label={`Download ${fileName || `${type} attachment`}`}
    >
      {type === 'file' ? fileName || 'Download attachment' : 'Download'}
    </a>
  )

  if (type === 'image') {
    return (
      <>
        <img className={`${className}-image`} src={attachment.url} alt={alt || fileName || 'Image attachment'} />
        {downloadLink}
      </>
    )
  }

  if (type === 'video') {
    return (
      <>
        <video
          className={`${className}-video`}
          src={attachment.url}
          controls
          preload={lowData ? 'none' : 'metadata'}
        />
        {downloadLink}
      </>
    )
  }

  if (type === 'audio') {
    return (
      <>
        <span className='message-audio-attachment'>
          <audio src={attachment.url} controls preload='metadata' />
          <select
            aria-label='Voice message playback speed'
            defaultValue='1'
            onChange={(event) => {
              const audio = event.currentTarget.previousElementSibling
              if (audio) audio.playbackRate = Number(event.target.value)
            }}
          >
            <option value='0.75'>0.75×</option>
            <option value='1'>1×</option>
            <option value='1.25'>1.25×</option>
            <option value='1.5'>1.5×</option>
            <option value='2'>2×</option>
          </select>
        </span>
        {downloadLink}
      </>
    )
  }

  return downloadLink
}
