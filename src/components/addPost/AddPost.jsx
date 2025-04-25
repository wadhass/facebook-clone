import './addPost.css'

// Fack Apis.............
import CurrentUserData from '../../FackApis/CurrentUserData'

// Font Awesome Icon..........
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faImage, faSmile, faTag, faVideo } from '@fortawesome/free-solid-svg-icons'

export default function AddPost () {
  return (
   <form className='postForm'>
    <div className="user form-top">
        <img src={CurrentUserData.map(user=>(user.ProfieImage))} alt="" />
        <input type="text" placeholder='What is on your mind ?' />
        <button type='submit' className='btn btn-primary'>Post</button>
    </div>
    <div className="post-categories">
        <label htmlFor="file">
            <input type="file" id='file'/>
            <span><FontAwesomeIcon icon={faImage}/>Photos</span>
        </label>
        <label htmlFor="file">
            <input type="file" id='file'/>
            <span><FontAwesomeIcon icon={faVideo}/>Videos</span>
        </label>
        <span><FontAwesomeIcon icon={faTag}/>Tag</span>
        <span><FontAwesomeIcon icon={faSmile}/>Feeling</span>
    </div>
   </form>
  )
}
