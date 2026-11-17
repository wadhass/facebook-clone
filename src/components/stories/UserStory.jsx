import './userStory.css'
import { getMediaUrl } from '../../api'
import { usePreferences } from '../../preferences/usePreferences'

export default function UserStory ({ user, onCreate, uploading }) {
  const { t } = usePreferences()

  return (
    <label className='story userStory'>
      {user?.avatar
        ? <img className='story-avatar' src={getMediaUrl(user.avatar)} alt='' />
        : <span className='story-avatar story-avatar-placeholder'>{user?.name?.[0] ?? '?'}</span>}
      <span className='story-add-button' aria-hidden='true'>{uploading ? '…' : '+'}</span>
      <input
        type='file'
        accept='image/*,video/*'
        multiple
        aria-label={t('Add a story photo or video')}
        disabled={uploading}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? [])
          event.target.value = ''
          if (files.length) onCreate(files)
        }}
      />
      <h5>{uploading ? t('Uploading…') : t('Add story')}</h5>
    </label>
  )
}
