import { Link } from 'react-router-dom'
import './leftbar.css'
import { useAuth } from '../../auth/useAuth'
import { getMediaUrl } from '../../api'
import { usePreferences } from '../../preferences/usePreferences'

export default function LeftBar  ()  {
  const { user } = useAuth()
  const { t } = usePreferences()

  return (
<div className='leftBar'>
  <div className='left-container'>
    <div className='menu'>
      <Link to={`/profile/${user?.id ?? ''}`} aria-label={t('Your profile')}>
      <div className='user'>
        {user?.avatar && <img src={getMediaUrl(user.avatar)} alt="" />}
        <h4>{user?.name}</h4>
      </div>
      </Link>

      <Link to='/' aria-label={t('Feed')}>
      <div className='item'>
        <span aria-hidden='true'>⌂</span>
        <h4>{t('Feed')}</h4>
      </div>
      </Link>
      <Link to='/friends' aria-label={t('Friends')}>
      <div className='item'>
        <span aria-hidden='true'>♧</span>
        <h4>{t('Friends')}</h4>
      </div>
      </Link>
      <Link to='/friends?tab=discover' aria-label={t('Find people')}>
      <div className='item'>
        <span aria-hidden='true'>＋</span>
        <h4>{t('Find people')}</h4>
      </div>
      </Link>
      <Link to='/friends' aria-label={t('Messages')}>
        <div className='item'>
          <span aria-hidden='true'>✉</span>
          <h4>{t('Messages')}</h4>
        </div>
      </Link>
      <Link to='/calls' aria-label={t('Calls')}>
        <div className='item'>
          <span aria-hidden='true'>☎</span>
          <h4>{t('Calls')}</h4>
        </div>
      </Link>
      <Link to='/reels' aria-label={t('Reels')}>
        <div className='item'>
          <span aria-hidden='true'>▷</span>
          <h4>{t('Reels')}</h4>
        </div>
      </Link>
      <Link to='/live' aria-label={t('Live broadcasts')}>
        <div className='item'>
          <span aria-hidden='true'>●</span>
          <h4>{t('Live')}</h4>
        </div>
      </Link>
      <Link to='/explore' aria-label={t('Explore')}>
        <div className='item'>
          <span aria-hidden='true'>✦</span>
          <h4>{t('Explore')}</h4>
        </div>
      </Link>
      <Link to='/groups' aria-label={t('Group chats')}>
        <div className='item'>
          <span aria-hidden='true'>◎</span>
          <h4>{t('Group chats')}</h4>
        </div>
      </Link>
    </div>

    <hr />
    <div className='menu'>
      <h4 className='others'>{t('Your profile')}</h4>
      <Link to={`/profile/${user?.id ?? ''}`} aria-label={t('View profile')}>
        <div className='item'>
          <span aria-hidden='true'>◉</span>
          <h4>{t('View profile')}</h4>
        </div>
      </Link>
    </div>
  </div>
</div>
  )
}
