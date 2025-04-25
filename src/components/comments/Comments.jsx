// import './comments.css'

// // Fack Api.........
// import CommentData from '../../FackApis/CommentData'
// import CurrentUserData from '../../FackApis/CurrentUserData'

// export default function Comments () {
//   return (
//     <div className='comments'>
//         <div className="writebox">
//             <form action="#">
//                 <div className="user">
//                     <img src={CurrentUserData.map(user=>(user.ProfieImage))} alt="" />
//                     <input type="text" placeholder='Write a comment' />
//                     <button type='submit' className='btn btn-primary'>Send</button>
//                 </div>
//             </form>
//         </div>
//     </div>
//   )
// }




import './comments.css'

// Fake API
import CommentData from '../../FackApis/CommentData'
import CurrentUserData from '../../FackApis/CurrentUserData'

export default function Comments() {
  const user = CurrentUserData[0]; // Assuming it's an array with one user

  return (
    <div className='comments'>
      <div className="writebox">
        <form action="#">
          <div className="user">
            <img
              src={user?.ProfieImage}
              alt="Profile"
              className="profile-img"
            />
            <input
              type="text"
              placeholder="Write a comment"
              className="comment-input"
            />
            <button type='submit' className='btn btn-primary'>Send</button>
          </div>
        </form>
      </div>
    </div>
  );
}
