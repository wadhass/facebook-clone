import './userProfile.css'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { apiRequest, getMediaUrl } from '../../api'

// Font Awesome icon.........
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFeed, faMessage } from '@fortawesome/free-solid-svg-icons'

export default function UserProfile () {
  const { id } = useParams()
  const { user: currentUser, updateAvatar } = useAuth()
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [friendStatus, setFriendStatus] = useState('none')
  const [requestId, setRequestId] = useState(null)
  const isSelf = currentUser?.id === id
  const MAX_AVATAR_SIZE = 5 * 1024 * 1024

  useEffect(() => {
    setProfile(null)
    setError('')
    apiRequest(`/users/${id}`)
      .then((data) => {
        setProfile(data.user)
        setFriendStatus(data.friendStatus)
        setRequestId(data.requestId)
      })
      .catch((requestError) => setError(requestError.message))
  }, [id])

  async function addFriend() {
    try {
      const { status } = await apiRequest(`/friends/${id}`, { method: 'POST' })
      setFriendStatus(status === 'accepted' ? 'friends' : 'pending-sent')
      window.dispatchEvent(new Event('friends:updated'))
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function acceptRequest() {
    try {
      await apiRequest(`/friends/${requestId}/accept`, { method: 'PATCH' })
      setFriendStatus('friends')
      setRequestId(null)
      window.dispatchEvent(new Event('friends:updated'))
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function removeFriendship() {
    try {
      await apiRequest(`/friends/${requestId}`, { method: 'DELETE' })
      setFriendStatus('none')
      setRequestId(null)
      window.dispatchEvent(new Event('friends:updated'))
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function handleAvatarChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    setError('')
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file for your profile picture.')
      return
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setError('Profile pictures must be 5 MB or smaller.')
      return
    }

    setUploadingAvatar(true)
    try {
      const updatedUser = await updateAvatar(file)
      setProfile((currentProfile) => ({ ...currentProfile, avatar: updatedUser.avatar }))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setUploadingAvatar(false)
    }
  }

  if (!profile) {
    if (error) return <p role='alert'>{error}</p>
    return <p role='status'>Loading profile...</p>
  }

  return (
    <div className='userProfile'>
        <div className="cover-photos"></div>
        <div className="profile-info">
            {profile.avatar && <img src={getMediaUrl(profile.avatar)} alt={`${profile.name}'s profile`} />}
            <div className="user-name">
                <h3>{profile.name}</h3>
            </div>
            {error && <p role='alert'>{error}</p>}
            <div className="profile-button">
                {isSelf && (
                  <label className='btn btn-primary profile-avatar-upload'>
                    {uploadingAvatar ? 'Uploading picture...' : profile.avatar ? 'Change picture' : 'Add profile picture'}
                    <input
                      type='file'
                      accept='image/*'
                      onChange={handleAvatarChange}
                      disabled={uploadingAvatar}
                      aria-label='Choose a profile picture'
                    />
                  </label>
                )}
                {!isSelf && friendStatus === 'friends' && (
                  <>
                    <Link to={`/chatbox/${id}`} className='btn btn-primary'>
                      <FontAwesomeIcon icon={faMessage}/> Message
                    </Link>
                    <button className='btn btn-red' onClick={removeFriendship}>Remove friend</button>
                  </>
                )}
                {!isSelf && friendStatus === 'none' && (
                  <button className='btn btn-primary' onClick={addFriend}>
                    <FontAwesomeIcon icon={faFeed}/> Add friend
                  </button>
                )}
                {friendStatus === 'pending-sent' && (
                  <button className='btn btn-red' onClick={removeFriendship}>Cancel request</button>
                )}
                {friendStatus === 'pending-received' && (
                  <>
                    <button className='btn btn-primary' onClick={acceptRequest}>Accept request</button>
                    <button className='btn btn-red' onClick={removeFriendship}>Decline</button>
                  </>
                )}
            </div>
        </div>
    </div>
  )
}
