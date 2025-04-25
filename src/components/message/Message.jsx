import './message.css'
import { Link } from 'react-router-dom'

// FackApis..........
import MessageData from '../../FackApis/MessageData'

// FontAwesome Icon.........
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEdit, faSearch } from '@fortawesome/free-solid-svg-icons'

export default function Message () {
  return (
    <div className='Message'>
      <div className='message-top'>
        <h4>Message</h4>
        <FontAwesomeIcon icon={faEdit} />
      </div>
      <div className="message-search">
        <FontAwesomeIcon icon={faSearch} />
        <input type="search" placeholder='Search Message' />
      </div>
      <div className="border-div"></div>
      {
        MessageData.map(mess => (
          <Link to='/chatbox/id' key={mess.id}>
            <div className='message'>
              <div className="user">
                <img src={mess.img} alt="" />
                <div className="green-active"></div>
              </div>
              <div className="message-body">
                <h5>{mess.name}</h5>
                <p>{mess.mText}</p>
              </div>
            </div>
          </Link>
        ))
      }
    </div>
  )
}
