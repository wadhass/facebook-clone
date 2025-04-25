
import './rightbar.css'

// components........
import Message from '../message/Message'
import FirendReqe from '../firendReqe/FirendReqe'

export default function RightBar ()  {
  return (
    <div className='rightBar'>
      <div className='rightbar-container'>
        <Message />
        <FirendReqe />
      </div>
    </div>
  )
}




