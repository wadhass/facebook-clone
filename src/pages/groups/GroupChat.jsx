import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiRequest, getMediaUrl } from '../../api'
import { useAuth } from '../../auth/useAuth'
import { useRealtime } from '../../realtime/useRealtime'
import './groups.css'

function mergeMessages(current, incoming) {
  const byId = new Map(current.map((message) => [message.id, message]))
  incoming.forEach((message) => byId.set(message.id, { ...byId.get(message.id), ...message }))
  return [...byId.values()].sort(
    (first, second) => new Date(first.createdAt) - new Date(second.createdAt),
  )
}

export default function GroupChat() {
  const { id } = useParams()
  const { user } = useAuth()
  const { socket } = useRealtime()
  const [conversation, setConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [typingNames, setTypingNames] = useState([])
  const [attachment, setAttachment] = useState(null)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const conversationRef = useRef(null)

  const loadMessages = useCallback(async () => {
    try {
      const result = await apiRequest(`/conversations/${id}/messages`)
      conversationRef.current = result.conversation
      setConversation(result.conversation)
      setMessages((current) => mergeMessages(current, result.messages))
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    }
  }, [id])

  useEffect(() => {
    setConversation(null)
    setMessages([])
    setError('')
    loadMessages()
  }, [loadMessages])

  useEffect(() => {
    if (!socket) return undefined

    const joinConversation = () => {
      socket.emit('conversation:join', { conversationId: id }, (result) => {
        if (result?.error) setError(result.error)
        else loadMessages()
      })
    }
    const handleNewMessage = (message) => {
      if (message.conversation === id || message.conversation?.id === id) {
        setMessages((current) => mergeMessages(current, [message]))
      }
    }
    const handleRead = ({ conversationId, userId: readerId, messageIds }) => {
      if (conversationId !== id) return
      setMessages((current) => current.map((message) => (
        messageIds.includes(message.id) && !message.readBy?.includes(readerId)
          ? { ...message, readBy: [...(message.readBy ?? []), readerId] }
          : message
      )))
    }
    const handleTyping = ({ conversationId, userId: typingUserId, active }) => {
      if (conversationId !== id) return
      setTypingNames((current) => {
        const name = conversationRef.current?.members.find((member) => (
          (member.user.id ?? member.user) === typingUserId
        ))?.user.name ?? 'A member'
        return active
          ? [...new Set([...current, name])]
          : current.filter((currentName) => currentName !== name)
      })
    }

    if (socket.connected) joinConversation()
    socket.on('connect', joinConversation)
    socket.on('message:new', handleNewMessage)
    socket.on('conversation:read', handleRead)
    socket.on('typing', handleTyping)
    return () => {
      socket.emit('conversation:leave', { conversationId: id })
      socket.off('connect', joinConversation)
      socket.off('message:new', handleNewMessage)
      socket.off('conversation:read', handleRead)
      socket.off('typing', handleTyping)
    }
  }, [id, loadMessages, socket])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => () => {
    if (attachment) URL.revokeObjectURL(attachment.previewUrl)
  }, [attachment])

  function chooseAttachment(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > 50 * 1024 * 1024) {
      setError('Attachments must be 50 MB or smaller')
      return
    }
    setError('')
    setAttachment({ file, previewUrl: URL.createObjectURL(file) })
  }

  function updateText(event) {
    const nextText = event.target.value
    setText(nextText)
    socket?.emit('typing', { conversationId: id, active: Boolean(nextText.trim()) })
  }

  async function sendMessage(event) {
    event.preventDefault()
    if (!text.trim() && !attachment) return
    setSending(true)
    setError('')
    try {
      const body = attachment
        ? (() => {
            const formData = new FormData()
            formData.append('text', text)
            formData.append('media', attachment.file)
            return formData
          })()
        : JSON.stringify({ text })
      const result = await apiRequest(`/conversations/${id}/messages`, { method: 'POST', body })
      setMessages((current) => mergeMessages(current, [result.message]))
      setText('')
      setAttachment(null)
      socket?.emit('typing', { conversationId: id, active: false })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <section className='group-chat-page'>
      <header className='group-chat-header'>
        <Link to='/groups' aria-label='Back to group chats'>←</Link>
        <div className='group-icon' aria-hidden='true'>Q</div>
        <div>
          <h1>{conversation?.title ?? 'Group conversation'}</h1>
          <small>{conversation?.members.length ?? 0} members</small>
        </div>
      </header>
      <div className='group-chat-members'>
        {conversation?.members.map((member) => (
          <span key={member.user.id}>
            {member.user.avatar && <img src={getMediaUrl(member.user.avatar)} alt='' />}
            {member.user.name}
          </span>
        ))}
      </div>
      <div className='group-chat-messages' aria-live='polite'>
        {error && <p role='alert'>{error}</p>}
        {messages.map((message) => (
          <article
            className={`group-chat-message${message.sender.id === user.id ? ' is-own' : ''}`}
            key={message.id}
          >
            <small>{message.sender.name}</small>
            {message.text && <p>{message.text}</p>}
            {message.mediaUrl && message.type === 'image' && (
              <img src={getMediaUrl(message.mediaUrl)} alt={message.fileName || 'Group image'} />
            )}
            {message.mediaUrl && message.type === 'video' && (
              <video src={getMediaUrl(message.mediaUrl)} controls preload='metadata' />
            )}
            {message.mediaUrl && message.type === 'audio' && (
              <audio src={getMediaUrl(message.mediaUrl)} controls preload='metadata' />
            )}
            {message.mediaUrl && message.type === 'file' && (
              <a href={getMediaUrl(message.mediaUrl)} download={message.fileName}>
                {message.fileName || 'Download attachment'}
              </a>
            )}
            <time>{new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time>
          </article>
        ))}
        <div ref={bottomRef} />
      </div>
      {typingNames.length > 0 && <p className='group-typing'>{typingNames.join(', ')} typing…</p>}
      <form className='group-chat-composer' onSubmit={sendMessage}>
        {attachment && (
          <div className='group-attachment-preview'>
            {attachment.file.type.startsWith('image/')
              ? <img src={attachment.previewUrl} alt='Attachment preview' />
              : <span>{attachment.file.name}</span>}
            <button type='button' onClick={() => setAttachment(null)}>Remove</button>
          </div>
        )}
        <label className='group-attach-button'>
          +
          <input
            type='file'
            accept='image/jpeg,image/png,image/gif,image/webp,image/avif,video/mp4,video/webm,video/quicktime,audio/webm,audio/ogg,audio/mpeg,audio/mp4,audio/wav,audio/aac,application/pdf,text/plain'
            onChange={chooseAttachment}
            aria-label='Attach a group message file'
          />
        </label>
        <input
          value={text}
          onChange={updateText}
          placeholder='Write a message'
          maxLength={5000}
          aria-label='Group message'
        />
        <button className='btn btn-primary' type='submit' disabled={sending || (!text.trim() && !attachment)}>
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </section>
  )
}
