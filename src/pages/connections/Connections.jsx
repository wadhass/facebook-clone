import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { apiRequest, getMediaUrl } from '../../api'
import './connections.css'

const connectionTabs = ['friends', 'followers', 'following']

export default function Connections() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [profile, setProfile] = useState(null)
  const [users, setUsers] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const activeTab = connectionTabs.includes(searchParams.get('tab'))
    ? searchParams.get('tab')
    : 'followers'

  const loadConnections = useCallback(async () => {
    setError('')
    try {
      const [profileData, connectionsData] = await Promise.all([
        apiRequest(`/users/${id}`),
        activeTab === 'friends'
          ? apiRequest(`/friends/${id}`)
          : apiRequest(`/follows/${id}/${activeTab}?page=1`),
      ])
      setProfile(profileData.user)
      setUsers(connectionsData.users ?? connectionsData.friends)
      setHasMore(connectionsData.hasMore ?? false)
      setPage(1)
    } catch (requestError) {
      setError(requestError.message)
    }
  }, [activeTab, id])

  useEffect(() => {
    loadConnections()
  }, [loadConnections])

  async function loadMore() {
    setLoadingMore(true)
    setError('')
    try {
      const nextPage = page + 1
      const result = await apiRequest(`/follows/${id}/${activeTab}?page=${nextPage}`)
      setUsers((currentUsers) => [...currentUsers, ...result.users])
      setPage(nextPage)
      setHasMore(result.hasMore)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoadingMore(false)
    }
  }

  function chooseTab(tab) {
    setSearchParams({ tab })
  }

  return (
    <section className='connections-page'>
      <header className='connections-header'>
        <div>
          <Link to={`/profile/${id}`} className='connections-back'>Back to profile</Link>
          <h1>{profile ? `${profile.name}'s connections` : 'Connections'}</h1>
        </div>
      </header>

      <div className='connections-tabs' role='tablist' aria-label='Friends, followers, and following'>
        {connectionTabs.map((tab) => (
          <button
            type='button'
            role='tab'
            aria-selected={activeTab === tab}
            className={activeTab === tab ? 'active' : ''}
            key={tab}
            onClick={() => chooseTab(tab)}
          >
            {tab[0].toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {error && <p role='alert'>{error}</p>}
      {!error && !profile && <p role='status'>Loading connections...</p>}
      {profile && (
        <div className='connections-list'>
          {users.map((person) => (
            <Link to={`/profile/${person.id}`} className='connection-card' key={person.id}>
              {person.avatar
                ? <img src={getMediaUrl(person.avatar)} alt='' />
                : <span className='connection-avatar-placeholder'>{person.name?.[0] ?? '?'}</span>}
              <span>{person.name}</span>
            </Link>
          ))}
          {!users.length && <p>No {activeTab} yet.</p>}
          {hasMore && (
            <button
              type='button'
              className='btn btn-primary'
              onClick={loadMore}
              disabled={loadingMore}
            >
              {loadingMore ? 'Loading...' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
