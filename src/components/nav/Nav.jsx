import './nav.css'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { getMediaUrl } from '../../api'
import NotificationsMenu from '../notifications/NotificationsMenu'
import { usePreferences } from '../../preferences/usePreferences'
import PreferenceControls from '../../preferences/PreferenceControls'

// Components.........
import DarkMoode from '../darkmod/DarkMoode';

// fontAwesome Icon
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCompass, faHome, faSearch, faUser } from '@fortawesome/free-solid-svg-icons';

export default function Nav  () {
  const { user, signOut } = useAuth()
  const { t } = usePreferences()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') ?? '')

  useEffect(() => {
    setSearch(searchParams.get('search') ?? '')
  }, [searchParams])

  function handleSignOut() {
    signOut()
    navigate('/login')
  }

  function handleSearch(event) {
    event.preventDefault()
    const query = search.trim()
    navigate(query ? `/friends?tab=discover&search=${encodeURIComponent(query)}` : '/friends?tab=discover')
  }

  return (
    <nav>
      <div className='nav-container'>
         {/* ..................NavAria Left................ */}
        <div className="nav-left">
          <Link to="/" className="brand" aria-label="QAVERO home">
            <img src="/qavero.svg" alt="" className="brand-icon" />
            <h3 className='logo'>QAVERO</h3>
          </Link>
          <Link to='/' aria-label={t('Home')}>
          <FontAwesomeIcon icon={faHome}/>
          </Link>
          <Link to='/explore' aria-label={t('Explore')}>
          <FontAwesomeIcon icon={faCompass}/>
          </Link>
          <Link to={`/profile/${user?.id ?? ''}`} aria-label={t('Profile')}>
          <FontAwesomeIcon icon={faUser}/>
          </Link>
          <form className="nav-Serchbar" role='search' onSubmit={handleSearch}>
          <FontAwesomeIcon icon={faSearch}/>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('Search people')}
            aria-label={t('Search people')}
          />
          </form>
        </div>
        {/* ..................NavAria Right................ */}
        <div className='nav-right'>
          <NotificationsMenu />
          <DarkMoode />
          <details className='nav-preferences'>
            <summary aria-label={t('Settings')} title={t('Settings')}>⚙</summary>
            <PreferenceControls />
          </details>
          <div className="user">
            {user?.avatar && <img src={getMediaUrl(user.avatar)} alt="" />}
            <h4>{user?.name}</h4>
          </div>
          <button className='btn' type='button' onClick={handleSignOut}>{t('Log out')}</button>
        </div>
      </div>
    </nav>
  )
}
