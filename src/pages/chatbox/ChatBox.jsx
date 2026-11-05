import './chatbox.css'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiRequest, getAuthToken, getMediaUrl } from '../../api'
import { useAuth } from '../../auth/useAuth'
import { useRealtime } from '../../realtime/useRealtime'
import { useCalls } from '../../calls/useCalls'

// Font Awesome icon.........
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowAltCircleRight,
  faCamera,
  faMicrophone,
  faPhone,
  faStop,
  faVideo,
} from '@fortawesome/free-solid-svg-icons'

const emojiOptions = ['😀', '😂', '🥰', '😍', '😮', '😢', '😡', '👍', '❤️', '🎉', '👋', '🙏']
const stickerOptions = ['❤️', '😂', '🥰', '👍', '🎉', '👋', '🙌', '😍']

function VoiceAttachment({ mediaUrl }) {
  const [audioUrl, setAudioUrl] = useState('')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    let objectUrl = ''

    async function loadAudio() {
      try {
        const token = await getAuthToken()
        const headers = new Headers()
        if (token) headers.set('Authorization', `Bearer ${token}`)
        const response = await fetch(mediaUrl, { headers })
        if (!response.ok) throw new Error('Voice message could not be loaded')
        objectUrl = URL.createObjectURL(await response.blob())
        if (cancelled) URL.revokeObjectURL(objectUrl)
        else setAudioUrl(objectUrl)
      } catch {
        if (!cancelled) setFailed(true)
      }
    }

    loadAudio()
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [mediaUrl])

  if (failed) return <span role='status'>Voice message unavailable</span>
  if (!audioUrl) return <span role='status'>Loading voice message...</span>

  return (
    <span className='chat-audio-attachment'>
      <audio src={audioUrl} controls preload='metadata' />
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
  )
}

export default function ChatBox () {
  const { id: friendId } = useParams()
  const { user } = useAuth()
  const { socket } = useRealtime()
  const { startCall, call: activeCall } = useCalls()
  const [friend, setFriend] = useState(null)
  const [canCall, setCanCall] = useState(false)
  const [messages, setMessages] = useState([])
  const [callHistory, setCallHistory] = useState([])
  const [text, setText] = useState('')
  const [openPicker, setOpenPicker] = useState(null)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [friendTyping, setFriendTyping] = useState(false)
  const [media, setMedia] = useState(null)
  const [recording, setRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const messagesEndRef = useRef(null)
  const messageInputRef = useRef(null)
  const typingTimerRef = useRef(null)
  const recorderRef = useRef(null)
  const recordingStreamRef = useRef(null)
  const recordingChunksRef = useRef([])
  const recordingIntervalRef = useRef(null)

  useEffect(() => () => {
    if (media) URL.revokeObjectURL(media.previewUrl)
  }, [media])

  const mergeMessages = useCallback((current, incoming) => {
    const messagesById = new Map(current.map((message) => [message.id, message]))
    incoming.forEach((message) => messagesById.set(message.id, {
      ...messagesById.get(message.id),
      ...message,
    }))
    return [...messagesById.values()].sort(
      (first, second) => new Date(first.createdAt) - new Date(second.createdAt),
    )
  }, [])

  const loadMessages = useCallback(async () => {
    if (!friendId || !/^[a-f\d]{24}$/i.test(friendId)) {
      setFriend(null)
      setMessages([])
      setCallHistory([])
      setError('Invalid user id')
      return
    }

    try {
      const [{ messages: conversation }, { friends }, { calls }, { user: chatUser, friendStatus }] = await Promise.all([
        apiRequest(`/messages/${friendId}`),
        apiRequest('/friends'),
        apiRequest('/calls'),
        apiRequest(`/users/${friendId}`),
      ])
      setMessages((current) => mergeMessages(current, conversation))
      setFriend(friends.find((person) => person.id === friendId) ?? chatUser)
      setCanCall(friendStatus === 'friends')
      setCallHistory(calls.filter((call) => (
        call.caller?.id === friendId || call.recipient?.id === friendId
      )))
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    }
  }, [friendId, mergeMessages])

  useEffect(() => {
    setFriend(null)
    setCanCall(false)
    setMessages([])
    loadMessages()
  }, [loadMessages])

  useEffect(() => {
    if (!socket) return undefined

    function handleCallFinished() {
      loadMessages()
    }

    function handleNewMessage(message) {
      const senderId = message.sender?.id ?? message.sender
      const recipientId = message.recipient?.id ?? message.recipient
      if (
        (senderId === friendId && recipientId === user.id) ||
        (senderId === user.id && recipientId === friendId)
      ) {
        setMessages((current) => mergeMessages(current, [message]))
        setFriendTyping(false)
        if (senderId === friendId) loadMessages()
      }
    }

    function handleMessageStatus({ messageId, deliveredAt, readAt }) {
      setMessages((current) => current.map((message) => (
        message.id === messageId
          ? {
              ...message,
              deliveredAt: deliveredAt ?? message.deliveredAt,
              readAt: readAt ?? message.readAt,
            }
          : message
      )))
    }

    function handleTyping({ userId, active }) {
      if (userId === friendId) setFriendTyping(active)
    }

    socket.on('message:new', handleNewMessage)
    socket.on('message:status', handleMessageStatus)
    socket.on('typing', handleTyping)
    socket.on('call:finished', handleCallFinished)
    return () => {
      socket.off('message:new', handleNewMessage)
      socket.off('message:status', handleMessageStatus)
      socket.off('typing', handleTyping)
      socket.off('call:finished', handleCallFinished)
    }
  }, [friendId, loadMessages, mergeMessages, socket, user.id])

  useEffect(() => () => {
    window.clearTimeout(typingTimerRef.current)
    window.clearInterval(recordingIntervalRef.current)
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.onstop = null
      recorderRef.current.stop()
    }
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop())
    socket?.emit('typing', { recipientId: friendId, active: false })
  }, [friendId, socket])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, callHistory])

  const hasValidChatTarget = Boolean(friendId && friendId !== 'undefined' && friendId !== 'null')

  const timeline = useMemo(() => [
    ...messages,
    ...callHistory.map((call) => ({
      id: `call-${call.id}`,
      type: 'call-event',
      call,
      createdAt: call.createdAt,
    })),
  ].sort((first, second) => new Date(first.createdAt) - new Date(second.createdAt)), [
    callHistory,
    messages,
  ])

  async function sendMediaMessage(nextMedia, nextText = '') {
    if (!nextMedia?.file || !friendId || !/^[a-f\d]{24}$/i.test(friendId)) {
      setError('Select a valid friend before sending a message')
      return
    }
    setError('')
    setSending(true)
    try {
      const formData = new FormData()
      formData.append('text', nextText)
      formData.append('media', nextMedia.file)
      const { message } = await apiRequest(`/messages/${friendId}`, { method: 'POST', body: formData })
      setMessages((current) => mergeMessages(current, [message]))
      setText('')
      setMedia(null)
      socket?.emit('typing', { recipientId: friendId, active: false })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSending(false)
    }
  }

  async function sendMessage(event) {
    event.preventDefault()
    if (!friendId || !/^[a-f\d]{24}$/i.test(friendId)) {
      setError('Select a valid friend before sending a message')
      return
    }
    if (media) {
      await sendMediaMessage(media, text)
      return
    }
    setError('')
    setSending(true)
    try {
      const { message } = await apiRequest(`/messages/${friendId}`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      })
      setMessages((current) => mergeMessages(current, [message]))
      setText('')
      socket?.emit('typing', { recipientId: friendId, active: false })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSending(false)
    }
  }

  function chooseAttachment(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > 50 * 1024 * 1024) {
      setError('Attachments must be 50 MB or smaller')
      return
    }
    const supported = /^(image\/(jpeg|png|gif|webp|avif)|video\/(mp4|webm|quicktime)|audio\/(webm|ogg|mpeg|mp4|wav|x-wav|aac)|application\/pdf|text\/plain)(;|$)/i
    if (!supported.test(file.type)) {
      setError('Choose an image, video, audio, PDF, or text file')
      return
    }
    setError('')
    setMedia({ file, previewUrl: URL.createObjectURL(file) })
  }

  async function startRecording() {
    setError('')
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError('Voice recording is not supported by this browser')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      recordingStreamRef.current = stream
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
        .find((candidate) => MediaRecorder.isTypeSupported(candidate))
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      recorderRef.current = recorder
      recordingChunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size) recordingChunksRef.current.push(event.data)
      }
      recorder.onerror = () => setError('The voice recording could not be completed')
      recorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        })
        stream.getTracks().forEach((track) => track.stop())
        recordingStreamRef.current = null
        window.clearInterval(recordingIntervalRef.current)
        setRecording(false)
        setRecordingSeconds(0)
        if (!blob.size) {
          setError('The recording is empty. Please try again.')
          return
        }
        const extension = blob.type.includes('mp4') ? 'm4a' : 'webm'
        const file = new File([blob], `voice-message.${extension}`, { type: blob.type })
        if (file.size > 50 * 1024 * 1024) {
          setError('Voice messages must be 50 MB or smaller')
          return
        }
        const nextMedia = { file, previewUrl: URL.createObjectURL(file) }
        setMedia(nextMedia)
        void sendMediaMessage(nextMedia)
      }
      recorder.start()
      setRecording(true)
      setRecordingSeconds(0)
      window.clearInterval(recordingIntervalRef.current)
      recordingIntervalRef.current = window.setInterval(
        () => setRecordingSeconds((seconds) => seconds + 1),
        1000,
      )
    } catch (requestError) {
      setError(requestError.name === 'NotAllowedError'
        ? 'Allow microphone access to record a voice message'
        : 'The microphone could not be started')
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }

  async function beginCall(kind) {
    if (!friend || !friend.id || !canCall) {
      setError('Calls are available after the friend request is accepted')
      return
    }
    setError('')
    try {
      await startCall(friend, kind)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function sendSticker(sticker) {
    if (!friendId || !/^[a-f\d]{24}$/i.test(friendId)) {
      setError('Select a valid friend before sending a message')
      return
    }
    setOpenPicker(null)
    setError('')
    setSending(true)
    try {
      const { message } = await apiRequest(`/messages/${friendId}`, {
        method: 'POST',
        body: JSON.stringify({ text: sticker }),
      })
      setMessages((current) => mergeMessages(current, [message]))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSending(false)
    }
  }

  function insertEmoji(emoji) {
    setText((current) => `${current}${emoji}`)
    setOpenPicker(null)
    messageInputRef.current?.focus()
  }

  function handleTextChange(event) {
    const nextText = event.target.value
    setText(nextText)
    socket?.emit('typing', { recipientId: friendId, active: Boolean(nextText.trim()) })
    window.clearTimeout(typingTimerRef.current)
    if (nextText.trim()) {
      typingTimerRef.current = window.setTimeout(
        () => socket?.emit('typing', { recipientId: friendId, active: false }),
        1800,
      )
    }
  }

  return (
    <>
    <div className="chat-box">
    <div className="chat-box-top">
    {friend?.avatar
      ? <img src={getMediaUrl(friend.avatar)} alt="" />
      : <span className='chat-user-placeholder' aria-hidden='true'>{friend?.name?.[0] ?? '?'}</span>}
      <div className="user-name">
        <h3>{friend?.name ?? 'Conversation'}</h3>
        <small>{friendTyping ? 'Typing…' : 'Messages are delivered in real time'}</small>
      </div>
      {friend && (
        <div className='chat-header-actions'>
          {canCall && (
            <>
              <button
                type='button'
                aria-label='Start audio call'
                title='Audio call'
                disabled={Boolean(activeCall)}
                onClick={() => beginCall('audio')}
              >
                <FontAwesomeIcon icon={faPhone} />
              </button>
              <button
                type='button'
                aria-label='Start video call'
                title='Video call'
                disabled={Boolean(activeCall)}
                onClick={() => beginCall('video')}
              >
                <FontAwesomeIcon icon={faVideo} />
              </button>
            </>
          )}
          <Link to={`/profile/${friend.id}`} aria-label='View profile details' title='Profile details'>
            <span aria-hidden='true'>ⓘ</span>
          </Link>
        </div>
      )}
    </div>
    <div className="chat-messages" aria-live='polite'>
      {error && <p role='alert'>{error}</p>}
      {timeline.map((message) => message.type === 'call-event' ? (
        <article
          className={`chat-call-event${message.call.caller?.id === user.id ? ' chat-call-event--own' : ''}`}
          key={message.id}
        >
          <span className='chat-call-event-title'>
            <FontAwesomeIcon icon={message.call.kind === 'video' ? faVideo : faPhone} />
            {message.call.status === 'missed'
              ? message.call.recipient?.id === user.id ? `Missed ${message.call.kind} call` : `No answer · ${message.call.kind} call`
              : message.call.status === 'rejected'
                ? `Declined ${message.call.kind} call`
                : message.call.status === 'ringing'
                  ? `No answer · ${message.call.kind} call`
                  : `${message.call.kind === 'video' ? 'Video' : 'Audio'} call`}
          </span>
          {message.call.durationSeconds > 0 && (
            <small>{Math.floor(message.call.durationSeconds / 60)}:{String(message.call.durationSeconds % 60).padStart(2, '0')}</small>
          )}
          <time>{new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time>
        </article>
      ) : (
        <article className={`chat-message${message.sender.id === user.id ? ' chat-message--own' : ''}`} key={message.id}>
          <p>
            <strong>{message.sender.id === user.id ? 'You' : message.sender.name}:</strong>
            {message.text && <> {message.text}</>}
            {message.mediaUrl && message.type === 'image' && (
              <img className='chat-attachment-image' src={getMediaUrl(message.mediaUrl)} alt={message.fileName || 'Image attachment'} />
            )}
            {message.mediaUrl && message.type === 'video' && (
              <video className='chat-attachment-video' src={getMediaUrl(message.mediaUrl)} controls preload='metadata' />
            )}
            {message.mediaUrl && message.type === 'audio' && (
              <VoiceAttachment mediaUrl={getMediaUrl(message.mediaUrl)} />
            )}
            {message.mediaUrl && message.type === 'file' && (
              <a className='chat-file-attachment' href={getMediaUrl(message.mediaUrl)} download={message.fileName}>
                {message.fileName || 'Download attachment'}
              </a>
            )}
          </p>
          <small className='chat-message-meta'>
            {new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            {message.sender.id === user.id && (
              <span>{message.readAt ? ' · Read' : message.deliveredAt ? ' · Delivered' : ' · Sent'}</span>
            )}
          </small>
        </article>
      ))}
      <div ref={messagesEndRef} />
    </div>
    <div className="chat-box-bottom">
      {media && (
        <div className='chat-attachment-preview'>
          {media.file.type.startsWith('audio/')
            ? <audio src={media.previewUrl} controls />
            : media.file.type.startsWith('image/')
              ? <img src={media.previewUrl} alt='Attachment preview' />
              : <span>{media.file.name}</span>}
          <button type='button' className='btn btn-red' onClick={() => setMedia(null)}>Remove</button>
        </div>
      )}
      <label className='chat-attach-button chat-camera-button' title='Take or upload a photo'>
          <FontAwesomeIcon icon={faCamera} aria-hidden='true' />
          <input
            type='file'
            accept='image/*'
            capture='environment'
            onChange={chooseAttachment}
            aria-label='Take or upload a photo'
          />
      </label>
      {recording ? (
        <button
          type='button'
          className='chat-attach-button chat-recording-button'
          onClick={stopRecording}
          aria-label={`Stop recording voice message, ${recordingSeconds} seconds`}
          title={`Stop recording · ${recordingSeconds}s`}
        >
          <FontAwesomeIcon icon={faStop} />
          <span className='chat-recording-timer'>{recordingSeconds}s</span>
        </button>
      ) : (
        <button
          type='button'
          className='chat-attach-button chat-microphone-button'
          onClick={startRecording}
          aria-label='Record a voice message'
          title='Record a voice message'
        >
          <FontAwesomeIcon icon={faMicrophone} />
        </button>
      )}
      {hasValidChatTarget && canCall && (
        <div className='chat-call-buttons'>
          <button
            type='button'
            className='chat-call-button chat-call-button--audio'
            aria-label='Start audio call'
            title='Audio call'
            disabled={Boolean(activeCall) || !friend}
            onClick={() => beginCall('audio')}
          >
            <FontAwesomeIcon icon={faPhone} />
          </button>
          <button
            type='button'
            className='chat-call-button chat-call-button--video'
            aria-label='Start video call'
            title='Video call'
            disabled={Boolean(activeCall) || !friend}
            onClick={() => beginCall('video')}
          >
            <FontAwesomeIcon icon={faVideo} />
          </button>
        </div>
      )}
      <form onSubmit={sendMessage}>
        <input
          ref={messageInputRef}
          type="text"
          value={text}
          onChange={handleTextChange}
          placeholder='Message'
          maxLength={5000}
          aria-label='Message'
        />
        {Boolean(text.trim() || media) && (
          <button type='submit' className='chat-send-button' aria-label='Send message' disabled={sending}>
            <FontAwesomeIcon icon={faArrowAltCircleRight} />
          </button>
        )}
      </form>
      <div className='chat-composer-actions' aria-label='Stickers and emoji'>
        <button
          type='button'
          className='chat-attach-button chat-sticker-button'
          aria-label='Choose a sticker'
          aria-expanded={openPicker === 'stickers'}
          title='Stickers'
          onClick={() => setOpenPicker((current) => current === 'stickers' ? null : 'stickers')}
        >
          GIF
        </button>
        <button
          type='button'
          className='chat-attach-button chat-emoji-button'
          aria-label='Choose an emoji'
          aria-expanded={openPicker === 'emoji'}
          title='Emoji'
          onClick={() => setOpenPicker((current) => current === 'emoji' ? null : 'emoji')}
        >
          ☺
        </button>
        {openPicker && (
          <div className='chat-emoji-picker' role='group' aria-label={openPicker === 'stickers' ? 'Stickers' : 'Emoji'}>
            {(openPicker === 'stickers' ? stickerOptions : emojiOptions).map((emoji) => (
              <button
                type='button'
                key={emoji}
                aria-label={openPicker === 'stickers' ? `Send ${emoji} sticker` : `Insert ${emoji} emoji`}
                onClick={() => openPicker === 'stickers' ? sendSticker(emoji) : insertEmoji(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
    </div>
    </>
  )
}
