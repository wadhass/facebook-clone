import './feeds.css'

// Components..........
import Feed from './Feed'

// Fack Apis..........
import HomeFeedData from '../../FackApis/HomeFeedData'

export default function Feeds () {
  return (
    <div className='feeds'>
       {
       HomeFeedData.map(fed=>(
        <Feed fed={fed} key={fed.id}/>
       ))
       }
    </div>
  )
}
