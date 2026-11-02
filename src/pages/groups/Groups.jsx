import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiRequest, getMediaUrl } from '../../api'
import './groups.css'

export default function Groups() {
  const navigate = useNavigate()
  const [friends, setFriends] = useState([])
  const [conversations, setConversations] = useState([])
  const [title, setTitle] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const loadGroups = useCallback(async () => {
    try {
      const [friendData, groupData] = await Promise.all([
        apiRequest('/friends'),
        apiRequest('/conversations'),
      ])
      setFriends(friendData.friends)
      setConversations(groupData.conversations)
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadGroups()
  }, [loadGroups])

  function toggleMember(friendId) {
    setSelectedIds((currentIds) => (
      currentIds.includes(friendId)
        ? currentIds.filter((id) => id !== friendId)
        : [...currentIds, friendId]
    ))
  }

  async function createGroup(event) {
    event.preventDefault()
    setError('')
    setCreating(true)
    try {
      const { conversation } = await apiRequest('/conversations', {
        method: 'POST',
        body: JSON.stringify({ title, memberIds: selectedIds }),
      })
      navigate(`/groups/${conversation.id}`)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <section className='groups-page'>
      <header>
        <span className='groups-eyebrow'>YOUR COMMUNITY</span>
        <h1>Group chats</h1>
        <p>Bring your friends together in one conversation.</p>
      </header>

      {error && <p role='alert'>{error}</p>}

      <section className='groups-section' aria-labelledby='your-groups-title'>
        <h2 id='your-groups-title'>Your groups</h2>
        {loading && <p role='status'>Loading groups...</p>}
        {!loading && !conversations.length && <p>You haven’t joined a group conversation yet.</p>}
        <div className='groups-list'>
          {conversations.map((conversation) => (
            <Link to={`/groups/${conversation.id}`} className='group-card' key={conversation.id}>
              <span className='group-icon' aria-hidden='true'>Q</span>
              <span className='group-card-copy'>
                <strong>{conversation.title}</strong>
                <small>
                  {conversation.members.length} members
                  {conversation.lastMessage?.text
                    ? ` · ${conversation.lastMessage.sender?.name ?? 'Member'}: ${conversation.lastMessage.text}`
                    : ''}
                </small>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <form className='groups-create' onSubmit={createGroup}>
        <h2>Create a group</h2>
        <label htmlFor='group-name'>Group name</label>
        <input
          id='group-name'
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          minLength={2}
          maxLength={80}
          required
        />
        <fieldset>
          <legend>Select at least two friends</legend>
          <div className='group-friend-list'>
            {friends.map((friend) => (
              <label className='group-friend-option' key={friend.id}>
                <input
                  type='checkbox'
                  checked={selectedIds.includes(friend.id)}
                  onChange={() => toggleMember(friend.id)}
                />
                {friend.avatar
                  ? <img src={getMediaUrl(friend.avatar)} alt='' />
                  : <span className='group-friend-placeholder'>{friend.name?.[0] ?? '?'}</span>}
                <span>{friend.name}</span>
              </label>
            ))}
            {!friends.length && <p>Add friends before creating a group.</p>}
          </div>
        </fieldset>
        <button
          type='submit'
          className='btn btn-primary'
          disabled={creating || title.trim().length < 2 || selectedIds.length < 2}
        >
          {creating ? 'Creating group...' : 'Create group'}
        </button>
      </form>
    </section>
  )
}
