import { Link } from 'react-router-dom'
import './signup.css'

export default function Signup(){
  return (
    <div className='signup'>
    <div className='card'>
       <div className='left'>
           <h2> -<br/> NapaExtra Signup<br />-</h2>
           <p>Lorem ipsum dolor sit, amet consectetur adipisicing elit. Nisi
                facere voluptatem vero ratione qui quae!
           </p>
           <span>Have An Account?</span>
           <Link to='/login'>
           <button className='btn btn-primary'>Login</button>
           </Link>   
       </div>
       <form className='right'>
           <input type="email" required placeholder='email' />
           <input type="text" required placeholder='username' />
           <input type="password" required placeholder='password' />
           <button type='submit' className='btn'>Register</button>
       </form>
   </div>
  </div>
  )
}

