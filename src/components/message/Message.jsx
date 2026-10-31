import './message.css'
import { Link } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import { apiRequest, getMediaUrl } from '../../api'

// FontAwesome Icon.........
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEdit, faSearch } from '@fortawesome/free-solid-svg-icons'

export default function Message () {
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
      {friends.filter((friend) => friend.name.toLowerCase().includes(search.trim().toLowerCase())).map((friend) => (
          <Link to={`/chatbox/${friend.id}`} key={friend.id}>
            <div className='message'>
              <div className="user">
                {friend.avatar && <img src={getMediaUrl(friend.avatar)} alt="" />}
              </div>
              <div className="message-body">
                <h5>{friend.name}</h5>
                <p>Open conversation</p>
              </div>
            </div>
          </Link>
      ))}
      {!error && friends.length > 0 && !friends.some((friend) => (
        friend.name.toLowerCase().includes(search.trim().toLowerCase())
      )) && <p>No friends match your search.</p>}
    </div>
  )
}
