import './userStory.css'
import { getMediaUrl } from '../../api'

export default function UserStory ({ user, onCreate, uploading }) {
  return (
    <label className='story userStory'>
      {user?.avatar
        ? <img className='story-avatar' src={getMediaUrl(user.avatar)} alt='' />
        : <span className='story-avatar story-avatar-placeholder'>{user?.name?.[0] ?? '?'}</span>}
      <span className='story-add-button' aria-hidden='true'>{uploading ? '…' : '+'}</span>
      <input
        type='file'
        accept='image/*,video/*'
        aria-label='Add a story photo or video'
        disabled={uploading}
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) onCreate(file)
        }}
      />
      <h5>{uploading ? 'Uploading…' : 'Add story'}</h5>
    </label>
  )
}
