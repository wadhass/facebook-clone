import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { apiRequest, getMediaUrl } from '../../api'
import './friends.css'

const tabs = ['friends', 'requests', 'discover']

export default function Friends() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [data, setData] = useState({ friends: [], incoming: [], outgoing: [] })
  const [suggestions, setSuggestions] = useState([])
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState(
    tabs.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'friends',
  )

  const loadFriends = useCallback(async () => {
    try {
      const [friendData, discoverData] = await Promise.all([
        apiRequest('/friends'),
        apiRequest(`/friends/discover?search=${encodeURIComponent(search.trim())}`),
      ])
      setData(friendData)
      setSuggestions(discoverData.users)
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    }
  }, [search])

  useEffect(() => {
    loadFriends()
  }, [loadFriends])

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tabs.includes(tab) && tab !== activeTab) setActiveTab(tab)
    const query = searchParams.get('search') ?? ''
    if (query !== search) setSearch(query)
  }, [searchParams, activeTab, search])

  useEffect(() => {
    window.addEventListener('friends:updated', loadFriends)
    return () => window.removeEventListener('friends:updated', loadFriends)
  }, [loadFriends])

  function chooseTab(tab) {
    setActiveTab(tab)
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('tab', tab)
    setSearchParams(nextParams)
  }

  async function performFriendAction(path, method = 'POST') {
    try {
      await apiRequest(path, { method })
      await loadFriends()
      window.dispatchEvent(new Event('friends:updated'))
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  const connectedIds = new Set([
    ...data.friends.map((friend) => friend.id),
    ...data.incoming.map((request) => request.user.id),
    ...data.outgoing.map((request) => request.user.id),
  ])
  const filteredFriends = data.friends.filter((friend) => (
    friend.name.toLowerCase().includes(search.trim().toLowerCase())
  ))

  return (
    <section className='friends-page'>
      <header className='friends-header'>
        <div>
          <h1>Friends</h1>
          <p>Find people, manage requests, and start conversations.</p>
        </div>
        <input
          type='search'
          value={search}
          onChange={(event) => {
            const value = event.target.value
            setSearch(value)
            const nextParams = new URLSearchParams(searchParams)
            if (value) nextParams.set('search', value)
            else nextParams.delete('search')
            setSearchParams(nextParams, { replace: true })
          }}
          placeholder='Search people'
          aria-label='Search friends and people'
        />
      </header>

      <div className='friends-tabs' role='tablist' aria-label='Friend lists'>
        {tabs.map((tab) => (
          <button
            type='button'
            role='tab'
            aria-selected={activeTab === tab}
            className={activeTab === tab ? 'active' : ''}
            key={tab}
            onClick={() => chooseTab(tab)}
          >
            {tab === 'requests' ? `Requests (${data.incoming.length})` : (
              tab[0].toUpperCase() + tab.slice(1)
            )}
          </button>
        ))}
      </div>

      {error && <p role='alert'>{error}</p>}

      {activeTab === 'friends' && (
        <div className='friends-list'>
          {filteredFriends.map((friend) => (
            <article className='friend-card' key={friend.id}>
              <Link to={`/profile/${friend.id}`} className='user'>
                {friend.avatar && <img src={getMediaUrl(friend.avatar)} alt='' />}
                <h3>{friend.name}</h3>
              </Link>
              <Link className='btn btn-primary' to={`/chatbox/${friend.id}`}>
                Message
              </Link>
            </article>
          ))}
          {!filteredFriends.length && <p>No friends found. Try Discover to meet people.</p>}
        </div>
      )}

      {activeTab === 'requests' && (
        <div className='friends-list'>
          {data.incoming.map((request) => (
            <article className='friend-card' key={request.id}>
              <Link to={`/profile/${request.user.id}`} className='user'>
                {request.user.avatar && <img src={getMediaUrl(request.user.avatar)} alt='' />}
                <h3>{request.user.name}</h3>
              </Link>
              <div className='friend-actions'>
                <button
                  type='button'
                  className='btn btn-primary'
                  onClick={() => performFriendAction(`/friends/${request.id}/accept`, 'PATCH')}
                >
                  Accept
                </button>
                <button
                  type='button'
                  className='btn btn-red'
                  onClick={() => performFriendAction(`/friends/${request.id}`, 'DELETE')}
                >
                  Decline
                </button>
              </div>
            </article>
          ))}
          {data.outgoing.map((request) => (
            <article className='friend-card' key={request.id}>
              <Link to={`/profile/${request.user.id}`} className='user'>
                {request.user.avatar && <img src={getMediaUrl(request.user.avatar)} alt='' />}
                <h3>{request.user.name}</h3>
              </Link>
              <button
                type='button'
                className='btn btn-red'
                onClick={() => performFriendAction(`/friends/${request.id}`, 'DELETE')}
              >
                Cancel request
              </button>
            </article>
          ))}
          {!data.incoming.length && !data.outgoing.length && (
            <p>You have no pending friend requests.</p>
          )}
        </div>
      )}

      {activeTab === 'discover' && (
        <div className='friends-list'>
          {suggestions.filter((person) => !connectedIds.has(person.id)).map((person) => (
            <article className='friend-card' key={person.id}>
              <Link to={`/profile/${person.id}`} className='user'>
                {person.avatar && <img src={getMediaUrl(person.avatar)} alt='' />}
                <h3>{person.name}</h3>
              </Link>
              <button
                type='button'
                className='btn btn-primary'
                onClick={() => performFriendAction(`/friends/${person.id}`)}
              >
                Add friend
              </button>
            </article>
          ))}
          {!suggestions.filter((person) => !connectedIds.has(person.id)).length && (
            <p>No people found. Try a different name.</p>
          )}
        </div>
      )}
    </section>
  )
}
