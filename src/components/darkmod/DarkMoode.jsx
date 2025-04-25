import './darkmoode.css'

// fontAwesome Icon
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLightbulb } from '@fortawesome/free-solid-svg-icons';


export default function DarkMoode  () {

    const DarkHandele = () => {
        document.querySelector('body').classList.toggle('darkmood')
    }
  return (
    <div className='dark-mood-icon'>
        <FontAwesomeIcon icon={faLightbulb} onClick={DarkHandele} />
    </div>
  )
}
