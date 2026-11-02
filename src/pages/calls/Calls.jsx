import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPhone, faVideo } from '@fortawesome/free-solid-svg-icons'
import { apiRequest, getMediaUrl } from '../../api'
import { useCalls } from '../../calls/useCalls'
import { useAuth } from '../../auth/useAuth'
import './calls.css'

function callStatus(call, currentUserId) {
  if (call.status === 'missed') return 'Missed call'
  if (call.status === 'rejected') return 'Declined'
  if (call.status === 'ringing') return 'No answer'
  const isOutgoing = call.caller?.id === currentUserId
  return call.status === 'active' ? 'In progress' : isOutgoing ? 'Outgoing call' : 'Incoming call'
}

export default function Calls() {
  const { startCall, call: activeCall } = useCalls()
  const { user } = useAuth()
  const [calls, setCalls] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const loadCalls = useCallback(async () => {
    try {
      const callData = await apiRequest('/calls')
      setCalls(callData.calls)
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCalls()
  }, [loadCalls])

  async function callBack(person, kind) {
    setError('')
    try {
      await startCall(person, kind)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <section className='call-history-page'>
      <header>
        <span className='call-history-eyebrow'>STAY IN TOUCH</span>
        <h1>Calls</h1>
        <p>Your recent audio and video calls.</p>
      </header>
      {error && <p role='alert'>{error}</p>}
      {loading && <p role='status'>Loading call history...</p>}
      {!loading && !calls.length && <p>No calls yet. Start one from a friend’s conversation.</p>}
      <div className='call-history-list'>
        {calls.map((call) => {
          const currentUserIsCaller = call.caller?.id === user.id
          const peer = currentUserIsCaller ? call.recipient : call.caller
          if (!peer) return null
          return (
            <article className='call-history-item' key={call.id}>
              <Link to={`/profile/${peer.id}`} className='call-history-person'>
                {peer.avatar
                  ? <img src={getMediaUrl(peer.avatar)} alt='' />
                  : <span className='call-history-avatar'>{peer.name?.[0] ?? '?'}</span>}
                <span>
                  <strong>{peer.name}</strong>
                  <small>
                    {callStatus(call, user.id)} · {call.kind} · {new Date(call.createdAt).toLocaleString()}
                    {call.durationSeconds > 0 ? ` · ${Math.floor(call.durationSeconds / 60)}:${String(call.durationSeconds % 60).padStart(2, '0')}` : ''}
                  </small>
                </span>
              </Link>
              <div className='call-history-actions'>
                <button
                  type='button'
                  aria-label={`Audio call ${peer.name}`}
                  title='Audio call'
                  disabled={Boolean(activeCall)}
                  onClick={() => callBack(peer, 'audio')}
                >
                  <FontAwesomeIcon icon={faPhone} />
                </button>
                <button
                  type='button'
                  aria-label={`Video call ${peer.name}`}
                  title='Video call'
                  disabled={Boolean(activeCall)}
                  onClick={() => callBack(peer, 'video')}
                >
                  <FontAwesomeIcon icon={faVideo} />
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
