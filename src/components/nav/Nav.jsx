import './nav.css'
import { Link } from 'react-router-dom'

// Foke Api Data.......
import CurrentUser from '../../FackApis/CurrentUserData';

// Components.........
import DarkMoode from '../darkmod/DarkMoode';

// fontAwesome Icon
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faBell, faEnvelope, faHome, faSearch, faUser } from '@fortawesome/free-solid-svg-icons';

export default function Nav  () {
  return (
    <nav>
      <div className='nav-container'>
         {/* ..................NavAria Left................ */}
        <div className="nav-left">
          <Link to="/">
          <h3 className='logo'>Facebook</h3>
          </Link>
          <Link to='/'>
          <FontAwesomeIcon icon={faHome}/>
          </Link>
          <Link to='/profile/id'>
          <FontAwesomeIcon icon={faUser}/>
          </Link>
          <div className="nav-Serchbar">
          <FontAwesomeIcon icon={faSearch}/>
          <input type="search" />
          </div>
        </div>
        {/* ..................NavAria Right................ */}
        <div className='nav-right'>
          <Link to='/chatbox/id'>
          <FontAwesomeIcon icon={faEnvelope}/>
          </Link>
          <Link to='/'>
          <FontAwesomeIcon icon={faBell}/>
          </Link>
          <DarkMoode />
          <Link to='/'>
          <FontAwesomeIcon icon={faBars}/>
          </Link>
          <div className="user">
            <img src={CurrentUser.map(user=>(user.ProfieImage))} alt="" />
            <h4>Beg Joker</h4>
          </div>
        </div>
      </div>
    </nav>
  )
}
