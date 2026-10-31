import { Link } from 'react-router-dom'
import './leftbar.css'
import { useAuth } from '../../auth/useAuth'
import { getMediaUrl } from '../../api'

export default function LeftBar  ()  {
  const { user } = useAuth()

  return (
<div className='leftBar'>
  <div className='left-container'>
    <div className='menu'>
      <Link to={`/profile/${user?.id ?? ''}`}>
      <div className='user'>
        {user?.avatar && <img src={getMediaUrl(user.avatar)} alt="" />}
        <h4>{user?.name}</h4>
      </div>
      </Link>

      <Link to='/'>
      <div className='item'>
        <span aria-hidden='true'>⌂</span>
        <h4>Feed</h4>
      </div>
      </Link>
      <Link to='/friends'>
      <div className='item'>
        <span aria-hidden='true'>♧</span>
        <h4>Friends</h4>
      </div>
      </Link>
      <Link to='/friends?tab=discover'>
      <div className='item'>
        <span aria-hidden='true'>＋</span>
        <h4>Find people</h4>
      </div>
      </Link>
      <Link to='/friends'>
        <div className='item'>
          <span aria-hidden='true'>✉</span>
          <h4>Messages</h4>
        </div>
      </Link>
    </div>

    <hr />
    <div className='menu'>
      <h4 className='others'>Your profile</h4>
      <Link to={`/profile/${user?.id ?? ''}`}>
        <div className='item'>
          <span aria-hidden='true'>◉</span>
          <h4>View profile</h4>
        </div>
      </Link>
    </div>
  </div>
</div>
  )
}
