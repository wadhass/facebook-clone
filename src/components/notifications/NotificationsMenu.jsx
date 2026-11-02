import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBell, faEnvelope } from '@fortawesome/free-solid-svg-icons'
import { apiRequest, getMediaUrl } from '../../api'
import { useRealtime } from '../../realtime/useRealtime'
import './notifications.css'

function notificationUrl(notification) {
  if (notification.type === 'friend_request') return '/friends?tab=requests'
  if (notification.conversationId) return `/groups/${notification.conversationId}`
  if (notification.type === 'message' && notification.actor?.id) {
    return `/chatbox/${notification.actor.id}`
  }
  if (notification.actor?.id) return `/profile/${notification.actor.id}`
  return '/'
}

function insertNotification(current, notification) {
  if (current.some((item) => item.id === notification.id)) return current
  return [notification, ...current].slice(0, 20)
}

export default function NotificationsMenu() {
  const { socket, userId } = useRealtime()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const pageRef = useRef(1)
  const seenMessageIds = useRef(new Set())
  const unreadMessageRequestRef = useRef(0)

  const refreshUnreadMessages = useCallback(async () => {
    const requestId = ++unreadMessageRequestRef.current
    const result = await apiRequest('/messages/unread-count')
    if (requestId === unreadMessageRequestRef.current) {
      setUnreadMessages(result.unreadCount)
    }
  }, [])

  const loadNotifications = useCallback(async () => {
    try {
      const result = await apiRequest('/notifications?page=1')
      setNotifications(result.notifications)
      setUnreadCount(result.unreadCount)
      setHasMore(result.hasMore)
      pageRef.current = 1
      await refreshUnreadMessages()
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    }
  }, [refreshUnreadMessages])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  useEffect(() => {
    if (!socket) return undefined
    const handleNew = (notification) => {
      setNotifications((current) => insertNotification(current, notification))
      setUnreadCount((current) => current + 1)
    }
    const handleReadAll = () => {
      setNotifications((current) => current.map((item) => (
        item.readAt ? item : { ...item, readAt: new Date().toISOString() }
      )))
      setUnreadCount(0)
    }
    const handleMessagesRead = ({ actorId, count }) => {
      setNotifications((current) => current.map((item) => (
        item.type === 'message' && item.actor?.id === actorId && !item.readAt
          ? { ...item, readAt: new Date().toISOString() }
          : item
      )))
      setUnreadCount((current) => Math.max(0, current - count))
    }

    socket.on('notification:new', handleNew)
    socket.on('notification:read-all', handleReadAll)
    socket.on('notification:messages-read', handleMessagesRead)
    const handleNewMessage = (message) => {
      const recipientId = message.recipient?.id ?? message.recipient
      if (recipientId !== userId || seenMessageIds.current.has(message.id)) return
      seenMessageIds.current.add(message.id)
      refreshUnreadMessages().catch((requestError) => setError(requestError.message))
    }
    const handleMessagesReadCount = () => {
      refreshUnreadMessages().catch((requestError) => setError(requestError.message))
    }
    const handleNotificationReadCount = ({ conversationId, count }) => {
      setNotifications((current) => current.map((item) => (
        item.conversationId === conversationId && !item.readAt
          ? { ...item, readAt: new Date().toISOString() }
          : item
      )))
      setUnreadCount((current) => Math.max(0, current - count))
    }
    socket.on('message:new', handleNewMessage)
    socket.on('messages:read', handleMessagesReadCount)
    socket.on('notification:read-count', handleNotificationReadCount)
    return () => {
      socket.off('notification:new', handleNew)
      socket.off('notification:read-all', handleReadAll)
      socket.off('notification:messages-read', handleMessagesRead)
      socket.off('message:new', handleNewMessage)
      socket.off('messages:read', handleMessagesReadCount)
      socket.off('notification:read-count', handleNotificationReadCount)
    }
  }, [refreshUnreadMessages, socket, userId])

  async function loadMore() {
    setLoadingMore(true)
    setError('')
    try {
      const nextPage = pageRef.current + 1
      const result = await apiRequest(`/notifications?page=${nextPage}`)
      setNotifications((current) => [...current, ...result.notifications])
      setHasMore(result.hasMore)
      pageRef.current = nextPage
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoadingMore(false)
    }
  }

  async function markAsRead(notification) {
    if (notification.readAt) return
    setNotifications((current) => current.map((item) => (
      item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item
    )))
    setUnreadCount((current) => Math.max(0, current - 1))
    try {
      const result = await apiRequest(`/notifications/${notification.id}/read`, { method: 'PATCH' })
      setUnreadCount(result.unreadCount)
    } catch (requestError) {
      setError(requestError.message)
      await loadNotifications()
    }
  }

  async function markAllAsRead() {
    setError('')
    try {
      await apiRequest('/notifications/read-all', { method: 'PATCH' })
      setUnreadCount(0)
      setNotifications((current) => current.map((item) => (
        item.readAt ? item : { ...item, readAt: new Date().toISOString() }
      )))
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <div className='notifications-menu'>
      <button
        type='button'
        className='notifications-trigger'
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <FontAwesomeIcon icon={faBell} />
        {unreadCount > 0 && <span className='notification-badge'>{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>
      <Link
        to='/friends'
        className='notifications-trigger'
        aria-label={`Messages${unreadMessages ? `, ${unreadMessages} unread` : ''}`}
        title='Messages'
      >
        <FontAwesomeIcon icon={faEnvelope} />
        {unreadMessages > 0 && <span className='notification-badge'>{unreadMessages > 99 ? '99+' : unreadMessages}</span>}
      </Link>
      {open && (
        <section className='notifications-panel' aria-label='Notifications'>
          <header>
            <h2>Notifications</h2>
            {unreadCount > 0 && (
              <button type='button' onClick={markAllAsRead}>Mark all read</button>
            )}
          </header>
          {error && <p role='alert'>{error}</p>}
          <div className='notifications-list'>
            {notifications.map((notification) => (
              <Link
                to={notificationUrl(notification)}
                key={notification.id}
                className={`notification-item${notification.readAt ? '' : ' is-unread'}`}
                onClick={() => {
                  markAsRead(notification)
                  setOpen(false)
                }}
              >
                {notification.actor?.avatar
                  ? <img src={getMediaUrl(notification.actor.avatar)} alt='' />
                  : <span className='notification-avatar'>{notification.actor?.name?.[0] ?? 'Q'}</span>}
                <span className='notification-copy'>
                  <span><strong>{notification.actor?.name ?? 'Qavero'}</strong> {notification.message}</span>
                  <small>{new Date(notification.createdAt).toLocaleString()}</small>
                </span>
                {!notification.readAt && <span className='notification-unread-dot' aria-label='Unread' />}
              </Link>
            ))}
            {!notifications.length && !error && <p className='notifications-empty'>You’re all caught up.</p>}
            {hasMore && (
              <button
                type='button'
                className='notifications-load-more'
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading...' : 'Load older notifications'}
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
