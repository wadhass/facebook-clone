import './darkmoode.css'
import { useEffect, useState } from 'react'

// fontAwesome Icon
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLightbulb } from '@fortawesome/free-solid-svg-icons';


export default function DarkMoode  () {
    const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark')
    useEffect(() => {
        document.body.classList.toggle('darkmood', darkMode)
        localStorage.setItem('theme', darkMode ? 'dark' : 'light')
    }, [darkMode])
  return (
    <button
      type='button'
      className='dark-mood-icon'
      aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={darkMode}
      title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setDarkMode((current) => !current)}
    >
      <FontAwesomeIcon icon={faLightbulb} />
    </button>
  )
}
