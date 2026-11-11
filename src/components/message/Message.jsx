import './message.css'
import { Link } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import { apiRequest, getMediaUrl } from '../../api'
import { useRealtime } from '../../realtime/useRealtime'

// FontAwesome Icon.........
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEdit, faSearch } from '@fortawesome/free-solid-svg-icons'

export default function Message () {
  const { onlineUserIds } = useRealtime()
  const [friends, setFriends] = useState([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  const loadFriends = useCallback(() => {
    apiRequest('/friends')
      .then(({ friends: friendList }) => {
        setFriends(friendList)
        setError('')
      })
      .catch((requestError) => setError(requestError.message))
  }, [])

  useEffect(() => {
    loadFriends()
    window.addEventListener('friends:updated', loadFriends)
    return () => window.removeEventListener('friends:updated', loadFriends)
  }, [loadFriends])

  const validFriends = (friends || []).filter((friend) => friend && friend.id && typeof friend.name === 'string')
  const filteredFriends = validFriends.filter((friend) =>
    friend.name.toLowerCase().includes(search.trim().toLowerCase()),
  )

  return (
    <div className='Message'>
      <div className='message-top'>
        <h4>Message</h4>
        <FontAwesomeIcon icon={faEdit} />
      </div>
      <div className="message-search">
        <FontAwesomeIcon icon={faSearch} />
        <input
          type="search"
          placeholder='Search Message'
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label='Search friends'
        />
      </div>
      <div className="border-div"></div>
      {error && <p role='alert'>{error}</p>}
      {filteredFriends.map((friend) => (
        <Link to={`/chatbox/${friend.id}`} key={friend.id}>
          <div className='message'>
            <div className="user">
              {friend.avatar && <img src={getMediaUrl(friend.avatar)} alt="" />}
              {onlineUserIds.has(friend.id) && <span className='green-active' aria-label='Online' title='Online' />}
            </div>
            <div className="message-body">
              <h5>{friend.name}</h5>
              <p>{onlineUserIds.has(friend.id) ? 'Online' : 'Open conversation'}</p>
            </div>
          </div>
        </Link>
      ))}
      {!error && validFriends.length > 0 && filteredFriends.length === 0 && <p>No friends match your search.</p>}
    </div>
  )
}
