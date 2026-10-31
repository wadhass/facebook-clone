import './firendReqe.css'
import { Link } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import { apiRequest, getMediaUrl } from '../../api'

export default function FirendReqe  () {
  const [requests, setRequests] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [error, setError] = useState('')

  const loadFriends = useCallback(async () => {
    try {
      const [friendData, discoverData] = await Promise.all([
        apiRequest('/friends'),
        apiRequest('/friends/discover'),
      ])
      setRequests(friendData.incoming)
      const connectedIds = new Set([
        ...friendData.friends.map((friend) => friend.id),
        ...friendData.incoming.map((request) => request.user.id),
        ...friendData.outgoing.map((request) => request.user.id),
      ])
      setSuggestions(discoverData.users.filter((person) => !connectedIds.has(person.id)))
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    }
  }, [])

  useEffect(() => {
    loadFriends()
  }, [loadFriends])

  async function acceptRequest(requestId) {
    try {
      await apiRequest(`/friends/${requestId}/accept`, { method: 'PATCH' })
      await loadFriends()
      window.dispatchEvent(new Event('friends:updated'))
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function dismissRequest(requestId) {
    try {
      await apiRequest(`/friends/${requestId}`, { method: 'DELETE' })
      await loadFriends()
      window.dispatchEvent(new Event('friends:updated'))
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function sendRequest(userId) {
    try {
      await apiRequest(`/friends/${userId}`, { method: 'POST' })
      await loadFriends()
      window.dispatchEvent(new Event('friends:updated'))
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <div className='Firend-Requests'>
      <h4>Friend Requests</h4>
      {error && <p role='alert'>{error}</p>}
      {requests.map((request) => (
          <div className='request' key={request.id}>
            <Link to={`/profile/${request.user.id}`}>
            <div className='info'>
              <div className="user">
                {request.user.avatar && <img src={getMediaUrl(request.user.avatar)} alt="" />}
                <h5>{request.user.name}</h5>
              </div>
            </div>
            </Link>

            <div className="action">
              <button className='btn btn-primary' onClick={() => acceptRequest(request.id)}>Accept</button>
              <button className='btn btn-red' onClick={() => dismissRequest(request.id)}>Delete</button>
            </div>
          </div>
      ))}
      <h4>People you may know</h4>
      {suggestions.slice(0, 5).map((person) => (
        <div className='request' key={person.id}>
          <Link to={`/profile/${person.id}`}>
            <div className='user'>
              {person.avatar && <img src={getMediaUrl(person.avatar)} alt="" />}
              <h5>{person.name}</h5>
            </div>
          </Link>
          <button className='btn btn-primary' onClick={() => sendRequest(person.id)}>
            Add friend
          </button>
        </div>
      ))}
    </div>
  )
}
