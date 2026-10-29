import './nav.css'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'

// Components.........
import DarkMoode from '../darkmod/DarkMoode';

// fontAwesome Icon
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faEnvelope, faHome, faSearch, faUser } from '@fortawesome/free-solid-svg-icons';

export default function Nav  () {
  const { user, signOut } = useAuth()
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
          <Link to='/'>
          <FontAwesomeIcon icon={faHome}/>
          </Link>
          <Link to={`/profile/${user?.id ?? ''}`}>
          <FontAwesomeIcon icon={faUser}/>
          </Link>
          <form className="nav-Serchbar" role='search' onSubmit={handleSearch}>
          <FontAwesomeIcon icon={faSearch}/>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder='Search people'
            aria-label='Search people'
          />
          </form>
        </div>
        {/* ..................NavAria Right................ */}
        <div className='nav-right'>
          <Link to='/friends' aria-label='Messages' title='Messages'>
            <FontAwesomeIcon icon={faEnvelope}/>
          </Link>
          <Link to='/friends?tab=requests' aria-label='Friend requests' title='Friend requests'>
          <FontAwesomeIcon icon={faBell}/>
          </Link>
          <DarkMoode />
          <div className="user">
            {user?.avatar && <img src={user.avatar} alt="" />}
            <h4>{user?.name}</h4>
          </div>
          <button className='btn' type='button' onClick={handleSignOut}>Log out</button>
        </div>
      </div>
    </nav>
  )
}
