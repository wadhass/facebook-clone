import { Link } from 'react-router-dom'
import './feeds.css'

// Components...........
import Comments from '../comments/Comments'

// Font Awesome Icon..........
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faComment, faHeart, faListDots, faShare } from '@fortawesome/free-solid-svg-icons'

// States........
import { useState } from 'react'

export default function Feed ({fed}) {

    // States Discuse......
    let [openComment, setOpenComment] = useState(false);
    const CommentHandeler =()=> {
        setOpenComment(!openComment)
        console.log(Comments)
    }
  return (
    <div className='feed'>
        <div className='top-content'>
            <Link to='/profile/id'>
            <div className="user">
                <img src={fed.feedProfile} alt="" />
                <div>
                <h5>{fed.name}</h5>
                <small>1 Minutes Age</small>
                </div>
            </div>
            </Link>
            <span><FontAwesomeIcon icon={faListDots} /></span>
        </div>
        <div className="mid-content">
            <p>{fed.desc}</p>
            <img src={fed.feedImage} alt="" />
        </div>
        <div className="bottom-content">
            <div className="action-item">
                <span><FontAwesomeIcon icon={faHeart} /> 14 Like</span>
            </div>
            <div className="action-item" onClick={CommentHandeler}>
                <span><FontAwesomeIcon icon={faComment} /> 2 Comment</span>
            </div>
            <div className="action-item">
                <span><FontAwesomeIcon icon={faShare} /> 1 1 Share</span>
            </div>
        </div>
        {openComment && <Comments />}
    </div>
  )
}
