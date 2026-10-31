import './chatbox.css'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { apiRequest, getMediaUrl } from '../../api'
import { useAuth } from '../../auth/useAuth'

// Font Awesome icon.........
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowAltCircleRight } from '@fortawesome/free-solid-svg-icons'


export default function ChatBox () {
  const { id: friendId } = useParams()
  const { user } = useAuth()
  const [friend, setFriend] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)

  const loadMessages = useCallback(async () => {
    try {
      const [{ messages: conversation }, { friends }] = await Promise.all([
        apiRequest(`/messages/${friendId}`),
        apiRequest('/friends'),
      ])
      setMessages(conversation)
      setFriend(friends.find((person) => person.id === friendId) ?? null)
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    }
  }, [friendId])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  useEffect(() => {
    const intervalId = window.setInterval(async () => {
      try {
        const { messages: latestMessages } = await apiRequest(`/messages/${friendId}`)
        setMessages(latestMessages)
      } catch (requestError) {
        setError(requestError.message)
      }
    }, 5000)
    return () => window.clearInterval(intervalId)
  }, [friendId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(event) {
    event.preventDefault()
    setError('')
    setSending(true)
    try {
      const { message } = await apiRequest(`/messages/${friendId}`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      })
      setMessages((current) => [...current, message])
      setText('')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <>
    <div className="chat-box">
    <div className="chat-box-top">
    {friend?.avatar && <img src={getMediaUrl(friend.avatar)} alt="" />}
      <div className="user-name">
        <h3>{friend?.name ?? 'Conversation'}</h3>
      </div>
    </div>
    <div className="chat-messages" aria-live='polite'>
      {error && <p role='alert'>{error}</p>}
      {messages.map((message) => (
        <p key={message.id}>
          <strong>{message.sender.id === user.id ? 'You' : message.sender.name}:</strong> {message.text}
        </p>
      ))}
      <div ref={messagesEndRef} />
    </div>
    <div className="chat-box-bottom">
      <form onSubmit={sendMessage}>
        <input
          type="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder='Write a message'
          maxLength={5000}
          required
        />
        <button type='submit' className='btn btn-primary' disabled={sending}>
          <FontAwesomeIcon icon={faArrowAltCircleRight} />
        </button>
      </form>
    </div>
    </div>
    </>
  )
}
