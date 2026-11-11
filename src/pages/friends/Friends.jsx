import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { apiRequest, getMediaUrl } from '../../api'
import { useRealtime } from '../../realtime/useRealtime'
import './friends.css'

const tabs = ['friends', 'requests', 'discover']

export default function Friends() {
  const { onlineUserIds } = useRealtime()
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

  const validFriends = (Array.isArray(data.friends) ? data.friends : []).filter((friend) => friend && friend.id)
  const validIncoming = (Array.isArray(data.incoming) ? data.incoming : []).filter((request) => request && request.id && request.user && request.user.id)
  const validOutgoing = (Array.isArray(data.outgoing) ? data.outgoing : []).filter((request) => request && request.id && request.user && request.user.id)

  const connectedIds = new Set([
    ...validFriends.map((friend) => friend.id),
    ...validIncoming.map((request) => request.user.id),
    ...validOutgoing.map((request) => request.user.id),
  ])
  const filteredFriends = validFriends.filter((friend) => (
    friend.name?.toLowerCase().includes(search.trim().toLowerCase())
  ))
  const filteredSuggestions = suggestions.filter((person) => (
    person && person.id && !connectedIds.has(person.id)
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
            {tab === 'requests' ? `Requests (${validIncoming.length + validOutgoing.length})` : (
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
                <span className='friend-avatar-wrap'>
                  {friend.avatar
                    ? <img src={getMediaUrl(friend.avatar)} alt='' />
                    : <span className='friend-avatar-fallback' aria-hidden='true'>{friend.name?.[0] ?? '?'}</span>}
                  {onlineUserIds.has(friend.id) && <span className='friend-online-indicator' aria-label='Online' title='Online' />}
                </span>
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
          {validIncoming.length > 0 && (
            <section className='friend-request-section' aria-labelledby='received-requests-heading'>
              <h2 id='received-requests-heading'>Received <span>{validIncoming.length}</span></h2>
              {validIncoming.map((request) => (
                <article className='friend-card' key={request.id}>
                  <Link to={`/profile/${request.user.id}`} className='user'>
                    {request.user.avatar
                      ? <img src={getMediaUrl(request.user.avatar)} alt='' />
                      : <span className='friend-avatar-fallback' aria-hidden='true'>{request.user.name?.[0] ?? '?'}</span>}
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
            </section>
          )}
          {validOutgoing.length > 0 && (
            <section className='friend-request-section' aria-labelledby='sent-requests-heading'>
              <h2 id='sent-requests-heading'>Sent <span>{validOutgoing.length}</span></h2>
              {validOutgoing.map((request) => (
                <article className='friend-card' key={request.id}>
                  <Link to={`/profile/${request.user.id}`} className='user'>
                    {request.user.avatar
                      ? <img src={getMediaUrl(request.user.avatar)} alt='' />
                      : <span className='friend-avatar-fallback' aria-hidden='true'>{request.user.name?.[0] ?? '?'}</span>}
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
            </section>
          )}
          {!validIncoming.length && !validOutgoing.length && (
            <p>You have no pending friend requests.</p>
          )}
        </div>
      )}

      {activeTab === 'discover' && (
        <div className='friends-list'>
          {filteredSuggestions.map((person) => (
            <article className='friend-card' key={person.id}>
              <Link to={`/profile/${person.id}`} className='user'>
                {person.avatar
                  ? <img src={getMediaUrl(person.avatar)} alt='' />
                  : <span className='friend-avatar-fallback' aria-hidden='true'>{person.name?.[0] ?? '?'}</span>}
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
          {!filteredSuggestions.length && (
            <p>No people found. Try a different name.</p>
          )}
        </div>
      )}
    </section>
  )
}
