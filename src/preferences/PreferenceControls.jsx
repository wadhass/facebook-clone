import { usePreferences } from './usePreferences'
import './preferences.css'

export default function PreferenceControls({ className = '' }) {
  const {
    language,
    setLanguage,
    languages,
    lowData,
    setLowData,
    t,
  } = usePreferences()

  return (
    <div className={`preference-controls ${className}`}>
      <label className='preference-language'>
        <span>{t('Language')}</span>
        <select value={language} onChange={(event) => setLanguage(event.target.value)}>
          {languages.map((option) => (
            <option value={option.code} key={option.code}>{option.name}</option>
          ))}
        </select>
      </label>
      <label className='preference-low-data'>
        <input
          type='checkbox'
          checked={lowData}
          onChange={(event) => setLowData(event.target.checked)}
        />
        <span>
          <strong>{t('Low-data mode')}</strong>
          <small>{t('Reduce video quality and avoid automatic previews.')}</small>
        </span>
      </label>
    </div>
  )
}
